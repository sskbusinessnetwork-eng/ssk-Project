import React, { useState, useEffect } from 'react';
import { 
  Share2, 
  Award, 
  Calendar, 
  UserPlus,
  ChevronRight,
  Users,
  Handshake,
  BookOpen,
  Eye,
  Plus,
  Filter,
  TrendingUp,
  CheckCircle2,
  Clock,
  Sparkles,
  Target,
  Compass,
  HelpCircle,
  Activity,
  Briefcase,
  ArrowRight,
  Trophy,
  Flame,
  Star,
  Zap,
  Shield
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { firestoreService } from '../services/firestoreService';
import { Referral, ThankYouSlip, Meeting, OneToOneMeeting, UserProfile, AttendanceStatus } from '../types';
import { format, isAfter, startOfMonth, endOfMonth, isWithinInterval, parseISO, differenceInDays } from 'date-fns';
import { cn } from '../lib/utils';
import { MemberCompanionView } from '../components/MemberCompanionView';
import { ChapterAdminCompanionView } from '../components/ChapterAdminCompanionView';
import { MasterAdminCompanionView } from '../components/MasterAdminCompanionView';
import StatGrid from '../components/StatGrid';

export function Analytics() {
  const { profile } = useAuth();
  const [nextMeeting, setNextMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'companion' | 'reports'>('companion');
  
  // Meeting countdown state
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0 });

  // Today's Focus checkable tasks state
  const [focusTasks, setFocusTasks] = useState<{
    attendMeeting: boolean;
    passReferral: boolean;
    scheduleOneToOne: boolean;
    followUpReferral: boolean;
    inviteGuest: boolean;
  } | null>(null);
  
  // Data State
  const [allData, setAllData] = useState<{
    users: UserProfile[];
    referrals: Referral[];
    slips: ThankYouSlip[];
    meetings: Meeting[];
    oneToOnes: OneToOneMeeting[];
  }>({
    users: [],
    referrals: [],
    slips: [],
    meetings: [],
    oneToOnes: []
  });

  // Filters State
  const [chapterAdminFilter, setChapterAdminFilter] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    adminId: ''
  });

  const [memberFilter, setMemberFilter] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    memberId: ''
  });

  const [chapterReportFilter, setChapterReportFilter] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!profile) return;
      setLoading(true);
      try {
        const [users, referrals, slips, meetings, oneToOnes] = await Promise.all([
          firestoreService.list<UserProfile>('users'),
          firestoreService.list<Referral>('referrals'),
          firestoreService.list<ThankYouSlip>('thank_you_slips'),
          firestoreService.list<Meeting>('meetings'),
          firestoreService.list<OneToOneMeeting>('one_to_one_meetings')
        ]);

        setAllData({ users, referrals, slips, meetings, oneToOnes });

        // Fetch Next Meeting (for Chapter Admin and Member)
        if (profile.role !== 'MASTER_ADMIN') {
          const now = new Date();
          const upcoming = meetings
            .filter(m => {
              const isFuture = isAfter(new Date(m.date), now);
              if (profile.role === 'CHAPTER_ADMIN') {
                return isFuture && m.adminId === profile.uid;
              }
              return isFuture && (m.adminId === profile.associatedChapterAdminId || m.adminId === profile.adminId);
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          setNextMeeting(upcoming[0] || null);
        }

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile]);

  const chapterAdmins = allData.users.filter(u => u.role === 'CHAPTER_ADMIN');
  const members = allData.users.filter(u => {
    if (profile?.role === 'CHAPTER_ADMIN') {
      return u.role === 'MEMBER' && u.associatedChapterAdminId === profile.uid;
    }
    return u.role === 'MEMBER';
  });

  const calculateMetrics = (filters: { startDate: string, endDate: string, id?: string }, type: 'CHAPTER' | 'MEMBER') => {
    const start = parseISO(filters.startDate);
    const end = parseISO(filters.endDate);
    
    let targetUserIds: string[] = [];
    if (type === 'CHAPTER') {
      if (filters.id) {
        targetUserIds = allData.users
          .filter(u => u.associatedChapterAdminId === filters.id)
          .map(u => u.uid);
      } else {
        targetUserIds = allData.users
          .filter(u => u.role === 'MEMBER')
          .map(u => u.uid);
      }
    } else {
      if (filters.id) {
        targetUserIds = [filters.id];
      } else {
        if (profile?.role === 'CHAPTER_ADMIN') {
          targetUserIds = allData.users
            .filter(u => u.role === 'MEMBER' && u.associatedChapterAdminId === profile.uid)
            .map(u => u.uid);
        } else if (profile?.role === 'MEMBER') {
          targetUserIds = [profile.uid];
        } else {
          targetUserIds = allData.users
            .filter(u => u.role === 'MEMBER')
            .map(u => u.uid);
        }
      }
    }

    const isInRange = (dateStr: string) => {
      try {
        const date = new Date(dateStr);
        return isWithinInterval(date, { start, end });
      } catch {
        return false;
      }
    };

    const filteredSlips = allData.slips.filter(s => targetUserIds.includes(s.fromUserId) && isInRange(s.createdAt));
    const businessGenerated = filteredSlips.reduce((acc, s) => acc + (Number(s.businessValue) || 0), 0);

    const referralsSent = allData.referrals.filter(r => targetUserIds.includes(r.fromUserId) && isInRange(r.createdAt)).length;
    const referralsReceived = allData.referrals.filter(r => targetUserIds.includes(r.toUserId) && isInRange(r.createdAt)).length;

    const totalMembers = type === 'CHAPTER' 
      ? allData.users.filter(u => filters.id ? u.associatedChapterAdminId === filters.id : u.role === 'MEMBER').length
      : 0;

    const filteredMeetings = allData.meetings.filter(m => isInRange(m.date));
    let totalMeetings = 0;
    let attendanceCount = 0;

    if (type === 'MEMBER' && filters.id) {
      // Individual Member Report
      const memberId = filters.id;
      const memberMeetings = filteredMeetings.filter(m => m.attendance && m.attendance[memberId]);
      totalMeetings = memberMeetings.length;
      attendanceCount = memberMeetings.filter(m => {
        const status = m.attendance[memberId];
        return status === 'PRESENT' || status === 'Yes' || status === 'Substitute' || status === 'YES' || status === 'SUBSTITUTE';
      }).length;
    } else if (type === 'CHAPTER' && filters.id) {
      // Specific Chapter Admin Report
      totalMeetings = filteredMeetings.filter(m => m.adminId === filters.id).length;
    } else if (profile?.role === 'MEMBER' && type === 'MEMBER') {
      // Logged in Member Performance
      totalMeetings = filteredMeetings.filter(m => m.adminId === profile.associatedChapterAdminId || m.adminId === profile.adminId).length;
    } else {
      totalMeetings = filteredMeetings.length;
    }

    const oneToOnes = allData.oneToOnes.filter(m => {
      const isParticipant = targetUserIds.some(id => m.creatorId === id || m.participantIds?.includes(id));
      return isParticipant && isInRange(m.date);
    }).length;

    const chapterMemberCount = profile?.role === 'MEMBER' 
      ? allData.users.filter(u => u.role === 'MEMBER' && (u.associatedChapterAdminId === profile.associatedChapterAdminId || u.associatedChapterAdminId === profile.adminId)).length
      : 0;

    return {
      businessGenerated,
      referralsSent,
      referralsReceived,
      totalMembers: type === 'CHAPTER' ? totalMembers : chapterMemberCount,
      totalMeetings,
      attendanceCount,
      oneToOnes
    };
  };

  // Get current hour and generate greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Compute stats for current month for the dynamic onboarding & growth companion
  const currentMonthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const currentMonthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');
  
  const currentMonthMetrics = profile ? calculateMetrics({
    startDate: currentMonthStart,
    endDate: currentMonthEnd,
    id: profile.uid
  }, 'MEMBER') : { businessGenerated: 0, referralsSent: 0, referralsReceived: 0, totalMembers: 0, totalMeetings: 0, attendanceCount: 0, oneToOnes: 0 };

  // Calculate onboarding progress for Members
  const isProfileComplete = Boolean(profile?.businessName && profile?.photoURL && profile?.category);
  const hasLoggedOneToOne = allData.oneToOnes.some(m => m.creatorId === profile?.uid || m.participantIds?.includes(profile?.uid || ''));
  const hasSentReferral = allData.referrals.some(r => r.fromUserId === profile?.uid);
  const hasSentThankYouSlip = allData.slips.some(s => s.fromUserId === profile?.uid);

  const totalSteps = 4;
  const completedSteps = [isProfileComplete, hasLoggedOneToOne, hasSentReferral, hasSentThankYouSlip].filter(Boolean).length;
  const onboardingProgressPercent = Math.round((completedSteps / totalSteps) * 100);

  // Redesigned Dashboard Score Calculations
  const profileScore = isProfileComplete ? 25 : 0;
  const referralScore = currentMonthMetrics.referralsSent > 0 ? 25 : 0;
  const oneToOneScore = currentMonthMetrics.oneToOnes > 0 ? 25 : 0;
  const businessScore = currentMonthMetrics.businessGenerated > 0 ? 25 : 0;
  const businessGrowthScore = profileScore + referralScore + oneToOneScore + businessScore;

  // 1. Countdown timer useEffect
  useEffect(() => {
    if (!nextMeeting) return;
    
    const getMeetingDateTime = (meeting: Meeting) => {
      try {
        if (meeting.time) {
          // Combined parsing
          const parsed = new Date(`${meeting.date} ${meeting.time}`);
          if (!isNaN(parsed.getTime())) return parsed;
        }
        return new Date(meeting.date);
      } catch {
        return new Date(meeting.date);
      }
    };

    const targetDate = getMeetingDateTime(nextMeeting);
    if (!targetDate) return;

    const updateCountdown = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0 });
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      setCountdown({ days, hours, minutes });
    };

    updateCountdown();
    const intervalId = setInterval(updateCountdown, 60000);
    return () => clearInterval(intervalId);
  }, [nextMeeting]);

  // 2. Today's Focus Action Checklist initialization
  useEffect(() => {
    if (!profile || profile.role !== 'MEMBER') return;
    
    // Check if there is anything in localStorage first
    try {
      const saved = localStorage.getItem(`ssk_focus_tasks_${profile.uid}`);
      if (saved) {
        setFocusTasks(JSON.parse(saved));
        return;
      }
    } catch (e) {
      console.error("Error reading ssk_focus_tasks from localStorage", e);
    }

    // Default checklist state based on actual database metrics
    setFocusTasks({
      attendMeeting: currentMonthMetrics.attendanceCount > 0,
      passReferral: hasSentReferral,
      scheduleOneToOne: hasLoggedOneToOne,
      followUpReferral: hasSentThankYouSlip,
      inviteGuest: false,
    });
  }, [
    profile, 
    currentMonthMetrics.attendanceCount, 
    hasSentReferral, 
    hasLoggedOneToOne, 
    hasSentThankYouSlip
  ]);

  const activeFocusTasks = focusTasks || {
    attendMeeting: currentMonthMetrics.attendanceCount > 0,
    passReferral: hasSentReferral,
    scheduleOneToOne: hasLoggedOneToOne,
    followUpReferral: hasSentThankYouSlip,
    inviteGuest: false,
  };

  const handleToggleTask = (taskKey: 'attendMeeting' | 'passReferral' | 'scheduleOneToOne' | 'followUpReferral' | 'inviteGuest') => {
    if (!profile) return;
    const updated = {
      ...activeFocusTasks,
      [taskKey]: !activeFocusTasks[taskKey]
    };
    setFocusTasks(updated);
    try {
      localStorage.setItem(`ssk_focus_tasks_${profile.uid}`, JSON.stringify(updated));
    } catch (e) {
      console.error("Error writing ssk_focus_tasks to localStorage", e);
    }
  };

  const completedFocusCount = Object.values(activeFocusTasks).filter(Boolean).length;
  const focusProgressPercent = Math.round((completedFocusCount / 5) * 100);

  // 3. AI Growth Advisor recommendation resolver
  const getAIRecommendation = () => {
    if (!isProfileComplete) {
      return {
        title: "Complete your professional profile",
        description: "Adding your business logo and category helps other chapter partners refer clients to you up to 3x more effectively.",
        action: "Complete Profile",
        link: "/profile"
      };
    }
    if (currentMonthMetrics.oneToOnes === 0) {
      return {
        title: "Schedule a One-to-One synergy session",
        description: "Scheduling structured brief syncs with adjacent sectors is the fastest way to map referral pipelines this month.",
        action: "Book One-to-One",
        link: "/one-to-one"
      };
    }
    if (currentMonthMetrics.referralsSent === 0) {
      return {
        title: "Pass a warm Business Referral",
        description: "Establish trust and trigger mutual reciprocity by sharing a warm commercial client lead with your partners.",
        action: "Pass Referral",
        link: "/refer"
      };
    }
    return {
      title: "Invite a guest to your next meeting",
      description: "Expanding the chapter's reach adds more business categories, creating higher inbound lead variety for your company.",
      action: "Invite Guest",
      link: "/guests"
    };
  };
  const recommendation = getAIRecommendation();

  const chapterMemberCount = members.length;
  const chapterMeetings = allData.meetings.filter(m => m.adminId === profile?.uid).length;
  const chapterReferrals = allData.referrals.filter(r => members.some(m => m.uid === r.fromUserId)).length;
  const chapterBusiness = allData.slips
    .filter(s => members.some(m => m.uid === s.fromUserId))
    .reduce((sum, s) => sum + (Number(s.businessValue) || 0), 0);
  const chapterHealthScore = Math.min(100, Math.round(
    40 + 
    Math.min(chapterMemberCount, 15) * 2.5 + 
    Math.min(chapterMeetings, 3) * 5 +       
    Math.min(chapterReferrals, 10) * 1       
  ));

  const globalChapterCount = allData.users.filter(u => u.role === 'CHAPTER_ADMIN').length;
  const globalMemberCount = allData.users.filter(u => u.role === 'MEMBER').length;
  const globalBusinessGenerated = allData.slips.reduce((sum, s) => sum + (Number(s.businessValue) || 0), 0);
  const globalReferralsCount = allData.referrals.length;
  const networkHealthScore = Math.min(100, Math.round(
    55 + 
    Math.min(globalChapterCount, 5) * 4 + 
    Math.min(globalMemberCount, 25) * 1
  ));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // 4. DYNAMIC DAILY CONTEXT FOR "SMART BEHAVIOR"
  const getDynamicContext = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return {
        period: 'Morning',
        priority: 'Focus on today\'s connections and prepare for the weekly session.',
        tip: 'Review your upcoming 1-1 meetings and prepare your elevator pitch.',
        badge: 'Preparation Phase'
      };
    } else if (hour < 17) {
      return {
        period: 'Afternoon',
        priority: 'Follow up on pending referrals and log business closed.',
        tip: 'Check with referred clients and log completed thank-you slips.',
        badge: 'Activity Pulse'
      };
    } else {
      return {
        period: 'Evening',
        priority: 'Review today\'s progress and log your achievements.',
        tip: 'Great job today! Note down prospective referrals for tomorrow.',
        badge: 'Results Sync'
      };
    }
  };

  const dynamicContext = getDynamicContext();

  // 5. COMPILED RECENT ACTIVITIES TIMELINE (Latest 4)
  const getRecentActivities = () => {
    const list: any[] = [];
    
    // Add referrals
    allData.referrals.forEach(r => {
      const fromUser = allData.users.find(u => u.uid === r.fromUserId);
      const toUser = allData.users.find(u => u.uid === r.toUserId);
      list.push({
        id: `ref-${r.id || Math.random()}`,
        type: 'referral',
        title: `${fromUser?.name || 'A partner'} passed a referral`,
        desc: `Passed to ${toUser?.name || 'another partner'}${r.category ? ` for ${r.category}` : ''}`,
        time: new Date(r.createdAt || Date.now()),
        icon: Share2,
        color: 'bg-amber-500/10 text-amber-600 border-amber-500/10',
        chapterId: fromUser?.associatedChapterAdminId || fromUser?.adminId
      });
    });

    // Add thank you slips
    allData.slips.forEach(s => {
      const fromUser = allData.users.find(u => u.uid === s.fromUserId);
      const toUser = allData.users.find(u => u.uid === s.toUserId);
      list.push({
        id: `slip-${s.id || Math.random()}`,
        type: 'slip',
        title: `Business done of ₹${Number(s.businessValue || 0).toLocaleString()}`,
        desc: `Logged by ${fromUser?.name || 'a partner'} for ${toUser?.name || 'another partner'}`,
        time: new Date(s.createdAt || Date.now()),
        icon: Handshake,
        color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/10',
        chapterId: fromUser?.associatedChapterAdminId || fromUser?.adminId
      });
    });

    // Add one to ones
    allData.oneToOnes.forEach(o => {
      const creator = allData.users.find(u => u.uid === o.creatorId);
      list.push({
        id: `1to1-${o.id || Math.random()}`,
        type: 'one_to_one',
        title: `One-to-One scheduled`,
        desc: `Coordinated by ${creator?.name || 'a partner'}`,
        time: new Date(o.createdAt || o.date || Date.now()),
        icon: Clock,
        color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/10',
        chapterId: creator?.associatedChapterAdminId || creator?.adminId
      });
    });

    // Add new user registrations
    allData.users.forEach(u => {
      if (u.createdAt) {
        list.push({
          id: `user-${u.uid}`,
          type: 'user',
          title: `New Partner Joined`,
          desc: `${u.name} registered as ${u.category || 'Member'}`,
          time: new Date(u.createdAt),
          icon: UserPlus,
          color: 'bg-blue-500/10 text-blue-600 border-blue-500/10',
          chapterId: u.associatedChapterAdminId || u.adminId
        });
      }
    });

    // Sort by time descending
    let sorted = list.sort((a, b) => b.time.getTime() - a.time.getTime());

    // Filter by role/chapter if appropriate
    if (profile?.role === 'CHAPTER_ADMIN') {
      sorted = sorted.filter(item => item.chapterId === profile.uid);
    } else if (profile?.role === 'MEMBER') {
      sorted = sorted.filter(item => item.chapterId === profile.associatedChapterAdminId || item.chapterId === profile.adminId);
    }

    return sorted.slice(0, 4);
  };

  const recentActivities = getRecentActivities();

  const finalRecentActivities = recentActivities.length > 0 ? recentActivities : [
    {
      id: 'default-1',
      title: 'Chapter sync scheduled',
      desc: 'Weekly network exchange session prepared',
      time: new Date(),
      icon: Calendar,
      color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/10'
    },
    {
      id: 'default-2',
      title: 'Welcome to SSK Business Network',
      desc: 'Your Business Growth Companion is active and connected',
      time: new Date(Date.now() - 3600000),
      icon: Sparkles,
      color: 'bg-amber-500/10 text-amber-600 border-amber-500/10'
    }
  ];

  return (
    <div className="pb-24 space-y-10">
      
      {/* 1. PERSONALIZED WELCOME BANNER (Premium Dashboard Hero) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white border border-neutral-200 rounded-[32px] p-5 sm:p-6 md:p-8 lg:p-10 relative overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.04)] flex flex-col justify-center min-h-[340px]"
      >
        {/* Subtle animated gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-50/50 to-white pointer-events-none" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/[0.03] rounded-full blur-[100px] animate-float pointer-events-none" />
        <div className="absolute -bottom-[200px] -left-[200px] w-[600px] h-[600px] bg-neutral-100/50 rounded-full blur-[80px] animate-float-delayed pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full relative z-10">
          
          {/* Welcome Text & Navigation Tabs */}
          <div className="lg:col-span-5 space-y-8 flex flex-col justify-center h-full text-center lg:text-left items-center lg:items-start w-full">
            <div className="space-y-3">
              <motion.span 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="text-[14px] font-semibold uppercase tracking-[0.2em] text-neutral-500 block"
              >
                {getGreeting()},
              </motion.span>
              <motion.h2 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-[40px] md:text-[48px] font-semibold text-[#111827] tracking-tight flex items-center justify-center lg:justify-start gap-2 flex-wrap leading-tight"
              >
                {profile?.name || 'Partner'}
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-[16px] text-neutral-500 font-medium max-w-md leading-relaxed"
              >
                Welcome back to <span className="text-primary font-semibold">SSK Business Network</span>. Here is your enterprise operations overview for today.
              </motion.p>
            </div>

            {/* Dynamic Companion Tabs */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="flex bg-[#F7F8FA] p-1.5 rounded-[20px] border border-neutral-200/60 w-full max-w-sm gap-2"
            >
              <button
                onClick={() => setActiveTab('companion')}
                className={cn(
                  "flex-1 h-12 rounded-[14px] text-[15px] font-semibold transition-all duration-300 flex items-center justify-center gap-2",
                  activeTab === 'companion' 
                    ? "bg-white text-[#111827] shadow-[0_2px_8px_rgba(0,0,0,0.06)]" 
                    : "text-neutral-500 hover:text-[#111827] hover:bg-neutral-200/50"
                )}
              >
                <Sparkles size={18} className={activeTab === 'companion' ? "text-primary" : "text-neutral-400"} />
                Companion
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={cn(
                  "flex-1 h-12 rounded-[14px] text-[15px] font-semibold transition-all duration-300 flex items-center justify-center gap-2",
                  activeTab === 'reports' 
                    ? "bg-white text-[#111827] shadow-[0_2px_8px_rgba(0,0,0,0.06)]" 
                    : "text-neutral-500 hover:text-[#111827] hover:bg-neutral-200/50"
                )}
              >
                <Activity size={18} className={activeTab === 'reports' ? "text-primary" : "text-neutral-400"} />
                Reports
              </button>
            </motion.div>
          </div>

          {/* Large Animated Business Health Score */}
          <div className="lg:col-span-3 hidden lg:flex flex-col items-center justify-center relative">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-48 h-48 flex flex-col items-center justify-center group"
            >
              {/* Soft glowing ring */}
              <div className="absolute inset-0 rounded-full border border-neutral-100 shadow-[0_0_40px_rgba(220,38,38,0.08)] group-hover:shadow-[0_0_60px_rgba(220,38,38,0.12)] transition-shadow duration-500" />
              
              <svg className="w-full h-full -rotate-90 absolute inset-0" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="46" stroke="#F7F8FA" strokeWidth="4" fill="transparent" />
                <motion.circle 
                  cx="50" cy="50" r="46" stroke="#DC2626" strokeWidth="4" fill="transparent"
                  strokeDasharray="289.02" strokeDashoffset="289.02" strokeLinecap="round" 
                  initial={{ strokeDashoffset: 289.02 }}
                  animate={{ strokeDashoffset: 289.02 - (289.02 * 0.92) }}
                  transition={{ delay: 0.6, duration: 1.5, ease: "easeOut" }}
                />
              </svg>
              
              <div className="flex flex-col items-center justify-center z-10 bg-white w-[140px] h-[140px] rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.05)] border border-neutral-50/50">
                <span className="text-[48px] font-semibold text-[#111827] leading-none tracking-tight">92</span>
                <span className="text-[12px] font-semibold text-neutral-400 uppercase tracking-[0.2em] mt-1">Health</span>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.5 }}
              className="mt-6 flex items-center gap-6"
            >
              <div className="flex flex-col items-center">
                <span className="text-[14px] text-emerald-600 font-semibold flex items-center gap-1"><TrendingUp size={14} /> +4%</span>
                <span className="text-[11px] text-neutral-400 uppercase tracking-widest font-semibold mt-1">Weekly</span>
              </div>
              <div className="w-px h-8 bg-neutral-200" />
              <div className="flex flex-col items-center">
                <span className="text-[14px] text-emerald-600 font-semibold flex items-center gap-1"><TrendingUp size={14} /> +12%</span>
                <span className="text-[11px] text-neutral-400 uppercase tracking-widest font-semibold mt-1">Monthly</span>
              </div>
            </motion.div>
          </div>

          {/* Premium Rightmost Membership Card */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-4 h-full flex items-center justify-center lg:justify-end w-full"
          >
            <div className="bg-[#0B0B0D] rounded-[24px] p-8 shadow-[0_20px_40px_rgba(11,11,13,0.15)] relative overflow-hidden w-full max-w-sm h-full min-h-[260px] flex flex-col justify-between group hover:shadow-[0_30px_60px_rgba(11,11,13,0.2)] transition-shadow duration-500">
              <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-primary/20 rounded-full blur-[80px] pointer-events-none group-hover:scale-110 group-hover:bg-primary/30 transition-all duration-700" />
              <div className="absolute -bottom-10 -left-10 w-[150px] h-[150px] bg-white/5 rounded-full blur-[60px] pointer-events-none" />
              
              <div className="relative z-10 flex items-start justify-between">
                <div className="space-y-1.5">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.2em] text-emerald-400 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active Access
                  </span>
                  <h3 className="text-white text-[24px] font-semibold tracking-tight">
                    {profile?.role === 'MASTER_ADMIN' ? 'Platinum Director' : profile?.role === 'CHAPTER_ADMIN' ? 'Platinum President' : 'Platinum Member'}
                  </h3>
                  <p className="text-[14px] text-neutral-400 font-medium pt-1">
                    {profile?.chapterName || 'SSK Business Network'}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-amber-400 backdrop-blur-md border border-white/5 shadow-inner">
                  <Trophy size={24} />
                </div>
              </div>

              <div className="relative z-10 mt-auto pt-6 space-y-4">
                <div className="flex items-center justify-between text-[13px] font-medium">
                  <span className="text-neutral-400">Next Milestone</span>
                  <span className="text-white">Diamond Partner</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "75%" }}
                    transition={{ delay: 1, duration: 1.5, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-primary to-rose-400 rounded-full" 
                  />
                </div>
                
                <div className="pt-4 mt-2 flex items-center justify-between border-t border-white/10">
                  <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-[0.2em]">ENTERPRISE SEAT</span>
                  <button className="text-white bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 rounded-lg text-[13px] font-semibold tracking-wide">
                    Manage
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </motion.div>

      {/* Premium Animated StatGrid (Dynamic Live Data / High-Value Fallbacks) */}
      <StatGrid 
        activeMembers={globalMemberCount > 0 ? globalMemberCount.toLocaleString() : undefined}
        referralsPassed={globalReferralsCount > 0 ? globalReferralsCount.toLocaleString() : undefined}
        businessGenerated={globalBusinessGenerated > 0 ? `₹${globalBusinessGenerated.toLocaleString('en-IN')}` : undefined}
        upcomingMeetings={allData.meetings.length > 0 ? allData.meetings.length.toLocaleString() : undefined}
      />

      {activeTab === 'companion' ? (
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="space-y-8 animate-fade-in"
        >
          {/* ==================== REDESIGNED ROLE-BASED DASHBOARD COMPANION CONTENT ==================== */}

          {/* 1. MEMBER COMPANION VIEW */}
          {profile?.role === 'MEMBER' && (
            <MemberCompanionView
              profile={profile}
              dynamicContext={dynamicContext}
              completedFocusCount={completedFocusCount}
              focusProgressPercent={focusProgressPercent}
              activeFocusTasks={activeFocusTasks}
              handleToggleTask={handleToggleTask}
              nextMeeting={nextMeeting}
              countdown={countdown}
              finalRecentActivities={finalRecentActivities}
              businessGrowthScore={businessGrowthScore}
              currentMonthMetrics={currentMonthMetrics}
              hasLoggedOneToOne={hasLoggedOneToOne}
              hasSentThankYouSlip={hasSentThankYouSlip}
              recommendation={recommendation}
            />
          )}

          {profile?.role === 'CHAPTER_ADMIN' && (
            <ChapterAdminCompanionView
              profile={profile}
              chapterHealthScore={chapterHealthScore}
              chapterMemberCount={chapterMemberCount}
              chapterReferrals={chapterReferrals}
              chapterBusiness={chapterBusiness}
              finalRecentActivities={finalRecentActivities}
            />
          )}

          {profile?.role === 'MASTER_ADMIN' && (
            <MasterAdminCompanionView
              profile={profile}
              networkHealthScore={networkHealthScore}
              globalMemberCount={globalMemberCount}
              globalChapterCount={globalChapterCount}
              globalBusinessGenerated={globalBusinessGenerated}
              globalReferralsCount={globalReferralsCount}
              finalRecentActivities={finalRecentActivities}
              setActiveTab={setActiveTab}
            />
          )}

          </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="space-y-6"
        >
          {/* TRADITIONAL REPORTS AND DETAILED FILTER-BASED ANALYTICS */}
          
          {/* Next Meeting Card (Chapter Admin and Member only) - Kept in reports for full visibility */}
          {profile?.role !== 'MASTER_ADMIN' && (
            <div className="bg-white rounded-[14px] card-shadow border border-border overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-12 bg-primary rounded-br-lg" />
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-[0.15em] ml-2">Next Meeting Metrics</span>
                  <Eye size={16} className="text-text-secondary" />
                </div>
                
                <div className="text-center py-2">
                  <h3 className="text-base sm:text-lg font-semibold text-primary break-words px-2">
                    {nextMeeting ? format(new Date(nextMeeting.date), 'EEEE, MMMM d, yyyy') : 'No Upcoming Meetings'}
                  </h3>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
                  <div className="text-center">
                    <p className="text-[9px] font-semibold text-text-secondary uppercase tracking-wider">TYFCB</p>
                    <p className="text-xs font-semibold text-text-primary mt-0.5">₹0</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-semibold text-text-secondary uppercase tracking-wider">Speakers</p>
                    <p className="text-xs font-semibold text-text-primary mt-0.5">0</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-semibold text-text-secondary uppercase tracking-wider">Visitors</p>
                    <p className="text-xs font-semibold text-text-primary mt-0.5">0</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MASTER ADMIN: Chapter Admin Report */}
          {profile?.role === 'MASTER_ADMIN' && (
            <ReportCard 
              title="Chapter Admin Report"
              filters={chapterAdminFilter}
              setFilters={setChapterAdminFilter}
              options={chapterAdmins}
              optionLabel="Chapter Admin"
              metrics={calculateMetrics({ ...chapterAdminFilter, id: chapterAdminFilter.adminId }, 'CHAPTER')}
              type="CHAPTER_ADMIN"
              profile={profile}
            />
          )}

          {/* MASTER ADMIN & CHAPTER ADMIN: Member Report */}
          {(profile?.role === 'MASTER_ADMIN' || profile?.role === 'CHAPTER_ADMIN') && (
            <ReportCard 
              title="Member Report"
              filters={memberFilter}
              setFilters={setMemberFilter}
              options={members}
              optionLabel="Member"
              metrics={calculateMetrics({ ...memberFilter, id: memberFilter.memberId }, 'MEMBER')}
              type="MEMBER"
              profile={profile}
            />
          )}

          {/* MEMBER: Chapter Admin Report */}
          {profile?.role === 'MEMBER' && (
            <ReportCard 
              title="Chapter Admin Report"
              filters={chapterReportFilter}
              setFilters={setChapterReportFilter}
              metrics={calculateMetrics({ ...chapterReportFilter, id: profile.associatedChapterAdminId || profile.adminId }, 'CHAPTER')}
              type="CHAPTER_ADMIN"
              hideDropdown
              profile={profile}
            />
          )}

          {/* MEMBER: My Performance */}
          {profile?.role === 'MEMBER' && (
            <ReportCard 
              title="My Performance"
              filters={memberFilter}
              setFilters={setMemberFilter}
              metrics={calculateMetrics({ ...memberFilter, id: profile.uid }, 'MEMBER')}
              type="MY_PERFORMANCE"
              hideDropdown
              profile={profile}
            />
          )}
        </motion.div>
      )}
    </div>
  );
}

interface ReportCardProps {
  title: string;
  filters: any;
  setFilters: any;
  options?: UserProfile[];
  optionLabel?: string;
  metrics: any;
  type: 'CHAPTER_ADMIN' | 'MEMBER' | 'MY_PERFORMANCE';
  hideDropdown?: boolean;
  profile: UserProfile | null;
}

function ReportCard({ title, filters, setFilters, options, optionLabel, metrics, type, hideDropdown, profile }: ReportCardProps) {
  return (
    <div className="bg-white rounded-[14px] card-shadow border border-border overflow-hidden relative">
      <div className="absolute top-0 left-0 w-1 h-12 bg-primary rounded-br-lg" />
      <div className="p-4 space-y-4">
        <div className="text-center">
          <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-[0.15em]">{title}</span>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[8px] font-semibold text-text-secondary uppercase ml-1">Start Date</label>
            <input 
              type="date" 
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full p-2 text-[10px] rounded-lg border border-border focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-semibold text-text-secondary uppercase ml-1">End Date</label>
            <input 
              type="date" 
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full p-2 text-[10px] rounded-lg border border-border focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
        </div>

        {!hideDropdown && options && (
          <div className="space-y-1">
            <label className="text-[8px] font-semibold text-text-secondary uppercase ml-1">{optionLabel}</label>
            <select 
              value={type === 'CHAPTER_ADMIN' ? filters.adminId : filters.memberId}
              onChange={(e) => setFilters({ ...filters, [type === 'CHAPTER_ADMIN' ? 'adminId' : 'memberId']: e.target.value })}
              className="w-full p-2 text-[10px] rounded-lg border border-border focus:ring-1 focus:ring-primary outline-none bg-white"
            >
              <option value="">All {optionLabel}s (Combined)</option>
              {options.map(opt => (
                <option key={opt.uid} value={opt.uid}>{opt.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Metrics */}
        <div className="space-y-3 pt-2">
          <MetricItem icon={Handshake} label="Business Generated" value={`₹${metrics.businessGenerated.toLocaleString()}`} />
          <MetricItem icon={Share2} label="Total Referral Sent" value={metrics.referralsSent} />
          <MetricItem icon={BookOpen} label="Total Referral Received" value={metrics.referralsReceived} />
          
          {/* Chapter Admin Report */}
          {type === 'CHAPTER_ADMIN' && (
            <>
              {profile?.role !== 'MEMBER' && <MetricItem icon={Users} label="Total Members" value={metrics.totalMembers} />}
              <MetricItem icon={Calendar} label="Total Meetings" value={metrics.totalMeetings} />
              <MetricItem icon={Clock} label="Total One-to-One Meetings" value={metrics.oneToOnes} />
            </>
          )}

          {/* Master Admin: Member Report */}
          {type === 'MEMBER' && profile?.role === 'MASTER_ADMIN' && (
            <>
              <MetricItem icon={Calendar} label="Total Meetings" value={metrics.totalMeetings} />
              <MetricItem icon={CheckCircle2} label="Total Meeting Attendance" value={metrics.attendanceCount} />
              <MetricItem icon={Clock} label="Total One-to-One Meetings" value={metrics.oneToOnes} />
            </>
          )}

          {/* Chapter Admin: Member Report */}
          {type === 'MEMBER' && profile?.role === 'CHAPTER_ADMIN' && (
            <>
              <MetricItem icon={Users} label="Total Members" value={metrics.totalMembers} />
              <MetricItem icon={Calendar} label="Total Meetings" value={metrics.totalMeetings} />
              <MetricItem icon={Clock} label="Total One-to-One Meetings" value={metrics.oneToOnes} />
            </>
          )}

          {/* Member: My Performance */}
          {type === 'MY_PERFORMANCE' && (
            <>
              <MetricItem icon={Users} label="Total Members" value={metrics.totalMembers} />
              <MetricItem icon={Calendar} label="Total Meetings" value={metrics.totalMeetings} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricItem({ icon: Icon, label, value }: { icon: any, label: string, value: string | number }) {
  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-text-primary group-hover:bg-primary/5 group-hover:text-primary transition-colors">
          <Icon size={16} strokeWidth={1.5} />
        </div>
        <span className="text-[11px] font-medium text-text-secondary group-hover:text-text-primary transition-colors">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-primary">{value}</span>
        <Plus size={12} className="text-primary" />
      </div>
    </div>
  );
}
