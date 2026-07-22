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
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { databaseService } from '../services/databaseService';
import { OneToOneMeeting, UserProfile } from '../types';
import { Modal } from '../components/Modal';
import { format, isAfter, parseISO } from 'date-fns';
import { where, orderBy, collection, getDocs, query, or } from '../lib/database';
import { db } from '../lib/database';
import { cn } from '../lib/utils';
import { formatTime12h, parseTo12hParts } from '../utils/timeUtils';
import { getCleanFullName } from '../utils/authUtils';

const getUserFullName = (user: any): string => {
  if (!user) return '';
  const rawName = user.full_name || user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim();
  if (!rawName) return '';
  return getCleanFullName(rawName);
};

const formatUserRoleOrPosition = (user: any): string => {
  if (!user) return 'Member';
  
  const pos = user.position || user.chapter_position || user.chapterPosition;
  if (pos && typeof pos === 'string') {
    const pLower = pos.toLowerCase().trim();
    if (pLower === 'president') return 'President';
    if (pLower === 'vice_president' || pLower === 'vice president') return 'Vice President';
    if (pLower === 'treasurer') return 'Treasurer';
    if (pLower === 'chapter_admin' || pLower === 'chapter admin') return 'Chapter Admin';
    if (pLower === 'member') return 'Member';
  }

  const role = user.role;
  if (role) {
    const rUpper = String(role).toUpperCase().trim();
    if (rUpper === 'PRESIDENT') return 'President';
    if (rUpper === 'VICE_PRESIDENT') return 'Vice President';
    if (rUpper === 'TREASURER') return 'Treasurer';
    if (rUpper === 'CHAPTER_ADMIN') return 'Chapter Admin';
    if (rUpper === 'MASTER_ADMIN') return 'Master Admin';
    if (rUpper === 'MEMBER') return 'Member';
  }

  return 'Member';
};

