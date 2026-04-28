import React, { useState, useEffect } from 'react';
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
import { firestoreService } from '../services/firestoreService';
import { notificationService } from '../services/notificationService';
import { Category, UserProfile, Referral, UserRole } from '../types';
import { normalizePhoneNumber } from '../utils/phoneUtils';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Modal } from '../components/Modal';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { usePositions } from '../hooks/usePositions';

export function Profile() {
  const { profile: currentUserProfile } = useAuth();
  const { getPositionForUser } = usePositions();
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

  const isAdmin = currentUserProfile?.role === 'MASTER_ADMIN' || currentUserProfile?.role === 'CHAPTER_ADMIN';

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    businessName: '',
    chapterName: '',
    category: '',
    phone: '',
    website: '',
    bio: '',
    state: '',
    city: '',
    area: '',
    address: '',
    photoURL: '',
    role: '' as UserRole
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (isViewMode && targetUserId) {
          const fetchedProfile = await firestoreService.get<UserProfile>('users', targetUserId);
          if (fetchedProfile) {
            setTargetProfile(fetchedProfile);
            const adminId = fetchedProfile.associatedChapterAdminId || fetchedProfile.adminId;
            if (fetchedProfile.role === 'MEMBER' && adminId) {
              const admin = await firestoreService.get<UserProfile>('users', adminId);
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
            website: currentUserProfile.website || '',
            bio: currentUserProfile.bio || '',
            state: currentUserProfile.state || '',
            city: currentUserProfile.city || '',
            area: currentUserProfile.area || '',
            address: currentUserProfile.address || '',
            photoURL: currentUserProfile.photoURL || '',
            role: currentUserProfile.role || 'MEMBER'
          });

          const adminId = currentUserProfile.associatedChapterAdminId || currentUserProfile.adminId;
          if (currentUserProfile.role === 'MEMBER' && adminId) {
            const admin = await firestoreService.get<UserProfile>('users', adminId);
            if (admin) setAdminData(admin);
          }
        }

        if (!isViewMode) {
          const cats = await firestoreService.list<Category>('categories');
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
      await firestoreService.update('users', targetProfile.uid, {
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
      
      const newReferral: Omit<Referral, 'id'> = {
        fromUserId: currentUserProfile.uid,
        toUserId: targetProfile.uid,
        contactName: referralForm.customerName,
        contactPhone: referralForm.mobileNumber,
        requirement: referralForm.requirement || 'General Referral',
        notes: referralForm.notes,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      };

      await firestoreService.create('referrals', newReferral);
      
      setSuccessMessage(`Referral sent to ${targetProfile.name} successfully!`);
      setIsModalOpen(false);
      setReferralForm({
        customerName: '',
        mobileNumber: '',
        notes: '',
        requirement: ''
      });
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error("Error creating referral:", error);
      alert("Failed to send referral. Please try again.");
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

      await firestoreService.update('users', currentUserProfile.uid, dataToUpdate);
      setSuccessMessage("Profile updated successfully!");
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
      setErrorMessage("Failed to update profile. Please try again.");
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const getPositionText = (userId: string) => {
    const position = getPositionForUser(userId);
    if (!position) return null;
    return (
      <span className="text-[10px] font-bold text-primary uppercase tracking-tight bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">
        {position}
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
      <div className="min-h-screen bg-background pb-24">
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-24 left-4 right-4 bg-emerald-500 text-white p-4 rounded-2xl shadow-lg z-50 flex items-center gap-3 font-bold"
          >
            <CheckCircle2 size={24} />
            {successMessage}
          </motion.div>
        )}

        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-24 left-4 right-4 bg-rose-500 text-white p-4 rounded-2xl shadow-lg z-50 flex items-center gap-3 font-bold"
          >
            <X size={24} />
            {errorMessage}
          </motion.div>
        )}
        
        {/* Red Header */}
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
          <div className="bg-white p-6 rounded-[20px] card-shadow border border-border text-center space-y-4">
            <div className="w-24 h-24 rounded-full bg-muted mx-auto border-4 border-white shadow-md overflow-hidden">
              <img 
                src={targetProfile.photoURL || `https://picsum.photos/seed/${targetProfile.uid}/200/200`} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 flex-wrap px-2">
                <h2 className="text-lg sm:text-xl font-bold text-text-primary break-words">{targetProfile.name}</h2>
                {getPositionText(targetProfile.uid)}
              </div>
              <p className="text-xs sm:text-sm font-bold text-primary uppercase tracking-wider">
                {targetProfile.role === 'MASTER_ADMIN' ? 'Master Admin' : targetProfile.role === 'CHAPTER_ADMIN' ? 'Chapter Admin' : (targetProfile.category || 'Member')}
              </p>
              {targetProfile.role === 'CHAPTER_ADMIN' && targetProfile.chapterName && (
                <p className="text-[10px] sm:text-xs font-black text-navy uppercase tracking-widest mt-1">{targetProfile.chapterName}</p>
              )}
              <p className="text-[10px] sm:text-xs font-medium text-text-secondary mt-1 break-words px-4">{targetProfile.businessName || 'SSK Business Network'}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <a 
                href={`tel:${targetProfile.phone}`}
                className="flex-1 h-11 bg-primary text-white rounded-xl flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest active:scale-95 transition-all shadow-md shadow-primary/20"
              >
                <Phone size={18} />
                Call
              </a>
              {currentUserProfile?.role === 'MEMBER' && (
                <button 
                  onClick={handleQuickRefer}
                  className="flex-1 h-11 bg-white border border-border text-text-primary rounded-xl flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest active:scale-95 transition-all hover:bg-muted"
                >
                  <Send size={18} className="text-primary" />
                  Refer
                </button>
              )}
            </div>
          </div>

          {/* Info List */}
          <div className="bg-white rounded-[20px] card-shadow border border-border overflow-hidden divide-y divide-border">
            <div className="p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-primary shrink-0">
                <Briefcase size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Category</p>
                <p className="text-sm font-bold text-text-primary">{targetProfile.category || 'Not specified'}</p>
              </div>
            </div>

            <div className="p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-primary shrink-0">
                <Building2 size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Business Name</p>
                <p className="text-sm font-bold text-text-primary">{targetProfile.businessName || 'Not specified'}</p>
              </div>
            </div>

            <div className="p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-primary shrink-0">
                <Phone size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Phone Number</p>
                <p className="text-sm font-bold text-text-primary">{targetProfile.phone || 'Not specified'}</p>
              </div>
            </div>

            <div className="p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-primary shrink-0">
                <MapPin size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Address & Location</p>
                <p className="text-sm font-bold text-text-primary leading-tight">
                  {targetProfile.address}<br />
                  <span className="text-text-secondary font-medium">
                    {targetProfile.area}, {targetProfile.city}, {targetProfile.state}
                  </span>
                </p>
              </div>
            </div>

            <div className="p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-primary shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Membership Status</p>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider inline-block mt-1",
                  targetProfile.membershipStatus === 'ACTIVE' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                )}>
                  {targetProfile.membershipStatus || 'PENDING'}
                </span>
              </div>
            </div>

            <div className="p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-primary shrink-0">
                <Calendar size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Date of Joining</p>
                <p className="text-sm font-bold text-text-primary">
                  {targetProfile.createdAt ? format(new Date(targetProfile.createdAt), 'dd MMMM yyyy') : 'Not available'}
                </p>
              </div>
            </div>

            <div className="p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-primary shrink-0">
                <Globe size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Website</p>
                <p className="text-sm font-bold text-text-primary truncate">
                  {targetProfile.website || 'Not specified'}
                </p>
              </div>
            </div>

            {targetProfile.bio && (
              <div className="p-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-primary shrink-0">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">About</p>
                  <p className="text-sm font-medium text-text-primary leading-relaxed">
                    {targetProfile.bio}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Associated Chapter Admin Section */}
          {targetProfile.role === 'MEMBER' && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest ml-1">Chapter Admin</h3>
              <div className="bg-white rounded-[20px] card-shadow border border-border overflow-hidden">
                {!adminData ? (
                  <div className="p-6 text-center">
                    <p className="text-sm font-bold text-text-secondary">
                      {!targetProfile.associatedChapterAdminId && !targetProfile.adminId ? "No Chapter Admin Assigned" : "Admin details not available"}
                    </p>
                  </div>
                ) : (
                  <div className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-primary shrink-0">
                      <Shield size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Chapter Admin</p>
                      <p className="text-sm font-bold text-text-primary">{adminData.name || adminData.displayName}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Subscription Management for Admins */}
          {isAdmin && targetProfile.role === 'MEMBER' && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest ml-1">Subscription Management</h3>
              <div className="bg-white rounded-[20px] card-shadow border border-border overflow-hidden p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Current Start Date</p>
                    <p className="text-sm font-bold text-text-primary">
                      {targetProfile.subscriptionStart ? format(new Date(targetProfile.subscriptionStart), 'dd MMM yyyy') : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Current End Date</p>
                    <p className="text-sm font-bold text-text-primary">
                      {targetProfile.subscriptionEnd ? format(new Date(targetProfile.subscriptionEnd), 'dd MMM yyyy') : 'Not set'}
                    </p>
                  </div>
                </div>
                <div className="space-y-1 pt-2 border-t border-border">
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Update End Date</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={newSubscriptionEnd}
                      onChange={(e) => setNewSubscriptionEnd(e.target.value)}
                      className="flex-1 h-11 px-4 bg-muted border border-transparent rounded-xl focus:bg-white focus:border-primary outline-none transition-all font-bold text-sm"
                    />
                    <button
                      onClick={handleUpdateSubscription}
                      disabled={!newSubscriptionEnd || isUpdatingSubscription}
                      className="h-11 px-6 bg-primary text-white rounded-xl font-bold uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
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
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Customer Name</label>
              <input
                required
                type="text"
                value={referralForm.customerName}
                onChange={(e) => setReferralForm(prev => ({ ...prev, customerName: e.target.value }))}
                className="w-full h-11 px-4 bg-muted border border-transparent rounded-xl focus:bg-white focus:border-primary outline-none transition-all font-bold text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Mobile Number</label>
              <input
                required
                type="tel"
                value={referralForm.mobileNumber}
                onChange={(e) => setReferralForm(prev => ({ ...prev, mobileNumber: e.target.value }))}
                className="w-full h-11 px-4 bg-muted border border-transparent rounded-xl focus:bg-white focus:border-primary outline-none transition-all font-bold text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Requirement</label>
              <input
                type="text"
                value={referralForm.requirement}
                onChange={(e) => setReferralForm(prev => ({ ...prev, requirement: e.target.value }))}
                className="w-full h-11 px-4 bg-muted border border-transparent rounded-xl focus:bg-white focus:border-primary outline-none transition-all font-bold text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={isReferring}
              className="w-full h-12 bg-primary text-white rounded-xl font-bold uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50 mt-4"
            >
              {isReferring ? 'Sending...' : 'Submit Referral'}
            </button>
          </form>
        </Modal>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {successMessage && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-24 left-4 right-4 bg-emerald-500 text-white p-4 rounded-2xl shadow-lg z-50 flex items-center gap-3 font-bold"
        >
          <CheckCircle2 size={24} />
          {successMessage}
        </motion.div>
      )}

      {errorMessage && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-24 left-4 right-4 bg-rose-500 text-white p-4 rounded-2xl shadow-lg z-50 flex items-center gap-3 font-bold"
        >
          <X size={24} />
          {errorMessage}
        </motion.div>
      )}
      
      {/* Red Header */}
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
        <div className="bg-white p-6 rounded-[20px] card-shadow border border-border text-center space-y-4">
          <div className="relative w-24 h-24 mx-auto">
            <div className="w-full h-full rounded-full bg-muted border-4 border-white shadow-md overflow-hidden">
              {formData.photoURL ? (
                <img 
                  src={formData.photoURL} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-secondary">
                  <User size={40} />
                </div>
              )}
            </div>
            <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg border-2 border-white active:scale-90 transition-all">
              <Camera size={16} />
              <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            </label>
          </div>
          <div>
            <div className="flex items-center justify-center gap-2 flex-wrap px-2">
              <h2 className="text-lg sm:text-xl font-bold text-text-primary break-words">{formData.name || 'Your Name'}</h2>
              {currentUserProfile && getPositionText(currentUserProfile.uid)}
            </div>
            <p className="text-xs sm:text-sm font-bold text-primary uppercase tracking-wider">
              {formData.role === 'MASTER_ADMIN' ? 'Master Admin' : formData.role === 'CHAPTER_ADMIN' ? 'Chapter Admin' : (formData.category || 'Member')}
            </p>
            {formData.role === 'CHAPTER_ADMIN' && formData.chapterName && (
              <p className="text-[10px] sm:text-xs font-black text-navy uppercase tracking-widest mt-1">{formData.chapterName}</p>
            )}
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white p-6 rounded-[20px] card-shadow border border-border space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Full Name</label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-11 px-4 bg-muted border border-transparent rounded-xl focus:bg-white focus:border-primary outline-none transition-all font-bold text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Phone Number</label>
              <input
                readOnly
                type="tel"
                value={formData.phone}
                className="w-full h-11 px-4 bg-muted/50 border border-transparent rounded-xl outline-none font-bold text-sm text-text-secondary cursor-not-allowed"
              />
            </div>

            {formData.role === 'CHAPTER_ADMIN' && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Chapter Name <span className="text-rose-500">*</span></label>
                <input
                  required
                  type="text"
                  value={formData.chapterName}
                  onChange={(e) => setFormData({ ...formData, chapterName: e.target.value })}
                  className="w-full h-11 px-4 bg-muted border border-transparent rounded-xl focus:bg-white focus:border-primary outline-none transition-all font-bold text-sm"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Business Name {formData.role === 'CHAPTER_ADMIN' ? '(Optional)' : ''}</label>
              <input
                required={formData.role !== 'CHAPTER_ADMIN'}
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full h-11 px-4 bg-muted border border-transparent rounded-xl focus:bg-white focus:border-primary outline-none transition-all font-bold text-sm"
              />
            </div>
            {currentUserProfile?.role !== 'MASTER_ADMIN' && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Category</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full h-11 px-4 bg-muted border border-transparent rounded-xl focus:bg-white focus:border-primary outline-none transition-all font-bold text-sm appearance-none cursor-pointer"
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full h-11 px-4 bg-muted border border-transparent rounded-xl focus:bg-white focus:border-primary outline-none transition-all font-bold text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Bio / Tagline</label>
              <input
                type="text"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full h-11 px-4 bg-muted border border-transparent rounded-xl focus:bg-white focus:border-primary outline-none transition-all font-bold text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full h-11 px-4 bg-muted border border-transparent rounded-xl focus:bg-white focus:border-primary outline-none transition-all font-bold text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full h-11 px-4 bg-muted border border-transparent rounded-xl focus:bg-white focus:border-primary outline-none transition-all font-bold text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Area</label>
              <input
                type="text"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                className="w-full h-11 px-4 bg-muted border border-transparent rounded-xl focus:bg-white focus:border-primary outline-none transition-all font-bold text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
                className="w-full p-4 bg-muted border border-transparent rounded-xl focus:bg-white focus:border-primary outline-none transition-all font-bold text-sm resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Status</label>
                <input
                  readOnly
                  type="text"
                  value={currentUserProfile?.membershipStatus || 'PENDING'}
                  className="w-full h-11 px-4 bg-muted/50 border border-transparent rounded-xl outline-none font-bold text-sm text-text-secondary cursor-not-allowed"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Joined On</label>
                <input
                  readOnly
                  type="text"
                  value={currentUserProfile?.createdAt ? format(new Date(currentUserProfile.createdAt), 'dd MMM yyyy') : 'N/A'}
                  className="w-full h-11 px-4 bg-muted/50 border border-transparent rounded-xl outline-none font-bold text-sm text-text-secondary cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Associated Chapter Admin Section (My Profile) */}
          {currentUserProfile?.role === 'MEMBER' && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest ml-1">Chapter Admin</h3>
              <div className="bg-white rounded-[20px] card-shadow border border-border overflow-hidden">
                {!adminData ? (
                  <div className="p-6 text-center">
                    <p className="text-sm font-bold text-text-secondary">
                      {!currentUserProfile.associatedChapterAdminId && !currentUserProfile.adminId ? "No Chapter Admin Assigned" : "Admin details not available"}
                    </p>
                  </div>
                ) : (
                  <div className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-primary shrink-0">
                      <Shield size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Chapter Admin</p>
                      <p className="text-sm font-bold text-text-primary">{adminData.name || adminData.displayName}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full h-12 bg-primary text-white rounded-xl font-bold uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
