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
  ChevronRight
} from 'lucide-react';
import { normalizePhoneNumber } from '../utils/phoneUtils';
import { useAuth } from '../hooks/useAuth';
import { useSearchParams } from 'react-router-dom';
import { firestoreService } from '../services/firestoreService';
import { UserProfile, Category, GuestInvitation } from '../types';
import { Modal } from '../components/Modal';
import { MemberTable } from '../components/members/MemberTable';
import { AddMemberModal } from '../components/members/AddMemberModal';
import { EditMemberModal } from '../components/members/EditMemberModal';
import { SubscriptionModal } from '../components/members/SubscriptionModal';
import { PositionManagement } from '../components/positions/PositionManagement';
import { where, doc, setDoc, collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { notificationService } from '../services/notificationService';
import { safeFetch } from '../utils/apiUtils';

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
  const [filters, setFilters] = useState({
    category: '',
    state: '',
    city: '',
    area: ''
  });

  useEffect(() => {
    if (!profile) return;

    // CHAPTER ADMIN MEMBER SECTION: Show ONLY members created by that Chapter Admin
    const constraints = profile.role === 'CHAPTER_ADMIN' 
      ? [where('associatedChapterAdminId', '==', profile.uid)]
      : [];

    const unsubscribe = firestoreService.subscribe<UserProfile>('users', constraints, (data) => {
      // Filter for MEMBER role if needed, or show all if admin
      const filteredData = profile.role === 'CHAPTER_ADMIN' 
        ? data.filter(u => u.role === 'MEMBER')
        : data;
      setMembers(filteredData);
      setLoading(false);
    });

    if (profile.role === 'MASTER_ADMIN' || profile.role === 'CHAPTER_ADMIN') {
      firestoreService.list<Category>('categories').then(setCategories);
      
      // Fetch all admins for the adminMap
      const adminsQuery = query(collection(db, 'users'), where('role', 'in', ['MASTER_ADMIN', 'CHAPTER_ADMIN']));
      getDocs(adminsQuery).then(snap => {
        setAllAdmins(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
      });

      // Fetch member invites for Chapter Admin
      if (profile.role === 'CHAPTER_ADMIN') {
        const invitesConstraints = [
          where('associatedChapterAdminId', '==', profile.uid),
          where('createdByRole', '==', 'MEMBER'),
          orderBy('createdAt', 'desc')
        ];
        firestoreService.subscribe<GuestInvitation>('guest_invitations', invitesConstraints, (data) => {
          setMemberInvites(data);
        });
      }
    }

    return () => unsubscribe();
  }, [profile]);

  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteConfirmMember, setDeleteConfirmMember] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
  const [subDates, setSubDates] = useState({
    subscriptionStart: '',
    subscriptionEnd: ''
  });

  const [newMemberData, setNewMemberData] = useState({
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
  const isChapterAdmin = profile?.role === 'CHAPTER_ADMIN';

  const handleOpenAddModal = () => {
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
    
    if (newMemberData.password.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    if (!newMemberData.subscriptionStart || !newMemberData.subscriptionEnd) {
      alert('Subscription start and end dates are required');
      return;
    }

    if (new Date(newMemberData.subscriptionEnd) <= new Date(newMemberData.subscriptionStart)) {
      alert('Subscription end date must be after start date');
      return;
    }

    setIsSubmitting(true);
    try {
      const normalizedPhone = normalizePhoneNumber(newMemberData.phone);
      
      // 1. DUPLICATE PHONE CHECK
      const q = query(collection(db, "users"), where("phone", "==", normalizedPhone));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        alert("Phone number already exists");
        setIsSubmitting(false);
        return;
      }

      // 2. CREATE AUTH ACCOUNT
      const data = await safeFetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: newMemberData.password,
          displayName: newMemberData.name,
          role: 'MEMBER',
          adminUid: profile?.uid,
          phone: normalizedPhone
        })
      });

      const { uid } = data;
      
      // 3. MEMBER DATA STRUCTURE
      const memberProfile = {
        uid: uid,
        name: newMemberData.name,
        role: "MEMBER",
        phone: normalizedPhone,
        membershipStatus: "ACTIVE",
        associatedChapterAdminId: profile?.uid,
        createdByName: profile?.name || profile?.displayName || 'Unknown Admin',
        createdByRole: profile?.role || "CHAPTER_ADMIN",
        businessName: newMemberData.businessName,
        category: newMemberData.category,
        state: newMemberData.state,
        city: newMemberData.city,
        area: newMemberData.area,
        address: newMemberData.address,
        adminId: profile?.uid,
        createdAt: new Date().toISOString(),
        subscriptionStart: new Date(newMemberData.subscriptionStart).toISOString(),
        subscriptionEnd: new Date(newMemberData.subscriptionEnd).toISOString()
      };

      // 4. SAVE TO FIRESTORE
      await setDoc(doc(db, "users", uid), memberProfile);
      
      // Create notifications
      await notificationService.createNotification(
        uid,
        'MEMBER',
        'MEMBER_ADD',
        `Welcome to the network, ${newMemberData.name}! Your account has been created.`
      );
      
      await notificationService.notifyMasterAdmins('MEMBER_ADD', `New member ${newMemberData.name} has been added to the network.`);
      
      alert('Member created successfully');
      setIsAddModalOpen(false);
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
    } catch (err: any) {
      console.error("Create Member Error:", err);
      alert(err.message || "Failed to create member");
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
        uid: selectedMember.uid,
        displayName: editMemberData.name,
        adminUid: profile?.uid
      };
      
      if (editMemberData.password) {
        updatePayload.password = editMemberData.password;
      }

      await safeFetch('/api/admin/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });

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

      await firestoreService.update('users', selectedMember.uid, updates);
      setIsEditModalOpen(false);
      setSelectedMember(null);
      alert('Member updated successfully!');
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

    await firestoreService.update('users', selectedMember.uid, {
      subscriptionStart: new Date(subDates.subscriptionStart).toISOString(),
      subscriptionEnd: new Date(subDates.subscriptionEnd).toISOString(),
    });
    setIsSubModalOpen(false);
  };

  const updateStatus = async (uid: string, membershipStatus: UserProfile['membershipStatus']) => {
    await firestoreService.update('users', uid, { membershipStatus });
  };

  const deleteMember = async (member: UserProfile) => {
    const memberUid = member.uid || (member as any).id;
    const adminUid = profile?.uid;

    if (!profile || (profile.role !== 'MASTER_ADMIN' && profile.role !== 'CHAPTER_ADMIN')) {
      return;
    }

    if (!memberUid || !adminUid) {
      alert("Error: Missing user identification. Please refresh and try again.");
      return;
    }

    setDeleting(true);
    try {
      await safeFetch('/api/auth/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: memberUid,
          adminUid: adminUid
        })
      });

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
    if (m.role !== 'MEMBER') return false;

    // Chapter Admin can ONLY see members they created
    if (profile?.role === 'CHAPTER_ADMIN' && m.associatedChapterAdminId !== profile.uid) return false;

    const matchesSearch = 
      (m.name || m.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.category?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = !filters.category || m.category === filters.category;
    const matchesState = !filters.state || m.state?.toLowerCase().includes(filters.state.toLowerCase());
    const matchesCity = !filters.city || m.city?.toLowerCase().includes(filters.city.toLowerCase());
    const matchesArea = !filters.area || m.area?.toLowerCase().includes(filters.area.toLowerCase());

    return matchesSearch && matchesCategory && matchesState && matchesCity && matchesArea;
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Red Header */}
      <div className="bg-primary pt-12 pb-24 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between max-w-7xl mx-auto gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white">
              <Users size={28} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white uppercase tracking-widest">
                Member Directory
              </h1>
              <p className="text-xs text-white/70 font-medium tracking-wide">Manage memberships and roles</p>
            </div>
          </div>
          
          {isChapterAdmin && (
            <button
              onClick={handleOpenAddModal}
              className="h-11 px-6 bg-white text-primary rounded-xl text-xs font-bold uppercase tracking-widest transition-all active:scale-95 shadow-lg flex items-center gap-2"
            >
              <UserPlus size={18} />
              Add Member
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-12 relative z-20 space-y-6">
        {isChapterAdmin && (
          <div className="flex gap-2 p-1 bg-white/10 backdrop-blur-md rounded-xl w-fit mx-auto mb-6">
            <button 
              onClick={() => {
                setActiveTab('directory');
                setSearchParams({});
              }}
              className={cn(
                "px-6 py-2 text-xs font-bold rounded-lg transition-all",
                activeTab === 'directory' ? "bg-white text-primary shadow-lg" : "text-white/70 hover:bg-white/10"
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
                activeTab === 'invites' ? "bg-white text-primary shadow-lg" : "text-white/70 hover:bg-white/10"
              )}
            >
              Member Invites
            </button>
            <button 
              onClick={() => {
                setActiveTab('positions');
                setSearchParams({ tab: 'positions' });
              }}
              className={cn(
                "px-6 py-2 text-xs font-bold rounded-lg transition-all",
                activeTab === 'positions' ? "bg-white text-primary shadow-lg" : "text-white/70 hover:bg-white/10"
              )}
            >
              Positions
            </button>
          </div>
        )}

        {activeTab === 'directory' ? (
          <>
            {/* Search and Filters */}
            <div className="bg-white p-6 rounded-[20px] card-shadow border border-border space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-4 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                  <input
                    type="text"
                    placeholder="Search members..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-11 pl-11 pr-4 rounded-xl bg-muted border border-transparent focus:bg-white focus:border-primary outline-none transition-all text-sm font-bold"
                  />
                </div>
                
                <div className="lg:col-span-8 flex flex-wrap items-center gap-3">
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                    className="h-11 px-4 bg-muted border border-transparent rounded-xl text-xs font-bold text-text-primary uppercase tracking-wider focus:bg-white focus:border-primary outline-none transition-all appearance-none cursor-pointer min-w-[150px]"
                  >
                    <option value="">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                  
                  <input
                    type="text"
                    placeholder="City"
                    value={filters.city}
                    onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                    className="h-11 px-4 bg-muted border border-transparent rounded-xl text-xs font-bold text-text-primary focus:bg-white focus:border-primary outline-none transition-all min-w-[120px]"
                  />

                  <button
                    onClick={() => setFilters({ category: '', state: '', city: '', area: '' })}
                    className="h-11 px-4 text-[10px] font-bold text-text-secondary hover:text-primary transition-colors uppercase tracking-widest"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            <MemberTable
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
            />
          </>
        ) : activeTab === 'invites' ? (
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-[20px] card-shadow border border-border">
              <h3 className="text-lg font-bold text-slate-900 mb-4 uppercase tracking-tight">New Associate Member Invites</h3>
              <div className="space-y-4">
                {memberInvites.length > 0 ? (
                  memberInvites.map((invite) => {
                    const inviter = members.find(m => m.uid === invite.createdBy);
                    return (
                      <div key={invite.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                            <UserPlus size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{invite.guestName}</h4>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{invite.guestBusiness}</p>
                            <p className="text-[10px] text-primary font-black uppercase tracking-widest mt-1">
                              Invited By: {inviter?.name || 'Member'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right hidden md:block">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Date</p>
                            <p className="text-xs font-bold text-slate-700">{format(new Date(invite.createdAt), 'dd MMM yyyy')}</p>
                          </div>
                          <Link 
                            to={`/guests?highlight=${invite.id}`}
                            className="px-4 py-2 bg-white border border-border text-primary rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-primary/5 transition-all"
                          >
                            View in Guests
                          </Link>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center">
                    <UserPlus size={40} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No member invites yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <PositionManagement />
        )}
      </div>

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
            <h3 className="text-xl font-bold text-slate-900">Are you sure?</h3>
            <p className="text-slate-500 mt-2">
              Are you sure you want to PERMANENTLY delete <span className="font-bold text-slate-900">{deleteConfirmMember?.name || deleteConfirmMember?.displayName}</span>? 
              This will also delete their login account and all associated data. This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteConfirmMember(null)}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteConfirmMember && deleteMember(deleteConfirmMember)}
              disabled={deleting}
              className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

    </div>
  );
}