const getUserFullAddress = (user: any): string => {
  if (!user) return '';
  const busName = user.business_name || user.businessName || '';
  const addr = user.address || user.business_address || user.street || '';
  const area = user.area || '';
  const city = user.city || '';
  const state = user.state || '';
  const pincode = user.pincode || user.pin_code || user.zip || '';

  const addressParts = [addr, area, city, state].map(s => (s ? String(s).trim() : '')).filter(Boolean);
  let fullAddress = addressParts.join(', ');
  if (pincode) {
    if (fullAddress) {
      fullAddress += ` - ${pincode}`;
    } else {
      fullAddress = String(pincode);
    }
  }

  if (busName && fullAddress) {
    return `${busName}, ${fullAddress}`;
  } else if (fullAddress) {
    return fullAddress;
  } else if (busName) {
    return busName;
  }
  return '';
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

  // Update Meeting state
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updatingMeeting, setUpdatingMeeting] = useState<OneToOneMeeting | null>(null);
  const [updateLocationType, setUpdateLocationType] = useState<'Online' | 'My Address' | 'Member Address'>('Online');
  const [isUpdateDropdownOpen, setIsUpdateDropdownOpen] = useState(false);
  const [updateSearchTerm, setUpdateSearchTerm] = useState('');
  const [showUpdateSuccess, setShowUpdateSuccess] = useState(false);
  
  const [updateFormData, setUpdateFormData] = useState({
    participantId: '',
    date: '',
    time: '',
    venue: '',
    notes: '',
    status: 'UPCOMING' as 'UPCOMING' | 'COMPLETED' | 'NOT_COMPLETED',
    attendance: {} as Record<string, 'PRESENT' | 'ABSENT'>
  });

  const fetchMeetingsAndUsers = async () => {
    try {
      setLoading(true);
      // 1. Fetch Users
      const { data: usersData, error: uErr } = await supabase
        .from('users')
        .select('*');
      
      let currentUsers = allUsersList;
      if (usersData && !uErr) {
        currentUsers = usersData;
        setAllUsersList(usersData);
        const memberList = usersData
          .map((doc: any) => ({ uid: doc.id, ...doc } as UserProfile))
          .filter(m => m.role !== 'MASTER_ADMIN');
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
  }, [profile, isAdmin, isChapterAdmin]);

  // Derive Logged In User Record & Chapter ID
  const currentAuthId = profile?.id || profile?.uid;
  const currentUserRecord = useMemo(() => {
    return allUsersList.find(u => String(u.id) === String(currentAuthId) || String(u.uid) === String(currentAuthId)) || profile;
  }, [allUsersList, currentAuthId, profile]);

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
        if (!currentUserChapterId) return false;
        return String(u.chapter_id) === String(currentUserChapterId);
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

  const memberAddress = useMemo(() => getUserFullAddress(selectedMember), [selectedMember]);

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
        finalLocation = senderFullAddress || "My Address";
      } else if (locationType === 'Member Address') {
        finalLocationType = "Member's Address";
        finalLocation = receiverFullAddress || "Member's Address";
      } else {
        finalLocationType = "Online Meeting";
        finalLocation = "Online Meeting";
      }

      const meetingDate = parseISO(formData.date);
      const now = new Date();
      const status = isAfter(meetingDate, now) ? 'UPCOMING' : 'COMPLETED';

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

  const handleUpdateMeeting = async (overrideStatus?: 'UPCOMING' | 'COMPLETED' | 'NOT_COMPLETED') => {
    if (!updatingMeeting || !updatingMeeting.id) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const targetStatus = overrideStatus || updateFormData.status || 'UPCOMING';

      // 1. Sender lookup (users table)
      const senderId = updatingMeeting.sender_id || updatingMeeting.organizer_id || updatingMeeting.creatorId || currentUserId;
      let senderRecord = allUsersList.find(u => String(u.id) === String(senderId) || String(u.uid) === String(senderId));

      if (!senderRecord && senderId) {
        const { data: sData } = await supabase.from('users').select('*').eq('id', senderId).maybeSingle();
        if (sData) senderRecord = sData;
      }

      if (!senderRecord || !senderRecord.id) {
        setError("Sender account not found in users table.");
        setIsSubmitting(false);
        return;
      }

      // 2. Receiver lookup (users table)
      const receiverId = updateFormData.participantId || updatingMeeting.receiver_id || updatingMeeting.member_id || (updatingMeeting.participantIds && updatingMeeting.participantIds[0]);
      let receiverRecord = allUsersList.find(u => String(u.id) === String(receiverId) || String(u.uid) === String(receiverId));

      if (!receiverRecord && receiverId) {
        const { data: rData } = await supabase.from('users').select('*').eq('id', receiverId).maybeSingle();
        if (rData) receiverRecord = rData;
      }

      if (!receiverRecord || !receiverRecord.id) {
        setError("Selected member not found in users table.");
        setIsSubmitting(false);
        return;
      }

      // Determine meeting location string
      let finalLocation = 'Online Meeting';
      if (updateLocationType === 'Online') {
        finalLocation = 'Online Meeting';
      } else if (updateLocationType === 'My Address') {
        finalLocation = getUserFullAddress(senderRecord) || 'My Address';
      } else if (updateLocationType === 'Member Address') {
        finalLocation = getUserFullAddress(receiverRecord) || "Member's Address";
      } else if (updateFormData.venue) {
        finalLocation = updateFormData.venue;
      }

      const meetingTitle = `1:1 Meeting - ${getUserFullName(senderRecord)} & ${getUserFullName(receiverRecord)}`;

      const updatePayload = {
        title: meetingTitle,
        sender_id: senderRecord.id,
        receiver_id: receiverRecord.id,
        organizer_id: senderRecord.id,
        member_id: receiverRecord.id,
        participant_ids: [receiverRecord.id],
        participantIds: [receiverRecord.id],
        scheduled_date: updateFormData.date || updatingMeeting.date,
        date: updateFormData.date || updatingMeeting.date,
        scheduled_time: updateFormData.time || updatingMeeting.time,
        meeting_time: updateFormData.time || updatingMeeting.time,
        time: updateFormData.time || updatingMeeting.time,
        meeting_location: finalLocation,
        venue: finalLocation,
        notes: updateFormData.notes || '',
        status: targetStatus,
        attendance: updateFormData.attendance,
        updated_at: new Date().toISOString()
      };

      // UPDATE using meeting.id primary key
      const { error: dbErr } = await supabase
        .from('one_to_one_meetings')
        .update(updatePayload)
        .eq('id', updatingMeeting.id);

      if (dbErr) {
        console.warn("Direct update error, trying databaseService fallback:", dbErr);
        await databaseService.update('one_to_one_meetings', updatingMeeting.id, updatePayload);
      }

      // Re-fetch data immediately
      await fetchMeetingsAndUsers();

      window.dispatchEvent(new CustomEvent('dashboard-refresh'));
      setShowUpdateSuccess(true);

      setTimeout(() => {
        setIsUpdateModalOpen(false);
        setShowUpdateSuccess(false);
        setUpdatingMeeting(null);
      }, 1200);

    } catch (err: any) {
      console.error("Error updating meeting:", err);
      if (err?.message?.includes('row-level security') || err?.message?.includes('RLS') || err?.message?.includes('violates row-level security policy')) {
        setError("Meeting update failed. Reason: Row-level security (RLS) restriction in database.");
      } else {
        setError(`Meeting update failed. Reason: ${err.message || 'Unknown database error'}`);
      }
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

  const upcomingMeetings = meetings
    .filter(m => {
      if (m.status !== 'UPCOMING') return false;
      if (isChapterAdmin) {
        const chapterMemberIds = members.map(mem => mem.uid);
        chapterMemberIds.push(profile!.uid);
        return chapterMemberIds.includes(m.creatorId) || m.participantIds.some(id => chapterMemberIds.includes(id));
      }
      return true;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const pastMeetings = meetings.filter(m => {
    if (m.status === 'UPCOMING') return false;
    if (isChapterAdmin) {
      const chapterMemberIds = members.map(mem => mem.uid);
      chapterMemberIds.push(profile!.uid);
      return chapterMemberIds.includes(m.creatorId) || m.participantIds.some(id => chapterMemberIds.includes(id));
    }
    return true;
  });


  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-6 py-6 md:py-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-[16px] flex items-center justify-center shrink-0 shadow-sm shadow-primary/5">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight uppercase">
              1-to-1 Meetings
            </h1>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-[0.15em] mt-0.5">
              Personalized direct business networking
            </p>
          </div>
        </div>
        {!isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-6 h-11 bg-primary text-white rounded-[12px] font-bold uppercase tracking-wider transition-all active:scale-95 text-xs shrink-0 shadow-[0_2px_10px_rgba(0,0,0,0.02)] shadow-primary/10 hover:bg-primary/90"
          >
            <Plus size={16} />
            <span>Schedule 1:1 Meeting</span>
          </button>
        )}
      </header>

      {(isAdmin || isChapterAdmin) && (
        <div className="space-y-6">
          {/* Member Filter */}
          <div className="bg-[#111827] p-6 rounded-[2.5rem] border border-white/5 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 bg-primary/10 rounded-[12px] flex items-center justify-center text-primary">
                <Users size={20} />
              </div>
              <h2 className="text-sm font-bold text-white uppercase tracking-widest">Filter by Member</h2>
            </div>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="flex-1 px-4 py-3 rounded-[12px] border border-white/5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-sm bg-[#151C2E] text-white"
            >
              <option value="" className="bg-[#111827] text-white">All Members (Overall Analytics)</option>
              {members.sort((a, b) => a.name.localeCompare(b.name)).map(m => (
                <option key={m.uid} value={m.uid} className="bg-[#111827] text-white">{m.name} ({m.businessName || 'No Business'})</option>
              ))}
            </select>
          </div>

          {/* Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => {
                setHistoryType('scheduled');
                setIsHistoryModalOpen(true);
              }}
              className="group relative bg-[#0F172A] p-6 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden text-left transition-all hover:scale-[1.02]"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="relative z-10">
                <div className="w-12 h-12 bg-white/10 rounded-[16px] flex items-center justify-center text-primary mb-6">
                  <Calendar size={24} />
                </div>
                <p className="text-[10px] font-bold text-neutral-300 uppercase tracking-[0.2em] mb-2">Total Meetings Scheduled</p>
                <h2 className="text-4xl font-bold text-white tracking-tight">{stats?.scheduled}</h2>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-4 flex items-center gap-2">
                  View Detailed History <ChevronRight size={12} />
                </p>
              </div>
            </button>

            <button
              onClick={() => {
                setHistoryType('attended');
                setIsHistoryModalOpen(true);
              }}
              className="group relative bg-[#111827] p-6 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden text-left transition-all hover:scale-[1.02]"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="relative z-10">
                <div className="w-12 h-12 bg-primary/10 rounded-[16px] flex items-center justify-center text-primary mb-6">
                  <CheckCircle2 size={24} />
                </div>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] mb-2">Total Meetings Attended</p>
                <h2 className="text-4xl font-bold text-white tracking-tight">{stats?.attended}</h2>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-4 flex items-center gap-2">
                  View Detailed History <ChevronRight size={12} />
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {/* Upcoming Meetings */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary/10 rounded-[12px] flex items-center justify-center text-primary">
              <Calendar size={20} />
            </div>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">Upcoming Meetings</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingMeetings.length > 0 ? (
              upcomingMeetings.map((meeting) => (
                <MeetingCard 
                  key={meeting.id} 
                  meeting={meeting} 
                  allUsersList={allUsersList}
                  chapterMap={chapterMap}
                  isCreator={(meeting.organizer_id || meeting.creatorId) === profile.uid}
                  isAdmin={isAdmin}
                  onUpdate={() => {
                    const currentReceiverId = meeting.receiver_id || meeting.member_id || (meeting.participantIds && meeting.participantIds[0]) || '';
                    const senderId = meeting.sender_id || meeting.organizer_id || meeting.creatorId || '';
                    
                    let locType: 'Online' | 'My Address' | 'Member Address' = 'Online';
                    if (meeting.venue === 'My Address' || meeting.venue?.startsWith('My Address')) {
                      locType = 'My Address';
                    } else if (meeting.venue === 'Member Address' || meeting.venue?.includes("Member's Address")) {
                      locType = 'Member Address';
                    }

                    setUpdatingMeeting(meeting);
                    setUpdateFormData({
                      participantId: currentReceiverId,
                      date: meeting.date || '',
                      time: meeting.time || '',
                      venue: meeting.venue || '',
                      notes: meeting.notes || '',
                      status: meeting.status || 'UPCOMING',
                      attendance: meeting.attendance || {
                        [senderId]: 'PRESENT',
                        [currentReceiverId]: 'PRESENT'
                      }
                    });
                    setUpdateLocationType(locType);
                    setError(null);
                    setShowUpdateSuccess(false);
                    setIsUpdateModalOpen(true);
                  }}
                />
              ))
            ) : (
              <div className="col-span-full p-12 text-center bg-[#111827] rounded-[24px] border border-dashed border-white/5">
                <p className="text-neutral-400 font-medium italic text-xs uppercase tracking-widest">No upcoming meetings scheduled.</p>
              </div>
            )}
          </div>
        </section>

        {/* Meeting History */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#111827] rounded-[12px] flex items-center justify-center text-neutral-400 border border-white/5">
              <History size={20} />
            </div>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">Meeting History</h2>
          </div>
          
          <div className="bg-[#111827] rounded-[24px] border border-white/5 shadow-sm overflow-hidden">
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
                      <div key={meeting.id} className="p-4 hover:bg-[#1C2538] transition-all group">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                          <div className="md:col-span-1">
                            <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Scheduled By</p>
                            <p className="text-[10px] font-bold text-white truncate">{senderName}</p>
                            <p className="text-[8px] text-neutral-400 truncate">{formatUserRoleOrPosition(sender)}</p>
                          </div>
                          <div className="md:col-span-1">
                            <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Meeting With</p>
                            <p className="text-[10px] font-bold text-white truncate">{receiverName}</p>
                            <p className="text-[8px] text-neutral-400 truncate">{formatUserRoleOrPosition(receiver)}</p>
                          </div>
                          <div className="md:col-span-1">
                            <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Date & Time</p>
                            <p className="text-[10px] font-bold text-white">{format(new Date(meeting.date), 'dd MMM yyyy')}</p>
                            <p className="text-[9px] text-neutral-400 font-medium">{formatTime12h(meeting.time)}</p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Location & Note</p>
                            <p className="text-[10px] text-white font-semibold truncate">{locationDisplay}</p>
                            <p className="text-[9px] text-neutral-400 italic line-clamp-1">{meeting.notes || '-'}</p>
                          </div>
                          <div className="md:col-span-1 text-right">
                            <span className={cn(
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider",
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
            <h3 className="text-2xl font-bold text-white uppercase tracking-tight">Meeting Scheduled!</h3>
            <p className="text-neutral-400 font-medium">Your meeting has been successfully created.</p>
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
                  2. My Address {myAddress ? `(${myAddress})` : '(Full Address)'}
                </option>
                <option value="Member Address" className="bg-[#111827] text-white">
                  3. Member's Address {memberAddress ? `(${memberAddress})` : '(Full Address)'}
                </option>
              </select>

              <div className="p-3 bg-[#111827] rounded-[12px] border border-white/5 text-xs text-neutral-300">
                <span className="font-bold text-primary mr-1">Selected Address:</span>
                {locationType === 'Online' && 'Online Meeting'}
                {locationType === 'My Address' && (myAddress || 'Address not specified in profile')}
                {locationType === 'Member Address' && (
                  selectedMember 
                    ? (memberAddress || 'Address not specified in member profile')
                    : 'Please select a member first'
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                        onChange={(e) => handleTimeUpdate(e.target.value, selectedMinute, ampmPart)}
                        className="w-full px-3 py-3 rounded-[12px] border border-white/5 outline-none focus:ring-2 focus:ring-primary font-bold bg-[#151C2E] text-white text-sm"
                      >
                        {hoursList.map(h => (
                          <option key={h} value={h} className="bg-[#111827] text-white">{h}</option>
                        ))}
                      </select>
                      <select
                        value={selectedMinute}
                        onChange={(e) => handleTimeUpdate(selectedHour, e.target.value, ampmPart)}
                        className="w-full px-3 py-3 rounded-[12px] border border-white/5 outline-none focus:ring-2 focus:ring-primary font-bold bg-[#151C2E] text-white text-sm"
                      >
                        {minutesList.map(m => (
                          <option key={m} value={m} className="bg-[#111827] text-white">{m}</option>
                        ))}
                      </select>
                      <select
                        value={ampmPart}
                        onChange={(e) => handleTimeUpdate(selectedHour, selectedMinute, e.target.value as 'AM' | 'PM')}
                        className="w-full px-3 py-3 rounded-[12px] border border-white/5 outline-none focus:ring-2 focus:ring-primary font-bold bg-[#151C2E] text-white text-sm"
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
              className="w-full py-5 bg-primary text-white rounded-[16px] font-bold uppercase tracking-[0.2em] hover:shadow-2xl hover:shadow-primary/30 transition-all active:scale-95 disabled:opacity-50 text-xs"
            >
              {isSubmitting ? 'Scheduling...' : 'Schedule Meeting'}
            </button>
          </form>
        )}
      </Modal>
      {/* Update Meeting Modal */}
      <Modal
        isOpen={isUpdateModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsUpdateModalOpen(false);
            setUpdatingMeeting(null);
            setShowUpdateSuccess(false);
          }
        }}
        title="Update One-to-One Meeting"
      >
        {showUpdateSuccess ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-20 h-20 bg-emerald-500/15 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={48} />
            </div>
            <h3 className="text-2xl font-bold text-white uppercase tracking-tight">Meeting Updated!</h3>
            <p className="text-neutral-400 font-medium">Meeting details have been updated successfully.</p>
          </div>
        ) : updatingMeeting ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdateMeeting();
            }}
            className="space-y-6"
          >
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-[12px] text-sm font-bold flex items-center gap-2">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {/* Member Selection */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Select Member (Receiver)</label>
              <div className="relative">
                <div 
                  onClick={() => setIsUpdateDropdownOpen(!isUpdateDropdownOpen)}
                  className="w-full px-4 py-4 rounded-[16px] border border-white/5 bg-[#151C2E] cursor-pointer flex items-center justify-between group hover:border-primary/50 transition-all"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Users size={18} className="text-neutral-400 group-hover:text-primary transition-colors shrink-0" />
                    {(() => {
                      const selectedUpdateMember = allUsersList.find(m => String(m.id) === String(updateFormData.participantId) || String(m.uid) === String(updateFormData.participantId));
                      if (selectedUpdateMember) {
                        const mName = getUserFullName(selectedUpdateMember);
                        const mRole = formatUserRoleOrPosition(selectedUpdateMember);
                        const mCategory = selectedUpdateMember.category || selectedUpdateMember.business_category || selectedUpdateMember.businessName || selectedUpdateMember.business_name || 'General';
                        const mChapter = chapterMap.get(String(selectedUpdateMember.chapter_id)) || selectedUpdateMember.chapter_name || 'No Chapter';
                        const mPhoto = selectedUpdateMember.photo_url || selectedUpdateMember.photoURL || selectedUpdateMember.avatar_url || selectedUpdateMember.profile_photo;

                        return (
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            {mPhoto ? (
                              <img
                                src={mPhoto}
                                alt={mName}
                                className="w-7 h-7 rounded-full object-cover shrink-0 border border-white/10"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                                {mName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-white truncate">
                                {mName} <span className="text-xs font-semibold text-primary">({mRole})</span>
                              </p>
                              <p className="text-[10px] text-neutral-400 font-medium truncate">
                                {mCategory} • {mChapter}
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return <span className="text-sm font-medium text-neutral-400">Select a member...</span>;
                    })()}
                  </div>
                  <ChevronRight size={18} className={cn("text-neutral-400 transition-transform", isUpdateDropdownOpen ? "rotate-90" : "")} />
                </div>

                {isUpdateDropdownOpen && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-[#111827] rounded-[16px] border border-white/5 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3 border-b border-white/5 bg-[#151C2E]">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
                        <input
                          type="text"
                          placeholder="Search member by name..."
                          value={updateSearchTerm}
                          onChange={(e) => setUpdateSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 text-xs rounded-[12px] border border-white/5 bg-[#111827] text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>

                    <div className="max-h-52 overflow-y-auto p-3 custom-scrollbar space-y-2">
                      {members
                        .filter(m => getUserFullName(m).toLowerCase().includes(updateSearchTerm.toLowerCase()))
                        .map((member) => {
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
                                setUpdateFormData(prev => ({ ...prev, participantId: memberIdToUse }));
                                setIsUpdateDropdownOpen(false);
                              }}
                              className={cn(
                                "group/item flex items-center justify-between p-3 rounded-[12px] cursor-pointer transition-all",
                                String(updateFormData.participantId) === String(memberIdToUse)
                                  ? "bg-primary/10 border border-primary/20 shadow-sm"
                                  : "bg-[#111827] border border-white/5 hover:bg-[#1C2538]"
                              )}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {mPhoto ? (
                                  <img
                                    src={mPhoto}
                                    alt={mName}
                                    className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/10"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                                    {mName.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-white uppercase tracking-tight truncate">{mName} <span className="text-primary font-semibold">({mRole})</span></p>
                                  <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest truncate mt-0.5">{mCategory} • {mChapter}</p>
                                </div>
                              </div>
                              {String(updateFormData.participantId) === String(memberIdToUse) && (
                                <CheckCircle2 size={16} className="text-primary shrink-0 ml-2" />
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Meeting Location */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Meeting Location</label>
              <select
                value={updateLocationType}
                onChange={(e) => setUpdateLocationType(e.target.value as 'Online' | 'My Address' | 'Member Address')}
                className="w-full px-4 py-4 rounded-[16px] border border-white/5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm bg-[#151C2E] text-white cursor-pointer"
              >
                <option value="Online" className="bg-[#111827] text-white">1. Online Meeting</option>
                <option value="My Address" className="bg-[#111827] text-white">2. My Address</option>
                <option value="Member Address" className="bg-[#111827] text-white">3. Member's Address</option>
              </select>
            </div>

            {/* Meeting Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Meeting Date</label>
                <input
                  type="date"
                  value={updateFormData.date}
                  onChange={(e) => setUpdateFormData({ ...updateFormData, date: e.target.value })}
                  className="w-full px-4 py-4 rounded-[16px] border border-white/5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium bg-[#151C2E] text-white"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Meeting Time</label>
                {(() => {
                  const { time: timePart, ampm: ampmPart } = parseTo12hParts(updateFormData.time || '10:00 AM');
                  const [selectedHour, selectedMinute] = timePart.split(':');
                  const hoursList = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
                  const minutesList = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

                  const handleTimeUpdate = (hour: string, minute: string, ampm: 'AM' | 'PM') => {
                    setUpdateFormData({ ...updateFormData, time: `${hour}:${minute} ${ampm}` });
                  };

                  return (
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        value={selectedHour}
                        onChange={(e) => handleTimeUpdate(e.target.value, selectedMinute, ampmPart)}
                        className="w-full px-3 py-3 rounded-[12px] border border-white/5 outline-none focus:ring-2 focus:ring-primary font-bold bg-[#151C2E] text-white text-sm"
                      >
                        {hoursList.map(h => (
                          <option key={h} value={h} className="bg-[#111827] text-white">{h}</option>
                        ))}
                      </select>
                      <select
                        value={selectedMinute}
                        onChange={(e) => handleTimeUpdate(selectedHour, e.target.value, ampmPart)}
                        className="w-full px-3 py-3 rounded-[12px] border border-white/5 outline-none focus:ring-2 focus:ring-primary font-bold bg-[#151C2E] text-white text-sm"
                      >
                        {minutesList.map(m => (
                          <option key={m} value={m} className="bg-[#111827] text-white">{m}</option>
                        ))}
                      </select>
                      <select
                        value={ampmPart}
                        onChange={(e) => handleTimeUpdate(selectedHour, selectedMinute, e.target.value as 'AM' | 'PM')}
                        className="w-full px-3 py-3 rounded-[12px] border border-white/5 outline-none focus:ring-2 focus:ring-primary font-bold bg-[#151C2E] text-white text-sm"
                      >
                        <option value="AM" className="bg-[#111827] text-white">AM</option>
                        <option value="PM" className="bg-[#111827] text-white">PM</option>
                      </select>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Attendance Toggles */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Attendance</label>
              <div className="space-y-3">
                {[
                  updatingMeeting.sender_id || updatingMeeting.organizer_id || updatingMeeting.creatorId,
                  updateFormData.participantId || updatingMeeting.receiver_id || updatingMeeting.member_id || (updatingMeeting.participantIds && updatingMeeting.participantIds[0])
                ].filter(Boolean).map(uid => {
                  const member = allUsersList.find(m => String(m.id) === String(uid) || String(m.uid) === String(uid));
                  const mName = getUserFullName(member) || 'Participant';
                  const mPhoto = member?.photo_url || member?.photoURL || member?.avatar_url || member?.profile_photo;

                  return (
                    <div key={uid} className="flex items-center justify-between p-3 bg-[#151C2E] rounded-[12px] border border-white/5">
                      <div className="flex items-center gap-3">
                        {mPhoto ? (
                          <img src={mPhoto} className="w-8 h-8 rounded-lg object-cover" referrerPolicy="no-referrer" alt={mName} />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                            {mName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs font-bold text-white">{mName}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setUpdateFormData(prev => ({
                            ...prev,
                            attendance: { ...prev.attendance, [uid]: 'PRESENT' }
                          }))}
                          className={cn(
                            "px-3 py-1 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all",
                            updateFormData.attendance[uid] === 'PRESENT' 
                              ? "bg-emerald-600 text-white" 
                              : "bg-[#111827] text-neutral-400 border border-white/5"
                          )}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          onClick={() => setUpdateFormData(prev => ({
                            ...prev,
                            attendance: { ...prev.attendance, [uid]: 'ABSENT' }
                          }))}
                          className={cn(
                            "px-3 py-1 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all",
                            updateFormData.attendance[uid] === 'ABSENT' 
                              ? "bg-red-600 text-white" 
                              : "bg-[#111827] text-neutral-400 border border-white/5"
                          )}
                        >
                          Absent
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Meeting Notes</label>
              <textarea
                rows={3}
                value={updateFormData.notes}
                onChange={(e) => setUpdateFormData({ ...updateFormData, notes: e.target.value })}
                placeholder="Add any final notes or outcomes..."
                className="w-full px-4 py-4 rounded-[16px] border border-white/5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium resize-none text-sm bg-[#151C2E] text-white"
              />
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="py-4 bg-primary text-white rounded-[16px] font-bold uppercase tracking-widest hover:bg-primary/90 transition-all text-[10px] disabled:opacity-50"
              >
                {isSubmitting ? 'Updating...' : 'Save & Update Meeting'}
              </button>
              <button
                type="button"
                onClick={() => handleUpdateMeeting('COMPLETED')}
                disabled={isSubmitting}
                className="py-4 bg-emerald-600 text-white rounded-[16px] font-bold uppercase tracking-widest hover:bg-emerald-700 transition-all text-[10px] disabled:opacity-50"
              >
                Mark Completed
              </button>
            </div>
          </form>
        ) : null}
      </Modal>

      {/* History Table Modal for Master Admin */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={historyType === 'scheduled' ? 'Scheduled Meetings History' : 'Attended Meetings History'}
        maxWidth="max-w-6xl"
      >
        <div className="bg-[#111827] rounded-[16px] overflow-hidden border border-white/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
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

                    const senderName = getUserFullName(sender) || 'Sender';
                    const receiverName = getUserFullName(receiver) || 'Receiver';

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

  const isOverdue = meeting.status === 'UPCOMING' && isAfter(new Date(), new Date(meeting.date + 'T23:59:59'));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={cn(
        "group relative bg-[#111827] p-5 rounded-[16px] border transition-all duration-300 flex flex-col h-full overflow-hidden",
        isOverdue 
          ? "border-red-500/20 shadow-sm bg-red-500/10" 
          : "border-white/5 shadow-sm hover:border-white/10 hover:shadow-2xl"
      )}
    >
      <div className={cn(
        "absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 transition-transform duration-700 group-hover:scale-110 opacity-70",
        isOverdue ? "bg-red-500/5" : "bg-primary/5"
      )} />
      
      <div className="relative z-10 flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            "w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300",
            isOverdue ? "bg-red-500 text-white" : (isCreator ? "bg-primary text-white" : "bg-[#151C2E] text-white")
          )}>
            <Users size={22} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-white tracking-tight leading-tight truncate">
              {isAdmin ? 'One-to-One Meeting' : (isCreator ? 'Organized by You' : 'Invited to Meeting')}
            </h3>
            <p className="text-[11px] text-neutral-400 font-medium mt-0.5">
              Scheduled By: {senderName}
            </p>
          </div>
        </div>
        <div className={cn(
          "px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border shrink-0 flex items-center gap-1.5",
          isOverdue 
            ? "bg-red-500/10 text-red-400 border-red-500/20" 
            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        )}>
          {isOverdue && <AlertTriangle size={12} />}
          {isOverdue ? 'Action Pending' : 'Upcoming'}
        </div>
      </div>

      <div className="relative z-10 space-y-3 mb-5 flex-grow">
        {/* Participants Section */}
        <div className="p-3 bg-[#151C2E] rounded-[12px] border border-white/5 space-y-2">
          <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Participants</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Sender */}
            <div className="flex items-center gap-2.5 min-w-0">
              {senderPhoto ? (
                <img src={senderPhoto} className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/10" alt={senderName} referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                  {senderName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[8px] font-bold text-primary uppercase tracking-wider">Sender (Host)</p>
                <p className="text-xs font-bold text-white truncate">{senderName}</p>
                <p className="text-[9px] text-neutral-400 font-medium truncate">{senderRole} • {senderChapter}</p>
              </div>
            </div>

            {/* Receiver */}
            <div className="flex items-center gap-2.5 min-w-0">
              {receiverPhoto ? (
                <img src={receiverPhoto} className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/10" alt={receiverName} referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                  {receiverName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[8px] font-bold text-primary uppercase tracking-wider">Receiver (Participant)</p>
                <p className="text-xs font-bold text-white truncate">{receiverName}</p>
                <p className="text-[9px] text-neutral-400 font-medium truncate">{receiverRole} • {receiverChapter}</p>
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
          "relative z-10 w-full py-3 rounded-[12px] font-bold uppercase tracking-[0.2em] text-[8px] transition-all duration-500 flex items-center justify-center gap-2 mt-auto",
          isOverdue 
            ? "bg-red-600 text-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] shadow-red-500/30 hover:bg-red-700" 
            : "bg-[#151C2E] text-neutral-400 group-hover:bg-primary group-hover:text-white group-hover:shadow-2xl"
        )}
      >
        <span>{isOverdue ? 'Update Now' : 'Update Meeting'}</span>
        <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
      </button>
    </motion.div>
  );
};
