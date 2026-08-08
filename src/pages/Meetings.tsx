import { Avatar } from '../components/Avatar';
import { supabase } from '../lib/supabaseClient';
import { getCleanFullName } from '../utils/authUtils';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Info,
  Building,
  Eye,
  ExternalLink,
  PhoneCall
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getDisplayPosition } from '../utils/authUtils';
import { databaseService } from '../services/databaseService';
import { Meeting, UserProfile, AttendanceStatus } from '../types';
import {  where, orderBy, limit  } from '../lib/database';
import { startOfWeek, endOfWeek, isSameDay, addDays, addWeeks, addMonths, setDate, isAfter, startOfDay, isBefore, isValid } from 'date-fns';
import { safeFormat as format } from '../utils/dateUtils';
import { cn } from '../lib/utils';
import { Modal } from '../components/Modal';
import { parseTimeTo24h, formatTime12h, parseTo12hParts } from '../utils/timeUtils';

export function getMeetingExactDateTime(meeting: Meeting): Date {
  if (!meeting || !meeting.date) return new Date();
  const dateStr = typeof meeting.date === 'string' ? meeting.date.split('T')[0] : '';
  let year: number, month: number, day: number;
  if (dateStr && dateStr.includes('-')) {
    const parts = dateStr.split('-').map(Number);
    year = parts[0];
    month = parts[1] - 1;
    day = parts[2];
  } else {
    const d = new Date(meeting.date);
    year = d.getFullYear();
    month = d.getMonth();
    day = d.getDate();
  }
  const { hours, minutes } = parseTimeTo24h(meeting.time || '07:30');
  return new Date(year, month, day, hours, minutes, 0, 0);
}

export function isMeetingCompleted(m: any): boolean {
  if (!m) return false;
  const s = String(m.status || '').trim().toUpperCase();
  if (['COMPLETED', 'DONE', 'CONCLUDED', 'ENDED'].includes(s)) return true;
  if (m.isCompleted === true || m.isCompleted === 'true' || m.is_completed === true || m.is_completed === 'true') return true;
  return false;
}

export function isMeetingCancelled(m: any): boolean {
  if (!m) return false;
  const s = String(m.status || '').trim().toUpperCase();
  if (s === 'CANCELLED' || s === 'CANCELED') return true;
  if (m.isCancelled === true || m.isCancelled === 'true' || m.is_cancelled === true || m.is_cancelled === 'true') return true;
  return false;
}

export function isMeetingDone(m: any): boolean {
  return isMeetingCompleted(m) || isMeetingCancelled(m);
}

