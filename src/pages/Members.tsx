import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical, 
  Shield, 
  UserCheck, 
  UserMinus,
  Phone,
  Briefcase,
  Tags,
  Calendar,
  CreditCard,
  Trash2,
  Building2,
  Plus,
  Lock,
  UserPlus,
  ChevronRight,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { normalizePhoneNumber } from '../utils/phoneUtils';
import { useAuth } from '../hooks/useAuth';
import { useSearchParams } from 'react-router-dom';
import { databaseService } from '../services/databaseService';
import { UserProfile, Category, GuestInvitation } from '../types';
import { Modal } from '../components/Modal';
import { MemberTable } from '../components/members/MemberTable';
import { AddMemberModal } from '../components/members/AddMemberModal';
import { EditMemberModal } from '../components/members/EditMemberModal';
import { SubscriptionModal } from '../components/members/SubscriptionModal';
import { MemberSuccessPopup } from '../components/members/MemberSuccessPopup';
import { PositionManagement } from '../components/positions/PositionManagement';
import {  where, doc, setDoc, addDoc, collection, query, getDocs, orderBy  } from '../lib/database';
import { db } from '../lib/database';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { notificationService } from '../services/notificationService';
import { safeFetch } from '../utils/apiUtils';
import { supabase } from '../lib/supabaseClient';
import bcrypt from 'bcryptjs';

const formatDateForStorage = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

