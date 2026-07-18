import { supabase } from './supabaseClient';

export interface QueryConstraint {
  type: string;
  field?: string;
  op?: string;
  val?: any;
  direction?: 'asc' | 'desc';
  limitNum?: number;
  conditions?: any[];
}

export function where(field: string, op: string, val: any): QueryConstraint {
  return { type: 'where', field, op, val };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): QueryConstraint {
  return { type: 'orderBy', field, direction };
}

export function limit(limitNum: number): QueryConstraint {
  return { type: 'limit', limitNum };
}

export function or(...conditions: any[]): QueryConstraint {
  return { type: 'or', conditions };
}

export function query(collectionRef: any, ...constraints: QueryConstraint[]) {
  return { ...collectionRef, constraints };
}

export const collection = (db: any, path: string) => ({ type: 'collection', path });

export const doc = (dbOrCollection: any, pathOrId?: string, optionalId?: string) => {
  if (dbOrCollection?.type === 'collection') {
    const collPath = dbOrCollection.path;
    const docId = pathOrId || Math.random().toString(36).substring(2, 15);
    return { type: 'doc', path: collPath, id: docId };
  }
  return { type: 'doc', path: pathOrId, id: optionalId };
};


function applyConstraints(queryBuilder: any, constraints: QueryConstraint[]) {
  let builder = queryBuilder;
  for (const c of (constraints || [])) {
    if (c.type === 'where') {
      if (c.op === '==') builder = builder.eq(c.field, c.val);
      else if (c.op === '!=') builder = builder.neq(c.field, c.val);
      else if (c.op === '<') builder = builder.lt(c.field, c.val);
      else if (c.op === '<=') builder = builder.lte(c.field, c.val);
      else if (c.op === '>') builder = builder.gt(c.field, c.val);
      else if (c.op === '>=') builder = builder.gte(c.field, c.val);
      else if (c.op === 'array-contains') builder = builder.contains(c.field, [c.val]);
    } else if (c.type === 'orderBy') {
      builder = builder.order(c.field, { ascending: c.direction !== 'desc' });
    } else if (c.type === 'limit') {
      builder = builder.limit(c.limitNum);
    } else if (c.type === 'or') {
      // rough translation for OR
      const orString = c.conditions?.map((cond: any) => {
        const opStr = cond.op === '==' ? 'eq' : 'neq';
        return `${cond.field}.${opStr}.${cond.val}`;
      }).join(',');
      if (orString) builder = builder.or(orString);
    }
  }
  return builder;
}

export async function getDocs(queryRef: any) {
  const collectionPath = queryRef.path;
  let builder = supabase.from(collectionPath).select('*');
  builder = applyConstraints(builder, queryRef.constraints);
  
  const { data, error } = await builder;
  if (error) {
    console.warn(`Supabase getDocs error on ${collectionPath}:`, error.message);
    return { docs: [], empty: true };
  }
  
  const docs = (data || []).map(row => ({
    id: row.id,
    data: () => row,
    exists: () => true
  }));
  return { docs, empty: docs.length === 0, forEach: (cb: any) => docs.forEach(cb) };
}

export async function getDoc(docRef: any) {
  const { path, id } = docRef;
  const { data, error } = await supabase.from(path).select('*').eq('id', id).single();
  if (error || !data) return { exists: () => false, data: () => ({}), id };
  return { exists: () => true, data: () => data, id };
}

export async function getDocFromServer(docRef: any) {
  return getDoc(docRef);
}

export async function setDoc(docRef: any, data: any, options?: any) {
  const { path, id } = docRef;
  const { error } = await supabase.from(path).upsert({ id, ...data }, { onConflict: 'id' });
  if (error) console.error("setDoc error:", error);
}

export async function addDoc(collectionRef: any, data: any) {
  const collectionPath = collectionRef.path;
  const { data: result, error } = await supabase.from(collectionPath).insert(data).select().single();
  if (error) console.error("addDoc error:", error);
  return { id: result?.id || Math.random().toString(36).substring(2, 15) };
}

export async function updateDoc(docRef: any, partialData: any) {
  const { path, id } = docRef;
  const { error } = await supabase.from(path).update(partialData).eq('id', id);
  if (error) console.error("updateDoc error:", error);
}

export async function deleteDoc(docRef: any) {
  const { path, id } = docRef;
  const { error } = await supabase.from(path).delete().eq('id', id);
  if (error) console.error("deleteDoc error:", error);
}

export function onSnapshot(queryRef: any, callback: (snapshot: any) => void) {
  const fetchAndCallback = () => {
    getDocs(queryRef).then(callback);
  };
  
  // Perform initial fetch
  fetchAndCallback();
  
  // Listen for manual re-fetch events
  window.addEventListener('dashboard-refresh', fetchAndCallback);
  
  return () => {
    window.removeEventListener('dashboard-refresh', fetchAndCallback);
  };
}

export function writeBatch(db?: any) {
  const ops: (() => Promise<void>)[] = [];
  return {
    set: (docRef: any, data: any) => ops.push(() => setDoc(docRef, data)),
    update: (docRef: any, data: any) => ops.push(() => updateDoc(docRef, data)),
    delete: (docRef: any) => ops.push(() => deleteDoc(docRef)),
    commit: async () => {
      for (const op of ops) await op();
    }
  };
}

export const serverTimestamp = () => new Date().toISOString();
export const db = {};
