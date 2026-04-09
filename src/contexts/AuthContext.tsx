import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, query, collection, where, limit, getDocs, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firebaseUtils';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  error: null
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Set loading true while we fetch profile
      setLoading(true);
      
      // Clean up previous profile listener
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      setUser(firebaseUser);

      if (!firebaseUser) {
        setProfile(null);
        // Only clear localStorage if not in middle of login
        if (!sessionStorage.getItem('logging_in')) {
          localStorage.removeItem('user');
        }
        setLoading(false);
        return;
      }

      try {
        // Get custom claims for phone recovery
        const idTokenResult = await firebaseUser.getIdTokenResult();
        const phoneFromClaim = idTokenResult.claims.phone as string | undefined;

        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        // Initial fetch
        try {
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserProfile;
            setProfile({ uid: firebaseUser.uid, ...userData });
          } else {
            // Fallback recovery
            const savedUserData = localStorage.getItem('user');
            const savedPhone = savedUserData ? JSON.parse(savedUserData).phone : null;
            const phoneToTry = firebaseUser.phoneNumber || phoneFromClaim || savedPhone;

            if (firebaseUser.email || phoneToTry) {
              let existingDoc = null;
              if (firebaseUser.email) {
                const q = query(collection(db, 'users'), where('email', '==', firebaseUser.email), limit(1));
                const snap = await getDocs(q);
                if (!snap.empty) existingDoc = snap.docs[0];
              }
              if (!existingDoc && phoneToTry) {
                const q = query(collection(db, 'users'), where('phone', '==', phoneToTry), limit(1));
                const snap = await getDocs(q);
                if (!snap.empty) existingDoc = snap.docs[0];
              }

              if (existingDoc) {
                const existingData = existingDoc.data() as UserProfile;
                const updatedProfile = { ...existingData, uid: firebaseUser.uid };
                await setDoc(userDocRef, updatedProfile);
                setProfile(updatedProfile);
              } else {
              }
            } else {
            }
          }
        } catch (getDocError: any) {
          console.warn("Initial profile fetch failed:", getDocError.message || getDocError);
          // If it's a permission error, we might still be waiting for token claims to propagate
          // The onSnapshot listener below might succeed later
        }

        // Real-time listener
        unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as UserProfile;
            setProfile({ uid: firebaseUser.uid, ...userData });
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, (err) => {
          console.warn("Profile snapshot error:", err);
          // Only treat as fatal if we don't have a profile yet and it's not a permission error
          if (!profile && !err.message.includes('permission')) {
             setError(err.message);
          }
          setLoading(false);
        });

      } catch (err: any) {
        console.error("Error in AuthProvider:", err);
        setError(err.message);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => useContext(AuthContext);
