import React, { useState, useEffect } from 'react';
import { db } from '../lib/database';
import {  collection, query, where, getDocs, doc, writeBatch, addDoc, onSnapshot  } from '../lib/database';
import { UserProfile, ChapterPosition, Chapter } from '../types';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { Search, User, Phone, Mail, Clock, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

const POSITIONS: { key: ChapterPosition; label: string }[] = [
  { key: 'member', label: 'Member' },
  { key: 'president', label: 'President' },
  { key: 'vice_president', label: 'Vice President' },
  { key: 'treasurer', label: 'Treasurer' },
  { key: 'chapter_admin', label: 'Chapter Admin' },
];

export function Positions() {
  const { profile } = useAuth();
  const isMasterAdmin = profile?.role === 'MASTER_ADMIN';
  
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

    // Load chapters
  useEffect(() => {
    const fetchChapters = () => {
      if (isMasterAdmin) {
        const q = query(collection(db, 'chapters'));
        getDocs(q).then(snap => {
          setChapters(snap.docs.map(d => ({ id: d.id, ...d.data() } as Chapter)));
        });
      } else if (profile?.uid) {
        // For Chapter Admin
        const q = query(collection(db, 'chapters'), where('chapter_admin_id', '==', profile.uid));
        getDocs(q).then(snap => {
          const found = snap.docs.map(d => ({ id: d.id, ...d.data() } as Chapter));
          setChapters(found);
          if (found.length > 0 && !selectedChapterId) {
            setSelectedChapterId(found[0].id);
          }
        });
      }
    };
    fetchChapters();
    
    const handleRefresh = () => fetchChapters();
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, [isMasterAdmin, profile?.uid]);

  // Load members of selected chapter
  useEffect(() => {
    if (!selectedChapterId) {
      setMembers([]);
      setHistory([]);
      return;
    }

    setLoading(true);
    
    // Subscribe to members
    const qMembers = query(collection(db, 'users'), where('chapter_id', '==', selectedChapterId));
    const unsub1 = onSnapshot(qMembers, (snap) => {
      setMembers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
      setLoading(false);
    });

    // Subscribe to history
    const qHistory = query(collection(db, 'position_history'), where('chapter_id', '==', selectedChapterId));
    const unsubHistory = onSnapshot(qHistory, (snap) => {
      const hist = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      hist.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setHistory(hist);
    });

    return () => {
      unsub1();
      unsubHistory();
    };
  }, [selectedChapterId]);

  const handleAssignPosition = async (userId: string, newPosition: ChapterPosition) => {
    if (!selectedChapterId || !profile) return;
    
    if (!isMasterAdmin && newPosition === 'chapter_admin') {
      alert("Only Master Admin can assign a new Chapter Admin.");
      return;
    }

    setUpdatingId(userId);

    try {
      const batch = writeBatch(db);
      
      const selectedUser = members.find(m => m.uid === userId);
      if (!selectedUser) return;
      
      const oldPosition = selectedUser.position || 'member';
      if (oldPosition === newPosition) {
        setUpdatingId(null);
        return; // No change
      }

      // 1. Find if anyone currently holds this position in this chapter (unless it's 'member')
      if (newPosition !== 'member') {
        const currentHolder = members.find(m => m.position === newPosition);
        if (currentHolder && currentHolder.uid !== userId) {
          batch.update(doc(db, 'users', currentHolder.uid), {
            position: 'member',
            role: 'MEMBER'
          });

          // Log removal history
          await addDoc(collection(db, 'position_history'), {
            date: new Date().toISOString(),
            changedById: profile.uid,
            changedByName: profile.name || profile.displayName || 'Unknown',
            memberId: currentHolder.uid,
            memberName: currentHolder.name || currentHolder.displayName || 'Unknown',
            oldPosition: newPosition,
            newPosition: 'member',
            chapter_id: selectedChapterId
          });
        }
      }

      // 2. Update the selected user
      batch.update(doc(db, 'users', userId), {
        position: newPosition,
        role: 'MEMBER'
      });

      // 3. Update chapter record if applicable
      const chapterRef = doc(db, 'chapters', selectedChapterId);
      const updates: any = {};
      if (newPosition === 'chapter_admin') updates.chapter_admin_id = userId;
      if (newPosition === 'president') updates.president_id = userId;
      if (newPosition === 'vice_president') updates.vice_president_id = userId;
      if (newPosition === 'treasurer') updates.treasurer_id = userId;
      if (Object.keys(updates).length > 0) {
        batch.update(chapterRef, updates);
      }

      // Log assignment history
      await addDoc(collection(db, 'position_history'), {
        date: new Date().toISOString(),
        changedById: profile.uid,
        changedByName: profile.name || profile.displayName || 'Unknown',
        memberId: userId,
        memberName: selectedUser.name || selectedUser.displayName || 'Unknown',
        oldPosition: oldPosition,
        newPosition: newPosition,
        chapter_id: selectedChapterId
      });

      await batch.commit();
      
    } catch (error) {
      console.error("Error updating position:", error);
      alert("Failed to update position");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredMembers = members.filter(m => 
    (m.name || m.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-[#161B22] border border-white/[0.08] rounded-[20px] shadow-[0_15px_40px_rgba(0,0,0,0.35)] p-6 space-y-6">
        
        {/* Top Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {isMasterAdmin && (
            <div className="flex-1">
              <label className="text-xs font-semibold text-[#E5E7EB] uppercase tracking-[0.5px] ml-1 mb-2 block">Select Chapter</label>
              <select
                value={selectedChapterId}
                onChange={(e) => setSelectedChapterId(e.target.value)}
                className="w-full h-[50px] px-4 bg-[#0F172A] border border-white/10 rounded-[14px] focus:bg-[#0F172A] focus:border-primary focus:shadow-[0_0_0_3px_rgba(239,68,68,0.18)] outline-none transition-all text-sm font-semibold text-white cursor-pointer appearance-none"
              >
                <option value="" className="bg-[#161B22] text-white">Choose a Chapter...</option>
                {chapters.map(chapter => (
                  <option key={chapter.id} value={chapter.id} className="bg-[#161B22] text-white">{chapter.chapter_name}</option>
                ))}
              </select>
            </div>
          )}
          
          <div className="flex-1">
            <label className="text-xs font-semibold text-[#E5E7EB] uppercase tracking-[0.5px] ml-1 mb-2 block">Search Member</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-hover:text-primary transition-colors" size={16} />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-[50px] pl-10 pr-4 bg-[#0F172A] border border-white/10 rounded-[14px] focus:bg-[#0F172A] focus:border-primary focus:shadow-[0_0_0_3px_rgba(239,68,68,0.18)] outline-none text-white placeholder-white/50 text-sm transition-all"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        {!selectedChapterId ? (
          <div className="py-12 text-center text-neutral-500">
            {isMasterAdmin ? "Select a chapter to view members." : "Loading..."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-[#0F172A] border-b border-white/[0.06]">
                  <th className="p-4 text-xs font-semibold text-[#E5E7EB] uppercase tracking-[0.5px] w-12">Profile</th>
                  <th className="p-4 text-xs font-semibold text-[#E5E7EB] uppercase tracking-[0.5px]">Member Name</th>
                  <th className="p-4 text-xs font-semibold text-[#E5E7EB] uppercase tracking-[0.5px]">Email</th>
                  <th className="p-4 text-xs font-semibold text-[#E5E7EB] uppercase tracking-[0.5px]">Phone</th>
                  <th className="p-4 text-xs font-semibold text-[#E5E7EB] uppercase tracking-[0.5px]">Current Position</th>
                  <th className="p-4 text-xs font-semibold text-[#E5E7EB] uppercase tracking-[0.5px]">Assign Position</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {filteredMembers.map(member => {
                  const currentPos = member.position || 'member';
                  return (
                    <tr key={member.uid} className="hover:bg-white/5 even:bg-white/[0.02] border-b border-white/[0.06] transition-colors">
                      <td className="p-4">
                        <div className="w-10 h-10 rounded-full bg-[#0F172A] flex items-center justify-center border border-white/10 overflow-hidden">
                          {member.photoURL ? (
                            <img src={member.photoURL} alt={member.name} className="w-full h-full object-cover" />
                          ) : (
                            <User size={18} className="text-neutral-400 group-hover:text-primary transition-colors" />
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-white text-sm">{member.name || member.displayName}</div>
                        <div className="text-xs text-neutral-400">{member.businessName}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-sm text-neutral-400">
                          <Mail size={14} className="text-neutral-500" />
                          {member.email || 'N/A'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-sm text-neutral-400">
                          <Phone size={14} className="text-neutral-500" />
                          {member.phone || 'N/A'}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-[0.5px]",
                          currentPos === 'member' ? "bg-[#0F172A] text-neutral-400 border border-white/10" : "bg-primary/10 text-primary border border-primary/20"
                        )}>
                          {currentPos.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <select
                            value={currentPos}
                            onChange={(e) => handleAssignPosition(member.uid, e.target.value as ChapterPosition)}
                            disabled={updatingId === member.uid}
                            className="h-9 px-3 bg-[#0F172A] border border-white/10 rounded-lg focus:border-primary outline-none text-xs font-semibold text-white cursor-pointer disabled:opacity-50 min-w-[140px] appearance-none transition-colors"
                          >
                            {POSITIONS.map(pos => {
                              if (!isMasterAdmin && pos.key === 'chapter_admin' && currentPos !== 'chapter_admin') {
                                return null;
                              }
                              return (
                                <option key={pos.key} value={pos.key} className="bg-[#161B22] text-white">{pos.label}</option>
                              );
                            })}
                          </select>
                          {updatingId === member.uid && (
                            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredMembers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-neutral-500">
                      No members found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedChapterId && (
        <div className="bg-[#161B22] border border-white/[0.08] rounded-[20px] shadow-[0_15px_40px_rgba(0,0,0,0.35)] p-6 space-y-6 mt-8">
          <div className="flex items-center gap-2 mb-4 border-b border-white/[0.08] pb-4">
            <Clock size={20} className="text-primary" />
            <h2 className="text-lg font-bold text-white uppercase tracking-[0.5px]">Position History</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-[#0F172A] border-b border-white/[0.06]">
                  <th className="p-4 text-xs font-semibold text-[#E5E7EB] uppercase tracking-[0.5px]">Date</th>
                  <th className="p-4 text-xs font-semibold text-[#E5E7EB] uppercase tracking-[0.5px]">Changed By</th>
                  <th className="p-4 text-xs font-semibold text-[#E5E7EB] uppercase tracking-[0.5px]">Member</th>
                  <th className="p-4 text-xs font-semibold text-[#E5E7EB] uppercase tracking-[0.5px]">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {history.map(item => (
                  <tr key={item.id} className="hover:bg-white/5 even:bg-white/[0.02] border-b border-white/[0.06] transition-colors">
                    <td className="p-4 text-sm text-neutral-400 whitespace-nowrap">
                      {format(new Date(item.date), 'dd MMM yyyy, h:mm a')}
                    </td>
                    <td className="p-4 text-sm font-medium text-white">
                      {item.changedByName}
                    </td>
                    <td className="p-4 text-sm font-medium text-white">
                      {item.memberName}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-neutral-400 bg-[#0F172A] border border-white/10 px-2 py-0.5 rounded capitalize">
                          {item.oldPosition.replace('_', ' ')}
                        </span>
                        <ArrowRight size={14} className="text-neutral-500" />
                        <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded capitalize">
                          {item.newPosition.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-neutral-500">
                      No history recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