export function Members() {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as 'directory' | 'positions' | 'invites';
  const [activeTab, setActiveTab] = useState<'directory' | 'positions' | 'invites'>(tabParam || 'directory');
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [memberInvites, setMemberInvites] = useState<GuestInvitation[]>([]);
  const [allAdmins, setAllAdmins] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [chapters, setChapters] = useState<{id: string, chapter_name: string}[]>([]);
  const [filters, setFilters] = useState({
    chapter_id: '',
    category: '',
    state: '',
    city: '',
    area: ''
  });

  useEffect(() => {
    if (!profile) return;

    // CHAPTER ADMIN MEMBER SECTION: Show ONLY members created by that Chapter Admin
    const isChapterAdminUser = profile.role === 'CHAPTER_ADMIN' || (profile.role === 'MEMBER' && profile.position === 'chapter_admin');
    const constraints = profile.role !== 'MASTER_ADMIN'
      ? [where('chapter_id', '==', profile?.chapter_id)]
      : [];

    const unsubscribe = databaseService.subscribe<UserProfile>('users', constraints, (data) => {
      let filteredData = data;
      if (profile.role !== 'MASTER_ADMIN') {
        const currentUserDbRecord = data.find(u => u.uid === profile.uid || (u as any).id === profile.uid);
        const myChapId = String(currentUserDbRecord?.chapter_id || profile.chapter_id || '').trim();
        
        if (!myChapId) {
          filteredData = [];
        } else {
          filteredData = filteredData.filter(u => {
            const memId = String(u.chapter_id || (u as any).chapterId || '').trim();
            if (!memId) return false;
            return memId === myChapId;
          });
        }
      }
      filteredData = filteredData.filter(u => u.role !== 'MASTER_ADMIN');
      setMembers(filteredData);
      setLoading(false);
    });

    if (profile.role === 'MASTER_ADMIN' || isChapterAdminUser) {
      databaseService.list<Category>('categories').then(setCategories);
      supabase.from('chapters').select('id, chapter_name').then(({data}) => {
        if (data) setChapters(data);
      });
      
      // Fetch all admins for the adminMap
      const adminsQuery = query(collection(db, 'users'), where('role', '==', 'MASTER_ADMIN'));
      const chapterAdminsQuery = query(collection(db, 'users'), where('position', '==', 'chapter_admin'));
      Promise.all([getDocs(adminsQuery), getDocs(chapterAdminsQuery)]).then(([snap1, snap2]: [any, any]) => {
        const list1 = (snap1?.docs || []).map((doc: any) => ({ uid: doc.id, ...doc.data() } as UserProfile));
        const list2 = (snap2?.docs || []).map((doc: any) => ({ uid: doc.id, ...doc.data() } as UserProfile));
        const combined = [...list1];
        list2.forEach(item => {
          if (!combined.some(u => u.uid === item.uid)) {
            combined.push(item);
          }
        });
        setAllAdmins(combined);
      });

      // Fetch member invites for Chapter Admin
      if (isChapterAdminUser) {
        const invitesConstraints = [
          where('chapter_id', '==', profile?.chapter_id),
          where('createdByRole', '==', 'MEMBER'),
          orderBy('createdAt', 'desc')
        ];
        databaseService.subscribe<GuestInvitation>('guest_invitations', invitesConstraints, (data) => {
          setMemberInvites(data);
        });
      }
    }

    return () => unsubscribe();
  }, [profile]);

  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [createdMemberData, setCreatedMemberData] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteConfirmMember, setDeleteConfirmMember] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
  const [resetPasswordMember, setResetPasswordMember] = useState<UserProfile | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [subDates, setSubDates] = useState({
    subscriptionStart: '',
    subscriptionEnd: ''
  });

  const [newMemberData, setNewMemberData] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    password: '',
    subscriptionStart: new Date().toISOString().split('T')[0],
    subscriptionEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
  });

  const [editMemberData, setEditMemberData] = useState({
    name: '',
    phone: '',
    businessName: '',
    category: '',
    state: '',
    city: '',
    area: '',
    address: ''
  });

  const isMasterAdmin = profile?.role === 'MASTER_ADMIN';
  const isChapterAdmin = profile?.role === 'CHAPTER_ADMIN' || (profile?.role === 'MEMBER' && profile?.position === 'chapter_admin');

  const handleOpenAddModal = () => {
    setError(null);
    setNewMemberData({
      name: '',
      phone: '',
      businessName: '',
      category: '',
      password: '',
      state: '',
      city: '',
      area: '',
      address: '',
      subscriptionStart: new Date().toISOString().split('T')[0],
      subscriptionEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
    });
    setIsAddModalOpen(true);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const newErrors: Record<string, string> = {};
    if (!newMemberData.name.trim()) newErrors.name = 'Full Name is required.';
    if (!newMemberData.whatsapp.trim()) newErrors.whatsapp = 'WhatsApp Number is required.';
    if (!newMemberData.phone.trim()) newErrors.phone = 'Mobile Number is required.';
    if (!newMemberData.password.trim()) newErrors.password = 'Default Password is required.';
    if (!newMemberData.subscriptionStart) newErrors.subscriptionStart = 'Subscription Start Date is required.';
    if (!newMemberData.subscriptionEnd) newErrors.subscriptionEnd = 'Subscription End Date is required.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      
      // Scroll to the first field with an error
      setTimeout(() => {
        const firstErrorField = document.querySelector(`[name="${Object.keys(newErrors)[0]}"]`);
        if (firstErrorField) {
          firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    } else {
      setErrors({});
    }
    
    if (newMemberData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (!newMemberData.subscriptionStart || !newMemberData.subscriptionEnd) {
      setError('Subscription start and end dates are required');
      return;
    }

    if (new Date(newMemberData.subscriptionEnd) <= new Date(newMemberData.subscriptionStart)) {
      setError('Subscription end date must be after start date');
      return;
    }

    setIsSubmitting(true);
    try {
      const adminId = profile?.uid || profile?.id;
      if (!adminId) {
        throw new Error('You must be logged in to create members.');
      }

      // Fetch the logged-in Chapter Admin's profile from the database to guarantee it is secure and authentic
      const { data: adminProfile, error: profileErr } = await supabase
        .from('users')
        .select('chapter_id, chapter_name, role, name, position')
        .eq('id', adminId)
        .single();

      if (profileErr || !adminProfile) {
        throw new Error('Failed to verify Chapter Admin profile.');
      }

      // Enforce security role check
      const isAdminOrChapterAdmin = adminProfile.role === 'CHAPTER_ADMIN' || (adminProfile.role === 'MEMBER' && adminProfile.position === 'chapter_admin');
      if (!isAdminOrChapterAdmin) {
        throw new Error('Unauthorized. Only Chapter Admins are allowed to create regular members.');
      }

      const finalChapterId = adminProfile.chapter_id;
      const finalChapterName = adminProfile.chapter_name;

      if (!finalChapterId) {
        throw new Error('Your Chapter Admin profile does not have an assigned Chapter ID. Please contact support.');
      }

      const normalizedPhone = normalizePhoneNumber(newMemberData.phone);
      
      // 1. DUPLICATE PHONE CHECK
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('phone', normalizedPhone)
        .limit(1);

      if (checkError) {
        throw checkError;
      }
      if (existingUser && existingUser.length > 0) {
        setError("This phone number is already registered. Please use a different phone number.");
        setIsSubmitting(false);
        return;
      }

      // Fetch the actual current Chapter Admin for this chapter to ensure association is correct
      let actualChapterAdminId = adminId;
      let actualChapterAdminName = adminProfile.name || 'Chapter Admin';
      const { data: chapterAdminUser } = await supabase
        .from('users')
        .select('id, name')
        .eq('chapter_id', finalChapterId)
        .eq('role', 'CHAPTER_ADMIN')
        .limit(1)
        .single();
      
      if (chapterAdminUser) {
        actualChapterAdminId = chapterAdminUser.id;
        actualChapterAdminName = chapterAdminUser.name || 'Chapter Admin';
      }

      // 3. MEMBER DATA STRUCTURE
      const memberProfile = {
        name: newMemberData.name,
        role: "MEMBER",
        position: "member",
        phone: normalizedPhone,
        status: "INACTIVE",
        membershipStatus: "INACTIVE",
        account_status: "INACTIVE",
        accountStatus: "INACTIVE",
        password: bcrypt.hashSync(newMemberData.password, 10),
        password_changed: false,
        passwordChanged: false,
        must_change_password: true,
        mustChangePassword: true,
        chapter_id: finalChapterId,
        chapter_name: finalChapterName,
        chapterName: finalChapterName,
        createdByName: actualChapterAdminName,
        createdByRole: "CHAPTER_ADMIN",
        whatsappNumber: normalizePhoneNumber(newMemberData.whatsapp),
        admin_id: actualChapterAdminId,
        adminId: actualChapterAdminId,
        created_by: actualChapterAdminId,
        createdAt: new Date().toISOString(),
        subscriptionStart: formatDateForStorage(newMemberData.subscriptionStart),
        subscriptionStartDate: formatDateForStorage(newMemberData.subscriptionStart),
        subscriptionEnd: formatDateForStorage(newMemberData.subscriptionEnd),
        subscriptionStatus: new Date(newMemberData.subscriptionEnd) > new Date() ? "Active" : "Expired",
        subscriptionType: "Annual",
        renewalRequested: false
      };

      // 4. SAVE TO Supabase
      const res = await addDoc(collection(db, "users"), memberProfile);
      const newUserId = res.id;
      
      // Create notifications
      await notificationService.createNotification(
        newUserId,
        'MEMBER',
        'MEMBER_ADD',
        `Welcome to the network, ${newMemberData.name}! Your account has been created.`
      );
      
      await notificationService.notifyMasterAdmins('MEMBER_ADD', `New member ${newMemberData.name} has been added to the network.`);
      
      setCreatedMemberData({
        name: newMemberData.name,
        userId: newUserId,
        phone: normalizedPhone,
        password: newMemberData.password
      });
      setIsAddModalOpen(false);
      window.dispatchEvent(new Event('dashboard-refresh'));
      setNewMemberData({
        name: '',
        phone: '',
        whatsapp: '',
        password: '',
        subscriptionStart: new Date().toISOString().split('T')[0],
        subscriptionEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
      });
    } catch (err: any) {
      console.error("Create Member Error:", err);
      setError(err.message || "Failed to create member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    setIsSubmitting(true);
    try {
      const normalizedPhone = normalizePhoneNumber(editMemberData.phone);

      // Update Auth via Admin SDK
      const updatePayload: any = {
        uid: selectedMember.newUserId,
        displayName: editMemberData.name,
        adminUid: profile?.uid
      };
      
      if (editMemberData.password) {
        updatePayload.password = editMemberData.password;
      }

      /* No need to call update-user API, we update DB directly */

      const updates: Partial<UserProfile> = {
        name: editMemberData.name,
        phone: normalizedPhone,
        businessName: editMemberData.businessName,
        category: editMemberData.category,
        state: editMemberData.state,
        city: editMemberData.city,
        area: editMemberData.area,
        address: editMemberData.address
      };

      await databaseService.update('users', selectedMember.newUserId, updates);
      setIsEditModalOpen(false);
      setSelectedMember(null);
      window.dispatchEvent(new Event('dashboard-refresh'));
      setSuccessMessage('Member updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error updating member:', err);
      alert(`Failed to update member: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (member: UserProfile) => {
    setSelectedMember(member);
    setEditMemberData({
      name: member.name || member.displayName || '',
      phone: member.phone || '',
      businessName: member.businessName || '',
      category: member.category || '',
      state: member.state || '',
      city: member.city || '',
      area: member.area || '',
      address: member.address || '',
      password: ''
    });
    setIsEditModalOpen(true);
  };

  const openSubModal = (member: UserProfile) => {
    setSelectedMember(member);
    setSubDates({
      subscriptionStart: member.subscriptionStart?.split('T')[0] || new Date().toISOString().split('T')[0],
      subscriptionEnd: member.subscriptionEnd?.split('T')[0] || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
    });
    setIsSubModalOpen(true);
  };

  const handleSubUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    setError(null);
    try {
      await databaseService.update('users', selectedMember.newUserId, {
        subscriptionStart: formatDateForStorage(subDates.subscriptionStart),
        subscriptionStartDate: formatDateForStorage(subDates.subscriptionStart),
        subscriptionEnd: formatDateForStorage(subDates.subscriptionEnd),
      });
      setIsSubModalOpen(false);
      setSuccessMessage('Subscription updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error("Error updating subscription:", err);
      setError("Failed to update subscription. Please try again.");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordMember) return;
    if (resetPasswordVal.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }

    setIsResettingPassword(true);
    try {
      const hashedPassword = bcrypt.hashSync(resetPasswordVal, 10);
      
      await databaseService.update('users', (resetPasswordMember as any).uid || resetPasswordMember.id, {
        password: hashedPassword,
        mustChangePassword: true,
        must_change_password: true,
        passwordChanged: false,
        password_changed: false
      });

      setResetPasswordMember(null);
      setResetPasswordVal('');
      setSuccessMessage('Password reset successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error resetting password:', err);
      alert(`Failed to reset password: ${err.message}`);
    } finally {
      setIsResettingPassword(false);
    }
  };

  const updateStatus = async (uid: string, membershipStatus: UserProfile['membershipStatus']) => {
    try {
      await databaseService.update('users', uid, { membershipStatus });
      setSuccessMessage(`Status updated to ${membershipStatus} successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error("Error updating status:", err);
      setError("Failed to update status.");
      setTimeout(() => setError(null), 3000);
    }
  };

  const deleteMember = async (member: UserProfile) => {
    const memberUid = member.uid || (member as any).id;
    const adminUid = profile?.uid;

    const isUserChapterAdmin = profile?.role === 'CHAPTER_ADMIN' || (profile?.role === 'MEMBER' && profile?.position === 'chapter_admin');
    if (!profile || (profile.role !== 'MASTER_ADMIN' && !isUserChapterAdmin)) {
      return;
    }

    if (!memberUid || !adminUid) {
      alert("Error: Missing user identification. Please refresh and try again.");
      return;
    }

    setDeleting(true);
    try {
      /* Deleted via DB directly below */

      setDeleteConfirmMember(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const filteredMembers = members.filter(m => {
    // Hide self from the list
    if (m.uid === profile?.uid) return false;

    // Show ONLY users with role 'MEMBER'
    if (m.role !== 'MEMBER' && m.role !== 'CHAPTER_ADMIN') return false;

    // Chapter Admin can ONLY see members they created
    const isUserChapterAdmin = profile?.role === 'CHAPTER_ADMIN' || (profile?.role === 'MEMBER' && profile?.position === 'chapter_admin');
    if (isUserChapterAdmin) {
      const myChapId = String(profile?.chapter_id || '').trim();
      const memId = String(m.chapter_id || (m as any).chapterId || '').trim();
      if (!myChapId || !memId || memId !== myChapId) return false;
    }

    const matchesSearch = 
      (m.name || m.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.category?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesChapter = !filters.chapter_id || String(m.chapter_id || (m as any).chapterId || '').trim() === filters.chapter_id;
    const matchesCategory = !filters.category || m.category === filters.category;
    const matchesState = !filters.state || m.state?.toLowerCase().includes(filters.state.toLowerCase());
    const matchesCity = !filters.city || m.city?.toLowerCase().includes(filters.city.toLowerCase());
    const matchesArea = !filters.area || m.area?.toLowerCase().includes(filters.area.toLowerCase());

    return matchesSearch && matchesChapter && matchesCategory && matchesState && matchesCity && matchesArea;
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      {successMessage && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-24 left-4 right-4 bg-emerald-500 text-white p-4 rounded-[16px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] z-50 flex items-center gap-3 font-bold"
        >
          <CheckCircle2 size={24} />
          {successMessage}
        </motion.div>
      )}

      {error && !isAddModalOpen && !isEditModalOpen && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-24 left-4 right-4 bg-red-500 text-white p-4 rounded-[16px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] z-50 flex items-center gap-3 font-bold"
        >
          <AlertCircle size={24} />
          {error}
        </motion.div>
      )}

      {/* Header */}
      <div className="pt-6 pb-12 px-4">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between max-w-7xl mx-auto gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-[16px] flex items-center justify-center shrink-0 shadow-sm shadow-primary/5">
              <Users size={24} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-neutral-900 tracking-tight uppercase">
                {isChapterAdmin ? 'Member Management' : 'Member Directory'}
              </h1>
              <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-[0.15em] mt-0.5">
                {isChapterAdmin ? 'Manage chapter roster, roles, and status' : 'Manage roster, roles, and status'}
              </p>
            </div>
          </div>
          
          {isChapterAdmin && (
            <button
              onClick={handleOpenAddModal}
              className="h-11 px-6 bg-primary text-white rounded-[12px] text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-[0_2px_10px_rgba(0,0,0,0.02)] shadow-primary/10 flex items-center gap-2 hover:bg-primary/90 hover:shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
            >
              <Plus size={16} />
              + Add Member
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 space-y-6">
        {isChapterAdmin && (
          <div className="flex gap-2 p-1 bg-[#151C2E] backdrop-blur-md rounded-[12px] w-fit mb-6 border border-white/5">
            <button 
              onClick={() => {
                setActiveTab('directory');
                setSearchParams({});
              }}
              className={cn(
                "px-6 py-2 text-xs font-bold rounded-lg transition-all",
                activeTab === 'directory' ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md shadow-red-500/10" : "text-neutral-400 hover:text-neutral-200"
              )}
            >
              Member Directory
            </button>
            <button 
              onClick={() => {
                setActiveTab('invites');
                setSearchParams({ tab: 'invites' });
              }}
              className={cn(
                "px-6 py-2 text-xs font-bold rounded-lg transition-all",
                activeTab === 'invites' ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md shadow-red-500/10" : "text-neutral-400 hover:text-neutral-200"
              )}
            >
              Member Invites
            </button>
            {isMasterAdmin && (
              <button 
                onClick={() => {
                  setActiveTab('positions');
                  setSearchParams({ tab: 'positions' });
                }}
                className={cn(
                  "px-6 py-2 text-xs font-bold rounded-lg transition-all",
                  activeTab === 'positions' ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md shadow-red-500/10" : "text-neutral-400 hover:text-neutral-200"
                )}
              >
                Positions
              </button>
            )}
          </div>
        )}

        {activeTab === 'directory' ? (
          <>
            {/* Search and Filters */}
            <div className="bg-card p-6 rounded-[16px] border border-white/5 shadow-card space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-4 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search members..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-11 pl-11 pr-4 rounded-[12px] bg-[#151C2E] border border-white/5 focus:border-primary outline-none transition-all text-sm font-medium focus:ring-4 focus:ring-primary/15 text-white placeholder:text-[#8A93A7]"
                  />
                </div>
                
                <div className="lg:col-span-8 flex flex-wrap items-center gap-3">
                  {isMasterAdmin && (
                  <select value={filters.chapter_id}
                    onChange={(e) => setFilters({ ...filters, chapter_id: e.target.value })}
                    className="h-11 px-4 bg-[#151C2E] border border-white/5 rounded-[12px] text-xs font-semibold text-neutral-200 uppercase tracking-wider focus:border-primary outline-none transition-all appearance-none cursor-pointer min-w-[150px] focus:ring-4 focus:ring-primary/15"
                  >
                    <option value="" className="bg-[#151C2E] text-white">All Chapters</option>
                    {chapters.map(chap => (
                      <option key={chap.id} value={chap.id} className="bg-[#151C2E] text-white">{chap.chapter_name}</option>
                    ))}
                  </select>
                )}
                <select value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                    className="h-11 px-4 bg-[#151C2E] border border-white/5 rounded-[12px] text-xs font-semibold text-neutral-200 uppercase tracking-wider focus:border-primary outline-none transition-all appearance-none cursor-pointer min-w-[150px] focus:ring-4 focus:ring-primary/15"
                  >
                    <option value="" className="bg-[#151C2E] text-white">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name} className="bg-[#151C2E] text-white">{cat.name}</option>
                    ))}
                  </select>
                  
                  <input
                    type="text"
                    placeholder="City"
                    value={filters.city}
                    onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                    className="h-11 px-4 bg-[#151C2E] border border-white/5 rounded-[12px] text-xs font-bold text-neutral-200 focus:border-primary outline-none transition-all min-w-[120px] focus:ring-4 focus:ring-primary/15 placeholder:text-[#8A93A7]"
                  />

                  <button
                    onClick={() => setFilters({ chapter_id: '', category: '', state: '', city: '', area: '' })}
                    className="h-11 px-4 text-[10px] font-bold text-neutral-400 hover:text-primary transition-colors uppercase tracking-widest"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            <MemberTable currentUserId={profile?.uid}
              members={filteredMembers}
              adminMap={allAdmins.reduce((acc, user) => {
                acc[user.uid] = user.name || user.displayName || 'Unknown Admin';
                return acc;
              }, {} as Record<string, string>)}
              loading={loading}
              isMasterAdmin={isMasterAdmin}
              isChapterAdmin={isChapterAdmin}
              onUpdateStatus={updateStatus}
              onOpenSubModal={openSubModal}
              onEditMember={openEditModal}
              onDeleteMember={setDeleteConfirmMember}
              onResetPassword={setResetPasswordMember}
            />
          </>
        ) : activeTab === 'invites' ? (
          <div className="space-y-4">
            <div className="bg-card p-6 rounded-[20px] card-shadow border border-white/5">
              <h3 className="text-lg font-bold text-white mb-4 uppercase tracking-tight">New Associate Member Invites</h3>
              <div className="space-y-4">
                {memberInvites.length > 0 ? (
                  memberInvites.map((invite) => {
                    const inviter = members.find(m => m.uid === invite.createdBy);
                    return (
                      <div key={invite.id} className="p-4 bg-[#151C2E] rounded-[16px] border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-primary/10 text-primary rounded-[12px] flex items-center justify-center">
                            <UserPlus size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white">{invite.guestName}</h4>
                            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">{invite.guestBusiness}</p>
                            <p className="text-[10px] text-primary font-bold uppercase tracking-widest mt-1">
                              Invited By: {inviter?.name || 'Member'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right hidden md:block">
                            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Date</p>
                            <p className="text-xs font-bold text-neutral-200">{format(new Date(invite.createdAt), 'dd MMM yyyy')}</p>
                          </div>
                          <Link 
                            to={`/guests?highlight=${invite.id}`}
                            className="px-4 py-2 bg-card border border-white/5 text-primary rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
                          >
                            View in Guests
                          </Link>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center">
                    <UserPlus size={40} className="mx-auto text-neutral-200 mb-4" />
                    <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest">No member invites yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <PositionManagement isMasterAdmin={isMasterAdmin} />
        )}
      </div>

      <MemberSuccessPopup 
        isOpen={!!createdMemberData} 
        onClose={() => setCreatedMemberData(null)} 
        memberData={createdMemberData} 
      />
      <AddMemberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddMember}
        isSubmitting={isSubmitting}
        formData={newMemberData}
        setFormData={setNewMemberData}
        isMasterAdmin={isMasterAdmin}
        categories={categories}
        profile={profile}
        error={error}
        errors={errors}
      />

      <EditMemberModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleEditMember}
        isSubmitting={isSubmitting}
        member={selectedMember}
        formData={editMemberData}
        setFormData={setEditMemberData}
        isMasterAdmin={isMasterAdmin}
        categories={categories}
      />

      <SubscriptionModal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
        onSubmit={handleSubUpdate}
        selectedMember={selectedMember}
        subDates={subDates}
        setSubDates={setSubDates}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmMember}
        onClose={() => setDeleteConfirmMember(null)}
        title="Delete Member"
      >
        <div className="space-y-6 py-4">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <Trash2 size={32} />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-bold text-neutral-900">Are you sure?</h3>
            <p className="text-neutral-500 mt-2">
              Are you sure you want to PERMANENTLY delete <span className="font-bold text-neutral-900">{deleteConfirmMember?.name || deleteConfirmMember?.displayName}</span>? 
              This will also delete their login account and all associated data. This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteConfirmMember(null)}
              className="flex-1 py-3 bg-neutral-100 text-neutral-600 rounded-[12px] font-bold hover:bg-neutral-200 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteConfirmMember && deleteMember(deleteConfirmMember)}
              disabled={deleting}
              className="flex-1 py-3 bg-red-600 text-white rounded-[12px] font-bold hover:bg-red-700 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)] shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {deleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={!!resetPasswordMember}
        onClose={() => {
          setResetPasswordMember(null);
          setResetPasswordVal('');
        }}
        title="Reset Password"
      >
        <form onSubmit={handleResetPassword} className="space-y-5 py-2">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-neutral-300">
              Reset login password for <span className="font-bold text-white">{resetPasswordMember?.name || resetPasswordMember?.displayName}</span>.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input
                required
                type="password"
                placeholder="Enter new password (min 6 chars)"
                value={resetPasswordVal}
                onChange={(e) => setResetPasswordVal(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-[12px] bg-[#151C2E] border border-white/5 focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none transition-all text-sm font-semibold text-white placeholder:text-[#8A93A7]"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setResetPasswordMember(null);
                setResetPasswordVal('');
              }}
              className="flex-1 py-3 bg-neutral-800 text-neutral-200 rounded-[12px] font-bold hover:bg-neutral-700 transition-all text-xs uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isResettingPassword}
              className="flex-1 py-3 bg-primary text-white rounded-[12px] font-bold hover:bg-primary/90 transition-all text-xs uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
            >
              {isResettingPassword ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
