import React, { useState, useEffect } from 'react';
import bcrypt from 'bcryptjs';
import { UserProfile } from '../types';
import { Building, MapPin, CheckCircle2, User, Phone, Mail, MessageCircle, Lock, AlertCircle, X, Calendar } from 'lucide-react';
import { useAuth } from "../hooks/useAuth";
import { normalizePhoneNumber } from '../utils/phoneUtils';
import { supabase } from '../lib/supabaseClient';

import { db, doc, setDoc } from '../lib/database';
import { motion, AnimatePresence } from 'framer-motion';

interface LeaderForm {
  fullName: string;
  mobile: string;
  whatsapp: string;
  email: string;
  subscriptionStart: string;
  subscriptionEnd: string;
}

const getDefaultDates = () => {
  const today = new Date();
  const start = today.toISOString().split('T')[0];
  const nextYear = new Date(today);
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  const end = nextYear.toISOString().split('T')[0];
  return { start, end };
};

const createEmptyLeader = (): LeaderForm => {
  const { start, end } = getDefaultDates();
  return {
    fullName: '',
    mobile: '',
    whatsapp: '',
    email: '',
    subscriptionStart: start,
    subscriptionEnd: end,
  };
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export function CreateChapter({ onSuccess }: { onSuccess?: () => void }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [successPopup, setSuccessPopup] = useState(false);
  const [errorPopup, setErrorPopup] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    chapter_name: '',
    meeting_venue: '',
  });

  const [leaders, setLeaders] = useState({
    chapter_admin: createEmptyLeader(),
    president: createEmptyLeader(),
    vice_president: createEmptyLeader(),
    treasurer: createEmptyLeader(),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleLeaderChange = (pos: keyof typeof leaders, field: keyof LeaderForm, value: string) => {
    setLeaders(prev => ({
      ...prev,
      [pos]: { ...prev[pos], [field]: value }
    }));
    // Clear error for this field if exists
    if (errors[`${String(pos)}_${field}`]) {
      setErrors(prev => ({ ...prev, [`${String(pos)}_${field}`]: '' }));
    }
  };

  const closeForm = () => {
    setFormData({ chapter_name: '', meeting_venue: '' });
    setLeaders({
      chapter_admin: createEmptyLeader(),
      president: createEmptyLeader(),
      vice_president: createEmptyLeader(),
      treasurer: createEmptyLeader(),
    });
    setSuccessPopup(false);
    if (onSuccess) onSuccess();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setErrorPopup(null);
    let newErrors: Record<string, string> = {};

    if (!formData.chapter_name.trim()) newErrors.chapter_name = "Chapter name is required.";
    if (!formData.meeting_venue.trim()) newErrors.meeting_venue = "Meeting venue is required.";

    const positions = ['chapter_admin', 'president', 'vice_president', 'treasurer'] as const;
    
    for (const pos of positions) {
      const l = leaders[pos];
      if (!l.fullName.trim()) newErrors[`${String(pos)}_fullName`] = "Full Name is required.";
      if (!l.mobile.trim()) newErrors[`${String(pos)}_mobile`] = "Mobile number is required.";
      else if (l.mobile.trim().length < 10) newErrors[`${String(pos)}_mobile`] = "Please enter a valid 10-digit phone number.";
      
      if (l.email.trim() && !/^\S+@\S+\.\S+$/.test(l.email.trim())) {
        newErrors[`${String(pos)}_email`] = "Invalid email address.";
      }

      if (!l.subscriptionStart) {
        newErrors[`${String(pos)}_subscriptionStart`] = "Subscription Start Date is required.";
      }
      if (!l.subscriptionEnd) {
        newErrors[`${String(pos)}_subscriptionEnd`] = "Subscription End Date is required.";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setErrorPopup("Please fill in all required fields correctly.");
      setTimeout(() => {
        const firstErrorKey = Object.keys(newErrors)[0];
        const errorElement = document.querySelector(`[name="${firstErrorKey}"]`) as HTMLElement;
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          errorElement.focus();
        }
      }, 100);
      return;
    }

    const mobiles = positions.map(p => normalizePhoneNumber(leaders[p].mobile));
    const uniqueMobiles = new Set(mobiles);
    if (uniqueMobiles.size !== mobiles.length) {
       setErrorPopup("Mobile numbers must be unique across all leadership roles.");
       return;
    }

    const emails = positions.map(p => leaders[p].email.trim().toLowerCase()).filter(Boolean);
    if (new Set(emails).size !== emails.length) {
       setErrorPopup("Email addresses must be unique across all leadership roles.");
       return;
    }

    setLoading(true);
    try {
      // 0. Check for existing chapter name
      const { data: existingChapter, error: chapterCheckError } = await supabase
        .from('chapters')
        .select('id')
        .ilike('chapter_name', formData.chapter_name.trim())
        .limit(1);
        
      if (chapterCheckError) {
        console.error("Chapter check error:", chapterCheckError.message, chapterCheckError.code, chapterCheckError.details, chapterCheckError.hint);
        throw chapterCheckError;
      }
      if (existingChapter && existingChapter.length > 0) {
        newErrors.chapter_name = "A chapter with this name already exists. Please choose a different chapter name.";
        setErrors(newErrors);
        throw new Error("A chapter with this name already exists. Please choose a different chapter name.");
      }

      // 1. Check for existing users
      for (const pos of positions) {
        const phone = normalizePhoneNumber(leaders[pos].mobile);
        const { data: existing, error: checkError } = await supabase.from('users').select('id').eq('phone', phone).limit(1);
        if (checkError) {
          console.error("User check error:", checkError.message, checkError.code, checkError.details, checkError.hint);
          throw checkError;
        }
        if (existing && existing.length > 0) {
          newErrors[`${String(pos)}_mobile`] = "This phone number is already registered. Please use a different phone number.";
          setErrors(newErrors);
          throw new Error("This phone number is already registered. Please use a different phone number.");
        }
      }

      const chapterId = generateId();
      const leaderUIDs = {
        chapter_admin: generateId(),
        president: generateId(),
        vice_president: generateId(),
        treasurer: generateId(),
      };

      // 1. Create chapter
      const chapterData = {
        id: chapterId,
        chapter_name: formData.chapter_name.trim(),
        meeting_venue: formData.meeting_venue.trim(),
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: chapterError } = await supabase.from('chapters').insert(chapterData);
      if (chapterError) {
        console.error("Chapter insert error:", chapterError.message, chapterError.code, chapterError.details, chapterError.hint);
        throw new Error(`Failed to create chapter: ${chapterError.message}`);
      }

      let createdUsers: string[] = [];

      try {
        // 2. Create users with full subscription fields
        for (const pos of positions) {
          const leader = leaders[pos];
          const phone = normalizePhoneNumber(leader.mobile);
          const uid = leaderUIDs[pos];
          const defaultPassword = 'Welcometosskbusiness';
          createdUsers.push(uid);

          const startDateISO = leader.subscriptionStart ? new Date(leader.subscriptionStart).toISOString() : new Date().toISOString();
          const endDateISO = leader.subscriptionEnd ? new Date(leader.subscriptionEnd).toISOString() : new Date().toISOString();

          let chapterPosVal = 'MEMBER';
          if (pos === 'chapter_admin') {
            chapterPosVal = 'CHAPTER_ADMIN';
          } else if (pos === 'president') {
            chapterPosVal = 'PRESIDENT';
          } else if (pos === 'vice_president') {
            chapterPosVal = 'VICE_PRESIDENT';
          } else if (pos === 'treasurer') {
            chapterPosVal = 'TREASURER';
          }

          const userRole = pos === 'chapter_admin' ? 'CHAPTER_ADMIN' : 'MEMBER';

          await setDoc(doc(db, 'users', uid), {
            id: uid,
            uid: uid,
            name: leader.fullName.trim(),
            phone: phone,
            whatsappNumber: leader.whatsapp.trim() || phone,
            email: leader.email.trim() || null,
            password: bcrypt.hashSync(defaultPassword, 10),
            role: userRole,
            chapter_position: chapterPosVal,
            chapterPosition: chapterPosVal,
            created_by_role: 'MASTER_ADMIN',
            status: 'ACTIVE',
            membershipStatus: 'ACTIVE',
            account_status: 'ACTIVE',
            accountStatus: 'ACTIVE',
            chapter_id: chapterId,
            chapter_name: formData.chapter_name.trim(),
            chapterName: formData.chapter_name.trim(),
            position: pos,
            password_changed: false,
            passwordChanged: false,
            must_change_password: true,
            mustChangePassword: true,
            subscriptionStart: startDateISO,
            subscriptionEnd: endDateISO,
            subscriptionStatus: 'Active',
            subscriptionType: 'Annual',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }

        // 3. Update chapter with the valid user IDs
        const { error: chapterUpdateError } = await supabase.from('chapters').update({
          chapter_admin_id: leaderUIDs.chapter_admin,
          president_id: leaderUIDs.president,
          vice_president_id: leaderUIDs.vice_president,
          treasurer_id: leaderUIDs.treasurer,
        }).eq('id', chapterId);
        
        if (chapterUpdateError) {
          console.error("Chapter link error:", chapterUpdateError.message, chapterUpdateError.code, chapterUpdateError.details, chapterUpdateError.hint);
          throw new Error(`Unable to link members to the chapter: ${chapterUpdateError.message}`);
        }

        setSuccessPopup(true);
        window.dispatchEvent(new Event('dashboard-refresh'));
        
      } catch (insertError: any) {
        console.error("Creation sub-step error:", insertError.message, insertError.code, insertError.details, insertError.hint);
        await supabase.from('chapters').delete().eq('id', chapterId);
        if (createdUsers.length > 0) {
           await supabase.from('users').delete().in('id', createdUsers);
        }
        throw insertError;
      }
    } catch (err: any) {
      console.error("Chapter creation error:", err.message, err.code, err.details, err.hint, err);
      if (!errorPopup && !Object.keys(newErrors).length) {
         setErrorPopup(err.message || 'An error occurred while creating the chapter.');
      } else if (err.message) {
         setErrorPopup(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderLeaderForm = (title: string, pos: keyof typeof leaders) => (
    <div className="bg-[#0F172A]/50 border border-white/[0.05] rounded-xl p-5 space-y-4">
      <h4 className="text-sm font-bold text-white border-b border-white/[0.05] pb-2">{title}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Full Name */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-[#E5E7EB] uppercase tracking-[0.5px] ml-1 block">Full Name *</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
            <input
              type="text"
              name={`${String(pos)}_fullName`}
              placeholder="Full Name"
              value={leaders[pos].fullName}
              onChange={(e) => handleLeaderChange(pos, 'fullName', e.target.value)}
              className={`w-full h-[40px] pl-9 pr-4 bg-[#0F172A] border ${errors[`${String(pos)}_fullName`] ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-primary'} rounded-lg outline-none text-white placeholder-white/50 text-xs transition-all`}
            />
          </div>
          {errors[`${String(pos)}_fullName`] && <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={10} /> {errors[`${String(pos)}_fullName`]}</p>}
        </div>
        
        {/* Mobile */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-[#E5E7EB] uppercase tracking-[0.5px] ml-1 block">Mobile Number *</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
            <input
              type="tel"
              name={`${String(pos)}_mobile`}
              placeholder="e.g. 9876543210"
              value={leaders[pos].mobile}
              onChange={(e) => handleLeaderChange(pos, 'mobile', e.target.value)}
              className={`w-full h-[40px] pl-9 pr-4 bg-[#0F172A] border ${errors[`${String(pos)}_mobile`] ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-primary'} rounded-lg outline-none text-white placeholder-white/50 text-xs transition-all`}
            />
          </div>
          {errors[`${String(pos)}_mobile`] && <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={10} /> {errors[`${String(pos)}_mobile`]}</p>}
        </div>
        
        {/* WhatsApp */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-[0.5px] ml-1 block">WhatsApp (Optional)</label>
          <div className="relative">
            <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
            <input
              type="tel"
              name={`${String(pos)}_whatsapp`}
              placeholder="Same as mobile if empty"
              value={leaders[pos].whatsapp}
              onChange={(e) => handleLeaderChange(pos, 'whatsapp', e.target.value)}
              className="w-full h-[40px] pl-9 pr-4 bg-[#0F172A] border border-white/10 rounded-lg focus:border-primary outline-none text-white placeholder-white/50 text-xs transition-all"
            />
          </div>
        </div>
        
        {/* Email */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-[0.5px] ml-1 block">Email (Optional)</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
            <input
              type="email"
              name={`${String(pos)}_email`}
              placeholder="Email address"
              value={leaders[pos].email}
              onChange={(e) => handleLeaderChange(pos, 'email', e.target.value)}
              className={`w-full h-[40px] pl-9 pr-4 bg-[#0F172A] border ${errors[`${String(pos)}_email`] ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-primary'} rounded-lg outline-none text-white placeholder-white/50 text-xs transition-all`}
            />
          </div>
          {errors[`${String(pos)}_email`] && <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={10} /> {errors[`${String(pos)}_email`]}</p>}
        </div>

        {/* Subscription Start Date */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-[#E5E7EB] uppercase tracking-[0.5px] ml-1 block">Subscription Start Date *</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
            <input
              type="date"
              name={`${String(pos)}_subscriptionStart`}
              value={leaders[pos].subscriptionStart}
              onChange={(e) => handleLeaderChange(pos, 'subscriptionStart', e.target.value)}
              className={`w-full h-[40px] pl-9 pr-4 bg-[#0F172A] border ${errors[`${String(pos)}_subscriptionStart`] ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-primary'} rounded-lg outline-none text-white placeholder-white/50 text-xs transition-all`}
            />
          </div>
          {errors[`${String(pos)}_subscriptionStart`] && <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={10} /> {errors[`${String(pos)}_subscriptionStart`]}</p>}
        </div>

        {/* Subscription End Date */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-[#E5E7EB] uppercase tracking-[0.5px] ml-1 block">Subscription End Date *</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
            <input
              type="date"
              name={`${String(pos)}_subscriptionEnd`}
              value={leaders[pos].subscriptionEnd}
              onChange={(e) => handleLeaderChange(pos, 'subscriptionEnd', e.target.value)}
              className={`w-full h-[40px] pl-9 pr-4 bg-[#0F172A] border ${errors[`${String(pos)}_subscriptionEnd`] ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-primary'} rounded-lg outline-none text-white placeholder-white/50 text-xs transition-all`}
            />
          </div>
          {errors[`${String(pos)}_subscriptionEnd`] && <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={10} /> {errors[`${String(pos)}_subscriptionEnd`]}</p>}
        </div>
        
      </div>
    </div>
  );

  return (
    <div className="bg-[#161B22] border border-white/[0.08] rounded-[20px] shadow-[0_15px_40px_rgba(0,0,0,0.35)] p-6 sm:p-8 relative">
      <h2 className="text-xl font-bold text-white mb-6">Create New Chapter</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-[0.5px] border-b border-white/[0.08] pb-2">
            Chapter Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#E5E7EB] uppercase tracking-[0.5px] ml-1 block">Chapter Name *</label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                <input
                  type="text"
                  name="chapter_name"
                  placeholder="e.g., Bangalore Central"
                  value={formData.chapter_name}
                  onChange={(e) => {
                    setFormData(f => ({ ...f, chapter_name: e.target.value }));
                    if (errors.chapter_name) setErrors(e => ({ ...e, chapter_name: '' }));
                  }}
                  className={`w-full h-[50px] pl-10 pr-4 bg-[#0F172A] border ${errors.chapter_name ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-primary'} rounded-[14px] outline-none text-white placeholder-white/50 text-sm transition-all`}
                />
              </div>
              {errors.chapter_name && <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.chapter_name}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#E5E7EB] uppercase tracking-[0.5px] ml-1 block">Meeting Venue *</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                <input
                  type="text"
                  name="meeting_venue"
                  placeholder="e.g., Koramangala Community Hall"
                  value={formData.meeting_venue}
                  onChange={(e) => {
                    setFormData(f => ({ ...f, meeting_venue: e.target.value }));
                    if (errors.meeting_venue) setErrors(e => ({ ...e, meeting_venue: '' }));
                  }}
                  className={`w-full h-[50px] pl-10 pr-4 bg-[#0F172A] border ${errors.meeting_venue ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-primary'} rounded-[14px] outline-none text-white placeholder-white/50 text-sm transition-all`}
                />
              </div>
              {errors.meeting_venue && <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.meeting_venue}</p>}
            </div>
          </div>
        </div>

        {/* Leadership */}
        <div className="space-y-2 pt-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-[0.5px] pb-2">
            Assign Leadership (Mandatory)
          </h3>
          <p className="text-xs text-neutral-400 mb-2">Create the 4 primary leadership accounts for this new chapter.</p>
          
          {renderLeaderForm('1. Chapter Admin', 'chapter_admin')}
          {renderLeaderForm('2. President', 'president')}
          {renderLeaderForm('3. Vice President', 'vice_president')}
          {renderLeaderForm('4. Treasurer', 'treasurer')}
        </div>

        <div className="pt-8 flex justify-end border-t border-white/[0.08]">
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-primary text-white font-bold text-sm uppercase tracking-widest rounded-[14px] hover:bg-[#DC2626] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-70 flex items-center gap-2"
          >
            {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {loading ? 'Creating Chapter...' : 'Create Chapter'}
          </button>
        </div>
      </form>

      {/* Success Modal */}
      <AnimatePresence>
        {successPopup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1A1F2B] border border-white/10 rounded-2xl shadow-2xl p-6 max-w-sm w-full relative"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 text-emerald-400">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">✅ Chapter Created Successfully</h3>
                <p className="text-sm text-neutral-400 mb-6">
                  The chapter and all leadership members have been created successfully.
                </p>
                <button
                  onClick={closeForm}
                  className="w-full py-3 bg-primary text-white rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-primary/90 transition-colors"
                >
                  OK
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Error Modal */}
      <AnimatePresence>
        {errorPopup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1A1F2B] border border-white/10 rounded-2xl shadow-2xl p-6 max-w-sm w-full relative"
            >
              <button 
                onClick={() => setErrorPopup(null)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-white"
              >
                <X size={20} />
              </button>
              <div className="flex flex-col items-center text-center mt-2">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4 text-red-400">
                  <AlertCircle size={24} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">❌ Creation Failed</h3>
                <p className="text-sm text-neutral-400 mb-6">
                  {errorPopup}
                </p>
                <button
                  onClick={() => setErrorPopup(null)}
                  className="w-full py-3 bg-neutral-800 text-white border border-white/10 rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-neutral-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
