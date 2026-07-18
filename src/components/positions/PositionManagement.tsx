import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, onSnapshot, writeBatch } from 'firebase/firestore';
import { UserProfile, ChapterPosition } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import { Search, X, User } from 'lucide-react';

interface PositionManagementProps {
  chapterAdminId?: string;
  isMasterAdmin?: boolean;
}

const POSITIONS: { key: ChapterPosition; label: string }[] = [
  { key: 'chapter_admin', label: 'Chapter Admin' },
  { key: 'president', label: 'President' },
  { key: 'vice_president', label: 'Vice President' },
  { key: 'treasurer', label: 'Treasurer' },
];

export function PositionManagement({ chapterAdminId: propChapterAdminId, isMasterAdmin = false }: PositionManagementProps) {
  const { profile } = useAuth();
  const [selectedAdminId, setSelectedAdminId] = useState<string>(propChapterAdminId || '');
  const [chapterAdmins, setChapterAdmins] = useState<UserProfile[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPosition, setModalPosition] = useState<ChapterPosition | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const effectiveAdminId = isMasterAdmin ? selectedAdminId : profile?.uid;

  useEffect(() => {
    if (isMasterAdmin) {
      const q = query(collection(db, 'users'), where('role', '==', 'CHAPTER_ADMIN'));
      getDocs(q).then(snap => {
        setChapterAdmins(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
      });
    }
  }, [isMasterAdmin]);

  useEffect(() => {
    if (!effectiveAdminId) {
      setMembers([]);
      return;
    }

    setLoading(true);
    
    // Subscribe to all members under this chapter admin, OR the admin themselves
    const q1 = query(collection(db, 'users'), where('associatedChapterAdminId', '==', effectiveAdminId));
    const q2 = query(collection(db, 'users'), where('uid', '==', effectiveAdminId));

    // We can't do an OR query easily on different fields in Firestore without compound queries,
    // so we'll fetch both and combine them in state.
    const unsub1 = onSnapshot(q1, (snap1) => {
      getDocs(q2).then(snap2 => {
        const adminData = snap2.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
        const membersData = snap1.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
        
        const combined = [...adminData, ...membersData];
        // Deduplicate just in case
        const unique = Array.from(new Map(combined.map(item => [item.uid, item])).values());
        
        setMembers(unique);
        setLoading(false);
      });
    });

    return () => unsub1();
  }, [effectiveAdminId]);

  const handleAssignPosition = async (userId: string, positionName: ChapterPosition) => {
    if (!effectiveAdminId) return;
    setUpdatingId(userId);

    try {
      const batch = writeBatch(db);
      
      // 1. Find if anyone currently holds this position in this chapter
      const currentHolder = members.find(m => m.position === positionName);
      if (currentHolder && currentHolder.uid !== userId) {
        batch.update(doc(db, 'users', currentHolder.uid), {
          position: 'member',
          ...(positionName === 'chapter_admin' ? { role: 'MEMBER' } : {})
        });
      }

      // 2. Find the selected user and update their position
      const selectedUser = members.find(m => m.uid === userId);
      if (selectedUser) {
        batch.update(doc(db, 'users', userId), {
          position: positionName,
          ...(positionName === 'chapter_admin' ? { role: 'CHAPTER_ADMIN' } : {})
        });
      }

      await batch.commit();
      setIsModalOpen(false);
      setModalPosition(null);
      setSearchTerm('');
    } catch (error) {
      console.error("Error updating position:", error);
      alert("Failed to update position");
    } finally {
      setUpdatingId(null);
    }
  };

  const getPositionHolder = (pos: ChapterPosition) => {
    return members.find(m => m.position === pos);
  };

  const filteredMembers = members.filter(m => 
    (m.name || m.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.businessName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {isMasterAdmin && (
        <div className="bg-white p-4 rounded-[20px] shadow-sm border border-neutral-200 space-y-3">
          <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Select Chapter Admin</label>
          <select
            value={selectedAdminId}
            onChange={(e) => setSelectedAdminId(e.target.value)}
            className="w-full h-12 px-4 bg-neutral-50 border border-neutral-200 rounded-[12px] focus:bg-white focus:border-primary outline-none transition-all text-sm font-semibold text-neutral-900 cursor-pointer"
          >
            <option value="">Choose a Chapter...</option>
            {chapterAdmins.map(admin => (
              <option key={admin.uid} value={admin.uid}>{admin.name} ({admin.businessName || 'No Business'})</option>
            ))}
          </select>
        </div>
      )}

      {!effectiveAdminId ? (
        <div className="bg-white p-12 rounded-[20px] shadow-sm border border-neutral-200 text-center">
          <p className="text-sm font-bold text-neutral-500 uppercase tracking-widest">
            {isMasterAdmin ? "Please select a Chapter to manage positions" : "Loading chapter data..."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {POSITIONS.map(pos => {
            // Chapter admins shouldn't re-assign the chapter admin role itself, unless Master Admin allows?
            // "Chapter Admin CANNOT: Change Master Admin. Chapter Admin CAN: Promote members to: President, Vice President, Treasurer."
            // So Chapter Admin shouldn't be able to change Chapter Admin.
            if (!isMasterAdmin && pos.key === 'chapter_admin') return null;

            const holder = getPositionHolder(pos.key);

            return (
              <div key={pos.key} className="bg-white p-5 rounded-[20px] shadow-sm border border-neutral-200 flex flex-col justify-between min-h-[140px]">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1">{pos.label}</h3>
                    <p className="text-base font-bold text-neutral-900">
                      {holder ? (holder.name || holder.displayName) : 'Vacant'}
                    </p>
                    {holder && (
                      <p className="text-xs text-neutral-500 mt-1">{holder.businessName}</p>
                    )}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center shrink-0 border border-neutral-100">
                    <User size={18} className={holder ? "text-primary" : "text-neutral-400"} />
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setModalPosition(pos.key);
                    setIsModalOpen(true);
                  }}
                  className="w-full py-2.5 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 text-xs font-bold uppercase tracking-wider rounded-[12px] transition-colors"
                >
                  Change Position
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Member Selection Modal */}
      {isModalOpen && modalPosition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[24px] shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <h2 className="text-lg font-bold text-neutral-900">
                Select {POSITIONS.find(p => p.key === modalPosition)?.label}
              </h2>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setSearchTerm('');
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-200 text-neutral-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-4 border-b border-neutral-100 bg-white">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-11 pl-9 pr-4 bg-neutral-50 border border-neutral-200 rounded-[12px] focus:bg-white focus:border-primary outline-none text-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {filteredMembers.length > 0 ? (
                <div className="space-y-1">
                  {filteredMembers.map(member => (
                    <button
                      key={member.uid}
                      disabled={updatingId === member.uid}
                      onClick={() => handleAssignPosition(member.uid, modalPosition)}
                      className={cn(
                        "w-full text-left p-3 rounded-[12px] transition-colors flex items-center justify-between group",
                        member.position === modalPosition ? "bg-primary/5 border border-primary/20" : "hover:bg-neutral-50 border border-transparent"
                      )}
                    >
                      <div>
                        <p className={cn(
                          "text-sm font-bold",
                          member.position === modalPosition ? "text-primary" : "text-neutral-900"
                        )}>
                          {member.name || member.displayName}
                        </p>
                        <p className="text-xs text-neutral-500 mt-0.5">{member.businessName || 'No business'}</p>
                      </div>
                      
                      {updatingId === member.uid ? (
                        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      ) : (
                        <div className={cn(
                          "text-xs font-bold px-2 py-1 rounded",
                          member.position === modalPosition 
                            ? "bg-primary text-white" 
                            : "bg-neutral-100 text-neutral-600 group-hover:bg-primary group-hover:text-white transition-colors"
                        )}>
                          {member.position === modalPosition ? 'Current' : 'Select'}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-sm font-bold text-neutral-500 uppercase tracking-widest">No members found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
