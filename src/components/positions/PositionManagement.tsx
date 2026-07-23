import React, { useState, useEffect } from 'react';
import { db, updateMemberPositionDirectly } from '../../lib/database';
import { collection, query, where, getDocs, doc, onSnapshot } from '../../lib/database';
import { UserProfile, ChapterPosition } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import { Search, X, User } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

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

export function PositionManagement({ chapterAdminId: propChapterAdminId, isMasterAdmin: propIsMasterAdmin }: PositionManagementProps) {
  const { profile } = useAuth();
  const isMasterAdmin = propIsMasterAdmin || profile?.role === 'MASTER_ADMIN';

  const [selectedAdminId, setSelectedAdminId] = useState<string>(propChapterAdminId || '');
  const [chapters, setChapters] = useState<{ id: string; name: string }[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPosition, setModalPosition] = useState<ChapterPosition | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const effectiveAdminId = isMasterAdmin ? selectedAdminId : profile?.chapter_id || profile?.uid;

  useEffect(() => {
    if (isMasterAdmin) {
      // Load chapters for selection
      const q = query(collection(db, 'chapters'));
      getDocs(q).then((snap: any) => {
        const list = (snap?.docs || []).map((d: any) => ({
          id: d.id,
          name: d.data().chapter_name || d.data().chapterName || 'Unnamed Chapter'
        }));
        setChapters(list);
        if (list.length > 0 && !selectedAdminId) {
          setSelectedAdminId(list[0].id);
        }
      });
    }
  }, [isMasterAdmin]);

  useEffect(() => {
    if (!effectiveAdminId) {
      setMembers([]);
      return;
    }

    setLoading(true);
    
    // Subscribe to all members under this chapter
    const q1 = query(collection(db, 'users'), where('chapter_id', '==', effectiveAdminId));
    const q2 = query(collection(db, 'users'), where('uid', '==', effectiveAdminId));

    const unsub1 = onSnapshot(q1, (snap1) => {
      getDocs(q2).then((snap2: any) => {
        const adminData = (snap2?.docs || []).map((d: any) => {
          const data = d.data();
          const uId = d.id || data.id || data.uid;
          return { ...data, id: uId, uid: uId } as UserProfile;
        });
        const membersData = (snap1?.docs || []).map((d: any) => {
          const data = d.data();
          const uId = d.id || data.id || data.uid;
          return { ...data, id: uId, uid: uId } as UserProfile;
        });
        
        const combined = [...adminData, ...membersData];
        const unique = Array.from(new Map(combined.map(item => [item.uid || item.id, item])).values());
        
        setMembers(unique);
        setLoading(false);
      });
    });

    return () => unsub1();
  }, [effectiveAdminId]);

  const handleAssignPosition = async (userId: string, positionName: ChapterPosition) => {
    if (!isMasterAdmin) {
      alert("Only the Master Admin can assign or change positions.");
      return;
    }

    if (!effectiveAdminId) {
      alert("Please select a chapter first.");
      return;
    }

    setUpdatingId(userId);

    try {
      let success = false;
      let errorMsg = '';

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const res = await fetch('/api/admin/update-position', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            targetUserId: userId,
            newPosition: positionName,
            chapterId: effectiveAdminId,
            callerId: profile?.id || profile?.uid
          })
        });

        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data.success) {
            success = true;
          } else {
            errorMsg = data.error || 'Failed to update position';
          }
        } else {
          // Endpoint returned 404 or HTML error - fall back to direct Supabase update
          console.warn("API route unavailable or non-JSON response, using direct database update...");
        }
      } catch (err: any) {
        console.warn("API fetch failed, trying direct database update:", err);
      }

      if (!success) {
        // Direct Supabase update fallback
        await updateMemberPositionDirectly(
          userId,
          positionName,
          effectiveAdminId,
          profile?.id || profile?.uid
        );
      }

      setIsModalOpen(false);
      setModalPosition(null);
      setSearchTerm('');

      // Instantly trigger realtime updates across all pages
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));
      window.dispatchEvent(new CustomEvent('users-updated'));
    } catch (error: any) {
      console.error("Error updating position:", error);
      alert(error.message || "Failed to update position");
    } finally {
      setUpdatingId(null);
    }
  };

  const getPositionHolder = (pos: ChapterPosition) => {
    return members.find(m => {
      const p = (m.position || '').toLowerCase();
      const r = (m.role || '').toLowerCase();
      const target = pos.toLowerCase();
      return p === target || r === target || (target === 'chapter_admin' && r === 'chapter_admin');
    });
  };

  const filteredMembers = members.filter(m => 
    (m.name || m.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.businessName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {isMasterAdmin && (
        <div className="bg-white p-4 rounded-[20px] shadow-sm border border-neutral-200 space-y-3">
          <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Select Chapter</label>
          <select
            value={selectedAdminId}
            onChange={(e) => setSelectedAdminId(e.target.value)}
            className="w-full h-12 px-4 bg-neutral-50 border border-neutral-200 rounded-[12px] focus:bg-white focus:border-primary outline-none transition-all text-sm font-semibold text-neutral-900 cursor-pointer"
          >
            <option value="">Choose a Chapter...</option>
            {chapters.map(ch => (
              <option key={ch.id} value={ch.id}>{ch.name}</option>
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
                
                {isMasterAdmin ? (
                  <button
                    onClick={() => {
                      setModalPosition(pos.key);
                      setIsModalOpen(true);
                    }}
                    className="w-full py-2.5 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 text-xs font-bold uppercase tracking-wider rounded-[12px] transition-colors"
                  >
                    Change Position
                  </button>
                ) : (
                  <div className="text-xs text-neutral-400 font-medium italic text-center py-2 bg-neutral-50 rounded-[12px]">
                    Only Master Admin can change positions
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Member Selection Modal */}
      {isModalOpen && modalPosition && isMasterAdmin && (
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
                  {filteredMembers.map(member => {
                    const isCurrent = getPositionHolder(modalPosition)?.uid === member.uid;
                    return (
                      <button
                        key={member.uid}
                        disabled={updatingId === member.uid}
                        onClick={() => handleAssignPosition(member.uid, modalPosition)}
                        className={cn(
                          "w-full text-left p-3 rounded-[12px] transition-colors flex items-center justify-between group",
                          isCurrent ? "bg-primary/5 border border-primary/20" : "hover:bg-neutral-50 border border-transparent"
                        )}
                      >
                        <div>
                          <p className={cn(
                            "text-sm font-bold",
                            isCurrent ? "text-primary" : "text-neutral-900"
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
                            isCurrent 
                              ? "bg-primary text-white" 
                              : "bg-neutral-100 text-neutral-600 group-hover:bg-primary group-hover:text-white transition-colors"
                          )}>
                            {isCurrent ? 'Current' : 'Select'}
                          </div>
                        )}
                      </button>
                    );
                  })}
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
