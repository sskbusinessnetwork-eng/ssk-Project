import React, { useState, useEffect } from 'react';
import bcrypt from 'bcryptjs';
import { Building, MapPin, CheckCircle2, User, Phone, Mail, MessageCircle, AlertCircle, X, Calendar } from 'lucide-react';
import { useAuth } from "../hooks/useAuth";
import { normalizePhoneNumber } from '../utils/phoneUtils';
import { supabase } from '../lib/supabaseClient';
import { subscriptionService } from '../services/subscriptionService';
import { motion, AnimatePresence } from 'framer-motion';

interface LeaderForm {
  userId?: string;
  fullName: string;
  mobile: string;
  whatsapp: string;
  email: string;
  subscriptionStart: string;
  subscriptionEnd: string;
}

const createEmptyLeader = (): LeaderForm => {
  return {
    userId: '',
    fullName: '',
    mobile: '',
    whatsapp: '',
    email: '',
    subscriptionStart: '',
    subscriptionEnd: '',
  };
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const formatDateForStorage = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.trim().split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

const formatDateForInput = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.trim().split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return dateStr;
    }
    if (parts[2].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }
  return dateStr;
};

export function CreateChapter({ onSuccess, editChapterId }: { onSuccess?: () => void, editChapterId?: string }) {
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

  useEffect(() => {
    if (editChapterId) {
      setLoading(true);
      const fetchChapter = async () => {
        try {
          const { data: chapterData, error: chErr } = await supabase
            .from('chapters')
            .select('*')
            .eq('id', editChapterId)
            .single();

          if (chErr) {
            console.error("Error fetching chapter for edit:", chErr);
          }

          if (chapterData) {
            setFormData({
              chapter_name: chapterData.chapter_name || '',
              meeting_venue: chapterData.meeting_venue || '',
            });
          }

          const { data: usersData, error: usersErr } = await supabase
            .from('users')
            .select('*')
            .eq('chapter_id', editChapterId)
            .in('position', ['chapter_admin', 'president', 'vice_president', 'treasurer']);

          if (usersErr) {
            console.error("Error fetching chapter leadership users:", usersErr);
          }

          if (usersData) {
            setLeaders(prev => {
              const newLeaders = { ...prev };
              usersData.forEach(u => {
                const pos = u.position as keyof typeof newLeaders;
                if (newLeaders[pos]) {
                  const startVal = u.subscriptionStartDate || u.subscriptionStart || u.subscription_start_date || u.subscription_start || '';
                  const endVal = u.subscriptionEndDate || u.subscriptionEnd || u.subscription_end_date || u.subscription_end || '';
                  newLeaders[pos] = {
                    userId: u.id || u.uid || '',
                    fullName: u.name || u.displayName || '',
                    mobile: u.phone || '',
                    whatsapp: u.whatsapp_number || u.whatsapp || u.whatsappNumber || '',
                    email: u.email || '',
                    subscriptionStart: formatDateForInput(startVal),
                    subscriptionEnd: formatDateForInput(endVal),
                  };
                }
              });
              return newLeaders;
            });
          }
        } catch (err) {
          console.error("Error loading chapter data for edit:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchChapter();
    }
  }, [editChapterId]);

  const handleLeaderChange = (pos: keyof typeof leaders, field: keyof LeaderForm, value: string) => {
    setLeaders(prev => ({
      ...prev,
      [pos]: { ...prev[pos], [field]: value }
    }));
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

      if (!l.subscriptionStart || !l.subscriptionStart.trim()) {
        newErrors[`${String(pos)}_subscriptionStart`] = "Subscription Start Date is required.";
      }
      if (!l.subscriptionEnd || !l.subscriptionEnd.trim()) {
        newErrors[`${String(pos)}_subscriptionEnd`] = "Subscription End Date is required.";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const hasDateErrors = Object.keys(newErrors).some(k => k.includes('_subscriptionStart') || k.includes('_subscriptionEnd'));
      if (hasDateErrors) {
        setErrorPopup("Subscription Start Date and Subscription End Date are required for all leadership members.");
      } else {
        setErrorPopup("Please fill in all required fields correctly.");
      }
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
      if (editChapterId) {
        // EDIT MODE
        // 1. Check if another chapter has this name
        const { data: nameCheck } = await supabase
          .from('chapters')
          .select('id')
          .ilike('chapter_name', formData.chapter_name.trim())
          .neq('id', editChapterId)
          .limit(1);

        if (nameCheck && nameCheck.length > 0) {
          newErrors.chapter_name = "A chapter with this name already exists. Please choose a different chapter name.";
          setErrors(newErrors);
          setErrorPopup("A chapter with this name already exists. Please choose a different chapter name.");
          setLoading(false);
          return;
        }

        // 2. Update chapter details
        const { error: chUpdateErr } = await supabase
          .from('chapters')
          .update({
            chapter_name: formData.chapter_name.trim(),
            meeting_venue: formData.meeting_venue.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', editChapterId);

        if (chUpdateErr) {
          console.error("Failed to update chapter details:", chUpdateErr);
          setErrorPopup("Failed to save subscription dates. Please try again.");
          setLoading(false);
          return;
        }

        // 3. Update leadership users
        for (const pos of positions) {
          const leader = leaders[pos];
          const phone = normalizePhoneNumber(leader.mobile);
          const startDateFormatted = formatDateForStorage(leader.subscriptionStart);
          const endDateFormatted = formatDateForStorage(leader.subscriptionEnd);

          let chapterPosVal = 'MEMBER';
          if (pos === 'chapter_admin') chapterPosVal = 'CHAPTER_ADMIN';
          else if (pos === 'president') chapterPosVal = 'PRESIDENT';
          else if (pos === 'vice_president') chapterPosVal = 'VICE_PRESIDENT';
          else if (pos === 'treasurer') chapterPosVal = 'TREASURER';

          const userRole = pos === 'chapter_admin' ? 'CHAPTER_ADMIN' : 'MEMBER';

          const posTitleMap: Record<string, string> = {
            chapter_admin: 'Chapter Admin',
            president: 'President',
            vice_president: 'Vice President',
            treasurer: 'Treasurer'
          };

          let targetUid = leader.userId || '';

          if (leader.userId) {
            const userUpdatePayload = {
              name: leader.fullName.trim(),
              phone: phone,
              whatsapp_number: leader.whatsapp.trim() || phone,
              email: leader.email.trim() || null,
              subscriptionStartDate: startDateFormatted,
              subscriptionStart: startDateFormatted,
              subscriptionEndDate: endDateFormatted,
              subscriptionEnd: endDateFormatted,
              subscription_start: startDateFormatted,
              subscription_end: endDateFormatted,
              updated_at: new Date().toISOString()
            };

            const { error: uErr } = await supabase
              .from('users')
              .update(userUpdatePayload)
              .eq('id', leader.userId);

            if (uErr) {
              console.error(`Failed to update subscription dates for position ${pos} (user ${leader.userId}):`, uErr);
              setErrorPopup(uErr.message || "Failed to save subscription dates. Please try again.");
              setLoading(false);
              return;
            }
          } else {
            // Find user by phone or create new ID
            const { data: existingUsers } = await supabase.from('users').select('id').eq('phone', phone).limit(1);
            targetUid = existingUsers && existingUsers.length > 0 ? existingUsers[0].id : generateId();

            const userUpsertPayload = {
              id: targetUid,
              uid: targetUid,
              name: leader.fullName.trim(),
              phone: phone,
              whatsapp_number: leader.whatsapp.trim() || phone,
              email: leader.email.trim() || null,
              role: userRole,
              chapter_position: chapterPosVal,
              chapter_id: editChapterId,
              chapter_name: formData.chapter_name.trim(),
              position: pos,
              subscriptionStartDate: startDateFormatted,
              subscriptionStart: startDateFormatted,
              subscriptionEndDate: endDateFormatted,
              subscriptionEnd: endDateFormatted,
              subscription_start: startDateFormatted,
              subscription_end: endDateFormatted,
              subscriptionStatus: 'Active',
              updated_at: new Date().toISOString()
            };

            const { error: upsertErr } = await supabase.from('users').upsert(userUpsertPayload, { onConflict: 'id' });
            if (upsertErr) {
              console.error(`Failed to save subscription dates for ${pos}:`, upsertErr);
              setErrorPopup(upsertErr.message || "Failed to save subscription dates. Please try again.");
              setLoading(false);
              return;
            }
          }

          // Save to member_subscriptions table
          if (targetUid) {
            await subscriptionService.upsertSubscription({
              user_id: targetUid,
              member_name: leader.fullName.trim(),
              chapter_id: editChapterId,
              chapter_name: formData.chapter_name.trim(),
              position_name: posTitleMap[pos] || pos,
              subscription_start: startDateFormatted,
              subscription_end: endDateFormatted,
              membership_status: 'Active',
              account_status: 'Active',
              created_by: user?.id || user?.uid || null
            });
          }
        }

        setSuccessPopup(true);
        window.dispatchEvent(new Event('dashboard-refresh'));
        window.dispatchEvent(new CustomEvent('users-updated'));
        setLoading(false);
        return;
      }

      // CREATE MODE
      // 0. Check for existing chapter name
      const { data: existingChapter, error: chapterCheckError } = await supabase
        .from('chapters')
        .select('id')
        .ilike('chapter_name', formData.chapter_name.trim())
        .limit(1);

      if (chapterCheckError) {
        console.error("Chapter check error:", chapterCheckError);
      }

      if (existingChapter && existingChapter.length > 0) {
        newErrors.chapter_name = "A chapter with this name already exists. Please choose a different chapter name.";
        setErrors(newErrors);
        setErrorPopup("A chapter with this name already exists. Please choose a different chapter name.");
        setLoading(false);
        return;
      }

      // 1. Check for existing users with these phone numbers
      for (const pos of positions) {
        const phone = normalizePhoneNumber(leaders[pos].mobile);
        const { data: existing, error: checkError } = await supabase.from('users').select('id').eq('phone', phone).limit(1);
        if (checkError) {
          console.error("User check error:", checkError);
          setErrorPopup(checkError.message || "Failed to save subscription dates. Please try again.");
          setLoading(false);
          return;
        }
        if (existing && existing.length > 0) {
          newErrors[`${String(pos)}_mobile`] = "This phone number is already registered. Please use a different phone number.";
          setErrors(newErrors);
          setErrorPopup("This phone number is already registered. Please use a different phone number.");
          setLoading(false);
          return;
        }
      }

      const chapterId = generateId();
      const leaderUIDs = {
        chapter_admin: generateId(),
        president: generateId(),
        vice_president: generateId(),
        treasurer: generateId(),
      };

      // 2. Create chapter
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
        console.error("Chapter insert error:", chapterError);
        setErrorPopup(chapterError.message || "Failed to save subscription dates. Please try again.");
        setLoading(false);
        return;
      }

      let createdUsers: string[] = [];

      try {
        // 3. Create leadership users
        for (const pos of positions) {
          const leader = leaders[pos];
          const phone = normalizePhoneNumber(leader.mobile);
          const uid = leaderUIDs[pos];
          const defaultPassword = 'Welcometosskbusiness';
          createdUsers.push(uid);

          const startDateISO = formatDateForStorage(leader.subscriptionStart);
          const endDateISO = formatDateForStorage(leader.subscriptionEnd);

          let chapterPosVal = 'MEMBER';
          if (pos === 'chapter_admin') chapterPosVal = 'CHAPTER_ADMIN';
          else if (pos === 'president') chapterPosVal = 'PRESIDENT';
          else if (pos === 'vice_president') chapterPosVal = 'VICE_PRESIDENT';
          else if (pos === 'treasurer') chapterPosVal = 'TREASURER';

          const userRole = pos === 'chapter_admin' ? 'CHAPTER_ADMIN' : 'MEMBER';

          const userPayload = {
            id: uid,
            uid: uid,
            name: leader.fullName.trim(),
            phone: phone,
            whatsapp_number: leader.whatsapp.trim() || phone,
            email: leader.email.trim() || null,
            password: bcrypt.hashSync(defaultPassword, 10),
            role: userRole,
            chapter_position: chapterPosVal,
            created_by_role: 'MASTER_ADMIN',
            status: 'ACTIVE',
            membershipStatus: 'ACTIVE',
            membership_status: 'ACTIVE',
            account_status: 'ACTIVE',
            chapter_id: chapterId,
            chapter_name: formData.chapter_name.trim(),
            position: pos,
            must_change_password: true,
            subscriptionStartDate: startDateISO,
            subscriptionStart: startDateISO,
            subscriptionEndDate: endDateISO,
            subscriptionEnd: endDateISO,
            subscription_start: startDateISO,
            subscription_end: endDateISO,
            subscriptionStatus: 'Active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { error: userInsertErr } = await supabase.from('users').insert(userPayload);
          if (userInsertErr) {
            console.error(`User insert error for position ${pos}:`, userInsertErr);
            throw new Error(userInsertErr.message || "Failed to save subscription dates. Please try again.");
          }

          // Save subscription record to member_subscriptions table
          const posTitleMap: Record<string, string> = {
            chapter_admin: 'Chapter Admin',
            president: 'President',
            vice_president: 'Vice President',
            treasurer: 'Treasurer'
          };

          const { error: subInsertErr } = await subscriptionService.upsertSubscription({
            user_id: uid,
            member_name: leader.fullName.trim(),
            chapter_id: chapterId,
            chapter_name: formData.chapter_name.trim(),
            position_name: posTitleMap[pos] || pos,
            subscription_start: startDateISO,
            subscription_end: endDateISO,
            membership_status: 'Active',
            account_status: 'Active',
            created_by: user?.id || user?.uid || null
          });

          if (subInsertErr && subInsertErr.code !== 'PGRST205') {
            console.error(`Subscription insert error for position ${pos}:`, subInsertErr);
            throw new Error(subInsertErr.message || "Failed to save subscription details. Please try again.");
          }
        }

        // 4. Update chapter with the leader user IDs
        const { error: chapterUpdateError } = await supabase.from('chapters').update({
          chapter_admin_id: leaderUIDs.chapter_admin,
          president_id: leaderUIDs.president,
          vice_president_id: leaderUIDs.vice_president,
          treasurer_id: leaderUIDs.treasurer,
        }).eq('id', chapterId);
        
        if (chapterUpdateError) {
          console.error("Chapter link error:", chapterUpdateError);
          throw new Error(`Unable to link members to the chapter: ${chapterUpdateError.message}`);
        }

        setSuccessPopup(true);
        window.dispatchEvent(new Event('dashboard-refresh'));
        window.dispatchEvent(new CustomEvent('users-updated'));
        
      } catch (insertError: any) {
        console.error("Creation sub-step error:", insertError);
        await supabase.from('chapters').delete().eq('id', chapterId);
        if (createdUsers.length > 0) {
           await supabase.from('users').delete().in('id', createdUsers);
        }
        setErrorPopup("Failed to save subscription dates. Please try again.");
      }
    } catch (err: any) {
      console.error("Chapter creation error:", err);
      setErrorPopup("Failed to save subscription dates. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderLeaderForm = (title: string, pos: keyof typeof leaders) => (
    <div className="bg-[#0F172A]/50 border border-white/[0.05] rounded-xl p-5 space-y-4" key={pos}>
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
      <h2 className="text-xl font-bold text-white mb-6">
        {editChapterId ? 'Edit Chapter' : 'Create New Chapter'}
      </h2>
      
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
          <p className="text-xs text-neutral-400 mb-2">Configure the 4 primary leadership accounts and subscription dates for this chapter.</p>
          
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
            {loading 
              ? (editChapterId ? 'Updating Chapter...' : 'Creating Chapter...') 
              : (editChapterId ? 'Update Chapter' : 'Create Chapter')}
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
                <h3 className="text-lg font-bold text-white mb-2">
                  {editChapterId ? '✅ Chapter Updated Successfully' : '✅ Chapter Created Successfully'}
                </h3>
                <p className="text-sm text-neutral-400 mb-6">
                  {editChapterId 
                    ? 'The chapter and all leadership members have been updated successfully.'
                    : 'The chapter and all leadership members have been created successfully.'}
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
                <h3 className="text-lg font-bold text-white mb-2">
                  {editChapterId ? '❌ Update Failed' : '❌ Creation Failed'}
                </h3>
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

