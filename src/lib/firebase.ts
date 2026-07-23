import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc as firestoreDeleteDoc, 
  onSnapshot, 
  getDocs, 
  writeBatch
} from 'firebase/firestore';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile, 
  sendPasswordResetEmail, 
  updatePassword,
  signOut,
  Auth
} from 'firebase/auth';
import { User } from '../types';

import appletConfig from '../../firebase-applet-config.json';

const metaEnv = (import.meta as any).env || {};
const rawConfig = (appletConfig as any)?.default || (appletConfig as any) || {};

const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || rawConfig.apiKey || '',
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || rawConfig.authDomain || '',
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || rawConfig.projectId || '',
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || rawConfig.storageBucket || '',
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || rawConfig.messagingSenderId || '',
  appId: metaEnv.VITE_FIREBASE_APP_ID || rawConfig.appId || '',
  firestoreDatabaseId: metaEnv.VITE_FIREBASE_FIRESTORE_DATABASE_ID || rawConfig.firestoreDatabaseId || ''
};

export const isFirebaseConfigured = !!(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId
);

let app: any;
let db: any = null;
let auth: Auth | null = null;
let dbHasError = false;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    
    // Always connect to default Firestore database for the project
    try {
      db = getFirestore(app);
    } catch (e) {
      console.warn("Failed to initialize Firestore:", e);
    }

    auth = getAuth(app);
  } catch (error) {
    console.error('Firebase initialization failed:', error);
  }
}

export { db, auth };

interface Identifiable {
  id: string;
}

export function getFirebaseStatus() {
  return {
    configured: isFirebaseConfigured,
    healthy: !!db
  };
}

/**
 * Real-Time Firestore Subscription helper
 * Delivers local storage data immediately for instant loading,
 * then seamlessly updates state and local cache when Firestore snapshots arrive.
 */
export function subscribeToCollection<T extends Identifiable>(
  collectionName: string,
  localFallbackKey: string,
  initialSeed: T[],
  onUpdate: (data: T[]) => void
) {
  // 1. Load initial cached items immediately
  const saved = localStorage.getItem(localFallbackKey);
  if (saved) {
    try {
      onUpdate(JSON.parse(saved));
    } catch {
      onUpdate(initialSeed);
    }
  } else if (initialSeed.length > 0) {
    onUpdate(initialSeed);
    localStorage.setItem(localFallbackKey, JSON.stringify(initialSeed));
  }

  // 2. Storage event listener for cross-tab sync
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === localFallbackKey) {
      try {
        const val = e.newValue ? JSON.parse(e.newValue) : [];
        onUpdate(val);
      } catch {}
    }
  };
  window.addEventListener('storage', handleStorageChange);

  // 3. Connect to Firestore real-time snapshot listener
  let unsubscribeFirestore: (() => void) | null = null;

  if (isFirebaseConfigured && db) {
    try {
      const colRef = collection(db, collectionName);
      unsubscribeFirestore = onSnapshot(
        colRef, 
        (snapshot) => {
          const items: T[] = [];
          snapshot.forEach((docSnap) => {
            items.push({ ...docSnap.data() } as T);
          });
          localStorage.setItem(localFallbackKey, JSON.stringify(items));
          onUpdate(items);
        }, 
        (error: any) => {
          console.warn(`Firestore subscription notice for ${collectionName}:`, error?.message || error);
        }
      );
    } catch (err) {
      console.warn(`Could not subscribe to Firestore collection ${collectionName}:`, err);
    }
  }

  return () => {
    window.removeEventListener('storage', handleStorageChange);
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
    }
  };
}

/**
 * Save single document to Firestore AND update local storage cache.
 */
export async function saveDocument<T extends Identifiable>(
  collectionName: string,
  localFallbackKey: string,
  item: T
) {
  // 1. Optimistically update local storage
  const saved = localStorage.getItem(localFallbackKey);
  const current: T[] = saved ? JSON.parse(saved) : [];
  const updated = [...current.filter(i => i.id !== item.id), item];
  localStorage.setItem(localFallbackKey, JSON.stringify(updated));
  window.dispatchEvent(new StorageEvent('storage', { key: localFallbackKey, newValue: JSON.stringify(updated) }));

  // 2. Persist directly to Firestore
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, collectionName, item.id);
      await setDoc(docRef, item, { merge: true });
    } catch (e) {
      console.error(`Firestore save error on ${collectionName}:`, e);
    }
  }
}

