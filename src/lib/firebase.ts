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


const metaEnv = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || '',
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: metaEnv.VITE_FIREBASE_APP_ID || ''
};

export const isFirebaseConfigured = !!(
  metaEnv.VITE_FIREBASE_API_KEY && 
  metaEnv.VITE_FIREBASE_PROJECT_ID
);

let app;
let db: any = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
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

  const registerLocally = () => {
    const saved = localStorage.getItem('gather_users_local');
    const users: User[] = saved ? JSON.parse(saved) : [];
    if (users.some(u => u.name.toLowerCase() === trimmedName.toLowerCase())) {
      throw new Error("A user with this name already exists");
    }
    if (users.some(u => u.phoneNumber === trimmedPhone)) {
      throw new Error("A user with this phone number already exists");
    }
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: trimmedName,
      password: password,
      phoneNumber: trimmedPhone,
      role: role
    };
    users.push(newUser);
    localStorage.setItem('gather_users_local', JSON.stringify(users));
    return newUser;
  };

  if (!isFirebaseConfigured || !db || !isFirestoreHealthy) {
    return registerLocally();
  }

  try {
    const colRef = collection(db, 'users');
    
    // Check name
    const qName = query(colRef, where('name', '==', trimmedName));
    const snapName = await withTimeout(getDocs(qName), 5000);
    if (!snapName.empty) {
      throw new Error("A user with this name already exists");
    }

    // Check phone
    const qPhone = query(colRef, where('phoneNumber', '==', trimmedPhone));
    const snapPhone = await withTimeout(getDocs(qPhone), 5000);
    if (!snapPhone.empty) {
      throw new Error("A user with this phone number already exists");
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      name: trimmedName,
      password: password,
      phoneNumber: trimmedPhone,
      role: role
    };

    const docRef = doc(db, 'users', newUser.id);
    await withTimeout(setDoc(docRef, newUser), 5000);

    return newUser;
  } catch (e: any) {
    console.warn("Firebase registration failed, falling back to local storage:", e);
    if (
      e.message === "A user with this name already exists" ||
      e.message === "A user with this phone number already exists" ||
      e.message === "Name, password, and phone number are required"
    ) {
      throw e;
    }
    try {
      return registerLocally();
    } catch (localError: any) {
      throw localError;
    }
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

  const loginLocally = () => {
    const saved = localStorage.getItem('gather_users_local');
    const users: User[] = saved ? JSON.parse(saved) : [];
    const foundUser = users.find(
      u =>
        (u.name.toLowerCase() === trimmedInput.toLowerCase() || u.phoneNumber === trimmedInput) &&
        u.password === password &&
        u.role === role
    );
    if (!foundUser) {
      throw new Error(`Invalid credentials or role for ${role === 'member' ? 'Members' : 'Temple Team'}`);
    }
    return foundUser;
  };

  if (!isFirebaseConfigured || !db || !isFirestoreHealthy) {
    return loginLocally();
  }

  try {
    const colRef = collection(db, 'users');
    let q = query(
      colRef,
      where('name', '==', trimmedInput),
      where('role', '==', role)
    );
    let querySnapshot = await withTimeout(getDocs(q), 5000);

    if (querySnapshot.empty) {
      q = query(
        colRef,
        where('phoneNumber', '==', trimmedInput),
        where('role', '==', role)
      );
      querySnapshot = await withTimeout(getDocs(q), 5000);
    }

    if (querySnapshot.empty) {
      throw new Error(`Invalid credentials or role for ${role === 'member' ? 'Members' : 'Temple Team'}`);
    }

    let foundUser: User | null = null;
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as User;
      if (data.password === password) {
        foundUser = data;
      }
    });

    if (!foundUser) {
      throw new Error(`Invalid credentials or role for ${role === 'member' ? 'Members' : 'Temple Team'}`);
    }

    return foundUser;
  } catch (e: any) {
    console.warn("Firebase login failed, trying local storage fallback:", e);
    if (
      e.message.startsWith("Invalid credentials") ||
      e.message === "Username/phone and password are required"
    ) {
      throw e;
    }
    try {
      return loginLocally();
    } catch {
      throw new Error(`Invalid credentials or role for ${role === 'member' ? 'Members' : 'Temple Team'}`);
    }
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

