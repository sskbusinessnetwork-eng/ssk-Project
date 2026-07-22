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
import { supabase } from '../lib/supabaseClient';

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
      if (path === 'categories') {
        const globalDoc = await databaseService.get<any>('users', 'global_categories');
        if (globalDoc && globalDoc.categoriesJson) {
          try {
            return JSON.parse(globalDoc.categoriesJson) as T[];
          } catch (e) {
            console.error('Error parsing categories JSON:', e);
          }
        }
        // Fallback default list of categories
        return [
          'Real Estate', 'IT Services', 'Legal Services', 'Marketing & Advertising',
          'Financial Services', 'Healthcare', 'Construction', 'Education',
          'Interior Design', 'Event Management', 'Automobile', 'Hospitality',
          'E-commerce', 'Manufacturing', 'Consulting', 'Logistics', 'Printing',
          'Yoga & Wellness', 'Hardware', 'Fashion Design'
        ].map((name, index) => ({ id: `cat-${index}`, name, status: 'Active' })) as any;
      }

      const q = query(collection(db, path), ...constraints);
      const querySnapshot: any = await getDocs(q);
      const docsArr = Array.isArray(querySnapshot) ? querySnapshot : (querySnapshot?.docs || []);
      return docsArr.map((d: any) => {
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
      if (path === 'categories') {
        const list = await databaseService.list<any>('categories');
        const newId = id || Math.random().toString(36).substring(2, 15);
        const newItem = { id: newId, ...data, status: (data as any).status || 'Active' };
        list.push(newItem);
        await databaseService.create('users', { categoriesJson: JSON.stringify(list) }, 'global_categories');
        return newId;
      }

      if (id) {
        await setDoc(doc(db, path, id), data);
        return id;
      } else {
        const res = await addDoc(collection(db, path), data);
        return res.id;
      }
    } catch (error) {
      console.error('Database create error:', error);
      throw error;
    }
  },

  async update<T extends object>(path: string, id: string, data: Partial<T>): Promise<void> {
    try {
      if (path === 'categories') {
        const list = await databaseService.list<any>('categories');
        const updatedList = list.map(item => item.id === id ? { ...item, ...data } : item);
        await databaseService.create('users', { categoriesJson: JSON.stringify(updatedList) }, 'global_categories');
        return;
      }

      await updateDoc(doc(db, path, id), data);
    } catch (error) {
      console.error('Database update error:', error);
      throw error;
    }
  },

  async delete(path: string, id: string): Promise<void> {
    try {
      if (path === 'categories') {
        const list = await databaseService.list<any>('categories');
        const filteredList = list.filter(item => item.id !== id);
        await databaseService.create('users', { categoriesJson: JSON.stringify(filteredList) }, 'global_categories');
        return;
      }

      await deleteDoc(doc(db, path, id));
    } catch (error) {
      console.error('Database delete error:', error);
    }
  },

  subscribe<T>(path: string, constraints: any[], callback: (data: T[]) => void, onError?: (error: any) => void) {
    if (path === 'categories') {
      const q = query(collection(db, 'users'));
      return onSnapshot(q, (snapshot) => {
        const docObj = snapshot.docs.find(d => d.id === 'global_categories');
        if (docObj) {
          const data = docObj.data();
          let photo = data?.profile_photo || '';
          if (photo.includes('|||')) {
            try {
              const parts = photo.split('|||');
              const extra = JSON.parse(parts[1] || '{}');
              if (extra.categories_json) {
                callback(JSON.parse(extra.categories_json));
                return;
              }
            } catch (e) {}
          }
        }
        // Fallback to default
        const defaultCats = [
          'Real Estate', 'IT Services', 'Legal Services', 'Marketing & Advertising',
          'Financial Services', 'Healthcare', 'Construction', 'Education',
          'Interior Design', 'Event Management', 'Automobile', 'Hospitality',
          'E-commerce', 'Manufacturing', 'Consulting', 'Logistics', 'Printing',
          'Yoga & Wellness', 'Hardware', 'Fashion Design'
        ].map((name, index) => ({ id: `cat-${index}`, name, status: 'Active' }));
        callback(defaultCats as any);
      });
    }

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
