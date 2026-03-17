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
  Users
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { firestoreService } from '../services/firestoreService';
import { Meeting, UserProfile, AttendanceStatus } from '../types';
import { where, orderBy, limit } from 'firebase/firestore';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export function Meetings() {
  const { profile } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [currentMeeting, setCurrentMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || !profile.chapterId) return;

    const constraints = [
      where('chapterId', '==', profile.chapterId),
      orderBy('date', 'desc'),
      limit(10)
    ];

    const unsubscribe = firestoreService.subscribe<Meeting>('meetings', constraints, (data) => {
      setMeetings(data);
      
      // Check if there's a meeting for today/this week
      const today = new Date();
      const start = startOfWeek(today);
      const end = endOfWeek(today);
      
      const thisWeekMeeting = data.find(m => {
        const mDate = new Date(m.date);
        return mDate >= start && mDate <= end;
      });
      
      setCurrentMeeting(thisWeekMeeting || null);
      setLoading(false);
    });

    // Fetch members for attendance
    firestoreService.list<UserProfile>('users', [
      where('chapterId', '==', profile.chapterId),
      where('status', '==', 'active')
    ]).then(setMembers);

    return () => unsubscribe();
  }, [profile]);

  const createMeeting = async () => {
    if (!profile?.chapterId) return;
    
    const newMeeting: Omit<Meeting, 'id'> = {
      chapterId: profile.chapterId,
      date: new Date().toISOString(),
      attendance: {}
    };

    await firestoreService.create('meetings', newMeeting);
  };

  const markAttendance = async (userId: string, status: AttendanceStatus) => {
    if (!currentMeeting) return;
    
    const newAttendance = { ...currentMeeting.attendance, [userId]: status };
    await firestoreService.update('meetings', currentMeeting.id, { attendance: newAttendance });
  };

  const isChapterAdmin = profile?.role === 'chapter_admin' || profile?.role === 'admin';

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Weekly Meetings</h1>
          <p className="text-slate-500 mt-1">Track attendance and chapter performance.</p>
        </div>
        {isChapterAdmin && !currentMeeting && (
          <button
            onClick={createMeeting}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
          >
            <Plus size={20} />
            <span>Start Today's Meeting</span>
          </button>
        )}
      </header>

      {currentMeeting ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Attendance List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900">Attendance Sheet</h2>
                    <p className="text-xs text-slate-500">{format(new Date(currentMeeting.date), 'EEEE, MMMM do yyyy')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Present</p>
                  <p className="text-xl font-extrabold text-emerald-600">
                    {Object.values(currentMeeting.attendance).filter(s => s === 'present').length} / {members.length}
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {members.map((member) => {
                  const status = currentMeeting.attendance[member.uid];
                  return (
                    <div key={member.uid} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <img 
                          src={member.photoURL || 'https://picsum.photos/seed/user/40/40'} 
                          className="w-10 h-10 rounded-lg"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="font-bold text-slate-900">{member.displayName}</p>
                          <p className="text-xs text-slate-500">{member.businessName}</p>
                        </div>
                      </div>

                      {isChapterAdmin ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => markAttendance(member.uid, 'present')}
                            className={cn(
                              "p-2 rounded-lg transition-all",
                              status === 'present' ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                            )}
                          >
                            <CheckCircle2 size={20} />
                          </button>
                          <button
                            onClick={() => markAttendance(member.uid, 'absent')}
                            className={cn(
                              "p-2 rounded-lg transition-all",
                              status === 'absent' ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                            )}
                          >
                            <XCircle size={20} />
                          </button>
                          <button
                            onClick={() => markAttendance(member.uid, 'visitor')}
                            className={cn(
                              "p-2 rounded-lg transition-all",
                              status === 'visitor' ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                            )}
                          >
                            <UserPlus size={20} />
                          </button>
                        </div>
                      ) : (
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                          status === 'present' ? "bg-emerald-100 text-emerald-700" :
                          status === 'absent' ? "bg-red-100 text-red-700" :
                          status === 'visitor' ? "bg-blue-100 text-blue-700" :
                          "bg-slate-100 text-slate-400"
                        )}>
                          {status || 'Pending'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Past Meetings */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-900">Past Meetings</h2>
            <div className="space-y-4">
              {meetings.filter(m => m.id !== currentMeeting.id).map((meeting) => (
                <div key={meeting.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group cursor-pointer hover:border-emerald-200 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-all">
                      <Clock size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{format(new Date(meeting.date), 'MMM d, yyyy')}</p>
                      <p className="text-xs text-slate-500">
                        {Object.values(meeting.attendance).filter(s => s === 'present').length} Present
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-emerald-500 transition-all" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-20 text-center bg-white rounded-3xl border border-dashed border-slate-300">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
            <Calendar size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No meeting scheduled for today</h3>
          <p className="text-slate-500 mt-1">
            {isChapterAdmin 
              ? "Click the button above to start today's meeting and record attendance." 
              : "Your chapter admin hasn't started today's meeting yet."}
          </p>
        </div>
      )}
    </div>
  );
}
