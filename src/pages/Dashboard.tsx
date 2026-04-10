import React, { useState, useEffect } from 'react';
import { 
  Share2, 
  Award, 
  Calendar, 
  UserPlus,
  ChevronRight,
  Users,
  Handshake,
  BookOpen,
  Eye,
  Plus,
  Filter,
  TrendingUp,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { firestoreService } from '../services/firestoreService';
import { Referral, ThankYouSlip, Meeting, OneToOneMeeting, UserProfile, AttendanceStatus } from '../types';
import { format, isAfter, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { cn } from '../lib/utils';

export function Analytics() {
  const { profile } = useAuth();
  const [nextMeeting, setNextMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [allData, setAllData] = useState<{
    users: UserProfile[];
    referrals: Referral[];
    slips: ThankYouSlip[];
    meetings: Meeting[];
    oneToOnes: OneToOneMeeting[];
  }>({
    users: [],
    referrals: [],
    slips: [],
    meetings: [],
    oneToOnes: []
  });

  // Filters State
  const [chapterAdminFilter, setChapterAdminFilter] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    adminId: ''
  });

  const [memberFilter, setMemberFilter] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    memberId: ''
  });

  const [chapterReportFilter, setChapterReportFilter] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!profile) return;
      setLoading(true);
      try {
        const [users, referrals, slips, meetings, oneToOnes] = await Promise.all([
          firestoreService.list<UserProfile>('users'),
          firestoreService.list<Referral>('referrals'),
          firestoreService.list<ThankYouSlip>('thank_you_slips'),
          firestoreService.list<Meeting>('meetings'),
          firestoreService.list<OneToOneMeeting>('one_to_one_meetings')
        ]);

        setAllData({ users, referrals, slips, meetings, oneToOnes });

        // Fetch Next Meeting (for Chapter Admin and Member)
        if (profile.role !== 'MASTER_ADMIN') {
          const now = new Date();
          const upcoming = meetings
            .filter(m => {
              const isFuture = isAfter(new Date(m.date), now);
              if (profile.role === 'CHAPTER_ADMIN') {
                return isFuture && m.adminId === profile.uid;
              }
              return isFuture && (m.adminId === profile.associatedChapterAdminId || m.adminId === profile.adminId);
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          setNextMeeting(upcoming[0] || null);
        }

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const chapterAdmins = allData.users.filter(u => u.role === 'CHAPTER_ADMIN');
  const members = allData.users.filter(u => {
    if (profile?.role === 'CHAPTER_ADMIN') {
      return u.role === 'MEMBER' && u.associatedChapterAdminId === profile.uid;
    }
    return u.role === 'MEMBER';
  });

  const calculateMetrics = (filters: { startDate: string, endDate: string, id?: string }, type: 'CHAPTER' | 'MEMBER') => {
    const start = parseISO(filters.startDate);
    const end = parseISO(filters.endDate);
    
    let targetUserIds: string[] = [];
    if (type === 'CHAPTER') {
      if (filters.id) {
        targetUserIds = allData.users
          .filter(u => u.associatedChapterAdminId === filters.id)
          .map(u => u.uid);
      } else {
        targetUserIds = allData.users
          .filter(u => u.role === 'MEMBER')
          .map(u => u.uid);
      }
    } else {
      if (filters.id) {
        targetUserIds = [filters.id];
      } else {
        if (profile?.role === 'CHAPTER_ADMIN') {
          targetUserIds = allData.users
            .filter(u => u.role === 'MEMBER' && u.associatedChapterAdminId === profile.uid)
            .map(u => u.uid);
        } else if (profile?.role === 'MEMBER') {
          targetUserIds = [profile.uid];
        } else {
          targetUserIds = allData.users
            .filter(u => u.role === 'MEMBER')
            .map(u => u.uid);
        }
      }
    }

    const isInRange = (dateStr: string) => {
      try {
        const date = new Date(dateStr);
        return isWithinInterval(date, { start, end });
      } catch {
        return false;
      }
    };

    const filteredSlips = allData.slips.filter(s => targetUserIds.includes(s.fromUserId) && isInRange(s.createdAt));
    const businessGenerated = filteredSlips.reduce((acc, s) => acc + (Number(s.businessValue) || 0), 0);

    const referralsSent = allData.referrals.filter(r => targetUserIds.includes(r.fromUserId) && isInRange(r.createdAt)).length;
    const referralsReceived = allData.referrals.filter(r => targetUserIds.includes(r.toUserId) && isInRange(r.createdAt)).length;

    const totalMembers = type === 'CHAPTER' 
      ? allData.users.filter(u => filters.id ? u.associatedChapterAdminId === filters.id : u.role === 'MEMBER').length
      : 0;

    const filteredMeetings = allData.meetings.filter(m => isInRange(m.date));
    let totalMeetings = 0;
    let attendanceCount = 0;

    if (type === 'MEMBER' && filters.id) {
      // Individual Member Report
      const memberId = filters.id;
      const memberMeetings = filteredMeetings.filter(m => m.attendance && m.attendance[memberId]);
      totalMeetings = memberMeetings.length;
      attendanceCount = memberMeetings.filter(m => m.attendance[memberId] === 'PRESENT').length;
    } else if (type === 'CHAPTER' && filters.id) {
      // Specific Chapter Admin Report
      totalMeetings = filteredMeetings.filter(m => m.adminId === filters.id).length;
    } else if (profile?.role === 'MEMBER' && type === 'MEMBER') {
      // Logged in Member Performance
      totalMeetings = filteredMeetings.filter(m => m.adminId === profile.associatedChapterAdminId || m.adminId === profile.adminId).length;
    } else {
      totalMeetings = filteredMeetings.length;
    }

    const oneToOnes = allData.oneToOnes.filter(m => {
      const isParticipant = targetUserIds.some(id => m.creatorId === id || m.participantIds?.includes(id));
      return isParticipant && isInRange(m.date);
    }).length;

    const chapterMemberCount = profile?.role === 'MEMBER' 
      ? allData.users.filter(u => u.role === 'MEMBER' && (u.associatedChapterAdminId === profile.associatedChapterAdminId || u.associatedChapterAdminId === profile.adminId)).length
      : 0;

    return {
      businessGenerated,
      referralsSent,
      referralsReceived,
      totalMembers: type === 'CHAPTER' ? totalMembers : chapterMemberCount,
      totalMeetings,
      attendanceCount,
      oneToOnes
    };
  };

  return (
    <div className="max-w-2xl mx-auto pb-24 space-y-6 px-1 sm:px-0">
      {/* Profile Card */}
      <div className="bg-white p-4 rounded-[14px] card-shadow border border-border flex items-center gap-4 group cursor-pointer hover:bg-muted/30 transition-colors">
        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary/10">
          <img 
            src={profile?.photoURL || `https://picsum.photos/seed/${profile?.uid}/100/100`} 
            alt="Profile" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-primary truncate leading-tight">{profile?.name || 'User'}</h2>
          <p className="text-[10px] sm:text-xs font-medium text-text-secondary truncate">{profile?.chapterName || 'SSK Business Network'}</p>
          <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mt-1">Active</p>
          <p className="text-[10px] font-medium text-text-secondary mt-0.5">
            Due Date: {profile?.subscriptionEnd ? format(new Date(profile.subscriptionEnd), 'dd/MM/yyyy') : 'N/A'}
          </p>
        </div>
        <ChevronRight size={20} className="text-text-secondary group-hover:text-primary transition-colors" />
      </div>

      {/* Next Meeting Card (Chapter Admin and Member only) */}
      {profile?.role !== 'MASTER_ADMIN' && (
        <div className="bg-white rounded-[14px] card-shadow border border-border overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-12 bg-primary rounded-br-lg" />
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.15em] ml-2">Next Meeting</span>
              <Eye size={16} className="text-text-secondary" />
            </div>
            
            <div className="text-center py-2">
              <h3 className="text-base sm:text-lg font-bold text-primary break-words px-2">
                {nextMeeting ? format(new Date(nextMeeting.date), 'EEEE, MMMM d, yyyy') : 'No Upcoming Meetings'}
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
              <div className="text-center">
                <p className="text-[9px] font-bold text-text-secondary uppercase tracking-wider">TYFCB</p>
                <p className="text-xs font-bold text-text-primary mt-0.5">₹0</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] font-bold text-text-secondary uppercase tracking-wider">Speakers</p>
                <p className="text-xs font-bold text-text-primary mt-0.5">0</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] font-bold text-text-secondary uppercase tracking-wider">Visitors</p>
                <p className="text-xs font-bold text-text-primary mt-0.5">0</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MASTER ADMIN: Chapter Admin Report */}
      {profile?.role === 'MASTER_ADMIN' && (
        <ReportCard 
          title="Chapter Admin Report"
          filters={chapterAdminFilter}
          setFilters={setChapterAdminFilter}
          options={chapterAdmins}
          optionLabel="Chapter Admin"
          metrics={calculateMetrics({ ...chapterAdminFilter, id: chapterAdminFilter.adminId }, 'CHAPTER')}
          type="CHAPTER_ADMIN"
          profile={profile}
        />
      )}

      {/* MASTER ADMIN & CHAPTER ADMIN: Member Report */}
      {(profile?.role === 'MASTER_ADMIN' || profile?.role === 'CHAPTER_ADMIN') && (
        <ReportCard 
          title="Member Report"
          filters={memberFilter}
          setFilters={setMemberFilter}
          options={members}
          optionLabel="Member"
          metrics={calculateMetrics({ ...memberFilter, id: memberFilter.memberId }, 'MEMBER')}
          type="MEMBER"
          profile={profile}
        />
      )}

      {/* MEMBER: Chapter Admin Report */}
      {profile?.role === 'MEMBER' && (
        <ReportCard 
          title="Chapter Admin Report"
          filters={chapterReportFilter}
          setFilters={setChapterReportFilter}
          metrics={calculateMetrics({ ...chapterReportFilter, id: profile.associatedChapterAdminId || profile.adminId }, 'CHAPTER')}
          type="CHAPTER_ADMIN"
          hideDropdown
          profile={profile}
        />
      )}

      {/* MEMBER: My Performance */}
      {profile?.role === 'MEMBER' && (
        <ReportCard 
          title="My Performance"
          filters={memberFilter}
          setFilters={setMemberFilter}
          metrics={calculateMetrics({ ...memberFilter, id: profile.uid }, 'MEMBER')}
          type="MY_PERFORMANCE"
          hideDropdown
          profile={profile}
        />
      )}
    </div>
  );
}

