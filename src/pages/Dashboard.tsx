import { addYears, isValid } from 'date-fns';
import { safeFormat as format } from '../utils/dateUtils';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Share2, Award, Calendar, UserPlus, ChevronRight, Users, Handshake, BookOpen, 
  Eye, Plus, Filter, TrendingUp, TrendingDown, CheckCircle2, Clock, Sparkles, Target, Compass, 
  HelpCircle, Activity, Briefcase, ArrowRight, Trophy, Flame, Star, Zap, Shield, Rocket, Crown,
  CheckSquare, User, AlertTriangle, RotateCcw, Loader2, X, Building2, Search, FileText} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { getCleanFullName, getDisplayPosition } from '../utils/authUtils';
import { cn } from '../lib/utils';
import {  where  } from '../lib/database';
import { databaseService } from '../services/databaseService';
import { MemberCompanionView } from '../components/MemberCompanionView';
import { ChapterAdminCompanionView } from '../components/ChapterAdminCompanionView';
import { MasterAdminCompanionView } from '../components/MasterAdminCompanionView';
import StatGrid from '../components/StatGrid';
import { Modal } from '../components/Modal';
import { supabase } from '../lib/supabaseClient';
import { calculateSubscriptionDetails } from '../utils/timeUtils';
import { deduplicateSlips } from '../utils/deduplicateSlips';
import { calculateProfileCompletion } from '../utils/profileUtils';
import { calculateMemberGrowthScore, calculateGrowthTrend, isDateInRange, calculateMemberGrowthScoreData, calculateChapterGrowthScoreData, getWorkspaceChecklistTasks, syncGrowthScoreToDatabase } from '../utils/growthScore';
import { isMemberActive, getMemberInactiveReasons, getSubscriptionStatus } from '../utils/memberStatus';
import { getMeetingExactDateTime } from './Meetings';

export function cleanHeroName(name: string): string {
  return getCleanFullName(name);
}

export function isUserOneToOneParticipant(m: any, userCandidateIds: string[]): boolean {
  if (!m || !userCandidateIds || userCandidateIds.length === 0) return false;
  const candidateSet = new Set(userCandidateIds.map(id => String(id || '').trim()).filter(Boolean));
  if (candidateSet.size === 0) return false;

  const senderId = String(m.sender_id || m.senderId || '').trim();
  const receiverId = String(m.receiver_id || m.receiverId || '').trim();
  const organizerId = String(m.organizer_id || m.organizerId || '').trim();
  const memberId = String(m.member_id || m.memberId || '').trim();
  const creatorId = String(m.creatorId || m.creator_id || m.createdBy || m.created_by || '').trim();

  if (senderId && candidateSet.has(senderId)) return true;
  if (receiverId && candidateSet.has(receiverId)) return true;
  if (organizerId && candidateSet.has(organizerId)) return true;
  if (memberId && candidateSet.has(memberId)) return true;
  if (creatorId && candidateSet.has(creatorId)) return true;

  if (Array.isArray(m.participantIds)) {
    if (m.participantIds.some((pid: any) => candidateSet.has(String(pid || '').trim()))) return true;
  }
  return false;
}

const isToday = (dateStr: string) => {
  if (!dateStr) return false;
  if (dateStr.length === 10 && dateStr.includes('-')) {
    const [y, m, dayVal] = dateStr.split('-').map(Number);
    const blockDate = new Date();
    return y === blockDate.getFullYear() && (m - 1) === blockDate.getMonth() && dayVal === blockDate.getDate();
  }
  const parsedDate = new Date(dateStr);
  const parsedNow = new Date();
  return parsedDate.getFullYear() === parsedNow.getFullYear() &&
         parsedDate.getMonth() === parsedNow.getMonth() &&
         parsedDate.getDate() === parsedNow.getDate();
};

