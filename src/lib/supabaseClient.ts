import { createClient } from '@supabase/supabase-js';

// 1. SUPABASE CLIENT INITIALIZATION
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wfbkgfotpzscjyaanzpx.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmtnZm90cHpzY2p5YWFuenB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzMzNjEsImV4cCI6MjA5OTUwOTM2MX0.Z_Is7xk8QdTWCTgj-L9X6Bm7s0-RTMBE9DW7o2qSHg4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Log status
console.log('Premium 2026 Supabase client initialized at:', supabaseUrl);

// 2. FIRESTORE COMPATIBILITY TYPES
export interface CollectionReference {
  type: 'collection';
  path: string;
}

export interface DocumentReference {
  type: 'doc';
  collectionPath: string;
  id: string;
}

export interface QueryConstraint {
  type: string;
  field?: string;
  op?: string;
  val?: any;
  direction?: string;
  limitNum?: number;
  conditions?: any[];
}

// 3. MOCK DATABASE INSTANCE
export const db = { name: 'supabase-backed-firestore' };
export const app = { name: 'supabase-backed-app' };

// 4. SEED DATA & LOCAL FALLBACK CACHE (for seamless operation even if the table doesn't exist yet)
export const SEED_USERS = [
  {
    uid: 'master-admin-uid',
    name: 'Sunil Sharma',
    displayName: 'Sunil Sharma (Super Admin)',
    phone: '+919999999999',
    password: 'password123',
    role: 'MASTER_ADMIN',
    membershipStatus: 'ACTIVE',
    createdAt: '2026-07-15T00:00:00.000Z',
    city: 'Bangalore',
    area: 'Indiranagar'
  },
  {
    uid: 'chapter-admin-uid',
    name: 'Sunil S.R',
    displayName: 'Sunil S.R (Chapter Lead)',
    phone: '+919844955100',
    password: 'Welcome@123',
    role: 'CHAPTER_ADMIN',
    membershipStatus: 'ACTIVE',
    adminId: 'master-admin-uid',
    associatedChapterAdminId: 'master-admin-uid',
    createdAt: '2026-07-15T00:00:00.000Z',
    city: 'Bangalore',
    area: 'Whitefield'
  },
  {
    uid: 'regular-member-uid',
    name: 'Sudarshan Vagale',
    displayName: 'Sudarshan Vagale (Real Estate)',
    phone: '+919945275995',
    password: '9945275995',
    role: 'MEMBER',
    membershipStatus: 'ACTIVE',
    adminId: 'chapter-admin-uid',
    associatedChapterAdminId: 'chapter-admin-uid',
    category: 'Real Estate',
    businessName: 'Vagale Real Estate',
    city: 'Bangalore',
    area: 'Indiranagar',
    createdAt: '2026-07-15T00:00:00.000Z'
  }
];

export const SEED_CATEGORIES = [
  { id: 'cat-1', name: 'Real Estate', status: 'ACTIVE' },
  { id: 'cat-2', name: 'IT Services', status: 'ACTIVE' },
  { id: 'cat-3', name: 'Legal Services', status: 'ACTIVE' },
  { id: 'cat-4', name: 'Marketing & Advertising', status: 'ACTIVE' },
  { id: 'cat-5', name: 'Financial Services', status: 'ACTIVE' },
  { id: 'cat-6', name: 'Healthcare', status: 'ACTIVE' },
  { id: 'cat-7', name: 'Construction', status: 'ACTIVE' },
  { id: 'cat-8', name: 'Education', status: 'ACTIVE' },
  { id: 'cat-9', name: 'Interior Design', status: 'ACTIVE' },
  { id: 'cat-10', name: 'Event Management', status: 'ACTIVE' }
];

function setLocalDoc(collectionPath: string, id: string, data: any) {
  const key = `sb_fallback:${collectionPath}:${id}`;
  localStorage.setItem(key, JSON.stringify(data));
}

