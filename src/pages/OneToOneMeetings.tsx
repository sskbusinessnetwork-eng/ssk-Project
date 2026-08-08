import { Avatar } from '../components/Avatar';
import { supabase } from '../lib/supabaseClient';
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Search,
  UserPlus,
  History,
  ChevronRight,
  X,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  Settings
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { databaseService } from '../services/databaseService';
import { notificationService } from '../services/notificationService';
import { OneToOneMeeting, UserProfile } from '../types';
import { Modal } from '../components/Modal';
import { isAfter, parseISO, format as originalFormat, isValid, addDays, addWeeks, addMonths } from 'date-fns';
import { where, orderBy, collection, getDocs, query, or } from '../lib/database';
import { db } from '../lib/database';
import { cn } from '../lib/utils';
import { formatTime12h, parseTo12hParts, parseTimeTo24h } from '../utils/timeUtils';
import { getCleanFullName } from '../utils/authUtils';

const WEEKDAYS: Record<string, number> = {
  'Sunday': 0,
  'Monday': 1,
  'Tuesday': 2,
  'Wednesday': 3,
  'Thursday': 4,
  'Friday': 5,
  'Saturday': 6
};

function calculateNextOccurrenceDate(
  currentDateStr: string,
  frequency: 'daily' | 'weekly' | 'monthly',
  targetDay?: string
): string {
  try {
    const d = currentDateStr ? parseISO(currentDateStr) : new Date();
    if (!isValid(d)) return new Date().toISOString().split('T')[0];

    let nextDate: Date;
    const freqLower = (frequency || 'weekly').toLowerCase();

    if (freqLower === 'daily') {
      nextDate = addDays(d, 1);
    } else if (freqLower === 'monthly') {
      nextDate = addMonths(d, 1);
    } else {
      // weekly
      nextDate = addWeeks(d, 1);
      if (targetDay && WEEKDAYS[targetDay] !== undefined) {
        const targetDayNum = WEEKDAYS[targetDay];
        while (nextDate.getDay() !== targetDayNum) {
          nextDate = addDays(nextDate, 1);
        }
      }
    }
    return originalFormat(nextDate, 'yyyy-MM-dd');
  } catch (e) {
    console.warn("Error calculating next occurrence date:", e);
    return new Date().toISOString().split('T')[0];
  }
}

function getMeetingExactDateTime(meeting: any): Date {
  if (!meeting || !meeting.date) return new Date();
  const dateStr = typeof meeting.date === 'string' ? meeting.date.split('T')[0] : '';
  let year = 2000, month = 0, day = 1;
  if (dateStr && dateStr.includes('-')) {
    const parts = dateStr.split('-').map(Number);
    year = parts[0] || 2000;
    month = (parts[1] || 1) - 1;
    day = parts[2] || 1;
  } else {
    const d = new Date(meeting.date);
    year = d.getFullYear();
    month = d.getMonth();
    day = d.getDate();
  }
  const { hours, minutes } = parseTimeTo24h(meeting.time || '10:00 AM');
  return new Date(year, month, day, hours, minutes, 0, 0);
}

const format = (date: any, formatStr: string, options?: any) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  return isValid(d) ? originalFormat(d, formatStr, options) : 'N/A';
};

const getUserFullName = (user: any): string => {
  if (!user) return '';
  const rawName = user.full_name || user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim();
  if (!rawName) return '';
  return getCleanFullName(rawName);
};

import { getDisplayPosition } from '../utils/authUtils';

const formatUserRoleOrPosition = (user: any): string => {
  if (!user) return 'Member';
  return getDisplayPosition(user.position || user.chapter_position || user.chapterPosition, user.role);
};

const getUserFullAddress = (user: any): string => {
  if (!user) return '';

  let extra: any = {};
  const rawPhoto = user.profile_photo || user.photo_url || user.photoURL || user.profilePhoto || '';
  if (typeof rawPhoto === 'string' && rawPhoto.includes('|||')) {
    try {
      extra = JSON.parse(rawPhoto.split('|||')[1] || '{}');
    } catch (e) {
      console.warn("Failed to parse packed profile_photo JSON:", e);
    }
  }

  const pick = (...vals: any[]): string => {
    for (const v of vals) {
      if (v !== undefined && v !== null) {
        const s = String(v).trim();
        if (s && s.toLowerCase() !== 'null' && s.toLowerCase() !== 'undefined') return s;
      }
    }
    return '';
  };

  const addr = pick(user.address, extra.address, user.street, extra.street, user.business_address, extra.business_address, user.businessAddress, extra.businessAddress, user.address_line1, extra.address_line1, user.addressLine1, extra.addressLine1);
  const area = pick(user.area, extra.area, user.locality, extra.locality);
  const city = pick(user.city, extra.city, user.business_city, extra.business_city, user.businessCity, extra.businessCity);
  const state = pick(user.state, extra.state, user.business_state, extra.business_state, user.businessState, extra.businessState);
  const pincode = pick(user.pincode, extra.pincode, user.pin_code, extra.pin_code, user.pinCode, extra.pinCode, user.zip, extra.zip, user.postal_code, extra.postal_code, user.postalCode, extra.postalCode);

  const addressParts = [addr, area, city, state].filter(Boolean);

  let fullAddress = addressParts.join(', ');
  if (pincode) {
    if (fullAddress) {
      fullAddress += ` - ${pincode}`;
    } else {
      fullAddress = pincode;
    }
  }

  return fullAddress.trim();
};

