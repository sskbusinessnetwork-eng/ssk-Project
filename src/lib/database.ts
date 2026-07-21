import { supabase } from './supabaseClient';
import { getCleanFullName } from '../utils/authUtils';

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

// --- Key Mapping Helpers ---

function camelToSnake(str: string): string {
  if (str === 'authorMemberId') return 'author_id';
  if (str === 'receiverMemberId') return 'receiver_id';
  if (str === 'chapterId') return 'chapter_id';
  if (str === 'chapterName') return 'chapter_name';
  if (str === 'creatorId') return 'creator_id';
  if (str === 'photoURL') return 'profile_photo';
  if (str === 'whatsappNumber') return 'whatsapp_number';
  if (str === 'mustChangePassword') return 'must_change_password';
  if (str === 'participantIds') return 'participant_ids';
  
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function snakeToCamel(str: string): string {
  if (str === 'author_id') return 'authorMemberId';
  if (str === 'receiver_id') return 'receiverMemberId';
  if (str === 'chapter_id') return 'chapterId';
  if (str === 'chapter_name') return 'chapterName';
  if (str === 'creator_id') return 'creatorId';
  if (str === 'profile_photo') return 'photoURL';
  if (str === 'whatsapp_number') return 'whatsappNumber';
  if (str === 'must_change_password') return 'mustChangePassword';
  if (str === 'participant_ids') return 'participantIds';
  
  return str.replace(/([-_][a-z])/g, group =>
    group.toUpperCase().replace('-', '').replace('_', '')
  );
}

export function keysToSnake(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(keysToSnake);
  if (typeof obj === 'object') {
    if (obj instanceof Date) return obj;
    const n: any = {};
    Object.keys(obj).forEach(k => {
      n[camelToSnake(k)] = keysToSnake(obj[k]);
    });
    return n;
  }
  return obj;
}

export function keysToCamel(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(keysToCamel);
  if (typeof obj === 'object') {
    if (obj instanceof Date) return obj;
    const n: any = {};
    Object.keys(obj).forEach(k => {
      n[snakeToCamel(k)] = keysToCamel(obj[k]);
    });
    return n;
  }
  return obj;
}

// --- Query Builder & Constraints ---

function applyConstraints(queryBuilder: any, constraints: QueryConstraint[], meetingIdsFiltered: string[] | null) {
  let builder = queryBuilder;
  for (const c of (constraints || [])) {
    if (c.type === 'where') {
      const snakeField = camelToSnake(c.field || '');
      if (c.field === 'participantIds' && c.op === 'array-contains') {
        if (meetingIdsFiltered) {
          const ids = meetingIdsFiltered.length > 0 ? meetingIdsFiltered : ['00000000-0000-0000-0000-000000000000'];
          builder = builder.in('id', ids);
        }
      } else {
        if (c.op === '==') builder = builder.eq(snakeField, c.val);
        else if (c.op === '!=') builder = builder.neq(snakeField, c.val);
        else if (c.op === '<') builder = builder.lt(snakeField, c.val);
        else if (c.op === '<=') builder = builder.lte(snakeField, c.val);
        else if (c.op === '>') builder = builder.gt(snakeField, c.val);
        else if (c.op === '>=') builder = builder.gte(snakeField, c.val);
        else if (c.op === 'array-contains') builder = builder.contains(snakeField, [c.val]);
      }
    } else if (c.type === 'orderBy') {
      const snakeField = camelToSnake(c.field || '');
      builder = builder.order(snakeField, { ascending: c.direction !== 'desc' });
    } else if (c.type === 'limit') {
      builder = builder.limit(c.limitNum);
    } else if (c.type === 'or') {
      const orConditions: string[] = [];
      for (const cond of (c.conditions || [])) {
        if (cond.field === 'participantIds') {
          if (meetingIdsFiltered) {
            const ids = meetingIdsFiltered.length > 0 ? meetingIdsFiltered : ['00000000-0000-0000-0000-000000000000'];
            orConditions.push(`id.in.(${ids.join(',')})`);
          }
        } else {
          const snakeF = camelToSnake(cond.field || '');
          const opStr = cond.op === '==' ? 'eq' : 'neq';
          orConditions.push(`${snakeF}.${opStr}.${cond.val}`);
        }
      }
      const orString = orConditions.join(',');
      if (orString) builder = builder.or(orString);
    }
  }
  return builder;
}

export async function getDocs(queryRef: any) {
  const collectionPath = queryRef.path;
  
  let finalConstraints = [...(queryRef.constraints || [])];
  let meetingIdsFiltered: string[] | null = null;
  
  if (collectionPath === 'one_to_one_meetings') {
    const partIdConstraint = finalConstraints.find(c => 
      c.type === 'where' && c.field === 'participantIds' && c.op === 'array-contains'
    );
    
    const orConstraint = finalConstraints.find(c => c.type === 'or');
    let targetUserId = '';
    
    if (orConstraint) {
      const partCond = orConstraint.conditions?.find((cond: any) => cond.field === 'participantIds');
      if (partCond) {
        targetUserId = partCond.val;
      }
    } else if (partIdConstraint) {
      targetUserId = partIdConstraint.val;
    }
    
    if (targetUserId) {
      const { data: partData, error: partErr } = await supabase
        .from('meeting_participants')
        .select('meeting_id')
        .eq('user_id', targetUserId);
      
      if (!partErr && partData) {
        meetingIdsFiltered = partData.map(p => p.meeting_id);
      } else {
        meetingIdsFiltered = [];
      }
    }
  }
  
  let builder = supabase.from(collectionPath).select('*');
  builder = applyConstraints(builder, finalConstraints, meetingIdsFiltered);

  // Apply Role-Based and Chapter-Based Analytics Security Filters
  try {
    const savedUser = typeof window !== 'undefined' && window.localStorage ? localStorage.getItem('user') : null;
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      const loggedInProfile = parsed.profile || null;

      if (loggedInProfile && loggedInProfile.role !== 'MASTER_ADMIN' && loggedInProfile.chapter_id) {
        const userChapterId = loggedInProfile.chapter_id;

        // Fetch user IDs belonging to this chapter for nested filters
        let chapterUserIds: string[] = [];
        if (['one_to_one_meetings', 'referrals', 'thank_you_slips', 'position_history'].includes(collectionPath)) {
          const { data: cUsers, error: cUsersErr } = await supabase
            .from('users')
            .select('id')
            .eq('chapter_id', userChapterId)
            .neq('role', 'MASTER_ADMIN');
          if (!cUsersErr && cUsers) {
            chapterUserIds = cUsers.map(u => u.id);
          }
        }

        if (collectionPath === 'users') {
          const hasSingleIdFilter = finalConstraints.some(c => c.type === 'where' && (c.field === 'id' || c.field === 'uid' || c.field === 'phone'));
          if (!hasSingleIdFilter) {
            builder = builder.eq('chapter_id', userChapterId).neq('role', 'MASTER_ADMIN');
          }
        } else if (collectionPath === 'meetings') {
          builder = builder.eq('chapter_id', userChapterId);
        } else if (collectionPath === 'testimonials') {
          builder = builder.eq('chapter_id', userChapterId);
        } else if (collectionPath === 'guest_invitations') {
          builder = builder.eq('chapter_id', userChapterId);
        } else if (collectionPath === 'guest_registrations') {
          builder = builder.eq('chapter_id', userChapterId);
        } else if (collectionPath === 'one_to_one_meetings') {
          if (chapterUserIds.length === 0) {
            builder = builder.in('creator_id', ['00000000-0000-0000-0000-000000000000']);
          } else {
            builder = builder.in('creator_id', chapterUserIds);
          }
        } else if (collectionPath === 'referrals') {
          if (chapterUserIds.length === 0) {
            builder = builder.in('from_user_id', ['00000000-0000-0000-0000-000000000000']);
          } else {
            const idListStr = `(${chapterUserIds.join(',')})`;
            builder = builder.or(`from_user_id.in.${idListStr},to_user_id.in.${idListStr}`);
          }
        } else if (collectionPath === 'thank_you_slips') {
          if (chapterUserIds.length === 0) {
            builder = builder.in('from_user_id', ['00000000-0000-0000-0000-000000000000']);
          } else {
            const idListStr = `(${chapterUserIds.join(',')})`;
            builder = builder.or(`from_user_id.in.${idListStr},to_user_id.in.${idListStr}`);
          }
        } else if (collectionPath === 'position_history') {
          if (chapterUserIds.length === 0) {
            builder = builder.in('member_id', ['00000000-0000-0000-0000-000000000000']);
          } else {
            builder = builder.in('member_id', chapterUserIds);
          }
        }
      }
    }
  } catch (err) {
    console.error("Error applying security filter in getDocs:", err);
  }

  const { data, error } = await builder;
  if (error) {
    console.warn(`Supabase getDocs error on ${collectionPath}:`, error.message);
    return { docs: [], empty: true };
  }
  
  let rows = keysToCamel(data || []);
  
  if (collectionPath === 'users') {
    rows = rows.map(r => {
      let photo = r.photoURL || '';
      let extraData: any = {};
      if (photo.includes('|||')) {
        const parts = photo.split('|||');
        photo = parts[0];
        try {
          extraData = JSON.parse(parts[1] || '{}');
        } catch (e) {}
      }
      const camelExtra = keysToCamel(extraData);
      return {
        ...r,
        name: getCleanFullName(r.name),
        photoURL: photo,
        ...camelExtra
      };
    });
  }
  
  if (collectionPath === 'one_to_one_meetings' && rows.length > 0) {
    const meetingIds = rows.map(m => m.id);
    const { data: parts, error: partsErr } = await supabase
      .from('meeting_participants')
      .select('meeting_id, user_id')
      .in('meeting_id', meetingIds);
    
    if (!partsErr && parts) {
      const partsMap: Record<string, string[]> = {};
      parts.forEach(p => {
        if (!partsMap[p.meeting_id]) partsMap[p.meeting_id] = [];
        partsMap[p.meeting_id].push(p.user_id);
      });
      rows.forEach(m => {
        m.participantIds = partsMap[m.id] || [];
      });
    } else {
      rows.forEach(m => {
        m.participantIds = [];
      });
    }
  }
  
  const docs = rows.map(row => ({
    id: row.id,
    data: () => row,
    exists: () => true
  }));
  return { docs, empty: docs.length === 0, forEach: (cb: any) => docs.forEach(cb) };
}