function getLocalDoc(collectionPath: string, id: string): any {
  const key = `sb_fallback:${collectionPath}:${id}`;
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return {
        exists: () => true,
        id,
        data: () => parsed
      };
    } catch {
      // ignore
    }
  }

  // Look up in our SEED data
  if (collectionPath === 'users') {
    const seedUser = SEED_USERS.find(u => u.uid === id);
    if (seedUser) {
      setLocalDoc('users', id, seedUser);
      // Attempt to upsert in Supabase table in background
      (async () => {
        try {
          await supabase.from('documents').upsert({
            collection: 'users',
            id: id,
            data: seedUser,
            updated_at: new Date().toISOString()
          }, { onConflict: 'collection,id' });
        } catch (e) {
          // ignore
        }
      })();

      return {
        exists: () => true,
        id,
        data: () => seedUser
      };
    }
  }

  if (collectionPath === 'categories') {
    const seedCat = SEED_CATEGORIES.find(c => c.id === id);
    if (seedCat) {
      setLocalDoc('categories', id, seedCat);
      return {
        exists: () => true,
        id,
        data: () => seedCat
      };
    }
  }

  return {
    exists: () => false,
    id,
    data: () => undefined
  };
}

function deleteLocalDoc(collectionPath: string, id: string) {
  const key = `sb_fallback:${collectionPath}:${id}`;
  localStorage.removeItem(key);
}

function getLocalCollection(collectionPath: string): any[] {
  const prefix = `sb_fallback:${collectionPath}:`;
  const items: any[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      const id = key.substring(prefix.length);
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          items.push({ id, ...JSON.parse(saved) });
        } catch {
          // ignore
        }
      }
    }
  }

  if (collectionPath === 'users') {
    SEED_USERS.forEach(user => {
      if (!items.some(item => item.uid === user.uid || item.phone === user.phone)) {
        setLocalDoc('users', user.uid, user);
        items.push({ id: user.uid, ...user });
      }
    });
  }

  if (collectionPath === 'categories' && items.length === 0) {
    SEED_CATEGORIES.forEach(cat => {
      setLocalDoc('categories', cat.id, cat);
      items.push({ id: cat.id, ...cat });
    });
  }

  return items;
}

// 5. FIRESTORE OPERATORS & REFERENCE BUILDERS
export function collection(dbRef: any, path: string): CollectionReference {
  return { type: 'collection', path };
}

export function doc(...args: any[]): DocumentReference {
  if (args.length === 3) {
    // doc(db, collectionPath, id)
    return { type: 'doc', collectionPath: args[1], id: args[2] };
  } else if (args.length === 2) {
    // doc(collectionRef, id)
    return { type: 'doc', collectionPath: args[0].path, id: args[1] };
  }
  throw new Error("Invalid arguments to doc()");
}

export function query(collectionRef: any, ...constraints: any[]): any {
  return {
    type: 'query',
    collectionPath: collectionRef.path,
    constraints: constraints.filter(Boolean)
  };
}

export function where(field: string, op: string, val: any): QueryConstraint {
  return { type: 'where', field, op, val };
}

export function or(...args: any[]): QueryConstraint {
  return { type: 'or', conditions: args };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): QueryConstraint {
  return { type: 'orderBy', field, direction };
}

export function limit(limitNum: number): QueryConstraint {
  return { type: 'limit', limitNum };
}

export function serverTimestamp(): string {
  return new Date().toISOString();
}

// 6. SNAPSHOT & REACTION BUS
const listeners = new Map<string, Set<() => void>>();

