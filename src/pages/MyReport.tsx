import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Activity, Trophy, Users, UserCheck, Building2, Filter } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import StatGrid from '../components/StatGrid';
import { calculateChapterGrowthScoreData, isDateInRange } from '../utils/growthScore';
import { cn } from '../lib/utils';
import { isMemberActive } from '../utils/memberStatus';
import { Modal } from '../components/Modal';
import { deduplicateSlips } from '../utils/deduplicateSlips';

export function MyReport() {
  const { profile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [allUsersList, setAllUsersList] = useState<any[]>([]);
  const [allReferrals, setAllReferrals] = useState<any[]>([]);
  const [allSlips, setAllSlips] = useState<any[]>([]);
  const [oneToOnes, setOneToOnes] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [guestInvitations, setGuestInvitations] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);

  // Filter state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [activeDateRange, setActiveDateRange] = useState<{ start: Date; end: Date } | null>(null);



  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const [usersRes, refsRes, slipsRes, o2oRes, meetRes, guestsRes, testRes] = await Promise.all([
          supabase.from('users').select('*'),
          supabase.from('referrals').select('*'),
          supabase.from('thank_you_slips').select('*'),
          supabase.from('one_to_one_meetings').select('*'),
          supabase.from('meetings').select('*'),
          supabase.from('guest_invitations').select('*'),
          supabase.from('testimonials').select('*')
        ]);

        if (isMounted) {
          setAllUsersList(usersRes.data || []);
          setAllReferrals(refsRes.data || []);
          const mappedSlips = (slipsRes.data || []).map((s: any) => {
            const from = String(s.from_user_id || s.fromUserId || s.submitted_by || '');
            const to = String(s.to_user_id || s.toUserId || (s.receiver_id && String(s.receiver_id) !== from ? s.receiver_id : (s.sender_id && String(s.sender_id) !== from ? s.sender_id : '')) || '');
            return {
              ...s,
              id: String(s.id),
              fromUserId: from,
              toUserId: to,
              businessValue: Number(s.business_value || s.businessValue || s.amount || 0)
            };
          });
          setAllSlips(deduplicateSlips(mappedSlips));
          setOneToOnes(o2oRes.data || []);
          setMeetings(meetRes.data || []);
          setGuestInvitations(guestsRes.data || []);
          setTestimonials(testRes.data || []);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, []);

  const handleApplyFilter = () => {
    if (filterStartDate && filterEndDate) {
      setActiveDateRange({
        start: new Date(filterStartDate),
        end: new Date(filterEndDate),
      });
    }
    setIsFilterModalOpen(false);
  };

  const handleClearFilter = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setActiveDateRange(null);
    setIsFilterModalOpen(false);
  };

  // Chapter Logic
  const userChapterId = profile?.chapter_id || profile?.chapterId || profile?.adminId;
  const rawChapterName = profile?.chapterName || profile?.chapter_name || 'My Chapter';

  const formattedChapterTitle = useMemo(() => {
    if (!rawChapterName) return 'CHAPTER REPORT';
    const cleanName = rawChapterName.trim();
    if (cleanName.toLowerCase() === 'my chapter') {
      return 'CHAPTER REPORT';
    }
    const upper = cleanName.toUpperCase();
    if (upper.endsWith('CHAPTER')) {
      return `${upper} REPORT`;
    }
    return `${upper} CHAPTER REPORT`;
  }, [rawChapterName]);

  const formattedChapterCardName = useMemo(() => {
    if (!rawChapterName) return 'MY CHAPTER';
    const cleanName = rawChapterName.trim();
    const upper = cleanName.toUpperCase();
    if (upper.endsWith('CHAPTER')) {
      return upper;
    }
    return `${upper} CHAPTER`;
  }, [rawChapterName]);

  const chapterUsers = useMemo(() => {
    return allUsersList.filter(u => {
      const isMaster = u.role === 'MASTER_ADMIN' || u.position === 'master_admin';
      if (isMaster) return false;
      return String(u.chapter_id || u.chapterId || u.adminId) === String(userChapterId);
    });
  }, [allUsersList, userChapterId]);

  const chapterGrowthScoreData = useMemo(() => {
    return calculateChapterGrowthScoreData({
      chapterMembers: chapterUsers,
      activeDateRange,
      allReferrals,
      oneToOnes,
      meetings,
      guestInvitations,
      currentProfile: profile,
      todayTasks: []
    });
  }, [chapterUsers, allReferrals, oneToOnes, meetings, guestInvitations, profile, activeDateRange]);

  const totalMembersCount = chapterUsers.filter(u => u.role !== 'MASTER_ADMIN').length;
  const activePartnersCount = chapterUsers.filter(u => u.role !== 'MASTER_ADMIN' && isMemberActive(u)).length;
  const inactiveMembersCount = chapterUsers.filter(u => u.role !== 'MASTER_ADMIN' && !isMemberActive(u)).length;

  // Filter lists by date
  const effectiveReferrals = useMemo(() => {
    if (!activeDateRange) return allReferrals;
    return allReferrals.filter(r => isDateInRange(r.created_at || r.createdAt, activeDateRange.start, activeDateRange.end));
  }, [allReferrals, activeDateRange]);

  const effectiveSlips = useMemo(() => {
    if (!activeDateRange) return allSlips;
    return allSlips.filter(s => isDateInRange(s.created_at || s.createdAt || s.date, activeDateRange.start, activeDateRange.end));
  }, [allSlips, activeDateRange]);
  
  const effectiveOneToOnes = useMemo(() => {
    if (!activeDateRange) return oneToOnes;
    return oneToOnes.filter(m => isDateInRange(m.created_at || m.createdAt || m.meeting_date, activeDateRange.start, activeDateRange.end));
  }, [oneToOnes, activeDateRange]);
  
  const effectiveMeetings = useMemo(() => {
    if (!activeDateRange) return meetings;
    return meetings.filter(m => isDateInRange(m.date || m.meeting_date || m.createdAt, activeDateRange.start, activeDateRange.end));
  }, [meetings, activeDateRange]);
  
  const effectiveGuests = useMemo(() => {
    if (!activeDateRange) return guestInvitations;
    return guestInvitations.filter(g => isDateInRange(g.visitDate || g.created_at || g.createdAt, activeDateRange.start, activeDateRange.end));
  }, [guestInvitations, activeDateRange]);

  const effectiveTestimonials = useMemo(() => {
    if (!activeDateRange) return testimonials;
    return testimonials.filter(t => isDateInRange(t.created_at || t.createdAt, activeDateRange.start, activeDateRange.end));
  }, [testimonials, activeDateRange]);


  const chapterReferrals = effectiveReferrals.filter(r => {
    const sender = chapterUsers.find(u => (u.id || u.uid) === (r.fromUserId || r.sender_id));
    const receiver = chapterUsers.find(u => (u.id || u.uid) === (r.toUserId || r.receiver_id));
    return (sender && String(sender.chapter_id || sender.chapterId) === String(userChapterId)) ||
           (receiver && String(receiver.chapter_id || receiver.chapterId) === String(userChapterId));
  });

  const chapterSlips = effectiveSlips.filter(s => {
    const sender = chapterUsers.find(u => (u.id || u.uid) === (s.fromUserId || s.from_user_id || s.submitted_by));
    const receiver = chapterUsers.find(u => (u.id || u.uid) === (s.toUserId || s.to_user_id));
    return (sender && String(sender.chapter_id || sender.chapterId) === String(userChapterId)) ||
           (receiver && String(receiver.chapter_id || receiver.chapterId) === String(userChapterId));
  });

  const referralsSentCount = chapterReferrals.filter(r => {
    const sender = chapterUsers.find(u => (u.id || u.uid) === (r.fromUserId || r.from_user_id || r.sender_id));
    return sender && String(sender.chapter_id || sender.chapterId) === String(userChapterId);
  }).length;

  const referralsReceivedCount = chapterReferrals.filter(r => {
    const receiver = chapterUsers.find(u => (u.id || u.uid) === (r.toUserId || r.to_user_id || r.receiver_id));
    return receiver && String(receiver.chapter_id || receiver.chapterId) === String(userChapterId);
  }).length;

  const businessSentTotal = chapterSlips.reduce((acc, s) => {
    const ref = chapterReferrals.find(r => String(r.id) === String(s.referralId || s.referral_id));
    const senderId = ref ? String(ref.fromUserId || ref.from_user_id) : String(s.toUserId || s.to_user_id);
    const sender = chapterUsers.find(u => String(u.id || u.uid) === senderId);
    if (sender && String(sender.chapter_id || sender.chapterId) === String(userChapterId)) {
      return acc + (Number(s.businessValue || s.amount) || 0);
    }
    return acc;
  }, 0);

  const businessReceivedTotal = chapterSlips.reduce((acc, s) => {
    const ref = chapterReferrals.find(r => String(r.id) === String(s.referralId || s.referral_id));
    const receiverId = ref ? String(ref.toUserId || ref.to_user_id) : String(s.fromUserId || s.from_user_id || s.submitted_by);
    const receiver = chapterUsers.find(u => String(u.id || u.uid) === receiverId);
    if (receiver && String(receiver.chapter_id || receiver.chapterId) === String(userChapterId)) {
      return acc + (Number(s.businessValue || s.amount) || 0);
    }
    return acc;
  }, 0);

  const businessSentCount = chapterSlips.filter(s => {
    const ref = chapterReferrals.find(r => String(r.id) === String(s.referralId || s.referral_id));
    const senderId = ref ? String(ref.fromUserId || ref.from_user_id) : String(s.toUserId || s.to_user_id);
    const sender = chapterUsers.find(u => String(u.id || u.uid) === senderId);
    return sender && String(sender.chapter_id || sender.chapterId) === String(userChapterId);
  }).length;

  const businessReceivedCount = chapterSlips.filter(s => {
    const ref = chapterReferrals.find(r => String(r.id) === String(s.referralId || s.referral_id));
    const receiverId = ref ? String(ref.toUserId || ref.to_user_id) : String(s.fromUserId || s.from_user_id || s.submitted_by);
    const receiver = chapterUsers.find(u => String(u.id || u.uid) === receiverId);
    return receiver && String(receiver.chapter_id || receiver.chapterId) === String(userChapterId);
  }).length;

  const chapterO2O = effectiveOneToOnes.filter(m => {
    const organizer = chapterUsers.find(u => (u.id || u.uid) === (m.organizer_id || m.creatorId));
    const part = chapterUsers.find(u => (u.id || u.uid) === m.member_id);
    return (organizer && String(organizer.chapter_id || organizer.chapterId) === String(userChapterId)) ||
           (part && String(part.chapter_id || part.chapterId) === String(userChapterId));
  });
  
  const oneToOneScheduledCount = chapterO2O.length;
  const oneToOneMeetingsCount = chapterO2O.filter(m => m.status === 'COMPLETED').length;

  const chapterMeetings = effectiveMeetings.filter(m => String(m.chapter_id || m.chapterId) === String(userChapterId));
  const meetingsCount = chapterMeetings.length;
  const meetingsAttendedCount = chapterMeetings.filter(m => m.status === 'COMPLETED' || m.isCompleted === true || (m.isCompleted as any) === 'true').length;
  const upcomingSyncsCount = chapterMeetings.filter(m => {
    const now = new Date();
    const mDate = new Date(m.date || m.meeting_date || m.createdAt);
    return mDate >= now && m.status !== 'COMPLETED';
  }).length;

  const chapterGuests = effectiveGuests.filter(g => {
    const inviter = chapterUsers.find(u => (u.id || u.uid) === (g.createdBy || g.memberId));
    return inviter && String(inviter.chapter_id || inviter.chapterId) === String(userChapterId);
  });
  const guestsInvitedCount = chapterGuests.length;
  const guestsJoinedCount = chapterGuests.filter(g => g.status === 'JOINED' || g.status === 'ATTENDED').length; // Added Joined metric
  
  const thankYouSlipsSentCount = businessReceivedCount;
  const thankYouSlipsReceivedCount = businessSentCount;

  const chapterTestimonials = effectiveTestimonials.filter(t => {
    const author = chapterUsers.find(u => (u.id || u.uid) === (t.authorMemberId || t.author_id));
    return author && String(author.chapter_id || author.chapterId) === String(userChapterId);
  });
  const testimonialsGivenCount = chapterTestimonials.length;
  
  const testimonialsReceivedCount = effectiveTestimonials.filter(t => {
    const rec = chapterUsers.find(u => (u.id || u.uid) === (t.receiverMemberId || t.receiver_id));
    return rec && String(rec.chapter_id || rec.chapterId) === String(userChapterId);
  }).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 bg-[#111827] rounded-[20px] border border-white/5 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#E53935]"></div>
        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.3em] animate-pulse">Syncing Chapter Telemetry...</p>
      </div>
    );
  }

  const scoreVal = Math.round(chapterGrowthScoreData.score);

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-8 pb-20 relative px-4 sm:px-6">
      {/* Top Header Section */}
      <div className="flex flex-col items-center text-center space-y-2 border-b border-white/5 pb-6">
        <div className="w-full flex justify-start">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-400 hover:text-white uppercase tracking-widest transition-colors mb-2">
            <ChevronLeft size={14} /> Back To Dashboard
          </Link>
        </div>

        <h1 className="text-lg sm:text-2xl md:text-3xl font-black text-white tracking-tight uppercase flex items-center justify-center gap-2 sm:gap-3 flex-wrap text-center leading-tight">
          <Activity className="text-[#E53935] h-6 w-6 sm:h-7 sm:w-7 shrink-0" />
          <span className="max-w-full break-words">{formattedChapterTitle}</span>
        </h1>
        <p className="text-xs sm:text-sm font-semibold text-[#9CA3AF] max-w-lg">
          Real-time performance and growth analytics for your chapter.
        </p>
      </div>

      {/* Growth Score & Filter Section */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center space-y-4 py-2"
      >
        <div className="relative z-10 flex items-center justify-center shrink-0 w-[140px] h-[140px] sm:w-[160px] sm:h-[160px]">
          {/* Circular Gauge Outer Track */}
          <div className="absolute inset-0 rounded-full border-[6px] border-[#111827] shadow-[0_0_20px_rgba(0,0,0,0.4)]" />
          
          {/* Spinning/pulsing subtle gradient circle glow */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="absolute inset-[-4px] rounded-full opacity-40 blur-[8px] border-2 border-dashed border-[#E53935]"
          />

          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 relative z-10">
            <defs>
              <linearGradient id="chapter-score-grad-ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#E53935" />
                <stop offset="50%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
            </defs>
            {/* Background Track */}
            <circle cx="50" cy="50" r="44" stroke="#1a2233" strokeWidth="6" fill="none" />
            {/* Progress Ring */}
            <circle 
              cx="50" 
              cy="50" 
              r="44" 
              stroke="url(#chapter-score-grad-ring)" 
              strokeWidth="6" 
              fill="none" 
              strokeDasharray="276" 
              strokeDashoffset={276 - (276 * Math.min(100, Math.max(0, scoreVal))) / 100}
              strokeLinecap="round" 
              className="transition-all duration-300 drop-shadow-[0_0_8px_rgba(229,57,53,0.6)]" 
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center m-2.5 rounded-full bg-[#0B1220]/90 backdrop-blur-sm shadow-inner z-20">
            <span className="text-[28px] sm:text-[34px] font-extrabold text-white leading-none tracking-tighter">
              {scoreVal}%
            </span>
            <span className="text-[8px] sm:text-[9px] font-bold text-[#9CA3AF] uppercase tracking-widest mt-1">
              CHAPTER GROWTH
            </span>
            <div className={cn("mt-1 px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold tracking-wider border", chapterGrowthScoreData.statusColor)}>
              {chapterGrowthScoreData.status}
            </div>
          </div>
        </div>

        {/* Global Filter Button beside Score */}
        <div className="flex items-center gap-3">
          <div className="text-xs font-bold text-[#9CA3AF] bg-[#111827]/80 border border-white/10 px-4 py-1.5 rounded-full shadow-sm">
            Score: <span className="text-white font-extrabold">{scoreVal} / 100</span>
          </div>
          
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className={cn(
              "flex items-center gap-1.5 text-xs font-bold px-4 py-1.5 rounded-full shadow-sm border transition-all cursor-pointer",
              activeDateRange 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                : "bg-[#111827]/80 text-[#9CA3AF] border-white/10 hover:text-white"
            )}
          >
            <Filter size={14} />
            {activeDateRange ? 'Filtered' : 'Filter'}
            {activeDateRange && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
            )}
          </button>
        </div>
      </motion.div>

      {/* Chapter Information Card (Simplified) */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-2xl mx-auto bg-gradient-to-b from-[#111827]/90 to-[#0B1220]/90 border border-white/10 rounded-[24px] p-6 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-md relative overflow-hidden"
      >
        {/* Ambient background glow */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#E53935]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#E53935]/10 border border-[#E53935]/20 flex items-center justify-center text-[#E53935] shrink-0">
              <Building2 size={24} />
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-[#9CA3AF] uppercase tracking-[0.2em]">Chapter Details</span>
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                {formattedChapterCardName}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#1F2937]/80 border border-white/10 px-3.5 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Active Chapter</span>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#0B1220]/80 border border-white/5 rounded-2xl p-4 flex flex-col justify-center">
            <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <Users size={12} className="text-indigo-400" />
              Active Members
            </span>
            <div className="text-2xl font-black text-white">{activePartnersCount}</div>
            <span className="text-[10px] text-[#9CA3AF] font-semibold mt-0.5">out of {totalMembersCount} total</span>
          </div>
          <div className="bg-[#0B1220]/80 border border-white/5 rounded-2xl p-4 flex flex-col justify-center">
            <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <Users size={12} className="text-red-400" />
              Inactive Members
            </span>
            <div className="text-2xl font-black text-white">{inactiveMembersCount}</div>
            <span className="text-[10px] text-[#9CA3AF] font-semibold mt-0.5">out of {totalMembersCount} total</span>
          </div>
        </div>
      </motion.div>

      {/* Analytics Section - Redesigned to use 'MEMBER' role for Merged Cards UI */}
      <div className="space-y-4 pt-2">
        <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-3">
          <Activity className="text-[#E53935] h-5 w-5" />
          Chapter Analytics
        </h2>
        <StatGrid
          role="MEMBER" // Passed "MEMBER" to get the EXACT "My Analytics" UI style (merged cards)
          position=""
          totalMembersCount={totalMembersCount}
          activePartnersCount={activePartnersCount}
          inactiveMembersCount={inactiveMembersCount}
          referralsSentCount={referralsSentCount}
          referralsReceivedCount={referralsReceivedCount}
          businessGeneratedTotal={businessSentTotal}
          businessSentTotal={businessSentTotal}
          businessReceivedTotal={businessReceivedTotal}
          businessSentCount={businessSentCount}
          businessReceivedCount={businessReceivedCount}
          oneToOneScheduledCount={oneToOneScheduledCount}
          oneToOneCompletedCount={oneToOneMeetingsCount}
          meetingsScheduledCount={upcomingSyncsCount}
          meetingsAttendedCount={meetingsAttendedCount}
          meetingsCount={meetingsCount}
          upcomingSyncsCount={upcomingSyncsCount}
          guestsInvitedCount={guestsInvitedCount}
          guestsJoinedCount={guestsJoinedCount}
          thankYouSlipsSentCount={thankYouSlipsSentCount}
          thankYouSlipsReceivedCount={thankYouSlipsReceivedCount}
          testimonialsGivenCount={testimonialsGivenCount}
          testimonialsReceivedCount={testimonialsReceivedCount}
        />
      </div>

      {/* Filter Modal */}
      <Modal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title="Filter Chapter Analytics"
      >
        <div className="space-y-6">
          <p className="text-sm text-neutral-400">
            Select a date range to filter the entire My Chapter Report, including Growth Score and Analytics.
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="w-full bg-[#111827] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="w-full bg-[#111827] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-white/10">
            <button
              onClick={handleClearFilter}
              className="flex-1 bg-[#111827] hover:bg-neutral-800 text-white font-bold py-3 rounded-xl transition-all text-sm border border-white/10"
            >
              Reset
            </button>
            <button
              onClick={handleApplyFilter}
              className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-lg shadow-red-900/20"
            >
              Apply Filter
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