const EXTRA_USER_FIELDS_MAP: Record<string, boolean> = {
  business_name: true,
  profession_designation: true,
  designation: true,
  address: true,
  city: true,
  state: true,
  pincode: true,
  bio: true,
  website: true,
  password_changed: true,
  subscription_start_date: true,
  subscription_end_date: true,
  subscription_status: true,
  subscription_type: true,
  renewal_requested: true,
  renewed_by: true,
  renewed_at: true,
};

function prepareUserPayload(partialData: any, existingPhoto: string = '') {
  const cleanData = { ...partialData };
  const extraToSave: any = {};
  let photo = cleanData.profile_photo !== undefined ? cleanData.profile_photo : existingPhoto;
  
  if (photo && photo.includes('|||')) {
    const parts = photo.split('|||');
    photo = parts[0];
    try {
      Object.assign(extraToSave, JSON.parse(parts[1] || '{}'));
    } catch (e) {}
  }

  Object.keys(EXTRA_USER_FIELDS_MAP).forEach(k => {
    if (cleanData[k] !== undefined) {
      extraToSave[k] = cleanData[k];
      delete cleanData[k];
    }
  });

  if (Object.keys(extraToSave).length > 0 || photo) {
    cleanData.profile_photo = `${photo || ''}|||${JSON.stringify(extraToSave)}`;
  }

  return cleanData;
}

