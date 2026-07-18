import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, onSnapshot, query, collection, where, limit, getDocs, setDoc } from '../lib/database';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabaseClient';

export const auth = {}; // dummy
export const db = {}; // dummy

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  login: (profile: UserProfile) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  error: null,
  login: () => {},
  logout: () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.uid ? { uid: parsed.uid } : null;
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
        return parsed.profile || null;
      } catch {
        return null;
      }
    }
    return null;
  });

  const [loading, setLoading] = useState(() => {
    return !localStorage.getItem('user');
  });

  const [error, setError] = useState<string | null>(null);

  const login = (userProfile: UserProfile) => {
    setUser({ uid: userProfile.uid });
    setProfile(userProfile);
    localStorage.setItem('user', JSON.stringify({ 
      uid: userProfile.uid, 
      phone: userProfile.phone,
      profile: userProfile
    }));
  };

  const logout = async () => {
    try { await supabase.auth.signOut(); } catch(e) {}
    setUser(null);
    setProfile(null);
    localStorage.removeItem('user');
    sessionStorage.clear();
    // Clear all cookies if any (optional but good for "fully logged out")
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
  };

  useEffect(() => {
    const syncProfile = async () => {
      const savedUser = localStorage.getItem('user');
      if (!savedUser) {
        setLoading(false);
        return;
      }

      try {
        const { uid } = JSON.parse(savedUser);
        const userDoc = await getDoc(doc(db, 'users', uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile;
          const updatedProfile = { uid, ...userData };
          setUser({ uid });
          setProfile(updatedProfile);
          localStorage.setItem('user', JSON.stringify({
            uid,
            phone: userData.phone,
            profile: updatedProfile
          }));
        } else {
          // Profile deleted on the server, clear session
          logout();
        }
      } catch (err: any) {
        console.error("Error syncing profile in background:", err);
        const errorMsg = err?.message || String(err);
        const isOffline = errorMsg.includes('offline') || 
                          errorMsg.includes('unavailable') || 
                          errorMsg.includes('Could not reach') || 
                          errorMsg.includes('network');
        
        // Only log out if it is definitively a non-network error indicating permission/not-found issues
        if (!isOffline && (errorMsg.includes('permission-denied') || errorMsg.includes('not-found'))) {
          logout();
        }
      } finally {
        setLoading(false);
      }
    };

    syncProfile();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => useContext(AuthContext);
