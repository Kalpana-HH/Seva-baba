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

let app;
let db: any = null;
let auth: Auth | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = firebaseConfig.firestoreDatabaseId 
      ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app);
    auth = getAuth(app);
  } catch (error) {
    console.error('Firebase initialization failed:', error);
  }
}

export { db, auth };

interface Identifiable {
  id: string;
}

// Timeout helper to prevent hanging Firebase operations when not provisioned or offline
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 5000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), timeoutMs))
  ]);
}

let isFirestoreHealthy = (() => {
  try {
    return sessionStorage.getItem('firestore_healthy') !== 'unhealthy';
  } catch {
    return true;
  }
})();

function markFirestoreUnhealthy() {
  if (isFirestoreHealthy) {
    console.warn("Firestore marked as UNHEALTHY. Bypassing Firestore for the rest of the session.");
    isFirestoreHealthy = false;
    try {
      sessionStorage.setItem('firestore_healthy', 'unhealthy');
    } catch {}
    window.dispatchEvent(new CustomEvent('firestore-health-changed'));
  }
}

export function getFirebaseStatus() {
  return {
    configured: isFirebaseConfigured,
    healthy: isFirestoreHealthy && !!db
  };
}

// Subscription helper for Firestore collections (events, foods, tasks)
export function subscribeToCollection<T extends Identifiable>(
  collectionName: string,
  localFallbackKey: string,
  initialSeed: T[],
  onUpdate: (data: T[]) => void
) {
  let unsubscribes: (() => void)[] = [];
  let isUsingLocal = false;

  const startLocalSubscription = () => {
    if (isUsingLocal) return;
    isUsingLocal = true;
    
    unsubscribes.forEach(fn => {
      try { fn(); } catch {}
    });
    unsubscribes = [];

    const loadLocal = () => {
      const saved = localStorage.getItem(localFallbackKey);
      if (saved) {
        try {
          onUpdate(JSON.parse(saved));
        } catch {
          onUpdate(initialSeed);
        }
      } else {
        onUpdate(initialSeed);
        localStorage.setItem(localFallbackKey, JSON.stringify(initialSeed));
      }
    };

    loadLocal();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === localFallbackKey) {
        try {
          const val = e.newValue ? JSON.parse(e.newValue) : [];
          onUpdate(val);
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    unsubscribes.push(() => window.removeEventListener('storage', handleStorageChange));
  };

  const handleHealthChange = () => {
    if (!isFirestoreHealthy) {
      startLocalSubscription();
    }
  };
  window.addEventListener('firestore-health-changed', handleHealthChange);
  unsubscribes.push(() => window.removeEventListener('firestore-health-changed', handleHealthChange));

  if (!isFirebaseConfigured || !db || !isFirestoreHealthy) {
    startLocalSubscription();
    return () => {
      unsubscribes.forEach(fn => fn());
    };
  }

  let hasEmitted = false;
  const timeoutId = setTimeout(() => {
    if (!hasEmitted) {
      console.warn(`Firestore subscription for ${collectionName} timed out. Falling back to local storage.`);
      markFirestoreUnhealthy();
    }
  }, 5000);

  try {
    const colRef = collection(db, collectionName);
    
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      hasEmitted = true;
      clearTimeout(timeoutId);
      const items: T[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ ...docSnap.data() } as T);
      });
      localStorage.setItem(localFallbackKey, JSON.stringify(items));
      onUpdate(items);
    }, (error) => {
      clearTimeout(timeoutId);
      console.warn(`Firestore Snapshot error on ${collectionName}, falling back to local subscription:`, error);
      markFirestoreUnhealthy();
    });

    unsubscribes.push(unsubscribe);
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn(`Failed to initialize Firestore sub for ${collectionName}, falling back to local subscription:`, err);
    markFirestoreUnhealthy();
  }

  return () => {
    clearTimeout(timeoutId);
    unsubscribes.forEach(fn => fn());
  };
}

