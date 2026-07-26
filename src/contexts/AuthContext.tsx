import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, onSnapshot, query, collection, where, limit, getDocs, setDoc } from '../lib/database';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabaseClient';
import { ensureUserChapterId } from '../utils/authUtils';

export const auth = {}; // dummy
export const db = {}; // dummy

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  login: (profile: UserProfile) => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  error: null,
  login: () => {},
  logout: () => {},
  refreshProfile: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const uid = parsed.uid || parsed.id || parsed.profile?.id || parsed.profile?.uid;
        return uid ? { uid, id: uid } : null;
      } catch {
        return null;
      }
    }
    return null;
  });

  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.profile || (parsed.role ? parsed : null);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const login = async (userProfile: UserProfile) => {
    const verifiedProfile = await ensureUserChapterId(userProfile);
    const userId = verifiedProfile.id || verifiedProfile.uid;
    const finalProfile = {
      ...verifiedProfile,
      id: userId,
      uid: userId
    };

    const pAny = finalProfile as any;
    console.log('Current User', {
      id: pAny.id,
      auth_user_id: pAny.auth_user_id || pAny.id,
      chapter_id: pAny.chapter_id,
      role: pAny.role,
      full_name: pAny.full_name || pAny.name
    });

    setUser({ uid: userId, id: userId });
    setProfile(finalProfile);
    localStorage.setItem('user', JSON.stringify({ 
      uid: userId,
      id: userId,
      phone: finalProfile.phone,
      profile: finalProfile
    }));
  };

  const logout = async () => {
    try { await supabase.auth.signOut(); } catch(e) {}
    setUser(null);
    setProfile(null);
    localStorage.removeItem('user');
    sessionStorage.clear();
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
  };

  const refreshProfile = async () => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) return;
    try {
      const parsed = JSON.parse(savedUser);
      const cachedProfile = parsed.profile || parsed;
      const uid = parsed.uid || parsed.id || cachedProfile?.id || cachedProfile?.uid;
      const role = cachedProfile?.role || parsed.role;

      if (!uid) return;

      if (role === 'MASTER_ADMIN') {
        const { data: maData } = await supabase
          .from('master_admins')
          .select('*')
          .eq('id', uid)
          .maybeSingle();

        if (maData) {
          const updatedProfile: UserProfile = {
            ...cachedProfile,
            ...maData,
            id: uid,
            uid: uid,
            role: 'MASTER_ADMIN',
            phone: maData.phone_number || cachedProfile.phone
          };
          setProfile(updatedProfile);
          localStorage.setItem('user', JSON.stringify({
            uid,
            id: uid,
            phone: updatedProfile.phone,
            profile: updatedProfile
          }));
          return;
        }
      }

      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        let updatedProfile = { id: uid, uid, ...userData };
        updatedProfile = await ensureUserChapterId(updatedProfile);
        setProfile(updatedProfile);
        localStorage.setItem('user', JSON.stringify({
          uid,
          id: uid,
          phone: userData.phone,
          profile: updatedProfile
        }));
      }
    } catch (err) {
      console.error("Error refreshing profile:", err);
    }
  };

  useEffect(() => {
    const syncProfile = async () => {
      const savedUser = localStorage.getItem('user');
      if (!savedUser) {
        setLoading(false);
        return;
      }

      try {
        const parsed = JSON.parse(savedUser);
        const cachedProfile: UserProfile | null = parsed.profile || (parsed.role ? parsed : null);
        const uid = parsed.uid || parsed.id || cachedProfile?.id || cachedProfile?.uid;
        const role = cachedProfile?.role || parsed.role;

        if (!uid || !cachedProfile) {
          setLoading(false);
          return;
        }

        // Keep cached state active immediately
        setUser({ uid, id: uid });
        setProfile(cachedProfile);

        let fetchedProfile: UserProfile | null = null;

        // Check master_admins table if role is MASTER_ADMIN
        if (role === 'MASTER_ADMIN') {
          try {
            const { data: maData } = await supabase
              .from('master_admins')
              .select('*')
              .eq('id', uid)
              .maybeSingle();

            if (maData) {
              fetchedProfile = {
                ...cachedProfile,
                ...maData,
                id: uid,
                uid: uid,
                role: 'MASTER_ADMIN',
                phone: maData.phone_number || cachedProfile.phone,
                membershipStatus: 'ACTIVE',
                membership_status: 'ACTIVE'
              };
            }
          } catch (e) {
            console.warn('Could not sync master admin profile:', e);
          }
        }

        // If not Master Admin or not found in master_admins, check users table
        if (!fetchedProfile) {
          try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
              const userData = userDoc.data() as UserProfile;
              let updated = { id: uid, uid, ...userData };
              updated = await ensureUserChapterId(updated);
              fetchedProfile = updated;
            } else {
              // Fallback: check master_admins table if user was not found in users
              const { data: maCheck } = await supabase
                .from('master_admins')
                .select('*')
                .eq('id', uid)
                .maybeSingle();

              if (maCheck) {
                fetchedProfile = {
                  ...cachedProfile,
                  ...maCheck,
                  id: uid,
                  uid: uid,
                  role: 'MASTER_ADMIN',
                  phone: maCheck.phone_number || cachedProfile.phone,
                  membershipStatus: 'ACTIVE',
                  membership_status: 'ACTIVE'
                };
              }
            }
          } catch (e) {
            console.warn('Could not sync user profile from database:', e);
          }
        }

        if (fetchedProfile) {
          setUser({ uid, id: uid });
          setProfile(fetchedProfile);
          localStorage.setItem('user', JSON.stringify({
            uid,
            id: uid,
            phone: fetchedProfile.phone,
            profile: fetchedProfile
          }));
        }
      } catch (err: any) {
        console.error("Error syncing profile in background:", err);
      } finally {
        setLoading(false);
      }
    };

    syncProfile();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => useContext(AuthContext);
