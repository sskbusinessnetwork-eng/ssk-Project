import { format, addYears } from 'date-fns';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Share2, Award, Calendar, UserPlus, ChevronRight, Users, Handshake, BookOpen, 
  Eye, Plus, Filter, TrendingUp, CheckCircle2, Clock, Sparkles, Target, Compass, 
  HelpCircle, Activity, Briefcase, ArrowRight, Trophy, Flame, Star, Zap, Shield, Rocket, Crown,
  CheckSquare, User
, AlertTriangle} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { getCleanFullName } from '../utils/authUtils';
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
import { calculateProfileCompletion } from '../utils/profileUtils';

export function cleanHeroName(name: string): string {
  return getCleanFullName(name);
}

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
        subscriptionStart: newStart,
        subscriptionStartDate: newStart,
        subscriptionEnd: newEnd,
        subscriptionEndDate: newEnd,
        subscriptionStatus: 'Active',
        membershipStatus: 'ACTIVE',
        renewalRequested: false
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
        renewalRequested: false
      }).eq('id', memberId);
    } catch (e) {
      console.error('Error rejecting', e);
    }
  };


  // Chapter-specific telemetry states
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

  // Resolve chapter name dynamically
  useEffect(() => {
    const fetchChapterName = async () => {
      if (!profile) return;
      const isChapterAdminUser = profile.role === 'CHAPTER_ADMIN' || (profile.role === 'MEMBER' && profile.position === 'chapter_admin');
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
    if (!resolvedChapterName) return 'Chapter Analytics';
    return resolvedChapterName.toLowerCase().includes('chapter') 
      ? `${resolvedChapterName} Analytics`
      : `${resolvedChapterName} Chapter Analytics`;
  }, [resolvedChapterName, profile]);

  // Unified dynamic subscriptions
  useEffect(() => {
    if (!profile) return;

    // 1. Subscribe to users (chapter members)
    let chapterConstraints: any[] = [];
    if (profile.role !== 'MASTER_ADMIN' && profile.chapter_id) {
      chapterConstraints = [where('chapter_id', '==', profile.chapter_id)];
    }

    const unsubUsers = databaseService.subscribe<any>('users', chapterConstraints, (data) => {
      let filtered = data;
      if (profile.role !== 'MASTER_ADMIN' && profile.chapter_id) {
        filtered = filtered.filter(u => String(u.chapter_id) === String(profile.chapter_id) || String((u as any).chapterId) === String(profile.chapter_id));
      }
      setChapterUsers(filtered.filter(u => ['MEMBER', 'CHAPTER_ADMIN'].includes(u.role) || u.position === 'chapter_admin'));
    });

    // 2. Subscribe to thank you slips
    const unsubSlips = databaseService.subscribe<any>('thank_you_slips', [], setAllSlips);
    const unsubSubRequests = databaseService.subscribe<any>('subscription_requests', [], setSubscriptionRequests);

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
      if (profile.role === 'MEMBER') {
        setCreatedOneToOnes(data.filter(m => (m.organizer_id || m.creatorId) === profile.uid));
        setParticipatedOneToOnes(data.filter(m => ([m.member_id, ...(m.participantIds || [])]).includes(profile.uid)));
      }
    });

    // 5. Subscribe to guest invitations
    const unsubGuests = databaseService.subscribe<any>('guest_invitations', chapterConstraints, (data) => {
      setGuestInvitations(data);
    });

    // 6. Subscribe to meetings
    const unsubMeetings = databaseService.subscribe<any>('meetings', chapterConstraints, setMeetings);

    // 7. Subscribe to testimonials
    const unsubTestimonials = databaseService.subscribe<any>('testimonials', chapterConstraints, setAllTestimonials);

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

  // Derive chapter statistics
  const activePartnersCount = useMemo(() => {
    const now = new Date();
    const members = chapterUsers.filter(u => u.role !== 'MASTER_ADMIN');
    const active = members.filter(u => {
      const isSubActive = (u.membershipStatus === 'ACTIVE' || u.subscriptionStatus === 'Active') && 
        (!u.subscriptionEndDate && !u.subscriptionEnd || new Date(u.subscriptionEndDate || u.subscriptionEnd) > now);
      const isPwdChanged = !u.must_change_password && !u.mustChangePassword;
      return isSubActive && isPwdChanged;
    });
    return active.length;
  }, [chapterUsers]);

  const inactiveMembersCount = useMemo(() => {
    const now = new Date();
    const members = chapterUsers.filter(u => u.role !== 'MASTER_ADMIN');
    const inactive = members.filter(u => {
      const isSubActive = (u.membershipStatus === 'ACTIVE' || u.subscriptionStatus === 'Active') && 
        (!u.subscriptionEndDate && !u.subscriptionEnd || new Date(u.subscriptionEndDate || u.subscriptionEnd) > now);
      const isPwdChanged = !u.must_change_password && !u.mustChangePassword;
      return !isSubActive || !isPwdChanged;
    });
    return inactive.length;
  }, [chapterUsers]);

  const inactiveMembersList = useMemo(() => {
    const now = new Date();
    const members = chapterUsers.filter(u => u.role !== 'MASTER_ADMIN');
    return members.filter(u => {
      const isSubActive = (u.membershipStatus === 'ACTIVE' || u.subscriptionStatus === 'Active') && 
        (!u.subscriptionEndDate && !u.subscriptionEnd || new Date(u.subscriptionEndDate || u.subscriptionEnd) > now);
      const isPwdChanged = !u.must_change_password && !u.mustChangePassword;
      return !isSubActive || !isPwdChanged;
    }).map(u => {
      const isSubActive = (u.membershipStatus === 'ACTIVE' || u.subscriptionStatus === 'Active') && 
        (!u.subscriptionEndDate && !u.subscriptionEnd || new Date(u.subscriptionEndDate || u.subscriptionEnd) > now);
      const isPwdChanged = !u.must_change_password && !u.mustChangePassword;

      let subStatus: 'Active' | 'Expired' | 'Inactive' = 'Inactive';
      if (isSubActive) {
        subStatus = 'Active';
      } else {
        const endDate = u.subscriptionEndDate || u.subscriptionEnd;
        if (endDate && new Date(endDate) <= now) {
          subStatus = 'Expired';
        } else {
          subStatus = 'Inactive';
        }
      }

      const pwdStatus = isPwdChanged ? 'Changed' : 'Default Password Not Changed';

      let inactiveReason = '';
      if (!isSubActive && !isPwdChanged) {
        inactiveReason = 'Both';
      } else if (!isSubActive) {
        inactiveReason = 'Subscription Expired';
      } else {
        inactiveReason = 'Default Password Not Changed';
      }

      const getDisplayPosition = (pos?: string, r?: string) => {
        if (r === 'MASTER_ADMIN') return 'Master Admin';
        if (r === 'CHAPTER_ADMIN' || pos === 'chapter_admin') return 'Chapter Admin';
        if (pos === 'president') return 'President';
        if (pos === 'vice_president') return 'Vice President';
        if (pos === 'treasurer') return 'Treasurer';
        return 'Associate Member';
      };

      return {
        uid: u.uid,
        name: u.name || 'N/A',
        phone: u.phone || 'N/A',
        chapterName: u.chapterName || u.chapter_name || 'N/A',
        position: getDisplayPosition(u.position, u.role),
        subscriptionStatus: subStatus,
        passwordStatus: pwdStatus,
        inactiveReason: inactiveReason
      };
    });
  }, [chapterUsers]);

  const chapterSlips = useMemo(() => {
    return allSlips.filter(slip => 
      chapterUserIds.includes(slip.fromUserId) || chapterUserIds.includes(slip.toUserId)
    );
  }, [allSlips, chapterUserIds]);

  const chapterReferralsList = useMemo(() => {
    return allReferrals.filter(ref => 
      chapterUserIds.includes(ref.fromUserId) || chapterUserIds.includes(ref.toUserId)
    );
  }, [allReferrals, chapterUserIds]);

  const businessGeneratedTotal = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN') {
      return allSlips.reduce((sum, s) => sum + (Number(s.businessValue) || 0), 0) || 0;
    }
    return chapterSlips.reduce((sum, s) => sum + (Number(s.businessValue) || 0), 0) || 0;
  }, [allSlips, chapterSlips, profile]);

  const referralsPassedCount = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN') {
      return allReferrals.length || 0;
    }
    return chapterReferralsList.length || 0;
  }, [allReferrals, chapterReferralsList, profile]);

  const upcomingSyncsCount = useMemo(() => {
    const nowStr = new Date().toISOString();
    const chapterMeetings = profile?.role === 'MASTER_ADMIN'
      ? meetings
      : meetings.filter(m => m.chapter_id === profile?.chapter_id);
    const upcomingMeetingsCount = chapterMeetings.filter(m => !m.isCompleted).length;

    const chapterOneToOnes = profile?.role === 'MASTER_ADMIN'
      ? oneToOnes
      : oneToOnes.filter(m => 
          chapterUserIds.includes((m.organizer_id || m.creatorId)) || 
          (m.participantIds && m.participantIds.some((pid: string) => chapterUserIds.includes(pid)))
        );
    const upcomingOneToOnesCount = chapterOneToOnes.filter(m => m.status === 'PENDING' || m.status === 'APPROVED').length;

    return (upcomingMeetingsCount + upcomingOneToOnesCount) || 0;
  }, [meetings, oneToOnes, chapterUserIds, profile]);

  const oneToOneMeetingsCount = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN') {
      return oneToOnes.length;
    }
    const chapterOneToOnes = oneToOnes.filter(m => 
      chapterUserIds.includes((m.organizer_id || m.creatorId)) || 
      (m.participantIds && m.participantIds.some((pid: string) => chapterUserIds.includes(pid)))
    );
    return chapterOneToOnes.length;
  }, [oneToOnes, chapterUserIds, profile]);

  const visitorsAttendedCount = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN') {
      return guestInvitations.filter(g => g.status === 'Attended').length;
    }
    const chapterGuests = guestInvitations.filter(g => chapterUserIds.includes(g.createdBy));
    return chapterGuests.filter(g => g.status === 'Attended').length || 0;
  }, [guestInvitations, chapterUserIds, profile]);

  const thankYouSlipsCount = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN') {
      return allSlips.length;
    }
    const chapterSlips = allSlips.filter(slip => 
      chapterUserIds.includes(slip.fromUserId) || chapterUserIds.includes(slip.toUserId)
    );
    return chapterSlips.length;
  }, [allSlips, chapterUserIds, profile]);

  const totalMembersCount = useMemo(() => {
    return chapterUsers.filter(u => u.role !== 'MASTER_ADMIN').length;
  }, [chapterUsers]);

  const totalChaptersCount = useMemo(() => {
    return allChapters.length || 0;
  }, [allChapters]);

  const subscriptionStats = useMemo(() => {
    const now = new Date();
    const members = chapterUsers.filter(u => u.role !== 'MASTER_ADMIN');
    
    const active = members.filter(u => {
      return (u.membershipStatus === 'ACTIVE' || u.subscriptionStatus === 'Active') && 
        (!u.subscriptionEndDate && !u.subscriptionEnd || new Date(u.subscriptionEndDate || u.subscriptionEnd) > now);
    }).length;

    const expired = members.filter(u => {
      const isSubActive = (u.membershipStatus === 'ACTIVE' || u.subscriptionStatus === 'Active') && 
        (!u.subscriptionEndDate && !u.subscriptionEnd || new Date(u.subscriptionEndDate || u.subscriptionEnd) > now);
      return !isSubActive;
    }).length;

    const renewalsDue = members.filter(u => {
      const endDateStr = u.subscriptionEndDate || u.subscriptionEnd;
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
      ? meetings 
      : meetings.filter(m => m.chapter_id === profile?.chapter_id);
    const completedMeetings = chapterMeetings.filter(m => m.isCompleted);
    if (completedMeetings.length === 0) return 0;
    
    let totalPresent = 0;
    let totalRecords = 0;
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
  }, [meetings, profile]);

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
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    return chapterUsers.filter(u => u.createdAt >= startOfMonth).length;
  }, [chapterUsers]);

  const chapterTestimonialsCount = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN') {
      return allTestimonials.filter(t => t.status === 'APPROVED').length;
    }
    return allTestimonials.filter(t => t.chapter_id === profile?.chapter_id && t.status === 'APPROVED').length;
  }, [allTestimonials, profile]);

  const chapterMeetingsCount = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN') {
      return meetings.length;
    }
    return meetings.filter(m => m.chapter_id === profile?.chapter_id).length;
  }, [meetings, profile]);

  const topPerformingChapters = useMemo(() => {
    if (profile?.role !== 'MASTER_ADMIN') return [];
    
    const chapterBusinessMap: Record<string, number> = {};
    
    allSlips.forEach(slip => {
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
  }, [allSlips, chapterUsers, profile]);

  // Dynamic Recent Activities based on real database records
  const dynamicRecentActivities = useMemo(() => {
    const activities: any[] = [];

    // 1. Slips (Revenue)
    allSlips.forEach(s => {
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
    allReferrals.forEach(r => {
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
    oneToOnes.forEach(m => {
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
    chapterUsers.forEach(u => {
      activities.push({
        id: u.uid,
        title: 'New Partner Joined',
        desc: `${u.name || 'A partner'} registered as ${u.category || 'Member'}`,
        type: 'member',
        time: new Date(u.createdAt).getTime(),
        fromUserId: u.uid,
      });
    });

    // Filter valid entries, sort by time desc
    const sorted = activities
      .filter(a => a.time && !isNaN(a.time))
      .sort((a, b) => b.time - a.time);

    return sorted;
  }, [allSlips, allReferrals, oneToOnes, chapterUsers]);

  // Filtered recent activities based on role
  const filteredRecentActivities = useMemo(() => {
    if (!profile) return [];
    if (profile.role === 'MASTER_ADMIN') {
      return dynamicRecentActivities;
    }
    const isChapterAdminUser = profile.role === 'CHAPTER_ADMIN' || (profile.role === 'MEMBER' && profile.position === 'chapter_admin');
    if (isChapterAdminUser) {
      return dynamicRecentActivities.filter(a => 
        chapterUserIds.includes(a.fromUserId) || 
        (a.toUserId && chapterUserIds.includes(a.toUserId))
      );
    }
    // MEMBER role
    return dynamicRecentActivities.filter(a => 
      a.fromUserId === profile.uid || a.toUserId === profile.uid
    );
  }, [dynamicRecentActivities, profile, chapterUserIds]);

  // Derived Checklist Status
  const hasAttendedMeeting = useMemo(() => {
    if (!profile) return false;
    const relevantMeetings = profile.adminId ? meetings.filter(m => m.chapter_id === profile.chapter_id) : meetings;
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
    if (!profile || (profile.role !== 'MEMBER' && profile.role !== 'CHAPTER_ADMIN')) return [];
    const tasks: any[] = [];
    
    // 0. Profile Completion Task
    const profileStatus = calculateProfileCompletion(profile);
    if (!profileStatus.isComplete) {
      tasks.push({
        key: 'completeProfile',
        label: `Complete Your Profile (${profileStatus.completedCount}/${profileStatus.totalRequired})`,
        desc: "Welcome to SSK Business Network! Please complete your profile to activate all member features.",
        isDone: false,
        link: '/profile',
        linkText: 'Complete',
        iconColor: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        icon: UserPlus,
        activeClass: 'bg-[#DC143C] border-[#DC143C] shadow-[0_0_12px_rgba(220,20,60,0.6)]'
      });
    }
    
    if (profile.role !== 'MEMBER') return tasks;

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
      ((m.organizer_id || m.creatorId) === profile.uid || ([m.member_id, ...(m.participantIds || [])]).includes(profile.uid))
    );
    todayOneToOnes.forEach(m => {
      const otherId = (m.organizer_id || m.creatorId) === profile.uid ? m.participantIds?.[0] : (m.organizer_id || m.creatorId);
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

    // 8. Complete Your Profile Task
    const isProfileComplete = !!(
      profile.photoURL &&
      profile.name &&
      profile.phone &&
      profile.email &&
      profile.businessName &&
      profile.category &&
      (profile.professionDesignation || profile.profession_designation) &&
      profile.address &&
      profile.city &&
      profile.state &&
      profile.pincode &&
      profile.bio
    );
    tasks.push({
      key: 'completeProfile',
      label: 'Complete Your Profile',
      isDone: isProfileComplete,
      link: '/profile',
      linkText: 'PROFILE',
      iconColor: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      icon: User,
      activeClass: 'bg-[#DC143C] border-[#DC143C] shadow-[0_0_12px_rgba(220,20,60,0.6)]'
    });

    // 9. Subscription Renewal Task
    if (profile && profile.role === 'MEMBER') {
      const endDate = profile.subscriptionEndDate || profile.subscriptionEnd;
      if (endDate) {
        const { daysRemaining } = calculateSubscriptionDetails(endDate);
        if (daysRemaining <= 30) {
          tasks.push({
            key: 'renewMembership',
            label: '⚠ Renew Your Membership',
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
    }

    return tasks;
  }, [meetings, oneToOnes, passedReferrals, receivedReferrals, allSlips, chapterUsers, profile, guestInvitations, hasInvitedGuest]);

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
      const endStr = u.subscriptionEndDate || u.subscriptionEnd;
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
      const endStr = u.subscriptionEndDate || u.subscriptionEnd;
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
      const endStr = u.subscriptionEndDate || u.subscriptionEnd;
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
      const endStr = u.subscriptionEndDate || u.subscriptionEnd;
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

    const myEndStr = profile.subscriptionEndDate || profile.subscriptionEnd;
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


  // Dynamic Growth Score
  const dynamicGrowthScore = useMemo(() => {
    if (profile?.role !== 'MEMBER') return weeklyMeetingAttendance || 0;
    if (todayTasks.length === 0) return 100;
    const completed = todayTasks.filter(t => t.isDone).length;
    return Math.round((completed / todayTasks.length) * 100);
  }, [todayTasks, profile, weeklyMeetingAttendance]);

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
  
  const renderChaptersDetails = () => {
    return (
      <div className="overflow-x-auto rounded-[16px] border border-white/5 bg-[#0F172A] custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-white/10 bg-[#1E293B]">
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Chapter Name</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Region</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Meeting Day</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Meeting Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {allChapters.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-sm font-bold text-[#6B7280] uppercase tracking-wide">
                  No Chapters Available
                </td>
              </tr>
            ) : (
              allChapters.map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.02] transition-colors duration-200">
                  <td className="p-4 text-sm font-bold text-white whitespace-nowrap">{c.chapterName || c.chapter_name || c.name || 'N/A'}</td>
                  <td className="p-4 text-sm text-white/80 whitespace-nowrap">{c.region || 'N/A'}</td>
                  <td className="p-4 text-sm text-white/80 whitespace-nowrap">{c.meetingDay || 'N/A'}</td>
                  <td className="p-4 text-sm text-white/80 whitespace-nowrap">{c.meetingTime || 'N/A'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderTotalMembersDetails = () => {
    const list = chapterUsers.filter(u => u.role !== 'MASTER_ADMIN');
    return (
      <div className="overflow-x-auto rounded-[16px] border border-white/5 bg-[#0F172A] custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-white/10 bg-[#1E293B]">
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Member Name</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Phone Number</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Leadership Position</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Company / Business</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider text-right">Subscription Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {list.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-sm font-bold text-[#6B7280] uppercase tracking-wide">
                  No Members Available
                </td>
              </tr>
            ) : (
              list.map((m) => {
                const now = new Date();
                const isSubActive = (m.membershipStatus === 'ACTIVE' || m.subscriptionStatus === 'Active') && 
                  (!m.subscriptionEndDate && !m.subscriptionEnd || new Date(m.subscriptionEndDate || m.subscriptionEnd) > now);
                return (
                  <tr key={m.uid || m.id} className="hover:bg-white/[0.02] transition-colors duration-200">
                    <td className="p-4 text-sm font-bold text-white whitespace-nowrap">{m.name || 'N/A'}</td>
                    <td className="p-4 text-sm text-white/80 whitespace-nowrap">{m.phone || 'N/A'}</td>
                    <td className="p-4 text-sm text-white/80 whitespace-nowrap">
                      {m.role === 'CHAPTER_ADMIN' || m.position === 'chapter_admin' ? 'Chapter Admin' :
                       m.position === 'president' ? 'President' :
                       m.position === 'vice_president' || m.position === 'vice-president' ? 'Vice President' :
                       m.position === 'treasurer' ? 'Treasurer' : 'Associate Member'}
                    </td>
                    <td className="p-4 text-sm text-white/80 whitespace-nowrap">{m.businessName || m.company || 'N/A'}</td>
                    <td className="p-4 text-sm font-bold text-right whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-[8px] text-[11px] font-black uppercase ${
                        isSubActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {isSubActive ? 'Active' : 'Expired'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderActiveMembersDetails = () => {
    const now = new Date();
    const list = chapterUsers.filter(u => u.role !== 'MASTER_ADMIN' && (() => {
      const isSubActive = (u.membershipStatus === 'ACTIVE' || u.subscriptionStatus === 'Active') && 
        (!u.subscriptionEndDate && !u.subscriptionEnd || new Date(u.subscriptionEndDate || u.subscriptionEnd) > now);
      const isPwdChanged = !u.must_change_password && !u.mustChangePassword;
      return isSubActive && isPwdChanged;
    })());

    return (
      <div className="overflow-x-auto rounded-[16px] border border-white/5 bg-[#0F172A] custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-white/10 bg-[#1E293B]">
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Member Name</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Phone Number</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Leadership Position</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Company / Business</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider text-right">Subscription Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {list.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-sm font-bold text-[#6B7280] uppercase tracking-wide">
                  No Active Members Found
                </td>
              </tr>
            ) : (
              list.map((m) => (
                <tr key={m.uid || m.id} className="hover:bg-white/[0.02] transition-colors duration-200">
                  <td className="p-4 text-sm font-bold text-white whitespace-nowrap">{m.name || 'N/A'}</td>
                  <td className="p-4 text-sm text-white/80 whitespace-nowrap">{m.phone || 'N/A'}</td>
                  <td className="p-4 text-sm text-white/80 whitespace-nowrap">
                    {m.role === 'CHAPTER_ADMIN' || m.position === 'chapter_admin' ? 'Chapter Admin' :
                     m.position === 'president' ? 'President' :
                     m.position === 'vice_president' || m.position === 'vice-president' ? 'Vice President' :
                     m.position === 'treasurer' ? 'Treasurer' : 'Associate Member'}
                  </td>
                  <td className="p-4 text-sm text-white/80 whitespace-nowrap">{m.businessName || m.company || 'N/A'}</td>
                  <td className="p-4 text-sm font-bold text-right whitespace-nowrap">
                    <span className="px-2 py-1 rounded-[8px] text-[11px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Active
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderInactiveMembersDetails = () => {
    return (
      <div className="overflow-x-auto rounded-[16px] border border-white/5 bg-[#0F172A] custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-white/10 bg-[#1E293B]">
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Member Name</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Phone Number</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Chapter Name</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Position</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Subscription Status</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Password Status</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider text-right">Inactive Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {inactiveMembersList.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-sm font-bold text-[#6B7280] uppercase tracking-wide">
                  No Inactive Members Found
                </td>
              </tr>
            ) : (
              inactiveMembersList.map((m) => (
                <tr key={m.uid} className="hover:bg-white/[0.02] transition-colors duration-200">
                  <td className="p-4 text-sm font-bold text-white whitespace-nowrap">{m.name}</td>
                  <td className="p-4 text-sm text-white/80 whitespace-nowrap">{m.phone}</td>
                  <td className="p-4 text-sm text-white/80 whitespace-nowrap">{m.chapterName}</td>
                  <td className="p-4 text-sm text-white/80 whitespace-nowrap">{m.position}</td>
                  <td className="p-4 text-sm whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-[8px] text-[11px] font-black uppercase ${
                      m.subscriptionStatus === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      m.subscriptionStatus === 'Expired' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                      'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                    }`}>
                      {m.subscriptionStatus}
                    </span>
                  </td>
                  <td className="p-4 text-sm whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-[8px] text-[11px] font-black uppercase ${
                      m.passwordStatus === 'Changed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {m.passwordStatus}
                    </span>
                  </td>
                  <td className="p-4 text-sm font-bold text-right whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-[8px] text-[11px] font-black uppercase ${
                      m.inactiveReason === 'Both' ? 'bg-red-500/10 text-red-550 border border-red-500/20' :
                      m.inactiveReason === 'Subscription Expired' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                      'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {m.inactiveReason}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderBusinessDetails = () => {
    const list = profile?.role === 'MASTER_ADMIN' ? allSlips : chapterSlips;
    return (
      <div className="overflow-x-auto rounded-[16px] border border-white/5 bg-[#0F172A] custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-white/10 bg-[#1E293B]">
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Giver of Business</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Recipient</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Customer Name</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Notes</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Date</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider text-right">Business Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {list.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-sm font-bold text-[#6B7280] uppercase tracking-wide">
                  No Business Transactions Recorded
                </td>
              </tr>
            ) : (
              list.map((slip) => {
                const giver = chapterUsers.find(u => u.uid === slip.fromUserId);
                const recipient = chapterUsers.find(u => u.uid === slip.toUserId);
                return (
                  <tr key={slip.id} className="hover:bg-white/[0.02] transition-colors duration-200">
                    <td className="p-4 text-sm font-bold text-white whitespace-nowrap">{giver?.name || slip.fromUserName || 'N/A'}</td>
                    <td className="p-4 text-sm text-white/80 whitespace-nowrap">{recipient?.name || slip.toUserName || 'N/A'}</td>
                    <td className="p-4 text-sm text-white/80 whitespace-nowrap">{slip.customerName || 'N/A'}</td>
                    <td className="p-4 text-sm text-white/80 max-w-xs truncate">{slip.notes || 'N/A'}</td>
                    <td className="p-4 text-sm text-white/80 whitespace-nowrap">
                      {slip.createdAt ? new Date(slip.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-4 text-sm font-black text-right text-emerald-400 whitespace-nowrap">
                      ₹{Number(slip.businessValue || 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderReferralsDetails = () => {
    const list = profile?.role === 'MASTER_ADMIN' ? allReferrals : chapterReferralsList;
    return (
      <div className="overflow-x-auto rounded-[16px] border border-white/5 bg-[#0F172A] custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-white/10 bg-[#1E293B]">
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">From</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">To</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Contact Name</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Requirement</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Date</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {list.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-sm font-bold text-[#6B7280] uppercase tracking-wide">
                  No Referrals Recorded
                </td>
              </tr>
            ) : (
              list.map((ref) => {
                const giver = chapterUsers.find(u => u.uid === ref.fromUserId);
                const receiver = chapterUsers.find(u => u.uid === ref.toUserId);
                return (
                  <tr key={ref.id} className="hover:bg-white/[0.02] transition-colors duration-200">
                    <td className="p-4 text-sm font-bold text-white whitespace-nowrap">{giver?.name || ref.fromUserName || 'N/A'}</td>
                    <td className="p-4 text-sm text-white/80 whitespace-nowrap">{receiver?.name || 'N/A'}</td>
                    <td className="p-4 text-sm text-white/80 whitespace-nowrap">{ref.contactName || 'N/A'}</td>
                    <td className="p-4 text-sm text-white/80 max-w-xs truncate">{ref.requirement || ref.notes || 'N/A'}</td>
                    <td className="p-4 text-sm text-white/80 whitespace-nowrap">
                      {ref.createdAt ? new Date(ref.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-4 text-sm text-right whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-[8px] text-[11px] font-black uppercase ${
                        ref.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        ref.status === 'APPROVED' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        ref.status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {ref.status || 'PENDING'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderMeetingsDetails = () => {
    const list = profile?.role === 'MASTER_ADMIN'
      ? meetings
      : meetings.filter(m => m.chapter_id === profile?.chapter_id);
    return (
      <div className="overflow-x-auto rounded-[16px] border border-white/5 bg-[#0F172A] custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-white/10 bg-[#1E293B]">
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Meeting Topic</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Date</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Time</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Attendance Rate</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {list.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-sm font-bold text-[#6B7280] uppercase tracking-wide">
                  No Meetings Recorded
                </td>
              </tr>
            ) : (
              list.map((m) => {
                let attendanceRate = 'N/A';
                if (m.attendance) {
                  const values = Object.values(m.attendance);
                  if (values.length > 0) {
                    const present = values.filter(status => ['PRESENT', 'Yes', 'Substitute', 'Late', 'YES', 'SUBSTITUTE'].includes(String(status))).length;
                    attendanceRate = `${Math.round((present / values.length) * 100)}% (${present}/${values.length})`;
                  }
                }
                return (
                  <tr key={m.id} className="hover:bg-white/[0.02] transition-colors duration-200">
                    <td className="p-4 text-sm font-bold text-white whitespace-nowrap">{m.title || m.topic || 'Weekly Sync'}</td>
                    <td className="p-4 text-sm text-white/80 whitespace-nowrap">
                      {m.date ? new Date(m.date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-4 text-sm text-white/80 whitespace-nowrap">{m.time || 'N/A'}</td>
                    <td className="p-4 text-sm text-white/80 whitespace-nowrap">{attendanceRate}</td>
                    <td className="p-4 text-sm text-right whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-[8px] text-[11px] font-black uppercase ${
                        m.isCompleted ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {m.isCompleted ? 'Completed' : 'Upcoming'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderOneToOnesDetails = () => {
    const list = profile?.role === 'MASTER_ADMIN'
      ? oneToOnes
      : oneToOnes.filter(m => 
          chapterUserIds.includes((m.organizer_id || m.creatorId)) || 
          (m.participantIds && m.participantIds.some((pid: string) => chapterUserIds.includes(pid)))
        );
    return (
      <div className="overflow-x-auto rounded-[16px] border border-white/5 bg-[#0F172A] custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-white/10 bg-[#1E293B]">
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Initiated By</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Partner</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Topic / Purpose</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Date</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Time</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {list.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-sm font-bold text-[#6B7280] uppercase tracking-wide">
                  No 1-to-1 Meetings Found
                </td>
              </tr>
            ) : (
              list.map((m) => {
                const creator = chapterUsers.find(u => u.uid === (m.organizer_id || m.creatorId));
                const partnerId = m.participantIds?.find((id: string) => id !== (m.organizer_id || m.creatorId));
                const partner = chapterUsers.find(u => u.uid === partnerId);
                return (
                  <tr key={m.id} className="hover:bg-white/[0.02] transition-colors duration-200">
                    <td className="p-4 text-sm font-bold text-white whitespace-nowrap">{creator?.name || 'N/A'}</td>
                    <td className="p-4 text-sm text-white/80 whitespace-nowrap">{partner?.name || 'N/A'}</td>
                    <td className="p-4 text-sm text-white/80 max-w-xs truncate">{m.topic || m.purpose || 'Synergy Sync'}</td>
                    <td className="p-4 text-sm text-white/80 whitespace-nowrap">
                      {m.date ? new Date(m.date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-4 text-sm text-white/80 whitespace-nowrap">{m.time || 'N/A'}</td>
                    <td className="p-4 text-sm text-right whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-[8px] text-[11px] font-black uppercase ${
                        m.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        m.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {m.status || 'PENDING'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderAttendanceDetails = () => {
    const list = profile?.role === 'MASTER_ADMIN' 
      ? meetings.filter(m => m.isCompleted)
      : meetings.filter(m => m.chapter_id === profile?.chapter_id && m.isCompleted);
    return (
      <div className="overflow-x-auto rounded-[16px] border border-white/5 bg-[#0F172A] custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-white/10 bg-[#1E293B]">
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Meeting Topic / Date</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider text-center">Present</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider text-center">Late</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider text-center">Substitute</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider text-center">Absent</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider text-right">Attendance Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {list.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-sm font-bold text-[#6B7280] uppercase tracking-wide">
                  No Attendance Records Found
                </td>
              </tr>
            ) : (
              list.map((m) => {
                let present = 0;
                let late = 0;
                let sub = 0;
                let absent = 0;
                let total = 0;
                if (m.attendance) {
                  Object.values(m.attendance).forEach(status => {
                    total++;
                    const s = String(status).toUpperCase();
                    if (s === 'PRESENT' || s === 'YES') present++;
                    else if (s === 'LATE') late++;
                    else if (s === 'SUBSTITUTE') sub++;
                    else absent++;
                  });
                }
                const presentTotal = present + late + sub;
                const rate = total === 0 ? 0 : Math.round((presentTotal / total) * 100);
                return (
                  <tr key={m.id} className="hover:bg-white/[0.02] transition-colors duration-200">
                    <td className="p-4 text-sm font-bold text-white whitespace-nowrap">
                      <div>{m.title || m.topic || 'Weekly Sync'}</div>
                      <div className="text-xs text-[#9CA3AF] font-medium">{m.date ? new Date(m.date).toLocaleDateString() : 'N/A'}</div>
                    </td>
                    <td className="p-4 text-sm text-center text-emerald-400 font-bold whitespace-nowrap">{present}</td>
                    <td className="p-4 text-sm text-center text-amber-400 font-bold whitespace-nowrap">{late}</td>
                    <td className="p-4 text-sm text-center text-blue-400 font-bold whitespace-nowrap">{sub}</td>
                    <td className="p-4 text-sm text-center text-red-400 font-bold whitespace-nowrap">{absent}</td>
                    <td className="p-4 text-sm text-right font-black text-white whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-[8px] text-[11px] font-black uppercase ${
                        rate >= 80 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        rate >= 50 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {rate}%
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderTestimonialsDetails = () => {
    const list = profile?.role === 'MASTER_ADMIN'
      ? allTestimonials
      : allTestimonials.filter(t => t.chapter_id === profile?.chapter_id);
    return (
      <div className="overflow-x-auto rounded-[16px] border border-white/5 bg-[#0F172A] custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-white/10 bg-[#1E293B]">
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Author Name</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Company / Designation</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider text-center">Rating</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Testimonial</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {list.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-sm font-bold text-[#6B7280] uppercase tracking-wide">
                  No Testimonials Found
                </td>
              </tr>
            ) : (
              list.map((t) => (
                <tr key={t.id} className="hover:bg-white/[0.02] transition-colors duration-200">
                  <td className="p-4 text-sm font-bold text-white whitespace-nowrap">{t.name || 'N/A'}</td>
                  <td className="p-4 text-sm text-white/80 whitespace-nowrap">
                    {t.designation || 'N/A'} {t.company ? `(${t.company})` : ''}
                  </td>
                  <td className="p-4 text-sm text-center font-bold text-yellow-400 whitespace-nowrap">
                    {'★'.repeat(t.rating || 5)}{'☆'.repeat(5 - (t.rating || 5))}
                  </td>
                  <td className="p-4 text-sm text-white/80 max-w-sm truncate">{t.testimonial || 'N/A'}</td>
                  <td className="p-4 text-sm text-right whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-[8px] text-[11px] font-black uppercase ${
                      ['APPROVED', 'PUBLISHED'].includes(String(t.status).toUpperCase()) ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {t.status || 'PENDING'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderGuestInvitesDetails = () => {
    const list = profile?.role === 'MASTER_ADMIN'
      ? guestInvitations
      : guestInvitations.filter(g => chapterUserIds.includes(g.createdBy));
    return (
      <div className="overflow-x-auto rounded-[16px] border border-white/5 bg-[#0F172A] custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-white/10 bg-[#1E293B]">
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Guest Name</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Invited By</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Email</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Phone</th>
              <th className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {list.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-sm font-bold text-[#6B7280] uppercase tracking-wide">
                  No Guest Invites Found
                </td>
              </tr>
            ) : (
              list.map((g) => {
                const inviter = chapterUsers.find(u => u.uid === g.createdBy);
                return (
                  <tr key={g.id} className="hover:bg-white/[0.02] transition-colors duration-200">
                    <td className="p-4 text-sm font-bold text-white whitespace-nowrap">{g.guestName || g.name || 'N/A'}</td>
                    <td className="p-4 text-sm text-white/80 whitespace-nowrap">{inviter?.name || 'N/A'}</td>
                    <td className="p-4 text-sm text-white/80 whitespace-nowrap">{g.guestEmail || g.email || 'N/A'}</td>
                    <td className="p-4 text-sm text-white/80 whitespace-nowrap">{g.guestPhone || g.phone || 'N/A'}</td>
                    <td className="p-4 text-sm text-right whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-[8px] text-[11px] font-black uppercase ${
                        g.status === 'Attended' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {g.status || 'Invited'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderAnalyticsDetails = () => {
    if (!analyticsModalCategory) return null;
    const norm = analyticsModalCategory.toLowerCase();
    if (norm.includes('chapter')) return renderChaptersDetails();
    if (norm === 'total members') return renderTotalMembersDetails();
    if (norm === 'active members') return renderActiveMembersDetails();
    if (norm === 'inactive members') return renderInactiveMembersDetails();
    if (norm.includes('business')) return renderBusinessDetails();
    if (norm.includes('referral')) return renderReferralsDetails();
    if (norm.includes('one-to-one')) return renderOneToOnesDetails();
    if (norm === 'meetings' || norm === 'upcoming meetings') return renderMeetingsDetails();
    if (norm.includes('attendance') || norm.includes('weekly meeting attendance')) return renderAttendanceDetails();
    if (norm.includes('testimonial')) return renderTestimonialsDetails();
    if (norm.includes('guest') || norm.includes('visitor')) return renderGuestInvitesDetails();
    return <div className="p-4 text-center font-bold text-neutral-400 uppercase tracking-widest text-xs">No detail view implemented for this category.</div>;
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

      {/* Dynamic Chapter Analytics Heading & KPI cards - Shown for Member, Chapter Admin, and Master Admin */}
      {(profile?.role === 'MASTER_ADMIN' || profile?.role === 'CHAPTER_ADMIN' || profile?.role === 'MEMBER') && (
        <>
          <div className="space-y-1 mb-2 mt-8">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
              {chapterHeading}
            </h2>
            <p className="text-[11px] sm:text-xs text-[#9CA3AF] font-bold uppercase tracking-wider">
              {profile?.role === 'MASTER_ADMIN' 
                ? 'Real-time analytics across all chapters.' 
                : 'Real-time analytics and business performance for your chapter.'}
            </p>
          </div>

          <StatGrid 
            role={profile?.role}
            totalChaptersCount={totalChaptersCount}
            totalMembersCount={totalMembersCount}
            activePartnersCount={activePartnersCount}
            inactiveMembersCount={inactiveMembersCount}
            businessGeneratedTotal={businessGeneratedTotal}
            referralsPassedCount={referralsPassedCount}
            thankYouSlipsCount={thankYouSlipsCount}
            upcomingSyncsCount={upcomingSyncsCount}
            oneToOneMeetingsCount={oneToOneMeetingsCount}
            visitorsAttendedCount={visitorsAttendedCount}
            weeklyMeetingAttendance={weeklyMeetingAttendance}
            growthScore={dynamicGrowthScore}
            newMembersThisMonthCount={newMembersThisMonthCount}
            testimonialsCount={chapterTestimonialsCount}
            meetingsCount={chapterMeetingsCount}
            onCardClick={(label) => {
              setAnalyticsModalCategory(label);
            }}
          />
        </>
      )}

      {/* COMPANION / REPORTS VIEW BASED ON ROLE */}
      {(profile?.role === 'MEMBER' || profile?.role === 'CHAPTER_ADMIN') && (
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
          finalRecentActivities={filteredRecentActivities}
          businessGrowthScore={dynamicGrowthScore}
          currentMonthMetrics={{}}
          hasLoggedOneToOne={hasScheduledOneToOne}
          hasSentThankYouSlip={false}
          recommendation={{ title: 'Schedule 1-to-1', description: 'Schedule 1-to-1 sessions to boost network visibility.', action: 'Schedule', link: '/one-to-one' }}
          isHighlightActive={isChecklistHighlighted}
          chapterName={resolvedChapterName}
          todayTasks={todayTasks}
          allSlips={allSlips}
          allReferrals={allReferrals}
        />
      )}
 
      
      {(profile?.role === 'CHAPTER_ADMIN' || profile?.position === 'chapter_admin') && (
        <ChapterAdminCompanionView
          profile={profile}
          chapterHealthScore={dynamicNetworkHealthScore}
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
          networkHealthScore={dynamicNetworkHealthScore}
          globalMemberCount={totalMembersCount}
          globalChapterCount={totalChaptersCount}
          globalBusinessGenerated={businessGeneratedTotal}
          globalReferralsCount={referralsPassedCount}
          finalRecentActivities={filteredRecentActivities}
          setActiveTab={() => {}}
          topPerformingChapters={topPerformingChapters}
          allSlips={allSlips}
          allReferrals={allReferrals}
          subscriptionStats={subscriptionStats}
          leadershipStats={leadershipStats}
        />
      )}
      <Modal 
        isOpen={analyticsModalCategory !== null} 
        onClose={() => setAnalyticsModalCategory(null)} 
        title={analyticsModalCategory || ''} 
        maxWidth="max-w-6xl" 
      > 
        {renderAnalyticsDetails()} 
      </Modal> 
    </div> 
  ); 
}