export async function getDoc(docRef: any) {
  const { path, id } = docRef;
  const { data, error } = await supabase.from(path).select('*').eq('id', id).single();
  if (error || !data) return { exists: () => false, data: () => ({}), id };
  
  const camelData = keysToCamel(data);
  
  if (path === 'users') {
    let photo = camelData.photoURL || '';
    let extraData: any = {};
    if (photo.includes('|||')) {
      const parts = photo.split('|||');
      photo = parts[0];
      try {
        extraData = JSON.parse(parts[1] || '{}');
      } catch (e) {}
    }
    const camelExtra = keysToCamel(extraData);
    Object.assign(camelData, { photoURL: photo, name: getCleanFullName(camelData.name) }, camelExtra);
  }
  
  if (path === 'one_to_one_meetings') {
    const { data: parts, error: partsErr } = await supabase
      .from('meeting_participants')
      .select('user_id')
      .eq('meeting_id', id);
    
    camelData.participantIds = !partsErr && parts ? parts.map(p => p.user_id) : [];
  }
  
  return { exists: () => true, data: () => camelData, id };
}

export async function getDocFromServer(docRef: any) {
  return getDoc(docRef);
}

export async function setDoc(docRef: any, data: any, options?: any) {
  const { path, id } = docRef;
  
  if (path === 'position_history') {
    return;
  }
  
  let participantIds: string[] | undefined = undefined;
  let cleanData = { ...data };
  if (path === 'one_to_one_meetings') {
    participantIds = cleanData.participantIds;
    delete cleanData.participantIds;
  }
  
  if (path === 'users') {
    let existingPhoto = '';
    try {
      const { data: existingUser } = await supabase.from('users').select('profile_photo').eq('id', id).single();
      if (existingUser) {
        existingPhoto = existingUser.profile_photo || '';
      }
    } catch (e) {}
    
    const snakeData = keysToSnake(cleanData);
    const preparedSnake = prepareUserPayload(snakeData, existingPhoto);
    const { error } = await supabase.from('users').upsert({ id, ...preparedSnake }, { onConflict: 'id' });
    if (error) console.error("setDoc error:", error);
    return;
  }
  
  const snakeData = keysToSnake(cleanData);
  const { error } = await supabase.from(path).upsert({ id, ...snakeData }, { onConflict: 'id' });
  if (error) console.error("setDoc error:", error);
  
  if (path === 'one_to_one_meetings' && participantIds !== undefined) {
    await supabase.from('meeting_participants').delete().eq('meeting_id', id);
    if (participantIds.length > 0) {
      const inserts = participantIds.map(uid => ({ meeting_id: id, user_id: uid }));
      await supabase.from('meeting_participants').insert(inserts);
    }
  }
}

