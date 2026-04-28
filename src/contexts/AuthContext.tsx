import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot, query, collection, where, limit, getDocs, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firebaseUtils';

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
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const login = (userProfile: UserProfile) => {
    setUser({ uid: userProfile.uid });
    setProfile(userProfile);
    localStorage.setItem('user', JSON.stringify({ uid: userProfile.uid, phone: userProfile.phone }));
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Firebase signOut error:", err);
    }
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
    const initAuth = async () => {
      setLoading(true);
      const savedUser = localStorage.getItem('user');
      
      if (savedUser) {
        try {
          const { uid } = JSON.parse(savedUser);
          const userDoc = await getDoc(doc(db, 'users', uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserProfile;
            setUser({ uid });
            setProfile({ uid, ...userData });
          } else {
            localStorage.removeItem('user');
          }
        } catch (err: any) {
          console.error("Error restoring session:", err);
          localStorage.removeItem('user');
        }
      }
      
      setLoading(false);
    };

    initAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => useContext(AuthContext);
