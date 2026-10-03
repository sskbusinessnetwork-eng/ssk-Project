import { addYears, isValid } from 'date-fns';
import { safeFormat as format } from '../utils/dateUtils';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Share2, Award, Calendar, UserPlus, ChevronRight, Users, Handshake, BookOpen, 
  Eye, Plus, Filter, TrendingUp, TrendingDown, CheckCircle2, Clock, Sparkles, Target, Compass, 
  HelpCircle, Activity, Briefcase, ArrowRight, Trophy, Flame, Star, Zap, Shield, Rocket, Crown,
  CheckSquare, User, AlertTriangle, RotateCcw, Loader2, X, Building2, Search, FileText, UserCheck, UserX, MapPin
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { getCleanFullName, getDisplayPosition, isChapterLeaderRole } from '../utils/authUtils';
import { cn } from '../lib/utils';
import { where, normalizeMeetingRecord } from '../lib/database';
import { databaseService } from '../services/databaseService';
import { MemberCompanionView } from '../components/MemberCompanionView';
import { MasterAdminCompanionView } from '../components/MasterAdminCompanionView';
import StatGrid from '../components/StatGrid';
import { Modal } from '../components/Modal';
import { supabase } from '../lib/supabaseClient';
import { calculateSubscriptionDetails } from '../utils/timeUtils';
import { deduplicateSlips } from '../utils/deduplicateSlips';
import { calculateProfileCompletion } from '../utils/profileUtils';
import { calculateMemberGrowthScore, calculateGrowthScoreTrend, isDateInRange, calculateMemberGrowthScoreData, calculateChapterGrowthScoreData, getWorkspaceChecklistTasks, syncGrowthScoreToDatabase } from '../utils/growthScore';
import { isMemberActive, getMemberInactiveReasons, getSubscriptionStatus } from '../utils/memberStatus';
import { getMeetingExactDateTime } from './Meetings';
import { isOfflineReferral, isNormalReferral } from '../types';
import { parseMeetingDateParts, isSameMeetingDate, isMeetingDone, isMeetingInPastInIST, isMeetingUpcomingInIST, getISTNow } from '../utils/recurringMeetingUtils';

export function cleanHeroName(name: string): string {
  return getCleanFullName(name);
}

