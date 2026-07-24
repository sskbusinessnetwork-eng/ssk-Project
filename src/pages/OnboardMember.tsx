import React, { useState, useEffect } from 'react';
import bcrypt from 'bcryptjs';
import { db } from '../lib/database';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, deleteDoc, onSnapshot, addDoc } from '../lib/database';
import { useAuth } from '../hooks/useAuth';
import { User, Phone, Mail, CheckCircle, X, Search, ShieldAlert, KeyRound, Check, RefreshCw, Trash2, Edit2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { UserProfile, ChapterPosition } from '../types';
import { MemberSuccessPopup } from '../components/members/MemberSuccessPopup';
import { supabase } from '../lib/supabaseClient';
import { normalizePhoneNumber } from '../utils/phoneUtils';

export function OnboardMember() {
  const { profile } = useAuth();
  const isMasterAdmin = profile?.role === 'MASTER_ADMIN';

  const [members, setMembers] = useState<UserProfile[]>([]);
  const [chapters, setChapters] = useState<UserProfile[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createdMemberData, setCreatedMemberData] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    category: '',
    phone: '',
    whatsapp: '',
    email: '',
    chapterId: '',
    status: 'ACTIVE'
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [chapterFilter, setChapterFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  useEffect(() => {
    if (!isMasterAdmin) return;
    
    // Fetch chapters (chapter admins)
    getDocs(query(collection(db, 'users'), where('position', '==', 'chapter_admin')))
      .then((snap: any) => setChapters((snap?.docs || []).map((d: any) => ({ uid: d.id, ...d.data() } as UserProfile))));
      
    // Subscribe to all members (for simplicity, getting all users)
    const unsub = onSnapshot(collection(db, 'users'), snap => {
      setMembers((snap?.docs || []).map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
    });
    
    return () => unsub();
  }, [isMasterAdmin]);

  const generateMemberId = () => {
    return 'SSK' + Math.floor(10000 + Math.random() * 90000).toString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validation
      const cleanPhone = normalizePhoneNumber(formData.phone);
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('phone', cleanPhone)
        .limit(1);

      if (checkError) throw checkError;
      const isDuplicate = existingUser && existingUser.length > 0 && existingUser[0].id !== editingId;
      if (isDuplicate) {
        throw new Error('This phone number is already registered. Please use a different phone number.');
      }
      
      if (formData.email) {
        const emailExists = members.some(m => m.email === formData.email && m.uid !== editingId);
        if (emailExists) throw new Error('Email ID already exists.');
      }

      if (!formData.chapterId) {
        throw new Error('Please select a Chapter for this member. Chapter assignment is required.');
      }

      if (editingId) {
        await updateDoc(doc(db, 'users', editingId), {
          name: formData.fullName,
          category: formData.category,
          phone: formData.phone,
          whatsappNumber: formData.whatsapp,
          email: formData.email,
          chapter_id: formData.chapterId,
          membershipStatus: formData.status
        });
        
        
      } else {
        const memberId = generateMemberId();
        
        const newMember = {
          memberId,
          name: formData.fullName,
          category: formData.category,
          phone: formData.phone,
          whatsappNumber: formData.whatsapp,
          email: formData.email,
          chapter_id: formData.chapterId,
          role: 'MEMBER',
          position: 'member' as ChapterPosition,
          status: 'INACTIVE',
          membershipStatus: 'INACTIVE' as any,
          account_status: 'INACTIVE',
          accountStatus: 'INACTIVE',
          password_changed: false,
          passwordChanged: false,
          must_change_password: true,
          mustChangePassword: true,
          createdAt: new Date().toISOString()
        };

        await addDoc(collection(db, 'users'), newMember);
        
        
        
        setCreatedMemberData({
          name: formData.fullName,
          userId: memberId,
          phone: formData.phone,
          password: bcrypt.hashSync('Welcometosskbusiness', 10)
        });
      }

      setIsModalOpen(false);
      setEditingId(null);
      setFormData({
        fullName: '',
        category: '',
        phone: '',
        whatsapp: '',
        email: '',
        chapterId: '',
        status: 'ACTIVE'
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (uid: string) => {
    if (!confirm('Are you sure you want to reset this member\'s password? They will be forced to change it on their next login.')) return;
    
    try {
      await updateDoc(doc(db, 'users', uid), { 
        must_change_password: true, 
        password_changed: false,
        password: bcrypt.hashSync('Welcometosskbusiness', 10) 
      });
      
      alert('Password reset successfully to default.');
    } catch (err) {
      console.error(err);
      alert('Failed to reset password.');
    }
  };

  const handleDeleteMember = async (uid: string) => {
    if (!confirm('Are you sure you want to delete this member?')) return;
    
    try {
      await deleteDoc(doc(db, 'users', uid));
      
    } catch (err) {
      console.error(err);
      alert('Failed to delete member.');
    }
  };
  
  const handleToggleStatus = async (member: UserProfile) => {
    const newStatus = member.membershipStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await updateDoc(doc(db, 'users', member.uid), { membershipStatus: newStatus });
    } catch (err) {
      console.error(err);
    }
  };

  if (!isMasterAdmin) {
    return <div className="p-8 text-center">Access Denied. Master Admin only.</div>;
  }

  const filteredMembers = members.filter(m => {
    // Basic search by name, phone, memberId
    const searchMatch = !searchTerm || 
      (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.phone || '').includes(searchTerm) ||
      (m.memberId || '').toLowerCase().includes(searchTerm.toLowerCase());
      
    const statusMatch = statusFilter === 'ALL' || m.membershipStatus === statusFilter;
    const chapterMatch = chapterFilter === 'ALL' || m.chapter_id === chapterFilter;
    const categoryMatch = categoryFilter === 'ALL' || m.category === categoryFilter;
    
    // Only show members (not master admins)
    return m.role !== 'MASTER_ADMIN' && searchMatch && statusMatch && chapterMatch && categoryMatch;
  });

  const categories = Array.from(new Set(members.map(m => m.category).filter(Boolean)));

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-neutral-900">Onboard Member</h1>
          <p className="text-sm text-neutral-500">Create and manage member accounts and passwords.</p>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-md hover:bg-primary/90 transition-colors"
        >
          <User size={18} />
          Create Member
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-[24px] shadow-sm border border-neutral-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input
              type="text"
              placeholder="Search Name, Phone, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-9 pr-4 bg-neutral-50 border border-neutral-200 rounded-[12px] focus:bg-white focus:border-primary outline-none text-sm"
            />
          </div>
          
          <select
            value={chapterFilter}
            onChange={(e) => setChapterFilter(e.target.value)}
            className="w-full h-11 px-4 bg-neutral-50 border border-neutral-200 rounded-[12px] focus:bg-white focus:border-primary outline-none text-sm"
          >
            <option value="ALL">All Chapters</option>
            {chapters.map(c => (
              <option key={c.uid} value={c.uid}>{c.name}</option>
            ))}
          </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full h-11 px-4 bg-neutral-50 border border-neutral-200 rounded-[12px] focus:bg-white focus:border-primary outline-none text-sm"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended / Inactive</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full h-11 px-4 bg-neutral-50 border border-neutral-200 rounded-[12px] focus:bg-white focus:border-primary outline-none text-sm"
          >
            <option value="ALL">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[24px] shadow-sm border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="p-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Member ID</th>
                <th className="p-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Name</th>
                <th className="p-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Contact</th>
                <th className="p-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Chapter</th>
                <th className="p-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Position</th>
                <th className="p-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-semibold text-neutral-600 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filteredMembers.map(member => (
                <tr key={member.uid} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="p-4 text-sm font-bold text-neutral-900">{member.memberId || 'N/A'}</td>
                  <td className="p-4">
                    <div className="font-bold text-neutral-900 text-sm">{member.name}</div>
                    <div className="text-xs text-neutral-500">{member.category || 'No Category'}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1 text-sm text-neutral-600">
                      <div className="flex items-center gap-1.5"><Phone size={12}/> {member.phone}</div>
                      {member.whatsappNumber && <div className="flex items-center gap-1.5"><Phone size={12} className="text-emerald-500"/> {member.whatsappNumber}</div>}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-neutral-600">
                    {chapters.find(c => c.uid === member.chapter_id)?.name || 'None'}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-600">
                      {(member.position || 'member').replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                      member.membershipStatus === 'ACTIVE' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    )}>
                      {member.membershipStatus}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {profile?.uid === member.uid && <button 
                        onClick={() => {
                          setEditingId(member.uid);
                          setFormData({
                            fullName: member.name,
                            category: member.category || '',
                            phone: member.phone || '',
                            whatsapp: member.whatsappNumber || '',
                            email: member.email || '',
                            chapterId: member.chapter_id || '',
                            status: member.membershipStatus
                          });
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Member"
                      >
                        <Edit2 size={16} />
                      </button>}
                      <button 
                        onClick={() => handleToggleStatus(member)}
                        className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
                        title={member.membershipStatus === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      >
                        {member.membershipStatus === 'ACTIVE' ? <X size={16} /> : <Check size={16} />}
                      </button>
                      <button 
                        onClick={() => handleResetPassword(member.uid)}
                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Reset Password"
                      >
                        <KeyRound size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteMember(member.uid)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Member"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredMembers.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-neutral-500">
                    No members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Member Modal */}
      <MemberSuccessPopup 
        isOpen={!!createdMemberData} 
        onClose={() => setCreatedMemberData(null)} 
        memberData={createdMemberData} 
      />
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[24px] shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-neutral-900">{editingId ? 'Edit Member' : 'Onboard New Member'}</h2>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingId(null);
                  setFormData({
                    fullName: '', category: '', phone: '', whatsapp: '', email: '', chapterId: '', status: 'ACTIVE'
                  });
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 text-neutral-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm flex items-start gap-2">
                  <ShieldAlert size={18} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              
              <form id="create-member-form" onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Full Name *</label>
                    <input
                      required
                      type="text"
                      value={formData.fullName}
                      onChange={e => setFormData({...formData, fullName: e.target.value})}
                      className="w-full h-12 px-4 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:border-primary outline-none transition-all text-sm"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Business Category</label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      className="w-full h-12 px-4 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:border-primary outline-none transition-all text-sm"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Mobile Number *</label>
                    <input
                      required
                      type="tel"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full h-12 px-4 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:border-primary outline-none transition-all text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">WhatsApp Number *</label>
                    <input
                      required
                      type="tel"
                      value={formData.whatsapp}
                      onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                      className="w-full h-12 px-4 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:border-primary outline-none transition-all text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Email (Optional)</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full h-12 px-4 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:border-primary outline-none transition-all text-sm"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Chapter *</label>
                    <select
                      required
                      value={formData.chapterId}
                      onChange={e => setFormData({...formData, chapterId: e.target.value})}
                      className="w-full h-12 px-4 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:border-primary outline-none transition-all text-sm"
                    >
                      <option value="">Select Chapter</option>
                      {chapters.map(c => (
                        <option key={c.uid} value={c.uid}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value})}
                      className="w-full h-12 px-4 bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:border-primary outline-none transition-all text-sm"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="SUSPENDED">Inactive</option>
                    </select>
                  </div>
                </div>
                
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 mt-6">
                  <h3 className="text-sm font-bold text-neutral-900 mb-2">Login Credentials</h3>
                  <div className="text-sm text-neutral-600 space-y-1">
                    <p><strong>Username:</strong> Mobile Number</p>
                    <p><strong>Default Password:</strong> Welcometosskbusiness</p>
                    <p className="text-xs text-primary mt-2">
                      * The system automatically assigns this default password. The member will be forced to change it on their first login.
                    </p>
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-neutral-100 flex items-center justify-end gap-3 bg-neutral-50">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingId(null);
                  setFormData({
                    fullName: '', category: '', phone: '', whatsapp: '', email: '', chapterId: '', status: 'ACTIVE'
                  });
                }}
                className="px-6 py-2.5 text-neutral-600 font-bold text-sm hover:bg-neutral-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-member-form"
                disabled={loading}
                className="px-6 py-2.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading && <RefreshCw size={16} className="animate-spin" />}
                {editingId ? 'Save Changes' : 'Create Member Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
