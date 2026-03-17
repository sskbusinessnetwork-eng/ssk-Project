import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical, 
  Shield, 
  UserCheck, 
  UserMinus,
  Mail,
  Phone,
  Briefcase,
  Tags
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { firestoreService } from '../services/firestoreService';
import { UserProfile, Chapter } from '../types';
import { where } from 'firebase/firestore';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export function Members() {
  const { profile } = useAuth();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    const constraints = profile.role === 'admin' 
      ? [] 
      : [where('chapterId', '==', profile.chapterId)];

    const unsubscribe = firestoreService.subscribe<UserProfile>('users', constraints, (data) => {
      setMembers(data);
      setLoading(false);
    });

    if (profile.role === 'admin') {
      firestoreService.list<Chapter>('chapters').then(setChapters);
    }

    return () => unsubscribe();
  }, [profile]);

  const updateRole = async (uid: string, role: UserProfile['role']) => {
    await firestoreService.update('users', uid, { role });
  };

  const updateStatus = async (uid: string, status: UserProfile['status']) => {
    await firestoreService.update('users', uid, { status });
  };

  const filteredMembers = members.filter(m => 
    m.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Member Management</h1>
          <p className="text-slate-500 mt-1">Manage chapter memberships, roles, and business categories.</p>
        </div>
      </header>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by name, business, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
          />
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all flex items-center gap-2">
            <Filter size={18} /> Filter
          </button>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Member</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Business & Category</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredMembers.length > 0 ? (
                filteredMembers.map((member) => (
                  <tr key={member.uid} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={member.photoURL || 'https://picsum.photos/seed/user/40/40'} 
                          className="w-10 h-10 rounded-xl border border-slate-100"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="font-bold text-slate-900">{member.displayName}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Mail size={12} /> {member.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                          <Briefcase size={14} className="text-slate-400" /> {member.businessName || 'N/A'}
                        </p>
                        <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                          <Tags size={12} /> {member.category || 'No Category'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                        member.role === 'admin' ? "bg-purple-100 text-purple-700" :
                        member.role === 'chapter_admin' ? "bg-blue-100 text-blue-700" :
                        member.role === 'member' ? "bg-emerald-100 text-emerald-700" :
                        "bg-slate-100 text-slate-700"
                      )}>
                        {member.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "flex items-center gap-1.5 text-xs font-bold",
                        member.status === 'active' ? "text-emerald-600" :
                        member.status === 'suspended' ? "text-red-600" :
                        "text-amber-600"
                      )}>
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          member.status === 'active' ? "bg-emerald-600" :
                          member.status === 'suspended' ? "bg-red-600" :
                          "bg-amber-600"
                        )} />
                        {member.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {member.status === 'pending' && (
                          <button
                            onClick={() => updateStatus(member.uid, 'active')}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                            title="Approve Member"
                          >
                            <UserCheck size={18} />
                          </button>
                        )}
                        {member.role === 'guest' && member.status === 'active' && (
                          <button
                            onClick={() => updateRole(member.uid, 'member')}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Promote to Member"
                          >
                            <Shield size={18} />
                          </button>
                        )}
                        {member.status === 'active' && (
                          <button
                            onClick={() => updateStatus(member.uid, 'suspended')}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Suspend Member"
                          >
                            <UserMinus size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No members found in this chapter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
