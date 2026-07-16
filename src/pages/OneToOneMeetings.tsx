import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Users, Calendar, Clock, CircleCheck as CheckCircle2, Search, UserPlus, History, ChevronRight, X, TriangleAlert as AlertTriangle, CircleAlert as AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { firestoreService } from '../services/firestoreService';
import { OneToOneMeeting, UserProfile } from '../types';
import { Modal } from '../components/Modal';
import { format, isAfter, parseISO } from 'date-fns';
import { where, orderBy, collection, getDocs, query, or } from 'firebase/firestore';
import { db } from '../firebase';
import { cn } from '../lib/utils';
import { formatTime12h, parseTo12hParts } from '../utils/timeUtils';

export function OneToOneMeetings() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'MASTER_ADMIN';
  const isChapterAdmin = profile?.role === 'CHAPTER_ADMIN';
  const [meetings, setMeetings] = useState<OneToOneMeeting[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyType, setHistoryType] = useState<'scheduled' | 'attended' | 'all'>('all');
  
  // Form state
  const [formData, setFormData] = useState({
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
    if (profile.role !== 'MEMBER' && profile.role !== 'MASTER_ADMIN' && profile.role !== 'CHAPTER_ADMIN') return;

    // Fetch meetings
    const meetingsConstraints = (isAdmin || isChapterAdmin)
      ? [orderBy('date', 'desc')]
      : [
          or(
            where('creatorId', '==', profile.uid),
            where('participantIds', 'array-contains', profile.uid)
          ),
          orderBy('date', 'desc')
        ];

    const unsubscribe = firestoreService.subscribe<OneToOneMeeting>(
      'one_to_one_meetings',
      meetingsConstraints,
      (data) => {
        setMeetings(data);
        setLoading(false);
      }
    );

    // Fetch all members for selection
    const fetchMembers = async () => {
      if (!profile) return;
      let q;
      if (isChapterAdmin) {
        q = query(
          collection(db, 'users'), 
          where('associatedChapterAdminId', '==', profile.uid),
          where('membershipStatus', '==', 'ACTIVE')
        );
      } else {
        q = query(
          collection(db, 'users'), 
          where('membershipStatus', '==', 'ACTIVE')
        );
      }
      const snap = await getDocs(q);
      const memberList = snap.docs
        .map(doc => ({ uid: doc.id, ...(doc.data() as any) } as UserProfile))
        .filter(m => m.uid !== profile.uid); // Strictly exclude self
      setMembers(memberList);
    };
    fetchMembers();

    return () => unsubscribe();
  }, [profile, isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!formData.participantId) {
      alert('Please select a member.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const meetingDate = parseISO(formData.date);
      const now = new Date();
      const status = isAfter(meetingDate, now) ? 'UPCOMING' : 'COMPLETED';

      const newMeeting: Omit<OneToOneMeeting, 'id'> = {
        creatorId: profile.uid,
        participantIds: [formData.participantId],
        date: formData.date,
        time: formData.time,
        venue: formData.venue,
        notes: formData.notes,
        status,
        createdAt: new Date().toISOString()
      };

      await firestoreService.create('one_to_one_meetings', newMeeting);
      
      setShowSuccess(true);
      setFormData({ 
        participantId: '', 
        date: '', 
        time: '', 
        venue: '',
        notes: '' 
      });
      
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
      await firestoreService.update('one_to_one_meetings', updatingMeeting.id, {
        status,
        notes: updateFormData.notes,
        attendance: updateFormData.attendance,
        updatedAt: new Date().toISOString()
      });
      setIsUpdateModalOpen(false);
      setUpdatingMeeting(null);
    } catch (err: any) {
      console.error("Error updating meeting:", err);
      setError(err.message || "Failed to update meeting status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedMember = members.find(m => m.uid === formData.participantId);
  const locationOptions = [
    { label: `Your Address: ${profile?.address || 'N/A'}`, value: profile?.address || '' },
    { label: `${selectedMember?.name}'s Address: ${selectedMember?.address || 'N/A'}`, value: selectedMember?.address || '' }
  ].filter(opt => opt.value);

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.area?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  if (profile?.role !== 'MEMBER' && profile?.role !== 'MASTER_ADMIN' && profile?.role !== 'CHAPTER_ADMIN') {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-neutral-900">Access Denied</h2>
        <p className="text-neutral-500 mt-2">This feature is only available for Members, Chapter Admins and Master Admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-neutral-200/80 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shrink-0 shadow-sm shadow-primary/10">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-neutral-900 tracking-tight">
              1-to-1 Meetings
            </h1>
            <p className="text-sm text-neutral-500 font-medium mt-0.5">
              Personalized direct business networking
            </p>
          </div>
        </div>
        {!isAdmin && !isChapterAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-6 h-11 bg-primary text-white rounded-xl font-bold transition-all active:scale-95 text-sm shrink-0 shadow-lg shadow-primary/20 hover:bg-primary/90 hover:shadow-xl hover:-translate-y-0.5"
          >
            <Plus size={16} />
            <span>Schedule 1:1 Meeting</span>
          </button>
        )}
      </header>

      {(isAdmin || isChapterAdmin) && (
        <div className="space-y-6">
          {/* Member Filter */}
          <div className="bg-white p-6 rounded-[20px] border border-neutral-200/80 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <Users size={20} />
              </div>
              <h2 className="text-sm font-bold text-neutral-700">Filter by Member</h2>
            </div>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm"
            >
              <option value="">All Members (Overall Analytics)</option>
              {members.sort((a, b) => a.name.localeCompare(b.name)).map(m => (
                <option key={m.uid} value={m.uid}>{m.name} ({m.businessName || 'No Business'})</option>
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
              className="group relative bg-navy p-8 rounded-[20px] shadow-xl shadow-navy/20 overflow-hidden text-left transition-all hover:-translate-y-1 hover:shadow-2xl border border-navy/40"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="relative z-10">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-primary mb-6">
                  <Calendar size={24} />
                </div>
                <p className="text-xs font-semibold text-neutral-300 mb-2">Total Meetings Scheduled</p>
                <h2 className="text-4xl font-bold text-white tracking-tight">{stats?.scheduled}</h2>
                <p className="text-xs font-bold text-primary mt-4 flex items-center gap-2">
                  View Detailed History <ChevronRight size={12} />
                </p>
              </div>
            </button>

            <button
              onClick={() => {
                setHistoryType('attended');
                setIsHistoryModalOpen(true);
              }}
              className="group relative bg-white p-8 rounded-[20px] border border-neutral-200/80 shadow-sm hover:shadow-md overflow-hidden text-left transition-all hover:-translate-y-1 hover:border-neutral-300"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="relative z-10">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-6">
                  <CheckCircle2 size={24} />
                </div>
                <p className="text-xs font-semibold text-neutral-500 mb-2">Total Meetings Attended</p>
                <h2 className="text-4xl font-bold text-neutral-900 tracking-tight">{stats?.attended}</h2>
                <p className="text-xs font-bold text-primary mt-4 flex items-center gap-2">
                  View Detailed History <ChevronRight size={12} />
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8">
        {/* Upcoming Meetings */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Calendar size={20} />
            </div>
            <h2 className="text-lg font-bold text-neutral-900 tracking-tight">Upcoming Meetings</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingMeetings.length > 0 ? (
              upcomingMeetings.map((meeting) => (
                <MeetingCard 
                  key={meeting.id} 
                  meeting={meeting} 
                  members={members} 
                  isCreator={meeting.creatorId === profile.uid}
                  isAdmin={isAdmin}
                  onUpdate={() => {
                    setUpdatingMeeting(meeting);
                    setUpdateFormData({
                      notes: meeting.notes || '',
                      attendance: meeting.attendance || {
                        [meeting.creatorId]: 'PRESENT',
                        [meeting.participantIds[0]]: 'PRESENT'
                      }
                    });
                    setIsUpdateModalOpen(true);
                  }}
                />
              ))
            ) : (
              <div className="col-span-full p-12 text-center bg-white rounded-[18px] border border-dashed border-neutral-300 hover:border-neutral-400 transition-colors">
                <Calendar size={32} className="mx-auto text-neutral-300 mb-3" />
                <p className="text-sm text-neutral-500 font-medium">No upcoming meetings scheduled.</p>
              </div>
            )}
          </div>
        </section>

        {/* Meeting History */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center text-neutral-500">
              <History size={20} />
            </div>
            <h2 className="text-lg font-bold text-neutral-900 tracking-tight">Meeting History</h2>
          </div>
          
          <div className="bg-white rounded-[20px] border border-neutral-200/80 shadow-sm overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
              <div className="divide-y divide-neutral-100">
                {pastMeetings.length > 0 ? (
                  pastMeetings.map((meeting) => {
                    const creator = members.find(m => m.uid === meeting.creatorId) || (meeting.creatorId === profile.uid ? profile : null);
                    const participant = members.find(m => m.uid === meeting.participantIds[0]) || (meeting.participantIds[0] === profile.uid ? profile : null);
                    const myAttendance = meeting.attendance?.[profile.uid] || 'ABSENT';

                    return (
                      <div key={meeting.id} className="p-4 hover:bg-neutral-50/80 transition-all group">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                          <div className="md:col-span-1">
                            <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Scheduled By</p>
                            <p className="text-[14px] font-semibold text-neutral-900 truncate">{creator?.name || 'Unknown'}</p>
                          </div>
                          <div className="md:col-span-1">
                            <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Meeting With</p>
                            <p className="text-[14px] font-semibold text-neutral-900 truncate">{participant?.name || 'Unknown'}</p>
                          </div>
                          <div className="md:col-span-1">
                            <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Date & Time</p>
                            <p className="text-[14px] font-semibold text-neutral-900">{format(new Date(meeting.date), 'dd MMM yyyy')}</p>
                            <p className="text-xs text-neutral-500 font-medium">{formatTime12h(meeting.time)}</p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Note</p>
                            <p className="text-[14px] text-neutral-600 italic line-clamp-1">{meeting.notes || '-'}</p>
                          </div>
                          <div className="md:col-span-1 text-right">
                            <span className={cn(
                              "inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border",
                              myAttendance === 'PRESENT' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
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
                    <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-300">
                      <History size={32} />
                    </div>
                    <p className="text-sm text-neutral-500 font-medium">No meeting history found.</p>
                    <p className="text-xs text-neutral-400 font-medium mt-1">Past meetings will appear here once completed.</p>
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
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title="Schedule One-to-One Meeting"
      >
        {showSuccess ? (
          <div className="py-12 text-center space-y-4">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={48} />
            </div>
            <h3 className="text-2xl font-bold text-neutral-900 tracking-tight">Meeting Scheduled!</h3>
            <p className="text-sm text-neutral-500 font-medium">Your meeting has been successfully created.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium flex items-center gap-2">
                <AlertCircle size={18} />
                {error}
              </div>
            )}
            {/* Member Selection - Searchable Dropdown */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-neutral-700">Select Member</label>
              <div className="relative">
                <div 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full px-4 py-4 rounded-xl border border-neutral-200 bg-white cursor-pointer flex items-center justify-between group hover:border-primary transition-all"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Users size={18} className="text-neutral-400 group-hover:text-primary transition-colors shrink-0" />
                    {formData.participantId ? (
                      <span className="text-sm font-semibold text-neutral-900 truncate">
                        {members.find(m => m.uid === formData.participantId)?.name}
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-neutral-400">Select a member...</span>
                    )}
                  </div>
                  <ChevronRight size={18} className={cn("text-neutral-400 transition-transform", isDropdownOpen ? "rotate-90" : "")} />
                </div>

                {isDropdownOpen && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white rounded-xl border border-neutral-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3 border-b border-neutral-100 bg-neutral-50">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
                        <input
                          type="text"
                          placeholder="Search across all chapters..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-neutral-200 bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto p-3 custom-scrollbar space-y-2">
                      {filteredMembers.length > 0 ? (
                        filteredMembers.map((member) => (
                          <div
                            key={member.uid}
                            onClick={(e) => {
                              e.stopPropagation();
                              setFormData(prev => ({ ...prev, participantId: member.uid, venue: '' }));
                              setIsDropdownOpen(false);
                            }}
                            className={cn(
                              "group/item flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all",
                              formData.participantId === member.uid
                                ? "bg-primary/10 border border-primary/20 shadow-sm"
                                : "bg-white border border-neutral-100 hover:bg-neutral-50 hover:border-neutral-200"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={member.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`}
                                className="w-10 h-10 rounded-lg object-cover shadow-sm"
                                referrerPolicy="no-referrer"
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-neutral-900 tracking-tight">
                                  {member.name}
                                </p>
                                <p className="text-xs font-medium text-neutral-500 truncate">
                                  {member.category || 'General'} • {member.area || 'Global'}
                                </p>
                              </div>
                            </div>
                            {formData.participantId === member.uid && (
                              <CheckCircle2 size={16} className="text-primary" />
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center">
                          <p className="text-sm text-neutral-400 font-medium italic">No members found.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {formData.participantId && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-700">Meeting Location</label>
                <select
                  required
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm"
                >
                  <option value="">Select a location...</option>
                  {locationOptions.map((opt, idx) => (
                    <option key={idx} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-700">Meeting Date</label>
                <input
                  required
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-700">Meeting Time</label>
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
                        className="w-full px-3 py-3 rounded-xl border border-neutral-200 bg-neutral-50 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-sm"
                      >
                        {hoursList.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <select
                        value={selectedMinute}
                        onChange={(e) => handleTimeUpdate(selectedHour, e.target.value, ampmPart)}
                        className="w-full px-3 py-3 rounded-xl border border-neutral-200 bg-neutral-50 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-sm"
                      >
                        {minutesList.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <select
                        value={ampmPart}
                        onChange={(e) => handleTimeUpdate(selectedHour, selectedMinute, e.target.value as 'AM' | 'PM')}
                        className="w-full px-3 py-3 rounded-xl border border-neutral-200 bg-neutral-50 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-sm"
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-700">Meeting Notes (Optional)</label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="What would you like to discuss?"
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium resize-none text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-primary text-white rounded-xl font-bold hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-95 disabled:opacity-50 text-sm shadow-lg shadow-primary/20"
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
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium flex items-center gap-2">
                <AlertCircle size={18} />
                {error}
              </div>
            )}
            <div className="space-y-4">
              <label className="text-sm font-semibold text-neutral-700">Attendance</label>
              <div className="space-y-3">
                {[updatingMeeting.creatorId, ...updatingMeeting.participantIds].map(uid => {
                  const member = members.find(m => m.uid === uid) || (uid === profile?.uid ? profile : null);
                  return (
                    <div key={uid} className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-200/80">
                      <div className="flex items-center gap-3">
                        <img
                          src={member?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(member?.name || 'User')}&background=random`}
                          className="w-8 h-8 rounded-lg object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-sm font-semibold text-neutral-900">{member?.name || 'Unknown'}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setUpdateFormData(prev => ({
                            ...prev,
                            attendance: { ...prev.attendance, [uid]: 'PRESENT' }
                          }))}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                            updateFormData.attendance[uid] === 'PRESENT' 
                              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20" 
                              : "bg-white text-neutral-500 border border-neutral-200"
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
                            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                            updateFormData.attendance[uid] === 'ABSENT' 
                              ? "bg-red-600 text-white shadow-lg shadow-red-500/20" 
                              : "bg-white text-neutral-500 border border-neutral-200"
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
              <label className="text-sm font-semibold text-neutral-700">Meeting Notes</label>
              <textarea
                rows={3}
                value={updateFormData.notes}
                onChange={(e) => setUpdateFormData({ ...updateFormData, notes: e.target.value })}
                placeholder="Add any final notes or outcomes..."
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium resize-none text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleUpdateMeeting('COMPLETED')}
                disabled={isSubmitting}
                className="py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all text-sm shadow-lg shadow-emerald-500/20"
              >
                Meeting Completed
              </button>
              <button
                onClick={() => handleUpdateMeeting('NOT_COMPLETED')}
                disabled={isSubmitting}
                className="py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all text-sm shadow-lg shadow-red-500/20"
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
        <div className="bg-white rounded-[20px] overflow-hidden border border-neutral-200/80 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200/80">
                  <th className="px-6 py-4 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Scheduled By</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Meeting With</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {historyMeetings.length > 0 ? (
                  historyMeetings.map((meeting) => {
                    const creator = members.find(m => m.uid === meeting.creatorId);
                    const participant = members.find(m => m.uid === meeting.participantIds[0]);
                    
                    return (
                      <tr key={meeting.id} className="hover:bg-neutral-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-[14px] font-semibold text-neutral-900">{creator?.name || 'Unknown'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[14px] font-semibold text-neutral-900">{participant?.name || 'Unknown'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[14px] font-medium text-neutral-700">{format(new Date(meeting.date), 'dd MMM yyyy')}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[14px] font-medium text-neutral-700">{formatTime12h(meeting.time)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border",
                            meeting.status === 'UPCOMING' ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
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
                                  <span className="text-xs font-medium text-neutral-500 truncate max-w-[80px]">{member?.name}:</span>
                                  <span className={cn(
                                    "text-[11px] font-bold uppercase tracking-wider",
                                    status === 'PRESENT' ? "text-emerald-600" : "text-red-600"
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
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <p className="text-sm text-neutral-500 font-medium">No meeting history found.</p>
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
  const participants = meeting.participantIds.map(id => members.find(m => m.uid === id)).filter(Boolean) as UserProfile[];
  const creator = members.find(m => m.uid === meeting.creatorId);
  
  // Check if meeting is overdue (past date but still UPCOMING)
  const isOverdue = meeting.status === 'UPCOMING' && isAfter(new Date(), new Date(meeting.date + 'T23:59:59'));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={cn(
        "group relative bg-white p-5 rounded-[20px] border transition-all duration-300 flex flex-col h-full overflow-hidden hover:-translate-y-1",
        isOverdue 
          ? "border-red-200 shadow-sm bg-red-50/20 hover:shadow-md" 
          : "border-neutral-200/80 shadow-sm hover:shadow-md hover:border-neutral-300"
      )}
    >
      <div className={cn(
        "absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 transition-transform duration-700 group-hover:scale-110 opacity-70",
        isOverdue ? "bg-red-500/5" : "bg-primary/5"
      )} />
      
      <div className="relative z-10 flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300",
            isOverdue ? "bg-red-500 text-white" : (isCreator ? "bg-primary text-white" : "bg-navy text-white")
          )}>
            <Users size={22} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-neutral-900 tracking-tight leading-tight truncate">
              {isAdmin ? 'One-to-One Meeting' : (isCreator ? 'Organized by You' : 'Invited to Meeting')}
            </h3>
            <p className="text-xs text-neutral-500 font-medium mt-0.5">
              {isAdmin ? `Scheduled By: ${creator?.name || 'Unknown'}` : `${meeting.participantIds.length} Participants`}
            </p>
          </div>
        </div>
        <div className={cn(
          "px-2.5 py-1 rounded-full text-[11px] font-semibold border shrink-0 flex items-center gap-1.5",
          isOverdue 
            ? "bg-red-50 text-red-700 border-red-200" 
            : "bg-emerald-50 text-emerald-700 border-emerald-200"
        )}>
          {isOverdue && <AlertTriangle size={12} />}
          {isOverdue ? 'Action Pending' : 'Upcoming'}
        </div>
      </div>

      <div className="relative z-10 space-y-3 mb-5 flex-grow">
        <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200/60">
          <div className="flex -space-x-2 overflow-hidden shrink-0">
            {participants.slice(0, 4).map((p) => (
              <img
                key={p.uid}
                src={p.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random`}
                className="w-8 h-8 rounded-full border-2 border-white shadow-sm object-cover"
                title={p.name}
                referrerPolicy="no-referrer"
              />
            ))}
            {participants.length > 4 && (
              <div className="w-8 h-8 rounded-full bg-white border-2 border-white shadow-sm flex items-center justify-center text-[10px] font-bold text-neutral-500">
                +{participants.length - 4}
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-semibold text-neutral-500">{isAdmin ? 'Meeting With' : 'Participants'}</span>
            <span className="text-sm font-semibold text-neutral-900 truncate">
              {participants.map(p => p.name).join(', ')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1 p-2.5 bg-neutral-50/50 rounded-xl border border-neutral-200/50">
            <Calendar size={12} className="text-primary" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-neutral-500">Date</p>
              <p className="text-sm font-semibold text-neutral-900 truncate">{format(new Date(meeting.date), 'dd MMM yyyy')}</p>
            </div>
          </div>
          <div className="flex flex-col gap-1 p-2.5 bg-neutral-50/50 rounded-xl border border-neutral-200/50">
            <Clock size={12} className="text-primary" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-neutral-500">Time</p>
              <p className="text-sm font-semibold text-neutral-900 truncate">{formatTime12h(meeting.time)}</p>
            </div>
          </div>
        </div>

        {meeting.venue && (
          <div className="flex items-center gap-2.5 p-2.5 bg-neutral-50/50 rounded-xl border border-neutral-200/50">
            <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-primary shadow-sm shrink-0">
              <Search size={12} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-neutral-500">Venue</p>
              <p className="text-sm font-semibold text-neutral-900 truncate" title={meeting.venue}>{meeting.venue}</p>
            </div>
          </div>
        )}

        {meeting.notes && (
          <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-10 h-10 bg-primary/5 rounded-full -mr-5 -mt-5" />
            <p className="text-[11px] text-primary font-bold mb-1 relative z-10">Meeting Notes</p>
            <p className="text-xs text-neutral-600 font-medium italic leading-relaxed line-clamp-2 relative z-10">"{meeting.notes}"</p>
          </div>
        )}
      </div>

      <button 
        onClick={onUpdate}
        className={cn(
          "relative z-10 w-full py-3 rounded-xl font-bold text-xs transition-all duration-300 flex items-center justify-center gap-2 mt-auto",
          isOverdue 
            ? "bg-red-600 text-white shadow-lg shadow-red-500/30 hover:bg-red-700" 
            : "bg-neutral-50 text-neutral-500 group-hover:bg-navy group-hover:text-white group-hover:shadow-lg group-hover:shadow-navy/30"
        )}
      >
        <span>{isOverdue ? 'Update Now' : 'Update Meeting'}</span>
        <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
      </button>
    </motion.div>
  );
};
