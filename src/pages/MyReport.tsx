import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Activity, Trophy, Users, UserCheck, Building2, Filter, FileText, Download, FileSpreadsheet, FileIcon, MessageCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import StatGrid from '../components/StatGrid';
import { calculateChapterGrowthScoreData, isDateInRange } from '../utils/growthScore';
import { cn } from '../lib/utils';
import { isMemberActive } from '../utils/memberStatus';
import { Modal } from '../components/Modal';
import { deduplicateSlips } from '../utils/deduplicateSlips';
declare var jsPDF: any;
declare var autoTable: any;
declare var XLSX: any;
declare var Document: any;
declare var Packer: any;
declare var Paragraph: any;
declare var TextRun: any;
declare var HeadingLevel: any;
declare var Table: any;
declare var TableRow: any;
declare var TableCell: any;
declare var WidthType: any;
declare var BorderStyle: any;

export function MyReport() {
  const { profile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [allUsersList, setAllUsersList] = useState<any[]>([]);
  const [allReferrals, setAllReferrals] = useState<any[]>([]);
  const [allSlips, setAllSlips] = useState<any[]>([]);
  const [oneToOnes, setOneToOnes] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [guestInvitations, setGuestInvitations] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);

  // Filter state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [activeDateRange, setActiveDateRange] = useState<{ start: Date; end: Date } | null>(null);

  // Report generation state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportStartDate, setReportStartDate] = useState<string>('');
  const [reportEndDate, setReportEndDate] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<any>(null);



  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const [usersRes, refsRes, slipsRes, o2oRes, meetRes, guestsRes, testRes] = await Promise.all([
          supabase.from('users').select('*'),
          supabase.from('referrals').select('*'),
          supabase.from('thank_you_slips').select('*'),
          supabase.from('one_to_one_meetings').select('*'),
          supabase.from('meetings').select('*'),
          supabase.from('guest_invitations').select('*'),
          supabase.from('testimonials').select('*')
        ]);

        if (isMounted) {
          setAllUsersList(usersRes.data || []);
          setAllReferrals(refsRes.data || []);
          const mappedSlips = (slipsRes.data || []).map((s: any) => {
            const from = String(s.from_user_id || s.fromUserId || s.submitted_by || '');
            const to = String(s.to_user_id || s.toUserId || (s.receiver_id && String(s.receiver_id) !== from ? s.receiver_id : (s.sender_id && String(s.sender_id) !== from ? s.sender_id : '')) || '');
            return {
              ...s,
              id: String(s.id),
              fromUserId: from,
              toUserId: to,
              businessValue: Number(s.business_value || s.businessValue || s.amount || 0)
            };
          });
          setAllSlips(deduplicateSlips(mappedSlips));
          setOneToOnes(o2oRes.data || []);
          setMeetings(meetRes.data || []);
          setGuestInvitations(guestsRes.data || []);
          setTestimonials(testRes.data || []);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, []);

  const handleApplyFilter = () => {
    if (filterStartDate && filterEndDate) {
      setActiveDateRange({
        start: new Date(filterStartDate),
        end: new Date(filterEndDate),
      });
    }
    setIsFilterModalOpen(false);
  };

  const handleClearFilter = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setActiveDateRange(null);
    setIsFilterModalOpen(false);
  };

  // Chapter Logic
  const userChapterId = profile?.chapter_id || profile?.chapterId || profile?.adminId;
  const rawChapterName = profile?.chapterName || profile?.chapter_name || 'My Chapter';

  const formattedChapterTitle = useMemo(() => {
    if (!rawChapterName) return 'CHAPTER REPORT';
    const cleanName = rawChapterName.trim();
    if (cleanName.toLowerCase() === 'my chapter') {
      return 'CHAPTER REPORT';
    }
    const upper = cleanName.toUpperCase();
    if (upper.endsWith('CHAPTER')) {
      return `${upper} REPORT`;
    }
    return `${upper} CHAPTER REPORT`;
  }, [rawChapterName]);

  const formattedChapterCardName = useMemo(() => {
    if (!rawChapterName) return 'MY CHAPTER';
    const cleanName = rawChapterName.trim();
    const upper = cleanName.toUpperCase();
    if (upper.endsWith('CHAPTER')) {
      return upper;
    }
    return `${upper} CHAPTER`;
  }, [rawChapterName]);

  const chapterUsers = useMemo(() => {
    return allUsersList.filter(u => {
      const isMaster = u.role === 'MASTER_ADMIN' || u.position === 'master_admin';
      if (isMaster) return false;
      return String(u.chapter_id || u.chapterId || u.adminId) === String(userChapterId);
    });
  }, [allUsersList, userChapterId]);

  const chapterGrowthScoreData = useMemo(() => {
    return calculateChapterGrowthScoreData({
      chapterMembers: chapterUsers,
      activeDateRange,
      allReferrals,
      oneToOnes,
      meetings,
      guestInvitations,
      currentProfile: profile,
      todayTasks: []
    });
  }, [chapterUsers, allReferrals, oneToOnes, meetings, guestInvitations, profile, activeDateRange]);

  const totalMembersCount = chapterUsers.filter(u => u.role !== 'MASTER_ADMIN').length;
  const activePartnersCount = chapterUsers.filter(u => u.role !== 'MASTER_ADMIN' && isMemberActive(u)).length;
  const inactiveMembersCount = chapterUsers.filter(u => u.role !== 'MASTER_ADMIN' && !isMemberActive(u)).length;

  // Filter lists by date
  const effectiveReferrals = useMemo(() => {
    if (!activeDateRange) return allReferrals;
    return allReferrals.filter(r => isDateInRange(r.created_at || r.createdAt, activeDateRange.start, activeDateRange.end));
  }, [allReferrals, activeDateRange]);

  const effectiveSlips = useMemo(() => {
    if (!activeDateRange) return allSlips;
    return allSlips.filter(s => isDateInRange(s.created_at || s.createdAt || s.date, activeDateRange.start, activeDateRange.end));
  }, [allSlips, activeDateRange]);
  
  const effectiveOneToOnes = useMemo(() => {
    if (!activeDateRange) return oneToOnes;
    return oneToOnes.filter(m => isDateInRange(m.created_at || m.createdAt || m.meeting_date, activeDateRange.start, activeDateRange.end));
  }, [oneToOnes, activeDateRange]);
  
  const effectiveMeetings = useMemo(() => {
    if (!activeDateRange) return meetings;
    return meetings.filter(m => isDateInRange(m.date || m.meeting_date || m.createdAt, activeDateRange.start, activeDateRange.end));
  }, [meetings, activeDateRange]);
  
  const effectiveGuests = useMemo(() => {
    if (!activeDateRange) return guestInvitations;
    return guestInvitations.filter(g => isDateInRange(g.visitDate || g.created_at || g.createdAt, activeDateRange.start, activeDateRange.end));
  }, [guestInvitations, activeDateRange]);

  const effectiveTestimonials = useMemo(() => {
    if (!activeDateRange) return testimonials;
    return testimonials.filter(t => isDateInRange(t.created_at || t.createdAt, activeDateRange.start, activeDateRange.end));
  }, [testimonials, activeDateRange]);


  const chapterReferrals = effectiveReferrals.filter(r => {
    const sender = chapterUsers.find(u => (u.id || u.uid) === (r.fromUserId || r.sender_id));
    const receiver = chapterUsers.find(u => (u.id || u.uid) === (r.toUserId || r.receiver_id));
    return (sender && String(sender.chapter_id || sender.chapterId) === String(userChapterId)) ||
           (receiver && String(receiver.chapter_id || receiver.chapterId) === String(userChapterId));
  });

  const chapterSlips = effectiveSlips.filter(s => {
    const sender = chapterUsers.find(u => (u.id || u.uid) === (s.fromUserId || s.from_user_id || s.submitted_by));
    const receiver = chapterUsers.find(u => (u.id || u.uid) === (s.toUserId || s.to_user_id));
    return (sender && String(sender.chapter_id || sender.chapterId) === String(userChapterId)) ||
           (receiver && String(receiver.chapter_id || receiver.chapterId) === String(userChapterId));
  });

  const referralsSentCount = chapterReferrals.filter(r => {
    const sender = chapterUsers.find(u => (u.id || u.uid) === (r.fromUserId || r.from_user_id || r.sender_id));
    return sender && String(sender.chapter_id || sender.chapterId) === String(userChapterId);
  }).length;

  const referralsReceivedCount = chapterReferrals.filter(r => {
    const receiver = chapterUsers.find(u => (u.id || u.uid) === (r.toUserId || r.to_user_id || r.receiver_id));
    return receiver && String(receiver.chapter_id || receiver.chapterId) === String(userChapterId);
  }).length;

  const businessSentTotal = chapterSlips.reduce((acc, s) => {
    const ref = chapterReferrals.find(r => String(r.id) === String(s.referralId || s.referral_id));
    const senderId = ref ? String(ref.fromUserId || ref.from_user_id || ref.sender_id) : String(s.toUserId || s.to_user_id);
    const sender = chapterUsers.find(u => String(u.id || u.uid) === senderId);
    if (sender && String(sender.chapter_id || sender.chapterId) === String(userChapterId)) {
      const val = ref && ref.business_amount ? Number(ref.business_amount) : Number(s.businessValue || s.business_value || s.amount || 0);
      return acc + val;
    }
    return acc;
  }, 0);

  const businessReceivedTotal = chapterSlips.reduce((acc, s) => {
    const ref = chapterReferrals.find(r => String(r.id) === String(s.referralId || s.referral_id));
    const receiverId = ref ? String(ref.toUserId || ref.to_user_id || ref.receiver_id) : String(s.fromUserId || s.from_user_id || s.submitted_by);
    const receiver = chapterUsers.find(u => String(u.id || u.uid) === receiverId);
    if (receiver && String(receiver.chapter_id || receiver.chapterId) === String(userChapterId)) {
      const val = ref && ref.business_amount ? Number(ref.business_amount) : Number(s.businessValue || s.business_value || s.amount || 0);
      return acc + val;
    }
    return acc;
  }, 0);

  const businessSentCount = chapterSlips.filter(s => {
    const ref = chapterReferrals.find(r => String(r.id) === String(s.referralId || s.referral_id));
    const senderId = ref ? String(ref.fromUserId || ref.from_user_id || ref.sender_id) : String(s.toUserId || s.to_user_id);
    const sender = chapterUsers.find(u => String(u.id || u.uid) === senderId);
    return sender && String(sender.chapter_id || sender.chapterId) === String(userChapterId);
  }).length;

  const businessReceivedCount = chapterSlips.filter(s => {
    const ref = chapterReferrals.find(r => String(r.id) === String(s.referralId || s.referral_id));
    const receiverId = ref ? String(ref.toUserId || ref.to_user_id || ref.receiver_id) : String(s.fromUserId || s.from_user_id || s.submitted_by);
    const receiver = chapterUsers.find(u => String(u.id || u.uid) === receiverId);
    return receiver && String(receiver.chapter_id || receiver.chapterId) === String(userChapterId);
  }).length;

  const chapterO2O = effectiveOneToOnes.filter(m => {
    const organizer = chapterUsers.find(u => (u.id || u.uid) === (m.organizer_id || m.creatorId));
    const part = chapterUsers.find(u => (u.id || u.uid) === m.member_id);
    return (organizer && String(organizer.chapter_id || organizer.chapterId) === String(userChapterId)) ||
           (part && String(part.chapter_id || part.chapterId) === String(userChapterId));
  });
  
  const oneToOneScheduledCount = chapterO2O.length;
  const oneToOneMeetingsCount = chapterO2O.filter(m => m.status === 'COMPLETED').length;

  const chapterMeetings = effectiveMeetings.filter(m => String(m.chapter_id || m.chapterId) === String(userChapterId));
  const meetingsCount = chapterMeetings.length;
  const meetingsAttendedCount = chapterMeetings.filter(m => m.status === 'COMPLETED' || m.isCompleted === true || (m.isCompleted as any) === 'true').length;
  const upcomingSyncsCount = chapterMeetings.filter(m => {
    const now = new Date();
    const mDate = new Date(m.date || m.meeting_date || m.createdAt);
    return mDate >= now && m.status !== 'COMPLETED';
  }).length;

  const chapterGuests = effectiveGuests.filter(g => {
    const inviter = chapterUsers.find(u => (u.id || u.uid) === (g.createdBy || g.memberId));
    return inviter && String(inviter.chapter_id || inviter.chapterId) === String(userChapterId);
  });
  const guestsInvitedCount = chapterGuests.length;
  
  const visitorsAttendedCount = guestInvitations.filter(g => {
    const st = String(g.status || g.attendance_status || '').toLowerCase();
    if (st !== 'present' && st !== 'attended') return false;
    
    if (activeDateRange) {
      const d = new Date(g.attendance_updated_at || g.updated_at || g.createdAt || g.created_at || g.date);
      if (!isDateInRange(d, activeDateRange.start, activeDateRange.end)) return false;
    }
    
    const inviter = chapterUsers.find(u => (u.id || u.uid) === (g.createdBy || g.memberId || g.invited_by || g.invited_by_user_id || g.user_id));
    return inviter && String(inviter.chapter_id || inviter.chapterId) === String(userChapterId);
  }).length;
  
  const thankYouSlipsSentCount = businessReceivedCount;
  const thankYouSlipsReceivedCount = businessSentCount;

  const chapterTestimonials = effectiveTestimonials.filter(t => {
    const author = chapterUsers.find(u => (u.id || u.uid) === (t.authorMemberId || t.author_id));
    return author && String(author.chapter_id || author.chapterId) === String(userChapterId);
  });
  const testimonialsGivenCount = chapterTestimonials.length;
  
  const testimonialsReceivedCount = effectiveTestimonials.filter(t => {
    const rec = chapterUsers.find(u => (u.id || u.uid) === (t.receiverMemberId || t.receiver_id));
    return rec && String(rec.chapter_id || rec.chapterId) === String(userChapterId);
  }).length;

  const handleGenerateReportData = () => {
    if (!reportStartDate || !reportEndDate) {
      alert("Please select both Start Date and End Date.");
      return;
    }
    
    setIsGenerating(true);
    setTimeout(() => {
      const start = new Date(reportStartDate);
      const end = new Date(reportEndDate);
      end.setHours(23, 59, 59, 999);
      start.setHours(0, 0, 0, 0);

      const isInChapter = (id: any) => {
        const u = chapterUsers.find(user => String(user.id || user.uid) === String(id));
        return u && String(u.chapter_id || u.chapterId) === String(userChapterId);
      };

      const calcSlipsValue = (slips: any[], refs: any[]) => {
        return slips.reduce((sum, s) => {
          const ref = refs.find(r => String(r.id) === String(s.referralId || s.referral_id));
          const val = ref && ref.business_amount ? Number(ref.business_amount) : Number(s.businessValue || s.business_value || s.amount || 0);
          return sum + val;
        }, 0);
      };

      // Period Data
      const pReferrals = allReferrals.filter(r => isDateInRange(r.created_at || r.createdAt, start, end) && isInChapter(r.fromUserId || r.sender_id));
      const pTestimonials = testimonials.filter(t => isDateInRange(t.created_at || t.createdAt, start, end) && isInChapter(t.authorMemberId || t.author_id));
      const pOneToOnes = oneToOnes.filter(m => isDateInRange(m.created_at || m.createdAt || m.meeting_date, start, end) && (isInChapter(m.organizer_id || m.creatorId) || isInChapter(m.member_id)));
      const pMeetings = meetings.filter(m => isDateInRange(m.date || m.meeting_date || m.createdAt, start, end) && String(m.chapter_id || m.chapterId) === String(userChapterId));
      
      let pMembersAttended = 0;
      pMeetings.forEach(m => {
        if (m.attendance) {
          pMembersAttended += Object.values(m.attendance || {}).filter(status => ['PRESENT', 'Yes', 'Substitute', 'Late', 'YES', 'SUBSTITUTE', 'Present'].includes(String(status))).length;
        }
      });

      const pGuestInvitations = guestInvitations.filter(g => {
        const d = new Date(g.attendance_updated_at || g.updated_at || g.createdAt || g.created_at || g.date);
        return isDateInRange(d, start, end) && isInChapter(g.createdBy || g.memberId || g.invited_by || g.invited_by_user_id || g.user_id) && (String(g.status || g.attendance_status || '').toLowerCase() === 'present' || String(g.status || g.attendance_status || '').toLowerCase() === 'attended');
      });

      const pSlips = allSlips.filter(s => isDateInRange(s.created_at || s.createdAt || s.date, start, end) && (isInChapter(s.fromUserId || s.from_user_id || s.submitted_by) || isInChapter(s.toUserId || s.to_user_id)));
      const pBusinessSlips = pSlips.filter(s => {
        const ref = allReferrals.find(r => String(r.id) === String(s.referralId || s.referral_id));
        const senderId = ref ? String(ref.fromUserId || ref.from_user_id || ref.sender_id) : String(s.toUserId || s.to_user_id);
        return isInChapter(senderId);
      });
      const pBusinessGenerated = calcSlipsValue(pBusinessSlips, allReferrals);

      const pGrowthScoreData = calculateChapterGrowthScoreData({
        chapterMembers: chapterUsers,
        activeDateRange: { start, end },
        allReferrals,
        oneToOnes,
        meetings,
        guestInvitations,
        testimonials,
        allSlips
      });
      const pScoreVal = Math.min(100, Math.max(0, Math.round(pGrowthScoreData.score)));

      // Cumulative Data
      const cReferrals = allReferrals.filter(r => new Date(r.created_at || r.createdAt) <= end && isInChapter(r.fromUserId || r.sender_id));
      const cTestimonials = testimonials.filter(t => new Date(t.created_at || t.createdAt) <= end && isInChapter(t.authorMemberId || t.author_id));
      const cOneToOnes = oneToOnes.filter(m => new Date(m.created_at || m.createdAt || m.meeting_date) <= end && (isInChapter(m.organizer_id || m.creatorId) || isInChapter(m.member_id)));
      
      const cGuestInvitations = guestInvitations.filter(g => {
        const d = new Date(g.attendance_updated_at || g.updated_at || g.createdAt || g.created_at || g.date);
        return d <= end && isInChapter(g.createdBy || g.memberId || g.invited_by || g.invited_by_user_id || g.user_id) && (String(g.status || g.attendance_status || '').toLowerCase() === 'present' || String(g.status || g.attendance_status || '').toLowerCase() === 'attended');
      });

      const cSlips = allSlips.filter(s => new Date(s.created_at || s.createdAt || s.date) <= end && (isInChapter(s.fromUserId || s.from_user_id || s.submitted_by) || isInChapter(s.toUserId || s.to_user_id)));
      const cBusinessSlips = cSlips.filter(s => {
        const ref = allReferrals.find(r => String(r.id) === String(s.referralId || s.referral_id));
        const senderId = ref ? String(ref.fromUserId || ref.from_user_id || ref.sender_id) : String(s.toUserId || s.to_user_id);
        return isInChapter(senderId);
      });
      const cBusinessGenerated = calcSlipsValue(cBusinessSlips, allReferrals);

      setReportData({
        chapterName: formattedChapterTitle,
        startDate: start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-'),
        endDate: end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-'),
        generatedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-'),
        
        pMembersAttended: pMembersAttended.toString().padStart(2, '0'),
        pVisitorsInvited: pGuestInvitations.length.toString().padStart(2, '0'),
        pReferralsShared: pReferrals.length.toString().padStart(2, '0'),
        pBusinessGenerated: `₹${pBusinessGenerated.toLocaleString('en-IN')}/-`,
        pOneToOnes: pOneToOnes.filter(m => m.status === 'COMPLETED').length.toString().padStart(2, '0'),
        pTestimonialsPassed: pTestimonials.length.toString().padStart(2, '0'),
        pThankYouSlips: pSlips.length.toString().padStart(2, '0'),
        pGrowthScore: pScoreVal,

        cBusinessGenerated: `₹${cBusinessGenerated.toLocaleString('en-IN')}/-`,
        cReferralsShared: cReferrals.length,
        cVisitorsHosted: cGuestInvitations.length,
        cOneToOnes: cOneToOnes.filter(m => m.status === 'COMPLETED').length,
        cTestimonialsPassed: cTestimonials.length,
        cThankYouSlips: cSlips.length,
      });
      setIsGenerating(false);
    }, 800);
  };

  const handleDownloadPDF = async () => {
    // @ts-ignore
    if (!reportData) return;
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    // @ts-ignore
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.setTextColor(229, 57, 53);
    doc.text("SSK BUSINESS NETWORK", 105, 20, { align: "center" });
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text("CHAPTER IMPACT REPORT", 105, 28, { align: "center" });
    
    doc.setFontSize(11);
    doc.text(`Chapter: ${reportData.chapterName}`, 20, 40);
    doc.text(`Report Period: ${reportData.startDate} - ${reportData.endDate}`, 20, 47);
    doc.text(`Generated On: ${reportData.generatedDate}`, 20, 54);
    
    doc.setFontSize(14);
    doc.setTextColor(229, 57, 53);
    doc.text(`CHAPTER GROWTH SCORE: ${reportData.pGrowthScore}%`, 105, 70, { align: "center" });
    
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text("MEETING / PERIOD HIGHLIGHTS", 20, 90);
    
    // @ts-ignore
    autoTable(doc, {
      startY: 95,
      head: [['Metric', 'Value']],
      body: [
        ['Members Attended', reportData.pMembersAttended],
        ['Visitors Hosted (Attended)', reportData.pVisitorsInvited],
        ['Referrals Shared', reportData.pReferralsShared],
        ['Business Generated', reportData.pBusinessGenerated],
        ['One-to-One Meetings', reportData.pOneToOnes],
        ['Testimonials Passed', reportData.pTestimonialsPassed],
        ['Thank You Slips', reportData.pThankYouSlips]
      ],
      theme: 'grid',
      headStyles: { fillColor: [229, 57, 53] },
      styles: { fontSize: 11, cellPadding: 5 }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 160;

    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text("CUMULATIVE ACHIEVEMENTS", 20, finalY + 15);

    // @ts-ignore
    autoTable(doc, {
      startY: finalY + 20,
      head: [['Metric', 'Value']],
      body: [
        ['Total Business Generated', reportData.cBusinessGenerated],
        ['Total Referrals Shared', reportData.cReferralsShared],
        ['Total Visitors Hosted', reportData.cVisitorsHosted],
        ['Total One-to-One Meetings', reportData.cOneToOnes],
        ['Total Testimonials Passed', reportData.cTestimonialsPassed],
        ['Total Thank You Slips', reportData.cThankYouSlips]
      ],
      theme: 'grid',
      headStyles: { fillColor: [229, 57, 53] },
      styles: { fontSize: 11, cellPadding: 5 }
    });
    
    doc.save(`SSK_${reportData.chapterName.replace(/\s+/g, '_')}_Impact_Report_${reportData.startDate}_${reportData.endDate}.pdf`);
  };

  const handleDownloadExcel = async () => {
    if (!reportData) return;
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    
    const wsData = [
      ["SSK BUSINESS NETWORK"],
      ["CHAPTER IMPACT REPORT"],
      [],
      ["Chapter", reportData.chapterName],
      ["Report Period", `${reportData.startDate} - ${reportData.endDate}`],
      ["Generated On", reportData.generatedDate],
      ["Chapter Growth Score", `${reportData.pGrowthScore}%`],
      [],
      ["MEETING / PERIOD HIGHLIGHTS"],
      ["Metric", "Value"],
      ["Members Attended", reportData.pMembersAttended],
      ["Visitors Hosted (Attended)", reportData.pVisitorsInvited],
      ["Referrals Shared", reportData.pReferralsShared],
      ["Business Generated", reportData.pBusinessGenerated],
      ["One-to-One Meetings", reportData.pOneToOnes],
      ["Testimonials Passed", reportData.pTestimonialsPassed],
      ["Thank You Slips", reportData.pThankYouSlips],
      [],
      ["CUMULATIVE ACHIEVEMENTS"],
      ["Metric", "Value"],
      ["Total Business Generated", reportData.cBusinessGenerated],
      ["Total Referrals Shared", reportData.cReferralsShared],
      ["Total Visitors Hosted", reportData.cVisitorsHosted],
      ["Total One-to-One Meetings", reportData.cOneToOnes],
      ["Total Testimonials Passed", reportData.cTestimonialsPassed],
      ["Total Thank You Slips", reportData.cThankYouSlips]
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Impact Report");
    XLSX.writeFile(wb, `SSK_${reportData.chapterName.replace(/\s+/g, '_')}_Impact_Report_${reportData.startDate}_${reportData.endDate}.xlsx`);
  };

  const handleDownloadWord = async () => {
    if (!reportData) return;
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } = await import("docx");
    // @ts-ignore
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({ text: "SSK BUSINESS NETWORK", heading: HeadingLevel.TITLE, alignment: "center" }),
          new Paragraph({ text: "CHAPTER IMPACT REPORT", heading: HeadingLevel.HEADING_1, alignment: "center" }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: `Chapter: ${reportData.chapterName}` }),
          new Paragraph({ text: `Report Period: ${reportData.startDate} - ${reportData.endDate}` }),
          new Paragraph({ text: `Generated On: ${reportData.generatedDate}` }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: `CHAPTER GROWTH SCORE: ${reportData.pGrowthScore}%`, heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "MEETING / PERIOD HIGHLIGHTS", heading: HeadingLevel.HEADING_2 }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({ children: [new TableCell({ children: [new Paragraph("Members Attended")] }), new TableCell({ children: [new Paragraph(String(reportData.pMembersAttended))] })] }),
              new TableRow({ children: [new TableCell({ children: [new Paragraph("Visitors Hosted (Attended)")] }), new TableCell({ children: [new Paragraph(String(reportData.pVisitorsInvited))] })] }),
              new TableRow({ children: [new TableCell({ children: [new Paragraph("Referrals Shared")] }), new TableCell({ children: [new Paragraph(String(reportData.pReferralsShared))] })] }),
              new TableRow({ children: [new TableCell({ children: [new Paragraph("Business Generated")] }), new TableCell({ children: [new Paragraph(String(reportData.pBusinessGenerated))] })] }),
              new TableRow({ children: [new TableCell({ children: [new Paragraph("One-to-One Meetings")] }), new TableCell({ children: [new Paragraph(String(reportData.pOneToOnes))] })] }),
              new TableRow({ children: [new TableCell({ children: [new Paragraph("Testimonials Passed")] }), new TableCell({ children: [new Paragraph(String(reportData.pTestimonialsPassed))] })] }),
              new TableRow({ children: [new TableCell({ children: [new Paragraph("Thank You Slips")] }), new TableCell({ children: [new Paragraph(String(reportData.pThankYouSlips))] })] }),
            ]
          }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "CUMULATIVE ACHIEVEMENTS", heading: HeadingLevel.HEADING_2 }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({ children: [new TableCell({ children: [new Paragraph("Total Business Generated")] }), new TableCell({ children: [new Paragraph(String(reportData.cBusinessGenerated))] })] }),
              new TableRow({ children: [new TableCell({ children: [new Paragraph("Total Referrals Shared")] }), new TableCell({ children: [new Paragraph(String(reportData.cReferralsShared))] })] }),
              new TableRow({ children: [new TableCell({ children: [new Paragraph("Total Visitors Hosted")] }), new TableCell({ children: [new Paragraph(String(reportData.cVisitorsHosted))] })] }),
              new TableRow({ children: [new TableCell({ children: [new Paragraph("Total One-to-One Meetings")] }), new TableCell({ children: [new Paragraph(String(reportData.cOneToOnes))] })] }),
              new TableRow({ children: [new TableCell({ children: [new Paragraph("Total Testimonials Passed")] }), new TableCell({ children: [new Paragraph(String(reportData.cTestimonialsPassed))] })] }),
              new TableRow({ children: [new TableCell({ children: [new Paragraph("Total Thank You Slips")] }), new TableCell({ children: [new Paragraph(String(reportData.cThankYouSlips))] })] }),
            ]
          })
        ]
      }]
    });
    
    Packer.toBlob(doc).then((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SSK_${reportData.chapterName.replace(/\s+/g, '_')}_Impact_Report_${reportData.startDate}_${reportData.endDate}.docx`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  };

  const handleShareWhatsApp = () => {
    if (!reportData) return;
    const text = `*𝐒𝐒𝐊 𝐁𝐔𝐒𝐈𝐍𝐄𝐒𝐒 𝐍𝐄𝐓𝐖𝐎𝐑𝐊 | 𝐂𝐇𝐀𝐏𝐓𝐄𝐑 𝐈𝐌𝐏𝐀𝐂𝐓 𝐑𝐄𝐏𝐎𝐑𝐓* 🌟\n\n📅 Report Period:\n${reportData.startDate} – ${reportData.endDate}\n\n*𝐌𝐄𝐄𝐓𝐈𝐍𝐆 / 𝐏𝐄𝐑𝐈𝐎𝐃 𝐇𝐈𝐆𝐇𝐋𝐈𝐆𝐇𝐓𝐒*\n\n👥 Members Attended: *${reportData.pMembersAttended}*\n🙋 Visitors Hosted: *${reportData.pVisitorsInvited}*\n🤝 Referrals Shared: *${reportData.pReferralsShared}*\n💰 Business Generated: *${reportData.pBusinessGenerated}*\n☕ One-to-One Meetings: *${reportData.pOneToOnes}*\n🌟 Testimonials Passed: *${reportData.pTestimonialsPassed}*\n📄 Thank You Slips: *${reportData.pThankYouSlips}*\n\n*𝐂𝐔𝐌𝐔𝐋𝐀𝐓𝐈𝐕𝐄 𝐀𝐂𝐇𝐈𝐄𝐕𝐄𝐌𝐄𝐍𝐓𝐒*\n\n💼 Total Business Generated: *${reportData.cBusinessGenerated}*\n🤝 Total Referrals Shared: *${reportData.cReferralsShared}*\n👥 Total Visitors Hosted: *${reportData.cVisitorsHosted}*\n☕ Total One-to-One Meetings: *${reportData.cOneToOnes}*\n🌟 Total Testimonials Passed: *${reportData.cTestimonialsPassed}*\n📄 Total Thank You Slips: *${reportData.cThankYouSlips}*\n\n📊 *Chapter Growth Score: ${reportData.pGrowthScore}%*\n\n📎 Detailed report attached/shared separately.`;
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 bg-[#111827] rounded-[20px] border border-white/5 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#E53935]"></div>
        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.3em] animate-pulse">Syncing Chapter Telemetry...</p>
      </div>
    );
  }

  const scoreVal = Math.min(100, Math.max(0, Math.round(chapterGrowthScoreData.score)));

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-8 pb-20 relative px-4 sm:px-6">
      {/* Top Header Section */}
      <div className="flex flex-col items-center text-center space-y-2 border-b border-white/5 pb-6">
        <div className="w-full flex justify-between items-center mb-2">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-400 hover:text-white uppercase tracking-widest transition-colors">
            <ChevronLeft size={14} /> Back To Dashboard
          </Link>
          {profile?.role === 'CHAPTER_ADMIN' && (
            <button
              onClick={() => {
                setReportData(null);
                setReportStartDate('');
                setReportEndDate('');
                setIsReportModalOpen(true);
              }}
              className="bg-[#1F2937]/80 hover:bg-[#1F2937] text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 border border-white/10 transition-colors"
            >
              <FileText size={14} />
              REPORT
            </button>
          )}
        </div>

        <h1 className="text-lg sm:text-2xl md:text-3xl font-black text-white tracking-tight uppercase flex items-center justify-center gap-2 sm:gap-3 flex-wrap text-center leading-tight">
          <Activity className="text-[#E53935] h-6 w-6 sm:h-7 sm:w-7 shrink-0" />
          <span className="max-w-full break-words">{formattedChapterTitle}</span>
        </h1>
        <p className="text-xs sm:text-sm font-semibold text-[#9CA3AF] max-w-lg">
          Real-time performance and growth analytics for your chapter.
        </p>
      </div>

      {/* Growth Score & Filter Section */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center space-y-4 py-2"
      >
        <div className="relative z-10 flex items-center justify-center shrink-0 w-[140px] h-[140px] sm:w-[160px] sm:h-[160px]">
          {/* Circular Gauge Outer Track */}
          <div className="absolute inset-0 rounded-full border-[6px] border-[#111827] shadow-[0_0_20px_rgba(0,0,0,0.4)]" />
          
          {/* Spinning/pulsing subtle gradient circle glow */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="absolute inset-[-4px] rounded-full opacity-40 blur-[8px] border-2 border-dashed border-[#E53935]"
          />

          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 relative z-10">
            <defs>
              <linearGradient id="chapter-score-grad-ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#E53935" />
                <stop offset="50%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
            </defs>
            {/* Background Track */}
            <circle cx="50" cy="50" r="44" stroke="#1a2233" strokeWidth="6" fill="none" />
            {/* Progress Ring */}
            <circle 
              cx="50" 
              cy="50" 
              r="44" 
              stroke="url(#chapter-score-grad-ring)" 
              strokeWidth="6" 
              fill="none" 
              strokeDasharray="276" 
              strokeDashoffset={276 - (276 * Math.min(100, Math.max(0, scoreVal))) / 100}
              strokeLinecap="round" 
              className="transition-all duration-300 drop-shadow-[0_0_8px_rgba(229,57,53,0.6)]" 
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center m-2.5 rounded-full bg-[#0B1220]/90 backdrop-blur-sm shadow-inner z-20">
            <span className="text-[28px] sm:text-[34px] font-extrabold text-white leading-none tracking-tighter">
              {scoreVal}%
            </span>
            <span className="text-[8px] sm:text-[9px] font-bold text-[#9CA3AF] uppercase tracking-widest mt-1">
              CHAPTER GROWTH
            </span>
            <div className={cn("mt-1 px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold tracking-wider border", chapterGrowthScoreData.statusColor)}>
              {chapterGrowthScoreData.status}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-bold text-[#9CA3AF] bg-[#111827]/80 border border-white/10 px-4 py-1.5 rounded-full shadow-sm">
            Score: <span className="text-white font-extrabold">{scoreVal}%</span>
          </div>
        </div>
      </motion.div>

      {/* Chapter Information Card (Simplified) */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-2xl mx-auto bg-gradient-to-b from-[#111827]/90 to-[#0B1220]/90 border border-white/10 rounded-[24px] p-6 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-md relative overflow-hidden"
      >
        {/* Ambient background glow */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#E53935]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#E53935]/10 border border-[#E53935]/20 flex items-center justify-center text-[#E53935] shrink-0">
              <Building2 size={24} />
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-[#9CA3AF] uppercase tracking-[0.2em]">Chapter Details</span>
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                {formattedChapterCardName}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#1F2937]/80 border border-white/10 px-3.5 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Active Chapter</span>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#0B1220]/80 border border-white/5 rounded-2xl p-4 flex flex-col justify-center">
            <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <Users size={12} className="text-indigo-400" />
              Active Members
            </span>
            <div className="text-2xl font-black text-white">{activePartnersCount}</div>
            <span className="text-[10px] text-[#9CA3AF] font-semibold mt-0.5">out of {totalMembersCount} total</span>
          </div>
          <div className="bg-[#0B1220]/80 border border-white/5 rounded-2xl p-4 flex flex-col justify-center">
            <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <Users size={12} className="text-red-400" />
              Inactive Members
            </span>
            <div className="text-2xl font-black text-white">{inactiveMembersCount}</div>
            <span className="text-[10px] text-[#9CA3AF] font-semibold mt-0.5">out of {totalMembersCount} total</span>
          </div>
        </div>
      </motion.div>

      {/* Analytics Section - Redesigned to use 'MEMBER' role for Merged Cards UI */}
      <div className="space-y-4 pt-2">
        <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-3">
          <Activity className="text-[#E53935] h-5 w-5" />
          Chapter Analytics
        </h2>
        <StatGrid
          role="MEMBER" // Passed "MEMBER" to get the EXACT "My Analytics" UI style (merged cards)
          position=""
          totalMembersCount={totalMembersCount}
          activePartnersCount={activePartnersCount}
          inactiveMembersCount={inactiveMembersCount}
          referralsSentCount={referralsSentCount}
          referralsReceivedCount={referralsReceivedCount}
          businessGeneratedTotal={businessSentTotal}
          businessSentTotal={businessSentTotal}
          businessReceivedTotal={businessReceivedTotal}
          businessSentCount={businessSentCount}
          businessReceivedCount={businessReceivedCount}
          oneToOneScheduledCount={oneToOneScheduledCount}
          oneToOneCompletedCount={oneToOneMeetingsCount}
          meetingsScheduledCount={upcomingSyncsCount}
          meetingsAttendedCount={meetingsAttendedCount}
          meetingsCount={meetingsCount}
          upcomingSyncsCount={upcomingSyncsCount}
          guestsInvitedCount={guestsInvitedCount}
          visitorsAttendedCount={visitorsAttendedCount}
          thankYouSlipsSentCount={thankYouSlipsSentCount}
          thankYouSlipsReceivedCount={thankYouSlipsReceivedCount}
          testimonialsGivenCount={testimonialsGivenCount}
          testimonialsReceivedCount={testimonialsReceivedCount}
        />
      </div>

      {/* Report Generation Modal */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Generate Impact Report"
      >
        <div className="space-y-6">
          {!reportData ? (
            <>
              <p className="text-sm text-neutral-400">
                Select a date range to generate the Chapter Impact Report.
              </p>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                      className="w-full bg-[#111827] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={reportEndDate}
                      onChange={(e) => setReportEndDate(e.target.value)}
                      className="w-full bg-[#111827] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-4 border-t border-white/10 flex-col sm:flex-row">
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="w-full sm:w-1/2 bg-[#111827] hover:bg-neutral-800 text-white font-bold py-3 rounded-xl transition-all text-sm border border-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateReportData}
                  disabled={isGenerating}
                  className="w-full sm:w-1/2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-lg shadow-red-900/20 disabled:opacity-50"
                >
                  {isGenerating ? 'Generating...' : 'Generate Report'}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl text-center">
                <FileText className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
                <h3 className="text-emerald-400 font-bold text-lg mb-1">Report Generated</h3>
                <p className="text-emerald-400/80 text-xs">
                  Your report for {reportData.startDate} to {reportData.endDate} is ready.
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button onClick={handleDownloadPDF} className="flex flex-col items-center justify-center gap-2 bg-[#1F2937]/80 hover:bg-[#1F2937] text-white p-4 rounded-xl border border-white/10 transition-all group">
                  <FileIcon className="h-6 w-6 text-red-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold">PDF</span>
                </button>
                <button onClick={handleDownloadExcel} className="flex flex-col items-center justify-center gap-2 bg-[#1F2937]/80 hover:bg-[#1F2937] text-white p-4 rounded-xl border border-white/10 transition-all group">
                  <FileSpreadsheet className="h-6 w-6 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold">Excel</span>
                </button>
                <button onClick={handleDownloadWord} className="flex flex-col items-center justify-center gap-2 bg-[#1F2937]/80 hover:bg-[#1F2937] text-white p-4 rounded-xl border border-white/10 transition-all group">
                  <FileText className="h-6 w-6 text-blue-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold">Word</span>
                </button>
              </div>

              <div className="pt-2">
                <button onClick={handleShareWhatsApp} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-lg shadow-emerald-900/20">
                  <MessageCircle size={18} />
                  SHARE ON WHATSAPP
                </button>
              </div>

              <button
                onClick={() => setReportData(null)}
                className="w-full mt-2 bg-[#111827] hover:bg-neutral-800 text-neutral-400 hover:text-white font-bold py-3 rounded-xl transition-all text-sm border border-white/10"
              >
                Back to Date Selection
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Filter Modal */}
      <Modal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title="Filter Chapter Analytics"
      >
        <div className="space-y-6">
          <p className="text-sm text-neutral-400">
            Select a date range to filter the entire My Chapter Report, including Growth Score and Analytics.
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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

    </div>
  );
}
