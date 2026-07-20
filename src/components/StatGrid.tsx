import React from 'react';
import { Users, Calendar, Target, TrendingUp, Share2, Briefcase, Handshake, UserCheck, Star, Activity, Plus } from 'lucide-react';
import { motion } from 'motion/react';

interface StatGridProps {
  role?: string;
  totalChaptersCount?: number;
  totalMembersCount?: number;
  activePartnersCount?: number;
  businessGeneratedTotal?: number;
  referralsPassedCount?: number;
  thankYouSlipsCount?: number;
  upcomingSyncsCount?: number;
  oneToOneMeetingsCount?: number;
  visitorsAttendedCount?: number;
  weeklyMeetingAttendance?: number;
  growthScore?: number;
  newMembersThisMonthCount?: number;
  testimonialsCount?: number;
  meetingsCount?: number;
}

export default function StatGrid({
  role = 'MEMBER',
  totalChaptersCount = 1,
  totalMembersCount = 1,
  activePartnersCount = 1,
  businessGeneratedTotal = 0,
  referralsPassedCount = 0,
  thankYouSlipsCount = 0,
  upcomingSyncsCount = 0,
  oneToOneMeetingsCount = 0,
  visitorsAttendedCount = 0,
  weeklyMeetingAttendance = 0,
  growthScore = 0,
  newMembersThisMonthCount = 0,
  testimonialsCount = 0,
  meetingsCount = 0,
}: StatGridProps) {
  const formatValue = (label: string, val: any) => {
    if (label === 'Business Generated') {
      const num = Number(val);
      if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr+`;
      if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L+`;
      return `₹${num.toLocaleString()}`;
    }
    if (label === 'Weekly Meeting Attendance' || label === 'Growth Score' || label === 'Attendance') {
      return `${val}%`;
    }
    return String(val);
  };

  const getStatsForRole = () => {
    const commonStats = [
      {
        label: 'Active Members',
        value: formatValue('Active Members', activePartnersCount),
        trend: 'Active',
        trendLabel: 'In chapter',
        icon: Users,
        color: 'text-red-500', 
        bg: 'bg-red-500/10 border-red-500/20',
      },
      {
        label: 'Business Generated',
        value: formatValue('Business Generated', businessGeneratedTotal),
        trend: 'Lifetime',
        trendLabel: 'Total',
        icon: Briefcase,
        color: 'text-purple-500', 
        bg: 'bg-purple-500/10 border-purple-500/20',
      },
      {
        label: 'Referrals Passed',
        value: formatValue('Referrals Passed', referralsPassedCount),
        trend: 'Total',
        trendLabel: 'Passed',
        icon: Share2, 
        color: 'text-emerald-400', 
        bg: 'bg-emerald-400/10 border-emerald-400/20',
      }
    ];

    const meetingsSyncsStats = [
      {
        label: 'Upcoming Meetings',
        value: formatValue('Upcoming Meetings', upcomingSyncsCount),
        trend: 'Scheduled',
        trendLabel: 'Meetings',
        icon: Calendar,
        color: 'text-orange-400', 
        bg: 'bg-orange-400/10 border-orange-400/20',
      },
      {
        label: 'One-to-One Meetings',
        value: formatValue('One-to-One Meetings', oneToOneMeetingsCount),
        trend: 'Total',
        trendLabel: 'Completed',
        icon: Handshake,
        color: 'text-blue-500',
        bg: 'bg-blue-500/10 border-blue-500/20',
      },
      {
        label: 'Visitors Attended',
        value: formatValue('Visitors Attended', visitorsAttendedCount),
        trend: 'Total',
        trendLabel: 'Attended',
        icon: UserCheck,
        color: 'text-pink-500',
        bg: 'bg-pink-500/10 border-pink-500/20',
      }
    ];

    if (role === 'MEMBER' || role === 'CHAPTER_ADMIN') {
      return [
        {
          label: 'Total Members',
          value: formatValue('Total Members', totalMembersCount),
          trend: 'Total',
          trendLabel: 'In chapter',
          icon: Users,
          color: 'text-indigo-400', 
          bg: 'bg-indigo-400/10 border-indigo-400/20',
        },
        {
          label: 'Active Members',
          value: formatValue('Active Members', activePartnersCount),
          trend: 'Active',
          trendLabel: 'In chapter',
          icon: Users,
          color: 'text-red-500', 
          bg: 'bg-red-500/10 border-red-500/20',
        },
        {
          label: 'Meetings',
          value: formatValue('Meetings', meetingsCount),
          trend: 'Total',
          trendLabel: 'Chapter Meetings',
          icon: Calendar,
          color: 'text-orange-400', 
          bg: 'bg-orange-400/10 border-orange-400/20',
        },
        {
          label: 'Attendance',
          value: formatValue('Attendance', weeklyMeetingAttendance),
          trend: 'Average',
          trendLabel: 'Attendance',
          icon: Target,
          color: 'text-cyan-400', 
          bg: 'bg-cyan-400/10 border-cyan-400/20',
        },
        {
          label: 'Referrals',
          value: formatValue('Referrals', referralsPassedCount),
          trend: 'Total',
          trendLabel: 'Passed',
          icon: Share2, 
          color: 'text-emerald-400', 
          bg: 'bg-emerald-400/10 border-emerald-400/20',
        },
        {
          label: 'One-to-One Meetings',
          value: formatValue('One-to-One Meetings', oneToOneMeetingsCount),
          trend: 'Total',
          trendLabel: 'Completed',
          icon: Handshake,
          color: 'text-blue-500',
          bg: 'bg-blue-500/10 border-blue-500/20',
        },
        {
          label: 'Guest Invites',
          value: formatValue('Guest Invites', visitorsAttendedCount),
          trend: 'Total',
          trendLabel: 'Invites',
          icon: UserCheck,
          color: 'text-pink-500',
          bg: 'bg-pink-500/10 border-pink-500/20',
        },
        {
          label: 'Testimonials',
          value: formatValue('Testimonials', testimonialsCount),
          trend: 'Total',
          trendLabel: 'Approved',
          icon: Star,
          color: 'text-yellow-400', 
          bg: 'bg-yellow-400/10 border-yellow-400/20',
        }
      ];
    }

    // MASTER_ADMIN gets original adminStats layout + extra global stats
    const globalAdminStats = [
      {
        label: 'Total Members',
        value: formatValue('Total Members', totalMembersCount),
        trend: 'Total',
        trendLabel: 'In chapter',
        icon: Users,
        color: 'text-indigo-400', 
        bg: 'bg-indigo-400/10 border-indigo-400/20',
      },
      commonStats[0], // Active Members
      commonStats[1], // Business Generated
      commonStats[2], // Referrals Passed
      {
        label: 'Thank You Slips',
        value: formatValue('Thank You Slips', thankYouSlipsCount),
        trend: 'Total',
        trendLabel: 'Slips',
        icon: Star,
        color: 'text-yellow-400', 
        bg: 'bg-yellow-400/10 border-yellow-400/20',
      },
      meetingsSyncsStats[1], // One-to-One Meetings
      meetingsSyncsStats[2], // Visitors Attended
      {
        label: 'Weekly Meeting Attendance',
        value: formatValue('Weekly Meeting Attendance', weeklyMeetingAttendance),
        trend: 'Average',
        trendLabel: 'Attendance',
        icon: Target,
        color: 'text-cyan-400', 
        bg: 'bg-cyan-400/10 border-cyan-400/20',
      },
      {
        label: 'Growth Score',
        value: formatValue('Growth Score', growthScore),
        trend: 'Score',
        trendLabel: 'Performance',
        icon: Activity,
        color: 'text-green-500', 
        bg: 'bg-green-500/10 border-green-500/20',
      },
      meetingsSyncsStats[0], // Upcoming Meetings
    ];

    return [
      {
        label: 'Total Chapters',
        value: formatValue('Total Chapters', totalChaptersCount),
        trend: 'Total',
        trendLabel: 'Chapters',
        icon: Users,
        color: 'text-violet-400', 
        bg: 'bg-violet-400/10 border-violet-400/20',
      },
      ...globalAdminStats,
      {
        label: 'New Members This Month',
        value: formatValue('New Members This Month', newMembersThisMonthCount),
        trend: 'Monthly',
        trendLabel: 'New Members',
        icon: Plus,
        color: 'text-rose-400', 
        bg: 'bg-rose-400/10 border-rose-400/20',
      }
    ];
  };

  const stats = getStatsForRole();

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: {
            staggerChildren: 0.05
          }
        }
      }}
      className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5"
    >
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        const isScheduled = stat.trend === 'Scheduled';
        
        return (
          <motion.div 
            key={idx}
            variants={{
              hidden: { opacity: 0, y: 15 },
              show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
            }}
            whileHover={{ 
               y: -8, 
               scale: 1.02, 
               boxShadow: "0 12px 30px rgba(0,0,0,0.6)",
              borderColor: "rgba(255, 255, 255, 0.15)"
            }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="bg-[#111827] rounded-[20px] p-3 sm:p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/5 flex flex-col justify-center items-center text-center h-[140px] sm:h-[160px] cursor-pointer transition-all duration-300 group col-span-1 w-full gap-1.5 sm:gap-2"
          >
            <motion.div 
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: idx * 0.4 }}
              className={`w-7 h-7 sm:w-10 sm:h-10 rounded-[10px] sm:rounded-[14px] flex items-center justify-center shrink-0 border ${stat.bg} ${stat.color} shadow-[0_0_15px_rgba(0,0,0,0.2)]`}
            >
              <Icon size={14} className="sm:size-[18px]" strokeWidth={2.5} />
            </motion.div>
            
            <span className="text-[9px] sm:text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider leading-none truncate w-full">
              {stat.label}
            </span>

            <div className="text-[16px] sm:text-[24px] font-black text-white leading-none tracking-tight truncate w-full">
              {stat.value}
            </div>

            <div className="flex flex-col items-center justify-center gap-0.5 w-full">
              <span className={`text-[10px] sm:text-[12px] font-black flex items-center gap-0.5 justify-center ${isScheduled ? 'text-orange-400' : 'text-emerald-400'} truncate w-full`}>
                {!isScheduled && <TrendingUp size={10} className="sm:size-[11px]" strokeWidth={3} />}
                {stat.trend}
              </span>

              <span className="text-[8px] sm:text-[9.5px] font-bold text-[#9CA3AF] leading-none uppercase truncate w-full">
                {stat.trendLabel}
              </span>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
