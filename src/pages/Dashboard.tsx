import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Users, 
  Share2, 
  Award, 
  Calendar,
  CheckCircle2,
  X,
  Info,
  IndianRupee,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  Shield,
  FileText,
  Handshake,
  Plus,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, updateDoc, Query, DocumentData, CollectionReference, or, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Referral, ThankYouSlip, UserProfile, Meeting, OneToOneMeeting, Category, GuestRegistration } from '../types';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../components/Modal';
import { cn } from '../lib/utils';
import { format, startOfWeek, endOfWeek, startOfMonth, isWithinInterval, parseISO, differenceInDays } from 'date-fns';
import { usePositions } from '../hooks/usePositions';
import { notificationService } from '../services/notificationService';
import { firestoreService } from '../services/firestoreService';

export function Analytics() {
  const { profile, loading: authLoading } = useAuth();
  const { getPositionForUser } = usePositions();
  const navigate = useNavigate();
  const isAdmin = profile?.role === 'MASTER_ADMIN';
  const isChapterAdmin = profile?.role === 'CHAPTER_ADMIN';

  const [selectedAdminId, setSelectedAdminId] = useState<string>('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [selectedChapterMemberId, setSelectedChapterMemberId] = useState<string>('');
  const [adminAdmins, setAdminAdmins] = useState<UserProfile[]>([]);
  const [allMembers, setAllMembers] = useState<UserProfile[]>([]);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const handleUpgradeSubscription = async () => {
    if (!profile) return;
    setIsUpgrading(true);
    
    const today = new Date();
    const nextYear = new Date();
    nextYear.setFullYear(today.getFullYear() + 1);
    
    try {
      await firestoreService.update('users', profile.uid, {
        subscriptionStart: today.toISOString(),
        subscriptionEnd: nextYear.toISOString(),
        membershipStatus: 'ACTIVE'
      });
      
      // Create notifications
      await notificationService.createNotification(profile.uid, 'MEMBER', 'UPGRADE', 'Your subscription has been successfully upgraded for 1 year.');
      
      if (profile.adminId) {
        await notificationService.createNotification(profile.adminId, 'CHAPTER_ADMIN', 'UPGRADE', `${profile.name} has upgraded their subscription.`);
      }
      
      await notificationService.notifyMasterAdmins('UPGRADE', `${profile.name} has upgraded their subscription.`);
      
    } catch (error) {
      console.error('Error upgrading subscription:', error);
    } finally {
      setIsUpgrading(false);
    }
  };

  const [chapterMemberAnalytics, setChapterMemberAnalytics] = useState<any[]>([]);
  const [chapterReferralsHistory, setChapterReferralsHistory] = useState<Referral[]>([]);
  const [chapterSlipsHistory, setChapterSlipsHistory] = useState<ThankYouSlip[]>([]);

  const [masterChapterStats, setMasterChapterStats] = useState({
    businessGenerated: 0,
    businessReceived: 0,
    referralsSent: 0,
    referralsReceived: 0,
    totalMembers: 0,
    meetingsConducted: 0
  });

  const [masterMemberStats, setMasterMemberStats] = useState({
    businessGenerated: 0,
    businessReceived: 0,
    referralsSent: 0,
    referralsReceived: 0,
    meetingsAttended: 0,
    oneToOnes: 0
  });

  const [chapterStats, setChapterStats] = useState({
    businessGenerated: 0,
    businessReceived: 0,
    referralsSent: 0,
    referralsReceived: 0,
    totalMembers: 0,
    meetingsConducted: 0,
    meetingsAttended: 0,
    oneToOnes: 0,
    oneToOnesAttended: 0
  });

  const [personalStats, setPersonalStats] = useState({
    referralsSent: 0,
    referralsReceived: 0,
    businessGenerated: 0,
    businessReceived: 0,
    meetingsConducted: 0,
    meetingsAttended: 0
  });

  const [userMeetings, setUserMeetings] = useState<Meeting[]>([]);
  const [nextMeeting, setNextMeeting] = useState<Meeting | null>(null);
  const [weeklyStats, setWeeklyStats] = useState({
    totalRevenue: 0,
    referralsSent: 0,
    totalMembers: 0,
    referralsReceived: 0,
    totalMeetings: 0
  });

  const [chapterReportRange, setChapterReportRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  const [memberReportRange, setMemberReportRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  const [performanceRange, setPerformanceRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // History Modal State
  const [historyModal, setHistoryModal] = useState<{
    isOpen: boolean;
    type: 'sent' | 'received';
    memberId: string;
    memberName: string;
    slips: ThankYouSlip[];
  }>({
    isOpen: false,
    type: 'sent',
    memberId: '',
    memberName: '',
    slips: []
  });

  const [allSlipsData, setAllSlipsData] = useState<ThankYouSlip[]>([]);
  const [guestRegistrations, setGuestRegistrations] = useState<GuestRegistration[]>([]);

  useEffect(() => {
    if (!profile) return;
    
    const constraints = [
      where('userId', '==', profile.uid),
      orderBy('createdAt', 'desc'),
      limit(5)
    ];
    
    const unsubscribe = firestoreService.subscribe<Notification>('notifications', constraints, (data) => {
      setNotifications(data);
    });
    
    return () => unsubscribe();
  }, [profile]);

  useEffect(() => {
    if (profile?.role === 'MEMBER' && profile.subscriptionEnd) {
      const checkSubscription = async () => {
        const expiryDate = new Date(profile.subscriptionEnd);
        const today = new Date();
        const daysLeft = differenceInDays(expiryDate, today);
        
        if (daysLeft >= 0 && daysLeft <= 7) {
          const todayStr = today.toISOString().split('T')[0];
          const q = query(
            collection(db, 'notifications'),
            where('userId', '==', profile.uid),
            where('type', '==', 'SUBSCRIPTION'),
            orderBy('createdAt', 'desc'),
            limit(1)
          );
          const snapshot = await getDocs(q);
          const lastNotif = snapshot.docs[0]?.data();
          
          if (!lastNotif || lastNotif.createdAt.split('T')[0] !== todayStr) {
            await notificationService.createNotification(
              profile.uid, 
              'MEMBER', 
              'SUBSCRIPTION', 
              `Your subscription will expire in ${daysLeft === 0 ? 'today' : `${daysLeft} days`}. Please upgrade soon.`
            );
          }
        }
      };
      checkSubscription();
    }
  }, [profile]);

  const [allUsersData, setAllUsersData] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (profile?.role === 'MASTER_ADMIN') {
      getDocs(query(collection(db, 'users'), where('role', '==', 'CHAPTER_ADMIN')))
        .then(snap => {
          setAdminAdmins(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
        });
    }
  }, [profile]);

  useEffect(() => {
    if (authLoading) return;
    if (!profile) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        
        let effectiveAdminId = selectedAdminId;
        if (!isAdmin) {
          effectiveAdminId = isChapterAdmin ? profile.uid : (profile.associatedChapterAdminId || profile.adminId || '');
        }

        if (!effectiveAdminId && !isAdmin) {
          setLoading(false);
          return;
        }

        let usersQuery: Query<DocumentData> | CollectionReference<DocumentData> = collection(db, 'users');
        let referralsQuery: Query<DocumentData> | CollectionReference<DocumentData> = collection(db, 'referrals');
        let slipsQuery: Query<DocumentData> | CollectionReference<DocumentData> = collection(db, 'thank_you_slips');
        let oneToOnesQuery: Query<DocumentData> | CollectionReference<DocumentData> = collection(db, 'one_to_one_meetings');

        if (!isAdmin && !isChapterAdmin) {
          // Regular members can only see their own data
          referralsQuery = query(collection(db, 'referrals'), or(where('fromUserId', '==', profile.uid), where('toUserId', '==', profile.uid)));
          slipsQuery = query(collection(db, 'thank_you_slips'), or(where('fromUserId', '==', profile.uid), where('toUserId', '==', profile.uid)));
          oneToOnesQuery = query(collection(db, 'one_to_one_meetings'), where('participantIds', 'array-contains', profile.uid));
          // For users, they can only list if they are admin, so for members we'll just fetch their own doc
          usersQuery = query(collection(db, 'users'), where('uid', '==', profile.uid));
        } else if (isChapterAdmin) {
          // Chapter Admins can see their chapter's users
          usersQuery = query(collection(db, 'users'), where('associatedChapterAdminId', '==', profile.uid));
          // For referrals/slips, they currently fetch all and filter in memory (allowed by rules for CHAPTER_ADMIN)
        }

        const meetingsQuery = isAdmin && !selectedAdminId 
          ? collection(db, 'meetings')
          : effectiveAdminId
            ? query(collection(db, 'meetings'), where('adminId', '==', effectiveAdminId))
            : null;

        // Fetch all data first for aggregation
        const [usersSnap, referralsSnap, slipsSnap, meetingsSnap, oneToOnesSnap, guestRegSnap] = await Promise.all([
          getDocs(usersQuery),
          getDocs(referralsQuery),
          getDocs(slipsQuery),
          meetingsQuery ? getDocs(meetingsQuery) : Promise.resolve({ docs: [] }),
          getDocs(oneToOnesQuery),
          isChapterAdmin ? getDocs(query(collection(db, 'guest_registrations'), where('adminId', '==', profile.uid), orderBy('createdAt', 'desc'))) : Promise.resolve({ docs: [] })
        ]);

        const allUsers = usersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        const allReferrals = referralsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Referral));
        const allSlips = slipsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ThankYouSlip));
        const allMeetings = meetingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Meeting));
        const allOneToOnes = oneToOnesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as OneToOneMeeting));
        const allGuestRegs = guestRegSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as GuestRegistration));

        setGuestRegistrations(allGuestRegs);
        setAllSlipsData(allSlips);
        setAllUsersData(allUsers);
        setAllMembers(allUsers.filter(u => u.role === 'MEMBER'));

        // Master Admin Reports Logic
        if (isAdmin) {
          // 1. Chapter Report
          const chapStart = parseISO(chapterReportRange.start);
          const chapEnd = parseISO(chapterReportRange.end);
          chapEnd.setHours(23, 59, 59, 999);

          let filteredChapterMembers = allUsers.filter(u => u.role === 'MEMBER');
          let filteredChapterMeetings = allMeetings;
          
          if (selectedAdminId) {
            filteredChapterMembers = filteredChapterMembers.filter(m => m.adminId === selectedAdminId);
            filteredChapterMeetings = filteredChapterMeetings.filter(m => m.adminId === selectedAdminId);
          }

          const chapterMemberIds = filteredChapterMembers.map(m => m.uid);

          const masterChapterBusinessGenerated = allSlips
            .filter(s => 
              chapterMemberIds.includes(s.fromUserId) && 
              isWithinInterval(new Date(s.createdAt), { start: chapStart, end: chapEnd })
            )
            .reduce((acc, slip) => acc + (slip.businessValue || 0), 0);

          const masterChapterBusinessReceived = allSlips
            .filter(s => 
              chapterMemberIds.includes(s.toUserId) && 
              isWithinInterval(new Date(s.createdAt), { start: chapStart, end: chapEnd })
            )
            .reduce((acc, slip) => acc + (slip.businessValue || 0), 0);

          const masterChapterReferralsSent = allReferrals
            .filter(r => 
              chapterMemberIds.includes(r.fromUserId) && 
              isWithinInterval(new Date(r.createdAt), { start: chapStart, end: chapEnd })
            )
            .length;

          const masterChapterReferralsReceived = allReferrals
            .filter(r => 
              chapterMemberIds.includes(r.toUserId) && 
              isWithinInterval(new Date(r.createdAt), { start: chapStart, end: chapEnd })
            )
            .length;

          const masterChapterMeetingsCount = filteredChapterMeetings
            .filter(m => isWithinInterval(new Date(m.date), { start: chapStart, end: chapEnd }))
            .length;

          setMasterChapterStats({
            businessGenerated: masterChapterBusinessGenerated,
            businessReceived: masterChapterBusinessReceived,
            referralsSent: masterChapterReferralsSent,
            referralsReceived: masterChapterReferralsReceived,
            totalMembers: filteredChapterMembers.length,
            meetingsConducted: masterChapterMeetingsCount
          });

          // 2. Member Report
          const memStart = parseISO(memberReportRange.start);
          const memEnd = parseISO(memberReportRange.end);
          memEnd.setHours(23, 59, 59, 999);

          let filteredMemberIds = allUsers.filter(u => u.role === 'MEMBER').map(m => m.uid);
          if (selectedMemberId) {
            filteredMemberIds = [selectedMemberId];
          }

          const masterMemberBusinessGenerated = allSlips
            .filter(s => 
              filteredMemberIds.includes(s.fromUserId) && 
              isWithinInterval(new Date(s.createdAt), { start: memStart, end: memEnd })
            )
            .reduce((acc, slip) => acc + (slip.businessValue || 0), 0);

          const masterMemberBusinessReceived = allSlips
            .filter(s => 
              filteredMemberIds.includes(s.toUserId) && 
              isWithinInterval(new Date(s.createdAt), { start: memStart, end: memEnd })
            )
            .reduce((acc, slip) => acc + (slip.businessValue || 0), 0);

          const masterMemberReferralsSent = allReferrals
            .filter(r => 
              filteredMemberIds.includes(r.fromUserId) && 
              isWithinInterval(new Date(r.createdAt), { start: memStart, end: memEnd })
            )
            .length;

          const masterMemberReferralsReceived = allReferrals
            .filter(r => 
              filteredMemberIds.includes(r.toUserId) && 
              isWithinInterval(new Date(r.createdAt), { start: memStart, end: memEnd })
            )
            .length;

          const masterMemberMeetingsAttended = allMeetings
            .filter(m => 
              isWithinInterval(new Date(m.date), { start: memStart, end: memEnd }) &&
              m.attendance &&
              filteredMemberIds.some(uid => m.attendance[uid] === 'PRESENT')
            )
            .length;

          const masterMemberOneToOnes = allOneToOnes
            .filter(m => 
              isWithinInterval(new Date(m.date), { start: memStart, end: memEnd }) &&
              m.participantIds.some(uid => filteredMemberIds.includes(uid))
            )
            .length;

          setMasterMemberStats({
            businessGenerated: masterMemberBusinessGenerated,
            businessReceived: masterMemberBusinessReceived,
            referralsSent: masterMemberReferralsSent,
            referralsReceived: masterMemberReferralsReceived,
            meetingsAttended: masterMemberMeetingsAttended,
            oneToOnes: masterMemberOneToOnes
          });
        }

        let chapterMembers: UserProfile[] = [];
        let chapterMeetings: Meeting[] = [];
        let chapterReferrals: Referral[] = [];
        let chapterSlips: ThankYouSlip[] = [];

        if (effectiveAdminId) {
          // Filtered view
          chapterMembers = allUsers.filter(u => u.associatedChapterAdminId === effectiveAdminId || u.adminId === effectiveAdminId);
          const adminUser = allUsers.find(u => u.uid === effectiveAdminId);
          if (adminUser) chapterMembers.push(adminUser);

          const memberIds = chapterMembers.map(m => m.uid);
          chapterMeetings = allMeetings.filter(m => m.adminId === effectiveAdminId);
          chapterReferrals = allReferrals.filter(ref => memberIds.includes(ref.fromUserId) || memberIds.includes(ref.toUserId));
          chapterSlips = allSlips.filter(slip => memberIds.includes(slip.fromUserId) || memberIds.includes(slip.toUserId));
        } else if (isAdmin) {
          // Combined view for Master Admin
          chapterMembers = allUsers.filter(u => u.role === 'MEMBER' || u.role === 'CHAPTER_ADMIN');
          chapterMeetings = allMeetings;
          chapterReferrals = allReferrals;
          chapterSlips = allSlips;
        }

        const perfStart = parseISO(performanceRange.start);
        const perfEnd = parseISO(performanceRange.end);
        perfEnd.setHours(23, 59, 59, 999);

        // If user is a regular member, show personal stats in "My Performance"
        // If user is Admin/Chapter Admin, show chapter stats
        const isChapterContext = isChapterAdmin || isAdmin;
        
        if (isChapterContext) {
          let targetMemberIds = chapterMembers.filter(m => m.role === 'MEMBER').map(m => m.uid);
          if (isChapterAdmin && selectedChapterMemberId) {
            targetMemberIds = [selectedChapterMemberId];
          }

          const chapterBusinessGenerated = chapterSlips
            .filter(s => 
              targetMemberIds.includes(s.fromUserId) && 
              isWithinInterval(new Date(s.createdAt), { start: perfStart, end: perfEnd })
            )
            .reduce((acc, slip) => acc + (slip.businessValue || 0), 0);
          
          const chapterBusinessReceived = chapterSlips
            .filter(s => 
              targetMemberIds.includes(s.toUserId) &&
              isWithinInterval(new Date(s.createdAt), { start: perfStart, end: perfEnd })
            )
            .reduce((acc, slip) => acc + (slip.businessValue || 0), 0);

          const chapterReferralsSent = chapterReferrals
            .filter(r => 
              targetMemberIds.includes(r.fromUserId) &&
              isWithinInterval(new Date(r.createdAt), { start: perfStart, end: perfEnd })
            )
            .length;

          const chapterReferralsReceived = chapterReferrals
            .filter(r => 
              targetMemberIds.includes(r.toUserId) &&
              isWithinInterval(new Date(r.createdAt), { start: perfStart, end: perfEnd })
            )
            .length;

          const chapterMeetingsCount = chapterMeetings
            .filter(m => isWithinInterval(new Date(m.date), { start: perfStart, end: perfEnd }))
            .length;

          const chapterMeetingsAttended = chapterMeetings
            .filter(m => isWithinInterval(new Date(m.date), { start: perfStart, end: perfEnd }))
            .reduce((acc, m) => {
              const presentCount = Object.entries(m.attendance || {})
                .filter(([uid, status]) => targetMemberIds.includes(uid) && status === 'PRESENT')
                .length;
              return acc + presentCount;
            }, 0);

          const chapterOneToOnes = allOneToOnes
            .filter(m => 
              isWithinInterval(new Date(m.date), { start: perfStart, end: perfEnd }) &&
              m.participantIds.some(uid => targetMemberIds.includes(uid))
            )
            .length;

          const chapterOneToOnesAttended = allOneToOnes
            .filter(m => 
              isWithinInterval(new Date(m.date), { start: perfStart, end: perfEnd }) &&
              m.attendance &&
              Object.entries(m.attendance).some(([uid, status]) => targetMemberIds.includes(uid) && status === 'PRESENT')
            )
            .length;

          setChapterStats({
            businessGenerated: chapterBusinessGenerated,
            businessReceived: chapterBusinessReceived,
            referralsSent: chapterReferralsSent,
            referralsReceived: chapterReferralsReceived,
            totalMembers: chapterMembers.filter(m => m.role === 'MEMBER').length,
            meetingsConducted: chapterMeetingsCount,
            meetingsAttended: chapterMeetingsAttended,
            oneToOnes: chapterOneToOnes,
            oneToOnesAttended: chapterOneToOnesAttended
          });
        } else {
          // Personal performance for members
          const personalSent = allReferrals.filter(ref => 
            ref.fromUserId === profile.uid &&
            isWithinInterval(new Date(ref.createdAt), { start: perfStart, end: perfEnd })
          ).length;
          
          const personalReceived = allReferrals.filter(ref => 
            ref.toUserId === profile.uid &&
            isWithinInterval(new Date(ref.createdAt), { start: perfStart, end: perfEnd })
          ).length;
          
          const personalBusinessGenerated = allSlips
            .filter(slip => 
              slip.toUserId === profile.uid &&
              isWithinInterval(new Date(slip.createdAt), { start: perfStart, end: perfEnd })
            )
            .reduce((acc, slip) => acc + (slip.businessValue || 0), 0);
          
          const personalBusinessReceived = allSlips
            .filter(slip => 
              slip.fromUserId === profile.uid &&
              isWithinInterval(new Date(slip.createdAt), { start: perfStart, end: perfEnd })
            )
            .reduce((acc, slip) => acc + (slip.businessValue || 0), 0);

          const attendedMeetings = allMeetings.filter(m => 
            m.attendance && m.attendance[profile.uid] === 'PRESENT' &&
            isWithinInterval(new Date(m.date), { start: perfStart, end: perfEnd })
          ).length;

          setChapterStats({
            businessGenerated: personalBusinessGenerated,
            businessReceived: personalBusinessReceived,
            referralsSent: personalSent,
            referralsReceived: personalReceived,
            totalMembers: chapterMembers.filter(m => m.role === 'MEMBER').length,
            meetingsConducted: attendedMeetings
          });
        }

        // Member Level Analytics
        const memberAnalytics = chapterMembers
          .filter(m => m.role === 'MEMBER')
          .map(member => {
            const attended = allMeetings.filter(m => m.attendance && m.attendance[member.uid] === 'PRESENT').length;
            const contributed = allSlips
              .filter(slip => slip.fromUserId === member.uid)
              .reduce((acc, slip) => acc + (slip.businessValue || 0), 0);
            
            const received = allSlips
              .filter(slip => slip.toUserId === member.uid)
              .reduce((acc, slip) => acc + (slip.businessValue || 0), 0);

            const referToCount = allSlips.filter(slip => slip.fromUserId === member.uid).length;
            const referByCount = allSlips.filter(slip => slip.toUserId === member.uid).length;
            
            // For attendance rate, we need to know how many meetings this member was supposed to attend
            // If a chapter is selected, use chapter meetings. If not, use all meetings they were marked in.
            const relevantMeetings = effectiveAdminId 
              ? chapterMeetings 
              : allMeetings.filter(m => m.attendance && m.attendance[member.uid]);

            const attendanceRate = relevantMeetings.length > 0 
              ? Math.round((attended / relevantMeetings.length) * 100) 
              : 0;

            return {
              uid: member.uid,
              name: member.name || member.displayName,
              attended,
              contributed,
              received,
              referToCount,
              referByCount,
              attendanceRate
            };
          });
        
        setChapterMemberAnalytics(memberAnalytics.sort((a, b) => b.contributed - a.contributed));

        if (isChapterAdmin) {
          const associatedMemberIds = chapterMembers.filter(m => m.role === 'MEMBER').map(m => m.uid);
          const history = allReferrals.filter(ref => 
            associatedMemberIds.includes(ref.fromUserId) || associatedMemberIds.includes(ref.toUserId)
          ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setChapterReferralsHistory(history);

          const slipsHistory = allSlips.filter(slip => 
            associatedMemberIds.includes(slip.fromUserId) || associatedMemberIds.includes(slip.toUserId)
          ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setChapterSlipsHistory(slipsHistory);
        }

        // Personal Stats (only if not Master Admin, though we'll hide the UI anyway)
        if (!isAdmin) {
          const personalSent = allReferrals.filter(ref => ref.fromUserId === profile.uid).length;
          const personalReceived = allReferrals.filter(ref => ref.toUserId === profile.uid).length;
          
          const personalBusinessGenerated = allSlips
            .filter(slip => slip.toUserId === profile.uid)
            .reduce((acc, slip) => acc + (slip.businessValue || 0), 0);
          
          const personalBusinessReceived = allSlips
            .filter(slip => slip.fromUserId === profile.uid)
            .reduce((acc, slip) => acc + (slip.businessValue || 0), 0);

          const conductedMeetings = allMeetings.filter(m => m.adminId === (isChapterAdmin ? profile.uid : profile.adminId)).length;
          const attendedMeetings = allMeetings.filter(m => m.attendance && m.attendance[profile.uid] === 'PRESENT').length;

          setPersonalStats({
            referralsSent: personalSent,
            referralsReceived: personalReceived,
            businessGenerated: personalBusinessGenerated,
            businessReceived: personalBusinessReceived,
            meetingsConducted: conductedMeetings,
            meetingsAttended: attendedMeetings
          });

          const userMeetingsList = allMeetings
            .filter(m => m.attendance && m.attendance[profile.uid])
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setUserMeetings(userMeetingsList);

          // Find next meeting
          const now = new Date();
          const upcomingMeetings = allMeetings
            .filter(m => {
              const isUpcoming = new Date(m.date) >= now;
              if (!isUpcoming) return false;
              if (effectiveAdminId) return m.adminId === effectiveAdminId;
              return true;
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          setNextMeeting(upcomingMeetings[0] || null);

          const reportStart = parseISO(chapterReportRange.start);
          const reportEnd = parseISO(chapterReportRange.end);
          reportEnd.setHours(23, 59, 59, 999);

          // Chapter Report logic: Chapter-wide for everyone
          const targetMemberIds = chapterMembers.map(m => m.uid);

          const reportTotalRevenue = allSlips
            .filter(s => 
              targetMemberIds.includes(s.fromUserId) && 
              isWithinInterval(new Date(s.createdAt), { start: reportStart, end: reportEnd })
            )
            .reduce((acc, slip) => acc + (slip.businessValue || 0), 0);

          const reportReferralsSent = allReferrals
            .filter(r => 
              targetMemberIds.includes(r.fromUserId) && 
              isWithinInterval(new Date(r.createdAt), { start: reportStart, end: reportEnd })
            )
            .length;

          const reportReferralsReceived = allReferrals
            .filter(r => 
              targetMemberIds.includes(r.toUserId) && 
              isWithinInterval(new Date(r.createdAt), { start: reportStart, end: reportEnd })
            )
            .length;
          
          const reportMeetingsCount = chapterMeetings
            .filter(m => isWithinInterval(new Date(m.date), { start: reportStart, end: reportEnd }))
            .length;
          
          // Total Members in chapter (excluding admins)
          const reportTotalMembers = chapterMembers.filter(m => m.role === 'MEMBER').length;

          setWeeklyStats({
            totalRevenue: reportTotalRevenue,
            referralsSent: reportReferralsSent,
            totalMembers: reportTotalMembers,
            referralsReceived: reportReferralsReceived,
            totalMeetings: reportMeetingsCount
          });
        }
      } catch (error) {
        console.error("Error fetching analytics data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const effectiveAdminId = isAdmin ? selectedAdminId : (isChapterAdmin ? profile.uid : (profile.associatedChapterAdminId || profile.adminId || ''));
    const meetingsQuery = isAdmin && !selectedAdminId
      ? collection(db, 'meetings')
      : effectiveAdminId 
        ? query(collection(db, 'meetings'), where('adminId', '==', effectiveAdminId))
        : null;

    let usersQuery: Query<DocumentData> | CollectionReference<DocumentData> = collection(db, 'users');
    let referralsQuery: Query<DocumentData> | CollectionReference<DocumentData> = collection(db, 'referrals');
    let slipsQuery: Query<DocumentData> | CollectionReference<DocumentData> = collection(db, 'thank_you_slips');
    let oneToOnesQuery: Query<DocumentData> | CollectionReference<DocumentData> = collection(db, 'one_to_one_meetings');

    if (!isAdmin && !isChapterAdmin) {
      usersQuery = query(collection(db, 'users'), where('uid', '==', profile.uid));
      referralsQuery = query(collection(db, 'referrals'), or(where('fromUserId', '==', profile.uid), where('toUserId', '==', profile.uid)));
      slipsQuery = query(collection(db, 'thank_you_slips'), or(where('fromUserId', '==', profile.uid), where('toUserId', '==', profile.uid)));
      oneToOnesQuery = query(collection(db, 'one_to_one_meetings'), where('participantIds', 'array-contains', profile.uid));
    } else if (isChapterAdmin) {
      usersQuery = query(collection(db, 'users'), where('associatedChapterAdminId', '==', profile.uid));
    }

    const unsubReferrals = onSnapshot(referralsQuery, () => fetchData());
    const unsubSlips = onSnapshot(slipsQuery, () => fetchData());
    const unsubMeetings = meetingsQuery ? onSnapshot(meetingsQuery, () => fetchData()) : () => {};
    const unsubUsers = onSnapshot(usersQuery, () => fetchData());
    const unsubOneToOnes = onSnapshot(oneToOnesQuery, () => fetchData());
    return () => { unsubReferrals(); unsubSlips(); unsubMeetings(); unsubUsers(); unsubOneToOnes(); };
  }, [profile, authLoading, selectedAdminId, selectedMemberId, chapterReportRange, memberReportRange, performanceRange, refreshTrigger]);

  const handleAssignPosition = async (userId: string, position: 'President' | 'Vice President' | 'Treasurer') => {
    if (!profile?.uid) return;

    try {
      // 1. Find the user who currently has this position in this chapter
      const chapterUsers = [profile, ...allMembers.filter(m => m.adminId === profile?.uid)];
      const currentHolder = chapterUsers.find(u => u.position === position);

      // 2. If the selected user is already the holder, do nothing
      if (currentHolder?.uid === userId) return;

      // 3. Clear the position from the current holder
      if (currentHolder) {
        await updateDoc(doc(db, 'users', currentHolder.uid), {
          position: null
        });
      }

      // 4. Assign the position to the new user
      if (userId) {
        await updateDoc(doc(db, 'users', userId), {
          position: position
        });
      }

      // 5. Trigger refresh
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error assigning position:', error);
    }
  };

  const getPositionText = (userId: string) => {
    const position = getPositionForUser(userId);
    if (!position) return null;
    return (
      <span className="text-[10px] font-bold text-primary uppercase tracking-tight bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">
        {position}
      </span>
    );
  };

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center space-y-4">
        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center">
          <Users size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">Profile Not Found</h2>
          <p className="text-sm text-slate-500 max-w-xs">
            We couldn't find your profile in our database. Please try logging out and logging in again, or contact support if the issue persists.
          </p>
        </div>
        <button 
          onClick={() => {
            localStorage.removeItem('user');
            navigate('/login');
          }}
          className="px-6 py-2 bg-navy text-white rounded-lg font-bold text-sm hover:bg-secondary transition-colors"
        >
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-24 px-4">
      {/* Top Profile / Summary Section */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-[14px] card-shadow border border-border">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-primary/10">
          {profile.photoURL ? (
            <img src={profile.photoURL} alt={profile.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="text-xl font-bold text-primary">
              {profile.name?.charAt(0) || profile.displayName?.charAt(0)}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-primary truncate tracking-tight">
            {profile.name || profile.displayName}
          </h2>
          <p className="text-xs text-text-secondary font-medium">
            {isAdmin ? 'Master Admin' : isChapterAdmin ? 'Chapter Admin' : (allUsersData.find(u => u.uid === profile.adminId)?.name || 'Member')}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
              profile.membershipStatus === 'ACTIVE' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
            )}>
              {profile.membershipStatus}
            </span>
            {profile.subscriptionEnd && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary font-medium">
                  Due: {new Date(profile.subscriptionEnd).toLocaleDateString('en-IN')}
                </span>
                {profile.role === 'MEMBER' && (
                  <button
                    disabled={isUpgrading || differenceInDays(new Date(profile.subscriptionEnd), new Date()) > 7}
                    onClick={handleUpgradeSubscription}
                    className="text-[9px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider bg-primary text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                  >
                    {isUpgrading ? 'Upgrading...' : 'Upgrade Subscription'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <button 
          onClick={() => navigate('/profile')}
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowUpRight size={20} className="text-primary" />
        </button>
      </div>

      {/* Notifications Section */}
      {notifications.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Info size={14} className="text-primary" />
              <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Recent Notifications</h3>
            </div>
            <button 
              onClick={() => navigate('/notifications')}
              className="text-[9px] font-bold text-primary uppercase tracking-widest hover:underline"
            >
              View All
            </button>
          </div>
          <div className="space-y-2">
            {notifications.map((notif) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white p-3 rounded-xl border border-border card-shadow flex gap-3 items-start"
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                  notif.type === 'UPGRADE' ? "bg-emerald-50 text-emerald-600" :
                  notif.type === 'SUBSCRIPTION' ? "bg-rose-50 text-rose-600" :
                  "bg-primary/5 text-primary"
                )}>
                  {notif.type === 'UPGRADE' ? <Award size={16} /> :
                   notif.type === 'SUBSCRIPTION' ? <AlertTriangle size={16} /> :
                   <Info size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-900 leading-relaxed">{notif.message}</p>
                  <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
                    {format(new Date(notif.createdAt), 'dd MMM yyyy • HH:mm')}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {isAdmin ? (
        <div className="space-y-8 pt-4">
          {/* Chapter Report Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 px-1">
              <div className="w-1.5 h-6 bg-emerald-600 rounded-full" />
              <h2 className="text-lg font-bold text-slate-900 uppercase tracking-widest">Chapter Report</h2>
            </div>

            <div className="bg-white rounded-[14px] card-shadow border border-slate-200 p-5 space-y-6">
              {/* Filters */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">Chapter Admin</label>
                  <select 
                    value={selectedAdminId}
                    onChange={(e) => setSelectedAdminId(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-2 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white appearance-none cursor-pointer"
                  >
                    <option value="">All Chapters (Combined)</option>
                    {adminAdmins.map(admin => (
                      <option key={admin.uid} value={admin.uid}>{admin.name} ({admin.businessName || 'No Chapter Name'})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">Start Date</label>
                    <input 
                      type="date" 
                      value={chapterReportRange.start}
                      onChange={(e) => setChapterReportRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full text-xs border border-slate-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">End Date</label>
                    <input 
                      type="date" 
                      value={chapterReportRange.end}
                      onChange={(e) => setChapterReportRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full text-xs border border-slate-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Business Generated', value: `₹${masterChapterStats.businessGenerated.toLocaleString()}` },
                  { label: 'Business Received', value: `₹${masterChapterStats.businessReceived.toLocaleString()}` },
                  { label: 'Referrals Sent', value: masterChapterStats.referralsSent },
                  { label: 'Referrals Received', value: masterChapterStats.referralsReceived },
                  { label: 'Total Members', value: masterChapterStats.totalMembers },
                  { label: 'Meetings Conducted', value: masterChapterStats.meetingsConducted }
                ].map((stat, i) => (
                  <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                    <p className="text-xl font-bold text-slate-900 tracking-tight">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Member Report Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 px-1">
              <div className="w-1.5 h-6 bg-emerald-600 rounded-full" />
              <h2 className="text-lg font-bold text-slate-900 uppercase tracking-widest">Member Report</h2>
            </div>

            <div className="bg-white rounded-[14px] card-shadow border border-slate-200 p-5 space-y-6">
              {/* Filters */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">Select Member</label>
                  <select 
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-2 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white appearance-none cursor-pointer"
                  >
                    <option value="">All Members (Combined)</option>
                    {allMembers.sort((a, b) => a.name.localeCompare(b.name)).map(member => (
                      <option key={member.uid} value={member.uid}>{member.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">Start Date</label>
                    <input 
                      type="date" 
                      value={memberReportRange.start}
                      onChange={(e) => setMemberReportRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full text-xs border border-slate-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">End Date</label>
                    <input 
                      type="date" 
                      value={memberReportRange.end}
                      onChange={(e) => setMemberReportRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full text-xs border border-slate-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Business Generated', value: `₹${masterMemberStats.businessGenerated.toLocaleString()}` },
                  { label: 'Business Received', value: `₹${masterMemberStats.businessReceived.toLocaleString()}` },
                  { label: 'Referrals Sent', value: masterMemberStats.referralsSent },
                  { label: 'Referrals Received', value: masterMemberStats.referralsReceived },
                  { label: 'Meetings Attended', value: masterMemberStats.meetingsAttended },
                  { label: 'One-to-One Meetings', value: masterMemberStats.oneToOnes, path: '/one-to-one' }
                ].map((stat, i) => (
                  <div 
                    key={i} 
                    onClick={() => stat.path && navigate(stat.path)}
                    className={cn(
                      "bg-slate-50 p-4 rounded-xl border border-slate-100",
                      stat.path && "cursor-pointer hover:border-primary transition-colors group"
                    )}
                  >
                    <p className={cn(
                      "text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1",
                      stat.path && "group-hover:text-primary transition-colors"
                    )}>{stat.label}</p>
                    <p className="text-xl font-bold text-slate-900 tracking-tight">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      ) : (
        <>
          {/* Next Meeting Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-white rounded-[14px] card-shadow border border-border overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-1.5 h-12 bg-primary rounded-br-lg" />
        <div className="p-5">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">Next Meeting</p>
          
          {nextMeeting ? (
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-primary tracking-tight">
                {new Date(nextMeeting.date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </h3>
              
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
                <div className="text-center">
                  <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">TYFCB</p>
                  <p className="text-sm font-bold text-primary">₹0</p>
                </div>
                <div className="text-center border-x border-border">
                  <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">Speakers</p>
                  <p className="text-sm font-bold text-primary">2</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">Visitors</p>
                  <p className="text-sm font-bold text-primary">
                    {Object.values(nextMeeting.attendance || {}).filter(s => s === 'VISITOR').length}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm font-medium text-text-secondary py-2 italic">No upcoming meetings scheduled.</p>
          )}
        </div>
      </motion.div>

      {/* Weekly Summary Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-[14px] card-shadow border border-border overflow-hidden"
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Chapter Report</p>
          </div>

          {/* Chapter Report Filters */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">Start Date</label>
              <input 
                type="date" 
                value={chapterReportRange.start}
                onChange={(e) => setChapterReportRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full text-xs border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">End Date</label>
              <input 
                type="date" 
                value={chapterReportRange.end}
                onChange={(e) => setChapterReportRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full text-xs border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="space-y-4">
            {(isChapterAdmin ? [
              { icon: IndianRupee, label: 'Total Business Generated', value: `₹${weeklyStats.totalRevenue.toLocaleString()}` },
              { icon: Calendar, label: 'Total Meetings', value: `${weeklyStats.totalMeetings}` },
              { icon: Users, label: 'Total Members', value: `${weeklyStats.totalMembers}` }
            ] : [
              { icon: IndianRupee, label: 'Total Revenue', value: `₹${weeklyStats.totalRevenue.toLocaleString()}` },
              { icon: Share2, label: 'Referrals Sent', value: `+${weeklyStats.referralsSent}` },
              { icon: Users, label: 'Total Members', value: `${weeklyStats.totalMembers}` },
              { icon: ArrowDownLeft, label: 'Referrals Received', value: `+${weeklyStats.referralsReceived}` }
            ]).map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-text-secondary">
                    <item.icon size={18} />
                  </div>
                  <span className="text-sm font-medium text-text-primary">{item.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-lg font-bold text-primary">{item.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Performance Section */}
      <div className="pt-8 space-y-12">
        <section className="space-y-6">
          <div className="flex flex-col gap-4 px-1">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-primary rounded-full" />
              <h2 className="text-lg font-bold text-text-primary uppercase tracking-widest">
                {isChapterAdmin ? 'My Member Performance' : 'My Performance'}
              </h2>
            </div>

            {/* Performance Date Filters */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">From</label>
                <input 
                  type="date" 
                  value={performanceRange.start}
                  onChange={(e) => setPerformanceRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full text-xs border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">To</label>
                <input 
                  type="date" 
                  value={performanceRange.end}
                  onChange={(e) => setPerformanceRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full text-xs border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Member Filter for Chapter Admin */}
            {isChapterAdmin && (
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">Select Member</label>
                <select 
                  value={selectedChapterMemberId}
                  onChange={(e) => setSelectedChapterMemberId(e.target.value)}
                  className="w-full text-xs border border-border rounded-lg px-2 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary/20 bg-white appearance-none cursor-pointer"
                >
                  <option value="">All Associated Members (Combined)</option>
                  {allMembers
                    .filter(m => m.adminId === profile.uid)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(member => (
                      <option key={member.uid} value={member.uid}>{member.name}</option>
                    ))
                  }
                </select>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-border card-shadow">
              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1">Total Business Generated</p>
              <p className="text-xl font-bold text-primary tracking-tight">₹{chapterStats.businessGenerated.toLocaleString()}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-border card-shadow">
              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1">Total Referrals</p>
              <p className="text-xl font-bold text-primary tracking-tight">{chapterStats.referralsSent}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-border card-shadow">
              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1">Total Referrals Received</p>
              <p className="text-xl font-bold text-primary tracking-tight">{chapterStats.referralsReceived}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-border card-shadow">
              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1">Total Meetings</p>
              <p className="text-xl font-bold text-primary tracking-tight">{chapterStats.meetingsConducted}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-border card-shadow">
              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1">Total Meetings Attended</p>
              <p className="text-xl font-bold text-primary tracking-tight">{chapterStats.meetingsAttended}</p>
            </div>
            <div 
              onClick={() => navigate('/one-to-one')}
              className="bg-white p-4 rounded-2xl border border-border card-shadow cursor-pointer hover:border-primary transition-colors group"
            >
              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1 group-hover:text-primary transition-colors">Total One-to-One Meetings</p>
              <p className="text-xl font-bold text-primary tracking-tight">{chapterStats.oneToOnes}</p>
            </div>
            <div 
              onClick={() => navigate('/one-to-one')}
              className="bg-white p-4 rounded-2xl border border-border card-shadow cursor-pointer hover:border-primary transition-colors group"
            >
              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1 group-hover:text-primary transition-colors">Total One-to-One Meetings Attended</p>
              <p className="text-xl font-bold text-primary tracking-tight">{chapterStats.oneToOnesAttended}</p>
            </div>
            {!isChapterAdmin && (
              <div className="bg-white p-4 rounded-2xl border border-border card-shadow">
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1">Total Members</p>
                <p className="text-xl font-bold text-primary tracking-tight">{chapterStats.totalMembers}</p>
              </div>
            )}
          </div>
        </section>

        {/* Member Analytics Table */}
        {(isAdmin || isChapterAdmin) && (
          <div className="hidden md:block">
            <section className="space-y-6">
              <div className="flex items-center gap-3 px-1">
                <div className="w-1.5 h-6 bg-primary rounded-full" />
                <h2 className="text-lg font-bold text-text-primary uppercase tracking-widest">Member Performance</h2>
              </div>
              <div className="bg-white rounded-2xl border border-border card-shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted border-b border-border">
                        <th className="px-6 py-4 text-[9px] font-bold text-slate-600 uppercase tracking-widest">Member</th>
                        <th className="px-6 py-4 text-[9px] font-bold text-slate-600 uppercase tracking-widest text-center">Revenue</th>
                        <th className="px-6 py-4 text-[9px] font-bold text-slate-600 uppercase tracking-widest text-right">Attendance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {chapterMemberAnalytics.slice(0, 5).map((member) => (
                        <tr key={member.uid} className="hover:bg-muted transition-colors">
                          <td className="px-6 py-4">
                            <p className="text-xs font-bold text-text-primary">{member.name}</p>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <p className="text-xs font-bold text-primary tracking-tight">₹{member.contributed.toLocaleString()}</p>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-xs font-bold text-text-primary">{member.attendanceRate}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Position Assignment Section for Chapter Admin */}
        {isChapterAdmin && (
          <section className="space-y-6 pt-8">
            <div className="flex items-center gap-3 px-1">
              <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
              <h2 className="text-lg font-bold text-text-primary uppercase tracking-widest">Position Assignment</h2>
            </div>
            <div className="bg-white rounded-2xl border border-border card-shadow p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* President */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    President
                  </label>
                  <select
                    value={allUsersData.find(m => (m.associatedChapterAdminId === profile?.uid || m.adminId === profile?.uid || m.uid === profile?.uid) && m.position === 'President')?.uid || ''}
                    onChange={(e) => handleAssignPosition(e.target.value, 'President')}
                    className="w-full h-11 px-4 rounded-xl bg-muted border border-transparent focus:bg-white focus:border-primary outline-none transition-all text-sm font-bold"
                  >
                    <option value="">Select President</option>
                    {[profile, ...allMembers.filter(m => m.associatedChapterAdminId === profile?.uid || m.adminId === profile?.uid)].map(m => (
                      <option key={m.uid} value={m.uid}>{m.name || m.displayName}</option>
                    ))}
                  </select>
                </div>
                {/* Vice President */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    Vice President
                  </label>
                  <select
                    value={allUsersData.find(m => (m.associatedChapterAdminId === profile?.uid || m.adminId === profile?.uid || m.uid === profile?.uid) && m.position === 'Vice President')?.uid || ''}
                    onChange={(e) => handleAssignPosition(e.target.value, 'Vice President')}
                    className="w-full h-11 px-4 rounded-xl bg-muted border border-transparent focus:bg-white focus:border-primary outline-none transition-all text-sm font-bold"
                  >
                    <option value="">Select Vice President</option>
                    {[profile, ...allMembers.filter(m => m.associatedChapterAdminId === profile?.uid || m.adminId === profile?.uid)].map(m => (
                      <option key={m.uid} value={m.uid}>{m.name || m.displayName}</option>
                    ))}
                  </select>
                </div>
                {/* Treasurer */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    Treasurer
                  </label>
                  <select
                    value={allUsersData.find(m => (m.associatedChapterAdminId === profile?.uid || m.adminId === profile?.uid || m.uid === profile?.uid) && m.position === 'Treasurer')?.uid || ''}
                    onChange={(e) => handleAssignPosition(e.target.value, 'Treasurer')}
                    className="w-full h-11 px-4 rounded-xl bg-muted border border-transparent focus:bg-white focus:border-primary outline-none transition-all text-sm font-bold"
                  >
                    <option value="">Select Treasurer</option>
                    {[profile, ...allMembers.filter(m => m.associatedChapterAdminId === profile?.uid || m.adminId === profile?.uid)].map(m => (
                      <option key={m.uid} value={m.uid}>{m.name || m.displayName}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Chapter Members List for Chapter Admin */}
        {isChapterAdmin && (
          <section className="space-y-6 pt-8">
            <div className="flex items-center gap-3 px-1">
              <div className="w-1.5 h-6 bg-primary rounded-full" />
              <h2 className="text-lg font-bold text-text-primary uppercase tracking-widest">Chapter Members</h2>
            </div>
            <div className="bg-white rounded-2xl border border-border card-shadow overflow-hidden">
              <div className="divide-y divide-border">
                {[profile, ...allMembers.filter(m => m.associatedChapterAdminId === profile?.uid || m.adminId === profile?.uid)]
                  .filter(Boolean)
                  .sort((a, b) => (a?.name || a?.displayName || '').localeCompare(b?.name || b?.displayName || ''))
                  .map((member) => {
                    if (!member) return null;
                    const isSelf = member.uid === profile?.uid;
                    const chapterName = isSelf ? member.businessName : profile?.businessName;
                    const subtext = isSelf 
                      ? `Chapter Admin • ${chapterName || 'SSK'}`
                      : `${member.category || 'Member'} • ${chapterName || 'SSK'}`;

                    return (
                      <div 
                        key={member.uid}
                        onClick={() => navigate(`/profile?id=${member.uid}`)}
                        className="flex items-center gap-4 p-4 hover:bg-muted transition-colors cursor-pointer group"
                      >
                        <div className="w-12 h-12 rounded-full bg-muted border border-border overflow-hidden shrink-0 shadow-sm">
                          <img 
                            src={member.photoURL || `https://picsum.photos/seed/${member.uid}/200/200`} 
                            alt={member.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-text-primary truncate">{member.name || member.displayName}</h3>
                            {getPositionText(member.uid)}
                          </div>
                          <p className="text-[10px] font-medium text-text-secondary truncate uppercase tracking-wider mt-0.5">
                            {subtext}
                          </p>
                        </div>
                        <ChevronRight size={18} className="text-text-secondary group-hover:text-primary transition-colors" />
                      </div>
                    );
                  })
                }
              </div>
            </div>
          </section>
        )}

        {/* New Guest Registration Section for Chapter Admin */}
        {isChapterAdmin && (
          <section className="space-y-6 pt-8">
            <div className="flex items-center gap-3 px-1">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
              <h2 className="text-lg font-bold text-text-primary uppercase tracking-widest">New Guest Registration</h2>
            </div>
            <div className="bg-white rounded-2xl border border-border card-shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted border-b border-border">
                      <th className="px-6 py-4 text-[9px] font-bold text-slate-600 uppercase tracking-widest">Guest Name</th>
                      <th className="px-6 py-4 text-[9px] font-bold text-slate-600 uppercase tracking-widest">Phone Number</th>
                      <th className="px-6 py-4 text-[9px] font-bold text-slate-600 uppercase tracking-widest">Business Name</th>
                      <th className="px-6 py-4 text-[9px] font-bold text-slate-600 uppercase tracking-widest">Category</th>
                      <th className="px-6 py-4 text-[9px] font-bold text-slate-600 uppercase tracking-widest">City</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {guestRegistrations.length > 0 ? (
                      guestRegistrations.map((reg) => (
                        <tr key={reg.id} className="hover:bg-muted transition-colors">
                          <td className="px-6 py-4">
                            <p className="text-xs font-bold text-text-primary">{reg.fullName}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs font-medium text-text-secondary">{reg.phone}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs font-medium text-text-secondary">{reg.businessName}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs font-medium text-text-secondary">{reg.businessCategory}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs font-medium text-text-secondary">{reg.city}</p>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic text-xs">
                          No new guest registrations found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Chapter Referral History Table */}
        {isChapterAdmin && (
          <>
            <section className="space-y-6 pt-8">
            <div className="flex items-center gap-3 px-1">
              <div className="w-1.5 h-6 bg-primary rounded-full" />
              <h2 className="text-lg font-bold text-text-primary uppercase tracking-widest">Chapter Referral History</h2>
            </div>
            <div className="bg-white rounded-2xl border border-border card-shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted border-b border-border">
                      <th className="px-4 py-4 text-[9px] font-bold text-slate-600 uppercase tracking-widest">Referral ID</th>
                      <th className="px-4 py-4 text-[9px] font-bold text-slate-600 uppercase tracking-widest">Sent By</th>
                      <th className="px-4 py-4 text-[9px] font-bold text-slate-600 uppercase tracking-widest">Received By</th>
                      <th className="px-4 py-4 text-[9px] font-bold text-slate-600 uppercase tracking-widest">Date</th>
                      <th className="px-4 py-4 text-[9px] font-bold text-slate-600 uppercase tracking-widest">Status</th>
                      <th className="px-4 py-4 text-[9px] font-bold text-slate-600 uppercase tracking-widest text-right">Amount Generated</th>
                      <th className="px-4 py-4 text-[9px] font-bold text-slate-600 uppercase tracking-widest">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {chapterReferralsHistory.length > 0 ? (
                      chapterReferralsHistory.map((ref) => {
                        const fromUser = allUsersData.find(u => u.uid === ref.fromUserId);
                        const toUser = allUsersData.find(u => u.uid === ref.toUserId);
                        const slip = allSlipsData.find(s => s.referralId === ref.id);
                        const amount = slip?.businessValue || 0;
                        
                        // Map status to requested labels
                        let displayStatus = ref.status;
                        if (ref.status === 'NOT_CONVERTED' || ref.status === 'CLOSED') displayStatus = 'LOST';
                        if (ref.status === 'COMPLETED') displayStatus = 'CONVERTED';

                        return (
                          <tr key={ref.id} className="hover:bg-muted transition-colors">
                            <td className="px-4 py-4">
                              <p className="text-[10px] font-mono text-slate-500">#{ref.id.slice(-6).toUpperCase()}</p>
                            </td>
                            <td className="px-4 py-4">
                              <p className="text-xs font-bold text-text-primary truncate max-w-[80px]">{fromUser?.name || 'Unknown'}</p>
                            </td>
                            <td className="px-4 py-4">
                              <p className="text-xs font-bold text-text-primary truncate max-w-[80px]">{toUser?.name || 'Unknown'}</p>
                            </td>
                            <td className="px-4 py-4">
                              <p className="text-[10px] font-medium text-slate-500">
                                {new Date(ref.createdAt).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short'
                                })}
                              </p>
                            </td>
                            <td className="px-4 py-4">
                              <span className={cn(
                                "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                                displayStatus === 'CONVERTED' ? "bg-emerald-100 text-emerald-600" :
                                displayStatus === 'LOST' ? "bg-rose-100 text-rose-600" :
                                "bg-amber-100 text-amber-600"
                              )}>
                                {displayStatus}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <p className="text-xs font-bold text-primary">
                                {amount > 0 ? `₹${amount.toLocaleString()}` : '-'}
                              </p>
                            </td>
                            <td className="px-4 py-4">
                              <p className="text-[10px] text-slate-500 font-medium italic max-w-[100px] truncate" title={ref.notes}>
                                {ref.notes || '-'}
                              </p>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-xs text-slate-500 italic">
                          No referral history found for this chapter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {chapterReferralsHistory.length > 0 && (
                <div className="p-4 bg-slate-50 border-t border-border">
                  <p className="text-[10px] text-slate-500 font-medium italic">
                    * Showing all referrals involving members of your chapter.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Chapter Thank You Slips History Table */}
          <section className="space-y-6 pt-8">
            <div className="flex items-center gap-3 px-1">
              <div className="w-1.5 h-6 bg-secondary rounded-full" />
              <h2 className="text-lg font-bold text-text-primary uppercase tracking-widest">Chapter Thank You Slips History</h2>
            </div>
            <div className="bg-white rounded-2xl border border-border card-shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted border-b border-border">
                      <th className="px-4 py-4 text-[9px] font-bold text-slate-600 uppercase tracking-widest">Slip ID</th>
                      <th className="px-4 py-4 text-[9px] font-bold text-slate-600 uppercase tracking-widest">Generated By</th>
                      <th className="px-4 py-4 text-[9px] font-bold text-slate-600 uppercase tracking-widest">Received From</th>
                      <th className="px-4 py-4 text-[9px] font-bold text-slate-600 uppercase tracking-widest">Date</th>
                      <th className="px-4 py-4 text-[9px] font-bold text-slate-600 uppercase tracking-widest text-right">Amount</th>
                      <th className="px-4 py-4 text-[9px] font-bold text-slate-600 uppercase tracking-widest">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {chapterSlipsHistory.length > 0 ? (
                      chapterSlipsHistory.map((slip) => {
                        const fromUser = allUsersData.find(u => u.uid === slip.fromUserId);
                        const toUser = allUsersData.find(u => u.uid === slip.toUserId);

                        return (
                          <tr key={slip.id} className="hover:bg-muted transition-colors">
                            <td className="px-4 py-4">
                              <p className="text-[10px] font-mono text-slate-500">#{slip.id.slice(-6).toUpperCase()}</p>
                            </td>
                            <td className="px-4 py-4">
                              <p className="text-xs font-bold text-text-primary truncate max-w-[80px]">{fromUser?.name || 'Unknown'}</p>
                            </td>
                            <td className="px-4 py-4">
                              <p className="text-xs font-bold text-text-primary truncate max-w-[80px]">{toUser?.name || 'Unknown'}</p>
                            </td>
                            <td className="px-4 py-4">
                              <p className="text-[10px] font-medium text-slate-500">
                                {new Date(slip.createdAt).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short'
                                })}
                              </p>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <p className="text-xs font-black text-emerald-600">
                                ₹{slip.businessValue.toLocaleString()}
                              </p>
                            </td>
                            <td className="px-4 py-4">
                              <p className="text-[10px] text-slate-500 font-medium italic max-w-[100px] truncate" title={slip.notes}>
                                {slip.notes || '-'}
                              </p>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-xs text-slate-500 italic">
                          No thank you slips found for this chapter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {chapterSlipsHistory.length > 0 && (
                <div className="p-4 bg-slate-50 border-t border-border">
                  <p className="text-[10px] text-slate-500 font-medium italic">
                    * Showing all business activity generated within your chapter.
                  </p>
                </div>
              )}
            </div>
          </section>
          </>
        )}
      </div>
    </>
  )}

      {/* Modals */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Meeting Attendance History"
      >
        <div className="space-y-8">
          <div className="bg-white/5 rounded-[2rem] p-8 border border-white/5 flex items-center gap-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform duration-700 group-hover:scale-150" />
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-primary shadow-lg shrink-0 relative z-10">
              <Calendar size={32} strokeWidth={2.5} />
            </div>
            <div className="relative z-10">
              <h4 className="text-sm font-black text-white uppercase tracking-widest mb-1">Attendance Log</h4>
              <p className="text-xs text-muted-foreground font-bold leading-relaxed">
                Your personal meeting attendance history, including status, amounts given, and administrative notes.
              </p>
            </div>
          </div>

          <div className="bg-[#111111] rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-white/5 border-b border-white/5">
                    <th className="py-6 px-8 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Date</th>
                    <th className="py-6 px-8 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Meeting Name</th>
                    <th className="py-6 px-8 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Status</th>
                    <th className="py-6 px-8 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Amount</th>
                    <th className="py-6 px-8 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {userMeetings.length > 0 ? (
                    userMeetings.map((meeting) => (
                      <tr key={meeting.id} className="hover:bg-white/5 transition-all duration-300 group">
                        <td className="py-6 px-8">
                          <p className="text-sm font-black text-white uppercase tracking-tighter">
                            {new Date(meeting.date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-0.5">{meeting.time || 'N/A'}</p>
                        </td>
                        <td className="py-6 px-8">
                          <p className="text-xs font-black text-muted-foreground uppercase tracking-tight">
                            {meeting.location || meeting.notes || 'General Meeting'}
                          </p>
                        </td>
                        <td className="py-6 px-8">
                          <span className={cn(
                            "inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border shadow-sm",
                            meeting.attendance[profile.uid] === 'PRESENT' 
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                              : meeting.attendance[profile.uid] === 'ABSENT'
                              ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                              : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          )}>
                            {meeting.attendance[profile.uid]}
                          </span>
                        </td>
                        <td className="py-6 px-8">
                          <p className="text-sm font-black text-primary tracking-tight">
                            ₹{(meeting.amountCollected?.[profile.uid] || 0).toLocaleString()}
                          </p>
                        </td>
                        <td className="py-6 px-8">
                          <p className="text-[10px] text-muted-foreground font-bold italic max-w-[200px] truncate group-hover:text-white transition-colors" title={meeting.memberNotes?.[profile.uid]}>
                            {meeting.memberNotes?.[profile.uid] || '-'}
                          </p>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-24 text-center">
                        <div className="flex flex-col items-center gap-6">
                          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-white/10">
                            <Calendar size={40} />
                          </div>
                          <p className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em]">No meeting history found</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={historyModal.isOpen}
        onClose={() => setHistoryModal(prev => ({ ...prev, isOpen: false }))}
        title={`${historyModal.type === 'sent' ? 'Business Generated' : 'Business Received'} History - ${historyModal.memberName}`}
      >
        <div className="space-y-8">
          <div className="bg-white/5 rounded-[2rem] p-8 border border-white/5 flex items-center gap-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform duration-700 group-hover:scale-150" />
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-primary shadow-lg shrink-0 relative z-10">
              <Info size={32} strokeWidth={2.5} />
            </div>
            <div className="relative z-10">
              <h4 className="text-sm font-black text-white uppercase tracking-widest mb-1">Audit Trail</h4>
              <p className="text-xs text-muted-foreground font-bold leading-relaxed">
                Detailed history of Thank You Slips {historyModal.type === 'sent' ? 'sent by' : 'received by'} this member within the network.
              </p>
            </div>
          </div>

          <div className="bg-[#111111] rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-white/5 border-b border-white/5">
                    <th className="py-6 px-8 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Date</th>
                    <th className="py-6 px-8 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">From Member</th>
                    <th className="py-6 px-8 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">To Member</th>
                    <th className="py-6 px-8 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Amount</th>
                    <th className="py-6 px-8 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {historyModal.slips.length > 0 ? (
                    historyModal.slips.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((slip) => {
                      const fromUser = allUsersData.find(u => u.uid === slip.fromUserId);
                      const toUser = allUsersData.find(u => u.uid === slip.toUserId);
                      return (
                        <tr key={slip.id} className="hover:bg-white/5 transition-all duration-300 group">
                          <td className="py-6 px-8">
                            <p className="text-sm font-black text-white uppercase tracking-tighter">
                              {new Date(slip.createdAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                          </td>
                          <td className="py-6 px-8">
                            <p className="text-xs font-black text-muted-foreground uppercase tracking-tight">{fromUser?.name || 'Unknown'}</p>
                          </td>
                          <td className="py-6 px-8">
                            <p className="text-xs font-black text-muted-foreground uppercase tracking-tight">{toUser?.name || 'Unknown'}</p>
                          </td>
                          <td className="py-6 px-8">
                            <p className="text-sm font-black text-primary tracking-tight">₹{slip.businessValue.toLocaleString()}</p>
                          </td>
                          <td className="py-6 px-8">
                            <p className="text-[10px] text-muted-foreground font-bold italic max-w-[200px] truncate group-hover:text-white transition-colors" title={slip.notes}>
                              {slip.notes || '-'}
                            </p>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-24 text-center">
                        <div className="flex flex-col items-center gap-6">
                          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-white/10">
                            <FileText size={40} />
                          </div>
                          <p className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em]">No Data Available</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