export function isUserOneToOneParticipant(m: any, userCandidateIds: string[]): boolean {
  if (!m || !userCandidateIds || userCandidateIds.length === 0) return false;
  const candidateSet = new Set(userCandidateIds.map(id => String(id || '').trim().toLowerCase()).filter(Boolean));
  if (candidateSet.size === 0) return false;

  const senderId = String(m.sender_id || m.senderId || '').trim().toLowerCase();
  const receiverId = String(m.receiver_id || m.receiverId || '').trim().toLowerCase();
  const organizerId = String(m.organizer_id || m.organizerId || '').trim().toLowerCase();
  const memberId = String(m.member_id || m.memberId || '').trim().toLowerCase();
  const creatorId = String(m.creatorId || m.creator_id || m.createdBy || m.created_by || '').trim().toLowerCase();
  const userId = String(m.userId || m.user_id || '').trim().toLowerCase();

  if (senderId && candidateSet.has(senderId)) return true;
  if (receiverId && candidateSet.has(receiverId)) return true;
  if (organizerId && candidateSet.has(organizerId)) return true;
  if (memberId && candidateSet.has(memberId)) return true;
  if (creatorId && candidateSet.has(creatorId)) return true;
  if (userId && candidateSet.has(userId)) return true;

  if (Array.isArray(m.participantIds)) {
    if (m.participantIds.some((pid: any) => candidateSet.has(String(pid || '').trim().toLowerCase()))) return true;
  }
  if (Array.isArray(m.participant_ids)) {
    if (m.participant_ids.some((pid: any) => candidateSet.has(String(pid || '').trim().toLowerCase()))) return true;
  }
  if (m.attendance) {
    try {
      const attObj = typeof m.attendance === 'string' ? JSON.parse(m.attendance) : m.attendance;
      if (attObj && typeof attObj === 'object') {
        if (Object.keys(attObj).some(k => candidateSet.has(String(k).trim().toLowerCase()))) return true;
      }
    } catch {}
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

export function isGuestMarkedPresent(g: any): boolean {
  if (!g) return false;
  const st = String(g.status || g.attendance_status || g.attendanceStatus || '').trim().toLowerCase();
  if (st === 'cancelled' || st === 'canceled' || st === 'invalid' || st === 'absent' || st === 'no-show' || st === 'no') {
    return false;
  }
  return st === 'present' || st === 'attended' || st === 'yes' || st === 'converted' || g.is_converted === true || g.isConverted === true;
}

export function isGuestInvitedToUpcoming(g: any, allMeetings: any[] = []): boolean {
  if (!g) return false;
  const st = String(g.status || g.attendance_status || g.attendanceStatus || '').trim().toLowerCase();
  // Exclude absent, pending, cancelled, invalid, or already marked present
  if (
    st === 'cancelled' ||
    st === 'canceled' ||
    st === 'absent' ||
    st === 'pending' ||
    st === 'no-show' ||
    st === 'no' ||
    st === 'invalid' ||
    st === 'present' ||
    st === 'attended' ||
    st === 'converted' ||
    g.is_converted === true ||
    g.isConverted === true
  ) {
    return false;
  }

  const meetingId = String(g.meeting_id || g.meetingId || '').trim();
  const guestMeetingDate = g.meeting_date || g.meetingDate || g.date;
  const guestChapterId = String(g.chapter_id || (g as any).invited_by_chapter || (g as any).invitedByChapter || g.chapterId || '').trim();

  let linkedMeeting = meetingId
    ? allMeetings.find((m: any) => String(m.id).trim() === meetingId)
    : undefined;

  if (!linkedMeeting && guestMeetingDate) {
    linkedMeeting = allMeetings.find((m: any) => {
      const mChap = String(m.chapter_id || m.chapterId || m.admin_id || '').trim();
      if (guestChapterId && mChap && guestChapterId !== mChap) return false;
      const mDate = m.date || m.meeting_date;
      return mDate && isSameMeetingDate(mDate, guestMeetingDate);
    });
  }

  if (linkedMeeting) {
    if (isMeetingDone(linkedMeeting)) return false;
    const now = new Date();
    const mDate = new Date(linkedMeeting.date || linkedMeeting.meeting_date || '');
    return getMeetingExactDateTime(linkedMeeting) >= now || mDate >= now || isMeetingUpcomingInIST(linkedMeeting) || !isMeetingInPastInIST(linkedMeeting);
  }

  if (guestMeetingDate) {
    const todayYMD = getISTNow().dateString;
    const parts = parseMeetingDateParts(guestMeetingDate);
    if (!parts) return false;
    const gDateYMD = `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
    return gDateYMD >= todayYMD;
  }

  return false;
}

export function isGuestUpcomingOrPresent(g: any, allMeetings: any[] = []): boolean {
  if (!g) return false;
  const st = String(g.status || g.attendance_status || g.attendanceStatus || '').trim().toLowerCase();
  if (st === 'cancelled' || st === 'canceled' || st === 'absent' || st === 'pending' || st === 'no-show' || st === 'no' || st === 'invalid') {
    return false;
  }
  return isGuestMarkedPresent(g) || isGuestInvitedToUpcoming(g, allMeetings);
}

export function Analytics() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { theme } = useTheme();
  const [score, setScore] = useState(0);
  const [userName, setUserName] = useState<string>('');

  const userCandidateIds = useMemo(() => {
    const ids: string[] = [];
    if (profile?.id) ids.push(String(profile.id));
    if (profile?.uid) ids.push(String(profile.uid));
    if (profile?.memberId) ids.push(String(profile.memberId));
    if (user?.id) ids.push(String(user.id));
    if (user?.uid) ids.push(String(user.uid));
    try {
      const raw = localStorage.getItem('user');
      if (raw) {
        const p = JSON.parse(raw);
        if (p.id) ids.push(String(p.id));
        if (p.uid) ids.push(String(p.uid));
        if (p.profile?.id) ids.push(String(p.profile.id));
        if (p.profile?.uid) ids.push(String(p.profile.uid));
      }
    } catch {}
    return Array.from(new Set(ids.filter(Boolean)));
  }, [profile, user]);

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
  const [futurePresentations, setFuturePresentations] = useState<any[]>([]);
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
  
  const isStrictChapterAdmin = isChapterLeaderRole(profile);
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
  const [analyticsModalRecords, setAnalyticsModalRecords] = useState<any[]>([]);

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
      if (analyticsModalCategory) {
        setAnalyticsLoading(true);
        fetchAnalyticsDataForCategory(analyticsModalCategory, range)
          .catch(() => setAnalyticsError(true))
          .finally(() => setAnalyticsLoading(false));
      }
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
    if (analyticsModalCategory) {
      setAnalyticsLoading(true);
      fetchAnalyticsDataForCategory(analyticsModalCategory, null)
        .catch(() => setAnalyticsError(true))
        .finally(() => setAnalyticsLoading(false));
    }
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
      databaseService.list<any>('meetings', []).then((freshMeetings) => {
        if (freshMeetings) {
          setMeetings(freshMeetings.map((m: any) => normalizeMeetingRecord({ ...m })));
        }
      }).catch(() => {});
    };
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  // Unified dynamic subscriptions
  useEffect(() => {
    if (!profile) return;

    // 1. Subscribe to all users (global & chapter members) for 100% accurate name resolution
    const unsubUsers = databaseService.subscribe<any>('users', [], (data) => {
      const activeData = (data || []).filter(u => !u.deleted && u.deleted !== 'true' && u.status !== 'DELETED' && u.membershipStatus !== 'DELETED');
      setAllUsersList(prev => {
        const map = new Map<string, any>();
        (prev || []).forEach(u => {
          const k = String(u.id || u.uid || '');
          if (k) map.set(k.toLowerCase(), u);
        });
        activeData.forEach((u: any) => {
          const k = String(u.id || u.uid || '');
          if (k) {
            const existing = map.get(k.toLowerCase()) || {};
            map.set(k.toLowerCase(), { ...existing, ...u });
          }
        });
        return Array.from(map.values());
      });
      
      const chapterMems = activeData.filter(u => {
        const r = (u.role || 'MEMBER').toUpperCase();
        if (r === 'MASTER_ADMIN') return false;
        if (profile.role === 'MASTER_ADMIN') return true;
        const myChap = String(profile.chapter_id || profile.chapterId || '').trim();
        const uChap = String(u.chapter_id || u.chapterId || '').trim();
        return !myChap || uChap === myChap;
      });
      setChapterUsers(chapterMems);
    });

    // Also fetch all users from Supabase users table
    supabase.from('users').select('*').then(
      ({ data: sbUsers }) => {
        if (sbUsers && sbUsers.length > 0) {
          setAllUsersList(prev => {
            const map = new Map<string, any>();
            (prev || []).forEach(u => {
              const k = String(u.id || u.uid || '');
              if (k) map.set(k.toLowerCase(), u);
            });
            sbUsers.forEach((u: any) => {
              const k = String(u.id || u.uid || '');
              if (k) {
                const existing = map.get(k.toLowerCase()) || {};
                map.set(k.toLowerCase(), { ...existing, ...u });
              }
            });
            return Array.from(map.values());
          });
        }
      },
      (err) => console.warn("Dashboard load users notice:", err)
    );

    // 2. Subscribe to thank you slips
    const unsubSlips = databaseService.subscribe<any>('thank_you_slips', [], (data) => {
      const filtered = usePersonalStats
        ? (data || []).filter(s => {
            const sender = String(s.fromUserId || s.from_user_id || s.submitted_by || s.sender_id || '');
            const receiver = String(s.toUserId || s.to_user_id || s.receiver_id || '');
            return userCandidateIds.includes(sender) || userCandidateIds.includes(receiver);
          })
        : (data || []);
      setAllSlips(deduplicateSlips(filtered));
    });
    const unsubSubRequests = databaseService.subscribe<any>('subscription_requests', [], setSubscriptionRequests);

    // Fetch thank_you_slips from Supabase with member-level query filtering
    let slipsQuery = supabase.from('thank_you_slips').select('*');
    if (usePersonalStats && userCandidateIds.length > 0) {
      const orConds = userCandidateIds.flatMap(id => [
        `from_user_id.eq.${id}`,
        `to_user_id.eq.${id}`,
        `sender_id.eq.${id}`,
        `receiver_id.eq.${id}`,
        `submitted_by.eq.${id}`
      ]).join(',');
      slipsQuery = slipsQuery.or(orConds);
    }
    slipsQuery.then(
      ({ data: sbSlips }) => {
        if (sbSlips && sbSlips.length > 0) {
          const mappedSbSlips = sbSlips.map((s: any) => {
            const slipSender = String(s.from_user_id || s.fromUserId || s.submitted_by || s.sender_id || '');
            const slipReceiver = String(s.to_user_id || s.toUserId || s.receiver_id || s.recipient_id || '');
            return {
              id: String(s.id),
              referralId: String(s.referral_id || s.referralId || ''),
              fromUserId: slipSender,
              toUserId: slipReceiver,
              customerName: s.customer_name || s.customerName || '',
              businessValue: Number(s.business_value || s.businessValue || s.amount || 0),
              notes: s.notes || '',
              createdAt: s.created_at || s.createdAt || new Date().toISOString()
            };
          });
          setAllSlips(prev => {
            return deduplicateSlips([...prev, ...mappedSbSlips]);
          });
        }
      },
      (err) => console.warn("Dashboard load slips notice:", err)
    );

    // 3. Subscribe to referrals
    const unsubReferrals = databaseService.subscribe<any>('referrals', [], (data) => {
      const filtered = usePersonalStats
        ? (data || []).filter(r => {
            const sender = String(r.fromUserId || r.from_user_id || r.sender_id || '');
            const receiver = String(r.toUserId || r.to_user_id || r.receiver_id || '');
            return userCandidateIds.includes(sender) || userCandidateIds.includes(receiver);
          })
        : (data || []);
      setAllReferrals(prev => {
        const map = new Map<string, any>();
        (prev || []).forEach(r => map.set(String(r.id), r));
        (filtered || []).forEach(r => map.set(String(r.id), r));
        return Array.from(map.values());
      });
      if (profile.role === 'MEMBER') {
        setPassedReferrals((data || []).filter(r => userCandidateIds.includes(String(r.fromUserId || r.from_user_id || r.sender_id))));
        setReceivedReferrals((data || []).filter(r => userCandidateIds.includes(String(r.toUserId || r.to_user_id || r.receiver_id))));
      }
    });

    // Fetch referrals from Supabase with member-level query filtering
    let referralsQuery = supabase.from('referrals').select('*');
    if (usePersonalStats && userCandidateIds.length > 0) {
      const orConds = userCandidateIds.flatMap(id => [
        `from_user_id.eq.${id}`,
        `to_user_id.eq.${id}`,
        `sender_id.eq.${id}`,
        `receiver_id.eq.${id}`
      ]).join(',');
      referralsQuery = referralsQuery.or(orConds);
    }
    referralsQuery.then(
      ({ data: sbReferrals }) => {
        if (sbReferrals && sbReferrals.length > 0) {
          const mapped = sbReferrals.map((r: any) => ({
            id: String(r.id),
            fromUserId: String(r.from_user_id || r.sender_id || r.fromUserId || ''),
            toUserId: String(r.to_user_id || r.receiver_id || r.toUserId || ''),
            sender_id: r.sender_id,
            receiver_id: r.receiver_id,
            chapter_id: r.chapter_id || r.chapterId || null,
            chapterName: r.chapter_name || r.chapterName || '',
            status: r.status || 'Pending',
            notes: r.notes || r.requirement || '',
            business_requirement: r.business_requirement || r.requirement || '',
            contact_name: r.contact_name || r.customer_name || '',
            contact_phone: r.contact_phone || r.customer_mobile || '',
            customerName: r.customer_name || r.contact_name || '',
            fromUserName: r.from_user_name || r.fromUserName || r.sender_name || '',
            toUserName: r.to_user_name || r.toUserName || r.receiver_name || '',
            createdAt: r.created_at || r.createdAt || new Date().toISOString(),
            updatedAt: r.updated_at || r.updatedAt || r.created_at || r.createdAt
          }));
          setAllReferrals(prev => {
            const map = new Map<string, any>();
            (prev || []).forEach(item => map.set(String(item.id), item));
            mapped.forEach(item => map.set(String(item.id), item));
            return Array.from(map.values());
          });
        }
      },
      (err) => console.warn("Dashboard load referrals notice:", err)
    );

    // 4. Subscribe to 1-to-1s
    const unsub1to1s = databaseService.subscribe<any>('one_to_one_meetings', [], (data) => {
      const filtered = usePersonalStats
        ? (data || []).filter(m => isUserOneToOneParticipant(m, userCandidateIds))
        : (data || []);
      setOneToOnes(filtered);
      setCreatedOneToOnes(filtered);
      setParticipatedOneToOnes(filtered);
    });

    let otoQuery = supabase.from('one_to_one_meetings').select('*');
    if (usePersonalStats && userCandidateIds.length > 0) {
      const orConds = userCandidateIds.flatMap(id => [
        `organizer_id.eq.${id}`,
        `member_id.eq.${id}`,
        `creator_id.eq.${id}`,
        `receiver_id.eq.${id}`,
        `sender_id.eq.${id}`
      ]).join(',');
      otoQuery = otoQuery.or(orConds);
    }
    otoQuery.then(
      ({ data: sbOto }) => {
        if (sbOto && sbOto.length > 0) {
          setOneToOnes(prev => {
            const map = new Map<string, any>();
            (prev || []).forEach(item => map.set(String(item.id), item));
            sbOto.forEach((item: any) => map.set(String(item.id), item));
            return Array.from(map.values());
          });
        }
      },
      (err) => console.warn("Dashboard load 1-to-1s notice:", err)
    );

    // 5. Subscribe to guest invitations
    const unsubGuests = databaseService.subscribe<any>('guest_invitations', [], (data) => {
      const filtered = usePersonalStats
        ? (data || []).filter(g => {
            const invId = String(g.invited_by_user_id || g.invited_by || g.createdBy || g.inviterId || g.inviter_id || g.user_id || g.member_id || '').trim();
            return userCandidateIds.includes(invId);
          })
        : (data || []);
      setGuestInvitations(filtered);
    });

    let guestQuery = supabase.from('guest_invitations').select('*');
    if (usePersonalStats && userCandidateIds.length > 0) {
      const orConds = userCandidateIds.flatMap(id => [
        `invited_by_user_id.eq.${id}`,
        `invited_by.eq.${id}`,
        `created_by.eq.${id}`,
        `member_id.eq.${id}`
      ]).join(',');
      guestQuery = guestQuery.or(orConds);
    }
    guestQuery.then(
      ({ data: sbGuests }) => {
        if (sbGuests && sbGuests.length > 0) {
          setGuestInvitations(prev => {
            const map = new Map<string, any>();
            (prev || []).forEach(item => map.set(String(item.id), item));
            sbGuests.forEach((item: any) => map.set(String(item.id), item));
            return Array.from(map.values());
          });
        }
      },
      (err) => console.warn("Dashboard load guest invitations notice:", err)
    );

    // 6. Subscribe to meetings
    const unsubMeetings = databaseService.subscribe<any>('meetings', [], (data) => {
      setMeetings((data || []).map((m: any) => normalizeMeetingRecord({ ...m })));
    });

    let meetQuery = supabase.from('meetings').select('*');
    if (usePersonalStats && userCandidateIds.length > 0) {
      const orConds = userCandidateIds.flatMap(id => [
        `admin_id.eq.${id}`,
        `attendance->>${id}.neq.null`
      ]).join(',');
      meetQuery = meetQuery.or(orConds);
    } else if (profile?.chapter_id) {
      meetQuery = meetQuery.eq('chapter_id', profile.chapter_id);
    }
    meetQuery.then(
      ({ data: sbMeetings }) => {
        if (sbMeetings && sbMeetings.length > 0) {
          const mapped = sbMeetings.map((m: any) => normalizeMeetingRecord({ ...m }));
          setMeetings(prev => {
            const map = new Map<string, any>();
            (prev || []).forEach(item => map.set(String(item.id), item));
            mapped.forEach(item => map.set(String(item.id), item));
            return Array.from(map.values());
          });
        }
      },
      (err) => console.warn("Dashboard load meetings notice:", err)
    );

    // 7. Subscribe to testimonials
    const unsubTestimonials = databaseService.subscribe<any>('testimonials', [], (data) => {
      const filtered = usePersonalStats
        ? (data || []).filter(t => {
            const authorId = String(t.author_id || t.authorId || t.giverId || t.giver_id || t.sender_id || '');
            const recipientId = String(t.recipient_id || t.recipientId || t.receiver_id || t.receiverId || t.to_user_id || t.toUserId || '');
            return userCandidateIds.includes(authorId) || userCandidateIds.includes(recipientId);
          })
        : (data || []);
      setAllTestimonials(filtered);
    });

    let testQuery = supabase.from('testimonials').select('*');
    if (usePersonalStats && userCandidateIds.length > 0) {
      const orConds = userCandidateIds.flatMap(id => [
        `author_id.eq.${id}`,
        `receiver_id.eq.${id}`
      ]).join(',');
      testQuery = testQuery.or(orConds);
    }
    testQuery.then(
      ({ data: sbTestimonials }) => {
        if (sbTestimonials && sbTestimonials.length > 0) {
          setAllTestimonials(prev => {
            const map = new Map<string, any>();
            (prev || []).forEach(item => map.set(String(item.id), item));
            sbTestimonials.forEach((item: any) => map.set(String(item.id), item));
            return Array.from(map.values());
          });
        }
      },
      (err) => console.warn("Dashboard load testimonials notice:", err)
    );

    // 8. Subscribe to chapters
    const unsubChapters = databaseService.subscribe<any>('chapters', [], setAllChapters);

    supabase.from('chapters').select('*').then(
      ({ data: sbChapters }) => {
        if (sbChapters && sbChapters.length > 0) {
          setAllChapters(prev => {
            const map = new Map<string, any>();
            (prev || []).forEach(item => map.set(String(item.id), item));
            sbChapters.forEach((item: any) => map.set(String(item.id), item));
            return Array.from(map.values());
          });
        }
      },
      (err) => console.warn("Dashboard load chapters notice:", err)
    );

    const unsubPresentations = databaseService.subscribe<any>('future_presentations', [], (data) => {
      setFuturePresentations(data || []);
    });

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
      unsubPresentations();
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
    } else if (usePersonalStats) {
      list = list.filter(s => {
        const sender = String(s.fromUserId || s.from_user_id || s.submitted_by || s.sender_id || '');
        const receiver = String(s.toUserId || s.to_user_id || s.receiver_id || '');
        return userCandidateIds.includes(sender) || userCandidateIds.includes(receiver);
      });
    }
    return list;
  }, [allSlips, activeDateRange, profile, appliedChapterFilter, appliedMemberFilter, allUsersList, usePersonalStats, userCandidateIds]);

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
    } else if (usePersonalStats) {
      list = list.filter(r => {
        const sender = String(r.fromUserId || r.from_user_id || r.sender_id || '');
        const receiver = String(r.toUserId || r.to_user_id || r.receiver_id || '');
        return userCandidateIds.includes(sender) || userCandidateIds.includes(receiver);
      });
    }
    return list;
  }, [allReferrals, activeDateRange, profile, appliedChapterFilter, appliedMemberFilter, allUsersList, usePersonalStats, userCandidateIds]);

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
    } else if (usePersonalStats) {
      list = list.filter(m => isUserOneToOneParticipant(m, userCandidateIds));
    }
    return list;
  }, [oneToOnes, activeDateRange, profile, appliedChapterFilter, appliedMemberFilter, allUsersList, usePersonalStats, userCandidateIds]);

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
    } else if (usePersonalStats) {
      const userChapId = String(profile?.chapter_id || profile?.chapterId || '').trim();
      list = list.filter(m => {
        const mChap = String(m.chapter_id || '').trim();
        return !userChapId || !mChap || userChapId === mChap;
      });
    }
    return list;
  }, [meetings, activeDateRange, profile, appliedChapterFilter, appliedMemberFilter, usePersonalStats]);

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
    } else if (usePersonalStats) {
      list = list.filter(g => {
        const invId = String(g.invited_by_user_id || g.invited_by || g.createdBy || g.inviterId || g.inviter_id || g.user_id || g.member_id || '').trim();
        return userCandidateIds.includes(invId);
      });
    }
    return list;
  }, [guestInvitations, activeDateRange, profile, appliedChapterFilter, appliedMemberFilter, usePersonalStats, userCandidateIds]);

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
    } else if (usePersonalStats) {
      list = list.filter(t => {
        const authorId = String(t.author_id || t.authorId || t.giverId || t.giver_id || t.sender_id || '');
        const recipientId = String(t.recipient_id || t.recipientId || t.receiver_id || t.receiverId || t.to_user_id || t.toUserId || '');
        return userCandidateIds.includes(authorId) || userCandidateIds.includes(recipientId);
      });
    }
    return list;
  }, [allTestimonials, activeDateRange, profile, appliedChapterFilter, appliedMemberFilter, allUsersList, usePersonalStats, userCandidateIds]);

  const chapterSlips = useMemo(() => {
    return effectiveSlips.filter(slip => 
      usePersonalStats ? (userCandidateIds.includes(slip.fromUserId) || userCandidateIds.includes(slip.toUserId)) : (chapterUserIds.includes(slip.fromUserId) || chapterUserIds.includes(slip.toUserId))
    );
  }, [effectiveSlips, chapterUserIds, userCandidateIds, usePersonalStats]);

  const chapterReferralsList = useMemo(() => {
    return effectiveReferrals.filter(ref => 
      isNormalReferral(ref) && (usePersonalStats ? (userCandidateIds.includes(ref.fromUserId) || userCandidateIds.includes(ref.toUserId)) : (chapterUserIds.includes(ref.fromUserId) || chapterUserIds.includes(ref.toUserId)))
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
      return effectiveReferrals.filter(r => isNormalReferral(r) && String(r.fromUserId || r.sender_id || r.from_user_id || '') === String(appliedMemberFilter));
    }
    return effectiveReferrals.filter(r => {
      if (!isNormalReferral(r)) return false;
      const senderId = String(r.fromUserId || r.sender_id || r.from_user_id || '');
      return usePersonalStats ? userCandidateIds.includes(senderId) : chapterUserIds.includes(senderId);
    });
  }, [effectiveReferrals, chapterUserIds, userCandidateIds, profile, appliedMemberFilter, usePersonalStats]);

  const referralsSentCount = useMemo(() => referralsSentList.length, [referralsSentList]);

  const referralsReceivedList = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN' && appliedMemberFilter !== 'ALL') {
      return effectiveReferrals.filter(r => isNormalReferral(r) && String(r.toUserId || r.receiver_id || r.to_user_id || '') === String(appliedMemberFilter));
    }
    return effectiveReferrals.filter(r => {
      if (!isNormalReferral(r)) return false;
      const receiverId = String(r.toUserId || r.receiver_id || r.to_user_id || '');
      return usePersonalStats ? userCandidateIds.includes(receiverId) : chapterUserIds.includes(receiverId);
    });
  }, [effectiveReferrals, chapterUserIds, userCandidateIds, profile, appliedMemberFilter, usePersonalStats]);

  const referralsReceivedCount = useMemo(() => referralsReceivedList.length, [referralsReceivedList]);

  const testimonialsGivenList = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN' && appliedMemberFilter !== 'ALL') {
      return effectiveTestimonials.filter(t => String(t.sender_id || t.from_user_id || t.authorMemberId || t.author_id || t.fromUserId || t.giver_uid || t.giver_id || '') === String(appliedMemberFilter));
    }
    return effectiveTestimonials.filter(t => {
      const authorId = String(t.sender_id || t.from_user_id || t.authorMemberId || t.author_id || t.fromUserId || t.giver_uid || t.giver_id || '');
      return usePersonalStats ? userCandidateIds.includes(authorId) : chapterUserIds.includes(authorId);
    });
  }, [effectiveTestimonials, chapterUserIds, userCandidateIds, profile, appliedMemberFilter, usePersonalStats]);

  const testimonialsGivenCount = useMemo(() => testimonialsGivenList.length, [testimonialsGivenList]);

  const testimonialsReceivedList = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN' && appliedMemberFilter !== 'ALL') {
      return effectiveTestimonials.filter(t => String(t.receiver_id || t.to_user_id || t.recipientMemberId || t.recipient_id || t.toUserId || t.recipient_uid || '') === String(appliedMemberFilter));
    }
    return effectiveTestimonials.filter(t => {
      const recipientId = String(t.receiver_id || t.to_user_id || t.recipientMemberId || t.recipient_id || t.toUserId || t.recipient_uid || '');
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

  // Comprehensive lookup map for fast O(1) user & member resolution
  const userMap = useMemo(() => {
    const map = new Map<string, any>();
    const register = (u: any) => {
      if (!u) return;
      const keys = [
        u.id,
        u.uid,
        u.user_id,
        u.userId,
        u.member_id,
        u.memberId,
        u.auth_id,
        u.firebase_uid,
        u.phone,
        u.mobile,
        u.email
      ];
      keys.forEach(k => {
        if (k !== undefined && k !== null && String(k).trim()) {
          map.set(String(k).trim().toLowerCase(), u);
        }
      });
    };

    (allUsersList || []).forEach(register);
    (chapterUsers || []).forEach(register);
    if (profile) register(profile);

    return map;
  }, [allUsersList, chapterUsers, profile]);

  // Robust validation helper that checks if a string is an authentic real member name
  const isValidRealName = useCallback((name?: any): boolean => {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    if (!trimmed) return false;
    const lower = trimmed.toLowerCase();
    
    // Forbidden placeholders & generic names
    const forbidden = [
      'member',
      'this member',
      'unknown member',
      'unknown',
      'partner',
      'a partner',
      'user',
      'n/a',
      'na',
      'null',
      'undefined',
      '[object object]',
      'chapter leader',
      'chapter member',
      'anonymous',
      'admin',
      'system'
    ];
    if (forbidden.includes(lower)) return false;

    // Reject UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(trimmed)) return false;

    // Reject DB ID format strings
    if (/^(usr_|mem_|user_|ref_|slip_|oto_|chap_|sub_|test_|uid_|auth_)/i.test(trimmed)) return false;
    if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return false;

    // Reject pure phone numbers
    const phoneClean = trimmed.replace(/[\s\-\+\(\)]/g, '');
    if (/^\d{7,15}$/.test(phoneClean)) return false;

    return true;
  }, []);

  // Extract a valid display name from a user object
  const extractUserName = useCallback((u: any): string | null => {
    if (!u) return null;
    const candidates = [
      u.name,
      u.full_name,
      u.displayName,
      u.display_name,
      u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : (u.firstName || u.lastName),
      u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : (u.first_name || u.last_name),
      u.userName,
      u.user_name,
      u.businessName,
      u.companyName
    ];
    for (const c of candidates) {
      if (isValidRealName(c)) {
        return String(c).trim();
      }
    }
    return null;
  }, [isValidRealName]);

  // Primary real member name resolution function
  const resolveMemberName = useCallback((userId?: string | number | null, candidateName?: string | null, fallback: string = 'Member'): string => {
    const targetId = userId !== undefined && userId !== null ? String(userId).trim() : '';

    if (targetId) {
      const targetLower = targetId.toLowerCase();
      const u = userMap.get(targetLower) ||
        allUsersList.find(x => 
          String(x.id || '').toLowerCase() === targetLower ||
          String(x.uid || '').toLowerCase() === targetLower ||
          String(x.user_id || '').toLowerCase() === targetLower ||
          String(x.userId || '').toLowerCase() === targetLower ||
          String(x.member_id || '').toLowerCase() === targetLower ||
          String(x.memberId || '').toLowerCase() === targetLower
        ) ||
        chapterUsers.find(x => 
          String(x.id || '').toLowerCase() === targetLower ||
          String(x.uid || '').toLowerCase() === targetLower
        );

      if (u) {
        const extracted = extractUserName(u);
        if (extracted) {
          return extracted;
        }
      }

      // Check current profile
      if (profile && (String(profile.id || '').toLowerCase() === targetLower || String(profile.uid || '').toLowerCase() === targetLower)) {
        const profName = extractUserName(profile);
        if (profName) {
          return profName;
        }
      }
    }

    // Check candidate name if supplied on the record
    if (candidateName && typeof candidateName === 'string') {
      const clean = candidateName.trim();
      // Check if candidateName itself is a userId or phone registered in userMap
      const userFromCandidate = userMap.get(clean.toLowerCase());
      if (userFromCandidate) {
        const extracted = extractUserName(userFromCandidate);
        if (extracted) return extracted;
      }
      if (isValidRealName(clean)) {
        return clean;
      }
    }

    // If fallback is a valid real name, use it; otherwise provide a clean descriptive fallback
    if (fallback && isValidRealName(fallback)) {
      return fallback.trim();
    }

    return 'Network Member';
  }, [userMap, allUsersList, chapterUsers, profile, isValidRealName, extractUserName]);

  const getMemberName = useCallback((userId: string) => {
    return resolveMemberName(userId, null, 'Network Member');
  }, [resolveMemberName]);

  const referralsPassedCount = useMemo(() => {
    const isCompleted = (r: any) => isNormalReferral(r) && ['COMPLETED', 'CONVERTED', 'CLOSED'].includes((r.status || '').toUpperCase());
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
      const normalized = normalizeMeetingRecord({ ...m });
      const notes = normalized.memberNotes || normalized.member_notes || {};
      const effectiveStatus = String(notes.__status || normalized.status || 'UPCOMING').trim().toUpperCase();
      const isDone = normalized.isCompleted === true || (normalized.isCompleted as any) === 'true' || effectiveStatus === 'COMPLETED' ||
                     normalized.isCancelled === true || (normalized.isCancelled as any) === 'true' || effectiveStatus === 'CANCELLED';
      if (isDone) return false;
      if (effectiveStatus !== 'UPCOMING' && effectiveStatus !== 'SCHEDULED') return false;
      return getMeetingExactDateTime(normalized) > now;
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

  const upcomingChapterMeeting = useMemo(() => {
    const chapterMeetings = profile?.role === 'MASTER_ADMIN'
      ? effectiveMeetings
      : effectiveMeetings.filter(m => m.chapter_id === profile?.chapter_id);
    
    const now = new Date();
    const upcoming = chapterMeetings.filter(m => {
      const normalized = normalizeMeetingRecord({ ...m });
      const notes = normalized.memberNotes || normalized.member_notes || {};
      const effectiveStatus = String(notes.__status || normalized.status || 'UPCOMING').trim().toUpperCase();
      const isDone =
        normalized.isCompleted === true ||
        (normalized.isCompleted as any) === 'true' ||
        normalized.is_completed === true ||
        notes.__isCompleted === true ||
        effectiveStatus === 'COMPLETED' ||
        effectiveStatus === 'DONE' ||
        normalized.isCancelled === true ||
        (normalized.isCancelled as any) === 'true' ||
        normalized.is_cancelled === true ||
        notes.__isCancelled === true ||
        effectiveStatus === 'CANCELLED' ||
        effectiveStatus === 'CANCELED';
      if (isDone) return false;
      if (effectiveStatus !== 'UPCOMING' && effectiveStatus !== 'SCHEDULED') return false;
      return getMeetingExactDateTime(normalized) > now;
    });
    
    if (upcoming.length === 0) return null;
    
    upcoming.sort((a, b) => getMeetingExactDateTime(a).getTime() - getMeetingExactDateTime(b).getTime());
    return upcoming[0];
  }, [effectiveMeetings, profile]);

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
    let list = effectiveGuestInvitations;
    if (usePersonalStats) {
      list = list.filter(g => {
        const inviterIds = [
          g.invited_by_user_id,
          (g as any).invitedByUserId,
          g.invited_by,
          (g as any).invitedBy,
          g.created_by,
          (g as any).createdBy,
          (g as any).inviterId,
          (g as any).inviter_id,
          g.user_id,
          (g as any).userId,
          g.member_id,
          (g as any).memberId
        ].filter(Boolean).map(id => String(id).trim().toLowerCase());

        const isMine = userCandidateIds.some(cid => inviterIds.includes(String(cid).trim().toLowerCase()));
        if (!isMine) return false;

        const rawSt = String(g.status || g.attendance_status || (g as any).attendanceStatus || '').trim().toLowerCase();
        if (rawSt === 'absent' || rawSt === 'pending' || rawSt === 'cancelled' || rawSt === 'canceled' || rawSt === 'no-show' || rawSt === 'invalid') {
          return false;
        }

        return isGuestInvitedToUpcoming(g, meetings);
      });
    } else if (profile?.role === 'MASTER_ADMIN') {
      if (appliedChapterFilter !== 'ALL') {
        const targetChapId = String(appliedChapterFilter).trim();
        list = list.filter(g => {
          const gChapId = String(g.chapter_id || (g as any).invited_by_chapter || (g as any).invitedByChapter || g.chapterId || '').trim();
          const inviter = String(g.invited_by_user_id || g.invited_by || g.createdBy || (g as any).inviterId || (g as any).inviter_id || g.user_id || g.member_id || '').trim();
          return chapterUserIds.includes(inviter) || (gChapId && gChapId === targetChapId);
        });
      }
      if (appliedMemberFilter !== 'ALL') {
        list = list.filter(g => {
          const inviter = String(g.invited_by_user_id || g.invited_by || g.createdBy || (g as any).inviterId || (g as any).inviter_id || g.user_id || g.member_id || '').trim();
          return inviter === appliedMemberFilter;
        });
      }
      list = list.filter(g => isGuestInvitedToUpcoming(g, meetings));
    } else {
      const targetChapId = String(profile?.chapter_id || profile?.chapterId || '').trim();
      list = list.filter(g => {
        const gChapId = String(g.chapter_id || (g as any).invited_by_chapter || (g as any).invitedByChapter || g.chapterId || '').trim();
        const inviter = String(g.invited_by_user_id || g.invited_by || g.createdBy || (g as any).inviterId || (g as any).inviter_id || g.user_id || g.member_id || '').trim();
        return chapterUserIds.includes(inviter) || (gChapId && gChapId === targetChapId);
      });
      list = list.filter(g => isGuestInvitedToUpcoming(g, meetings));
    }

    return list;
  }, [effectiveGuestInvitations, meetings, chapterUserIds, userCandidateIds, profile, appliedChapterFilter, appliedMemberFilter, usePersonalStats]);

  const guestsInvitedCount = useMemo(() => chapterGuestsList.length, [chapterGuestsList]);

  const userGuestsJoined = useMemo(() => {
    if (!profile) return 0;
    return effectiveGuestInvitations.filter(g => {
      const inviter = String(g.invited_by_user_id || g.invited_by || g.createdBy || g.inviterId || g.inviter_id || g.user_id || g.member_id || '').trim();
      if (!userCandidateIds.includes(inviter)) return false;
      return isGuestMarkedPresent(g);
    }).length;
  }, [effectiveGuestInvitations, userCandidateIds, profile]);

  const userMeetingsScheduled = useMemo(() => {
    if (!profile) return 0;
    const userChapId = String(profile.chapter_id || profile.chapterId || '').trim();
    const now = new Date();
    return effectiveMeetings.filter(m => {
      const mChapId = String(m.chapter_id || m.chapterId || '').trim();
      if (userChapId && mChapId !== userChapId) return false;
      const normalized = normalizeMeetingRecord({ ...m });
      const notes = normalized.memberNotes || normalized.member_notes || {};
      const effectiveStatus = String(notes.__status || normalized.status || 'UPCOMING').trim().toUpperCase();
      const isDone = normalized.isCompleted === true || (normalized.isCompleted as any) === 'true' || effectiveStatus === 'COMPLETED' || normalized.isCancelled === true || (normalized.isCancelled as any) === 'true' || effectiveStatus === 'CANCELLED';
      if (isDone) return false;
      if (effectiveStatus !== 'UPCOMING' && effectiveStatus !== 'SCHEDULED') return false;
      return getMeetingExactDateTime(normalized) > now;
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
    let list = guestInvitations.filter(g => isGuestMarkedPresent(g));

    if (activeDateRange) {
      list = list.filter(g => {
        const d = new Date(g.attendance_updated_at || g.updated_at || g.createdAt || g.created_at || g.meeting_date || g.date);
        return isDateInRange(d, activeDateRange.start, activeDateRange.end);
      });
    }

    if (usePersonalStats) {
      list = list.filter(g => {
        const inviterIds = [
          g.invited_by_user_id,
          (g as any).invitedByUserId,
          g.invited_by,
          (g as any).invitedBy,
          g.created_by,
          (g as any).createdBy,
          (g as any).inviterId,
          (g as any).inviter_id,
          g.user_id,
          (g as any).userId,
          g.member_id,
          (g as any).memberId
        ].filter(Boolean).map(id => String(id).trim().toLowerCase());

        const isMine = userCandidateIds.some(cid => inviterIds.includes(String(cid).trim().toLowerCase()));
        if (!isMine) return false;

        const rawSt = String(g.status || g.attendance_status || (g as any).attendanceStatus || '').trim().toLowerCase();
        if (rawSt === 'absent' || rawSt === 'pending' || rawSt === 'cancelled' || rawSt === 'canceled' || rawSt === 'no-show' || rawSt === 'invalid') {
          return false;
        }

        return isGuestMarkedPresent(g);
      });
      return list.length || 0;
    }

    if (profile?.role === 'MASTER_ADMIN') {
      if (appliedChapterFilter !== 'ALL') {
        const targetChapId = String(appliedChapterFilter).trim();
        list = list.filter(g => {
          const gChapId = String(g.chapter_id || (g as any).invited_by_chapter || (g as any).invitedByChapter || g.chapterId || '').trim();
          const inviter = String(g.invited_by_user_id || g.invited_by || g.createdBy || g.inviterId || g.inviter_id || g.user_id || g.member_id || '').trim();
          return chapterUserIds.includes(inviter) || (gChapId && gChapId === targetChapId);
        });
      }
      if (appliedMemberFilter !== 'ALL') {
        list = list.filter(g => {
          const inviter = String(g.invited_by_user_id || g.invited_by || g.createdBy || g.inviterId || g.inviter_id || g.user_id || g.member_id || '').trim();
          return inviter === appliedMemberFilter || g.userId === appliedMemberFilter;
        });
      }
      return list.length || 0;
    }

    const targetChapId = String(profile?.chapter_id || profile?.chapterId || '').trim();
    list = list.filter(g => {
      const gChapId = String(g.chapter_id || (g as any).invited_by_chapter || (g as any).invitedByChapter || g.chapterId || '').trim();
      const inviter = String(g.invited_by_user_id || g.invited_by || g.createdBy || g.inviterId || g.inviter_id || g.user_id || g.member_id || '').trim();
      return chapterUserIds.includes(inviter) || (gChapId && gChapId === targetChapId);
    });

    return list.length || 0;
  }, [guestInvitations, activeDateRange, profile, appliedChapterFilter, appliedMemberFilter, chapterUserIds, userCandidateIds, usePersonalStats]);

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
        Object.values(m.attendance || {}).forEach(status => {
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

  // Dynamic Recent Activities based on real database records with full real-name resolution
  const dynamicRecentActivities = useMemo(() => {
    const activities: any[] = [];

    // 1. Chapters
    (allChapters || []).forEach(c => {
      const cName = c.name || c.chapter_name || 'Organization';
      const createdTime = new Date(c.created_at || c.createdAt || Date.now()).getTime();
      const creatorId = c.created_by || c.created_by_user_id || c.admin_id;
      const creatorName = resolveMemberName(creatorId, c.created_by_name || c.createdByName, 'Master Admin');

      if (!isNaN(createdTime)) {
        activities.push({
          id: 'chap-new-' + (c.id || cName),
          activity: `Chapter Established: ${cName}`,
          title: `Chapter Established: ${cName}`,
          desc: `Chapter ${cName} established by ${creatorName}`,
          type: 'chapter',
          memberName: creatorName,
          chapterName: cName,
          chapter_id: c.id,
          dateTime: createdTime,
          time: createdTime,
          status: (c.status || 'ACTIVE').toUpperCase(),
          fromUserId: creatorId,
          icon: Building2,
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
        });
      }
      if (c.updated_at || c.updatedAt) {
        const updTime = new Date(c.updated_at || c.updatedAt).getTime();
        if (!isNaN(updTime) && updTime - createdTime > 60000) {
          const updaterId = c.updated_by || c.updated_by_user_id;
          const updaterName = resolveMemberName(updaterId, c.updated_by_name, 'Master Admin');
          activities.push({
            id: 'chap-upd-' + (c.id || cName),
            activity: `Chapter Updated: ${cName}`,
            title: `Chapter Updated: ${cName}`,
            desc: `Details updated for ${cName} by ${updaterName}`,
            type: 'chapter',
            memberName: updaterName,
            chapterName: cName,
            chapter_id: c.id,
            dateTime: updTime,
            time: updTime,
            status: 'UPDATED',
            fromUserId: updaterId,
            icon: Building2,
            bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          });
        }
      }
    });

    // 2. Members (Added, Activated, Deactivated, Leadership Position)
    const relevantUsers = activeDateRange 
      ? chapterUsers.filter(u => isDateInRange(u.createdAt || u.created_at, activeDateRange.start, activeDateRange.end))
      : chapterUsers;

    relevantUsers.forEach(u => {
      const uName = resolveMemberName(u.uid || u.id, u.name || u.full_name || u.displayName);
      const chName = u.chapterName || u.chapter_name || u.chapter || 'Chapter';
      const regTime = new Date(u.createdAt || u.created_at || Date.now()).getTime();

      if (!isNaN(regTime)) {
        activities.push({
          id: 'mem-add-' + (u.uid || u.id),
          activity: `${uName} Joined ${chName}`,
          title: `${uName} Joined`,
          desc: `${uName} joined ${chName} as ${u.category || u.businessName || 'Member'}`,
          type: 'member',
          memberName: uName,
          chapterName: chName,
          chapter_id: u.chapter_id || u.chapterId,
          dateTime: regTime,
          time: regTime,
          status: isMemberActive(u) ? 'ACTIVE' : 'INACTIVE',
          fromUserId: u.uid || u.id,
          icon: Users,
          bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
        });
      }

      if (u.status === 'ACTIVE' || isMemberActive(u)) {
        activities.push({
          id: 'mem-act-' + (u.uid || u.id),
          activity: `Membership Activated: ${uName}`,
          title: `${uName} Activated`,
          desc: `${uName}'s membership activated in ${chName}`,
          type: 'member',
          memberName: uName,
          chapterName: chName,
          chapter_id: u.chapter_id || u.chapterId,
          dateTime: new Date(u.updatedAt || u.updated_at || u.createdAt || Date.now()).getTime(),
          time: new Date(u.updatedAt || u.updated_at || u.createdAt || Date.now()).getTime(),
          status: 'ACTIVE',
          fromUserId: u.uid || u.id,
          icon: UserCheck,
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        });
      } else if (u.status === 'INACTIVE' || u.status === 'SUSPENDED') {
        activities.push({
          id: 'mem-deact-' + (u.uid || u.id),
          activity: `Membership Deactivated: ${uName}`,
          title: `${uName} Deactivated`,
          desc: `${uName}'s membership deactivated in ${chName}`,
          type: 'member',
          memberName: uName,
          chapterName: chName,
          chapter_id: u.chapter_id || u.chapterId,
          dateTime: new Date(u.updatedAt || u.updated_at || u.createdAt || Date.now()).getTime(),
          time: new Date(u.updatedAt || u.updated_at || u.createdAt || Date.now()).getTime(),
          status: 'INACTIVE',
          fromUserId: u.uid || u.id,
          icon: UserX,
          bg: 'bg-red-500/10 text-red-400 border-red-500/20'
        });
      }

      if (u.position && u.position !== 'member') {
        const formattedPos = u.position.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
        activities.push({
          id: 'mem-pos-' + (u.uid || u.id),
          activity: `${uName} Appointed ${formattedPos}`,
          title: `${uName} Appointed ${formattedPos}`,
          desc: `${uName} assigned as ${formattedPos} in ${chName}`,
          type: 'leadership',
          memberName: uName,
          chapterName: chName,
          chapter_id: u.chapter_id || u.chapterId,
          dateTime: new Date(u.updatedAt || u.updated_at || u.createdAt || Date.now()).getTime(),
          time: new Date(u.updatedAt || u.updated_at || u.createdAt || Date.now()).getTime(),
          status: formattedPos.toUpperCase(),
          fromUserId: u.uid || u.id,
          icon: Award,
          bg: 'bg-orange-500/10 text-orange-400 border-orange-500/20'
        });
      }
    });

    // 3. Subscriptions
    (subscriptionRequests || []).forEach(s => {
      const userId = s.userId || s.user_id || s.memberId || s.member_id;
      const uName = resolveMemberName(userId, s.userName || s.user_name || s.name || s.memberName);
      const chName = s.chapterName || s.chapter_name || 'Organization';
      const sTime = new Date(s.updated_at || s.updatedAt || s.created_at || s.createdAt || Date.now()).getTime();

      if (!isNaN(sTime)) {
        const isRenewal = s.is_renewal || s.type === 'RENEWAL' || s.status === 'RENEWED';
        activities.push({
          id: 'sub-' + s.id,
          activity: `Subscription ${isRenewal ? 'Renewed' : 'Approved'}: ${uName}`,
          title: `Subscription ${isRenewal ? 'Renewed' : 'Approved'}: ${uName}`,
          desc: `Subscription ${isRenewal ? 'renewed' : 'approved'} for ${uName} in ${chName}`,
          type: 'subscription',
          memberName: uName,
          chapterName: chName,
          chapter_id: s.chapter_id || s.chapterId,
          dateTime: sTime,
          time: sTime,
          status: (s.status || 'APPROVED').toUpperCase(),
          fromUserId: userId,
          icon: CheckCircle2,
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        });
      }
    });

    // 4. Chapter Meetings
    (meetings || []).forEach(m => {
      const creatorId = m.creatorId || m.created_by || m.creator_id || m.created_by_user_id || m.leader_id || m.userId;
      const creatorName = resolveMemberName(creatorId, m.creatorName || m.created_by_name || m.leader_name);
      const mTime = new Date(m.created_at || m.createdAt || m.date || Date.now()).getTime();

      if (!isNaN(mTime)) {
        const isCompleted = (m.isCompleted === true || String(m.isCompleted) === 'true' || m.status === 'COMPLETED');
        const meetingTitle = m.title || m.meeting_name || 'Weekly Chapter Meeting';
        activities.push({
          id: 'mtg-' + m.id,
          activity: isCompleted ? 'Chapter Meeting Completed' : 'Chapter Meeting Scheduled',
          title: isCompleted ? 'Chapter Meeting Completed' : 'Chapter Meeting Scheduled',
          desc: isCompleted 
            ? `Chapter meeting "${meetingTitle}" completed by ${creatorName}`
            : `Chapter meeting "${meetingTitle}" scheduled by ${creatorName}`,
          type: 'meeting',
          memberName: creatorName,
          chapterName: m.chapterName || m.chapter_name || 'Chapter',
          chapter_id: m.chapter_id || m.chapterId,
          dateTime: mTime,
          time: mTime,
          status: isCompleted ? 'COMPLETED' : 'SCHEDULED',
          fromUserId: creatorId,
          icon: Calendar,
          bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
        });
      }
    });

    // 5. One-to-One Meetings
    effectiveOneToOnes.forEach(m => {
      const creatorId = m.organizer_id || m.creatorId || m.creator_id || m.created_by || m.sender_id || m.userId || m.host_id;
      const participantId = (m.participantIds && m.participantIds[0]) || m.participant_ids?.[0] || m.withMemberId || m.with_member_id || m.member_id || m.receiver_id || m.partner_id;
      
      let candidateCreator = m.creatorName || m.creator_name || m.organizer_name || m.host_name || m.userName;
      let candidateParticipant = (m.participantNames && m.participantNames[0]) || m.participant_names?.[0] || m.withMemberName || m.with_member_name || m.partner_name;

      if ((!candidateCreator || !candidateParticipant) && m.title && typeof m.title === 'string') {
        const titleMatch = m.title.match(/(?:1:?1\s*Meeting\s*-\s*|1-to-1:\s*)([^\&]+)\&(.+)/i);
        if (titleMatch) {
          if (!candidateCreator) candidateCreator = titleMatch[1].trim();
          if (!candidateParticipant) candidateParticipant = titleMatch[2].trim();
        }
      }

      const creatorName = resolveMemberName(creatorId, candidateCreator);
      const participantName = resolveMemberName(participantId, candidateParticipant);
      
      const mTime = new Date(m.createdAt || m.created_at || m.date || Date.now()).getTime();
      if (!isNaN(mTime)) {
        const isCompleted = m.status === 'COMPLETED' || m.status === 'completed' || m.isCompleted === true || String(m.isCompleted) === 'true';
        
        const activityHeadline = isCompleted 
          ? `1-to-1 meeting completed with ${participantName}`
          : `1-to-1 meeting with ${participantName}`;

        const descText = isCompleted
          ? `1-to-1 meeting completed between ${creatorName} and ${participantName}`
          : `1-to-1 session scheduled between ${creatorName} and ${participantName}`;

        activities.push({
          id: 'oto-' + m.id,
          activity: activityHeadline,
          title: activityHeadline,
          desc: descText,
          type: 'onetoone',
          memberName: creatorName,
          creatorName: creatorName,
          partnerName: participantName,
          participantName: participantName,
          chapterName: m.chapterName || m.chapter_name || 'Chapter',
          chapter_id: m.chapter_id || m.chapterId,
          dateTime: mTime,
          time: mTime,
          status: isCompleted ? 'COMPLETED' : 'SCHEDULED',
          fromUserId: creatorId,
          toUserId: participantId,
          icon: Handshake,
          bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
        });
      }
    });

    // 6. Referrals
    effectiveReferrals.forEach(r => {
      const senderId = r.fromUserId || r.from_user_id || r.sender_id || r.created_by || r.userId || r.member_id;
      const receiverId = r.toUserId || r.to_user_id || r.receiver_id || r.recipient_id || r.assigned_to;
      
      const senderName = resolveMemberName(senderId, r.fromUserName || r.from_user_name || r.sender_name || r.creatorName);
      const receiverName = resolveMemberName(receiverId, r.toUserName || r.to_user_name || r.receiver_name || r.recipient_name);
      
      const rTime = new Date(r.createdAt || r.created_at || r.date || Date.now()).getTime();
      if (!isNaN(rTime)) {
        const clientOrReq = r.contact_name || r.customerName || r.customer_name || r.notes || r.business_requirement;
        const details = clientOrReq ? ` (${clientOrReq})` : '';
        activities.push({
          id: 'ref-' + r.id,
          activity: `${senderName} referred ${receiverName}`,
          title: `${senderName} referred ${receiverName}`,
          desc: `${senderName} referred ${receiverName}${details}`,
          type: 'referral',
          memberName: senderName,
          senderName: senderName,
          receiverName: receiverName,
          toUserName: receiverName,
          fromUserName: senderName,
          chapterName: r.chapterName || r.chapter_name || 'Chapter',
          chapter_id: r.chapter_id || r.chapterId,
          dateTime: rTime,
          time: rTime,
          status: (r.status || 'PASSED').toUpperCase(),
          fromUserId: senderId,
          toUserId: receiverId,
          icon: Share2,
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        });
      }
    });

    // 7. Thank You Slips / Business
    effectiveSlips.forEach(s => {
      const senderId = s.fromUserId || s.from_user_id || s.sender_id || s.submitted_by || s.user_id || s.created_by;
      const receiverId = s.toUserId || s.to_user_id || s.receiver_id || s.recipient_id || s.member_id;
      
      const senderName = resolveMemberName(senderId, s.fromUserName || s.from_user_name || s.sender_name);
      const receiverName = resolveMemberName(receiverId, s.toUserName || s.to_user_name || s.receiver_name);
      
      const val = Number(s.businessValue || s.business_value || s.amount || 0);
      const sTime = new Date(s.createdAt || s.created_at || s.date || Date.now()).getTime();
      if (!isNaN(sTime)) {
        const isBizClosed = val > 0;
        activities.push({
          id: 'slip-' + s.id,
          activity: isBizClosed 
            ? `${senderName} closed ₹${val.toLocaleString('en-IN')} with ${receiverName}`
            : `${senderName} submitted Thank You Slip to ${receiverName}`,
          title: isBizClosed 
            ? `${senderName} closed ₹${val.toLocaleString('en-IN')} with ${receiverName}`
            : `Thank You Slip: ${senderName} ➔ ${receiverName}`,
          desc: isBizClosed 
            ? `${senderName} closed ₹${val.toLocaleString('en-IN')} business with ${receiverName}`
            : `${senderName} submitted thank you slip to ${receiverName}`,
          type: 'business',
          memberName: senderName,
          senderName: senderName,
          receiverName: receiverName,
          amount: val,
          chapterName: s.chapterName || s.chapter_name || 'Chapter',
          chapter_id: s.chapter_id || s.chapterId,
          dateTime: sTime,
          time: sTime,
          status: 'CLOSED',
          fromUserId: senderId,
          toUserId: receiverId,
          icon: Briefcase,
          bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
        });
      }
    });

    // 8. Guest Invitations
    (guestInvitations || []).forEach(g => {
      const inviterId = g.invited_by_user_id || g.invited_by || g.createdBy || g.created_by || g.inviterId || g.inviter_id || g.user_id;
      const inviterName = resolveMemberName(inviterId, g.invited_by_name || g.inviter_name || g.creatorName);
      const guestName = g.guest_name || g.guestName || g.name || g.visitor_name || 'Guest';
      const gTime = new Date(g.createdAt || g.created_at || g.date || Date.now()).getTime();

      if (!isNaN(gTime)) {
        activities.push({
          id: 'guest-' + g.id,
          activity: `${inviterName} invited ${guestName}`,
          title: `${inviterName} invited ${guestName}`,
          desc: `${inviterName} invited ${guestName} (Guest) to ${g.chapterName || g.chapter_name || 'Chapter'}`,
          type: 'guest',
          memberName: inviterName,
          inviterName: inviterName,
          guestName: guestName,
          chapterName: g.chapterName || g.chapter_name || 'Chapter',
          chapter_id: g.chapter_id || g.chapterId,
          dateTime: gTime,
          time: gTime,
          status: (g.status || 'INVITED').toUpperCase(),
          fromUserId: inviterId,
          icon: UserPlus,
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        });
      }
    });

    // 9. Testimonials
    (allTestimonials || []).forEach(t => {
      const authorId = t.sender_id || t.from_user_id || t.authorMemberId || t.author_id || t.author_member_id || t.fromUserId || t.giver_uid || t.giver_id || t.created_by || t.userId;
      const recipientId = t.receiver_id || t.to_user_id || t.recipientMemberId || t.recipient_id || t.recipient_member_id || t.toUserId || t.recipient_uid || t.member_id;
      
      const authorName = resolveMemberName(authorId, t.sender_name || t.giver_name || t.author_name || t.authorName || t.author);
      const recipientName = resolveMemberName(recipientId, t.receiver_name || t.recipient_name || t.recipientName || t.recipient);
      const testimonialContent = String(t.testimonial || t.content || t.text || t.message || t.description || '').trim();
      const isSentByMe = userCandidateIds.includes(String(authorId));
      const isReceivedByMe = userCandidateIds.includes(String(recipientId));
      const activityLabel = isReceivedByMe && !isSentByMe ? 'Testimonial Received' : 'Testimonial Sent';
      
      const tTime = new Date(t.created_at || t.createdAt || Date.now()).getTime();
      if (!isNaN(tTime)) {
        activities.push({
          id: 'test-' + t.id,
          activity: activityLabel,
          title: activityLabel,
          desc: testimonialContent || `${authorName} submitted testimonial for ${recipientName}`,
          testimonialContent,
          activityLabel,
          type: 'testimonial',
          memberName: isSentByMe ? recipientName : authorName,
          authorName: authorName,
          recipientName: recipientName,
          chapterName: t.chapterName || t.chapter_name || 'Chapter',
          chapter_id: t.chapter_id || t.chapterId,
          dateTime: tTime,
          time: tTime,
          status: (t.status || 'APPROVED').toUpperCase(),
          fromUserId: authorId,
          toUserId: recipientId,
          icon: Star,
          bg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
        });
      }
    });

    // Filter valid entries, sort by time desc
    const sorted = activities
      .filter(a => a.time && !isNaN(a.time))
      .sort((a, b) => b.time - a.time);

    return sorted;
  }, [
    effectiveSlips,
    effectiveReferrals,
    effectiveOneToOnes,
    guestInvitations,
    chapterUsers,
    allChapters,
    meetings,
    allTestimonials,
    subscriptionRequests,
    activeDateRange,
    resolveMemberName
  ]);

  // Filtered recent activities based on role and chapter context
  const filteredRecentActivities = useMemo(() => {
    if (!profile) return [];
    if (profile.role === 'MASTER_ADMIN') {
      return dynamicRecentActivities;
    }
    if (isChapterAdminUser) {
      const myChapId = String(profile.chapter_id || profile.chapterId || '').trim().toLowerCase();
      const myChapName = String(profile.chapterName || profile.chapter_name || '').trim().toLowerCase();
      return dynamicRecentActivities.filter(a => 
        chapterUserIds.includes(String(a.fromUserId)) || 
        (a.toUserId && chapterUserIds.includes(String(a.toUserId))) ||
        (a.chapter_id && String(a.chapter_id).toLowerCase() === myChapId) ||
        (a.chapterName && String(a.chapterName).toLowerCase() === myChapName)
      );
    }
    // MEMBER role
    const userIds = [profile.id, profile.uid].filter(Boolean).map(String);
    const myChapId = String(profile.chapter_id || profile.chapterId || '').trim().toLowerCase();
    const myChapName = String(profile.chapterName || profile.chapter_name || '').trim().toLowerCase();
    return dynamicRecentActivities.filter(a => 
      userIds.includes(String(a.fromUserId)) || 
      (a.toUserId && userIds.includes(String(a.toUserId))) ||
      chapterUserIds.includes(String(a.fromUserId)) || 
      (a.toUserId && chapterUserIds.includes(String(a.toUserId))) ||
      (a.chapter_id && myChapId && String(a.chapter_id).toLowerCase() === myChapId) ||
      (a.chapterName && myChapName && String(a.chapterName).toLowerCase() === myChapName)
    );
  }, [dynamicRecentActivities, profile, chapterUserIds, isChapterAdminUser]);

  // Derived Checklist Status
  const hasAttendedMeeting = useMemo(() => {
    if (!profile) return false;
    const relevantMeetings = profile.adminId ? meetings.filter(m => m.chapter_id === profile.chapter_id) : meetings;
    return relevantMeetings.some(m => !m.isCancelled && m.status !== 'CANCELLED' && (m.isCompleted === true || (m.isCompleted as any) === 'true' || m.status === 'COMPLETED') && ['PRESENT', 'Yes', 'Substitute', 'Late', 'YES', 'SUBSTITUTE', 'Present'].includes(m.attendance?.[profile.uid]));
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
    if (!isChapterLeaderRole(profile)) return [];
    const tasks: any[] = [];
    
    // Normal Chapter Admin tasks first
    tasks.push({ key: 't1', label: "Schedule Chapter Sync Assemblies", isDone: true, link: "/meetings", linkText: "View", iconColor: 'text-emerald-400', bgColor: 'bg-emerald-500/10', icon: CheckSquare, activeClass: 'bg-[#DC143C]' });
    tasks.push({ key: 't2', label: "Moderate Guest Onboarding Protocols", isDone: true, link: "/guests", linkText: "Guests", iconColor: 'text-emerald-400', bgColor: 'bg-emerald-500/10', icon: CheckSquare, activeClass: 'bg-[#DC143C]' });
    
    const members = chapterUsers.filter(u => u.chapter_id === profile?.chapter_id && u.role !== 'MASTER_ADMIN' && !isChapterLeaderRole(u));

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
       if (!isNaN(sDate.getTime())) {
       sDate.setFullYear(sDate.getFullYear() + 1);
       endStr = sDate.toISOString();
       }
    }
    
    if (startStr && endStr) {
      const start = new Date(startStr);
      const end = new Date(endStr);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) { return { start, end }; }
    }
    return undefined;
  }, [profile]);

  // Dynamic Growth Score calculation (Member & Chapter)
  const memberGrowthScoreData = useMemo(() => {
    return calculateMemberGrowthScoreData({
      profile,
      activeDateRange: undefined,
      allReferrals,
      oneToOnes,
      meetings,
      guestInvitations,
      allSlips: allSlips,
      testimonials: allTestimonials,
      allUsers: allUsersList.length > 0 ? allUsersList : chapterUsers
    });
  }, [profile, allReferrals, oneToOnes, meetings, guestInvitations, allSlips, allTestimonials, allUsersList, chapterUsers]);

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
      allSlips: effectiveSlips,
      testimonials: allTestimonials,
      currentProfile: profile,
      todayTasks
    });
  }, [chapterUsers, profile, growthScoreDateRange, allReferrals, oneToOnes, meetings, guestInvitations, effectiveSlips, allTestimonials, todayTasks]);

  const showChapterScoreGauge = profile?.role === 'MASTER_ADMIN';
  const growthScoreData = showChapterScoreGauge ? chapterGrowthScoreData : memberGrowthScoreData;
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

    const getScoreForRange = (start: Date, end: Date) => {
      if (profile?.role === 'MASTER_ADMIN') {
        const data = calculateChapterGrowthScoreData({
          chapterMembers: chapterUsers,
          allReferrals,
          oneToOnes,
          meetings,
          guestInvitations,
          allSlips,
          testimonials: allTestimonials,
          activeDateRange: { start, end },
          currentProfile: profile
        });
        return data.score;
      }
      const data = calculateMemberGrowthScoreData({
        profile,
        allReferrals,
        oneToOnes,
        meetings,
        guestInvitations,
        allSlips,
        testimonials: allTestimonials,
        activeDateRange: { start, end }
      });
      return data.score;
    };

    const currentWeekAct = getScoreForRange(startOfWeek, now);
    const prevWeekAct = getScoreForRange(startOfPrevWeek, new Date(startOfWeek.getTime() - 1));
    const currentMonthAct = getScoreForRange(startOfMonth, now);
    const prevMonthAct = getScoreForRange(startOfPrevMonth, new Date(startOfMonth.getTime() - 1));

    return {
      weeklyGrowth: calculateGrowthScoreTrend(currentWeekAct, prevWeekAct),
      monthlyGrowth: calculateGrowthScoreTrend(currentMonthAct, prevMonthAct)
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
  
  
  const getCleanModalTitle = (rawCategory: string | null) => {
    if (!rawCategory) return '';
    const norm = rawCategory.toLowerCase().trim();
    if (norm.includes('referral') && norm.includes('sent')) return 'Referrals Sent';
    if (norm.includes('referral') && norm.includes('received')) return 'Referrals Received';
    if (norm.includes('referral')) return 'Referrals';
    if (norm.includes('business') && (norm.includes('sent') || norm.includes('given'))) return 'Business Given';
    if (norm.includes('business') && norm.includes('received')) return 'Business Received';
    if (norm.includes('business')) return 'Business Records';
    if (norm.includes('thank') && norm.includes('sent')) return 'Thank You Slips Sent';
    if (norm.includes('thank') && norm.includes('received')) return 'Thank You Slips Received';
    if (norm.includes('thank')) return 'Thank You Slips';
    if (norm.includes('meeting') && norm.includes('scheduled')) return 'Meetings Scheduled';
    if (norm.includes('meeting') && (norm.includes('attended') || norm.includes('attendance'))) return 'Meetings Attended';
    if (norm.includes('one-to-one') || norm.includes('1-to-1') || norm.includes('1:1')) {
      if (norm.includes('scheduled')) return '1-to-1 Meetings Scheduled';
      if (norm.includes('completed')) return '1-to-1 Meetings Completed';
      return '1-to-1 Meetings';
    }
    if (norm === 'meetings') return 'Chapter Meetings';
    if (norm.includes('guest') && norm.includes('invited')) return 'Guests Invited';
    if (norm.includes('visitor') || (norm.includes('guest') && norm.includes('attended'))) return 'Visitors Attended';
    if (norm.includes('guest')) return 'Guests & Visitors';
    if (norm.includes('testimonial')) {
      if (norm.includes('given') || norm.includes('sent')) return 'Testimonials Given';
      if (norm.includes('received')) return 'Testimonials Received';
      return 'Testimonials';
    }
    return rawCategory;
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
        if (dateString.includes('T')) {
          return format(dateD, 'h:mm a');
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  const formatRole = (role: string, position: string) => {
    if (role === 'CHAPTER_ADMIN') return 'Chapter Admin';
    if (role === 'PRESIDENT') return 'President';
    if (role === 'VICE_PRESIDENT') return 'Vice President';
    if (role === 'TREASURER') return 'Treasurer';
    if (position && position.toLowerCase() !== 'none') return position;
    return 'Member';
  };

  const fetchAnalyticsDataForCategory = async (category: string, dateRangeOverride?: { start: Date; end: Date } | null) => {
    if (!profile) return;
    const norm = category.toLowerCase().trim();
    const candidateIds = userCandidateIds;
    if (candidateIds.length === 0) return;

    const effectiveDate = dateRangeOverride !== undefined ? dateRangeOverride : activeDateRange;

    try {
      if (norm.includes('referral')) {
        let query = supabase.from('referrals').select('*');
        const isSentOnly = norm.includes('sent') || norm.includes('given') || norm.includes('passed');
        const isReceivedOnly = norm.includes('received');

        if (usePersonalStats) {
          if (isSentOnly) {
            const orConds = candidateIds.flatMap(id => [`from_user_id.eq.${id}`, `sender_id.eq.${id}`]).join(',');
            query = query.or(orConds);
          } else if (isReceivedOnly) {
            const orConds = candidateIds.flatMap(id => [`to_user_id.eq.${id}`, `receiver_id.eq.${id}`]).join(',');
            query = query.or(orConds);
          } else {
            const orConds = candidateIds.flatMap(id => [
              `from_user_id.eq.${id}`,
              `to_user_id.eq.${id}`,
              `sender_id.eq.${id}`,
              `receiver_id.eq.${id}`
            ]).join(',');
            query = query.or(orConds);
          }
        } else {
          if (appliedChapterFilter !== 'ALL') {
            query = query.eq('chapter_id', appliedChapterFilter);
          }
          if (appliedMemberFilter !== 'ALL') {
            query = query.or(`from_user_id.eq.${appliedMemberFilter},to_user_id.eq.${appliedMemberFilter},sender_id.eq.${appliedMemberFilter},receiver_id.eq.${appliedMemberFilter}`);
          }
        }

        if (effectiveDate) {
          query = query.gte('created_at', effectiveDate.start.toISOString()).lte('created_at', effectiveDate.end.toISOString());
        }

        const { data: sbReferrals, error } = await query;
        if (error) throw error;

        let list = (sbReferrals || []).filter(isNormalReferral);
        if (usePersonalStats) {
          list = list.filter(r => {
            const sId = String(r.from_user_id || r.sender_id || r.fromUserId || '');
            const rId = String(r.to_user_id || r.receiver_id || r.toUserId || '');
            if (isSentOnly) return candidateIds.includes(sId);
            if (isReceivedOnly) return candidateIds.includes(rId);
            return candidateIds.includes(sId) || candidateIds.includes(rId);
          });
        }
        if (effectiveDate) {
          list = list.filter(r => isDateInRange(r.created_at || r.createdAt || r.date, effectiveDate.start, effectiveDate.end));
        }

        const mapped = list.map(ref => {
          const senderId = String(ref.from_user_id || ref.sender_id || ref.fromUserId || '');
          const receiverId = String(ref.to_user_id || ref.receiver_id || ref.toUserId || '');
          const isSentByMe = candidateIds.includes(senderId);
          const giverName = resolveMemberName(senderId, ref.from_user_name || ref.fromUserName || ref.sender_name);
          const recipientName = resolveMemberName(receiverId, ref.to_user_name || ref.toUserName || ref.receiver_name);
          const st = (ref.status || 'Pending').toLowerCase();
          let bColor: 'emerald' | 'red' | 'amber' | 'blue' = 'amber';
          if (st === 'closed' || st === 'completed' || st === 'converted') bColor = 'emerald';
          if (st === 'cancelled' || st === 'not_converted') bColor = 'red';

          return {
            id: String(ref.id),
            title: isSentByMe ? `To: ${recipientName}` : `From: ${giverName}`,
            subtitle: `Customer: ${ref.customer_name || ref.contact_name || 'Referral'}${usePersonalStats ? ` • ${isSentByMe ? 'Referral Given' : 'Referral Received'}` : ''}`,
            icon: <Share2 size={20} className="text-purple-400" />,
            badgeText: ref.status || 'Pending',
            badgeColor: bColor,
            date: ref.created_at ? formatDate(ref.created_at) : null,
            time: ref.created_at ? formatTimeStr('', ref.created_at) : null,
            notes: ref.notes || ref.requirement || ref.business_requirement || '-'
          };
        });

        setAnalyticsModalRecords(mapped);
      } else if (norm.includes('business') || norm.includes('thank')) {
        let query = supabase.from('thank_you_slips').select('*');
        const isThank = norm.includes('thank');
        const isThankSent = isThank && (norm.includes('sent') || norm.includes('given'));
        const isThankReceived = isThank && norm.includes('received');
        const isBizSent = !isThank && (norm.includes('sent') || norm.includes('given'));
        const isBizReceived = !isThank && norm.includes('received');

        if (usePersonalStats) {
          if (isBizSent || isThankReceived) {
            const orConds = candidateIds.flatMap(id => [`to_user_id.eq.${id}`, `receiver_id.eq.${id}`]).join(',');
            query = query.or(orConds);
          } else if (isBizReceived || isThankSent) {
            const orConds = candidateIds.flatMap(id => [`from_user_id.eq.${id}`, `sender_id.eq.${id}`, `submitted_by.eq.${id}`]).join(',');
            query = query.or(orConds);
          } else {
            const orConds = candidateIds.flatMap(id => [
              `from_user_id.eq.${id}`,
              `to_user_id.eq.${id}`,
              `sender_id.eq.${id}`,
              `receiver_id.eq.${id}`,
              `submitted_by.eq.${id}`
            ]).join(',');
            query = query.or(orConds);
          }
        } else {
          if (appliedChapterFilter !== 'ALL') {
            query = query.eq('chapter_id', appliedChapterFilter);
          }
          if (appliedMemberFilter !== 'ALL') {
            query = query.or(`from_user_id.eq.${appliedMemberFilter},to_user_id.eq.${appliedMemberFilter},sender_id.eq.${appliedMemberFilter},receiver_id.eq.${appliedMemberFilter}`);
          }
        }

        if (effectiveDate) {
          query = query.gte('created_at', effectiveDate.start.toISOString()).lte('created_at', effectiveDate.end.toISOString());
        }

        const { data: sbSlips, error } = await query;
        if (error) throw error;

        let list = sbSlips || [];
        if (usePersonalStats) {
          list = list.filter((s: any) => {
            const senderId = String(s.from_user_id || s.sender_id || s.submitted_by || s.fromUserId || '');
            const receiverId = String(s.to_user_id || s.receiver_id || s.toUserId || '');
            if (isBizSent || isThankReceived) return candidateIds.includes(receiverId);
            if (isBizReceived || isThankSent) return candidateIds.includes(senderId);
            return candidateIds.includes(senderId) || candidateIds.includes(receiverId);
          });
        }
        if (effectiveDate) {
          list = list.filter(s => isDateInRange(s.created_at || s.createdAt || s.date, effectiveDate.start, effectiveDate.end));
        }

        const mapped = list.map((slip: any) => {
          const senderId = String(slip.from_user_id || slip.sender_id || slip.submitted_by || slip.fromUserId || '');
          const receiverId = String(slip.to_user_id || slip.receiver_id || slip.toUserId || '');
          const senderName = resolveMemberName(senderId, slip.sender_name || slip.fromUserName);
          const receiverName = resolveMemberName(receiverId, slip.receiver_name || slip.toUserName);
          const isSender = candidateIds.includes(senderId);
          const isReceiver = candidateIds.includes(receiverId);
          const val = Number(slip.business_value || slip.businessValue || slip.amount || 0);

          if (!isThank) {
            const isGiver = isReceiver;
            return {
              id: String(slip.id),
              title: slip.customer_name || slip.customerName || (isGiver ? `Business Given to ${receiverName}` : `Business Received from ${senderName}`),
              subtitle: isGiver ? `To: ${receiverName} (Business Given)` : `From: ${senderName} (Business Received)`,
              icon: <Briefcase size={20} className="text-emerald-400" />,
              badgeText: `₹${val.toLocaleString('en-IN')}`,
              badgeColor: 'emerald' as const,
              date: slip.created_at ? formatDate(slip.created_at) : null,
              time: slip.created_at ? formatTimeStr('', slip.created_at) : null,
              notes: slip.notes || slip.thank_you_message || '-'
            };
          } else {
            return {
              id: String(slip.id),
              title: slip.customer_name || slip.customerName ? `Client: ${slip.customer_name || slip.customerName}` : (isSender ? `Thank You to ${receiverName}` : `Thank You from ${senderName}`),
              subtitle: isSender ? `Sent to: ${receiverName} (Thank You Given)` : `Received from: ${senderName} (Thank You Received)`,
              icon: <FileText size={20} className="text-cyan-400" />,
              badgeText: `₹${val.toLocaleString('en-IN')}`,
              badgeColor: 'emerald' as const,
              date: slip.created_at ? formatDate(slip.created_at) : null,
              time: slip.created_at ? formatTimeStr('', slip.created_at) : null,
              notes: slip.notes || slip.thank_you_message || '-'
            };
          }
        });

        setAnalyticsModalRecords(mapped);
      } else if (norm.includes('one-to-one') || norm.includes('1-to-1') || norm.includes('1:1') || norm.includes('one to one')) {
        let query = supabase.from('one_to_one_meetings').select('*');
        const isScheduledOnly = norm.includes('scheduled');
        const isCompletedOnly = norm.includes('completed');

        if (usePersonalStats) {
          const orConds = candidateIds.flatMap(id => [
            `organizer_id.eq.${id}`,
            `member_id.eq.${id}`,
            `creator_id.eq.${id}`,
            `receiver_id.eq.${id}`,
            `sender_id.eq.${id}`
          ]).join(',');
          query = query.or(orConds);
        } else {
          if (appliedChapterFilter !== 'ALL') {
            query = query.eq('chapter_id', appliedChapterFilter);
          }
        }

        if (isCompletedOnly) {
          query = query.or('status.eq.COMPLETED,status.eq.completed,is_completed.eq.true');
        }

        if (effectiveDate) {
          query = query.gte('date', effectiveDate.start.toISOString().split('T')[0]).lte('date', effectiveDate.end.toISOString().split('T')[0]);
        }

        const { data: sbOto, error } = await query;
        if (error) throw error;

        let list = sbOto || [];
        if (usePersonalStats) {
          list = list.filter((m: any) => {
            if (!isUserOneToOneParticipant(m, candidateIds)) return false;
            const st = String(m.status || '').toUpperCase();
            if (isScheduledOnly) {
              return st !== 'CANCELLED' && st !== 'NOT_COMPLETED';
            }
            if (isCompletedOnly) {
              return st === 'COMPLETED' || m.is_completed === true || m.isCompleted === true;
            }
            return true;
          });
        }
        if (effectiveDate) {
          list = list.filter(m => isDateInRange(m.date || m.scheduled_date || m.created_at, effectiveDate.start, effectiveDate.end));
        }

        const mapped = list.map((m: any) => {
          const senderId = String(m.sender_id || m.organizer_id || m.creator_id || m.userId || '');
          const receiverId = String(m.receiver_id || m.member_id || (m.participant_ids && m.participant_ids[0]) || '');
          let candSender = m.creator_name || m.organizer_name || m.host_name;
          let candReceiver = m.partner_name || (m.participant_names && m.participant_names[0]);

          const senderName = resolveMemberName(senderId, candSender);
          const receiverName = resolveMemberName(receiverId, candReceiver);
          const partnerName = candidateIds.includes(senderId) ? receiverName : senderName;

          const st = (m.status || 'Scheduled').toLowerCase();
          let bColor: 'emerald' | 'red' | 'amber' | 'blue' = 'amber';
          if (st === 'completed') bColor = 'emerald';
          if (st === 'cancelled') bColor = 'red';

          return {
            id: String(m.id),
            title: usePersonalStats ? `1-to-1 with ${partnerName || 'Member'}` : `${senderName} & ${receiverName}`,
            subtitle: m.venue || m.meeting_location || m.locationType || 'In-Person / Online',
            icon: <Handshake size={20} className="text-blue-400" />,
            badgeText: m.status || 'Scheduled',
            badgeColor: bColor,
            date: m.date || m.scheduled_date ? formatDate(m.date || m.scheduled_date) : null,
            time: formatTimeStr(m.time || m.scheduled_time || m.meeting_time, m.date || m.scheduled_date),
            notes: m.notes || m.description || '-'
          };
        });

        setAnalyticsModalRecords(mapped);
      } else if (norm.includes('guest') || norm.includes('visitor') || norm.includes('invite')) {
        let query = supabase.from('guest_invitations').select('*');
        const isVisitorOnly = norm.includes('visitor') || norm.includes('attended');
        const isInvitedOnly = norm.includes('invited');

        if (usePersonalStats) {
          const orConds = candidateIds.flatMap(id => [
            `invited_by_user_id.eq.${id}`,
            `invited_by.eq.${id}`,
            `created_by.eq.${id}`,
            `inviter_id.eq.${id}`,
            `member_id.eq.${id}`,
            `user_id.eq.${id}`
          ]).join(',');
          query = query.or(orConds);
        } else {
          if (appliedChapterFilter !== 'ALL') {
            query = query.eq('chapter_id', appliedChapterFilter);
          }
          if (appliedMemberFilter !== 'ALL') {
            query = query.or(`invited_by_user_id.eq.${appliedMemberFilter},invited_by.eq.${appliedMemberFilter},created_by.eq.${appliedMemberFilter},inviter_id.eq.${appliedMemberFilter},member_id.eq.${appliedMemberFilter},user_id.eq.${appliedMemberFilter}`);
          }
        }

        const { data: sbGuests, error } = await query;
        if (error) throw error;

        // Ensure we have meeting records to check upcoming meeting dates and completion status
        let currentMeetings = meetings;
        if (!currentMeetings || currentMeetings.length === 0) {
          const { data: mData } = await supabase.from('meetings').select('*');
          currentMeetings = (mData || []).map((m: any) => normalizeMeetingRecord({ ...m }));
        }

        let list = sbGuests || [];
        if (usePersonalStats) {
          list = list.filter((g: any) => {
            const inviterIds = [
              g.invited_by_user_id,
              g.invitedByUserId,
              g.invited_by,
              g.invitedBy,
              g.created_by,
              g.createdBy,
              g.inviterId,
              g.inviter_id,
              g.user_id,
              g.userId,
              g.member_id,
              g.memberId
            ].filter(Boolean).map(id => String(id).trim().toLowerCase());

            const isMine = candidateIds.some(cid => inviterIds.includes(String(cid).trim().toLowerCase()));
            if (!isMine) return false;

            const rawSt = String(g.status || g.attendance_status || g.attendanceStatus || '').trim().toLowerCase();
            if (rawSt === 'absent' || rawSt === 'pending' || rawSt === 'cancelled' || rawSt === 'canceled' || rawSt === 'no-show' || rawSt === 'invalid') {
              return false;
            }

            if (isVisitorOnly) {
              return isGuestMarkedPresent(g);
            }
            if (isInvitedOnly) {
              return isGuestInvitedToUpcoming(g, currentMeetings);
            }
            return isGuestMarkedPresent(g) || isGuestInvitedToUpcoming(g, currentMeetings);
          });
        } else {
          list = list.filter((g: any) => {
            const rawSt = String(g.status || g.attendance_status || g.attendanceStatus || '').trim().toLowerCase();
            if (rawSt === 'absent' || rawSt === 'pending' || rawSt === 'cancelled' || rawSt === 'canceled' || rawSt === 'no-show' || rawSt === 'invalid') {
              return false;
            }
            if (isVisitorOnly) {
              return isGuestMarkedPresent(g);
            }
            if (isInvitedOnly) {
              return isGuestInvitedToUpcoming(g, currentMeetings);
            }
            return isGuestMarkedPresent(g) || isGuestInvitedToUpcoming(g, currentMeetings);
          });
        }

        if (effectiveDate) {
          list = list.filter(g => isDateInRange(g.meeting_date || g.attendance_updated_at || g.created_at || g.date, effectiveDate.start, effectiveDate.end));
        }

        const mapped = list.map((g: any) => {
          const invId = String(g.invited_by_user_id || g.invited_by || g.createdBy || g.member_id || g.user_id || '').trim();
          const inviterName = resolveMemberName(invId, g.invited_by_name || g.inviter_name);
          const isPresent = isGuestMarkedPresent(g);
          const st = isPresent ? 'Present' : (g.status || 'Invited');
          const bColor: 'emerald' | 'red' | 'amber' | 'blue' = isPresent ? 'emerald' : 'amber';

          return {
            id: String(g.id),
            title: g.guest_name || g.guestName || 'Guest',
            subtitle: usePersonalStats
              ? (g.business_category || g.guest_business || g.profession || 'Invited Visitor')
              : `Invited By: ${inviterName}`,
            icon: <UserPlus size={20} className="text-pink-400" />,
            badgeText: st,
            badgeColor: bColor,
            date: g.meeting_date || g.created_at ? formatDate(g.meeting_date || g.created_at) : null,
            time: g.meeting_time ? formatTimeStr(g.meeting_time, '') : null,
            notes: g.notes || (g.business_category || g.profession ? `Business: ${g.business_category || g.profession}` : '-')
          };
        });

        setAnalyticsModalRecords(mapped);
      } else if (norm.includes('meeting')) {
        const isAttendedOnly = norm.includes('attended') || norm.includes('attendance');
        const isScheduledOnly = norm.includes('scheduled');
        const userChapId = String(profile?.chapter_id || profile?.chapterId || '').trim();

        let query = supabase.from('meetings').select('*');

        if (usePersonalStats) {
          if (isAttendedOnly) {
            const orConds = candidateIds.map(id => `attendance->>${id}.in.("Present","PRESENT","Yes","YES","Substitute","SUBSTITUTE","Late")`).join(',');
            query = query.or(orConds);
          } else if (userChapId) {
            query = query.eq('chapter_id', userChapId);
          } else {
            const orConds = candidateIds.flatMap(id => [`admin_id.eq.${id}`, `attendance->>${id}.neq.null`]).join(',');
            query = query.or(orConds);
          }
        } else {
          if (appliedChapterFilter !== 'ALL') {
            query = query.eq('chapter_id', appliedChapterFilter);
          }
        }

        if (effectiveDate) {
          query = query.gte('date', effectiveDate.start.toISOString().split('T')[0]).lte('date', effectiveDate.end.toISOString().split('T')[0]);
        }

        const { data: sbMeetings, error } = await query;
        if (error) throw error;

        let list = (sbMeetings || []).map((m: any) => normalizeMeetingRecord({ ...m }));
        if (usePersonalStats) {
          list = list.filter((m: any) => {
            const mChap = String(m.chapter_id || '').trim();
            if (userChapId && mChap && userChapId !== mChap) return false;

            if (isAttendedOnly) {
              if (!m.attendance) return false;
              if (m.isCancelled || m.status === 'CANCELLED') return false;
              return candidateIds.some(uid => {
                const st = m.attendance[uid];
                return st && ['PRESENT', 'Yes', 'Substitute', 'Late', 'YES', 'SUBSTITUTE', 'Present'].includes(String(st));
              });
            }
            if (isScheduledOnly) {
              const now = new Date();
              const mDate = new Date(m.date || m.created_at || '');
              const normalized = normalizeMeetingRecord({ ...m });
              const notes = normalized.memberNotes || normalized.member_notes || {};
              const effectiveStatus = String(notes.__status || normalized.status || 'UPCOMING').trim().toUpperCase();
              const isDone = normalized.isCompleted === true || (normalized.isCompleted as any) === 'true' || effectiveStatus === 'COMPLETED' || normalized.isCancelled === true || (normalized.isCancelled as any) === 'true' || effectiveStatus === 'CANCELLED';
              return !isDone && (effectiveStatus === 'UPCOMING' || effectiveStatus === 'SCHEDULED') && (getMeetingExactDateTime(normalized) > now || mDate >= now);
            }
            return true;
          });
        }
        if (effectiveDate) {
          list = list.filter(m => isDateInRange(m.date || m.meeting_date || m.created_at, effectiveDate.start, effectiveDate.end));
        }

        const mapped = list.map((m: any) => {
          const isCancelled = m.isCancelled === true || (m.isCancelled as any) === 'true' || String(m.status).toUpperCase() === 'CANCELLED';
          let bText = isCancelled ? 'Cancelled' : (m.status || 'Scheduled');
          let bColor: 'emerald' | 'red' | 'amber' | 'blue' = isCancelled ? 'red' : ((m.status || '').toLowerCase() === 'completed' ? 'emerald' : 'amber');
          if (isCancelled) {
            bText = 'Cancelled';
            bColor = 'red';
          } else if (usePersonalStats) {
            const userAttStatus = m.attendance ? candidateIds.map(uid => m.attendance[uid]).find(Boolean) : undefined;
            if (userAttStatus) {
              const uUpper = String(userAttStatus).toUpperCase();
              if (['PRESENT', 'YES', 'SUBSTITUTE', 'LATE'].includes(uUpper)) {
                bText = String(userAttStatus);
                bColor = 'emerald';
              } else if (['ABSENT', 'MEDICAL', 'NO'].includes(uUpper)) {
                bText = String(userAttStatus);
                bColor = 'red';
              } else {
                bText = 'Pending';
                bColor = 'amber';
              }
            } else {
              bText = 'Pending';
              bColor = 'amber';
            }
          }

          return {
            id: String(m.id),
            title: m.title || 'Chapter Meeting',
            subtitle: m.venue || m.location || 'Meeting Venue',
            icon: <Calendar size={20} className="text-orange-400" />,
            badgeText: bText,
            badgeColor: bColor,
            date: m.date ? formatDate(m.date) : null,
            time: m.startTime ? `${m.startTime} - ${m.endTime || 'End'}` : (m.time || null),
            notes: m.location || m.notes || '-'
          };
        });

        setAnalyticsModalRecords(mapped);
      } else if (norm.includes('testimonial')) {
        let query = supabase.from('testimonials').select('*');
        const isGivenOnly = norm.includes('given') || norm.includes('sent');
        const isReceivedOnly = norm.includes('received');

        if (usePersonalStats) {
          if (isGivenOnly) {
            query = query.or(candidateIds.map(id => `author_id.eq.${id}`).join(','));
          } else if (isReceivedOnly) {
            query = query.or(candidateIds.map(id => `receiver_id.eq.${id}`).join(','));
          } else {
            query = query.or(candidateIds.flatMap(id => [`author_id.eq.${id}`, `receiver_id.eq.${id}`]).join(','));
          }
        } else {
          if (appliedChapterFilter !== 'ALL') {
            query = query.eq('chapter_id', appliedChapterFilter);
          }
        }

        if (effectiveDate) {
          query = query.gte('created_at', effectiveDate.start.toISOString()).lte('created_at', effectiveDate.end.toISOString());
        }

        const { data: sbTestimonials, error } = await query;
        if (error) throw error;

        let list = sbTestimonials || [];
        if (usePersonalStats) {
          list = list.filter((t: any) => {
            const authorId = String(t.author_id || t.authorId || '');
            const recipientId = String(t.receiver_id || t.receiverId || '');
            if (isGivenOnly) return candidateIds.includes(authorId);
            if (isReceivedOnly) return candidateIds.includes(recipientId);
            return candidateIds.includes(authorId) || candidateIds.includes(recipientId);
          });
        }
        if (effectiveDate) {
          list = list.filter(t => isDateInRange(t.created_at || t.createdAt, effectiveDate.start, effectiveDate.end));
        }

        const mapped = list.map((t: any) => {
          const authorId = String(t.author_id || t.authorId || '');
          const recipientId = String(t.receiver_id || t.receiverId || '');
          const isAuthor = candidateIds.includes(authorId);
          const giverName = resolveMemberName(authorId, t.author_name || t.authorName);
          const receiverName = resolveMemberName(recipientId, t.recipient_name || t.receiver_name);
          let text = t.testimonial || '';
          if (text.includes('|||')) {
            const parts = text.split('|||');
            text = parts[0];
          }

          return {
            id: String(t.id),
            title: isAuthor ? `To: ${receiverName}` : `From: ${giverName}`,
            subtitle: isAuthor ? 'Testimonial Given' : 'Testimonial Received',
            icon: <Star size={20} className="text-amber-400" />,
            badgeText: t.status || 'Published',
            badgeColor: 'blue' as const,
            date: t.created_at ? formatDate(t.created_at) : null,
            time: t.created_at ? formatTimeStr('', t.created_at) : null,
            notes: text || '-'
          };
        });

        setAnalyticsModalRecords(mapped);
      } else if (norm.includes('member')) {
        let list = chapterUsers.filter(u => u.role !== 'MASTER_ADMIN');
        if (usePersonalStats) {
          list = list.filter(u => candidateIds.includes(String(u.id || u.uid || '')));
        } else {
          if (norm.includes('active') && !norm.includes('inactive')) {
            list = list.filter(u => isMemberActive(u));
          } else if (norm.includes('inactive')) {
            list = list.filter(u => !isMemberActive(u));
          }
        }

        const mapped = list.map(m => {
          const isSubActive = isMemberActive(m);
          const memName = resolveMemberName(m.uid || m.id, m.name || m.full_name || m.displayName);
          const catName = m.category || m.business_category || m.businessName || m.company || 'Business Owner';
          const roleLabel = formatRole(m.role, m.position);
          const specificRole = ['Chapter Admin', 'President', 'Vice President', 'Treasurer'].includes(roleLabel) ? roleLabel : '';
          return {
            id: String(m.uid || m.id),
            title: memName,
            subtitle: specificRole ? `${catName} • ${specificRole}` : catName,
            icon: <User size={20} className="text-white/70" />,
            badgeText: isSubActive ? 'Active' : 'Inactive',
            badgeColor: isSubActive ? 'emerald' : 'red',
            date: m.createdAt ? formatDate(m.createdAt) : null,
            time: null,
            notes: `Business: ${m.businessName || m.company || '-'}`
          };
        });

        setAnalyticsModalRecords(mapped);
      } else if (norm.includes('chapter') && !norm.includes('meeting')) {
        const mapped = allChapters.map(c => ({
          id: String(c.id),
          title: c.chapterName || c.chapter_name || c.name || 'Chapter',
          subtitle: c.region || 'Region',
          icon: <Building2 size={20} className="text-white/70" />,
          badgeText: 'Active',
          badgeColor: 'blue' as const,
          date: null,
          time: c.meetingTime || null,
          notes: `Meeting Day: ${c.meetingDay || '-'}`
        }));
        setAnalyticsModalRecords(mapped);
      }
    } catch (e) {
      console.warn("Error fetching analytics data for category from Supabase:", e);
      throw e;
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
            There was an error while loading records from the database. Please try again.
          </p>
          <button 
            onClick={() => {
              setAnalyticsLoading(true);
              setAnalyticsError(false);
              fetchAnalyticsDataForCategory(analyticsModalCategory, activeDateRange).finally(() => setAnalyticsLoading(false));
            }}
            className="px-5 py-2.5 bg-[#1E293B] hover:bg-white/10 border border-white/5 text-white rounded-[10px] font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw size={14} /> Retry
          </button>
        </div>
      );
    }

    const records = analyticsModalRecords;

    if (!records || records.length === 0) {
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
        <div className={cn(
          "xl:col-span-12 rounded-[20px] p-[20px] md:p-[24px] lg:p-[28px] relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 lg:h-[330px] md:h-[300px] h-auto",
          theme === 'day'
            ? "bg-white border border-[#E2E8F0] shadow-sm"
            : "bg-gradient-to-b from-[#0B1220] to-[#111827] shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/5"
        )}>
          
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
                  Grow Your Business
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
              {showChapterScoreGauge && (
                <>
                  <span className="text-purple-400 font-bold">Members Analysed: <span className="text-white font-extrabold">{growthScoreData.membersAnalysed}</span></span>
                  <span className="text-neutral-500">•</span>
                </>
              )}
              <span className="text-emerald-400 font-bold">Completed: <span className="text-white font-extrabold">{growthScoreData.completed_tasks}</span></span>
              <span className="text-neutral-500">•</span>
              <span className="text-amber-400 font-bold">Total: <span className="text-white font-extrabold">{growthScoreData.total_tasks}</span></span>
              <span className="text-neutral-500">•</span>
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
               <span className="text-[7px] md:text-[8px] font-bold text-[#9CA3AF] uppercase tracking-widest mt-0.5">{showChapterScoreGauge ? 'GLOBAL SCORE' : 'MY GROWTH SCORE'}</span>
               <div className={cn("mt-1 px-2 py-0.5 rounded-full text-[8px] md:text-[9px] font-bold tracking-wider border", growthStatusColor)}>
                 {growthStatus}
               </div>
             </div>
             
             {/* Trend Indicators (Right Side Desktop Sync) - Hidden per user request */}
             {/* 
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
             */}
          </div>
        </div>

        {/* Right Block: Platinum Membership Card (Floating, Glow, Animated Fill) */}
        {false && (
          <motion.div 
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className={cn(
              "xl:col-span-4 rounded-[20px] p-[20px] md:p-[24px] lg:p-[28px] relative overflow-hidden flex flex-col justify-between lg:h-[330px] md:h-[300px] h-auto min-h-[220px]",
              theme === 'day'
                ? "bg-white border border-[#E2E8F0] shadow-sm"
                : "bg-gradient-to-b from-[#111827] to-[#0B1220] shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/5"
            )}
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

      {/* 0. Upcoming Meeting Card */}
      {profile?.role !== 'MASTER_ADMIN' && upcomingChapterMeeting && (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0, y: 15 },
            show: { opacity: 1, y: 0, transition: { duration: 0.5 } }
          }}
          className="w-full bg-[#111827] rounded-[20px] p-5 md:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.5)] border border-white/5 flex flex-col relative overflow-hidden mt-8"
        >
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-[17px] font-bold text-white tracking-tight flex items-center gap-2">
              <div className="w-8 h-8 rounded-[12px] bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/20">
                <Calendar size={16} />
              </div>
              Upcoming Meeting
            </h3>
            <span className="text-[11px] font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.15)]">
              Next
            </span>
          </div>

          <div className="relative z-10 w-full">
            <div className="bg-[#0B1220]/60 border border-white/5 rounded-[18px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col min-w-0">
                <h4 className="text-[15px] font-bold text-white truncate mb-1">
                  {upcomingChapterMeeting.title || (upcomingChapterMeeting as any).topic || `${resolvedChapterName || 'Chapter'} Meeting`}
                </h4>
                <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400 font-medium">
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <Calendar size={13} className="text-blue-400" />
                    <span>{parseMeetingDateParts(upcomingChapterMeeting.date, upcomingChapterMeeting.time || '07:30')?.displayDate || upcomingChapterMeeting.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <Clock size={13} className="text-emerald-400" />
                    <span>{upcomingChapterMeeting.time || '07:30 AM'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin size={13} className="text-amber-400 shrink-0" />
                    <span className="truncate">{upcomingChapterMeeting.location || upcomingChapterMeeting.venue || 'TBA'}</span>
                  </div>
                </div>
                {(() => {
                  const matchedPresentations = futurePresentations.filter(p => {
                    const st = String(p.status || 'Scheduled').toUpperCase();
                    if (st === 'CANCELLED') return false;
                    const pDate = p.presentationDate || p.presentation_date;
                    if (!isSameMeetingDate(pDate, upcomingChapterMeeting.date)) return false;
                    const mChap = upcomingChapterMeeting.chapter_id || (upcomingChapterMeeting as any).chapterId;
                    const mId = p.memberId || p.member_id;
                    const memberObj = allUsersList.find(u => String(u.uid || u.id) === String(mId));
                    const pChap = p.chapter_id || p.chapterId || memberObj?.chapter_id || memberObj?.chapterId;
                    if (mChap && pChap && String(mChap) !== String(pChap)) return false;
                    return true;
                  });

                  if (matchedPresentations.length === 0) return null;

                  return (
                    <div className="flex flex-wrap items-center gap-2 mt-2.5">
                      {matchedPresentations.map((p) => {
                        const mId = p.memberId || p.member_id;
                        const matchedMember =
                          allUsersList.find(u => String(u.uid || u.id) === String(mId) || String(u.id) === String(mId) || String(u.uid) === String(mId)) ||
                          chapterUsers.find(u => String(u.uid || u.id) === String(mId) || String(u.id) === String(mId) || String(u.uid) === String(mId)) ||
                          (profile && (String(profile.uid || profile.id) === String(mId) || String(profile.id) === String(mId) || String(profile.uid) === String(mId)) ? profile : null);
                        const memberName = p.memberName || p.member_name || (matchedMember ? getCleanFullName(matchedMember.name) : 'Member');
                        const memberCategory =
                          matchedMember?.category ||
                          (matchedMember as any)?.business_category ||
                          (matchedMember as any)?.businessCategory ||
                          p.memberCategory ||
                          p.member_category ||
                          p.category ||
                          'N/A';

                        return (
                          <div
                            key={p.id}
                            className="inline-flex flex-col items-start gap-0.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-bold text-white"
                          >
                            <span className="text-red-400 font-extrabold">Feature Presentation by {memberName}</span>
                            <span className="text-neutral-300 font-bold">Category: {memberCategory}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {profile?.role !== 'MASTER_ADMIN' && !upcomingChapterMeeting && (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0, y: 15 },
            show: { opacity: 1, y: 0, transition: { duration: 0.5 } }
          }}
          className="w-full bg-[#111827] rounded-[20px] p-5 md:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.5)] border border-white/5 flex flex-col relative overflow-hidden mt-8"
        >
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-[17px] font-bold text-white tracking-tight flex items-center gap-2">
              <div className="w-8 h-8 rounded-[12px] bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/20">
                <Calendar size={16} />
              </div>
              Upcoming Meeting
            </h3>
          </div>
          <div className="relative z-10 w-full">
            <div className="bg-[#0B1220]/60 border border-white/5 rounded-[18px] p-6 flex flex-col items-center justify-center text-center">
              <Calendar size={24} className="text-neutral-600 mb-3" />
              <p className="text-[13px] text-neutral-400 font-medium">No upcoming meetings</p>
            </div>
          </div>
        </motion.div>
      )}

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
            onCardClick={async (label) => {
              setAnalyticsModalCategory(label);
              setAnalyticsLoading(true);
              setAnalyticsError(false);
              setAnalyticsModalRecords([]);
              try {
                await fetchAnalyticsDataForCategory(label, activeDateRange);
              } catch (e) {
                console.error("Error loading analytics records:", e);
                setAnalyticsError(true);
              } finally {
                setAnalyticsLoading(false);
              }
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
          nextMeeting={upcomingChapterMeeting}
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
                  {availableMembersForFilter.map((u) => {
                    const cat = u.category || (u as any).business_category || 'No Category';
                    return (
                      <option key={u.uid || u.id} value={u.uid || u.id}>
                        {u.name || 'Unnamed Member'} — Category: {cat} {u.chapterName ? `(${u.chapterName})` : ''}
                      </option>
                    );
                  })}
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
                      <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">{getCleanModalTitle(analyticsModalCategory)}</h2>
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
              <div className={cn(
                "flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8",
                theme === 'day' ? "bg-white" : "bg-gradient-to-b from-[#0B1220] to-[#111827]"
              )}>
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