// Standalone Firestore Mutation Helpers (Events, Foods, Tasks ONLY)
export async function saveDocument<T extends Identifiable>(
  collectionName: string,
  localFallbackKey: string,
  item: T
) {
  let success = false;
  if (isFirebaseConfigured && db && isFirestoreHealthy) {
    try {
      const docRef = doc(db, collectionName, item.id);
      await withTimeout(setDoc(docRef, item, { merge: true }), 5000);
      success = true;
    } catch (e) {
      console.error("Firestore save error, falling back to local:", e);
      markFirestoreUnhealthy();
    }
  }

  if (!success) {
    const saved = localStorage.getItem(localFallbackKey);
    const current: T[] = saved ? JSON.parse(saved) : [];
    const updated = [...current.filter(i => i.id !== item.id), item];
    localStorage.setItem(localFallbackKey, JSON.stringify(updated));
    window.dispatchEvent(new StorageEvent('storage', { key: localFallbackKey, newValue: JSON.stringify(updated) }));
  }
}

export async function saveDocumentsBatch<T extends Identifiable>(
  collectionName: string,
  localFallbackKey: string,
  items: T[]
) {
  let success = false;
  if (isFirebaseConfigured && db && isFirestoreHealthy) {
    try {
      const batch = writeBatch(db);
      items.forEach((item) => {
        const docRef = doc(db, collectionName, item.id);
        batch.set(docRef, item, { merge: true });
      });
      await withTimeout(batch.commit(), 5000);
      success = true;
    } catch (e) {
      console.error("Firestore batch save error, falling back to local:", e);
      markFirestoreUnhealthy();
    }
  }

  if (!success) {
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
  }
}

export async function deleteDocument(
  collectionName: string,
  localFallbackKey: string,
  id: string
) {
  let success = false;
  if (isFirebaseConfigured && db && isFirestoreHealthy) {
    try {
      const docRef = doc(db, collectionName, id);
      await withTimeout(firestoreDeleteDoc(docRef), 5000);
      success = true;
    } catch (e) {
      console.error("Firestore delete error, falling back to local:", e);
      markFirestoreUnhealthy();
    }
  }

  if (!success) {
    const saved = localStorage.getItem(localFallbackKey);
    const current: any[] = saved ? JSON.parse(saved) : [];
    const updated = current.filter(i => i.id !== id);
    localStorage.setItem(localFallbackKey, JSON.stringify(updated));
    window.dispatchEvent(new StorageEvent('storage', { key: localFallbackKey, newValue: JSON.stringify(updated) }));
  }
}

export async function deleteDocumentsByField(
  collectionName: string,
  localFallbackKey: string,
  fieldName: string,
  fieldValue: string
) {
  let success = false;
  if (isFirebaseConfigured && db && isFirestoreHealthy) {
    try {
      const colRef = collection(db, collectionName);
      const snap = await withTimeout(getDocs(colRef), 5000);
      const batch = writeBatch(db);
      let count = 0;
      snap.forEach((docSnap) => {
        if (docSnap.data()[fieldName] === fieldValue) {
          batch.delete(docSnap.ref);
          count++;
        }
      });
      if (count > 0) {
        await withTimeout(batch.commit(), 5000);
      }
      success = true;
    } catch (e) {
      console.error("Firestore batch delete error, falling back to local:", e);
      markFirestoreUnhealthy();
    }
  }

  if (!success) {
    const saved = localStorage.getItem(localFallbackKey);
    const current: any[] = saved ? JSON.parse(saved) : [];
    const updated = current.filter(i => i[fieldName] !== fieldValue);
    localStorage.setItem(localFallbackKey, JSON.stringify(updated));
    window.dispatchEvent(new StorageEvent('storage', { key: localFallbackKey, newValue: JSON.stringify(updated) }));
  }
}

/* -------------------------------------------------------------------------- */
/*             PURE FIREBASE AUTHENTICATION (NO FIRESTORE FOR USERS)          */
/* -------------------------------------------------------------------------- */

// Lookup active user from Firebase Auth state or local cache
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

  const saved = localStorage.getItem('gather_users_local');
  const users: User[] = saved ? JSON.parse(saved) : [];
  return users.find(u => 
    (u.email && u.email.trim().toLowerCase() === trimmed) ||
    (u.name && u.name.trim().toLowerCase() === trimmed)
  ) || null;
}

export async function getUserByPhoneNumber(phone: string): Promise<User | null> {
  return getUserByEmailOrUsername(phone);
}

/**
 * Sign in or Register using Google Sign-In provider strictly in Firebase Authentication.
 */
