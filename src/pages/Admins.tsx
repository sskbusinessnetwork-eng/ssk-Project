import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Shield, Phone, CreditCard as Edit2, Trash2, Search, Lock, UserPlus, Check, X, Mail, ChevronRight, Building2, CircleAlert as AlertCircle, CircleCheck as CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { firestoreService } from '../services/firestoreService';
import { UserProfile } from '../types';
import { Modal } from '../components/Modal';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { normalizePhoneNumber } from '../utils/phoneUtils';
import { PositionManagement } from '../components/positions/PositionManagement';
import { safeFetch } from '../utils/apiUtils';

export function Admins() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'admins' | 'positions'>('admins');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<UserProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    chapterName: '',
    businessName: '',
    password: '',
    membershipStatus: 'ACTIVE' as UserProfile['membershipStatus']
  });

  useEffect(() => {
    const unsubscribeUsers = firestoreService.subscribe<UserProfile>('users', [], (data) => {
      setUsers(data);
      setLoading(false);
    });

    return () => {
      unsubscribeUsers();
    };
  }, []);

  const admins = users.filter(u => u.role === 'CHAPTER_ADMIN');
  const memberCounts = users.reduce((acc, user) => {
    if (user.role === 'MEMBER' && user.adminId) {
      acc[user.adminId] = (acc[user.adminId] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const handleOpenModal = (admin?: UserProfile) => {
    if (admin) {
      setEditingAdmin(admin);
      setFormData({
        name: admin.name,
        phone: admin.phone || '',
        email: admin.email || '',
        chapterName: admin.chapterName || '',
        businessName: admin.businessName || '',
        password: '', // Don't show password
        membershipStatus: admin.membershipStatus
      });
    } else {
      setEditingAdmin(null);
      setFormData({
        name: '',
        phone: '',
        email: '',
        chapterName: '',
        businessName: '',
        password: '',
        membershipStatus: 'ACTIVE'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const normalizedPhone = normalizePhoneNumber(formData.phone);
      
      // Check if phone number already exists in Firestore (excluding current admin if editing)
      const existingUser = users.find(u => u.phone?.replace(/\D/g, '') === normalizedPhone && u.uid !== editingAdmin?.uid);
      if (existingUser) {
        throw new Error('An account with this phone number already exists.');
      }

      if (editingAdmin) {
        // 1. Update Auth via API
        const updatePayload: any = {
          uid: editingAdmin.uid,
          displayName: formData.name,
          adminUid: profile?.uid
        };
        
        if (formData.password) {
          updatePayload.password = formData.password;
        }

        await safeFetch('/api/admin/update-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload)
        });

        // 2. Update Firestore Profile
        await firestoreService.update('users', editingAdmin.uid, {
          name: formData.name,
          phone: normalizedPhone,
          email: formData.email,
          chapterName: formData.chapterName,
          businessName: formData.businessName,
          membershipStatus: formData.membershipStatus
        });
        setSuccess('Admin updated successfully!');
      } else {
        // 1. Create in Auth via API
        const data = await safeFetch('/api/admin/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: normalizedPhone,
            email: formData.email,
            password: formData.password,
            displayName: formData.name,
            role: 'CHAPTER_ADMIN',
            adminUid: profile?.uid
          })
        });

        const { uid } = data;

        // 2. Create Firestore Profile
        const newAdmin: UserProfile = {
          uid,
          name: formData.name,
          phone: normalizedPhone,
          email: formData.email,
          chapterName: formData.chapterName,
          businessName: formData.businessName,
          role: 'CHAPTER_ADMIN',
          membershipStatus: formData.membershipStatus,
          createdAt: new Date().toISOString()
        };
        await firestoreService.create('users', newAdmin, uid);
        setSuccess('Admin created successfully!');
      }

      setTimeout(() => {
        setIsModalOpen(false);
        setSuccess(null);
      }, 2000);
    } catch (err: any) {
      console.error("Error: ", err.message);
      setError(err.message || 'Failed to process admin account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (uid: string) => {
    try {
      // 1. Delete from Auth via API
      await safeFetch('/api/auth/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          adminUid: profile?.uid
        })
      });

      // 2. Delete from Firestore
      await firestoreService.delete('users', uid);

      setDeleteConfirmId(null);
    } catch (error: any) {
      console.error("Error deleting admin: ", error.message);
    }
  };

  const filteredAdmins = admins.filter(admin => 
    admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.phone?.includes(searchQuery)
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Chapter Management</h1>
            <p className="text-text-secondary mt-1 text-sm">Manage administrators and positions for the network.</p>
          </div>
        </div>
        {activeTab === 'admins' && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:-translate-y-0.5"
          >
            <Plus size={18} />
            <span>Add Admin</span>
          </button>
        )}
      </header>

      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        <button 
          onClick={() => setActiveTab('admins')}
          className={cn(
            "px-5 py-2 text-xs font-bold rounded-lg transition-all",
            activeTab === 'admins' ? "bg-white text-primary shadow-sm" : "text-text-secondary hover:bg-white/50"
          )}
        >
          Chapter Admins
        </button>
        <button 
          onClick={() => setActiveTab('positions')}
          className={cn(
            "px-5 py-2 text-xs font-bold rounded-lg transition-all",
            activeTab === 'positions' ? "bg-white text-primary shadow-sm" : "text-text-secondary hover:bg-white/50"
          )}
        >
          Position Section
        </button>
      </div>

      {activeTab === 'admins' ? (
        <div className="bg-white rounded-[20px] border border-neutral-200/80 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
          <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
              <input
                type="text"
                placeholder="Search admins by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 rounded-xl border border-transparent focus:border-primary focus:bg-white outline-none transition-all text-sm font-medium"
              />
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50/80 border-b border-border">
                  <th className="px-6 py-4 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Chapter</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-neutral-500 uppercase tracking-wider text-center">Members</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-neutral-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
                    </td>
                  </tr>
                ) : filteredAdmins.length > 0 ? (
                  filteredAdmins.map((admin) => {
                    return (
                      <tr 
                        key={admin.uid} 
                        className="hover:bg-neutral-50/80 transition-colors group cursor-pointer"
                        onClick={() => navigate(`/profile?id=${admin.uid}`)}
                      >
                        <td className="px-6 py-4 text-[14px]">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                              <Shield size={20} />
                            </div>
                            <div>
                              <span className="font-bold text-text-primary block">{admin.name}</span>
                              <span className="text-[11px] text-text-secondary font-medium">
                                {admin.phone}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[14px]">
                          <div className="flex items-center gap-2 text-sm text-text-secondary">
                            <Mail size={14} className="text-text-secondary" />
                            <span>{admin.email || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[14px]">
                          <span className="inline-flex items-center px-2.5 py-1 bg-neutral-100 text-neutral-600 rounded-full border border-neutral-200 text-[11px] font-bold">
                            {admin.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[14px]">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-sm text-text-primary font-bold">
                              <Building2 size={14} className="text-primary" />
                              <span>{admin.chapterName || 'N/A'}</span>
                            </div>
                            {admin.businessName && (
                              <div className="flex items-center gap-2 text-[11px] text-text-secondary font-medium">
                                <span className="ml-5 italic">{admin.businessName}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-[14px]">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100 text-xs font-bold">
                            <UserPlus size={14} />
                            {memberCounts[admin.uid] || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => handleOpenModal(admin)}
                              className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={() => setDeleteConfirmId(admin.uid)}
                              className="p-2 text-text-secondary hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-300">
                        <Shield size={32} />
                      </div>
                      <h3 className="text-lg font-bold text-text-primary">No admins found</h3>
                      <p className="text-text-secondary mt-1 text-sm">Try adjusting your search or add a new admin.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-border">
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : filteredAdmins.length > 0 ? (
              filteredAdmins.map((admin) => (
                <div 
                  key={admin.uid}
                  className="p-4 space-y-4 active:bg-neutral-50 transition-colors"
                  onClick={() => navigate(`/profile?id=${admin.uid}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                        <Shield size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-text-primary">{admin.name}</h3>
                        <p className="text-[11px] text-text-secondary font-bold">
                          {admin.role.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-neutral-300" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Email</p>
                      <p className="text-xs font-bold text-text-primary truncate">{admin.email || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Phone</p>
                      <p className="text-xs font-bold text-text-primary">{admin.phone || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Chapter</p>
                      <p className="text-xs font-bold text-text-primary truncate">{admin.businessName || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Members</p>
                      <p className="text-xs font-bold text-text-primary">{memberCounts[admin.uid] || 0}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => handleOpenModal(admin)}
                      className="flex-1 py-2 bg-neutral-100 text-text-secondary rounded-lg text-[11px] font-bold hover:bg-primary/10 hover:text-primary transition-all"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => setDeleteConfirmId(admin.uid)}
                      className="flex-1 py-2 bg-neutral-100 text-text-secondary rounded-lg text-[11px] font-bold hover:bg-red-50 hover:text-red-600 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center">
                <Shield size={32} className="text-neutral-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-text-primary">No admins found</h3>
              </div>
            )}
          </div>
        </div>
      ) : (
        <PositionManagement isMasterAdmin={true} />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsModalOpen(false);
            setError(null);
            setSuccess(null);
          }
        }}
        title={editingAdmin ? "Edit Admin" : "Add New Admin"}
      >
        {success ? (
          <div className="py-12 text-center space-y-4">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-100">
              <CheckCircle2 size={48} />
            </div>
            <h3 className="text-xl font-bold text-text-primary">{success}</h3>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-bold flex items-center gap-2">
                <AlertCircle size={18} />
                {error}
              </div>
            )}
            <div className="bg-neutral-50 p-4 rounded-2xl border border-border space-y-4">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Shield size={16} className="text-primary" />
              Admin Profile
            </h3>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-text-primary">Full Name</label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter admin's full name"
                className="w-full px-4 py-3 rounded-xl border border-border bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-text-primary">Phone Number</label>
                <input
                  required
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-text-primary">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-text-primary">Chapter Name <span className="text-red-500">*</span></label>
              <input
                required
                type="text"
                value={formData.chapterName}
                onChange={(e) => setFormData({ ...formData, chapterName: e.target.value })}
                placeholder="e.g. SSK Mumbai Central"
                className="w-full px-4 py-3 rounded-xl border border-border bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-text-primary">Business Name (Optional)</label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                placeholder="Enter business name"
                className="w-full px-4 py-3 rounded-xl border border-border bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-text-primary">
                {editingAdmin ? "New Password (Optional)" : "Password"}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                <input
                  required={!editingAdmin}
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingAdmin ? "Leave blank to keep current" : "Minimum 6 characters"}
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="bg-neutral-50 p-4 rounded-2xl border border-border space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-text-primary">Account Status</label>
              <select
                required
                value={formData.membershipStatus}
                onChange={(e) => setFormData({ ...formData, membershipStatus: e.target.value as UserProfile['membershipStatus'] })}
                className="w-full px-4 py-3 rounded-xl border border-border bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
              >
                <option value="ACTIVE">Active</option>
                <option value="PENDING">Pending</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                <span>Processing...</span>
              </div>
            ) : (
              editingAdmin ? "Update Admin Account" : "Create Admin Account"
            )}
          </button>
        </form>
      )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Admin Account"
      >
        <div className="space-y-6 py-4">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border border-red-100">
            <Trash2 size={32} />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-bold text-text-primary">Are you sure?</h3>
            <p className="text-text-secondary mt-2 text-sm">
              This will permanently delete the admin's authentication account and their profile. This cannot be undone.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="flex-1 py-3 bg-neutral-100 text-text-secondary rounded-xl font-bold hover:bg-neutral-200 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-500/20"
            >
              Delete Account
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