export function Analytics() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [score, setScore] = useState(0);
  const [userName, setUserName] = useState<string>('');

  // Fetch fresh user name from Supabase on mount/profile change
  useEffect(() => {
    const fetchFreshName = async () => {
      const userId = profile?.uid || profile?.id;
      if (!userId) {
        if (profile?.name) {
          setUserName(cleanHeroName(profile.name));
        }
        return;
      }
      try {
        const { data, error } = await supabase
          .from('users')
          .select('name')
          .eq('id', userId)
          .single();
        if (!error && data && data.name) {
          setUserName(cleanHeroName(data.name));
        } else if (profile?.name) {
          setUserName(cleanHeroName(profile.name));
        }
      } catch (err) {
        console.error("Error fetching fresh name from Supabase:", err);
        if (profile?.name) {
          setUserName(cleanHeroName(profile.name));
        }
      }
    };

    fetchFreshName();
  }, [profile]);
  const [isRocketHovered, setIsRocketHovered] = useState(false);
  const [isReportHovered, setIsReportHovered] = useState(false);

  // Subscribed States for Live Member Data
  const [meetings, setMeetings] = useState<any[]>([]);
  const [passedReferrals, setPassedReferrals] = useState<any[]>([]);
  const [receivedReferrals, setReceivedReferrals] = useState<any[]>([]);
  const [createdOneToOnes, setCreatedOneToOnes] = useState<any[]>([]);
  const [participatedOneToOnes, setParticipatedOneToOnes] = useState<any[]>([]);
  const [guestInvitations, setGuestInvitations] = useState<any[]>([]);
  const [isChecklistHighlighted, setIsChecklistHighlighted] = useState(false);

  const handleApproveRenewal = async (requestId: string, memberId: string) => {
    try {
      const newStart = new Date().toISOString();
      const newEnd = addYears(new Date(), 1).toISOString();
      
      await supabase.from('users').update({
        subscription_start: newStart,
        subscription_end: newEnd,
        subscription_status: 'Active',
        membership_status: 'ACTIVE',
        renewal_requested: false
      }).eq('id', memberId);

      await supabase.from('subscription_requests').update({
        status: 'APPROVED',
        processed_date: new Date().toISOString(),
        processed_by: profile?.uid
      }).eq('id', requestId);
    } catch (e) {
      console.error('Error approving', e);
    }
  };

  const handleRejectRenewal = async (requestId: string, memberId: string) => {
    try {
      await supabase.from('subscription_requests').update({
        status: 'REJECTED',
        processed_date: new Date().toISOString(),
        processed_by: profile?.uid
      }).eq('id', requestId);
      
      await supabase.from('users').update({
        renewal_requested: false
      }).eq('id', memberId);
    } catch (e) {
      console.error('Error rejecting', e);
    }
  };


  // Chapter-specific telemetry states
  const [allUsersList, setAllUsersList] = useState<any[]>([]);
  const [chapterUsers, setChapterUsers] = useState<any[]>([]);
  const [allSlips, setAllSlips] = useState<any[]>([]);
  const [allReferrals, setAllReferrals] = useState<any[]>([]);
  const [oneToOnes, setOneToOnes] = useState<any[]>([]);
  const [subscriptionRequests, setSubscriptionRequests] = useState<any[]>([]);
  const [allTestimonials, setAllTestimonials] = useState<any[]>([]);
  const [allChapters, setAllChapters] = useState<any[]>([]);
  const [resolvedChapterName, setResolvedChapterName] = useState<string>('');
  const [isInactiveModalOpen, setIsInactiveModalOpen] = useState(false);
  const [analyticsModalCategory, setAnalyticsModalCategory] = useState<string | null>(null);
  
  const normPosForAdmin = String(profile?.position || '').toLowerCase();
  const isStrictChapterAdmin = (profile?.role === 'CHAPTER_ADMIN' && !['president', 'vice_president', 'treasurer'].includes(normPosForAdmin)) || normPosForAdmin === 'chapter_admin';
  const isChapterAdminUser = isStrictChapterAdmin;
  const usePersonalStats = profile?.role !== 'MASTER_ADMIN';

  // Global Date Range, Chapter & Member Filter State
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [selectedChapterFilter, setSelectedChapterFilter] = useState<string>('ALL');
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('ALL');
  const [appliedChapterFilter, setAppliedChapterFilter] = useState<string>('ALL');
  const [appliedMemberFilter, setAppliedMemberFilter] = useState<string>('ALL');
  const [activeDateRange, setActiveDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [hasInitializedDate, setHasInitializedDate] = useState(false);

  useEffect(() => {
    if (profile && !hasInitializedDate) {
      if (profile.role === 'MASTER_ADMIN') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        setActiveDateRange({ start: today, end: end });
        setFilterStartDate(today.toISOString().split('T')[0]);
        setFilterEndDate(today.toISOString().split('T')[0]);
      } else {
        setActiveDateRange(null);
        setFilterStartDate('');
        setFilterEndDate('');
      }
      setHasInitializedDate(true);
    }
  }, [profile, hasInitializedDate]);


  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(false);

  const availableMembersForFilter = useMemo(() => {
    let list = allUsersList.filter(u => u.role !== 'MASTER_ADMIN');
    if (selectedChapterFilter !== 'ALL') {
      list = list.filter(u => u.chapter_id === selectedChapterFilter || u.chapterId === selectedChapterFilter);
    }
    return list;
  }, [allUsersList, selectedChapterFilter]);

  const handleApplyFilter = () => {
    let range: { start: Date; end: Date } | null = null;
    if (filterStartDate || filterEndDate) {
      if (!filterStartDate || !filterEndDate) {
        setDateError('Please select both Start Date and End Date.');
        return;
      }
      const start = new Date(filterStartDate + 'T00:00:00');
      const end = new Date(filterEndDate + 'T23:59:59.999');

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        setDateError('Please enter valid dates.');
        return;
      }

      if (start.getTime() > end.getTime()) {
        setDateError('Start Date cannot be after End Date.');
        return;
      }
      range = { start, end };
    }

    setDateError(null);
    setIsFilterLoading(true);

    setTimeout(() => {
      setActiveDateRange(range);
      setAppliedChapterFilter(selectedChapterFilter);
      setAppliedMemberFilter(selectedMemberFilter);
      setIsFilterLoading(false);
      setIsFilterModalOpen(false);
    }, 200);
  };

  const handleClearFilter = () => {
    if (profile?.role === 'MASTER_ADMIN') {
      setFilterStartDate(new Date().toISOString().split('T')[0]);
      setFilterEndDate(new Date().toISOString().split('T')[0]);
    } else {
      setFilterStartDate('');
      setFilterEndDate('');
    }
    setSelectedChapterFilter('ALL');
    setSelectedMemberFilter('ALL');
    setAppliedChapterFilter('ALL');
    setAppliedMemberFilter('ALL');
    setDateError(null);
    if (profile?.role === 'MASTER_ADMIN') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      setActiveDateRange({ start: today, end: end });
    } else {
      setActiveDateRange(null);
    }
    setIsFilterModalOpen(false);
  };

  // Resolve chapter name dynamically
  useEffect(() => {
    const fetchChapterName = async () => {
      if (!profile) return;
      if (isChapterAdminUser && profile.chapterName) {
        setResolvedChapterName(profile.chapterName);
      } else if (profile.role === 'MEMBER' || profile.role === 'CHAPTER_ADMIN') {
        if (profile.chapterName) {
          setResolvedChapterName(profile.chapterName);
          return;
        }
        if (profile.chapter_id) {
          const chapter = await databaseService.get<any>('chapters', profile.chapter_id);
          if (chapter && chapter.chapter_name) {
            setResolvedChapterName(chapter.chapter_name);
          } else {
            setResolvedChapterName('My Chapter');
          }
        } else {
          setResolvedChapterName('My Chapter');
        }
      } else if (profile.role === 'MASTER_ADMIN') {
        setResolvedChapterName('Global Network');
      }
    };
    fetchChapterName();
  }, [profile]);

  const chapterHeading = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN') return 'Organization Analytics';
    if (usePersonalStats) return 'My Analytics';
    if (!resolvedChapterName) return 'Chapter Analytics';
    return resolvedChapterName.toLowerCase().includes('chapter') 
      ? `${resolvedChapterName} Analytics`
      : `${resolvedChapterName} Chapter Analytics`;
  }, [resolvedChapterName, profile, usePersonalStats]);


  useEffect(() => {
    const handleRefresh = () => {
      // The auth context's profile might update via refreshProfile, 
      // but if we want to manually re-render we can add a state toggle.
      // For now we will rely on profile reference change if refreshProfile is called.
    };
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  // Unified dynamic subscriptions
  useEffect(() => {
    if (!profile) return;

    // 1. Subscribe to users (chapter members & global users for name resolution)
    let userConstraints: any[] = [];
    if (profile.role !== 'MASTER_ADMIN') {
      const myChapId = String(profile.chapter_id || '').trim();
      if (myChapId) {
        userConstraints = [where('chapter_id', '==', myChapId)];
      }
    }
    const unsubUsers = databaseService.subscribe<any>('users', userConstraints, (data) => {
      setAllUsersList(data);
      
      const chapterMems = data.filter(u => {
        const r = (u.role || 'MEMBER').toUpperCase();
        return r !== 'MASTER_ADMIN';
      });
      setChapterUsers(chapterMems);
    });

    // 2. Subscribe to thank you slips
    const unsubSlips = databaseService.subscribe<any>('thank_you_slips', [], (data) => {
      setAllSlips(deduplicateSlips(data));
    });
    const unsubSubRequests = databaseService.subscribe<any>('subscription_requests', [], setSubscriptionRequests);

    // Fetch thank_you_slips from Supabase as well
    supabase.from('thank_you_slips').select('*').then(({ data: sbSlips }) => {
      if (sbSlips && sbSlips.length > 0) {
        const mappedSbSlips = sbSlips.map((s: any) => {
          const slipSender = String(s.from_user_id || s.fromUserId || s.submitted_by || '');
          const slipReceiver = String(s.to_user_id || s.toUserId || (s.receiver_id && String(s.receiver_id) !== slipSender ? s.receiver_id : (s.sender_id && String(s.sender_id) !== slipSender ? s.sender_id : '')) || '');
          return {
            id: String(s.id),
            referralId: String(s.referral_id || s.referralId || ''),
            fromUserId: slipSender,
            toUserId: slipReceiver,
            customerName: s.customer_name || s.customerName || '',
            businessValue: Number(s.business_value || s.businessValue || 0),
            notes: s.notes || '',
            createdAt: s.created_at || s.createdAt || new Date().toISOString()
          };
        });
        setAllSlips(prev => {
          return deduplicateSlips([...prev, ...mappedSbSlips]);
        });
      }
    });

    // 3. Subscribe to referrals
    const unsubReferrals = databaseService.subscribe<any>('referrals', [], (data) => {
      setAllReferrals(data);
      if (profile.role === 'MEMBER') {
        setPassedReferrals(data.filter(r => r.fromUserId === profile.uid));
        setReceivedReferrals(data.filter(r => r.toUserId === profile.uid));
      }
    });

    // 4. Subscribe to 1-to-1s
    const unsub1to1s = databaseService.subscribe<any>('one_to_one_meetings', [], (data) => {
      setOneToOnes(data);
      const userCand = [profile.id, profile.uid].filter(Boolean).map(String);
      setCreatedOneToOnes(data.filter(m => isUserOneToOneParticipant(m, userCand)));
      setParticipatedOneToOnes(data.filter(m => isUserOneToOneParticipant(m, userCand)));
    });

    // 5. Subscribe to guest invitations
    const unsubGuests = databaseService.subscribe<any>('guest_invitations', [], (data) => {
      setGuestInvitations(data);
    });

    // 6. Subscribe to meetings
    const unsubMeetings = databaseService.subscribe<any>('meetings', [], setMeetings);

    // 7. Subscribe to testimonials
    const unsubTestimonials = databaseService.subscribe<any>('testimonials', [], setAllTestimonials);

    // 8. Subscribe to chapters
    const unsubChapters = databaseService.subscribe<any>('chapters', [], setAllChapters);

    return () => {
      unsubUsers();
      unsubSlips();
      unsubSubRequests();
      unsubReferrals();
      unsub1to1s();
      unsubGuests();
      unsubMeetings();
      unsubTestimonials();
      unsubChapters();
    };
  }, [profile]);

  // Derive chapter-specific user IDs
  const chapterUserIds = useMemo(() => {
    const ids = chapterUsers.map(u => u.uid);
    if (profile) {
      ids.push(profile.uid);
      const adminId = profile.chapter_id || profile.adminId;
      if (adminId) ids.push(adminId);
    }
    return Array.from(new Set(ids));
  }, [chapterUsers, profile]);

  const activePartnersCount = useMemo(() => {
    const members = chapterUsers.filter(u => u.role !== 'MASTER_ADMIN');
    return members.filter(isMemberActive).length;
  }, [chapterUsers]);

  const inactiveMembersCount = useMemo(() => {
    const members = chapterUsers.filter(u => u.role !== 'MASTER_ADMIN');
    return members.filter(u => !isMemberActive(u)).length;
  }, [chapterUsers]);

  const inactiveMembersList = useMemo(() => {
    const members = chapterUsers.filter(u => u.role !== 'MASTER_ADMIN');
    return members.filter(u => !isMemberActive(u)).map(u => {
      const reasons = getMemberInactiveReasons(u);

      const mustChangePwd = u.must_change_password === true || u.mustChangePassword === true || u.password_changed === false || u.passwordChanged === false;

      return {
        uid: u.uid || u.id,
        name: u.name || 'N/A',
        phone: u.phone || 'N/A',
        chapterName: u.chapterName || u.chapter_name || 'N/A',
        position: getDisplayPosition(u.position, u.role),
        subscriptionStatus: getSubscriptionStatus(u),
        passwordStatus: mustChangePwd ? 'Default Password' : 'Changed',
        inactiveReason: reasons.join(' & ')
      };
    });
  }, [chapterUsers]);

  // Effective dataset arrays filtered by global date range, chapter, and member
  const effectiveSlips = useMemo(() => {
    let list = deduplicateSlips(allSlips);
    if (activeDateRange) {
      list = list.filter(s => isDateInRange(s.createdAt || s.created_at || s.date, activeDateRange.start, activeDateRange.end));
    }
    if (profile?.role === 'MASTER_ADMIN') {
      if (appliedChapterFilter !== 'ALL') {
        const chapterMemberUids = allUsersList.filter(u => u.chapter_id === appliedChapterFilter || u.chapterId === appliedChapterFilter).map(u => u.uid || u.id);
        list = list.filter(s => s.chapter_id === appliedChapterFilter || s.chapterId === appliedChapterFilter || chapterMemberUids.includes(s.fromUserId) || chapterMemberUids.includes(s.toUserId));
      }
      if (appliedMemberFilter !== 'ALL') {
        list = list.filter(s => s.fromUserId === appliedMemberFilter || s.toUserId === appliedMemberFilter);
      }
    }
    return list;
  }, [allSlips, activeDateRange, profile, appliedChapterFilter, appliedMemberFilter, allUsersList]);

  const effectiveReferrals = useMemo(() => {
    let list = allReferrals;
    if (activeDateRange) {
      list = list.filter(r => isDateInRange(r.createdAt || r.created_at || r.date, activeDateRange.start, activeDateRange.end));
    }
    if (profile?.role === 'MASTER_ADMIN') {
      if (appliedChapterFilter !== 'ALL') {
        const chapterMemberUids = allUsersList.filter(u => u.chapter_id === appliedChapterFilter || u.chapterId === appliedChapterFilter).map(u => u.uid || u.id);
        list = list.filter(r => r.chapter_id === appliedChapterFilter || r.chapterId === appliedChapterFilter || chapterMemberUids.includes(r.fromUserId) || chapterMemberUids.includes(r.toUserId));
      }
      if (appliedMemberFilter !== 'ALL') {
        list = list.filter(r => r.fromUserId === appliedMemberFilter || r.toUserId === appliedMemberFilter);
      }
    }
    return list;
  }, [allReferrals, activeDateRange, profile, appliedChapterFilter, appliedMemberFilter, allUsersList]);

  const effectiveOneToOnes = useMemo(() => {
    let list = oneToOnes;
    if (activeDateRange) {
      list = list.filter(m => isDateInRange(m.createdAt || m.created_at || m.date, activeDateRange.start, activeDateRange.end));
    }
    if (profile?.role === 'MASTER_ADMIN') {
      if (appliedChapterFilter !== 'ALL') {
        const chapterMemberUids = allUsersList.filter(u => u.chapter_id === appliedChapterFilter || u.chapterId === appliedChapterFilter).map(u => u.uid || u.id);
        list = list.filter(m => chapterMemberUids.includes(m.organizer_id || m.creatorId) || (m.participantIds && m.participantIds.some(pid => chapterMemberUids.includes(pid))));
      }
      if (appliedMemberFilter !== 'ALL') {
        list = list.filter(m => (m.organizer_id || m.creatorId) === appliedMemberFilter || (m.participantIds && m.participantIds.includes(appliedMemberFilter)) || m.member_id === appliedMemberFilter);
      }
    }
    return list;
  }, [oneToOnes, activeDateRange, profile, appliedChapterFilter, appliedMemberFilter, allUsersList]);

  const effectiveMeetings = useMemo(() => {
    let list = meetings;
    if (activeDateRange) {
      list = list.filter(m => isDateInRange(m.date || m.meeting_date || m.createdAt || m.created_at, activeDateRange.start, activeDateRange.end));
    }
    if (profile?.role === 'MASTER_ADMIN') {
      if (appliedChapterFilter !== 'ALL') {
        list = list.filter(m => m.chapter_id === appliedChapterFilter || m.chapterId === appliedChapterFilter);
      }
      if (appliedMemberFilter !== 'ALL') {
        list = list.filter(m => (m.attendance && !!m.attendance[appliedMemberFilter]) || m.createdBy === appliedMemberFilter);
      }
    }
    return list;
  }, [meetings, activeDateRange, profile, appliedChapterFilter, appliedMemberFilter]);

  const effectiveGuestInvitations = useMemo(() => {
    let list = guestInvitations;
    if (activeDateRange) {
      list = list.filter(g => isDateInRange(g.createdAt || g.created_at || g.date, activeDateRange.start, activeDateRange.end));
    }
    if (profile?.role === 'MASTER_ADMIN') {
      if (appliedChapterFilter !== 'ALL') {
        list = list.filter(g => g.chapter_id === appliedChapterFilter || g.chapterId === appliedChapterFilter);
      }
      if (appliedMemberFilter !== 'ALL') {
        list = list.filter(g => g.createdBy === appliedMemberFilter || g.userId === appliedMemberFilter);
      }
    }
    return list;
  }, [guestInvitations, activeDateRange, profile, appliedChapterFilter, appliedMemberFilter]);

  const effectiveTestimonials = useMemo(() => {
    let list = allTestimonials;
    if (activeDateRange) {
      list = list.filter(t => isDateInRange(t.createdAt || t.created_at || t.date, activeDateRange.start, activeDateRange.end));
    }
    if (profile?.role === 'MASTER_ADMIN') {
      if (appliedChapterFilter !== 'ALL') {
        const chapterMemberUids = allUsersList.filter(u => u.chapter_id === appliedChapterFilter || u.chapterId === appliedChapterFilter).map(u => u.uid || u.id);
        list = list.filter(t => t.chapter_id === appliedChapterFilter || t.chapterId === appliedChapterFilter || chapterMemberUids.includes(t.authorMemberId) || chapterMemberUids.includes(t.recipientMemberId));
      }
      if (appliedMemberFilter !== 'ALL') {
        list = list.filter(t => t.authorMemberId === appliedMemberFilter || t.recipientMemberId === appliedMemberFilter);
      }
    }
    return list;
  }, [allTestimonials, activeDateRange, profile, appliedChapterFilter, appliedMemberFilter, allUsersList]);

    const userCandidateIds = useMemo(() => {
    return [profile?.id, profile?.uid].filter(Boolean).map(String);
  }, [profile]);

  const chapterSlips = useMemo(() => {
    return effectiveSlips.filter(slip => 
      usePersonalStats ? (userCandidateIds.includes(slip.fromUserId) || userCandidateIds.includes(slip.toUserId)) : (chapterUserIds.includes(slip.fromUserId) || chapterUserIds.includes(slip.toUserId))
    );
  }, [effectiveSlips, chapterUserIds, userCandidateIds, usePersonalStats]);

  const chapterReferralsList = useMemo(() => {
    return effectiveReferrals.filter(ref => 
      usePersonalStats ? (userCandidateIds.includes(ref.fromUserId) || userCandidateIds.includes(ref.toUserId)) : (chapterUserIds.includes(ref.fromUserId) || chapterUserIds.includes(ref.toUserId))
    );
  }, [effectiveReferrals, chapterUserIds, userCandidateIds, usePersonalStats]);

  const businessSentSlips = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN' && appliedMemberFilter !== 'ALL') {
      return effectiveSlips.filter(s => {
        const ref = effectiveReferrals.find(r => String(r.id) === String(s.referralId || s.referral_id));
        const senderId = ref ? String(ref.fromUserId || ref.from_user_id || ref.sender_id) : String(s.toUserId || s.to_user_id || '');
        return senderId === String(appliedMemberFilter);
      });
    }
    return effectiveSlips.filter(s => {
      const ref = effectiveReferrals.find(r => String(r.id) === String(s.referralId || s.referral_id));
      const senderId = ref ? String(ref.fromUserId || ref.from_user_id || ref.sender_id) : String(s.toUserId || s.to_user_id || '');
      return usePersonalStats ? userCandidateIds.includes(senderId) : chapterUserIds.includes(senderId);
    });
  }, [effectiveSlips, effectiveReferrals, chapterUserIds, userCandidateIds, appliedMemberFilter, profile, usePersonalStats]);

  const businessReceivedSlips = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN' && appliedMemberFilter !== 'ALL') {
      return effectiveSlips.filter(s => {
        const ref = effectiveReferrals.find(r => String(r.id) === String(s.referralId || s.referral_id));
        const receiverId = ref ? String(ref.toUserId || ref.to_user_id || ref.receiver_id) : String(s.fromUserId || s.from_user_id || s.submitted_by || '');
        return receiverId === String(appliedMemberFilter);
      });
    }
    return effectiveSlips.filter(s => {
      const ref = effectiveReferrals.find(r => String(r.id) === String(s.referralId || s.referral_id));
      const receiverId = ref ? String(ref.toUserId || ref.to_user_id || ref.receiver_id) : String(s.fromUserId || s.from_user_id || s.submitted_by || '');
      return usePersonalStats ? userCandidateIds.includes(receiverId) : chapterUserIds.includes(receiverId);
    });
  }, [effectiveSlips, effectiveReferrals, chapterUserIds, userCandidateIds, appliedMemberFilter, profile, usePersonalStats]);

  const referralsSentList = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN' && appliedMemberFilter !== 'ALL') {
      return effectiveReferrals.filter(r => String(r.fromUserId || r.sender_id || r.from_user_id || '') === String(appliedMemberFilter));
    }
    return effectiveReferrals.filter(r => {
      const senderId = String(r.fromUserId || r.sender_id || r.from_user_id || '');
      return usePersonalStats ? userCandidateIds.includes(senderId) : chapterUserIds.includes(senderId);
    });
  }, [effectiveReferrals, chapterUserIds, userCandidateIds, profile, appliedMemberFilter, usePersonalStats]);

  const referralsSentCount = useMemo(() => referralsSentList.length, [referralsSentList]);

  const referralsReceivedList = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN' && appliedMemberFilter !== 'ALL') {
      return effectiveReferrals.filter(r => String(r.toUserId || r.receiver_id || r.to_user_id || '') === String(appliedMemberFilter));
    }
    return effectiveReferrals.filter(r => {
      const receiverId = String(r.toUserId || r.receiver_id || r.to_user_id || '');
      return usePersonalStats ? userCandidateIds.includes(receiverId) : chapterUserIds.includes(receiverId);
    });
  }, [effectiveReferrals, chapterUserIds, userCandidateIds, profile, appliedMemberFilter, usePersonalStats]);

  const referralsReceivedCount = useMemo(() => referralsReceivedList.length, [referralsReceivedList]);

  const testimonialsGivenList = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN' && appliedMemberFilter !== 'ALL') {
      return effectiveTestimonials.filter(t => String(t.authorMemberId || t.author_id || t.fromUserId || '') === String(appliedMemberFilter));
    }
    return effectiveTestimonials.filter(t => {
      const authorId = String(t.authorMemberId || t.author_id || t.fromUserId || '');
      return usePersonalStats ? userCandidateIds.includes(authorId) : chapterUserIds.includes(authorId);
    });
  }, [effectiveTestimonials, chapterUserIds, userCandidateIds, profile, appliedMemberFilter, usePersonalStats]);

  const testimonialsGivenCount = useMemo(() => testimonialsGivenList.length, [testimonialsGivenList]);

  const testimonialsReceivedList = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN' && appliedMemberFilter !== 'ALL') {
      return effectiveTestimonials.filter(t => String(t.recipientMemberId || t.recipient_id || t.toUserId || '') === String(appliedMemberFilter));
    }
    return effectiveTestimonials.filter(t => {
      const recipientId = String(t.recipientMemberId || t.recipient_id || t.toUserId || '');
      return usePersonalStats ? userCandidateIds.includes(recipientId) : chapterUserIds.includes(recipientId);
    });
  }, [effectiveTestimonials, chapterUserIds, userCandidateIds, profile, appliedMemberFilter, usePersonalStats]);

  const testimonialsReceivedCount = useMemo(() => testimonialsReceivedList.length, [testimonialsReceivedList]);

  const businessSentTotal = useMemo(() => {
    return businessSentSlips.reduce((sum, s) => {
      const ref = effectiveReferrals.find(r => String(r.id) === String(s.referralId || s.referral_id));
      const val = ref && ref.business_amount ? Number(ref.business_amount) : Number(s.businessValue || s.business_value || s.transactionValue || 0);
      return sum + val;
    }, 0);
  }, [businessSentSlips]);

  // Business Generated is synchronized with Business Sent
  const businessGeneratedTotal = businessSentTotal;

  const businessSentCount = useMemo(() => {
    return businessSentSlips.length;
  }, [businessSentSlips]);

  const businessReceivedTotal = useMemo(() => {
    return businessReceivedSlips.reduce((sum, s) => {
      const ref = effectiveReferrals.find(r => String(r.id) === String(s.referralId || s.referral_id));
      const val = ref && ref.business_amount ? Number(ref.business_amount) : Number(s.businessValue || s.business_value || s.transactionValue || 0);
      return sum + val;
    }, 0);
  }, [businessReceivedSlips]);

  const businessReceivedCount = useMemo(() => {
    return businessReceivedSlips.length;
  }, [businessReceivedSlips]);

  const getMemberName = (userId: string) => {
    if (!userId) return 'N/A';
    const found = allUsersList.find(u => u.uid === userId || u.id === userId || String(u.id) === String(userId) || String(u.uid) === String(userId)) ||
                  chapterUsers.find(u => u.uid === userId || u.id === userId || String(u.id) === String(userId) || String(u.uid) === String(userId));
    return found?.name || found?.full_name || 'N/A';
  };

  const referralsPassedCount = useMemo(() => {
    const isCompleted = (r: any) => ['COMPLETED', 'CONVERTED', 'CLOSED'].includes((r.status || '').toUpperCase());
    if (profile?.role === 'MASTER_ADMIN') {
      return effectiveReferrals.filter(isCompleted).length || 0;
    }
    return chapterReferralsList.filter(isCompleted).length || 0;
  }, [effectiveReferrals, chapterReferralsList, profile]);

  const upcomingSyncsCount = useMemo(() => {
    const chapterMeetings = profile?.role === 'MASTER_ADMIN'
      ? effectiveMeetings
      : effectiveMeetings.filter(m => usePersonalStats ? (m.attendance && (m.attendance[profile?.id] || m.attendance[profile?.uid])) : m.chapter_id === profile?.chapter_id);
    const now = new Date();
    const upcomingMeetingsCount = chapterMeetings.filter(m => {
      const isDone = m.isCompleted === true || (m.isCompleted as any) === 'true' || m.status === 'COMPLETED' ||
                     m.isCancelled === true || (m.isCancelled as any) === 'true' || m.status === 'CANCELLED';
      if (isDone) return false;
      return getMeetingExactDateTime(m) > now;
    }).length;

    const chapterOneToOnes = profile?.role === 'MASTER_ADMIN'
      ? effectiveOneToOnes
      : effectiveOneToOnes.filter(m => 
          chapterUserIds.includes((m.organizer_id || m.creatorId)) || 
          (m.participantIds && m.participantIds.some((pid: string) => chapterUserIds.includes(pid)))
        );
    const upcomingOneToOnesCount = chapterOneToOnes.filter(m => m.status === 'UPCOMING' || m.status === 'SCHEDULED' || m.status === 'RESCHEDULED' || m.status === 'PENDING' || m.status === 'APPROVED').length;

    return (upcomingMeetingsCount + upcomingOneToOnesCount) || 0;
  }, [effectiveMeetings, effectiveOneToOnes, chapterUserIds, profile]);

  const oneToOneMeetingsCount = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN') {
      return effectiveOneToOnes.length;
    }
    const chapterOneToOnes = effectiveOneToOnes.filter(m => 
      usePersonalStats 
        ? isUserOneToOneParticipant(m, userCandidateIds)
        : (chapterUserIds.includes(String(m.organizer_id || m.creatorId || m.sender_id || '')) ||
           chapterUserIds.includes(String(m.member_id || m.receiver_id || '')) ||
           (m.participantIds && m.participantIds.some((pid: string) => chapterUserIds.includes(String(pid)))))
    );
    return chapterOneToOnes.length;
  }, [effectiveOneToOnes, chapterUserIds, userCandidateIds, profile, usePersonalStats]);

  const chapterGuestsList = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN' && appliedChapterFilter === 'ALL') {
      return effectiveGuestInvitations;
    }
    const myChapId = String(profile?.chapter_id || profile?.chapterId || '').trim();
    return effectiveGuestInvitations.filter(g => {
      const gChapId = String(g.chapter_id || g.chapterId || '').trim();
      const inviter = String(g.invited_by_user_id || g.invited_by || g.createdBy || g.inviterId || g.inviter_id || g.user_id || '').trim();
      if (usePersonalStats) return userCandidateIds.includes(inviter);
      return chapterUserIds.includes(inviter) || (gChapId && gChapId === myChapId);
    });
  }, [effectiveGuestInvitations, chapterUserIds, userCandidateIds, profile, appliedChapterFilter, usePersonalStats]);

  const guestsInvitedCount = useMemo(() => chapterGuestsList.length, [chapterGuestsList]);

  const userGuestsJoined = useMemo(() => {
    if (!profile) return 0;
    return effectiveGuestInvitations.filter(g => {
      const inviter = String(g.invited_by_user_id || g.invited_by || g.createdBy || g.inviterId || g.inviter_id || g.user_id || '').trim();
      if (!userCandidateIds.includes(inviter)) return false;
      const st = String(g.status || g.attendance_status || '').toLowerCase();
      return st === 'present' || st === 'attended' || st === 'joined' || st === 'converted' || g.is_converted === true || g.isConverted === true;
    }).length;
  }, [effectiveGuestInvitations, userCandidateIds, profile]);

  const userMeetingsScheduled = useMemo(() => {
    if (!profile) return 0;
    const userChapId = String(profile.chapter_id || profile.chapterId || '').trim();
    const now = new Date();
    return effectiveMeetings.filter(m => {
      const mChapId = String(m.chapter_id || m.chapterId || '').trim();
      if (userChapId && mChapId !== userChapId) return false;
      const isDone = m.isCompleted === true || (m.isCompleted as any) === 'true' || m.status === 'COMPLETED' || m.isCancelled === true || (m.isCancelled as any) === 'true' || m.status === 'CANCELLED';
      if (isDone) return false;
      return getMeetingExactDateTime(m) > now;
    }).length;
  }, [effectiveMeetings, profile]);

  const userMeetingsAttended = useMemo(() => {
    if (!profile) return 0;
    return effectiveMeetings.filter(m => {
      if (!m.attendance) return false;
      return userCandidateIds.some(uid => {
        const status = m.attendance[uid];
        return status && ['PRESENT', 'Yes', 'Substitute', 'Late', 'YES', 'SUBSTITUTE', 'Present'].includes(String(status));
      });
    }).length;
  }, [effectiveMeetings, userCandidateIds, profile]);

  const userOneToOnesScheduled = useMemo(() => {
    if (!profile) return 0;
    return effectiveOneToOnes.filter(m => {
      if (!isUserOneToOneParticipant(m, userCandidateIds)) return false;
      const status = String(m.status || '').toUpperCase();
      return status !== 'CANCELLED' && status !== 'NOT_COMPLETED';
    }).length;
  }, [effectiveOneToOnes, userCandidateIds, profile]);

  const userOneToOnesCompleted = useMemo(() => {
    if (!profile) return 0;
    return effectiveOneToOnes.filter(m => {
      if (!isUserOneToOneParticipant(m, userCandidateIds)) return false;
      const status = String(m.status || '').toUpperCase();
      return status === 'COMPLETED' || m.isCompleted === true || (m.isCompleted as any) === 'true';
    }).length;
  }, [effectiveOneToOnes, userCandidateIds, profile]);

  const visitorsAttendedCount = useMemo(() => {
    return chapterGuestsList.filter(g => g.status === 'Present' || g.attendance_status === 'Present' || g.status === 'Attended').length || 0;
  }, [chapterGuestsList]);

  const thankYouSlipsCount = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN') {
      return effectiveSlips.length;
    }
    const userIds = [profile?.id, profile?.uid].filter(Boolean).map(String);
    const chapterSlips = effectiveSlips.filter(slip => {
      const from = String(slip.fromUserId || slip.from_user_id || slip.sender_id || '');
      const to = String(slip.toUserId || slip.to_user_id || slip.receiver_id || '');
      if (profile?.role === 'MEMBER') {
        return userIds.includes(from) || userIds.includes(to);
      }
      return chapterUserIds.includes(from) || chapterUserIds.includes(to) || userIds.includes(from) || userIds.includes(to);
    });
    return chapterSlips.length;
  }, [effectiveSlips, chapterUserIds, profile]);

  const totalMembersCount = useMemo(() => {
    return chapterUsers.filter(u => u.role !== 'MASTER_ADMIN').length;
  }, [chapterUsers]);

  const totalChaptersCount = useMemo(() => {
    return allChapters.filter(c => c.status === 'ACTIVE').length || 0;
  }, [allChapters]);

  const subscriptionStats = useMemo(() => {
    const now = new Date();
    const members = chapterUsers.filter(u => u.role !== 'MASTER_ADMIN');
    
    const active = members.filter(u => isMemberActive(u)).length;

    const expired = members.filter(u => !isMemberActive(u)).length;

    const renewalsDue = members.filter(u => {
      const endDateStr = u.subscriptionEndDate || u.subscriptionEnd || u.subscription_end_date || u.subscription_end;
      if (!endDateStr) return false;
      const endDate = new Date(endDateStr);
      const diffTime = endDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 30;
    }).length;

    const renewed = members.filter(u => !!u.renewedAt || !!u.renewed_at || !!u.renewedBy || !!u.renewed_by).length;

    return {
      active,
      expired,
      renewalsDue,
      renewed
    };
  }, [chapterUsers]);

  const leadershipStats = useMemo(() => {
    const chapterAdmins = chapterUsers.filter(u => u.role === 'CHAPTER_ADMIN' || u.position === 'chapter_admin').length;
    const presidents = chapterUsers.filter(u => u.position === 'president').length;
    const vicePresidents = chapterUsers.filter(u => u.position === 'vice_president' || u.position === 'vice-president').length;
    const treasurers = chapterUsers.filter(u => u.position === 'treasurer').length;

    return {
      chapterAdmins,
      presidents,
      vicePresidents,
      treasurers
    };
  }, [chapterUsers]);

  const weeklyMeetingAttendance = useMemo(() => {
    const chapterMeetings = profile?.role === 'MASTER_ADMIN' 
      ? effectiveMeetings 
      : effectiveMeetings.filter(m => m.chapter_id === profile?.chapter_id);
    const completedMeetings = chapterMeetings.filter(m => m.isCompleted === true || (m.isCompleted as any) === 'true' || m.status === 'COMPLETED');
    if (completedMeetings.length === 0) return 0;
    
    let totalPresent = 0;
    let totalRecords = 0;
    
    if (usePersonalStats && profile) {
       const uid = String(profile.id || profile.uid);
       completedMeetings.forEach(m => {
          totalRecords++;
          if (m.attendance && m.attendance[uid]) {
             if (['PRESENT', 'Yes', 'Substitute', 'Late', 'YES', 'SUBSTITUTE'].includes(String(m.attendance[uid]))) {
                totalPresent++;
             }
          }
       });
       return totalRecords === 0 ? 0 : Math.round((totalPresent / totalRecords) * 100);
    }

    completedMeetings.forEach(m => {
      if (m.attendance) {
        Object.values(m.attendance).forEach(status => {
          totalRecords++;
          if (['PRESENT', 'Yes', 'Substitute', 'Late', 'YES', 'SUBSTITUTE'].includes(String(status))) {
            totalPresent++;
          }
        });
      }
    });
    return totalRecords === 0 ? 0 : Math.round((totalPresent / totalRecords) * 100);
  }, [effectiveMeetings, profile, usePersonalStats]);

  const dynamicNetworkHealthScore = useMemo(() => {
    const total = totalMembersCount;
    if (total === 0) return 100;
    const active = activePartnersCount;
    const ratioScore = Math.round((active / total) * 100);
    const attendanceScore = weeklyMeetingAttendance || 0;
    if (attendanceScore > 0) {
      return Math.round(ratioScore * 0.7 + attendanceScore * 0.3);
    }
    return ratioScore;
  }, [totalMembersCount, activePartnersCount, weeklyMeetingAttendance]);

  const newMembersThisMonthCount = useMemo(() => {
    if (activeDateRange) {
      return chapterUsers.filter(u => isDateInRange(u.createdAt || u.created_at, activeDateRange.start, activeDateRange.end)).length;
    }
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    return chapterUsers.filter(u => u.createdAt >= startOfMonth).length;
  }, [chapterUsers, activeDateRange]);

  const chapterTestimonialsCount = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN') {
      return effectiveTestimonials.filter(t => t.status === 'APPROVED').length;
    }
    return effectiveTestimonials.filter(t => t.chapter_id === profile?.chapter_id && t.status === 'APPROVED').length;
  }, [effectiveTestimonials, profile]);

  const chapterMeetingsCount = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN') {
      return effectiveMeetings.length;
    }
    if (usePersonalStats) {
       const uid = String(profile?.id || profile?.uid);
       return effectiveMeetings.filter(m => m.chapter_id === profile?.chapter_id && m.attendance && m.attendance[uid] && ['PRESENT', 'Yes', 'Substitute', 'Late', 'YES', 'SUBSTITUTE'].includes(String(m.attendance[uid]))).length;
    }
    return effectiveMeetings.filter(m => m.chapter_id === profile?.chapter_id).length;
  }, [effectiveMeetings, profile, usePersonalStats]);

  const topPerformingChapters = useMemo(() => {
    if (profile?.role !== 'MASTER_ADMIN') return [];
    
    const chapterBusinessMap: Record<string, number> = {};
    
    effectiveSlips.forEach(slip => {
      const user = chapterUsers.find(u => u.uid === slip.fromUserId);
      if (user && user.chapterName) {
        if (!chapterBusinessMap[user.chapterName]) {
          chapterBusinessMap[user.chapterName] = 0;
        }
        chapterBusinessMap[user.chapterName] += (Number(slip.businessValue) || 0);
      }
    });

    return Object.entries(chapterBusinessMap)
      .map(([name, business]) => ({ name, business }))
      .sort((a, b) => b.business - a.business)
      .slice(0, 5);
  }, [effectiveSlips, chapterUsers, profile]);

  // Dynamic Recent Activities based on real database records
  const dynamicRecentActivities = useMemo(() => {
    const activities: any[] = [];

    if (profile?.role === 'MASTER_ADMIN') {
      // 1. Chapters
      (allChapters || []).forEach(c => {
        const cName = c.name || c.chapter_name || 'Organization';
        const createdTime = new Date(c.created_at || c.createdAt || Date.now()).getTime();
        if (!isNaN(createdTime)) {
          activities.push({
            id: 'chap-new-' + (c.id || cName),
            activity: 'New Chapter Created',
            title: 'New Chapter Created',
            desc: `Chapter ${cName} established`,
            type: 'chapter',
            memberName: c.created_by_name || c.createdByName || 'Master Admin',
            chapterName: cName,
            dateTime: createdTime,
            time: createdTime,
            status: (c.status || 'ACTIVE').toUpperCase()
          });
        }
        if (c.updated_at || c.updatedAt) {
          const updTime = new Date(c.updated_at || c.updatedAt).getTime();
          if (!isNaN(updTime) && updTime - createdTime > 60000) {
            activities.push({
              id: 'chap-upd-' + (c.id || cName),
              activity: 'Chapter Updated',
              title: 'Chapter Updated',
              desc: `Details updated for ${cName}`,
              type: 'chapter',
              memberName: c.updated_by_name || 'Master Admin',
              chapterName: cName,
              dateTime: updTime,
              time: updTime,
              status: 'UPDATED'
            });
          }
        }
      });

      // 2. Members
      const relevantUsers = activeDateRange 
        ? chapterUsers.filter(u => isDateInRange(u.createdAt || u.created_at, activeDateRange.start, activeDateRange.end))
        : chapterUsers;

      relevantUsers.forEach(u => {
        const uName = u.name || u.full_name || 'Member';
        const chName = u.chapterName || u.chapter_name || u.chapter || 'Unassigned';
        const regTime = new Date(u.createdAt || u.created_at || Date.now()).getTime();

        if (!isNaN(regTime)) {
          activities.push({
            id: 'mem-add-' + u.uid,
            activity: 'Member Added',
            title: 'Member Added',
            desc: `${uName} joined as ${u.category || 'Member'}`,
            type: 'member',
            memberName: uName,
            chapterName: chName,
            dateTime: regTime,
            time: regTime,
            status: isMemberActive(u) ? 'ACTIVE' : 'INACTIVE',
            fromUserId: u.uid
          });
        }

        if (u.status === 'ACTIVE' || isMemberActive(u)) {
          activities.push({
            id: 'mem-act-' + u.uid,
            activity: 'Member Activated',
            title: 'Member Activated',
            desc: `${uName} account activated`,
            type: 'member',
            memberName: uName,
            chapterName: chName,
            dateTime: new Date(u.updatedAt || u.updated_at || u.createdAt || Date.now()).getTime(),
            time: new Date(u.updatedAt || u.updated_at || u.createdAt || Date.now()).getTime(),
            status: 'ACTIVE',
            fromUserId: u.uid
          });
        } else if (u.status === 'INACTIVE' || u.status === 'SUSPENDED') {
          activities.push({
            id: 'mem-deact-' + u.uid,
            activity: 'Member Deactivated',
            title: 'Member Deactivated',
            desc: `${uName} account deactivated`,
            type: 'member',
            memberName: uName,
            chapterName: chName,
            dateTime: new Date(u.updatedAt || u.updated_at || u.createdAt || Date.now()).getTime(),
            time: new Date(u.updatedAt || u.updated_at || u.createdAt || Date.now()).getTime(),
            status: 'INACTIVE',
            fromUserId: u.uid
          });
        }

        if (u.position && u.position !== 'member') {
          const formattedPos = u.position.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
          activities.push({
            id: 'mem-pos-' + u.uid,
            activity: 'Leadership Position Changed',
            title: 'Leadership Position Changed',
            desc: `${uName} assigned as ${formattedPos}`,
            type: 'leadership',
            memberName: uName,
            chapterName: chName,
            dateTime: new Date(u.updatedAt || u.updated_at || u.createdAt || Date.now()).getTime(),
            time: new Date(u.updatedAt || u.updated_at || u.createdAt || Date.now()).getTime(),
            status: formattedPos.toUpperCase(),
            fromUserId: u.uid
          });
        }
      });

      // 3. Subscriptions
      (subscriptionRequests || []).forEach(s => {
        const uName = s.userName || s.user_name || s.name || 'Member';
        const chName = s.chapterName || s.chapter_name || 'Organization';
        const sTime = new Date(s.updated_at || s.updatedAt || s.created_at || s.createdAt || Date.now()).getTime();

        if (!isNaN(sTime)) {
          const isRenewal = s.is_renewal || s.type === 'RENEWAL' || s.status === 'RENEWED';
          activities.push({
            id: 'sub-' + s.id,
            activity: isRenewal ? 'Subscription Renewed' : 'Subscription Approved',
            title: isRenewal ? 'Subscription Renewed' : 'Subscription Approved',
            desc: `Subscription ${isRenewal ? 'renewed' : 'approved'} for ${uName}`,
            type: 'subscription',
            memberName: uName,
            chapterName: chName,
            dateTime: sTime,
            time: sTime,
            status: (s.status || 'APPROVED').toUpperCase()
          });
        }
      });

      // 4. Chapter Meetings
      (meetings || []).forEach(m => {
        const mTime = new Date(m.created_at || m.createdAt || m.date || Date.now()).getTime();
        if (!isNaN(mTime)) {
          activities.push({
            id: 'mtg-' + m.id,
            activity: 'Chapter Meeting Created',
            title: 'Chapter Meeting Created',
            desc: `Meeting "${m.title || 'Chapter Meeting'}" scheduled`,
            type: 'meeting',
            memberName: m.creatorName || m.created_by_name || 'Chapter Leader',
            chapterName: m.chapterName || m.chapter_name || 'Chapter',
            dateTime: mTime,
            time: mTime,
            status: (m.isCompleted === true || String(m.isCompleted) === 'true') ? 'COMPLETED' : 'SCHEDULED'
          });
        }
      });

      // 5. One-to-One Meetings
      effectiveOneToOnes.forEach(m => {
        const creatorName = m.creatorName || 'Member';
        const participantName = m.participantNames?.[0] || 'Member';
        const mTime = new Date(m.createdAt || m.created_at || m.date || Date.now()).getTime();
        if (!isNaN(mTime)) {
          activities.push({
            id: 'oto-' + m.id,
            activity: 'One-to-One Meeting Created',
            title: 'One-to-One Meeting Created',
            desc: `1-to-1 session between ${creatorName} and ${participantName}`,
            type: 'onetoone',
            memberName: creatorName,
            chapterName: m.chapterName || m.chapter_name || 'Chapter',
            dateTime: mTime,
            time: mTime,
            status: 'COMPLETED',
            fromUserId: m.organizer_id || m.creatorId,
            toUserId: m.participantIds?.[0]
          });
        }
      });

      // 6. Referrals
      effectiveReferrals.forEach(r => {
        const fromName = r.fromUserName || 'Member';
        const toName = r.toUserName || 'Partner';
        const rTime = new Date(r.createdAt || r.created_at || r.date || Date.now()).getTime();
        if (!isNaN(rTime)) {
          activities.push({
            id: 'ref-' + r.id,
            activity: 'Referral Created',
            title: 'Referral Created',
            desc: `${fromName} passed referral to ${toName}`,
            type: 'referral',
            memberName: fromName,
            chapterName: r.chapterName || r.chapter_name || 'Chapter',
            dateTime: rTime,
            time: rTime,
            status: (r.status || 'PASSED').toUpperCase(),
            fromUserId: r.fromUserId,
            toUserId: r.toUserId
          });
        }
      });

      // 7. Thank You Slips / Business
      effectiveSlips.forEach(s => {
        const fromName = s.fromUserName || s.from_user_name || 'Member';
        const toName = s.toUserName || s.to_user_name || 'Partner';
        const val = Number(s.businessValue) || 0;
        const sTime = new Date(s.createdAt || s.created_at || s.date || Date.now()).getTime();
        if (!isNaN(sTime)) {
          const isBizClosed = val > 0;
          activities.push({
            id: 'slip-' + s.id,
            activity: isBizClosed ? 'Business Closed' : 'Thank You Slip Submitted',
            title: isBizClosed ? 'Business Closed' : 'Thank You Slip Submitted',
            desc: isBizClosed 
              ? `${fromName} closed ₹${val.toLocaleString('en-IN')} business with ${toName}`
              : `${fromName} submitted thank you slip to ${toName}`,
            type: 'business',
            memberName: fromName,
            chapterName: s.chapterName || s.chapter_name || 'Chapter',
            dateTime: sTime,
            time: sTime,
            status: 'CLOSED',
            fromUserId: s.fromUserId,
            toUserId: s.toUserId
          });
        }
      });

      // 8. Testimonials
      (allTestimonials || []).forEach(t => {
        const authorName = t.author_name || t.authorName || 'Member';
        const recipientName = t.recipient_name || t.recipientName || 'Partner';
        const tTime = new Date(t.created_at || t.createdAt || Date.now()).getTime();
        if (!isNaN(tTime)) {
          activities.push({
            id: 'test-' + t.id,
            activity: 'Testimonial Submitted',
            title: 'Testimonial Submitted',
            desc: `${authorName} submitted testimonial for ${recipientName}`,
            type: 'testimonial',
            memberName: authorName,
            chapterName: t.chapterName || t.chapter_name || 'Chapter',
            dateTime: tTime,
            time: tTime,
            status: (t.status || 'APPROVED').toUpperCase(),
            fromUserId: t.authorMemberId || t.author_id
          });
        }
      });
    } else {
      // 1. Slips (Revenue)
      effectiveSlips.forEach(s => {
        const fromName = s.fromUserName || s.from_user_name || 'Partner';
        const toName = s.toUserName || s.to_user_name || 'Partner';
        const val = Number(s.businessValue) || 0;
        activities.push({
          id: s.id,
          title: 'Business Generated',
          desc: `${fromName} generated ₹${val.toLocaleString('en-IN')} business for ${toName}`,
          type: 'business',
          time: new Date(s.createdAt || s.date).getTime(),
          fromUserId: s.fromUserId,
          toUserId: s.toUserId,
        });
      });

      // 2. Referrals
      effectiveReferrals.forEach(r => {
        const fromName = r.fromUserName || 'Partner';
        const toName = r.toUserName || 'Partner';
        activities.push({
          id: r.id,
          title: 'Referral Passed',
          desc: `${fromName} passed a referral to ${toName}`,
          type: 'referral',
          time: new Date(r.createdAt || r.date).getTime(),
          fromUserId: r.fromUserId,
          toUserId: r.toUserId,
        });
      });

      // 3. One-to-Ones
      effectiveOneToOnes.forEach(m => {
        const creatorName = m.creatorName || 'Partner';
        const participantName = m.participantNames?.[0] || 'Partner';
        activities.push({
          id: m.id,
          title: '1-to-1 Completed',
          desc: `${creatorName} completed 1-to-1 with ${participantName}`,
          type: 'onetoone',
          time: new Date(m.createdAt || m.date).getTime(),
          fromUserId: (m.organizer_id || m.creatorId),
          toUserId: m.participantIds?.[0],
        });
      });

      // 4. New Members
      const relevantUsers = activeDateRange 
        ? chapterUsers.filter(u => isDateInRange(u.createdAt || u.created_at, activeDateRange.start, activeDateRange.end))
        : chapterUsers;
      relevantUsers.forEach(u => {
        activities.push({
          id: u.uid,
          title: 'New Partner Joined',
          desc: `${u.name || 'A partner'} registered as ${u.category || 'Member'}`,
          type: 'member',
          time: new Date(u.createdAt).getTime(),
          fromUserId: u.uid,
        });
      });
    }

    // Filter valid entries, sort by time desc
    const sorted = activities
      .filter(a => a.time && !isNaN(a.time))
      .sort((a, b) => b.time - a.time);

    return sorted;
  }, [effectiveSlips, effectiveReferrals, effectiveOneToOnes, chapterUsers, allChapters, meetings, allTestimonials, subscriptionRequests, activeDateRange, profile]);

  // Filtered recent activities based on role
  const filteredRecentActivities = useMemo(() => {
    if (!profile) return [];
    if (profile.role === 'MASTER_ADMIN') {
      return dynamicRecentActivities;
    }
    if (isChapterAdminUser) {
      return dynamicRecentActivities.filter(a => 
        chapterUserIds.includes(a.fromUserId) || 
        (a.toUserId && chapterUserIds.includes(a.toUserId))
      );
    }
    // MEMBER role
    const userIds = [profile.id, profile.uid].filter(Boolean).map(String);
    return dynamicRecentActivities.filter(a => 
      userIds.includes(String(a.fromUserId)) || userIds.includes(String(a.toUserId))
    );
  }, [dynamicRecentActivities, profile, chapterUserIds]);

  // Derived Checklist Status
  const hasAttendedMeeting = useMemo(() => {
    if (!profile) return false;
    const relevantMeetings = profile.adminId ? meetings.filter(m => m.chapter_id === profile.chapter_id) : meetings;
    return relevantMeetings.some(m => (m.isCompleted === true || (m.isCompleted as any) === 'true' || m.status === 'COMPLETED') && ['PRESENT', 'Yes', 'Substitute', 'Late', 'YES', 'SUBSTITUTE'].includes(m.attendance?.[profile.uid]));
  }, [meetings, profile]);

  const hasPassedReferral = useMemo(() => {
    return passedReferrals.some(r => r.createdAt && isToday(r.createdAt));
  }, [passedReferrals]);
  
  const hasScheduledOneToOne = useMemo(() => {
    return createdOneToOnes.length > 0 || participatedOneToOnes.length > 0;
  }, [createdOneToOnes, participatedOneToOnes]);

  const hasFollowedUpReferral = useMemo(() => {
    return receivedReferrals.some(r => r.status !== 'PENDING');
  }, [receivedReferrals]);

  const hasInvitedGuest = useMemo(() => {
    return guestInvitations.some(g => g.createdBy === profile?.uid && g.createdAt && isToday(g.createdAt) && g.status !== 'Cancelled' && g.status !== 'Invalid');
  }, [guestInvitations, profile]);

  const completedFocusCount = useMemo(() => {
    return (hasAttendedMeeting ? 1 : 0) + 
           (hasPassedReferral ? 1 : 0) + 
           (hasScheduledOneToOne ? 1 : 0) + 
           (hasFollowedUpReferral ? 1 : 0) + 
           (hasInvitedGuest ? 1 : 0);
  }, [hasAttendedMeeting, hasPassedReferral, hasScheduledOneToOne, hasFollowedUpReferral, hasInvitedGuest]);

  const focusProgressPercent = useMemo(() => {
    return Math.round((completedFocusCount / 5) * 100);
  }, [completedFocusCount]);

  const todayTasks = useMemo(() => {
    if (!profile) return [];
    const role = (profile.role || '').toUpperCase();
    if (role === 'MASTER_ADMIN') return [];

    return getWorkspaceChecklistTasks(profile, {
      allReferrals,
      oneToOnes,
      meetings,
      guestInvitations,
      allSlips: effectiveSlips,
      testimonials: allTestimonials,
      allUsers: allUsersList.length > 0 ? allUsersList : chapterUsers
    });
  }, [profile, allReferrals, oneToOnes, meetings, guestInvitations, effectiveSlips, allTestimonials, allUsersList, chapterUsers]);

  const masterAdminTasks = useMemo(() => {
    if (profile?.role !== 'MASTER_ADMIN') return [];
    const tasks: any[] = [];
    const chapterAdmins = chapterUsers.filter(u => u.role === 'CHAPTER_ADMIN' || u.position === 'chapter_admin');

    const renewalRequests = chapterAdmins.filter(u => u.renewalRequested);
    if (renewalRequests.length > 0) {
      tasks.push({
        key: 'renewal_requests',
        label: `${renewalRequests.length} Chapter Admin(s) Requested Renewal`,
        isDone: false,
        link: '/subscriptions',
        linkText: 'REVIEW',
        iconColor: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        icon: Shield,
        activeClass: 'bg-[#DC143C] border-[#DC143C] shadow-[0_0_12px_rgba(220,20,60,0.6)]'
      });
    }

    const expiringAdmins = chapterAdmins.filter(u => {
      const endStr = u.subscriptionEndDate || u.subscriptionEnd || u.subscription_end_date || u.subscription_end;
      if (!endStr) return false;
      const { daysRemaining } = calculateSubscriptionDetails(endStr);
      return daysRemaining >= 0 && daysRemaining <= 30;
    });
    if (expiringAdmins.length > 0) {
      tasks.push({
        key: 'expiring_admins',
        label: `${expiringAdmins.length} Chapter Admin(s) Expiring Soon`,
        isDone: false,
        link: '/subscriptions',
        linkText: 'VIEW',
        iconColor: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
        icon: Clock,
        activeClass: 'bg-[#DC143C] border-[#DC143C] shadow-[0_0_12px_rgba(220,20,60,0.6)]'
      });
    }

    const expiredAdmins = chapterAdmins.filter(u => {
      const endStr = u.subscriptionEndDate || u.subscriptionEnd || u.subscription_end_date || u.subscription_end;
      if (!endStr) return true;
      const { daysRemaining } = calculateSubscriptionDetails(endStr);
      return daysRemaining < 0;
    });
    if (expiredAdmins.length > 0) {
      tasks.push({
        key: 'expired_admins',
        label: `${expiredAdmins.length} Chapter Admin(s) Expired/No Sub`,
        isDone: false,
        link: '/subscriptions',
        linkText: 'VIEW',
        iconColor: 'text-red-400',
        bgColor: 'bg-red-500/10',
        icon: AlertTriangle,
        activeClass: 'bg-[#DC143C] border-[#DC143C] shadow-[0_0_12px_rgba(220,20,60,0.6)]'
      });
    }

    if (tasks.length === 0) {
       tasks.push({
         key: 'all_clear',
         label: 'All Chapter Admin Subscriptions Up-to-Date',
         isDone: true,
         link: '/subscriptions',
         linkText: 'VIEW',
         iconColor: 'text-emerald-400',
         bgColor: 'bg-emerald-500/10',
         icon: CheckSquare,
         activeClass: 'bg-[#DC143C] border-[#DC143C] shadow-[0_0_12px_rgba(220,20,60,0.6)]'
       });
    }

    return tasks;
  }, [chapterUsers, profile]);


  const chapterAdminTasks = useMemo(() => {
    if (profile?.role !== 'CHAPTER_ADMIN' && profile?.position !== 'chapter_admin') return [];
    const tasks: any[] = [];
    
    // Normal Chapter Admin tasks first
    tasks.push({ key: 't1', label: "Schedule Chapter Sync Assemblies", isDone: true, link: "/meetings", linkText: "View", iconColor: 'text-emerald-400', bgColor: 'bg-emerald-500/10', icon: CheckSquare, activeClass: 'bg-[#DC143C]' });
    tasks.push({ key: 't2', label: "Moderate Guest Onboarding Protocols", isDone: true, link: "/guests", linkText: "Guests", iconColor: 'text-emerald-400', bgColor: 'bg-emerald-500/10', icon: CheckSquare, activeClass: 'bg-[#DC143C]' });
    
    const members = chapterUsers.filter(u => u.chapter_id === profile?.chapter_id && u.role !== 'MASTER_ADMIN' && u.role !== 'CHAPTER_ADMIN' && u.position !== 'chapter_admin');

    // Subscription requests from new table
    const pendingRequests = subscriptionRequests.filter(r => r.chapter_id === profile?.chapter_id && r.status === 'PENDING');
    pendingRequests.forEach(req => {
       const member = members.find(m => m.id === req.member_id || m.uid === req.member_id);
       if (!member) return;
       tasks.push({
         key: `req_${req.id}`,
         label: `Renewal Request: ${member.name}`,
         isDone: false,
         iconColor: 'text-amber-400',
         bgColor: 'bg-amber-500/10',
         icon: Shield,
         activeClass: 'bg-[#DC143C] border-[#DC143C] shadow-[0_0_12px_rgba(220,20,60,0.6)]',
         details: {
           phone: member.phone || 'N/A',
           position: member.position || member.role || 'Member',
           chapterName: resolvedChapterName || 'Chapter',
           endDate: req.current_subscription_end_date ? format(new Date(req.current_subscription_end_date), 'MMM d, yyyy') : 'N/A',
           requestDate: format(new Date(req.request_date), 'MMM d, yyyy h:mm a'),
           status: 'Pending'
         },
         customActions: [
           { label: 'View Member', className: 'text-neutral-400 border-neutral-600 hover:bg-neutral-800', onClick: () => window.location.href='/subscriptions' },
           { label: 'Approve & Renew', className: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20', onClick: () => handleApproveRenewal(req.id, member.uid || member.id) },
           { label: 'Reject', className: 'text-red-400 border-red-500/30 bg-red-500/10 hover:bg-red-500/20', onClick: () => handleRejectRenewal(req.id, member.uid || member.id) }
         ]
       });
    });

    const expiringMembers = members.filter(u => {
      const endStr = u.subscriptionEndDate || u.subscriptionEnd || u.subscription_end_date || u.subscription_end;
      if (!endStr) return false;
      const { daysRemaining } = calculateSubscriptionDetails(endStr);
      return daysRemaining >= 0 && daysRemaining <= 30;
    });
    if (expiringMembers.length > 0) {
      tasks.push({
        key: 'expiring_members',
        label: `${expiringMembers.length} Member(s) Expiring Soon`,
        isDone: false,
        link: '/subscriptions',
        linkText: 'VIEW',
        iconColor: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
        icon: Clock,
        activeClass: 'bg-[#DC143C] border-[#DC143C] shadow-[0_0_12px_rgba(220,20,60,0.6)]'
      });
    }

    const expiredMembers = members.filter(u => {
      const endStr = u.subscriptionEndDate || u.subscriptionEnd || u.subscription_end_date || u.subscription_end;
      if (!endStr) return true;
      const { daysRemaining } = calculateSubscriptionDetails(endStr);
      return daysRemaining < 0;
    });
    if (expiredMembers.length > 0) {
      tasks.push({
        key: 'expired_members',
        label: `${expiredMembers.length} Member(s) Expired/No Sub`,
        isDone: false,
        link: '/subscriptions',
        linkText: 'VIEW',
        iconColor: 'text-red-400',
        bgColor: 'bg-red-500/10',
        icon: AlertTriangle,
        activeClass: 'bg-[#DC143C] border-[#DC143C] shadow-[0_0_12px_rgba(220,20,60,0.6)]'
      });
    }

    const myEndStr = profile.subscriptionEndDate || profile.subscriptionEnd || profile.subscription_end_date || profile.subscription_end;
    if (myEndStr) {
      const { daysRemaining } = calculateSubscriptionDetails(myEndStr);
      if (daysRemaining <= 30) {
        tasks.push({
          key: 'my_renewal',
          label: '⚠ Renew Your Chapter Admin Subscription',
          isDone: !!profile.renewalRequested,
          link: '#subscription-card',
          linkText: profile.renewalRequested ? 'PENDING' : 'RENEW',
          iconColor: 'text-red-500',
          bgColor: 'bg-red-500/10',
          icon: Shield,
          activeClass: 'bg-[#DC143C] border-[#DC143C] shadow-[0_0_12px_rgba(220,20,60,0.6)]'
        });
      }
    }

    return tasks;
  }, [chapterUsers, profile, subscriptionRequests, resolvedChapterName]);


  const [viewingMeetingDetails, setViewingMeetingDetails] = useState<any | null>(null);

  const growthScoreDateRange = useMemo(() => {
    if (!profile) return undefined;
    let startStr = profile.subscriptionStart || profile.subscriptionStartDate || profile.created_at || profile.createdAt;
    let endStr = profile.subscriptionEnd || profile.subscriptionEndDate || profile.current_subscription_end_date;
    
    if (startStr && !endStr) {
       const sDate = new Date(startStr);
       sDate.setFullYear(sDate.getFullYear() + 1);
       endStr = sDate.toISOString();
    }
    
    if (startStr && endStr) {
      return { start: new Date(startStr), end: new Date(endStr) };
    }
    return undefined;
  }, [profile]);

  // Dynamic Growth Score calculation (Member & Chapter)
  const memberGrowthScoreData = useMemo(() => {
    return calculateMemberGrowthScoreData({
      profile,
      activeDateRange: growthScoreDateRange,
      allReferrals,
      oneToOnes,
      meetings,
      guestInvitations,
      allSlips: effectiveSlips,
      testimonials: allTestimonials,
      allUsers: allUsersList.length > 0 ? allUsersList : chapterUsers
    });
  }, [profile, growthScoreDateRange, allReferrals, oneToOnes, meetings, guestInvitations, effectiveSlips, allTestimonials, allUsersList, chapterUsers]);

  // Auto-sync growth score to database when calculated score changes
  useEffect(() => {
    if (profile && memberGrowthScoreData) {
      const calculatedScore = memberGrowthScoreData.score;
      if (
        profile.growth_score !== calculatedScore ||
        profile.daily_score !== memberGrowthScoreData.daily_score ||
        profile.analysed_days !== memberGrowthScoreData.analysed_days
      ) {
        syncGrowthScoreToDatabase(profile.id || profile.uid, memberGrowthScoreData, profile.workspace_checklist);
      }
    }
  }, [profile?.id, profile?.uid, memberGrowthScoreData?.score, memberGrowthScoreData?.daily_score, memberGrowthScoreData?.analysed_days]);

  const handleToggleTask = React.useCallback(async (taskKey: string) => {
    if (!profile) return;
    const task = todayTasks.find(t => t.key === taskKey);
    if (task && task.link) {
      navigate(task.link);
    }
  }, [profile, todayTasks, navigate]);

  const chapterGrowthScoreData = useMemo(() => {
    const userChapId = profile?.chapter_id || profile?.chapterId || profile?.adminId;
    const chapterMebs = profile?.role === 'MASTER_ADMIN'
      ? chapterUsers
      : chapterUsers.filter(u => String(u.chapter_id || u.chapterId || u.adminId) === String(userChapId));
    return calculateChapterGrowthScoreData({
      chapterMembers: chapterMebs,
      activeDateRange: growthScoreDateRange,
      allReferrals,
      oneToOnes,
      meetings,
      guestInvitations,
      currentProfile: profile,
      todayTasks
    });
  }, [chapterUsers, profile, growthScoreDateRange, allReferrals, oneToOnes, meetings, guestInvitations, todayTasks]);

  const isChapterLeaderRole = useMemo(() => {
    if (!profile) return false;
    const normRole = (profile.role || '').toUpperCase();
    const normPos = (profile.position || '').toLowerCase();
    return normRole === 'CHAPTER_ADMIN' || normRole === 'PRESIDENT' || normRole === 'VICE_PRESIDENT' || normRole === 'TREASURER' || ['president', 'vice_president', 'treasurer', 'chapter_admin'].includes(normPos);
  }, [profile]);

  const growthScoreData = profile?.role === 'MASTER_ADMIN' ? chapterGrowthScoreData : (usePersonalStats ? memberGrowthScoreData : chapterGrowthScoreData);
  const dynamicGrowthScore = Math.min(100, Math.max(0, Math.round(growthScoreData.score)));
  const growthStatus = growthScoreData.status;
  const growthStatusColor = growthScoreData.statusColor;

  // Calculate Weekly and Monthly Growth Trends from live Supabase data
  const { weeklyGrowth, monthlyGrowth } = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfPrevWeek = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOfPrevMonth = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const countActivities = (start: Date, end: Date) => {
      let refs = allReferrals.filter(r => isDateInRange(r.created_at || r.createdAt, start, end));
      let slips = allSlips.filter(s => isDateInRange(s.created_at || s.createdAt, start, end));
      let otos = oneToOnes.filter(m => isDateInRange(m.created_at || m.createdAt || m.date, start, end));
      let guests = guestInvitations.filter(g => isDateInRange(g.created_at || g.createdAt, start, end));
      let tests = allTestimonials.filter(t => isDateInRange(t.created_at || t.createdAt, start, end));

      if (profile?.role === 'MEMBER' && profile?.position !== 'president' && profile?.position !== 'vice_president' && profile?.position !== 'treasurer' && profile?.position !== 'chapter_admin') {
        refs = refs.filter(r => (r.fromUserId || r.sender_id) === profile.uid || (r.toUserId || r.receiver_id) === profile.uid);
        slips = slips.filter(s => (s.fromUserId || s.sender_id) === profile.uid || (s.toUserId || s.receiver_id) === profile.uid);
        otos = otos.filter(m => [m.organizer_id, m.creatorId, m.member_id].includes(profile.uid));
        guests = guests.filter(g => (g.createdBy || g.user_id) === profile.uid);
        tests = tests.filter(t => (t.authorMemberId || t.author_id) === profile.uid);
      } else if (profile?.role !== 'MASTER_ADMIN' && profile?.chapter_id) {
        refs = refs.filter(r => r.chapter_id === profile.chapter_id || r.chapterId === profile.chapter_id);
        slips = slips.filter(s => s.chapter_id === profile.chapter_id || s.chapterId === profile.chapter_id);
        otos = otos.filter(m => m.chapter_id === profile.chapter_id || m.chapterId === profile.chapter_id);
        guests = guests.filter(g => g.chapter_id === profile.chapter_id || g.chapterId === profile.chapter_id);
        tests = tests.filter(t => t.chapter_id === profile.chapter_id || t.chapterId === profile.chapter_id);
      }

      return refs.length + slips.length + otos.length + guests.length + tests.length;
    };

    const currentWeekAct = countActivities(startOfWeek, now);
    const prevWeekAct = countActivities(startOfPrevWeek, startOfWeek);
    const currentMonthAct = countActivities(startOfMonth, now);
    const prevMonthAct = countActivities(startOfPrevMonth, startOfMonth);

    return {
      weeklyGrowth: calculateGrowthTrend(currentWeekAct, prevWeekAct),
      monthlyGrowth: calculateGrowthTrend(currentMonthAct, prevMonthAct)
    };
  }, [allReferrals, allSlips, oneToOnes, guestInvitations, allTestimonials, profile]);

  // Count up animation to dynamicGrowthScore
  useEffect(() => {
    let start = 0;
    const end = dynamicGrowthScore;
    const duration = 1500; // 1.5 seconds
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setScore(Math.floor(ease * end));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [dynamicGrowthScore, profile]);

  const handleGrowScoreClick = () => {
    const element = document.getElementById('workspace-checklist');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setIsChecklistHighlighted(true);
      setTimeout(() => {
        setIsChecklistHighlighted(false);
      }, 2500);
    }
  };
  
  
        const renderAnalyticsDetails = () => {
    if (!analyticsModalCategory) return null;

    if (analyticsLoading) {
      return (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-4 bg-[#151C2E] rounded-[16px] border border-white/5 shadow-md flex flex-col gap-3 animate-pulse">
              <div className="flex justify-between items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/5 shrink-0" />
                  <div className="w-32 h-4 bg-white/10 rounded-md" />
                </div>
                <div className="w-16 h-5 bg-white/10 rounded-md shrink-0" />
              </div>
              <div className="w-48 h-3 bg-white/5 rounded-md mt-1" />
              <div className="w-32 h-3 bg-white/5 rounded-md" />
            </div>
          ))}
        </div>
      );
    }

    if (analyticsError) {
      return (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-red-500/10 rounded-[20px] flex items-center justify-center mb-5 border border-red-500/20">
            <AlertTriangle className="text-red-400 w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Failed to load records</h3>
          <p className="text-neutral-400 text-sm max-w-xs mb-6">
            There was an error while preparing the data. Please try again.
          </p>
          <button 
            onClick={() => {
              setAnalyticsLoading(true);
              setAnalyticsError(false);
              setTimeout(() => setAnalyticsLoading(false), 600);
            }}
            className="px-5 py-2.5 bg-[#1E293B] hover:bg-white/10 border border-white/5 text-white rounded-[10px] font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-2"
          >
            <RotateCcw size={14} /> Retry
          </button>
        </div>
      );
    }

    const norm = analyticsModalCategory.toLowerCase().trim();
    let records = [];

    // Helper to format role
    const formatRole = (role: string, position: string) => {
      if (role === 'CHAPTER_ADMIN') return 'Chapter Admin';
      if (role === 'PRESIDENT') return 'President';
      if (role === 'VICE_PRESIDENT') return 'Vice President';
      if (role === 'TREASURER') return 'Treasurer';
      if (position && position.toLowerCase() !== 'none') return position;
      return 'Member';
    };

    const formatDate = (dateString: string) => {
      if (!dateString) return null;
      try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return null;
        return format(d, 'dd MMM yyyy');
      } catch (e) {
        return null;
      }
    };

    const formatTimeStr = (timeString: string, dateString: string) => {
      if (!timeString && !dateString) return null;
      try {
        if (timeString) {
          // If it's just a time like "15:00" or "15:00:00"
          if (timeString.includes(':') && !timeString.includes('T')) {
             const parts = timeString.split(':');
             const timeD = new Date();
             timeD.setHours(parseInt(parts[0], 10) || 0);
             timeD.setMinutes(parseInt(parts[1], 10) || 0);
             return format(timeD, 'h:mm a');
          }
        }
        if (dateString) {
          const dateD = new Date(dateString);
          if (isNaN(dateD.getTime())) return null;
          // check if time is explicitly set and not 00:00:00 (unless actually midnight)
          // Simplified: just return time from the Date object
          if (dateString.includes('T')) {
            return format(dateD, 'h:mm a');
          }
        }
        return null;
      } catch (e) {
        return null;
      }
    };

    if (norm.includes('member')) {
      let list = chapterUsers.filter(u => u.role !== 'MASTER_ADMIN');
      if (norm.includes('active') && !norm.includes('inactive')) {
        list = list.filter(u => isMemberActive(u));
      } else if (norm.includes('inactive')) {
        list = list.filter(u => !isMemberActive(u));
      }
      
      records = list.map(m => {
        const isSubActive = isMemberActive(m);
        return {
          id: m.uid || m.id,
          title: m.name || 'N/A',
          subtitle: formatRole(m.role, m.position),
          icon: <User size={20} className="text-white/70" />,
          badgeText: isSubActive ? 'Active' : 'Inactive',
          badgeColor: isSubActive ? 'emerald' : 'red',
          date: m.createdAt ? formatDate(m.createdAt) : null,
          time: null,
          notes: `Business: ${m.businessName || m.company || '-'}`
        };
      });
    } else if (norm.includes('chapter') && !norm.includes('meeting')) {
      records = allChapters.map(c => ({
        id: c.id,
        title: c.chapterName || c.chapter_name || c.name || 'N/A',
        subtitle: c.region || 'Region',
        icon: <Building2 size={20} className="text-white/70" />,
        badgeText: 'Active',
        badgeColor: 'blue',
        date: null,
        time: c.meetingTime || null,
        notes: `Meeting Day: ${c.meetingDay || '-'}`
      }));
    } else if (norm.includes('business') || norm.includes('thank you')) {
      let list = effectiveSlips;
      const uid = String(profile?.id || profile?.uid);
      const isGlobal = profile?.role === 'MASTER_ADMIN';

      if (!isGlobal) {
        list = list.filter(s => String(s.fromUserId) === uid || String(s.toUserId) === uid || String(s.chapter_id) === profile?.chapter_id);
      }

      if (norm.includes('sent')) {
        list = list.filter(s => String(s.fromUserId) === uid);
      } else if (norm.includes('received')) {
        list = list.filter(s => String(s.toUserId) === uid);
      }

      records = list.map(slip => {
        const giver = allUsersList.find(u => String(u.id || '') === String(slip.fromUserId) || String(u.uid || '') === String(slip.fromUserId)) || chapterUsers.find(u => String(u.id || '') === String(slip.fromUserId) || String(u.uid || '') === String(slip.fromUserId));
        const recipient = allUsersList.find(u => String(u.id || '') === String(slip.toUserId) || String(u.uid || '') === String(slip.toUserId)) || chapterUsers.find(u => String(u.id || '') === String(slip.toUserId) || String(u.uid || '') === String(slip.toUserId));
        const giverName = giver?.name || (giver as any)?.full_name || giver?.displayName || slip.fromUserName || 'Unknown Member';
        const recipientName = recipient?.name || (recipient as any)?.full_name || recipient?.displayName || slip.toUserName || 'Unknown Member';
        return {
          id: slip.id,
          title: slip.customerName || 'Business Given',
          subtitle: norm.includes('sent') ? `To: ${recipientName}` : `From: ${giverName}`,
          icon: <Briefcase size={20} className="text-white/70" />,
          badgeText: `₹${Number(slip.businessValue || slip.business_value || slip.amount || 0).toLocaleString()}`,
          badgeColor: 'emerald',
          date: slip.createdAt ? formatDate(slip.createdAt) : null,
          time: slip.createdAt ? formatTimeStr('', slip.createdAt) : null,
          notes: slip.notes || '-'
        };
      });
    } else if (norm.includes('referral')) {
      let list = effectiveReferrals;
      const uid = String(profile?.id || profile?.uid);
      const isGlobal = profile?.role === 'MASTER_ADMIN';

      if (!isGlobal) {
        list = list.filter(s => String(s.fromUserId) === uid || String(s.toUserId) === uid || String(s.chapter_id) === profile?.chapter_id);
      }

      if (norm.includes('sent')) {
        list = list.filter(s => String(s.fromUserId) === uid);
      } else if (norm.includes('received')) {
        list = list.filter(s => String(s.toUserId) === uid);
      }

      records = list.map(ref => {
        const giver = allUsersList.find(u => u.uid === ref.fromUserId) || chapterUsers.find(u => u.uid === ref.fromUserId);
        const recipient = allUsersList.find(u => u.uid === ref.toUserId) || chapterUsers.find(u => u.uid === ref.toUserId);
        const st = (ref.status || '').toLowerCase();
        let bColor = 'amber';
        if (st === 'closed' || st === 'completed') bColor = 'emerald';
        if (st === 'cancelled') bColor = 'red';

        return {
          id: ref.id,
          title: norm.includes('sent') ? `To: ${recipient?.name || ref.toUserName || 'N/A'}` : `From: ${giver?.name || ref.fromUserName || 'N/A'}`,
          subtitle: ref.customerName || 'Referral',
          icon: <Share2 size={20} className="text-white/70" />,
          badgeText: ref.status || 'Pending',
          badgeColor: bColor,
          date: ref.createdAt ? formatDate(ref.createdAt) : null,
          time: ref.createdAt ? formatTimeStr('', ref.createdAt) : null,
          notes: ref.notes || ref.requirement || '-'
        };
      });
    } else if (norm.includes('one-to-one') || norm.includes('one to one') || norm.includes('1-to-1') || norm.includes('1:1') || norm.includes('1 to 1')) {
      let list = effectiveOneToOnes;
      const isGlobal = profile?.role === 'MASTER_ADMIN';

      if (!isGlobal) {
         list = list.filter(m => {
            if (usePersonalStats) {
                return isUserOneToOneParticipant(m, userCandidateIds);
            }
            const orgId = String(m.organizer_id || m.creatorId || m.sender_id || '');
            const recId = String(m.member_id || m.receiver_id || '');
            const pIds = (m.participantIds || []).map((id: string) => String(id));
            return chapterUserIds.includes(orgId) || chapterUserIds.includes(recId) || pIds.some(pid => chapterUserIds.includes(pid));
         });
      }
      
      records = list.map(m => {
        const senderId = String(m.sender_id || m.organizer_id || m.creatorId || '');
        const receiverId = String(m.receiver_id || m.member_id || (m.participantIds && m.participantIds[0]) || '');
        const sender = allUsersList.find(u => String(u.uid || u.id) === senderId) || chapterUsers.find(u => String(u.uid || u.id) === senderId);
        const receiver = allUsersList.find(u => String(u.uid || u.id) === receiverId) || chapterUsers.find(u => String(u.uid || u.id) === receiverId);
        
        const st = (m.status || '').toLowerCase();
        let bColor = 'amber';
        if (st === 'completed') bColor = 'emerald';
        if (st === 'cancelled') bColor = 'red';

        return {
          id: m.id,
          title: `${sender?.name || 'Member'} & ${receiver?.name || 'Member'}`,
          subtitle: m.venue || m.meetingLocation || m.locationType || 'Online Meeting',
          icon: <Handshake size={20} className="text-white/70" />,
          badgeText: m.status || 'Scheduled',
          badgeColor: bColor,
          date: m.date || m.scheduledDate ? formatDate(m.date || m.scheduledDate) : null,
          time: formatTimeStr(m.time || m.meetingTime, m.date || m.scheduledDate),
          notes: m.notes || '-'
        };
      });
    } else if (norm.includes('guest') || norm.includes('visitor')) {
      let list = effectiveGuestInvitations;
      const isGlobal = profile?.role === 'MASTER_ADMIN';

      if (!isGlobal) {
        list = list.filter(g => {
          const invId = String(g.invited_by_user_id || g.invited_by || g.createdBy || g.inviterId || g.inviter_id || g.user_id || '').trim();
          if (usePersonalStats) {
             return invId === String(profile?.id || profile?.uid);
          }
          return String(g.chapter_id || g.chapterId) === String(profile?.chapter_id);
        });
      }
      
      records = list.map(g => {
        const invId = String(g.invited_by_user_id || g.invited_by || g.createdBy || g.inviterId || g.inviter_id || g.user_id || '').trim();
        const inviter = allUsersList.find(u => String(u.uid || u.id) === invId) || chapterUsers.find(u => String(u.uid || u.id) === invId);
        const inviterName = g.invited_by_name || inviter?.name || g.inviterName || 'Member';
        const inviterRole = g.invited_by_role || (inviter?.position ? inviter.position : 'Member');
        const st = (g.status || '').toLowerCase();
        let bColor = 'amber';
        if (st === 'attended') bColor = 'emerald';
        if (st === 'no-show') bColor = 'red';

        return {
          id: g.id,
          title: g.guest_name || g.guestName || 'N/A',
          subtitle: `Invited By: ${inviterName}${inviterRole ? ` (${inviterRole})` : ''}`,
          icon: <UserPlus size={20} className="text-white/70" />,
          badgeText: g.status || 'Expected',
          badgeColor: bColor,
          date: g.created_at || g.visitDate ? formatDate(g.created_at || g.visitDate) : null,
          time: null,
          notes: g.business_category || g.profession ? `Business: ${g.business_category || g.profession}` : '-'
        };
      });
    } else if (norm.includes('testimonial')) {
      let list = effectiveTestimonials;
      const isGlobal = profile?.role === 'MASTER_ADMIN';

      if (!isGlobal) {
         list = list.filter(t => String(t.chapter_id) === String(profile?.chapter_id));
      }

      if (norm.includes('given')) {
        list = list.filter(s => s.giverId === (profile?.uid || profile?.id));
      } else if (norm.includes('received')) {
        list = list.filter(s => s.receiverId === (profile?.uid || profile?.id));
      }

      records = list.map(t => {
        const giver = allUsersList.find(u => String(u.uid) === String(t.giverId)) || chapterUsers.find(u => String(u.uid) === String(t.giverId));
        const receiver = allUsersList.find(u => String(u.uid) === String(t.receiverId)) || chapterUsers.find(u => String(u.uid) === String(t.receiverId));
        let text = t.testimonial || '';
        if (text.includes('|||')) {
          const parts = text.split('|||');
          text = parts[0];
        }
        return {
          id: t.id,
          title: norm.includes('given') ? `To: ${receiver?.name || 'N/A'}` : `From: ${giver?.name || 'N/A'}`,
          subtitle: 'Testimonial',
          icon: <Star size={20} className="text-white/70" />,
          badgeText: 'Published',
          badgeColor: 'blue',
          date: t.createdAt ? formatDate(t.createdAt) : null,
          time: t.createdAt ? formatTimeStr('', t.createdAt) : null,
          notes: text || '-'
        };
      });
    } else if (norm.includes('attendance') || norm.includes('meeting') || norm === 'meetings') {
      let list = effectiveMeetings;
      const isGlobal = profile?.role === 'MASTER_ADMIN';
      
      if (!isGlobal) {
         list = list.filter(m => String(m.chapter_id) === String(profile?.chapter_id));
      }
      
      records = list.map(m => {
        return {
          id: m.id,
          title: m.title || 'Chapter Meeting',
          subtitle: m.type || 'N/A',
          icon: <Calendar size={20} className="text-white/70" />,
          badgeText: m.status || 'Scheduled',
          badgeColor: (m.status || '').toLowerCase() === 'completed' ? 'emerald' : 'amber',
          date: m.date ? formatDate(m.date) : null,
          time: m.startTime ? `${m.startTime} - ${m.endTime || 'End'}` : null,
          notes: m.location || '-'
        };
      });
    }

    if (records.length === 0) {
      return (
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-[#151C2E] rounded-full flex items-center justify-center mb-5 border border-white/5 shadow-inner">
            <FileText className="text-neutral-500 w-8 h-8 opacity-70" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Records Found</h3>
          <p className="text-neutral-400 text-sm max-w-xs leading-relaxed">
            There are currently no activity records available for this category.
          </p>
        </div>
      );
    }

    return (
      <div className="w-full">
        {/* Desktop 2-columns, Mobile 1-column */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1 pb-4">
          {records.map((r: any, idx) => (
            <div 
              key={r.id || idx} 
              className="bg-[#151C2E] hover:bg-[#1A233A] rounded-[16px] border border-white/5 p-4 flex flex-col gap-4 transition-colors"
            >
              {/* Top Row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#1E293B] border border-white/10 flex items-center justify-center shrink-0">
                    {r.icon || <User size={20} className="text-white/70" />}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h4 className="text-[15px] font-bold text-white break-words" title={r.title}>{r.title || 'Unknown'}</h4>
                    <span className="text-[12px] font-medium text-neutral-400 break-words" title={r.subtitle}>{r.subtitle || ''}</span>
                  </div>
                </div>
                {r.badgeText && (
                  <span className={`px-2.5 py-1 rounded-[6px] text-[10px] font-black uppercase tracking-wider shrink-0 whitespace-nowrap ${
                    r.badgeColor === 'emerald' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    r.badgeColor === 'red' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                    r.badgeColor === 'amber' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    r.badgeColor === 'blue' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                    'bg-neutral-500/10 text-neutral-400 border border-neutral-500/20'
                  }`}>
                    {r.badgeText}
                  </span>
                )}
              </div>

              {/* Date & Time Row */}
              {(r.date || r.time) && (
                <div className="flex items-center gap-4 text-[13px] text-neutral-300">
                  {r.date && (
                    <div className="flex items-center gap-1.5 bg-[#0F172A] px-2.5 py-1 rounded-md border border-white/5">
                      <span>📅</span>
                      <span className="font-medium">{r.date}</span>
                    </div>
                  )}
                  {r.time && (
                    <div className="flex items-center gap-1.5 bg-[#0F172A] px-2.5 py-1 rounded-md border border-white/5">
                      <span>🕒</span>
                      <span className="font-medium">{r.time}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Notes Row */}
              <div className="pt-3 border-t border-white/5">
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1 block">Notes / Details</span>
                <p className="text-[13px] text-neutral-300 font-medium line-clamp-2 break-words leading-relaxed" title={r.notes}>
                  {r.notes || '-'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'GOOD MORNING, 👋';
    if (hour < 18) return 'GOOD AFTERNOON, 👋';
    return 'GOOD EVENING, 👋';
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-5 sm:space-y-[28px] lg:space-y-[40px] pb-20 md:pb-8 relative">
      
      {/* Background decorations matching the mockup style */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-[-1]">
        <div className="absolute top-[-10%] right-[-5%] w-[60%] h-[50%] bg-[#E53935]/3 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#3B82F6]/3 blur-[120px] rounded-full" />
      </div>

      {/* TOP HERO HEADER */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch"
      >
        {/* Left/Center Wrapper: Hero Section (Optimized Height: 320-340px) */}
        <div className="xl:col-span-12 bg-gradient-to-b from-[#0B1220] to-[#111827] rounded-[20px] p-[20px] md:p-[24px] lg:p-[28px] shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/5 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 lg:h-[330px] md:h-[300px] h-auto">
          
          {/* Suble moving gradient radial light blobs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <motion.div 
              animate={{ 
                x: [0, 30, -15, 0], 
                y: [0, -20, 15, 0],
                scale: [1, 1.1, 0.95, 1]
              }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-10 left-10 w-44 h-44 rounded-full bg-[#E53935]/10 blur-[60px]"
            />
            <motion.div 
              animate={{ 
                x: [0, -20, 20, 0], 
                y: [0, 30, -15, 0],
                scale: [1, 0.95, 1.05, 1]
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-10 right-24 w-48 h-48 rounded-full bg-[#3B82F6]/5 blur-[70px]"
            />
          </div>
          
          {/* Left Block: Greeting, Name, Desc, CTAs */}
          <div className="relative z-10 flex-1 flex flex-col items-center md:items-start text-center md:text-left justify-center h-full space-y-2 md:space-y-3">
            <span className="text-[12px] md:text-[14px] font-extrabold text-[#9CA3AF] uppercase tracking-[3px]">
              {getGreeting()}
            </span>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <h1 className="text-[34px] md:text-[42px] lg:text-[52px] font-black text-white leading-none tracking-tight">
                {userName || cleanHeroName(profile?.name) || 'Sudarshan Vagale'}
              </h1>
              {profile?.position && profile.position !== 'member' && (
                <span className="inline-flex items-center gap-1 bg-amber-500/15 border border-amber-500/30 text-amber-400 font-extrabold text-[10px] uppercase tracking-wider px-3 py-1 rounded-full shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                  <Crown size={12} className="text-amber-500 animate-pulse" />
                  {profile.position.replace('_', ' ')}
                </span>
              )}
            </div>
            <p className="text-[14px] md:text-[16px] lg:text-[18px] font-medium text-[#D1D5DB] max-w-[420px] leading-relaxed">
              Welcome back to <strong className="text-[#E53935] font-semibold">SSK Business Network.</strong>
            </p>
            
            {/* CTA Buttons */}
            {profile?.role !== 'MASTER_ADMIN' && (
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 w-full sm:w-auto">
                <motion.button 
                  onClick={handleGrowScoreClick}
                  onMouseEnter={() => setIsRocketHovered(true)}
                  onMouseLeave={() => setIsRocketHovered(false)}
                  whileHover={{ y: -4, scale: 1.03, boxShadow: "0 0 20px rgba(229,57,53,0.4)" }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full sm:w-auto bg-[#E53935] hover:bg-[#D32F2F] text-white px-5 lg:px-7 h-[46px] sm:h-[50px] rounded-[14px] font-bold text-[13px] flex items-center justify-center gap-2 transition-all duration-300"
                >
                  <motion.div
                    animate={isRocketHovered ? { y: -3, x: 3, scale: 1.1 } : { y: 0, x: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  >
                    <Rocket size={16} />
                  </motion.div>
                  Grow Your Score
                </motion.button>
                
                <Link to="/member/my-report" className="w-full sm:w-auto">
                  <motion.button 
                    onMouseEnter={() => setIsReportHovered(true)}
                    onMouseLeave={() => setIsReportHovered(false)}
                    whileHover={{ y: -4, scale: 1.03, bg: "rgba(31, 41, 55, 0.9)" }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full bg-[#1F2937]/80 hover:bg-[#1F2937] text-white px-5 lg:px-7 h-[46px] sm:h-[50px] rounded-[14px] font-bold text-[13px] flex items-center justify-center gap-2 border border-white/10 transition-all duration-300 w-full"
                  >
                    <motion.div
                      animate={isReportHovered ? { rotate: [0, 10, -10, 0], scale: 1.1 } : { rotate: 0, scale: 1 }}
                      transition={{ duration: 0.4 }}
                    >
                      <Activity size={16} />
                    </motion.div>
                    My Chapter Report
                  </motion.button>
                </Link>
              </div>
            )}

            {/* Growth Score Analytics Metadata Badge */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-[#D1D5DB] font-semibold bg-[#0B1220]/80 border border-white/10 rounded-xl px-3.5 py-1.5 shadow-md w-fit">
              {!usePersonalStats && (
                <>
                  <span className="text-purple-400 font-bold">Members Analysed: <span className="text-white font-extrabold">{growthScoreData.membersAnalysed}</span></span>
                  <span className="text-neutral-500">•</span>
                </>
              )}
              <span className="text-blue-400 font-bold">Score: <span className="text-white font-extrabold">{growthScoreData.score}%</span></span>
            </div>
          </div>

          {/* Center Block: Health Score Circle (Reduced Size by 10%) */}
          <div className="relative z-10 flex items-center justify-center shrink-0 w-[115px] md:w-[130px] h-[115px] md:h-[130px] md:mr-16 lg:mr-24 mt-3 md:mt-0">
             {/* Circular Gauge */}
             <div className="absolute inset-0 rounded-full border-[6px] border-[#111827] shadow-[0_0_20px_rgba(0,0,0,0.4)]" />
             
             {/* Spinning/pulsing subtle gradient circle glow */}
             <motion.div 
               animate={{ rotate: 360 }}
               transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
               className="absolute inset-[-4px] rounded-full opacity-40 blur-[8px] border-2 border-dashed border-[#E53935]"
             />

             <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 relative z-10">
               <defs>
                 <linearGradient id="score-grad-new" x1="0" y1="0" x2="1" y2="1">
                   <stop offset="0%" stopColor="#E53935" />
                   <stop offset="50%" stopColor="#8B5CF6" />
                   <stop offset="100%" stopColor="#10B981" />
                 </linearGradient>
               </defs>
               {/* Background Track */}
               <circle 
                 cx="50" 
                 cy="50" 
                 r="44" 
                 stroke="#1a2233" 
                 strokeWidth="6" 
                 fill="none" 
               />
               {/* Progress Ring */}
               <circle 
                 cx="50" 
                 cy="50" 
                 r="44" 
                 stroke="url(#score-grad-new)" 
                 strokeWidth="6" 
                 fill="none" 
                 strokeDasharray="276" 
                 strokeDashoffset={276 - (276 * Math.min(100, Math.max(0, score))) / 100}
                 strokeLinecap="round" 
                 className="transition-all duration-300 drop-shadow-[0_0_8px_rgba(229,57,53,0.6)]" 
               />
             </svg>
             <div className="absolute inset-0 flex flex-col items-center justify-center m-2.5 rounded-full bg-[#0B1220]/90 backdrop-blur-sm shadow-inner z-20">
               <span className="text-[26px] md:text-[30px] font-extrabold text-white leading-none tracking-tighter">{score}%</span>
               <span className="text-[7px] md:text-[8px] font-bold text-[#9CA3AF] uppercase tracking-widest mt-0.5">{usePersonalStats ? 'Personal Growth' : 'Chapter Growth'}</span>
               <div className={cn("mt-1 px-2 py-0.5 rounded-full text-[8px] md:text-[9px] font-bold tracking-wider border", growthStatusColor)}>
                 {growthStatus}
               </div>
             </div>
             
             {/* Trend Indicators (Right Side Desktop Sync) */}
             <div className="absolute -right-20 top-1/2 -translate-y-1/2 flex flex-col gap-3.5 hidden md:flex">
                <div className="flex flex-col">
                  <div className={cn("flex items-center gap-1 font-bold text-[11px]", weeklyGrowth.isPositive ? "text-emerald-400" : weeklyGrowth.isNegative ? "text-red-400" : "text-[#9CA3AF]")}>
                    {weeklyGrowth.isPositive && <TrendingUp size={13} strokeWidth={3} />}
                    {weeklyGrowth.isNegative && <TrendingDown size={13} strokeWidth={3} />}
                    {weeklyGrowth.formatted}
                  </div>
                  <span className="text-[10px] font-bold text-[#D1D5DB] mt-0.5 leading-tight">Weekly<br/><span className="text-[#9CA3AF] font-medium text-[8px]">vs last week</span></span>
                </div>
                <div className="flex flex-col">
                  <div className={cn("flex items-center gap-1 font-bold text-[11px]", monthlyGrowth.isPositive ? "text-emerald-400" : monthlyGrowth.isNegative ? "text-red-400" : "text-[#9CA3AF]")}>
                    {monthlyGrowth.isPositive && <TrendingUp size={13} strokeWidth={3} />}
                    {monthlyGrowth.isNegative && <TrendingDown size={13} strokeWidth={3} />}
                    {monthlyGrowth.formatted}
                  </div>
                  <span className="text-[10px] font-bold text-[#D1D5DB] mt-0.5 leading-tight">Monthly<br/><span className="text-[#9CA3AF] font-medium text-[8px]">vs last month</span></span>
                </div>
             </div>
          </div>
        </div>

        {/* Right Block: Platinum Membership Card (Floating, Glow, Animated Fill) */}
        {false && (
          <motion.div 
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="xl:col-span-4 bg-gradient-to-b from-[#111827] to-[#0B1220] rounded-[20px] p-[20px] md:p-[24px] lg:p-[28px] shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/5 relative overflow-hidden flex flex-col justify-between lg:h-[330px] md:h-[300px] h-auto min-h-[220px]"
          >
            <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-[#E53935]/8 rounded-full blur-[60px]" />
            <div className="absolute bottom-0 right-0 w-[100px] h-[100px] bg-[#8B5CF6]/8 rounded-full blur-[50px]" />
            
            <div className="relative z-10 flex justify-between items-start">
               <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse" />
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Active Access</span>
                  </div>
                  <h3 className="text-white text-[20px] md:text-[22px] font-bold tracking-tight leading-tight">Platinum Member</h3>
                  <p className="text-[#9CA3AF] text-[12px] font-medium mt-1">SSK Business Network</p>
               </div>
               
               {/* Crown / Trophy Floating and Glowing */}
               <motion.div 
                 animate={{ y: [0, -4, 0], rotate: [0, 2, -2, 0] }}
                 transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                 className="w-10 h-10 rounded-[12px] bg-[#0B1220] flex items-center justify-center text-[#FBBF24] border border-white/10 shadow-[0_0_15px_rgba(251,191,36,0.4)]"
               >
                 <Crown size={20} className="fill-[#FBBF24]/10" />
               </motion.div>
            </div>

            <div className="relative z-10 mt-4 md:mt-0">
              <div className="flex justify-between items-end mb-1 text-[11px]">
                <span className="font-bold text-[#9CA3AF]">Next Milestone</span>
                <span className="font-bold text-white">Diamond Partner</span>
              </div>
              <div className="w-full h-1.5 bg-[#1F2937] rounded-full overflow-hidden border border-white/5">
                 <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: "75%" }}
                   transition={{ duration: 1.5, ease: "easeOut" }}
                   className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#E53935] rounded-full shadow-[0_0_6px_rgba(229,57,53,0.5)]" 
                 />
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                 <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider">Enterprise Seat</span>
                 
                 <motion.button 
                   whileHover={{ scale: 1.05, boxShadow: "0 0 12px rgba(255,255,255,0.15)" }}
                   whileTap={{ scale: 0.95 }}
                   className="bg-[#1F2937] hover:bg-[#374151] text-white px-4 py-1.5 rounded-full text-[11px] font-bold border border-white/10 transition-colors duration-200"
                 >
                   Manage
                 </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Dynamic Chapter Analytics Heading & KPI cards - Shown for Member, Chapter Admin, President, Vice President, Treasurer, and Master Admin */}
      {profile && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 mt-8">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                {chapterHeading}
              </h2>
              <p className="text-[11px] sm:text-xs text-[#9CA3AF] font-bold uppercase tracking-wider">
                {profile?.role === 'MASTER_ADMIN' 
                  ? 'Real-time analytics across all chapters.' 
                  : usePersonalStats
                    ? 'Your Real-Time Analytics & Business Performance.'
                    : 'Real-time analytics and business performance for your chapter.'}
              </p>
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
              {(activeDateRange || appliedChapterFilter !== 'ALL' || appliedMemberFilter !== 'ALL') && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
                  <span>
                    {activeDateRange ? `${filterStartDate} to ${filterEndDate}` : 'Filtered'}
                    {appliedChapterFilter !== 'ALL' && ` • Chapter: ${allChapters.find(c => c.id === appliedChapterFilter)?.chapter_name || appliedChapterFilter}`}
                    {appliedMemberFilter !== 'ALL' && ` • Member: ${allUsersList.find(u => u.uid === appliedMemberFilter || u.id === appliedMemberFilter)?.name || appliedMemberFilter}`}
                  </span>
                  <button
                    onClick={handleClearFilter}
                    className="p-1 hover:bg-red-500/20 rounded-lg text-red-300 transition-colors cursor-pointer"
                    title="Clear Filter"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              <button
                onClick={() => setIsFilterModalOpen(true)}
                className={cn(
                  "px-4 h-10 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer border shadow-sm",
                  (activeDateRange || appliedChapterFilter !== 'ALL' || appliedMemberFilter !== 'ALL')
                    ? "bg-red-600 text-white border-red-500 shadow-red-600/20"
                    : "bg-[#111827] text-white hover:bg-[#1F2937] border-white/10"
                )}
              >
                <Filter size={15} className={(activeDateRange || appliedChapterFilter !== 'ALL' || appliedMemberFilter !== 'ALL') ? "text-white" : "text-red-400"} />
                Filter
                {(activeDateRange || appliedChapterFilter !== 'ALL' || appliedMemberFilter !== 'ALL') && (
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                )}
              </button>
            </div>
          </div>

          <StatGrid 
            role={profile?.role}
            position={profile?.position}
            totalChaptersCount={totalChaptersCount}
            totalMembersCount={totalMembersCount}
            activePartnersCount={activePartnersCount}
            inactiveMembersCount={inactiveMembersCount}
            businessGeneratedTotal={businessGeneratedTotal}
            businessSentTotal={businessSentTotal}
            businessSentCount={businessSentCount}
            businessReceivedTotal={businessReceivedTotal}
            businessReceivedCount={businessReceivedCount}
            referralsPassedCount={referralsPassedCount}
            referralsSentCount={referralsSentCount}
            referralsReceivedCount={referralsReceivedCount}
            thankYouSlipsCount={thankYouSlipsCount}
            thankYouSlipsSentCount={businessReceivedCount}
            thankYouSlipsReceivedCount={businessSentCount}
            upcomingSyncsCount={upcomingSyncsCount}
            oneToOneMeetingsCount={oneToOneMeetingsCount}
            visitorsAttendedCount={visitorsAttendedCount}
            guestsInvitedCount={guestsInvitedCount}
            weeklyMeetingAttendance={weeklyMeetingAttendance}
            growthScore={dynamicGrowthScore}
            newMembersThisMonthCount={newMembersThisMonthCount}
            testimonialsCount={chapterTestimonialsCount}
            testimonialsGivenCount={testimonialsGivenCount}
            testimonialsReceivedCount={testimonialsReceivedCount}
            meetingsCount={chapterMeetingsCount}
            meetingsScheduledCount={userMeetingsScheduled}
            meetingsAttendedCount={userMeetingsAttended}
            oneToOneScheduledCount={userOneToOnesScheduled}
            oneToOneCompletedCount={userOneToOnesCompleted}
            guestsJoinedCount={userGuestsJoined}
            onCardClick={(label) => {
              setAnalyticsModalCategory(label);
              setAnalyticsLoading(true);
              setAnalyticsError(false);
              setTimeout(() => {
                setAnalyticsLoading(false);
              }, 600);
            }}
          />
        </>
      )}

      {/* COMPANION / REPORTS VIEW BASED ON ROLE */}
      {profile?.role !== 'MASTER_ADMIN' && (
        <MemberCompanionView
          profile={profile}
          dynamicContext={{ period: 'Weekly', priority: 'Engage', tip: '', badge: '' }}
          completedFocusCount={completedFocusCount}
          focusProgressPercent={focusProgressPercent}
          activeFocusTasks={{ 
            attendMeeting: hasAttendedMeeting, 
            passReferral: hasPassedReferral, 
            scheduleOneToOne: hasScheduledOneToOne, 
            followUpReferral: hasFollowedUpReferral, 
            inviteGuest: hasInvitedGuest 
          }}
          handleToggleTask={handleToggleTask}
          nextMeeting={null}
          countdown={{ days: 0, hours: 0, minutes: 0 }}
          finalRecentActivities={filteredRecentActivities}
          businessGrowthScore={memberGrowthScoreData.score}
          daysAnalysedText={memberGrowthScoreData.daysAnalysedText}
          scoreText={memberGrowthScoreData.scoreText}
          onOpenFilterModal={() => setIsFilterModalOpen(true)}
          currentMonthMetrics={{}}
          hasLoggedOneToOne={hasScheduledOneToOne}
          hasSentThankYouSlip={false}
          recommendation={{ title: 'Schedule 1-to-1', description: 'Schedule 1-to-1 sessions to boost network visibility.', action: 'Schedule', link: '/one-to-one' }}
          isHighlightActive={isChecklistHighlighted}
          chapterName={resolvedChapterName}
          todayTasks={todayTasks}
          allSlips={effectiveSlips}
          allReferrals={effectiveReferrals}
        />
      )}
 
      
      {(profile?.role === 'CHAPTER_ADMIN' || profile?.position === 'chapter_admin') && (
        <ChapterAdminCompanionView
          profile={profile}
          chapterHealthScore={chapterGrowthScoreData.score}
          membersAnalysed={chapterGrowthScoreData.membersAnalysed}
          daysAnalysedText={chapterGrowthScoreData.daysAnalysedText}
          scoreText={chapterGrowthScoreData.scoreText}
          onOpenFilterModal={() => setIsFilterModalOpen(true)}
          chapterMemberCount={totalMembersCount}
          chapterReferrals={referralsPassedCount}
          chapterBusiness={businessGeneratedTotal}
          finalRecentActivities={filteredRecentActivities}
          tasks={chapterAdminTasks}
        />
      )}
      
      {profile?.role === 'MASTER_ADMIN' && (
        <MasterAdminCompanionView
          tasks={masterAdminTasks}
          profile={profile}
          networkHealthScore={chapterGrowthScoreData.score}
          membersAnalysed={growthScoreData.membersAnalysed}
          daysAnalysedText={growthScoreData.daysAnalysedText}
          scoreText={growthScoreData.scoreText}
          globalMemberCount={totalMembersCount}
          globalChapterCount={totalChaptersCount}
          globalBusinessGenerated={businessGeneratedTotal}
          globalReferralsCount={referralsPassedCount}
          finalRecentActivities={filteredRecentActivities}
          setActiveTab={() => {}}
          topPerformingChapters={topPerformingChapters}
          allSlips={effectiveSlips}
          allReferrals={effectiveReferrals}
          subscriptionStats={subscriptionStats}
          leadershipStats={leadershipStats}
        />
      )}

      {/* Global Filter Modal */}
      <Modal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title="Filter Analytics"
        maxWidth="max-w-md"
      >
        <div className="flex flex-col gap-5 p-1">
          <p className="text-xs font-semibold text-[#9CA3AF]">
            Filter analytics and workspace data by selecting a date range.
          </p>

          {dateError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              {dateError}
            </div>
          )}

          {profile?.role === 'MASTER_ADMIN' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#D1D5DB] uppercase tracking-wider">
                  Chapter
                </label>
                <select
                  value={selectedChapterFilter}
                  onChange={(e) => {
                    const newChap = e.target.value;
                    setSelectedChapterFilter(newChap);
                    if (newChap !== 'ALL') {
                      const memberBelongs = availableMembersForFilter.some(u => 
                        (u.uid === selectedMemberFilter || u.id === selectedMemberFilter) && 
                        (u.chapter_id === newChap || u.chapterId === newChap)
                      );
                      if (!memberBelongs) {
                        setSelectedMemberFilter('ALL');
                      }
                    }
                  }}
                  className="w-full h-11 px-3 rounded-xl bg-[#0F172A] border border-white/10 text-white text-sm font-medium focus:outline-none focus:border-[#E53935] transition-colors"
                >
                  <option value="ALL">All Chapters</option>
                  {allChapters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.chapter_name || c.name || `Chapter ${c.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#D1D5DB] uppercase tracking-wider">
                  Member
                </label>
                <select
                  value={selectedMemberFilter}
                  onChange={(e) => setSelectedMemberFilter(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-[#0F172A] border border-white/10 text-white text-sm font-medium focus:outline-none focus:border-[#E53935] transition-colors"
                >
                  <option value="ALL">All Members</option>
                  {availableMembersForFilter.map((u) => (
                    <option key={u.uid || u.id} value={u.uid || u.id}>
                      {u.name || 'Unnamed Member'} {u.chapterName ? `(${u.chapterName})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#D1D5DB] uppercase tracking-wider">
                Start Date
              </label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => {
                  setFilterStartDate(e.target.value);
                  setDateError(null);
                }}
                className="w-full h-11 px-3 rounded-xl bg-[#0F172A] border border-white/10 text-white text-sm font-medium focus:outline-none focus:border-[#E53935] transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#D1D5DB] uppercase tracking-wider">
                End Date
              </label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => {
                  setFilterEndDate(e.target.value);
                  setDateError(null);
                }}
                className="w-full h-11 px-3 rounded-xl bg-[#0F172A] border border-white/10 text-white text-sm font-medium focus:outline-none focus:border-[#E53935] transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={handleClearFilter}
              className="px-4 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-[#9CA3AF] hover:text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw size={14} />
              Reset
            </button>

            <button
              type="button"
              onClick={handleApplyFilter}
              disabled={isFilterLoading}
              className="px-5 h-10 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold transition-all shadow-lg shadow-red-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isFilterLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Filter size={14} />
                  Apply
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      <AnimatePresence>
        {analyticsModalCategory !== null && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAnalyticsModalCategory(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md transition-all duration-500"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-6xl max-h-[90vh] flex flex-col bg-[#0B1220] rounded-[24px] shadow-[0_16px_64px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden"
            >
              {/* Header */}
              <div className="shrink-0 p-6 sm:p-8 border-b border-white/5 relative overflow-hidden bg-[#111827]">
                <div className="absolute top-[-50%] right-[-10%] w-[50%] h-[200%] bg-primary/10 blur-[80px] rounded-full pointer-events-none" />
                <div className="flex items-start justify-between gap-4 relative z-10">
                  <div className="flex items-center gap-4 sm:gap-5">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-[16px] bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <Activity size={24} className="text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">{analyticsModalCategory}</h2>
                      <p className="text-[10px] sm:text-xs font-bold text-neutral-400 mt-1.5 uppercase tracking-widest">Detailed Activity & Records</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAnalyticsModalCategory(null)}
                    className="p-2.5 sm:p-3 bg-white/5 hover:bg-white/10 rounded-[12px] border border-white/5 transition-all text-neutral-400 hover:text-white group shrink-0"
                  >
                    <X size={20} className="group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </div>
              
              {/* Body */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8 bg-gradient-to-b from-[#0B1220] to-[#111827]">
                {renderAnalyticsDetails()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence> 

      <Modal
        isOpen={viewingMeetingDetails !== null}
        onClose={() => setViewingMeetingDetails(null)}
        title="MEETING DETAILS"
      >
        {viewingMeetingDetails && (
          <div className="space-y-5">
            <div className="p-4 bg-[#151C2E] rounded-[16px] border border-white/5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400 font-bold uppercase tracking-wider">Meeting Title:</span>
                <span className="font-bold text-white text-sm">{viewingMeetingDetails.title || viewingMeetingDetails.topic || 'Weekly Chapter Meeting'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400 font-bold uppercase tracking-wider">Scheduled By:</span>
                <span className="font-bold text-primary text-xs">
                  {resolvedChapterName || 'Chapter'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400 font-bold uppercase tracking-wider">Meeting Date:</span>
                <span className="font-bold text-white text-xs">
                  {viewingMeetingDetails.date ? new Date(viewingMeetingDetails.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400 font-bold uppercase tracking-wider">Meeting Time:</span>
                <span className="font-bold text-white text-xs">{viewingMeetingDetails.time || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400 font-bold uppercase tracking-wider">Meeting Location:</span>
                <span className="font-bold text-white text-xs">{viewingMeetingDetails.location || viewingMeetingDetails.venue || 'Chapter Meeting Venue'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400 font-bold uppercase tracking-wider">Status:</span>
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border",
                  (viewingMeetingDetails.isCancelled === true || String(viewingMeetingDetails.isCancelled) === 'true') || viewingMeetingDetails.status === 'CANCELLED' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                  (viewingMeetingDetails.isCompleted === true || String(viewingMeetingDetails.isCompleted) === 'true') || viewingMeetingDetails.status === 'COMPLETED' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                  "bg-amber-500/10 text-amber-400 border-amber-500/20"
                )}>
                  {(viewingMeetingDetails.isCancelled === true || String(viewingMeetingDetails.isCancelled) === 'true') || viewingMeetingDetails.status === 'CANCELLED' ? 'Cancelled' : (viewingMeetingDetails.isCompleted === true || String(viewingMeetingDetails.isCompleted) === 'true') || viewingMeetingDetails.status === 'COMPLETED' ? 'Completed' : 'Upcoming'}
                </span>
              </div>
            </div>

            {(viewingMeetingDetails.description || viewingMeetingDetails.notes || viewingMeetingDetails.topic) && (
              <div className="p-4 bg-[#151C2E] rounded-[16px] border border-white/5 space-y-1.5">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Meeting Description / Agenda</p>
                <p className="text-xs text-neutral-300 font-medium leading-relaxed">{viewingMeetingDetails.description || viewingMeetingDetails.notes || viewingMeetingDetails.topic}</p>
              </div>
            )}

            {viewingMeetingDetails.fee && (
              <div className="p-4 bg-emerald-500/10 rounded-[16px] border border-emerald-500/20 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Meeting Fee</span>
                <span className="text-base font-extrabold text-white">₹{viewingMeetingDetails.fee}</span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setViewingMeetingDetails(null)}
                className="w-full py-3 bg-[#151C2E] hover:bg-[#1C2538] text-white border border-white/10 rounded-[12px] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
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
