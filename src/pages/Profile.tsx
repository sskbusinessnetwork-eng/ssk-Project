import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { motion } from 'motion/react';
import { 
  User, 
  Briefcase, 
  Phone, 
  Globe, 
  FileText, 
  Save, 
  Shield,
  CheckCircle2,
  Camera,
  Upload,
  Trash2,
  X,
  MapPin,
  Building2,
  ArrowLeft,
  Share2,
  Send,
  Mail,
  Calendar
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { databaseService } from '../services/databaseService';
import { notificationService } from '../services/notificationService';
import { Category, UserProfile, Referral, UserRole } from '../types';
import { normalizePhoneNumber } from '../utils/phoneUtils';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Modal } from '../components/Modal';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { MemberTestimonials } from '../components/MemberTestimonials';

export function Profile() {
  const { profile: currentUserProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const targetUserId = searchParams.get('id');
  const isViewMode = !!targetUserId && targetUserId !== currentUserProfile?.uid;

  const [targetProfile, setTargetProfile] = useState<UserProfile | null>(null);
  const [adminData, setAdminData] = useState<UserProfile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isReferring, setIsReferring] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUpdatingSubscription, setIsUpdatingSubscription] = useState(false);
  const [newSubscriptionEnd, setNewSubscriptionEnd] = useState<string>('');
  const [resolvedChapterName, setResolvedChapterName] = useState<string>('');
  
  // Referral Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [referralForm, setReferralForm] = useState({
    customerName: '',
    mobileNumber: '',
    notes: '',
    requirement: ''
  });

  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const isAdmin = currentUserProfile?.role === 'MASTER_ADMIN' || currentUserProfile?.role === 'CHAPTER_ADMIN' || (currentUserProfile?.role === 'MEMBER' && currentUserProfile?.position === 'chapter_admin');

  const getDisplayPosition = (pos?: string, role?: string) => {
    if (role === 'MASTER_ADMIN') return 'Master Admin';
    if (role === 'CHAPTER_ADMIN' || pos === 'chapter_admin') return 'Chapter Admin';
    if (pos === 'president') return 'President';
    if (pos === 'vice_president') return 'Vice President';
    if (pos === 'treasurer') return 'Treasurer';
    return 'Associate Member';
  };

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    businessName: '',
    chapterName: '',
    category: '',
    phone: '',
    email: '',
    pincode: '',
    professionDesignation: '',
    website: '',
    bio: '',
    state: '',
    city: '',
    area: '',
    address: '',
    photoURL: '',
    role: '' as UserRole,
    position: 'member'
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let chapterId = '';
        if (isViewMode && targetUserId) {
          const fetchedProfile = await databaseService.get<UserProfile>('users', targetUserId);
          if (fetchedProfile) {
            setTargetProfile(fetchedProfile);
            chapterId = fetchedProfile.chapter_id || fetchedProfile.adminId || '';
            const adminId = fetchedProfile.chapter_id || fetchedProfile.adminId;
            if (fetchedProfile.role === 'MEMBER' && adminId) {
              const admin = await databaseService.get<UserProfile>('users', adminId);
              if (admin) setAdminData(admin);
            }
          }
        } else if (currentUserProfile) {
          setFormData({
            name: currentUserProfile.name || currentUserProfile.displayName || '',
            businessName: currentUserProfile.businessName || '',
            chapterName: currentUserProfile.chapterName || '',
            category: currentUserProfile.category || '',
            phone: currentUserProfile.phone || '',
            email: currentUserProfile.email || '',
            pincode: currentUserProfile.pincode || '',
            professionDesignation: currentUserProfile.professionDesignation || currentUserProfile.profession_designation || '',
            website: currentUserProfile.website || '',
            bio: currentUserProfile.bio || '',
            state: currentUserProfile.state || '',
            city: currentUserProfile.city || '',
            area: currentUserProfile.area || '',
            address: currentUserProfile.address || '',
            photoURL: currentUserProfile.photoURL || '',
            role: currentUserProfile.role || 'MEMBER',
            position: currentUserProfile.position || 'member'
          });

          chapterId = currentUserProfile.chapter_id || currentUserProfile.adminId || '';
          const adminId = currentUserProfile.chapter_id || currentUserProfile.adminId;
          if (currentUserProfile.role === 'MEMBER' && adminId) {
            const admin = await databaseService.get<UserProfile>('users', adminId);
            if (admin) setAdminData(admin);
          }
        }

        if (chapterId) {
          try {
            const chap = await databaseService.get<any>('chapters', chapterId);
            if (chap && chap.chapter_name) {
              setResolvedChapterName(chap.chapter_name);
            }
          } catch (e) {
            console.error("Error loading chapter name:", e);
          }
        }

        if (!isViewMode) {
          const cats = await databaseService.list<Category>('categories');
          setCategories(cats);
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUserProfile, isViewMode, targetUserId, isAdmin]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('File size too large. Please select an image under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, photoURL: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setFormData(prev => ({ ...prev, photoURL: '' }));
  };

  const handleQuickRefer = () => {
    setIsModalOpen(true);
  };

  const handleUpdateSubscription = async () => {
    if (!targetProfile || !newSubscriptionEnd) return;
    
    try {
      setIsUpdatingSubscription(true);
      await databaseService.update('users', targetProfile.uid, {
        subscriptionEnd: new Date(newSubscriptionEnd).toISOString(),
        membershipStatus: new Date(newSubscriptionEnd) > new Date() ? 'ACTIVE' : 'EXPIRED'
      });
      
      // Notify the member
      await notificationService.createNotification(
        targetProfile.uid,
        'MEMBER',
        'UPGRADE',
        "Your subscription has been successfully upgraded by the Chapter Admin"
      );
      
      setTargetProfile(prev => prev ? {
        ...prev,
        subscriptionEnd: new Date(newSubscriptionEnd).toISOString(),
        membershipStatus: new Date(newSubscriptionEnd) > new Date() ? 'ACTIVE' : 'EXPIRED'
      } : null);
      
      alert("Subscription updated successfully.");
      setNewSubscriptionEnd('');
    } catch (error) {
      console.error("Error updating subscription:", error);
      alert("Failed to update subscription.");
    } finally {
      setIsUpdatingSubscription(false);
    }
  };

  const submitReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserProfile || !targetProfile) return;
    
    try {
      setIsReferring(true);
      
      const sender_id = currentUserProfile.uid;
      const receiver_id = targetProfile.uid;
      const chapter_id = currentUserProfile.chapter_id;

      if (!sender_id) throw new Error("Missing sender_id");
      if (!receiver_id) throw new Error("Missing receiver_id");
      if (!chapter_id) throw new Error("Missing chapter_id: Your account is not assigned to any chapter.");
      const contact_name = referralForm.customerName ? referralForm.customerName.trim() : null;
      const contact_phone = referralForm.mobileNumber ? referralForm.mobileNumber.trim() : null;
      const business_requirement = (referralForm.requirement || 'General Referral').trim();

      if (!contact_name) throw new Error("Missing contact_name (Customer Name)");
      if (!contact_phone) throw new Error("Missing contact_phone (Mobile Number)");

      console.log({
        sender_id,
        receiver_id,
        chapter_id,
        contact_name,
        contact_phone,
        business_requirement
      });

      const newReferral = {
        sender_id,
        receiver_id,
        chapter_id,
        contact_name,
        contact_phone,
        business_requirement,
        customer_name: contact_name,
        customer_mobile: contact_phone,
        requirement: business_requirement,
        notes: referralForm.notes || '',
        status: 'Pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('referrals')
        .insert([newReferral]);

      if (error) throw error;
      
      alert("Referral submitted successfully.");
      setSuccessMessage(`Referral sent to ${targetProfile.name} successfully!`);
      setIsModalOpen(false);
      setReferralForm({
        customerName: '',
        mobileNumber: '',
        notes: '',
        requirement: ''
      });
      setTimeout(() => setSuccessMessage(null), 3000);
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));
    } catch (error: any) {
      console.error("Referral Insert Error:", error);
      console.error(error?.message, error?.details, error?.hint, error?.code);
      let mainMsg = error?.message || (typeof error === 'string' ? error : "Database error occurred.");
      if (error?.code === '42501') {
        mainMsg = "Insert blocked by Row Level Security.";
      }
      alert(`${mainMsg}\n\nCode: ${error?.code || 'N/A'}\nDetails: ${error?.details || 'N/A'}\nHint: ${error?.hint || 'N/A'}`);
    } finally {
      setIsReferring(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserProfile) return;

    try {
      setIsSaving(true);
      setErrorMessage(null);
      const normalizedPhone = normalizePhoneNumber(formData.phone);
      const dataToUpdate = {
        ...formData,
        phone: normalizedPhone
      };
      
      if (currentUserProfile?.role === 'MASTER_ADMIN') {
        delete (dataToUpdate as any).category;
      }

      await databaseService.update('users', currentUserProfile.uid, dataToUpdate);
      setSuccessMessage("Profile updated successfully!");
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      if (error.message === "You can only edit your own profile.") {
        setErrorMessage("You can only edit your own profile.");
      } else {
        setErrorMessage("Failed to update profile. Please try again.");
      }
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const getPositionText = (member: UserProfile) => {
    const position = member.position;
    if (!position || position === 'member') return null;
    return (
      <span className="text-[10px] font-bold text-primary uppercase tracking-tight bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">
        {position.replace('_', ' ')}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isViewMode && targetProfile) {
    return (
      <div className="min-h-screen bg-[#05070D] pb-24">
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

        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-24 left-4 right-4 bg-red-500 text-white p-4 rounded-[16px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] z-50 flex items-center gap-3 font-bold"
          >
            <X size={24} />
            {errorMessage}
          </motion.div>
        )}
        
        {/* Header */}
        <div className="bg-primary pt-12 pb-24 px-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="relative z-10 flex items-center justify-between max-w-2xl mx-auto">
            <div className="w-10" />
            <div className="flex-1" />
            <button className="p-2 text-white hover:bg-white/10 rounded-full transition-colors">
              <Share2 size={24} />
            </button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 -mt-16 relative z-20 space-y-4">
          {/* Profile Card */}
          <div className="bg-[#111827] p-6 rounded-[20px] border border-white/5 text-center space-y-4">
            <div className="w-24 h-24 rounded-full bg-[#151C2E] mx-auto border-4 border-[#111827] shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
              <img 
                src={targetProfile.photoURL || `https://picsum.photos/seed/${targetProfile.uid}/200/200`} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 flex-wrap px-2">
                <h2 className="text-lg sm:text-xl font-bold text-white break-words">{targetProfile.name}</h2>
              </div>
              
              <div className="flex flex-col gap-0.5 items-center justify-center mt-2 text-[13px] font-medium text-neutral-400">
                <div>
                  <span className="text-neutral-500 font-semibold text-[11px] uppercase tracking-wider mr-1">Chapter:</span> 
                  {targetProfile.chapterName || resolvedChapterName || 'SSK Chapter'}
                </div>
                <div>
                  <span className="text-neutral-500 font-semibold text-[11px] uppercase tracking-wider mr-1">Position:</span> 
                  <span className="text-primary font-bold">
                    {getDisplayPosition(targetProfile.position, targetProfile.role)}
                  </span>
                </div>
              </div>

              <p className="text-[10px] sm:text-xs font-medium text-neutral-400 mt-2 break-words px-4">{targetProfile.businessName || 'SSK Business Network'}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <a 
                href={`tel:${targetProfile.phone}`}
                className="flex-1 h-11 bg-primary text-white rounded-[12px] flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest active:scale-95 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.02)] shadow-primary/20"
              >
                <Phone size={18} />
                Call
              </a>
              {currentUserProfile?.role === 'MEMBER' && (
                <button 
                  onClick={handleQuickRefer}
                  className="flex-1 h-11 bg-[#151C2E] border border-white/5 text-white rounded-[12px] flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest active:scale-95 transition-all hover:bg-[#1C2538]"
                >
                  <Send size={18} className="text-primary" />
                  Refer
                </button>
              )}
            </div>
          </div>

          {/* Info List */}
          <div className="bg-[#111827] rounded-[20px] border border-white/5 overflow-hidden divide-y divide-white/5">
            <div className="p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-[12px] bg-[#151C2E] flex items-center justify-center text-primary shrink-0">
                <Briefcase size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Category</p>
                <p className="text-sm font-bold text-white">{targetProfile.category || 'Not specified'}</p>
              </div>
            </div>

            <div className="p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-[12px] bg-[#151C2E] flex items-center justify-center text-primary shrink-0">
                <Building2 size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Business Name</p>
                <p className="text-sm font-bold text-white">{targetProfile.businessName || 'Not specified'}</p>
              </div>
            </div>

            {(targetProfile.professionDesignation || targetProfile.profession_designation) && (
              <div className="p-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-[12px] bg-[#151C2E] flex items-center justify-center text-primary shrink-0">
                  <User size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Profession / Designation</p>
                  <p className="text-sm font-bold text-white">{targetProfile.professionDesignation || targetProfile.profession_designation}</p>
                </div>
              </div>
            )}

            <div className="p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-[12px] bg-[#151C2E] flex items-center justify-center text-primary shrink-0">
                <Phone size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Phone Number</p>
                <p className="text-sm font-bold text-white">{targetProfile.phone || 'Not specified'}</p>
              </div>
            </div>

            {targetProfile.email && (
              <div className="p-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-[12px] bg-[#151C2E] flex items-center justify-center text-primary shrink-0">
                  <Mail size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Email Address</p>
                  <p className="text-sm font-bold text-white">{targetProfile.email}</p>
                </div>
              </div>
            )}

            <div className="p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-[12px] bg-[#151C2E] flex items-center justify-center text-primary shrink-0">
                <MapPin size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Address & Location</p>
                <p className="text-sm font-bold text-white leading-tight">
                  {targetProfile.address}<br />
                  <span className="text-neutral-400 font-medium">
                    {targetProfile.area ? `${targetProfile.area}, ` : ''}{targetProfile.city}, {targetProfile.state}
                    {targetProfile.pincode ? ` - ${targetProfile.pincode}` : ''}
                  </span>
                </p>
              </div>
            </div>

            <div className="p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-[12px] bg-[#151C2E] flex items-center justify-center text-primary shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Membership Status</p>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider inline-block mt-1 border",
                  targetProfile.membershipStatus === 'ACTIVE' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                )}>
                  {targetProfile.membershipStatus || 'PENDING'}
                </span>
              </div>
            </div>

            <div className="p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-[12px] bg-[#151C2E] flex items-center justify-center text-primary shrink-0">
                <Calendar size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Date of Joining</p>
                <p className="text-sm font-bold text-white">
                  {targetProfile.createdAt ? format(new Date(targetProfile.createdAt), 'dd MMMM yyyy') : 'Not available'}
                </p>
              </div>
            </div>

            <div className="p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-[12px] bg-[#151C2E] flex items-center justify-center text-primary shrink-0">
                <Globe size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Website</p>
                <p className="text-sm font-bold text-white truncate">
                  {targetProfile.website || 'Not specified'}
                </p>
              </div>
            </div>

            {targetProfile.bio && (
              <div className="p-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-[12px] bg-[#151C2E] flex items-center justify-center text-primary shrink-0">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">About</p>
                  <p className="text-sm font-medium text-white leading-relaxed">
                    {targetProfile.bio}
                  </p>
                </div>
              </div>
            )}
          </div>

          <MemberTestimonials currentUser={currentUserProfile} targetUser={targetProfile} />

          {/* Associated Chapter Admin Section */}
          {targetProfile.role === 'MEMBER' && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Chapter Admin</h3>
              <div className="bg-[#111827] rounded-[20px] border border-white/5 overflow-hidden">
                {!adminData ? (
                  <div className="p-6 text-center">
                    <p className="text-sm font-bold text-neutral-400">
                      {!targetProfile.chapter_id && !targetProfile.adminId ? "No Chapter Admin Assigned" : "Admin details not available"}
                    </p>
                  </div>
                ) : (
                  <div className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-[12px] bg-[#151C2E] flex items-center justify-center text-primary shrink-0">
                      <Shield size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Chapter Admin</p>
                      <p className="text-sm font-bold text-white">{adminData.name || adminData.displayName}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Subscription Management for Admins */}
          {isAdmin && targetProfile.role === 'MEMBER' && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Subscription Management</h3>
              <div className="bg-[#111827] rounded-[20px] border border-white/5 overflow-hidden p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Current Start Date</p>
                    <p className="text-sm font-bold text-white">
                      {targetProfile.subscriptionStart ? format(new Date(targetProfile.subscriptionStart), 'dd MMM yyyy') : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Current End Date</p>
                    <p className="text-sm font-bold text-white">
                      {targetProfile.subscriptionEnd ? format(new Date(targetProfile.subscriptionEnd), 'dd MMM yyyy') : 'Not set'}
                    </p>
                  </div>
                </div>
                <div className="space-y-1 pt-2 border-t border-white/5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Update End Date</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={newSubscriptionEnd}
                      onChange={(e) => setNewSubscriptionEnd(e.target.value)}
                      className="flex-1 h-11 px-4 bg-[#151C2E] border border-white/5 rounded-[12px] text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-sm"
                      style={{ colorScheme: 'dark' }}
                    />
                    <button
                      onClick={handleUpdateSubscription}
                      disabled={!newSubscriptionEnd || isUpdatingSubscription}
                      className="h-11 px-6 bg-primary text-white rounded-[12px] font-bold uppercase tracking-widest shadow-[0_2px_10px_rgba(0,0,0,0.02)] active:scale-95 transition-all disabled:opacity-50"
                    >
                      {isUpdatingSubscription ? 'Updating...' : 'Update'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Referral Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`Refer to ${targetProfile?.name}`}
        >
          <form onSubmit={submitReferral} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Customer Name</label>
              <input
                required
                type="text"
                value={referralForm.customerName}
                onChange={(e) => setReferralForm(prev => ({ ...prev, customerName: e.target.value }))}
                className="w-full h-11 px-4 bg-[#151C2E] border border-white/5 rounded-[12px] text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Mobile Number</label>
              <input
                required
                type="tel"
                value={referralForm.mobileNumber}
                onChange={(e) => setReferralForm(prev => ({ ...prev, mobileNumber: e.target.value }))}
                className="w-full h-11 px-4 bg-[#151C2E] border border-white/5 rounded-[12px] text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Requirement</label>
              <input
                type="text"
                value={referralForm.requirement}
                onChange={(e) => setReferralForm(prev => ({ ...prev, requirement: e.target.value }))}
                className="w-full h-11 px-4 bg-[#151C2E] border border-white/5 rounded-[12px] text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={isReferring}
              className="w-full h-12 bg-primary text-white rounded-[12px] font-bold uppercase tracking-widest shadow-2xl active:scale-95 transition-all disabled:opacity-50 mt-4 text-xs"
            >
              {isReferring ? 'Sending...' : 'Submit Referral'}
            </button>
          </form>
        </Modal>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070D] pb-24">
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

      {errorMessage && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-24 left-4 right-4 bg-red-500 text-white p-4 rounded-[16px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] z-50 flex items-center gap-3 font-bold"
        >
          <X size={24} />
          {errorMessage}
        </motion.div>
      )}
      
      {/* Header */}
      <div className="bg-primary pt-12 pb-24 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="relative z-10 flex items-center justify-between max-w-2xl mx-auto">
          <div className="w-10" />
          <div className="flex-1" />
          <button 
            onClick={handleSubmit}
            disabled={isSaving}
            className="p-2 text-white hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
          >
            <Save size={24} />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-16 relative z-20 space-y-4">
        {/* Profile Card */}
        <div className="bg-[#111827] p-6 rounded-[20px] border border-white/5 text-center space-y-4">
          <div className="relative w-24 h-24 mx-auto">
            <div className="w-full h-full rounded-full bg-[#151C2E] border-4 border-[#111827] shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
              {formData.photoURL ? (
                <img 
                  src={formData.photoURL} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-400">
                  <User size={40} />
                </div>
              )}
            </div>
            <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center cursor-pointer shadow-[0_2px_10px_rgba(0,0,0,0.02)] border-2 border-[#111827] active:scale-90 transition-all">
              <Camera size={16} />
              <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            </label>
          </div>
          <div>
            <div className="flex items-center justify-center gap-2 flex-wrap px-2">
              <h2 className="text-lg sm:text-xl font-bold text-white break-words">{formData.name || 'Your Name'}</h2>
            </div>
            
            <div className="flex flex-col gap-0.5 items-center justify-center mt-2 text-[13px] font-medium text-neutral-400">
              <div>
                <span className="text-neutral-500 font-semibold text-[11px] uppercase tracking-wider mr-1">Chapter:</span> 
                {formData.chapterName || resolvedChapterName || 'SSK Chapter'}
              </div>
              <div>
                <span className="text-neutral-500 font-semibold text-[11px] uppercase tracking-wider mr-1">Position:</span> 
                <span className="text-primary font-bold">
                  {getDisplayPosition(currentUserProfile?.position, currentUserProfile?.role)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-[#111827] p-6 rounded-[20px] border border-white/5 space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Full Name</label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-11 px-4 bg-[#151C2E] border border-white/5 rounded-[12px] text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Phone Number</label>
              <input
                readOnly
                type="tel"
                value={formData.phone}
                className="w-full h-11 px-4 bg-[#151C2E]/60 border border-white/5 rounded-[12px] text-neutral-400 outline-none font-bold text-sm cursor-not-allowed"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Email Address <span className="text-red-500">*</span></label>
              <input
                required
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full h-11 px-4 bg-[#151C2E] border border-white/5 rounded-[12px] text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-sm"
              />
            </div>

            {(formData.role === 'CHAPTER_ADMIN' || formData.position === 'chapter_admin') && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Chapter Name <span className="text-red-500">*</span></label>
                <input
                  required
                  type="text"
                  value={formData.chapterName}
                  onChange={(e) => setFormData({ ...formData, chapterName: e.target.value })}
                  className="w-full h-11 px-4 bg-[#151C2E] border border-white/5 rounded-[12px] text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-sm"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Business Name {(formData.role === 'CHAPTER_ADMIN' || formData.position === 'chapter_admin') ? '(Optional)' : '<span className="text-red-500">*</span>'}</label>
              <input
                required={formData.role !== 'CHAPTER_ADMIN' && formData.position !== 'chapter_admin'}
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full h-11 px-4 bg-[#151C2E] border border-white/5 rounded-[12px] text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Profession / Designation <span className="text-red-500">*</span></label>
              <input
                required
                type="text"
                value={formData.professionDesignation}
                onChange={(e) => setFormData({ ...formData, professionDesignation: e.target.value })}
                className="w-full h-11 px-4 bg-[#151C2E] border border-white/5 rounded-[12px] text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-sm"
              />
            </div>
            {currentUserProfile?.role !== 'MASTER_ADMIN' && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Category</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full h-11 px-4 bg-[#151C2E] border border-white/5 rounded-[12px] text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-sm appearance-none cursor-pointer"
                >
                  <option value="" className="bg-[#111827]">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name} className="bg-[#111827]">{cat.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full h-11 px-4 bg-[#151C2E] border border-white/5 rounded-[12px] text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Bio / Tagline <span className="text-red-500">*</span></label>
              <input
                required
                type="text"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full h-11 px-4 bg-[#151C2E] border border-white/5 rounded-[12px] text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">City <span className="text-red-500">*</span></label>
                <input
                  required
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full h-11 px-4 bg-[#151C2E] border border-white/5 rounded-[12px] text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">State <span className="text-red-500">*</span></label>
                <input
                  required
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full h-11 px-4 bg-[#151C2E] border border-white/5 rounded-[12px] text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Area</label>
                <input
                  type="text"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  className="w-full h-11 px-4 bg-[#151C2E] border border-white/5 rounded-[12px] text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Pincode <span className="text-red-500">*</span></label>
                <input
                  required
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  className="w-full h-11 px-4 bg-[#151C2E] border border-white/5 rounded-[12px] text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Address <span className="text-red-500">*</span></label>
              <textarea
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
                className="w-full p-4 bg-[#151C2E] border border-white/5 rounded-[12px] text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-sm resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Status</label>
                <input
                  readOnly
                  type="text"
                  value={currentUserProfile?.membershipStatus || 'PENDING'}
                  className="w-full h-11 px-4 bg-[#151C2E]/60 border border-white/5 rounded-[12px] text-neutral-400 outline-none font-bold text-sm cursor-not-allowed"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Joined On</label>
                <input
                  readOnly
                  type="text"
                  value={currentUserProfile?.createdAt ? format(new Date(currentUserProfile.createdAt), 'dd MMM yyyy') : 'N/A'}
                  className="w-full h-11 px-4 bg-[#151C2E]/60 border border-white/5 rounded-[12px] text-neutral-400 outline-none font-bold text-sm cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Associated Chapter Admin Section (My Profile) */}
          {currentUserProfile?.role === 'MEMBER' && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Chapter Admin</h3>
              <div className="bg-[#111827] rounded-[20px] border border-white/5 overflow-hidden">
                {!adminData ? (
                  <div className="p-6 text-center">
                    <p className="text-sm font-bold text-neutral-400">
                      {!currentUserProfile.chapter_id && !currentUserProfile.adminId ? "No Chapter Admin Assigned" : "Admin details not available"}
                    </p>
                  </div>
                ) : (
                  <div className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-[12px] bg-[#151C2E] flex items-center justify-center text-primary shrink-0">
                      <Shield size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Chapter Admin</p>
                      <p className="text-sm font-bold text-white">{adminData.name || adminData.displayName}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full h-12 bg-primary text-white rounded-[12px] font-bold uppercase tracking-widest shadow-2xl active:scale-95 transition-all disabled:opacity-50 text-xs"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
