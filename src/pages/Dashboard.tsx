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
import companionHeroImg from '../assets/images/3d_business_character_hero_1784110459127.jpg';

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
      
      {/* 1. PERSONALIZED WELCOME BANNER (matches the redesign upload) */}
      <div className="glass-card rounded-[32px] p-6 sm:p-8 shadow-2xl relative overflow-hidden transition-all duration-500 hover:shadow-neutral-200/50">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Welcome Text & Navigation Tabs */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-1.5">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
                {getGreeting()},
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
                {profile?.name || 'Partner'} 👋
              </h2>
              <p className="text-sm text-neutral-500 leading-relaxed font-medium">
                Welcome back to <span className="text-primary font-extrabold">SSK Business Network</span>. Let's build your growth engine today.
              </p>
            </div>

            {/* Dynamic Companion Tabs (designed as pills) */}
            <div className="flex bg-neutral-100/80 p-1.5 rounded-2xl border border-neutral-200/50 max-w-md">
              <button
                onClick={() => setActiveTab('companion')}
                className={cn(
                  "flex-1 py-2.5 px-4 text-center rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 cursor-pointer",
                  activeTab === 'companion' 
                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                    : "text-neutral-500 hover:text-primary"
                )}
              >
                <Sparkles size={12} className={activeTab === 'companion' ? "text-white animate-pulse" : "text-neutral-400"} />
                Growth Companion
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={cn(
                  "flex-1 py-2.5 px-4 text-center rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 cursor-pointer",
                  activeTab === 'reports' 
                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                    : "text-neutral-500 hover:text-primary"
                )}
              >
                <Activity size={12} className={activeTab === 'reports' ? "text-white" : "text-neutral-400"} />
                Traditional Reports
              </button>
            </div>
          </div>

          {/* 3D Character Illustration Area */}
          <div className="lg:col-span-3 flex justify-center relative">
            <div className="relative w-40 h-40 group animate-float">
              <img 
                src={companionHeroImg} 
                alt="Growth Companion Hero" 
                className="w-full h-full object-contain rounded-3xl transition-transform duration-500 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              {/* Floating stats tag */}
              <div className="absolute -bottom-1 -right-4 bg-emerald-500 text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg border border-emerald-400/20 text-[9px] font-black uppercase tracking-wider">
                <TrendingUp size={10} />
                <span>Growth +24.8%</span>
              </div>
            </div>
          </div>

          {/* Rightmost Membership Card */}
          <div className="lg:col-span-4 h-full">
            <div className="bg-gradient-to-br from-[#0c0c0c] to-[#1e1e1e] rounded-[24px] p-5 border border-neutral-900 shadow-2xl relative overflow-hidden min-h-[160px] flex flex-col justify-between group animate-glow">
              {/* Golden Crown Icon */}
              <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20 shadow-md">
                <Trophy size={18} />
              </div>

              {/* Glowing Red Neon Wave Lines */}
              <div className="absolute inset-0 pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity duration-500">
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M0,70 Q25,50 50,75 T100,60" fill="none" stroke="#D32F2F" strokeWidth="2" />
                  <path d="M0,80 Q30,65 60,85 T100,70" fill="none" stroke="#D32F2F" strokeWidth="1" strokeDasharray="3 3" />
                </svg>
              </div>

              <div className="relative z-10 space-y-1">
                <span className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Membership Active
                </span>
                <h3 className="text-white text-base font-black uppercase tracking-wider mt-1">
                  {profile?.role === 'MASTER_ADMIN' ? 'Platinum Director' : profile?.role === 'CHAPTER_ADMIN' ? 'Platinum President' : 'Platinum Member'}
                </h3>
                <p className="text-[10px] text-neutral-400 leading-none mt-1">
                  {profile?.chapterName || 'SSK Business Network'}
                </p>
              </div>

              <div className="relative z-10 pt-4 flex items-center justify-between text-[9px] text-neutral-500 font-extrabold uppercase tracking-widest border-t border-neutral-900">
                <span>SSK PEER ACCESS</span>
                <span className="text-white bg-primary/20 text-primary border border-primary/20 px-2 py-0.5 rounded">
                  EST. 2024
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

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

          {false && profile?.role === 'MEMBER' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT COLUMN: Focus Checklist & AI recommendation (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* 2. TODAY'S BUSINESS FOCUS */}
                <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-[#0F2040]" />
                  
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#0F2040]/60">Daily Plan</span>
                      <h3 className="text-lg font-black text-[#0F2040] tracking-tight">Today's Business Focus</h3>
                    </div>
                    <span className="text-[10px] bg-[#0F2040]/5 text-[#0F2040] px-2.5 py-1 rounded-full font-bold">
                      {completedFocusCount} of 5 Completed
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    {/* Progress Ring */}
                    <div className="relative shrink-0 flex items-center justify-center w-24 h-24 bg-[#0F2040]/5 rounded-full p-2 border border-slate-100">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="48" cy="48" r="38" stroke="#F1F5F9" strokeWidth="6" fill="transparent" />
                        <circle
                          cx="48" cy="48" r="38" stroke="#0F2040" strokeWidth="6" fill="transparent"
                          strokeDasharray={238}
                          strokeDashoffset={238 - (238 * focusProgressPercent) / 100}
                          className="transition-all duration-1000 ease-out text-[#0F2040]"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center">
                        <span className="text-lg font-black text-[#0F2040] leading-none">{focusProgressPercent}%</span>
                        <span className="text-[8px] text-slate-400 font-bold uppercase mt-1">Focus</span>
                      </div>
                    </div>

                    {/* Interactive Checklist */}
                    <div className="flex-1 w-full space-y-2">
                      {[
                        { key: 'attendMeeting', label: "Attend Today's Meeting", desc: "Log active attendance to show partner commitment", link: "/meetings", linkText: "Meetings" },
                        { key: 'passReferral', label: "Pass a Referral", desc: "Share a warm referral with your partners", link: "/refer", linkText: "Pass Lead" },
                        { key: 'scheduleOneToOne', label: "Schedule One-to-One", desc: "Schedule brief sessions with adjacent sectors", link: "/one-to-one", linkText: "Book 1-1" },
                        { key: 'followUpReferral', label: "Follow Up Referral", desc: "Track conversions of pending referral slips", link: "/refer", linkText: "My Leads" },
                        { key: 'inviteGuest', label: "Invite Guest", desc: "Introduce business leaders to expand chapter", link: "/guests", linkText: "Invite" },
                      ].map((item) => {
                        const isDone = activeFocusTasks[item.key as keyof typeof activeFocusTasks];
                        return (
                          <div 
                            key={item.key} 
                            className={cn(
                              "flex items-start gap-3 p-2.5 rounded-xl border transition-all hover:bg-slate-50 cursor-pointer",
                              isDone ? "bg-emerald-50/10 border-emerald-100" : "bg-slate-50/40 border-slate-100"
                            )}
                            onClick={() => handleToggleTask(item.key as any)}
                          >
                            <div className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all duration-200",
                              isDone ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 hover:border-[#0F2040]"
                            )}>
                              {isDone && (
                                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className={cn(
                                  "text-xs font-bold transition-all truncate",
                                  isDone ? "text-slate-400 line-through font-medium" : "text-slate-700"
                                )}>
                                  {item.label}
                                </span>
                                {!isDone && (
                                  <Link 
                                    to={item.link} 
                                    onClick={(e) => e.stopPropagation()} 
                                    className="text-[9px] font-extrabold text-[#0F2040] uppercase tracking-wider hover:underline shrink-0 ml-1"
                                  >
                                    {item.linkText} →
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 6. AI BUSINESS GROWTH RECOMMENDATION */}
                <div className="bg-gradient-to-br from-indigo-50/50 via-slate-50/20 to-purple-50/50 border border-indigo-100/70 rounded-[24px] p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-200/20 rounded-full blur-xl" />
                  <div className="flex gap-4">
                    <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-2xl shrink-0 h-fit">
                      <Sparkles size={18} className="animate-pulse" />
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Growth Advisor</span>
                        <span className="text-[8px] bg-indigo-600/10 text-indigo-600 px-1.5 py-0.5 rounded-md font-bold uppercase">Smart Action</span>
                      </div>
                      <h4 className="text-sm font-extrabold text-slate-800 leading-snug">
                        {recommendation.title}
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {recommendation.description}
                      </p>
                      <div className="pt-1">
                        <Link 
                          to={recommendation.link} 
                          className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-wider"
                        >
                          {recommendation.action} <ArrowRight size={12} />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Upcoming Meeting, Quick Actions, Snapshot, & Achievement (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* 3. UPCOMING MEETING */}
                <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Weekly Session</span>
                      <h3 className="text-sm font-black text-[#0F2040] tracking-tight">Upcoming Meeting</h3>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-600 border border-amber-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Clock size={10} className="animate-pulse" /> Countdown
                    </span>
                  </div>

                  {nextMeeting ? (
                    <div className="space-y-3.5">
                      <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div className="w-11 h-11 bg-indigo-50 border border-indigo-100 rounded-xl flex flex-col items-center justify-center text-indigo-600 shrink-0">
                          <span className="text-[9px] font-black uppercase leading-none">
                            {format(new Date(nextMeeting.date), 'MMM')}
                          </span>
                          <span className="text-base font-black mt-0.5 leading-none">
                            {format(new Date(nextMeeting.date), 'd')}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-slate-800 truncate">
                            {profile?.chapterName || "Chapter Weekly Meeting"}
                          </h4>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                            {format(new Date(nextMeeting.date), 'EEEE • ')} {nextMeeting.time || "8:00 AM"}
                          </p>
                          {nextMeeting.location && (
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">
                              📍 {nextMeeting.location}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Live Countdown Grid */}
                      <div className="grid grid-cols-3 gap-2 text-center bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                        <div className="p-1">
                          <span className="block text-sm font-black text-[#0F2040]">{countdown.days}</span>
                          <span className="text-[8px] text-slate-400 font-bold uppercase">Days</span>
                        </div>
                        <div className="p-1">
                          <span className="block text-sm font-black text-[#0F2040]">{countdown.hours}</span>
                          <span className="text-[8px] text-slate-400 font-bold uppercase">Hours</span>
                        </div>
                        <div className="p-1">
                          <span className="block text-sm font-black text-[#0F2040]">{countdown.minutes}</span>
                          <span className="text-[8px] text-slate-400 font-bold uppercase">Mins</span>
                        </div>
                      </div>

                      <Link 
                        to="/meetings" 
                        className="w-full py-2.5 bg-[#0F2040] text-white text-center rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all hover:bg-[#152a54] flex items-center justify-center gap-1.5"
                      >
                        <Eye size={12} /> View Meeting Details
                      </Link>
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-xs text-slate-500 font-medium">No upcoming chapter sync set</p>
                      <Link to="/meetings" className="mt-2 inline-block text-[10px] font-black text-[#0F2040] uppercase tracking-wider hover:underline">Check Schedule →</Link>
                    </div>
                  )}
                </div>

                {/* 4. QUICK ACTIONS */}
                <div className="space-y-2.5">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Quick Actions</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <Link to="/refer" className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm hover:border-[#0F2040]/30 hover:shadow-md transition-all group flex flex-col justify-between min-h-[96px]">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Share2 size={15} />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-800">Pass Referral</h4>
                        <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">Submit hot client opportunities.</p>
                      </div>
                    </Link>

                    <Link to="/one-to-one" className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm hover:border-[#0F2040]/30 hover:shadow-md transition-all group flex flex-col justify-between min-h-[96px]">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Handshake size={15} />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-800">Book One-to-One</h4>
                        <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">Schedule deep sync sessions.</p>
                      </div>
                    </Link>

                    <Link to="/guests" className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm hover:border-[#0F2040]/30 hover:shadow-md transition-all group flex flex-col justify-between min-h-[96px]">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <UserPlus size={15} />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-800">Invite Guest</h4>
                        <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">Invite peers to next meeting.</p>
                      </div>
                    </Link>

                    <Link to="/members" className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm hover:border-[#0F2040]/30 hover:shadow-md transition-all group flex flex-col justify-between min-h-[96px]">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Users size={15} />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-800">View Members</h4>
                        <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">Browse chapter partners list.</p>
                      </div>
                    </Link>
                  </div>
                </div>

                {/* 5. BUSINESS SNAPSHOT */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between ml-1">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Business Snapshot</h4>
                    <span className="text-[9px] text-indigo-600 font-extrabold uppercase bg-indigo-50 px-2 py-0.5 rounded-full">This Month</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                      <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block">Referrals</span>
                      <span className="text-base font-black text-[#0F2040] mt-1 block">
                        {currentMonthMetrics.referralsSent} Sent
                      </span>
                      <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.min(100, (currentMonthMetrics.referralsSent / 4) * 100)}%` }} />
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                      <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block">Business Done</span>
                      <span className="text-base font-black text-emerald-600 mt-1 block">
                        ₹{currentMonthMetrics.businessGenerated.toLocaleString()}
                      </span>
                      <span className="text-[8px] text-slate-400 mt-1.5 block font-medium truncate">Value Closed</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                      <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block">Meetings</span>
                      <span className="text-base font-black text-[#0F2040] mt-1 block">
                        {currentMonthMetrics.oneToOnes} Sessions
                      </span>
                      <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
                        <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${Math.min(100, (currentMonthMetrics.oneToOnes / 2) * 100)}%` }} />
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                      <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block">Attendance</span>
                      <span className="text-base font-black text-indigo-600 mt-1 block">
                        {currentMonthMetrics.attendanceCount > 0 ? "100%" : "Ready"}
                      </span>
                      <span className="text-[8px] text-indigo-500 font-bold mt-1.5 block uppercase">Active Sync</span>
                    </div>
                  </div>
                </div>

                {/* 7. ACHIEVEMENT PROGRESS */}
                <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest block">Strategic Growth</span>
                      <h4 className="text-sm font-black text-[#0F2040] tracking-tight">Achievement Progress</h4>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest bg-[#0F2040] text-white px-2.5 py-1 rounded-full shrink-0">
                      {businessGrowthScore < 50 ? '🌱 Rising' : businessGrowthScore < 75 ? '🥈 Silver' : '🏆 Elite'}
                    </span>
                  </div>

                  {/* Business Growth Score */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-600">Business Growth Score</span>
                      <span className="text-indigo-600 font-extrabold">{businessGrowthScore} / 100 PTS</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-100">
                      <motion.div 
                        className="h-full bg-[#0F2040] rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${businessGrowthScore}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  {/* Streaks & Monthly Goal */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-slate-100">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-extrabold flex items-center gap-1">
                        <Flame size={12} className="text-amber-500" /> Referral Streak
                      </span>
                      <span className="text-[11px] font-black text-slate-800">
                        {currentMonthMetrics.referralsSent > 0 ? '2 Weeks 🔥' : '0 Weeks'}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-extrabold flex items-center gap-1">
                        <Target size={12} className="text-indigo-500" /> Monthly Goal
                      </span>
                      <span className="text-[11px] font-black text-slate-800">4 Referrals</span>
                    </div>
                  </div>

                  {/* Badges container */}
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest block mb-2">Achievement Badges</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex items-center justify-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-100" title="Founding Partner Badge">
                        <div className="w-6 h-6 rounded-full bg-[#0F2040] text-amber-400 flex items-center justify-center shadow-sm">
                          <Shield size={12} />
                        </div>
                        <span className="text-[8px] text-slate-700 font-extrabold uppercase">Founding</span>
                      </div>

                      <div className="flex items-center justify-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-100" title="Super Connector Badge">
                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shadow-sm", hasLoggedOneToOne ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-400")}>
                          <Zap size={12} />
                        </div>
                        <span className="text-[8px] text-slate-700 font-extrabold uppercase">Connector</span>
                      </div>

                      <div className="flex items-center justify-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-100" title="Network Catalyst Badge">
                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shadow-sm", hasSentThankYouSlip ? "bg-purple-600 text-white" : "bg-slate-200 text-slate-400")}>
                          <Award size={12} />
                        </div>
                        <span className="text-[8px] text-slate-700 font-extrabold uppercase">Catalyst</span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          )}


          {/* 2. CHAPTER ADMIN COMPANION VIEW */}
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

          {false && profile?.role === 'CHAPTER_ADMIN' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT COLUMN: Focus Checklist & AI recommendation (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* TODAY'S FOCUS CARD (The largest card) */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
                  <div className="absolute top-0 left-0 w-2 h-full bg-emerald-600" />
                  
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Operational Checklist</span>
                      <h3 className="text-xl font-extrabold text-[#0F2040] tracking-tight">Today's Focus</h3>
                    </div>
                    <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                      <span className="text-[11px] font-extrabold text-emerald-700">75% Complete</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-6">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-[#0F2040] rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `75%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>

                  {/* Checklist Items */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100/80 transition-all hover:bg-slate-50">
                      <div className="p-1 rounded-full shrink-0 mt-0.5 bg-emerald-100 text-emerald-600">
                        <CheckCircle2 size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-400 line-through">
                            Schedule Chapter Weekly Meetings
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Plan the calendar structure, speakers schedule, and meeting locations ahead of time.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100/80 transition-all hover:bg-slate-50">
                      <div className="p-1 rounded-full shrink-0 mt-0.5 bg-emerald-100 text-emerald-600">
                        <CheckCircle2 size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-400 line-through">
                            Moderate Guest & Visitor Onboarding
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Ensure all external chapter visitors receive welcoming instructions and follow-ups.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100/80 transition-all hover:bg-slate-50">
                      <div className="p-1 rounded-full shrink-0 mt-0.5 bg-emerald-100 text-emerald-600">
                        <CheckCircle2 size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-400 line-through">
                            Verify Active Business Categories balance
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Resolve overlaps and map vacancies to guide high-quality prospective member targets.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100/80 transition-all hover:bg-slate-50">
                      <div className="p-1 rounded-full shrink-0 mt-0.5 bg-slate-200 text-slate-400">
                        <CheckCircle2 size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-800">
                            Review and Approve Attendance Registers
                          </span>
                          <Link to="/meetings" className="text-[9px] font-black text-emerald-600 uppercase tracking-wider hover:underline">Verify logs →</Link>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Audit marked attendances for recent meetings to confirm accuracy and score statistics.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI CHAPTER COMPANION RECOMMENDATION */}
                <div className="bg-gradient-to-br from-emerald-50/60 to-teal-50/60 border border-emerald-100/70 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-200/20 rounded-full blur-xl" />
                  <div className="flex gap-4">
                    <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-2xl shrink-0 h-fit">
                      <Sparkles size={18} className="animate-pulse" />
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Chapter Optimization Advice</span>
                      <h4 className="text-sm font-bold text-slate-800 leading-snug">
                        Focus visitor invitations on vacant business categories.
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Currently, recruiting a <span className="font-extrabold text-emerald-900">Chartered Accountant</span> or <span className="font-extrabold text-emerald-900">Digital Marketer</span> will generate the highest outbound transaction volumes historically. Direct members to invite peers from these sectors next week to grow chapter transaction velocity!
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Quick Actions, Business Snapshot, & Gamification (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* QUICK ACTIONS SECTION (Chapter Admin actions) */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">President Controls</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <Link to="/meetings" className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-emerald-400/50 hover:shadow-md transition-all group hover:-translate-y-0.5 flex flex-col justify-between min-h-[110px]">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Calendar size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800 group-hover:text-emerald-600 transition-colors">Start Meeting</h4>
                        <p className="text-[9px] text-slate-400 mt-0.5 leading-snug">Organize new weekly session logs.</p>
                      </div>
                    </Link>

                    <Link to="/meetings" className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-amber-400/50 hover:shadow-md transition-all group hover:-translate-y-0.5 flex flex-col justify-between min-h-[110px]">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <CheckCircle2 size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800 group-hover:text-amber-600 transition-colors">Approve Attendance</h4>
                        <p className="text-[9px] text-slate-400 mt-0.5 leading-snug">Track marked attendances easily.</p>
                      </div>
                    </Link>

                    <Link to="/guests" className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-blue-400/50 hover:shadow-md transition-all group hover:-translate-y-0.5 flex flex-col justify-between min-h-[110px]">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <UserPlus size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800 group-hover:text-blue-600 transition-colors">Add Visitor</h4>
                        <p className="text-[9px] text-slate-400 mt-0.5 leading-snug">Register external business guests.</p>
                      </div>
                    </Link>

                    <Link to="/members" className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-purple-400/50 hover:shadow-md transition-all group hover:-translate-y-0.5 flex flex-col justify-between min-h-[110px]">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Users size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800 group-hover:text-purple-600 transition-colors">Manage Members</h4>
                        <p className="text-[9px] text-slate-400 mt-0.5 leading-snug">Moderate assigned chapter directory.</p>
                      </div>
                    </Link>
                  </div>
                </div>

                {/* BUSINESS SNAPSHOT: EXACTLY 4 KPI CARDS, 2-COLUMN LAYOUT ON MOBILE */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between ml-1">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chapter Snapshot</h4>
                    <span className="text-[9px] text-emerald-600 font-extrabold uppercase bg-emerald-50 px-2 py-0.5 rounded-full">Current Month</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Chapter Members</span>
                      <span className="text-lg font-black text-[#0F2040] mt-1.5 block">{chapterMemberCount} Members</span>
                      <span className="text-[8px] text-emerald-600 mt-1 block font-semibold">Active Roster</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Chapter Referrals</span>
                      <span className="text-lg font-black text-[#0F2040] mt-1.5 block">{chapterReferrals} Passed</span>
                      <span className="text-[8px] text-slate-400 mt-1 block font-medium truncate">Leads Logged</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Chapter Revenue</span>
                      <span className="text-lg font-black text-emerald-600 mt-1.5 block">₹{chapterBusiness.toLocaleString()}</span>
                      <span className="text-[8px] text-slate-400 mt-1 block font-medium">Business Generated</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Chapter Meetings</span>
                      <span className="text-lg font-black text-indigo-600 mt-1.5 block">{chapterMeetings} Sessions</span>
                      <span className="text-[8px] text-indigo-500 font-bold mt-1 block uppercase">Syncs Organized</span>
                    </div>
                  </div>
                </div>

                {/* GAMIFICATION & HEALTH RING */}
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block">Administrative Rating</span>
                      <h4 className="text-sm font-black text-slate-800 tracking-tight">Chapter Health Score</h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Progress Ring */}
                    <div className="relative shrink-0 flex items-center justify-center w-20 h-20">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="40" cy="40" r="32" stroke="#F1F5F9" strokeWidth="6" fill="transparent" />
                        <circle
                          cx="40" cy="40" r="32" stroke="#10B981" strokeWidth="6" fill="transparent"
                          strokeDasharray={201}
                          strokeDashoffset={201 - (201 * chapterHealthScore) / 100}
                          className="transition-all duration-1000 ease-out"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-lg font-black text-emerald-600 leading-none">{chapterHealthScore}</span>
                        <span className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">HEALTH</span>
                      </div>
                    </div>

                    {/* Performance metrics */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-50 pb-1.5">
                        <span className="text-[10px] text-slate-500 font-medium">
                          Member Engagement
                        </span>
                        <span className="text-xs font-extrabold text-emerald-600">85% Active 📈</span>
                      </div>
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-[10px] text-slate-500 font-medium">
                          Chapter Growth Index
                        </span>
                        <span className="text-xs font-extrabold text-[#0F2040]">+12% MoM</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}


          {/* 3. MASTER ADMIN COMPANION VIEW */}
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

          {false && profile?.role === 'MASTER_ADMIN' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT COLUMN: Focus Checklist & AI recommendation (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* TODAY'S FOCUS CARD (The largest card) */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
                  <div className="absolute top-0 left-0 w-2 h-full bg-slate-800" />
                  
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Global Operations</span>
                      <h3 className="text-xl font-extrabold text-[#0F2040] tracking-tight">Today's Focus</h3>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                      <span className="text-[11px] font-extrabold text-slate-700">100% Active</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-6">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-slate-800 to-[#0F2040] rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `100%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>

                  {/* Checklist Items */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100/80 transition-all hover:bg-slate-50">
                      <div className="p-1 rounded-full shrink-0 mt-0.5 bg-emerald-100 text-emerald-600">
                        <CheckCircle2 size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-400 line-through">
                            Audit & Enable Chapter Admin Logins
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Review and authorize local Chapter President logins to open regional consoles.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100/80 transition-all hover:bg-slate-50">
                      <div className="p-1 rounded-full shrink-0 mt-0.5 bg-emerald-100 text-emerald-600">
                        <CheckCircle2 size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-400 line-through">
                            Verify Global Membership directory listings
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Browse across all chapters, approve membership applications, and moderate profile completeness.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100/80 transition-all hover:bg-slate-50">
                      <div className="p-1 rounded-full shrink-0 mt-0.5 bg-emerald-100 text-emerald-600">
                        <CheckCircle2 size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-400 line-through">
                            Manage Core Industry Category balance
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Configure global business categories, map industry limits, and enable vacancy tags.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100/80 transition-all hover:bg-slate-50">
                      <div className="p-1 rounded-full shrink-0 mt-0.5 bg-emerald-100 text-emerald-600">
                        <CheckCircle2 size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-400 line-through">
                            Analyze Aggregate regional Transaction volumes
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Review overall business generated, track active referrals, and identify network-wide scaling limits.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI NETWORK ADVOCATE RECOMMENDATION */}
                <div className="bg-gradient-to-br from-slate-100 to-indigo-50/40 border border-slate-200/60 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-200/10 rounded-full blur-xl" />
                  <div className="flex gap-4">
                    <div className="p-2.5 bg-slate-200 text-slate-700 rounded-2xl shrink-0 h-fit">
                      <Sparkles size={18} className="animate-pulse" />
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 font-extrabold">Network Strategic Insight</span>
                      <h4 className="text-sm font-bold text-slate-800 leading-snug">
                        Implement Cross-Chapter Guest Matching.
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Aggregate network business generation has increased by <span className="font-extrabold text-emerald-600">18%</span> this quarter. Direct Chapter Presidents to share prospective visitor lists on complementary sectors to trigger exponential regional multipliers!
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Quick Actions, Business Snapshot, & Gamification (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* QUICK ACTIONS SECTION (Master Admin actions) */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Network Console</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <Link to="/members" className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-slate-800/50 hover:shadow-md transition-all group hover:-translate-y-0.5 flex flex-col justify-between min-h-[110px]">
                      <div className="w-9 h-9 rounded-xl bg-slate-800/10 text-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Users size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800 group-hover:text-slate-800 transition-colors">Approve Members</h4>
                        <p className="text-[9px] text-slate-400 mt-0.5 leading-snug">Audit & approve global directory.</p>
                      </div>
                    </Link>

                    <Link to="/admins" className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-slate-800/50 hover:shadow-md transition-all group hover:-translate-y-0.5 flex flex-col justify-between min-h-[110px]">
                      <div className="w-9 h-9 rounded-xl bg-slate-800/10 text-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Shield size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800 group-hover:text-slate-800 transition-colors">Create Chapter</h4>
                        <p className="text-[9px] text-slate-400 mt-0.5 leading-snug">Review and authorize regional admins.</p>
                      </div>
                    </Link>

                    <Link to="/meetings" className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-slate-800/50 hover:shadow-md transition-all group hover:-translate-y-0.5 flex flex-col justify-between min-h-[110px]">
                      <div className="w-9 h-9 rounded-xl bg-slate-800/10 text-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Calendar size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800 group-hover:text-slate-800 transition-colors">Create Meeting</h4>
                        <p className="text-[9px] text-slate-400 mt-0.5 leading-snug">Setup new weekly regional calendars.</p>
                      </div>
                    </Link>

                    <button 
                      onClick={() => setActiveTab('reports')} 
                      className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-slate-800/50 hover:shadow-md transition-all group hover:-translate-y-0.5 flex flex-col justify-between text-left min-h-[110px]"
                    >
                      <div className="w-9 h-9 rounded-xl bg-slate-800/10 text-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Activity size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800 group-hover:text-slate-800 transition-colors">View Reports</h4>
                        <p className="text-[9px] text-slate-400 mt-0.5 leading-snug">Access traditional data filters.</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* BUSINESS SNAPSHOT: EXACTLY 4 KPI CARDS, 2-COLUMN LAYOUT ON MOBILE */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between ml-1">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Network Snapshot</h4>
                    <span className="text-[9px] text-slate-800 font-extrabold uppercase bg-slate-100 px-2 py-0.5 rounded-full">Global Footprint</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Active Members</span>
                      <span className="text-lg font-black text-[#0F2040] mt-1.5 block">{globalMemberCount} Partners</span>
                      <span className="text-[8px] text-slate-500 mt-1 block">Verified Network</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Active Chapters</span>
                      <span className="text-lg font-black text-[#0F2040] mt-1.5 block">{globalChapterCount} Hubs</span>
                      <span className="text-[8px] text-slate-500 mt-1 block">Regional Chapters</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Business Generated</span>
                      <span className="text-lg font-black text-emerald-600 mt-1.5 block">₹{globalBusinessGenerated.toLocaleString()}</span>
                      <span className="text-[8px] text-slate-400 mt-1 block font-medium">Aggregate Value</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Referral Activity</span>
                      <span className="text-lg font-black text-indigo-600 mt-1.5 block">{globalReferralsCount} Leads</span>
                      <span className="text-[8px] text-indigo-500 font-bold mt-1 block uppercase">Total Shared</span>
                    </div>
                  </div>
                </div>

                {/* GAMIFICATION & HEALTH RING */}
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block">Global Index Rating</span>
                      <h4 className="text-sm font-black text-slate-800 tracking-tight">Network Health Score</h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Progress Ring */}
                    <div className="relative shrink-0 flex items-center justify-center w-20 h-20">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="40" cy="40" r="32" stroke="#F1F5F9" strokeWidth="6" fill="transparent" />
                        <circle
                          cx="40" cy="40" r="32" stroke="#1E293B" strokeWidth="6" fill="transparent"
                          strokeDasharray={201}
                          strokeDashoffset={201 - (201 * networkHealthScore) / 100}
                          className="transition-all duration-1000 ease-out"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-lg font-black text-slate-800 leading-none">{networkHealthScore}</span>
                        <span className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">HEALTH</span>
                      </div>
                    </div>

                    {/* Performance metrics */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-50 pb-1.5">
                        <span className="text-[9px] text-slate-500 font-medium">
                          Fastest Growing
                        </span>
                        <span className="text-[10px] font-extrabold text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded-full truncate max-w-[120px]">SSK Founders</span>
                      </div>
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-[9px] text-slate-500 font-medium">
                          Top Performing
                        </span>
                        <span className="text-[10px] font-extrabold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded-full truncate max-w-[120px]">SSK Elite</span>
                      </div>
                    </div>
                  </div>

                  {/* Network Alert Notification */}
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/50">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[9px] text-emerald-700 font-bold uppercase tracking-wider">All chapters online & compliant</span>
                  </div>
                </div>

              </div>
            </div>
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
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.15em] ml-2">Next Meeting Metrics</span>
                  <Eye size={16} className="text-text-secondary" />
                </div>
                
                <div className="text-center py-2">
                  <h3 className="text-base sm:text-lg font-bold text-primary break-words px-2">
                    {nextMeeting ? format(new Date(nextMeeting.date), 'EEEE, MMMM d, yyyy') : 'No Upcoming Meetings'}
                  </h3>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
                  <div className="text-center">
                    <p className="text-[9px] font-bold text-text-secondary uppercase tracking-wider">TYFCB</p>
                    <p className="text-xs font-bold text-text-primary mt-0.5">₹0</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-bold text-text-secondary uppercase tracking-wider">Speakers</p>
                    <p className="text-xs font-bold text-text-primary mt-0.5">0</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-bold text-text-secondary uppercase tracking-wider">Visitors</p>
                    <p className="text-xs font-bold text-text-primary mt-0.5">0</p>
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
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.15em]">{title}</span>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[8px] font-bold text-text-secondary uppercase ml-1">Start Date</label>
            <input 
              type="date" 
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full p-2 text-[10px] rounded-lg border border-border focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-bold text-text-secondary uppercase ml-1">End Date</label>
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
            <label className="text-[8px] font-bold text-text-secondary uppercase ml-1">{optionLabel}</label>
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
        <span className="text-sm font-bold text-primary">{value}</span>
        <Plus size={12} className="text-primary" />
      </div>
    </div>
  );
}
