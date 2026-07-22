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
  const [updateFormData, setUpdateFormData] = useState({
    notes: '',
    attendance: {} as Record<string, 'PRESENT' | 'ABSENT'>
  });

  useEffect(() => {
    if (!profile) return;

    // Load live users & chapters
    const loadUsersAndChapters = async () => {
      try {
        const { data: usersData, error: uErr } = await supabase
          .from('users')
          .select('*');
        
        if (uErr) console.error("Error fetching users for 1:1 meetings:", uErr);
        if (usersData) {
          setAllUsersList(usersData);
          const memberList = usersData
            .map((doc: any) => ({ uid: doc.id, ...doc } as UserProfile))
            .filter(m => m.role !== 'MASTER_ADMIN');
          setMembers(memberList);
        }

        const { data: chaptersData, error: cErr } = await supabase
          .from('chapters')
          .select('*');
        
        if (cErr) console.error("Error fetching chapters for 1:1 meetings:", cErr);
        if (chaptersData) {
          const cmap = new Map<string, string>();
          chaptersData.forEach((c: any) => {
            if (c.id && c.name) {
              cmap.set(String(c.id).trim().toLowerCase(), c.name);
              cmap.set(String(c.id).trim(), c.name);
            }
          });
          setChapterMap(cmap);
        }
      } catch (err) {
        console.error("Load users & chapters error:", err);
      }
    };

    loadUsersAndChapters();

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
      (data) => {
        setMeetings(data);
        setLoading(false);
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
      const authId = profile?.id || profile?.uid || (await supabase.auth.getUser()).data?.user?.id;
      if (!authId) {
        throw new Error("Logged in user is not authenticated.");
      }

      let senderQuery = supabase.from('users').select('*');
      if (typeof authId === 'number' || (typeof authId === 'string' && /^\d+$/.test(authId))) {
        senderQuery = senderQuery.eq('id', authId);
      } else {
        senderQuery = senderQuery.eq('uid', authId);
      }
      const { data: senderRecord, error: senderErr } = await senderQuery.maybeSingle();

      if (senderErr || !senderRecord) {
        throw new Error("Invalid sender record in users table.");
      }

      const { data: receiverRecord, error: receiverErr } = await supabase
        .from('users')
        .select('*')
        .eq('id', formData.participantId)
        .maybeSingle();

      if (receiverErr || !receiverRecord) {
        throw new Error("The selected member is invalid.");
      }

      const sender_id = senderRecord.id;
      const receiver_id = receiverRecord.id;
      const chapter_id = senderRecord.chapter_id || receiverRecord.chapter_id || profile?.chapter_id;

      if (!chapter_id && senderRecord.role !== 'MASTER_ADMIN') {
        throw new Error("Your account is not assigned to any chapter. Please contact your Chapter Admin.");
      }

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

      const newMeetingPayload = {
        sender_id: sender_id,
        receiver_id: receiver_id,
        organizer_id: sender_id,
        member_id: receiver_id,
        creatorId: sender_id,
        participantIds: [receiver_id],
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
        created_at: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      const { error: dbErr } = await supabase
        .from('one_to_one_meetings')
        .insert([newMeetingPayload]);

      if (dbErr) {
        console.warn("Direct insert error in one_to_one_meetings, trying databaseService fallback:", dbErr);
        await databaseService.create('one_to_one_meetings', newMeetingPayload);
      }

      window.dispatchEvent(new CustomEvent('dashboard-refresh'));

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
      }, 2000);

    } catch (err: any) {
      console.error("Error creating one-to-one meeting:", err);
      setError(err.message || "Failed to schedule meeting. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateMeeting = async (status: 'COMPLETED' | 'NOT_COMPLETED') => {
    if (!updatingMeeting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await databaseService.update('one_to_one_meetings', updatingMeeting.id, {
        status,
        notes: updateFormData.notes,
        attendance: updateFormData.attendance,
        updatedAt: new Date().toISOString()
      });
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));
      setIsUpdateModalOpen(false);
      setUpdatingMeeting(null);
    } catch (err: any) {
      console.error("Error updating meeting:", err);
      setError(err.message || "Failed to update meeting status.");
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
                  members={members} 
                  isCreator={(meeting.organizer_id || meeting.creatorId) === profile.uid}
                  isAdmin={isAdmin}
                  onUpdate={() => {
                    setUpdatingMeeting(meeting);
                    setUpdateFormData({
                      notes: meeting.notes || '',
                      attendance: meeting.attendance || {
                        [(meeting.organizer_id || meeting.creatorId)]: 'PRESENT',
                        [(meeting.member_id || (meeting.participantIds && meeting.participantIds[0]))]: 'PRESENT'
                      }
                    });
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
                    const creator = members.find(m => m.uid === (meeting.organizer_id || meeting.creatorId)) || ((meeting.organizer_id || meeting.creatorId) === profile.uid ? profile : null);
                    const participant = members.find(m => m.uid === (meeting.member_id || (meeting.participantIds && meeting.participantIds[0]))) || ((meeting.member_id || (meeting.participantIds && meeting.participantIds[0])) === profile.uid ? profile : null);
                    const myAttendance = meeting.attendance?.[profile.uid] || 'ABSENT';

                    return (
                      <div key={meeting.id} className="p-4 hover:bg-[#1C2538] transition-all group">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                          <div className="md:col-span-1">
                            <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Scheduled By</p>
                            <p className="text-[10px] font-bold text-white truncate">{creator?.name || 'Unknown'}</p>
                          </div>
                          <div className="md:col-span-1">
                            <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Meeting With</p>
                            <p className="text-[10px] font-bold text-white truncate">{participant?.name || 'Unknown'}</p>
                          </div>
                          <div className="md:col-span-1">
                            <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Date & Time</p>
                            <p className="text-[10px] font-bold text-white">{format(new Date(meeting.date), 'dd MMM yyyy')}</p>
                            <p className="text-[9px] text-neutral-400 font-medium">{formatTime12h(meeting.time)}</p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Note</p>
                            <p className="text-[10px] text-neutral-400 italic line-clamp-1">{meeting.notes || '-'}</p>
                          </div>
                          <div className="md:col-span-1 text-right">
                            <span className={cn(
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider",
                              myAttendance === 'PRESENT' ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                            )}>
                              {myAttendance}
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
        onClose={() => !isSubmitting && setIsUpdateModalOpen(false)}
        title="Update Meeting Status"
      >
        {updatingMeeting && (
          <div className="space-y-6">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-[12px] text-sm font-bold flex items-center gap-2">
                <AlertCircle size={18} />
                {error}
              </div>
            )}
            <div className="space-y-4">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Attendance</label>
              <div className="space-y-3">
                {[updatingMeeting.creatorId, ...updatingMeeting.participantIds].map(uid => {
                  const member = members.find(m => m.uid === uid) || (uid === profile?.uid ? profile : null);
                  return (
                    <div key={uid} className="flex items-center justify-between p-3 bg-[#151C2E] rounded-[12px] border border-white/5">
                      <div className="flex items-center gap-3">
                        <img
                          src={member?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(member?.name || 'User')}&background=random`}
                          className="w-8 h-8 rounded-lg object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-xs font-bold text-white">{member?.name || 'Unknown'}</span>
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

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleUpdateMeeting('COMPLETED')}
                disabled={isSubmitting}
                className="py-4 bg-emerald-600 text-white rounded-[16px] font-bold uppercase tracking-widest hover:bg-emerald-700 transition-all text-[10px]"
              >
                Meeting Completed
              </button>
              <button
                onClick={() => handleUpdateMeeting('NOT_COMPLETED')}
                disabled={isSubmitting}
                className="py-4 bg-red-600 text-white rounded-[16px] font-bold uppercase tracking-widest hover:bg-red-700 transition-all text-[10px]"
              >
                Not Completed
              </button>
            </div>
          </div>
        )}
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
                    const creator = members.find(m => m.uid === (meeting.organizer_id || meeting.creatorId));
                    const participant = members.find(m => m.uid === (meeting.member_id || (meeting.participantIds && meeting.participantIds[0])));
                    
                    return (
                      <tr key={meeting.id} className="hover:bg-[#1C2538] transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-white">{creator?.name || 'Unknown'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-white">{participant?.name || 'Unknown'}</span>
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
                              const member = members.find(m => m.uid === uid);
                              return (
                                <div key={uid} className="flex items-center gap-2">
                                  <span className="text-[9px] font-bold text-neutral-400 truncate max-w-[80px]">{member?.name}:</span>
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
  members: UserProfile[];
  isCreator: boolean;
  isAdmin?: boolean;
  onUpdate?: () => void;
}

const MeetingCard: React.FC<MeetingCardProps> = ({ meeting, members, isCreator, isAdmin, onUpdate }) => {
  const participants = ([meeting.member_id || (meeting.participantIds && meeting.participantIds[0])].filter(Boolean)).map(id => members.find(m => m.uid === id)).filter(Boolean) as UserProfile[];
  const creator = members.find(m => m.uid === (meeting.organizer_id || meeting.creatorId));
  
  // Check if meeting is overdue (past date but still UPCOMING)
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
              {isAdmin ? `Scheduled By: ${creator?.name || 'Unknown'}` : `${1} Participants`}
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
        <div className="flex items-center gap-3 p-3 bg-[#151C2E] rounded-[12px] border border-white/5">
          <div className="flex -space-x-2 overflow-hidden shrink-0">
            {participants.slice(0, 4).map((p) => (
              <img
                key={p.uid}
                src={p.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random`}
                className="w-8 h-8 rounded-full border-2 border-[#151C2E] shadow-sm object-cover"
                title={p.name}
                referrerPolicy="no-referrer"
              />
            ))}
            {participants.length > 4 && (
              <div className="w-8 h-8 rounded-full bg-[#111827] border-2 border-[#151C2E] shadow-sm flex items-center justify-center text-[10px] font-bold text-neutral-400">
                +{participants.length - 4}
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">{isAdmin ? 'Meeting With' : 'Participants'}</span>
            <span className="text-xs font-semibold text-white truncate">
              {participants.map(p => p.name).join(', ')}
            </span>
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

        {meeting.venue && (
          <div className="flex items-center gap-2.5 p-2.5 bg-[#151C2E] rounded-[12px] border border-white/5">
            <div className="w-6 h-6 bg-[#111827] rounded-lg flex items-center justify-center text-primary shadow-sm shrink-0">
              <Search size={12} />
            </div>
            <div className="min-w-0">
              <p className="text-[7px] font-bold text-neutral-400 uppercase tracking-widest">Venue</p>
              <p className="text-[10px] font-bold text-white uppercase tracking-tight truncate" title={meeting.venue}>{meeting.venue}</p>
            </div>
          </div>
        )}

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
