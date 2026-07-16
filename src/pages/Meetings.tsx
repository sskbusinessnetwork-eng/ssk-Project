import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Calendar, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  UserPlus, 
  Clock, 
  ChevronRight,
  Users,
  MapPin,
  FileText,
  Save,
  TrendingUp,
  AlertCircle,
  Settings,
  Shield,
  Filter,
  Info
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { firestoreService } from '../services/firestoreService';
import { Meeting, UserProfile, AttendanceStatus } from '../types';
import { where, orderBy, limit } from 'firebase/firestore';
import { format, startOfWeek, endOfWeek, isSameDay, addDays, addWeeks, addMonths, setDate, isAfter, startOfDay, isBefore } from 'date-fns';
import { cn } from '../lib/utils';
import { Modal } from '../components/Modal';
import { parseTimeTo24h, formatTime12h, parseTo12hParts } from '../utils/timeUtils';

export function getMeetingExactDateTime(meeting: Meeting): Date {
  const d = new Date(meeting.date);
  const { hours, minutes } = parseTimeTo24h(meeting.time || '07:30');
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hours, minutes, 0, 0);
}

export function getAttendanceDisplay(status?: string) {
  if (!status) return { label: 'No', color: 'bg-red-500/10 text-red-400 border border-red-500/20' };
  
  const statusUpper = status.toUpperCase();
  if (statusUpper === 'PRESENT' || statusUpper === 'YES') {
    return { label: 'Yes', color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' };
  }
  if (statusUpper === 'ABSENT' || statusUpper === 'NO') {
    return { label: 'No', color: 'bg-red-500/10 text-red-400 border border-red-500/20' };
  }
  if (statusUpper === 'SUBSTITUTE') {
    return { label: 'Substitute', color: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' };
  }
  return { label: status, color: 'bg-[#151C2E] text-neutral-400 border border-white/5' };
}

const WEEKDAYS: Record<string, number> = {
  'Sunday': 0,
  'Monday': 1,
  'Tuesday': 2,
  'Wednesday': 3,
  'Thursday': 4,
  'Friday': 5,
  'Saturday': 6
};

function calculateOccurrences(
  frequency: 'Weekly' | 'Monthly',
  day: string,
  date: number,
  time: string
): Date[] {
  const dates: Date[] = [];
  const { hours, minutes } = parseTimeTo24h(time || '07:30');
  const now = new Date();
  
  if (frequency === 'Weekly') {
    const targetDayNum = WEEKDAYS[day] !== undefined ? WEEKDAYS[day] : 1;
    let checkDate = startOfDay(now);
    checkDate.setHours(hours, minutes, 0, 0);
    
    let count = 0;
    for (let i = 0; i < 90; i++) {
      if (checkDate.getDay() === targetDayNum) {
        if (isAfter(checkDate, now) || isSameDay(checkDate, now)) {
          dates.push(new Date(checkDate));
          count++;
          if (count >= 5) break;
        }
      }
      checkDate = addDays(checkDate, 1);
    }
  } else {
    let count = 0;
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(currentYear, currentMonth + i, 1);
      const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
      const actualDay = Math.min(date || 1, daysInMonth);
      
      monthDate.setDate(actualDay);
      monthDate.setHours(hours, minutes, 0, 0);
      
      if (isAfter(monthDate, now) || isSameDay(monthDate, now)) {
        dates.push(new Date(monthDate));
        count++;
        if (count >= 5) break;
      }
    }
  }
  
  return dates;
}

async function syncDefaultMeetings(adminId: string, setup: {
  frequency: 'Weekly' | 'Monthly';
  day: string;
  date: number;
  time: string;
  location: string;
  enabled: boolean;
}) {
  if (!adminId) return;

  const allMeetings = await firestoreService.list<Meeting>('meetings', [
    where('adminId', '==', adminId)
  ]);

  const now = new Date();

  if (!setup.enabled) {
    const toDelete = allMeetings.filter(m => 
      !m.isCompleted && 
      m.isRecurring && 
      new Date(m.date) >= startOfDay(now)
    );
    for (const m of toDelete) {
      await firestoreService.delete('meetings', m.id);
    }
    return;
  }

  const occurrences = calculateOccurrences(setup.frequency, setup.day, setup.date, setup.time);
  const occurrenceIdsToPreserve = new Set<string>();

  for (const occurrenceDate of occurrences) {
    const existingMeeting = allMeetings.find(m => isSameDay(new Date(m.date), occurrenceDate));

    if (existingMeeting) {
      await firestoreService.update('meetings', existingMeeting.id, {
        date: occurrenceDate.toISOString(),
        time: setup.time,
        location: setup.location,
        isRecurring: true
      });
      occurrenceIdsToPreserve.add(existingMeeting.id);
    } else {
      const newMeeting: Omit<Meeting, 'id'> = {
        adminId,
        date: occurrenceDate.toISOString(),
        time: setup.time,
        location: setup.location,
        attendance: {},
        amountCollected: {},
        memberNotes: {},
        notes: '',
        isCompleted: false,
        isRecurring: true
      };
      const newId = await firestoreService.create('meetings', newMeeting);
      if (newId) {
        occurrenceIdsToPreserve.add(newId);
      }
    }
  }

  const obsoleteMeetings = allMeetings.filter(m => 
    !m.isCompleted && 
    m.isRecurring && 
    new Date(m.date) >= startOfDay(now) && 
    !occurrenceIdsToPreserve.has(m.id)
  );

  for (const m of obsoleteMeetings) {
    await firestoreService.delete('meetings', m.id);
  }
}

export function Meetings() {
  const { profile } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [adminAdmins, setAdminAdmins] = useState<UserProfile[]>([]);
  const [scheduleData, setScheduleData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '07:30',
    location: '',
    adminId: ''
  });

  const [isDefaultSetupOpen, setIsDefaultSetupOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [isMemberHistoryModalOpen, setIsMemberHistoryModalOpen] = useState(false);
  const [isAttendanceDetailsOpen, setIsAttendanceDetailsOpen] = useState(false);
  const [isAmountDetailsOpen, setIsAmountDetailsOpen] = useState(false);
  const [selectedAdminId, setSelectedAdminId] = useState<string>('');
  const [isMeetingDetailsModalOpen, setIsMeetingDetailsModalOpen] = useState(false);
  const [detailsMeeting, setDetailsMeeting] = useState<Meeting | null>(null);
  const [tempAttendance, setTempAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [tempAmount, setTempAmount] = useState<Record<string, number>>({});
  const [tempMemberNotes, setTempMemberNotes] = useState<Record<string, string>>({});
  const [tempNotes, setTempNotes] = useState('');
  const [defaultSetupData, setDefaultSetupData] = useState({
    adminId: '',
    frequency: 'Weekly' as 'Weekly' | 'Monthly',
    day: 'Monday',
    date: 1,
    time: '07:30',
    location: '',
    enabled: false
  });

  const isChapterAdmin = profile?.role === 'CHAPTER_ADMIN';
  const isMasterAdmin = profile?.role === 'MASTER_ADMIN';
  const isPending = profile?.membershipStatus === 'PENDING' && !isMasterAdmin;

  const [currentTime, setCurrentTime] = useState(new Date());
  const [showAllFutureMeetings, setShowAllFutureMeetings] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000); // 10s intervals for fast real-time client updates
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (profile?.role === 'MASTER_ADMIN') {
      firestoreService.list<UserProfile>('users', [where('role', '==', 'CHAPTER_ADMIN')]).then(setAdminAdmins);
    } else if (profile?.role === 'MEMBER' && profile.adminId) {
      firestoreService.get<UserProfile>('users', profile.adminId).then(admin => {
        if (admin) setAdminAdmins([admin]);
      });
    } else if (profile?.role === 'CHAPTER_ADMIN') {
      setAdminAdmins([profile]);
    }
  }, [profile]);

  useEffect(() => {
    const chapterId = isMasterAdmin ? selectedAdminId : (isChapterAdmin ? profile?.uid : profile?.adminId);
    if (!chapterId) {
      setDefaultSetupData({
        adminId: '',
        frequency: 'Weekly',
        day: 'Monday',
        date: 1,
        time: '07:30',
        location: '',
        enabled: false
      });
      return;
    }

    const loadAndSyncSetup = async () => {
      try {
        const adminProfile = await firestoreService.get<UserProfile & { defaultMeetingSetup?: any }>('users', chapterId);
        if (adminProfile && adminProfile.defaultMeetingSetup) {
          const setup = {
            adminId: chapterId,
            frequency: adminProfile.defaultMeetingSetup.frequency || 'Weekly',
            day: adminProfile.defaultMeetingSetup.day || 'Monday',
            date: adminProfile.defaultMeetingSetup.date || 1,
            time: adminProfile.defaultMeetingSetup.time || '07:30',
            location: adminProfile.defaultMeetingSetup.location || '',
            enabled: adminProfile.defaultMeetingSetup.enabled || false
          };
          setDefaultSetupData(setup);

          if (setup.enabled) {
            syncDefaultMeetings(chapterId, setup).catch(err => {
              console.error("Background default meetings sync error:", err);
            });
          }
        } else {
          setDefaultSetupData({
            adminId: chapterId,
            frequency: 'Weekly',
            day: 'Monday',
            date: 1,
            time: '07:30',
            location: '',
            enabled: false
          });
        }
      } catch (err) {
        console.error("Error loading default meeting setup:", err);
      }
    };

    loadAndSyncSetup();
  }, [isMasterAdmin, selectedAdminId, isChapterAdmin, profile]);

  useEffect(() => {
    if (!profile) return;
    
    setLoading(true);

    const timeoutId = setTimeout(() => {
      if (loading) {
        setLoading(false);
        console.error("Meetings loading timed out");
      }
    }, 10000);

    const chapterId = isMasterAdmin ? selectedAdminId : (isChapterAdmin ? profile?.uid : profile?.adminId);
    
    if (!isMasterAdmin && !chapterId) {
      setMeetings([]);
      setLoading(false);
      clearTimeout(timeoutId);
      return;
    }

    const constraints = isMasterAdmin 
      ? (selectedAdminId ? [where('adminId', '==', selectedAdminId), orderBy('date', 'desc')] : [orderBy('date', 'desc')])
      : [where('adminId', '==', chapterId), orderBy('date', 'desc'), limit(50)];

    const unsubscribe = firestoreService.subscribe<Meeting>('meetings', constraints, (data) => {
      setMeetings(data);

      const now = new Date();
      // Default to current week's meeting or the most recent one
      const start = startOfWeek(now);
      const end = endOfWeek(now);
      
      const actionableMeetings = data.filter(m => !m.isCompleted && !m.isCancelled && getMeetingExactDateTime(m) >= now);
      const thisWeekMeeting = actionableMeetings.find(m => {
        const mDate = getMeetingExactDateTime(m);
        return mDate >= start && mDate <= end;
      });
      
      const nearestActionable = [...actionableMeetings].sort((a, b) => 
        getMeetingExactDateTime(a).getTime() - getMeetingExactDateTime(b).getTime()
      )[0];
      
      setSelectedMeeting(prev => {
        if (!prev) {
          return thisWeekMeeting || nearestActionable || data[0] || null;
        }
        const updated = data.find(m => m.id === prev.id);
        return updated || prev;
      });

      setLoading(false);
      clearTimeout(timeoutId);
    }, (error) => {
      setLoading(false);
      clearTimeout(timeoutId);
      console.error("Meetings subscription error:", error);
    });

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [profile]);

  useEffect(() => {
    // Fetch members for attendance/details
    // For Master Admin, we might need all members if no chapter is selected, 
    // but usually we want to filter by the chapter of the meeting being viewed.
    const chapterId = isMasterAdmin ? selectedAdminId : (isChapterAdmin ? profile?.uid : profile?.adminId);
    
    const fetchMembers = async () => {
      const constraints: any[] = [
        where('membershipStatus', '==', 'ACTIVE')
      ];

      if (chapterId) {
        // If we have a chapterId, we want members of that chapter
        constraints.push(where('adminId', '==', chapterId));
      } else {
        // If no chapterId (Master Admin "All Chapters"), we want all members and admins
        constraints.push(where('role', 'in', ['MEMBER', 'CHAPTER_ADMIN']));
      }

      try {
        const data = await firestoreService.list<UserProfile>('users', constraints);
        let activeMembers = data;
        
        // If chapterId is set, we also need to fetch the Chapter Admin themselves
        if (chapterId) {
          const admin = await firestoreService.get<UserProfile>('users', chapterId);
          if (admin && !activeMembers.find(m => m.uid === admin.uid)) {
            activeMembers = [admin, ...activeMembers];
          }
        }
        
        setMembers(activeMembers);
      } catch (err) {
        console.error("Error fetching members:", err);
      }
    };

    fetchMembers();

    if (selectedMeeting?.id) {
      setNotes(selectedMeeting.notes || '');
    }
  }, [selectedMeeting?.id, isMasterAdmin, isChapterAdmin, profile?.uid, selectedAdminId, profile?.adminId]);

  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    const adminId = profile?.uid || scheduleData.adminId;
    
    if (!adminId) {
      setError('Please select or assign an admin before scheduling a meeting.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Create date object from date string
      const [year, month, day] = scheduleData.date.split('-').map(Number);
      const meetingDate = new Date(year, month - 1, day);
      
      const newMeeting: Omit<Meeting, 'id'> = {
        adminId,
        date: meetingDate.toISOString(),
        time: scheduleData.time,
        location: scheduleData.location,
        attendance: {},
        isCompleted: false
      };

      await firestoreService.create('meetings', newMeeting);
      
      setSuccess('Meeting scheduled successfully!');
      setTimeout(() => {
        setIsScheduleModalOpen(false);
        setSuccess(null);
      }, 1500);
    } catch (err: any) {
      console.error('Error scheduling meeting:', err);
      setError(err.message || 'Failed to schedule meeting. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateDefaultSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const adminId = isChapterAdmin ? profile?.uid : defaultSetupData.adminId;
      if (!adminId) {
        throw new Error('No chapter admin associated or selected.');
      }

      const defaultSetupDoc = {
        frequency: defaultSetupData.frequency,
        day: defaultSetupData.day,
        date: defaultSetupData.date,
        time: defaultSetupData.time,
        location: defaultSetupData.location,
        enabled: defaultSetupData.enabled
      };

      // Save to Chapter Admin's user profile document inside users collection
      await firestoreService.update('users', adminId, {
        defaultMeetingSetup: defaultSetupDoc
      });

      // Synchronize recurring meetings to meetings collection
      await syncDefaultMeetings(adminId, defaultSetupDoc);

      setSuccess('Default meeting setup updated and synchronized!');
      setTimeout(() => {
        setIsDefaultSetupOpen(false);
        setSuccess(null);
      }, 1500);
    } catch (err: any) {
      console.error('Error updating default meeting setup:', err);
      setError(err.message || 'Failed to update default setup.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveUpdate = async () => {
    if (!selectedMeeting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      // Find all active chapter members for this meeting
      const meetingMembers = members.filter(m => m.adminId === selectedMeeting.adminId || m.uid === selectedMeeting.adminId);
      
      // Perform validation
      for (const member of meetingMembers) {
        const status = tempAttendance[member.uid];
        if (!status) {
          setError(`Attendance status is required for ${member.name || member.displayName || 'all members'} before saving.`);
          setIsSubmitting(false);
          return;
        }
        
        const allowedStatuses = ['Yes', 'No', 'Substitute', 'PRESENT', 'ABSENT', 'VISITOR', 'YES', 'NO', 'SUBSTITUTE'];
        if (!allowedStatuses.includes(status)) {
          setError(`Invalid attendance status selected for ${member.name || member.displayName || 'member'}.`);
          setIsSubmitting(false);
          return;
        }
      }

      await firestoreService.update('meetings', selectedMeeting.id, { 
        attendance: tempAttendance,
        amountCollected: tempAmount,
        memberNotes: tempMemberNotes,
        isCompleted: true,
        updatedAt: new Date().toISOString()
      });
      setSuccess('Meeting data updated and moved to history!');
      setTimeout(() => {
        setIsUpdateModalOpen(false);
        setSuccess(null);
        setSelectedMeeting(null);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update meeting data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedMeeting) return;
    setIsSubmitting(true);
    try {
      const meetingDate = new Date(selectedMeeting.date);
      const now = new Date();
      const shouldComplete = meetingDate < now;

      await firestoreService.update('meetings', selectedMeeting.id, { 
        notes: tempNotes,
        isCompleted: shouldComplete || selectedMeeting.isCompleted,
        updatedAt: new Date().toISOString()
      });
      setSuccess(shouldComplete ? 'Meeting notes updated and moved to history!' : 'Meeting notes updated!');
      setTimeout(() => {
        setIsNotesModalOpen(false);
        setSuccess(null);
        if (shouldComplete) setSelectedMeeting(null);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update meeting notes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const userAttendance = meetings.map(m => {
    const status = m.attendance?.[profile?.uid || ''];
    if (!status) return false;
    const statusUpper = status.toUpperCase();
    return statusUpper === 'PRESENT' || statusUpper === 'YES' || statusUpper === 'SUBSTITUTE';
  });
  const attendancePercentage = userAttendance.length > 0 
    ? Math.round((userAttendance.filter(Boolean).length / userAttendance.length) * 100) 
    : 0;

  const getMeetingStatus = (meeting: Meeting) => {
    if (meeting.isCancelled) {
      return { label: 'Cancelled', color: 'bg-red-100 text-red-700 border-red-200' };
    }
    if (meeting.isCompleted) {
      return { label: 'Completed', color: 'bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]' };
    }
    const meetingDate = getMeetingExactDateTime(meeting);
    
    if (meetingDate < currentTime) {
      return { label: 'Completed', color: 'bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]' };
    }
    
    return { label: 'Upcoming', color: 'bg-blue-100 text-primary border-blue-200' };
  };

  const filteredMeetings = selectedAdminId 
    ? meetings.filter(m => m.adminId === selectedAdminId)
    : meetings;

  // Upcoming: Non-completed, non-cancelled meetings that are in the future
  const scheduledMeetings = [...filteredMeetings.filter(m => !m.isCompleted && !m.isCancelled && getMeetingExactDateTime(m) >= currentTime)]
    .sort((a, b) => getMeetingExactDateTime(a).getTime() - getMeetingExactDateTime(b).getTime());
  
  // History: Completed meetings OR past meetings OR cancelled meetings in chronological order
  const completedMeetings = [...filteredMeetings.filter(m => m.isCompleted || m.isCancelled || getMeetingExactDateTime(m) < currentTime)]
    .sort((a, b) => getMeetingExactDateTime(a).getTime() - getMeetingExactDateTime(b).getTime());

  // For Master Admin, find the single latest/upcoming meeting
  const masterAdminUpcoming = scheduledMeetings[0];

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-6 py-6 md:py-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-[16px] flex items-center justify-center shrink-0 shadow-sm shadow-primary/5">
            <Calendar size={24} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight uppercase">
              Meetings & Attendance
            </h1>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-[0.15em] mt-0.5">
              Chapter schedule and attendance roster
            </p>
          </div>
        </div>

        {profile?.role === 'MASTER_ADMIN' && (
          <div className="flex items-center gap-2 bg-[#151C2E] px-4 py-2 rounded-[12px] border border-white/5 w-full md:w-auto focus-within:ring-2 focus-within:ring-primary/10 focus-within:border-primary transition-all">
            <Filter size={14} className="text-neutral-400" />
            <select
              value={selectedAdminId}
              onChange={(e) => setSelectedAdminId(e.target.value)}
              className="bg-transparent text-xs font-bold text-white outline-none flex-1 md:min-w-[150px] appearance-none cursor-pointer uppercase tracking-wider"
            >
              <option value="" className="bg-[#111827]">All Chapters</option>
              {adminAdmins.map(admin => (
                <option key={admin.uid} value={admin.uid} className="bg-[#111827]">{admin.name || admin.displayName}</option>
              ))}
            </select>
          </div>
        )}

        {isChapterAdmin && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => {
                setIsDefaultSetupOpen(true);
              }}
              className="flex items-center justify-center gap-2 h-11 px-5 bg-[#151C2E] text-white border border-white/5 rounded-[12px] text-xs font-bold uppercase tracking-wider hover:bg-[#1C2538] transition-all active:scale-95 shadow-sm"
            >
              <Settings size={14} />
              <span>Default Setup</span>
            </button>
            <button
              onClick={() => {
                setIsScheduleModalOpen(true);
                setScheduleData(prev => ({ 
                  ...prev, 
                  adminId: profile.uid
                }));
              }}
              className="flex items-center justify-center gap-2 h-11 px-5 bg-primary text-white rounded-[12px] text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-all active:scale-95 shadow-[0_2px_10px_rgba(0,0,0,0.02)] shadow-primary/10"
            >
              <Calendar size={14} />
              <span>Schedule Meeting</span>
            </button>
          </div>
        )}
      </header>

      {isPending && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-[16px] flex items-center gap-3 text-amber-400">
          <AlertCircle className="shrink-0" size={20} />
          <p className="text-sm font-medium">
            Your membership is currently <strong>PENDING</strong>. You can view meeting details, but attendance tracking may be limited until approval.
          </p>
        </div>
      )}

      {/* Main Content Area */}
      <div className="space-y-12">
        {/* 1. Upcoming Meetings */}
        {scheduledMeetings.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 bg-primary rounded-full" />
                <h2 className="text-sm font-bold text-white uppercase tracking-widest font-display">Upcoming Meetings</h2>
              </div>
              {scheduledMeetings.length > 1 && (
                <button
                  type="button"
                  onClick={() => setShowAllFutureMeetings(!showAllFutureMeetings)}
                  className="text-xs text-emerald-400 font-bold hover:text-emerald-500 hover:underline transition-all"
                >
                  {showAllFutureMeetings ? "Show Next Meeting Only" : `View All Scheduled Meetings (${scheduledMeetings.length})`}
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(showAllFutureMeetings ? scheduledMeetings : scheduledMeetings.slice(0, 1)).map((meeting) => (
                <div 
                  key={meeting.id} 
                  onClick={() => setSelectedMeeting(meeting)}
                  className={cn(
                    "bg-[#111827] p-3.5 rounded-[12px] border hover:bg-[#1C2538] transition-all flex flex-col h-full cursor-pointer",
                    selectedMeeting?.id === meeting.id ? "border-primary ring-2 ring-primary/10" : "border-white/5"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 bg-[#151C2E] rounded-lg flex items-center justify-center text-primary shrink-0">
                      <Calendar size={18} />
                    </div>
                    {(() => {
                      const status = getMeetingStatus(meeting);
                      return (
                        <span className={cn("px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest border shrink-0", status.color)}>
                          {status.label}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="space-y-1.5 mb-3 flex-grow min-w-0">
                    <h3 className="text-sm font-bold text-white uppercase tracking-tight leading-none truncate" title={format(new Date(meeting.date), 'EEEE, MMM do')}>
                      {format(new Date(meeting.date), 'EEEE, MMM do')}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-neutral-400 font-medium">
                      <Clock size={12} className="text-primary shrink-0" />
                      <span className="truncate">{formatTime12h(meeting.time || '07:30')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-neutral-400 font-medium">
                      <MapPin size={12} className="text-primary shrink-0" />
                      <span className="truncate">{meeting.location || 'Meeting Venue'}</span>
                    </div>
                  </div>
                  
                  {(isChapterAdmin || isMasterAdmin) && (
                    <div className="grid grid-cols-2 gap-2 mt-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMeeting(meeting);
                          const normalizedAttendance: Record<string, any> = {};
                          if (meeting.attendance) {
                            Object.entries(meeting.attendance).forEach(([uid, val]) => {
                              if (val === 'PRESENT') normalizedAttendance[uid] = 'Yes';
                              else if (val === 'ABSENT') normalizedAttendance[uid] = 'No';
                              else normalizedAttendance[uid] = val;
                            });
                          }
                          setTempAttendance(normalizedAttendance);
                          setTempAmount(meeting.amountCollected || {});
                          setTempMemberNotes(meeting.memberNotes || {});
                          setIsUpdateModalOpen(true);
                        }}
                        className="flex-1 py-1.5 bg-emerald-600 text-white rounded-lg text-[8px] font-bold uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] shadow-emerald-500/20"
                      >
                        <Settings size={10} />
                        Update
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMeeting(meeting);
                          setTempNotes(meeting.notes || '');
                          setIsNotesModalOpen(true);
                        }}
                        className="flex-1 py-1.5 bg-[#151C2E] text-primary border border-white/5 rounded-lg text-[8px] font-bold uppercase tracking-widest hover:bg-[#1C2538] transition-all flex items-center justify-center gap-1.5"
                      >
                        <FileText size={10} />
                        Notes
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {scheduledMeetings.length === 0 && (
          <div className="p-12 text-center bg-[#111827] rounded-[24px] border border-dashed border-white/5">
            <div className="w-12 h-12 bg-[#151C2E] rounded-full flex items-center justify-center mx-auto mb-3 text-neutral-400">
              <Calendar size={24} />
            </div>
            <h3 className="text-base font-bold text-white">No upcoming meetings</h3>
            <p className="text-xs text-neutral-400 mt-1">
              {isChapterAdmin 
                ? "Click the button above to schedule a new meeting." 
                : "Your admin hasn't scheduled any meetings yet."}
            </p>
          </div>
        )}

        {/* 2. Your Meeting History */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <div className="w-1.5 h-6 bg-secondary rounded-full" />
            <h2 className="text-sm font-bold text-white uppercase tracking-widest font-display">Your Meeting History</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Total Meetings Card */}
            <div className="bg-[#111827] p-5 rounded-[16px] border border-white/5 flex items-center gap-4">
              <div className="w-12 h-12 bg-[#151C2E] rounded-[12px] flex items-center justify-center text-neutral-400">
                <Calendar size={24} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Total Meetings</p>
                <p className="text-2xl font-bold text-white tracking-tight">{completedMeetings.length}</p>
                <p className="text-[9px] text-neutral-400 font-medium mt-1 uppercase tracking-wider">Under same chapter</p>
              </div>
            </div>

            {/* Attendance Count Card */}
            <div 
              onClick={() => setIsMemberHistoryModalOpen(true)}
              className="bg-[#111827] p-5 rounded-[16px] border border-white/5 flex items-center justify-between cursor-pointer group hover:border-primary transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-[12px] flex items-center justify-center text-emerald-400 border border-emerald-500/20 group-hover:bg-primary group-hover:text-white transition-colors">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Attendance Count</p>
                  <p className="text-2xl font-bold text-white tracking-tight">
                    {completedMeetings.filter(m => {
                      const status = m.attendance?.[profile?.uid || ''];
                      if (!status) return false;
                      const uStatus = status.toUpperCase();
                      return uStatus === 'PRESENT' || uStatus === 'YES' || uStatus === 'SUBSTITUTE';
                    }).length}
                  </p>
                  <p className="text-[9px] text-neutral-400 font-medium mt-1 uppercase tracking-wider">Meetings Attended</p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#151C2E] flex items-center justify-center text-neutral-400 group-hover:bg-primary group-hover:text-white transition-all">
                <ChevronRight size={16} />
              </div>
            </div>
          </div>

          {/* Meeting History List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedMeetings.map((meeting) => (
              <div 
                key={meeting.id} 
                onClick={() => {
                  setDetailsMeeting(meeting);
                  setIsMeetingDetailsModalOpen(true);
                }}
                className="bg-[#111827] p-4 rounded-[12px] border border-white/5 hover:bg-[#1C2538] transition-all flex flex-col cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 bg-[#151C2E] rounded-lg flex items-center justify-center text-neutral-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <Calendar size={16} />
                  </div>
                  {(() => {
                    const status = getMeetingStatus(meeting);
                    return (
                      <span className={cn("px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest border shrink-0", status.color)}>
                        {status.label}
                      </span>
                    );
                  })()}
                </div>
                <div className="space-y-1 mb-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-tight truncate">
                    {format(new Date(meeting.date), 'EEEE, MMM do yyyy')}
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-medium">
                    <Clock size={10} className="text-primary shrink-0" />
                    <span>{formatTime12h(meeting.time || '07:30')}</span>
                  </div>
                </div>
                
                {(isChapterAdmin || isMasterAdmin) && (
                  <div className="grid grid-cols-2 gap-2 mt-auto pt-2 border-t border-white/5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMeeting(meeting);
                        const normalizedAttendance: Record<string, any> = {};
                        if (meeting.attendance) {
                          Object.entries(meeting.attendance).forEach(([uid, val]) => {
                            if (val === 'PRESENT') normalizedAttendance[uid] = 'Yes';
                            else if (val === 'ABSENT') normalizedAttendance[uid] = 'No';
                            else normalizedAttendance[uid] = val;
                          });
                        }
                        setTempAttendance(normalizedAttendance);
                        setTempAmount(meeting.amountCollected || {});
                        setTempMemberNotes(meeting.memberNotes || {});
                        setIsUpdateModalOpen(true);
                      }}
                      className="py-1 bg-[#151C2E] text-white border border-white/5 rounded-lg text-[8px] font-bold uppercase tracking-widest hover:bg-emerald-500/10 hover:text-emerald-400 transition-all flex items-center justify-center gap-1"
                    >
                      <Settings size={10} />
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMeeting(meeting);
                        setTempNotes(meeting.notes || '');
                        setIsNotesModalOpen(true);
                      }}
                      className="py-1 bg-[#151C2E] text-white border border-white/5 rounded-lg text-[8px] font-bold uppercase tracking-widest hover:bg-primary/10 hover:text-primary transition-all flex items-center justify-center gap-1"
                    >
                      <FileText size={10} />
                      Notes
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Update Meeting Modal */}
      <Modal
        isOpen={isUpdateModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsUpdateModalOpen(false);
            setError(null);
            setSuccess(null);
          }
        }}
        title="Update Meeting Data"
      >
        <div className="space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-[12px] text-sm font-bold flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
          {success && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-[12px] text-sm font-bold flex items-center gap-2">
              <CheckCircle2 size={18} />
              {success}
            </div>
          )}
          <div className="p-4 bg-emerald-500/10 rounded-[16px] border border-emerald-500/20">
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Meeting Update</p>
            <p className="text-sm font-bold text-white">Update attendance and amounts</p>
          </div>

          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-[600px] px-4 sm:px-0">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="py-3 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Member</th>
                    <th className="py-3 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-center">Attendance</th>
                    <th className="py-3 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-right">Amount (₹)</th>
                    <th className="py-3 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-right">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {members.filter(m => m.adminId === selectedMeeting?.adminId || m.uid === selectedMeeting?.adminId).map((member) => {
                    const status = tempAttendance[member.uid];
                    const amount = tempAmount[member.uid] || 0;
                    const note = tempMemberNotes[member.uid] || '';
                    return (
                      <tr key={member.uid} className="hover:bg-[#1C2538] transition-colors">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <img 
                              src={member.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || '')}&background=random`} 
                              className="w-8 h-8 rounded-lg shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-white truncate">{member.name || member.displayName}</p>
                              <p className="text-[10px] text-neutral-400 truncate">{member.businessName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-center">
                          <select
                            id={`attendance-select-${member.uid}`}
                            value={status || ''}
                            onChange={(e) => setTempAttendance(prev => ({ ...prev, [member.uid]: e.target.value as any }))}
                            className={cn(
                              "px-3 py-1.5 rounded-lg border focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold transition-all bg-[#151C2E] text-white border-white/5 cursor-pointer",
                              status === 'Yes' || status === 'PRESENT' ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" :
                              status === 'No' || status === 'ABSENT' ? "border-red-500/30 text-red-400 bg-red-500/10" :
                              status === 'Substitute' ? "border-amber-500/30 text-amber-400 bg-amber-500/10" :
                              "border-white/5 text-neutral-400"
                            )}
                          >
                            <option value="" className="bg-[#111827] text-white">Select Status</option>
                            <option value="Yes" className="bg-[#111827] text-white">Yes</option>
                            <option value="No" className="bg-[#111827] text-white">No</option>
                            <option value="Substitute" className="bg-[#111827] text-white">Substitute</option>
                          </select>
                        </td>
                        <td className="py-4">
                          <input
                            type="number"
                            value={amount}
                            onChange={(e) => setTempAmount(prev => ({ ...prev, [member.uid]: parseInt(e.target.value) || 0 }))}
                            className="w-20 px-2 py-1.5 rounded-lg border border-white/5 bg-[#151C2E] focus:ring-2 focus:ring-blue-500 outline-none text-right text-sm font-bold text-white"
                          />
                        </td>
                        <td className="py-4 pl-4">
                          <input
                            type="text"
                            value={note}
                            onChange={(e) => setTempMemberNotes(prev => ({ ...prev, [member.uid]: e.target.value }))}
                            placeholder="Private note..."
                            className="w-full px-2 py-1.5 rounded-lg border border-white/5 bg-[#151C2E] focus:ring-2 focus:ring-indigo-500 outline-none text-xs text-white placeholder-neutral-500"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-emerald-500/10 rounded-[16px] border border-emerald-500/20">
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Total Present</p>
              <p className="text-xl font-bold text-emerald-400">
                {Object.values(tempAttendance).filter(s => s === 'PRESENT' || s === 'Yes' || s === 'Substitute').length}
              </p>
            </div>
            <div className="p-4 bg-[#151C2E] rounded-[16px] border border-white/5 text-right">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Total Collected</p>
              <p className="text-xl font-bold text-white">
                ₹{Object.values(tempAmount).reduce((a: number, b: number) => a + b, 0).toLocaleString()}
              </p>
            </div>
          </div>

          <button
            onClick={handleSaveUpdate}
            disabled={isSubmitting}
            className="w-full py-4 bg-primary text-white rounded-[12px] font-bold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save & Complete Meeting'}
          </button>
        </div>
      </Modal>

      {/* Master Admin Meeting Details Modal */}
      <Modal
        isOpen={isMeetingDetailsModalOpen}
        onClose={() => setIsMeetingDetailsModalOpen(false)}
        title="Meeting Member Details"
      >
        <div className="space-y-6">
          <div className="p-4 bg-[#151C2E] rounded-[16px] border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Chapter</p>
              <p className="text-sm font-bold text-white">
                {adminAdmins.find(a => a.uid === detailsMeeting?.adminId)?.name || 'Unknown Chapter'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Meeting Date</p>
              <p className="text-sm font-bold text-white">
                {detailsMeeting && format(new Date(detailsMeeting.date), 'dd MMM yyyy')}
              </p>
            </div>
          </div>

          <div className="bg-[#111827] rounded-[16px] border border-white/5 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#151C2E] border-b border-white/5">
                  <th className="px-4 py-3 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Member Name</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Status</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-right">Contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {members.filter(m => m.adminId === detailsMeeting?.adminId || m.uid === detailsMeeting?.adminId).map((member) => {
                  const status = detailsMeeting?.attendance[member.uid];
                  const amount = detailsMeeting?.amountCollected?.[member.uid] || 0;
                  return (
                    <tr key={member.uid} className="hover:bg-[#1C2538] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <img 
                            src={member.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || member.displayName || 'Member')}&background=random`} 
                            className="w-6 h-6 rounded-lg"
                            referrerPolicy="no-referrer"
                          />
                          <p className="text-xs font-bold text-white">{member.name || member.displayName || 'Unnamed Member'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const displayObj = getAttendanceDisplay(status);
                          return (
                            <span className={cn("px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border", displayObj.color)}>
                              {displayObj.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-xs font-bold text-white">₹{amount.toLocaleString()}</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-emerald-500/10 rounded-[16px] border border-emerald-500/20 flex items-center justify-between">
            <span className="text-sm font-bold text-emerald-400">Total Collected</span>
            <span className="text-lg font-bold text-emerald-400">
              ₹{Object.values(detailsMeeting?.amountCollected || {}).reduce((a: number, b: number) => a + b, 0).toLocaleString()}
            </span>
          </div>
        </div>
      </Modal>

      {/* Attendance Details Modal */}
      <Modal
        isOpen={isAttendanceDetailsOpen}
        onClose={() => setIsAttendanceDetailsOpen(false)}
        title="Attendance Details"
      >
        <div className="space-y-4">
          <div className="divide-y divide-white/5">
            {members.filter(m => m.adminId === detailsMeeting?.adminId || m.uid === detailsMeeting?.adminId).map((member) => {
              const status = detailsMeeting?.attendance[member.uid];
              return (
                <div key={member.uid} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={member.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || member.displayName || 'Member')}&background=random`} 
                      className="w-8 h-8 rounded-lg"
                      referrerPolicy="no-referrer"
                    />
                    <p className="text-sm font-bold text-white">{member.name || member.displayName || 'Unnamed Member'}</p>
                  </div>
                  {(() => {
                    const displayObj = getAttendanceDisplay(status);
                    return (
                      <span className={cn("px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border", displayObj.color)}>
                        {displayObj.label}
                      </span>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* Amount Details Modal */}
      <Modal
        isOpen={isAmountDetailsOpen}
        onClose={() => setIsAmountDetailsOpen(false)}
        title="Amount Collection Details"
      >
        <div className="space-y-4">
          <div className="divide-y divide-white/5">
            {members.filter(m => m.adminId === detailsMeeting?.adminId || m.uid === detailsMeeting?.adminId).map((member) => {
              const amount = detailsMeeting?.amountCollected?.[member.uid] || 0;
              return (
                <div key={member.uid} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={member.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || member.displayName || 'Member')}&background=random`} 
                      className="w-8 h-8 rounded-lg"
                      referrerPolicy="no-referrer"
                    />
                    <p className="text-sm font-bold text-white">{member.name || member.displayName || 'Unnamed Member'}</p>
                  </div>
                  <span className="text-sm font-bold text-white">₹{amount.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
          <div className="p-4 bg-[#151C2E] rounded-[16px] border border-white/5 flex items-center justify-between">
            <span className="text-sm font-bold text-neutral-400">Total Collected</span>
            <span className="text-lg font-bold text-white">
              ₹{Object.values(detailsMeeting?.amountCollected || {}).reduce((a: number, b: number) => a + b, 0).toLocaleString()}
            </span>
          </div>
        </div>
      </Modal>

      {/* Notes Modal */}
      <Modal
        isOpen={isNotesModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsNotesModalOpen(false);
            setError(null);
            setSuccess(null);
          }
        }}
        title="Meeting Notes"
      >
        <div className="space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-[12px] text-sm font-bold flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
          {success && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-[12px] text-sm font-bold flex items-center gap-2">
              <CheckCircle2 size={18} />
              {success}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-bold text-neutral-400">Notes & Key Points</label>
            <textarea
              value={tempNotes}
              onChange={(e) => setTempNotes(e.target.value)}
              placeholder="Enter meeting notes, discussion points, takeaways..."
              rows={8}
              className="w-full px-4 py-3 rounded-[16px] border border-white/5 bg-[#151C2E] text-white placeholder-neutral-500 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none text-sm"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setIsNotesModalOpen(false)}
              className="flex-1 px-6 py-3 bg-[#151C2E] text-white border border-white/5 rounded-[12px] font-bold hover:bg-[#1C2538] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveNotes}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-primary text-white rounded-[12px] font-bold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : <Save size={20} />}
              Save Notes
            </button>
          </div>
        </div>
      </Modal>

      {/* Default Meeting Setup Modal */}
      <Modal
        isOpen={isDefaultSetupOpen}
        onClose={() => {
          setIsDefaultSetupOpen(false);
          setError(null);
          setSuccess(null);
        }}
        title="Default Meeting Setup"
      >
        <form onSubmit={handleUpdateDefaultSetup} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-[12px] flex items-center gap-3 text-red-400 text-sm">
              <AlertCircle size={18} className="shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-[12px] flex items-center gap-3 text-emerald-400 text-sm">
              <CheckCircle2 size={18} className="shrink-0" />
              <p>{success}</p>
            </div>
          )}

          {/* Admin Info Header */}
          {(isChapterAdmin) && (
            <div className="p-4 bg-emerald-500/10 rounded-[16px] border border-emerald-500/20 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#151C2E] rounded-[12px] flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-sm">
                  <Shield size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Admin</p>
                  <p className="text-sm font-bold text-white">
                    {isChapterAdmin ? profile?.name : (adminAdmins.find(a => a.uid === defaultSetupData.adminId)?.name || 'Assigned Admin')}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Meeting Frequency</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setDefaultSetupData({ ...defaultSetupData, frequency: 'Weekly' })}
                  className={cn(
                    "py-3 rounded-[12px] border font-bold transition-all",
                    defaultSetupData.frequency === 'Weekly' 
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                      : "bg-[#151C2E] border-white/5 text-neutral-400 hover:bg-[#1C2538]"
                  )}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setDefaultSetupData({ ...defaultSetupData, frequency: 'Monthly' })}
                  className={cn(
                    "py-3 rounded-[12px] border font-bold transition-all",
                    defaultSetupData.frequency === 'Monthly' 
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                      : "bg-[#151C2E] border-white/5 text-neutral-400 hover:bg-[#1C2538]"
                  )}
                >
                  Monthly
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {defaultSetupData.frequency === 'Weekly' ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Meeting Day</label>
                  <select
                    required
                    value={defaultSetupData.day}
                    onChange={(e) => setDefaultSetupData({ ...defaultSetupData, day: e.target.value })}
                    className="w-full px-4 py-3 rounded-[12px] border border-white/5 bg-[#151C2E] text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                      <option key={day} value={day} className="bg-[#111827] text-white">{day}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Date of Month</label>
                  <select
                    required
                    value={defaultSetupData.date}
                    onChange={(e) => setDefaultSetupData({ ...defaultSetupData, date: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 rounded-[12px] border border-white/5 bg-[#151C2E] text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(date => (
                      <option key={date} value={date} className="bg-[#111827] text-white">{date}{date === 1 ? 'st' : date === 2 ? 'nd' : date === 3 ? 'rd' : 'th'}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Meeting Time</label>
                {(() => {
                  const { time: timePart, ampm: ampmPart } = parseTo12hParts(defaultSetupData.time);
                  const [selectedHour, selectedMinute] = timePart.split(':');
                  const hoursList = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
                  const minutesList = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
                  
                  const handleTimeUpdate = (hour: string, minute: string, ampm: 'AM' | 'PM') => {
                    setDefaultSetupData({ ...defaultSetupData, time: `${hour}:${minute} ${ampm}` });
                  };

                  return (
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        value={selectedHour}
                        onChange={(e) => handleTimeUpdate(e.target.value, selectedMinute, ampmPart)}
                        className="w-full px-3 py-3 rounded-[12px] border border-white/5 outline-none focus:ring-2 focus:ring-emerald-500 font-bold bg-[#151C2E] text-white text-sm"
                      >
                        {hoursList.map(h => (
                          <option key={h} value={h} className="bg-[#111827] text-white">{h}</option>
                        ))}
                      </select>
                      <select
                        value={selectedMinute}
                        onChange={(e) => handleTimeUpdate(selectedHour, e.target.value, ampmPart)}
                        className="w-full px-3 py-3 rounded-[12px] border border-white/5 outline-none focus:ring-2 focus:ring-emerald-500 font-bold bg-[#151C2E] text-white text-sm"
                      >
                        {minutesList.map(m => (
                          <option key={m} value={m} className="bg-[#111827] text-white">{m}</option>
                        ))}
                      </select>
                      <select
                        value={ampmPart}
                        onChange={(e) => handleTimeUpdate(selectedHour, selectedMinute, e.target.value as 'AM' | 'PM')}
                        className="w-full px-3 py-3 rounded-[12px] border border-white/5 outline-none focus:ring-2 focus:ring-emerald-500 font-bold bg-[#151C2E] text-white text-sm"
                      >
                        <option value="AM" className="bg-[#111827] text-white">AM</option>
                        <option value="PM" className="bg-[#111827] text-white">PM</option>
                      </select>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Venue / Location</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                <input
                  required
                  type="text"
                  placeholder="Enter meeting venue"
                  value={defaultSetupData.location}
                  onChange={(e) => setDefaultSetupData({ ...defaultSetupData, location: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 rounded-[12px] border border-white/5 bg-[#151C2E] text-white placeholder-neutral-500 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-[#151C2E] rounded-[16px] border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#111827] border border-white/5 rounded-[12px] flex items-center justify-center text-emerald-400 shadow-sm">
                <Calendar size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Enable Recurring Meetings</p>
                <p className="text-xs text-neutral-400">Automatically schedule meetings {defaultSetupData.frequency.toLowerCase()}</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={defaultSetupData.enabled}
                onChange={(e) => setDefaultSetupData({ ...defaultSetupData, enabled: e.target.checked })}
              />
              <div className="w-11 h-6 bg-[#111827] border border-white/5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-emerald-600 text-white rounded-[12px] font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/10 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save size={20} />
                Save Default Setup
              </>
            )}
          </button>
        </form>
      </Modal>

      {/* Schedule Meeting Modal */}
      <Modal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setError(null);
          setSuccess(null);
        }}
        title="Schedule New Meeting"
      >
        <form onSubmit={handleScheduleMeeting} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-[12px] flex items-center gap-3 text-red-400 text-sm">
              <AlertCircle size={18} className="shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-[12px] flex items-center gap-3 text-emerald-400 text-sm">
              <CheckCircle2 size={18} className="shrink-0" />
              <p>{success}</p>
            </div>
          )}

          {/* Admin Info Header */}
          {(isChapterAdmin) && (
            <div className="p-4 bg-emerald-500/10 rounded-[16px] border border-emerald-500/20 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#151C2E] rounded-[12px] flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-sm">
                  <Shield size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Admin</p>
                  <p className="text-sm font-bold text-white">
                    {isChapterAdmin ? profile?.name : (adminAdmins.find(a => a.uid === scheduleData.adminId)?.name || 'Assigned Admin')}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Date</label>
              <input
                required
                type="date"
                value={scheduleData.date}
                onChange={(e) => setScheduleData({ ...scheduleData, date: e.target.value })}
                className="w-full px-4 py-3 rounded-[12px] border border-white/5 bg-[#151C2E] text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Time</label>
              {(() => {
                const { time: timePart, ampm: ampmPart } = parseTo12hParts(scheduleData.time);
                const [selectedHour, selectedMinute] = timePart.split(':');
                const hoursList = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
                const minutesList = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
                
                const handleTimeUpdate = (hour: string, minute: string, ampm: 'AM' | 'PM') => {
                  setScheduleData({ ...scheduleData, time: `${hour}:${minute} ${ampm}` });
                };

                return (
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={selectedHour}
                      onChange={(e) => handleTimeUpdate(e.target.value, selectedMinute, ampmPart)}
                      className="w-full px-3 py-3 rounded-[12px] border border-white/5 outline-none focus:ring-2 focus:ring-emerald-500 font-bold bg-[#151C2E] text-white text-sm"
                    >
                      {hoursList.map(h => (
                        <option key={h} value={h} className="bg-[#111827] text-white">{h}</option>
                      ))}
                    </select>
                    <select
                      value={selectedMinute}
                      onChange={(e) => handleTimeUpdate(selectedHour, e.target.value, ampmPart)}
                      className="w-full px-3 py-3 rounded-[12px] border border-white/5 outline-none focus:ring-2 focus:ring-emerald-500 font-bold bg-[#151C2E] text-white text-sm"
                    >
                      {minutesList.map(m => (
                        <option key={m} value={m} className="bg-[#111827] text-white">{m}</option>
                      ))}
                    </select>
                    <select
                      value={ampmPart}
                      onChange={(e) => handleTimeUpdate(selectedHour, selectedMinute, e.target.value as 'AM' | 'PM')}
                      className="w-full px-3 py-3 rounded-[12px] border border-white/5 outline-none focus:ring-2 focus:ring-emerald-500 font-bold bg-[#151C2E] text-white text-sm"
                    >
                      <option value="AM" className="bg-[#111827] text-white">AM</option>
                      <option value="PM" className="bg-[#111827] text-white">PM</option>
                    </select>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Location</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
              <input
                required
                type="text"
                placeholder="Enter meeting venue"
                value={scheduleData.location}
                onChange={(e) => setScheduleData({ ...scheduleData, location: e.target.value })}
                className="w-full pl-12 pr-4 py-3 rounded-[12px] border border-white/5 bg-[#151C2E] text-white placeholder-neutral-500 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-emerald-600 text-white rounded-[12px] font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/10 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Calendar size={20} />
                Schedule Meeting
              </>
            )}
          </button>
        </form>
      </Modal>

      {/* My Attendance History Modal */}
      <Modal
        isOpen={isMemberHistoryModalOpen}
        onClose={() => setIsMemberHistoryModalOpen(false)}
        title="My Attendance History"
      >
        <div className="space-y-6">
          <div className="bg-emerald-500/10 rounded-[12px] p-4 border border-emerald-500/20">
            <p className="text-xs text-emerald-400 font-medium leading-relaxed">
              Detailed attendance data for <strong>{profile?.name || profile?.displayName}</strong>.
            </p>
          </div>

          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="py-4 px-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Date</th>
                  <th className="py-4 px-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Time</th>
                  <th className="py-4 px-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Venue</th>
                  <th className="py-4 px-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-center">Status</th>
                  <th className="py-4 px-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-right">Amount</th>
                  <th className="py-4 px-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Member</th>
                  <th className="py-4 px-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Chapter</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {completedMeetings.length > 0 ? (
                  completedMeetings.map((meeting) => {
                    const status = meeting.attendance[profile?.uid || ''];
                    const amount = meeting.amountCollected?.[profile?.uid || ''] || 0;
                    const chapterName = adminAdmins.find(a => a.uid === meeting.adminId)?.name || 'Chapter';
                    const memberName = profile?.name || profile?.displayName || 'Member';
                    
                    return (
                      <tr key={meeting.id} className="hover:bg-[#1C2538] transition-colors">
                        <td className="py-4 px-4">
                          <p className="text-sm font-bold text-white">
                            {format(new Date(meeting.date), 'dd MMM yyyy')}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-xs font-medium text-neutral-400">{formatTime12h(meeting.time || '07:30')}</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-xs font-medium text-neutral-400 truncate max-w-[150px]" title={meeting.location}>
                            {meeting.location || 'Meeting Venue'}
                          </p>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {(() => {
                            const displayObj = getAttendanceDisplay(status);
                            return (
                              <span className={cn(
                                "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                displayObj.color
                              )}>
                                {displayObj.label}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <p className="text-sm font-bold text-white">
                            ₹{amount.toLocaleString()}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-xs font-bold text-neutral-400">{memberName}</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-xs font-bold text-neutral-400">{chapterName}</p>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-[#151C2E] rounded-full flex items-center justify-center text-neutral-400 border border-white/5">
                          <Calendar size={24} />
                        </div>
                        <p className="text-sm font-bold text-neutral-400">No records found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
}