export function getAttendanceDisplay(status?: string) {
  if (!status) return { label: 'Absent', color: 'bg-red-500/10 text-red-400 border border-red-500/20' };
  
  const statusUpper = status.toUpperCase();
  if (statusUpper === 'PRESENT' || statusUpper === 'YES') {
    return { label: 'Present', color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' };
  }
  if (statusUpper === 'ABSENT' || statusUpper === 'NO') {
    return { label: 'Absent', color: 'bg-red-500/10 text-red-400 border border-red-500/20' };
  }
  if (statusUpper === 'SUBSTITUTE') {
    return { label: 'Substitute', color: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' };
  }
  if (statusUpper === 'MEDICAL') {
    return { label: 'Medical', color: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' };
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
    
    for (let i = 0; i < 90; i++) {
      if (checkDate.getDay() === targetDayNum) {
        if (isAfter(checkDate, now) || isSameDay(checkDate, now)) {
          dates.push(new Date(checkDate));
          break; // Requirement 2 & 7: Create only the single first upcoming meeting occurrence
        }
      }
      checkDate = addDays(checkDate, 1);
    }
  } else {
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
        break; // Requirement 2 & 7: Create only the single first upcoming meeting occurrence
      }
    }
  }
  
  return dates;
}

async function syncDefaultMeetings(adminId: string, chapterId: string, setup: {
  frequency: 'Weekly' | 'Monthly';
  day: string;
  date: number;
  time: string;
  location: string;
  enabled: boolean;
}) {
  const targetChapterId = chapterId || adminId;
  if (!targetChapterId) return;

  let allMeetings: Meeting[] = [];
  try {
    const list = await databaseService.list<Meeting>('meetings', []);
    allMeetings = list.filter(m => {
      const mChap = m.chapter_id || (m as any).chapterId;
      const mAdmin = m.adminId || (m as any).admin_id;
      return mChap === targetChapterId || mAdmin === targetChapterId || (adminId && (mChap === adminId || mAdmin === adminId));
    });
  } catch (e) {}

  try {
    const { data: supaMeetings } = await supabase.from('meetings').select('*').or(`chapter_id.eq.${targetChapterId},admin_id.eq.${targetChapterId}${adminId ? `,chapter_id.eq.${adminId},admin_id.eq.${adminId}` : ''}`);
    if (supaMeetings && supaMeetings.length > 0) {
      const map = new Map<string, any>();
      allMeetings.forEach(m => map.set(m.id, m));
      supaMeetings.forEach((sm: any) => {
        map.set(sm.id, {
          ...map.get(sm.id),
          ...sm,
          isCompleted: sm.is_completed ?? sm.isCompleted,
          isRecurring: sm.is_recurring ?? sm.isRecurring,
          adminId: sm.admin_id ?? sm.adminId,
          chapter_id: sm.chapter_id ?? sm.chapterId
        });
      });
      allMeetings = Array.from(map.values());
    }
  } catch (e) {}

  const isDone = (m: any) => m.isCompleted === true || String(m.isCompleted) === 'true' || m.status === 'COMPLETED' || m.isCancelled === true || String(m.isCancelled) === 'true' || m.status === 'CANCELLED';

  // Requirement 3: If recurring is disabled, remove all future non-completed recurring meetings
  if (!setup.enabled) {
    const toDelete = allMeetings.filter(m => 
      !isDone(m) && 
      (m.isRecurring || (m as any).is_recurring)
    );
    for (const m of toDelete) {
      try {
        await supabase.from('meetings').delete().eq('id', m.id);
      } catch (e) {}
      try {
        await databaseService.delete('meetings', m.id);
      } catch (e) {}
    }
    return;
  }

  const occurrences = calculateOccurrences(setup.frequency, setup.day, setup.date, setup.time);
  if (occurrences.length === 0) return;

  const occurrenceDate = occurrences[0];
  const occurrenceIdsToPreserve = new Set<string>();

  const existingMeeting = allMeetings.find(m => !isDone(m) && (m.isRecurring || (m as any).is_recurring));

  if (existingMeeting) {
    const updatePayload: any = {
      time: setup.time,
      location: setup.location,
      isRecurring: true,
      chapter_id: targetChapterId,
      adminId: adminId || targetChapterId
    };
    if (!existingMeeting.date || !isValid(new Date(existingMeeting.date))) {
      updatePayload.date = occurrenceDate.toISOString();
    }
    await databaseService.update('meetings', existingMeeting.id, updatePayload);
    try {
      await supabase.from('meetings').update({
        ...(updatePayload.date ? { date: updatePayload.date } : {}),
        time: setup.time,
        location: setup.location,
        is_recurring: true,
        chapter_id: targetChapterId,
        admin_id: adminId || targetChapterId
      }).eq('id', existingMeeting.id);
    } catch (e) {}
    occurrenceIdsToPreserve.add(existingMeeting.id);
  } else {
    const sameDateMeeting = allMeetings.find(m => !isDone(m) && m.date && isSameDay(new Date(m.date), occurrenceDate));
    if (sameDateMeeting) {
      await databaseService.update('meetings', sameDateMeeting.id, { isRecurring: true });
      try {
        await supabase.from('meetings').update({ is_recurring: true }).eq('id', sameDateMeeting.id);
      } catch (e) {}
      occurrenceIdsToPreserve.add(sameDateMeeting.id);
    } else {
      const newMeeting: Omit<Meeting, 'id'> = {
        adminId: adminId || targetChapterId,
        chapter_id: targetChapterId,
        date: occurrenceDate.toISOString(),
        time: setup.time,
        location: setup.location,
        attendance: {},
        amountCollected: {},
        memberNotes: {},
        notes: '',
        isCompleted: false,
        createdAt: new Date().toISOString(),
        status: 'UPCOMING',
        isRecurring: true
      };
      const newId = await databaseService.create('meetings', newMeeting);
      if (newId) {
        occurrenceIdsToPreserve.add(newId);
      }
      try {
        await supabase.from('meetings').insert([{
          id: newId,
          admin_id: adminId || targetChapterId,
          chapter_id: targetChapterId,
          date: occurrenceDate.toISOString(),
          time: setup.time,
          location: setup.location,
          status: 'UPCOMING',
          is_recurring: true,
          created_at: new Date().toISOString()
        }]);
      } catch (e) {}
    }
  }

  // Purge any excess non-completed recurring meetings beyond the single upcoming meeting
  const obsoleteMeetings = allMeetings.filter(m => 
    !isDone(m) && 
    (m.isRecurring || (m as any).is_recurring) && 
    !occurrenceIdsToPreserve.has(m.id)
  );

  for (const m of obsoleteMeetings) {
    try {
      await supabase.from('meetings').delete().eq('id', m.id);
    } catch (e) {}
    try {
      await databaseService.delete('meetings', m.id);
    } catch (e) {}
  }
}

export function Meetings() {
  const { profile, refreshProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const urlMeetingId = searchParams.get('meetingId');

  // --- 1. All State Hooks ---
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [adminAdmins, setAdminAdmins] = useState<UserProfile[]>([]);
  const [scheduleData, setScheduleData] = useState({
    date: '',
    time: '',
    location: '',
    adminId: ''
  });

  const [isDefaultSetupOpen, setIsDefaultSetupOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [modalChapterMembers, setModalChapterMembers] = useState<UserProfile[]>([]);
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
  const [meetingGuests, setMeetingGuests] = useState<any[]>([]);
  const [tempGuestAttendance, setTempGuestAttendance] = useState<Record<string, string>>({});
  const [guestInviters, setGuestInviters] = useState<Record<string, any>>({});
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [upcomingPerPage, setUpcomingPerPage] = useState(10);

  const [defaultSetupData, setDefaultSetupData] = useState({
    adminId: '',
    frequency: 'Weekly' as 'Weekly' | 'Monthly',
    day: 'Monday',
    date: 1,
    time: '',
    location: '',
    enabled: false
  });

  const [currentTime, setCurrentTime] = useState(new Date());
  const [showAllFutureMeetings, setShowAllFutureMeetings] = useState(false);

  const [chaptersMap, setChaptersMap] = useState<Record<string, any>>({});
  const [chaptersList, setChaptersList] = useState<any[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, UserProfile>>({});
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  const [isAttendanceReportOpen, setIsAttendanceReportOpen] = useState(false);
  const [reportMeeting, setReportMeeting] = useState<Meeting | null>(null);
  const [reportGuests, setReportGuests] = useState<any[]>([]);

  const [readOnlyMeeting, setReadOnlyMeeting] = useState<Meeting | null>(null);
  const [readOnlyGuests, setReadOnlyGuests] = useState<any[]>([]);
  const [isReadOnlyModalOpen, setIsReadOnlyModalOpen] = useState(false);

  // --- 2. Roles & Active Chapter ID ---
  const isChapterAdmin = profile?.role === 'CHAPTER_ADMIN' || (profile?.role === 'MEMBER' && profile?.position === 'chapter_admin');
  const isMasterAdmin = profile?.role === 'MASTER_ADMIN';
  const isPending = profile?.membershipStatus === 'PENDING' && !isMasterAdmin;

  const userChapId = profile?.chapter_id || (profile as any)?.chapterId;
  const activeChapterId = isMasterAdmin ? selectedAdminId : userChapId;

  // --- 3. Helper Functions ---
  const getChapterName = (m: Meeting): string => {
    if (!m) return 'SSK Chapter';
    const cId = m.chapter_id;
    if (cId && chaptersMap[cId]?.chapter_name) {
      return chaptersMap[cId].chapter_name;
    }
    const adminUser = m.adminId ? usersMap[m.adminId] : null;
    if (adminUser?.chapterName) return adminUser.chapterName;
    if (adminUser?.chapter_id && chaptersMap[adminUser.chapter_id]?.chapter_name) {
      return chaptersMap[adminUser.chapter_id].chapter_name;
    }
    if (cId && usersMap[cId]?.chapterName) return usersMap[cId].chapterName;
    if (cId) {
      const matched = allUsers.find(u => u.chapter_id === cId && u.chapterName);
      if (matched?.chapterName) return matched.chapterName;
    }
    return 'SSK Chapter';
  };

  const getMeetingCanonicalChapterKey = (m: Meeting): string => {
    if (m.chapter_id) return m.chapter_id;
    if ((m as any).chapterId) return (m as any).chapterId;
    const adminUser = m.adminId ? usersMap[m.adminId] : null;
    if (adminUser?.chapter_id) return adminUser.chapter_id;
    if (adminUser?.uid) return adminUser.uid;
    const name = getChapterName(m);
    if (name && name !== 'SSK Chapter') return name;
    return m.adminId || 'unassigned';
  };

  const isDefaultSetupComplete = Boolean(
    defaultSetupData.frequency &&
    (defaultSetupData.frequency === 'Weekly' ? defaultSetupData.day : defaultSetupData.date) &&
    defaultSetupData.time &&
    defaultSetupData.location.trim()
  );

  const canUserUpdateMeeting = (meeting: Meeting | null): boolean => {
    if (!profile || !meeting) return false;
    if (profile.role === 'MASTER_ADMIN') return true;

    const isChapAdminRole = profile.role === 'CHAPTER_ADMIN' || profile.position === 'chapter_admin';
    if (!isChapAdminRole) return false;

    const userChap = profile.chapter_id || (profile as any).chapterId;
    const meetingChap = meeting.chapter_id || (meeting as any).chapterId || (meeting.adminId ? usersMap[meeting.adminId]?.chapter_id : null);

    if (userChap && meetingChap && String(userChap).trim() === String(meetingChap).trim()) {
      return true;
    }
    if (meeting.adminId && (profile.uid === meeting.adminId || profile.id === meeting.adminId)) {
      return true;
    }
    return false;
  };

  const canUserViewReport = (meeting: Meeting | null): boolean => {
    if (!profile || !meeting) return false;
    if (profile.role === 'MASTER_ADMIN') return true;

    const isChapAdminRole = profile.role === 'CHAPTER_ADMIN' || profile.position === 'chapter_admin' || (profile as any).chapter_position === 'chapter_admin';
    if (!isChapAdminRole) return false;

    const userChap = profile.chapter_id || (profile as any).chapterId;
    const meetingChap = meeting.chapter_id || (meeting as any).chapterId || (meeting.adminId ? usersMap[meeting.adminId]?.chapter_id : null);

    if (userChap && meetingChap && String(userChap).trim() === String(meetingChap).trim()) {
      return true;
    }
    if (meeting.adminId && (profile.uid === meeting.adminId || profile.id === meeting.adminId)) {
      return true;
    }
    return false;
  };

  const getMemberPositionLabel = (member: any): string => {
    if (!member) return 'Member';
    return getDisplayPosition(member.position || member.chapter_position || member.designation || member.role, member.role);
  };

  const getUserAttendanceBadge = (m: Meeting, userUid?: string) => {
    if (!userUid || !m.attendance) {
      return {
        label: 'PENDING',
        color: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20'
      };
    }

    let rawStatus = m.attendance[userUid];
    if (!rawStatus) {
      const entry = Object.entries(m.attendance).find(([k]) => k.toLowerCase() === userUid.toLowerCase());
      if (entry) rawStatus = entry[1];
    }

    if (!rawStatus) {
      return {
        label: 'PENDING',
        color: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20'
      };
    }

    const s = String(rawStatus).toUpperCase().trim();
    if (s === 'PRESENT' || s === 'YES') {
      return {
        label: 'PRESENT',
        color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      };
    }
    if (s === 'ABSENT' || s === 'NO') {
      return {
        label: 'ABSENT',
        color: 'bg-red-500/10 text-red-400 border-red-500/20'
      };
    }
    if (s === 'MEDICAL') {
      return {
        label: 'MEDICAL',
        color: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      };
    }
    if (s === 'SUBSTITUTE') {
      return {
        label: 'SUBSTITUTE',
        color: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      };
    }

    return {
      label: s,
      color: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20'
    };
  };

  const getScheduledByName = (m: Meeting): string => {
    return getChapterName(m);
  };

  // --- 4. Derived Data Collections ---
  const filteredMeetings = activeChapterId 
    ? meetings.filter(m => {
        const mChap = m.chapter_id || (m as any).chapterId;
        const mAdmin = m.adminId || (m as any).admin_id;
        const cKey = getMeetingCanonicalChapterKey(m);
        return mChap === activeChapterId || mAdmin === activeChapterId || cKey === activeChapterId || (profile?.uid && mAdmin === profile.uid);
      })
    : meetings;

  const primaryFocusMeeting = React.useMemo(() => {
    if (urlMeetingId) {
      const found = meetings.find(m => String(m.id) === String(urlMeetingId));
      if (found) return found;
    }
    const userChapIdStr = String(profile?.chapter_id || (profile as any)?.chapterId || '').trim();
    const activeMeetings = (isMasterAdmin ? meetings : filteredMeetings).filter(m => {
      if (isMeetingDone(m)) return false;
      const mChap = String(m.chapter_id || (m as any)?.chapterId || '').trim();
      return !userChapIdStr || !mChap || mChap === userChapIdStr;
    });
    if (activeMeetings.length > 0) {
      return [...activeMeetings].sort((a, b) => getMeetingExactDateTime(a).getTime() - getMeetingExactDateTime(b).getTime())[0];
    }
    return null;
  }, [meetings, filteredMeetings, urlMeetingId, profile?.chapter_id, isMasterAdmin]);

  const handleMarkUserAttendance = async (meeting: Meeting, status: 'Present' | 'Absent') => {
    if (!profile || !meeting) return;
    if (!canUserUpdateMeeting(meeting)) {
      setError("Only Chapter Admin or Position Holders can update meeting attendance.");
      return;
    }
    const uId = profile.uid || profile.id;

    const currentAttendance = { ...(meeting.attendance || {}) };
    currentAttendance[uId] = status;

    setMeetings(prev => prev.map(m => m.id === meeting.id ? { ...m, attendance: currentAttendance } : m));
    if (selectedMeeting?.id === meeting.id) {
      setSelectedMeeting(prev => prev ? { ...prev, attendance: currentAttendance } : null);
    }

    try {
      await supabase
        .from('meetings')
        .update({ attendance: currentAttendance })
        .eq('id', meeting.id);
    } catch (e) {
      console.error('Failed to update attendance in Supabase:', e);
    }

    try {
      await databaseService.update('meetings', meeting.id, { attendance: currentAttendance });
    } catch (e) {
      console.error('Failed to update attendance in local DB:', e);
    }

    window.dispatchEvent(new CustomEvent('dashboard-refresh'));
    window.dispatchEvent(new CustomEvent('profile-updated'));
    if (refreshProfile) refreshProfile();

    if (status === 'Present') {
      setSuccess('Attendance marked as Present! Growth score points awarded.');
    } else {
      setSuccess('Attendance recorded as Absent.');
    }
  };

  useEffect(() => {
    const loadChaptersAndUsers = async () => {
      try {
        const { data: chData } = await supabase.from('chapters').select('*');
        if (chData) {
          const cMap: Record<string, any> = {};
          chData.forEach(c => {
            cMap[c.id] = c;
          });
          setChaptersMap(cMap);
          setChaptersList(chData);
        }

        const { data: uData } = await supabase.from('users').select('*');
        if (uData) {
          const uMap: Record<string, UserProfile> = {};
          const uList: UserProfile[] = uData.map((row: any) => {
            const prof: UserProfile = {
              uid: row.id,
              id: row.id,
              name: row.name || row.displayName || row.full_name || 'Member',
              email: row.email,
              phone: row.phone,
              businessName: row.businessName || row.business_name || '',
              chapterName: row.chapter_name || row.chapter || '',
              category: row.category || '',
              role: row.role,
              position: row.position || '',
              membershipStatus: row.status || row.membershipStatus || 'ACTIVE',
              createdAt: row.created_at,
              photoURL: row.profile_photo,
              chapter_id: row.chapter_id,
              adminId: row.admin_id || row.adminId || row.created_by,
              status: row.status || 'ACTIVE'
            };
            uMap[row.id] = prof;
            return prof;
          });
          setUsersMap(uMap);
          setAllUsers(uList);
        }
      } catch (err) {
        console.error("Error loading chapters or users in Meetings:", err);
      }
    };

    loadChaptersAndUsers();
  }, []);

  const handleOpenReadOnlyMeetingDetails = async (meeting: Meeting) => {
    setReadOnlyMeeting(meeting);
    setIsReadOnlyModalOpen(false); // reset first
    try {
      const { data: guests } = await supabase
        .from('guest_invitations')
        .select('*')
        .eq('meeting_id', meeting.id);
      setReadOnlyGuests(guests || []);
    } catch (err) {
      console.error("Error fetching guests for read only:", err);
      setReadOnlyGuests([]);
    }
    setTimeout(() => {
      setIsReadOnlyModalOpen(true);
    }, 10);
  };

  useEffect(() => {
    const attend = searchParams.get('attend');
    const openDetails = searchParams.get('openDetails');
    if ((attend === 'true' || openDetails === 'true') && primaryFocusMeeting && !isReadOnlyModalOpen) {
      handleOpenReadOnlyMeetingDetails(primaryFocusMeeting);
    }
  }, [searchParams, primaryFocusMeeting]);

  const handleOpenAttendanceReport = async (meeting: Meeting) => {
    if (!canUserViewReport(meeting)) {
      handleOpenReadOnlyMeetingDetails(meeting);
      return;
    }
    setReportMeeting(meeting);
    setIsAttendanceReportOpen(true);
    try {
      const { data: guests } = await supabase
        .from('guest_invitations')
        .select('*')
        .eq('meeting_id', meeting.id);
      setReportGuests(guests || []);
    } catch (err) {
      console.error("Error fetching guests for report:", err);
      setReportGuests([]);
    }
  };


  useEffect(() => {
    if (isUpdateModalOpen && selectedMeeting) {
      const fetchModalData = async () => {
        try {
          // 1. Fetch meeting's chapter members directly from users table using chapter_id
          const meetingChapId = 
            selectedMeeting.chapter_id || 
            (selectedMeeting as any).chapterId || 
            (selectedMeeting.adminId ? usersMap[selectedMeeting.adminId]?.chapter_id : null) || 
            (profile?.chapter_id);

          if (meetingChapId) {
            const { data: cUsers } = await supabase
              .from('users')
              .select('*')
              .eq('chapter_id', meetingChapId);

            let fetchedList: any[] = cUsers ? [...cUsers] : [];

            // Ensure meeting's chapter admin is included if not already in fetchedList
            if (selectedMeeting.adminId) {
              const { data: adminUser } = await supabase
                .from('users')
                .select('*')
                .eq('id', selectedMeeting.adminId)
                .maybeSingle();
              if (adminUser && !fetchedList.some((u: any) => (u.id || u.uid) === (adminUser.id || adminUser.uid))) {
                fetchedList.push(adminUser);
              }
            }

            let chapterMembersList: UserProfile[] = [];
            if (fetchedList.length > 0) {
              chapterMembersList = fetchedList
                .filter((u: any) => u.role !== 'MASTER_ADMIN')
                .filter((u: any) => {
                  const st = String(u.status || u.membership_status || u.membershipStatus || 'ACTIVE').toUpperCase();
                  return st === 'ACTIVE' || st === 'APPROVED' || !u.status;
                })
                .map((u: any) => ({
                  ...u,
                  uid: u.uid || u.id,
                  id: u.id || u.uid,
                  name: getCleanFullName(u.name || u.displayName),
                  displayName: getCleanFullName(u.name || u.displayName),
                  position: u.position || u.chapter_position || '',
                  chapter_position: u.chapter_position || u.position || '',
                  role: u.role,
                  chapter_id: u.chapter_id,
                  businessName: u.business_name || u.businessName || '',
                  photoURL: u.profile_photo || u.photoURL
                }));
            } else {
              chapterMembersList = allUsers.filter(u => u.role !== 'MASTER_ADMIN' && u.chapter_id === meetingChapId);
            }

            // Sort members so Chapter Admin is listed at the top, followed by Executive Committee and Members
            const getPositionRank = (u: any) => {
              const role = String(u.role || '').toUpperCase();
              const pos = String(u.position || u.chapter_position || '').toLowerCase();
              if (role === 'CHAPTER_ADMIN' || pos === 'chapter_admin' || pos === 'chapter admin') return 1;
              if (pos === 'president') return 2;
              if (pos.includes('vice')) return 3;
              if (pos === 'secretary') return 4;
              if (pos === 'treasurer') return 5;
              return 6;
            };

            chapterMembersList.sort((a, b) => {
              const rankA = getPositionRank(a);
              const rankB = getPositionRank(b);
              if (rankA !== rankB) return rankA - rankB;
              return (a.name || '').localeCompare(b.name || '');
            });

            setModalChapterMembers(chapterMembersList);
          } else {
            setModalChapterMembers([]);
          }

          // 2. Fetch guests for this meeting
          const { data: guests } = await supabase
            .from('guest_invitations')
            .select('*')
            .eq('meeting_id', selectedMeeting.id);
            
          if (guests) {
            setMeetingGuests(guests);
            
            // Extract unique inviter IDs
            const inviterIds = [...new Set(guests.map(g => g.invited_by).filter(Boolean))];
            
            if (inviterIds.length > 0) {
              const { data: users } = await supabase
                .from('users')
                .select('*')
                .in('uid', inviterIds);
                
              if (users) {
                const invitersMap = users.reduce((acc, user) => {
                  acc[user.uid] = user;
                  return acc;
                }, {} as Record<string, any>);
                setGuestInviters(invitersMap);
              }
            }
            
            // Initialize tempGuestAttendance
            const initialGuestAttendance: Record<string, string> = {};
            guests.forEach(g => {
              if (g.status === 'Present' || g.status === 'Absent') {
                initialGuestAttendance[g.id] = g.status;
              } else if (g.attendance_status) {
                initialGuestAttendance[g.id] = g.attendance_status;
              }
            });
            setTempGuestAttendance(initialGuestAttendance);
          }
        } catch (err) {
          console.error("Error fetching modal data:", err);
        }
      };
      
      fetchModalData();
    }
  }, [isUpdateModalOpen, selectedMeeting]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000); // 10s intervals for fast real-time client updates
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (profile?.role === 'MASTER_ADMIN') {
      databaseService.list<UserProfile>('users', [where('position', '==', 'chapter_admin')]).then(setAdminAdmins);
    } else if (isChapterAdmin) {
      setAdminAdmins([profile]);
    } else if (profile?.role === 'MEMBER' && profile.chapter_id) {
      // Find the chapter admin of this member's chapter
      databaseService.list<UserProfile>('users', [
        where('chapter_id', '==', profile.chapter_id),
        where('position', '==', 'chapter_admin')
      ]).then(admins => {
        if (admins && admins.length > 0) {
          setAdminAdmins(admins);
        } else {
          // Fallback to old field
          databaseService.get<UserProfile>('users', profile.chapter_id).then(admin => {
            if (admin) setAdminAdmins([admin]);
          });
        }
      });
    }
  }, [profile, isChapterAdmin]);

  const fetchChapterMeetingVenue = async (chapterId?: string): Promise<string> => {
    let activeChapterId = chapterId || profile?.chapter_id;
    
    if (!activeChapterId && profile?.uid) {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('chapter_id')
          .eq('uid', profile.uid)
          .maybeSingle();
        if (userData?.chapter_id) {
          activeChapterId = userData.chapter_id;
        }
      } catch (e) {
        console.error("Error fetching user chapter_id:", e);
      }
    }

    if (!activeChapterId) {
      return "No Meeting Venue Configured for this Chapter.";
    }

    try {
      const { data: chapterData, error } = await supabase
        .from('chapters')
        .select('meeting_venue')
        .eq('id', activeChapterId)
        .maybeSingle();

      if (error || !chapterData) {
        return "No Meeting Venue Configured for this Chapter.";
      }

      const venue = chapterData.meeting_venue ? String(chapterData.meeting_venue).trim() : '';
      if (!venue) {
        return "No Meeting Venue Configured for this Chapter.";
      }

      return venue;
    } catch (err) {
      console.error("Error fetching chapter meeting venue:", err);
      return "No Meeting Venue Configured for this Chapter.";
    }
  };

  useEffect(() => {
    const chapterId = isMasterAdmin ? selectedAdminId : profile?.chapter_id;
    if (!chapterId && !profile?.uid) {
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
        const venue = await fetchChapterMeetingVenue(chapterId);

        let adminUserId = isChapterAdmin ? (profile?.uid || profile?.id) : null;
        if (!adminUserId && chapterId) {
          const admins = await databaseService.list<UserProfile>('users', [
            where('chapter_id', '==', chapterId),
            where('position', '==', 'chapter_admin')
          ]);
          if (admins && admins.length > 0) {
            adminUserId = admins[0].uid || admins[0].id;
          }
        }
        if (!adminUserId) adminUserId = profile?.uid || profile?.id || chapterId || '';

        let setupDataObj: any = null;
        if (adminUserId) {
          let adminProfile = await databaseService.get<UserProfile & { defaultMeetingSetup?: any, default_meeting_setup?: any }>('users', adminUserId);
          setupDataObj = adminProfile?.defaultMeetingSetup || adminProfile?.default_meeting_setup;
        }

        if (!setupDataObj && isChapterAdmin && profile) {
          setupDataObj = profile.defaultMeetingSetup || (profile as any)?.default_meeting_setup;
        }

        if (!setupDataObj && adminUserId) {
          try {
            const { data: uData } = await supabase.from('users').select('default_meeting_setup, defaultMeetingSetup').or(`id.eq.${adminUserId},uid.eq.${adminUserId}`).maybeSingle();
            if (uData) {
              setupDataObj = uData.default_meeting_setup || uData.defaultMeetingSetup;
            }
          } catch (e) {}
        }

        const isEnabled = setupDataObj && (setupDataObj.enabled === true || setupDataObj.enabled === 'true');

        if (isEnabled) {
          const setup = {
            adminId: adminUserId,
            frequency: setupDataObj.frequency || 'Weekly',
            day: setupDataObj.day || 'Monday',
            date: setupDataObj.date || 1,
            time: setupDataObj.time || '',
            location: setupDataObj.location || venue,
            enabled: true
          };
          setDefaultSetupData(setup);

          if (chapterId || adminUserId) {
            syncDefaultMeetings(adminUserId, chapterId || adminUserId || '', setup).catch(err => {
              console.error("Background default meetings sync error:", err);
            });
          }
        } else {
          const disabledSetup = {
            adminId: adminUserId,
            frequency: 'Weekly' as const,
            day: 'Monday',
            date: 1,
            time: '',
            location: '',
            enabled: false
          };
          setDefaultSetupData(disabledSetup);

          if (chapterId || adminUserId) {
            syncDefaultMeetings(adminUserId, chapterId || adminUserId || '', disabledSetup).catch(err => {
              console.error("Background default meetings disable sync error:", err);
            });
          }
        }
      } catch (err) {
        console.error("Error loading default meeting setup:", err);
      }
    };

    loadAndSyncSetup();
  }, [isMasterAdmin, selectedAdminId, isChapterAdmin, profile]);

  useEffect(() => {
    if (isScheduleModalOpen) {
      const chapterId = isMasterAdmin ? selectedAdminId : profile?.chapter_id;
      fetchChapterMeetingVenue(chapterId).then(venue => {
        setScheduleData(prev => ({
          ...prev,
          adminId: chapterId || profile?.chapter_id || '',
          location: venue
        }));
      });
    }
  }, [isScheduleModalOpen, isMasterAdmin, selectedAdminId, profile?.chapter_id]);

  useEffect(() => {
    if (!profile) return;
    
    setLoading(true);
    setFetchError(null);

    const timeoutId = setTimeout(() => {
      if (loading) {
        setLoading(false);
        console.error("Meetings loading timed out");
      }
    }, 10000);

    const userChapId = profile?.chapter_id || (profile as any)?.chapterId;
    const chapterId = isMasterAdmin ? selectedAdminId : userChapId;
    
    if (!isMasterAdmin && !chapterId) {
      // Attempt to resolve chapterId if not on profile
      supabase.from('users').select('chapter_id').eq('id', profile.uid).maybeSingle().then(({ data: uData }) => {
        const resolvedId = uData?.chapter_id;
        if (resolvedId) {
          if (refreshProfile) refreshProfile();
        } else {
          setMeetings([]);
          setLoading(false);
          clearTimeout(timeoutId);
        }
      });
    }

    const targetChapterId = chapterId || userChapId;

    const constraints = isMasterAdmin 
      ? (selectedAdminId ? [where('chapter_id', '==', selectedAdminId), orderBy('date', 'desc')] : [orderBy('date', 'desc')])
      : targetChapterId ? [where('chapter_id', '==', targetChapterId), orderBy('date', 'desc'), limit(50)] : [orderBy('date', 'desc'), limit(50)];

    const isMeetingDoneLocal = (m: Meeting) => isMeetingDone(m);

    const unsubscribe = databaseService.subscribe<Meeting>('meetings', constraints, (data) => {
      setMeetings(data);
      setFetchError(null);

      const now = new Date();
      const start = startOfWeek(now);
      const end = endOfWeek(now);
      
      const actionableMeetings = data.filter(m => !isMeetingDone(m) && getMeetingExactDateTime(m) >= startOfDay(now));
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
      setFetchError("Unable to load upcoming meetings. Please try again.");
    });

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [profile, selectedAdminId, isMasterAdmin]);

  useEffect(() => {
    // Fetch members for attendance/details
    const fetchMembers = async () => {
      try {
        const { data: usersData } = await supabase.from('users').select('*');
        if (usersData && usersData.length > 0) {
          const activeMembers = usersData
            .filter(m => m.status === 'ACTIVE' || m.membershipStatus === 'ACTIVE' || !m.status)
            .map(u => ({
              ...u,
              uid: u.uid || u.id,
              name: getCleanFullName(u.name || u.displayName),
              displayName: getCleanFullName(u.name || u.displayName)
            }));
          setMembers(activeMembers);
        } else {
          let data = await databaseService.list<UserProfile>('users', []);
          setMembers(data);
        }
      } catch (err) {
        console.error("Error fetching members:", err);
      }
    };

    fetchMembers();

    if (selectedMeeting?.id) {
      setNotes(selectedMeeting.notes || '');
    }
  }, [selectedMeeting?.id, isMasterAdmin, isChapterAdmin, profile?.uid, selectedAdminId, profile?.chapter_id]);

  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isMasterAdmin) {
      setError('Master Admin has view-only access to meetings.');
      return;
    }
    const adminId = profile?.uid || scheduleData.adminId;
    const activeChapterId = profile?.chapter_id || (profile as any)?.chapterId || (isMasterAdmin ? selectedAdminId : '');
    
    if (!adminId && !activeChapterId) {
      setError('Please select or assign an admin or chapter before scheduling a meeting.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      let finalChapterId = activeChapterId;
      if (!finalChapterId && adminId) {
        const adminUser = await databaseService.get<UserProfile>('users', adminId);
        if (adminUser?.chapter_id || (adminUser as any)?.chapterId) {
          finalChapterId = adminUser.chapter_id || (adminUser as any)?.chapterId;
        }
      }
      if (!finalChapterId && adminId) {
        const { data: cData } = await supabase.from('chapters').select('id').or(`chapter_admin_id.eq.${adminId},president_id.eq.${adminId},vice_president_id.eq.${adminId},treasurer_id.eq.${adminId}`).limit(1);
        if (cData && cData.length > 0) {
          finalChapterId = cData[0].id;
        }
      }

      const newMeeting: Omit<Meeting, 'id'> = {
        adminId: adminId || profile?.uid || '',
        chapter_id: finalChapterId || adminId,
        date: scheduleData.date,
        time: scheduleData.time,
        location: scheduleData.location,
        attendance: {},
        isCompleted: false,
      createdAt: new Date().toISOString(),
        status: 'UPCOMING'
      };

      await databaseService.create('meetings', newMeeting);
      
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));

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

  const handleOpenDefaultSetupModal = async () => {
    setError(null);
    setSuccess(null);
    const targetAdminId = isMasterAdmin ? selectedAdminId : (profile?.uid || profile?.id);
    const chapterId = isMasterAdmin ? selectedAdminId : profile?.chapter_id;
    
    let setupDataObj: any = null;

    if (targetAdminId) {
      try {
        const dbUser = await databaseService.get<any>('users', targetAdminId);
        setupDataObj = dbUser?.defaultMeetingSetup || dbUser?.default_meeting_setup;
      } catch (e) {}

      if (!setupDataObj) {
        try {
          const { data: uData } = await supabase.from('users').select('default_meeting_setup, defaultMeetingSetup').or(`id.eq.${targetAdminId},uid.eq.${targetAdminId}`).maybeSingle();
          if (uData) {
            setupDataObj = uData.default_meeting_setup || uData.defaultMeetingSetup;
          }
        } catch (e) {}
      }
    }

    if (!setupDataObj && isChapterAdmin && profile) {
      setupDataObj = profile.defaultMeetingSetup || (profile as any)?.default_meeting_setup;
    }

    const isEnabled = setupDataObj && (setupDataObj.enabled === true || setupDataObj.enabled === 'true');

    if (isEnabled) {
      setDefaultSetupData({
        adminId: targetAdminId || '',
        frequency: setupDataObj.frequency || 'Weekly',
        day: setupDataObj.day || 'Monday',
        date: setupDataObj.date || 1,
        time: setupDataObj.time || '',
        location: setupDataObj.location || '',
        enabled: true
      });
    } else {
      setDefaultSetupData({
        adminId: targetAdminId || '',
        frequency: 'Weekly',
        day: 'Monday',
        date: 1,
        time: '',
        location: '',
        enabled: false
      });
    }
    setIsDefaultSetupOpen(true);
  };

  const handleUpdateDefaultSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isMasterAdmin) {
      setError('Master Admin has view-only access to meetings.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const adminId = isChapterAdmin ? (profile?.uid || profile?.id) : defaultSetupData.adminId;
      const activeChapterId = isMasterAdmin ? selectedAdminId : profile?.chapter_id;
      
      if (!adminId) {
        throw new Error('No chapter admin associated or selected.');
      }

      // Turn OFF Recurring
      if (!defaultSetupData.enabled) {
        const disabledSetupDoc = {
          frequency: 'Weekly' as const,
          day: 'Monday',
          date: 1,
          time: '',
          location: '',
          enabled: false
        };

        await databaseService.update('users', adminId, {
          defaultMeetingSetup: disabledSetupDoc,
          default_meeting_setup: disabledSetupDoc
        });

        try {
          await supabase.from('users').update({
            default_meeting_setup: disabledSetupDoc,
            defaultMeetingSetup: disabledSetupDoc
          }).or(`id.eq.${adminId},uid.eq.${adminId}`);
        } catch (e) {}

        const targetChapterId = activeChapterId || adminId;
        await syncDefaultMeetings(adminId, targetChapterId, disabledSetupDoc);

        setDefaultSetupData({
          adminId,
          frequency: 'Weekly',
          day: 'Monday',
          date: 1,
          time: '',
          location: '',
          enabled: false
        });

        if (refreshProfile) await refreshProfile();
        window.dispatchEvent(new CustomEvent('dashboard-refresh'));

        setSuccess('Recurring meetings disabled and future meetings cleared.');
        setTimeout(() => {
          setIsDefaultSetupOpen(false);
          setSuccess(null);
        }, 1200);
        return;
      }

      // Turn ON or Update Recurring
      if (!defaultSetupData.time || !defaultSetupData.location.trim()) {
        setError('Please complete all required fields (time and location).');
        setIsSubmitting(false);
        return;
      }

      const enabledSetupDoc = {
        frequency: defaultSetupData.frequency,
        day: defaultSetupData.day,
        date: defaultSetupData.date,
        time: defaultSetupData.time,
        location: defaultSetupData.location,
        enabled: true
      };

      await databaseService.update('users', adminId, {
        defaultMeetingSetup: enabledSetupDoc,
        default_meeting_setup: enabledSetupDoc
      });

      try {
        await supabase.from('users').update({
          default_meeting_setup: enabledSetupDoc,
          defaultMeetingSetup: enabledSetupDoc
        }).or(`id.eq.${adminId},uid.eq.${adminId}`);
      } catch (e) {}

      const targetChapterId = activeChapterId || adminId;
      await syncDefaultMeetings(adminId, targetChapterId, enabledSetupDoc);

      if (refreshProfile) await refreshProfile();
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));

      setSuccess('Default setup saved successfully!');
      setTimeout(() => {
        setIsDefaultSetupOpen(false);
        setSuccess(null);
      }, 1200);
    } catch (err: any) {
      console.error('Error updating default meeting setup:', err);
      setError(err.message || 'Failed to update default setup.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveUpdate = async () => {
    if (!selectedMeeting) return;
    if (!canUserUpdateMeeting(selectedMeeting)) {
      setError("Only the Chapter Admin of this chapter can update this meeting.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const meetingChapId = selectedMeeting.chapter_id || (selectedMeeting as any).chapterId || (selectedMeeting.adminId ? usersMap[selectedMeeting.adminId]?.chapter_id : null) || profile?.chapter_id;
      const meetingMembers = modalChapterMembers.length > 0 ? modalChapterMembers : members.filter(m => {
        if (m.role === 'MASTER_ADMIN') return false;
        const mChap = m.chapter_id || (m as any)?.chapterId;
        return Boolean(mChap && meetingChapId && String(mChap).trim() === String(meetingChapId).trim());
      });
      
      // Perform validation for all members
      for (const member of meetingMembers) {
        const status = tempAttendance[member.uid];
        const amount = tempAmount[member.uid];
        
        // If amount is undefined, we assume it's 0 (as shown in the UI)
        const finalAmount = amount === undefined ? 0 : amount;

        if (!status || finalAmount === null || finalAmount === '') {
          setError(`Please complete all attendance details before updating the meeting.`);
          setIsSubmitting(false);
          return;
        }
        
        const allowedStatuses = ['Present', 'Absent', 'Substitute', 'Medical', 'PRESENT', 'ABSENT', 'SUBSTITUTE', 'MEDICAL', 'Yes', 'No', 'YES', 'NO'];
        if (!allowedStatuses.includes(status)) {
          setError(`Invalid attendance status selected for ${member.name || member.displayName || 'member'}.`);
          setIsSubmitting(false);
          return;
        }
        
        // Save the assumed 0 back to tempAmount so it gets persisted correctly
        tempAmount[member.uid] = finalAmount;
      }

      // Guest Attendance Save Logic & Validation
      if (meetingGuests.length > 0) {
        for (const guest of meetingGuests) {
          const gStatus = tempGuestAttendance[guest.id];
          const gAmount = tempAmount[guest.id];
          
          const finalGAmount = gAmount === undefined ? 0 : gAmount;
          
          if (!gStatus || finalGAmount === null || finalGAmount === '') {
            setError(`Please complete all attendance details before updating the meeting.`);
            setIsSubmitting(false);
            return;
          }
          
          tempAmount[guest.id] = finalGAmount;
        }
        for (const guest of meetingGuests) {
          const guestStatus = tempGuestAttendance[guest.id];
          if (guestStatus) {
            const updatePayload = {
              status: guestStatus,
              attendance_status: guestStatus,
              attendance_updated_by: profile?.uid,
              attendance_updated_by_name: profile?.name || profile?.full_name,
              attendance_updated_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            await supabase
              .from('guest_invitations')
              .update(updatePayload)
              .eq('id', guest.id);
              
            if (guestStatus === 'Present' && guest.status !== 'Present' && guest.attendance_status !== 'Present') {
              const inviterId = guest.invited_by;
              if (inviterId) {
                try {
                  const { data: inviterData } = await supabase
                    .from('users')
                    .select('growth_score, workspace_checklist')
                    .eq('uid', inviterId)
                    .single();
                    
                  if (inviterData) {
                    const checklist = inviterData.workspace_checklist || {};
                    const updatedChecklist = {
                      ...checklist,
                      task_invite_guest: true,
                      'Invite a New Guest': true
                    };
                    
                    await supabase
                      .from('users')
                      .update({
                        workspace_checklist: updatedChecklist
                      })
                      .or(`id.eq.${inviterId},uid.eq.${inviterId}`);
                  }
                } catch (scoreErr) {
                  console.error("Failed to update growth score for guest:", scoreErr);
                }
              }
            }
          }
        }
      }
      
      // Call backend API endpoint to validate and update meeting
      try {
        const callerId = profile?.uid || profile?.id;
        const apiRes = await fetch('/api/meetings/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            meetingId: selectedMeeting.id,
            callerId,
            attendance: tempAttendance,
            amountCollected: tempAmount,
            memberNotes: tempMemberNotes,
            isCompleted: true
          })
        });
        const text = await apiRes.text();
        let resData: any = null;
        try {
          resData = text ? JSON.parse(text) : null;
        } catch (pErr) {
          console.warn("Non-JSON API response for meeting update:", text);
        }
        if (resData && !resData.success) {
          setError(resData.message || resData.error || "Failed to update meeting.");
          setIsSubmitting(false);
          return;
        }
      } catch (apiErr) {
        console.warn("Notice: API meeting update fetch notice:", apiErr);
      }

      // Update direct Supabase table first
      const { error: dbErr } = await supabase
        .from('meetings')
        .update({
          attendance: tempAttendance,
          amount_collected: tempAmount,
          member_notes: tempMemberNotes,
          is_completed: true,
          status: 'COMPLETED',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedMeeting.id);

      if (dbErr) {
        console.error("Supabase error updating meeting attendance:", dbErr);
        setError("Failed to update meeting attendance. Please try again.");
        setIsSubmitting(false);
        return;
      }

      await databaseService.update('meetings', selectedMeeting.id, { 
        attendance: tempAttendance,
        amountCollected: tempAmount,
        memberNotes: tempMemberNotes,
        isCompleted: true,
        status: 'COMPLETED',
        updatedAt: new Date().toISOString()
      });

      // Auto-generate next recurring meeting after completion if setup is enabled
      try {
        const meetingChapId = selectedMeeting.chapter_id || (selectedMeeting as any).chapterId || profile?.chapter_id;
        const meetingAdminId = selectedMeeting.adminId || profile?.uid || '';
        if (meetingAdminId) {
          const adminProf = await databaseService.get<UserProfile & { defaultMeetingSetup?: any }>('users', meetingAdminId);
          const setupObj = adminProf?.defaultMeetingSetup;
          if (setupObj && setupObj.enabled) {
            await syncDefaultMeetings(meetingAdminId, meetingChapId || meetingAdminId, setupObj);
          }
        }
      } catch (autoErr) {
        console.error("Error generating next recurring meeting after completion:", autoErr);
      }

      if (refreshProfile) await refreshProfile();
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));

      setSuccess('Meeting attendance & collection updated successfully and moved to history!');
      setTimeout(() => {
        setIsUpdateModalOpen(false);
        setSuccess(null);
        setSelectedMeeting(null);
      }, 1500);
    } catch (err: any) {
      console.error("Error updating meeting:", err);
      setError("Failed to update meeting attendance. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedMeeting || isMasterAdmin) return;
    setIsSubmitting(true);
    try {
      await databaseService.update('meetings', selectedMeeting.id, { 
        notes: tempNotes,
        updatedAt: new Date().toISOString()
      });
      setSuccess('Meeting notes updated!');
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));
      setTimeout(() => {
        setIsNotesModalOpen(false);
        setSuccess(null);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update meeting notes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeCancelMeeting = async () => {
    if (!selectedMeeting || isMasterAdmin) return;
    if (!canUserUpdateMeeting(selectedMeeting)) {
      setError("Only the Chapter Admin of this chapter can cancel this meeting.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const meetingId = selectedMeeting.id;
      const { error: dbErr } = await supabase
        .from('meetings')
        .update({
          is_completed: false,
          is_cancelled: true,
          status: 'CANCELLED',
          updated_at: new Date().toISOString()
        })
        .eq('id', meetingId);

      if (dbErr) {
        console.error("Error cancelling meeting in Supabase:", dbErr);
        setError("Failed to cancel meeting. Please try again.");
        setIsSubmitting(false);
        return;
      }

      await databaseService.update('meetings', meetingId, {
        isCancelled: true,
        isCompleted: false,
        status: 'CANCELLED',
        updatedAt: new Date().toISOString()
      });

      setSuccess('Meeting cancelled and moved to history.');
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));
      setTimeout(() => {
        setIsCancelConfirmOpen(false);
        setIsUpdateModalOpen(false);
        setSuccess(null);
        setSelectedMeeting(null);
      }, 1200);
    } catch (err: any) {
      setError('Failed to cancel meeting. Please try again.');
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
    if (isMeetingCancelled(meeting)) {
      return { label: 'Cancelled', color: 'bg-red-500/10 text-red-400 border-red-500/20' };
    }
    if (isMeetingCompleted(meeting)) {
      return { label: 'Completed', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    }
    const now = new Date();
    const meetingDateTime = getMeetingExactDateTime(meeting);
    if (meetingDateTime < now) {
      return { label: 'UPDATE REQUIRED', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20 font-black' };
    }
    return { label: 'Upcoming', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
  };

  // History: Completed meetings OR Cancelled meetings in reverse chronological order
  const completedMeetings = React.useMemo(() => {
    const seenIds = new Set<string>();
    const rawHistory = (isMasterAdmin ? meetings : filteredMeetings)
      .filter(m => isMeetingDone(m))
      .sort((a, b) => getMeetingExactDateTime(b).getTime() - getMeetingExactDateTime(a).getTime());

    const result: Meeting[] = [];
    for (const m of rawHistory) {
      const mId = String(m.id);
      if (!seenIds.has(mId)) {
        seenIds.add(mId);
        result.push(m);
      }
    }
    return result;
  }, [meetings, filteredMeetings, isMasterAdmin]);

  // Render meeting location cleanly with links
  const renderMeetingLocation = (meeting: Meeting) => {
    const rawLoc = (meeting.location || '').trim();
    const explicitLink = (meeting as any).locationUrl || (meeting as any).mapUrl || (meeting as any).link || (meeting as any).meetingLink;
    
    const urlMatch = rawLoc.match(/https?:\/\/[^\s]+/i);
    const foundUrl = urlMatch ? urlMatch[0] : (explicitLink || (rawLoc.startsWith('http') ? rawLoc : null));

    const isOnline = rawLoc.toLowerCase().includes('zoom') || 
                     rawLoc.toLowerCase().includes('http') || 
                     rawLoc.toLowerCase().includes('meet') || 
                     rawLoc.toLowerCase().includes('teams') || 
                     rawLoc.toLowerCase().includes('online');

    if (isOnline) {
      const joinUrl = foundUrl || explicitLink;
      return (
        <div className="space-y-0.5">
          <span className="font-bold text-white text-xs block">Online Meeting</span>
          {joinUrl ? (
            <a
              href={joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-semibold"
            >
              <ExternalLink size={12} />
              Join Meeting
            </a>
          ) : (
            <span className="text-[10px] text-neutral-400 font-medium">Virtual / Online</span>
          )}
        </div>
      );
    }

    // Physical Address
    const addressText = rawLoc || 'SSK Chapter Venue';
    const mapUrl = foundUrl || explicitLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText)}`;

    return (
      <div className="space-y-0.5 max-w-[260px]">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-white truncate" title={addressText}>
          <MapPin size={13} className="text-primary shrink-0" />
          <span className="truncate">{addressText}</span>
        </div>
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-bold ml-4"
        >
          View Map
          <ExternalLink size={10} />
        </a>
      </div>
    );
  };

  // Deduplicated Upcoming & Action Required Meetings for table/list view (prevent duplicate rendering)
  const upcomingTableMeetings = React.useMemo(() => {
    const seenIds = new Set<string>();

    const rawUpcoming = (isMasterAdmin ? meetings : filteredMeetings)
      .filter(m => !isMeetingDone(m))
      .sort((a, b) => getMeetingExactDateTime(a).getTime() - getMeetingExactDateTime(b).getTime());

    const result: Meeting[] = [];
    for (const m of rawUpcoming) {
      const mId = String(m.id);
      if (!seenIds.has(mId)) {
        seenIds.add(mId);
        result.push(m);
      }
    }
    return result;
  }, [meetings, filteredMeetings, isMasterAdmin]);

  const paginatedUpcomingTableMeetings = React.useMemo(() => {
    const start = (upcomingPage - 1) * upcomingPerPage;
    return upcomingTableMeetings.slice(start, start + upcomingPerPage);
  }, [upcomingTableMeetings, upcomingPage, upcomingPerPage]);
  
  const totalUpcomingPages = Math.ceil(upcomingTableMeetings.length / upcomingPerPage);

  const renderMeetingSummary = (meeting: Meeting, guests: any[]) => {
    const meetingChapId = meeting.chapter_id || (meeting as any).chapterId || (meeting.adminId ? usersMap[meeting.adminId]?.chapter_id : null);
    const chapMembers = allUsers.filter(u => u.role !== 'MASTER_ADMIN' && meetingChapId && u.chapter_id === meetingChapId);
    const totalMembers = chapMembers.length || Object.keys(meeting.attendance || {}).length;
    
    let presentCount = 0;
    let absentCount = 0;
    let substituteCount = 0;
    let medicalCount = 0;
    
    chapMembers.forEach(m => {
      const st = (meeting.attendance?.[m.uid] || '').toUpperCase();
      if (st === 'PRESENT' || st === 'YES') {
        presentCount++;
      } else if (st === 'SUBSTITUTE') {
        substituteCount++;
        presentCount++;
      } else if (st === 'ABSENT' || st === 'NO') {
        absentCount++;
      } else if (st === 'MEDICAL') {
        medicalCount++;
      }
    });
    
    if (chapMembers.length === 0 && meeting.attendance) {
       Object.values(meeting.attendance).forEach(st => {
          const uSt = String(st).toUpperCase();
          if (uSt === 'PRESENT' || uSt === 'YES') presentCount++;
          else if (uSt === 'SUBSTITUTE') { substituteCount++; presentCount++; }
          else if (uSt === 'ABSENT' || uSt === 'NO') absentCount++;
          else if (uSt === 'MEDICAL') medicalCount++;
       });
    }

    const guestsInvited = guests.length;
    let guestsPresent = 0;
    let guestsAbsent = 0;
    
    guests.forEach(g => {
      const gSt = (g.attendance_status || g.status || '').toUpperCase();
      if (gSt === 'PRESENT' || gSt === 'YES') guestsPresent++;
      else if (gSt === 'ABSENT' || gSt === 'NO') guestsAbsent++;
    });

    let totalCollected = 0;
    if (meeting.amountCollected) {
      Object.values(meeting.amountCollected).forEach(amt => {
        totalCollected += (Number(amt) || 0);
      });
    }

    return (
      <div className="bg-[#151C2E] p-4 rounded-[16px] border border-white/5 space-y-4 mb-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Meeting Summary</h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-[#111827] p-3 rounded-[12px] border border-white/5 text-center">
            <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Total Members</p>
            <p className="text-lg font-bold text-white mt-1">{totalMembers}</p>
          </div>
          <div className="bg-emerald-500/10 p-3 rounded-[12px] border border-emerald-500/20 text-center">
            <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Present</p>
            <p className="text-lg font-bold text-emerald-400 mt-1">{presentCount}</p>
          </div>
          <div className="bg-red-500/10 p-3 rounded-[12px] border border-red-500/20 text-center">
            <p className="text-[9px] font-bold text-red-400 uppercase tracking-wider">Absent</p>
            <p className="text-lg font-bold text-red-400 mt-1">{absentCount}</p>
          </div>
          <div className="bg-blue-500/10 p-3 rounded-[12px] border border-blue-500/20 text-center">
            <p className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">Substitute</p>
            <p className="text-lg font-bold text-blue-400 mt-1">{substituteCount}</p>
          </div>
          <div className="bg-purple-500/10 p-3 rounded-[12px] border border-purple-500/20 text-center">
            <p className="text-[9px] font-bold text-purple-400 uppercase tracking-wider">Medical</p>
            <p className="text-lg font-bold text-purple-400 mt-1">{medicalCount}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#111827] p-3 rounded-[12px] border border-white/5 text-center">
            <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Guests Invited</p>
            <p className="text-lg font-bold text-white mt-1">{guestsInvited}</p>
          </div>
          <div className="bg-emerald-500/10 p-3 rounded-[12px] border border-emerald-500/20 text-center">
            <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Guest Present</p>
            <p className="text-lg font-bold text-emerald-400 mt-1">{guestsPresent}</p>
          </div>
          <div className="bg-red-500/10 p-3 rounded-[12px] border border-red-500/20 text-center">
            <p className="text-[9px] font-bold text-red-400 uppercase tracking-wider">Guest Absent</p>
            <p className="text-lg font-bold text-red-400 mt-1">{guestsAbsent}</p>
          </div>
        </div>

        <div className="bg-primary/10 p-4 rounded-[12px] border border-primary/20 flex items-center justify-between">
          <span className="text-xs font-bold text-primary uppercase tracking-wider">Total Collection</span>
          <span className="text-xl font-bold text-primary">₹{totalCollected.toLocaleString()}</span>
        </div>
      </div>
    );
  };

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
              {chaptersList.map(chap => (
                <option key={chap.id} value={chap.id} className="bg-[#111827]">{chap.chapter_name}</option>
              ))}
              {adminAdmins.filter(a => !chaptersList.some(c => c.id === a.uid || c.id === a.chapter_id)).map(admin => (
                <option key={admin.uid} value={admin.chapter_id || admin.uid} className="bg-[#111827]">{admin.chapterName || admin.name}</option>
              ))}
            </select>
          </div>
        )}

        {isChapterAdmin && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleOpenDefaultSetupModal}
              className="flex items-center justify-center gap-2 h-11 px-5 bg-[#151C2E] text-white border border-white/5 rounded-[12px] text-xs font-bold uppercase tracking-wider hover:bg-[#1C2538] transition-all active:scale-95 shadow-sm cursor-pointer"
            >
              <Settings size={14} />
              <span>Default Setup</span>
            </button>
            <button
              onClick={async () => {
                const targetChapterId = isMasterAdmin ? selectedAdminId : profile?.chapter_id;
                const venue = await fetchChapterMeetingVenue(targetChapterId);
                setScheduleData(prev => ({ 
                  ...prev, 
                  adminId: targetChapterId || profile?.chapter_id || '',
                  location: venue
                }));
                setIsScheduleModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 h-11 px-5 bg-primary text-white rounded-[12px] text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-all active:scale-95 shadow-[0_2px_10px_rgba(0,0,0,0.02)] shadow-primary/10"
            >
              <Calendar size={14} />
              <span>Schedule Meeting</span>
            </button>
          </div>
        )}
      </header>

      {fetchError && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-[16px] flex items-center justify-between text-red-400">
          <div className="flex items-center gap-3">
            <AlertCircle className="shrink-0" size={20} />
            <p className="text-sm font-medium">{fetchError}</p>
          </div>
          <button 
            type="button" 
            onClick={() => window.location.reload()} 
            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-xs font-bold rounded-lg transition-all"
          >
            Retry
          </button>
        </div>
      )}

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
        {/* PRIMARY FOCUS MEETING DETAILS CARD - Chapter Admin Only */}
        {false && primaryFocusMeeting && (
          <div className="bg-[#151C2E] p-6 sm:p-8 rounded-[24px] border border-primary/30 shadow-2xl shadow-primary/5 space-y-6 relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

            {/* Top Header Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-1.5">
                  <Building size={12} />
                  {getChapterName(primaryFocusMeeting)}
                </span>
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/20">
                  {(primaryFocusMeeting.location || '').toLowerCase().includes('zoom') || (primaryFocusMeeting.location || '').toLowerCase().includes('http') ? 'Online Meeting' : 'In-Person / Offline'}
                </span>
              </div>
              <span className={cn(
                "px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest border",
                isMeetingDone(primaryFocusMeeting) ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                primaryFocusMeeting.isCancelled ? "bg-red-500/10 text-red-400 border-red-500/20" :
                "bg-amber-500/10 text-amber-400 border-amber-500/20"
              )}>
                {isMeetingDone(primaryFocusMeeting) ? 'Completed' : primaryFocusMeeting.isCancelled ? 'Cancelled' : 'Upcoming Scheduled'}
              </span>
            </div>

            {/* Title & Host */}
            <div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white uppercase tracking-tight font-display leading-tight">
                {primaryFocusMeeting.title || primaryFocusMeeting.topic || `${getChapterName(primaryFocusMeeting)} Chapter Meeting`}
              </h2>
              <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider mt-1.5 flex items-center gap-2">
                <Users size={14} className="text-primary" />
                Hosted By: <span className="text-white font-extrabold">{getScheduledByName(primaryFocusMeeting)}</span>
              </p>
            </div>

            {/* Primary Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-[#111827]/80 p-4 sm:p-5 rounded-[18px] border border-white/5">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Calendar size={13} className="text-primary" /> Meeting Date
                </p>
                <p className="text-sm font-bold text-white">
                  {primaryFocusMeeting.date ? format(new Date(primaryFocusMeeting.date), 'EEEE, dd MMM yyyy') : 'N/A'}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Clock size={13} className="text-primary" /> Meeting Time
                </p>
                <p className="text-sm font-bold text-white">
                  {primaryFocusMeeting.time ? formatTime12h(primaryFocusMeeting.time) : '10:00 AM'}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
                  <MapPin size={13} className="text-primary" /> Location
                </p>
                <p className="text-sm font-bold text-white truncate">
                  {primaryFocusMeeting.location || 'SSK Chapter Venue'}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Shield size={13} className="text-primary" /> Meeting Type
                </p>
                <p className="text-sm font-bold text-white">
                  {(primaryFocusMeeting.location || '').toLowerCase().includes('zoom') || (primaryFocusMeeting.location || '').toLowerCase().includes('http') ? 'Online (Virtual)' : 'Offline (In-Person)'}
                </p>
              </div>
            </div>

            {/* Attendance & Management Section */}
            <div className="pt-2 border-t border-white/5">
              <div className="bg-[#111827] p-5 rounded-[18px] border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Shield size={16} className="text-primary" />
                    Chapter Meeting Management
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    As Chapter Admin, you can update attendance, status, and collection amounts for chapter members.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMeeting(primaryFocusMeeting);
                      const normalizedAttendance: Record<string, any> = {};
                      if (primaryFocusMeeting.attendance) {
                        Object.entries(primaryFocusMeeting.attendance).forEach(([uid, val]) => {
                          const v = String(val);
                          if (v === 'PRESENT' || v === 'YES' || v === 'Yes') normalizedAttendance[uid] = 'Present';
                          else if (v === 'ABSENT' || v === 'NO' || v === 'No') normalizedAttendance[uid] = 'Absent';
                          else if (v === 'SUBSTITUTE' || v === 'Substitute') normalizedAttendance[uid] = 'Substitute';
                          else if (v === 'MEDICAL' || v === 'Medical') normalizedAttendance[uid] = 'Medical';
                          else normalizedAttendance[uid] = val;
                        });
                      }
                      setTempAttendance(normalizedAttendance);
                      setTempAmount(primaryFocusMeeting.amountCollected || {});
                      setTempMemberNotes(primaryFocusMeeting.memberNotes || {});
                      setIsUpdateModalOpen(true);
                    }}
                    className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[14px] font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    <Settings size={16} />
                    Update Meeting
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenAttendanceReport(primaryFocusMeeting)}
                    className="px-5 py-3 bg-[#151C2E] hover:bg-[#1C2538] text-white border border-white/10 rounded-[14px] font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Users size={16} className="text-primary" />
                    View Attendance Roster
                  </button>
                  {canUserUpdateMeeting(primaryFocusMeeting) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMeeting(primaryFocusMeeting);
                        setIsCancelConfirmOpen(true);
                      }}
                      className="px-5 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-[14px] font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <XCircle size={16} />
                      Cancel Meeting
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECONDARY MICRO CARDS GRID - Chapter Admin Only */}
        {false && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <div className="w-1.5 h-4 bg-primary/60 rounded-full" />
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest font-display">
                Meeting Overview & Secondary Details
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Micro Card 1: Attendees */}
              <div 
                onClick={() => {
                  if (primaryFocusMeeting) {
                    handleOpenAttendanceReport(primaryFocusMeeting);
                  }
                }}
                className="p-3.5 bg-[#111827] rounded-[14px] border border-white/5 hover:border-white/20 transition-all cursor-pointer flex flex-col justify-between h-24"
              >
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                    <Users size={12} className="text-primary" /> Attendees
                  </span>
                  <ChevronRight size={12} />
                </div>
                <div>
                  <p className="text-base font-black text-white">
                    {primaryFocusMeeting ? Object.keys(primaryFocusMeeting.attendance || {}).length : 0} Members Marked
                  </p>
                  <p className="text-[10px] text-neutral-400 font-medium">Click to view full roster report</p>
                </div>
              </div>

              {/* Micro Card 2: Agenda & Notes */}
              <div 
                onClick={() => {
                  if (primaryFocusMeeting) {
                    setSelectedMeeting(primaryFocusMeeting);
                    setNotes(primaryFocusMeeting.notes || primaryFocusMeeting.description || '');
                    setIsNotesModalOpen(true);
                  }
                }}
                className="p-3.5 bg-[#111827] rounded-[14px] border border-white/5 hover:border-white/20 transition-all cursor-pointer flex flex-col justify-between h-24"
              >
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={12} className="text-primary" /> Agenda & Notes
                  </span>
                  <ChevronRight size={12} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white line-clamp-1">
                    {primaryFocusMeeting?.description || primaryFocusMeeting?.notes || 'Weekly Chapter Agenda'}
                  </p>
                  <p className="text-[10px] text-neutral-400 font-medium mt-0.5">Click to view notes</p>
                </div>
              </div>

              {/* Micro Card 3: Guests */}
              <div className="p-3.5 bg-[#111827] rounded-[14px] border border-white/5 flex flex-col justify-between h-24">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                    <UserPlus size={12} className="text-primary" /> Guests
                  </span>
                </div>
                <div>
                  <p className="text-base font-black text-white">
                    {meetingGuests.length} Guests Invited
                  </p>
                  <p className="text-[10px] text-neutral-400 font-medium">Chapter guest invitations</p>
                </div>
              </div>

              {/* Micro Card 4: Documents & Fee */}
              <div className="p-3.5 bg-[#111827] rounded-[14px] border border-white/5 flex flex-col justify-between h-24">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                    <Shield size={12} className="text-primary" /> Meeting Fee
                  </span>
                </div>
                <div>
                  <p className="text-base font-black text-emerald-400">
                    ₹{primaryFocusMeeting?.fee || 0}
                  </p>
                  <p className="text-[10px] text-neutral-400 font-medium">Fee configuration</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 1. Upcoming Meetings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-primary rounded-full" />
              <h2 className="text-sm font-bold text-white uppercase tracking-widest font-display">
                Upcoming Meetings {upcomingTableMeetings.length > 0 ? `(${upcomingTableMeetings.length})` : ''}
              </h2>
            </div>
          </div>

          {upcomingTableMeetings.length > 0 ? (
            <div className="w-full space-y-4">
              <div className="flex flex-col gap-3 sm:gap-4 w-full">
              {paginatedUpcomingTableMeetings.map((meeting) => {
                const dateFormatted = meeting.date ? format(new Date(meeting.date), 'dd MMM yyyy') : 'N/A';
                const timeFormatted = formatTime12h(meeting.time || '07:30');
                const canUpdate = canUserUpdateMeeting(meeting);
                const mStatus = getMeetingStatus(meeting);

                return (
                  <motion.div
                    key={meeting.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => handleOpenAttendanceReport(meeting)}
                    className="group bg-[#111827] border border-white/5 hover:border-white/10 rounded-xl sm:rounded-[18px] p-4 sm:p-5 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex flex-col gap-2 sm:gap-3 flex-1 min-w-0">
                      {/* Top: Status & Title */}
                      <div className="flex items-start justify-between sm:justify-start gap-3">
                        <h3 className="text-[14px] sm:text-[16px] font-black text-white uppercase tracking-wide truncate leading-tight">
                          {meeting.title || meeting.topic || `${getChapterName(meeting)} MEETING`}
                        </h3>
                        <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shrink-0", mStatus.color)}>
                          {mStatus.label}
                        </span>
                      </div>
                      
                      {/* Info: Date & Location */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-5">
                        <div className="flex items-center gap-2 text-neutral-300 text-[11px] sm:text-xs font-bold">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Calendar size={12} className="text-primary" />
                          </div>
                          <span>{dateFormatted} &middot; {timeFormatted}</span>
                        </div>
                        <div className="flex items-start sm:items-center gap-2 text-neutral-400 text-[11px] sm:text-xs font-semibold">
                          <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                            <MapPin size={12} />
                          </div>
                          <span className="truncate max-w-[200px] sm:max-w-[250px]">{meeting.location || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-2 sm:mt-0 shrink-0 w-full sm:w-auto">
                      {canUpdate ? (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMeeting(meeting);
                              const normalizedAttendance: Record<string, string> = {};
                              if (meeting.attendance) {
                                Object.entries(meeting.attendance).forEach(([uid, val]) => {
                                  const v = String(val);
                                  if (v === 'PRESENT' || v === 'YES' || v === 'Yes') normalizedAttendance[uid] = 'Present';
                                  else if (v === 'ABSENT' || v === 'NO' || v === 'No') normalizedAttendance[uid] = 'Absent';
                                  else if (v === 'SUBSTITUTE' || v === 'Substitute') normalizedAttendance[uid] = 'Substitute';
                                  else if (v === 'MEDICAL' || v === 'Medical') normalizedAttendance[uid] = 'Medical';
                                  else normalizedAttendance[uid] = String(val);
                                });
                              }
                              setTempAttendance(normalizedAttendance);
                              setTempAmount(meeting.amountCollected || {});
                              setTempMemberNotes(meeting.memberNotes || {});
                              setIsUpdateModalOpen(true);
                            }}
                            className="flex-1 sm:flex-none text-center px-4 py-2 sm:py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all"
                          >
                            Update
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMeeting(meeting);
                              setIsCancelConfirmOpen(true);
                            }}
                            className="flex-1 sm:flex-none text-center px-4 py-2 sm:py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <div className="w-full text-right sm:text-left">
                          <span className="text-[10px] text-neutral-500 italic block py-2 sm:py-0">No actions</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

              {/* Pagination */}
              {totalUpcomingPages > 1 && (
                <div className="border-t border-white/5 px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-[#151C2E]/30">
                  <span className="text-[11px] text-neutral-400">
                    Showing {(upcomingPage - 1) * upcomingPerPage + 1} to {Math.min(upcomingPage * upcomingPerPage, upcomingTableMeetings.length)} of {upcomingTableMeetings.length} meetings
                  </span>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setUpcomingPage(p => Math.max(1, p - 1))}
                      disabled={upcomingPage === 1}
                      className="px-2 py-1 text-[11px] font-medium text-white bg-[#151C2E] border border-white/10 rounded-[6px] hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    
                    <span className="px-2 py-1 text-[11px] font-bold text-white bg-primary/20 border border-primary/30 rounded-[6px]">
                      {upcomingPage}
                    </span>

                    <button
                      onClick={() => setUpcomingPage(p => Math.min(totalUpcomingPages, p + 1))}
                      disabled={upcomingPage === totalUpcomingPages}
                      className="px-2 py-1 text-[11px] font-medium text-white bg-[#151C2E] border border-white/10 rounded-[6px] hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center bg-[#111827] rounded-[20px] border border-dashed border-white/5">
              <div className="w-10 h-10 bg-[#151C2E] rounded-full flex items-center justify-center mx-auto mb-2 text-neutral-400">
                <Calendar size={20} />
              </div>
              <h3 className="text-sm font-bold text-white">No upcoming meetings scheduled.</h3>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {(isMasterAdmin || isChapterAdmin) && primaryFocusMeeting 
                  ? "The primary focus meeting is displayed above. No additional upcoming meetings are scheduled." 
                  : isChapterAdmin 
                    ? "Click the button above to schedule a new meeting." 
                    : "No upcoming meetings scheduled for this chapter."}
              </p>
            </div>
          )}
        </div>

        {/* 2. Meeting History */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <div className="w-1.5 h-6 bg-secondary rounded-full" />
            <h2 className="text-sm font-bold text-white uppercase tracking-widest font-display">Meeting History</h2>
          </div>

          {!isMasterAdmin && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Total Meetings Card */}
              <div className="bg-[#111827] p-5 rounded-[16px] border border-white/5 flex items-center gap-4">
                <div className="w-12 h-12 bg-[#151C2E] rounded-[12px] flex items-center justify-center text-neutral-400">
                  <Calendar size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Total Meetings</p>
                  <p className="text-2xl font-bold text-white tracking-tight">{completedMeetings.length}</p>
                  <p className="text-[9px] text-neutral-400 font-medium mt-1 uppercase tracking-wider">Completed / Cancelled</p>
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
          )}

          {/* Meeting History List */}
          {completedMeetings.length > 0 ? (
            <div className="bg-[#111827] rounded-[18px] border border-white/5 divide-y divide-white/5 overflow-hidden shadow-sm">
              {completedMeetings.map((meeting) => {
                const chapterName = getChapterName(meeting);
                const meetingTitle = meeting.title || meeting.topic || `${chapterName} Meeting`;
                const badge = getUserAttendanceBadge(meeting, profile?.uid || profile?.id);

                const meetingDateStr = meeting.date ? format(new Date(meeting.date), 'MMM d, yyyy') : '';
                const meetingTimeStr = meeting.time ? formatTime12h(meeting.time) : '';
                const dateTimeCombined = [meetingDateStr, meetingTimeStr].filter(Boolean).join(' · ');

                return (
                  <div
                    key={meeting.id}
                    onClick={() => handleOpenAttendanceReport(meeting)}
                    className="px-4 py-3.5 flex flex-col justify-between gap-1 hover:bg-[#151C2E] transition-colors cursor-pointer group"
                  >
                    <h4 className="text-[13px] sm:text-sm font-bold text-white uppercase tracking-tight truncate group-hover:text-primary transition-colors leading-tight">
                      {meetingTitle}
                    </h4>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-[11px] sm:text-xs text-neutral-400 font-medium truncate">
                        {dateTimeCombined}
                      </p>
                      <span className={cn("px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider border shrink-0", badge.color)}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center bg-[#111827] rounded-[20px] border border-dashed border-white/5 text-neutral-400 text-xs font-medium">
              No meeting history available for the selected view.
            </div>
          )}
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
            <p className="text-sm font-bold text-white">Update attendance and amounts for Members and Guests</p>
          </div>
          
          {/* Members Section */}
          <div className="bg-[#111827] rounded-[16px] border border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5 bg-[#151C2E]">
              <h3 className="text-sm font-bold text-white">Members</h3>
            </div>
            <div className="flex flex-col divide-y divide-white/5">
                  {(() => {
                    const meetingChapId = selectedMeeting?.chapter_id || (selectedMeeting?.adminId ? usersMap[selectedMeeting.adminId]?.chapter_id : null) || profile?.chapter_id;
                    const getPositionRank = (u: any) => {
                      const role = String(u.role || '').toUpperCase();
                      const pos = String(u.position || u.chapter_position || '').toLowerCase();
                      if (role === 'CHAPTER_ADMIN' || pos === 'chapter_admin' || pos === 'chapter admin') return 1;
                      if (pos === 'president') return 2;
                      if (pos.includes('vice')) return 3;
                      if (pos === 'secretary') return 4;
                      if (pos === 'treasurer') return 5;
                      return 6;
                    };
                    const meetingMembers = (modalChapterMembers.length > 0 ? modalChapterMembers : members.filter(m => {
                      if (m.role === 'MASTER_ADMIN') return false;
                      return Boolean(m.chapter_id && meetingChapId && String(m.chapter_id).trim() === String(meetingChapId).trim());
                    })).sort((a, b) => {
                      const rankA = getPositionRank(a);
                      const rankB = getPositionRank(b);
                      if (rankA !== rankB) return rankA - rankB;
                      return (a.name || '').localeCompare(b.name || '');
                    });

                    if (meetingMembers.length === 0) {
                      return (
                        <div className="py-6 text-center text-xs text-neutral-400 font-medium">
                          No members found for this chapter.
                        </div>
                      );
                    }

                    return meetingMembers.map((member) => {
                      const mId = member.id || member.uid;
                      const attendanceVal = tempAttendance[mId] || 'Present';
                      const amtVal = tempAmount[mId] || '';
                      
                      const getStatusColor = (status: string) => {
                        const s = String(status || '').toLowerCase();
                        if (s === 'present') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                        if (s === 'absent') return 'text-red-400 bg-red-500/10 border-red-500/20';
                        if (s === 'substitute') return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
                        if (s === 'medical') return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                        return 'text-neutral-400 bg-[#151C2E] border-white/10';
                      };
                      
                      return (
                        <div key={mId} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-3 hover:bg-[#151C2E] transition-colors group">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[13px] sm:text-sm font-bold text-white truncate group-hover:text-primary transition-colors">
                              {member.name || member.displayName || 'Unknown Member'}
                            </h4>
                            <p className="text-[10px] sm:text-[11px] text-neutral-400 font-semibold mt-0.5 truncate uppercase tracking-wider">
                              {member.position || member.chapter_position || 'Member'}
                            </p>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 w-full sm:w-auto">
                            <select
                              value={attendanceVal}
                              onChange={(e) => {
                                setTempAttendance({ ...tempAttendance, [mId]: e.target.value });
                                if (e.target.value === 'Absent' || e.target.value === 'Medical') {
                                  setTempAmount(prev => {
                                    const next = { ...prev };
                                    delete next[mId];
                                    return next;
                                  });
                                }
                              }}
                              className={cn(
                                "flex-1 sm:flex-none px-2 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-lg border outline-none appearance-none cursor-pointer text-center",
                                getStatusColor(attendanceVal)
                              )}
                            >
                              <option value="Present" className="bg-[#111827] text-white">Present</option>
                              <option value="Absent" className="bg-[#111827] text-white">Absent</option>
                              <option value="Substitute" className="bg-[#111827] text-white">Substitute</option>
                              <option value="Medical" className="bg-[#111827] text-white">Medical</option>
                            </select>
                            
                            {(attendanceVal === 'Present' || attendanceVal === 'Substitute') && (
                              <div className="relative flex-shrink-0 w-24">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500 font-bold text-[11px]">₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={amtVal}
                                  onChange={(e) => setTempAmount({ ...tempAmount, [mId]: e.target.value })}
                                  className="w-full pl-6 pr-2 py-1.5 sm:py-2 bg-black/20 border border-white/5 rounded-lg text-[11px] sm:text-xs font-bold text-white placeholder-neutral-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
          </div>
          
          {/* Guests Section */}
          <div className="bg-[#111827] rounded-[16px] border border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5 bg-[#151C2E]">
              <h3 className="text-sm font-bold text-white">Guests</h3>
            </div>
            {meetingGuests.length > 0 ? (
              <div className="flex flex-col divide-y divide-white/5">
                {meetingGuests.map((guest) => {
                  const status = tempGuestAttendance[guest.id] || '';
                  const amount = tempAmount[guest.id] || 0;
                  const inviter = guestInviters[guest.invited_by];
                  
                  return (
                    <div key={guest.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-3 hover:bg-[#151C2E] transition-colors group">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] sm:text-sm font-bold text-white truncate group-hover:text-secondary transition-colors">
                          {guest.guest_name}
                        </p>
                        <p className="text-[10px] sm:text-[11px] text-neutral-400 truncate mt-0.5 font-semibold uppercase tracking-wider">
                          Invited by {inviter?.name || guest.invited_by_name || 'Member'}{guest.invited_by_role ? ` (${guest.invited_by_role})` : inviter?.position ? ` (${inviter.position})` : ''} • {guest.business_category || 'Guest'}
                        </p>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 w-full sm:w-auto">
                        <select
                          value={status}
                          onChange={(e) => setTempGuestAttendance(prev => ({ ...prev, [guest.id]: e.target.value }))}
                          className={cn(
                            "flex-1 sm:flex-none px-2 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-lg border outline-none appearance-none cursor-pointer text-center",
                            status === 'Present' ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" :
                            status === 'Absent' ? "border-red-500/30 text-red-400 bg-red-500/10" :
                            "border-white/5 text-neutral-400 bg-[#151C2E]"
                          )}
                        >
                          <option value="" className="bg-[#111827] text-white">Select Status</option>
                          <option value="Present" className="bg-[#111827] text-white">Present</option>
                          <option value="Absent" className="bg-[#111827] text-white">Absent</option>
                        </select>
                        
                        {(status === 'Present' || status === 'Substitute') && (
                          <div className="relative flex-shrink-0 w-24">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500 font-bold text-[11px]">₹</span>
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={amount}
                              onChange={(e) => setTempAmount(prev => ({ ...prev, [guest.id]: parseInt(e.target.value) || 0 }))}
                              className="w-full pl-6 pr-2 py-1.5 sm:py-2 bg-black/20 border border-white/5 rounded-lg text-[11px] sm:text-xs font-bold text-white placeholder-neutral-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-sm font-medium text-neutral-400">
                No guests invited for this meeting.
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-emerald-500/10 rounded-[16px] border border-emerald-500/20">
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Total Present</p>
              <p className="text-xl font-bold text-emerald-400 flex items-end gap-2">
                {Object.values(tempAttendance).filter(s => ['PRESENT', 'PRESENT', 'YES', 'SUBSTITUTE'].includes(String(s).toUpperCase())).length}
                {Object.values(tempGuestAttendance).filter(s => String(s).toUpperCase() === 'PRESENT').length > 0 && (
                  <span className="text-xs text-emerald-400/70 font-medium mb-1">
                    (+{Object.values(tempGuestAttendance).filter(s => String(s).toUpperCase() === 'PRESENT').length} Guests)
                  </span>
                )}
              </p>
            </div>
            <div className="p-4 bg-[#151C2E] rounded-[16px] border border-white/5 text-right">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Total Collected</p>
              <p className="text-xl font-bold text-white">
                ₹{Object.values(tempAmount).reduce((a: number, b: any) => a + (typeof b === 'number' ? b : parseInt(String(b)) || 0), 0).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            {selectedMeeting && !isMeetingDone(selectedMeeting) && (
              <button
                type="button"
                onClick={() => setIsCancelConfirmOpen(true)}
                disabled={isSubmitting}
                className="px-4 py-4 bg-red-500/10 text-red-400 border border-red-500/20 rounded-[12px] font-bold hover:bg-red-500/20 transition-all disabled:opacity-50 uppercase tracking-widest text-xs shrink-0 cursor-pointer"
              >
                Cancel Meeting
              </button>
            )}
            <button
              onClick={handleSaveUpdate}
              disabled={isSubmitting}
              className="flex-1 py-4 bg-primary text-white rounded-[12px] font-bold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
            >
              {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save & Complete Meeting'}
            </button>
          </div>
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

          <div className="flex flex-col divide-y divide-white/5 bg-[#111827] rounded-[16px] border border-white/5 overflow-hidden">
            {members.filter(m => m.adminId === detailsMeeting?.adminId || m.uid === detailsMeeting?.adminId).map((member) => {
              const status = detailsMeeting?.attendance?.[member.uid];
              const amount = detailsMeeting?.amountCollected?.[member.uid] || 0;
              const displayObj = getAttendanceDisplay(status);
              
              return (
                <div key={member.uid} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 gap-3 hover:bg-[#1C2538] transition-colors group">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar src={member.photoURL} name={member.name || member.displayName || 'Member'} size="w-8 h-8" className="rounded-xl" fallbackClassName="rounded-xl text-xs" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] sm:text-sm font-bold text-white truncate">{member.name || member.displayName || 'Unnamed Member'}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 w-full sm:w-auto ml-11 sm:ml-0">
                    <span className={cn("px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border shrink-0", displayObj.color)}>
                      {displayObj.label}
                    </span>
                    <p className="text-xs font-bold text-white whitespace-nowrap">₹{amount.toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
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
                    <Avatar src={member.photoURL} name={member.name || member.displayName || 'Member'} size="w-8 h-8" className="rounded-lg" fallbackClassName="rounded-lg text-xs" />
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
                    <Avatar src={member.photoURL} name={member.name || member.displayName || 'Member'} size="w-8 h-8" className="rounded-lg" fallbackClassName="rounded-lg text-xs" />
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
                        onChange={(e) => handleTimeUpdate(e.target.value, selectedMinute || '00', ampmPart || 'AM')}
                        className="w-full px-3 py-3 rounded-[12px] border border-white/5 outline-none focus:ring-2 focus:ring-emerald-500 font-bold bg-[#151C2E] text-white text-sm"
                      >
                        <option value="" disabled className="bg-[#111827] text-white">HH</option>
                        {hoursList.map(h => (
                          <option key={h} value={h} className="bg-[#111827] text-white">{h}</option>
                        ))}
                      </select>
                      <select
                        value={selectedMinute}
                        onChange={(e) => handleTimeUpdate(selectedHour || '07', e.target.value, ampmPart || 'AM')}
                        className="w-full px-3 py-3 rounded-[12px] border border-white/5 outline-none focus:ring-2 focus:ring-emerald-500 font-bold bg-[#151C2E] text-white text-sm"
                      >
                        <option value="" disabled className="bg-[#111827] text-white">MM</option>
                        {minutesList.map(m => (
                          <option key={m} value={m} className="bg-[#111827] text-white">{m}</option>
                        ))}
                      </select>
                      <select
                        value={ampmPart}
                        onChange={(e) => handleTimeUpdate(selectedHour || '07', selectedMinute || '00', e.target.value as 'AM' | 'PM')}
                        className="w-full px-3 py-3 rounded-[12px] border border-white/5 outline-none focus:ring-2 focus:ring-emerald-500 font-bold bg-[#151C2E] text-white text-sm"
                      >
                        <option value="" disabled className="bg-[#111827] text-white">--</option>
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
                      onChange={(e) => handleTimeUpdate(e.target.value, selectedMinute || '00', (ampmPart as 'AM' | 'PM') || 'AM')}
                      className="w-full px-3 py-3 rounded-[12px] border border-white/5 outline-none focus:ring-2 focus:ring-emerald-500 font-bold bg-[#151C2E] text-white text-sm"
                    >
                      <option value="" disabled className="bg-[#111827] text-white">HH</option>
                      {hoursList.map(h => (
                        <option key={h} value={h} className="bg-[#111827] text-white">{h}</option>
                      ))}
                    </select>
                    <select
                      value={selectedMinute}
                      onChange={(e) => handleTimeUpdate(selectedHour || '07', e.target.value, (ampmPart as 'AM' | 'PM') || 'AM')}
                      className="w-full px-3 py-3 rounded-[12px] border border-white/5 outline-none focus:ring-2 focus:ring-emerald-500 font-bold bg-[#151C2E] text-white text-sm"
                    >
                      <option value="" disabled className="bg-[#111827] text-white">MM</option>
                      {minutesList.map(m => (
                        <option key={m} value={m} className="bg-[#111827] text-white">{m}</option>
                      ))}
                    </select>
                    <select
                      value={ampmPart}
                      onChange={(e) => handleTimeUpdate(selectedHour || '07', selectedMinute || '00', e.target.value as 'AM' | 'PM')}
                      className="w-full px-3 py-3 rounded-[12px] border border-white/5 outline-none focus:ring-2 focus:ring-emerald-500 font-bold bg-[#151C2E] text-white text-sm"
                    >
                      <option value="" disabled className="bg-[#111827] text-white">--</option>
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

          <div className="flex flex-col divide-y divide-white/5 border border-white/5 rounded-[16px] bg-[#111827] overflow-hidden">
            {completedMeetings.length > 0 ? (
              completedMeetings.map((meeting) => {
                const status = meeting.attendance[profile?.uid || ''];
                const amount = meeting.amountCollected?.[profile?.uid || ''] || 0;
                const chapterName = adminAdmins.find(a => a.uid === meeting.adminId)?.name || 'Chapter';
                
                return (
                  <div key={meeting.id} className="flex flex-col p-4 gap-3 hover:bg-[#1C2538] transition-colors group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] sm:text-sm font-bold text-white truncate">
                          {format(new Date(meeting.date), 'dd MMM yyyy')} &middot; {formatTime12h(meeting.time || '07:30')}
                        </p>
                        <p className="text-[10px] sm:text-[11px] font-semibold text-neutral-400 mt-0.5 truncate uppercase tracking-wider">
                          {chapterName}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        {(() => {
                          const displayObj = getAttendanceDisplay(status);
                          return (
                            <span className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                              displayObj.color
                            )}>
                              {displayObj.label}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-[11px] sm:text-xs">
                      <div className="flex items-center gap-1.5 text-neutral-400 font-medium truncate max-w-[200px]" title={meeting.location}>
                        <MapPin size={12} className="shrink-0" />
                        <span className="truncate">{meeting.location || 'Meeting Venue'}</span>
                      </div>
                      <div className="font-bold text-white bg-white/5 px-2.5 py-1 rounded-lg">
                        ₹{amount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center">
                <div className="w-12 h-12 bg-[#151C2E] rounded-full flex items-center justify-center text-neutral-400 border border-white/5 mx-auto mb-3">
                  <Calendar size={24} />
                </div>
                <p className="text-sm font-bold text-neutral-400">No records found</p>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Attendance Report Modal (Master Admin & View-Only Report) */}
      <Modal
        isOpen={isAttendanceReportOpen}
        onClose={() => {
          setIsAttendanceReportOpen(false);
          setReportMeeting(null);
        }}
        title="Meeting Attendance Report"
      >
        {reportMeeting ? (
          !canUserViewReport(reportMeeting) ? (
            <div className="p-6 text-center bg-red-500/10 border border-red-500/20 rounded-[16px] text-red-400 font-bold text-sm">
              Access Denied: Only the Chapter Admin for this chapter or Master Admin can view the meeting report.
            </div>
          ) : (
          <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
            {/* Meeting Header Details */}
            <div className="bg-[#151C2E] p-4 rounded-[16px] border border-white/5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Building size={14} />
                  {getChapterName(reportMeeting)}
                </span>
                {(() => {
                  const statusObj = getMeetingStatus(reportMeeting);
                  return (
                    <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border", statusObj.color)}>
                      {statusObj.label}
                    </span>
                  );
                })()}
              </div>

              <h2 className="text-lg font-bold text-white uppercase tracking-tight">
                {getChapterName(reportMeeting)} Meeting
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-neutral-300">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-primary shrink-0" />
                  <span>Date: <strong className="text-white">{format(new Date(reportMeeting.date), 'EEEE, MMMM do yyyy')}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-primary shrink-0" />
                  <span>Time: <strong className="text-white">{formatTime12h(reportMeeting.time || '07:30')}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-primary shrink-0" />
                  <span>Venue: <strong className="text-white">{reportMeeting.location || 'N/A'}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-primary shrink-0" />
                  <span>Scheduled By: <strong className="text-white">{getScheduledByName(reportMeeting)}</strong></span>
                </div>
              </div>
            </div>

            {/* Attendance Summary Stat Cards */}
            {renderMeetingSummary(reportMeeting, reportGuests)}

            {/* Member Roster Table */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Users size={14} className="text-primary" />
                Member Attendance Roster
              </h3>
              <div className="flex flex-col divide-y divide-white/5 border border-white/5 rounded-[12px] bg-[#151C2E] overflow-hidden">
                {(() => {
                  const meetingChapId = reportMeeting.chapter_id || (reportMeeting as any).chapterId || (reportMeeting.adminId ? usersMap[reportMeeting.adminId]?.chapter_id : null);
                  const members = allUsers.filter(u => u.role !== 'MASTER_ADMIN' && meetingChapId && u.chapter_id === meetingChapId);
                  
                  if (members.length === 0) {
                    return (
                      <div className="py-6 text-center text-xs text-neutral-400 font-medium">
                        No member records found for this chapter.
                      </div>
                    );
                  }
                  
                  return members.map(m => {
                    const rawStatus = reportMeeting.attendance?.[m.uid];
                    const displayStatus = getAttendanceDisplay(rawStatus);
                    const fee = reportMeeting.amountCollected?.[m.uid] || 0;
                    const note = reportMeeting.memberNotes?.[m.uid] || '-';
                    
                    return (
                      <div key={m.uid} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 gap-3 hover:bg-[#1C2538] transition-colors group">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[13px] sm:text-sm font-bold text-white truncate group-hover:text-primary transition-colors">
                            {m.name || m.displayName || 'Unnamed Member'}
                          </h4>
                          <p className="text-[10px] sm:text-[11px] text-neutral-400 font-semibold mt-0.5 truncate uppercase tracking-wider">
                            {getMemberPositionLabel(m)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-5 w-full sm:w-auto">
                          <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border inline-flex shrink-0", displayStatus.color)}>
                            {displayStatus.label}
                          </span>
                          <span className="text-[13px] font-bold text-white whitespace-nowrap">
                            ₹{Number(fee).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Guest Attendees Section */}
            {reportGuests.length > 0 && (
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <UserPlus size={14} className="text-secondary" />
                  Guest Attendees ({reportGuests.length})
                </h3>
                <div className="flex flex-col divide-y divide-white/5 border border-white/5 rounded-[12px] bg-[#151C2E] overflow-hidden">
                  {reportGuests.map(g => (
                    <div key={g.id || g.uid} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 gap-3 hover:bg-[#1C2538] transition-colors group">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[13px] sm:text-sm font-bold text-white truncate group-hover:text-secondary transition-colors">
                          {g.name || 'Guest'}
                        </h4>
                        <p className="text-[10px] sm:text-[11px] text-neutral-400 font-semibold mt-0.5 truncate uppercase tracking-wider">
                          {g.businessCategory || g.category || 'N/A'} • Inv: {g.invitedBy || 'Member'}
                        </p>
                      </div>
                      <div className="flex items-center justify-start sm:justify-end gap-2 w-full sm:w-auto mt-1 sm:mt-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-neutral-300 font-medium whitespace-nowrap">
                            {g.mobile || g.phone || 'N/A'}
                          </span>
                          {(g.mobile || g.phone) && (
                            <a href={`tel:${g.mobile || g.phone}`} className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors" title="Call Guest">
                              <PhoneCall size={12} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reportMeeting.notes && (
              <div className="p-4 bg-[#151C2E] rounded-[12px] border border-white/5 space-y-1">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Meeting Notes</h4>
                <p className="text-xs text-neutral-200 whitespace-pre-wrap leading-relaxed">{reportMeeting.notes}</p>
              </div>
            )}
          </div>
          )
        ) : (
          <div className="p-8 text-center text-neutral-400 text-xs font-medium">
            Loading attendance report data...
          </div>
        )}
      </Modal>

      {/* Read-Only Meeting Details Modal for Members */}
      <Modal
        isOpen={isReadOnlyModalOpen}
        onClose={() => {
          setIsReadOnlyModalOpen(false);
          setReadOnlyMeeting(null);
        }}
        title="MEETING DETAILS"
      >
        {readOnlyMeeting && (() => {
          const meetingChapId = readOnlyMeeting.chapter_id || (readOnlyMeeting as any).chapterId || (readOnlyMeeting.adminId ? usersMap[readOnlyMeeting.adminId]?.chapter_id : null);
          const chapterObj = meetingChapId ? chaptersMap[meetingChapId] : null;
          const scheduledBy = chapterObj?.name || chapterObj?.title || profile?.chapter_name || 'Chapter Admin';
          const chapterMembers = allUsers.filter(u => u.role !== 'MASTER_ADMIN' && meetingChapId && String(u.chapter_id || (u as any)?.chapterId).trim() === String(meetingChapId).trim());

          return (
            <div className="space-y-5">
              <div className="p-4 bg-[#151C2E] rounded-[16px] border border-white/5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400 font-bold uppercase tracking-wider">Meeting Title:</span>
                  <span className="font-bold text-white text-sm">{readOnlyMeeting.title || readOnlyMeeting.topic || 'Weekly Chapter Meeting'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400 font-bold uppercase tracking-wider">Scheduled By:</span>
                  <span className="font-bold text-primary text-xs">{scheduledBy}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400 font-bold uppercase tracking-wider">Meeting Date:</span>
                  <span className="font-bold text-white text-xs">{readOnlyMeeting.date ? format(new Date(readOnlyMeeting.date), 'EEEE, dd MMM yyyy') : 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400 font-bold uppercase tracking-wider">Meeting Time:</span>
                  <span className="font-bold text-white text-xs">{readOnlyMeeting.time ? formatTime12h(readOnlyMeeting.time) : 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400 font-bold uppercase tracking-wider">Meeting Location:</span>
                  <span className="font-bold text-white text-xs">{readOnlyMeeting.location || 'Meeting Venue'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400 font-bold uppercase tracking-wider">Status:</span>
                  <span className={cn(
                    "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border",
                    isMeetingDone(readOnlyMeeting) ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                    readOnlyMeeting.isCancelled ? "bg-red-500/10 text-red-400 border-red-500/20" :
                    "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  )}>
                    {isMeetingDone(readOnlyMeeting) ? 'Completed' : readOnlyMeeting.isCancelled ? 'Cancelled' : 'Upcoming'}
                  </span>
                </div>
              </div>

              {isMeetingDone(readOnlyMeeting) && renderMeetingSummary(readOnlyMeeting, readOnlyGuests)}



              {(readOnlyMeeting.description || readOnlyMeeting.notes) && (
                <div className="p-4 bg-[#151C2E] rounded-[16px] border border-white/5 space-y-1.5">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Description / Agenda</p>
                  <p className="text-xs text-neutral-300 font-medium leading-relaxed">{readOnlyMeeting.description || readOnlyMeeting.notes}</p>
                </div>
              )}

              {readOnlyMeeting.fee && (
                <div className="p-4 bg-emerald-500/10 rounded-[16px] border border-emerald-500/20 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Meeting Fee</span>
                  <span className="text-base font-extrabold text-white">₹{readOnlyMeeting.fee}</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsReadOnlyModalOpen(false);
                    setReadOnlyMeeting(null);
                  }}
                  className="w-full py-3 bg-[#151C2E] hover:bg-[#1C2538] text-white border border-white/10 rounded-[12px] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Cancel Meeting Confirmation Modal */}
      <Modal
        isOpen={isCancelConfirmOpen}
        onClose={() => {
          if (!isSubmitting) setIsCancelConfirmOpen(false);
        }}
        title="Cancel Meeting"
      >
        <div className="space-y-6">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-[14px] flex items-center gap-3 text-red-400">
            <AlertCircle size={20} className="shrink-0" />
            <p className="text-sm font-semibold">
              Are you sure you want to cancel this meeting?
            </p>
          </div>

          <p className="text-xs text-neutral-400">
            This meeting will be marked as CANCELLED and moved to Meeting History. This record will remain preserved in the system.
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsCancelConfirmOpen(false)}
              className="px-4 py-2.5 rounded-[12px] bg-[#151C2E] hover:bg-[#1C2538] text-neutral-300 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              CANCEL
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={executeCancelMeeting}
              className="px-4 py-2.5 rounded-[12px] bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'CONFIRM CANCELLATION'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
