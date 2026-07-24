import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, Calendar, ArrowUpRight, ArrowDownLeft, ChevronLeft, 
  Award, Users, Handshake, Share2, 
  UserPlus, Clock, ArrowRight, Trophy, DollarSign, Sparkles,
  Search, Filter, X
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import { Meeting, Referral, OneToOneMeeting, GuestInvitation, ThankYouSlip } from '../types';
import { cn } from '../lib/utils';
import { calculateMemberGrowthScore } from '../utils/growthScore';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer 
} from 'recharts';

import { format as originalFormat, isValid } from 'date-fns';
import { getCleanFullName } from '../utils/authUtils';

const format = (date: any, formatStr: string, options?: any) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  return isValid(d) ? originalFormat(d, formatStr, options) : 'N/A';
};

const getUserFullName = (user: any): string => {
  if (!user) return '';
  const rawName = user.full_name || user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim();
  if (!rawName) return '';
  return getCleanFullName(rawName);
};

const formatUserRoleOrPosition = (user: any): string => {
  if (!user) return 'Member';
  const role = user.role;
  if (role) {
    const rUpper = String(role).toUpperCase().trim();
    if (rUpper === 'PRESIDENT') return 'President';
    if (rUpper === 'VICE_PRESIDENT') return 'Vice President';
    if (rUpper === 'TREASURER') return 'Treasurer';
    if (rUpper === 'CHAPTER_ADMIN') return 'Chapter Admin';
    if (rUpper === 'MASTER_ADMIN') return 'Master Admin';
    if (rUpper === 'MEMBER') return 'Member';
  }
  return 'Member';
};

