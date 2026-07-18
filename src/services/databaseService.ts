import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  onSnapshot
} from '../lib/database';

export const db = {}; // dummy

export const databaseService = {
  async get<T>(path: string, id: string): Promise<T | null> {
    try {
      const docRef = doc(db, path, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const obj = { id: docSnap.id, ...data } as T;
        if (path === 'users' && !(obj as any).uid) {
          (obj as any).uid = docSnap.id;
        }
        return obj;
      }
      return null;
    } catch (error) {
      console.error('Database get error:', error);
      return null;
    }
  },

  async list<T>(path: string, constraints: any[] = []): Promise<T[]> {
    try {
      const q = query(collection(db, path), ...constraints);
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(d => {
        const data = d.data();
        const obj = { id: d.id, ...data } as T;
        if (path === 'users' && !(obj as any).uid) {
          (obj as any).uid = d.id;
        }
        return obj;
      });
    } catch (error) {
      console.error('Database list error:', error);
      return [];
    }
  },

  async create<T extends object>(path: string, data: T, id?: string): Promise<string> {
    try {
      if (id) {
        await setDoc(doc(db, path, id), data);
        return id;
      } else {
        const res = await addDoc(collection(db, path), data);
        return res.id;
      }
    } catch (error) {
      console.error('Database create error:', error);
      return '';
    }
  },

  async update<T extends object>(path: string, id: string, data: Partial<T>): Promise<void> {
    try {
      await updateDoc(doc(db, path, id), data);
    } catch (error) {
      console.error('Database update error:', error);
    }
  },

  async delete(path: string, id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, path, id));
    } catch (error) {
      console.error('Database delete error:', error);
    }
  },

  subscribe<T>(path: string, constraints: any[], callback: (data: T[]) => void, onError?: (error: any) => void) {
    const q = query(collection(db, path), ...constraints);
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map((d: any) => {
        const data = d.data();
        const obj = { id: d.id, ...data } as T;
        if (path === 'users' && !(obj as any).uid) {
          (obj as any).uid = d.id;
        }
        return obj;
      }));
    });
  }
};