interface ReportCardProps {
  title: string;
  filters: any;
  setFilters: any;
  options?: UserProfile[];
  optionLabel?: string;
  metrics: any;
  type: 'CHAPTER_ADMIN' | 'MEMBER' | 'MY_PERFORMANCE';
  hideDropdown?: boolean;
  profile: UserProfile | null;
}

function ReportCard({ title, filters, setFilters, options, optionLabel, metrics, type, hideDropdown, profile }: ReportCardProps) {
  return (
    <div className="bg-white rounded-[14px] card-shadow border border-border overflow-hidden relative">
      <div className="absolute top-0 left-0 w-1 h-12 bg-primary rounded-br-lg" />
      <div className="p-4 space-y-4">
        <div className="text-center">
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.15em]">{title}</span>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[8px] font-bold text-text-secondary uppercase ml-1">Start Date</label>
            <input 
              type="date" 
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full p-2 text-[10px] rounded-lg border border-border focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-bold text-text-secondary uppercase ml-1">End Date</label>
            <input 
              type="date" 
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full p-2 text-[10px] rounded-lg border border-border focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
        </div>

        {!hideDropdown && options && (
          <div className="space-y-1">
            <label className="text-[8px] font-bold text-text-secondary uppercase ml-1">{optionLabel}</label>
            <select 
              value={type === 'CHAPTER_ADMIN' ? filters.adminId : filters.memberId}
              onChange={(e) => setFilters({ ...filters, [type === 'CHAPTER_ADMIN' ? 'adminId' : 'memberId']: e.target.value })}
              className="w-full p-2 text-[10px] rounded-lg border border-border focus:ring-1 focus:ring-primary outline-none bg-white"
            >
              <option value="">All {optionLabel}s (Combined)</option>
              {options.map(opt => (
                <option key={opt.uid} value={opt.uid}>{opt.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Metrics */}
        <div className="space-y-3 pt-2">
          <MetricItem icon={Handshake} label="Business Generated" value={`₹${metrics.businessGenerated.toLocaleString()}`} />
          <MetricItem icon={Share2} label="Total Referral Sent" value={metrics.referralsSent} />
          <MetricItem icon={BookOpen} label="Total Referral Received" value={metrics.referralsReceived} />
          
          {/* Chapter Admin Report */}
          {type === 'CHAPTER_ADMIN' && (
            <>
              {profile?.role !== 'MEMBER' && <MetricItem icon={Users} label="Total Members" value={metrics.totalMembers} />}
              <MetricItem icon={Calendar} label="Total Meetings" value={metrics.totalMeetings} />
              <MetricItem icon={Clock} label="Total One-to-One Meetings" value={metrics.oneToOnes} />
            </>
          )}

          {/* Master Admin: Member Report */}
          {type === 'MEMBER' && profile?.role === 'MASTER_ADMIN' && (
            <>
              <MetricItem icon={Calendar} label="Total Meetings" value={metrics.totalMeetings} />
              <MetricItem icon={CheckCircle2} label="Total Meeting Attendance" value={metrics.attendanceCount} />
              <MetricItem icon={Clock} label="Total One-to-One Meetings" value={metrics.oneToOnes} />
            </>
          )}

          {/* Chapter Admin: Member Report */}
          {type === 'MEMBER' && profile?.role === 'CHAPTER_ADMIN' && (
            <>
              <MetricItem icon={Users} label="Total Members" value={metrics.totalMembers} />
              <MetricItem icon={Calendar} label="Total Meetings" value={metrics.totalMeetings} />
              <MetricItem icon={Clock} label="Total One-to-One Meetings" value={metrics.oneToOnes} />
            </>
          )}

          {/* Member: My Performance */}
          {type === 'MY_PERFORMANCE' && (
            <>
              <MetricItem icon={Users} label="Total Members" value={metrics.totalMembers} />
              <MetricItem icon={Calendar} label="Total Meetings" value={metrics.totalMeetings} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricItem({ icon: Icon, label, value }: { icon: any, label: string, value: string | number }) {
  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-text-primary group-hover:bg-primary/5 group-hover:text-primary transition-colors">
          <Icon size={16} strokeWidth={1.5} />
        </div>
        <span className="text-[11px] font-medium text-text-secondary group-hover:text-text-primary transition-colors">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-primary">{value}</span>
        <Plus size={12} className="text-primary" />
      </div>
    </div>
  );
}

// Removed StatCard as it's no longer used in the new design
