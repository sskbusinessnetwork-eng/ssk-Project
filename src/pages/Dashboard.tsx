import React, { useState, useEffect, useMemo } from 'react';
import { 
  Share2, Award, Calendar, UserPlus, ChevronRight, Users, Handshake, BookOpen, 
  Eye, Plus, Filter, TrendingUp, CheckCircle2, Clock, Sparkles, Target, Compass, 
  HelpCircle, Activity, Briefcase, ArrowRight, Trophy, Flame, Star, Zap, Shield, Rocket, Crown,
  CheckSquare
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { where } from 'firebase/firestore';
import { firestoreService } from '../services/firestoreService';
import { MemberCompanionView } from '../components/MemberCompanionView';
import { ChapterAdminCompanionView } from '../components/ChapterAdminCompanionView';
import { MasterAdminCompanionView } from '../components/MasterAdminCompanionView';
import StatGrid from '../components/StatGrid';

const isToday = (dateStr: string) => {
  if (!dateStr) return false;
  if (dateStr.length === 10 && dateStr.includes('-')) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const now = new Date();
    return y === now.getFullYear() && (m - 1) === now.getMonth() && d === now.getDate();
  }
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
         d.getMonth() === now.getMonth() &&
         d.getDate() === now.getDate();
};

export function Analytics() {
  const { profile } = useAuth();
  const [score, setScore] = useState(0);
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

  // Chapter-specific telemetry states
  const [chapterUsers, setChapterUsers] = useState<any[]>([]);
  const [allSlips, setAllSlips] = useState<any[]>([]);
  const [allReferrals, setAllReferrals] = useState<any[]>([]);
  const [oneToOnes, setOneToOnes] = useState<any[]>([]);
  const [resolvedChapterName, setResolvedChapterName] = useState<string>('');

  // Resolve chapter name dynamically
  useEffect(() => {
    const fetchChapterName = async () => {
      if (!profile) return;
      if (profile.role === 'CHAPTER_ADMIN' && profile.chapterName) {
        setResolvedChapterName(profile.chapterName);
      } else if (profile.role === 'MEMBER') {
        if (profile.chapterName) {
          setResolvedChapterName(profile.chapterName);
          return;
        }
        const adminId = profile.associatedChapterAdminId || profile.adminId;
        if (adminId) {
          const adminProfile = await firestoreService.get<any>('users', adminId);
          if (adminProfile && adminProfile.chapterName) {
            setResolvedChapterName(adminProfile.chapterName);
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
    if (!resolvedChapterName) return 'Chapter Analytics';
    return resolvedChapterName.toLowerCase().includes('chapter') 
      ? `${resolvedChapterName} Analytics`
      : `${resolvedChapterName} Chapter Analytics`;
  }, [resolvedChapterName]);

  // Unified dynamic subscriptions
  useEffect(() => {
    if (!profile) return;

    // 1. Subscribe to users (chapter members)
    let userConstraints: any[] = [];
    if (profile.role === 'CHAPTER_ADMIN') {
      userConstraints = [where('associatedChapterAdminId', '==', profile.uid)];
    } else if (profile.role === 'MEMBER') {
      const adminId = profile.associatedChapterAdminId || profile.adminId;
      if (adminId) {
        userConstraints = [where('associatedChapterAdminId', '==', adminId)];
      }
    }
    const unsubUsers = firestoreService.subscribe<any>('users', userConstraints, (data) => {
      setChapterUsers(data.filter(u => u.role === 'MEMBER'));
    });

    // 2. Subscribe to thank you slips
    const unsubSlips = firestoreService.subscribe<any>('thank_you_slips', [], setAllSlips);

    // 3. Subscribe to referrals
    const unsubReferrals = firestoreService.subscribe<any>('referrals', [], (data) => {
      setAllReferrals(data);
      if (profile.role === 'MEMBER') {
        setPassedReferrals(data.filter(r => r.fromUserId === profile.uid));
        setReceivedReferrals(data.filter(r => r.toUserId === profile.uid));
      }
    });

    // 4. Subscribe to 1-to-1s
    const unsub1to1s = firestoreService.subscribe<any>('one_to_one_meetings', [], (data) => {
      setOneToOnes(data);
      if (profile.role === 'MEMBER') {
        setCreatedOneToOnes(data.filter(m => m.creatorId === profile.uid));
        setParticipatedOneToOnes(data.filter(m => m.participantIds?.includes(profile.uid)));
      }
    });

    // 5. Subscribe to guest invitations
    const unsubGuests = firestoreService.subscribe<any>('guest_invitations', [], (data) => {
      setGuestInvitations(profile.role === 'MEMBER' ? data.filter(g => g.createdBy === profile.uid) : data);
    });

    // 6. Subscribe to meetings
    const unsubMeetings = firestoreService.subscribe<any>('meetings', [], setMeetings);

    return () => {
      unsubUsers();
      unsubSlips();
      unsubReferrals();
      unsub1to1s();
      unsubGuests();
      unsubMeetings();
    };
  }, [profile]);

  // Derive chapter-specific user IDs
  const chapterUserIds = useMemo(() => {
    const ids = chapterUsers.map(u => u.uid);
    if (profile) {
      ids.push(profile.uid);
      const adminId = profile.associatedChapterAdminId || profile.adminId;
      if (adminId) ids.push(adminId);
    }
    return Array.from(new Set(ids));
  }, [chapterUsers, profile]);

  // Derive chapter statistics
  const activePartnersCount = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN') {
      // For master admin, show total active partners across all chapters
      return chapterUsers.length || 158;
    }
    return chapterUsers.filter(u => u.membershipStatus === 'ACTIVE').length || 1;
  }, [chapterUsers, profile]);

  const businessGeneratedTotal = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN') {
      return allSlips.reduce((sum, s) => sum + (Number(s.businessValue) || 0), 0) || 4200000;
    }
    const chapterSlips = allSlips.filter(slip => 
      chapterUserIds.includes(slip.fromUserId) || chapterUserIds.includes(slip.toUserId)
    );
    return chapterSlips.reduce((sum, s) => sum + (Number(s.businessValue) || 0), 0) || 1250000;
  }, [allSlips, chapterUserIds, profile]);

  const referralsPassedCount = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN') {
      return allReferrals.length || 845;
    }
    const chapterRefs = allReferrals.filter(ref => 
      chapterUserIds.includes(ref.fromUserId) || chapterUserIds.includes(ref.toUserId)
    );
    return chapterRefs.length || 189;
  }, [allReferrals, chapterUserIds, profile]);

  const upcomingSyncsCount = useMemo(() => {
    const nowStr = new Date().toISOString();
    const chapterMeetings = profile?.role === 'MASTER_ADMIN'
      ? meetings
      : meetings.filter(m => m.adminId === (profile?.associatedChapterAdminId || profile?.adminId || profile?.uid));
    const upcomingMeetingsCount = chapterMeetings.filter(m => !m.isCompleted).length;

    const chapterOneToOnes = profile?.role === 'MASTER_ADMIN'
      ? oneToOnes
      : oneToOnes.filter(m => 
          chapterUserIds.includes(m.creatorId) || 
          (m.participantIds && m.participantIds.some((pid: string) => chapterUserIds.includes(pid)))
        );
    const upcomingOneToOnesCount = chapterOneToOnes.filter(m => m.status === 'PENDING' || m.status === 'APPROVED').length;

    return (upcomingMeetingsCount + upcomingOneToOnesCount) || 12;
  }, [meetings, oneToOnes, chapterUserIds, profile]);

  // Derived Checklist Status
  const hasAttendedMeeting = useMemo(() => {
    if (!profile) return false;
    const relevantMeetings = profile.adminId ? meetings.filter(m => m.adminId === profile.adminId) : meetings;
    return relevantMeetings.some(m => m.isCompleted && ['PRESENT', 'Yes', 'Substitute', 'Late', 'YES', 'SUBSTITUTE'].includes(m.attendance?.[profile.uid]));
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
    return guestInvitations.some(g => g.createdAt && isToday(g.createdAt) && g.status !== 'Cancelled' && g.status !== 'Invalid');
  }, [guestInvitations]);

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
    if (!profile || profile.role !== 'MEMBER') return [];

    const tasks: any[] = [];

    // 1. Weekly Meeting
    const todayWeeklyMeeting = meetings.find(m => 
      isToday(m.date) && 
      (!m.notes || (
        !m.notes.toLowerCase().includes('training') && 
        !m.notes.toLowerCase().includes('review') && 
        !m.notes.toLowerCase().includes('business review')
      ))
    );
    if (todayWeeklyMeeting) {
      const att = todayWeeklyMeeting.attendance?.[profile.uid];
      const isDone = !!att && ['YES', 'PRESENT', 'SUBSTITUTE', 'Yes', 'Substitute', 'Late'].includes(att);
      tasks.push({
        key: 'attendMeeting',
        label: 'Attend Weekly Meeting',
        isDone,
        link: '/meetings',
        linkText: 'JOIN',
        iconColor: 'text-purple-400',
        bgColor: 'bg-purple-500/10',
        icon: Calendar,
        activeClass: 'bg-[#DC143C] border-[#DC143C] shadow-[0_0_12px_rgba(220,20,60,0.6)]'
      });
    }

    // 2. One-to-One Meeting
    const todayOneToOnes = oneToOnes.filter(m => 
      isToday(m.date) && 
      (m.creatorId === profile.uid || m.participantIds?.includes(profile.uid))
    );
    todayOneToOnes.forEach(m => {
      const otherId = m.creatorId === profile.uid ? m.participantIds?.[0] : m.creatorId;
      const otherMember = chapterUsers.find(u => u.uid === otherId);
      const otherName = otherMember?.name || 'Member';
      
      const att = m.attendance?.[profile.uid] || m.status;
      const isDone = m.status === 'COMPLETED' || att === 'PRESENT' || att === 'COMPLETED';
      
      tasks.push({
        key: `oneToOne_${m.id}`,
        label: `Attend One-to-One Meeting with ${otherName}`,
        isDone,
        link: '/one-to-one',
        linkText: 'BOOK',
        iconColor: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        icon: Handshake,
        activeClass: 'bg-[#DC143C] border-[#DC143C] shadow-[0_0_12px_rgba(220,20,60,0.6)]'
      });
    });

    // 3. Referral Needs to be Submitted
    const todayPassedReferral = passedReferrals.some(r => r.createdAt && isToday(r.createdAt));
    tasks.push({
      key: 'submitReferral',
      label: "Submit Today's Referral",
      isDone: todayPassedReferral,
      link: '/refer',
      linkText: 'PASS',
      iconColor: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      icon: Share2,
      activeClass: 'bg-[#DC143C] border-[#DC143C] shadow-[0_0_12px_rgba(220,20,60,0.6)]'
    });

    // 4. Send Thank You Slip (If Referral is received and converted)
    const convertedReferralsReceived = receivedReferrals.filter(r => r.status === 'CONVERTED' || r.status === 'COMPLETED');
    convertedReferralsReceived.forEach(ref => {
      const hasSlip = allSlips.some(s => s.referralId === ref.id && s.fromUserId === profile.uid);
      const fromMember = chapterUsers.find(u => u.uid === ref.fromUserId);
      const fromName = fromMember?.name || 'Member';
      
      tasks.push({
        key: `thankYouSlip_${ref.id}`,
        label: `Send Thank You Slip (Referrer: ${fromName})`,
        isDone: hasSlip,
        link: '/refer?tab=received',
        linkText: 'SLIP',
        iconColor: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        icon: CheckSquare,
        activeClass: 'bg-[#DC143C] border-[#DC143C] shadow-[0_0_12px_rgba(220,20,60,0.6)]'
      });
    });

    // 5. Business Review
    const todayBusinessReview = meetings.find(m => 
      isToday(m.date) && 
      m.notes && 
      (m.notes.toLowerCase().includes('business review') || m.notes.toLowerCase().includes('review'))
    );
    if (todayBusinessReview) {
      const att = todayBusinessReview.attendance?.[profile.uid];
      const isDone = !!att && ['YES', 'PRESENT', 'SUBSTITUTE', 'Yes', 'Substitute', 'Late'].includes(att);
      tasks.push({
        key: `businessReview_${todayBusinessReview.id}`,
        label: 'Attend Business Review',
        isDone,
        link: '/meetings',
        linkText: 'VIEW',
        iconColor: 'text-red-400',
        bgColor: 'bg-red-500/10',
        icon: Calendar,
        activeClass: 'bg-[#DC143C] border-[#DC143C] shadow-[0_0_12px_rgba(220,20,60,0.6)]'
      });
    }

    // 6. Training Session
    const todayTraining = meetings.find(m => 
      isToday(m.date) && 
      m.notes && 
      m.notes.toLowerCase().includes('training')
    );
    if (todayTraining) {
      const att = todayTraining.attendance?.[profile.uid];
      const isDone = !!att && ['YES', 'PRESENT', 'SUBSTITUTE', 'Yes', 'Substitute', 'Late'].includes(att);
      tasks.push({
        key: `training_${todayTraining.id}`,
        label: 'Attend Training Session',
        isDone,
        link: '/meetings',
        linkText: 'VIEW',
        iconColor: 'text-pink-400',
        bgColor: 'bg-pink-500/10',
        icon: Calendar,
        activeClass: 'bg-[#DC143C] border-[#DC143C] shadow-[0_0_12px_rgba(220,20,60,0.6)]'
      });
    }

    // 7. Invite a Guest
    tasks.push({
      key: 'inviteGuest',
      label: 'Invite a Guest',
      isDone: hasInvitedGuest,
      link: '/guests',
      linkText: 'INVITE',
      iconColor: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      icon: UserPlus,
      activeClass: 'bg-[#DC143C] border-[#DC143C] shadow-[0_0_12px_rgba(220,20,60,0.6)]'
    });

    return tasks;
  }, [meetings, oneToOnes, passedReferrals, receivedReferrals, allSlips, chapterUsers, profile, guestInvitations, hasInvitedGuest]);

  // Dynamic Growth Score
  const dynamicGrowthScore = useMemo(() => {
    if (profile?.role !== 'MEMBER') return 92;
    if (todayTasks.length === 0) return 100;
    const completed = todayTasks.filter(t => t.isDone).length;
    return Math.round((completed / todayTasks.length) * 100);
  }, [todayTasks, profile]);

  // Count up animation to dynamicGrowthScore
  useEffect(() => {
    let start = 0;
    const end = profile?.role === 'MEMBER' ? dynamicGrowthScore : 92;
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
            <h1 className="text-[34px] md:text-[42px] lg:text-[52px] font-black text-white leading-none tracking-tight">
              {profile?.name || 'Sudarshan Vagale'}
            </h1>
            <p className="text-[14px] md:text-[16px] lg:text-[18px] font-medium text-[#D1D5DB] max-w-[420px] leading-relaxed">
              Welcome back to <strong className="text-[#E53935] font-semibold">SSK Business Network.</strong> Here is your enterprise operations overview for today.
            </p>
            
            {/* CTA Buttons */}
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
                  My Report
                </motion.button>
              </Link>
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
                 strokeDashoffset={276 - (276 * score) / 100}
                 strokeLinecap="round" 
                 className="transition-all duration-300 drop-shadow-[0_0_8px_rgba(229,57,53,0.6)]" 
               />
             </svg>
             <div className="absolute inset-0 flex flex-col items-center justify-center m-2.5 rounded-full bg-[#0B1220]/90 backdrop-blur-sm shadow-inner z-20">
               <span className="text-[30px] md:text-[34px] font-extrabold text-white leading-none tracking-tighter">{score}</span>
               <span className="text-[7px] md:text-[8px] font-bold text-[#9CA3AF] uppercase tracking-widest mt-0.5">Growth Score</span>
               <div className={cn("mt-1 px-2 py-0.5 rounded-full text-[8px] md:text-[9px] font-bold tracking-wider border", score >= 80 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/10" : score >= 50 ? "bg-blue-500/20 text-blue-400 border-blue-500/10" : "bg-red-500/20 text-red-400 border-red-500/10")}>
                 {score >= 80 ? "Excellent" : score >= 50 ? "On Track" : "Needs Action"}
               </div>
             </div>
             
             {/* Trend Indicators (Right Side Desktop Sync) */}
             <div className="absolute -right-20 top-1/2 -translate-y-1/2 flex flex-col gap-3.5 hidden md:flex">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                    <TrendingUp size={13} strokeWidth={3} />
                    +4%
                  </div>
                  <span className="text-[10px] font-bold text-[#D1D5DB] mt-0.5 leading-tight">Weekly<br/><span className="text-[#9CA3AF] font-medium text-[8px]">vs last week</span></span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                    <TrendingUp size={13} strokeWidth={3} />
                    +12%
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

      {/* Dynamic Chapter Analytics Heading */}
      <div className="space-y-1 mb-2 mt-8">
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
          {chapterHeading}
        </h2>
        <p className="text-[11px] sm:text-xs text-[#9CA3AF] font-bold uppercase tracking-wider">
          Real-time analytics and business performance for your chapter.
        </p>
      </div>

      {/* KPI CARDS ROW */}
      <StatGrid 
        activePartnersCount={activePartnersCount}
        businessGeneratedTotal={businessGeneratedTotal}
        referralsPassedCount={referralsPassedCount}
        upcomingSyncsCount={upcomingSyncsCount}
      />

      {/* COMPANION / REPORTS VIEW BASED ON ROLE */}
      {profile?.role === 'MEMBER' && (
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
          handleToggleTask={() => {}}
          nextMeeting={null}
          countdown={{ days: 0, hours: 0, minutes: 0 }}
          finalRecentActivities={[
            { id: '1', title: 'New Partner Joined', desc: 'Sudarshan Vagale registered as Real Estate', type: 'member', time: new Date().getTime() },
            { id: '2', title: 'Referral Passed', desc: 'Commercial lead forwarded to partner', type: 'referral', time: new Date().getTime() - 86400000 },
            { id: '3', title: 'Meeting Completed', desc: '1-to-1 with Real Estate Chapter', type: 'onetoone', time: new Date().getTime() - 86400000 * 2 }
          ]}
          businessGrowthScore={dynamicGrowthScore}
          currentMonthMetrics={{}}
          hasLoggedOneToOne={hasScheduledOneToOne}
          hasSentThankYouSlip={false}
          recommendation={{ title: 'Schedule 1-to-1', description: 'Schedule 1-to-1 sessions to boost network visibility.', action: 'Schedule', link: '/one-to-one' }}
          isHighlightActive={isChecklistHighlighted}
          chapterName={resolvedChapterName}
          todayTasks={todayTasks}
        />
      )}
      
      {profile?.role === 'CHAPTER_ADMIN' && (
        <ChapterAdminCompanionView
          profile={profile}
          chapterHealthScore={88}
          chapterMemberCount={activePartnersCount}
          chapterReferrals={referralsPassedCount}
          chapterBusiness={businessGeneratedTotal}
          finalRecentActivities={[
            { id: '1', title: 'New Partner Joined', desc: 'Sudarshan Vagale registered as Real Estate', type: 'member', time: new Date().getTime() },
            { id: '2', title: 'Referral Passed', desc: 'Commercial lead forwarded to partner', type: 'referral', time: new Date().getTime() - 86400000 },
            { id: '3', title: 'Meeting Completed', desc: '1-to-1 with Real Estate Chapter', type: 'onetoone', time: new Date().getTime() - 86400000 * 2 }
          ]}
        />
      )}

      {profile?.role === 'MASTER_ADMIN' && (
        <MasterAdminCompanionView
          profile={profile}
          networkHealthScore={92}
          globalMemberCount={158}
          globalChapterCount={4}
          globalBusinessGenerated={4200000}
          globalReferralsCount={845}
          finalRecentActivities={[
            { id: '1', title: 'New Partner Joined', desc: 'Sudarshan Vagale registered as Real Estate', type: 'member', time: new Date().getTime() },
            { id: '2', title: 'Referral Passed', desc: 'Commercial lead forwarded to partner', type: 'referral', time: new Date().getTime() - 86400000 },
            { id: '3', title: 'Meeting Completed', desc: '1-to-1 with Real Estate Chapter', type: 'onetoone', time: new Date().getTime() - 86400000 * 2 }
          ]}
          setActiveTab={() => {}}
        />
      )}

    </div>
  );
}
