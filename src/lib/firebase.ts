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
    console.warn("Firestore/Firebase marked as UNHEALTHY. Bypassing Firebase for the rest of the session.");
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

// Subscription helper
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
    
    // Unsubscribe from any Firebase-related events
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

  // FIREBASE SUB with robust timeout/error detection
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

// Standalone Mutation Helpers
export async function saveDocument<T extends Identifiable>(
  collectionName: string,
  localFallbackKey: string,
  item: T
) {
  let success = false;
  if (isFirebaseConfigured && db && isFirestoreHealthy) {
    try {
      const docRef = doc(db, collectionName, item.id);
      await withTimeout(setDoc(docRef, item), 5000);
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
        batch.set(docRef, item);
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

// User Auth Operations using Firebase Authentication (Auth Tab in Console, NOT Firestore)
export async function getUserByEmailOrUsername(queryStr: string): Promise<User | null> {
  const trimmed = queryStr.trim().toLowerCase();
  if (!trimmed) return null;

  // Check current signed in user or local cache
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
 * Register user directly in Firebase Authentication (Auth service), NOT in Firestore.
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
    throw new Error("Full Name, email, and password are required");
  }

  // 1. Primary: Save User in Firebase Authentication
  if (isFirebaseConfigured && auth && isFirestoreHealthy) {
    try {
      const userCredential = await withTimeout(
        createUserWithEmailAndPassword(auth, trimmedEmail, password),
        8000
      );

      if (userCredential.user) {
        // Set display name in Firebase Auth user profile
        await updateProfile(userCredential.user, {
          displayName: trimmedName
        });

        const newUser: User = {
          id: userCredential.user.uid,
          name: trimmedName,
          email: trimmedEmail,
          password: '••••••••', // Never store plain password
          phoneNumber: trimmedPhone,
          role: role
        };

        // Local cache for app session persistence
        const savedLocal = localStorage.getItem('gather_users_local');
        const localUsers: User[] = savedLocal ? JSON.parse(savedLocal) : [];
        if (!localUsers.some(u => u.id === newUser.id || u.email === trimmedEmail)) {
          localUsers.push(newUser);
          localStorage.setItem('gather_users_local', JSON.stringify(localUsers));
        }

        return newUser;
      }
    } catch (e: any) {
      console.warn("Firebase Authentication error on sign up:", e);
      if (e.code === 'auth/email-already-in-use') {
        throw new Error("An account with this email already exists in Firebase Authentication. Please log in.");
      } else if (e.code === 'auth/weak-password') {
        throw new Error("Password must be at least 6 characters long.");
      } else if (e.code === 'auth/invalid-email') {
        throw new Error("Please enter a valid email address.");
      }
    }
  }

  // 2. Local Fallback Sandbox Registration if Firebase Auth offline
  const saved = localStorage.getItem('gather_users_local');
  const users: User[] = saved ? JSON.parse(saved) : [];

  if (users.some(u => u.email && u.email.trim().toLowerCase() === trimmedEmail)) {
    throw new Error("A user with this email address already exists. Please log in instead.");
  }

  const newUser: User = {
    id: `user-${Date.now()}`,
    name: trimmedName,
    email: trimmedEmail,
    password: password,
    phoneNumber: trimmedPhone || '',
    role: role
  };

  users.push(newUser);
  localStorage.setItem('gather_users_local', JSON.stringify(users));
  return newUser;
}

/**
 * Log in user using Firebase Authentication service.
 */
export async function loginUser(
  emailOrPhone: string,
  password: string,
  role: 'member' | 'temple_team'
): Promise<User> {
  const trimmedInput = emailOrPhone.trim().toLowerCase();
  if (!trimmedInput || !password) {
    throw new Error("Email address and password are required");
  }

  // 1. Primary: Verify & Log In with Firebase Authentication
  if (isFirebaseConfigured && auth && isFirestoreHealthy) {
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

        // Cache user details locally
        const savedLocal = localStorage.getItem('gather_users_local');
        const localUsers: User[] = savedLocal ? JSON.parse(savedLocal) : [];
        const idx = localUsers.findIndex(u => u.id === loggedInUser.id || u.email === trimmedInput);
        if (idx > -1) {
          localUsers[idx] = { ...localUsers[idx], ...loggedInUser };
        } else {
          localUsers.push(loggedInUser);
        }
        localStorage.setItem('gather_users_local', JSON.stringify(localUsers));

        return loggedInUser;
      }
    } catch (e: any) {
      console.warn("Firebase Authentication error on login:", e);
      if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password') {
        throw new Error("Invalid email or password.");
      }
    }
  }

  // 2. Local Fallback Sandbox Login
  const saved = localStorage.getItem('gather_users_local');
  const users: User[] = saved ? JSON.parse(saved) : [];
  const foundUser = users.find(u => 
    u.role === role && 
    ((u.email && u.email.toLowerCase() === trimmedInput) || (u.name && u.name.toLowerCase() === trimmedInput))
  );

  if (!foundUser) {
    throw new Error("User not found");
  }
  if (foundUser.password !== '••••••••' && foundUser.password !== password) {
    throw new Error("Password wrong");
  }

  return foundUser;
}

/**
 * Reset password natively via Firebase Authentication or local fallback.
 */
export async function resetUserPassword(
  nameOrEmail: string,
  emailOrPhone: string,
  newPassword: string,
  role: 'member' | 'temple_team'
): Promise<void> {
  const targetEmail = (emailOrPhone.includes('@') ? emailOrPhone : nameOrEmail).trim().toLowerCase();

  if (isFirebaseConfigured && auth && isFirestoreHealthy) {
    try {
      await sendPasswordResetEmail(auth, targetEmail);
      if (auth.currentUser && auth.currentUser.email?.toLowerCase() === targetEmail) {
        await updatePassword(auth.currentUser, newPassword);
      }
      return;
    } catch (e) {
      console.warn("Firebase Auth password reset error:", e);
    }
  }

  // Local fallback
  const savedLocal = localStorage.getItem('gather_users_local');
  const localUsers: User[] = savedLocal ? JSON.parse(savedLocal) : [];
  const localIdx = localUsers.findIndex(u => u.email?.toLowerCase() === targetEmail || u.name?.toLowerCase() === targetEmail);

  if (localIdx > -1) {
    localUsers[localIdx].password = newPassword;
    localStorage.setItem('gather_users_local', JSON.stringify(localUsers));
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
