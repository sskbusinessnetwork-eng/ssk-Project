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
    email: '',
    password: ''
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
    if (!formData.fullName.trim()) {
      setError('Full Name is required.');
      setLoading(false);
      return;
    }
    if (!formData.phone.trim()) {
      setError('Mobile Number is required.');
      setLoading(false);
      return;
    }
    if (!formData.whatsapp.trim()) {
      setError('WhatsApp Number is required.');
      setLoading(false);
      return;
    }
    if (!formData.password.trim()) {
      setError('Default Password is required.');
      setLoading(false);
      return;
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
        email: formData.email.trim() || '',
        chapter_id: finalChapterId,
        chapterName: finalChapterName,
        role: 'MEMBER',
        position: 'member' as any, // translates to 'Associate Member' in display
        membershipStatus: 'ACTIVE' as any,
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
        email: '',
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Chapter Name Auto-filled for Chapter Admin */}
          {adminChapter && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Chapter</label>
              <input
                type="text"
                value={adminChapter.chapter_name}
                disabled
                className="w-full h-11 px-4 bg-[#0F172A]/50 border border-white/5 rounded-xl text-sm font-medium text-neutral-400 cursor-not-allowed"
              />
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Full Name *</label>
            <div className="relative">
              <User size={16} className="absolute left-4 top-3.5 text-neutral-500" />
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter member's full name"
                className="w-full h-11 pl-11 pr-4 bg-[#0F172A] border border-white/5 rounded-xl focus:border-primary outline-none transition-all text-sm font-medium text-white placeholder-neutral-500"
                required
              />
            </div>
          </div>

          {/* Phone & WhatsApp Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Phone Number */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Mobile Number *</label>
              <div className="relative">
                <Phone size={16} className="absolute left-4 top-3.5 text-neutral-500" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. 9876543210"
                  className="w-full h-11 pl-11 pr-4 bg-[#0F172A] border border-white/5 rounded-xl focus:border-primary outline-none transition-all text-sm font-medium text-white placeholder-neutral-500"
                  required
                />
              </div>
            </div>

            {/* WhatsApp Number */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">WhatsApp Number *</label>
              <div className="relative">
                <Phone size={16} className="absolute left-4 top-3.5 text-neutral-500" />
                <input
                  type="tel"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleChange}
                  placeholder="e.g. 9876543210"
                  className="w-full h-11 pl-11 pr-4 bg-[#0F172A] border border-white/5 rounded-xl focus:border-primary outline-none transition-all text-sm font-medium text-white placeholder-neutral-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Email ID (Optional)</label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-3.5 text-neutral-500" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter member's email address"
                className="w-full h-11 pl-11 pr-4 bg-[#0F172A] border border-white/5 rounded-xl focus:border-primary outline-none transition-all text-sm font-medium text-white placeholder-neutral-500"
              />
            </div>
          </div>

          {/* Default Password */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Default Password *</label>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-3.5 text-neutral-500" />
              <input
                type="text"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Set initial password"
                className="w-full h-11 pl-11 pr-4 bg-[#0F172A] border border-white/5 rounded-xl focus:border-primary outline-none transition-all text-sm font-medium text-white placeholder-neutral-500"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_25px_rgba(239,68,68,0.35)] transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Creating Account...
              </>
            ) : (
              'Create Member Account'
            )}
          </button>
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
