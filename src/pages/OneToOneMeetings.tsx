import React, { useState, useEffect } from 'react';
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
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { firestoreService } from '../services/firestoreService';
import { OneToOneMeeting, UserProfile } from '../types';
import { Modal } from '../components/Modal';
import { format, isAfter, parseISO } from 'date-fns';
import { where, orderBy, collection, getDocs, query, or } from 'firebase/firestore';
import { db } from '../firebase';
import { cn } from '../lib/utils';

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
      
    } catch (error) {
      console.error("Error creating one-to-one meeting:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateMeeting = async (status: 'COMPLETED' | 'NOT_COMPLETED') => {
    if (!updatingMeeting) return;
    setIsSubmitting(true);
    try {
      await firestoreService.update('one_to_one_meetings', updatingMeeting.id, {
        status,
        notes: updateFormData.notes,
        attendance: updateFormData.attendance,
        updatedAt: new Date().toISOString()
      });
      setIsUpdateModalOpen(false);
      setUpdatingMeeting(null);
    } catch (error) {
      console.error("Error updating meeting:", error);
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
        <h2 className="text-xl font-bold text-slate-900">Access Denied</h2>
        <p className="text-slate-500 mt-2">This feature is only available for Members, Chapter Admins and Master Admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-6 md:py-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-black text-navy tracking-tight font-display uppercase">One-to-One Meetings</h1>
          <p className="text-sm text-muted-foreground font-medium max-w-2xl">
            {(isAdmin || isChapterAdmin) ? 'Monitor and analyze personal networking sessions across all chapters.' : 'Schedule and manage your personal networking sessions.'}
          </p>
        </div>
        {!isAdmin && !isChapterAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:shadow-2xl hover:shadow-primary/30 transition-all active:scale-95 text-xs shrink-0"
          >
            <Plus size={18} />
            <span>Schedule Meeting</span>
          </button>
        )}
      </header>

      {(isAdmin || isChapterAdmin) && (
        <div className="space-y-6">
          {/* Member Filter */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <Users size={20} />
              </div>
              <h2 className="text-sm font-black text-navy uppercase tracking-widest">Filter by Member</h2>
            </div>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-sm bg-slate-50"
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
              className="group relative bg-navy p-8 rounded-[2.5rem] shadow-2xl shadow-navy/20 overflow-hidden text-left transition-all hover:scale-[1.02]"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="relative z-10">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-primary mb-6">
                  <Calendar size={24} />
                </div>
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-2">Total Meetings Scheduled</p>
                <h2 className="text-4xl font-black text-white tracking-tight">{stats?.scheduled}</h2>
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-4 flex items-center gap-2">
                  View Detailed History <ChevronRight size={12} />
                </p>
              </div>
            </button>

            <button
              onClick={() => {
                setHistoryType('attended');
                setIsHistoryModalOpen(true);
              }}
              className="group relative bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-navy/5 overflow-hidden text-left transition-all hover:scale-[1.02]"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="relative z-10">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6">
                  <CheckCircle2 size={24} />
                </div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Total Meetings Attended</p>
                <h2 className="text-4xl font-black text-navy tracking-tight">{stats?.attended}</h2>
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-4 flex items-center gap-2">
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
            <h2 className="text-xl font-black text-navy uppercase tracking-tight">Upcoming Meetings</h2>
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
              <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                <p className="text-slate-400 font-medium italic text-xs uppercase tracking-widest">No upcoming meetings scheduled.</p>
              </div>
            )}
          </div>
        </section>

        {/* Meeting History */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
              <History size={20} />
            </div>
            <h2 className="text-xl font-black text-navy uppercase tracking-tight">Meeting History</h2>
          </div>
          
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
              <div className="divide-y divide-slate-50">
                {pastMeetings.length > 0 ? (
                  pastMeetings.map((meeting) => {
                    const creator = members.find(m => m.uid === meeting.creatorId) || (meeting.creatorId === profile.uid ? profile : null);
                    const participant = members.find(m => m.uid === meeting.participantIds[0]) || (meeting.participantIds[0] === profile.uid ? profile : null);
                    const myAttendance = meeting.attendance?.[profile.uid] || 'ABSENT';

                    return (
                      <div key={meeting.id} className="p-4 hover:bg-slate-50/50 transition-all group">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                          <div className="md:col-span-1">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Scheduled By</p>
                            <p className="text-[10px] font-bold text-navy truncate">{creator?.name || 'Unknown'}</p>
                          </div>
                          <div className="md:col-span-1">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Meeting With</p>
                            <p className="text-[10px] font-bold text-navy truncate">{participant?.name || 'Unknown'}</p>
                          </div>
                          <div className="md:col-span-1">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Date & Time</p>
                            <p className="text-[10px] font-bold text-navy">{format(new Date(meeting.date), 'dd MMM yyyy')}</p>
                            <p className="text-[9px] text-slate-400 font-medium">{meeting.time}</p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Note</p>
                            <p className="text-[10px] text-slate-500 italic line-clamp-1">{meeting.notes || '-'}</p>
                          </div>
                          <div className="md:col-span-1 text-right">
                            <span className={cn(
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider",
                              myAttendance === 'PRESENT' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
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
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
                      <History size={32} />
                    </div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No meeting history found.</p>
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
            <h3 className="text-2xl font-black text-navy uppercase tracking-tight">Meeting Scheduled!</h3>
            <p className="text-slate-500 font-medium">Your meeting has been successfully created.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Member Selection - Searchable Dropdown */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Select Member</label>
              <div className="relative">
                <div 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full px-4 py-4 rounded-2xl border border-slate-200 bg-white cursor-pointer flex items-center justify-between group hover:border-primary transition-all"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Users size={18} className="text-slate-400 group-hover:text-primary transition-colors shrink-0" />
                    {formData.participantId ? (
                      <span className="text-sm font-bold text-navy truncate">
                        {members.find(m => m.uid === formData.participantId)?.name}
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-slate-400">Select a member...</span>
                    )}
                  </div>
                  <ChevronRight size={18} className={cn("text-slate-400 transition-transform", isDropdownOpen ? "rotate-90" : "")} />
                </div>

                {isDropdownOpen && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3 border-b border-slate-100 bg-slate-50">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                          type="text"
                          placeholder="Search across all chapters..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
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
                                : "bg-white border border-slate-50 hover:bg-slate-50 hover:border-slate-200"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={member.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`}
                                className="w-10 h-10 rounded-lg object-cover shadow-sm"
                                referrerPolicy="no-referrer"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-black text-navy uppercase tracking-tight">
                                  {member.name}
                                </p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest truncate">
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
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest italic">No members found.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {formData.participantId && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Meeting Location</label>
                <select
                  required
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  className="w-full px-4 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm bg-white"
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
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Meeting Date</label>
                <input
                  required
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Meeting Time</label>
                <input
                  required
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full px-4 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Meeting Notes (Optional)</label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="What would you like to discuss?"
                className="w-full px-4 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-5 bg-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] hover:shadow-2xl hover:shadow-primary/30 transition-all active:scale-95 disabled:opacity-50 text-xs"
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
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Attendance</label>
              <div className="space-y-3">
                {[updatingMeeting.creatorId, ...updatingMeeting.participantIds].map(uid => {
                  const member = members.find(m => m.uid === uid) || (uid === profile?.uid ? profile : null);
                  return (
                    <div key={uid} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <img
                          src={member?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(member?.name || 'User')}&background=random`}
                          className="w-8 h-8 rounded-lg object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-xs font-bold text-navy">{member?.name || 'Unknown'}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setUpdateFormData(prev => ({
                            ...prev,
                            attendance: { ...prev.attendance, [uid]: 'PRESENT' }
                          }))}
                          className={cn(
                            "px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all",
                            updateFormData.attendance[uid] === 'PRESENT' 
                              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20" 
                              : "bg-white text-slate-400 border border-slate-200"
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
                            "px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all",
                            updateFormData.attendance[uid] === 'ABSENT' 
                              ? "bg-rose-600 text-white shadow-lg shadow-rose-500/20" 
                              : "bg-white text-slate-400 border border-slate-200"
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
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Meeting Notes</label>
              <textarea
                rows={3}
                value={updateFormData.notes}
                onChange={(e) => setUpdateFormData({ ...updateFormData, notes: e.target.value })}
                placeholder="Add any final notes or outcomes..."
                className="w-full px-4 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium resize-none text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleUpdateMeeting('COMPLETED')}
                disabled={isSubmitting}
                className="py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-700 transition-all text-[10px] shadow-lg shadow-emerald-500/20"
              >
                Meeting Completed
              </button>
              <button
                onClick={() => handleUpdateMeeting('NOT_COMPLETED')}
                disabled={isSubmitting}
                className="py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-rose-700 transition-all text-[10px] shadow-lg shadow-rose-500/20"
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
        <div className="bg-white rounded-2xl overflow-hidden border border-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Scheduled By</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Meeting With</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {historyMeetings.length > 0 ? (
                  historyMeetings.map((meeting) => {
                    const creator = members.find(m => m.uid === meeting.creatorId);
                    const participant = members.find(m => m.uid === meeting.participantIds[0]);
                    
                    return (
                      <tr key={meeting.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-navy">{creator?.name || 'Unknown'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-navy">{participant?.name || 'Unknown'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-slate-600">{format(new Date(meeting.date), 'dd MMM yyyy')}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-slate-600">{meeting.time}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest",
                            meeting.status === 'UPCOMING' ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
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
                                  <span className="text-[9px] font-bold text-slate-400 truncate max-w-[80px]">{member?.name}:</span>
                                  <span className={cn(
                                    "text-[8px] font-black uppercase tracking-tighter",
                                    status === 'PRESENT' ? "text-emerald-600" : "text-rose-600"
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
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No meeting history found.</p>
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
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={cn(
        "group relative bg-white p-4 rounded-2xl border transition-all duration-500 flex flex-col h-full overflow-hidden",
        isOverdue 
          ? "border-rose-200 shadow-lg shadow-rose-500/5 bg-rose-50/30" 
          : "border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-primary/10"
      )}
    >
      <div className={cn(
        "absolute top-0 right-0 w-24 h-24 rounded-full -mr-12 -mt-12 transition-transform duration-700 group-hover:scale-150",
        isOverdue ? "bg-rose-500/5" : "bg-primary/5"
      )} />
      
      <div className="relative z-10 flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500",
            isOverdue ? "bg-rose-500 text-white" : (isCreator ? "bg-primary text-white" : "bg-navy text-white")
          )}>
            <Users size={20} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-black text-navy uppercase tracking-tight leading-none truncate">
              {isAdmin ? 'One-to-One Meeting' : (isCreator ? 'Organized by You' : 'Invited to Meeting')}
            </h3>
            <p className="text-[9px] text-slate-400 uppercase tracking-[0.2em] font-black mt-1">
              {isAdmin ? `Scheduled By: ${creator?.name || 'Unknown'}` : `${meeting.participantIds.length} Participants`}
            </p>
          </div>
        </div>
        <div className={cn(
          "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.2em] border shrink-0 shadow-sm flex items-center gap-1",
          isOverdue 
            ? "bg-rose-100 text-rose-600 border-rose-200 animate-pulse" 
            : "bg-emerald-50 text-emerald-600 border-emerald-100"
        )}>
          {isOverdue && <AlertTriangle size={10} />}
          {isOverdue ? 'Action Pending' : 'Upcoming'}
        </div>
      </div>

      <div className="relative z-10 space-y-2.5 mb-4 flex-grow">
        <div className="flex items-center gap-3 p-2.5 bg-slate-50/50 rounded-xl border border-slate-100/50">
          <div className="flex -space-x-2 overflow-hidden shrink-0">
            {participants.slice(0, 4).map((p) => (
              <img
                key={p.uid}
                src={p.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random`}
                className="w-7 h-7 rounded-lg border-2 border-white shadow-md object-cover"
                title={p.name}
                referrerPolicy="no-referrer"
              />
            ))}
            {participants.length > 4 && (
              <div className="w-7 h-7 rounded-lg bg-white border-2 border-white shadow-md flex items-center justify-center text-[8px] font-black text-slate-400">
                +{participants.length - 4}
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{isAdmin ? 'Meeting With' : 'Participants'}</span>
            <span className="text-[10px] font-black text-navy truncate uppercase tracking-tight">
              {participants.map(p => p.name).join(', ')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1 p-2.5 bg-slate-50/50 rounded-xl border border-slate-100/50">
            <Calendar size={12} className="text-primary" />
            <div className="min-w-0">
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Date</p>
              <p className="text-[10px] font-black text-navy uppercase tracking-tight truncate">{format(new Date(meeting.date), 'dd MMM yyyy')}</p>
            </div>
          </div>
          <div className="flex flex-col gap-1 p-2.5 bg-slate-50/50 rounded-xl border border-slate-100/50">
            <Clock size={12} className="text-primary" />
            <div className="min-w-0">
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Time</p>
              <p className="text-[10px] font-black text-navy uppercase tracking-tight truncate">{meeting.time}</p>
            </div>
          </div>
        </div>

        {meeting.venue && (
          <div className="flex items-center gap-2.5 p-2.5 bg-slate-50/50 rounded-xl border border-slate-100/50">
            <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-primary shadow-sm shrink-0">
              <Search size={12} />
            </div>
            <div className="min-w-0">
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Venue</p>
              <p className="text-[10px] font-black text-navy uppercase tracking-tight truncate" title={meeting.venue}>{meeting.venue}</p>
            </div>
          </div>
        )}

        {meeting.notes && (
          <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-10 h-10 bg-primary/5 rounded-full -mr-5 -mt-5" />
            <p className="text-[7px] text-primary font-black uppercase tracking-[0.2em] mb-1 relative z-10">Meeting Notes</p>
            <p className="text-[10px] text-slate-600 font-medium italic leading-relaxed line-clamp-2 relative z-10">"{meeting.notes}"</p>
          </div>
        )}
      </div>

      <button 
        onClick={onUpdate}
        className={cn(
          "relative z-10 w-full py-3 rounded-xl font-black uppercase tracking-[0.2em] text-[8px] transition-all duration-500 flex items-center justify-center gap-2 mt-auto",
          isOverdue 
            ? "bg-rose-600 text-white shadow-lg shadow-rose-500/30 hover:bg-rose-700" 
            : "bg-slate-50 text-slate-400 group-hover:bg-navy group-hover:text-white group-hover:shadow-2xl group-hover:shadow-navy/30"
        )}
      >
        <span>{isOverdue ? 'Update Now' : 'Update Meeting'}</span>
        <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
      </button>
    </motion.div>
  );
};