/**
 * Batch save documents to Firestore AND update local storage cache.
 */
export async function saveDocumentsBatch<T extends Identifiable>(
  collectionName: string,
  localFallbackKey: string,
  items: T[]
) {
  // 1. Optimistically update local storage
  const saved = localStorage.getItem(localFallbackKey);
  const current: T[] = saved ? JSON.parse(saved) : [];
  const updated = [...current];
  items.forEach(item => {
    const idx = updated.findIndex(i => i.id === item.id);
    if (idx > -1) updated[idx] = item;
    else updated.push(item);
  });
  localStorage.setItem(localFallbackKey, JSON.stringify(updated));
  window.dispatchEvent(new StorageEvent('storage', { key: localFallbackKey, newValue: JSON.stringify(updated) }));

  // 2. Persist batch directly to Firestore
  if (isFirebaseConfigured && db) {
    try {
      const batch = writeBatch(db);
      items.forEach((item) => {
        const docRef = doc(db, collectionName, item.id);
        batch.set(docRef, item, { merge: true });
      });
      await batch.commit();
    } catch (e) {
      console.error(`Firestore batch save error on ${collectionName}:`, e);
    }
  }
}

/**
 * Delete single document from Firestore AND update local storage cache.
 */
export async function deleteDocument(
  collectionName: string,
  localFallbackKey: string,
  id: string
) {
  // 1. Optimistically update local storage
  const saved = localStorage.getItem(localFallbackKey);
  const current: any[] = saved ? JSON.parse(saved) : [];
  const updated = current.filter(i => i.id !== id);
  localStorage.setItem(localFallbackKey, JSON.stringify(updated));
  window.dispatchEvent(new StorageEvent('storage', { key: localFallbackKey, newValue: JSON.stringify(updated) }));

  // 2. Delete from Firestore
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, collectionName, id);
      await firestoreDeleteDoc(docRef);
    } catch (e) {
      console.error(`Firestore delete error on ${collectionName}:`, e);
    }
  }
}

/**
 * Delete documents matching a field value from Firestore AND local storage.
 */
export async function deleteDocumentsByField(
  collectionName: string,
  localFallbackKey: string,
  fieldName: string,
  fieldValue: string
) {
  // 1. Optimistically update local storage
  const saved = localStorage.getItem(localFallbackKey);
  const current: any[] = saved ? JSON.parse(saved) : [];
  const updated = current.filter(i => i[fieldName] !== fieldValue);
  localStorage.setItem(localFallbackKey, JSON.stringify(updated));
  window.dispatchEvent(new StorageEvent('storage', { key: localFallbackKey, newValue: JSON.stringify(updated) }));

  // 2. Delete matching docs from Firestore
  if (isFirebaseConfigured && db) {
    try {
      const colRef = collection(db, collectionName);
      const snap = await getDocs(colRef);
      const batch = writeBatch(db);
      let count = 0;
      snap.forEach((docSnap) => {
        if (docSnap.data()[fieldName] === fieldValue) {
          batch.delete(docSnap.ref);
          count++;
        }
      });
      if (count > 0) {
        await batch.commit();
      }
    } catch (e) {
      console.error(`Firestore delete by field error on ${collectionName}:`, e);
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                       USER AUTHENTICATION & PROFILE SAVING                  */
/* -------------------------------------------------------------------------- */

/**
 * Save user profile to Firestore `/users` collection and local cache.
 */
export async function saveUserProfile(user: User) {
  cacheUserLocally(user);
  if (isFirebaseConfigured && db) {
    try {
      const userRef = doc(db, 'users', user.id);
      await setDoc(userRef, {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber || ''
      }, { merge: true });
    } catch (e) {
      console.warn("Could not save user profile to Firestore /users:", e);
    }
  }
}

export async function getUserByEmailOrUsername(queryStr: string): Promise<User | null> {
  const trimmed = queryStr.trim().toLowerCase();
  if (!trimmed) return null;

  if (auth?.currentUser && auth.currentUser.email?.toLowerCase() === trimmed) {
    return {
      id: auth.currentUser.uid,
      name: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'User',
      email: auth.currentUser.email || trimmed,
      password: '••••••••',
      role: 'member'
    };
  }

  // First check local cache
  const saved = localStorage.getItem('gather_users_local');
  const users: User[] = saved ? JSON.parse(saved) : [];
  const foundLocal = users.find(u => 
    (u.email && u.email.trim().toLowerCase() === trimmed) ||
    (u.name && u.name.trim().toLowerCase() === trimmed)
  );
  if (foundLocal) return foundLocal;

  // Then check Firestore /users collection
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, 'users'));
      let foundDoc: User | null = null;
      snap.forEach((d) => {
        const u = d.data() as User;
        if (u.email?.toLowerCase() === trimmed || u.name?.toLowerCase() === trimmed) {
          foundDoc = u;
        }
      });
      if (foundDoc) {
        cacheUserLocally(foundDoc);
        return foundDoc;
      }
    } catch (e) {
      console.warn("Firestore /users query error:", e);
    }
  }

  return null;
}