export function subscribeToCollection(collectionPath: string, callback: () => void): () => void {
  if (!listeners.has(collectionPath)) {
    listeners.set(collectionPath, new Set());
  }
  listeners.get(collectionPath)!.add(callback);

  // Set up Supabase Realtime Channel
  const uniqueSubId = Math.random().toString(36).substring(2, 10);
  const channel = supabase
    .channel(`realtime:${collectionPath}:${uniqueSubId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'documents',
      filter: `collection=eq.${collectionPath}`
    }, () => {
      callback();
    })
    .subscribe();

  return () => {
    listeners.get(collectionPath)?.delete(callback);
    supabase.removeChannel(channel);
  };
}

function notifyListeners(collectionPath: string) {
  const set = listeners.get(collectionPath);
  if (set) {
    set.forEach(cb => {
      try {
        cb();
      } catch (err) {
        console.error("Error in snapshot subscriber:", err);
      }
    });
  }
}

// 7. READ & WRITE ACTIONS
export async function getDoc(docRef: DocumentReference): Promise<any> {
  const { collectionPath, id } = docRef;
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('data')
      .eq('collection', collectionPath)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      if (error.code === '42P01') {
        // Table doesn't exist yet, fallback to localStorage
        return getLocalDoc(collectionPath, id);
      }
      throw error;
    }

    if (data) {
      // Keep fallback in sync
      setLocalDoc(collectionPath, id, data.data);
      return {
        exists: () => true,
        id,
        data: () => data.data
      };
    } else {
      return getLocalDoc(collectionPath, id);
    }
  } catch (err) {
    console.warn("Supabase fetch failed, using local storage:", err);
    return getLocalDoc(collectionPath, id);
  }
}

export async function getDocFromServer(docRef: DocumentReference): Promise<any> {
  return getDoc(docRef);
}

export async function getDocs(queryRef: any): Promise<any> {
  const collectionPath = queryRef.collectionPath || queryRef.path;
  const constraints = queryRef.constraints || [];

  let results: any[] = [];

  try {
    const { data, error } = await supabase
      .from('documents')
      .select('id, data')
      .eq('collection', collectionPath);

    if (error) {
      if (error.code === '42P01') {
        results = getLocalCollection(collectionPath);
      } else {
        throw error;
      }
    } else {
      results = data ? data.map(row => ({ id: row.id, ...row.data })) : [];
      // Keep local store in sync
      results.forEach(item => {
        const { id, ...dataOnly } = item;
        setLocalDoc(collectionPath, id, dataOnly);
      });
    }
  } catch (err) {
    console.warn("Supabase getDocs failed, using local storage:", err);
    results = getLocalCollection(collectionPath);
  }

  // Inject Seed data to ensure standard demo/admin roles and categories are always present
  if (collectionPath === 'users') {
    SEED_USERS.forEach(user => {
      if (!results.some(item => item.uid === user.uid || item.phone === user.phone)) {
        setLocalDoc('users', user.uid, user);
        results.push({ id: user.uid, ...user });
      }
    });
  } else if (collectionPath === 'categories' && results.length === 0) {
    SEED_CATEGORIES.forEach(cat => {
      setLocalDoc('categories', cat.id, cat);
      results.push({ id: cat.id, ...cat });
    });
  }

  // Apply Firestore constraints in-memory
  for (const constraint of constraints) {
    if (constraint.type === 'where') {
      const { field, op, val } = constraint;
      results = results.filter(item => {
        const itemVal = item[field];
        if (op === '==') return itemVal === val;
        if (op === '!=') return itemVal !== val;
        if (op === '<') return itemVal < val;
        if (op === '<=') return itemVal <= val;
        if (op === '>') return itemVal > val;
        if (op === '>=') return itemVal >= val;
        if (op === 'array-contains') return Array.isArray(itemVal) && itemVal.includes(val);
        return true;
      });
    } else if (constraint.type === 'or') {
      results = results.filter(item => {
        return constraint.conditions?.some((cond: any) => {
          const itemVal = item[cond.field];
          if (cond.op === '==') return itemVal === cond.val;
          if (cond.op === '!=') return itemVal !== cond.val;
          return false;
        });
      });
    } else if (constraint.type === 'orderBy') {
      const { field, direction } = constraint;
      results.sort((a, b) => {
        const valA = a[field];
        const valB = b[field];
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        if (valA < valB) return direction === 'desc' ? 1 : -1;
        if (valA > valB) return direction === 'desc' ? -1 : 1;
        return 0;
      });
    } else if (constraint.type === 'limit') {
      results = results.slice(0, constraint.limitNum);
    }
  }

  return {
    empty: results.length === 0,
    docs: results.map(item => ({
      id: item.id,
      data: () => {
        const { id, ...dataOnly } = item;
        return dataOnly;
      }
    }))
  };
}

export async function setDoc(docRef: DocumentReference, data: any): Promise<void> {
  const { collectionPath, id } = docRef;
  
  // Sync to local fallback first
  setLocalDoc(collectionPath, id, data);

  try {
    const { error } = await supabase
      .from('documents')
      .upsert({
        collection: collectionPath,
        id: id,
        data: data,
        updated_at: new Date().toISOString()
      }, { onConflict: 'collection,id' });

    if (error && error.code !== '42P01') {
      throw error;
    }
  } catch (err) {
    console.warn("Supabase upsert failed, operating in offline fallback:", err);
  }

  notifyListeners(collectionPath);
}

export async function addDoc(collectionRef: CollectionReference, data: any): Promise<DocumentReference> {
  const collectionPath = collectionRef.path;
  const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const id = generateId();
  const docRef: DocumentReference = { type: 'doc', collectionPath, id };
  await setDoc(docRef, data);
  return docRef;
}

export async function updateDoc(docRef: DocumentReference, partialData: any): Promise<void> {
  const current = await getDoc(docRef);
  const existingData = current.exists() ? current.data() : {};
  const newData = { ...existingData, ...partialData };
  await setDoc(docRef, newData);
}

export async function deleteDoc(docRef: DocumentReference): Promise<void> {
  const { collectionPath, id } = docRef;

  deleteLocalDoc(collectionPath, id);

  try {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('collection', collectionPath)
      .eq('id', id);

    if (error && error.code !== '42P01') {
      throw error;
    }
  } catch (err) {
    console.warn("Supabase delete failed:", err);
  }

  notifyListeners(collectionPath);
}

export function onSnapshot(queryRef: any, callback: (snapshot: any) => void, errorCallback?: (error: any) => void): () => void {
  const collectionPath = queryRef.collectionPath || queryRef.path;

  const trigger = async () => {
    try {
      const snap = await getDocs(queryRef);
      callback(snap);
    } catch (err) {
      if (errorCallback) errorCallback(err);
    }
  };

  trigger();
  return subscribeToCollection(collectionPath, trigger);
}

export function writeBatch() {
  const ops: (() => Promise<void>)[] = [];
  return {
    set: (docRef: DocumentReference, data: any) => {
      ops.push(() => setDoc(docRef, data));
    },
    update: (docRef: DocumentReference, partialData: any) => {
      ops.push(() => updateDoc(docRef, partialData));
    },
    delete: (docRef: DocumentReference) => {
      ops.push(() => deleteDoc(docRef));
    },
    commit: async () => {
      for (const op of ops) {
        await op();
      }
    }
  };
}

// 8. HIGH-FIDELITY AUTH MOCK
export const auth = {
  currentUser: null as any
};

export class GoogleAuthProvider {
  static PROVIDER_ID = 'google.com';
}

export const googleProvider = new GoogleAuthProvider();

const authStateCallbacks = new Set<(user: any) => void>();

export function onAuthStateChanged(authRef: any, callback: (user: any) => void): () => void {
  authStateCallbacks.add(callback);
  
  const savedUser = localStorage.getItem('user');
  if (savedUser) {
    try {
      const { uid } = JSON.parse(savedUser);
      auth.currentUser = { uid, emailVerified: true };
      callback(auth.currentUser);
    } catch {
      auth.currentUser = null;
      callback(null);
    }
  } else {
    auth.currentUser = null;
    callback(null);
  }

  return () => {
    authStateCallbacks.delete(callback);
  };
}

export function triggerAuthStateChanged() {
  const savedUser = localStorage.getItem('user');
  let currentUser = null;
  if (savedUser) {
    try {
      const { uid } = JSON.parse(savedUser);
      currentUser = { uid, emailVerified: true };
    } catch {
      // ignore
    }
  }
  auth.currentUser = currentUser;
  authStateCallbacks.forEach(cb => cb(currentUser));
}

export function getAuth() {
  return auth;
}

export async function signOut(authRef: any): Promise<void> {
  auth.currentUser = null;
  localStorage.removeItem('user');
  sessionStorage.clear();
  authStateCallbacks.forEach(cb => cb(null));
}

export function logOut(): Promise<void> {
  return signOut(auth);
}

export async function signInWithPopup(): Promise<any> {
  return { user: { uid: 'mock-google-user' } };
}

export function signInWithCustomToken() {
  return Promise.resolve();
}

export class RecaptchaVerifier {
  constructor(container: any, options: any, auth: any) {}
  clear() {}
  render() { return Promise.resolve(1); }
}

export async function signInWithPhoneNumber(authRef: any, phone: string, verifier: any): Promise<any> {
  console.log("Supabase Mock OTP initiated for:", phone);
  return {
    confirm: async (code: string) => {
      return {
        user: { uid: 'mock-user-' + Math.random().toString(36).substring(7), phoneNumber: phone }
      };
    }
  };
}

export async function signInWithEmailAndPassword(authRef: any, email: string, pass: string): Promise<any> {
  return { user: { uid: 'email-user' } };
}

export async function createUserWithEmailAndPassword(authRef: any, email: string, pass: string): Promise<any> {
  return { user: { uid: 'new-email-user' } };
}

export async function sendPasswordResetEmail(): Promise<void> {
  return Promise.resolve();
}

export function initializeApp() {
  return app;
}

export function getFirestore() {
  return db;
}

// 9. CHECK CONNECTION UTILITY
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('documents').select('id').limit(1);
    if (error && error.code === '42P01') {
      console.warn("Supabase database connection successful, but 'documents' table is not created yet.");
      return true; // Connection was reached, table just needs creating!
    }
    return !error;
  } catch {
    return false;
  }
}
