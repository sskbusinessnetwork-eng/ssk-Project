import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import { databaseService } from '../services/databaseService';
import {
  UserProfile,
  Meeting,
  Referral,
  GuestInvitation,
  Chapter,
  isNormalReferral
} from '../types';
import { getISTDayBounds, calculateMemberGrowthScoreData } from '../utils/growthScore';
import { getISTNow, isSameMeetingDate, isMeetingCancelled } from '../utils/recurringMeetingUtils';
import { isMemberActive } from '../utils/memberStatus';
import { deduplicateSlips } from '../utils/deduplicateSlips';
import { getCleanFullName } from '../utils/authUtils';
import { safeFormat as format, parseSafeDate } from '../utils/dateUtils';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from 'date-fns';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Users,
  Share2,
  Handshake,
  UserPlus,
  AlertCircle,
  RefreshCw,
  Trophy,
  Globe,
  Filter,
  ChevronDown,
  BarChart3,
  TrendingUp,
  Star
} from 'lucide-react';
import { cn } from '../lib/utils';

type MeetingDateFilterType = 'last_week' | 'this_month' | 'last_month' | 'custom';
type PeriodDateFilterType = 'this_month' | 'last_month' | 'last_3_months' | 'custom';
type WeeklyChapterFilterType = 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';

interface ComputedDateRange {
  start: Date | null;
  end: Date | null;
  label: string;
  monthsCount: number;
  isInvalid: boolean;
  errorMessage: string | null;
}

function calculateCalendarMonthsCovered(startYMD: string, endYMD: string): number {
  const startParts = startYMD.split('-').map(Number);
  const endParts = endYMD.split('-').map(Number);
  if (startParts.length < 2 || endParts.length < 2) return 1;
  const [startYear, startMonth] = startParts;
  const [endYear, endMonth] = endParts;
  if (isNaN(startYear) || isNaN(startMonth) || isNaN(endYear) || isNaN(endMonth)) return 1;
  const diff = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
  return Math.max(1, diff);
}

function computeDateRangeForFilter(
  filter: MeetingDateFilterType | PeriodDateFilterType | WeeklyChapterFilterType,
  customStart: string,
  customEnd: string
): ComputedDateRange {
  const istNow = getISTNow();
  const todayLocal = new Date(istNow.year, istNow.month - 1, istNow.day, 12, 0, 0);

  if (filter === 'this_week') {
    const startLocal = startOfWeek(todayLocal, { weekStartsOn: 0 });
    const endLocal = endOfWeek(todayLocal, { weekStartsOn: 0 });
    const startYMD = format(startLocal, 'yyyy-MM-dd');
    const endYMD = format(endLocal, 'yyyy-MM-dd');
    return {
      start: getISTDayBounds(startYMD).start,
      end: getISTDayBounds(endYMD).end,
      label: `${format(startLocal, 'dd MMM yyyy')} – ${format(endLocal, 'dd MMM yyyy')}`,
      monthsCount: 1,
      isInvalid: false,
      errorMessage: null
    };
  }

  if (filter === 'last_week') {
    const prevWeek = subWeeks(todayLocal, 1);
    const startLocal = startOfWeek(prevWeek, { weekStartsOn: 0 });
    const endLocal = endOfWeek(prevWeek, { weekStartsOn: 0 });
    const startYMD = format(startLocal, 'yyyy-MM-dd');
    const endYMD = format(endLocal, 'yyyy-MM-dd');
    return {
      start: getISTDayBounds(startYMD).start,
      end: getISTDayBounds(endYMD).end,
      label: `${format(startLocal, 'dd MMM yyyy')} – ${format(endLocal, 'dd MMM yyyy')}`,
      monthsCount: 1,
      isInvalid: false,
      errorMessage: null
    };
  }

  if (filter === 'this_month') {
    const startLocal = startOfMonth(todayLocal);
    const endLocal = endOfMonth(todayLocal);
    const startYMD = format(startLocal, 'yyyy-MM-dd');
    const endYMD = format(endLocal, 'yyyy-MM-dd');
    return {
      start: getISTDayBounds(startYMD).start,
      end: getISTDayBounds(endYMD).end,
      label: `${format(startLocal, 'MMMM d, yyyy')} → ${format(endLocal, 'MMMM d, yyyy')}`,
      monthsCount: 1,
      isInvalid: false,
      errorMessage: null
    };
  }

  if (filter === 'last_month') {
    const prevMonth = subMonths(todayLocal, 1);
    const startLocal = startOfMonth(prevMonth);
    const endLocal = endOfMonth(prevMonth);
    const startYMD = format(startLocal, 'yyyy-MM-dd');
    const endYMD = format(endLocal, 'yyyy-MM-dd');
    return {
      start: getISTDayBounds(startYMD).start,
      end: getISTDayBounds(endYMD).end,
      label: `${format(startLocal, 'MMMM d, yyyy')} → ${format(endLocal, 'MMMM d, yyyy')}`,
      monthsCount: 1,
      isInvalid: false,
      errorMessage: null
    };
  }

  if (filter === 'last_3_months') {
    // Previous 3 complete calendar months (do NOT include the incomplete current month)
    // Example: If current month is September 2026 -> June 1, 2026 to August 31, 2026
    const firstMonth = subMonths(todayLocal, 3);
    const lastCompleteMonth = subMonths(todayLocal, 1);
    const startLocal = startOfMonth(firstMonth);
    const endLocal = endOfMonth(lastCompleteMonth);
    const startYMD = format(startLocal, 'yyyy-MM-dd');
    const endYMD = format(endLocal, 'yyyy-MM-dd');
    return {
      start: getISTDayBounds(startYMD).start,
      end: getISTDayBounds(endYMD).end,
      label: `${format(startLocal, 'MMMM d, yyyy')} → ${format(endLocal, 'MMMM d, yyyy')}`,
      monthsCount: 3,
      isInvalid: false,
      errorMessage: null
    };
  }

  // Custom Date Range
  if (!customStart || !customEnd) {
    return {
      start: null,
      end: null,
      label: 'Select Start Date and End Date',
      monthsCount: 1,
      isInvalid: true,
      errorMessage: 'Please select both Start Date and End Date.'
    };
  }

  if (customStart > customEnd) {
    return {
      start: null,
      end: null,
      label: 'Invalid Date Range',
      monthsCount: 1,
      isInvalid: true,
      errorMessage: 'Start Date cannot be after End Date. Please select a valid date range.'
    };
  }

  const startBounds = getISTDayBounds(customStart);
  const endBounds = getISTDayBounds(customEnd);
  const monthsCovered = calculateCalendarMonthsCovered(customStart, customEnd);

  return {
    start: startBounds.start,
    end: endBounds.end,
    label: `${format(startBounds.start, 'dd MMM yyyy')} – ${format(endBounds.end, 'dd MMM yyyy')}`,
    monthsCount: monthsCovered,
    isInvalid: false,
    errorMessage: null
  };
}

