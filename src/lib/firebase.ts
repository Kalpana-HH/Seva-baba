import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc as firestoreDeleteDoc, 
  onSnapshot, 
  getDocs, 
  writeBatch,
  query,
  where
} from 'firebase/firestore';
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

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = firebaseConfig.firestoreDatabaseId 
      ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app);
  } catch (error) {
    console.error('Firebase initialization failed:', error);
  }
}

export { db };

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
    console.warn("Firestore marked as UNHEALTHY. Bypassing Firebase for the rest of the session.");
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
    // Trigger custom storage event for current window
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

// User Auth Database Operations
export async function getUserByPhoneNumber(phone: string): Promise<User | null> {
  const trimmedPhone = phone.trim();
  if (!trimmedPhone) return null;

  const findLocally = () => {
    const saved = localStorage.getItem('gather_users_local');
    const users: User[] = saved ? JSON.parse(saved) : [];
    return users.find(u => u.phoneNumber === trimmedPhone) || null;
  };

  if (!isFirebaseConfigured || !db || !isFirestoreHealthy) {
    return findLocally();
  }

  try {
    const colRef = collection(db, 'users');
    const q = query(colRef, where('phoneNumber', '==', trimmedPhone));
    const querySnapshot = await withTimeout(getDocs(q), 5000);
    if (querySnapshot.empty) {
      return null;
    }
    let found: User | null = null;
    querySnapshot.forEach((docSnap) => {
      found = docSnap.data() as User;
    });
    return found;
  } catch (e) {
    console.warn("Firebase query by phone failed, trying local storage:", e);
    return findLocally();
  }
}

export async function registerUser(
  name: string,
  password: string,
  phoneNumber: string,
  role: 'member' | 'temple_team'
): Promise<User> {
  const trimmedName = name.trim();
  const trimmedPhone = phoneNumber.trim();
  if (!trimmedName || !password || !trimmedPhone) {
    throw new Error("Name, password, and phone number are required");
  }

  const nameLower = trimmedName.toLowerCase();
  const phoneDigits = trimmedPhone.replace(/\D/g, '');

  const checkDuplicatesAndBuild = (existingUsers: User[]): User => {
    if (existingUsers.some(u => u.name && u.name.trim().toLowerCase() === nameLower)) {
      throw new Error("A user with this name already exists. Please pick a different name or log in.");
    }
    if (existingUsers.some(u => {
      const uDigits = u.phoneNumber ? u.phoneNumber.replace(/\D/g, '') : '';
      return u.phoneNumber === trimmedPhone || (phoneDigits.length >= 7 && uDigits === phoneDigits);
    })) {
      throw new Error("A user with this phone number already exists. Please log in instead.");
    }

    return {
      id: `user-${Date.now()}`,
      name: trimmedName,
      password: password,
      phoneNumber: trimmedPhone,
      role: role
    };
  };

  const registerLocally = () => {
    const saved = localStorage.getItem('gather_users_local');
    const users: User[] = saved ? JSON.parse(saved) : [];
    const newUser = checkDuplicatesAndBuild(users);
    users.push(newUser);
    localStorage.setItem('gather_users_local', JSON.stringify(users));
    return newUser;
  };

  if (!isFirebaseConfigured || !db || !isFirestoreHealthy) {
    return registerLocally();
  }

  try {
    const colRef = collection(db, 'users');
    const snap = await withTimeout(getDocs(colRef), 5000);
    const firestoreUsers: User[] = [];
    snap.forEach(docSnap => firestoreUsers.push(docSnap.data() as User));

    const savedLocal = localStorage.getItem('gather_users_local');
    const localUsers: User[] = savedLocal ? JSON.parse(savedLocal) : [];
    const allUsers = [...firestoreUsers, ...localUsers];

    const newUser = checkDuplicatesAndBuild(allUsers);

    const docRef = doc(db, 'users', newUser.id);
    await withTimeout(setDoc(docRef, newUser), 5000);

    // Save locally as backup
    const usersLocal: User[] = savedLocal ? JSON.parse(savedLocal) : [];
    if (!usersLocal.some(u => u.id === newUser.id)) {
      usersLocal.push(newUser);
      localStorage.setItem('gather_users_local', JSON.stringify(usersLocal));
    }

    return newUser;
  } catch (e: any) {
    console.warn("Firebase registration failed, falling back to local storage:", e);
    if (
      e.message.includes("already exists") ||
      e.message === "Name, password, and phone number are required"
    ) {
      throw e;
    }
    return registerLocally();
  }
}

