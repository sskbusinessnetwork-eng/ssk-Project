declare var jsPDF: any;
declare var autoTable: any;
declare var XLSX: any;
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { getDisplayPosition } from '../utils/authUtils';
import { databaseService } from '../services/databaseService';
import { supabase } from '../lib/supabaseClient';
import { where } from '../lib/database';
import { UserProfile, Meeting, Referral, OneToOneMeeting, GuestInvitation, Testimonial, Chapter, isOfflineReferral, isNormalReferral } from '../types';
import { calculateMemberGrowthScore, calculateMemberGrowthScoreData, calculateChapterGrowthScoreData, getISTDayBounds } from '../utils/growthScore';
import { deduplicateSlips } from '../utils/deduplicateSlips';
import { 
  Users, Activity, Calendar, Share2, Layers, UserPlus, 
  MessageSquare, Download, Filter, Search, ChevronDown, ChevronUp,
  FileText, Star, X, CheckSquare, Briefcase, BarChart3, TrendingUp, Info,
  ArrowRight, Phone, Mail, Building, CheckCircle2, Clock
} from 'lucide-react';
import { isWithinInterval, startOfMonth, endOfMonth, parseISO, subMonths, isValid } from 'date-fns';
import { safeFormat as format, parseSafeDate } from '../utils/dateUtils';
import { cn } from '../lib/utils';
import { Modal } from '../components/Modal';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export function Reports() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Database collections state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [oneToOnes, setOneToOnes] = useState<OneToOneMeeting[]>([]);
  const [guestInvitations, setGuestInvitations] = useState<GuestInvitation[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [thankYouSlips, setThankYouSlips] = useState<any[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  // Filters state
  const [selectedChapterId, setSelectedChapterId] = useState<string>('ALL');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [hasInitializedDate, setHasInitializedDate] = useState(false);

  useEffect(() => {
    if (profile && !hasInitializedDate) {
      if (profile.role === 'MASTER_ADMIN') {
        const d = subMonths(new Date(), 6);
        setStartDate(format(d, 'yyyy-MM-01'));
        setEndDate(format(new Date(), 'yyyy-MM-dd'));
      } else {
        setStartDate('');
        setEndDate('');
      }
      setHasInitializedDate(true);
    }
  }, [profile, hasInitializedDate]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  // Sort state
  const [sortField, setSortField] = useState<string>('growthScore');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // UI tabs state
  const [activeTab, setActiveTab] = useState<'table' | 'charts'>('table');
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Detail Modal for clicked summary cards
  const [selectedDetailCard, setSelectedDetailCard] = useState<'members' | 'revenue' | 'referrals' | 'attendance' | 'oneToOnes' | 'guests' | null>(null);
  const [detailSearchQuery, setDetailSearchQuery] = useState('');

  // Initialize and load data
  useEffect(() => {
    if (!profile) return;

    let unsubUsers = () => {};
    let unsubMeetings = () => {};
    let unsubReferrals = () => {};
    let unsubOneToOnes = () => {};
    let unsubGuests = () => {};
    let unsubTestimonials = () => {};
    let unsubSlips = () => {};
    let unsubChapters = () => {};

    const loadAllData = async () => {
      setLoading(true);
      try {
        // Load all chapters for consistent chapter and leadership association across all roles
        const chaptersList = await databaseService.list<Chapter>('chapters');
        setChapters(chaptersList);

        if (profile.role === 'MASTER_ADMIN') {
          setSelectedChapterId(prev => (prev && prev !== '' ? prev : 'ALL'));
          setSelectedMemberId('ALL');
        } else {
          const userChapId = String(profile.chapter_id || profile.chapterId || profile.adminId || '').trim();
          if (userChapId) {
            setSelectedChapterId(userChapId);
          } else {
            const ledChapter = chaptersList.find(c => 
              String(c.chapter_admin_id) === String(profile.uid) || 
              String(c.president_id) === String(profile.uid) || 
              String(c.vice_president_id) === String(profile.uid) || 
              String(c.treasurer_id) === String(profile.uid)
            );
            if (ledChapter) {
              setSelectedChapterId(ledChapter.id);
            }
          }
        }

        // Setup real-time subscriptions for reactive reporting metrics
        unsubChapters = databaseService.subscribe<Chapter>('chapters', [], (data) => {
          if (data && data.length > 0) {
            setChapters(data);
          }
        });

        unsubUsers = databaseService.subscribe<UserProfile>('users', [], (data) => {
          setUsers(data);
        });

        unsubMeetings = databaseService.subscribe<Meeting>('meetings', [], (data) => {
          setMeetings(data);
        });

        unsubReferrals = databaseService.subscribe<Referral>('referrals', [], (data) => {
          setReferrals(data);
        });

        unsubOneToOnes = databaseService.subscribe<OneToOneMeeting>('one_to_one_meetings', [], (data) => {
          setOneToOnes(data);
        });

        unsubGuests = databaseService.subscribe<GuestInvitation>('guest_invitations', [], (data) => {
          if (data) {
            setGuestInvitations(prev => {
              const map = new Map<string, any>();
              (prev || []).forEach(item => map.set(String(item.id), item));
              data.forEach((item: any) => {
                const existing = map.get(String(item.id)) || {};
                map.set(String(item.id), { ...existing, ...item });
              });
              return Array.from(map.values());
            });
          }
        });

        // Direct fetch from Supabase to guarantee complete guest invitations synchronization
        supabase.from('guest_invitations').select('*').then(
          ({ data: sbGuests }) => {
            if (sbGuests && sbGuests.length > 0) {
              setGuestInvitations(prev => {
                const map = new Map<string, any>();
                (prev || []).forEach(item => map.set(String(item.id), item));
                sbGuests.forEach((item: any) => {
                  const existing = map.get(String(item.id)) || {};
                  map.set(String(item.id), { ...existing, ...item });
                });
                return Array.from(map.values());
              });
            }
          },
          (err) => console.warn("Reports load guest invitations notice:", err)
        );

        unsubTestimonials = databaseService.subscribe<Testimonial>('testimonials', [], (data) => {
          setTestimonials(data);
        });

        unsubSlips = databaseService.subscribe<any>('thank_you_slips', [], (data) => {
          setThankYouSlips(deduplicateSlips(data));
        });

      } catch (err) {
        console.error("Error setting up reports telemetry subscriptions:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();

    return () => {
      unsubUsers();
      unsubMeetings();
      unsubReferrals();
      unsubOneToOnes();
      unsubGuests();
      unsubTestimonials();
      unsubSlips();
      unsubChapters();
    };
  }, [profile]);

  const handleApplyFilter = () => {
    setStartDate(filterStartDate);
    setEndDate(filterEndDate);
    setIsFilterModalOpen(false);
  };

  const handleClearFilter = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setStartDate('');
    setEndDate('');
    setIsFilterModalOpen(false);
  };

  // Handle Preset Date Filter
  const handlePresetFilter = (preset: 'this-month' | 'last-month' | 'last-3' | 'last-6' | 'lifetime') => {
    const now = new Date();
    switch (preset) {
      case 'this-month':
        setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
        break;
      case 'last-month':
        const lastMonth = subMonths(now, 1);
        setStartDate(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
        break;
      case 'last-3':
        setStartDate(format(subMonths(now, 3), 'yyyy-MM-01'));
        setEndDate(format(now, 'yyyy-MM-dd'));
        break;
      case 'last-6':
        setStartDate(format(subMonths(now, 6), 'yyyy-MM-01'));
        setEndDate(format(now, 'yyyy-MM-dd'));
        break;
      case 'lifetime':
        setStartDate('2024-01-01');
        setEndDate(format(now, 'yyyy-MM-dd'));
        break;
    }
  };

  // Safe Date parsing helper
  const parsedStart = useMemo(() => {
    if (!startDate) return null;
    return getISTDayBounds(startDate).start;
  }, [startDate]);
  const parsedEnd = useMemo(() => {
    if (!endDate) return null;
    return getISTDayBounds(endDate).end;
  }, [endDate]);

  // Active chapter object
  const selectedChapterObj = useMemo(() => {
    return chapters.find(c => c.id === selectedChapterId);
  }, [chapters, selectedChapterId]);

  // Check if a member belongs to or is associated with the selected chapter
  const isMemberAssociatedWithChapter = (u: UserProfile, targetChapId: string, chapObj?: Chapter) => {
    if (!targetChapId || targetChapId === 'ALL') {
      return u.role !== 'MASTER_ADMIN';
    }
    // Pure master admin without chapter affiliation is excluded
    if (u.role === 'MASTER_ADMIN' && !u.chapter_id && !(u as any).chapterId) {
      return false;
    }

    const uid = String(u.uid || u.id || '');
    const userChapId = String(u.chapter_id || (u as any).chapterId || '').trim();
    const userAdminId = String(u.adminId || (u as any).admin_id || '').trim();

    // 1. Leadership positions assigned on the Chapter object
    if (chapObj) {
      if (chapObj.chapter_admin_id && String(chapObj.chapter_admin_id) === uid) return true;
      if (chapObj.president_id && String(chapObj.president_id) === uid) return true;
      if (chapObj.vice_president_id && String(chapObj.vice_president_id) === uid) return true;
      if (chapObj.treasurer_id && String(chapObj.treasurer_id) === uid) return true;
      if (chapObj.chapter_admin_id && (userAdminId === String(chapObj.chapter_admin_id) || userAdminId === String(chapObj.id))) return true;
    }

    // 2. Direct chapter assignment on user profile
    if (userChapId === targetChapId) return true;
    if (userAdminId === targetChapId) return true;

    // If member has another specific chapter assigned, exclude them
    if (userChapId && userChapId !== targetChapId) return false;

    return false;
  };

  // Helper to determine exact chapter-specific role and display position
  const getMemberPositionInfo = (member: UserProfile) => {
    const ch = selectedChapterObj;
    const uid = String(member.uid || member.id || '');
    let posKey = member.position || 'member';
    let role = member.role || 'MEMBER';

    if (ch && selectedChapterId !== 'ALL') {
      if (ch.president_id && String(ch.president_id) === uid) {
        posKey = 'president';
        role = 'PRESIDENT' as any;
      } else if (ch.vice_president_id && String(ch.vice_president_id) === uid) {
        posKey = 'vice_president';
        role = 'VICE_PRESIDENT' as any;
      } else if (ch.treasurer_id && String(ch.treasurer_id) === uid) {
        posKey = 'treasurer';
        role = 'TREASURER' as any;
      } else if (ch.chapter_admin_id && String(ch.chapter_admin_id) === uid) {
        posKey = 'chapter_admin';
        role = 'CHAPTER_ADMIN' as any;
      }
    }

    const display = getDisplayPosition(posKey, role);
    return {
      positionKey: posKey,
      displayPosition: display
    };
  };

  // Available members for dropdown based on selected chapter
  const availableMemberOptions = useMemo(() => {
    return users.filter(u => isMemberAssociatedWithChapter(u, selectedChapterId, selectedChapterObj));
  }, [users, selectedChapterId, selectedChapterObj]);

  // Filtered members belonging to selected chapter and member filters
  const filteredMembers = useMemo(() => {
    let results = users.filter(u => isMemberAssociatedWithChapter(u, selectedChapterId, selectedChapterObj));

    if (selectedMemberId && selectedMemberId !== 'ALL') {
      results = results.filter(u => String(u.uid || u.id) === selectedMemberId);
    }

    if (statusFilter !== 'ALL') {
      results = results.filter(u => u.membershipStatus === statusFilter);
    }

    return results;
  }, [users, selectedChapterId, selectedChapterObj, selectedMemberId, statusFilter]);

  // Derived filtered transactions based on date filter & chapter boundaries
  const currentChapterMemberIds = useMemo(() => {
    return filteredMembers.map(m => String(m.uid || m.id));
  }, [filteredMembers]);

  const currentChapterMemberUidsSet = useMemo(() => {
    return new Set(currentChapterMemberIds);
  }, [currentChapterMemberIds]);

  const allChapterMemberUidsSet = useMemo(() => {
    return new Set(availableMemberOptions.map(m => String(m.uid || m.id)));
  }, [availableMemberOptions]);

  const reportsData = useMemo(() => {
    // 1. Referrals
    const filteredRefs = referrals.filter(ref => {
      if (!isNormalReferral(ref)) return false;
      const isDateValid = isWithinDateRange(ref.createdAt || (ref as any).created_at, parsedStart, parsedEnd);
      if (!isDateValid) return false;

      const from = String(ref.fromUserId || ref.sender_id || '');
      const to = String(ref.toUserId || ref.receiver_id || '');

      if (selectedChapterId && selectedChapterId !== 'ALL') {
        const refChap = String(ref.chapter_id || (ref as any).senderChapterId || '').trim();
        if (refChap && refChap !== selectedChapterId) return false;

        const belongsToChapter = refChap === selectedChapterId || currentChapterMemberUidsSet.has(from) || currentChapterMemberUidsSet.has(to);
        if (!belongsToChapter) return false;
      }

      if (selectedMemberId && selectedMemberId !== 'ALL') {
        if (from !== selectedMemberId && to !== selectedMemberId) return false;
      }

      return true;
    });

    // 2. Meetings
    const filteredMeetings = meetings.filter(m => {
      const isDateValid = isWithinDateRange(m.date || m.meeting_date || m.createdAt, parsedStart, parsedEnd);
      if (!isDateValid) return false;

      if (selectedChapterId && selectedChapterId !== 'ALL') {
        const mChap = String(m.chapter_id || m.chapterId || '').trim();
        if (mChap) {
          if (mChap !== selectedChapterId) return false;
        } else if (selectedChapterObj?.chapter_admin_id && m.adminId && m.adminId !== selectedChapterObj.chapter_admin_id) {
          return false;
        } else if (!mChap && !selectedChapterObj?.chapter_admin_id) {
          return false;
        }
      }

      if (selectedMemberId && selectedMemberId !== 'ALL') {
        const attended = (m.attendance && !!m.attendance[selectedMemberId]) || m.createdBy === selectedMemberId;
        if (!attended) return false;
      }

      return true;
    });

    // 3. One-to-Ones
    const filteredOneToOnes = oneToOnes.filter(m => {
      const meetingDate = m.date || m.meeting_date || m.scheduled_date || (m as any).scheduledDate || m.createdAt;
      const isDateValid = isWithinDateRange(meetingDate, parsedStart, parsedEnd);
      if (!isDateValid) return false;

      const orgId = String(m.organizer_id || m.creatorId || m.sender_id || '');
      const recId = String(m.member_id || m.receiver_id || '');
      const pIds = (m.participantIds || []).map((id: string) => String(id));

      if (selectedChapterId && selectedChapterId !== 'ALL') {
        const mChap = String(m.chapter_id || '').trim();
        if (mChap && mChap !== selectedChapterId) return false;

        const belongsToChapter = mChap === selectedChapterId || 
          currentChapterMemberUidsSet.has(orgId) || 
          currentChapterMemberUidsSet.has(recId) || 
          pIds.some(pid => currentChapterMemberUidsSet.has(pid));

        if (!belongsToChapter) return false;
      }

      if (selectedMemberId && selectedMemberId !== 'ALL') {
        const matchesMember = orgId === selectedMemberId || recId === selectedMemberId || pIds.includes(selectedMemberId);
        if (!matchesMember) return false;
      }

      return true;
    });

    // 4. Guests
    const filteredGuests = guestInvitations.filter(g => {
      const guestDate = g.createdAt || (g as any).created_at || (g as any).meeting_date || (g as any).meetingDate || g.date;
      const isDateValid = isWithinDateRange(guestDate, parsedStart, parsedEnd);
      if (!isDateValid) return false;

      const inviterId = String(
        g.invited_by_user_id || 
        (g as any).invitedByUserId || 
        g.invited_by || 
        (g as any).invitedBy || 
        g.createdBy || 
        (g as any).created_by || 
        g.inviterId || 
        (g as any).inviter_id || 
        g.user_id || 
        (g as any).memberId || 
        ''
      ).trim();

      if (selectedChapterId && selectedChapterId !== 'ALL') {
        const gChap = String(
          g.chapter_id || 
          (g as any).chapterId || 
          (g as any).invited_by_chapter || 
          (g as any).invitedByChapter || 
          ''
        ).trim();

        // If guest has a chapter specified and it does not match the selected chapter, exclude it
        if (gChap && gChap !== selectedChapterId) return false;

        // Check meeting affiliation
        const meetId = String(g.meeting_id || (g as any).meetingId || '').trim();
        const meet = meetId ? meetings.find(m => String(m.id) === meetId) : null;
        const meetChap = meet ? String(meet.chapter_id || (meet as any).chapterId || '').trim() : '';
        if (meetChap && meetChap !== selectedChapterId) return false;

        // Verify that the guest is associated with the selected chapter:
        // either directly via chapter_id / invited_by_chapter,
        // or via the meeting's chapter_id,
        // or via the inviter who belongs to the selected chapter.
        const inviterBelongsToChapter = inviterId ? (
          allChapterMemberUidsSet.has(inviterId) || 
          currentChapterMemberUidsSet.has(inviterId) ||
          users.some(u => String(u.uid || u.id) === inviterId && String(u.chapter_id || (u as any).chapterId || '').trim() === selectedChapterId)
        ) : false;

        const isAssociatedWithChapter = (gChap === selectedChapterId) || (meetChap === selectedChapterId) || inviterBelongsToChapter;
        if (!isAssociatedWithChapter) return false;
      }

      if (selectedMemberId && selectedMemberId !== 'ALL') {
        if (inviterId !== selectedMemberId) return false;
      }

      return true;
    });

    // 5. Testimonials
    const filteredTestimonials = testimonials.filter(t => {
      const isDateValid = isWithinDateRange(t.createdAt || (t as any).created_at, parsedStart, parsedEnd);
      if (!isDateValid) return false;

      const authorId = String(t.authorMemberId || t.author_id || (t as any).fromUserId || '');
      const recipientId = String(t.recipientMemberId || t.recipient_id || (t as any).toUserId || '');

      if (selectedChapterId && selectedChapterId !== 'ALL') {
        const tChap = String(t.chapterId || t.chapter_id || '').trim();
        if (tChap && tChap !== selectedChapterId) return false;

        const belongsToChapter = tChap === selectedChapterId || currentChapterMemberUidsSet.has(authorId) || currentChapterMemberUidsSet.has(recipientId);
        if (!belongsToChapter) return false;
      }

      if (selectedMemberId && selectedMemberId !== 'ALL') {
        if (authorId !== selectedMemberId && recipientId !== selectedMemberId) return false;
      }

      return true;
    });

    // 6. Thank You Slips (Revenue)
    const filteredSlips = thankYouSlips.filter(s => {
      const isDateValid = isWithinDateRange(s.createdAt || (s as any).created_at || s.date, parsedStart, parsedEnd);
      if (!isDateValid) return false;

      const from = String(s.fromUserId || (s as any).from_user_id || (s as any).sender_id || '');
      const to = String(s.toUserId || (s as any).to_user_id || (s as any).receiver_id || '');

      if (selectedChapterId && selectedChapterId !== 'ALL') {
        const sChap = String(s.chapter_id || s.chapterId || '').trim();
        if (sChap && sChap !== selectedChapterId) return false;

        const belongsToChapter = sChap === selectedChapterId || currentChapterMemberUidsSet.has(from) || currentChapterMemberUidsSet.has(to);
        if (!belongsToChapter) return false;
      }

      if (selectedMemberId && selectedMemberId !== 'ALL') {
        if (from !== selectedMemberId && to !== selectedMemberId) return false;
      }

      return true;
    });

    return {
      referrals: filteredRefs,
      meetings: filteredMeetings,
      oneToOnes: filteredOneToOnes,
      guests: filteredGuests,
      testimonials: filteredTestimonials,
      slips: filteredSlips
    };
  }, [referrals, meetings, oneToOnes, guestInvitations, testimonials, thankYouSlips, selectedChapterId, selectedMemberId, currentChapterMemberUidsSet, selectedChapterObj, parsedStart, parsedEnd]);

  // Aggregate stats cards
  
  const chapterGrowthScoreData = useMemo(() => {
    return calculateChapterGrowthScoreData({
      chapterMembers: currentChapterMemberIds.map(id => users.find(u => String(u.uid || u.id) === id)).filter(Boolean),
      activeDateRange: parsedStart && parsedEnd ? { start: parsedStart, end: parsedEnd } : null,
      allReferrals: referrals,
      oneToOnes: oneToOnes,
      meetings: meetings,
      guestInvitations: guestInvitations,
      allSlips: thankYouSlips,
      testimonials: testimonials,
      currentProfile: profile,
      todayTasks: []
    });
  }, [currentChapterMemberIds, users, parsedStart, parsedEnd, referrals, oneToOnes, meetings, guestInvitations, thankYouSlips, testimonials, profile]);

  const statsSummary = useMemo(() => {
    // Total Revenue
    const totalRevenue = reportsData.slips.reduce((sum, s) => sum + (Number(s.businessValue || s.business_value || s.amount) || 0), 0);

    // Referrals Total
    const referralsTotal = reportsData.referrals.length;

    // Attendance Average %
    const completedMeetings = reportsData.meetings.filter(m => m.isCompleted || m.status === 'COMPLETED');
    let totalPresentCount = 0;
    let totalAttendanceRecords = 0;

    completedMeetings.forEach(m => {
      if (m.attendance) {
        currentChapterMemberIds.forEach(memberId => {
          const status = m.attendance[memberId];
          if (status) {
            totalAttendanceRecords++;
            if (['PRESENT', 'Yes', 'Substitute', 'Late', 'YES', 'SUBSTITUTE', 'Present'].includes(String(status))) {
              totalPresentCount++;
            }
          }
        });
      }
    });
    const avgAttendance = totalAttendanceRecords === 0 ? 0 : Math.round((totalPresentCount / totalAttendanceRecords) * 100);

    // One-to-Ones Completed
    const completedOneToOnes = reportsData.oneToOnes.filter(m => m.status === 'COMPLETED').length;

    // Guests Count (Total chapter guests / visitors)
    const guestsAttended = reportsData.guests.length;

    // Testimonials Approved
    const approvedTestimonials = reportsData.testimonials.filter(t => t.status === 'APPROVED' || !t.status).length;

    return {
      totalRevenue,
      referralsTotal,
      avgAttendance,
      completedOneToOnes,
      guestsAttended,
      approvedTestimonials,
      memberCount: filteredMembers.length
    };
  }, [reportsData, currentChapterMemberIds, filteredMembers]);

  // Calculate detailed table data for each member in the chapter
  const tableData = useMemo(() => {
    const results = filteredMembers.map(member => {
      const mUid = String(member.uid || member.id);

      // 1. Referrals Passed
      const referralsPassed = reportsData.referrals.filter(r => String(r.fromUserId || r.sender_id) === mUid).length;

      // 2. Attendance %
      const completedMeetings = reportsData.meetings.filter(m => m.isCompleted || m.status === 'COMPLETED');
      let attendedMeetings = 0;
      let totalChapterMeetings = 0;

      completedMeetings.forEach(m => {
        if (m.attendance && m.attendance[mUid]) {
          totalChapterMeetings++;
          if (['PRESENT', 'Yes', 'Substitute', 'Late', 'YES', 'SUBSTITUTE', 'Present'].includes(String(m.attendance[mUid]))) {
            attendedMeetings++;
          }
        }
      });
      const attendancePercent = totalChapterMeetings === 0 ? 0 : Math.round((attendedMeetings / totalChapterMeetings) * 100);

      // 3. 1-to-1 Completed
      const completedOneToOnesCount = reportsData.oneToOnes.filter(m => 
        m.status === 'COMPLETED' && (
          String(m.organizer_id || m.creatorId || m.sender_id) === mUid || 
          String(m.member_id || m.receiver_id) === mUid ||
          (m.participantIds && m.participantIds.map(String).includes(mUid))
        )
      ).length;

      // 4. Guests Invited
      const guestsInvited = reportsData.guests.filter(g => {
        const inviterId = String(
          g.invited_by_user_id || 
          (g as any).invitedByUserId || 
          g.invited_by || 
          (g as any).invitedBy || 
          g.createdBy || 
          (g as any).created_by || 
          g.inviterId || 
          (g as any).inviter_id || 
          g.user_id || 
          (g as any).memberId || 
          ''
        ).trim();
        return inviterId === mUid;
      }).length;

      // 5. Testimonials Submitted
      const testimonialsSubmitted = reportsData.testimonials.filter(t => String(t.authorMemberId || t.author_id || (t as any).fromUserId) === mUid).length;

      let startStr = member.subscriptionStart || member.subscriptionStartDate || member.created_at || member.createdAt;
      let endStr = member.subscriptionEnd || member.subscriptionEndDate || member.current_subscription_end_date;
      const sDate = parseSafeDate(startStr);
      let eDate = parseSafeDate(endStr);
      if (sDate && !eDate) {
        eDate = new Date(sDate);
        eDate.setFullYear(eDate.getFullYear() + 1);
      }
      const memberSubRange = (sDate && eDate) ? { start: sDate, end: eDate } : null;

      // Formulaic custom Growth Score out of 100 based on Daily Task Workspace
      let growthScore = calculateMemberGrowthScoreData({
        profile: member,
        activeDateRange: memberSubRange,
        allReferrals: reportsData.referrals,
        oneToOnes: reportsData.oneToOnes,
        meetings: reportsData.meetings,
        guestInvitations: reportsData.guests
      }).score;
      growthScore = Math.min(100, Math.max(0, Math.round(growthScore)));

      // Human-readable position label
      const { positionKey, displayPosition } = getMemberPositionInfo(member);

      return {
        uid: mUid,
        name: member.name || (member as any).full_name || (member as any).displayName || 'Anonymous User',
        position: displayPosition,
        positionKey: positionKey,
        referrals: referralsPassed,
        attendance: attendancePercent,
        oneToOnes: completedOneToOnesCount,
        guests: guestsInvited,
        testimonials: testimonialsSubmitted,
        status: member.membershipStatus || 'ACTIVE',
        growthScore,
        businessName: member.businessName || (member as any).company_name || 'N/A'
      };
    });

    // Handle Search filter
    let processed = results;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      processed = processed.filter(r => 
        r.name.toLowerCase().includes(q) || 
        r.position.toLowerCase().includes(q) ||
        r.businessName.toLowerCase().includes(q)
      );
    }

    // Handle Sorting
    processed.sort((a: any, b: any) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // Handle string comparisons
      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return processed;
  }, [filteredMembers, reportsData, searchQuery, sortField, sortDirection, selectedChapterObj]);

  // Derived data for charts
  const monthlyMetricsChartData = useMemo(() => {
    // Generate an array of month keys over the selected date range
    const monthsMap: Record<string, { month: string; referrals: number; attendance: number; meetings: number; business: number }> = {};
    
    // Initialize past 6 months to make chart look complete
    const tempDate = (parsedEnd && parseSafeDate(parsedEnd)) ? parseSafeDate(parsedEnd)! : new Date();
    for (let i = 5; i >= 0; i--) {
      const targetMonth = subMonths(tempDate, i);
      const key = format(targetMonth, 'MMM yyyy');
      monthsMap[key] = { month: key, referrals: 0, attendance: 0, meetings: 0, business: 0 };
    }

    // Accumulate referrals
    reportsData.referrals.forEach(ref => {
      const refDate = ref.createdAt || (ref as any).created_at || (ref as any).date;
      if (!refDate) return;
      const d = parseSafeDate(refDate);
      if (!d) return;
      const key = format(d, 'MMM yyyy');
      if (monthsMap[key]) {
        monthsMap[key].referrals++;
      }
    });

    // Accumulate meetings
    reportsData.meetings.forEach(m => {
      const mDate = m.date || (m as any).meeting_date || (m as any).created_at;
      if (!mDate) return;
      const d = parseSafeDate(mDate);
      if (!d) return;
      const key = format(d, 'MMM yyyy');
      if (monthsMap[key]) {
        monthsMap[key].meetings++;
      }
    });

    // Accumulate business (Thank you slips)
    reportsData.slips.forEach(slip => {
      const slipDate = slip.createdAt || (slip as any).created_at || (slip as any).date;
      if (!slipDate) return;
      const d = parseSafeDate(slipDate);
      if (!d) return;
      const key = format(d, 'MMM yyyy');
      if (monthsMap[key]) {
        monthsMap[key].business += (Number(slip.businessValue || (slip as any).business_value) || 0);
      }
    });

    // Calculate meeting average attendance per month
    const monthlyMeetings: Record<string, { present: number; total: number }> = {};
    reportsData.meetings.filter(m => m.isCompleted).forEach(m => {
      const mDate = m.date || (m as any).meeting_date || (m as any).created_at;
      if (!mDate) return;
      const d = parseSafeDate(mDate);
      if (!d) return;
      const key = format(d, 'MMM yyyy');
      if (!monthlyMeetings[key]) {
        monthlyMeetings[key] = { present: 0, total: 0 };
      }
      if (m.attendance) {
        currentChapterMemberIds.forEach(mid => {
          const status = m.attendance[mid];
          if (status) {
            monthlyMeetings[key].total++;
            if (['PRESENT', 'Yes', 'Substitute', 'Late', 'YES', 'SUBSTITUTE'].includes(String(status))) {
              monthlyMeetings[key].present++;
            }
          }
        });
      }
    });

    Object.entries(monthlyMeetings).forEach(([key, val]) => {
      if (monthsMap[key] && val.total > 0) {
        monthsMap[key].attendance = Math.round((val.present / val.total) * 100);
      }
    });

    return Object.values(monthsMap);
  }, [reportsData, currentChapterMemberIds, parsedEnd]);

  // Derived data for performance scatter/pie
  const growthScoreDistribution = useMemo(() => {
    const categories = {
      'Excellent (>=80)': 0,
      'On Track (50-79)': 0,
      'Action Required (<50)': 0,
    };

    tableData.forEach(row => {
      if (row.growthScore >= 80) categories['Excellent (>=80)']++;
      else if (row.growthScore >= 50) categories['On Track (50-79)']++;
      else categories['Action Required (<50)']++;
    });

    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [tableData]);

  // Handle Header sorting toggle
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Safe date checker
  function isWithinDateRange(dateVal: any, start: Date | null, end: Date | null): boolean {
    if (!start || !end) return true; // Include everything if no date filter is applied
    if (!dateVal) return false;
    try {
      const date = parseSafeDate(dateVal);
      if (!date) return false;
      return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
    } catch {
      return false;
    }
  }

  // Get active chapter name
  const currentChapterName = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN') {
      if (selectedChapterId === 'ALL' || !selectedChapterId) return 'All Chapters';
      const ch = chapters.find(c => c.id === selectedChapterId);
      return ch ? ch.chapter_name : 'Selected Chapter';
    }
    return profile?.chapterName || 'My Chapter';
  }, [profile, selectedChapterId, chapters]);

  // Dynamic formatting of business values
  const formatCur = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${val.toLocaleString()}`;
  };

  // Helper to resolve user name by ID
  const resolveMemberNameById = (id: any, fallback?: string) => {
    if (!id) return fallback || 'Chapter Member';
    const u = users.find(user => String(user.uid || user.id) === String(id));
    return u?.name || (u as any)?.full_name || (u as any)?.displayName || fallback || 'Chapter Member';
  };

  // EXPORT HANDLERS
  const exportToCSV = () => {
    if (tableData.length === 0) return;
    
    const headers = ['Member Name', 'Business Name', 'Chapter Position', 'Referrals Passed', 'Attendance Rate %', 'Completed 1-to-1s', 'Guests Invited', 'Testimonials Written', 'Status', 'Growth Score'];
    const rows = tableData.map(r => [
      r.name,
      r.businessName,
      r.position,
      r.referrals,
      `${r.attendance}%`,
      r.oneToOnes,
      r.guests,
      r.testimonials,
      r.status,
      r.growthScore
    ]);

    const csvContent = [
      `SSK Business Network - Chapter Performance Report`,
      `Chapter: ${currentChapterName}`,
      `Period: ${startDate ? format(startDate, 'dd MMM yyyy') : 'All Time'} to ${endDate ? format(endDate, 'dd MMM yyyy') : 'All Time'}`,
      ``,
      headers.join(','),
      ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Roster_Report_${currentChapterName.replace(/\s+/g, '_')}_${startDate || 'AllTime'}_to_${endDate || 'AllTime'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
  };

  const exportToExcel = async () => {
    const XLSX = await import("xlsx");
    if (tableData.length === 0) return;

    const dataForSheet = tableData.map(r => ({
      'Member Name': r.name,
      'Business / Company': r.businessName,
      'Chapter Role / Position': r.position,
      'Referrals Passed': r.referrals,
      'Attendance Rate %': r.attendance,
      'Completed 1-to-1s': r.oneToOnes,
      'Guests Invited': r.guests,
      'Testimonials Submitted': r.testimonials,
      'Roster Status': r.status,
      'Growth Performance Score': r.growthScore
    }));

    const ws = XLSX.utils.json_to_sheet(dataForSheet);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Roster Performance');

    // Add metadata/header rows nicely
    XLSX.writeFile(wb, `Performance_Report_${currentChapterName.replace(/\s+/g, '_')}_${startDate || 'AllTime'}_to_${endDate || 'AllTime'}.xlsx`);
    setShowExportMenu(false);
  };

  const exportToPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    if (tableData.length === 0) return;

    const doc = new jsPDF('landscape', 'pt', 'a4');
    
    // Document brand colors (Deep Charcoal #11131A, Red #E53935)
    doc.setFillColor(17, 19, 26);
    doc.rect(0, 0, 842, 60, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('SSK BUSINESS NETWORK - CHAPTER REPORT', 40, 36);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(156, 163, 175);
    doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, 660, 36);

    // Section 1: Meta detail labels
    doc.setTextColor(17, 19, 26);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Chapter Name: ${currentChapterName.toUpperCase()}`, 40, 95);
    doc.setFont('helvetica', 'normal');
    doc.text(`Reporting Period: ${startDate ? format(startDate, 'dd MMM yyyy') : 'All Time'} to ${endDate ? format(endDate, 'dd MMM yyyy') : 'All Time'}`, 40, 115);

    // Key metrics summary section
    doc.setFillColor(243, 244, 246);
    doc.rect(40, 135, 762, 50, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('MEMBERS', 60, 155);
    doc.text('REVENUE GENERATED', 170, 155);
    doc.text('REFERRALS PASSED', 340, 155);
    doc.text('AVG ATTENDANCE', 490, 155);
    doc.text('GUESTS ATTENDED', 630, 155);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(String(statsSummary.memberCount), 60, 173);
    doc.text(formatCur(statsSummary.totalRevenue), 170, 173);
    doc.text(String(statsSummary.referralsTotal), 340, 173);
    doc.text(`${statsSummary.avgAttendance}%`, 490, 173);
    doc.text(String(statsSummary.guestsAttended), 630, 173);

    // Section 2: Table
    const headers = [['Member Name', 'Company Name', 'Position', 'Referrals', 'Attendance %', '1-to-1s', 'Guests', 'Testimonials', 'Status', 'Growth Score']];
    const rows = tableData.map(r => [
      r.name,
      r.businessName,
      r.position,
      String(r.referrals),
      `${r.attendance}%`,
      String(r.oneToOnes),
      String(r.guests),
      String(r.testimonials),
      r.status,
      `${r.growthScore}/100`
    ]);

    autoTable(doc, {
      startY: 210,
      head: headers,
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [229, 57, 37], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8.5 },
      columnStyles: {
        0: { cellWidth: 110 },
        1: { cellWidth: 100 },
        2: { cellWidth: 90 },
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center' },
        6: { halign: 'center' },
        7: { halign: 'center' },
        8: { halign: 'center' },
        9: { halign: 'center', fontStyle: 'bold' }
      },
      margin: { left: 40, right: 40 },
    });

    doc.save(`Performance_Report_${currentChapterName.replace(/\s+/g, '_')}_${startDate || 'AllTime'}_to_${endDate || 'AllTime'}.pdf`);
    setShowExportMenu(false);
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 pb-20 relative">
      
      {/* Background radial soft light blobs */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-[-1]">
        <div className="absolute top-[-10%] right-[-5%] w-[60%] h-[50%] bg-[#E53935]/2 blur-[130px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#3B82F6]/2 blur-[130px] rounded-full" />
      </div>

            {/* HEADER SECTION */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-white/5 pb-5"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8">
          <div>
            <span className="text-[11px] font-extrabold text-[#9CA3AF] uppercase tracking-[3px]">
              Enterprise Analytics Suite
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight flex items-center gap-2">
              <Activity className="text-[#E53935] h-7 w-7" />
              {(() => {
                if (!currentChapterName || currentChapterName === 'All Chapters') return 'ALL CHAPTERS REPORT';
                const upper = currentChapterName.trim().toUpperCase();
                if (upper.endsWith('CHAPTER')) return `${upper} REPORT`;
                return `${upper} CHAPTER REPORT`;
              })()}
            </h1>
            <p className="text-xs text-[#9CA3AF] mt-1 font-bold uppercase tracking-wider">
              {profile?.role === 'MASTER_ADMIN' 
                ? `Super Admin dashboard monitoring: ${currentChapterName}` 
                : `Roster performance audits and metrics overview for ${currentChapterName}`}
            </p>
          </div>
          
          <div className="flex items-center gap-4 bg-[#111827]/80 border border-white/10 px-5 py-3 rounded-2xl">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-[#9CA3AF] font-bold uppercase">Growth Score</span>
              <span className="text-2xl font-black text-white leading-none">{chapterGrowthScoreData.score}%</span>
            </div>
            <div className="w-px h-8 bg-white/10"></div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-[#9CA3AF] font-bold uppercase">Status</span>
              <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border mt-1", chapterGrowthScoreData.statusColor)}>
                {chapterGrowthScoreData.status}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls (Export) */}
        <div className="flex items-center gap-3 relative shrink-0">
          {profile?.role === 'CHAPTER_ADMIN' && (
            <button
              onClick={() => setIsFilterModalOpen(true)}
              className={cn(
                "flex items-center gap-1.5 text-xs font-bold px-5 h-[44px] rounded-[14px] shadow-sm border transition-all cursor-pointer",
                (startDate || endDate) 
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                  : "bg-[#111827]/80 text-[#9CA3AF] border-white/10 hover:text-white"
              )}
            >
              <Filter size={14} />
              {(startDate || endDate) ? 'Filtered' : 'Filter'}
              {(startDate || endDate) && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
              )}
            </button>
          )}
          <button 
            onClick={() => setShowExportMenu(prev => !prev)}
            className="bg-[#E53935] hover:bg-[#D32F2F] text-white px-5 h-[44px] rounded-[14px] font-bold text-xs flex items-center gap-2 shadow-[0_4px_20px_rgba(229,57,53,0.3)] transition-all cursor-pointer"
          >
            <Download size={14} />
            Export Report
            <ChevronDown size={14} className={cn("transition-transform", showExportMenu && "rotate-180")} />
          </button>

          <AnimatePresence>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                <motion.div 
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute right-0 top-[52px] bg-[#11131A] border border-white/10 rounded-[16px] shadow-[0_12px_40px_rgba(0,0,0,0.7)] p-2 w-[180px] z-50 overflow-hidden"
                >
                  <button 
                    onClick={exportToPDF}
                    className="w-full text-left px-4 py-2.5 rounded-[10px] text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
                  >
                    <FileText size={14} className="text-red-400" />
                    Download PDF
                  </button>
                  <button 
                    onClick={exportToExcel}
                    className="w-full text-left px-4 py-2.5 rounded-[10px] text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
                  >
                    <FileText size={14} className="text-emerald-400" />
                    Download Excel
                  </button>
                  <button 
                    onClick={exportToCSV}
                    className="w-full text-left px-4 py-2.5 rounded-[10px] text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
                  >
                    <FileText size={14} className="text-blue-400" />
                    Download CSV
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* FILTERS & DURATION PANEL */}
      {profile?.role === 'MASTER_ADMIN' && (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#111827] border border-white/5 rounded-[20px] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] space-y-4"
      >
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Master Admin Chapter Selector */}
            {profile?.role === 'MASTER_ADMIN' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-wider">Chapter</label>
                <div className="relative">
                  <select
                    value={selectedChapterId}
                    onChange={(e) => {
                      const newChapterId = e.target.value;
                      setSelectedChapterId(newChapterId);
                      if (newChapterId !== 'ALL') {
                        const memberBelongs = availableMemberOptions.some(u => 
                          (u.uid === selectedMemberId || u.id === selectedMemberId) && 
                          (u.chapter_id === newChapterId || u.chapterId === newChapterId)
                        );
                        if (!memberBelongs) {
                          setSelectedMemberId('ALL');
                        }
                      }
                    }}
                    className="bg-[#0B1220] border border-white/10 rounded-[12px] text-xs font-bold text-white px-3 py-2.5 pr-8 appearance-none focus:outline-none focus:border-[#E53935] min-w-[150px]"
                  >
                    <option value="ALL">All Chapters</option>
                    {chapters.map(c => (
                      <option key={c.id} value={c.id}>{c.chapter_name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" size={14} />
                </div>
              </div>
            )}

            {/* Master Admin Member Selector */}
            {profile?.role === 'MASTER_ADMIN' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-wider">Member</label>
                <div className="relative">
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="bg-[#0B1220] border border-white/10 rounded-[12px] text-xs font-bold text-white px-3 py-2.5 pr-8 appearance-none focus:outline-none focus:border-[#E53935] min-w-[150px]"
                  >
                    <option value="ALL">All Members</option>
                    {availableMemberOptions.map(m => (
                      <option key={m.uid || m.id} value={m.uid || m.id}>
                        {m.name || 'Unnamed'} {m.chapterName ? `(${m.chapterName})` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" size={14} />
                </div>
              </div>
            )}
                      {/* Filters Removed for Growth Score */}
          </div>
        </div>
      </motion.div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 bg-[#111827] rounded-[20px] border border-white/5 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#E53935]"></div>
          <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.3em] animate-pulse">Syncing Reports Telemetry...</p>
        </div>
      ) : (
        <>
          {/* OVERVIEW STATS CARDS GRID */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Total Members */}
            <motion.div 
              whileHover={{ y: -4 }}
              onClick={() => { setSelectedDetailCard('members'); setDetailSearchQuery(''); }}
              className="bg-[#111827] border border-white/5 rounded-[20px] p-4 flex flex-col justify-between h-[120px] relative overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.3)] cursor-pointer hover:border-white/20 active:scale-[0.99] transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-wider group-hover:text-white transition-colors">Active Members</span>
                <div className="w-6 h-6 rounded-[8px] bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition-transform">
                  <Users size={12} />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-black text-white leading-none">{statsSummary.memberCount}</h3>
                <p className="text-[9px] text-[#9CA3AF] font-bold mt-1 uppercase">Total Chapter Seat</p>
              </div>
            </motion.div>

            {/* Business Generated */}
            <motion.div 
              whileHover={{ y: -4 }}
              onClick={() => { setSelectedDetailCard('revenue'); setDetailSearchQuery(''); }}
              className="bg-[#111827] border border-white/5 rounded-[20px] p-4 flex flex-col justify-between h-[120px] relative overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.3)] cursor-pointer hover:border-white/20 active:scale-[0.99] transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-wider group-hover:text-white transition-colors">Revenue</span>
                <div className="w-6 h-6 rounded-[8px] bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition-transform">
                  <Briefcase size={12} />
                </div>
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white leading-none truncate">{formatCur(statsSummary.totalRevenue)}</h3>
                <p className="text-[9px] text-[#9CA3AF] font-bold mt-1 uppercase">Thank You Slips</p>
              </div>
            </motion.div>

            {/* Referrals */}
            <motion.div 
              whileHover={{ y: -4 }}
              onClick={() => { setSelectedDetailCard('referrals'); setDetailSearchQuery(''); }}
              className="bg-[#111827] border border-white/5 rounded-[20px] p-4 flex flex-col justify-between h-[120px] relative overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.3)] cursor-pointer hover:border-white/20 active:scale-[0.99] transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-wider group-hover:text-white transition-colors">Referrals</span>
                <div className="w-6 h-6 rounded-[8px] bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
                  <Share2 size={12} />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-black text-white leading-none">{statsSummary.referralsTotal}</h3>
                <p className="text-[9px] text-[#9CA3AF] font-bold mt-1 uppercase">Passed inside Chapter</p>
              </div>
            </motion.div>

            {/* Attendance % */}
            <motion.div 
              whileHover={{ y: -4 }}
              onClick={() => { setSelectedDetailCard('attendance'); setDetailSearchQuery(''); }}
              className="bg-[#111827] border border-white/5 rounded-[20px] p-4 flex flex-col justify-between h-[120px] relative overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.3)] cursor-pointer hover:border-white/20 active:scale-[0.99] transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-wider group-hover:text-white transition-colors">Avg Attendance</span>
                <div className="w-6 h-6 rounded-[8px] bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20 group-hover:scale-110 transition-transform">
                  <Calendar size={12} />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-black text-white leading-none">{statsSummary.avgAttendance}%</h3>
                <p className="text-[9px] text-[#9CA3AF] font-bold mt-1 uppercase">Roll Call Average</p>
              </div>
            </motion.div>

            {/* 1-to-1s Completed */}
            <motion.div 
              whileHover={{ y: -4 }}
              onClick={() => { setSelectedDetailCard('oneToOnes'); setDetailSearchQuery(''); }}
              className="bg-[#111827] border border-white/5 rounded-[20px] p-4 flex flex-col justify-between h-[120px] relative overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.3)] cursor-pointer hover:border-white/20 active:scale-[0.99] transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-wider group-hover:text-white transition-colors">1-to-1 Meetings</span>
                <div className="w-6 h-6 rounded-[8px] bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform">
                  <Layers size={12} />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-black text-white leading-none">{statsSummary.completedOneToOnes}</h3>
                <p className="text-[9px] text-[#9CA3AF] font-bold mt-1 uppercase">Completed Syncs</p>
              </div>
            </motion.div>

            {/* Guests Invited */}
            <motion.div 
              whileHover={{ y: -4 }}
              onClick={() => { setSelectedDetailCard('guests'); setDetailSearchQuery(''); }}
              className="bg-[#111827] border border-white/5 rounded-[20px] p-4 flex flex-col justify-between h-[120px] relative overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.3)] cursor-pointer hover:border-white/20 active:scale-[0.99] transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-wider group-hover:text-white transition-colors">Visitors Attended</span>
                <div className="w-6 h-6 rounded-[8px] bg-pink-500/10 text-pink-400 flex items-center justify-center border border-pink-500/20 group-hover:scale-110 transition-transform">
                  <UserPlus size={12} />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-black text-white leading-none">{statsSummary.guestsAttended}</h3>
                <p className="text-[9px] text-[#9CA3AF] font-bold mt-1 uppercase">Total Roster Visitors</p>
              </div>
            </motion.div>
          </div>

          {/* TAB SELECTION */}
          <div className="flex items-center border-b border-white/5 gap-4">
            <button
              onClick={() => setActiveTab('table')}
              className={cn(
                "px-4 pb-3 text-sm font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer",
                activeTab === 'table' ? "border-[#E53935] text-white" : "border-transparent text-[#9CA3AF] hover:text-white"
              )}
            >
              Member Performance
            </button>
            <button
              onClick={() => setActiveTab('charts')}
              className={cn(
                "px-4 pb-3 text-sm font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer",
                activeTab === 'charts' ? "border-[#E53935] text-white" : "border-transparent text-[#9CA3AF] hover:text-white"
              )}
            >
              Analytics & Trends
            </button>
          </div>

          {/* TAB CONTENT: MEMBER TABLE */}
          {activeTab === 'table' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {/* Table Toolbar */}
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-[#111827] p-4 rounded-[16px] border border-white/5">
                {/* Search */}
                <div className="relative w-full sm:w-[320px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4B5563]" size={16} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search member, role, or company..."
                    className="bg-[#0B1220] border border-white/10 rounded-[12px] pl-9 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#E53935] w-full"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4B5563] hover:text-white">
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                  <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Roster Filter</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-[#0B1220] border border-white/10 rounded-[12px] text-xs font-bold text-white px-3 py-2.5 focus:outline-none focus:border-[#E53935]"
                  >
                    <option value="ALL">All Members</option>
                    <option value="ACTIVE">Active</option>
                    <option value="PENDING">Pending</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
              </div>

              {/* Roster Table */}
              <div className="bg-[#111827] border border-white/5 rounded-[20px] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead>
                      <tr className="bg-[#0B1220]/60 border-b border-white/5">
                        <th className="p-4 text-[10px] font-black text-[#9CA3AF] uppercase tracking-wider cursor-pointer" onClick={() => handleSort('name')}>
                          <div className="flex items-center gap-1">
                            Member Name {sortField === 'name' && (sortDirection === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}
                          </div>
                        </th>
                        <th className="p-4 text-[10px] font-black text-[#9CA3AF] uppercase tracking-wider cursor-pointer" onClick={() => handleSort('positionKey')}>
                          <div className="flex items-center gap-1">
                            Position {sortField === 'positionKey' && (sortDirection === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}
                          </div>
                        </th>
                        <th className="p-4 text-[10px] font-black text-[#9CA3AF] uppercase tracking-wider text-center cursor-pointer" onClick={() => handleSort('referrals')}>
                          <div className="flex items-center gap-1 justify-center">
                            Referrals {sortField === 'referrals' && (sortDirection === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}
                          </div>
                        </th>
                        <th className="p-4 text-[10px] font-black text-[#9CA3AF] uppercase tracking-wider text-center cursor-pointer" onClick={() => handleSort('attendance')}>
                          <div className="flex items-center gap-1 justify-center">
                            Attendance % {sortField === 'attendance' && (sortDirection === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}
                          </div>
                        </th>
                        <th className="p-4 text-[10px] font-black text-[#9CA3AF] uppercase tracking-wider text-center cursor-pointer" onClick={() => handleSort('oneToOnes')}>
                          <div className="flex items-center gap-1 justify-center">
                            1-to-1s {sortField === 'oneToOnes' && (sortDirection === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}
                          </div>
                        </th>
                        <th className="p-4 text-[10px] font-black text-[#9CA3AF] uppercase tracking-wider text-center cursor-pointer" onClick={() => handleSort('guests')}>
                          <div className="flex items-center gap-1 justify-center">
                            Guests {sortField === 'guests' && (sortDirection === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}
                          </div>
                        </th>
                        <th className="p-4 text-[10px] font-black text-[#9CA3AF] uppercase tracking-wider text-center cursor-pointer" onClick={() => handleSort('testimonials')}>
                          <div className="flex items-center gap-1 justify-center">
                            Testimonials {sortField === 'testimonials' && (sortDirection === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}
                          </div>
                        </th>
                        <th className="p-4 text-[10px] font-black text-[#9CA3AF] uppercase tracking-wider text-center cursor-pointer" onClick={() => handleSort('status')}>
                          <div className="flex items-center gap-1 justify-center">
                            Status {sortField === 'status' && (sortDirection === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}
                          </div>
                        </th>
                        <th className="p-4 text-[10px] font-black text-[#9CA3AF] uppercase tracking-wider text-center cursor-pointer" onClick={() => handleSort('growthScore')}>
                          <div className="flex items-center gap-1 justify-center">
                            Growth Score {sortField === 'growthScore' && (sortDirection === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {tableData.length > 0 ? (
                        tableData.map((row, index) => (
                          <tr key={row.uid} className="hover:bg-white/2 transition-colors">
                            {/* Member Name */}
                            <td className="p-4">
                              <div className="font-bold text-white text-sm">{row.name}</div>
                              <div className="text-[10px] text-[#9CA3AF] font-bold uppercase">{row.businessName}</div>
                            </td>
                            
                            {/* Position */}
                            <td className="p-4">
                              <span className={cn(
                                "text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase border",
                                row.positionKey === 'president' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                row.positionKey === 'vice_president' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                row.positionKey === 'treasurer' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                                row.positionKey === 'chapter_admin' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                                "bg-neutral-500/10 text-[#9CA3AF] border-white/5"
                              )}>
                                {row.position}
                              </span>
                            </td>

                            {/* Referrals */}
                            <td className="p-4 text-center text-sm font-extrabold text-white">
                              {row.referrals}
                            </td>

                            {/* Attendance */}
                            <td className="p-4 text-center">
                              <span className={cn(
                                "text-sm font-extrabold",
                                row.attendance >= 80 ? "text-emerald-400" : row.attendance >= 50 ? "text-orange-400" : "text-red-400"
                              )}>
                                {row.attendance}%
                              </span>
                            </td>

                            {/* 1-to-1s */}
                            <td className="p-4 text-center text-sm font-extrabold text-white">
                              {row.oneToOnes}
                            </td>

                            {/* Guests */}
                            <td className="p-4 text-center text-sm font-extrabold text-white">
                              {row.guests}
                            </td>

                            {/* Testimonials */}
                            <td className="p-4 text-center text-sm font-extrabold text-white">
                              {row.testimonials}
                            </td>

                            {/* Status */}
                            <td className="p-4 text-center">
                              <span className={cn(
                                "text-[9px] font-black px-2 py-0.5 rounded-full uppercase border tracking-wider",
                                row.status === 'ACTIVE' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                row.status === 'SUSPENDED' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                                "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              )}>
                                {row.status}
                              </span>
                            </td>

                            {/* Growth Score */}
                            <td className="p-4">
                              <div className="flex flex-col items-center gap-1">
                                <span className={cn(
                                  "text-sm font-black leading-none",
                                  row.growthScore >= 80 ? "text-emerald-400" : row.growthScore >= 50 ? "text-blue-400" : "text-red-400"
                                )}>
                                  {row.growthScore}%
                                </span>
                                <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                                  <div 
                                    className={cn(
                                      "h-full rounded-full",
                                      row.growthScore >= 80 ? "bg-emerald-500" : row.growthScore >= 50 ? "bg-blue-500" : "bg-red-500"
                                    )}
                                    style={{ width: `${row.growthScore}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-gray-500 font-bold uppercase tracking-[0.2em]">
                            No matching roster members found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB CONTENT: ANALYTICS & CHARTS */}
          {activeTab === 'charts' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* Chart 1: Monthly Attendance Rate & Meeting Completed Trends */}
              <div className="bg-[#111827] border border-white/5 rounded-[20px] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                <h3 className="text-white font-bold text-[14px] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Calendar size={14} className="text-cyan-400" />
                  Monthly Attendance Trends
                </h3>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyMetricsChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="month" stroke="#4B5563" fontSize={9} fontWeight="bold" />
                      <YAxis stroke="#4B5563" fontSize={9} fontWeight="bold" domain={[0, 100]} unit="%" />
                      <Tooltip contentStyle={{ backgroundColor: '#0B1220', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '10px' }} />
                      <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 'bold' }} />
                      <Line type="monotone" dataKey="attendance" name="Attendance %" stroke="#06B6D4" strokeWidth={3.5} dot={{ r: 4 }} activeDot={{ r: 6 }} className="drop-shadow-[0_2px_8px_rgba(6,182,212,0.4)]" />
                      <Line type="monotone" dataKey="meetings" name="Meetings Conducted" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Monthly Referrals & Thank You Slip Value */}
              <div className="bg-[#111827] border border-white/5 rounded-[20px] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                <h3 className="text-white font-bold text-[14px] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Share2 size={14} className="text-[#E53935]" />
                  Monthly Chapter Referrals
                </h3>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyMetricsChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="ref-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#E53935" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#E53935" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="month" stroke="#4B5563" fontSize={9} fontWeight="bold" />
                      <YAxis stroke="#4B5563" fontSize={9} fontWeight="bold" />
                      <Tooltip contentStyle={{ backgroundColor: '#0B1220', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '10px' }} />
                      <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 'bold' }} />
                      <Area type="monotone" dataKey="referrals" name="Referrals Passed" stroke="#E53935" fillOpacity={1} fill="url(#ref-grad)" strokeWidth={3.5} className="drop-shadow-[0_2px_8px_rgba(229,57,53,0.4)]" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 3: Growth Performance Score Distribution */}
              <div className="bg-[#111827] border border-white/5 rounded-[20px] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                <h3 className="text-white font-bold text-[14px] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <TrendingUp size={14} className="text-emerald-400" />
                  Growth Performance Distribution
                </h3>
                <div className="h-[280px] w-full flex items-center justify-center">
                  <div className="w-[60%] h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={growthScoreDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          <Cell fill="#10B981" /> {/* Excellent */}
                          <Cell fill="#3B82F6" /> {/* On Track */}
                          <Cell fill="#EF4444" /> {/* Needs Action */}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0B1220', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Legend */}
                  <div className="w-[40%] flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                      <div>
                        <span className="text-[10px] font-bold text-[#9CA3AF] block uppercase leading-tight">{"Excellent (>=80)"}</span>
                        <span className="text-sm font-black text-white">{growthScoreDistribution[0]?.value || 0} Members</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                      <div>
                        <span className="text-[10px] font-bold text-[#9CA3AF] block uppercase leading-tight">On Track (50-79)</span>
                        <span className="text-sm font-black text-white">{growthScoreDistribution[1]?.value || 0} Members</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                      <div>
                        <span className="text-[10px] font-bold text-[#9CA3AF] block uppercase leading-tight">Needs Action (&lt;50)</span>
                        <span className="text-sm font-black text-white">{growthScoreDistribution[2]?.value || 0} Members</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 4: Chapter Health Score Criteria Information */}
              <div className="bg-gradient-to-br from-[#1E123B] to-[#111827] border border-white/5 rounded-[20px] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col justify-between">
                <div className="space-y-3">
                  <h3 className="text-white font-bold text-[14px] uppercase tracking-wider flex items-center gap-2">
                    <Info size={14} className="text-purple-400" />
                    Score Calculation Matrix
                  </h3>
                  <p className="text-xs text-[#9CA3AF] leading-relaxed font-medium">
                    The Roster Growth Performance score is a mathematical index computed dynamically from real-time chapter metrics. It serves as a single unified metric to audit member engagement:
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3.5 pt-2">
                    <div className="bg-[#0B1220]/60 p-3 rounded-[12px] border border-white/5">
                      <span className="text-[9px] font-bold text-cyan-400 block uppercase mb-1">Attendance rate (40%)</span>
                      <p className="text-[11px] text-gray-400 font-medium">Weight reflects consistent roll call verification across sync meetings.</p>
                    </div>
                    <div className="bg-[#0B1220]/60 p-3 rounded-[12px] border border-white/5">
                      <span className="text-[9px] font-bold text-[#E53935] block uppercase mb-1">Referral Volume (25%)</span>
                      <p className="text-[11px] text-gray-400 font-medium">Earned by passing verified business leads to chapter colleagues.</p>
                    </div>
                    <div className="bg-[#0B1220]/60 p-3 rounded-[12px] border border-white/5">
                      <span className="text-[9px] font-bold text-blue-400 block uppercase mb-1">Completed 1-to-1s (20%)</span>
                      <p className="text-[11px] text-gray-400 font-medium">Index of collaborative sync assemblies booked and closed.</p>
                    </div>
                    <div className="bg-[#0B1220]/60 p-3 rounded-[12px] border border-white/5">
                      <span className="text-[9px] font-bold text-pink-400 block uppercase mb-1">Visitor Invites (15%)</span>
                      <p className="text-[11px] text-gray-400 font-medium">Evaluated through guest onboarding protocols and invitations.</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 mt-4 flex items-center justify-between text-[11px] text-[#9CA3AF] font-bold uppercase">
                  <span>SSK Business Network Standard v2.1</span>
                  <span className="text-purple-400">Audited Daily</span>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* Filter Modal for Chapter Admin */}
      <Modal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title="Filter Chapter Analytics"
      >
        <div className="space-y-6">
          <p className="text-sm text-neutral-400">
            Select a date range to filter the entire Chapter Report, including Growth Score and Analytics.
          </p>

          <div className="bg-[#0B1220] rounded-xl p-5 border border-white/5 shadow-inner">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      {/* Clicked Card Detail Modal */}
      <Modal
        isOpen={!!selectedDetailCard}
        onClose={() => { setSelectedDetailCard(null); setDetailSearchQuery(''); }}
        title={
          selectedDetailCard === 'members' ? `Active Members (${filteredMembers.length})` :
          selectedDetailCard === 'revenue' ? `Chapter Revenue (${reportsData.slips.length} Slips • ${formatCur(statsSummary.totalRevenue)})` :
          selectedDetailCard === 'referrals' ? `Chapter Referrals (${reportsData.referrals.length})` :
          selectedDetailCard === 'attendance' ? `Meeting Attendance (${statsSummary.avgAttendance}% Avg)` :
          selectedDetailCard === 'oneToOnes' ? `1-to-1 Meetings (${statsSummary.completedOneToOnes})` :
          selectedDetailCard === 'guests' ? `Visitors Attended (${statsSummary.guestsAttended})` : 'Details'
        }
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4">
          {/* Subheader & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
            <div className="text-xs font-semibold text-[#9CA3AF]">
              {selectedDetailCard === 'members' && `All members and leadership belonging to ${currentChapterName}`}
              {selectedDetailCard === 'revenue' && `Verified thank you slips for ${currentChapterName}`}
              {selectedDetailCard === 'referrals' && `Direct & chapter referrals passed within ${currentChapterName}`}
              {selectedDetailCard === 'attendance' && `Completed meeting attendance history for ${currentChapterName}`}
              {selectedDetailCard === 'oneToOnes' && `Completed 1-to-1 syncs between chapter members`}
              {selectedDetailCard === 'guests' && `Visitors confirmed attended in chapter meetings`}
            </div>
            
            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" size={14} />
              <input
                type="text"
                placeholder="Search records..."
                value={detailSearchQuery}
                onChange={(e) => setDetailSearchQuery(e.target.value)}
                className="w-full bg-[#111827] border border-white/10 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-[#6B7280] focus:border-red-500 focus:outline-none transition-all"
              />
              {detailSearchQuery && (
                <button
                  onClick={() => setDetailSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-white"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* List Content */}
          <div className="max-h-[60vh] overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
            {/* 1. MEMBERS */}
            {selectedDetailCard === 'members' && (() => {
              const q = detailSearchQuery.toLowerCase().trim();
              const items = filteredMembers.filter(m => {
                if (!q) return true;
                const { displayPosition } = getMemberPositionInfo(m);
                return (m.name || (m as any).full_name || '').toLowerCase().includes(q) ||
                       (m.businessName || (m as any).company_name || '').toLowerCase().includes(q) ||
                       displayPosition.toLowerCase().includes(q) ||
                       (m.email || '').toLowerCase().includes(q) ||
                       (m.phone || '').includes(q);
              });

              if (items.length === 0) {
                return (
                  <div className="text-center py-10 text-[#9CA3AF] text-sm font-medium">
                    No members found matching your search.
                  </div>
                );
              }

              return items.map((m) => {
                const { displayPosition, positionKey } = getMemberPositionInfo(m);
                const isLeader = ['president', 'vice_president', 'treasurer', 'chapter_admin'].includes(positionKey);
                const initials = (m.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

                return (
                  <div 
                    key={String(m.uid || m.id)}
                    className="p-3.5 bg-[#111827] border border-white/5 rounded-xl hover:border-white/10 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs uppercase shrink-0 border",
                        isLeader 
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30" 
                          : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                      )}>
                        {initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white">{m.name || (m as any).full_name || 'Member'}</span>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide",
                            isLeader 
                              ? "bg-amber-500/15 text-amber-400 border border-amber-500/30" 
                              : "bg-white/5 text-[#9CA3AF] border border-white/10"
                          )}>
                            {displayPosition}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[#9CA3AF] mt-1 flex-wrap">
                          {(m.businessName || (m as any).company_name) && (
                            <span className="flex items-center gap-1">
                              <Building size={12} className="text-[#6B7280]" />
                              {m.businessName || (m as any).company_name}
                            </span>
                          )}
                          {m.phone && (
                            <span className="flex items-center gap-1">
                              <Phone size={12} className="text-[#6B7280]" />
                              {m.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span className={cn(
                        "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase",
                        m.membershipStatus === 'ACTIVE' 
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" 
                          : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                      )}>
                        {m.membershipStatus || 'ACTIVE'}
                      </span>
                    </div>
                  </div>
                );
              });
            })()}

            {/* 2. REVENUE */}
            {selectedDetailCard === 'revenue' && (() => {
              const q = detailSearchQuery.toLowerCase().trim();
              const items = reportsData.slips.filter(s => {
                if (!q) return true;
                const giver = resolveMemberNameById(s.fromUserId || (s as any).from_user_id || (s as any).sender_id);
                const receiver = resolveMemberNameById(s.toUserId || (s as any).to_user_id || (s as any).receiver_id);
                const valStr = String(s.businessValue || s.business_value || s.amount || '');
                return giver.toLowerCase().includes(q) ||
                       receiver.toLowerCase().includes(q) ||
                       valStr.includes(q) ||
                       (s.notes || (s as any).comments || '').toLowerCase().includes(q);
              });

              if (items.length === 0) {
                return (
                  <div className="text-center py-10 text-[#9CA3AF] text-sm font-medium">
                    No revenue slips found for the selected period.
                  </div>
                );
              }

              return items.map((s, idx) => {
                const giver = resolveMemberNameById(s.fromUserId || (s as any).from_user_id || (s as any).sender_id);
                const receiver = resolveMemberNameById(s.toUserId || (s as any).to_user_id || (s as any).receiver_id);
                const rawVal = Number(s.businessValue || s.business_value || s.amount) || 0;
                const d = parseSafeDate(s.createdAt || (s as any).created_at || s.date);
                const formattedDate = d ? format(d, 'dd MMM yyyy') : 'Recent';

                return (
                  <div 
                    key={s.id || `slip-${idx}`}
                    className="p-3.5 bg-[#111827] border border-white/5 rounded-xl hover:border-white/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">{giver}</span>
                        <ArrowRight size={12} className="text-[#6B7280]" />
                        <span className="text-sm font-bold text-emerald-400">{receiver}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#9CA3AF] mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} className="text-[#6B7280]" />
                          {formattedDate}
                        </span>
                        {s.notes && (
                          <span className="text-[#6B7280] italic truncate max-w-xs">"{s.notes}"</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-base font-black text-emerald-400">
                        ₹{rawVal.toLocaleString()}
                      </span>
                      <span className="block text-[10px] uppercase font-bold text-[#6B7280]">Verified Slip</span>
                    </div>
                  </div>
                );
              });
            })()}

            {/* 3. REFERRALS */}
            {selectedDetailCard === 'referrals' && (() => {
              const q = detailSearchQuery.toLowerCase().trim();
              const items = reportsData.referrals.filter(r => {
                if (!q) return true;
                const giver = resolveMemberNameById(r.fromUserId || r.sender_id);
                const receiver = resolveMemberNameById(r.toUserId || r.receiver_id);
                return giver.toLowerCase().includes(q) ||
                       receiver.toLowerCase().includes(q) ||
                       (r.referralName || (r as any).client_name || '').toLowerCase().includes(q) ||
                       (r.notes || (r as any).description || '').toLowerCase().includes(q);
              });

              if (items.length === 0) {
                return (
                  <div className="text-center py-10 text-[#9CA3AF] text-sm font-medium">
                    No referrals found for the selected period.
                  </div>
                );
              }

              return items.map((r, idx) => {
                const giver = resolveMemberNameById(r.fromUserId || r.sender_id);
                const receiver = resolveMemberNameById(r.toUserId || r.receiver_id);
                const d = parseSafeDate(r.createdAt || (r as any).created_at);
                const formattedDate = d ? format(d, 'dd MMM yyyy') : 'Recent';

                return (
                  <div 
                    key={r.id || `ref-${idx}`}
                    className="p-3.5 bg-[#111827] border border-white/5 rounded-xl hover:border-white/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">{giver}</span>
                        <ArrowRight size={12} className="text-[#6B7280]" />
                        <span className="text-sm font-bold text-indigo-400">{receiver}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#9CA3AF] mt-1 flex-wrap">
                        {(r.referralName || (r as any).client_name) && (
                          <span className="font-semibold text-white">Client: {r.referralName || (r as any).client_name}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar size={12} className="text-[#6B7280]" />
                          {formattedDate}
                        </span>
                        {r.phone && (
                          <span className="flex items-center gap-1 text-[#6B7280]">
                            <Phone size={11} /> {r.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 self-start sm:self-center">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        {r.status || 'Active'}
                      </span>
                    </div>
                  </div>
                );
              });
            })()}

            {/* 4. ATTENDANCE */}
            {selectedDetailCard === 'attendance' && (() => {
              const q = detailSearchQuery.toLowerCase().trim();
              const completedMeetings = reportsData.meetings.filter(m => m.isCompleted || m.status === 'COMPLETED');
              const items = completedMeetings.filter(m => {
                if (!q) return true;
                return (m.title || m.name || m.venue || m.location || '').toLowerCase().includes(q);
              });

              if (items.length === 0) {
                return (
                  <div className="text-center py-10 text-[#9CA3AF] text-sm font-medium">
                    No completed meetings found for the selected period.
                  </div>
                );
              }

              return items.map((m, idx) => {
                const d = parseSafeDate(m.date || m.meeting_date || m.createdAt);
                const formattedDate = d ? format(d, 'dd MMM yyyy') : 'Recent';
                let presentCount = 0;
                let totalAttendees = 0;

                if (m.attendance) {
                  currentChapterMemberIds.forEach(mid => {
                    const st = m.attendance[mid];
                    if (st) {
                      totalAttendees++;
                      if (['PRESENT', 'Yes', 'Substitute', 'Late', 'YES', 'SUBSTITUTE', 'Present'].includes(String(st))) {
                        presentCount++;
                      }
                    }
                  });
                }
                const meetingPct = totalAttendees === 0 ? 0 : Math.round((presentCount / totalAttendees) * 100);

                return (
                  <div 
                    key={m.id || `meet-${idx}`}
                    className="p-3.5 bg-[#111827] border border-white/5 rounded-xl hover:border-white/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{m.title || m.name || 'Chapter Meeting'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#9CA3AF] mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} className="text-[#6B7280]" />
                          {formattedDate}
                        </span>
                        {(m.venue || m.location) && (
                          <span className="text-[#6B7280]">
                            Venue: {m.venue || m.location}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="text-right">
                        <span className="text-sm font-black text-cyan-400">{meetingPct}%</span>
                        <span className="block text-[10px] text-[#6B7280] font-bold">{presentCount}/{totalAttendees || currentChapterMemberIds.length} Present</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                        Completed
                      </span>
                    </div>
                  </div>
                );
              });
            })()}

            {/* 5. 1-TO-1 MEETINGS */}
            {selectedDetailCard === 'oneToOnes' && (() => {
              const q = detailSearchQuery.toLowerCase().trim();
              const items = reportsData.oneToOnes.filter(m => m.status === 'COMPLETED').filter(m => {
                if (!q) return true;
                const p1 = resolveMemberNameById(m.organizer_id || m.creatorId || m.sender_id);
                const p2 = resolveMemberNameById(m.member_id || m.receiver_id);
                return p1.toLowerCase().includes(q) ||
                       p2.toLowerCase().includes(q) ||
                       (m.notes || m.location || '').toLowerCase().includes(q);
              });

              if (items.length === 0) {
                return (
                  <div className="text-center py-10 text-[#9CA3AF] text-sm font-medium">
                    No completed 1-to-1 syncs found for the selected period.
                  </div>
                );
              }

              return items.map((m, idx) => {
                const p1 = resolveMemberNameById(m.organizer_id || m.creatorId || m.sender_id);
                const p2 = resolveMemberNameById(m.member_id || m.receiver_id);
                const meetingDate = m.date || m.meeting_date || m.scheduled_date || (m as any).scheduledDate || m.createdAt;
                const d = parseSafeDate(meetingDate);
                const formattedDate = d ? format(d, 'dd MMM yyyy') : 'Recent';

                return (
                  <div 
                    key={m.id || `oto-${idx}`}
                    className="p-3.5 bg-[#111827] border border-white/5 rounded-xl hover:border-white/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">{p1}</span>
                        <span className="text-xs text-[#6B7280] font-bold">&</span>
                        <span className="text-sm font-bold text-blue-400">{p2}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#9CA3AF] mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} className="text-[#6B7280]" />
                          {formattedDate}
                        </span>
                        {m.location && (
                          <span className="text-[#6B7280]">Location: {m.location}</span>
                        )}
                        {m.notes && (
                          <span className="text-[#6B7280] italic truncate max-w-xs">"{m.notes}"</span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 self-start sm:self-center">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-blue-500/15 text-blue-400 border border-blue-500/30">
                        Completed
                      </span>
                    </div>
                  </div>
                );
              });
            })()}

            {/* 6. GUESTS / VISITORS */}
            {selectedDetailCard === 'guests' && (() => {
              const q = detailSearchQuery.toLowerCase().trim();
              const items = reportsData.guests.filter(g => {
                if (!q) return true;
                const inviter = resolveMemberNameById(
                  g.invited_by_user_id || (g as any).invitedByUserId || 
                  g.invited_by || (g as any).invitedBy || 
                  g.createdBy || (g as any).created_by || 
                  g.inviterId || (g as any).inviter_id || 
                  g.user_id || (g as any).memberId
                ) || (g as any).invited_by_name || (g as any).invitedByName || '';
                return (g.name || (g as any).guest_name || (g as any).guestName || '').toLowerCase().includes(q) ||
                       (g.businessName || (g as any).company || (g as any).profession || (g as any).guest_business || (g as any).business_category || '').toLowerCase().includes(q) ||
                       (g.phone || (g as any).mobile || (g as any).guest_phone || (g as any).guest_whatsapp || '').toLowerCase().includes(q) ||
                       inviter.toLowerCase().includes(q);
              });

              if (items.length === 0) {
                return (
                  <div className="text-center py-10 text-[#9CA3AF] text-sm font-medium">
                    No guest records found for the selected period.
                  </div>
                );
              }

              return items.map((g, idx) => {
                const inviter = resolveMemberNameById(
                  g.invited_by_user_id || (g as any).invitedByUserId || 
                  g.invited_by || (g as any).invitedBy || 
                  g.createdBy || (g as any).created_by || 
                  g.inviterId || (g as any).inviter_id || 
                  g.user_id || (g as any).memberId
                ) || (g as any).invited_by_name || (g as any).invitedByName || 'Chapter Member';
                const d = parseSafeDate(g.createdAt || (g as any).created_at || (g as any).meeting_date || (g as any).meetingDate || g.date);
                const formattedDate = d ? format(d, 'dd MMM yyyy') : 'Recent';
                const guestName = g.name || (g as any).guest_name || (g as any).guestName || 'Guest';
                const business = g.businessName || (g as any).company || (g as any).profession || (g as any).guest_business || (g as any).business_category;
                const phone = g.phone || (g as any).mobile || (g as any).guest_phone || (g as any).guest_whatsapp;
                const statusStr = String(g.status || (g as any).attendance_status || 'Invited');
                const isAttended = ['attended', 'present'].includes(statusStr.toLowerCase());

                return (
                  <div 
                    key={g.id || `guest-${idx}`}
                    className="p-3.5 bg-[#111827] border border-white/5 rounded-xl hover:border-white/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">{guestName}</span>
                        {business && (
                          <span className="text-xs text-[#9CA3AF]">
                            • {business}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#9CA3AF] mt-1 flex-wrap">
                        <span className="text-[#9CA3AF]">
                          Invited by: <strong className="text-white font-semibold">{inviter}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={12} className="text-[#6B7280]" />
                          {formattedDate}
                        </span>
                        {phone && (
                          <span className="flex items-center gap-1 text-[#6B7280]">
                            <Phone size={11} /> {phone}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 self-start sm:self-center">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${
                        isAttended 
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-pink-500/15 text-pink-400 border border-pink-500/30'
                      }`}>
                        {statusStr}
                      </span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          {/* Close button */}
          <div className="pt-3 border-t border-white/10 flex justify-end">
            <button
              onClick={() => { setSelectedDetailCard(null); setDetailSearchQuery(''); }}
              className="bg-[#111827] hover:bg-neutral-800 text-white font-bold py-2.5 px-5 rounded-xl transition-all text-xs border border-white/10 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
