import React, { useState, useEffect } from 'react';
import { db, collection, query, where, getDocs, doc, setDoc, getDoc } from '../../lib/database';
import { useAuth } from '../../hooks/useAuth';
import { User, Phone, Mail, Lock, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { normalizePhoneNumber } from '../../utils/phoneUtils';
import { Chapter, UserProfile } from '../../types';
import { MemberSuccessPopup } from './MemberSuccessPopup';
import { supabase } from '../../lib/supabaseClient';

export function AddMemberForm() {
  const { profile } = useAuth();
  const isMasterAdmin = profile?.role === 'MASTER_ADMIN';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);

  // Resolved Chapter for Chapter Admin
  const [adminChapter, setAdminChapter] = useState<{ id: string; chapter_name: string } | null>(null);

  // Success Popup State
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [createdMemberData, setCreatedMemberData] = useState<{
    name: string;
    userId: string;
    phone: string;
    password?: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    whatsapp: '',
    password: '',
    subscriptionStart: new Date().toISOString().split('T')[0],
    subscriptionEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
  });

  // Fetch/Resolve chapter for Chapter Admin securely from authenticated user record
  useEffect(() => {
    const loadAdminChapter = async () => {
      const adminId = profile?.uid || profile?.id;
      if (adminId) {
        try {
          // Fetch fresh from Supabase users table
          const { data: dbUser, error: dbUserErr } = await supabase
            .from('users')
            .select('*')
            .eq('id', adminId)
            .single();

          if (!dbUserErr && dbUser && dbUser.chapter_id) {
            setAdminChapter({
              id: dbUser.chapter_id,
              chapter_name: dbUser.chapter_name || 'SSK Chapter'
            });
          }
        } catch (err) {
          console.error("Error loading chapter for admin:", err);
        }
      }
    };
    loadAdminChapter();
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Form Validation
    const newErrors: Record<string, string> = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full Name is required.';
    if (!formData.whatsapp.trim()) newErrors.whatsapp = 'WhatsApp Number is required.';
    if (!formData.phone.trim()) newErrors.phone = 'Mobile Number is required.';
    if (!formData.password.trim()) newErrors.password = 'Default Password is required.';
    if (!formData.subscriptionStart) newErrors.subscriptionStart = 'Subscription Start Date is required.';
    if (!formData.subscriptionEnd) newErrors.subscriptionEnd = 'Subscription End Date is required.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      
      // Scroll to the first field with an error
      const firstErrorField = document.querySelector(`[name="${Object.keys(newErrors)[0]}"]`);
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    } else {
      setErrors({});
    }

    try {
      const adminId = profile?.uid || profile?.id;
      if (!adminId) {
        throw new Error('You must be logged in as a Chapter Admin to create members.');
      }

      // Fetch the logged-in Chapter Admin's profile from the database to guarantee it is secure and authentic
      const { data: adminProfile, error: profileErr } = await supabase
        .from('users')
        .select('chapter_id, chapter_name, role')
        .eq('id', adminId)
        .single();

      if (profileErr || !adminProfile) {
        throw new Error('Failed to verify Chapter Admin profile.');
      }

      // Enforce security role check
      if (adminProfile.role !== 'CHAPTER_ADMIN') {
        throw new Error('Unauthorized. Only Chapter Admins are allowed to create regular members.');
      }

      const finalChapterId = adminProfile.chapter_id;
      const finalChapterName = adminProfile.chapter_name;

      if (!finalChapterId) {
        throw new Error('Your Chapter Admin profile does not have an assigned Chapter ID. Please contact support.');
      }

      // 1. Mobile number duplicate check across all members
      const cleanPhone = normalizePhoneNumber(formData.phone);
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('phone', cleanPhone)
        .limit(1);

      if (checkError) throw checkError;
      if (existingUser && existingUser.length > 0) {
        throw new Error('This phone number is already registered. Please use a different phone number.');
      }

      // 2. Generate unique Member ID
      const memberId = 'SSK' + Math.floor(10000 + Math.random() * 90000).toString();
      const uid = 'auth_' + Math.random().toString(36).substring(2, 11);

      // 3. Create User Profile
      const newMember = {
        id: uid,
        uid: uid,
        memberId: memberId,
        name: formData.fullName.trim(),
        phone: cleanPhone,
        whatsappNumber: normalizePhoneNumber(formData.whatsapp),
        
        chapter_id: finalChapterId,
        chapterName: finalChapterName,
        role: 'MEMBER',
        position: 'member' as any, // translates to 'Associate Member' in display
        membershipStatus: 'ACTIVE' as any,
        subscriptionStart: new Date(formData.subscriptionStart).toISOString(),
        subscriptionEnd: new Date(formData.subscriptionEnd).toISOString(),
        subscriptionStartDate: formData.subscriptionStart,
        subscriptionEndDate: formData.subscriptionEnd,
        subscriptionStatus: new Date(formData.subscriptionEnd) > new Date() ? 'Active' : 'Expired',
        must_change_password: true,
        created_by: adminId,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', uid), newMember);

      // 4. Create auth record
      await setDoc(doc(db, 'auth_data', uid), {
        password: formData.password,
        phone: cleanPhone
      });

      // 5. Setup Success Popup data
      setCreatedMemberData({
        name: newMember.name,
        userId: memberId,
        phone: cleanPhone,
        password: formData.password
      });
      setIsSuccessOpen(true);
      setSuccess('Member account created successfully!');

      // 6. Reset Form
      setFormData({
        fullName: '',
        phone: '',
        whatsapp: '',
    
        password: ''
      });

      // 7. Dispatch Global Event to refresh active screens instantly without page reloads
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));

    } catch (err: any) {
      setError(err.message || 'An error occurred while creating member.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-6 bg-[#161B22] border border-white/10 rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.25)] max-w-xl mx-auto space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white mb-1">Add New Member</h2>
          <p className="text-xs text-neutral-400">Fill out the details below to add a new member. Credentials will be generated upon creation.</p>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 size={16} />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Full Name *</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Enter member's full name"
              className="w-full h-11 pl-11 pr-4 bg-[#0F172A] border border-white/5 rounded-xl focus:border-primary outline-none transition-all text-sm font-medium text-white placeholder-neutral-500"
              
            />
          </div>
          {errors.fullName && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.fullName}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">WhatsApp Number *</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
              <input
                type="tel"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleChange}
                placeholder="e.g. 9876543210"
                className="w-full h-11 pl-11 pr-4 bg-[#0F172A] border border-white/5 rounded-xl focus:border-primary outline-none transition-all text-sm font-medium text-white placeholder-neutral-500"
                
              />
            </div>
          {errors.whatsapp && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.whatsapp}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Mobile Number *</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g. 9876543210"
                className="w-full h-11 pl-11 pr-4 bg-[#0F172A] border border-white/5 rounded-xl focus:border-primary outline-none transition-all text-sm font-medium text-white placeholder-neutral-500"
                
              />
            </div>
          {errors.phone && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.phone}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Default Password *</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
            <input
              type="text"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Set initial password"
              className="w-full h-11 pl-11 pr-4 bg-[#0F172A] border border-white/5 rounded-xl focus:border-primary outline-none transition-all text-sm font-medium text-white placeholder-neutral-500"
              
            />
          </div>
          <p className="text-[10px] text-neutral-500 ml-1">Member will be prompted to change this on first login.</p>
        {errors.password && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.password}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Subscription Start Date *</label>
            <input
              type="date"
              name="subscriptionStart"
              value={formData.subscriptionStart}
              onChange={handleChange}
              className="w-full h-11 px-4 bg-[#0F172A] border border-white/5 rounded-xl focus:border-primary outline-none transition-all text-sm font-medium text-white placeholder-neutral-500"
              
            />
          </div>
          {errors.subscriptionStart && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.subscriptionStart}</p>}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Subscription End Date *</label>
            <input
              type="date"
              name="subscriptionEnd"
              value={formData.subscriptionEnd}
              onChange={handleChange}
              className="w-full h-11 px-4 bg-[#0F172A] border border-white/5 rounded-xl focus:border-primary outline-none transition-all text-sm font-medium text-white placeholder-neutral-500"
              
            />
          </div>
          {errors.subscriptionEnd && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.subscriptionEnd}</p>}
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-primary/90 transition-all shadow-[0_4px_20px_rgba(229,57,53,0.3)] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Creating Account...
              </>
            ) : (
              'Create Member Account'
            )}
          </button>
        </div>
      </form>
      </div>

      {/* Success Popup displaying credentials */}
      <MemberSuccessPopup
        isOpen={isSuccessOpen}
        onClose={() => {
          setIsSuccessOpen(false);
          setCreatedMemberData(null);
        }}
        memberData={createdMemberData}
      />
    </div>
  );
}