export async function addDoc(collectionRef: any, data: any) {
  const collectionPath = collectionRef.path;
  
  if (collectionPath === 'position_history') {
    return { id: Math.random().toString(36).substring(2, 15) };
  }
  
  let participantIds: string[] | undefined = undefined;
  let cleanData = { ...data };
  if (collectionPath === 'one_to_one_meetings') {
    participantIds = cleanData.participantIds;
    delete cleanData.participantIds;
  }
  
  if (collectionPath === 'users') {
    const snakeData = keysToSnake(cleanData);
    const preparedSnake = prepareUserPayload(snakeData, '');
    const { data: result, error } = await supabase.from(collectionPath).insert(preparedSnake).select().single();
    if (error) {
      console.error("addDoc error:", error);
      return { id: Math.random().toString(36).substring(2, 15) };
    }
    return { id: result?.id || Math.random().toString(36).substring(2, 15) };
  }
  
  const snakeData = keysToSnake(cleanData);
  const { data: result, error } = await supabase.from(collectionPath).insert(snakeData).select().single();
  if (error) {
    console.error("addDoc error:", error);
    return { id: Math.random().toString(36).substring(2, 15) };
  }
  
  const newId = result?.id;
  
  if (collectionPath === 'one_to_one_meetings' && participantIds !== undefined && newId) {
    await supabase.from('meeting_participants').delete().eq('meeting_id', newId);
    if (participantIds.length > 0) {
      const inserts = participantIds.map(uid => ({ meeting_id: newId, user_id: uid }));
      await supabase.from('meeting_participants').insert(inserts);
    }
  }
  
  return { id: newId || Math.random().toString(36).substring(2, 15) };
}

export async function updateDoc(docRef: any, partialData: any) {
  const { path, id } = docRef;
  
  if (path === 'position_history') {
    return;
  }
  
  let participantIds: string[] | undefined = undefined;
  let cleanData = { ...partialData };
  if (path === 'one_to_one_meetings') {
    participantIds = cleanData.participantIds;
    delete cleanData.participantIds;
  }
  
  if (path === 'users') {
    let existingPhoto = '';
    try {
      const { data: existingUser } = await supabase.from('users').select('profile_photo').eq('id', id).single();
      if (existingUser) {
        existingPhoto = existingUser.profile_photo || '';
      }
    } catch (e) {}
    
    const snakeData = keysToSnake(cleanData);
    const preparedSnake = prepareUserPayload(snakeData, existingPhoto);
    const { error } = await supabase.from('users').update(preparedSnake).eq('id', id);
    if (error) console.error("updateDoc error:", error);
    return;
  }
  
  const snakeData = keysToSnake(cleanData);
  if (path === 'users') {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (token) {
      const res = await fetch('/api/users/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ uid: id, updates: snakeData })
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("updateDoc users error:", data.error);
        throw new Error(data.error || 'Failed to update user');
      }
    } else {
      const { error } = await supabase.from(path).update(snakeData).eq('id', id);
      if (error) console.error("updateDoc error:", error);
    }
  } else {
    const { error } = await supabase.from(path).update(snakeData).eq('id', id);
    if (error) console.error("updateDoc error:", error);
  }
  
  if (path === 'one_to_one_meetings' && participantIds !== undefined) {
    await supabase.from('meeting_participants').delete().eq('meeting_id', id);
    if (participantIds.length > 0) {
      const inserts = participantIds.map(uid => ({ meeting_id: id, user_id: uid }));
      await supabase.from('meeting_participants').insert(inserts);
    }
  }
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
  
  fetchAndCallback();
  
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