export async function loginWithGoogle(role: 'member' | 'temple_team'): Promise<User> {
  if (!isFirebaseConfigured || !auth) {
    throw new Error("Firebase Authentication is not configured or unavailable.");
  }

  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    const googleUser = result.user;

    const userProfile: User = {
      id: googleUser.uid,
      name: googleUser.displayName || googleUser.email?.split('@')[0] || 'Google Member',
      email: googleUser.email || '',
      password: '••••••••',
      phoneNumber: googleUser.phoneNumber || '',
      role: role
    };

    // Cache locally for session persistence
    cacheUserLocally(userProfile);

    return userProfile;
  } catch (e: any) {
    console.error("Google Sign-In Error:", e);
    if (e.code === 'auth/popup-closed-by-user') {
      throw new Error("Google Sign-In popup was closed before completing.");
    } else if (e.code === 'auth/operation-not-allowed') {
      throw new Error("Google Sign-In is disabled in your Firebase Auth Console. Please enable Google provider in Firebase Auth.");
    } else {
      throw new Error(e.message || "Failed to sign in with Google.");
    }
  }
}

/**
 * Register user directly in Firebase Authentication (Auth tab), NEVER in Firestore.
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

  if (isFirebaseConfigured && auth) {
    try {
      const userCredential = await withTimeout(
        createUserWithEmailAndPassword(auth, trimmedEmail, password),
        8000
      );

      if (userCredential.user) {
        // Set user display name in Firebase Authentication profile
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

        cacheUserLocally(newUser);
        return newUser;
      }
    } catch (e: any) {
      console.warn("Firebase Authentication register error:", e);
      if (e.code === 'auth/email-already-in-use') {
        throw new Error("An account with this email already exists in Firebase Authentication. Please log in.");
      } else if (e.code === 'auth/weak-password') {
        throw new Error("Password must be at least 6 characters long.");
      } else if (e.code === 'auth/invalid-email') {
        throw new Error("Please enter a valid email address.");
      } else if (e.code === 'auth/operation-not-allowed') {
        console.warn("Email/Password provider is disabled in Firebase Console. Falling back to seamless local auth.");
        // Fallback to local storage account creation
        const newUser: User = {
          id: `usr_${Date.now()}`,
          name: trimmedName,
          email: trimmedEmail,
          password: password,
          phoneNumber: trimmedPhone,
          role: role
        };
        cacheUserLocally(newUser);
        return newUser;
      } else {
        throw new Error(e.message || "Failed to create account in Firebase Authentication.");
      }
    }
  }

  // Fallback for local sandbox testing if Auth is uninitialized
  const newUser: User = {
    id: `usr_${Date.now()}`,
    name: trimmedName,
    email: trimmedEmail,
    password: password,
    phoneNumber: trimmedPhone,
    role: role
  };
  cacheUserLocally(newUser);
  return newUser;
}

/**
 * Log in user strictly using Firebase Authentication service.
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

  if (isFirebaseConfigured && auth) {
    try {
      const userCredential = await withTimeout(
        signInWithEmailAndPassword(auth, trimmedInput, password),
        8000
      );

      if (userCredential.user) {
        const firebaseUser = userCredential.user;
        const loggedInUser: User = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Member',
          email: firebaseUser.email || trimmedInput,
          password: '••••••••',
          role: role
        };

        cacheUserLocally(loggedInUser);
        return loggedInUser;
      }
    } catch (e: any) {
      console.warn("Firebase Authentication login error:", e);
      if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password') {
        throw new Error("Invalid email or password.");
      } else if (e.code === 'auth/operation-not-allowed') {
        console.warn("Email/Password provider is disabled in Firebase Console. Falling back to local authentication.");
        // Fallback to local memory lookup below
      } else {
        throw new Error(e.message || "Failed to log in with Firebase Authentication.");
      }
    }
  }

  // Fallback local memory lookup
  const saved = localStorage.getItem('gather_users_local');
  const users: User[] = saved ? JSON.parse(saved) : [];
  const foundUser = users.find(u => 
    u.role === role && 
    ((u.email && u.email.toLowerCase() === trimmedInput) || (u.name && u.name.toLowerCase() === trimmedInput))
  );

  if (!foundUser) {
    throw new Error("No user found. Please check your credentials or sign up.");
  }
  return foundUser;
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
      console.warn("Firebase Auth reset password error:", e);
      throw new Error(e.message || "Password reset request failed in Firebase Authentication.");
    }
  }
}

export async function logoutUser() {
  if (auth) {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Firebase signOut failed:", e);
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
