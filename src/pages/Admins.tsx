import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Shield, Phone, Edit2, Trash2, Search, Lock, UserPlus, Check, X, Mail, ChevronRight, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { firestoreService } from '../services/firestoreService';
import { UserProfile } from '../types';
import { Modal } from '../components/Modal';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { normalizePhoneNumber } from '../utils/phoneUtils';
import { PositionManagement } from '../components/positions/PositionManagement';

export function Admins() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'admins' | 'positions'>('admins');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<UserProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
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

        await fetch('/api/admin/update-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload)
        });

        // 2. Update Firestore Profile
        await firestoreService.update('users', editingAdmin.uid, {
          name: formData.name,
          phone: normalizedPhone,
          email: formData.email,
          businessName: formData.businessName,
          membershipStatus: formData.membershipStatus
        });
      } else {
        // 1. Create in Auth via API
        const response = await fetch('/api/admin/create-user', {
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

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.details || error.error || 'Failed to create admin user');
        }

        const { uid } = await response.json();

        // 2. Create Firestore Profile
        const newAdmin: UserProfile = {
          uid,
          name: formData.name,
          phone: normalizedPhone,
          email: formData.email,
          businessName: formData.businessName,
          role: 'CHAPTER_ADMIN',
          membershipStatus: formData.membershipStatus,
          createdAt: new Date().toISOString()
        };
        await firestoreService.create('users', newAdmin, uid);
      }

      setIsModalOpen(false);
      alert(editingAdmin ? 'Admin updated successfully!' : 'Admin created successfully!');
    } catch (error: any) {
      console.error("Error: ", error.message);
      alert(error.message || 'Failed to process admin account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (uid: string) => {
    try {
      // 1. Delete from Auth via API
      await fetch('/api/auth/delete-user', {
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
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Chapter Management</h1>
          <p className="text-slate-600 mt-1">Manage administrators and positions for the network.</p>
        </div>
        {activeTab === 'admins' && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
          >
            <Plus size={20} />
            <span>Add Admin</span>
          </button>
        )}
      </header>

      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
        <button 
          onClick={() => setActiveTab('admins')}
          className={cn(
            "px-6 py-2 text-xs font-bold rounded-lg transition-all",
            activeTab === 'admins' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:bg-white/50"
          )}
        >
          Chapter Admins
        </button>
        <button 
          onClick={() => setActiveTab('positions')}
          className={cn(
            "px-6 py-2 text-xs font-bold rounded-lg transition-all",
            activeTab === 'positions' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:bg-white/50"
          )}
        >
          Position Section
        </button>
      </div>

      {activeTab === 'admins' ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Search admins by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Name</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Role</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Chapter</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Members</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500 mx-auto"></div>
                    </td>
                  </tr>
                ) : filteredAdmins.length > 0 ? (
                  filteredAdmins.map((admin) => {
                    return (
                      <tr 
                        key={admin.uid} 
                        className="hover:bg-slate-50 transition-colors group cursor-pointer"
                        onClick={() => navigate(`/profile?id=${admin.uid}`)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                              <Shield size={20} />
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block">{admin.name}</span>
                              <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                                {admin.phone}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <Mail size={12} className="text-slate-500" />
                            <span>{admin.email || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                            {admin.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <Building2 size={12} className="text-slate-500" />
                            <span>{admin.businessName || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-900 rounded-lg text-xs font-bold">
                            <UserPlus size={14} className="text-slate-500" />
                            {memberCounts[admin.uid] || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => handleOpenModal(admin)}
                              className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={() => setDeleteConfirmId(admin.uid)}
                              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
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
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <Shield size={32} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">No admins found</h3>
                      <p className="text-slate-600 mt-1">Try adjusting your search or add a new admin.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-100">
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500 mx-auto"></div>
              </div>
            ) : filteredAdmins.length > 0 ? (
              filteredAdmins.map((admin) => (
                <div 
                  key={admin.uid}
                  className="p-4 space-y-4 active:bg-slate-50 transition-colors"
                  onClick={() => navigate(`/profile?id=${admin.uid}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                        <Shield size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{admin.name}</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                          {admin.role.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-300" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</p>
                      <p className="text-xs font-bold text-slate-700 truncate">{admin.email || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone</p>
                      <p className="text-xs font-bold text-slate-700">{admin.phone || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chapter</p>
                      <p className="text-xs font-bold text-slate-700 truncate">{admin.businessName || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Members</p>
                      <p className="text-xs font-bold text-slate-700">{memberCounts[admin.uid] || 0}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => handleOpenModal(admin)}
                      className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-50 hover:text-emerald-600 transition-all"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => setDeleteConfirmId(admin.uid)}
                      className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center">
                <Shield size={32} className="text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900">No admins found</h3>
              </div>
            )}
          </div>
        </div>
      ) : (
        <PositionManagement isMasterAdmin={true} />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAdmin ? "Edit Admin" : "Add New Admin"}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Shield size={16} className="text-emerald-600" />
              Admin Profile
            </h3>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-900 uppercase tracking-wider">Full Name</label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter admin's full name"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-900 uppercase tracking-wider">Phone Number</label>
                <input
                  required
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-900 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-900 uppercase tracking-wider">Chapter Name (Business Name)</label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                placeholder="e.g. SSK Mumbai Central"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                {editingAdmin ? "New Password (Optional)" : "Password"}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  required={!editingAdmin}
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingAdmin ? "Leave blank to keep current" : "Minimum 6 characters"}
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-900 uppercase tracking-wider">Account Status</label>
              <select
                required
                value={formData.membershipStatus}
                onChange={(e) => setFormData({ ...formData, membershipStatus: e.target.value as UserProfile['membershipStatus'] })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white"
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
            className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
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
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Admin Account"
      >
        <div className="space-y-6 py-4">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <Trash2 size={32} />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-bold text-slate-900">Are you sure?</h3>
            <p className="text-slate-500 mt-2">
              This will permanently delete the admin's authentication account and their profile. This cannot be undone.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
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