export function OneToOneMeetings() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'MASTER_ADMIN';
  const isChapterAdmin = profile?.role === 'CHAPTER_ADMIN' || (profile?.role === 'MEMBER' && profile?.position === 'chapter_admin');
  const [meetings, setMeetings] = useState<OneToOneMeeting[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [allUsersList, setAllUsersList] = useState<any[]>([]);
  const [chapterMap, setChapterMap] = useState<Map<string, string>>(new Map());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyType, setHistoryType] = useState<'scheduled' | 'attended' | 'all'>('all');
  
  // Member Dropdown Tab Filter & Location Option State
  const [memberTab, setMemberTab] = useState<'my_chapter' | 'all'>('my_chapter');
  const [locationType, setLocationType] = useState<'Online' | 'My Address' | 'Member Address'>('Online');
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    participantId: '',
    date: '',
    time: '',
    venue: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Attendance & Reschedule Modal State
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [updatingMeeting, setUpdatingMeeting] = useState<OneToOneMeeting | null>(null);

  const [creatorAttendance, setCreatorAttendance] = useState<'PRESENT' | 'ABSENT'>('PRESENT');
  const [receiverAttendance, setReceiverAttendance] = useState<'PRESENT' | 'ABSENT'>('PRESENT');

  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleLocationOption, setRescheduleLocationOption] = useState<'Online Meeting' | 'My Address' | 'Selected Member Address'>('Online Meeting');


  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const updateId = params.get('update');
    const action = params.get('action');
    const openModal = params.get('openModal');

    if ((action === 'new' || openModal === 'true') && !isModalOpen) {
      handleOpenScheduleModal();
    }

    if (updateId && meetings.length > 0) {
      const meetingToUpdate = meetings.find(m => m.id === updateId);
      if (meetingToUpdate && !isAttendanceModalOpen) {
        handleOpenAttendanceModal(meetingToUpdate);
        // Clear param so it doesn't reopen
        window.history.replaceState({}, '', '/one-to-one');
      }
    }
  }, [meetings]);

  const fetchMeetingsAndUsers = async () => {
    try {
      setLoading(true);
      // 1. Fetch Users directly from Supabase
      const { data: usersData, error: uErr } = await supabase
        .from('users')
        .select('*');

      if (usersData && !uErr) {
        const processedUsers = usersData.map((doc: any) => {
          let photo = doc.profile_photo || doc.photo_url || doc.photoURL || '';
          let extraData: any = {};
          if (typeof photo === 'string' && photo.includes('|||')) {
            const parts = photo.split('|||');
            photo = parts[0];
            try {
              extraData = JSON.parse(parts[1] || '{}');
            } catch (e) {}
          }
          return {
            ...doc,
            ...extraData,
            photoURL: photo,
            profile_photo: photo,
            photo_url: photo,
            uid: doc.id
          };
        });

        setAllUsersList(processedUsers);

        const currentChapterId = profile?.chapter_id || profile?.chapterId;
        const memberList = processedUsers
          .filter((m: any) => {
            if (m.role === 'MASTER_ADMIN') return false;
            if (m.status && m.status.toUpperCase() === 'INACTIVE') return false;
            if (memberTab === 'my_chapter' && currentChapterId && profile?.role !== 'MASTER_ADMIN') {
              return String(m.chapter_id) === String(currentChapterId);
            }
            return true;
          })
          .map((doc: any) => ({ uid: doc.id, ...doc } as UserProfile));

        setMembers(memberList);
      }

      // 2. Fetch Chapters
      const { data: chaptersData } = await supabase
        .from('chapters')
        .select('*');
      
      const cmap = new Map<string, string>();
      if (chaptersData) {
        chaptersData.forEach((c: any) => {
          if (c.id && c.name) {
            cmap.set(String(c.id).trim().toLowerCase(), c.name);
            cmap.set(String(c.id).trim(), c.name);
          }
        });
        setChapterMap(cmap);
      }

      // 3. Fetch Meetings directly from Supabase
      const { data: meetingsData, error: mErr } = await supabase
        .from('one_to_one_meetings')
        .select('*')
        .order('scheduled_date', { ascending: false });

      if (meetingsData && !mErr) {
        const formattedMeetings = meetingsData.map((m: any) => {
          const senderId = m.sender_id || m.organizer_id || m.creatorId;
          const receiverId = m.receiver_id || m.member_id || (m.participant_ids && m.participant_ids[0]) || (m.participantIds && m.participantIds[0]);

          return {
            id: m.id,
            title: m.title || '1:1 Meeting',
            organizer_id: senderId,
            creatorId: senderId,
            sender_id: senderId,
            member_id: receiverId,
            receiver_id: receiverId,
            participantIds: [receiverId].filter(Boolean),
            chapter_id: m.chapter_id,
            date: m.scheduled_date || m.date || new Date().toISOString().split('T')[0],
            time: m.scheduled_time || m.meeting_time || m.time || '10:00 AM',
            venue: m.meeting_location || m.venue || 'Online Meeting',
            notes: m.notes || '',
            status: m.status || 'UPCOMING',
            attendance: m.attendance || {},
            is_recurring: m.is_recurring || false,
            recurring_schedule_id: m.recurring_schedule_id || null,
            createdAt: m.created_at || m.createdAt
          } as OneToOneMeeting;
        });

        setMeetings(formattedMeetings);
      }
    } catch (err) {
      console.error("Fetch meetings and users error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!profile) return;

    fetchMeetingsAndUsers();

    // Fetch meetings subscription
    const meetingsConstraints = (isAdmin || isChapterAdmin)
      ? [orderBy('scheduled_date', 'desc')]
      : [
          or(
            where('organizer_id', '==', profile.uid),
            where('member_id', '==', profile.uid),
            where('sender_id', '==', profile.uid),
            where('receiver_id', '==', profile.uid)
          ),
          orderBy('scheduled_date', 'desc')
        ];

    const unsubscribe = databaseService.subscribe<OneToOneMeeting>(
      'one_to_one_meetings',
      meetingsConstraints,
      () => {
        fetchMeetingsAndUsers();
      }
    );

    return () => unsubscribe();
  }, [profile, isAdmin, isChapterAdmin, memberTab]);

  // Listen for profile-updated and dashboard-refresh events
  useEffect(() => {
    const handleRefresh = () => {
      fetchMeetingsAndUsers();
    };
    window.addEventListener('profile-updated', handleRefresh);
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => {
      window.removeEventListener('profile-updated', handleRefresh);
      window.removeEventListener('dashboard-refresh', handleRefresh);
    };
  }, []);

  // Derive Logged In User Record & Chapter ID
  const currentAuthId = profile?.id || profile?.uid;
  const currentUserRecord = useMemo(() => {
    const foundInList = allUsersList.find(u => String(u.id) === String(currentAuthId) || String(u.uid) === String(currentAuthId));
    if (foundInList && getUserFullAddress(foundInList)) {
      return foundInList;
    }
    if (profile && getUserFullAddress(profile)) {
      return profile;
    }
    return foundInList || profile;
  }, [allUsersList, currentAuthId, profile]);

  // Fetch latest profile from Supabase for logged in user if needed
  useEffect(() => {
    if (!currentAuthId) return;
    supabase
      .from('users')
      .select('*')
      .eq('id', currentAuthId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (data && !error) {
          let photo = data.profile_photo || data.photo_url || data.photoURL || '';
          let extraData: any = {};
          if (typeof photo === 'string' && photo.includes('|||')) {
            const parts = photo.split('|||');
            photo = parts[0];
            try {
              extraData = JSON.parse(parts[1] || '{}');
            } catch (e) {}
          }
          const updatedUser = { ...data, ...extraData, photoURL: photo, profile_photo: photo, photo_url: photo, uid: data.id };
          setAllUsersList(prev => {
            const idx = prev.findIndex(u => String(u.id) === String(currentAuthId) || String(u.uid) === String(currentAuthId));
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = { ...next[idx], ...updatedUser };
              return next;
            }
            return [...prev, updatedUser];
          });
        }
      });
  }, [currentAuthId]);

  const currentUserId = currentUserRecord?.id || profile?.id;
  const currentUserChapterId = currentUserRecord?.chapter_id || profile?.chapter_id;

  // Derive Available Members based on Tab (My Chapter Members vs All Members)
  const availableMembers = useMemo(() => {
    return allUsersList.filter(u => {
      // Exclude MASTER_ADMIN
      if (u.role === 'MASTER_ADMIN') return false;

      // Exclude logged in user
      if (currentUserId && (String(u.id) === String(currentUserId) || String(u.uid) === String(currentUserId))) {
        return false;
      }
      if (currentAuthId && String(u.id) === String(currentAuthId)) {
        return false;
      }

      if (memberTab === 'my_chapter') {
        const myChapId = String(currentUserChapterId || profile?.chapter_id || '').trim();
        if (!myChapId) return false;
        
        const memberChapId = String(u.chapter_id || '').trim();
        if (!memberChapId) return false;

        return myChapId === memberChapId;
      }

      return true; // 'all' members
    });
  }, [allUsersList, memberTab, currentUserChapterId, currentUserId, currentAuthId]);

  // Search Filtered Members
  const filteredMembers = useMemo(() => {
    if (!searchTerm.trim()) return availableMembers;
    const q = searchTerm.toLowerCase().trim();

    return availableMembers.filter(m => {
      const fullName = (getUserFullName(m) || m.name || m.full_name || '').toLowerCase();
      const phone = (m.phone || m.contact_phone || m.whatsappNumber || m.mobile || '').toLowerCase();
      const category = (m.category || m.business_category || m.businessName || m.business_name || '').toLowerCase();
      const chapterName = (chapterMap.get(String(m.chapter_id)) || m.chapter_name || '').toLowerCase();

      return (
        fullName.includes(q) ||
        phone.includes(q) ||
        category.includes(q) ||
        chapterName.includes(q)
      );
    });
  }, [availableMembers, searchTerm, chapterMap]);

  // Addresses for location selection
  const myAddress = useMemo(() => getUserFullAddress(currentUserRecord), [currentUserRecord]);
  
  const selectedMember = useMemo(() => {
    if (!formData.participantId) return null;
    return allUsersList.find(m => String(m.id) === String(formData.participantId) || String(m.uid) === String(formData.participantId)) || null;
  }, [allUsersList, formData.participantId]);

  // Fetch latest profile from Supabase for selected member when participantId changes
  useEffect(() => {
    if (!formData.participantId) return;
    const pid = formData.participantId;
    supabase
      .from('users')
      .select('*')
      .eq('id', pid)
      .maybeSingle()
      .then(({ data, error }) => {
        if (data && !error) {
          let photo = data.profile_photo || data.photo_url || data.photoURL || '';
          let extraData: any = {};
          if (typeof photo === 'string' && photo.includes('|||')) {
            const parts = photo.split('|||');
            photo = parts[0];
            try {
              extraData = JSON.parse(parts[1] || '{}');
            } catch (e) {}
          }
          const updatedUser = { ...data, ...extraData, photoURL: photo, profile_photo: photo, photo_url: photo, uid: data.id };
          setAllUsersList(prev => {
            const idx = prev.findIndex(u => String(u.id) === String(pid) || String(u.uid) === String(pid));
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = { ...next[idx], ...updatedUser };
              return next;
            }
            return [...prev, updatedUser];
          });
        }
      });
  }, [formData.participantId]);

  const memberAddress = useMemo(() => getUserFullAddress(selectedMember), [selectedMember]);

  const handleOpenScheduleModal = () => {
    setError(null);
    setFormData({
      title: '',
      participantId: '',
      date: new Date().toISOString().split('T')[0],
      time: '10:00 AM',
      venue: 'Online Meeting',
      notes: ''
    });
    setLocationType('Online');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!formData.participantId) {
      setError('Please select a member.');
      return;
    }

    if (!formData.date) {
      setError('Please select a meeting date.');
      return;
    }

    if (!formData.time) {
      setError('Please select a meeting time.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. SENDER LOOKUP FROM USERS TABLE
      let senderRecord: any = null;

      const profileId = profile?.id || profile?.uid;
      if (profileId) {
        senderRecord = allUsersList.find(u => String(u.id) === String(profileId) || String(u.uid) === String(profileId));
      }

      if (!senderRecord) {
        const { data: authUserObj } = await supabase.auth.getUser();
        const searchCandidates = [
          profile?.id,
          profile?.uid,
          (profile as any)?.auth_user_id,
          authUserObj?.user?.id,
          profile?.phone,
          profile?.email
        ].filter(Boolean);

        for (const candidate of searchCandidates) {
          if (!candidate) continue;
          let q = supabase.from('users').select('*');
          if (typeof candidate === 'number' || (typeof candidate === 'string' && /^\d+$/.test(candidate))) {
            q = q.eq('id', candidate);
          } else {
            q = q.or(`uid.eq.${candidate},id.eq.${candidate},auth_user_id.eq.${candidate},phone.eq.${candidate},email.eq.${candidate}`);
          }
          const { data, error: qErr } = await q.maybeSingle();
          if (data && !qErr) {
            senderRecord = data;
            break;
          }
        }
      }

      if (!senderRecord || !senderRecord.id) {
        setError("Your account record was not found in the users table. Please contact your Chapter Admin.");
        setIsSubmitting(false);
        return;
      }

      const sender_id = senderRecord.id;

      // 2. RECEIVER LOOKUP FROM USERS TABLE
      let receiverRecord: any = allUsersList.find(u => String(u.id) === String(formData.participantId) || String(u.uid) === String(formData.participantId));

      if (!receiverRecord) {
        const { data: rData, error: rErr } = await supabase
          .from('users')
          .select('*')
          .eq('id', formData.participantId)
          .maybeSingle();
        if (rData && !rErr) {
          receiverRecord = rData;
        }
      }

      if (!receiverRecord || !receiverRecord.id) {
        setError("Selected member not found in users table.");
        setIsSubmitting(false);
        return;
      }

      const receiver_id = receiverRecord.id;

      // Validate both IDs exist in users table
      if (!sender_id) {
        setError("Sender account not found in users table.");
        setIsSubmitting(false);
        return;
      }

      if (!receiver_id) {
        setError("Selected member not found in users table.");
        setIsSubmitting(false);
        return;
      }

      const chapter_id = senderRecord.chapter_id || receiverRecord.chapter_id || profile?.chapter_id;

      const senderFullAddress = getUserFullAddress(senderRecord);
      const receiverFullAddress = getUserFullAddress(receiverRecord);

      let finalLocation = "Online Meeting";
      let finalLocationType = "Online Meeting";

      if (locationType === 'My Address') {
        finalLocationType = "My Address";
        if (!senderFullAddress) {
          setError("Address not available. Please update your profile.");
          setIsSubmitting(false);
          return;
        }
        finalLocation = senderFullAddress;
      } else if (locationType === 'Member Address') {
        finalLocationType = "Member's Address";
        if (!receiverFullAddress) {
          setError("Address not available. Please update your profile.");
          setIsSubmitting(false);
          return;
        }
        finalLocation = receiverFullAddress;
      } else {
        finalLocationType = "Online Meeting";
        finalLocation = "Online Meeting";
      }

      const status = 'UPCOMING';
      const meetingTitle = formData.title?.trim() || `1:1 Meeting - ${getUserFullName(senderRecord)} & ${getUserFullName(receiverRecord)}`;

      const dbPayload = {
        title: meetingTitle,
        sender_id: sender_id,
        receiver_id: receiver_id,
        organizer_id: sender_id,
        member_id: receiver_id,
        chapter_id: chapter_id,
        meeting_location: finalLocation,
        venue: finalLocation,
        meeting_type: finalLocationType,
        scheduled_date: formData.date,
        date: formData.date,
        scheduled_time: formData.time,
        time: formData.time,
        notes: formData.notes || '',
        status: status,
        created_at: new Date().toISOString()
      };

      const { error: dbErr } = await supabase
        .from('one_to_one_meetings')
        .insert([dbPayload]);

      if (dbErr) {
        console.warn("Direct insert error in one_to_one_meetings, trying databaseService fallback:", dbErr);
        await databaseService.create('one_to_one_meetings', {
          ...dbPayload,
          creatorId: sender_id,
          participantIds: [receiver_id]
        });
      }

      try {
        const senderName = profile?.name || currentUserRecord?.name || 'A member';
        await notificationService.sendNotification({
          userId: receiver_id,
          type: 'MEETING',
          title: 'One-to-One Meeting Scheduled',
          message: `Your One-to-One Meeting with ${senderName} is scheduled for ${formData.date} at ${formData.time}.`,
          relatedUserId: sender_id,
          link: '/one-to-one'
        });
      } catch (nErr) {
        console.warn("Notification error:", nErr);
      }

      window.dispatchEvent(new CustomEvent('dashboard-refresh'));
      await fetchMeetingsAndUsers();

      setShowSuccess(true);
      setFormData({ 
        title: '',
        participantId: '', 
        date: '', 
        time: '', 
        venue: '',
        notes: '' 
      });
      setLocationType('Online');
      setSearchTerm('');

      setTimeout(() => {
        setIsModalOpen(false);
        setShowSuccess(false);
      }, 1500);

    } catch (err: any) {
      console.error("Error creating one-to-one meeting:", err);
      if (err?.message?.includes('row-level security') || err?.message?.includes('RLS') || err?.message?.includes('violates row-level security policy')) {
        setError("Database Security Error: Row-Level Security (RLS) is restricting creation of meetings. Please run the provided SQL script in your Supabase SQL Editor to allow insertions.");
      } else {
        setError(err.message || "Failed to schedule meeting. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAttendanceModal = (meeting: OneToOneMeeting) => {
    const senderId = meeting.sender_id || meeting.organizer_id || meeting.creatorId;
    const isCreator = String(senderId) === String(profile?.id) || String(senderId) === String(profile?.uid) || String(senderId) === String(currentUserRecord?.id) || String(senderId) === String(currentUserRecord?.uid);

    if (!isCreator && !isAdmin) {
      return;
    }

    setUpdatingMeeting(meeting);

    const receiverId = meeting.receiver_id || meeting.member_id || (meeting.participantIds && meeting.participantIds[0]);

    const existingAttendance = meeting.attendance || {};
    setCreatorAttendance(existingAttendance[senderId] || 'PRESENT');
    if (receiverId) {
      setReceiverAttendance(existingAttendance[receiverId] || 'PRESENT');
    } else {
      setReceiverAttendance('PRESENT');
    }

    setRescheduleDate(meeting.date || new Date().toISOString().split('T')[0]);
    setRescheduleTime(meeting.time || '10:00 AM');
    
    let locOpt: 'Online Meeting' | 'My Address' | 'Selected Member Address' = 'Online Meeting';
    if (meeting.venue === 'My Address' || meeting.venue?.startsWith('My Address')) {
      locOpt = 'My Address';
    } else if (meeting.venue === 'Member Address' || meeting.venue?.includes("Member's Address") || meeting.venue?.includes("Selected Member Address")) {
      locOpt = 'Selected Member Address';
    }
    setRescheduleLocationOption(locOpt);

    setError(null);
    setIsAttendanceModalOpen(true);
  };

  const handleMarkAsCompleted = async () => {
    if (!updatingMeeting || !updatingMeeting.id) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const senderId = updatingMeeting.sender_id || updatingMeeting.organizer_id || updatingMeeting.creatorId;
      const receiverId = updatingMeeting.receiver_id || updatingMeeting.member_id || (updatingMeeting.participantIds && updatingMeeting.participantIds[0]);

      const attendancePayload: Record<string, 'PRESENT' | 'ABSENT'> = {};
      if (senderId) attendancePayload[senderId] = creatorAttendance;
      if (receiverId) attendancePayload[receiverId] = receiverAttendance;

      const payload = {
        attendance: attendancePayload,
        status: 'COMPLETED',
        updated_at: new Date().toISOString()
      };

      const { error: dbErr } = await supabase
        .from('one_to_one_meetings')
        .update(payload)
        .eq('id', updatingMeeting.id);

      if (dbErr) {
        console.warn("Direct update error, trying databaseService fallback:", dbErr);
        await databaseService.update('one_to_one_meetings', updatingMeeting.id, payload);
      }

      await fetchMeetingsAndUsers();
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));

      setIsAttendanceModalOpen(false);
      setUpdatingMeeting(null);
    } catch (err: any) {
      console.error("Error marking meeting as completed:", err);
      setError(err.message || "Failed to mark as completed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNotCompleted = async () => {
    if (!updatingMeeting || !updatingMeeting.id) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const senderId = updatingMeeting.sender_id || updatingMeeting.organizer_id || updatingMeeting.creatorId;
      const receiverId = updatingMeeting.receiver_id || updatingMeeting.member_id || (updatingMeeting.participantIds && updatingMeeting.participantIds[0]);

      const attendancePayload: Record<string, 'PRESENT' | 'ABSENT'> = {};
      if (senderId) attendancePayload[senderId] = creatorAttendance;
      if (receiverId) attendancePayload[receiverId] = receiverAttendance;

      const payload = {
        attendance: attendancePayload,
        status: 'NOT_COMPLETED',
        updated_at: new Date().toISOString()
      };

      const { error: dbErr } = await supabase
        .from('one_to_one_meetings')
        .update(payload)
        .eq('id', updatingMeeting.id);

      if (dbErr) {
        console.warn("Direct update error, trying databaseService fallback:", dbErr);
        await databaseService.update('one_to_one_meetings', updatingMeeting.id, payload);
      }

      await fetchMeetingsAndUsers();
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));

      setIsAttendanceModalOpen(false);
      setUpdatingMeeting(null);
    } catch (err: any) {
      console.error("Error setting meeting as not completed:", err);
      setError(err.message || "Failed to update meeting status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelMeeting = async () => {
    if (!updatingMeeting || !updatingMeeting.id) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        status: 'CANCELLED',
        updated_at: new Date().toISOString()
      };

      const { error: dbErr } = await supabase
        .from('one_to_one_meetings')
        .update(payload)
        .eq('id', updatingMeeting.id);

      if (dbErr) {
        console.warn("Direct update error, trying databaseService fallback:", dbErr);
        await databaseService.update('one_to_one_meetings', updatingMeeting.id, payload);
      }

      await fetchMeetingsAndUsers();
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));

      setIsAttendanceModalOpen(false);
      setUpdatingMeeting(null);
    } catch (err: any) {
      console.error("Error cancelling meeting:", err);
      setError(err.message || "Failed to cancel meeting.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveReschedule = async () => {
    if (!updatingMeeting || !updatingMeeting.id) return;
    if (!rescheduleDate) {
      setError("Please select a meeting date.");
      return;
    }
    if (!rescheduleTime) {
      setError("Please select a meeting time.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const senderId = updatingMeeting.sender_id || updatingMeeting.organizer_id || updatingMeeting.creatorId;
      const receiverId = updatingMeeting.receiver_id || updatingMeeting.member_id || (updatingMeeting.participantIds && updatingMeeting.participantIds[0]);

      let senderRecord = allUsersList.find(u => String(u.id) === String(senderId) || String(u.uid) === String(senderId));
      let receiverRecord = allUsersList.find(u => String(u.id) === String(receiverId) || String(u.uid) === String(receiverId));

      const senderFullAddress = getUserFullAddress(senderRecord);
      const receiverFullAddress = getUserFullAddress(receiverRecord);

      let finalLocation = 'Online Meeting';
      if (rescheduleLocationOption === 'My Address') {
        if (!senderFullAddress) {
          setError("Address not available. Please update your profile.");
          setIsSubmitting(false);
          return;
        }
        finalLocation = senderFullAddress;
      } else if (rescheduleLocationOption === 'Selected Member Address') {
        if (!receiverFullAddress) {
          setError("Address not available. Please update your profile.");
          setIsSubmitting(false);
          return;
        }
        finalLocation = receiverFullAddress;
      } else {
        finalLocation = 'Online Meeting';
      }

      const payload = {
        meeting_date: rescheduleDate,
        scheduled_date: rescheduleDate,
        date: rescheduleDate,
        meeting_time: rescheduleTime,
        scheduled_time: rescheduleTime,
        time: rescheduleTime,
        meeting_location: finalLocation,
        venue: finalLocation,
        status: 'UPCOMING',
        updated_at: new Date().toISOString()
      };

      const { error: dbErr } = await supabase
        .from('one_to_one_meetings')
        .update(payload)
        .eq('id', updatingMeeting.id);

      if (dbErr) {
        console.warn("Direct update error, trying databaseService fallback:", dbErr);
        await databaseService.update('one_to_one_meetings', updatingMeeting.id, payload);
      }

      try {
        const senderName = profile?.name || currentUserRecord?.name || 'A member';
        const otherUserId = receiverId === (profile?.uid || profile?.id) ? senderId : receiverId;
        if (otherUserId) {
          await notificationService.sendNotification({
            userId: otherUserId,
            type: 'MEETING',
            title: 'Meeting Rescheduled',
            message: `Your One-to-One Meeting with ${senderName} has been rescheduled to ${rescheduleDate} at ${rescheduleTime}.`,
            relatedUserId: senderId,
            link: '/one-to-one'
          });
        }
      } catch (nErr) {
        console.warn("Notification error:", nErr);
      }

      await fetchMeetingsAndUsers();
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));

      setIsRescheduleModalOpen(false);
      setUpdatingMeeting(null);
    } catch (err: any) {
      console.error("Error rescheduling meeting:", err);
      setError(err.message || "Failed to reschedule meeting.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Analytics for Master Admin and Chapter Admin
  const stats = React.useMemo(() => {
    if (!isAdmin && !isChapterAdmin) return null;
    
    let filteredMeetings = meetings;
    
    // For Chapter Admin, we only care about meetings involving their chapter members
    if (isChapterAdmin) {
      const chapterMemberIds = members.map(m => m.uid);
      // Include the chapter admin themselves in the IDs to check
      chapterMemberIds.push(profile!.uid);
      
      filteredMeetings = meetings.filter(m => 
        chapterMemberIds.includes(m.creatorId) || 
        m.participantIds.some(id => chapterMemberIds.includes(id))
      );
    }

    if (selectedMemberId) {
      // If a member is selected, we show their specific stats
      const scheduled = filteredMeetings.filter(m => m.creatorId === selectedMemberId).length;
      const attended = filteredMeetings.filter(m => m.attendance?.[selectedMemberId] === 'PRESENT').length;
      return { scheduled, attended };
    } else {
      // Overall stats
      const scheduled = filteredMeetings.length;
      // Total attendance across all meetings
      const attended = filteredMeetings.reduce((acc, m) => {
        const presentCount = Object.values(m.attendance || {}).filter(status => status === 'PRESENT').length;
        return acc + presentCount;
      }, 0);
      return { scheduled, attended };
    }
  }, [isAdmin, isChapterAdmin, meetings, selectedMemberId, members, profile]);

  const historyMeetings = React.useMemo(() => {
    if (!isAdmin && !isChapterAdmin) return [];
    
    let filtered = meetings;

    // For Chapter Admin, filter by chapter members
    if (isChapterAdmin) {
      const chapterMemberIds = members.map(m => m.uid);
      chapterMemberIds.push(profile!.uid);
      filtered = meetings.filter(m => 
        chapterMemberIds.includes(m.creatorId) || 
        m.participantIds.some(id => chapterMemberIds.includes(id))
      );
    }

    if (selectedMemberId) {
      if (historyType === 'scheduled') {
        filtered = filtered.filter(m => m.creatorId === selectedMemberId);
      } else if (historyType === 'attended') {
        filtered = filtered.filter(m => m.attendance?.[selectedMemberId] === 'PRESENT');
      } else {
        filtered = filtered.filter(m => m.creatorId === selectedMemberId || m.participantIds.includes(selectedMemberId));
      }
    }
    return filtered;
  }, [isAdmin, isChapterAdmin, meetings, selectedMemberId, historyType, members, profile]);

  const upcomingMeetings = useMemo(() => {
    const rawUpcoming = meetings.filter(m => {
      const statusUpper = String(m.status || '').trim().toUpperCase();
      if (statusUpper === 'COMPLETED' || statusUpper === 'CANCELLED' || statusUpper === 'NOT_COMPLETED') return false;
      if (m.isCompleted === true || (m.isCompleted as any) === 'true' || (m as any).is_completed === true || (m as any).is_completed === 'true') return false;
      if (m.isCancelled === true || (m.isCancelled as any) === 'true' || (m as any).is_cancelled === true || (m as any).is_cancelled === 'true') return false;

      if (isChapterAdmin) {
        const chapterMemberIds = members.map(mem => mem.uid);
        if (profile?.uid) chapterMemberIds.push(profile.uid);
        if (profile?.id) chapterMemberIds.push(profile.id);
        return chapterMemberIds.includes(m.creatorId) || chapterMemberIds.includes(m.organizer_id) || chapterMemberIds.includes(m.sender_id) || m.participantIds?.some(id => chapterMemberIds.includes(id));
      }
      if (!isAdmin && !isChapterAdmin) {
        const uid = String(profile?.uid || profile?.id || '');
        const senderId = String(m.sender_id || m.organizer_id || m.creatorId || '');
        const receiverId = String(m.receiver_id || m.member_id || (m.participantIds && m.participantIds[0]) || '');
        return senderId === uid || receiverId === uid || m.participantIds?.map(String).includes(uid);
      }
      return true;
    });

    return rawUpcoming.sort((a, b) => getMeetingExactDateTime(a).getTime() - getMeetingExactDateTime(b).getTime());
  }, [meetings, isChapterAdmin, members, profile, isAdmin]);

  const pastMeetings = meetings
    .filter(m => {
      if (m.status !== 'COMPLETED' && m.status !== 'CANCELLED' && m.status !== 'NOT_COMPLETED') return false;
      if (isChapterAdmin) {
        const chapterMemberIds = members.map(mem => mem.uid);
        if (profile?.uid) chapterMemberIds.push(profile.uid);
        if (profile?.id) chapterMemberIds.push(profile.id);
        return chapterMemberIds.includes(m.creatorId) || chapterMemberIds.includes(m.organizer_id) || chapterMemberIds.includes(m.sender_id) || m.participantIds?.some(id => chapterMemberIds.includes(id));
      }
      if (!isAdmin && !isChapterAdmin) {
        const uid = String(profile?.uid || profile?.id || '');
        const senderId = String(m.sender_id || m.organizer_id || m.creatorId || '');
        const receiverId = String(m.receiver_id || m.member_id || (m.participantIds && m.participantIds[0]) || '');
        return senderId === uid || receiverId === uid || m.participantIds?.map(String).includes(uid);
      }
      return true;
    })
    .sort((a, b) => getMeetingExactDateTime(b).getTime() - getMeetingExactDateTime(a).getTime());


  return (
    <div className="space-y-4 sm:space-y-8 max-w-7xl mx-auto px-3 sm:px-6 lg:px-6 py-4 sm:py-6 md:py-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 border-b border-white/5 pb-4 sm:pb-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 text-primary rounded-xl sm:rounded-[16px] flex items-center justify-center shrink-0 shadow-sm shadow-primary/5">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight uppercase">
              1-to-1 Meetings
            </h1>
            <p className="text-[9px] sm:text-[10px] text-neutral-400 font-bold uppercase tracking-[0.15em] mt-0.5">
              Personalized direct business networking
            </p>
          </div>
        </div>
        {!isAdmin && (
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleOpenScheduleModal}
              className="flex items-center justify-center gap-2 px-4 sm:px-6 h-9 sm:h-11 bg-primary text-white rounded-xl sm:rounded-[12px] font-bold uppercase tracking-wider transition-all active:scale-95 text-[10px] sm:text-xs shrink-0 shadow-[0_2px_10px_rgba(0,0,0,0.02)] shadow-primary/10 hover:bg-primary/90 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule 1:1 Meeting</span>
            </button>
          </div>
        )}
      </header>

      {(isAdmin || isChapterAdmin) && (
        <div className="space-y-4 sm:space-y-6">
          {/* Member Filter */}
          <div className="bg-[#111827] p-3.5 sm:p-6 rounded-2xl sm:rounded-[2.5rem] border border-white/5 shadow-sm flex flex-col md:flex-row md:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-xl sm:rounded-[12px] flex items-center justify-center text-primary">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-widest">Filter by Member</h2>
            </div>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="flex-1 px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-[12px] border border-white/5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-xs sm:text-sm bg-[#151C2E] text-white"
            >
              <option value="" className="bg-[#111827] text-white">All Members (Overall Analytics)</option>
              {members.sort((a, b) => a.name.localeCompare(b.name)).map(m => (
                <option key={m.uid} value={m.uid} className="bg-[#111827] text-white">{m.name} ({m.businessName || 'No Business'})</option>
              ))}
            </select>
          </div>

          {/* Analytics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-2 gap-2.5 sm:gap-6">
            <button
              onClick={() => {
                setHistoryType('scheduled');
                setIsHistoryModalOpen(true);
              }}
              className="group relative bg-[#0F172A] p-3.5 sm:p-6 rounded-2xl sm:rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden text-left transition-all hover:scale-[1.02]"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="relative z-10">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/10 rounded-xl sm:rounded-[16px] flex items-center justify-center text-primary mb-2 sm:mb-6">
                  <Calendar className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>
                <p className="text-[8.5px] sm:text-[10px] font-bold text-neutral-300 uppercase tracking-wider sm:tracking-[0.2em] mb-1 sm:mb-2 truncate">Meetings Scheduled</p>
                <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">{stats?.scheduled}</h2>
                <p className="text-[8px] sm:text-[10px] font-bold text-primary uppercase tracking-widest mt-2 sm:mt-4 flex items-center gap-1 sm:gap-2 truncate">
                  <span>View History</span> <ChevronRight className="w-3 h-3" />
                </p>
              </div>
            </button>

            <button
              onClick={() => {
                setHistoryType('attended');
                setIsHistoryModalOpen(true);
              }}
              className="group relative bg-[#111827] p-3.5 sm:p-6 rounded-2xl sm:rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden text-left transition-all hover:scale-[1.02]"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="relative z-10">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-primary/10 rounded-xl sm:rounded-[16px] flex items-center justify-center text-primary mb-2 sm:mb-6">
                  <CheckCircle2 className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>
                <p className="text-[8.5px] sm:text-[10px] font-bold text-neutral-400 uppercase tracking-wider sm:tracking-[0.2em] mb-1 sm:mb-2 truncate">Meetings Attended</p>
                <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">{stats?.attended}</h2>
                <p className="text-[8px] sm:text-[10px] font-bold text-primary uppercase tracking-widest mt-2 sm:mt-4 flex items-center gap-1 sm:gap-2 truncate">
                  <span>View History</span> <ChevronRight className="w-3 h-3" />
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        {/* Upcoming Meetings */}
        <section className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2.5 sm:gap-3 mb-1 sm:mb-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-xl sm:rounded-[12px] flex items-center justify-center text-primary">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h2 className="text-base sm:text-xl font-bold text-white uppercase tracking-tight">Upcoming Meetings</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {upcomingMeetings.length > 0 ? (
              upcomingMeetings.slice(0, 1).map((meeting) => (
                <MeetingCard 
                  key={meeting.id} 
                  meeting={meeting} 
                  allUsersList={allUsersList}
                  chapterMap={chapterMap}
                  isCreator={
                    String(meeting.sender_id || meeting.organizer_id || meeting.creatorId) === String(profile?.id) ||
                    String(meeting.sender_id || meeting.organizer_id || meeting.creatorId) === String(profile?.uid) ||
                    String(meeting.sender_id || meeting.organizer_id || meeting.creatorId) === String(currentUserRecord?.id)
                  }
                  isAdmin={isAdmin}
                  onUpdate={() => handleOpenAttendanceModal(meeting)}
                />
              ))
            ) : (
              <div className="col-span-full p-8 sm:p-12 text-center bg-[#111827] rounded-xl sm:rounded-[24px] border border-dashed border-white/5">
                <p className="text-neutral-400 font-medium italic text-[10px] sm:text-xs uppercase tracking-widest">No upcoming meetings scheduled.</p>
              </div>
            )}
          </div>
        </section>

        {/* Meeting History */}
        <section className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2.5 sm:gap-3 mb-1 sm:mb-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#111827] rounded-xl sm:rounded-[12px] flex items-center justify-center text-neutral-400 border border-white/5">
              <History className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h2 className="text-base sm:text-xl font-bold text-white uppercase tracking-tight">Meeting History</h2>
          </div>
          
          <div className="bg-[#111827] rounded-xl sm:rounded-[24px] border border-white/5 shadow-sm overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
              <div className="divide-y divide-white/5">
                {pastMeetings.length > 0 ? (
                  pastMeetings.map((meeting) => {
                    const senderId = meeting.sender_id || meeting.organizer_id || meeting.creatorId;
                    const receiverId = meeting.receiver_id || meeting.member_id || (meeting.participantIds && meeting.participantIds[0]);

                    const sender = allUsersList.find(u => String(u.id) === String(senderId) || String(u.uid) === String(senderId));
                    const receiver = allUsersList.find(u => String(u.id) === String(receiverId) || String(u.uid) === String(receiverId));

                    const senderName = getUserFullName(sender) || 'Sender';
                    const receiverName = getUserFullName(receiver) || 'Receiver';

                    let locationDisplay = 'Online Meeting';
                    if (meeting.venue) {
                      if (meeting.venue.toLowerCase().includes('online')) {
                        locationDisplay = 'Online Meeting';
                      } else if (meeting.venue === 'My Address' || meeting.venue.startsWith('My Address')) {
                        locationDisplay = getUserFullAddress(sender) || 'My Address';
                      } else if (meeting.venue === 'Member Address' || meeting.venue.includes("Member's Address")) {
                        locationDisplay = getUserFullAddress(receiver) || "Member's Address";
                      } else {
                        locationDisplay = meeting.venue;
                      }
                    }

                    return (
                      <div key={meeting.id} className="p-3 sm:p-4 hover:bg-[#1C2538] transition-all group">
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 sm:gap-4 items-center">
                          <div className="md:col-span-1">
                            <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5 sm:mb-1">Scheduled By</p>
                            <p className="text-[10px] sm:text-xs font-bold text-white truncate">{senderName}</p>
                            <p className="text-[8px] sm:text-[9px] text-neutral-400 truncate">{formatUserRoleOrPosition(sender)}</p>
                          </div>
                          <div className="md:col-span-1">
                            <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5 sm:mb-1">Meeting With</p>
                            <p className="text-[10px] sm:text-xs font-bold text-white truncate">{receiverName}</p>
                            <p className="text-[8px] sm:text-[9px] text-neutral-400 truncate">{formatUserRoleOrPosition(receiver)}</p>
                          </div>
                          <div className="md:col-span-1">
                            <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5 sm:mb-1">Date & Time</p>
                            <p className="text-[10px] sm:text-xs font-bold text-white">{format(new Date(meeting.date), 'dd MMM yyyy')}</p>
                            <p className="text-[8px] sm:text-[9px] text-neutral-400 font-medium">{formatTime12h(meeting.time)}</p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5 sm:mb-1">Location & Note</p>
                            <p className="text-[10px] sm:text-xs text-white font-semibold truncate">{locationDisplay}</p>
                            <p className="text-[8px] sm:text-[9px] text-neutral-400 italic line-clamp-1">{meeting.notes || '-'}</p>
                          </div>
                          <div className="col-span-2 md:col-span-1 text-left md:text-right">
                            <span className={cn(
                              "inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-bold uppercase tracking-wider",
                              meeting.status === 'COMPLETED' ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                            )}>
                              {meeting.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-20 text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-500">
                      <History size={32} />
                    </div>
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">No meeting history found.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Schedule Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsModalOpen(false);
            setFormData({ title: '', participantId: '', date: '', time: '', venue: '', notes: '' });
            setLocationType('Online');
            setSearchTerm('');
            setIsDropdownOpen(false);
          }
        }}
        title="Schedule One-to-One Meeting"
      >
        {showSuccess ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-20 h-20 bg-emerald-500/15 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={48} />
            </div>
            <h3 className="text-2xl font-bold text-white uppercase tracking-tight">
              Meeting Scheduled!
            </h3>
            <p className="text-neutral-400 font-medium">
              Your meeting has been successfully created.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-[12px] text-sm font-bold flex items-center gap-2">
                <AlertCircle size={18} />
                {error}
              </div>
            )}
            
            {/* Member Selection - Searchable Dropdown */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Select Member</label>
              <div className="relative">
                <div 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full px-4 py-4 rounded-[16px] border border-white/5 bg-[#151C2E] cursor-pointer flex items-center justify-between group hover:border-primary/50 transition-all"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Users size={18} className="text-neutral-400 group-hover:text-primary transition-colors shrink-0" />
                    {selectedMember ? (
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        {selectedMember.photo_url || selectedMember.photoURL || selectedMember.avatar_url || selectedMember.profile_photo ? (
                          <img
                            src={selectedMember.photo_url || selectedMember.photoURL || selectedMember.avatar_url || selectedMember.profile_photo}
                            alt={getUserFullName(selectedMember)}
                            className="w-7 h-7 rounded-full object-cover shrink-0 border border-white/10"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                            {getUserFullName(selectedMember).charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">
                            {getUserFullName(selectedMember)} <span className="text-xs font-semibold text-primary">({formatUserRoleOrPosition(selectedMember)})</span>
                          </p>
                          <p className="text-[10px] text-neutral-400 font-medium truncate">
                            {selectedMember.category || selectedMember.business_category || selectedMember.businessName || selectedMember.business_name || 'General'} • {chapterMap.get(String(selectedMember.chapter_id)) || selectedMember.chapter_name || 'No Chapter'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-neutral-400">Select a member...</span>
                    )}
                  </div>
                  <ChevronRight size={18} className={cn("text-neutral-400 transition-transform", isDropdownOpen ? "rotate-90" : "")} />
                </div>

                {isDropdownOpen && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-[#111827] rounded-[16px] border border-white/5 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Tab Switcher */}
                    <div className="flex border-b border-white/5 bg-[#151C2E]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMemberTab('my_chapter');
                        }}
                        className={cn(
                          "flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 text-center",
                          memberTab === 'my_chapter'
                            ? "border-primary text-primary bg-primary/10"
                            : "border-transparent text-neutral-400 hover:text-white"
                        )}
                      >
                        My Chapter Members
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMemberTab('all');
                        }}
                        className={cn(
                          "flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 text-center",
                          memberTab === 'all'
                            ? "border-primary text-primary bg-primary/10"
                            : "border-transparent text-neutral-400 hover:text-white"
                        )}
                      >
                        All Members
                      </button>
                    </div>

                    {/* Search Input Box */}
                    <div className="p-3 border-b border-white/5 bg-[#151C2E]">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
                        <input
                          type="text"
                          placeholder="Search by name, phone, category, chapter..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 text-xs rounded-[12px] border border-white/5 bg-[#111827] text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>

                    {/* Filtered Members List */}
                    <div className="max-h-60 overflow-y-auto p-3 custom-scrollbar space-y-2">
                      {filteredMembers.length > 0 ? (
                        filteredMembers.map((member) => {
                          const mName = getUserFullName(member);
                          const mRole = formatUserRoleOrPosition(member);
                          const mCategory = member.category || member.business_category || member.businessName || member.business_name || 'General';
                          const mChapter = chapterMap.get(String(member.chapter_id)) || member.chapter_name || 'No Chapter';
                          const mPhoto = member.photo_url || member.photoURL || member.avatar_url || member.profile_photo;
                          const memberIdToUse = member.id || member.uid;

                          return (
                            <div
                              key={memberIdToUse}
                              onClick={(e) => {
                                e.stopPropagation();
                                setFormData(prev => ({ ...prev, participantId: memberIdToUse }));
                                setIsDropdownOpen(false);
                              }}
                              className={cn(
                                "group/item flex items-center justify-between p-3 rounded-[12px] cursor-pointer transition-all",
                                String(formData.participantId) === String(memberIdToUse)
                                  ? "bg-primary/10 border border-primary/20 shadow-sm"
                                  : "bg-[#111827] border border-white/5 hover:bg-[#1C2538]"
                              )}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {mPhoto ? (
                                  <img
                                    src={mPhoto}
                                    alt={mName}
                                    className="w-10 h-10 rounded-full object-cover shadow-sm border border-white/10 shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                                    {mName.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="text-xs font-bold text-white uppercase tracking-tight truncate">
                                      {mName}
                                    </p>
                                    <span className={cn(
                                      "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full shrink-0",
                                      mRole === 'President' ? "bg-amber-500/20 text-amber-400 border border-amber-500/20" :
                                      mRole === 'Vice President' ? "bg-blue-500/20 text-blue-400 border border-blue-500/20" :
                                      mRole === 'Treasurer' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20" :
                                      mRole === 'Chapter Admin' ? "bg-red-500/20 text-red-400 border border-red-500/20" :
                                      "bg-neutral-500/20 text-neutral-400 border border-neutral-500/20"
                                    )}>
                                      {mRole}
                                    </span>
                                  </div>
                                  <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest truncate mt-0.5">
                                    {mCategory} • {mChapter}
                                  </p>
                                </div>
                              </div>
                              {String(formData.participantId) === String(memberIdToUse) && (
                                <CheckCircle2 size={16} className="text-primary shrink-0 ml-2" />
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-6 text-center">
                          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest italic">No members found.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Meeting Location Dropdown */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Meeting Location</label>
              <select
                required
                value={locationType}
                onChange={(e) => setLocationType(e.target.value as 'Online' | 'My Address' | 'Member Address')}
                className="w-full px-4 py-4 rounded-[16px] border border-white/5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm bg-[#151C2E] text-white cursor-pointer"
              >
                <option value="Online" className="bg-[#111827] text-white">
                  1. Online Meeting
                </option>
                <option value="My Address" className="bg-[#111827] text-white">
                  2. My Address {myAddress ? `(${myAddress})` : '(Address not available)'}
                </option>
                <option value="Member Address" className="bg-[#111827] text-white">
                  3. Member's Address {memberAddress ? `(${memberAddress})` : selectedMember ? '(Address not available)' : '(Select member first)'}
                </option>
              </select>

              <div className="p-3 bg-[#111827] rounded-[12px] border border-white/5 text-xs text-neutral-300">
                <span className="font-bold text-primary mr-1">Selected Address:</span>
                {locationType === 'Online' && 'Online Meeting'}
                {locationType === 'My Address' && (
                  myAddress ? myAddress : <span className="text-amber-400 font-semibold">Address not available. Please update your profile.</span>
                )}
                {locationType === 'Member Address' && (
                  selectedMember ? (
                    memberAddress ? memberAddress : <span className="text-amber-400 font-semibold">Address not available. Please update your profile.</span>
                  ) : (
                    <span className="text-neutral-400 italic">Please select a member first</span>
                  )
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Meeting Date</label>
                <input
                  required
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-4 rounded-[16px] border border-white/5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium bg-[#151C2E] text-white"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Meeting Time</label>
                {(() => {
                  const { time: timePart, ampm: ampmPart } = parseTo12hParts(formData.time);
                  const [selectedHour, selectedMinute] = timePart.split(':');
                  const hoursList = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
                  const minutesList = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
                  
                  const handleTimeUpdate = (hour: string, minute: string, ampm: 'AM' | 'PM') => {
                    setFormData({ ...formData, time: `${hour}:${minute} ${ampm}` });
                  };

                  return (
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        value={selectedHour}
                        onChange={(e) => handleTimeUpdate(e.target.value, selectedMinute || '00', (ampmPart as 'AM' | 'PM') || 'AM')}
                        className="w-full px-2 sm:px-4 py-4 rounded-[16px] border border-white/5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-sm bg-[#151C2E] text-white cursor-pointer"
                      >
                        <option value="" disabled className="bg-[#111827] text-white">HH</option>
                        {hoursList.map(h => (
                          <option key={h} value={h} className="bg-[#111827] text-white">{h}</option>
                        ))}
                      </select>
                      <select
                        value={selectedMinute}
                        onChange={(e) => handleTimeUpdate(selectedHour || '10', e.target.value, (ampmPart as 'AM' | 'PM') || 'AM')}
                        className="w-full px-2 sm:px-4 py-4 rounded-[16px] border border-white/5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-sm bg-[#151C2E] text-white cursor-pointer"
                      >
                        <option value="" disabled className="bg-[#111827] text-white">MM</option>
                        {minutesList.map(m => (
                          <option key={m} value={m} className="bg-[#111827] text-white">{m}</option>
                        ))}
                      </select>
                      <select
                        value={ampmPart}
                        onChange={(e) => handleTimeUpdate(selectedHour || '10', selectedMinute || '00', e.target.value as 'AM' | 'PM')}
                        className="w-full px-2 sm:px-4 py-4 rounded-[16px] border border-white/5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-sm bg-[#151C2E] text-white cursor-pointer"
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
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Meeting Notes (Optional)</label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="What would you like to discuss?"
                className="w-full px-4 py-4 rounded-[16px] border border-white/5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium resize-none bg-[#151C2E] text-white"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-5 bg-primary text-white rounded-[16px] font-bold uppercase tracking-[0.2em] hover:shadow-2xl hover:shadow-primary/30 transition-all active:scale-95 disabled:opacity-50 text-xs cursor-pointer"
            >
              {isSubmitting ? 'Scheduling...' : 'Schedule Meeting'}
            </button>
          </form>
        )}
      </Modal>
      {/* Attendance Modal */}
      <Modal
        isOpen={isAttendanceModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsAttendanceModalOpen(false);
            setUpdatingMeeting(null);
          }
        }}
        title="ONE-TO-ONE MEETING ATTENDANCE"
      >
        {updatingMeeting && (() => {
          const senderId = updatingMeeting.sender_id || updatingMeeting.organizer_id || updatingMeeting.creatorId;
          const receiverId = updatingMeeting.receiver_id || updatingMeeting.member_id || (updatingMeeting.participantIds && updatingMeeting.participantIds[0]);

          const senderRecord = allUsersList.find(u => String(u.id) === String(senderId) || String(u.uid) === String(senderId));
          const receiverRecord = allUsersList.find(u => String(u.id) === String(receiverId) || String(u.uid) === String(receiverId));

          const senderName = getUserFullName(senderRecord) || 'Creator';
          const receiverName = getUserFullName(receiverRecord) || 'Receiver';

          const formattedMeetingDate = updatingMeeting.date ? format(new Date(updatingMeeting.date), 'dd MMM yyyy') : 'N/A';
          const formattedMeetingTime = updatingMeeting.time ? formatTime12h(updatingMeeting.time) : 'N/A';

          return (
            <div className="space-y-6">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-[12px] text-sm font-bold flex items-center gap-2">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              {/* Meeting Info Section */}
              <div className="p-4 bg-[#151C2E] rounded-[16px] border border-white/5 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-400 font-bold uppercase tracking-wider">Meeting With:</span>
                  <span className="font-bold text-white text-sm">{receiverName}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-400 font-bold uppercase tracking-wider">Meeting Date:</span>
                  <span className="font-bold text-white text-sm">{formattedMeetingDate}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-400 font-bold uppercase tracking-wider">Meeting Time:</span>
                  <span className="font-bold text-white text-sm">{formattedMeetingTime}</span>
                </div>
              </div>

              {/* Attendance Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-widest">Attendance</h4>

                {/* Creator (Logged-in Member) */}
                <div className="p-4 bg-[#151C2E] rounded-[14px] border border-white/5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white">Creator (Logged-in Member)</p>
                    <p className="text-[10px] text-neutral-400 font-medium">{senderName}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white">
                      <input 
                        type="radio" 
                        name="creatorAttendance" 
                        value="PRESENT" 
                        checked={creatorAttendance === 'PRESENT'} 
                        onChange={() => setCreatorAttendance('PRESENT')}
                        className="w-4 h-4 text-primary bg-[#111827] border-white/20 focus:ring-primary cursor-pointer" 
                      />
                      <span>Present</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white">
                      <input 
                        type="radio" 
                        name="creatorAttendance" 
                        value="ABSENT" 
                        checked={creatorAttendance === 'ABSENT'} 
                        onChange={() => setCreatorAttendance('ABSENT')}
                        className="w-4 h-4 text-primary bg-[#111827] border-white/20 focus:ring-primary cursor-pointer" 
                      />
                      <span>Absent</span>
                    </label>
                  </div>
                </div>

                {/* Receiver (Meeting Member) */}
                <div className="p-4 bg-[#151C2E] rounded-[14px] border border-white/5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white">Receiver (Meeting Member)</p>
                    <p className="text-[10px] text-neutral-400 font-medium">{receiverName}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white">
                      <input 
                        type="radio" 
                        name="receiverAttendance" 
                        value="PRESENT" 
                        checked={receiverAttendance === 'PRESENT'} 
                        onChange={() => setReceiverAttendance('PRESENT')}
                        className="w-4 h-4 text-primary bg-[#111827] border-white/20 focus:ring-primary cursor-pointer" 
                      />
                      <span>Present</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white">
                      <input 
                        type="radio" 
                        name="receiverAttendance" 
                        value="ABSENT" 
                        checked={receiverAttendance === 'ABSENT'} 
                        onChange={() => setReceiverAttendance('ABSENT')}
                        className="w-4 h-4 text-primary bg-[#111827] border-white/20 focus:ring-primary cursor-pointer" 
                      />
                      <span>Absent</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Meeting Status Section */}
              <div className="space-y-3 pt-2 border-t border-white/5">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Meeting Status</p>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={handleMarkAsCompleted}
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[14px] font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle2 size={16} />
                    <span>Mark as Completed</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsAttendanceModalOpen(false);
                      setIsRescheduleModalOpen(true);
                    }}
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-[#151C2E] hover:bg-[#1C2538] text-white border border-white/10 rounded-[14px] font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <RotateCcw size={16} className="text-primary" />
                    <span>Reschedule Meeting</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelMeeting}
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-[14px] font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <X size={16} />
                    <span>Cancel Meeting</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Reschedule Meeting Modal */}
      <Modal
        isOpen={isRescheduleModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsRescheduleModalOpen(false);
            setUpdatingMeeting(null);
          }
        }}
        title="Reschedule One-to-One Meeting"
      >
        <div className="space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-[12px] text-sm font-bold flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Meeting Date */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Meeting Date</label>
              <input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full px-4 py-4 rounded-[16px] border border-white/5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium bg-[#151C2E] text-white"
                style={{ colorScheme: 'dark' }}
              />
            </div>

            {/* Meeting Time */}
            <div className="space-y-2">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Meeting Time</label>
            {(() => {
              const { time: timePart, ampm: ampmPart } = parseTo12hParts(rescheduleTime);
              const [selectedHour, selectedMinute] = timePart.split(':');
              const hoursList = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
              const minutesList = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

              const handleTimeUpdate = (hour: string, minute: string, ampm: 'AM' | 'PM') => {
                setRescheduleTime(`${hour}:${minute} ${ampm}`);
              };

              return (
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={selectedHour}
                    onChange={(e) => handleTimeUpdate(e.target.value, selectedMinute || '00', (ampmPart as 'AM' | 'PM') || 'AM')}
                    className="w-full px-2 sm:px-4 py-4 rounded-[16px] border border-white/5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-sm bg-[#151C2E] text-white cursor-pointer"
                  >
                    <option value="" disabled className="bg-[#111827] text-white">HH</option>
                    {hoursList.map(h => (
                      <option key={h} value={h} className="bg-[#111827] text-white">{h}</option>
                    ))}
                  </select>
                  <select
                    value={selectedMinute}
                    onChange={(e) => handleTimeUpdate(selectedHour || '10', e.target.value, (ampmPart as 'AM' | 'PM') || 'AM')}
                    className="w-full px-2 sm:px-4 py-4 rounded-[16px] border border-white/5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-sm bg-[#151C2E] text-white cursor-pointer"
                  >
                    <option value="" disabled className="bg-[#111827] text-white">MM</option>
                    {minutesList.map(m => (
                      <option key={m} value={m} className="bg-[#111827] text-white">{m}</option>
                    ))}
                  </select>
                  <select
                    value={ampmPart}
                    onChange={(e) => handleTimeUpdate(selectedHour || '10', selectedMinute || '00', e.target.value as 'AM' | 'PM')}
                    className="w-full px-2 sm:px-4 py-4 rounded-[16px] border border-white/5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-sm bg-[#151C2E] text-white cursor-pointer"
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
          {/* Meeting Location */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Meeting Location</label>
            <select
              value={rescheduleLocationOption}
              onChange={(e) => setRescheduleLocationOption(e.target.value as any)}
              className="w-full px-4 py-4 rounded-[16px] border border-white/5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm bg-[#151C2E] text-white cursor-pointer"
            >
              <option value="Online Meeting" className="bg-[#111827] text-white">1. Online Meeting</option>
              <option value="My Address" className="bg-[#111827] text-white">2. My Address</option>
              <option value="Selected Member Address" className="bg-[#111827] text-white">3. Selected Member Address</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
            <button
              type="button"
              onClick={handleSaveReschedule}
              disabled={isSubmitting}
              className="py-4 bg-primary text-white rounded-[16px] font-bold uppercase tracking-widest hover:bg-primary/90 transition-all text-xs disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : 'Save Schedule'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRescheduleModalOpen(false);
                setUpdatingMeeting(null);
              }}
              disabled={isSubmitting}
              className="py-4 bg-[#151C2E] text-neutral-300 hover:text-white rounded-[16px] font-bold uppercase tracking-widest border border-white/5 hover:bg-[#1C2538] transition-all text-xs disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* History Table Modal for Master Admin */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={historyType === 'scheduled' ? 'Scheduled Meetings History' : 'Attended Meetings History'}
        maxWidth="max-w-6xl"
      >
        <div className="bg-[#111827] rounded-[16px] overflow-hidden border border-white/5">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-[#151C2E] border-b border-white/5">
                  <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Scheduled By</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Meeting With</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Time</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {historyMeetings.length > 0 ? (
                  historyMeetings.map((meeting) => {
                    const senderId = meeting.sender_id || meeting.organizer_id || meeting.creatorId;
                    const receiverId = meeting.receiver_id || meeting.member_id || (meeting.participantIds && meeting.participantIds[0]);

                    const sender = allUsersList.find(u => String(u.id) === String(senderId) || String(u.uid) === String(senderId));
                    const receiver = allUsersList.find(u => String(u.id) === String(receiverId) || String(u.uid) === String(receiverId));

                    const senderName = sender ? `${getUserFullName(sender)} (${formatUserRoleOrPosition(sender)})` : 'Member';
                    const receiverName = receiver ? `${getUserFullName(receiver)} (${formatUserRoleOrPosition(receiver)})` : 'Member';

                    return (
                      <tr key={meeting.id} className="hover:bg-[#1C2538] transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-white">{senderName}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-white">{receiverName}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-neutral-300">{format(new Date(meeting.date), 'dd MMM yyyy')}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-neutral-300">{formatTime12h(meeting.time)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "text-[9px] font-bold px-2 py-1 rounded-md uppercase tracking-widest",
                            meeting.status === 'UPCOMING' ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"
                          )}>
                            {meeting.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            {Object.entries(meeting.attendance || {}).map(([uid, status]) => {
                              const member = allUsersList.find(m => String(m.id) === String(uid) || String(m.uid) === String(uid));
                              return (
                                <div key={uid} className="flex items-center gap-2">
                                  <span className="text-[9px] font-bold text-neutral-400 truncate max-w-[80px]">{getUserFullName(member) || 'User'}:</span>
                                  <span className={cn(
                                    "text-[8px] font-bold uppercase tracking-tighter",
                                    status === 'PRESENT' ? "text-emerald-400" : "text-red-400"
                                  )}>{status}</span>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center">
                      <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">No meeting history found.</p>
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

interface MeetingCardProps {
  meeting: OneToOneMeeting;
  allUsersList: any[];
  chapterMap: Map<string, string>;
  isCreator: boolean;
  isAdmin?: boolean;
  onUpdate?: () => void;
}

function isMeetingOverdue(meeting: OneToOneMeeting): boolean {
  if (meeting.status === 'COMPLETED' || meeting.status === 'CANCELLED') {
    return false;
  }
  if (!meeting.date) return false;

  try {
    const todayStr = new Date().toISOString().split('T')[0];
    if (meeting.date < todayStr) {
      return true;
    }
    if (meeting.date === todayStr && meeting.time) {
      const { time, ampm } = parseTo12hParts(meeting.time);
      const [hStr, mStr] = time.split(':');
      let hours = parseInt(hStr, 10) || 0;
      const minutes = parseInt(mStr, 10) || 0;
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;

      const meetingDateTime = new Date();
      meetingDateTime.setHours(hours, minutes, 0, 0);

      return new Date() > meetingDateTime;
    }
  } catch (e) {
    console.warn("Error checking overdue status:", e);
  }
  return false;
}

const MeetingCard: React.FC<MeetingCardProps> = ({ meeting, allUsersList, chapterMap, isCreator, isAdmin, onUpdate }) => {
  const senderId = meeting.sender_id || meeting.organizer_id || meeting.creatorId;
  const receiverId = meeting.receiver_id || meeting.member_id || (meeting.participantIds && meeting.participantIds[0]);

  const sender = allUsersList.find(u => String(u.id) === String(senderId) || String(u.uid) === String(senderId));
  const receiver = allUsersList.find(u => String(u.id) === String(receiverId) || String(u.uid) === String(receiverId));

  const senderName = getUserFullName(sender) || 'Sender';
  const senderRole = formatUserRoleOrPosition(sender);
  const senderChapter = chapterMap.get(String(sender?.chapter_id)) || sender?.chapter_name || 'Member';
  const senderPhoto = sender?.photo_url || sender?.photoURL || sender?.avatar_url || sender?.profile_photo;

  const receiverName = getUserFullName(receiver) || 'Receiver';
  const receiverRole = formatUserRoleOrPosition(receiver);
  const receiverChapter = chapterMap.get(String(receiver?.chapter_id)) || receiver?.chapter_name || 'Member';
  const receiverPhoto = receiver?.photo_url || receiver?.photoURL || receiver?.avatar_url || receiver?.profile_photo;

  // Location display resolution
  let locationDisplay = 'Online Meeting';
  if (meeting.venue) {
    if (meeting.venue.toLowerCase().includes('online')) {
      locationDisplay = 'Online Meeting';
    } else if (meeting.venue === 'My Address' || meeting.venue.startsWith('My Address')) {
      locationDisplay = getUserFullAddress(sender) || 'My Address';
    } else if (meeting.venue === 'Member Address' || meeting.venue.includes("Member's Address")) {
      locationDisplay = getUserFullAddress(receiver) || "Member's Address";
    } else {
      locationDisplay = meeting.venue;
    }
  }

  const isOverdue = isMeetingOverdue(meeting);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={cn(
        "group relative bg-[#111827] p-3.5 sm:p-5 rounded-xl sm:rounded-[16px] border transition-all duration-300 flex flex-col h-full overflow-hidden",
        isOverdue 
          ? "border-amber-500/30 shadow-sm bg-amber-500/5" 
          : "border-white/5 shadow-sm hover:border-white/10 hover:shadow-2xl"
      )}
    >
      <div className={cn(
        "absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 transition-transform duration-700 group-hover:scale-110 opacity-70",
        isOverdue ? "bg-amber-500/5" : "bg-primary/5"
      )} />
      
      <div className="relative z-10 flex items-start justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className={cn(
            "w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-[12px] flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300",
            isOverdue ? "bg-amber-500 text-black font-bold" : (isCreator ? "bg-primary text-white" : "bg-[#151C2E] text-white")
          )}>
            <Users className="w-4 h-4 sm:w-5.5 sm:h-5.5" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-[15px] font-semibold text-white tracking-tight leading-tight truncate">
              {isAdmin ? 'One-to-One Meeting' : (isCreator ? 'Organized by You' : 'Invited to Meeting')}
            </h3>
            <p className="text-[10px] sm:text-[11px] text-neutral-400 font-medium mt-0.5 truncate">
              Scheduled By: {senderName}
            </p>
          </div>
        </div>
        <div className={cn(
          "px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider border shrink-0 flex items-center gap-1 sm:gap-1.5",
          isOverdue 
            ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        )}>
          {isOverdue ? <AlertTriangle size={12} /> : <Clock size={12} />}
          {isOverdue ? 'Due' : 'Upcoming'}
        </div>
      </div>

      <div className="relative z-10 space-y-2.5 sm:space-y-3 mb-4 sm:mb-5 flex-grow">
        {/* Participants Section */}
        <div className="p-2.5 sm:p-3 bg-[#151C2E] rounded-xl sm:rounded-[12px] border border-white/5 space-y-2">
          <p className="text-[8px] sm:text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Participants</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {/* Sender */}
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <Avatar src={senderPhoto} name={senderName} size="w-7 h-7 sm:w-8 sm:h-8" className="border border-white/10 shrink-0" fallbackClassName="text-xs" />
              <div className="min-w-0">
                <p className="text-[7.5px] sm:text-[8px] font-bold text-primary uppercase tracking-wider">Sender (Host)</p>
                <p className="text-[11px] sm:text-xs font-bold text-white truncate">{senderName}</p>
                <p className="text-[8.5px] sm:text-[9px] text-neutral-400 font-medium truncate">{senderRole} • {senderChapter}</p>
              </div>
            </div>

            {/* Receiver */}
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <Avatar src={receiverPhoto} name={receiverName} size="w-7 h-7 sm:w-8 sm:h-8" className="border border-white/10 shrink-0" fallbackClassName="text-xs" />
              <div className="min-w-0">
                <p className="text-[7.5px] sm:text-[8px] font-bold text-primary uppercase tracking-wider">Receiver (Participant)</p>
                <p className="text-[11px] sm:text-xs font-bold text-white truncate">{receiverName}</p>
                <p className="text-[8.5px] sm:text-[9px] text-neutral-400 font-medium truncate">{receiverRole} • {receiverChapter}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1 p-2.5 bg-[#151C2E] rounded-[12px] border border-white/5">
            <Calendar size={12} className="text-primary" />
            <div className="min-w-0">
              <p className="text-[7px] font-bold text-neutral-400 uppercase tracking-widest">Date</p>
              <p className="text-[10px] font-bold text-white uppercase tracking-tight truncate">{format(new Date(meeting.date), 'dd MMM yyyy')}</p>
            </div>
          </div>
          <div className="flex flex-col gap-1 p-2.5 bg-[#151C2E] rounded-[12px] border border-white/5">
            <Clock size={12} className="text-primary" />
            <div className="min-w-0">
              <p className="text-[7px] font-bold text-neutral-400 uppercase tracking-widest">Time</p>
              <p className="text-[10px] font-bold text-white uppercase tracking-tight truncate">{formatTime12h(meeting.time)}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-2.5 bg-[#151C2E] rounded-[12px] border border-white/5">
          <div className="w-6 h-6 bg-[#111827] rounded-lg flex items-center justify-center text-primary shadow-sm shrink-0">
            <Search size={12} />
          </div>
          <div className="min-w-0">
            <p className="text-[7px] font-bold text-neutral-400 uppercase tracking-widest">Meeting Location</p>
            <p className="text-[10px] font-bold text-white uppercase tracking-tight truncate" title={locationDisplay}>{locationDisplay}</p>
          </div>
        </div>

        {meeting.notes && (
          <div className="p-3 bg-primary/5 rounded-[12px] border border-primary/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-10 h-10 bg-primary/5 rounded-full -mr-5 -mt-5" />
            <p className="text-[7px] text-primary font-bold uppercase tracking-[0.2em] mb-1 relative z-10">Meeting Notes</p>
            <p className="text-[10px] text-neutral-300 font-medium italic leading-relaxed line-clamp-2 relative z-10">"{meeting.notes}"</p>
          </div>
        )}
      </div>

      <button 
        onClick={onUpdate}
        className={cn(
          "relative z-10 w-full py-3 rounded-[12px] font-bold uppercase tracking-[0.2em] text-[8px] transition-all duration-300 flex items-center justify-center gap-2 mt-auto cursor-pointer",
          isOverdue 
            ? "bg-amber-500 hover:bg-amber-400 text-black font-extrabold shadow-lg shadow-amber-500/20" 
            : "bg-[#151C2E] text-neutral-400 group-hover:bg-primary group-hover:text-white group-hover:shadow-2xl"
        )}
      >
        <span>{isOverdue ? 'Due for Update — Update Now' : 'Update Meeting'}</span>
        <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
      </button>
    </motion.div>
  );
};
