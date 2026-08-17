import { Avatar } from '../components/Avatar';
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { motion } from 'motion/react';
import { CategorySelect } from '../components/CategorySelect';
import { 
  User, 
  Briefcase, 
  Phone, 
  PhoneCall, 
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
import { getDisplayPosition } from '../utils/authUtils';
import { databaseService } from '../services/databaseService';
import { notificationService } from '../services/notificationService';
import { Category, UserProfile, Referral, UserRole } from '../types';
import { normalizePhoneNumber } from '../utils/phoneUtils';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Modal } from '../components/Modal';
import { cn } from '../lib/utils';
import { isValid } from 'date-fns';
import { safeFormat as format } from '../utils/dateUtils';
import { MemberTestimonials } from '../components/MemberTestimonials';
import { showError, showSuccess as triggerSuccessToast, scrollToError } from '../services/toastService';

export function Profile() {
  const { profile: currentUserProfile, refreshProfile } = useAuth();
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
            const targetAdminId = fetchedProfile.chapter_id || fetchedProfile.adminId;
            if (fetchedProfile.role === 'MEMBER' && targetAdminId) {
              const adminUser = await databaseService.get<UserProfile>('users', targetAdminId);
              if (adminUser) setAdminData(adminUser);
            }
          }
        } else if (currentUserProfile) {
          setFormData({
            name: currentUserProfile.name || currentUserProfile.displayName || '',
            businessName: currentUserProfile.businessName || '',
            chapterName: currentUserProfile.chapterName || currentUserProfile.chapter_name || '',
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
          const currentAdminId = currentUserProfile.chapter_id || currentUserProfile.adminId;
          if (currentUserProfile.role === 'MEMBER' && currentAdminId) {
            const adminUser = await databaseService.get<UserProfile>('users', currentAdminId);
            if (adminUser) setAdminData(adminUser);
          }
        }

        if (chapterId) {
          try {
            const { data: chap, error: chapErr } = await supabase.from('chapters').select('chapter_name').eq('id', chapterId).single();
            if (chapErr || !chap) {
              console.error("Invalid Chapter for id:", chapterId, chapErr);
              setResolvedChapterName('Invalid Chapter');
            } else if (chap && chap.chapter_name) {
              setResolvedChapterName(chap.chapter_name);
              if (!isViewMode && currentUserProfile && (!currentUserProfile.chapterName || !currentUserProfile.chapter_name)) {
                try {
                  await supabase.from('users').update({ chapter_name: chap.chapter_name, chapterName: chap.chapter_name }).eq('id', currentUserProfile.id || currentUserProfile.uid);
                } catch (e) {}
              }
            }
          } catch (e) {
            console.error("Error loading chapter name:", e);
            setResolvedChapterName('Invalid Chapter');
          }
        } else if (!isViewMode && currentUserProfile && !currentUserProfile.chapterName && !currentUserProfile.chapter_name) {
          console.error("Chapter Not Assigned for user: ", currentUserProfile.id || currentUserProfile.uid);
          setResolvedChapterName('Chapter Not Assigned');
        } else if (isViewMode && targetProfile && !targetProfile.chapterName && !targetProfile.chapter_name) {
          setResolvedChapterName('Chapter Not Assigned');
        }

        if (!isViewMode) {
          const { data: cats } = await supabase.from('categories').select('id, name').order('name');
          if (cats) {
            setCategories(cats as unknown as Category[]);
          }
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUserProfile, isViewMode, targetUserId, isAdmin]);

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const compressImage = (file: File): Promise<{ blob: Blob; ext: string; contentType: string }> => {
    return new Promise((resolve) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.src = objectUrl;

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width || 800;
          let height = img.height || 800;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round(height * (MAX_WIDTH / width));
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round(width * (MAX_HEIGHT / height));
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(objectUrl);
            return resolve({ blob: file, ext: file.name.split('.').pop() || 'jpg', contentType: file.type || 'image/jpeg' });
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(objectUrl);
              if (blob && blob.size > 0) {
                resolve({ blob, ext: 'webp', contentType: 'image/webp' });
              } else {
                canvas.toBlob(
                  (jpegBlob) => {
                    if (jpegBlob && jpegBlob.size > 0) {
                      resolve({ blob: jpegBlob, ext: 'jpg', contentType: 'image/jpeg' });
                    } else {
                      resolve({ blob: file, ext: file.name.split('.').pop() || 'jpg', contentType: file.type || 'image/jpeg' });
                    }
                  },
                  'image/jpeg',
                  0.85
                );
              }
            },
            'image/webp',
            0.82
          );
        } catch (err) {
          URL.revokeObjectURL(objectUrl);
          console.warn("Canvas image compression failed, falling back to original file:", err);
          resolve({ blob: file, ext: file.name.split('.').pop() || 'jpg', contentType: file.type || 'image/jpeg' });
        }
      };

      img.onerror = (err) => {
        URL.revokeObjectURL(objectUrl);
        console.warn("Image load failed during compression, falling back to original file:", err);
        resolve({ blob: file, ext: file.name.split('.').pop() || 'jpg', contentType: file.type || 'image/jpeg' });
      };
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUserProfile?.uid) return;

    // Validate file type
    const lowerType = (file.type || '').toLowerCase();
    const fileName = (file.name || '').toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];
    const isExtensionValid = validExtensions.some(ext => fileName.endsWith(ext));
    const isTypeValid = lowerType.startsWith('image/') || isExtensionValid;

    if (!isTypeValid) {
      setErrorMessage('Invalid file format. Please select an image (JPG, PNG, WEBP, or HEIC) from your gallery.');
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('File size too large. Please select an image under 15MB.');
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }

    try {
      setIsUploadingPhoto(true);
      setErrorMessage(null);

      // Compress or prepare image blob
      const { blob: uploadBlob, ext: fileExt, contentType } = await compressImage(file);
      const currentUserId = currentUserProfile.id || currentUserProfile.uid;
      const targetFileName = `profiles/${currentUserId}/${Date.now()}.${fileExt}`;

      let photoUrlWithCacheBust = '';

      // 1. Try uploading to client Supabase Storage bucket 'profile_photos'
      try {
        const { error: uploadError } = await supabase.storage
          .from('profile_photos')
          .upload(targetFileName, uploadBlob, {
            contentType,
            upsert: true
          });

        if (uploadError) {
          console.error("Supabase Storage Upload Error Details:", uploadError);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('profile_photos')
            .getPublicUrl(targetFileName);

          if (publicUrl) {
            photoUrlWithCacheBust = `${publicUrl}?t=${Date.now()}`;
          }
        }
      } catch (clientStorageErr) {
        console.error("Supabase Storage Client Upload Error Details:", clientStorageErr);
      }

      // 2. If client storage was blocked by RLS or failed, use server endpoint / base64 fallback
      if (!photoUrlWithCacheBust) {
        const reader = new FileReader();
        const base64Data = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(uploadBlob);
        });

        try {
          const resp = await fetch('/api/profile/upload-photo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentUserId,
              imageBase64: base64Data,
              mimeType: contentType,
              fileName: targetFileName
            })
          });

          const resData = await resp.json();
          if (resData.success && resData.photoURL) {
            photoUrlWithCacheBust = resData.photoURL;
          } else {
            console.warn("Backend upload endpoint warning, using base64 URL:", resData.error);
            photoUrlWithCacheBust = base64Data;
          }
        } catch (apiErr) {
          console.warn("Backend upload API unavailable, using base64 URL:", apiErr);
          photoUrlWithCacheBust = base64Data;
        }
      }

      if (!photoUrlWithCacheBust) {
        throw new Error("Could not save profile picture. Please try again.");
      }

      // Update local form state immediately so the new picture displays instantly
      setFormData(prev => ({ ...prev, photoURL: photoUrlWithCacheBust }));

      // Update Supabase users table directly
      const { error: directDbError } = await supabase
        .from('users')
        .update({
          profile_photo: photoUrlWithCacheBust,
          photo_url: photoUrlWithCacheBust,
          photoURL: photoUrlWithCacheBust
        })
        .eq('id', currentUserId);

      if (directDbError) {
        console.warn("Direct Supabase users table update warning:", directDbError);
      }

      // Also update via databaseService to ensure local cached objects/helpers are updated
      await databaseService.update('users', currentUserId, { photoURL: photoUrlWithCacheBust });

      // If user is Master Admin, update master_admins table if applicable
      if (currentUserProfile.role === 'MASTER_ADMIN') {
        try {
          await supabase
            .from('master_admins')
            .update({ profile_photo: photoUrlWithCacheBust })
            .eq('id', currentUserId);
        } catch (mErr) {
          console.warn("Master admin photo update warning:", mErr);
        }
      }

      // Refresh AuthContext profile & sync localStorage
      if (refreshProfile) {
        await refreshProfile();
      }

      setSuccessMessage('Profile picture updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));
      window.dispatchEvent(new CustomEvent('profile-updated'));
    } catch (error: any) {
      console.error("Error uploading photo:", error);
      setErrorMessage(error.message || 'Failed to upload profile picture. Please try again.');
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setIsUploadingPhoto(false);
      // Reset input so the same file can be uploaded again if needed
      if (e.target) {
        e.target.value = '';
      }
    }
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
        subscriptionEnd: (!isNaN(new Date(newSubscriptionEnd).getTime()) ? new Date(newSubscriptionEnd).toISOString() : targetProfile.subscriptionEnd),
        membershipStatus: (!isNaN(new Date(newSubscriptionEnd).getTime()) ? (new Date(newSubscriptionEnd) > new Date() ? 'ACTIVE' : 'EXPIRED') : targetProfile.membershipStatus)
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
        subscriptionEnd: (!isNaN(new Date(newSubscriptionEnd).getTime()) ? new Date(newSubscriptionEnd).toISOString() : targetProfile.subscriptionEnd),
        membershipStatus: (!isNaN(new Date(newSubscriptionEnd).getTime()) ? (new Date(newSubscriptionEnd) > new Date() ? 'ACTIVE' : 'EXPIRED') : targetProfile.membershipStatus)
      } : null);
      
      triggerSuccessToast("Subscription updated successfully.");
      setNewSubscriptionEnd('');
    } catch (error) {
      console.error("Error updating subscription:", error);
      showError("Failed to update subscription.");
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
      
      triggerSuccessToast(`Referral sent to ${targetProfile.name} successfully!`);
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
      showError(mainMsg);
      scrollToError();
    } finally {
      setIsReferring(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserProfile) return;

    const targetUserId = currentUserProfile.id || currentUserProfile.uid;
    if (!targetUserId) {
      const msg = "Failed to identify user ID. Please try logging in again.";
      setErrorMessage(msg);
      showError(msg);
      scrollToError();
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      // Only send fields that the Member is actually allowed to edit
      const editablePayload: Record<string, any> = {
        name: formData.name ? formData.name.trim() : '',
        email: formData.email ? formData.email.trim() : '',
        businessName: formData.businessName ? formData.businessName.trim() : '',
        professionDesignation: formData.professionDesignation ? formData.professionDesignation.trim() : '',
        website: formData.website ? formData.website.trim() : '',
        bio: formData.bio ? formData.bio.trim() : '',
        city: formData.city ? formData.city.trim() : '',
        state: formData.state ? formData.state.trim() : '',
        area: formData.area ? formData.area.trim() : '',
        pincode: formData.pincode ? formData.pincode.trim() : '',
        address: formData.address ? formData.address.trim() : '',
        photoURL: formData.photoURL || ''
      };

      if (currentUserProfile.role !== 'MASTER_ADMIN') {
        editablePayload.category = formData.category || '';
      }

      console.log("Updating profile for user ID:", targetUserId, "Payload:", editablePayload);

      await databaseService.update('users', targetUserId, editablePayload);

      // Immediately refresh/re-fetch latest profile data
      if (refreshProfile) {
        await refreshProfile();
      }
      
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));

      setSuccessMessage("Profile updated successfully.");
      triggerSuccessToast("Profile updated successfully.");
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error("Complete Supabase profile update error:", error);
      let errMsg = "Failed to update profile. Please try again.";
      if (error?.message === "You can only edit your own profile.") {
        errMsg = "You can only edit your own profile.";
      }
      setErrorMessage(errMsg);
      showError(errMsg);
      scrollToError();
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
            <Avatar src={targetProfile.photoURL} name={targetProfile.name} size="w-24 h-24" className="mx-auto border-4 border-[#111827] shadow-[0_1px_3px_rgba(0,0,0,0.02)]" fallbackClassName="mx-auto border-4 border-[#111827]" />
            <div>
              <div className="flex items-center justify-center gap-2 flex-wrap px-2">
                <h2 className="text-lg sm:text-xl font-bold text-white break-words">{targetProfile.name}</h2>
              </div>
              
              <div className="flex flex-col gap-0.5 items-center justify-center mt-2 text-[13px] font-medium text-neutral-400">
                <div>
                  <span className="text-neutral-500 font-semibold text-[11px] uppercase tracking-wider mr-1">Chapter:</span> 
                  {targetProfile.chapterName || targetProfile.chapter_name || resolvedChapterName || 'Chapter Not Assigned'}
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
              {currentUserProfile && targetProfile && (currentUserProfile.id || currentUserProfile.uid) !== (targetProfile.id || targetProfile.uid) && targetUserId !== currentUserProfile.id && targetUserId !== currentUserProfile.uid && (
                <button 
                  onClick={() => navigate(`/refer?to=${targetProfile.id || targetProfile.uid || targetUserId}`)}
                  className="flex-1 h-11 bg-[#151C2E] border border-white/5 text-white rounded-[12px] flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest active:scale-95 transition-all hover:bg-[#1C2538] cursor-pointer"
                >
                  <Send size={18} className="text-primary" />
                  Pass Referral
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
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-white">{targetProfile.phone || 'Not specified'}</p>
                  {targetProfile.phone && (
                    <a href={`tel:${targetProfile.phone}`} className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                      <PhoneCall size={12} />
                    </a>
                  )}
                </div>
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

  if (currentUserProfile?.role === 'MASTER_ADMIN' && !isViewMode) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
          <Shield size={32} />
        </div>
        <h2 className="text-xl font-bold text-white">Master Admin Profile</h2>
        <p className="text-sm text-neutral-400 max-w-md">
          Master Admin is an organizational management account and does not require a member profile or personal subscription.
        </p>
        <button
          onClick={() => navigate('/admin/home')}
          className="mt-4 px-6 h-11 bg-primary text-white font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-red-700 transition-all cursor-pointer shadow-lg shadow-red-600/20"
        >
          Return to Dashboard
        </button>
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
            <label className={cn("absolute bottom-0 right-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center cursor-pointer shadow-[0_2px_10px_rgba(0,0,0,0.02)] border-2 border-[#111827] transition-all", isUploadingPhoto ? "opacity-50 cursor-not-allowed" : "active:scale-90")}>
              {isUploadingPhoto ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Camera size={16} />
              )}
              <input type="file" className="hidden" accept="image/*,image/jpeg,image/png,image/jpg,image/webp,image/heic,image/heif" onChange={handlePhotoUpload} disabled={isUploadingPhoto} />
            </label>
          </div>
          <div>
            <div className="flex items-center justify-center gap-2 flex-wrap px-2">
              <h2 className="text-lg sm:text-xl font-bold text-white break-words">{formData.name || 'Your Name'}</h2>
            </div>
            
            <div className="flex flex-col gap-0.5 items-center justify-center mt-2 text-[13px] font-medium text-neutral-400">
              <div>
                <span className="text-neutral-500 font-semibold text-[11px] uppercase tracking-wider mr-1">Chapter:</span> 
                {formData.chapterName || resolvedChapterName || 'Chapter Not Assigned'}
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

            <div className="space-y-1 opacity-70">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Chapter Name</label>
              <input
                disabled
                readOnly
                type="text"
                value={formData.chapterName || resolvedChapterName || 'Chapter Not Assigned'}
                className="w-full h-11 px-4 bg-[#151C2E] border border-white/5 rounded-[12px] text-white outline-none cursor-not-allowed font-bold text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Business Name {(formData.role === 'CHAPTER_ADMIN' || formData.position === 'chapter_admin') ? '(Optional)' : <span className="text-red-500">*</span>}</label>
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
                <CategorySelect
                  value={formData.category}
                  onChange={(val) => setFormData({ ...formData, category: val })}
                  categories={categories}
                  placeholder="Select Category"
                  required
                />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Website</label>
              <input
                type="text"
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
