import { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Position } from '../types';

export function usePositions() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'positions'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const posList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Position));
      setPositions(posList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getPositionForUser = (userId: string) => {
    return positions.find(p => p.userId === userId)?.position;
  };

  return { positions, getPositionForUser, loading };
}
