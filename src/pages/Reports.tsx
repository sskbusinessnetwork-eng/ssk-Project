import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { databaseService } from '../services/databaseService';
import { where } from '../lib/database';
import { UserProfile, Meeting, Referral, OneToOneMeeting, GuestInvitation, Testimonial, Chapter } from '../types';
import { calculateMemberGrowthScore } from '../utils/growthScore';
import { 
  Users, Activity, Calendar, Share2, Layers, UserPlus, 
  MessageSquare, Download, Filter, Search, ChevronDown, ChevronUp,
  FileText, Star, X, CheckSquare, Briefcase, BarChart3, TrendingUp, Info
} from 'lucide-react';
import { format, isWithinInterval, startOfMonth, endOfMonth, parseISO, subMonths } from 'date-fns';
import { cn } from '../lib/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
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
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(() => {
    // Default to start of 6 months ago
    const d = subMonths(new Date(), 6);
    return format(d, 'yyyy-MM-01');
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return format(new Date(), 'yyyy-MM-dd');
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  // Sort state
  const [sortField, setSortField] = useState<string>('growthScore');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // UI tabs state
  const [activeTab, setActiveTab] = useState<'table' | 'charts'>('table');
  const [showExportMenu, setShowExportMenu] = useState(false);

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

    const loadAllData = async () => {
      setLoading(true);
      try {
        // Master admin can see all chapters, let's load chapters
        if (profile.role === 'MASTER_ADMIN') {
          const chaptersList = await databaseService.list<Chapter>('chapters');
          setChapters(chaptersList);
          if (chaptersList.length > 0) {
            setSelectedChapterId(chaptersList[0].id);
          }
        } else if (profile.chapter_id) {
          setSelectedChapterId(profile.chapter_id);
        }

        // Setup real-time subscriptions for reactive reporting metrics
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
          setGuestInvitations(data);
        });

        unsubTestimonials = databaseService.subscribe<Testimonial>('testimonials', [], (data) => {
          setTestimonials(data);
        });

        unsubSlips = databaseService.subscribe<any>('thank_you_slips', [], (data) => {
          setThankYouSlips(data);
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
    };
  }, [profile]);

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
  const parsedStart = useMemo(() => new Date(startDate + 'T00:00:00'), [startDate]);
  const parsedEnd = useMemo(() => new Date(endDate + 'T23:59:59'), [endDate]);

  // Filtered members belonging to selected chapter
  const filteredMembers = useMemo(() => {
    if (!selectedChapterId) return [];
    
    // Support filtering by chapter
    let results = users.filter(u => u.chapter_id === selectedChapterId);
    
    // Filter out MASTER_ADMINs from the general member roster reports
    results = results.filter(u => u.role !== 'MASTER_ADMIN');

    if (statusFilter !== 'ALL') {
      results = results.filter(u => u.membershipStatus === statusFilter);
    }

    return results;
  }, [users, selectedChapterId, statusFilter]);

  // Derived filtered transactions based on date filter & chapter boundaries
  const currentChapterMemberIds = useMemo(() => {
    return filteredMembers.map(m => m.uid);
  }, [filteredMembers]);

  const reportsData = useMemo(() => {
    const filteredRefs = referrals.filter(ref => {
      const isDateValid = isWithinDateRange(ref.createdAt, parsedStart, parsedEnd);
      const isChapterValid = currentChapterMemberIds.includes(ref.fromUserId) || currentChapterMemberIds.includes(ref.toUserId);
      return isDateValid && isChapterValid;
    });

    const filteredMeetings = meetings.filter(m => {
      const isDateValid = isWithinDateRange(m.date, parsedStart, parsedEnd);
      const isChapterValid = m.chapter_id === selectedChapterId;
      return isDateValid && isChapterValid;
    });

    const filteredOneToOnes = oneToOnes.filter(m => {
      const isDateValid = isWithinDateRange(m.date, parsedStart, parsedEnd);
      const isChapterValid = currentChapterMemberIds.includes((m.organizer_id || m.creatorId)) || (m.participantIds && m.participantIds.some(pid => currentChapterMemberIds.includes(pid)));
      return isDateValid && isChapterValid;
    });

    const filteredGuests = guestInvitations.filter(g => {
      const isDateValid = isWithinDateRange(g.createdAt, parsedStart, parsedEnd);
      const isChapterValid = g.chapter_id === selectedChapterId || currentChapterMemberIds.includes(g.createdBy);
      return isDateValid && isChapterValid;
    });

    const filteredTestimonials = testimonials.filter(t => {
      const isDateValid = isWithinDateRange(t.createdAt, parsedStart, parsedEnd);
      const isChapterValid = t.chapterId === selectedChapterId || currentChapterMemberIds.includes(t.authorMemberId);
      return isDateValid && isChapterValid;
    });

    const filteredSlips = thankYouSlips.filter(s => {
      const isDateValid = isWithinDateRange(s.createdAt, parsedStart, parsedEnd);
      const isChapterValid = currentChapterMemberIds.includes(s.fromUserId) || currentChapterMemberIds.includes(s.toUserId);
      return isDateValid && isChapterValid;
    });

    return {
      referrals: filteredRefs,
      meetings: filteredMeetings,
      oneToOnes: filteredOneToOnes,
      guests: filteredGuests,
      testimonials: filteredTestimonials,
      slips: filteredSlips
    };
  }, [referrals, meetings, oneToOnes, guestInvitations, testimonials, thankYouSlips, selectedChapterId, currentChapterMemberIds, parsedStart, parsedEnd]);

  // Aggregate stats cards
  const statsSummary = useMemo(() => {
    // Total Revenue
    const totalRevenue = reportsData.slips.reduce((sum, s) => sum + (Number(s.businessValue) || 0), 0);

    // Referrals Total
    const referralsTotal = reportsData.referrals.length;

    // Attendance Average %
    const completedMeetings = reportsData.meetings.filter(m => m.isCompleted);
    let totalPresentCount = 0;
    let totalAttendanceRecords = 0;

    completedMeetings.forEach(m => {
      if (m.attendance) {
        currentChapterMemberIds.forEach(memberId => {
          const status = m.attendance[memberId];
          if (status) {
            totalAttendanceRecords++;
            if (['PRESENT', 'Yes', 'Substitute', 'Late', 'YES', 'SUBSTITUTE'].includes(String(status))) {
              totalPresentCount++;
            }
          }
        });
      }
    });
    const avgAttendance = totalAttendanceRecords === 0 ? 0 : Math.round((totalPresentCount / totalAttendanceRecords) * 100);

    // One-to-Ones Completed
    const completedOneToOnes = reportsData.oneToOnes.filter(m => m.status === 'COMPLETED').length;

    // Guests Attended
    const guestsAttended = reportsData.guests.filter(g => g.status === 'Attended').length;

    // Testimonials Approved
    const approvedTestimonials = reportsData.testimonials.filter(t => t.status === 'APPROVED').length;

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
      // 1. Referrals Passed
      const referralsPassed = reportsData.referrals.filter(r => r.fromUserId === member.uid).length;

      // 2. Attendance %
      const completedMeetings = reportsData.meetings.filter(m => m.isCompleted);
      let attendedMeetings = 0;
      let totalChapterMeetings = 0;

      completedMeetings.forEach(m => {
        if (m.attendance && m.attendance[member.uid]) {
          totalChapterMeetings++;
          if (['PRESENT', 'Yes', 'Substitute', 'Late', 'YES', 'SUBSTITUTE'].includes(String(m.attendance[member.uid]))) {
            attendedMeetings++;
          }
        }
      });
      const attendancePercent = totalChapterMeetings === 0 ? 0 : Math.round((attendedMeetings / totalChapterMeetings) * 100);

      // 3. 1-to-1 Completed
      const completedOneToOnesCount = reportsData.oneToOnes.filter(m => 
        m.status === 'COMPLETED' && ((m.organizer_id || m.creatorId) === member.uid || ([m.member_id, ...(m.participantIds || [])]).includes(member.uid))
      ).length;

      // 4. Guests Invited
      const guestsInvited = reportsData.guests.filter(g => g.createdBy === member.uid).length;

      // 5. Testimonials Submitted
      const testimonialsSubmitted = reportsData.testimonials.filter(t => t.authorMemberId === member.uid).length;

      // Formulaic custom Growth Score out of 100
      const growthScore = calculateMemberGrowthScore({
        attendancePercent,
        completedOneToOnes: completedOneToOnesCount,
        referralsSent: referralsPassed,
        referralsReceived: reportsData.referrals.filter(r => (r.toUserId || r.receiver_id) === member.uid).length,
        thankYouSlipsSent: 0,
        thankYouSlipsReceived: 0,
        guestInvites: guestsInvited,
        testimonialsSubmitted,
        isProfileComplete: Boolean(member.name && member.phone && member.businessName),
        isSubscriptionActive: member.membershipStatus === 'ACTIVE' || member.status === 'ACTIVE'
      }).score;

      // Human-readable position label
      let displayPosition = 'Member';
      const role = (member.role || 'MEMBER').toUpperCase();
      if (role === 'PRESIDENT') displayPosition = 'President';
      else if (role === 'VICE_PRESIDENT') displayPosition = 'Vice President';
      else if (role === 'TREASURER') displayPosition = 'Treasurer';
      else if (role === 'CHAPTER_ADMIN') displayPosition = 'Chapter Admin';

      return {
        uid: member.uid,
        name: member.name || 'Anonymous User',
        position: displayPosition,
        positionKey: member.position || 'member',
        referrals: referralsPassed,
        attendance: attendancePercent,
        oneToOnes: completedOneToOnesCount,
        guests: guestsInvited,
        testimonials: testimonialsSubmitted,
        status: member.membershipStatus || 'ACTIVE',
        growthScore,
        businessName: member.businessName || 'N/A'
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
  }, [filteredMembers, reportsData, searchQuery, sortField, sortDirection]);

  // Derived data for charts
  const monthlyMetricsChartData = useMemo(() => {
    // Generate an array of month keys over the selected date range
    const monthsMap: Record<string, { month: string; referrals: number; attendance: number; meetings: number; business: number }> = {};
    
    // Initialize past 6 months to make chart look complete
    const tempDate = new Date(parsedEnd);
    for (let i = 5; i >= 0; i--) {
      const targetMonth = subMonths(tempDate, i);
      const key = format(targetMonth, 'MMM yyyy');
      monthsMap[key] = { month: key, referrals: 0, attendance: 0, meetings: 0, business: 0 };
    }

    // Accumulate referrals
    reportsData.referrals.forEach(ref => {
      if (!ref.createdAt) return;
      const key = format(new Date(ref.createdAt), 'MMM yyyy');
      if (monthsMap[key]) {
        monthsMap[key].referrals++;
      }
    });

    // Accumulate meetings
    reportsData.meetings.forEach(m => {
      if (!m.date) return;
      const key = format(new Date(m.date), 'MMM yyyy');
      if (monthsMap[key]) {
        monthsMap[key].meetings++;
      }
    });

    // Accumulate business (Thank you slips)
    reportsData.slips.forEach(slip => {
      if (!slip.createdAt) return;
      const key = format(new Date(slip.createdAt), 'MMM yyyy');
      if (monthsMap[key]) {
        monthsMap[key].business += (Number(slip.businessValue) || 0);
      }
    });

    // Calculate meeting average attendance per month
    const monthlyMeetings: Record<string, { present: number; total: number }> = {};
    reportsData.meetings.filter(m => m.isCompleted).forEach(m => {
      const key = format(new Date(m.date), 'MMM yyyy');
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
  function isWithinDateRange(dateVal: any, start: Date, end: Date): boolean {
    if (!dateVal) return false;
    try {
      const date = new Date(dateVal);
      if (isNaN(date.getTime())) return false;
      return date >= start && date <= end;
    } catch {
      return false;
    }
  }

  // Get active chapter name
  const currentChapterName = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN' && selectedChapterId) {
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
      `Period: ${startDate} to ${endDate}`,
      ``,
      headers.join(','),
      ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Roster_Report_${currentChapterName.replace(/\s+/g, '_')}_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
  };

  const exportToExcel = () => {
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
    XLSX.writeFile(wb, `Performance_Report_${currentChapterName.replace(/\s+/g, '_')}_${startDate}_to_${endDate}.xlsx`);
    setShowExportMenu(false);
  };

  const exportToPDF = () => {
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
    doc.text(`Reporting Period: ${startDate} to ${endDate}`, 40, 115);

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

    doc.save(`Performance_Report_${currentChapterName.replace(/\s+/g, '_')}_${startDate}_to_${endDate}.pdf`);
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
        <div>
          <span className="text-[11px] font-extrabold text-[#9CA3AF] uppercase tracking-[3px]">
            Enterprise Analytics Suite
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            <Activity className="text-[#E53935] h-7 w-7" />
            Chapter Reports
          </h1>
          <p className="text-xs text-[#9CA3AF] mt-1 font-bold uppercase tracking-wider">
            {profile?.role === 'MASTER_ADMIN' 
              ? `Super Admin dashboard monitoring: ${currentChapterName}` 
              : `Roster performance audits and metrics overview for ${currentChapterName}`}
          </p>
        </div>

        {/* Action Controls (Export) */}
        <div className="flex items-center gap-3 relative shrink-0">
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
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#111827] border border-white/5 rounded-[20px] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] space-y-4"
      >
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Master Admin Chapter Selector */}
            {profile?.role === 'MASTER_ADMIN' && chapters.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-wider">Audit Chapter</label>
                <div className="relative">
                  <select
                    value={selectedChapterId}
                    onChange={(e) => setSelectedChapterId(e.target.value)}
                    className="bg-[#0B1220] border border-white/10 rounded-[12px] text-xs font-bold text-white px-3 py-2.5 pr-8 appearance-none focus:outline-none focus:border-[#E53935] min-w-[180px]"
                  >
                    {chapters.map(c => (
                      <option key={c.id} value={c.id}>{c.chapter_name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" size={14} />
                </div>
              </div>
            )}

            {/* Start Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-wider">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-[#0B1220] border border-white/10 rounded-[12px] text-xs font-bold text-white px-3 py-2 focus:outline-none focus:border-[#E53935]"
              />
            </div>

            {/* End Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-wider">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-[#0B1220] border border-white/10 rounded-[12px] text-xs font-bold text-white px-3 py-2 focus:outline-none focus:border-[#E53935]"
              />
            </div>

            {/* Predefined Filter Presets */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-wider">Duration Preset</label>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => handlePresetFilter('this-month')}
                  className="bg-[#0B1220] hover:bg-[#1F2937] border border-white/5 hover:border-white/15 px-3 py-2 rounded-[10px] text-[10px] font-bold text-gray-300 transition-all"
                >
                  This Month
                </button>
                <button 
                  onClick={() => handlePresetFilter('last-month')}
                  className="bg-[#0B1220] hover:bg-[#1F2937] border border-white/5 hover:border-white/15 px-3 py-2 rounded-[10px] text-[10px] font-bold text-gray-300 transition-all"
                >
                  Last Month
                </button>
                <button 
                  onClick={() => handlePresetFilter('last-3')}
                  className="bg-[#0B1220] hover:bg-[#1F2937] border border-white/5 hover:border-white/15 px-3 py-2 rounded-[10px] text-[10px] font-bold text-gray-300 transition-all"
                >
                  3 Months
                </button>
                <button 
                  onClick={() => handlePresetFilter('last-6')}
                  className="bg-[#0B1220] hover:bg-[#1F2937] border border-white/5 hover:border-white/15 px-3 py-2 rounded-[10px] text-[10px] font-bold text-gray-300 transition-all"
                >
                  6 Months
                </button>
                <button 
                  onClick={() => handlePresetFilter('lifetime')}
                  className="bg-[#0B1220] hover:bg-[#1F2937] border border-white/5 hover:border-white/15 px-3 py-2 rounded-[10px] text-[10px] font-bold text-gray-300 transition-all"
                >
                  Lifetime
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

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
              className="bg-[#111827] border border-white/5 rounded-[20px] p-4 flex flex-col justify-between h-[120px] relative overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-wider">Active Members</span>
                <div className="w-6 h-6 rounded-[8px] bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
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
              className="bg-[#111827] border border-white/5 rounded-[20px] p-4 flex flex-col justify-between h-[120px] relative overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-wider">Revenue</span>
                <div className="w-6 h-6 rounded-[8px] bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
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
              className="bg-[#111827] border border-white/5 rounded-[20px] p-4 flex flex-col justify-between h-[120px] relative overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-wider">Referrals</span>
                <div className="w-6 h-6 rounded-[8px] bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
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
              className="bg-[#111827] border border-white/5 rounded-[20px] p-4 flex flex-col justify-between h-[120px] relative overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-wider">Avg Attendance</span>
                <div className="w-6 h-6 rounded-[8px] bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
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
              className="bg-[#111827] border border-white/5 rounded-[20px] p-4 flex flex-col justify-between h-[120px] relative overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-wider">1-to-1 Meetings</span>
                <div className="w-6 h-6 rounded-[8px] bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
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
              className="bg-[#111827] border border-white/5 rounded-[20px] p-4 flex flex-col justify-between h-[120px] relative overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-wider">Visitors Attended</span>
                <div className="w-6 h-6 rounded-[8px] bg-pink-500/10 text-pink-400 flex items-center justify-center border border-pink-500/20">
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
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
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
                  <span>SSK Network Standard v2.1</span>
                  <span className="text-purple-400">Audited Daily</span>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}
      
    </div>
  );
}
