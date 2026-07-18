import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, onSnapshot, writeBatch, addDoc } from 'firebase/firestore';
import { UserProfile, ChapterPosition, PositionHistory } from '../types';
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
  
  const [chapterAdmins, setChapterAdmins] = useState<UserProfile[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<string>(isMasterAdmin ? '' : (profile?.uid || ''));
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [history, setHistory] = useState<PositionHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
      setHistory([]);
      return;
    }

    setLoading(true);
    
    // Subscribe to all members under this chapter admin, OR the admin themselves
    const q1 = query(collection(db, 'users'), where('associatedChapterAdminId', '==', effectiveAdminId));
    const q2 = query(collection(db, 'users'), where('uid', '==', effectiveAdminId));

    const unsub1 = onSnapshot(q1, (snap1) => {
      getDocs(q2).then(snap2 => {
        const adminData = snap2.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
        const membersData = snap1.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
        
        const combined = [...adminData, ...membersData];
        const unique = Array.from(new Map(combined.map(item => [item.uid, item])).values());
        
        setMembers(unique);
        setLoading(false);
      });
    });

    // Fetch History
    const historyQ = query(collection(db, 'position_history'), where('chapterAdminId', '==', effectiveAdminId));
    const unsubHistory = onSnapshot(historyQ, (snap) => {
      const hist = snap.docs.map(d => ({ id: d.id, ...d.data() } as PositionHistory));
      // Sort by date desc
      hist.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setHistory(hist);
    });

    return () => {
      unsub1();
      unsubHistory();
    };
  }, [effectiveAdminId]);

  const handleAssignPosition = async (userId: string, newPosition: ChapterPosition) => {
    if (!effectiveAdminId || !profile) return;
    
    // Validate chapter admin permissions
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
            ...(newPosition === 'chapter_admin' ? { role: 'MEMBER' } : {})
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
            chapterAdminId: effectiveAdminId
          });
        }
      }

      // 2. Update the selected user
      batch.update(doc(db, 'users', userId), {
        position: newPosition,
        ...(newPosition === 'chapter_admin' ? { role: 'CHAPTER_ADMIN' } : 
            (oldPosition === 'chapter_admin' ? { role: 'MEMBER' } : {}))
      });

      // Log assignment history
      await addDoc(collection(db, 'position_history'), {
        date: new Date().toISOString(),
        changedById: profile.uid,
        changedByName: profile.name || profile.displayName || 'Unknown',
        memberId: userId,
        memberName: selectedUser.name || selectedUser.displayName || 'Unknown',
        oldPosition: oldPosition,
        newPosition: newPosition,
        chapterAdminId: effectiveAdminId
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
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-neutral-900">Chapter Position Management</h1>
        <p className="text-sm text-neutral-500">Manage and assign roles within your chapter.</p>
      </div>

      <div className="bg-white p-6 rounded-[24px] shadow-sm border border-neutral-200 space-y-6">
        
        {/* Top Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {isMasterAdmin && (
            <div className="flex-1">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1 mb-2 block">Select Chapter</label>
              <select
                value={selectedAdminId}
                onChange={(e) => setSelectedAdminId(e.target.value)}
                className="w-full h-11 px-4 bg-neutral-50 border border-neutral-200 rounded-[12px] focus:bg-white focus:border-primary outline-none transition-all text-sm font-semibold text-neutral-900 cursor-pointer"
              >
                <option value="">Choose a Chapter...</option>
                {chapterAdmins.map(admin => (
                  <option key={admin.uid} value={admin.uid}>{admin.name} ({admin.businessName || 'No Business'})</option>
                ))}
              </select>
            </div>
          )}
          
          <div className="flex-1">
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1 mb-2 block">Search Member</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-11 pl-9 pr-4 bg-neutral-50 border border-neutral-200 rounded-[12px] focus:bg-white focus:border-primary outline-none text-sm"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        {!effectiveAdminId ? (
          <div className="py-12 text-center text-neutral-500">
            {isMasterAdmin ? "Select a chapter to view members." : "Loading..."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="p-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider w-12">Profile</th>
                  <th className="p-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Member Name</th>
                  <th className="p-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Email</th>
                  <th className="p-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Phone</th>
                  <th className="p-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Current Position</th>
                  <th className="p-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Assign Position</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredMembers.map(member => {
                  const currentPos = member.position || 'member';
                  return (
                    <tr key={member.uid} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="p-4">
                        <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center border border-neutral-200 overflow-hidden">
                          {member.photoURL ? (
                            <img src={member.photoURL} alt={member.name} className="w-full h-full object-cover" />
                          ) : (
                            <User size={18} className="text-neutral-400" />
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-neutral-900 text-sm">{member.name || member.displayName}</div>
                        <div className="text-xs text-neutral-500">{member.businessName}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-sm text-neutral-600">
                          <Mail size={14} className="text-neutral-400" />
                          {member.email || 'N/A'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-sm text-neutral-600">
                          <Phone size={14} className="text-neutral-400" />
                          {member.phone || 'N/A'}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                          currentPos === 'member' ? "bg-neutral-100 text-neutral-600" : "bg-primary/10 text-primary border border-primary/20"
                        )}>
                          {currentPos.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <select
                            value={currentPos}
                            onChange={(e) => handleAssignPosition(member.uid, e.target.value as ChapterPosition)}
                            disabled={updatingId === member.uid || (!isMasterAdmin && e.target.value === 'chapter_admin' && currentPos !== 'chapter_admin')}
                            className="h-9 px-3 bg-white border border-neutral-200 rounded-lg focus:border-primary outline-none text-xs font-semibold cursor-pointer disabled:opacity-50 min-w-[140px]"
                          >
                            {POSITIONS.map(pos => {
                              // Chapter Admin cannot assign another Chapter Admin
                              if (!isMasterAdmin && pos.key === 'chapter_admin' && currentPos !== 'chapter_admin') {
                                return null;
                              }
                              return (
                                <option key={pos.key} value={pos.key}>{pos.label}</option>
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

      {effectiveAdminId && (
        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-neutral-200 space-y-6 mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={20} className="text-neutral-400" />
            <h2 className="text-lg font-bold text-neutral-900">Position History</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="p-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Date</th>
                  <th className="p-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Changed By</th>
                  <th className="p-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Member</th>
                  <th className="p-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {history.map(item => (
                  <tr key={item.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="p-4 text-sm text-neutral-600 whitespace-nowrap">
                      {format(new Date(item.date), 'dd MMM yyyy, h:mm a')}
                    </td>
                    <td className="p-4 text-sm font-medium text-neutral-900">
                      {item.changedByName}
                    </td>
                    <td className="p-4 text-sm font-medium text-neutral-900">
                      {item.memberName}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded capitalize">
                          {item.oldPosition.replace('_', ' ')}
                        </span>
                        <ArrowRight size={14} className="text-neutral-400" />
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded capitalize">
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