export function MyReport() {
  const { profile } = useAuth();
  
  // Loading & State
  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [passedReferrals, setPassedReferrals] = useState<Referral[]>([]);
  const [receivedReferrals, setReceivedReferrals] = useState<Referral[]>([]);
  const [oneToOnes, setOneToOnes] = useState<OneToOneMeeting[]>([]);
  const [guestInvitations, setGuestInvitations] = useState<GuestInvitation[]>([]);
  const [sentThankYouSlips, setSentThankYouSlips] = useState<ThankYouSlip[]>([]);
  const [receivedThankYouSlips, setReceivedThankYouSlips] = useState<ThankYouSlip[]>([]);
  const [givenTestimonials, setGivenTestimonials] = useState<any[]>([]);
  const [receivedTestimonials, setReceivedTestimonials] = useState<any[]>([]);
  const [allUsersList, setAllUsersList] = useState<any[]>([]);
  const [allChaptersList, setAllChaptersList] = useState<any[]>([]);
  
  // Referral Search & Filter States
  const [referralSearchQuery, setReferralSearchQuery] = useState<string>('');
  const [referralStatusFilter, setReferralStatusFilter] = useState<string>('ALL');
  const [referralStartDate, setReferralStartDate] = useState<string>('');
  const [referralEndDate, setReferralEndDate] = useState<string>('');
  const [activeReferralTab, setActiveReferralTab] = useState<'inbound' | 'outbound' | 'all'>('inbound');

  // Period Filter: 'Monthly' | 'Quarterly' | 'Half Yearly' | 'Yearly' | 'Lifetime'
  const [selectedPeriod, setSelectedPeriod] = useState<string>('Monthly');

  // Modal State for Card Details
  const [activeModal, setActiveModal] = useState<'attendance' | 'referrals' | 'revenue' | 'onetoones' | null>(null);

  const userRole = profile?.role;
  const userPosition = String(profile?.position || profile?.chapter_position || '').toLowerCase().trim();
  const isMasterAdmin = userRole === 'MASTER_ADMIN';
  const isChapterAdmin = userRole === 'CHAPTER_ADMIN' || userPosition === 'chapter_admin';
  const isCardClickable = isChapterAdmin || isMasterAdmin;

  const getUserNameAndRole = (userId?: string) => {
    if (!userId) return { name: '', role: '' };
    const cleanId = String(userId).trim();
    const found = allUsersList.find((u: any) => String(u.id || u.uid || '').trim() === cleanId);
    if (!found) return { name: '', role: '' };
    return {
      name: getUserFullName(found) || '',
      role: formatUserRoleOrPosition(found) || ''
    };
  };

  const getUserFullDetails = (userId?: string) => {
    if (!userId) return { name: '', position: '', chapter: '' };
    const cleanId = String(userId).trim();
    if (!cleanId) return { name: '', position: '', chapter: '' };

    const found = allUsersList.find((u: any) => String(u.id || u.uid || '').trim() === cleanId);
    if (!found) return { name: '', position: '', chapter: '' };

    const name = getUserFullName(found) || found.name || found.full_name || '';
    const position = formatUserRoleOrPosition(found);

    let chapterName = found.chapter_name || found.chapterName || '';
    if (!chapterName && found.chapter_id) {
      const chap = allChaptersList.find((c: any) => String(c.id).trim() === String(found.chapter_id).trim());
      if (chap) {
        chapterName = chap.chapter_name || chap.name || '';
      }
    }

    return {
      name: name || '',
      position: position || '',
      chapter: chapterName || ''
    };
  };

  const formatDateOnly = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return format(d, 'yyyy-MM-dd');
    } catch {
      return dateStr || '';
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return format(d, 'yyyy-MM-dd hh:mm a');
    } catch {
      return dateStr || '';
    }
  };

  useEffect(() => {
    if (!profile) return;

    const currentUserId = String(profile.id || profile.uid || '').trim();
    if (!currentUserId) return;

    let isMounted = true;

    const userRole = profile.role;
    const userPosition = String(profile.position || profile.chapter_position || '').toLowerCase().trim();
    const userChapterId = String(profile.chapter_id || profile.chapterId || profile.adminId || '').trim();

    const isMasterAdmin = userRole === 'MASTER_ADMIN';
    const isChapterAdmin = userRole === 'CHAPTER_ADMIN' || userPosition === 'chapter_admin';
    const isRegularMember = !isMasterAdmin && !isChapterAdmin;

    const fetchAllAnalyticsData = async () => {
      try {
        // 0. Fetch Users and Chapters list for details mapping
        const { data: rawUsers } = await supabase.from('users').select('*');
        if (rawUsers) setAllUsersList(rawUsers);

        const { data: rawChapters } = await supabase.from('chapters').select('*');
        if (rawChapters) setAllChaptersList(rawChapters);

        // 1. Fetch Referrals directly from Supabase
        const { data: rawRefs, error: refErr } = await supabase
          .from('referrals')
          .select('*')
          .order('created_at', { ascending: false });

        if (refErr) console.warn('Supabase referrals fetch error:', refErr);

        const refMap = new Map<string, Referral>();
        (rawRefs || []).forEach((r: any) => {
          const senderId = String(r.sender_id || r.from_user_id || r.fromUserId || r.senderId || '').trim();
          const receiverId = String(r.receiver_id || r.to_user_id || r.toUserId || r.receiverId || '').trim();
          const item: Referral = {
            id: String(r.id),
            fromUserId: senderId,
            toUserId: receiverId,
            sender_id: senderId,
            receiver_id: receiverId,
            contactName: r.contact_name || r.contactName || '',
            contactPhone: r.contact_phone || r.contactPhone || '',
            requirement: r.requirement || r.notes || '',
            notes: r.notes || '',
            status: r.status || 'PENDING',
            createdAt: r.created_at || r.createdAt || new Date().toISOString(),
            chapter_id: r.chapter_id || r.chapterId
          };
          refMap.set(item.id, item);
        });
        const allUniqueRefs = Array.from(refMap.values());

        // 2. Fetch One-to-One Meetings
        const { data: raw1to1s, error: otoErr } = await supabase
          .from('one_to_one_meetings')
          .select('*')
          .order('created_at', { ascending: false });

        if (otoErr) console.warn('Supabase one_to_one_meetings fetch error:', otoErr);

        // Get participant mappings if table exists
        const { data: rawParts } = await supabase
          .from('meeting_participants')
          .select('meeting_id, user_id');

        const partsMap = new Map<string, string[]>();
        (rawParts || []).forEach((p: any) => {
          const mId = String(p.meeting_id);
          const uId = String(p.user_id);
          if (!partsMap.has(mId)) partsMap.set(mId, []);
          partsMap.get(mId)!.push(uId);
        });

        const otoMap = new Map<string, OneToOneMeeting>();
        (raw1to1s || []).forEach((m: any) => {
          const mId = String(m.id);
          const pIds = partsMap.get(mId) || [];
          const sender = String(m.sender_id || m.organizer_id || m.creator_id || m.creatorId || m.senderId || '').trim();
          const receiver = String(m.receiver_id || m.member_id || m.receiverId || m.memberId || '').trim();
          if (sender && !pIds.includes(sender)) pIds.push(sender);
          if (receiver && !pIds.includes(receiver)) pIds.push(receiver);

          const item: OneToOneMeeting = {
            id: mId,
            organizer_id: sender,
            member_id: receiver,
            creatorId: sender,
            participantIds: pIds,
            status: (m.status || 'SCHEDULED').toUpperCase() as any,
            created_at: m.created_at || m.createdAt || new Date().toISOString(),
            createdAt: m.created_at || m.createdAt || new Date().toISOString(),
            date: m.meeting_date || m.scheduled_date || m.date || '',
            scheduled_date: m.meeting_date || m.scheduled_date || m.date || '',
            time: m.meeting_time || m.time || '',
            venue: m.meeting_location || m.venue || '',
            chapter_id: m.chapter_id || m.chapterId
          };
          otoMap.set(mId, item);
        });
        const allUnique1to1s = Array.from(otoMap.values());

        // 3. Fetch Thank You Slips
        const { data: rawSlips, error: slipErr } = await supabase
          .from('thank_you_slips')
          .select('*')
          .order('created_at', { ascending: false });

        if (slipErr) console.warn('Supabase thank_you_slips fetch error:', slipErr);

        const slipMap = new Map<string, ThankYouSlip>();
        (rawSlips || []).forEach((s: any) => {
          const senderId = String(s.sender_id || s.from_user_id || s.fromUserId || s.senderId || '').trim();
          const receiverId = String(s.receiver_id || s.to_user_id || s.toUserId || s.receiverId || '').trim();
          const item: ThankYouSlip = {
            id: String(s.id),
            referralId: String(s.referral_id || s.referralId || ''),
            fromUserId: senderId,
            toUserId: receiverId,
            customerName: s.customer_name || s.customerName || '',
            businessValue: Number(s.business_value || s.businessValue || 0),
            notes: s.notes || '',
            createdAt: s.created_at || s.createdAt || new Date().toISOString(),
            chapter_id: s.chapter_id || s.chapterId
          } as any;
          slipMap.set(item.id, item);
        });
        const allUniqueSlips = Array.from(slipMap.values());

        // 4. Fetch Testimonials
        const { data: rawTests, error: testErr } = await supabase
          .from('testimonials')
          .select('*')
          .order('created_at', { ascending: false });

        if (testErr) console.warn('Supabase testimonials fetch error:', testErr);

        const testMap = new Map<string, any>();
        (rawTests || []).forEach((t: any) => {
          const authorId = String(t.sender_id || t.author_id || t.from_user_id || t.author_member_id || t.authorMemberId || '').trim();
          const receiverId = String(t.receiver_id || t.to_user_id || t.receiver_member_id || t.receiverMemberId || '').trim();
          const item = {
            id: String(t.id),
            authorMemberId: authorId,
            receiverMemberId: receiverId,
            chapterId: String(t.chapter_id || t.chapterId || ''),
            rating: Number(t.rating || 5),
            title: t.title || '',
            testimonial: t.testimonial || '',
            status: t.status || 'APPROVED',
            createdAt: t.created_at || t.createdAt || new Date().toISOString()
          };
          testMap.set(item.id, item);
        });
        const allUniqueTests = Array.from(testMap.values());

        // 5. Fetch Guest Invitations
        const { data: rawGuests, error: guestErr } = await supabase
          .from('guest_invitations')
          .select('*')
          .order('created_at', { ascending: false });

        if (guestErr) console.warn('Supabase guest_invitations fetch error:', guestErr);

        const guestMap = new Map<string, GuestInvitation>();
        (rawGuests || []).forEach((g: any) => {
          const inviterId = String(g.createdBy || g.created_by || g.user_id || g.invited_by || g.sender_id || g.member_id || g.memberId || '').trim();
          const item: GuestInvitation = {
            id: String(g.id),
            memberId: inviterId,
            createdBy: inviterId,
            createdByRole: g.created_by_role || g.createdByRole || 'MEMBER',
            chapter_id: g.chapter_id || g.chapterId,
            guestName: g.guest_name || g.guestName || '',
            guestPhone: g.guest_phone || g.guestPhone || '',
            guestEmail: g.guest_email || g.guestEmail || '',
            guestBusiness: g.guest_business || g.guestBusiness || '',
            createdAt: g.created_at || g.createdAt || new Date().toISOString(),
            status: g.status || 'Invited'
          };
          guestMap.set(item.id, item);
        });
        const allUniqueGuests = Array.from(guestMap.values());

        // 6. Fetch Chapter Meetings
        const { data: rawMeetings, error: meetErr } = await supabase
          .from('meetings')
          .select('*')
          .order('date', { ascending: false });

        if (meetErr) console.warn('Supabase meetings fetch error:', meetErr);

        const meetingMap = new Map<string, Meeting>();
        (rawMeetings || []).forEach((m: any) => {
          let att = m.attendance;
          if (typeof att === 'string') {
            try { att = JSON.parse(att); } catch (e) { att = {}; }
          }
          const item: Meeting = {
            id: String(m.id),
            adminId: m.admin_id || m.adminId,
            chapter_id: m.chapter_id || m.chapterId,
            date: m.date || '',
            time: m.time || '',
            location: m.location || '',
            attendance: att || {},
            isCompleted: Boolean(m.is_completed ?? m.isCompleted)
          };
          meetingMap.set(item.id, item);
        });
        const allUniqueMeetings = Array.from(meetingMap.values());

        if (!isMounted) return;

        // --- SCOPE FILTERING PER REQUIREMENT 9 ---
        if (isRegularMember) {
          // Member, President, Vice President, Treasurer: Show ONLY their own analytics!
          // 2. Referral Sent: sender_id = currentUser.id
          setPassedReferrals(allUniqueRefs.filter(r => String(r.sender_id || r.fromUserId) === currentUserId));

          // 3. Referral Received: receiver_id = currentUser.id
          setReceivedReferrals(allUniqueRefs.filter(r => String(r.receiver_id || r.toUserId) === currentUserId));

          // 5. One-to-One Meetings: sender_id = currentUser.id OR receiver_id = currentUser.id
          setOneToOnes(allUnique1to1s.filter(m => 
            String(m.organizer_id || m.creatorId) === currentUserId ||
            String(m.member_id) === currentUserId ||
            (Array.isArray(m.participantIds) && m.participantIds.map(String).includes(currentUserId))
          ));

          // 6. Thank You Slips: Sent (sender_id = currentUser.id), Received (receiver_id = currentUser.id)
          setSentThankYouSlips(allUniqueSlips.filter(s => String(s.fromUserId) === currentUserId));
          setReceivedThankYouSlips(allUniqueSlips.filter(s => String(s.toUserId) === currentUserId));

          // 7. Testimonials: Given (sender_id = currentUser.id), Received (receiver_id = currentUser.id)
          setGivenTestimonials(allUniqueTests.filter(t => String(t.authorMemberId) === currentUserId));
          setReceivedTestimonials(allUniqueTests.filter(t => String(t.receiverMemberId) === currentUserId));

          // 8. Guests: Invited by logged-in user
          setGuestInvitations(allUniqueGuests.filter(g => String(g.createdBy || g.memberId) === currentUserId));

          // Meetings: Filter to user's chapter
          setMeetings(allUniqueMeetings.filter(m => 
            !userChapterId || m.chapter_id === userChapterId || m.adminId === userChapterId
          ));
        } else if (isChapterAdmin) {
          // Chapter Admin: Show chapter-wide analytics only
          const chapterRefs = allUniqueRefs.filter(r => !userChapterId || r.chapter_id === userChapterId);
          setPassedReferrals(chapterRefs);
          setReceivedReferrals(chapterRefs);

          setOneToOnes(allUnique1to1s.filter(m => !userChapterId || m.chapter_id === userChapterId));
          setSentThankYouSlips(allUniqueSlips.filter(s => !userChapterId || s.chapter_id === userChapterId));
          setReceivedThankYouSlips(allUniqueSlips.filter(s => !userChapterId || s.chapter_id === userChapterId));
          setGivenTestimonials(allUniqueTests.filter(t => !userChapterId || t.chapterId === userChapterId));
          setReceivedTestimonials(allUniqueTests.filter(t => !userChapterId || t.chapterId === userChapterId));
          setGuestInvitations(allUniqueGuests.filter(g => !userChapterId || g.chapter_id === userChapterId));
          setMeetings(allUniqueMeetings.filter(m => !userChapterId || m.chapter_id === userChapterId || m.adminId === userChapterId));
        } else {
          // Master Admin: Show analytics for all chapters
          setPassedReferrals(allUniqueRefs);
          setReceivedReferrals(allUniqueRefs);
          setOneToOnes(allUnique1to1s);
          setSentThankYouSlips(allUniqueSlips);
          setReceivedThankYouSlips(allUniqueSlips);
          setGivenTestimonials(allUniqueTests);
          setReceivedTestimonials(allUniqueTests);
          setGuestInvitations(allUniqueGuests);
          setMeetings(allUniqueMeetings);
        }

      } catch (err) {
        console.error('Error fetching MyReport analytics:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAllAnalyticsData();

    // Realtime Postgres changes subscriptions from Supabase
    const channel = supabase.channel(`my-reports-channel-${currentUserId}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referrals' }, () => fetchAllAnalyticsData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'one_to_one_meetings' }, () => fetchAllAnalyticsData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'thank_you_slips' }, () => fetchAllAnalyticsData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'testimonials' }, () => fetchAllAnalyticsData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guest_invitations' }, () => fetchAllAnalyticsData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, () => fetchAllAnalyticsData())
      .subscribe();

    // Requirement 10: Refresh immediately after every action (listen to custom window event)
    const handleDashboardRefresh = () => {
      fetchAllAnalyticsData();
    };
    window.addEventListener('dashboard-refresh', handleDashboardRefresh);

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      window.removeEventListener('dashboard-refresh', handleDashboardRefresh);
    };
  }, [profile]);

  // COMBINED DATA METRICS
  const userId = String(profile?.id || profile?.uid || '').trim();
  
  // Date Helpers for Period and Trend Calculations
  const getStartDateForPeriod = (period: string): Date => {
    const now = new Date();
    switch (period) {
      case 'Monthly':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'Quarterly':
        return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      case 'Half Yearly':
        return new Date(now.getFullYear(), now.getMonth() >= 6 ? 6 : 0, 1);
      case 'Yearly':
        return new Date(now.getFullYear(), 0, 1);
      case 'Lifetime':
      default:
        return new Date(0);
    }
  };

  const parseFlexibleDate = (dateVal: any): Date | null => {
    if (!dateVal) return null;
    if (dateVal instanceof Date) return dateVal;
    const dStr = String(dateVal).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) {
      const [year, month, day] = dStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    const parsed = new Date(dStr);
    if (!isNaN(parsed.getTime())) return parsed;
    return null;
  };

  const isToday = (dateVal: any): boolean => {
    const parsed = parseFlexibleDate(dateVal);
    if (!parsed) return false;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return parsed >= todayStart;
  };

  const isThisMonth = (dateVal: any): boolean => {
    const parsed = parseFlexibleDate(dateVal);
    if (!parsed) return false;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return parsed >= monthStart;
  };

  const isLastMonth = (dateVal: any): boolean => {
    const parsed = parseFlexibleDate(dateVal);
    if (!parsed) return false;
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return parsed >= lastMonthStart && parsed < thisMonthStart;
  };

  const filterItemsByPeriod = <T extends { createdAt?: string; created_at?: string; date?: string; scheduled_date?: string }>(items: T[], period: string): T[] => {
    if (period === 'Lifetime') return items;
    const startDate = getStartDateForPeriod(period);
    return items.filter(item => {
      const dateVal = item.createdAt || (item as any).created_at || item.date || item.scheduled_date;
      const parsed = parseFlexibleDate(dateVal);
      if (!parsed) return false;
      return parsed >= startDate;
    });
  };

  // Filtered raw data based on period
  const filteredMeetings = useMemo(() => filterItemsByPeriod(meetings, selectedPeriod), [meetings, selectedPeriod]);
  const filteredPassedReferrals = useMemo(() => filterItemsByPeriod(passedReferrals, selectedPeriod), [passedReferrals, selectedPeriod]);
  const filteredReceivedReferrals = useMemo(() => filterItemsByPeriod(receivedReferrals, selectedPeriod), [receivedReferrals, selectedPeriod]);
  const filteredOneToOnes = useMemo(() => filterItemsByPeriod(oneToOnes, selectedPeriod), [oneToOnes, selectedPeriod]);
  const filteredGuestInvitations = useMemo(() => filterItemsByPeriod(guestInvitations, selectedPeriod), [guestInvitations, selectedPeriod]);
  const filteredSentThankYouSlips = useMemo(() => filterItemsByPeriod(sentThankYouSlips, selectedPeriod), [sentThankYouSlips, selectedPeriod]);
  const filteredReceivedThankYouSlips = useMemo(() => filterItemsByPeriod(receivedThankYouSlips, selectedPeriod), [receivedThankYouSlips, selectedPeriod]);
  const filteredGivenTestimonials = useMemo(() => filterItemsByPeriod(givenTestimonials, selectedPeriod), [givenTestimonials, selectedPeriod]);

  const completedMeetings = useMemo(() => {
    return filteredMeetings.filter(m => m.isCompleted);
  }, [filteredMeetings]);

  const attendanceData = useMemo(() => {
    let attended = 0;
    let absent = 0;
    completedMeetings.forEach(meeting => {
      let att = meeting.attendance;
      if (typeof att === 'string') {
        try { att = JSON.parse(att); } catch (e) { att = {}; }
      }
      const val = att?.[userId];
      if (['PRESENT', 'Yes', 'Substitute', 'Late', 'YES', 'SUBSTITUTE'].includes(val)) {
        attended++;
      } else if (['ABSENT', 'No', 'NO'].includes(val)) {
        absent++;
      }
    });

    const total = attended + absent;
    const rate = total > 0 ? Math.round((attended / total) * 100) : 100;
    return { attended, absent, total, rate };
  }, [completedMeetings, userId]);

  // 2 & 3. Referrals Metrics
  const referralsStats = useMemo(() => {
    const passed = filteredPassedReferrals.length;
    const received = filteredReceivedReferrals.length;
    const converted = filteredPassedReferrals.filter(r => r.status === 'COMPLETED' || r.status === 'CONVERTED' || r.status === 'CLOSED').length;
    const conversionRate = passed > 0 ? Math.round((converted / passed) * 100) : 0;
    return { passed, received, converted, conversionRate };
  }, [filteredPassedReferrals, filteredReceivedReferrals]);

  // 5. One-to-Ones Metrics
  const oneToOnesStats = useMemo(() => {
    const uniqueList = filteredOneToOnes;
    const completed = uniqueList.filter(m => m.status === 'COMPLETED').length;
    const upcoming = uniqueList.filter(m => m.status === 'SCHEDULED' || m.status === 'UPCOMING').length;
    return { total: uniqueList.length, completed, upcoming, list: uniqueList };
  }, [filteredOneToOnes]);

  // 6. Revenue / Thank You Slips
  const revenueStats = useMemo(() => {
    const businessGiven = filteredSentThankYouSlips.reduce((sum, s) => sum + (s.businessValue || 0), 0);
    const businessReceived = filteredReceivedThankYouSlips.reduce((sum, s) => sum + (s.businessValue || 0), 0);
    return { businessGiven, businessReceived };
  }, [filteredSentThankYouSlips, filteredReceivedThankYouSlips]);

  // Dynamic Growth Score
  const dynamicGrowthScore = useMemo(() => {
    return calculateMemberGrowthScore({
      attendancePercent: attendanceData.rate || 0,
      completedOneToOnes: oneToOnesStats.completed,
      referralsSent: referralsStats.passed,
      referralsReceived: referralsStats.received,
      thankYouSlipsSent: filteredSentThankYouSlips.length,
      thankYouSlipsReceived: filteredReceivedThankYouSlips.length,
      guestInvites: filteredGuestInvitations.length,
      testimonialsSubmitted: filteredGivenTestimonials.length,
      isProfileComplete: Boolean(profile?.name && profile?.phone && profile?.businessName),
      isSubscriptionActive: profile?.membershipStatus === 'ACTIVE' || profile?.status === 'ACTIVE'
    }).score;
  }, [attendanceData, oneToOnesStats, referralsStats, filteredSentThankYouSlips, filteredReceivedThankYouSlips, filteredGuestInvitations, filteredGivenTestimonials, profile]);

  // MOM trend metrics calculated purely from live database data
  const parsedDatesWithMeta = useMemo(() => {
    const sumVal = (arr: ThankYouSlip[]) => arr.reduce((sum, item) => sum + (item.businessValue || 0), 0);
    
    // Slips Sent
    const slipsSentToday = sentThankYouSlips.filter(s => isToday(s.createdAt));
    const slipsSentThisMonth = sentThankYouSlips.filter(s => isThisMonth(s.createdAt));
    const slipsSentLastMonth = sentThankYouSlips.filter(s => isLastMonth(s.createdAt));
    
    const sumSentToday = sumVal(slipsSentToday);
    const sumSentThisMonth = sumVal(slipsSentThisMonth);
    const sumSentLastMonth = sumVal(slipsSentLastMonth);
    const trendSent = sumSentLastMonth > 0 ? Math.round(((sumSentThisMonth - sumSentLastMonth) / sumSentLastMonth) * 100) : (sumSentThisMonth > 0 ? 100 : 0);
    
    const lastUpdatedSent = sentThankYouSlips.reduce((latest, s) => {
      const d = parseFlexibleDate(s.createdAt);
      return d && (!latest || d > latest) ? d : latest;
    }, null as Date | null);

    // Slips Received
    const slipsRecvToday = receivedThankYouSlips.filter(s => isToday(s.createdAt));
    const slipsRecvThisMonth = receivedThankYouSlips.filter(s => isThisMonth(s.createdAt));
    const slipsRecvLastMonth = receivedThankYouSlips.filter(s => isLastMonth(s.createdAt));
    
    const sumRecvToday = sumVal(slipsRecvToday);
    const sumRecvThisMonth = sumVal(slipsRecvThisMonth);
    const sumRecvLastMonth = sumVal(slipsRecvLastMonth);
    const trendRecv = sumRecvLastMonth > 0 ? Math.round(((sumRecvThisMonth - sumRecvLastMonth) / sumRecvLastMonth) * 100) : (sumRecvThisMonth > 0 ? 100 : 0);
    
    const lastUpdatedRecv = receivedThankYouSlips.reduce((latest, s) => {
      const d = parseFlexibleDate(s.createdAt);
      return d && (!latest || d > latest) ? d : latest;
    }, null as Date | null);

    // Referrals Sent
    const refSentToday = passedReferrals.filter(r => isToday(r.createdAt));
    const refSentThisMonth = passedReferrals.filter(r => isThisMonth(r.createdAt));
    const refSentLastMonth = passedReferrals.filter(r => isLastMonth(r.createdAt));
    
    const trendRefSent = refSentLastMonth.length > 0 
      ? Math.round(((refSentThisMonth.length - refSentLastMonth.length) / refSentLastMonth.length) * 100) 
      : (refSentThisMonth.length > 0 ? 100 : 0);
      
    const lastUpdatedRefSent = passedReferrals.reduce((latest, r) => {
      const d = parseFlexibleDate(r.createdAt);
      return d && (!latest || d > latest) ? d : latest;
    }, null as Date | null);

    // Referrals Received
    const refRecvToday = receivedReferrals.filter(r => isToday(r.createdAt));
    const refRecvThisMonth = receivedReferrals.filter(r => isThisMonth(r.createdAt));
    const refRecvLastMonth = receivedReferrals.filter(r => isLastMonth(r.createdAt));
    
    const trendRefRecv = refRecvLastMonth.length > 0 
      ? Math.round(((refRecvThisMonth.length - refRecvLastMonth.length) / refRecvLastMonth.length) * 100) 
      : (refRecvThisMonth.length > 0 ? 100 : 0);
      
    const lastUpdatedRefRecv = receivedReferrals.reduce((latest, r) => {
      const d = parseFlexibleDate(r.createdAt);
      return d && (!latest || d > latest) ? d : latest;
    }, null as Date | null);

    // One-to-Ones
    const otoToday = oneToOnes.filter(m => isToday(m.createdAt || m.date));
    const otoThisMonth = oneToOnes.filter(m => isThisMonth(m.createdAt || m.date));
    const otoLastMonth = oneToOnes.filter(m => isLastMonth(m.createdAt || m.date));
    const otoThisMonthComp = otoThisMonth.filter(m => m.status === 'COMPLETED').length;
    const otoLastMonthComp = otoLastMonth.filter(m => m.status === 'COMPLETED').length;
    
    const trendOto = otoLastMonthComp > 0 
      ? Math.round(((otoThisMonthComp - otoLastMonthComp) / otoLastMonthComp) * 100) 
      : (otoThisMonthComp > 0 ? 100 : 0);
      
    const lastUpdatedOto = oneToOnes.reduce((latest, m) => {
      const d = parseFlexibleDate(m.createdAt || m.date);
      return d && (!latest || d > latest) ? d : latest;
    }, null as Date | null);

    // Attendance
    const mCompThisMonth = meetings.filter(m => m.isCompleted && isThisMonth(m.date));
    const mCompLastMonth = meetings.filter(m => m.isCompleted && isLastMonth(m.date));
    
    const getAttRate = (mList: Meeting[]) => {
      let att = 0;
      let abs = 0;
      mList.forEach(m => {
        let attMap = m.attendance;
        if (typeof attMap === 'string') {
          try { attMap = JSON.parse(attMap); } catch (e) { attMap = {}; }
        }
        const val = attMap?.[userId];
        if (['PRESENT', 'Yes', 'Substitute', 'Late', 'YES', 'SUBSTITUTE'].includes(val)) {
          att++;
        } else if (['ABSENT', 'No', 'NO'].includes(val)) {
          abs++;
        }
      });
      return (att + abs) > 0 ? Math.round((att / (att + abs)) * 100) : 100;
    };
    
    const attRateThisMonth = getAttRate(mCompThisMonth);
    const attRateLastMonth = getAttRate(mCompLastMonth);
    const trendAtt = attRateThisMonth - attRateLastMonth;
    
    const lastUpdatedAtt = meetings.filter(m => m.isCompleted).reduce((latest, m) => {
      const d = parseFlexibleDate(m.date);
      return d && (!latest || d > latest) ? d : latest;
    }, null as Date | null);

    return {
      slipsSent: {
        today: sumSentToday,
        monthly: sumSentThisMonth,
        trend: trendSent,
        lastUpdated: lastUpdatedSent
      },
      slipsRecv: {
        today: sumRecvToday,
        monthly: sumRecvThisMonth,
        trend: trendRecv,
        lastUpdated: lastUpdatedRecv
      },
      refSent: {
        today: refSentToday.length,
        monthly: refSentThisMonth.length,
        trend: trendRefSent,
        lastUpdated: lastUpdatedRefSent
      },
      refRecv: {
        today: refRecvToday.length,
        monthly: refRecvThisMonth.length,
        trend: trendRefRecv,
        lastUpdated: lastUpdatedRefRecv
      },
      oto: {
        today: otoToday.length,
        monthly: otoThisMonthComp,
        trend: trendOto,
        lastUpdated: lastUpdatedOto
      },
      attendance: {
        today: meetings.filter(m => m.isCompleted).some(m => isToday(m.date)) ? 'Synced' : 'No Sync Today',
        monthly: attRateThisMonth,
        trend: trendAtt,
        lastUpdated: lastUpdatedAtt
      }
    };
  }, [sentThankYouSlips, receivedThankYouSlips, passedReferrals, receivedReferrals, oneToOnes, meetings, userId]);

  // Recent activities timeline from actual database logs
  const dynamicActivities = useMemo(() => {
    const list: Array<{ id: string; title: string; desc: string; type: string; time: number }> = [];
    
    filteredPassedReferrals.forEach(r => {
      list.push({
        id: `ref-pass-${r.id}`,
        title: 'Referral Passed',
        desc: `Passed lead: ${r.requirement || 'Commercial Requirement'}`,
        type: 'referral_sent',
        time: parseFlexibleDate(r.createdAt)?.getTime() || Date.now()
      });
    });

    filteredReceivedReferrals.forEach(r => {
      list.push({
        id: `ref-recv-${r.id}`,
        title: 'Referral Received',
        desc: `Received lead with status ${(r.status || 'PENDING').replace('_', ' ')}`,
        type: 'referral_recv',
        time: parseFlexibleDate(r.createdAt)?.getTime() || Date.now()
      });
    });

    oneToOnesStats.list.forEach(m => {
      list.push({
        id: `1to1-${m.id}`,
        title: m.status === 'COMPLETED' ? '1-to-1 Meeting Completed' : '1-to-1 Scheduled',
        desc: `Session venue: ${m.venue || 'TBD'}`,
        type: 'onetoone',
        time: parseFlexibleDate(m.createdAt || m.date)?.getTime() || Date.now()
      });
    });

    filteredGuestInvitations.forEach(g => {
      list.push({
        id: `guest-${g.id}`,
        title: 'Guest Invited',
        desc: `Invited peer ${g.guestName || 'Guest'} representing ${g.guestBusiness || 'Business'}`,
        type: 'guest',
        time: parseFlexibleDate(g.createdAt)?.getTime() || Date.now()
      });
    });

    filteredSentThankYouSlips.forEach(s => {
      list.push({
        id: `slip-sent-${s.id}`,
        title: 'Thank You Slip Sent',
        desc: `Acknowledged ₹${(s.businessValue || 0).toLocaleString()} business generated`,
        type: 'slip_sent',
        time: parseFlexibleDate(s.createdAt)?.getTime() || Date.now()
      });
    });

    filteredReceivedThankYouSlips.forEach(s => {
      list.push({
        id: `slip-recv-${s.id}`,
        title: 'Thank You Slip Received',
        desc: `Earned ₹${(s.businessValue || 0).toLocaleString()} from business generated`,
        type: 'slip_recv',
        time: parseFlexibleDate(s.createdAt)?.getTime() || Date.now()
      });
    });

    return list.sort((a, b) => b.time - a.time).slice(0, 10);
  }, [filteredPassedReferrals, filteredReceivedReferrals, oneToOnesStats.list, filteredGuestInvitations, filteredSentThankYouSlips, filteredReceivedThankYouSlips]);

  // Performance Trend Chart Data (Last 6 Months derived 100% from actual database records)
  const monthlyChartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const result = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const year = d.getFullYear();
      const monthName = months[mIdx];

      const startOfMonth = new Date(year, mIdx, 1);
      const endOfMonth = new Date(year, mIdx + 1, 0, 23, 59, 59);

      const inThisMonth = (dateVal: any) => {
        const parsed = parseFlexibleDate(dateVal);
        return Boolean(parsed && parsed >= startOfMonth && parsed <= endOfMonth);
      };

      const refCount = filteredPassedReferrals.filter(r => inThisMonth(r.createdAt)).length;
      
      const otoCount = oneToOnesStats.list.filter(m => m.status === 'COMPLETED' && inThisMonth(m.createdAt || m.date)).length;
      
      const bizGivenK = Math.round(filteredSentThankYouSlips.filter(s => inThisMonth(s.createdAt)).reduce((sum, s) => sum + (s.businessValue || 0), 0) / 1000);

      const bizRecvK = Math.round(filteredReceivedThankYouSlips.filter(s => inThisMonth(s.createdAt)).reduce((sum, s) => sum + (s.businessValue || 0), 0) / 1000);

      result.push({
        name: monthName,
        "Referrals Passed": refCount,
        "1-to-1 Meetings": otoCount,
        "Business Given (k₹)": bizGivenK,
        "Business Received (k₹)": bizRecvK
      });
    }

    return result;
  }, [filteredPassedReferrals, oneToOnesStats.list, filteredSentThankYouSlips, filteredReceivedThankYouSlips]);

  // Recommendations calculated from live database numbers
  const smartRecommendations = useMemo(() => {
    const list = [];
    
    if (attendanceData.rate < 90) {
      list.push({
        id: 'rec-attendance',
        title: 'Boost Meeting Attendance',
        description: `Your attendance rate is currently at ${attendanceData.rate}%. Attendance is the primary way to build trust and find organic referral pathways.`,
        action: 'View Meetings',
        link: '/meetings',
        icon: Calendar,
        iconBg: 'bg-purple-500/10 text-purple-400'
      });
    }

    if (oneToOnesStats.completed === 0) {
      list.push({
        id: 'rec-onetoone',
        title: 'Log your first 1-to-1 Session',
        description: 'You haven\'t logged any completed 1-to-1 sessions. Coordinate quick sync meetings with other members to unlock synergy.',
        action: 'Schedule 1-to-1',
        link: '/one-to-one',
        icon: Handshake,
        iconBg: 'bg-blue-500/10 text-blue-400'
      });
    } else if (oneToOnesStats.completed < 3) {
      list.push({
        id: 'rec-onetoone-more',
        title: 'Book More Synergy Sessions',
        description: `You have completed ${oneToOnesStats.completed} sessions. Active members average 4 sessions monthly to maintain network prominence.`,
        action: 'Schedule 1-to-1',
        link: '/one-to-one',
        icon: Handshake,
        iconBg: 'bg-blue-500/10 text-blue-400'
      });
    }

    if (referralsStats.passed === 0) {
      list.push({
        id: 'rec-referral',
        title: 'Pass a Warm Referral',
        description: 'Generating leads for your chapter peers is the quickest way to establish influence and receive referrals back.',
        action: 'Pass Slip',
        link: '/refer',
        icon: Share2,
        iconBg: 'bg-red-500/10 text-red-400'
      });
    }

    if (guestInvitations.length === 0) {
      list.push({
        id: 'rec-guest',
        title: 'Invite your First Guest',
        description: 'Introduce local business peers to your chapter. Inviting members boosts your chapter score and overall ecosystem size.',
        action: 'Invite Guest',
        link: '/guests',
        icon: UserPlus,
        iconBg: 'bg-pink-500/10 text-pink-400'
      });
    }

    if (list.length === 0) {
      list.push({
        id: 'rec-perfect',
        title: 'Maintain Outstanding Status',
        description: `Stellar performance! Your Growth Score is ${dynamicGrowthScore}. Continue logging slips, sharing referrals, and syncing with your peers regularly.`,
        action: 'View Directory',
        link: '/members',
        icon: Award,
        iconBg: 'bg-emerald-500/10 text-emerald-400'
      });
    }

    return list;
  }, [attendanceData, oneToOnesStats, referralsStats, guestInvitations, dynamicGrowthScore]);

  if (loading) {
    return (
      <div className="min-h-[80vh] w-full flex flex-col items-center justify-center gap-4 bg-[#070C15]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full shadow-[0_0_15px_rgba(220,20,60,0.3)]"
        />
        <p className="text-neutral-400 font-bold text-xs tracking-widest uppercase animate-pulse">Syncing Enterprise Analytics...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 sm:space-y-8 lg:space-y-12 pb-20 relative">
      
      {/* Background decorations */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-[-1]">
        <div className="absolute top-[-10%] right-[-5%] w-[60%] h-[50%] bg-[#DC143C]/3 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#3B82F6]/3 blur-[120px] rounded-full" />
      </div>

      {/* HEADER NAVIGATION */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link to="/analytics" className="inline-flex items-center gap-1 text-xs font-bold text-neutral-400 hover:text-white uppercase tracking-widest transition-colors mb-2">
            <ChevronLeft size={14} /> Back To Dashboard
          </Link>
          <h1 className="text-[28px] sm:text-[36px] font-black text-white tracking-tight leading-none flex items-center gap-2">
            My Enterprise Report
          </h1>
          <p className="text-sm font-medium text-neutral-400">
            Real-time operational auditing and business value diagnostics.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {/* Period Filter Dropdown */}
          <div className="relative shrink-0">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full sm:w-[170px] bg-[#111827] border border-white/10 text-white text-xs font-bold px-4 py-3 rounded-[16px] focus:outline-none focus:border-red-500/50 cursor-pointer shadow-md appearance-none transition-all pr-10"
            >
              <option value="Monthly">Monthly (Default)</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Half Yearly">Half Yearly</option>
              <option value="Yearly">Yearly</option>
              <option value="Lifetime">Lifetime</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-neutral-400">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
              </svg>
            </div>
          </div>

          <div className="bg-[#111827] border border-white/5 p-4 rounded-[16px] flex items-center gap-3 shadow-md shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-amber-500 text-white flex items-center justify-center font-bold">
              <Trophy size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none">Global Standing</p>
              <p className="text-sm font-bold text-white mt-1">Ecosystem Platinum Partner</p>
            </div>
          </div>
        </div>
      </div>

      {/* GROWTH SCORE & BUSINESS HEALTH RADIAL OVERVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Dynamic Growth Score Radial Gauge */}
        <div className="lg:col-span-4 bg-gradient-to-b from-[#111827] to-[#0B1220] rounded-[24px] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/5 flex flex-col items-center justify-between min-h-[320px]">
          <div className="w-full flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Growth Score</span>
            <div className="flex items-center gap-1 bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full text-[9px] font-bold border border-emerald-500/10">
              <TrendingUp size={10} /> Active Growth
            </div>
          </div>

          <div className="relative w-44 h-44 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" stroke="#1c2538" strokeWidth="6.5" fill="none" />
              <circle 
                cx="50" 
                cy="50" 
                r="42" 
                stroke="#DC143C" 
                strokeWidth="6.5" 
                fill="none" 
                strokeDasharray="264" 
                strokeDashoffset={264 - (264 * dynamicGrowthScore) / 100}
                strokeLinecap="round" 
                className="transition-all duration-1000 ease-out" 
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-transparent">
              <span className="text-[42px] font-black text-white leading-none tracking-tighter">{dynamicGrowthScore}</span>
              <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mt-1">Score Matrix</span>
            </div>
          </div>

          <div className="w-full text-center mt-4">
            <h3 className="text-white text-sm font-bold">Dynamic Chapter standing</h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-[280px] mx-auto">
              Your score tracks meeting attendance, syncs, guest invitations, and referral outputs.
            </p>
          </div>
        </div>

        {/* Business Health Summary Cards */}
        <div className="lg:col-span-8 bg-[#111827]/80 rounded-[24px] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
            <div>
              <h3 className="text-white text-base font-bold">Business Health Audit</h3>
              <p className="text-xs text-neutral-400">Analysis of transactional conversion and networking reach.</p>
            </div>
            <div className="p-2 bg-neutral-800 rounded-lg text-neutral-400 text-xs font-bold shrink-0">
              Ecosystem KPIs
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
            {/* 1. Thank You Slips Received */}
            <motion.div
              onClick={isCardClickable ? () => setActiveModal('revenue') : undefined}
              whileHover={isCardClickable ? { y: -5, scale: 1.02, borderColor: 'rgba(16,185,129,0.3)', boxShadow: '0 12px 30px rgba(16,185,129,0.15)' } : undefined}
              whileTap={isCardClickable ? { scale: 0.98 } : undefined}
              className={cn(
                "relative overflow-hidden p-5 rounded-[22px] border border-white/5 bg-[#111827]/40 backdrop-blur-md flex flex-col justify-between h-[195px] transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.3)] group",
                isCardClickable ? "cursor-pointer" : "cursor-default"
              )}
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-emerald-500/10 transition-all duration-300" />
              <div className="flex items-start justify-between">
                <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/10 shrink-0">
                  <ArrowDownLeft size={18} />
                </div>
                <div className="bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full text-[9px] font-bold border border-emerald-500/10">
                  {parsedDatesWithMeta.slipsRecv.trend >= 0 ? '+' : ''}{parsedDatesWithMeta.slipsRecv.trend}% MoM
                </div>
              </div>
              <div className="mt-2 space-y-1">
                <p className="text-2xl font-black text-white tracking-tight">₹{revenueStats.businessReceived.toLocaleString()}</p>
                <p className="text-xs font-bold text-neutral-300 uppercase tracking-wider">TY Slips Received</p>
                <div className="flex items-center justify-between text-[10px] text-neutral-400 font-medium pt-1">
                  <span>{filteredReceivedThankYouSlips.length} Slips</span>
                  <span>Today: ₹{parsedDatesWithMeta.slipsRecv.today.toLocaleString()}</span>
                </div>
              </div>
              <div className="border-t border-white/5 pt-2 flex items-center justify-between text-[9px] text-neutral-500 font-medium">
                <span>Monthly: ₹{parsedDatesWithMeta.slipsRecv.monthly.toLocaleString()}</span>
                <span>{parsedDatesWithMeta.slipsRecv.lastUpdated ? `Updated: ${parsedDatesWithMeta.slipsRecv.lastUpdated.toLocaleDateString()}` : 'No slips'}</span>
              </div>
            </motion.div>

            {/* 2. Thank You Slips Sent */}
            <motion.div
              onClick={isCardClickable ? () => setActiveModal('revenue') : undefined}
              whileHover={isCardClickable ? { y: -5, scale: 1.02, borderColor: 'rgba(239,68,68,0.3)', boxShadow: '0 12px 30px rgba(239,68,68,0.15)' } : undefined}
              whileTap={isCardClickable ? { scale: 0.98 } : undefined}
              className={cn(
                "relative overflow-hidden p-5 rounded-[22px] border border-white/5 bg-[#111827]/40 backdrop-blur-md flex flex-col justify-between h-[195px] transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.3)] group",
                isCardClickable ? "cursor-pointer" : "cursor-default"
              )}
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-red-500/10 transition-all duration-300" />
              <div className="flex items-start justify-between">
                <div className="p-2.5 bg-red-500/10 rounded-xl text-red-400 border border-red-500/10 shrink-0">
                  <ArrowUpRight size={18} />
                </div>
                <div className="bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full text-[9px] font-bold border border-red-500/10">
                  {parsedDatesWithMeta.slipsSent.trend >= 0 ? '+' : ''}{parsedDatesWithMeta.slipsSent.trend}% MoM
                </div>
              </div>
              <div className="mt-2 space-y-1">
                <p className="text-2xl font-black text-white tracking-tight">₹{revenueStats.businessGiven.toLocaleString()}</p>
                <p className="text-xs font-bold text-neutral-300 uppercase tracking-wider">TY Slips Sent</p>
                <div className="flex items-center justify-between text-[10px] text-neutral-400 font-medium pt-1">
                  <span>{filteredSentThankYouSlips.length} Slips</span>
                  <span>Today: ₹{parsedDatesWithMeta.slipsSent.today.toLocaleString()}</span>
                </div>
              </div>
              <div className="border-t border-white/5 pt-2 flex items-center justify-between text-[9px] text-neutral-500 font-medium">
                <span>Monthly: ₹{parsedDatesWithMeta.slipsSent.monthly.toLocaleString()}</span>
                <span>{parsedDatesWithMeta.slipsSent.lastUpdated ? `Updated: ${parsedDatesWithMeta.slipsSent.lastUpdated.toLocaleDateString()}` : 'No slips'}</span>
              </div>
            </motion.div>

            {/* 3. Referrals Sent */}
            <motion.div
              onClick={isCardClickable ? () => setActiveModal('referrals') : undefined}
              whileHover={isCardClickable ? { y: -5, scale: 1.02, borderColor: 'rgba(245,158,11,0.3)', boxShadow: '0 12px 30px rgba(245,158,11,0.15)' } : undefined}
              whileTap={isCardClickable ? { scale: 0.98 } : undefined}
              className={cn(
                "relative overflow-hidden p-5 rounded-[22px] border border-white/5 bg-[#111827]/40 backdrop-blur-md flex flex-col justify-between h-[195px] transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.3)] group",
                isCardClickable ? "cursor-pointer" : "cursor-default"
              )}
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-amber-500/10 transition-all duration-300" />
              <div className="flex items-start justify-between">
                <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/10 shrink-0">
                  <Share2 size={18} />
                </div>
                <div className="bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full text-[9px] font-bold border border-amber-500/10">
                  {parsedDatesWithMeta.refSent.trend >= 0 ? '+' : ''}{parsedDatesWithMeta.refSent.trend}% MoM
                </div>
              </div>
              <div className="mt-2 space-y-1">
                <p className="text-2xl font-black text-white tracking-tight">{filteredPassedReferrals.length} Sent</p>
                <p className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Referrals Sent</p>
                <div className="flex items-center justify-between text-[10px] text-neutral-400 font-medium pt-1">
                  <span>Conversion: {referralsStats.conversionRate}%</span>
                  <span>Today: {parsedDatesWithMeta.refSent.today}</span>
                </div>
              </div>
              <div className="border-t border-white/5 pt-2 flex items-center justify-between text-[9px] text-neutral-500 font-medium">
                <span>Monthly: {parsedDatesWithMeta.refSent.monthly} Sent</span>
                <span>{parsedDatesWithMeta.refSent.lastUpdated ? `Updated: ${parsedDatesWithMeta.refSent.lastUpdated.toLocaleDateString()}` : 'No referrals'}</span>
              </div>
            </motion.div>

            {/* 4. Referrals Received */}
            <motion.div
              onClick={isCardClickable ? () => setActiveModal('referrals') : undefined}
              whileHover={isCardClickable ? { y: -5, scale: 1.02, borderColor: 'rgba(59,130,246,0.3)', boxShadow: '0 12px 30px rgba(59,130,246,0.15)' } : undefined}
              whileTap={isCardClickable ? { scale: 0.98 } : undefined}
              className={cn(
                "relative overflow-hidden p-5 rounded-[22px] border border-white/5 bg-[#111827]/40 backdrop-blur-md flex flex-col justify-between h-[195px] transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.3)] group",
                isCardClickable ? "cursor-pointer" : "cursor-default"
              )}
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-blue-500/10 transition-all duration-300" />
              <div className="flex items-start justify-between">
                <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/10 shrink-0">
                  <Users size={18} />
                </div>
                <div className="bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full text-[9px] font-bold border border-blue-500/10">
                  {parsedDatesWithMeta.refRecv.trend >= 0 ? '+' : ''}{parsedDatesWithMeta.refRecv.trend}% MoM
                </div>
              </div>
              <div className="mt-2 space-y-1">
                <p className="text-2xl font-black text-white tracking-tight">{filteredReceivedReferrals.length} Received</p>
                <p className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Referrals Received</p>
                <div className="flex items-center justify-between text-[10px] text-neutral-400 font-medium pt-1">
                  <span>
                    Conversion:{' '}
                    {(() => {
                      const converted = filteredReceivedReferrals.filter(r => r.status === 'COMPLETED' || r.status === 'CONVERTED' || r.status === 'CLOSED').length;
                      return filteredReceivedReferrals.length > 0 ? Math.round((converted / filteredReceivedReferrals.length) * 100) : 0;
                    })()}%
                  </span>
                  <span>Today: {parsedDatesWithMeta.refRecv.today}</span>
                </div>
              </div>
              <div className="border-t border-white/5 pt-2 flex items-center justify-between text-[9px] text-neutral-500 font-medium">
                <span>Monthly: {parsedDatesWithMeta.refRecv.monthly} Recv</span>
                <span>{parsedDatesWithMeta.refRecv.lastUpdated ? `Updated: ${parsedDatesWithMeta.refRecv.lastUpdated.toLocaleDateString()}` : 'No referrals'}</span>
              </div>
            </motion.div>

            {/* 5. Attendance */}
            <motion.div
              onClick={isCardClickable ? () => setActiveModal('attendance') : undefined}
              whileHover={isCardClickable ? { y: -5, scale: 1.02, borderColor: 'rgba(168,85,247,0.3)', boxShadow: '0 12px 30px rgba(168,85,247,0.15)' } : undefined}
              whileTap={isCardClickable ? { scale: 0.98 } : undefined}
              className={cn(
                "relative overflow-hidden p-5 rounded-[22px] border border-white/5 bg-[#111827]/40 backdrop-blur-md flex flex-col justify-between h-[195px] transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.3)] group",
                isCardClickable ? "cursor-pointer" : "cursor-default"
              )}
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-purple-500/10 transition-all duration-300" />
              <div className="flex items-start justify-between">
                <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/10 shrink-0">
                  <Calendar size={18} />
                </div>
                <div className="bg-purple-500/15 text-purple-400 px-2 py-0.5 rounded-full text-[9px] font-bold border border-purple-500/10">
                  {parsedDatesWithMeta.attendance.trend >= 0 ? '+' : ''}{parsedDatesWithMeta.attendance.trend}% MoM
                </div>
              </div>
              <div className="mt-2 space-y-1">
                <p className="text-2xl font-black text-white tracking-tight">{attendanceData.rate}%</p>
                <p className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Attendance Rate</p>
                <div className="flex items-center justify-between text-[10px] text-neutral-400 font-medium pt-1">
                  <span>Present: {attendanceData.attended} | Absent: {attendanceData.absent}</span>
                  <span>Today: {parsedDatesWithMeta.attendance.today}</span>
                </div>
              </div>
              <div className="border-t border-white/5 pt-2 flex items-center justify-between text-[9px] text-neutral-500 font-medium">
                <span>Monthly: {parsedDatesWithMeta.attendance.monthly}%</span>
                <span>{parsedDatesWithMeta.attendance.lastUpdated ? `Updated: ${parsedDatesWithMeta.attendance.lastUpdated.toLocaleDateString()}` : 'No meetings'}</span>
              </div>
            </motion.div>

            {/* 6. One-to-One Meetings */}
            <motion.div
              onClick={isCardClickable ? () => setActiveModal('onetoones') : undefined}
              whileHover={isCardClickable ? { y: -5, scale: 1.02, borderColor: 'rgba(236,72,153,0.3)', boxShadow: '0 12px 30px rgba(236,72,153,0.15)' } : undefined}
              whileTap={isCardClickable ? { scale: 0.98 } : undefined}
              className={cn(
                "relative overflow-hidden p-5 rounded-[22px] border border-white/5 bg-[#111827]/40 backdrop-blur-md flex flex-col justify-between h-[195px] transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.3)] group",
                isCardClickable ? "cursor-pointer" : "cursor-default"
              )}
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-pink-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-pink-500/10 transition-all duration-300" />
              <div className="flex items-start justify-between">
                <div className="p-2.5 bg-pink-500/10 rounded-xl text-pink-400 border border-pink-500/10 shrink-0">
                  <Handshake size={18} />
                </div>
                <div className="bg-pink-500/15 text-pink-400 px-2 py-0.5 rounded-full text-[9px] font-bold border border-pink-500/10">
                  {parsedDatesWithMeta.oto.trend >= 0 ? '+' : ''}{parsedDatesWithMeta.oto.trend}% MoM
                </div>
              </div>
              <div className="mt-2 space-y-1">
                <p className="text-2xl font-black text-white tracking-tight">
                  {oneToOnesStats.total > 0 ? Math.round((oneToOnesStats.completed / oneToOnesStats.total) * 100) : 100}%
                </p>
                <p className="text-xs font-bold text-neutral-300 uppercase tracking-wider">1-to-1 Completion</p>
                <div className="flex items-center justify-between text-[10px] text-neutral-400 font-medium pt-1">
                  <span>Comp: {oneToOnesStats.completed} | Sch: {oneToOnesStats.upcoming}</span>
                  <span>Today: {parsedDatesWithMeta.oto.today}</span>
                </div>
              </div>
              <div className="border-t border-white/5 pt-2 flex items-center justify-between text-[9px] text-neutral-500 font-medium">
                <span>Monthly: {parsedDatesWithMeta.oto.monthly} Completed</span>
                <span>{parsedDatesWithMeta.oto.lastUpdated ? `Updated: ${parsedDatesWithMeta.oto.lastUpdated.toLocaleDateString()}` : 'No syncs'}</span>
              </div>
            </motion.div>
          </div>

          <div className="border-t border-white/5 pt-4 mt-4 flex items-center gap-2 text-xs text-neutral-400 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            Audit status matches Chapter compliance. Click any card to drill down into logs.
          </div>
        </div>
      </div>

      {/* MONTHLY PERFORMANCE CHART & RECENT ACTIVITY SLITS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Performance Trend Charts */}
        <div className="lg:col-span-8 bg-[#111827] border border-white/5 rounded-[24px] p-6 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-white text-base font-bold">Performance Trends</h3>
              <p className="text-xs text-neutral-400">Auditing transactional activity and communication over months.</p>
            </div>
            <div className="flex gap-2">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-300 uppercase tracking-wider">
                <span className="w-2.5 h-2.5 rounded bg-[#DC143C]" /> Referrals
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-300 uppercase tracking-wider">
                <span className="w-2.5 h-2.5 rounded bg-blue-500" /> 1-to-1s
              </span>
            </div>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRef" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#DC143C" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#DC143C" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="color1to1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.5} />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={11} tickLine={false} />
                <YAxis stroke="#6b7280" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0B1220', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}
                  labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}
                />
                <Area type="monotone" dataKey="Referrals Passed" stroke="#DC143C" strokeWidth={2} fillOpacity={1} fill="url(#colorRef)" />
                <Area type="monotone" dataKey="1-to-1 Meetings" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#color1to1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dynamic Recommendations Panel */}
        <div className="lg:col-span-4 bg-gradient-to-b from-[#111827] to-[#0A0F1B] border border-white/5 rounded-[24px] p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-white text-base font-bold mb-4 flex items-center gap-1.5">
              <Sparkles size={16} className="text-[#DC143C]" /> Growth Optimization
            </h3>
            
            <div className="space-y-4">
              {smartRecommendations.map((rec) => (
                <div key={rec.id} className="p-4 bg-[#0B1220]/60 rounded-[18px] border border-white/5 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", rec.iconBg)}>
                      <rec.icon size={15} />
                    </div>
                    <h4 className="text-xs font-bold text-white leading-tight">{rec.title}</h4>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed font-medium">
                    {rec.description}
                  </p>
                  <div className="pt-1">
                    <Link to={rec.link} className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500 hover:text-red-400 uppercase tracking-widest transition-all">
                      {rec.action} <ArrowRight size={10} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-[#111827] rounded-xl border border-white/5 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-center mt-4">
            Ecosystem Diagnostics Active
          </div>
        </div>
      </div>

      {/* RECENT ACTIVITIES LIST */}
      <div className="bg-[#111827] border border-white/5 rounded-[24px] p-6 shadow-md space-y-4">
        <div>
          <h3 className="text-white text-base font-bold">Recent Activities Logs</h3>
          <p className="text-xs text-neutral-400">Verifiably completed operations associated with your account.</p>
        </div>

        {dynamicActivities.length === 0 ? (
          <div className="p-12 text-center bg-[#0B1220]/40 rounded-[18px] border border-dashed border-white/5">
            <Clock size={32} className="text-neutral-600 mx-auto mb-2" />
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">No activities detected</p>
            <p className="text-xs text-neutral-400 mt-1">Begin logging meetings, referrals, and slips to audit output.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5 max-h-[350px] overflow-y-auto pr-2 space-y-3">
            {dynamicActivities.map((act) => (
              <div key={act.id} className="pt-3 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-white/5",
                    act.type.includes('referral') ? 'bg-amber-500/10 text-amber-400' :
                    act.type.includes('slip') ? 'bg-emerald-500/10 text-emerald-400' :
                    act.type.includes('guest') ? 'bg-pink-500/10 text-pink-400' :
                    'bg-blue-500/10 text-blue-400'
                  )}>
                    {act.type.includes('referral') ? <Share2 size={14} /> :
                     act.type.includes('slip') ? <DollarSign size={14} /> :
                     act.type.includes('guest') ? <UserPlus size={14} /> :
                     <Handshake size={14} />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{act.title}</h4>
                    <p className="text-[11px] text-neutral-400 mt-0.5">{act.desc}</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest whitespace-nowrap">
                  {new Date(act.time).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DETAILED DRILL DOWN MODALS (Clicking cards opens these) */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 bg-[#070C15]/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="bg-[#111827] border border-white/10 rounded-[28px] p-6 md:p-8 w-full max-w-[750px] max-h-[85vh] overflow-y-auto space-y-6 shadow-[0_15px_50px_rgba(0,0,0,0.8)] relative"
            >
              {/* Close Button */}
              <button 
                onClick={() => setActiveModal(null)}
                className="absolute top-5 right-5 w-10 h-10 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center transition-all border border-white/5 cursor-pointer font-bold"
              >
                ✕
              </button>

              {/* MODAL 1: ATTENDANCE DETAILED OVERVIEW */}
              {activeModal === 'attendance' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <div className="p-3 bg-purple-500/15 text-purple-400 rounded-xl border border-purple-500/20">
                      <Calendar size={22} />
                    </div>
                    <div>
                      <h3 className="text-xl font-extrabold text-white">Attendance Audit Report</h3>
                      <p className="text-xs text-neutral-400">Chapter meeting compliance and attendance integrity.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-[#0B1220]/60 rounded-xl border border-white/5 text-center">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Total Chapter Meetings</p>
                      <p className="text-2xl font-black text-white">{attendanceData.total}</p>
                    </div>
                    <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20 text-center">
                      <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1">Attended Syncs</p>
                      <p className="text-2xl font-black text-purple-400">{attendanceData.attended}</p>
                    </div>
                    <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20 text-center">
                      <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">Missed Syncs</p>
                      <p className="text-2xl font-black text-red-400">{attendanceData.absent}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-widest">Meeting Chronology</h4>
                    <div className="bg-[#0B1220]/60 border border-white/5 rounded-xl divide-y divide-white/5 overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-white/10 bg-white/5 text-neutral-400 font-bold uppercase text-[10px]">
                            <th className="p-3">Meeting Date</th>
                            <th className="p-3">Location</th>
                            <th className="p-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {completedMeetings.slice(0, 10).map((m) => {
                            let attMap = m.attendance;
                            if (typeof attMap === 'string') {
                              try { attMap = JSON.parse(attMap); } catch (e) { attMap = {}; }
                            }
                            const att = attMap?.[userId];
                            const isPresent = ['PRESENT', 'Yes', 'Substitute', 'Late', 'YES', 'SUBSTITUTE'].includes(att);
                            return (
                              <tr key={m.id} className="hover:bg-white/5">
                                <td className="p-3 font-bold text-white whitespace-nowrap">{m.date}</td>
                                <td className="p-3 text-neutral-300 whitespace-nowrap">{m.location || 'Chapter Venue'}</td>
                                <td className="p-3 text-right whitespace-nowrap">
                                  <span className={cn(
                                    "px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                                    isPresent ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                                  )}>
                                    {isPresent ? 'PRESENT' : 'ABSENT'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {completedMeetings.length === 0 && (
                        <p className="p-4 text-center text-xs text-neutral-500 font-bold uppercase tracking-widest">No meetings recorded in chapter history.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL 2: REFERRALS DRILL DOWN */}
              {activeModal === 'referrals' && (() => {
                const filterReferrals = (list: Referral[]) => {
                  return list.filter(r => {
                    const sender = getUserFullDetails(r.sender_id || r.fromUserId);
                    const receiver = getUserFullDetails(r.receiver_id || r.toUserId);

                    // 1. Search Query
                    if (referralSearchQuery.trim()) {
                      const q = referralSearchQuery.toLowerCase().trim();
                      const contactName = (r.contactName || '').toLowerCase();
                      const contactPhone = (r.contactPhone || '').toLowerCase();
                      const requirement = (r.requirement || r.notes || '').toLowerCase();
                      const sName = (sender.name || '').toLowerCase();
                      const rName = (receiver.name || '').toLowerCase();

                      const matches = 
                        contactName.includes(q) ||
                        contactPhone.includes(q) ||
                        requirement.includes(q) ||
                        sName.includes(q) ||
                        rName.includes(q);

                      if (!matches) return false;
                    }

                    // 2. Status Filter
                    if (referralStatusFilter !== 'ALL') {
                      const statusUpper = (r.status || 'PENDING').toUpperCase();
                      if (referralStatusFilter === 'PENDING' && statusUpper !== 'PENDING') return false;
                      if (referralStatusFilter === 'CONVERTED' && !['COMPLETED', 'CONVERTED', 'CLOSED'].includes(statusUpper)) return false;
                      if (referralStatusFilter === 'REJECTED' && !['REJECTED', 'DECLINED', 'CANCELLED'].includes(statusUpper)) return false;
                    }

                    // 3. Date Range Filter
                    if (referralStartDate) {
                      const rTime = new Date(r.createdAt).getTime();
                      const sTime = new Date(referralStartDate).getTime();
                      if (!isNaN(rTime) && !isNaN(sTime) && rTime < sTime) return false;
                    }

                    if (referralEndDate) {
                      const rTime = new Date(r.createdAt).getTime();
                      const eDate = new Date(referralEndDate);
                      eDate.setHours(23, 59, 59, 999);
                      const eTime = eDate.getTime();
                      if (!isNaN(rTime) && !isNaN(eTime) && rTime > eTime) return false;
                    }

                    return true;
                  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                };

                const filteredInboundList = filterReferrals(receivedReferrals);
                const filteredOutboundList = filterReferrals(passedReferrals);

                const combinedAllMap = new Map<string, Referral>();
                [...passedReferrals, ...receivedReferrals].forEach(r => combinedAllMap.set(r.id, r));
                const filteredAllList = filterReferrals(Array.from(combinedAllMap.values()));

                const hasActiveFilters = Boolean(referralSearchQuery || referralStatusFilter !== 'ALL' || referralStartDate || referralEndDate);

                const renderStatusBadge = (status?: string) => {
                  const sUpper = (status || 'PENDING').toUpperCase();
                  const isConverted = ['COMPLETED', 'CONVERTED', 'CLOSED'].includes(sUpper);
                  const isPending = sUpper === 'PENDING';
                  return (
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border whitespace-nowrap",
                      isConverted ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      isPending ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      'bg-red-500/10 text-red-400 border-red-500/20'
                    )}>
                      {sUpper.replace('_', ' ')}
                    </span>
                  );
                };

                return (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                      <div className="p-3 bg-amber-500/15 text-amber-400 rounded-xl border border-amber-500/20">
                        <Share2 size={22} />
                      </div>
                      <div>
                        <h3 className="text-xl font-extrabold text-white">Referrals Diagnostic Audit</h3>
                        <p className="text-xs text-neutral-400">Deep-dive auditing of inbound and outbound transactional leads with live Supabase data.</p>
                      </div>
                    </div>

                    {/* Stats Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-[#0B1220]/60 rounded-xl border border-white/5 text-center">
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Referrals Passed</p>
                        <p className="text-2xl font-black text-white">{referralsStats.passed}</p>
                      </div>
                      <div className="p-4 bg-[#0B1220]/60 rounded-xl border border-white/5 text-center">
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Referrals Received</p>
                        <p className="text-2xl font-black text-white">{referralsStats.received}</p>
                      </div>
                      <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-center">
                        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Conversion Rate</p>
                        <p className="text-2xl font-black text-emerald-400">{referralsStats.conversionRate}%</p>
                      </div>
                    </div>

                    {/* SEARCH & FILTER CONTROLS */}
                    <div className="bg-[#0B1220]/80 border border-white/10 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-widest">
                        <Filter size={14} /> Search & Filter Audit Logs
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                        {/* Search Input */}
                        <div className="relative col-span-1 sm:col-span-2 lg:col-span-1">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                          <input
                            type="text"
                            placeholder="Search contact, sent by, sent to..."
                            value={referralSearchQuery}
                            onChange={(e) => setReferralSearchQuery(e.target.value)}
                            className="w-full bg-[#080D1A] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50"
                          />
                        </div>

                        {/* Status Filter */}
                        <div>
                          <select
                            value={referralStatusFilter}
                            onChange={(e) => setReferralStatusFilter(e.target.value)}
                            className="w-full bg-[#080D1A] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500/50"
                          >
                            <option value="ALL">All Statuses</option>
                            <option value="PENDING">Pending</option>
                            <option value="CONVERTED">Converted / Closed</option>
                            <option value="REJECTED">Rejected / Cancelled</option>
                          </select>
                        </div>

                        {/* Start Date */}
                        <div className="flex items-center gap-1.5 bg-[#080D1A] border border-white/10 rounded-lg px-2.5 py-1.5">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase shrink-0">From:</span>
                          <input
                            type="date"
                            value={referralStartDate}
                            onChange={(e) => setReferralStartDate(e.target.value)}
                            className="bg-transparent text-white focus:outline-none w-full"
                          />
                        </div>

                        {/* End Date */}
                        <div className="flex items-center gap-1.5 bg-[#080D1A] border border-white/10 rounded-lg px-2.5 py-1.5">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase shrink-0">To:</span>
                          <input
                            type="date"
                            value={referralEndDate}
                            onChange={(e) => setReferralEndDate(e.target.value)}
                            className="bg-transparent text-white focus:outline-none w-full"
                          />
                        </div>
                      </div>

                      {hasActiveFilters && (
                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => {
                              setReferralSearchQuery('');
                              setReferralStatusFilter('ALL');
                              setReferralStartDate('');
                              setReferralEndDate('');
                            }}
                            className="flex items-center gap-1 text-[11px] font-bold text-neutral-400 hover:text-white transition-colors"
                          >
                            <X size={12} /> Clear Filters
                          </button>
                        </div>
                      )}
                    </div>

                    {/* TAB SWITCHER */}
                    <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto text-xs font-bold">
                      <button
                        onClick={() => setActiveReferralTab('inbound')}
                        className={cn(
                          "px-4 py-2 rounded-lg transition-all border whitespace-nowrap",
                          activeReferralTab === 'inbound'
                            ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                            : "bg-white/5 text-neutral-400 border-transparent hover:text-white"
                        )}
                      >
                        Inbound History (Received) ({filteredInboundList.length})
                      </button>
                      <button
                        onClick={() => setActiveReferralTab('outbound')}
                        className={cn(
                          "px-4 py-2 rounded-lg transition-all border whitespace-nowrap",
                          activeReferralTab === 'outbound'
                            ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                            : "bg-white/5 text-neutral-400 border-transparent hover:text-white"
                        )}
                      >
                        Outbound History (Sent) ({filteredOutboundList.length})
                      </button>
                      <button
                        onClick={() => setActiveReferralTab('all')}
                        className={cn(
                          "px-4 py-2 rounded-lg transition-all border whitespace-nowrap",
                          activeReferralTab === 'all'
                            ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                            : "bg-white/5 text-neutral-400 border-transparent hover:text-white"
                        )}
                      >
                        {isMasterAdmin ? 'All System Referrals' : isChapterAdmin ? 'All Chapter Referrals' : 'All My Referrals'} ({filteredAllList.length})
                      </button>
                    </div>

                    {/* TABLE VIEWS */}

                    {/* 1. INBOUND HISTORY (REFERRALS RECEIVED) */}
                    {(activeReferralTab === 'inbound' || activeReferralTab === 'all') && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                            Inbound History (Referrals Received)
                          </h4>
                          <span className="text-[10px] text-neutral-400 font-semibold">{filteredInboundList.length} records</span>
                        </div>
                        <div className="bg-[#0B1220]/60 border border-white/5 rounded-xl overflow-x-auto max-h-[360px] overflow-y-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-white/10 bg-white/5 text-neutral-400 font-bold uppercase text-[10px]">
                                <th className="p-3 whitespace-nowrap">Date</th>
                                <th className="p-3 whitespace-nowrap">Sent By</th>
                                <th className="p-3 whitespace-nowrap">Sender Position</th>
                                <th className="p-3 whitespace-nowrap">Sender Chapter</th>
                                {(isChapterAdmin || isMasterAdmin || activeReferralTab === 'all') && (
                                  <>
                                    <th className="p-3 whitespace-nowrap">Sent To</th>
                                    <th className="p-3 whitespace-nowrap">Receiver Position</th>
                                    <th className="p-3 whitespace-nowrap">Receiver Chapter</th>
                                  </>
                                )}
                                <th className="p-3 whitespace-nowrap">Contact Name</th>
                                <th className="p-3 whitespace-nowrap">Contact Number</th>
                                <th className="p-3">Business Requirement</th>
                                <th className="p-3 text-right whitespace-nowrap">Referral Status</th>
                                <th className="p-3 text-right whitespace-nowrap">Created Date & Time</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {filteredInboundList.map((r) => {
                                const sender = getUserFullDetails(r.sender_id || r.fromUserId);
                                const receiver = getUserFullDetails(r.receiver_id || r.toUserId);
                                return (
                                  <tr key={r.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-3 font-bold text-white whitespace-nowrap">{formatDateOnly(r.createdAt)}</td>
                                    <td className="p-3 font-bold text-white whitespace-nowrap">{sender.name}</td>
                                    <td className="p-3 text-neutral-300 whitespace-nowrap">{sender.position}</td>
                                    <td className="p-3 text-neutral-300 whitespace-nowrap">{sender.chapter}</td>
                                    {(isChapterAdmin || isMasterAdmin || activeReferralTab === 'all') && (
                                      <>
                                        <td className="p-3 font-bold text-white whitespace-nowrap">{receiver.name}</td>
                                        <td className="p-3 text-neutral-300 whitespace-nowrap">{receiver.position}</td>
                                        <td className="p-3 text-neutral-300 whitespace-nowrap">{receiver.chapter}</td>
                                      </>
                                    )}
                                    <td className="p-3 font-semibold text-neutral-200 whitespace-nowrap">{r.contactName}</td>
                                    <td className="p-3 text-neutral-300 whitespace-nowrap">{r.contactPhone}</td>
                                    <td className="p-3 text-neutral-300 max-w-[200px] truncate">{r.requirement || r.notes}</td>
                                    <td className="p-3 text-right whitespace-nowrap">{renderStatusBadge(r.status)}</td>
                                    <td className="p-3 text-right text-neutral-400 whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          {filteredInboundList.length === 0 && (
                            <p className="p-6 text-center text-xs text-neutral-500 font-bold uppercase tracking-widest">
                              No inbound referral records found.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 2. OUTBOUND HISTORY (REFERRALS SENT) */}
                    {(activeReferralTab === 'outbound' || activeReferralTab === 'all') && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                            Outbound History (Referrals Sent)
                          </h4>
                          <span className="text-[10px] text-neutral-400 font-semibold">{filteredOutboundList.length} records</span>
                        </div>
                        <div className="bg-[#0B1220]/60 border border-white/5 rounded-xl overflow-x-auto max-h-[360px] overflow-y-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-white/10 bg-white/5 text-neutral-400 font-bold uppercase text-[10px]">
                                <th className="p-3 whitespace-nowrap">Date</th>
                                {(isChapterAdmin || isMasterAdmin || activeReferralTab === 'all') && (
                                  <>
                                    <th className="p-3 whitespace-nowrap">Sent By</th>
                                    <th className="p-3 whitespace-nowrap">Sender Position</th>
                                    <th className="p-3 whitespace-nowrap">Sender Chapter</th>
                                  </>
                                )}
                                <th className="p-3 whitespace-nowrap">Sent To</th>
                                <th className="p-3 whitespace-nowrap">Receiver Position</th>
                                <th className="p-3 whitespace-nowrap">Receiver Chapter</th>
                                <th className="p-3 whitespace-nowrap">Contact Name</th>
                                <th className="p-3 whitespace-nowrap">Contact Number</th>
                                <th className="p-3">Business Requirement</th>
                                <th className="p-3 text-right whitespace-nowrap">Referral Status</th>
                                <th className="p-3 text-right whitespace-nowrap">Created Date & Time</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {filteredOutboundList.map((r) => {
                                const sender = getUserFullDetails(r.sender_id || r.fromUserId);
                                const receiver = getUserFullDetails(r.receiver_id || r.toUserId);
                                return (
                                  <tr key={r.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-3 font-bold text-white whitespace-nowrap">{formatDateOnly(r.createdAt)}</td>
                                    {(isChapterAdmin || isMasterAdmin || activeReferralTab === 'all') && (
                                      <>
                                        <td className="p-3 font-bold text-white whitespace-nowrap">{sender.name}</td>
                                        <td className="p-3 text-neutral-300 whitespace-nowrap">{sender.position}</td>
                                        <td className="p-3 text-neutral-300 whitespace-nowrap">{sender.chapter}</td>
                                      </>
                                    )}
                                    <td className="p-3 font-bold text-white whitespace-nowrap">{receiver.name}</td>
                                    <td className="p-3 text-neutral-300 whitespace-nowrap">{receiver.position}</td>
                                    <td className="p-3 text-neutral-300 whitespace-nowrap">{receiver.chapter}</td>
                                    <td className="p-3 font-semibold text-neutral-200 whitespace-nowrap">{r.contactName}</td>
                                    <td className="p-3 text-neutral-300 whitespace-nowrap">{r.contactPhone}</td>
                                    <td className="p-3 text-neutral-300 max-w-[200px] truncate">{r.requirement || r.notes}</td>
                                    <td className="p-3 text-right whitespace-nowrap">{renderStatusBadge(r.status)}</td>
                                    <td className="p-3 text-right text-neutral-400 whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          {filteredOutboundList.length === 0 && (
                            <p className="p-6 text-center text-xs text-neutral-500 font-bold uppercase tracking-widest">
                              No outbound referral records found.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* MODAL 3: REVENUE VALUE INSIGHTS */}
              {activeModal === 'revenue' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <div className="p-3 bg-emerald-500/15 text-emerald-400 rounded-xl border border-emerald-500/20">
                      <DollarSign size={22} />
                    </div>
                    <div>
                      <h3 className="text-xl font-extrabold text-white">Revenue Generation Audit</h3>
                      <p className="text-xs text-neutral-400">Verification log of Business Given vs Business Received.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-center">
                      <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Business Received (Revenue Earned)</p>
                      <p className="text-2xl font-black text-emerald-400">₹{revenueStats.businessReceived.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-[#0B1220]/60 rounded-xl border border-white/5 text-center">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Business Given (To Ecosystem Partners)</p>
                      <p className="text-2xl font-black text-white">₹{revenueStats.businessGiven.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-widest">Verified Slips Details</h4>
                    <div className="bg-[#0B1220]/60 border border-white/5 rounded-xl overflow-x-auto max-h-[320px] overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-white/10 bg-white/5 text-neutral-400 font-bold uppercase text-[10px]">
                            <th className="p-3">Sender Name</th>
                            <th className="p-3">Receiver Name</th>
                            <th className="p-3">Customer Name</th>
                            <th className="p-3 text-right">Business Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {[...sentThankYouSlips, ...receivedThankYouSlips].map((s) => {
                            const sender = getUserNameAndRole(s.fromUserId);
                            const receiver = getUserNameAndRole(s.toUserId);
                            return (
                              <tr key={s.id} className="hover:bg-white/5">
                                <td className="p-3 whitespace-nowrap">
                                  <p className="font-bold text-white">{sender.name}</p>
                                  <span className="text-[10px] text-neutral-400 font-medium">{sender.role}</span>
                                </td>
                                <td className="p-3 whitespace-nowrap">
                                  <p className="font-bold text-white">{receiver.name}</p>
                                  <span className="text-[10px] text-neutral-400 font-medium">{receiver.role}</span>
                                </td>
                                <td className="p-3 text-neutral-300 font-medium whitespace-nowrap">{s.customerName || '-'}</td>
                                <td className="p-3 text-right font-extrabold text-emerald-400 whitespace-nowrap">
                                  ₹{(s.businessValue || 0).toLocaleString()}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {sentThankYouSlips.length === 0 && receivedThankYouSlips.length === 0 && (
                        <p className="p-4 text-center text-xs text-neutral-500 font-bold uppercase tracking-widest">No verified thank you slips logged.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL 4: 1-to-1 SYNCS DRILL DOWN */}
              {activeModal === 'onetoones' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <div className="p-3 bg-blue-500/15 text-blue-400 rounded-xl border border-blue-500/20">
                      <Handshake size={22} />
                    </div>
                    <div>
                      <h3 className="text-xl font-extrabold text-white">1-to-1 Meetings Audit</h3>
                      <p className="text-xs text-neutral-400">Analysis of synergy sessions with network peers.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-center">
                      <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Completed Sessions</p>
                      <p className="text-2xl font-black text-blue-400">{oneToOnesStats.completed}</p>
                    </div>
                    <div className="p-4 bg-[#0B1220]/60 rounded-xl border border-white/5 text-center">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Scheduled Upcoming</p>
                      <p className="text-2xl font-black text-white">{oneToOnesStats.upcoming}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-widest">Meeting Log Details</h4>
                    <div className="bg-[#0B1220]/60 border border-white/5 rounded-xl overflow-x-auto max-h-[320px] overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-white/10 bg-white/5 text-neutral-400 font-bold uppercase text-[10px]">
                            <th className="p-3">Scheduled By</th>
                            <th className="p-3">Meeting With</th>
                            <th className="p-3">Date & Time</th>
                            <th className="p-3">Venue</th>
                            <th className="p-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {oneToOnesStats.list.map((m) => {
                            const sender = getUserNameAndRole(m.organizer_id || m.creatorId);
                            const receiver = getUserNameAndRole(m.member_id);
                            return (
                              <tr key={m.id} className="hover:bg-white/5">
                                <td className="p-3 whitespace-nowrap">
                                  <p className="font-bold text-white">{sender.name}</p>
                                  <span className="text-[10px] text-neutral-400 font-medium">{sender.role}</span>
                                </td>
                                <td className="p-3 whitespace-nowrap">
                                  <p className="font-bold text-white">{receiver.name}</p>
                                  <span className="text-[10px] text-neutral-400 font-medium">{receiver.role}</span>
                                </td>
                                <td className="p-3 text-neutral-300 whitespace-nowrap">
                                  {m.date || m.scheduled_date || 'Date TBD'} {m.time ? `@ ${m.time}` : ''}
                                </td>
                                <td className="p-3 text-neutral-300 max-w-[150px] truncate">{m.venue || 'TBD'}</td>
                                <td className="p-3 text-right whitespace-nowrap">
                                  <span className={cn(
                                    "px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                                    m.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                  )}>
                                    {m.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {oneToOnesStats.list.length === 0 && (
                        <p className="p-4 text-center text-xs text-neutral-500 font-bold uppercase tracking-widest">No 1-to-1 syncs scheduled or completed.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Close Button Bottom */}
              <div className="pt-4 border-t border-white/5 flex justify-end">
                <button 
                  onClick={() => setActiveModal(null)}
                  className="bg-[#DC143C] hover:bg-[#B22222] text-white px-6 py-2 rounded-xl text-xs font-bold transition-all shadow-[0_8px_20px_rgba(220,20,60,0.3)] shrink-0 cursor-pointer"
                >
                  Close Audit
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
