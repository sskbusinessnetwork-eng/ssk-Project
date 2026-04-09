import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, onSnapshot, writeBatch } from 'firebase/firestore';
import { UserProfile, Position } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';

interface PositionManagementProps {
  chapterAdminId?: string;
  isMasterAdmin?: boolean;
}

export function PositionManagement({ chapterAdminId: propChapterAdminId, isMasterAdmin = false }: PositionManagementProps) {
  const { profile } = useAuth();
  const [selectedAdminId, setSelectedAdminId] = useState<string>(propChapterAdminId || '');
  const [chapterAdmins, setChapterAdmins] = useState<UserProfile[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const effectiveAdminId = isMasterAdmin ? selectedAdminId : profile?.uid;

  useEffect(() => {
    if (isMasterAdmin) {
      const q = query(collection(db, 'users'), where('role', '==', 'CHAPTER_ADMIN'));
      getDocs(q).then(snap => {
        setChapterAdmins(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
      });
    }
  }, [isMasterAdmin]);

  useEffect(() => {
    if (!effectiveAdminId) {
      setMembers([]);
      setPositions([]);
      return;
    }

    setLoading(true);
    
    // Fetch members
    const fetchUsers = async () => {
      try {
        const membersQuery = query(
          collection(db, 'users'), 
          where('associatedChapterAdminId', '==', effectiveAdminId)
        );
        
        const adminSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', effectiveAdminId)));
        const membersSnap = await getDocs(membersQuery);

        const membersList = membersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        const adminData = adminSnap.docs[0]?.data() as UserProfile;
        
        if (adminData) {
          setMembers([adminData, ...membersList]);
        } else {
          setMembers(membersList);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    // Subscribe to positions
    const positionsQuery = query(
      collection(db, 'positions'),
      where('chapterAdminId', '==', effectiveAdminId)
    );

    const unsubscribe = onSnapshot(positionsQuery, (snap) => {
      setPositions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Position)));
      setLoading(false);
    });

    fetchUsers();
    return () => unsubscribe();
  }, [effectiveAdminId]);

  const handleAssignPosition = async (userId: string, positionName: 'President' | 'Vice President' | 'Treasurer' | null) => {
    if (!effectiveAdminId) return;
    setUpdatingId(userId);

    try {
      const batch = writeBatch(db);
      const user = members.find(m => m.uid === userId);
      const userName = user?.name || user?.displayName || 'Unknown';

      // 1. Remove user's current position if they have one
      const userCurrentPos = positions.find(p => p.userId === userId);
      if (userCurrentPos) {
        batch.delete(doc(db, 'positions', userCurrentPos.id!));
      }

      // 2. If assigning a new position, remove it from anyone else in this chapter
      if (positionName) {
        const docId = `${effectiveAdminId}_${positionName.replace(' ', '_')}`;
        batch.set(doc(db, 'positions', docId), {
          chapterAdminId: effectiveAdminId,
          userId: userId,
          userName: userName,
          position: positionName
        });
      }

      await batch.commit();
      alert(`Position ${positionName || 'removed'} successfully`);
    } catch (error) {
      console.error("Error updating position:", error);
      alert("Failed to update position");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredMembers = members.filter(m => 
    (m.name || m.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.businessName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUserPosition = (userId: string) => {
    return positions.find(p => p.userId === userId)?.position;
  };

  return (
    <div className="space-y-6">
      {isMasterAdmin && (
        <div className="bg-white p-4 rounded-[20px] card-shadow border border-border space-y-3">
          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1">Select Chapter Admin</label>
          <select
            value={selectedAdminId}
            onChange={(e) => setSelectedAdminId(e.target.value)}
            className="w-full h-12 px-4 bg-muted border border-transparent rounded-xl focus:bg-white focus:border-primary outline-none transition-all text-sm font-bold text-text-primary appearance-none cursor-pointer"
          >
            <option value="">Choose an Admin...</option>
            {chapterAdmins.map(admin => (
              <option key={admin.uid} value={admin.uid}>{admin.name} ({admin.businessName})</option>
            ))}
          </select>
        </div>
      )}

      {isMasterAdmin && effectiveAdminId && positions.length > 0 && (
        <div className="bg-white p-6 rounded-[20px] card-shadow border border-border space-y-4">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest">Current Chapter Positions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {['President', 'Vice President', 'Treasurer'].map(pos => {
              const holder = positions.find(p => p.position === pos);
              return (
                <div key={pos} className="p-4 bg-muted rounded-2xl border border-border flex flex-col items-center text-center">
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">{pos}</p>
                  <p className="font-bold text-text-primary">{holder ? holder.userName : 'Vacant'}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!effectiveAdminId ? (
        <div className="bg-white p-12 rounded-[20px] card-shadow border border-border text-center space-y-4">
          <p className="text-sm font-bold text-text-secondary uppercase tracking-widest">
            {isMasterAdmin ? "Please select a Chapter Admin to manage positions" : "Loading chapter data..."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Search */}
          <div className="bg-white p-4 rounded-[20px] card-shadow border border-border flex items-center gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-11 px-4 bg-muted border border-transparent rounded-xl focus:bg-white focus:border-primary outline-none transition-all text-sm font-medium"
              />
            </div>
          </div>

          {/* Users List */}
          <div className="bg-white rounded-[20px] card-shadow border border-border overflow-hidden">
            <div className="divide-y divide-border">
              {filteredMembers.map((user) => {
                const userPos = getUserPosition(user.uid);
                return (
                  <div key={user.uid} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex flex-col items-start min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-text-primary text-sm truncate">{user.name}</p>
                          {userPos && (
                            <span className="text-[10px] font-bold text-primary uppercase tracking-tight">{userPos}</span>
                          )}
                          {user.role === 'CHAPTER_ADMIN' && (
                            <span className="text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase tracking-tighter">Admin</span>
                          )}
                        </div>
                        <p className="text-[11px] text-text-secondary font-medium truncate">
                          {user.businessName || 'No Business Name'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1 sm:w-48">
                        <select
                          value={userPos || ''}
                          disabled={updatingId === user.uid}
                          onChange={(e) => handleAssignPosition(user.uid, (e.target.value || null) as any)}
                          className={cn(
                            "w-full h-10 px-3 bg-muted border border-transparent rounded-lg focus:bg-white focus:border-primary outline-none transition-all text-xs font-bold cursor-pointer disabled:opacity-50",
                            userPos ? "text-primary" : "text-text-secondary"
                          )}
                        >
                          <option value="">No Position</option>
                          <option value="President">President</option>
                          <option value="Vice President">Vice President</option>
                          <option value="Treasurer">Treasurer</option>
                        </select>
                      </div>
                      {updatingId === user.uid && (
                        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredMembers.length === 0 && (
                <div className="p-12 text-center">
                  <p className="text-sm font-bold text-text-secondary uppercase tracking-widest">No users found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