function formatAverageMetric(val: number): string {
  if (!Number.isFinite(val) || val <= 0) return '0';
  const rounded = Math.round(val * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(1).replace(/\.0$/, '');
}

function formatAverageCurrency(val: number): string {
  if (!Number.isFinite(val) || val <= 0) return '₹0';
  const rounded = Math.round(val);
  return `₹${rounded.toLocaleString('en-IN')}`;
}

export function Reports() {
  const { profile } = useAuth();

  // Loading & Error States
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Supabase Data States
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [thankYouSlips, setThankYouSlips] = useState<any[]>([]);
  const [guestInvitations, setGuestInvitations] = useState<GuestInvitation[]>([]);
  const [oneToOnes, setOneToOnes] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);

  // ====================================================
  // 1. MEETING SUMMARY REPORT FILTER STATE (Default: "Last Week")
  // ====================================================
  const [meetingDateFilter, setMeetingDateFilter] = useState<MeetingDateFilterType>('last_week');
  const [meetingCustomStart, setMeetingCustomStart] = useState<string>('');
  const [meetingCustomEnd, setMeetingCustomEnd] = useState<string>('');
  const [meetingFilterOpen, setMeetingFilterOpen] = useState<boolean>(false);
  const meetingFilterRef = useRef<HTMLDivElement>(null);

  // ====================================================
  // 2. LAST MONTH CONTRIBUTORS FILTER STATE (Default: "Last Month")
  // ====================================================
  const [contributorsDateFilter, setContributorsDateFilter] =
    useState<PeriodDateFilterType>('last_month');
  const [contributorsCustomStart, setContributorsCustomStart] = useState<string>('');
  const [contributorsCustomEnd, setContributorsCustomEnd] = useState<string>('');
  const [selectedAssociateId, setSelectedAssociateId] = useState<string>('ALL');
  const [contributorsFilterOpen, setContributorsFilterOpen] = useState<boolean>(false);
  const contributorsFilterRef = useRef<HTMLDivElement>(null);

  // ====================================================
  // 3. ENTIRE BUSINESS PERFORMANCE FILTER STATE (Default: "Last 3 Months")
  // ====================================================
  const [entireBizDateFilter, setEntireBizDateFilter] =
    useState<PeriodDateFilterType>('last_3_months');
  const [entireBizCustomStart, setEntireBizCustomStart] = useState<string>('');
  const [entireBizCustomEnd, setEntireBizCustomEnd] = useState<string>('');
  const [entireBizDropdownOpen, setEntireBizDropdownOpen] = useState<boolean>(false);
  const entireBizFilterRef = useRef<HTMLDivElement>(null);

  // ====================================================
  // 4. WEEKLY PERFORMANCE OF CHAPTER FILTER STATE (Default: "This Week")
  // ====================================================
  const [weeklyChapterFilter, setWeeklyChapterFilter] = useState<WeeklyChapterFilterType>('this_week');
  const [weeklyChapterCustomStart, setWeeklyChapterCustomStart] = useState<string>('');
  const [weeklyChapterCustomEnd, setWeeklyChapterCustomEnd] = useState<string>('');
  const [weeklyChapterFilterOpen, setWeeklyChapterFilterOpen] = useState<boolean>(false);
  const weeklyChapterFilterRef = useRef<HTMLDivElement>(null);

  // ====================================================
  // 5. TOP PERFORMANCE OF THE WEEK SELECTED CARD STATE
  // ====================================================
  const [selectedTopPerformerId, setSelectedTopPerformerId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (meetingFilterRef.current && !meetingFilterRef.current.contains(target)) {
        setMeetingFilterOpen(false);
      }
      if (contributorsFilterRef.current && !contributorsFilterRef.current.contains(target)) {
        setContributorsFilterOpen(false);
      }
      if (entireBizFilterRef.current && !entireBizFilterRef.current.contains(target)) {
        setEntireBizDropdownOpen(false);
      }
      if (weeklyChapterFilterRef.current && !weeklyChapterFilterRef.current.contains(target)) {
        setWeeklyChapterFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize default custom date ranges based on IST
  useEffect(() => {
    const istNow = getISTNow();
    const todayLocal = new Date(istNow.year, istNow.month - 1, istNow.day, 12, 0, 0);

    // Section 1 default custom range: Last Week
    const prevWeek = subWeeks(todayLocal, 1);
    const wStart = startOfWeek(prevWeek, { weekStartsOn: 0 });
    const wEnd = endOfWeek(prevWeek, { weekStartsOn: 0 });
    setMeetingCustomStart(format(wStart, 'yyyy-MM-dd'));
    setMeetingCustomEnd(format(wEnd, 'yyyy-MM-dd'));

    // Weekly chapter performance default custom range: Last Week
    setWeeklyChapterCustomStart(format(wStart, 'yyyy-MM-dd'));
    setWeeklyChapterCustomEnd(format(wEnd, 'yyyy-MM-dd'));

    // Section 2 default custom range: Last Month
    const prevMonth = subMonths(todayLocal, 1);
    const mStart = startOfMonth(prevMonth);
    const mEnd = endOfMonth(prevMonth);
    setContributorsCustomStart(format(mStart, 'yyyy-MM-dd'));
    setContributorsCustomEnd(format(mEnd, 'yyyy-MM-dd'));

    // Section 3 default custom range: Last 3 Complete Months
    const threeMonthsAgo = subMonths(todayLocal, 3);
    const m3Start = startOfMonth(threeMonthsAgo);
    const m3End = endOfMonth(prevMonth);
    setEntireBizCustomStart(format(m3Start, 'yyyy-MM-dd'));
    setEntireBizCustomEnd(format(m3End, 'yyyy-MM-dd'));
  }, []);

  // Load real existing data from Supabase across all chapters
  const fetchReportData = useCallback(async () => {
    if (!profile) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [
        usersRes,
        chaptersRes,
        meetingsRes,
        referralsRes,
        slipsRes,
        guestsRes,
        oneToOnesRes,
        testimonialsRes
      ] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('chapters').select('*'),
        supabase.from('meetings').select('*'),
        supabase.from('referrals').select('*'),
        supabase.from('thank_you_slips').select('*'),
        supabase.from('guest_invitations').select('*'),
        supabase.from('one_to_one_meetings').select('*'),
        supabase.from('testimonials').select('*')
      ]);

      const queryError =
        usersRes.error ||
        chaptersRes.error ||
        meetingsRes.error ||
        referralsRes.error ||
        slipsRes.error ||
        guestsRes.error ||
        oneToOnesRes.error ||
        testimonialsRes.error;

      if (queryError) {
        console.warn('Supabase query notice in Reports, falling back where needed:', queryError);
      }

      // 1. Users (unpacking any serialized profile_photo metadata)
      let loadedUsers: UserProfile[] = [];
      if (usersRes.data && usersRes.data.length > 0) {
        loadedUsers = usersRes.data.map((u: any) => {
          let photo = u.photoURL || u.photo_url || u.profile_photo || '';
          let extraData: any = {};
          if (typeof photo === 'string') {
            const trimmedPhoto = photo.trim();
            if (trimmedPhoto.includes('|||')) {
              const parts = trimmedPhoto.split('|||');
              photo = parts[0];
              try {
                extraData = JSON.parse(parts[1] || '{}');
              } catch {}
            } else if (trimmedPhoto.startsWith('{')) {
              try {
                const parsed = JSON.parse(trimmedPhoto);
                photo = parsed.url || parsed.photoURL || parsed.profile_photo || '';
                extraData = parsed.extra && typeof parsed.extra === 'object' ? parsed.extra : parsed;
              } catch {}
            }
          }
          return {
            ...u,
            ...extraData,
            uid: String(u.uid || u.id || ''),
            id: String(u.id || u.uid || ''),
            name: u.name || u.full_name || u.displayName || 'Member',
            role: u.role || 'MEMBER',
            position: u.position || u.chapter_position || '',
            chapter_id: u.chapter_id || u.chapterId || '',
            adminId: u.admin_id || u.adminId || '',
            photoURL: photo,
            profile_photo: photo,
            businessName:
              u.businessName ||
              u.business_name ||
              extraData.businessName ||
              extraData.business_name ||
              '',
            category:
              u.category ||
              u.business_category ||
              extraData.category ||
              extraData.business_category ||
              '',
            professionDesignation:
              u.professionDesignation ||
              u.profession_designation ||
              extraData.professionDesignation ||
              extraData.profession_designation ||
              '',
            bio: u.bio || extraData.bio || '',
            address: u.address || extraData.address || '',
            city: u.city || extraData.city || '',
            state: u.state || extraData.state || '',
            pincode: u.pincode || extraData.pincode || '',
            membershipStatus: u.membership_status || u.membershipStatus || u.status || 'ACTIVE',
            status: u.status || u.membership_status || u.membershipStatus || 'ACTIVE'
          };
        });
      } else {
        loadedUsers = await databaseService.list<UserProfile>('users');
      }
      setUsers(loadedUsers || []);

      // 2. Chapters
      let loadedChapters: Chapter[] = [];
      if (chaptersRes.data && chaptersRes.data.length > 0) {
        loadedChapters = chaptersRes.data.map((c: any) => ({
          ...c,
          id: String(c.id),
          name: c.name || c.chapter_name || c.chapterName || ''
        })) as Chapter[];
      } else {
        loadedChapters = await databaseService.list<Chapter>('chapters');
      }
      setChapters(loadedChapters || []);

      // 3. Meetings
      let loadedMeetings: Meeting[] = [];
      if (meetingsRes.data && meetingsRes.data.length > 0) {
        loadedMeetings = meetingsRes.data.map((m: any) => ({
          ...m,
          id: String(m.id),
          date: m.date || m.meeting_date || m.created_at || m.createdAt || '',
          isCompleted:
            m.is_completed ??
            m.isCompleted ??
            String(m.status || '').toUpperCase() === 'COMPLETED',
          isCancelled:
            m.is_cancelled ??
            m.isCancelled ??
            String(m.status || '').toUpperCase() === 'CANCELLED',
          chapter_id: m.chapter_id ?? m.chapterId ?? '',
          adminId: m.admin_id ?? m.adminId ?? '',
          attendance: m.attendance || {}
        }));
      } else {
        loadedMeetings = await databaseService.list<Meeting>('meetings');
      }
      setMeetings(loadedMeetings || []);

      // 4. Referrals
      let loadedReferrals: Referral[] = [];
      if (referralsRes.data && referralsRes.data.length > 0) {
        loadedReferrals = referralsRes.data.map((r: any) => ({
          ...r,
          id: String(r.id),
          fromUserId: String(r.from_user_id || r.fromUserId || r.sender_id || ''),
          toUserId: String(r.to_user_id || r.toUserId || r.receiver_id || ''),
          createdAt: r.created_at || r.createdAt || r.date || ''
        }));
      } else {
        loadedReferrals = await databaseService.list<Referral>('referrals');
      }
      setReferrals(loadedReferrals || []);

      // 5. Thank You Slips (Business Given)
      let loadedSlips: any[] = [];
      if (slipsRes.data && slipsRes.data.length > 0) {
        loadedSlips = slipsRes.data.map((s: any) => ({
          ...s,
          id: String(s.id),
          referralId: String(s.referral_id || s.referralId || ''),
          fromUserId: String(
            s.from_user_id || s.fromUserId || s.submitted_by || s.sender_id || ''
          ),
          toUserId: String(s.to_user_id || s.toUserId || s.receiver_id || ''),
          businessValue: Number(
            s.business_value ?? s.businessValue ?? s.amount ?? s.transactionValue ?? 0
          ),
          createdAt: s.created_at || s.createdAt || s.date || ''
        }));
      } else {
        loadedSlips = await databaseService.list<any>('thank_you_slips');
      }
      setThankYouSlips(deduplicateSlips(loadedSlips || []));

      // 6. Guest Invitations (Visitors)
      let loadedGuests: GuestInvitation[] = [];
      if (guestsRes.data && guestsRes.data.length > 0) {
        loadedGuests = guestsRes.data as GuestInvitation[];
      } else {
        loadedGuests = await databaseService.list<GuestInvitation>('guest_invitations');
      }
      setGuestInvitations(loadedGuests || []);

      // 7. One-to-One Meetings
      let loadedOneToOnes: any[] = [];
      if (oneToOnesRes.data && oneToOnesRes.data.length > 0) {
        loadedOneToOnes = oneToOnesRes.data.map((m: any) => {
          let parsedAtt = m.attendance || {};
          if (typeof parsedAtt === 'string') {
            try {
              parsedAtt = JSON.parse(parsedAtt);
            } catch {
              parsedAtt = {};
            }
          }
          const senderId = String(m.sender_id || m.organizer_id || m.creator_id || m.creatorId || '').trim();
          const receiverId = String(
            m.receiver_id ||
              m.member_id ||
              (Array.isArray(m.participant_ids) && m.participant_ids[0]) ||
              (Array.isArray(m.participantIds) && m.participantIds[0]) ||
              ''
          ).trim();
          return {
            ...m,
            id: String(m.id),
            organizer_id: senderId,
            creatorId: senderId,
            creator_id: senderId,
            sender_id: senderId,
            member_id: receiverId,
            receiver_id: receiverId,
            participantIds: [receiverId].filter(Boolean),
            chapter_id: m.chapter_id || m.chapterId || '',
            date: m.scheduled_date || m.date || m.meeting_date || m.created_at || m.createdAt || '',
            scheduled_date: m.scheduled_date || m.date || '',
            createdAt: m.created_at || m.createdAt || '',
            attendance: parsedAtt
          };
        });
      } else {
        loadedOneToOnes = await databaseService.list<any>('one_to_one_meetings');
      }
      setOneToOnes(loadedOneToOnes || []);

      // 8. Testimonials
      let loadedTestimonials: any[] = [];
      if (testimonialsRes.data && testimonialsRes.data.length > 0) {
        loadedTestimonials = testimonialsRes.data.map((t: any) => ({
          ...t,
          id: String(t.id),
          authorMemberId: String(
            t.authorMemberId || t.author_id || t.fromUserId || t.from_user_id || t.sender_id || ''
          ),
          receiverMemberId: String(
            t.receiverMemberId || t.receiver_id || t.toUserId || t.to_user_id || ''
          ),
          createdAt: t.created_at || t.createdAt || t.date || ''
        }));
      } else {
        loadedTestimonials = await databaseService.list<any>('testimonials');
      }
      setTestimonials(loadedTestimonials || []);
    } catch (err: any) {
      console.error('Error loading report data:', err);
      setError(err?.message || 'Failed to load report data from Supabase.');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Real-time subscriptions so report stays synchronized with live database changes
  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel('reports-live-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, () =>
        fetchReportData()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referrals' }, () =>
        fetchReportData()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'thank_you_slips' }, () =>
        fetchReportData()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guest_invitations' }, () =>
        fetchReportData()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () =>
        fetchReportData()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chapters' }, () =>
        fetchReportData()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'one_to_one_meetings' }, () =>
        fetchReportData()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'testimonials' }, () =>
        fetchReportData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, fetchReportData]);

  // Map all users by ID / UID for O(1) lookup
  const usersByIdMap = useMemo(() => {
    const map = new Map<string, UserProfile>();
    users.forEach(u => {
      if (u.id) map.set(String(u.id).trim(), u);
      if (u.uid) map.set(String(u.uid).trim(), u);
    });
    return map;
  }, [users]);

  const chaptersByIdMap = useMemo(() => {
    const map = new Map<string, Chapter>();
    chapters.forEach(c => {
      if (c && c.id) map.set(String(c.id).trim(), c);
    });
    return map;
  }, [chapters]);

  // Helper: Resolve which chapter ID any user/member belongs to using existing relationships
  const resolveUserChapterId = useCallback(
    (u?: UserProfile | null): string => {
      if (!u) return '';
      const directChap = String(u.chapter_id || (u as any).chapterId || '').trim();
      if (directChap) {
        if (chaptersByIdMap.has(directChap)) return directChap;
        // Check if directChap is actually a chapter_admin_id on a chapter
        const byAdminId = chapters.find(
          c => String(c.chapter_admin_id || '').trim() === directChap
        );
        if (byAdminId) return String(byAdminId.id).trim();
        return directChap;
      }

      const uid = String(u.uid || u.id || '').trim();
      if (uid) {
        const ledChapter = chapters.find(
          c =>
            String(c.chapter_admin_id || '').trim() === uid ||
            String(c.president_id || '').trim() === uid ||
            String(c.vice_president_id || '').trim() === uid ||
            String(c.treasurer_id || '').trim() === uid
        );
        if (ledChapter) return String(ledChapter.id).trim();
      }

      const adminId = String(u.adminId || (u as any).admin_id || '').trim();
      if (adminId) {
        if (chaptersByIdMap.has(adminId)) return adminId;
        const chapByAdmin = chapters.find(
          c => String(c.chapter_admin_id || '').trim() === adminId
        );
        if (chapByAdmin) return String(chapByAdmin.id).trim();
        const adminUser = usersByIdMap.get(adminId);
        if (adminUser) {
          const adminUserChap = String(
            adminUser.chapter_id || (adminUser as any).chapterId || ''
          ).trim();
          if (adminUserChap) return adminUserChap;
        }
      }

      const rawChapName = String((u as any).chapterName || (u as any).chapter_name || '')
        .trim()
        .toLowerCase();
      if (rawChapName) {
        const chapByName = chapters.find(c => {
          const cName = String(c.name || (c as any).chapter_name || (c as any).chapterName || '')
            .trim()
            .toLowerCase();
          return cName && cName === rawChapName;
        });
        if (chapByName) return String(chapByName.id).trim();
      }

      return '';
    },
    [chapters, chaptersByIdMap, usersByIdMap]
  );

  // Detect the LOGGED-IN USER'S CHAPTER from authentication/profile/member/chapter relationship
  const loggedInChapterId = useMemo(() => {
    if (!profile) return '';
    const uid = String(profile.uid || profile.id || '').trim();
    const freshUser = uid ? usersByIdMap.get(uid) : undefined;

    // 1. Resolve from fresh DB user or auth profile
    const fromProfile = resolveUserChapterId(profile);
    if (fromProfile) return fromProfile;

    if (freshUser) {
      const fromFreshUser = resolveUserChapterId(freshUser);
      if (fromFreshUser) return fromFreshUser;
    }

    // 2. If user is matched by email or phone in users table
    const profEmail = String(profile.email || '').trim().toLowerCase();
    const profPhone = String(profile.phone || (profile as any).mobile || '').trim();
    if (profEmail || profPhone) {
      const matchedUser = users.find(u => {
        const uEmail = String(u.email || '').trim().toLowerCase();
        const uPhone = String(u.phone || (u as any).mobile || '').trim();
        return (profEmail && uEmail === profEmail) || (profPhone && uPhone === profPhone);
      });
      if (matchedUser) {
        const resolved = resolveUserChapterId(matchedUser);
        if (resolved) return resolved;
      }
    }

    // 3. Fallback if Master Admin is logged in (has no personal chapter_id) and chapters exist
    if (profile.role === 'MASTER_ADMIN' && chapters.length > 0) {
      return String(chapters[0].id).trim();
    }

    return '';
  }, [profile, usersByIdMap, users, chapters, resolveUserChapterId]);

  const loggedInChapterObj = useMemo(() => {
    if (!loggedInChapterId) return undefined;
    return chaptersByIdMap.get(loggedInChapterId);
  }, [loggedInChapterId, chaptersByIdMap]);

  // Check if a member belongs to the LOGGED-IN USER'S CHAPTER (Strictly for Sections 1 & 2)
  const isMemberInLoggedInChapter = useCallback(
    (u: UserProfile): boolean => {
      if (!u || !loggedInChapterId) return false;
      if (u.role === 'MASTER_ADMIN') return false;
      const rawStatus = String((u as any).status || u.membershipStatus || '')
        .trim()
        .toUpperCase();
      if (rawStatus === 'DELETED' || (u as any).is_deleted === true) return false;

      const memberChapterId = resolveUserChapterId(u);
      return memberChapterId !== '' && memberChapterId === loggedInChapterId;
    },
    [loggedInChapterId, resolveUserChapterId]
  );

  // Scoped members & active associates for LOGGED-IN CHAPTER ONLY (Sections 1 & 2)
  const scopedChapterMembers = useMemo(() => {
    return users.filter(isMemberInLoggedInChapter);
  }, [users, isMemberInLoggedInChapter]);

  const activeChapterAssociates = useMemo(() => {
    return scopedChapterMembers
      .filter(u => isMemberActive(u))
      .sort((a, b) => {
        const nameA = getCleanFullName(a.name || (a as any).full_name || '');
        const nameB = getCleanFullName(b.name || (b as any).full_name || '');
        return nameA.localeCompare(nameB);
      });
  }, [scopedChapterMembers]);

  const scopedChapterMemberIdsSet = useMemo(() => {
    const set = new Set<string>();
    scopedChapterMembers.forEach(u => {
      if (u.id) set.add(String(u.id).trim());
      if (u.uid) set.add(String(u.uid).trim());
    });
    return set;
  }, [scopedChapterMembers]);

  // Reset selectedAssociateId to 'ALL' if the logged-in chapter changes and selected member isn't in it
  useEffect(() => {
    if (
      selectedAssociateId !== 'ALL' &&
      !scopedChapterMemberIdsSet.has(String(selectedAssociateId).trim())
    ) {
      setSelectedAssociateId('ALL');
    }
  }, [selectedAssociateId, scopedChapterMemberIdsSet]);

  const resolveMemberName = useCallback(
    (id?: string | null, fallback?: string): string => {
      if (!id) return fallback ? getCleanFullName(fallback) : 'Member';
      const u = usersByIdMap.get(String(id).trim());
      if (u) {
        return getCleanFullName(
          u.name || (u as any).full_name || (u as any).displayName || fallback || 'Member'
        );
      }
      return fallback ? getCleanFullName(fallback) : 'Member';
    },
    [usersByIdMap]
  );

  // Helper: Resolve which chapter ID a meeting belongs to
  const resolveMeetingChapterId = useCallback(
    (m: Meeting): string => {
      if (!m) return '';
      const mChap = String(m.chapter_id || (m as any).chapterId || '').trim();
      if (mChap) {
        if (chaptersByIdMap.has(mChap)) return mChap;
        const byAdmin = chapters.find(c => String(c.chapter_admin_id || '').trim() === mChap);
        if (byAdmin) return String(byAdmin.id).trim();
        return mChap;
      }

      const mAdmin = String(m.adminId || (m as any).admin_id || '').trim();
      if (mAdmin) {
        if (chaptersByIdMap.has(mAdmin)) return mAdmin;
        const byAdmin = chapters.find(c => String(c.chapter_admin_id || '').trim() === mAdmin);
        if (byAdmin) return String(byAdmin.id).trim();
        const adminUser = usersByIdMap.get(mAdmin);
        if (adminUser) {
          const resolved = resolveUserChapterId(adminUser);
          if (resolved) return resolved;
        }
      }

      return '';
    },
    [chapters, chaptersByIdMap, usersByIdMap, resolveUserChapterId]
  );

  // Shared helper to check if a visitor was confirmed PRESENT in a meeting
  const isVisitorConfirmedPresent = useCallback((g: any, meeting?: Meeting): boolean => {
    if (!g) return false;
    if (meeting && isMeetingCancelled(meeting)) return false;

    const PRESENT_STATUSES = new Set(['PRESENT', 'YES', 'ATTENDED']);
    const NON_PRESENT_STATUSES = new Set([
      'ABSENT',
      'NO',
      'NOT ATTENDED',
      'NOT_ATTENDED',
      'PENDING',
      'INVITED',
      'UPCOMING',
      'CANCELLED',
      'CANCELED',
      'INVALID'
    ]);

    const gId = String(g.id || g.uid || '').trim();

    if (meeting) {
      const meetingGuestRawStatus =
        (gId && meeting.attendance && meeting.attendance[gId]) ??
        (gId && (meeting as any).guest_attendance && (meeting as any).guest_attendance[gId]) ??
        (gId && (meeting as any).guestAttendance && (meeting as any).guestAttendance[gId]) ??
        (gId &&
          (meeting.memberNotes as any)?.__guestAttendance &&
          (meeting.memberNotes as any).__guestAttendance[gId]) ??
        (gId &&
          (meeting as any).member_notes?.__guestAttendance &&
          (meeting as any).member_notes.__guestAttendance[gId]);

      if (
        meetingGuestRawStatus !== undefined &&
        meetingGuestRawStatus !== null &&
        String(meetingGuestRawStatus).trim() !== ''
      ) {
        const normalizedMeetingStatus = String(meetingGuestRawStatus).trim().toUpperCase();
        if (NON_PRESENT_STATUSES.has(normalizedMeetingStatus)) return false;
        if (PRESENT_STATUSES.has(normalizedMeetingStatus)) return true;
      }
    }

    const rawAttendanceStatus = String(g.attendance_status ?? g.attendanceStatus ?? '')
      .trim()
      .toUpperCase();
    if (rawAttendanceStatus) {
      if (NON_PRESENT_STATUSES.has(rawAttendanceStatus)) return false;
      return PRESENT_STATUSES.has(rawAttendanceStatus);
    }

    const rawRecordStatus = String(g.status ?? '').trim().toUpperCase();
    if (rawRecordStatus) {
      if (NON_PRESENT_STATUSES.has(rawRecordStatus)) return false;
      return PRESENT_STATUSES.has(rawRecordStatus);
    }

    return false;
  }, []);

  // ====================================================
  // 1. MEETING SUMMARY REPORT — LOGGED-IN CHAPTER ONLY
  // ====================================================
  const meetingDateRangeInfo = useMemo(
    () => computeDateRangeForFilter(meetingDateFilter, meetingCustomStart, meetingCustomEnd),
    [meetingDateFilter, meetingCustomStart, meetingCustomEnd]
  );

  const meetingSummaryStats = useMemo(() => {
    if (
      !loggedInChapterId ||
      meetingDateRangeInfo.isInvalid ||
      !meetingDateRangeInfo.start ||
      !meetingDateRangeInfo.end
    ) {
      return {
        presentCount: 0,
        absentCount: 0,
        totalMeetings: 0,
        guestCount: 0
      };
    }

    const rangeStartMs = meetingDateRangeInfo.start.getTime();
    const rangeEndMs = meetingDateRangeInfo.end.getTime();

    const isDateInSummaryRange = (val: any): boolean => {
      if (!val) return false;
      const parsed = parseSafeDate(val);
      if (!parsed) return false;
      const ms = parsed.getTime();
      return ms >= rangeStartMs && ms <= rangeEndMs;
    };

    // Filter meetings strictly to LOGGED-IN USER'S CHAPTER + SELECTED DATE RANGE
    const filteredMeetings = meetings.filter(m => {
      if (isMeetingCancelled(m)) return false;

      const meetingChapId = resolveMeetingChapterId(m);
      if (!meetingChapId || meetingChapId !== loggedInChapterId) {
        return false;
      }

      const rawDateVal = m.date || (m as any).meeting_date || m.createdAt || (m as any).created_at;
      if (!rawDateVal) return false;

      const parsedDate = parseSafeDate(rawDateVal);
      if (!parsedDate) return false;

      const dMs = parsedDate.getTime();
      return dMs >= rangeStartMs && dMs <= rangeEndMs;
    });

    let presentCount = 0;
    let absentCount = 0;

    filteredMeetings.forEach(m => {
      if (m.attendance && typeof m.attendance === 'object') {
        Object.entries(m.attendance).forEach(([memberId, rawStatus]) => {
          if (!rawStatus) return;
          const cleanMemberId = String(memberId).trim();

          // Ensure attendance belongs to a member of the logged-in user's chapter
          const knownUser = usersByIdMap.get(cleanMemberId);
          if (knownUser && knownUser.role === 'MASTER_ADMIN') return;
          if (!scopedChapterMemberIdsSet.has(cleanMemberId)) return;

          const s = String(rawStatus).trim().toUpperCase();
          if (['PRESENT', 'YES', 'SUBSTITUTE', 'LATE'].includes(s)) {
            presentCount++;
          } else if (['ABSENT', 'NO', 'MEDICAL'].includes(s)) {
            absentCount++;
          }
        });
      }
    });

    // Count only guests marked as Present for the logged-in chapter within the selected report date range
    const chapterMeetings = meetings.filter(
      m => !isMeetingCancelled(m) && resolveMeetingChapterId(m) === loggedInChapterId
    );
    const chapterMeetingsByIdMap = new Map<string, Meeting>();
    chapterMeetings.forEach(m => {
      if (m && m.id) chapterMeetingsByIdMap.set(String(m.id).trim(), m);
    });

    const allMeetingsByIdMap = new Map<string, Meeting>();
    meetings.forEach(m => {
      if (m && m.id) allMeetingsByIdMap.set(String(m.id).trim(), m);
    });

    let guestCount = 0;
    const countedGuestKeys = new Set<string>();
    const chapAdminId = loggedInChapterObj?.chapter_admin_id
      ? String(loggedInChapterObj.chapter_admin_id).trim()
      : '';

    guestInvitations.forEach(g => {
      if (!g) return;

      const rawMeetingId = String((g as any).meeting_id || (g as any).meetingId || '').trim();
      const guestMeetingDateRaw = (g as any).meeting_date || g.meetingDate || (g as any).date;

      // If linked to a known meeting from another chapter or a cancelled meeting, exclude it
      const anyMatchedMeeting = rawMeetingId ? allMeetingsByIdMap.get(rawMeetingId) : undefined;
      if (anyMatchedMeeting) {
        if (isMeetingCancelled(anyMatchedMeeting)) return;
        const anyMeetingChapId = resolveMeetingChapterId(anyMatchedMeeting);
        if (anyMeetingChapId && anyMeetingChapId !== loggedInChapterId) return;
      }

      // Check chapter association of guest invitation
      const gChapRaw = String(
        g.chapter_id ||
          (g as any).invited_by_chapter ||
          (g as any).invitedByChapter ||
          (g as any).chapterId ||
          ''
      ).trim();

      if (gChapRaw && gChapRaw !== loggedInChapterId && (!chapAdminId || gChapRaw !== chapAdminId)) {
        const chapUser = usersByIdMap.get(gChapRaw);
        const resolvedFromChapRaw = chapUser ? resolveUserChapterId(chapUser) : '';
        if (resolvedFromChapRaw !== loggedInChapterId) return;
      }

      const rawInviterId = String(
        (g as any).invited_by_user_id ||
          (g as any).invitedByUserId ||
          (g as any).invited_by ||
          (g as any).invitedBy ||
          g.createdBy ||
          (g as any).created_by ||
          (g as any).inviterId ||
          (g as any).inviter_id ||
          (g as any).user_id ||
          g.memberId ||
          (g as any).member_id ||
          ''
      ).trim();

      let matchedMeeting: Meeting | undefined = rawMeetingId
        ? chapterMeetingsByIdMap.get(rawMeetingId)
        : undefined;

      if (!matchedMeeting && guestMeetingDateRaw) {
        matchedMeeting = chapterMeetings.find(m => {
          const mDateRaw = m.date || (m as any).meeting_date;
          return mDateRaw && isSameMeetingDate(mDateRaw, guestMeetingDateRaw);
        });
      }

      const isExplicitlyInChapter =
        Boolean(matchedMeeting) ||
        (gChapRaw !== '' &&
          (gChapRaw === loggedInChapterId ||
            (chapAdminId !== '' && gChapRaw === chapAdminId) ||
            (usersByIdMap.has(gChapRaw) &&
              resolveUserChapterId(usersByIdMap.get(gChapRaw)) === loggedInChapterId))) ||
        (rawInviterId !== '' &&
          (scopedChapterMemberIdsSet.has(rawInviterId) ||
            (usersByIdMap.has(rawInviterId) &&
              resolveUserChapterId(usersByIdMap.get(rawInviterId)) === loggedInChapterId)));

      if (!isExplicitlyInChapter) return;

      if (matchedMeeting) {
        if (isMeetingCancelled(matchedMeeting)) return;
        const meetingDateToCheck =
          matchedMeeting.date ||
          (matchedMeeting as any).meeting_date ||
          guestMeetingDateRaw ||
          matchedMeeting.createdAt ||
          (matchedMeeting as any).created_at;
        if (!isDateInSummaryRange(meetingDateToCheck)) return;
        if (!isVisitorConfirmedPresent(g, matchedMeeting)) return;

        const uniqueKey = g.id
          ? `${matchedMeeting.id}_${String(g.id)}`
          : `${matchedMeeting.id}_${rawInviterId}_${String(
              (g as any).guest_phone || g.guestPhone || (g as any).guest_name || g.guestName || ''
            )}`;
        if (countedGuestKeys.has(uniqueKey)) return;
        countedGuestKeys.add(uniqueKey);
        guestCount += 1;
      } else {
        const fallbackDateToCheck =
          guestMeetingDateRaw ||
          (g as any).attendance_updated_at ||
          (g as any).updated_at ||
          g.createdAt ||
          (g as any).created_at;
        if (!isDateInSummaryRange(fallbackDateToCheck)) return;
        if (!isVisitorConfirmedPresent(g, undefined)) return;

        const uniqueKey = String(
          g.id ||
            `${fallbackDateToCheck}_${rawInviterId}_${
              (g as any).guest_phone || g.guestPhone || (g as any).guest_name || g.guestName || ''
            }`
        );
        if (countedGuestKeys.has(uniqueKey)) return;
        countedGuestKeys.add(uniqueKey);
        guestCount += 1;
      }
    });

    return {
      presentCount,
      absentCount,
      totalMeetings: filteredMeetings.length,
      guestCount
    };
  }, [
    loggedInChapterId,
    loggedInChapterObj,
    meetings,
    guestInvitations,
    meetingDateRangeInfo,
    resolveMeetingChapterId,
    resolveUserChapterId,
    isVisitorConfirmedPresent,
    usersByIdMap,
    scopedChapterMemberIdsSet
  ]);

  // ====================================================
  // 2. LAST MONTH CONTRIBUTORS — LOGGED-IN CHAPTER ONLY + SELECTED DATE RANGE
  // ====================================================
  const contributorsDateRangeInfo = useMemo(
    () =>
      computeDateRangeForFilter(
        contributorsDateFilter,
        contributorsCustomStart,
        contributorsCustomEnd
      ),
    [contributorsDateFilter, contributorsCustomStart, contributorsCustomEnd]
  );

  const lastMonthContributors = useMemo(() => {
    if (
      !loggedInChapterId ||
      contributorsDateRangeInfo.isInvalid ||
      !contributorsDateRangeInfo.start ||
      !contributorsDateRangeInfo.end
    ) {
      return {
        topReferrals: [] as { memberId: string; name: string; count: number; rank: number }[],
        topBusinessGiven: [] as {
          memberId: string;
          name: string;
          amount: number;
          count: number;
          rank: number;
        }[],
        topVisitors: [] as { memberId: string; name: string; count: number; rank: number }[]
      };
    }

    const startMs = contributorsDateRangeInfo.start.getTime();
    const endMs = contributorsDateRangeInfo.end.getTime();

    // Only members belonging to the LOGGED-IN USER'S CHAPTER
    const allowedChapterMemberIds = new Set<string>();
    scopedChapterMembers.forEach(u => {
      if (u.id) allowedChapterMemberIds.add(String(u.id).trim());
      if (u.uid) allowedChapterMemberIds.add(String(u.uid).trim());
    });

    const isDateInSelectedRange = (val: any): boolean => {
      if (!val) return false;
      const d = parseSafeDate(val);
      if (!d) return false;
      const t = d.getTime();
      return t >= startMs && t <= endMs;
    };

    // Canonical ID resolver strictly restricted to the logged-in chapter's members
    const getCanonicalChapterMemberId = (rawId: string): string | null => {
      if (!rawId) return null;
      const trimmed = String(rawId).trim();
      if (!trimmed) return null;
      const u = usersByIdMap.get(trimmed);
      if (u) {
        const canonical = String(u.uid || u.id).trim();
        if (!allowedChapterMemberIds.has(canonical) && !allowedChapterMemberIds.has(trimmed)) {
          return null;
        }
        return canonical;
      }
      return allowedChapterMemberIds.has(trimmed) ? trimmed : null;
    };

    // A. TOP REFERRAL (Logged-in Chapter + Selected Date Range)
    const referralCountsMap = new Map<string, number>();
    referrals.forEach(r => {
      if (!isNormalReferral(r)) return;
      const rDate = r.createdAt || (r as any).created_at || (r as any).date;
      if (!isDateInSelectedRange(rDate)) return;

      // If referral has an explicit chapter_id, verify it matches loggedInChapterId
      const rChap = String((r as any).chapter_id || (r as any).chapterId || '').trim();
      if (rChap && rChap !== loggedInChapterId) return;

      const senderRawId = String(r.fromUserId || (r as any).from_user_id || r.sender_id || '');
      const memberId = getCanonicalChapterMemberId(senderRawId);
      if (!memberId) return;

      referralCountsMap.set(memberId, (referralCountsMap.get(memberId) || 0) + 1);
    });

    const allReferralRanked = Array.from(referralCountsMap.entries())
      .filter(([, count]) => count > 0)
      .map(([memberId, count]) => ({
        memberId,
        name: resolveMemberName(memberId),
        count
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .map((item, idx) => ({
        ...item,
        rank: idx + 1
      }));

    // B. TOP BUSINESS GIVEN (Logged-in Chapter + Selected Date Range)
    const referralsByIdMap = new Map<string, Referral>();
    referrals.forEach(r => {
      if (r.id) referralsByIdMap.set(String(r.id), r);
    });

    const businessGivenMap = new Map<string, { amount: number; count: number }>();
    thankYouSlips.forEach(s => {
      const sDate = s.createdAt || s.created_at || s.date;
      if (!isDateInSelectedRange(sDate)) return;

      const sChap = String(s.chapter_id || s.chapterId || '').trim();
      if (sChap && sChap !== loggedInChapterId) return;

      const refId = String(s.referralId || s.referral_id || '');
      const linkedRef = refId ? referralsByIdMap.get(refId) : undefined;

      let rawGiverId = linkedRef
        ? String(linkedRef.fromUserId || (linkedRef as any).from_user_id || linkedRef.sender_id || '')
        : String(s.toUserId || s.to_user_id || s.receiver_id || '');

      let memberId = getCanonicalChapterMemberId(rawGiverId);
      if (!memberId) {
        const fallbackGiverId = String(
          s.fromUserId || s.from_user_id || s.sender_id || s.submitted_by || ''
        );
        memberId = getCanonicalChapterMemberId(fallbackGiverId);
      }
      if (!memberId) return;

      const amount =
        linkedRef && (linkedRef as any).business_amount
          ? Number((linkedRef as any).business_amount)
          : Number(s.businessValue ?? s.business_value ?? s.amount ?? s.transactionValue ?? 0);

      if (amount <= 0) return;

      const prev = businessGivenMap.get(memberId) || { amount: 0, count: 0 };
      businessGivenMap.set(memberId, {
        amount: prev.amount + amount,
        count: prev.count + 1
      });
    });

    const allBusinessRanked = Array.from(businessGivenMap.entries())
      .filter(([, data]) => data.amount > 0)
      .map(([memberId, data]) => ({
        memberId,
        name: resolveMemberName(memberId),
        amount: data.amount,
        count: data.count
      }))
      .sort((a, b) => b.amount - a.amount || b.count - a.count || a.name.localeCompare(b.name))
      .map((item, idx) => ({
        ...item,
        rank: idx + 1
      }));

    // C. TOP VISITOR GOT IN (Logged-in Chapter + Selected Date Range)
    const chapterMeetings = meetings.filter(
      m => !isMeetingCancelled(m) && resolveMeetingChapterId(m) === loggedInChapterId
    );
    const chapterMeetingsByIdMap = new Map<string, Meeting>();
    chapterMeetings.forEach(m => {
      if (m && m.id) chapterMeetingsByIdMap.set(String(m.id).trim(), m);
    });

    const visitorCountsMap = new Map<string, number>();
    const countedVisitorKeys = new Set<string>();

    guestInvitations.forEach(g => {
      if (!g) return;

      // Ensure visitor does not belong to a different chapter
      const gChapRaw = String(
        g.chapter_id ||
          (g as any).invited_by_chapter ||
          (g as any).invitedByChapter ||
          (g as any).chapterId ||
          ''
      ).trim();
      if (gChapRaw && gChapRaw !== loggedInChapterId) {
        const chapAdminId = loggedInChapterObj?.chapter_admin_id
          ? String(loggedInChapterObj.chapter_admin_id).trim()
          : '';
        if (!chapAdminId || gChapRaw !== chapAdminId) return;
      }

      const rawInviterId = String(
        (g as any).invited_by_user_id ||
          (g as any).invitedByUserId ||
          (g as any).invited_by ||
          (g as any).invitedBy ||
          g.createdBy ||
          (g as any).created_by ||
          (g as any).inviterId ||
          (g as any).inviter_id ||
          (g as any).user_id ||
          g.memberId ||
          (g as any).member_id ||
          ''
      ).trim();

      const memberId = getCanonicalChapterMemberId(rawInviterId);
      if (!memberId) return;

      const rawMeetingId = String((g as any).meeting_id || (g as any).meetingId || '').trim();
      const guestMeetingDateRaw = (g as any).meeting_date || g.meetingDate || (g as any).date;

      let matchedMeeting: Meeting | undefined = rawMeetingId
        ? chapterMeetingsByIdMap.get(rawMeetingId)
        : undefined;

      if (!matchedMeeting && guestMeetingDateRaw) {
        matchedMeeting = chapterMeetings.find(m => {
          const mDateRaw = m.date || (m as any).meeting_date;
          return mDateRaw && isSameMeetingDate(mDateRaw, guestMeetingDateRaw);
        });
      }

      if (!matchedMeeting || isMeetingCancelled(matchedMeeting)) return;

      const meetingDateToCheck =
        matchedMeeting.date || (matchedMeeting as any).meeting_date || guestMeetingDateRaw;
      if (!isDateInSelectedRange(meetingDateToCheck)) return;

      if (!isVisitorConfirmedPresent(g, matchedMeeting)) return;

      const visitorUniqueKey = g.id
        ? `${matchedMeeting.id}_${String(g.id)}`
        : `${matchedMeeting.id}_${memberId}_${String(
            (g as any).guest_phone || g.guestPhone || (g as any).guest_name || g.guestName || ''
          )}`;
      if (countedVisitorKeys.has(visitorUniqueKey)) return;
      countedVisitorKeys.add(visitorUniqueKey);

      visitorCountsMap.set(memberId, (visitorCountsMap.get(memberId) || 0) + 1);
    });

    const allVisitorRanked = Array.from(visitorCountsMap.entries())
      .filter(([, count]) => count > 0)
      .map(([memberId, count]) => ({
        memberId,
        name: resolveMemberName(memberId),
        count
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .map((item, idx) => ({
        ...item,
        rank: idx + 1
      }));

    if (selectedAssociateId === 'ALL') {
      return {
        topReferrals: allReferralRanked.slice(0, 3),
        topBusinessGiven: allBusinessRanked.slice(0, 3),
        topVisitors: allVisitorRanked.slice(0, 3)
      };
    }

    const selectedName = resolveMemberName(selectedAssociateId);
    const memberRef = allReferralRanked.find(r => r.memberId === selectedAssociateId);
    const memberBiz = allBusinessRanked.find(b => b.memberId === selectedAssociateId);
    const memberVis = allVisitorRanked.find(v => v.memberId === selectedAssociateId);

    return {
      topReferrals: [
        memberRef || {
          memberId: selectedAssociateId,
          name: selectedName,
          count: 0,
          rank: 0
        }
      ],
      topBusinessGiven: [
        memberBiz || {
          memberId: selectedAssociateId,
          name: selectedName,
          amount: 0,
          count: 0,
          rank: 0
        }
      ],
      topVisitors: [
        memberVis || {
          memberId: selectedAssociateId,
          name: selectedName,
          count: 0,
          rank: 0
        }
      ]
    };
  }, [
    loggedInChapterId,
    loggedInChapterObj,
    contributorsDateRangeInfo,
    scopedChapterMembers,
    usersByIdMap,
    referrals,
    thankYouSlips,
    meetings,
    guestInvitations,
    resolveMeetingChapterId,
    isVisitorConfirmedPresent,
    resolveMemberName,
    selectedAssociateId
  ]);

  // ====================================================
  // 3. ENTIRE BUSINESS PERFORMANCE — ALL CHAPTERS IN PROJECT
  // ====================================================
  const entireBizDateRangeInfo = useMemo(
    () =>
      computeDateRangeForFilter(entireBizDateFilter, entireBizCustomStart, entireBizCustomEnd),
    [entireBizDateFilter, entireBizCustomStart, entireBizCustomEnd]
  );

  const entireBusinessPerformanceStats = useMemo(() => {
    if (
      entireBizDateRangeInfo.isInvalid ||
      !entireBizDateRangeInfo.start ||
      !entireBizDateRangeInfo.end
    ) {
      return {
        totalReferrals: 0,
        avgReferrals: 0,
        totalBusinessGiven: 0,
        avgBusinessGiven: 0,
        totalVisitorsGotIn: 0,
        avgVisitorsGotIn: 0,
        monthsCount: 1
      };
    }

    const startMs = entireBizDateRangeInfo.start.getTime();
    const endMs = entireBizDateRangeInfo.end.getTime();
    const monthsCount = Math.max(1, entireBizDateRangeInfo.monthsCount);

    const isDateInGlobalRange = (val: any): boolean => {
      if (!val) return false;
      const d = parseSafeDate(val);
      if (!d) return false;
      const t = d.getTime();
      return t >= startMs && t <= endMs;
    };

    // 1. Total Referrals Given across ALL CHAPTERS
    let totalReferrals = 0;
    const referralsByIdMap = new Map<string, Referral>();
    referrals.forEach(r => {
      if (r.id) referralsByIdMap.set(String(r.id), r);
      if (!isNormalReferral(r)) return;
      const rDate = r.createdAt || (r as any).created_at || (r as any).date;
      if (isDateInGlobalRange(rDate)) {
        totalReferrals += 1;
      }
    });

    // 2. Total Business Given across ALL CHAPTERS
    let totalBusinessGiven = 0;
    thankYouSlips.forEach(s => {
      const sDate = s.createdAt || s.created_at || s.date;
      if (!isDateInGlobalRange(sDate)) return;

      const refId = String(s.referralId || s.referral_id || '');
      const linkedRef = refId ? referralsByIdMap.get(refId) : undefined;

      const amount =
        linkedRef && (linkedRef as any).business_amount
          ? Number((linkedRef as any).business_amount)
          : Number(s.businessValue ?? s.business_value ?? s.amount ?? s.transactionValue ?? 0);

      if (amount > 0) {
        totalBusinessGiven += amount;
      }
    });

    // 3. Total Visitors Got In across ALL CHAPTERS
    const allMeetingsByIdMap = new Map<string, Meeting>();
    meetings.forEach(m => {
      if (m && m.id && !isMeetingCancelled(m)) {
        allMeetingsByIdMap.set(String(m.id).trim(), m);
      }
    });

    let totalVisitorsGotIn = 0;
    const countedGlobalVisitors = new Set<string>();

    guestInvitations.forEach(g => {
      if (!g) return;

      const rawMeetingId = String((g as any).meeting_id || (g as any).meetingId || '').trim();
      const guestMeetingDateRaw = (g as any).meeting_date || g.meetingDate || (g as any).date;

      let matchedMeeting: Meeting | undefined = rawMeetingId
        ? allMeetingsByIdMap.get(rawMeetingId)
        : undefined;

      if (!matchedMeeting && guestMeetingDateRaw) {
        matchedMeeting = meetings.find(m => {
          if (isMeetingCancelled(m)) return false;
          const mDateRaw = m.date || (m as any).meeting_date;
          return mDateRaw && isSameMeetingDate(mDateRaw, guestMeetingDateRaw);
        });
      }

      if (matchedMeeting) {
        if (isMeetingCancelled(matchedMeeting)) return;
        const meetingDateToCheck =
          matchedMeeting.date || (matchedMeeting as any).meeting_date || guestMeetingDateRaw;
        if (!isDateInGlobalRange(meetingDateToCheck)) return;
        if (!isVisitorConfirmedPresent(g, matchedMeeting)) return;

        const visitorKey = g.id
          ? `${matchedMeeting.id}_${String(g.id)}`
          : `${matchedMeeting.id}_${String(
              (g as any).guest_phone || g.guestPhone || (g as any).guest_name || g.guestName || ''
            )}`;
        if (countedGlobalVisitors.has(visitorKey)) return;
        countedGlobalVisitors.add(visitorKey);
        totalVisitorsGotIn += 1;
      } else {
        // Fallback if no meeting row exists for that date: count only if confirmed present in guest_invitations
        const dateToCheck =
          guestMeetingDateRaw || g.createdAt || (g as any).created_at;
        if (!isDateInGlobalRange(dateToCheck)) return;
        if (!isVisitorConfirmedPresent(g, undefined)) return;

        const visitorKey = String(
          g.id ||
            `${dateToCheck}_${(g as any).guest_phone || g.guestPhone || (g as any).guest_name || g.guestName || ''}`
        );
        if (countedGlobalVisitors.has(visitorKey)) return;
        countedGlobalVisitors.add(visitorKey);
        totalVisitorsGotIn += 1;
      }
    });

    return {
      totalReferrals,
      avgReferrals: totalReferrals / monthsCount,
      totalBusinessGiven,
      avgBusinessGiven: totalBusinessGiven / monthsCount,
      totalVisitorsGotIn,
      avgVisitorsGotIn: totalVisitorsGotIn / monthsCount,
      monthsCount
    };
  }, [
    entireBizDateRangeInfo,
    referrals,
    thankYouSlips,
    meetings,
    guestInvitations,
    isVisitorConfirmedPresent
  ]);

  // ====================================================
  // 2. WEEKLY PERFORMANCE OF CHAPTER (LOGGED-IN CHAPTER ONLY)
  // ====================================================
  const weeklyChapterDateRangeInfo = useMemo(
    () => computeDateRangeForFilter(weeklyChapterFilter, weeklyChapterCustomStart, weeklyChapterCustomEnd),
    [weeklyChapterFilter, weeklyChapterCustomStart, weeklyChapterCustomEnd]
  );

  const weeklyChapterPerformanceStats = useMemo(() => {
    if (
      !loggedInChapterId ||
      weeklyChapterDateRangeInfo.isInvalid ||
      !weeklyChapterDateRangeInfo.start ||
      !weeklyChapterDateRangeInfo.end
    ) {
      return {
        totalReferrals: 0,
        totalBusiness: 0,
        totalOneToOnes: 0,
        totalVisitors: 0,
        totalTestimonials: 0,
        dateLabel: ''
      };
    }

    const startMs = weeklyChapterDateRangeInfo.start.getTime();
    const endMs = weeklyChapterDateRangeInfo.end.getTime();
    const chapAdminId = loggedInChapterObj?.chapter_admin_id
      ? String(loggedInChapterObj.chapter_admin_id).trim()
      : '';

    const isDateInPeriod = (val: any): boolean => {
      if (!val) return false;
      const parsed = parseSafeDate(val);
      if (!parsed) return false;
      const ms = parsed.getTime();
      return ms >= startMs && ms <= endMs;
    };

    const isMemberOfLoggedInChapter = (rawUserId: any): boolean => {
      const uid = String(rawUserId || '').trim();
      if (!uid) return false;
      if (scopedChapterMemberIdsSet.has(uid)) return true;
      const u = usersByIdMap.get(uid);
      if (!u) return false;
      return resolveUserChapterId(u) === loggedInChapterId;
    };

    // 1. Total Referrals (logged-in chapter only)
    let totalReferrals = 0;
    const referralsByIdMap = new Map<string, Referral>();
    referrals.forEach(r => {
      if (!r) return;
      if (r.id) referralsByIdMap.set(String(r.id), r);
      if (!isNormalReferral(r)) return;

      const rChap = String((r as any).chapter_id || (r as any).chapterId || '').trim();
      if (rChap && rChap !== loggedInChapterId && (!chapAdminId || rChap !== chapAdminId)) {
        return;
      }

      const fromId = String(r.fromUserId || (r as any).from_user_id || r.sender_id || '').trim();
      const belongsToChapter =
        isMemberOfLoggedInChapter(fromId) ||
        (rChap !== '' && (rChap === loggedInChapterId || (chapAdminId !== '' && rChap === chapAdminId)));
      if (!belongsToChapter) return;

      const rawDate = r.createdAt || (r as any).created_at || (r as any).date;
      if (isDateInPeriod(rawDate)) {
        totalReferrals += 1;
      }
    });

    // 2. Total Business (logged-in chapter only)
    let totalBusiness = 0;
    thankYouSlips.forEach(s => {
      if (!s) return;
      const rawDate = s.createdAt || (s as any).created_at || (s as any).date;
      if (!isDateInPeriod(rawDate)) return;

      const sChap = String((s as any).chapter_id || (s as any).chapterId || '').trim();
      if (sChap && sChap !== loggedInChapterId && (!chapAdminId || sChap !== chapAdminId)) {
        return;
      }

      const refId = String(s.referralId || (s as any).referral_id || '').trim();
      const linkedRef = refId ? referralsByIdMap.get(refId) : undefined;

      const fromId = String(
        s.fromUserId || (s as any).from_user_id || (s as any).submitted_by || (s as any).sender_id || ''
      ).trim();
      const toId = String(
        s.toUserId || (s as any).to_user_id || (s as any).receiver_id || ''
      ).trim();
      const refGiverId = linkedRef
        ? String(linkedRef.fromUserId || (linkedRef as any).from_user_id || linkedRef.sender_id || '').trim()
        : '';

      const belongsToChapter =
        isMemberOfLoggedInChapter(fromId) ||
        isMemberOfLoggedInChapter(toId) ||
        isMemberOfLoggedInChapter(refGiverId) ||
        (sChap !== '' && (sChap === loggedInChapterId || (chapAdminId !== '' && sChap === chapAdminId)));
      if (!belongsToChapter) return;

      const val =
        linkedRef && (linkedRef as any).business_amount
          ? Number((linkedRef as any).business_amount)
          : Number(s.businessValue ?? (s as any).business_value ?? (s as any).amount ?? (s as any).transactionValue ?? 0);

      if (val > 0) {
        totalBusiness += val;
      }
    });

    // 3. Total 1-to-1 Meetings (logged-in chapter only)
    let totalOneToOnes = 0;
    const countedOneToOneIds = new Set<string>();
    oneToOnes.forEach(m => {
      if (!m) return;
      const statusUpper = String(m.status || '').trim().toUpperCase();
      if (
        statusUpper === 'CANCELLED' ||
        statusUpper === 'CANCELED' ||
        statusUpper === 'NOT_COMPLETED' ||
        m.isCancelled === true ||
        (m as any).is_cancelled === true
      ) {
        return;
      }

      const mChap = String(m.chapter_id || m.chapterId || '').trim();
      const senderId = String(
        m.sender_id || m.organizer_id || m.creator_id || m.creatorId || ''
      ).trim();
      const receiverId = String(
        m.receiver_id ||
          m.member_id ||
          (Array.isArray(m.participantIds) && m.participantIds[0]) ||
          (Array.isArray(m.participant_ids) && m.participant_ids[0]) ||
          ''
      ).trim();

      if (
        mChap &&
        mChap !== loggedInChapterId &&
        (!chapAdminId || mChap !== chapAdminId) &&
        !isMemberOfLoggedInChapter(senderId) &&
        !isMemberOfLoggedInChapter(receiverId)
      ) {
        return;
      }

      const belongsToChapter =
        (mChap !== '' && (mChap === loggedInChapterId || (chapAdminId !== '' && mChap === chapAdminId))) ||
        isMemberOfLoggedInChapter(senderId) ||
        isMemberOfLoggedInChapter(receiverId);
      if (!belongsToChapter) return;

      const scheduledDateRaw = m.scheduled_date || m.date || m.meeting_date;
      const createdDateRaw = m.created_at || m.createdAt;
      const completedDateRaw = m.completed_at || m.completedAt;

      if (
        !isDateInPeriod(scheduledDateRaw) &&
        !isDateInPeriod(createdDateRaw) &&
        !isDateInPeriod(completedDateRaw)
      ) {
        return;
      }

      const key = String(m.id || `${senderId}_${receiverId}_${scheduledDateRaw || createdDateRaw}`);
      if (countedOneToOneIds.has(key)) return;
      countedOneToOneIds.add(key);
      totalOneToOnes += 1;
    });

    // 4. Total Visitors (ONLY PRESENT visitors for logged-in chapter)
    let totalVisitors = 0;
    const countedVisitors = new Set<string>();
    const chapterMeetings = meetings.filter(
      m => !isMeetingCancelled(m) && resolveMeetingChapterId(m) === loggedInChapterId
    );
    const chapterMeetingsByIdMap = new Map<string, Meeting>();
    chapterMeetings.forEach(m => {
      if (m && m.id) chapterMeetingsByIdMap.set(String(m.id).trim(), m);
    });
    const allMeetingsByIdMap = new Map<string, Meeting>();
    meetings.forEach(m => {
      if (m && m.id) allMeetingsByIdMap.set(String(m.id).trim(), m);
    });

    guestInvitations.forEach(g => {
      if (!g) return;

      const rawMeetingId = String((g as any).meeting_id || (g as any).meetingId || '').trim();
      const guestMeetingDateRaw = (g as any).meeting_date || g.meetingDate || (g as any).date;

      const anyMatchedMeeting = rawMeetingId ? allMeetingsByIdMap.get(rawMeetingId) : undefined;
      if (anyMatchedMeeting) {
        if (isMeetingCancelled(anyMatchedMeeting)) return;
        const anyMeetingChapId = resolveMeetingChapterId(anyMatchedMeeting);
        if (anyMeetingChapId && anyMeetingChapId !== loggedInChapterId) return;
      }

      const gChapId = String(
        (g as any).chapter_id ||
          (g as any).invited_by_chapter ||
          (g as any).invitedByChapter ||
          (g as any).chapterId ||
          ''
      ).trim();

      if (gChapId && gChapId !== loggedInChapterId && (!chapAdminId || gChapId !== chapAdminId)) {
        const chapUser = usersByIdMap.get(gChapId);
        const resolvedFromChap = chapUser ? resolveUserChapterId(chapUser) : '';
        if (resolvedFromChap !== loggedInChapterId) return;
      }

      const gInviterId = String(
        (g as any).invited_by_user_id ||
          (g as any).invitedByUserId ||
          (g as any).invited_by ||
          (g as any).invitedBy ||
          g.createdBy ||
          (g as any).created_by ||
          (g as any).inviterId ||
          (g as any).inviter_id ||
          (g as any).user_id ||
          g.memberId ||
          (g as any).member_id ||
          ''
      ).trim();

      let matchedMeeting: Meeting | undefined = rawMeetingId
        ? chapterMeetingsByIdMap.get(rawMeetingId)
        : undefined;

      if (!matchedMeeting && guestMeetingDateRaw) {
        matchedMeeting = chapterMeetings.find(m => {
          const mDateRaw = m.date || (m as any).meeting_date;
          return mDateRaw && isSameMeetingDate(mDateRaw, guestMeetingDateRaw);
        });
      }

      const isChapterGuest =
        Boolean(matchedMeeting) ||
        (gChapId !== '' &&
          (gChapId === loggedInChapterId ||
            (chapAdminId !== '' && gChapId === chapAdminId) ||
            isMemberOfLoggedInChapter(gChapId))) ||
        isMemberOfLoggedInChapter(gInviterId);

      if (!isChapterGuest) return;

      if (matchedMeeting) {
        if (isMeetingCancelled(matchedMeeting)) return;
        const meetingDateToCheck =
          matchedMeeting.date ||
          (matchedMeeting as any).meeting_date ||
          guestMeetingDateRaw ||
          matchedMeeting.createdAt ||
          (matchedMeeting as any).created_at;

        if (!isDateInPeriod(meetingDateToCheck)) return;
        if (!isVisitorConfirmedPresent(g, matchedMeeting)) return;

        const visitorKey = g.id
          ? `${matchedMeeting.id}_${String(g.id)}`
          : `${matchedMeeting.id}_${String((g as any).guest_phone || (g as any).guest_name || '')}`;

        if (!countedVisitors.has(visitorKey)) {
          countedVisitors.add(visitorKey);
          totalVisitors += 1;
        }
      } else {
        const dateToCheck =
          guestMeetingDateRaw ||
          (g as any).attendance_updated_at ||
          (g as any).updated_at ||
          g.createdAt ||
          (g as any).created_at;
        if (!isDateInPeriod(dateToCheck)) return;
        if (!isVisitorConfirmedPresent(g, undefined)) return;

        const visitorKey = String(
          g.id || `${dateToCheck}_${(g as any).guest_phone || (g as any).guest_name || ''}`
        );

        if (!countedVisitors.has(visitorKey)) {
          countedVisitors.add(visitorKey);
          totalVisitors += 1;
        }
      }
    });

    // 5. Total Testimonials (logged-in chapter: Sent & Received)
    let totalTestimonials = 0;
    const countededTestimonialIds = new Set<string>();
    testimonials.forEach(t => {
      if (!t) return;
      const rawDate = t.createdAt || (t as any).created_at || (t as any).date;
      if (!isDateInPeriod(rawDate)) return;

      const tChap = String((t as any).chapter_id || (t as any).chapterId || '').trim();
      if (tChap && tChap !== loggedInChapterId && (!chapAdminId || tChap !== chapAdminId)) {
        return;
      }

      const authorId = String(
        t.author_id || t.authorId || (t as any).sender_id || (t as any).from_user_id || ''
      ).trim();
      const receiverId = String(
        t.receiver_id || t.receiverId || (t as any).to_user_id || (t as any).recipient_id || ''
      ).trim();

      const belongsToChapter =
        isMemberOfLoggedInChapter(authorId) ||
        isMemberOfLoggedInChapter(receiverId) ||
        (tChap !== '' && (tChap === loggedInChapterId || (chapAdminId !== '' && tChap === chapAdminId)));
      if (!belongsToChapter) return;

      const key = String(t.id || `${authorId}_${receiverId}_${rawDate}`);
      if (countededTestimonialIds.has(key)) return;
      countededTestimonialIds.add(key);
      totalTestimonials += 1;
    });

    return {
      totalReferrals,
      totalBusiness,
      totalOneToOnes,
      totalVisitors,
      totalTestimonials,
      dateLabel: weeklyChapterDateRangeInfo.label
    };
  }, [
    loggedInChapterId,
    loggedInChapterObj,
    weeklyChapterDateRangeInfo,
    referrals,
    thankYouSlips,
    oneToOnes,
    guestInvitations,
    meetings,
    testimonials,
    usersByIdMap,
    scopedChapterMemberIdsSet,
    resolveUserChapterId,
    resolveMeetingChapterId,
    isVisitorConfirmedPresent
  ]);

  // ====================================================
  // 3. TOP PERFORMANCE OF THE WEEK (LAST COMPLETED WEEK ONLY — LOGGED-IN CHAPTER)
  // ====================================================
  const lastCompletedWeekRangeInfo = useMemo(
    () => computeDateRangeForFilter('last_week', '', ''),
    []
  );

  const topPerformanceOfTheWeek = useMemo(() => {
    if (
      !loggedInChapterId ||
      !lastCompletedWeekRangeInfo.start ||
      !lastCompletedWeekRangeInfo.end
    ) {
      return {
        topPerformers: [] as {
          memberId: string;
          name: string;
          category: string;
          businessName: string;
          photoURL: string;
          growthScore: number;
          status: 'Needs Action' | 'On Track' | 'Excellent';
          statusColor: string;
          completedTasks: number;
          totalTasks: number;
          referralsCount: number;
          businessAmount: number;
          oneToOnesCount: number;
          visitorsCount: number;
          rank: number;
        }[],
        dateLabel: lastCompletedWeekRangeInfo.label
      };
    }

    const startDate = lastCompletedWeekRangeInfo.start;
    const endDate = lastCompletedWeekRangeInfo.end;
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();

    const isDateInLastWeek = (val: any): boolean => {
      if (!val) return false;
      const parsed = parseSafeDate(val);
      if (!parsed) return false;
      const ms = parsed.getTime();
      return ms >= startMs && ms <= endMs;
    };

    const chapterNameNorm = String(
      loggedInChapterObj?.name || (loggedInChapterObj as any)?.chapter_name || ''
    )
      .trim()
      .toLowerCase();

    // Filter eligible members of the logged-in chapter (active members, excluding pure chapter-placeholder accounts if real members exist)
    const activeMembers = scopedChapterMembers.filter(u => isMemberActive(u));
    const nonPlaceholderMembers = activeMembers.filter(u => {
      const roleUpper = String(u.role || '').trim().toUpperCase();
      const rawName = String(u.name || (u as any).full_name || '').trim().toLowerCase();
      if (
        roleUpper === 'CHAPTER_ADMIN' &&
        (rawName.endsWith('chapter') || (chapterNameNorm && rawName.includes(chapterNameNorm)))
      ) {
        return false;
      }
      return true;
    });

    const candidateMembers =
      nonPlaceholderMembers.length > 0 ? nonPlaceholderMembers : activeMembers;

    if (candidateMembers.length === 0) {
      return {
        topPerformers: [],
        dateLabel: lastCompletedWeekRangeInfo.label
      };
    }

    const referralsByIdMap = new Map<string, Referral>();
    referrals.forEach(r => {
      if (r && r.id) referralsByIdMap.set(String(r.id), r);
    });

    const chapterMeetings = meetings.filter(
      m => !isMeetingCancelled(m) && resolveMeetingChapterId(m) === loggedInChapterId
    );
    const chapterMeetingsByIdMap = new Map<string, Meeting>();
    chapterMeetings.forEach(m => {
      if (m && m.id) chapterMeetingsByIdMap.set(String(m.id).trim(), m);
    });

    const scoredMembers = candidateMembers.map(member => {
      const memberId = String(member.uid || member.id).trim();
      const scoreData = calculateMemberGrowthScoreData({
        profile: member,
        activeDateRange: { start: startDate, end: endDate },
        allReferrals: referrals,
        oneToOnes,
        meetings,
        guestInvitations,
        allSlips: thankYouSlips,
        testimonials,
        allUsers: scopedChapterMembers
      });

      // Calculate member's individual last-week activity breakdown
      let referralsCount = 0;
      referrals.forEach(r => {
        if (!r || !isNormalReferral(r)) return;
        const sender = String(
          r.fromUserId || (r as any).from_user_id || r.sender_id || (r as any).authorMemberId || ''
        ).trim();
        if (sender !== memberId) return;
        const rDate = r.createdAt || (r as any).created_at || (r as any).date;
        if (isDateInLastWeek(rDate)) {
          referralsCount += 1;
        }
      });

      let businessAmount = 0;
      thankYouSlips.forEach(s => {
        if (!s) return;
        const sDate = s.createdAt || (s as any).created_at || (s as any).date;
        if (!isDateInLastWeek(sDate)) return;

        const refId = String(s.referralId || (s as any).referral_id || '').trim();
        const linkedRef = refId ? referralsByIdMap.get(refId) : undefined;
        const giverId = linkedRef
          ? String(linkedRef.fromUserId || (linkedRef as any).from_user_id || linkedRef.sender_id || '').trim()
          : String(s.toUserId || (s as any).to_user_id || (s as any).receiver_id || '').trim();
        const submitterId = String(
          s.fromUserId || (s as any).from_user_id || (s as any).submitted_by || ''
        ).trim();

        if (giverId !== memberId && submitterId !== memberId) return;

        const val =
          linkedRef && (linkedRef as any).business_amount
            ? Number((linkedRef as any).business_amount)
            : Number(s.businessValue ?? (s as any).business_value ?? (s as any).amount ?? 0);
        if (val > 0) {
          businessAmount += val;
        }
      });

      let oneToOnesCount = 0;
      oneToOnes.forEach(m => {
        if (!m) return;
        const statusUpper = String(m.status || '').trim().toUpperCase();
        if (
          statusUpper === 'CANCELLED' ||
          statusUpper === 'CANCELED' ||
          statusUpper === 'NOT_COMPLETED'
        ) {
          return;
        }
        const isParticipant =
          [m.organizer_id, m.creatorId, m.creator_id, m.sender_id, m.member_id, m.receiver_id].some(
            id => id && String(id).trim() === memberId
          ) ||
          (Array.isArray(m.participantIds) &&
            m.participantIds.some((id: any) => String(id).trim() === memberId));
        if (!isParticipant) return;

        const sDate = m.scheduled_date || m.date || m.meeting_date;
        const cDate = m.created_at || m.createdAt;
        const compDate = m.completed_at || m.completedAt;
        if (isDateInLastWeek(sDate) || isDateInLastWeek(cDate) || isDateInLastWeek(compDate)) {
          oneToOnesCount += 1;
        }
      });

      let visitorsCount = 0;
      guestInvitations.forEach(g => {
        if (!g) return;
        const inviterId = String(
          (g as any).invited_by_user_id ||
            (g as any).invitedByUserId ||
            (g as any).invited_by ||
            g.createdBy ||
            (g as any).created_by ||
            (g as any).inviterId ||
            (g as any).inviter_id ||
            (g as any).user_id ||
            g.memberId ||
            (g as any).member_id ||
            ''
        ).trim();
        if (inviterId !== memberId) return;

        const rawMeetingId = String((g as any).meeting_id || (g as any).meetingId || '').trim();
        const guestMeetingDateRaw = (g as any).meeting_date || g.meetingDate || (g as any).date;
        let matchedMeeting = rawMeetingId ? chapterMeetingsByIdMap.get(rawMeetingId) : undefined;
        if (!matchedMeeting && guestMeetingDateRaw) {
          matchedMeeting = chapterMeetings.find(m => {
            const mDateRaw = m.date || (m as any).meeting_date;
            return mDateRaw && isSameMeetingDate(mDateRaw, guestMeetingDateRaw);
          });
        }

        const dateToCheck = matchedMeeting
          ? matchedMeeting.date || (matchedMeeting as any).meeting_date || guestMeetingDateRaw
          : guestMeetingDateRaw || g.createdAt || (g as any).created_at;

        if (!isDateInLastWeek(dateToCheck)) return;
        if (!isVisitorConfirmedPresent(g, matchedMeeting)) return;
        visitorsCount += 1;
      });

      return {
        memberId,
        name: getCleanFullName(
          member.name || (member as any).full_name || (member as any).displayName || 'Member'
        ),
        category: member.category || (member as any).business_category || 'General Member',
        businessName: member.businessName || (member as any).business_name || '',
        photoURL: member.photoURL || (member as any).profile_photo || '',
        growthScore: scoreData.score,
        status: scoreData.status,
        statusColor: scoreData.statusColor,
        completedTasks: scoreData.completed_tasks,
        totalTasks: scoreData.total_tasks,
        referralsCount,
        businessAmount,
        oneToOnesCount,
        visitorsCount
      };
    });

    // Sort by existing Growth Score desc, then completedTasks desc, then activity metrics, then name asc
    scoredMembers.sort((a, b) => {
      if (b.growthScore !== a.growthScore) return b.growthScore - a.growthScore;
      if (b.completedTasks !== a.completedTasks) return b.completedTasks - a.completedTasks;
      if (b.referralsCount !== a.referralsCount) return b.referralsCount - a.referralsCount;
      if (b.businessAmount !== a.businessAmount) return b.businessAmount - a.businessAmount;
      if (b.oneToOnesCount !== a.oneToOnesCount) return b.oneToOnesCount - a.oneToOnesCount;
      if (b.visitorsCount !== a.visitorsCount) return b.visitorsCount - a.visitorsCount;
      return a.name.localeCompare(b.name);
    });

    const best = scoredMembers[0] || null;
    const hasAnyActivity =
      best &&
      (best.growthScore > 0 ||
        best.completedTasks > 0 ||
        best.referralsCount > 0 ||
        best.businessAmount > 0 ||
        best.oneToOnesCount > 0 ||
        best.visitorsCount > 0);

    if (!hasAnyActivity) {
      return {
        topPerformers: [],
        dateLabel: lastCompletedWeekRangeInfo.label
      };
    }

    const topPerformers = scoredMembers.slice(0, 3).map((m, idx) => ({
      ...m,
      rank: idx + 1
    }));

    return {
      topPerformers,
      dateLabel: lastCompletedWeekRangeInfo.label
    };
  }, [
    loggedInChapterId,
    loggedInChapterObj,
    lastCompletedWeekRangeInfo,
    scopedChapterMembers,
    referrals,
    thankYouSlips,
    oneToOnes,
    meetings,
    guestInvitations,
    testimonials,
    resolveMeetingChapterId,
    isVisitorConfirmedPresent
  ]);

  const getRankBadgeStyle = (rank: number) => {
    if (rank === 1) return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    if (rank === 2) return 'bg-slate-400/15 text-slate-300 border-slate-400/30';
    if (rank === 3) return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
    return 'bg-white/5 text-neutral-400 border-white/10';
  };

  const weeklyChapterFilterOptions: { id: WeeklyChapterFilterType; label: string }[] = [
    { id: 'this_week', label: 'This Week' },
    { id: 'last_week', label: 'Last Week' },
    { id: 'this_month', label: 'This Month' },
    { id: 'last_month', label: 'Last Month' },
    { id: 'custom', label: 'Custom Date Range' }
  ];

  const getWeeklyChapterFilterLabel = (f: WeeklyChapterFilterType) => {
    const found = weeklyChapterFilterOptions.find(o => o.id === f);
    return found ? found.label : 'Last Week';
  };

  const meetingFilterOptions: { id: MeetingDateFilterType; label: string }[] = [
    { id: 'last_week', label: 'Last Week' },
    { id: 'this_month', label: 'This Month' },
    { id: 'last_month', label: 'Last Month' },
    { id: 'custom', label: 'Custom Date Range' }
  ];

  const getMeetingFilterLabel = (f: MeetingDateFilterType) => {
    const found = meetingFilterOptions.find(o => o.id === f);
    return found ? found.label : 'Last Week';
  };

  const entireBizFilterOptions: { id: PeriodDateFilterType; label: string }[] = [
    { id: 'this_month', label: 'This Month' },
    { id: 'last_month', label: 'Last Month' },
    { id: 'last_3_months', label: 'Last 3 Months' },
    { id: 'custom', label: 'Custom Date Range' }
  ];

  const getEntireBizFilterLabel = (f: PeriodDateFilterType) => {
    const found = entireBizFilterOptions.find(o => o.id === f);
    return found ? found.label : 'Last 3 Months';
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-8 pb-20">
      {/* Error Banner if Supabase fetch encountered an error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-sm font-semibold text-red-300">{error}</p>
          </div>
          <button
            type="button"
            onClick={fetchReportData}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-bold transition-colors"
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      )}

      {/* ====================================================
          1. MEETING ATTENDANCE SUMMARY (LOGGED-IN USER'S CHAPTER ONLY)
         ==================================================== */}
      <section className="bg-[#111827] border border-white/5 rounded-[24px] p-5 sm:p-7 shadow-[0_8px_32px_rgba(0,0,0,0.45)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#E53935]/15 border border-[#E53935]/30 flex items-center justify-center text-[#E53935]">
                <Calendar size={18} />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Meeting Attendance Summary
              </h1>
            </div>
            <p className="text-xs font-semibold text-[#9CA3AF] mt-1.5">
              Period ({getMeetingFilterLabel(meetingDateFilter)}):{' '}
              <span className="text-white">{meetingDateRangeInfo.label}</span>
            </p>
          </div>

          {/* Single Filter Button */}
          <div className="relative self-start sm:self-auto" ref={meetingFilterRef}>
            <button
              type="button"
              onClick={() => setMeetingFilterOpen(prev => !prev)}
              className="inline-flex items-center gap-2 px-4 py-2.5 h-10 rounded-xl text-xs font-bold bg-[#0B1220] hover:bg-[#151C2E] text-white border border-white/10 transition-all cursor-pointer"
            >
              <Filter size={14} className="text-[#E53935]" />
              <span>Filter</span>
              <span className="text-[#9CA3AF] font-semibold">
                ({getMeetingFilterLabel(meetingDateFilter)})
              </span>
              <ChevronDown
                size={14}
                className={cn(
                  'text-[#9CA3AF] transition-transform',
                  meetingFilterOpen && 'rotate-180'
                )}
              />
            </button>

            {meetingFilterOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-[#0B1220] border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.65)] py-1.5 z-30">
                {meetingFilterOptions.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setMeetingDateFilter(option.id);
                      setMeetingFilterOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-3.5 py-2.5 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer',
                      meetingDateFilter === option.id
                        ? 'bg-[#E53935]/15 text-[#E53935]'
                        : 'text-neutral-300 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <span>{option.label}</span>
                    {meetingDateFilter === option.id && (
                      <span className="w-2 h-2 rounded-full bg-[#E53935]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Custom Date Range Inputs */}
        {meetingDateFilter === 'custom' && (
          <div className="bg-[#0B1220] border border-white/5 rounded-2xl p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1.5">
                  Start Date
                </label>
                <input
                  type="date"
                  value={meetingCustomStart}
                  onChange={e => setMeetingCustomStart(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#111827] border border-white/10 text-white text-sm font-medium focus:outline-none focus:border-[#E53935] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1.5">
                  End Date
                </label>
                <input
                  type="date"
                  value={meetingCustomEnd}
                  onChange={e => setMeetingCustomEnd(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#111827] border border-white/10 text-white text-sm font-medium focus:outline-none focus:border-[#E53935] transition-colors"
                />
              </div>
            </div>

            {meetingDateRangeInfo.isInvalid && meetingDateRangeInfo.errorMessage && (
              <div className="flex items-center gap-2 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5">
                <AlertCircle size={15} className="shrink-0" />
                <span>{meetingDateRangeInfo.errorMessage}</span>
              </div>
            )}
          </div>
        )}

        {/* 4 Summary Cards: PRESENT, ABSENT, GUEST COUNT, TOTAL MEETINGS */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="bg-[#0B1220] border border-white/5 rounded-2xl p-6 h-28 animate-pulse flex flex-col justify-between"
              >
                <div className="w-24 h-3 bg-white/10 rounded" />
                <div className="w-16 h-7 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. PRESENT */}
            <div className="bg-[#0B1220] border border-white/5 rounded-2xl p-5 sm:p-6 flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold text-[#9CA3AF] uppercase tracking-wider block">
                  PRESENT
                </span>
                <span className="text-3xl sm:text-4xl font-black text-emerald-400 mt-2 block">
                  {meetingSummaryStats.presentCount}
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 size={24} />
              </div>
            </div>

            {/* 2. ABSENT */}
            <div className="bg-[#0B1220] border border-white/5 rounded-2xl p-5 sm:p-6 flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold text-[#9CA3AF] uppercase tracking-wider block">
                  ABSENT
                </span>
                <span className="text-3xl sm:text-4xl font-black text-red-400 mt-2 block">
                  {meetingSummaryStats.absentCount}
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                <XCircle size={24} />
              </div>
            </div>

            {/* 3. GUEST COUNT */}
            <div className="bg-[#0B1220] border border-white/5 rounded-2xl p-5 sm:p-6 flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold text-[#9CA3AF] uppercase tracking-wider block">
                  GUEST COUNT
                </span>
                <span className="text-3xl sm:text-4xl font-black text-amber-400 mt-2 block">
                  {meetingSummaryStats.guestCount}
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <UserPlus size={24} />
              </div>
            </div>

            {/* 4. TOTAL MEETINGS */}
            <div className="bg-[#0B1220] border border-white/5 rounded-2xl p-5 sm:p-6 flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold text-[#9CA3AF] uppercase tracking-wider block">
                  TOTAL MEETINGS
                </span>
                <span className="text-3xl sm:text-4xl font-black text-blue-400 mt-2 block">
                  {meetingSummaryStats.totalMeetings}
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                <Calendar size={24} />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ====================================================
          2. LAST MONTH CONTRIBUTION (LOGGED-IN USER'S CHAPTER ONLY)
         ==================================================== */}
      <section className="bg-[#111827] border border-white/5 rounded-[24px] p-5 sm:p-7 shadow-[0_8px_32px_rgba(0,0,0,0.45)] space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/5 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Trophy size={18} />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Last Month Contribution
              </h2>
            </div>
            <p className="text-xs font-semibold text-[#9CA3AF] mt-1.5">
              Period ({getEntireBizFilterLabel(contributorsDateFilter)}):{' '}
              <span className="text-white">{contributorsDateRangeInfo.label}</span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            {/* Associate Selector (Logged-in Chapter Members Only) */}
            <div className="w-full sm:w-64">
              <label
                htmlFor="associate-selector"
                className="block text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1.5"
              >
                Associate
              </label>
              <div className="relative">
                <Users
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none"
                />
                <select
                  id="associate-selector"
                  value={selectedAssociateId}
                  onChange={e => setSelectedAssociateId(e.target.value)}
                  className="w-full h-10 pl-9 pr-4 rounded-xl bg-[#0B1220] border border-white/10 text-white text-xs sm:text-sm font-bold focus:outline-none focus:border-[#E53935] transition-colors"
                >
                  <option value="ALL">All Members</option>
                  {activeChapterAssociates.map(member => {
                    const mId = String(member.uid || member.id);
                    const mName = getCleanFullName(
                      member.name ||
                        (member as any).full_name ||
                        (member as any).displayName ||
                        'Member'
                    );
                    const mCat = member.category || (member as any).business_category || 'No Category';
                    return (
                      <option key={mId} value={mId}>
                        {mName} — Category: {mCat}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Single Filter Button */}
            <div className="relative self-start sm:self-auto" ref={contributorsFilterRef}>
              <button
                type="button"
                onClick={() => setContributorsFilterOpen(prev => !prev)}
                className="inline-flex items-center gap-2 px-4 py-2.5 h-10 rounded-xl text-xs font-bold bg-[#0B1220] hover:bg-[#151C2E] text-white border border-white/10 transition-all cursor-pointer"
              >
                <Filter size={14} className="text-[#E53935]" />
                <span>Filter</span>
                <span className="text-[#9CA3AF] font-semibold">
                  ({getEntireBizFilterLabel(contributorsDateFilter)})
                </span>
                <ChevronDown
                  size={14}
                  className={cn(
                    'text-[#9CA3AF] transition-transform',
                    contributorsFilterOpen && 'rotate-180'
                  )}
                />
              </button>

              {contributorsFilterOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-[#0B1220] border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.65)] py-1.5 z-30">
                  {entireBizFilterOptions.map(option => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setContributorsDateFilter(option.id);
                        setContributorsFilterOpen(false);
                      }}
                      className={cn(
                        'w-full text-left px-3.5 py-2.5 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer',
                        contributorsDateFilter === option.id
                          ? 'bg-[#E53935]/15 text-[#E53935]'
                          : 'text-neutral-300 hover:bg-white/5 hover:text-white'
                      )}
                    >
                      <span>{option.label}</span>
                      {contributorsDateFilter === option.id && (
                        <span className="w-2 h-2 rounded-full bg-[#E53935]" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Custom Date Range Inputs for Section 2 */}
        {contributorsDateFilter === 'custom' && (
          <div className="bg-[#0B1220] border border-white/5 rounded-2xl p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1.5">
                  Start Date
                </label>
                <input
                  type="date"
                  value={contributorsCustomStart}
                  onChange={e => setContributorsCustomStart(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#111827] border border-white/10 text-white text-sm font-medium focus:outline-none focus:border-[#E53935] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1.5">
                  End Date
                </label>
                <input
                  type="date"
                  value={contributorsCustomEnd}
                  onChange={e => setContributorsCustomEnd(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#111827] border border-white/10 text-white text-sm font-medium focus:outline-none focus:border-[#E53935] transition-colors"
                />
              </div>
            </div>

            {contributorsDateRangeInfo.isInvalid && contributorsDateRangeInfo.errorMessage && (
              <div className="flex items-center gap-2 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5">
                <AlertCircle size={15} className="shrink-0" />
                <span>{contributorsDateRangeInfo.errorMessage}</span>
              </div>
            )}
          </div>
        )}

        {/* 3 Top Contributor Areas */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="bg-[#0B1220] border border-white/5 rounded-2xl p-5 h-60 animate-pulse space-y-4"
              >
                <div className="w-36 h-4 bg-white/10 rounded" />
                <div className="space-y-3">
                  <div className="w-full h-12 bg-white/5 rounded-xl" />
                  <div className="w-full h-12 bg-white/5 rounded-xl" />
                  <div className="w-full h-12 bg-white/5 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* A. TOP REFERRAL */}
            <div className="bg-[#0B1220] border border-white/5 rounded-2xl p-5 flex flex-col">
              <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#E53935]/15 border border-[#E53935]/30 flex items-center justify-center text-[#E53935]">
                    <Share2 size={16} />
                  </div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Top Referral
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">
                  {selectedAssociateId === 'ALL' ? 'Top 3' : 'Associate'}
                </span>
              </div>

              {lastMonthContributors.topReferrals.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-xs font-semibold text-[#9CA3AF]">
                    No referrals recorded for selected period
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {lastMonthContributors.topReferrals.map(item => (
                    <div
                      key={item.memberId}
                      className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[#111827] border border-white/5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-xs font-black border shrink-0',
                            getRankBadgeStyle(item.rank)
                          )}
                        >
                          {item.rank > 0 ? `#${item.rank}` : '—'}
                        </span>
                        <span className="text-sm font-bold text-white truncate">
                          {item.name}
                        </span>
                      </div>
                      <span className="text-xs sm:text-sm font-extrabold text-[#E53935] shrink-0">
                        {item.count} {item.count === 1 ? 'Referral' : 'Referrals'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* B. TOP BUSINESS GIVEN */}
            <div className="bg-[#0B1220] border border-white/5 rounded-2xl p-5 flex flex-col">
              <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Handshake size={16} />
                  </div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Top Business Given
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">
                  {selectedAssociateId === 'ALL' ? 'Top 3' : 'Associate'}
                </span>
              </div>

              {lastMonthContributors.topBusinessGiven.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-xs font-semibold text-[#9CA3AF]">
                    No business given recorded for selected period
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {lastMonthContributors.topBusinessGiven.map(item => (
                    <div
                      key={item.memberId}
                      className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[#111827] border border-white/5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-xs font-black border shrink-0',
                            getRankBadgeStyle(item.rank)
                          )}
                        >
                          {item.rank > 0 ? `#${item.rank}` : '—'}
                        </span>
                        <div className="min-w-0">
                          <span className="text-sm font-bold text-white truncate block">
                            {item.name}
                          </span>
                          <span className="text-[11px] font-semibold text-[#9CA3AF] block">
                            {item.count} {item.count === 1 ? 'Business Slip' : 'Business Slips'}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs sm:text-sm font-extrabold text-emerald-400 shrink-0">
                        ₹{item.amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* C. TOP VISITOR GOT IN */}
            <div className="bg-[#0B1220] border border-white/5 rounded-2xl p-5 flex flex-col">
              <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <UserPlus size={16} />
                  </div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Top Visitor Got In
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">
                  {selectedAssociateId === 'ALL' ? 'Top 3' : 'Associate'}
                </span>
              </div>

              {lastMonthContributors.topVisitors.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-xs font-semibold text-[#9CA3AF]">
                    No visitors recorded for selected period
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {lastMonthContributors.topVisitors.map(item => (
                    <div
                      key={item.memberId}
                      className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[#111827] border border-white/5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-xs font-black border shrink-0',
                            getRankBadgeStyle(item.rank)
                          )}
                        >
                          {item.rank > 0 ? `#${item.rank}` : '—'}
                        </span>
                        <span className="text-sm font-bold text-white truncate">
                          {item.name}
                        </span>
                      </div>
                      <span className="text-xs sm:text-sm font-extrabold text-blue-400 shrink-0">
                        {item.count} {item.count === 1 ? 'Visitor' : 'Visitors'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ====================================================
          3. ENTIRE CHAPTER PERFORMANCE
         ==================================================== */}
      <section className="bg-[#111827] border border-white/5 rounded-[24px] p-5 sm:p-7 shadow-[0_8px_32px_rgba(0,0,0,0.45)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Globe size={18} />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Entire Chapter Performance
              </h2>
            </div>
            <p className="text-xs font-semibold text-[#9CA3AF] mt-1.5">
              Period ({getEntireBizFilterLabel(entireBizDateFilter)}):{' '}
              <span className="text-white">{entireBizDateRangeInfo.label}</span>
            </p>
          </div>

          {/* Single Filter Button for Entire Chapter Performance */}
          <div className="relative self-start sm:self-auto" ref={entireBizFilterRef}>
            <button
              type="button"
              onClick={() => setEntireBizDropdownOpen(prev => !prev)}
              className="inline-flex items-center gap-2 px-4 py-2.5 h-10 rounded-xl text-xs font-bold bg-[#0B1220] hover:bg-[#151C2E] text-white border border-white/10 transition-all cursor-pointer"
              aria-label="Filter Entire Chapter Performance"
            >
              <Filter size={14} className="text-[#E53935]" />
              <span>Filter</span>
              <span className="text-[#9CA3AF] font-semibold">
                ({getEntireBizFilterLabel(entireBizDateFilter)})
              </span>
              <ChevronDown
                size={14}
                className={cn(
                  'text-[#9CA3AF] transition-transform',
                  entireBizDropdownOpen && 'rotate-180'
                )}
              />
            </button>

            {entireBizDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-[#0B1220] border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.65)] py-1.5 z-30">
                {entireBizFilterOptions.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setEntireBizDateFilter(option.id);
                      setEntireBizDropdownOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-3.5 py-2.5 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer',
                      entireBizDateFilter === option.id
                        ? 'bg-[#E53935]/15 text-[#E53935]'
                        : 'text-neutral-300 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <span>{option.label}</span>
                    {entireBizDateFilter === option.id && (
                      <span className="w-2 h-2 rounded-full bg-[#E53935]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Custom Date Range Inputs for Section 3 */}
        {entireBizDateFilter === 'custom' && (
          <div className="bg-[#0B1220] border border-white/5 rounded-2xl p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1.5">
                  Start Date
                </label>
                <input
                  type="date"
                  value={entireBizCustomStart}
                  onChange={e => setEntireBizCustomStart(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#111827] border border-white/10 text-white text-sm font-medium focus:outline-none focus:border-[#E53935] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1.5">
                  End Date
                </label>
                <input
                  type="date"
                  value={entireBizCustomEnd}
                  onChange={e => setEntireBizCustomEnd(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#111827] border border-white/10 text-white text-sm font-medium focus:outline-none focus:border-[#E53935] transition-colors"
                />
              </div>
            </div>

            {entireBizDateRangeInfo.isInvalid && entireBizDateRangeInfo.errorMessage && (
              <div className="flex items-center gap-2 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5">
                <AlertCircle size={15} className="shrink-0" />
                <span>{entireBizDateRangeInfo.errorMessage}</span>
              </div>
            )}
          </div>
        )}

        {/* 3 Metrics:
            1. AVERAGE 3 MONTH REFERRALS GIVEN
            2. AVERAGE 3 MONTH BUSINESS GIVEN
            3. AVERAGE 3 MONTH VISITORS GOT IN */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="bg-[#0B1220] border border-white/5 rounded-2xl p-6 h-28 animate-pulse flex flex-col justify-between"
              >
                <div className="w-36 h-3 bg-white/10 rounded" />
                <div className="w-20 h-7 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 1. AVERAGE 3 MONTH REFERRALS GIVEN */}
            <div className="bg-[#0B1220] border border-white/5 rounded-2xl p-5 sm:p-6 flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold text-[#9CA3AF] uppercase tracking-wider block">
                  AVERAGE 3 MONTH REFERRALS GIVEN
                </span>
                <span className="text-3xl sm:text-4xl font-black text-[#E53935] mt-2 block">
                  {formatAverageMetric(entireBusinessPerformanceStats.avgReferrals)}
                </span>
                <span className="text-[11px] font-semibold text-[#9CA3AF] mt-1.5 block">
                  Total: {entireBusinessPerformanceStats.totalReferrals}{' '}
                  {entireBusinessPerformanceStats.totalReferrals === 1 ? 'Referral' : 'Referrals'}{' '}
                  ({entireBusinessPerformanceStats.monthsCount}{' '}
                  {entireBusinessPerformanceStats.monthsCount === 1 ? 'Month' : 'Months'})
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#E53935]/10 border border-[#E53935]/20 flex items-center justify-center text-[#E53935] shrink-0">
                <Share2 size={24} />
              </div>
            </div>

            {/* 2. AVERAGE 3 MONTH BUSINESS GIVEN */}
            <div className="bg-[#0B1220] border border-white/5 rounded-2xl p-5 sm:p-6 flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold text-[#9CA3AF] uppercase tracking-wider block">
                  AVERAGE 3 MONTH BUSINESS GIVEN
                </span>
                <span className="text-3xl sm:text-4xl font-black text-emerald-400 mt-2 block">
                  {formatAverageCurrency(entireBusinessPerformanceStats.avgBusinessGiven)}
                </span>
                <span className="text-[11px] font-semibold text-[#9CA3AF] mt-1.5 block">
                  Total: ₹{entireBusinessPerformanceStats.totalBusinessGiven.toLocaleString('en-IN')}{' '}
                  ({entireBusinessPerformanceStats.monthsCount}{' '}
                  {entireBusinessPerformanceStats.monthsCount === 1 ? 'Month' : 'Months'})
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Handshake size={24} />
              </div>
            </div>

            {/* 3. AVERAGE 3 MONTH VISITORS GOT IN */}
            <div className="bg-[#0B1220] border border-white/5 rounded-2xl p-5 sm:p-6 flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold text-[#9CA3AF] uppercase tracking-wider block">
                  AVERAGE 3 MONTH VISITORS GOT IN
                </span>
                <span className="text-3xl sm:text-4xl font-black text-blue-400 mt-2 block">
                  {formatAverageMetric(entireBusinessPerformanceStats.avgVisitorsGotIn)}
                </span>
                <span className="text-[11px] font-semibold text-[#9CA3AF] mt-1.5 block">
                  Total: {entireBusinessPerformanceStats.totalVisitorsGotIn}{' '}
                  {entireBusinessPerformanceStats.totalVisitorsGotIn === 1 ? 'Visitor' : 'Visitors'}{' '}
                  ({entireBusinessPerformanceStats.monthsCount}{' '}
                  {entireBusinessPerformanceStats.monthsCount === 1 ? 'Month' : 'Months'})
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                <UserPlus size={24} />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ====================================================
          4. WEEKLY PERFORMANCE OF CHAPTER (LOGGED-IN CHAPTER ONLY)
         ==================================================== */}
      <section className="bg-[#111827] border border-white/5 rounded-[24px] p-5 sm:p-7 shadow-[0_8px_32px_rgba(0,0,0,0.45)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <TrendingUp size={18} />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Weekly Performance of Chapter
              </h2>
            </div>
            <p className="text-xs font-semibold text-[#9CA3AF] mt-1.5">
              Chapter:{' '}
              <span className="text-white font-bold">
                {loggedInChapterObj?.name ||
                  (loggedInChapterObj as any)?.chapter_name ||
                  'Logged-in Chapter'}
              </span>{' '}
              • Period ({getWeeklyChapterFilterLabel(weeklyChapterFilter)}):{' '}
              <span className="text-white">{weeklyChapterDateRangeInfo.label}</span>
            </p>
          </div>

          {/* Performance Filter Button */}
          <div className="relative self-start sm:self-auto" ref={weeklyChapterFilterRef}>
            <button
              type="button"
              onClick={() => setWeeklyChapterFilterOpen(prev => !prev)}
              className="inline-flex items-center gap-2 px-4 py-2.5 h-10 rounded-xl text-xs font-bold bg-[#0B1220] hover:bg-[#151C2E] text-white border border-white/10 transition-all cursor-pointer"
            >
              <Filter size={14} className="text-[#E53935]" />
              <span>Filter</span>
              <span className="text-[#9CA3AF] font-semibold">
                ({getWeeklyChapterFilterLabel(weeklyChapterFilter)})
              </span>
              <ChevronDown
                size={14}
                className={cn(
                  'text-[#9CA3AF] transition-transform',
                  weeklyChapterFilterOpen && 'rotate-180'
                )}
              />
            </button>

            {weeklyChapterFilterOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-[#0B1220] border border-white/10 rounded-2xl shadow-2xl py-1.5 z-30">
                {weeklyChapterFilterOptions.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setWeeklyChapterFilter(option.id);
                      setWeeklyChapterFilterOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-4 py-2.5 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer',
                      weeklyChapterFilter === option.id
                        ? 'bg-[#E53935]/15 text-[#E53935]'
                        : 'text-neutral-300 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <span>{option.label}</span>
                    {weeklyChapterFilter === option.id && (
                      <span className="w-2 h-2 rounded-full bg-[#E53935]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Custom Date Range Inputs */}
        {weeklyChapterFilter === 'custom' && (
          <div className="bg-[#0B1220] border border-white/5 rounded-2xl p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1.5">
                  Start Date
                </label>
                <input
                  type="date"
                  value={weeklyChapterCustomStart}
                  onChange={e => setWeeklyChapterCustomStart(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#111827] border border-white/10 text-white text-sm font-medium focus:outline-none focus:border-[#E53935] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1.5">
                  End Date
                </label>
                <input
                  type="date"
                  value={weeklyChapterCustomEnd}
                  onChange={e => setWeeklyChapterCustomEnd(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#111827] border border-white/10 text-white text-sm font-medium focus:outline-none focus:border-[#E53935] transition-colors"
                />
              </div>
            </div>

            {weeklyChapterDateRangeInfo.isInvalid && weeklyChapterDateRangeInfo.errorMessage && (
              <div className="flex items-center gap-2 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5">
                <AlertCircle size={15} className="shrink-0" />
                <span>{weeklyChapterDateRangeInfo.errorMessage}</span>
              </div>
            )}
          </div>
        )}

        {/* 5 Metrics: Total Referrals, Total Business, Total 1-to-1 Meetings, Total Visitors, Total Testimonials */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                className="bg-[#0B1220] border border-white/5 rounded-2xl p-6 h-28 animate-pulse flex flex-col justify-between"
              >
                <div className="w-24 h-3 bg-white/10 rounded" />
                <div className="w-16 h-7 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* 1. Total Referrals */}
            <div className="bg-[#0B1220] border border-white/5 rounded-2xl p-5 sm:p-6 flex items-center justify-between hover:border-[#E53935]/30 transition-colors">
              <div>
                <span className="text-xs font-extrabold text-[#9CA3AF] uppercase tracking-wider block">
                  Total Referrals
                </span>
                <span className="text-3xl sm:text-4xl font-black text-[#E53935] mt-2 block">
                  {weeklyChapterPerformanceStats.totalReferrals}
                </span>
                <span className="text-[11px] font-semibold text-[#9CA3AF] mt-1 block">
                  {weeklyChapterPerformanceStats.totalReferrals === 1 ? 'Referral' : 'Referrals'}{' '}
                  recorded
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#E53935]/10 border border-[#E53935]/20 flex items-center justify-center text-[#E53935] shrink-0">
                <Share2 size={24} />
              </div>
            </div>

            {/* 2. Total Business */}
            <div className="bg-[#0B1220] border border-white/5 rounded-2xl p-5 sm:p-6 flex items-center justify-between hover:border-emerald-500/30 transition-colors">
              <div>
                <span className="text-xs font-extrabold text-[#9CA3AF] uppercase tracking-wider block">
                  Total Business
                </span>
                <span className="text-3xl sm:text-4xl font-black text-emerald-400 mt-2 block">
                  ₹{weeklyChapterPerformanceStats.totalBusiness.toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] font-semibold text-[#9CA3AF] mt-1 block">
                  Business value generated
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Handshake size={24} />
              </div>
            </div>

            {/* 3. Total 1-to-1 Meetings */}
            <div className="bg-[#0B1220] border border-white/5 rounded-2xl p-5 sm:p-6 flex items-center justify-between hover:border-purple-500/30 transition-colors">
              <div>
                <span className="text-xs font-extrabold text-[#9CA3AF] uppercase tracking-wider block">
                  Total 1-to-1 Meetings
                </span>
                <span className="text-3xl sm:text-4xl font-black text-purple-400 mt-2 block">
                  {weeklyChapterPerformanceStats.totalOneToOnes}
                </span>
                <span className="text-[11px] font-semibold text-[#9CA3AF] mt-1 block">
                  {weeklyChapterPerformanceStats.totalOneToOnes === 1
                    ? '1-to-1 Meeting'
                    : '1-to-1 Meetings'}
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                <Users size={24} />
              </div>
            </div>

            {/* 4. Total Visitors (ONLY PRESENT) */}
            <div className="bg-[#0B1220] border border-white/5 rounded-2xl p-5 sm:p-6 flex items-center justify-between hover:border-blue-500/30 transition-colors">
              <div>
                <span className="text-xs font-extrabold text-[#9CA3AF] uppercase tracking-wider block">
                  Total Visitors
                </span>
                <span className="text-3xl sm:text-4xl font-black text-blue-400 mt-2 block">
                  {weeklyChapterPerformanceStats.totalVisitors}
                </span>
                <span className="text-[11px] font-semibold text-[#9CA3AF] mt-1 block">
                  Present visitors only
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                <UserPlus size={24} />
              </div>
            </div>

            {/* 5. Total Testimonials (SENT + RECEIVED) */}
            <div className="bg-[#0B1220] border border-white/5 rounded-2xl p-5 sm:p-6 flex items-center justify-between hover:border-amber-500/30 transition-colors">
              <div>
                <span className="text-xs font-extrabold text-[#9CA3AF] uppercase tracking-wider block">
                  Total Testimonials
                </span>
                <span className="text-3xl sm:text-4xl font-black text-amber-400 mt-2 block">
                  {weeklyChapterPerformanceStats.totalTestimonials}
                </span>
                <span className="text-[11px] font-semibold text-[#9CA3AF] mt-1 block">
                  {weeklyChapterPerformanceStats.totalTestimonials === 1
                    ? 'Testimonial'
                    : 'Testimonials'}{' '}
                  exchanged
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Star size={24} />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ====================================================
          5. TOP PERFORMANCE OF THE WEEK (LAST COMPLETED WEEK — LOGGED-IN CHAPTER)
         ==================================================== */}
      <section className="bg-[#111827] border border-white/5 rounded-[24px] p-5 sm:p-7 shadow-[0_8px_32px_rgba(0,0,0,0.45)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Trophy size={18} />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Top Performance of the Week
              </h2>
            </div>
            <p className="text-xs font-semibold text-[#9CA3AF] mt-1.5">
              Chapter:{' '}
              <span className="text-white font-bold">
                {loggedInChapterObj?.name ||
                  (loggedInChapterObj as any)?.chapter_name ||
                  'Logged-in Chapter'}
              </span>{' '}
              • Last Completed Week:{' '}
              <span className="text-white">{topPerformanceOfTheWeek.dateLabel}</span>
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0B1220] border border-white/10 text-xs font-bold text-amber-400 self-start sm:self-auto">
            <BarChart3 size={14} />
            <span>Ranked by Growth Score (Last Week)</span>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="bg-[#0B1220] border border-white/5 rounded-2xl p-4 h-20 animate-pulse flex items-center justify-between gap-3"
              >
                <div className="w-36 h-4 bg-white/10 rounded" />
                <div className="w-16 h-6 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        ) : topPerformanceOfTheWeek.topPerformers.length === 0 ? (
          <div className="bg-[#0B1220] border border-white/5 rounded-2xl p-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
              <Trophy size={22} />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              No Top Performer Activity Recorded for Last Week
            </h3>
            <p className="text-xs font-semibold text-[#9CA3AF] max-w-md mx-auto">
              No completed workspace tasks or member performance activity were recorded for{' '}
              {topPerformanceOfTheWeek.dateLabel}.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 3 Identical Compact Cards (#1, #2, #3) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {topPerformanceOfTheWeek.topPerformers.map(performer => {
                const isSelected = selectedTopPerformerId === performer.memberId;
                return (
                  <button
                    key={performer.memberId}
                    type="button"
                    onClick={() =>
                      setSelectedTopPerformerId(prev =>
                        prev === performer.memberId ? null : performer.memberId
                      )
                    }
                    className={cn(
                      'w-full text-left bg-[#0B1220] border rounded-2xl p-4 flex items-center justify-between gap-3 transition-colors cursor-pointer',
                      isSelected
                        ? 'border-white/20'
                        : 'border-white/5 hover:border-white/15'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-black border shrink-0 bg-slate-400/15 text-slate-300 border-slate-400/30">
                        #{performer.rank}
                      </span>
                      <div className="min-w-0">
                        <span className="text-sm font-bold text-white truncate block">
                          {performer.name}
                        </span>
                        <span className="text-[11px] font-semibold text-[#9CA3AF] truncate block">
                          Tasks: {performer.completedTasks}/{performer.totalTasks} • Refs:{' '}
                          {performer.referralsCount}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-emerald-400 block">
                        {performer.growthScore}%
                      </span>
                      <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase">
                        Growth Score
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Expanded Full Performance Details when a Card (#1, #2, or #3) is Clicked */}
            {(() => {
              const selectedPerformer = topPerformanceOfTheWeek.topPerformers.find(
                p => p.memberId === selectedTopPerformerId
              );
              if (!selectedPerformer) return null;

              return (
                <div className="bg-[#0B1220] border border-amber-500/25 rounded-2xl p-5 sm:p-6 space-y-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="relative shrink-0">
                        {selectedPerformer.photoURL ? (
                          <img
                            src={selectedPerformer.photoURL}
                            alt={selectedPerformer.name}
                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-amber-500/40"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-500/15 border-2 border-amber-500/30 flex items-center justify-center text-amber-400 text-lg sm:text-xl font-black">
                            {selectedPerformer.name
                              .split(' ')
                              .filter(Boolean)
                              .slice(0, 2)
                              .map(part => part[0]?.toUpperCase())
                              .join('')}
                          </div>
                        )}
                        <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-lg bg-amber-500 text-neutral-950 text-[10px] font-black shadow">
                          #{selectedPerformer.rank}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            Top Performer of the Week
                          </span>
                          <span
                            className={cn(
                              'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border',
                              selectedPerformer.statusColor
                            )}
                          >
                            {selectedPerformer.status}
                          </span>
                        </div>
                        <h3 className="text-lg sm:text-2xl font-black text-white mt-1.5 truncate">
                          {selectedPerformer.name}
                        </h3>
                        <p className="text-xs font-semibold text-[#9CA3AF] truncate mt-0.5">
                          {selectedPerformer.businessName
                            ? `${selectedPerformer.businessName} • `
                            : ''}
                          Category: {selectedPerformer.category}
                        </p>
                      </div>
                    </div>

                    {/* Growth Score Badge */}
                    <div className="bg-[#111827] border border-emerald-500/30 rounded-2xl px-5 py-3.5 flex items-center justify-between md:justify-end gap-4 shrink-0">
                      <div>
                        <span className="text-[10px] font-extrabold text-[#9CA3AF] uppercase tracking-wider block">
                          Growth Score
                        </span>
                        <span className="text-2xl sm:text-3xl font-black text-emerald-400 mt-0.5 block">
                          {selectedPerformer.growthScore}%
                        </span>
                        <span className="text-[10px] font-semibold text-[#9CA3AF] block">
                          Tasks: {selectedPerformer.completedTasks} /{' '}
                          {selectedPerformer.totalTasks} completed
                        </span>
                      </div>
                      <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <TrendingUp size={22} />
                      </div>
                    </div>
                  </div>

                  {/* Relevant Performance Summary / Details for Last Week */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div className="bg-[#111827] border border-white/5 rounded-xl p-3.5">
                      <span className="text-[10px] font-extrabold text-[#9CA3AF] uppercase tracking-wider block">
                        Tasks Completed
                      </span>
                      <span className="text-lg sm:text-xl font-black text-amber-400 mt-1 block">
                        {selectedPerformer.completedTasks} / {selectedPerformer.totalTasks}
                      </span>
                      <span className="text-[10px] font-semibold text-[#9CA3AF] block mt-0.5">
                        Workspace tasks
                      </span>
                    </div>

                    <div className="bg-[#111827] border border-white/5 rounded-xl p-3.5">
                      <span className="text-[10px] font-extrabold text-[#9CA3AF] uppercase tracking-wider block">
                        Referrals Given
                      </span>
                      <span className="text-lg sm:text-xl font-black text-[#E53935] mt-1 block">
                        {selectedPerformer.referralsCount}
                      </span>
                      <span className="text-[10px] font-semibold text-[#9CA3AF] block mt-0.5">
                        Last week
                      </span>
                    </div>

                    <div className="bg-[#111827] border border-white/5 rounded-xl p-3.5">
                      <span className="text-[10px] font-extrabold text-[#9CA3AF] uppercase tracking-wider block">
                        Business Given
                      </span>
                      <span className="text-lg sm:text-xl font-black text-emerald-400 mt-1 block">
                        ₹{selectedPerformer.businessAmount.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] font-semibold text-[#9CA3AF] block mt-0.5">
                        Last week
                      </span>
                    </div>

                    <div className="bg-[#111827] border border-white/5 rounded-xl p-3.5">
                      <span className="text-[10px] font-extrabold text-[#9CA3AF] uppercase tracking-wider block">
                        1-to-1 Meetings
                      </span>
                      <span className="text-lg sm:text-xl font-black text-purple-400 mt-1 block">
                        {selectedPerformer.oneToOnesCount}
                      </span>
                      <span className="text-[10px] font-semibold text-[#9CA3AF] block mt-0.5">
                        Last week
                      </span>
                    </div>

                    <div className="bg-[#111827] border border-white/5 rounded-xl p-3.5 col-span-2 sm:col-span-1">
                      <span className="text-[10px] font-extrabold text-[#9CA3AF] uppercase tracking-wider block">
                        Visitors (Present)
                      </span>
                      <span className="text-lg sm:text-xl font-black text-blue-400 mt-1 block">
                        {selectedPerformer.visitorsCount}
                      </span>
                      <span className="text-[10px] font-semibold text-[#9CA3AF] block mt-0.5">
                        Last week
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </section>
    </div>
  );
}
