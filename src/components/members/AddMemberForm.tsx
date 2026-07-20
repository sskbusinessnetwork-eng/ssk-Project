import React, { useState, useEffect } from 'react';
import { db, collection, query, where, getDocs, doc, setDoc, getDoc } from '../../lib/database';
import { useAuth } from '../../hooks/useAuth';
import { User, Phone, Mail, Lock, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { normalizePhoneNumber } from '../../utils/phoneUtils';
import { Chapter, UserProfile } from '../../types';
import { MemberSuccessPopup } from './MemberSuccessPopup';

export function AddMemberForm() {
  const { profile } = useAuth();
  const isMasterAdmin = profile?.role === 'MASTER_ADMIN';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Chapters list for Master Admin selection
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');

  // Resolved Chapter for Chapter Admin
  const [adminChapter, setAdminChapter] = useState<Chapter | null>(null);

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

  // Fetch chapters for Master Admin
  useEffect(() => {
    if (isMasterAdmin) {
      getDocs(query(collection(db, 'chapters'))).then(snap => {
        setChapters(snap.docs.map(d => ({ id: d.id, ...d.data() } as Chapter)));
      });
    }
  }, [isMasterAdmin]);

  // Fetch/Resolve chapter for Chapter Admin
  useEffect(() => {
    const loadAdminChapter = async () => {
      if (!isMasterAdmin && profile?.uid) {
        try {
          const q = query(collection(db, 'chapters'), where('chapter_admin_id', '==', profile.uid));
          const snap = await getDocs(q);
          if (!snap.empty) {
            setAdminChapter({ id: snap.docs[0].id, ...snap.docs[0].data() } as Chapter);
          } else if (profile.chapter_id) {
            const chapDoc = await getDoc(doc(db, 'chapters', profile.chapter_id));
            if (chapDoc.exists()) {
              setAdminChapter({ id: chapDoc.id, ...chapDoc.data() } as Chapter);
            }
          }
        } catch (err) {
          console.error("Error loading chapter for admin:", err);
        }
      }
    };
    loadAdminChapter();
  }, [isMasterAdmin, profile]);

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
      let finalChapterId = '';
      let finalChapterName = '';

      if (isMasterAdmin) {
        if (!selectedChapterId) {
          throw new Error('Please select a chapter.');
        }
        const matched = chapters.find(c => c.id === selectedChapterId);
        if (!matched) {
          throw new Error('Selected chapter is invalid.');
        }
        finalChapterId = matched.id;
        finalChapterName = matched.chapter_name;
      } else {
        if (!adminChapter) {
          throw new Error('Your chapter could not be resolved. Please contact Master Admin.');
        }
        finalChapterId = adminChapter.id;
        finalChapterName = adminChapter.chapter_name;
      }

      // 1. Mobile number duplicate check across all members
      const cleanPhone = normalizePhoneNumber(formData.phone);
      const phoneQuery = query(collection(db, 'users'), where('phone', '==', cleanPhone));
      const phoneSnap = await getDocs(phoneQuery);
      if (!phoneSnap.empty) {
        throw new Error('This mobile number is already registered.');
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
        created_by: profile?.uid || '',
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
      setSelectedChapterId('');

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
          {/* Chapter Selection (Master Admin Only) */}
          {isMasterAdmin && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider ml-1">Chapter *</label>
              <select
                value={selectedChapterId}
                onChange={(e) => setSelectedChapterId(e.target.value)}
                className="w-full h-11 px-4 bg-[#0F172A] border border-white/5 rounded-xl focus:border-primary outline-none transition-all text-xs font-medium text-white appearance-none cursor-pointer"
                required
              >
                <option value="">Select a Chapter</option>
                {chapters.map(chap => (
                  <option key={chap.id} value={chap.id}>{chap.chapter_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Chapter Name Auto-filled for Chapter Admin */}
          {!isMasterAdmin && adminChapter && (
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
