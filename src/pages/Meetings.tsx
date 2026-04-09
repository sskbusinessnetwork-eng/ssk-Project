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
      
      const actionableMeetings = data.filter(m => !m.isCompleted);
      const thisWeekMeeting = actionableMeetings.find(m => {
        const mDate = new Date(m.date);
        return mDate >= start && mDate <= end;
      });
      
      const nearestActionable = [...actionableMeetings].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
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
    
    const constraints = [
      where('membershipStatus', '==', 'ACTIVE'),
      where('role', '==', 'MEMBER')
    ];

    if (chapterId) {
      constraints.push(where('adminId', '==', chapterId));
    }

    firestoreService.list<UserProfile>('users', constraints).then(data => {
      let activeMembers = data;
      // Ensure Chapter Admin is included in the list if they are the one viewing
      if (isChapterAdmin && profile && !activeMembers.find(m => m.uid === profile.uid)) {
        activeMembers = [profile, ...activeMembers];
      }
      setMembers(activeMembers);
    });

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
    // This logic might need to be moved to user profile or a global settings collection
    // Since chapters are removed. For now, let's just disable it or simplify.
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Placeholder for updating default setup without chapters
      setSuccess('Default meeting setup updated!');
      setTimeout(() => {
        setIsDefaultSetupOpen(false);
        setSuccess(null);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update default setup.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const markAttendance = async (userId: string, status: AttendanceStatus) => {
    if (!selectedMeeting) return;
    
    const newAttendance = { ...selectedMeeting.attendance, [userId]: status };
    await firestoreService.update('meetings', selectedMeeting.id, { attendance: newAttendance });
  };

  const handleSaveUpdate = async () => {
    if (!selectedMeeting) return;
    setIsSubmitting(true);
    try {
      const isPending = isMeetingPending({
        ...selectedMeeting,
        attendance: tempAttendance,
        amountCollected: tempAmount,
        memberNotes: tempMemberNotes
      });

      await firestoreService.update('meetings', selectedMeeting.id, { 
        attendance: tempAttendance,
        amountCollected: tempAmount,
        memberNotes: tempMemberNotes,
        isCompleted: !isPending,
        updatedAt: new Date().toISOString()
      });
      setSuccess(isPending ? 'Meeting data updated!' : 'Meeting data updated and moved to history!');
      setTimeout(() => {
        setIsUpdateModalOpen(false);
        setSuccess(null);
        if (!isPending) setSelectedMeeting(null);
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
      const isPending = isMeetingPending({
        ...selectedMeeting,
        notes: tempNotes
      });

      await firestoreService.update('meetings', selectedMeeting.id, { 
        notes: tempNotes,
        isCompleted: !isPending,
        updatedAt: new Date().toISOString()
      });
      setSuccess(isPending ? 'Meeting notes updated!' : 'Meeting notes updated and moved to history!');
      setTimeout(() => {
        setIsNotesModalOpen(false);
        setSuccess(null);
        if (!isPending) setSelectedMeeting(null);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update meeting notes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveNotes = async () => {
    if (!selectedMeeting) return;
    setIsSavingNotes(true);
    await firestoreService.update('meetings', selectedMeeting.id, { notes });
    setIsSavingNotes(false);
  };

  // Calculate attendance stats
  const userAttendance = meetings.map(m => m.attendance[profile?.uid || ''] === 'PRESENT');
  const attendancePercentage = userAttendance.length > 0 
    ? Math.round((userAttendance.filter(Boolean).length / userAttendance.length) * 100) 
    : 0;

  const isMeetingPending = (meeting: Meeting) => {
    const attendanceCount = Object.keys(meeting.attendance || {}).length;
    const hasNotes = !!meeting.notes && meeting.notes.trim().length > 0;
    // A meeting is pending only if neither attendance nor notes have been recorded
    return attendanceCount === 0 && !hasNotes;
  };

  const getMeetingStatus = (date: string) => {
    const meetingDate = new Date(date);
    const now = new Date();
    
    if (isSameDay(meetingDate, now)) {
      return { label: 'Today', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    }
    
    if (meetingDate < now) {
      return { label: 'Completed', color: 'bg-slate-100 text-slate-600 border-slate-200' };
    }
    
    return { label: 'Scheduled', color: 'bg-blue-100 text-blue-700 border-blue-200' };
  };

  const filteredMeetings = selectedAdminId 
    ? meetings.filter(m => m.adminId === selectedAdminId)
    : meetings;

  const now = new Date();
  const today = startOfDay(now);
  
  // Pending: Past meetings that are not completed
  const pendingMeetings = filteredMeetings.filter(m => !m.isCompleted && new Date(m.date) < today);
  
  // Upcoming: Non-completed meetings
  const upcomingMeetings = filteredMeetings.filter(m => !m.isCompleted);
  
  // Sort upcoming by date asc to find the nearest
  const scheduledMeetings = [...upcomingMeetings].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // History: Completed meetings
  const completedMeetings = filteredMeetings.filter(m => m.isCompleted)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const recentMeetings = completedMeetings.slice(0, 1);

  // For Master Admin, find the single latest/upcoming meeting
  const masterAdminUpcoming = scheduledMeetings[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-primary rounded-full" />
          <div>
            <h1 className="text-xl md:text-2xl font-black text-navy tracking-tight font-display uppercase">
              Weekly Meetings
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
              Track attendance and performance.
            </p>
          </div>
        </div>

        {profile?.role === 'MASTER_ADMIN' && (
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 w-full md:w-auto">
            <Filter size={16} className="text-slate-400" />
            <select
              value={selectedAdminId}
              onChange={(e) => setSelectedAdminId(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none flex-1 md:min-w-[150px]"
            >
              <option value="">All Chapters</option>
              {adminAdmins.map(admin => (
                <option key={admin.uid} value={admin.uid}>{admin.name || admin.displayName}</option>
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
              className="flex items-center justify-center gap-2 px-4 md:px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 transition-all shadow-sm text-sm md:text-base"
            >
              <Settings size={18} />
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
              className="flex items-center justify-center gap-2 px-4 md:px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 text-sm md:text-base"
            >
              <Calendar size={18} />
              <span>Schedule Meeting</span>
            </button>
          </div>
        )}
      </header>

      {isPending && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-800">
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
            <div className="flex items-center gap-2 px-1">
              <div className="w-1.5 h-6 bg-primary rounded-full" />
              <h2 className="text-sm font-bold text-navy uppercase tracking-widest font-display">Upcoming Meetings</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scheduledMeetings.map((meeting) => (
                <div 
                  key={meeting.id} 
                  onClick={() => setSelectedMeeting(meeting)}
                  className={cn(
                    "bg-white p-3.5 rounded-xl border shadow-sm hover:shadow-md transition-all flex flex-col h-full cursor-pointer",
                    selectedMeeting?.id === meeting.id ? "border-primary ring-2 ring-primary/10" : "border-slate-200"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 shrink-0">
                      <Calendar size={18} />
                    </div>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[8px] font-black uppercase tracking-widest border border-blue-200 shrink-0">
                      Scheduled
                    </span>
                  </div>
                  <div className="space-y-1.5 mb-3 flex-grow">
                    <h3 className="text-sm font-black text-navy uppercase tracking-tight leading-none truncate" title={format(new Date(meeting.date), 'EEEE, MMM do')}>
                      {format(new Date(meeting.date), 'EEEE, MMM do')}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                      <Clock size={12} className="text-primary shrink-0" />
                      <span>{meeting.time || '07:30 AM'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
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
                          setTempAttendance(meeting.attendance || {});
                          setTempAmount(meeting.amountCollected || {});
                          setIsUpdateModalOpen(true);
                        }}
                        className="flex-1 py-1.5 bg-emerald-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
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
                        className="flex-1 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center justify-center gap-1.5"
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
          <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
              <Calendar size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-900">No upcoming meetings</h3>
            <p className="text-xs text-slate-500 mt-1">
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
            <h2 className="text-sm font-bold text-navy uppercase tracking-widest font-display">Your Meeting History</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Total Meetings Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                <Calendar size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Meetings</p>
                <p className="text-2xl font-black text-navy tracking-tight">{completedMeetings.length}</p>
                <p className="text-[9px] text-slate-500 font-medium mt-1 uppercase tracking-wider">Under same chapter</p>
              </div>
            </div>

            {/* Attendance Count Card */}
            <div 
              onClick={() => setIsMemberHistoryModalOpen(true)}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer group hover:border-primary transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:bg-primary group-hover:text-white transition-colors">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Attendance Count</p>
                  <p className="text-2xl font-black text-navy tracking-tight">
                    {completedMeetings.filter(m => m.attendance[profile?.uid || ''] === 'PRESENT').length}
                  </p>
                  <p className="text-[9px] text-slate-500 font-medium mt-1 uppercase tracking-wider">Meetings Attended</p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-primary group-hover:text-white transition-all">
                <ChevronRight size={16} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Update Meeting Modal */}
      <Modal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        title="Update Meeting Data"
      >
        <div className="space-y-6">
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Meeting Update</p>
            <p className="text-sm font-bold text-slate-900">Update attendance and amounts</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Member</th>
                  <th className="py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Attendance</th>
                  <th className="py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Amount (₹)</th>
                  <th className="py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.filter(m => m.adminId === selectedMeeting?.adminId || m.uid === selectedMeeting?.adminId).map((member) => {
                  const status = tempAttendance[member.uid];
                  const amount = tempAmount[member.uid] || 0;
                  const note = tempMemberNotes[member.uid] || '';
                  return (
                    <tr key={member.uid} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={member.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || '')}&background=random`} 
                            className="w-8 h-8 rounded-lg"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <p className="text-sm font-bold text-slate-900">{member.name || member.displayName}</p>
                            <p className="text-[10px] text-slate-500">{member.businessName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setTempAttendance(prev => ({ ...prev, [member.uid]: 'PRESENT' }))}
                            className={cn(
                              "p-1.5 rounded-lg transition-all",
                              status === 'PRESENT' ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                            )}
                          >
                            <CheckCircle2 size={16} />
                          </button>
                          <button
                            onClick={() => setTempAttendance(prev => ({ ...prev, [member.uid]: 'ABSENT' }))}
                            className={cn(
                              "p-1.5 rounded-lg transition-all",
                              status === 'ABSENT' ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                            )}
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      </td>
                      <td className="py-4">
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setTempAmount(prev => ({ ...prev, [member.uid]: parseInt(e.target.value) || 0 }))}
                          className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-right text-sm font-bold text-slate-700"
                        />
                      </td>
                      <td className="py-4 pl-4">
                        <input
                          type="text"
                          value={note}
                          onChange={(e) => setTempMemberNotes(prev => ({ ...prev, [member.uid]: e.target.value }))}
                          placeholder="Private note..."
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-xs text-slate-600"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-1">Total Present</p>
              <p className="text-xl font-extrabold text-emerald-600">
                {Object.values(tempAttendance).filter(s => s === 'PRESENT').length}
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-right">
              <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest mb-1">Total Collected</p>
              <p className="text-xl font-extrabold text-blue-600">
                ₹{Object.values(tempAmount).reduce((a: number, b: number) => a + b, 0).toLocaleString()}
              </p>
            </div>
          </div>

          <button
            onClick={handleSaveUpdate}
            disabled={isSubmitting}
            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chapter</p>
              <p className="text-sm font-bold text-navy">
                {adminAdmins.find(a => a.uid === detailsMeeting?.adminId)?.name || 'Unknown Chapter'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Meeting Date</p>
              <p className="text-sm font-bold text-navy">
                {detailsMeeting && format(new Date(detailsMeeting.date), 'dd MMM yyyy')}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Member Name</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {members.filter(m => m.adminId === detailsMeeting?.adminId).map((member) => {
                  const status = detailsMeeting?.attendance[member.uid];
                  const amount = detailsMeeting?.amountCollected?.[member.uid] || 0;
                  return (
                    <tr key={member.uid} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <img 
                            src={member.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || '')}&background=random`} 
                            className="w-6 h-6 rounded-lg"
                            referrerPolicy="no-referrer"
                          />
                          <p className="text-xs font-bold text-slate-900">{member.name || member.displayName}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-widest",
                          status === 'PRESENT' ? "bg-emerald-100 text-emerald-700" : 
                          status === 'VISITOR' ? "bg-blue-100 text-blue-700" :
                          "bg-red-100 text-red-700"
                        )}>
                          {status || 'ABSENT'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-xs font-bold text-slate-700">₹{amount.toLocaleString()}</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
            <span className="text-sm font-bold text-emerald-700">Total Collected</span>
            <span className="text-lg font-extrabold text-emerald-600">
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
          <div className="divide-y divide-slate-100">
            {members.map((member) => {
              const status = detailsMeeting?.attendance[member.uid];
              return (
                <div key={member.uid} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={member.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || '')}&background=random`} 
                      className="w-8 h-8 rounded-lg"
                      referrerPolicy="no-referrer"
                    />
                    <p className="text-sm font-bold text-slate-900">{member.name || member.displayName}</p>
                  </div>
                  <span className={cn(
                    "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest",
                    status === 'PRESENT' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                  )}>
                    {status || 'ABSENT'}
                  </span>
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
          <div className="divide-y divide-slate-100">
            {members.map((member) => {
              const amount = detailsMeeting?.amountCollected?.[member.uid] || 0;
              return (
                <div key={member.uid} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={member.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || '')}&background=random`} 
                      className="w-8 h-8 rounded-lg"
                      referrerPolicy="no-referrer"
                    />
                    <p className="text-sm font-bold text-slate-900">{member.name || member.displayName}</p>
                  </div>
                  <span className="text-sm font-bold text-slate-700">₹{amount.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between">
            <span className="text-sm font-bold text-blue-700">Total Collected</span>
            <span className="text-lg font-extrabold text-blue-600">
              ₹{Object.values(detailsMeeting?.amountCollected || {}).reduce((a: number, b: number) => a + b, 0).toLocaleString()}
            </span>
          </div>
        </div>
      </Modal>

      {/* Notes Modal */}
      <Modal
        isOpen={isNotesModalOpen}
        onClose={() => setIsNotesModalOpen(false)}
        title="Meeting Notes"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Notes & Key Points</label>
            <textarea
              value={tempNotes}
              onChange={(e) => setTempNotes(e.target.value)}
              placeholder="Enter meeting notes, discussion points, takeaways..."
              rows={8}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none text-sm"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setIsNotesModalOpen(false)}
              className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveNotes}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800 text-sm">
              <AlertCircle size={18} className="shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-sm">
              <CheckCircle2 size={18} className="shrink-0" />
              <p>{success}</p>
            </div>
          )}

          {/* Admin Info Header */}
          {(isChapterAdmin) && (
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
                  <Shield size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Admin</p>
                  <p className="text-sm font-bold text-slate-900">
                    {isChapterAdmin ? profile?.name : (adminAdmins.find(a => a.uid === defaultSetupData.adminId)?.name || 'Assigned Admin')}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Meeting Frequency</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setDefaultSetupData({ ...defaultSetupData, frequency: 'Weekly' })}
                  className={cn(
                    "py-3 rounded-xl border font-bold transition-all",
                    defaultSetupData.frequency === 'Weekly' 
                      ? "bg-emerald-50 border-emerald-500 text-emerald-700" 
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setDefaultSetupData({ ...defaultSetupData, frequency: 'Monthly' })}
                  className={cn(
                    "py-3 rounded-xl border font-bold transition-all",
                    defaultSetupData.frequency === 'Monthly' 
                      ? "bg-emerald-50 border-emerald-500 text-emerald-700" 
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  Monthly
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {defaultSetupData.frequency === 'Weekly' ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Meeting Day</label>
                  <select
                    required
                    value={defaultSetupData.day}
                    onChange={(e) => setDefaultSetupData({ ...defaultSetupData, day: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date of Month</label>
                  <select
                    required
                    value={defaultSetupData.date}
                    onChange={(e) => setDefaultSetupData({ ...defaultSetupData, date: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(date => (
                      <option key={date} value={date}>{date}{date === 1 ? 'st' : date === 2 ? 'nd' : date === 3 ? 'rd' : 'th'}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Meeting Time</label>
                <input
                  required
                  type="time"
                  value={defaultSetupData.time}
                  onChange={(e) => setDefaultSetupData({ ...defaultSetupData, time: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Venue / Location</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  required
                  type="text"
                  placeholder="Enter meeting venue"
                  value={defaultSetupData.location}
                  onChange={(e) => setDefaultSetupData({ ...defaultSetupData, location: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
                <Calendar size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Enable Recurring Meetings</p>
                <p className="text-xs text-slate-500">Automatically schedule meetings {defaultSetupData.frequency.toLowerCase()}</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={defaultSetupData.enabled}
                onChange={(e) => setDefaultSetupData({ ...defaultSetupData, enabled: e.target.checked })}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
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
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800 text-sm">
              <AlertCircle size={18} className="shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-sm">
              <CheckCircle2 size={18} className="shrink-0" />
              <p>{success}</p>
            </div>
          )}

          {/* Admin Info Header */}
          {(isChapterAdmin) && (
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
                  <Shield size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Admin</p>
                  <p className="text-sm font-bold text-slate-900">
                    {isChapterAdmin ? profile?.name : (adminAdmins.find(a => a.uid === scheduleData.adminId)?.name || 'Assigned Admin')}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date</label>
              <input
                required
                type="date"
                value={scheduleData.date}
                onChange={(e) => setScheduleData({ ...scheduleData, date: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Time</label>
              <input
                required
                type="time"
                value={scheduleData.time}
                onChange={(e) => setScheduleData({ ...scheduleData, time: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Location</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                required
                type="text"
                placeholder="Enter meeting venue"
                value={scheduleData.location}
                onChange={(e) => setScheduleData({ ...scheduleData, location: e.target.value })}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
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
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
            <p className="text-xs text-emerald-700 font-medium leading-relaxed">
              Detailed attendance data for <strong>{profile?.name || profile?.displayName}</strong>.
            </p>
          </div>

          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</th>
                  <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Venue</th>
                  <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                  <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                  <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Member</th>
                  <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Chapter</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {completedMeetings.length > 0 ? (
                  completedMeetings.map((meeting) => {
                    const status = meeting.attendance[profile?.uid || ''];
                    const amount = meeting.amountCollected?.[profile?.uid || ''] || 0;
                    const chapterName = adminAdmins.find(a => a.uid === meeting.adminId)?.name || 'Chapter';
                    const memberName = profile?.name || profile?.displayName || 'Member';
                    
                    return (
                      <tr key={meeting.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-4">
                          <p className="text-sm font-bold text-navy">
                            {format(new Date(meeting.date), 'dd MMM yyyy')}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-xs font-medium text-slate-600">{meeting.time || '07:30 AM'}</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-xs font-medium text-slate-600 truncate max-w-[150px]" title={meeting.location}>
                            {meeting.location || 'Meeting Venue'}
                          </p>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                            status === 'PRESENT' ? "bg-emerald-50 text-emerald-600" : 
                            status === 'ABSENT' ? "bg-red-50 text-red-600" :
                            "bg-slate-50 text-slate-400"
                          )}>
                            {status || 'ABSENT'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <p className="text-sm font-black text-navy">
                            ₹{amount.toLocaleString()}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-xs font-bold text-slate-600">{memberName}</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-xs font-bold text-slate-500">{chapterName}</p>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                          <Calendar size={24} />
                        </div>
                        <p className="text-sm font-bold text-slate-400">No records found</p>
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