export async function loginUser(
  nameOrPhone: string,
  password: string,
  role: 'member' | 'temple_team'
): Promise<User> {
  const trimmedInput = nameOrPhone.trim();
  if (!trimmedInput || !password) {
    throw new Error("Username/phone and password are required");
  }

  const inputLower = trimmedInput.toLowerCase();
  const inputDigits = trimmedInput.replace(/\D/g, '');

  const processUserList = (allUsers: User[]): User => {
    const roleUsers = allUsers.filter(u => u.role === role);
    
    // 1. If no users exist for this role at all
    if (roleUsers.length === 0) {
      const otherRole = role === 'member' ? 'temple_team' : 'member';
      const userInOtherRole = allUsers.find(u => 
        u.role === otherRole && (
          (u.name && u.name.trim().toLowerCase() === inputLower) ||
          (u.phoneNumber && u.phoneNumber.trim() === trimmedInput) ||
          (inputDigits.length >= 7 && u.phoneNumber && u.phoneNumber.replace(/\D/g, '') === inputDigits)
        )
      );
      if (userInOtherRole) {
        throw new Error(`This account is registered under ${otherRole === 'member' ? 'Member Access' : 'Temple Team Access'}. Please switch access tabs above.`);
      }
      throw new Error(`No ${role === 'member' ? 'Member' : 'Temple Team'} accounts exist on this deployment yet. Please click 'Sign Up' above to create an account!`);
    }

    // 2. Search for matching user in current role
    const foundUser = roleUsers.find(u => {
      const matchName = u.name && u.name.trim().toLowerCase() === inputLower;
      const matchPhoneExact = u.phoneNumber && u.phoneNumber.trim() === trimmedInput;
      const matchPhoneDigits = u.phoneNumber && inputDigits.length >= 7 && u.phoneNumber.replace(/\D/g, '') === inputDigits;
      return matchName || matchPhoneExact || matchPhoneDigits;
    });

    if (!foundUser) {
      const otherRole = role === 'member' ? 'temple_team' : 'member';
      const userInOtherRole = allUsers.find(u => 
        u.role === otherRole && (
          (u.name && u.name.trim().toLowerCase() === inputLower) ||
          (u.phoneNumber && u.phoneNumber.trim() === trimmedInput) ||
          (inputDigits.length >= 7 && u.phoneNumber && u.phoneNumber.replace(/\D/g, '') === inputDigits)
        )
      );
      if (userInOtherRole) {
        throw new Error(`This account is registered under ${otherRole === 'member' ? 'Member Access' : 'Temple Team Access'}. Please switch access tabs above.`);
      }
      throw new Error(`Account '${trimmedInput}' not found. Please click 'Sign Up' above to create your account.`);
    }

    // 3. Verify password
    if (foundUser.password !== password) {
      throw new Error(`Incorrect password for '${foundUser.name}'. Please check your password and try again.`);
    }

    return foundUser;
  };

  const loginLocally = () => {
    const saved = localStorage.getItem('gather_users_local');
    const users: User[] = saved ? JSON.parse(saved) : [];
    return processUserList(users);
  };

  if (!isFirebaseConfigured || !db || !isFirestoreHealthy) {
    return loginLocally();
  }

  try {
    const colRef = collection(db, 'users');
    const querySnapshot = await withTimeout(getDocs(colRef), 5000);
    const firestoreUsers: User[] = [];
    querySnapshot.forEach(docSnap => {
      firestoreUsers.push(docSnap.data() as User);
    });

    const savedLocal = localStorage.getItem('gather_users_local');
    const localUsers: User[] = savedLocal ? JSON.parse(savedLocal) : [];
    
    const allUsers = [...firestoreUsers];
    localUsers.forEach(lu => {
      if (!allUsers.some(fu => fu.id === lu.id || (fu.phoneNumber && lu.phoneNumber && fu.phoneNumber === lu.phoneNumber))) {
        allUsers.push(lu);
      }
    });

    return processUserList(allUsers);
  } catch (e: any) {
    console.warn("Firebase query failed, trying local storage fallback:", e);
    if (
      e.message.includes("not found") ||
      e.message.includes("Incorrect password") ||
      e.message.includes("registered under") ||
      e.message.includes("exist on this deployment yet") ||
      e.message === "Username/phone and password are required"
    ) {
      throw e;
    }
    return loginLocally();
  }
}

export async function wipeAllDatabaseAndStorage() {
  // 1. Clear LocalStorage keys
  localStorage.clear();
  
  // 2. Delete Firestore collections if configured
  if (isFirebaseConfigured && db) {
    try {
      const collectionsToWipe = ['users', 'events', 'foods', 'tasks'];
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
      console.log("Firestore databases wiped successfully.");
    } catch (e) {
      console.error("Failed to wipe Firestore databases:", e);
    }
  }
}

