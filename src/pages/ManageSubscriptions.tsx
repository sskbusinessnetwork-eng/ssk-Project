import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { databaseService } from '../services/databaseService';
import { supabase } from '../lib/supabaseClient';
import { Search, Filter, Shield, Calendar, CreditCard, ChevronDown, Check, X, Building, AlertTriangle } from 'lucide-react';
import { UserProfile, Chapter } from '../types';
import { format, differenceInDays, addYears } from 'date-fns';
import { Modal } from '../components/Modal';
import { notificationService } from '../services/notificationService';
import { isMemberActive, getSubscriptionStatus, getSubscriptionDates } from '../utils/memberStatus';

export function ManageSubscriptions() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [chapterFilter, setChapterFilter] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const [editForm, setEditForm] = useState({
    subscriptionStart: '',
    subscriptionEnd: '',
    subscriptionStatus: '',
    membershipStatus: ''
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile) return;
    
    // Chapters
    const unsubChapters = databaseService.subscribe<Chapter>('chapters', [], setChapters);

    // Users
    
    const fetchUsers = async () => {
      let query = supabase.from('users').select('*');
      if (profile.role === 'MASTER_ADMIN') {
        // Master admin only sees Chapter Admins
        query = query.in('role', ['CHAPTER_ADMIN']);
        // Note: Or position === 'chapter_admin', which we will filter in JS to be safe.
      } else {
        // Chapter Admin sees their chapter
        query = query.eq('chapter_id', profile.chapter_id);
      }
      
      const { data, error } = await query;
      if (!error && data) {
        setUsers(data as UserProfile[]);
      }
      setLoading(false);
    };

    fetchUsers();

    // Listen to changes
    let constraints: any[] = [];
    if (profile.role !== 'MASTER_ADMIN') {
      constraints = [{ type: 'where', field: 'chapter_id', operator: '==', value: profile.chapter_id }];
    }
    const unsubUsers = databaseService.subscribe<UserProfile>('users', constraints as any, (data) => {
      setUsers(data);
    });

    return () => {
      unsubChapters();
      unsubUsers();
    };
  }, [profile]);

  const stats = useMemo(() => {
    let active = 0;
    let expired = 0;
    let expiringSoon = 0;
    let renewedThisMonth = 0;
    let inactive = 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    users.forEach(u => {
      if (u.role === 'MASTER_ADMIN') return;

      if (isMemberActive(u)) {
        active++;
        const subEndStr = u.subscriptionEndDate || u.subscriptionEnd || u.subscription_end_date;
        if (subEndStr) {
          const daysLeft = differenceInDays(new Date(subEndStr), now);
          if (daysLeft >= 0 && daysLeft <= 30) {
            expiringSoon++;
          }
        }
      } else {
        inactive++;
        expired++;
      }

      if (u.renewedAt || (u as any).renewed_at) {
        const renewedDate = new Date(u.renewedAt || (u as any).renewed_at);
        if (renewedDate.getMonth() === currentMonth && renewedDate.getFullYear() === currentYear) {
          renewedThisMonth++;
        }
      }
    });

    return { active, expired, expiringSoon, renewedThisMonth, inactive };
  }, [users]);


  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Master Admin: Only show Chapter Admins
      if (profile?.role === 'MASTER_ADMIN') {
        if (u.role !== 'CHAPTER_ADMIN' && u.position !== 'chapter_admin') return false;
      } else {
        // Chapter Admin: Show normal members (excluding Master Admin and Chapter Admin)
        if (u.role === 'MASTER_ADMIN' || u.role === 'CHAPTER_ADMIN' || u.position === 'chapter_admin') return false;
      }
      
      const matchesSearch = u.name?.toLowerCase().includes(search.toLowerCase()) || 
                            u.phone?.includes(search) || 
                            u.email?.toLowerCase().includes(search.toLowerCase());
      const matchesChapter = !chapterFilter || u.chapter_id === chapterFilter;
      const matchesPosition = !positionFilter || (u.role || 'MEMBER').toLowerCase() === positionFilter.toLowerCase();
      
      let computedStatus = 'Expired';
      const subStatus = getSubscriptionStatus(u);
      if (subStatus === 'Active') {
        const { endDateStr } = getSubscriptionDates(u);
        if (endDateStr) {
          const daysLeft = differenceInDays(new Date(endDateStr), new Date());
          if (daysLeft >= 0 && daysLeft <= 30) {
            computedStatus = 'Expiring Soon';
          } else {
            computedStatus = 'Active';
          }
        } else {
          computedStatus = 'Active';
        }
      } else if (subStatus === 'Pending') {
        computedStatus = 'Pending';
      } else {
        computedStatus = 'Expired';
      }
      
      const matchesStatus = !statusFilter || computedStatus === statusFilter;
      
      return matchesSearch && matchesChapter && matchesPosition && matchesStatus;
    });
  }, [users, search, chapterFilter, positionFilter, statusFilter]);

  const openEditModal = (user: UserProfile) => {
    setSelectedUser(user);
    setEditForm({
      subscriptionStart: user.subscriptionStartDate || user.subscriptionStart ? format(new Date(user.subscriptionStartDate || user.subscriptionStart as string), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      subscriptionEnd: user.subscriptionEndDate || user.subscriptionEnd ? format(new Date(user.subscriptionEndDate || user.subscriptionEnd as string), 'yyyy-MM-dd') : format(addYears(new Date(), 1), 'yyyy-MM-dd'),
      subscriptionStatus: user.subscriptionStatus || 'Active',
      membershipStatus: user.membershipStatus || 'ACTIVE'
    });
    setError('');
    setEditModalOpen(true);
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    
    setSaving(true);
    setError('');
    
    try {
      const updates = {
        subscriptionStart: new Date(editForm.subscriptionStart).toISOString(),
        subscriptionEnd: new Date(editForm.subscriptionEnd).toISOString(),
        subscriptionStatus: editForm.subscriptionStatus,
        membershipStatus: editForm.membershipStatus,
        renewedAt: new Date().toISOString(),
        renewedBy: profile?.uid,
        renewalRequested: false
      };
      
      await databaseService.update('users', selectedUser.uid || selectedUser.id, updates);

      try {
        const isApproved = editForm.subscriptionStatus === 'Active';
        await notificationService.sendNotification({
          userId: selectedUser.uid || selectedUser.id,
          role: selectedUser.role || 'MEMBER',
          type: 'SUBSCRIPTION',
          title: isApproved ? 'Subscription Approved' : 'Subscription Status Updated',
          message: isApproved 
            ? `Your membership subscription has been approved and extended until ${editForm.subscriptionEnd}.`
            : `Your membership subscription status was updated to ${editForm.subscriptionStatus}.`,
          link: '/subscriptions'
        });
      } catch (notifErr) {
        console.warn("Notification error:", notifErr);
      }
      
      setEditModalOpen(false);
      setSelectedUser(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update subscription');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-white">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <h1 className="text-2xl font-bold text-white mb-6">Manage Subscriptions</h1>
      
      {/* Dashboard Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-[#1A1D24] border border-white/5 rounded-2xl p-4">
          <div className="text-emerald-400 font-bold text-2xl">{stats.active}</div>
          <div className="text-xs text-neutral-400 font-medium uppercase tracking-wider mt-1">Active</div>
        </div>
        <div className="bg-[#1A1D24] border border-white/5 rounded-2xl p-4">
          <div className="text-red-400 font-bold text-2xl">{stats.expired}</div>
          <div className="text-xs text-neutral-400 font-medium uppercase tracking-wider mt-1">Expired</div>
        </div>
        <div className="bg-[#1A1D24] border border-white/5 rounded-2xl p-4">
          <div className="text-amber-400 font-bold text-2xl">{stats.expiringSoon}</div>
          <div className="text-xs text-neutral-400 font-medium uppercase tracking-wider mt-1">Expiring Soon</div>
        </div>
        <div className="bg-[#1A1D24] border border-white/5 rounded-2xl p-4">
          <div className="text-blue-400 font-bold text-2xl">{stats.renewedThisMonth}</div>
          <div className="text-xs text-neutral-400 font-medium uppercase tracking-wider mt-1">Renewed This Month</div>
        </div>
        <div className="bg-[#1A1D24] border border-white/5 rounded-2xl p-4">
          <div className="text-neutral-300 font-bold text-2xl">{stats.inactive}</div>
          <div className="text-xs text-neutral-400 font-medium uppercase tracking-wider mt-1">Inactive Members</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
          <input
            type="text"
            placeholder="Search by name, phone or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1A1D24] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white focus:outline-none focus:border-[#E53935]"
          />
        </div>
        
        {profile?.role === 'MASTER_ADMIN' && (
          <select
            value={chapterFilter}
            onChange={(e) => setChapterFilter(e.target.value)}
            className="bg-[#1A1D24] border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#E53935] appearance-none"
          >
            <option value="">All Chapters</option>
            {chapters.map(c => (
              <option key={c.id} value={c.id}>{c.chapter_name || (c as any).chapterName}</option>
            ))}
          </select>
        )}

        <select
          value={positionFilter}
          onChange={(e) => setPositionFilter(e.target.value)}
          className="bg-[#1A1D24] border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#E53935] appearance-none"
        >
          <option value="">All Positions</option>
          <option value="chapter_admin">Chapter Admin</option>
          <option value="president">President</option>
          <option value="vice_president">Vice President</option>
          <option value="treasurer">Treasurer</option>
          <option value="member">Member</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#1A1D24] border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#E53935] appearance-none"
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Expired">Expired</option>
          <option value="Expiring Soon">Expiring Soon (30 Days)</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#1A1D24] rounded-2xl border border-white/5 overflow-hidden overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-[#242830]">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Member Name</th>
              <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Phone Number</th>
              <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Chapter Name</th>
              <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Position</th>
              <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Start Date</th>
              <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">End Date</th>
              <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Days Remaining</th>
              <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Default Pwd</th>
              <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Last Renewal</th>
              <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-neutral-400 font-medium">No members found</td>
              </tr>
            ) : (
              filteredUsers.map(user => {
                const { endDateStr } = getSubscriptionDates(user);
                const subEndStr = endDateStr;
                let daysLeft = 0;
                let statusColor = "text-emerald-400";
                let statusLabel = "Active";
                
                const subStatus = getSubscriptionStatus(user);
                if (subStatus === 'Active') {
                  if (endDateStr) {
                    daysLeft = differenceInDays(new Date(endDateStr), new Date());
                    if (daysLeft <= 30) {
                      statusColor = "text-amber-400";
                      statusLabel = "Expiring Soon";
                    } else {
                      statusColor = "text-emerald-400";
                      statusLabel = "Active";
                    }
                  } else {
                    statusColor = "text-emerald-400";
                    statusLabel = "Active";
                  }
                } else if (subStatus === 'Pending') {
                  statusColor = "text-blue-400";
                  statusLabel = "Pending";
                } else {
                  statusColor = "text-red-400";
                  statusLabel = "Expired";
                }
                
                const chap = chapters.find(c => c.id === user.chapter_id);

                return (
                  <tr key={user.uid} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{user.name}</div>
                      <div className="text-xs text-neutral-400">{user.email}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-300">
                      {user.phone}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-300">
                      {chap?.chapter_name || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-300 capitalize">
                      {user.position?.replace('_', ' ') || user.role}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-300">
                      {user.subscriptionStartDate || user.subscriptionStart ? format(new Date(user.subscriptionStartDate || user.subscriptionStart as string), 'MMM d, yyyy') : 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-neutral-300">
                        {subEndStr ? format(new Date(subEndStr), 'MMM d, yyyy') : 'N/A'}
                      </div>
                      {subEndStr && daysLeft >= 0 && (
                        <div className="text-xs text-neutral-500">{daysLeft} days left</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-black/20 ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.must_change_password ? (
                        <span className="text-xs font-medium text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">Not Changed</span>
                      ) : (
                        <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">Changed</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-300">
                      {user.renewedAt || (user as any).renewed_at ? format(new Date(user.renewedAt || (user as any).renewed_at as string), 'MMM d, yyyy') : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button 
                        onClick={() => openEditModal(user)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E53935] hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        <CreditCard size={14} />
                        Manage
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Manage Subscription"
        maxWidth="max-w-md"
      >
        {selectedUser && (
          <div className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                Member
              </label>
              <div className="p-3 bg-[#11131A] rounded-xl border border-white/10 text-white font-medium">
                {selectedUser.name} ({selectedUser.phone})
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={editForm.subscriptionStart}
                  onChange={e => setEditForm({ ...editForm, subscriptionStart: e.target.value })}
                  className="w-full bg-[#11131A] border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#E53935]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={editForm.subscriptionEnd}
                  onChange={e => setEditForm({ ...editForm, subscriptionEnd: e.target.value })}
                  className="w-full bg-[#11131A] border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#E53935]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                Subscription Status
              </label>
              <select
                value={editForm.subscriptionStatus}
                onChange={e => setEditForm({ ...editForm, subscriptionStatus: e.target.value })}
                className="w-full bg-[#11131A] border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#E53935] appearance-none"
              >
                <option value="Active">Active</option>
                <option value="Expired">Expired</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                Membership Status
              </label>
              <select
                value={editForm.membershipStatus}
                onChange={e => setEditForm({ ...editForm, membershipStatus: e.target.value })}
                className="w-full bg-[#11131A] border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#E53935] appearance-none"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="PENDING">PENDING</option>
              </select>
            </div>
            
            <div className="pt-4 flex gap-3">
              <button
                onClick={() => {
                  setEditForm({
                    ...editForm,
                    subscriptionEnd: format(addYears(new Date(editForm.subscriptionEnd), 1), 'yyyy-MM-dd'),
                    subscriptionStatus: 'Active',
                    membershipStatus: 'ACTIVE'
                  });
                }}
                className="flex-1 px-4 py-2 border border-[#E53935] text-[#E53935] hover:bg-[#E53935]/10 font-bold rounded-xl transition-colors text-sm"
              >
                +1 Year
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-[2] px-4 py-2 bg-[#E53935] hover:bg-red-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 text-sm"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