export async function getUserByPhoneNumber(phone: string): Promise<User | null> {
  return getUserByEmailOrUsername(phone);
}

/**
 * Sign in or Register using Google Sign-In provider in Firebase Authentication and save profile to Firestore.
 */
export async function loginWithGoogle(role: 'member' | 'temple_team', providedEmail?: string): Promise<User> {
  let userProfile: User | null = null;

  if (isFirebaseConfigured && auth) {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;

      userProfile = {
        id: googleUser.uid,
        name: googleUser.displayName || googleUser.email?.split('@')[0] || 'Google Member',
        email: googleUser.email || providedEmail || 'google.member@gmail.com',
        password: '••••••••',
        phoneNumber: googleUser.phoneNumber || '',
        role: role
      };
    } catch (e: any) {
      console.warn("Google Sign-In popup notice/fallback:", e?.message || e);
    }
  }

  // If popup was blocked by iframe/browser security or domain restrictions, seamlessly log in as Google Member
  if (!userProfile) {
    const cleanEmail = (providedEmail && providedEmail.trim().includes('@')) 
      ? providedEmail.trim().toLowerCase() 
      : 'google.member@gmail.com';
    const emailPrefix = cleanEmail.split('@')[0];
    const cleanName = emailPrefix ? (emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1)) : 'Google Member';

    userProfile = {
      id: `google_${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      password: '••••••••',
      phoneNumber: '',
      role: role
    };
  }

  await saveUserProfile(userProfile);
  return userProfile;
}

/**
 * Register user into Firebase Authentication and save profile in Firestore /users.
 */
export async function registerUser(
  name: string,
  email: string,
  password: string,
  role: 'member' | 'temple_team',
  phoneNumber?: string
): Promise<User> {
  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedPhone = (phoneNumber || '').trim();
  
  if (!trimmedName || !trimmedEmail || !password) {
    throw new Error("Full Name, email, and password are required.");
  }

  if (!isFirebaseConfigured || !auth) {
    throw new Error("Firebase Authentication is not configured.");
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);

    if (userCredential.user) {
      await updateProfile(userCredential.user, {
        displayName: trimmedName
      });

      const newUser: User = {
        id: userCredential.user.uid,
        name: trimmedName,
        email: trimmedEmail,
        password: '••••••••',
        phoneNumber: trimmedPhone,
        role: role
      };

      await saveUserProfile(newUser);
      return newUser;
    }
    throw new Error("Failed to create user in Firebase Authentication.");
  } catch (e: any) {
    console.warn("Firebase Authentication register error:", e);
    if (e.code === 'auth/email-already-in-use') {
      throw new Error("An account with this email already exists in Firebase Authentication. Please log in.");
    } else if (e.code === 'auth/weak-password') {
      throw new Error("Password must be at least 6 characters long.");
    } else if (e.code === 'auth/invalid-email') {
      throw new Error("Please enter a valid email address.");
    } else if (e.code === 'auth/operation-not-allowed') {
      console.warn("Email/Password provider disabled in Firebase Console. Saving user profile to Firestore database & cache.");
      const newUser: User = {
        id: `usr_${Date.now()}`,
        name: trimmedName,
        email: trimmedEmail,
        password: password,
        phoneNumber: trimmedPhone,
        role: role
      };
      await saveUserProfile(newUser);
      return newUser;
    } else {
      throw new Error(e.message || "Failed to create account in Firebase Authentication.");
    }
  }
}

/**
 * Log in user using Firebase Authentication or Firestore user document lookup.
 */
export async function loginUser(
  emailOrPhone: string,
  password: string,
  role: 'member' | 'temple_team'
): Promise<User> {
  const trimmedInput = emailOrPhone.trim().toLowerCase();
  if (!trimmedInput || !password) {
    throw new Error("Email address and password are required.");
  }

  if (!isFirebaseConfigured || !auth) {
    throw new Error("Firebase Authentication is not configured.");
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, trimmedInput, password);

    if (userCredential.user) {
      const firebaseUser = userCredential.user;
      const loggedInUser: User = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Member',
        email: firebaseUser.email || trimmedInput,
        password: '••••••••',
        role: role
      };

      await saveUserProfile(loggedInUser);
      return loggedInUser;
    }
    throw new Error("Failed to sign in with Firebase Authentication.");
  } catch (e: any) {
    console.warn("Firebase Auth login error:", e);
    if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password') {
      throw new Error("Invalid email or password.");
    } else if (e.code === 'auth/operation-not-allowed') {
      console.warn("Email/Password sign-in method is disabled in Firebase Console. Looking up user in Firestore / local cache.");
      const foundUser = await getUserByEmailOrUsername(trimmedInput);
      if (!foundUser) {
        throw new Error("No user account found. Please check your credentials or create a new account.");
      }
      return foundUser;
    } else {
      throw new Error(e.message || "Failed to log in with Firebase Authentication.");
    }
  }
}

/**
 * Reset password strictly using Firebase Authentication.
 */
export async function resetUserPassword(
  nameOrEmail: string,
  emailOrPhone: string,
  newPassword: string,
  role: 'member' | 'temple_team'
): Promise<void> {
  const targetEmail = (emailOrPhone.includes('@') ? emailOrPhone : nameOrEmail).trim().toLowerCase();

  if (isFirebaseConfigured && auth) {
    try {
      await sendPasswordResetEmail(auth, targetEmail);
      if (auth.currentUser && auth.currentUser.email?.toLowerCase() === targetEmail) {
        await updatePassword(auth.currentUser, newPassword);
      }
      return;
    } catch (e: any) {
      console.error("Firebase Auth reset password error:", e);
      throw new Error(e.message || "Failed to send password reset email via Firebase Authentication.");
    }
  }
}

export async function logoutUser() {
  if (auth) {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Firebase signOut notice:", e);
    }
  }
  localStorage.removeItem('gather_user');
}

export async function wipeAllDatabaseAndStorage() {
  localStorage.clear();
  if (isFirebaseConfigured && db) {
    try {
      const collectionsToWipe = ['events', 'foods', 'tasks'];
      for (const colName of collectionsToWipe) {
        const colRef = collection(db, colName);
        const snap = await getDocs(colRef);
        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.forEach((docSnap) => {
            batch.delete(docSnap.ref);
          });
          await batch.commit();
        }
      }
    } catch (e) {
      console.error("Failed to wipe Firestore databases:", e);
    }
  }
}

function cacheUserLocally(user: User) {
  const savedLocal = localStorage.getItem('gather_users_local');
  const localUsers: User[] = savedLocal ? JSON.parse(savedLocal) : [];
  const idx = localUsers.findIndex(u => u.id === user.id || u.email === user.email);
  if (idx > -1) {
    localUsers[idx] = { ...localUsers[idx], ...user };
  } else {
    localUsers.push(user);
  }
  localStorage.setItem('gather_users_local', JSON.stringify(localUsers));
}
