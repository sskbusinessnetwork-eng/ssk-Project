import { supabase } from '../lib/supabaseClient';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { CategorySelect } from '../components/CategorySelect';
import { 
  Plus, 
  UserPlus, 
  MessageSquare, 
  Calendar,
  Eye,
  AlertCircle,
  CheckCircle2,
  Phone,
  PhoneCall
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { databaseService } from '../services/databaseService';
import { Category } from '../types';
import { Modal } from '../components/Modal';
import { isValid } from 'date-fns';
import { safeFormat as format } from '../utils/dateUtils';
import { db } from '../lib/database';
import { normalizePhoneNumber, normalizePhoneDigits, isSamePhoneNumber } from '../utils/phoneUtils';
import { cn } from '../lib/utils';
import { showError, showSuccess as triggerSuccessToast, scrollToError } from '../services/toastService';

export function Guests() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  
  const [invitations, setInvitations] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [matchedMember, setMatchedMember] = useState<{ name: string; position: string; phone: string } | null>(null);
  const [duplicateMeetingError, setDuplicateMeetingError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    const action = searchParams.get('action');
    const openModal = searchParams.get('openModal');
    if (action === 'new' || openModal === 'true') {
      setIsModalOpen(true);
    }
  }, [searchParams]);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    guestName: '',
    guestPhone: '',
    guestWhatsapp: '',
    guestBusiness: '',
    meetingId: ''
  });

  const getFormattedRole = (user: any): string => {
    const pos = user.position ? String(user.position).trim() : (user.chapter_position ? String(user.chapter_position).trim() : '');
    if (pos) {
      const pLower = pos.toLowerCase();
      if (pLower === 'president') return 'President';
      if (pLower === 'vice_president' || pLower === 'vice president') return 'Vice President';
      if (pLower === 'treasurer') return 'Treasurer';
      if (pLower === 'secretary') return 'Secretary';
      if (pLower === 'chapter_admin' || pLower === 'chapter admin') return 'Chapter Admin';
      if (pLower === 'member') return 'Member';
      return pos.split(/[\s_]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
    if (user.role === 'CHAPTER_ADMIN') return 'Chapter Admin';
    if (user.role === 'MASTER_ADMIN') return 'Master Admin';
    return 'Member';
  };

  const validatePhone = (phoneInput: string, meetingIdInput?: string, userList?: any[], invList?: any[]) => {
    const users = userList || allUsers;
    const invs = invList || invitations;
    const digits = normalizePhoneDigits(phoneInput);

    if (!phoneInput || digits.length < 10) {
      setMatchedMember(null);
      setDuplicateMeetingError(null);
      return null;
    }

    // 1. Check if phone matches any registered Member, Chapter Admin, President, VP, Treasurer, Secretary, Position Holder
    for (const u of users) {
      const userPhones: any[] = [
        u.phone,
        u.mobile,
        u.phoneNumber,
        u.phone_number,
        u.whatsapp,
        u.whatsapp_number,
        u.contactPhone
      ];
      if (u.profile_photo && typeof u.profile_photo === 'string' && u.profile_photo.includes('|||')) {
        try {
          const extra = JSON.parse(u.profile_photo.split('|||')[1] || '{}');
          if (extra.phone) userPhones.push(extra.phone);
          if (extra.mobile) userPhones.push(extra.mobile);
          if (extra.whatsapp) userPhones.push(extra.whatsapp);
        } catch (e) {}
      }

      const isMatch = userPhones.some(p => isSamePhoneNumber(p, phoneInput));
      if (isMatch) {
        const mName = u.name || u.full_name || u.displayName || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Member';
        const mPos = getFormattedRole(u);
        const memberInfo = { name: mName, position: mPos, phone: phoneInput };
        setMatchedMember(memberInfo);
        setDuplicateMeetingError(null);
        return { type: 'MEMBER_EXISTS', member: memberInfo };
      }
    }
    setMatchedMember(null);

    // 2. Check if already invited for the selected meeting
    const targetMeetingId = meetingIdInput || formData.meetingId;
    if (targetMeetingId && invs && invs.length > 0) {
      const isDup = invs.some((inv: any) => 
        (inv.meeting_id === targetMeetingId || inv.meetingId === targetMeetingId) &&
        (isSamePhoneNumber(inv.guest_phone, phoneInput) || isSamePhoneNumber(inv.guest_whatsapp, phoneInput) || isSamePhoneNumber(inv.phone, phoneInput))
      );
      if (isDup) {
        const dupMsg = "This guest has already been invited to this meeting.";
        setDuplicateMeetingError(dupMsg);
        return { type: 'DUPLICATE_GUEST', message: dupMsg };
      }
    }
    setDuplicateMeetingError(null);
    return null;
  };

  const fetchInitialData = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      // 1. Fetch Categories
      const { data: cats } = await supabase.from('categories').select('id, name').order('name');
      if (cats) {
        setCategories(cats as unknown as Category[]);
      }
      
      const userId = profile.id || profile.uid;
      const userChapterId = profile.chapter_id || (profile as any).chapterId;
      const isChapterAdmin = profile.role === 'CHAPTER_ADMIN' || profile.position === 'chapter_admin' || profile.role === 'MASTER_ADMIN';

      // 2. Fetch Directory of Users / Members for validation
      let fetchedUsers: any[] = [];
      try {
        const { data: uData } = await supabase.from('users').select('*');
        if (uData) {
          fetchedUsers = uData;
          setAllUsers(uData);
        }
      } catch (uErr) {
        console.warn("User directory fetch notice:", uErr);
      }

      // 3. Fetch Upcoming Meetings for user's chapter
      if (userChapterId) {
        const todayStr = new Date().toISOString().split('T')[0];
        const { data: fetchedMeetings } = await supabase
          .from('meetings')
          .select('*')
          .eq('chapter_id', userChapterId)
          .gte('date', todayStr)
          .neq('status', 'Completed')
          .neq('status', 'COMPLETED')
          .neq('status', 'Completed ')
          .neq('status', 'Cancelled')
          .neq('status', 'CANCELLED')
          .order('date', { ascending: true });
        
        if (fetchedMeetings) {
          const activeMeetings = fetchedMeetings.filter((m: any) => {
            const s = String(m.status || '').trim().toUpperCase();
            if (s === 'COMPLETED' || s === 'CANCELLED') return false;
            if (m.isCompleted === true || m.isCompleted === 'true' || m.is_completed === true || m.is_completed === 'true') return false;
            if (m.isCancelled === true || m.isCancelled === 'true' || m.is_cancelled === true || m.is_cancelled === 'true') return false;
            return true;
          });
          setUpcomingMeetings(activeMeetings);
        }
      }
      
      // 4. Fetch Guest Invitations History
      let invsQuery = supabase.from('guest_invitations').select('*');
      if (profile.role === 'MASTER_ADMIN') {
        // Master Admin sees all in system view
      } else {
        // Members, Chapter Admins, Position Holders only see their own invited guests on their personal page
        invsQuery = invsQuery.or(`invited_by.eq.${userId},invited_by_user_id.eq.${userId},created_by.eq.${userId}`);
      }

      const { data: invs } = await invsQuery.order('created_at', { ascending: false });
      let combinedInvs = invs ? [...invs] : [];

      // Check fallback invitations in user profile photo extra JSON
      if (profile) {
        const photo = profile.profile_photo || '';
        if (photo.includes('|||')) {
          try {
            const extra = JSON.parse(photo.split('|||')[1] || '{}');
            if (extra.guest_invitations && Array.isArray(extra.guest_invitations)) {
              const existingIds = new Set(combinedInvs.map((i: any) => i.id));
              for (const extraInv of extra.guest_invitations) {
                if (!existingIds.has(extraInv.id) && (profile.role === 'MASTER_ADMIN' || extraInv.invited_by === userId || extraInv.invited_by_user_id === userId || extraInv.created_by === userId)) {
                  combinedInvs.push(extraInv);
                }
              }
            }
          } catch (e) {}
        }
      }

      setInvitations(combinedInvs);
      
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    // Validation
    if (!formData.guestName || !formData.guestPhone || !formData.guestWhatsapp || !formData.guestBusiness || !formData.meetingId) {
      const msg = "Please fill all required fields.";
      setError(msg);
      showError(msg);
      scrollToError();
      return;
    }

    if (profile.role === 'MASTER_ADMIN') {
      const msg = "Master Admin cannot invite guests.";
      setError(msg);
      showError(msg);
      scrollToError();
      return;
    }

    // Run phone validation
    const valResult = validatePhone(formData.guestPhone, formData.meetingId);
    if (valResult?.type === 'MEMBER_EXISTS') {
      const msg = `${valResult.member.name} is already a member (${valResult.member.position}) and cannot be added as a guest.`;
      setError(msg);
      showError(msg);
      scrollToError();
      return;
    }
    if (valResult?.type === 'DUPLICATE_GUEST') {
      const msg = "This guest has already been invited to this meeting.";
      setError(msg);
      showError(msg);
      scrollToError();
      return;
    }

    const userId = profile.id || profile.uid;
    const userChapterId = profile.chapter_id || (profile as any).chapterId;

    if (!userChapterId) {
      const msg = "You must belong to a chapter to invite guests.";
      setError(msg);
      showError(msg);
      scrollToError();
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const selectedMeeting = upcomingMeetings.find(m => m.id === formData.meetingId);
      if (!selectedMeeting) throw new Error("Please select a valid meeting.");

      if (selectedMeeting.chapter_id && userChapterId && String(selectedMeeting.chapter_id).trim() !== String(userChapterId).trim()) {
        throw new Error("You can only invite guests to meetings belonging to your own chapter.");
      }

      // Fetch dynamic Chapter Name
      let resolvedChapterName = profile.chapter_name || (profile as any).chapterName || selectedMeeting.chapter_name || selectedMeeting.chapterName || '';

      if (!resolvedChapterName && userChapterId) {
        const { data: chapDoc } = await supabase
          .from('chapters')
          .select('chapter_name')
          .eq('id', userChapterId)
          .maybeSingle();
        if (chapDoc?.chapter_name) {
          resolvedChapterName = chapDoc.chapter_name;
        }
      }

      if (!resolvedChapterName) {
        resolvedChapterName = 'SSK Business Network';
      }

      const invitedByName = profile.name || profile.full_name || (profile as any).fullName || 'Member';
      const invitedByRole = getFormattedRole(profile);

      const newInvitation = {
        invited_by: userId,
        invited_by_user_id: userId,
        created_by: userId,
        invited_by_name: invitedByName,
        invited_by_role: invitedByRole,
        chapter_id: userChapterId || selectedMeeting.chapter_id,
        invited_by_chapter: userChapterId || selectedMeeting.chapter_id,
        chapter_name: resolvedChapterName,
        guest_name: formData.guestName,
        guest_phone: formData.guestPhone,
        guest_whatsapp: formData.guestWhatsapp,
        business_category: formData.guestBusiness,
        meeting_id: selectedMeeting.id,
        meeting_title: selectedMeeting.title || 'Weekly Chapter Meeting',
        meeting_date: selectedMeeting.date,
        meeting_time: selectedMeeting.time || '10:00 AM',
        venue: selectedMeeting.venue || selectedMeeting.location || 'SSK Business Hall',
        status: 'Pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Call Backend API first for authoritative server validation
      let resData: any = null;
      let resStatus = 200;
      try {
        const res = await fetch('/api/guests/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newInvitation,
            callerId: userId
          })
        });
        resStatus = res.status;
        const text = await res.text();
        try {
          resData = text ? JSON.parse(text) : null;
        } catch (pErr) {
          console.warn("Raw response text from /api/guests/invite was not JSON:", text);
        }
      } catch (fetchErr) {
        console.warn("Fetch error for /api/guests/invite:", fetchErr);
      }

      if (resStatus === 409 || resData?.error === 'MEMBER_CANNOT_BE_GUEST') {
        const errMemberName = resData?.memberName || formData.guestName;
        const errMemberPos = resData?.memberPosition || 'Member';
        setMatchedMember({ name: errMemberName, position: errMemberPos, phone: formData.guestPhone });
        const errorMsg = resData?.message || `${errMemberName} is already a member (${errMemberPos}) and cannot be added as a guest.`;
        setError(errorMsg);
        showError(errorMsg);
        scrollToError();
        return;
      }

      if (resStatus === 409 || resData?.error === 'GUEST_ALREADY_INVITED') {
        const dupMsg = resData?.message || "This guest has already been invited to this meeting.";
        setDuplicateMeetingError(dupMsg);
        setError(dupMsg);
        showError(dupMsg);
        scrollToError();
        return;
      }

      if (!resData || !resData.success) {
        const failedMsg = resData?.error || resData?.message || "Failed to send guest invitation. Please check the details.";
        showError(failedMsg);
        scrollToError();
        throw new Error(failedMsg);
      }

      // Refresh list
      fetchInitialData();
      triggerSuccessToast("Guest invited successfully!");

      const venue = selectedMeeting.venue || selectedMeeting.location || 'SSK Business Hall';
      const locationLink = selectedMeeting.location_link || selectedMeeting.locationLink || selectedMeeting.location_url || (selectedMeeting.location && selectedMeeting.location.startsWith('http') ? selectedMeeting.location : '') || selectedMeeting.location || 'N/A';

      // WhatsApp sharing logic
      const message = `Hello *${formData.guestName}*,

You are warmly invited to attend the *SSK Business Network – ${resolvedChapterName}* Chapter Meeting.

📅 Date: ${selectedMeeting.date}
🕙 Time: ${selectedMeeting.time || '10:00 AM'}
📍 Venue: ${venue}
📍 Location: ${locationLink}

We would be delighted to have you join us to connect with local business professionals, build relationships, and explore new business opportunities.

Looking forward to seeing you.

Regards,
${invitedByName} (${invitedByRole})
${resolvedChapterName} Chapter
SSK Business Network`;
      
      const waUrl = `https://wa.me/${normalizePhoneNumber(formData.guestWhatsapp)}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');
      
      setShowSuccess(true);
      setFormData({
        guestName: '',
        guestPhone: '',
        guestWhatsapp: '',
        guestBusiness: '',
        meetingId: ''
      });
      setMatchedMember(null);
      setDuplicateMeetingError(null);
      
      // Broadcast events so Growth Score, My Analytics, Chapter Analytics, and My Chapter Report update instantly
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));
      window.dispatchEvent(new CustomEvent('profile-updated'));
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      const errMsg = error.message || "Failed to send invitation. Please try again.";
      setError(errMsg);
      showError(errMsg);
      scrollToError();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3 sm:px-6 lg:px-6 py-4 md:py-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Guest Invitations</h1>
          <p className="text-sm text-neutral-400 mt-1">Invite and track your guests to upcoming chapter meetings.</p>
        </div>
        {profile?.role !== 'MASTER_ADMIN' && (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                setIsModalOpen(true);
                setShowSuccess(false);
              }}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-[12px] font-bold uppercase tracking-widest hover:bg-primary/90 transition-all text-xs"
            >
              <Plus size={16} />
              <span>Invite a New Guest</span>
            </button>
          </div>
        )}
      </header>

      {/* Guest Invitation History */}
      <div className="bg-[#111827] rounded-[16px] border border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-lg font-bold text-white">Guest Invitation History</h2>
        </div>
        
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : invitations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {invitations.map((inv) => {
              const statusLabel = inv.status || 'Upcoming';
              return (
                <div
                  key={inv.id}
                  onClick={() => {
                    setSelectedGuest(inv);
                    setIsDetailModalOpen(true);
                  }}
                  className="p-4 bg-[#111827] rounded-xl border border-white/5 hover:border-white/10 transition-all cursor-pointer group flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white uppercase tracking-tight truncate group-hover:text-primary transition-colors">
                        {inv.guest_name}
                      </h4>
                      <p className="text-[11px] text-neutral-400 font-medium mt-0.5 truncate uppercase tracking-wider">
                        Guest • {statusLabel.toLowerCase().includes('attended') ? 'Attended' : 'Visitor'}
                      </p>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shrink-0",
                      statusLabel.toLowerCase().includes('attended') 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    )}>
                      {statusLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1 pt-2 border-t border-white/5">
                    <span className="text-[10px] text-neutral-500 font-medium">
                      {inv.createdAt ? format(new Date(inv.createdAt), 'dd MMM yyyy') : 'Date N/A'}
                    </span>
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-primary/10 hover:bg-primary/20 transition-colors px-2 py-1 rounded-md">
                      VIEW
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-[#151C2E] rounded-full flex items-center justify-center mb-4 border border-white/5">
              <UserPlus size={24} className="text-neutral-500" />
            </div>
            <p className="text-neutral-400 font-medium">No guests invited yet.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 text-primary text-sm font-bold uppercase tracking-widest hover:underline"
            >
              Invite Your First Guest
            </button>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsModalOpen(false);
            setShowSuccess(false);
          }
        }}
        title="Invite a New Guest"
      >
        {showSuccess ? (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 border border-emerald-500/20">
              <CheckCircle2 size={32} className="text-emerald-500" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Invitation Sent!</h3>
            <p className="text-neutral-400 mb-8 max-w-sm">
              The invitation has been saved and WhatsApp has been opened for sharing.
            </p>
            <button
              onClick={() => {
                setShowSuccess(false);
                setIsModalOpen(false);
              }}
              className="w-full py-4 bg-[#151C2E] text-white rounded-[12px] font-bold hover:bg-[#1C2538] transition-all border border-white/5 uppercase tracking-widest text-xs"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && !matchedMember && !duplicateMeetingError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-[12px] flex items-start gap-3">
                <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-red-400 font-medium">{error}</p>
              </div>
            )}

            {matchedMember && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-[12px] space-y-2">
                <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                  <AlertCircle size={18} className="shrink-0" />
                  <span>Already a Member</span>
                </div>
                <div className="text-xs text-neutral-300 space-y-1.5 pl-6">
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-400">Name:</span>
                    <span className="font-bold text-white">{matchedMember.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-400">Position:</span>
                    <span className="font-semibold text-primary">{matchedMember.position}</span>
                  </div>
                  <p className="text-red-400 font-medium pt-1">
                    {matchedMember.name} is already a member ({matchedMember.position}) and cannot be added as a guest.
                  </p>
                </div>
              </div>
            )}

            {duplicateMeetingError && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-[12px] flex items-start gap-3">
                <AlertCircle className="text-amber-400 shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="text-sm text-amber-400 font-bold">Already Invited</p>
                  <p className="text-xs text-amber-300 mt-0.5">{duplicateMeetingError}</p>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Guest Name <span className="text-red-400">*</span></label>
              <input
                required
                type="text"
                value={formData.guestName}
                onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                placeholder="Enter guest name"
                className="w-full px-4 py-3 bg-[#151C2E] text-white border border-white/5 rounded-[12px] focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-neutral-600 font-medium text-sm"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Guest Phone <span className="text-red-400">*</span></label>
                  {matchedMember && (
                    <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Member Detected</span>
                  )}
                </div>
                <input
                  required
                  type="tel"
                  value={formData.guestPhone}
                  onChange={(e) => {
                    const val = e.target.value;
                    const prevPhone = formData.guestPhone;
                    setFormData(prev => ({
                      ...prev,
                      guestPhone: val,
                      guestWhatsapp: prev.guestWhatsapp === '' || prev.guestWhatsapp === prevPhone ? val : prev.guestWhatsapp
                    }));
                    validatePhone(val, formData.meetingId);
                  }}
                  onBlur={() => {
                    validatePhone(formData.guestPhone, formData.meetingId);
                  }}
                  placeholder="e.g. +91 9876543210"
                  className={cn(
                    "w-full px-4 py-3 bg-[#151C2E] text-white border rounded-[12px] outline-none transition-all placeholder:text-neutral-600 font-medium text-sm",
                    matchedMember 
                      ? "border-red-500/60 focus:ring-2 focus:ring-red-500" 
                      : duplicateMeetingError
                        ? "border-amber-500/60 focus:ring-2 focus:ring-amber-500"
                        : "border-white/5 focus:ring-2 focus:ring-primary"
                  )}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">WhatsApp Number <span className="text-red-400">*</span></label>
                <input
                  required
                  type="tel"
                  value={formData.guestWhatsapp}
                  onChange={(e) => setFormData({ ...formData, guestWhatsapp: e.target.value })}
                  placeholder="For invitation message"
                  className="w-full px-4 py-3 bg-[#151C2E] text-white border border-white/5 rounded-[12px] focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-neutral-600 font-medium text-sm"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Business Category <span className="text-red-400">*</span></label>
              <CategorySelect
                value={formData.guestBusiness}
                onChange={(val) => setFormData({ ...formData, guestBusiness: val })}
                categories={categories}
                placeholder="Select Category"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Meeting <span className="text-red-400">*</span></label>
              <select
                required
                value={formData.meetingId}
                onChange={(e) => {
                  const mId = e.target.value;
                  setFormData({ ...formData, meetingId: mId });
                  validatePhone(formData.guestPhone, mId);
                }}
                className="w-full px-4 py-3 bg-[#151C2E] text-white border border-white/5 rounded-[12px] focus:ring-2 focus:ring-primary outline-none transition-all font-medium text-sm"
              >
                <option value="" className="bg-[#111827] text-white">Select Upcoming Meeting</option>
                {upcomingMeetings.filter((m: any) => {
                  const s = String(m.status || '').trim().toUpperCase();
                  if (s === 'COMPLETED' || s === 'CANCELLED') return false;
                  if (m.isCompleted === true || m.isCompleted === 'true' || m.is_completed === true || m.is_completed === 'true') return false;
                  if (m.isCancelled === true || m.isCancelled === 'true' || m.is_cancelled === true || m.is_cancelled === 'true') return false;
                  return true;
                }).map((m) => (
                  <option key={m.id} value={m.id} className="bg-[#111827] text-white">
                    {m.title || 'Weekly Chapter Meeting'} - {format(new Date(m.date), 'dd MMM yyyy')} {m.time || '10:00 AM'} ({m.venue || m.location || 'SSK Business Hall'})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || Boolean(matchedMember) || Boolean(duplicateMeetingError)}
                className="w-full py-4 bg-primary text-white rounded-[12px] font-bold uppercase tracking-widest text-xs hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </form>
        )}
      </Modal>
      {/* Guest Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedGuest(null);
        }}
        title="Guest Details"
      >
        {selectedGuest && (
          <div className="space-y-4 text-xs text-neutral-300">
            <div className="p-4 bg-[#151C2E] rounded-[16px] border border-white/5 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Guest Name</p>
                  <p className="text-base font-bold text-white mt-0.5">{selectedGuest.guest_name}</p>
                </div>
                <span className="px-2.5 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10px] font-bold uppercase tracking-widest">
                  {selectedGuest.status || 'Upcoming'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Phone Number</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-sm font-semibold text-white">{selectedGuest.guest_phone}</p>
                    <a href={`tel:${selectedGuest.guest_phone}`} className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors" title="Call Guest">
                      <PhoneCall size={12} />
                    </a>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">WhatsApp Number</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-sm font-semibold text-white">{selectedGuest.guest_whatsapp}</p>
                    <a href={`https://wa.me/${normalizePhoneNumber(selectedGuest.guest_whatsapp)}`} target="_blank" rel="noopener noreferrer" className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors" title="WhatsApp Guest">
                      <MessageSquare size={12} />
                    </a>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Business Category</p>
                  <p className="text-xs font-semibold text-white mt-0.5">{selectedGuest.business_category || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Invited By</p>
                  <p className="text-xs font-semibold text-white mt-0.5">{selectedGuest.invited_by_name || selectedGuest.invited_by_user_name || (profile?.displayName || profile?.name || 'Member')}</p>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Meeting</p>
                  <p className="text-xs font-semibold text-white mt-0.5">{selectedGuest.meeting_title || 'Chapter Meeting'}</p>
                  {selectedGuest.meeting_date && (
                    <p className="text-[10px] text-neutral-400 mt-0.5">{format(new Date(selectedGuest.meeting_date), 'dd MMM yyyy')} at {selectedGuest.meeting_time || '07:30 AM'}</p>
                  )}
                </div>

                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Invited Date</p>
                  <p className="text-xs font-semibold text-white mt-0.5">{selectedGuest.created_at ? format(new Date(selectedGuest.created_at), 'dd MMM yyyy') : 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedGuest(null);
                }}
                className="w-full py-3 bg-[#151C2E] text-white border border-white/10 rounded-[12px] font-bold uppercase tracking-widest text-xs hover:bg-[#1C2538] transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
