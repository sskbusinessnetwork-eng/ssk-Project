import React from 'react';
import { Users, Calendar, Target, TrendingUp, Share2, Briefcase, Handshake, UserCheck, Star, Activity, Plus, ArrowDownLeft, FileText } from 'lucide-react';
import { motion } from 'motion/react';

interface StatGridProps {
  role?: string;
  position?: string;
  totalChaptersCount?: number;
  totalMembersCount?: number;
  activePartnersCount?: number;
  inactiveMembersCount?: number;
  businessGeneratedTotal?: number;
  businessSentTotal?: number;
  businessSentCount?: number;
  businessReceivedTotal?: number;
  businessReceivedCount?: number;
  referralsPassedCount?: number;
  referralsSentCount?: number;
  referralsReceivedCount?: number;
  thankYouSlipsCount?: number;
  thankYouSlipsSentCount?: number;
  thankYouSlipsReceivedCount?: number;
  upcomingSyncsCount?: number;
  oneToOneMeetingsCount?: number;
  visitorsAttendedCount?: number;
  guestsInvitedCount?: number;
  chapterMeetingsCount?: number;
  weeklyMeetingAttendance?: number;
  growthScore?: number;
  newMembersThisMonthCount?: number;
  testimonialsCount?: number;
  testimonialsGivenCount?: number;
  testimonialsReceivedCount?: number;
  meetingsCount?: number;
  onCardClick?: (label: string) => void;
}

export default function StatGrid({
  role = 'MEMBER',
  position = '',
  totalChaptersCount = 0,
  totalMembersCount = 0,
  activePartnersCount = 0,
  inactiveMembersCount = 0,
  businessGeneratedTotal = 0,
  businessSentTotal,
  businessSentCount = 0,
  businessReceivedTotal,
  businessReceivedCount = 0,
  referralsPassedCount = 0,
  referralsSentCount = 0,
  referralsReceivedCount = 0,
  thankYouSlipsCount = 0,
  thankYouSlipsSentCount = 0,
  thankYouSlipsReceivedCount = 0,
  upcomingSyncsCount = 0,
  oneToOneMeetingsCount = 0,
  visitorsAttendedCount = 0,
  guestsInvitedCount = 0,
  chapterMeetingsCount = 0,
  weeklyMeetingAttendance = 0,
  growthScore = 0,
  newMembersThisMonthCount = 0,
  testimonialsCount = 0,
  testimonialsGivenCount = 0,
  testimonialsReceivedCount = 0,
  meetingsCount = 0,
  onCardClick,
}: StatGridProps) {
  const formatValue = (label: string, val: any) => {
    if (label.includes('Business')) {
      const num = Number(val || 0);
      if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr+`;
      if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L+`;
      return `₹${num.toLocaleString('en-IN')}`;
    }
    if (label === 'Weekly Meeting Attendance' || label === 'Growth Score' || label === 'Attendance') {
      return `${val}%`;
    }
    return String(val ?? 0);
  };

  const getStatsForRole = () => {
    const normRole = (role || '').toUpperCase();
    const normPos = (position || '').toLowerCase();
    const isChapterRole = normRole === 'MEMBER' || normRole === 'CHAPTER_ADMIN' || normRole === 'PRESIDENT' || normRole === 'VICE_PRESIDENT' || normRole === 'TREASURER' || ['president', 'vice_president', 'treasurer', 'chapter_admin', 'member'].includes(normPos);

    if (isChapterRole && normRole !== 'MASTER_ADMIN') {
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
          icon: UserCheck,
          color: 'text-emerald-500',
          bg: 'bg-emerald-500/10 border-emerald-500/20',
        },
        {
          label: 'Inactive Members',
          value: formatValue('Inactive Members', inactiveMembersCount),
          trend: 'Inactive',
          trendLabel: 'In chapter',
          icon: Users,
          color: 'text-red-400',
          bg: 'bg-red-400/10 border-red-400/20',
        },
        {
          label: 'Referrals Sent',
          value: formatValue('Referrals Sent', referralsSentCount || referralsPassedCount),
          trend: 'Sent',
          trendLabel: 'By chapter',
          icon: Share2,
          color: 'text-purple-400',
          bg: 'bg-purple-400/10 border-purple-400/20',
        },
        {
          label: 'Referrals Received',
          value: formatValue('Referrals Received', referralsReceivedCount),
          trend: 'Received',
          trendLabel: 'By chapter',
          icon: Share2,
          color: 'text-emerald-400',
          bg: 'bg-emerald-400/10 border-emerald-400/20',
        },
        {
          label: 'Business Sent',
          value: formatValue('Business Sent', businessSentTotal ?? businessGeneratedTotal),
          trend: `${businessSentCount ?? 0} Slips`,
          trendLabel: 'Given',
          icon: Briefcase,
          color: 'text-purple-500',
          bg: 'bg-purple-500/10 border-purple-500/20',
        },
        {
          label: 'Business Received',
          value: formatValue('Business Received', businessReceivedTotal ?? 0),
          trend: `${businessReceivedCount ?? 0} Slips`,
          trendLabel: 'Earned',
          icon: ArrowDownLeft,
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
          label: 'Chapter Meetings',
          value: formatValue('Chapter Meetings', chapterMeetingsCount || meetingsCount),
          trend: 'Total',
          trendLabel: 'Meetings',
          icon: Calendar,
          color: 'text-orange-400',
          bg: 'bg-orange-400/10 border-orange-400/20',
        },
        {
          label: 'Guests Invited',
          value: formatValue('Guests Invited', guestsInvitedCount || visitorsAttendedCount),
          trend: 'Total',
          trendLabel: 'Invited',
          icon: UserCheck,
          color: 'text-pink-500',
          bg: 'bg-pink-500/10 border-pink-500/20',
        },
        {
          label: 'Thank You Slips Sent',
          value: formatValue('Thank You Slips Sent', thankYouSlipsSentCount || businessSentCount || thankYouSlipsCount),
          trend: 'Sent',
          trendLabel: 'Slips',
          icon: FileText,
          color: 'text-cyan-400',
          bg: 'bg-cyan-400/10 border-cyan-400/20',
        },
        {
          label: 'Thank You Slips Received',
          value: formatValue('Thank You Slips Received', thankYouSlipsReceivedCount || businessReceivedCount),
          trend: 'Received',
          trendLabel: 'Slips',
          icon: FileText,
          color: 'text-teal-400',
          bg: 'bg-teal-400/10 border-teal-400/20',
        },
        {
          label: 'Testimonials Given',
          value: formatValue('Testimonials Given', testimonialsGivenCount || testimonialsCount),
          trend: 'Given',
          trendLabel: 'By chapter',
          icon: Star,
          color: 'text-amber-400',
          bg: 'bg-amber-400/10 border-amber-400/20',
        },
        {
          label: 'Testimonials Received',
          value: formatValue('Testimonials Received', testimonialsReceivedCount),
          trend: 'Received',
          trendLabel: 'By chapter',
          icon: Star,
          color: 'text-yellow-400',
          bg: 'bg-yellow-400/10 border-yellow-400/20',
        },
      ];
    }

    // MASTER_ADMIN gets global admin stats
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
      {
        label: 'Total Members',
        value: formatValue('Total Members', totalMembersCount),
        trend: 'Total',
        trendLabel: 'In network',
        icon: Users,
        color: 'text-indigo-400',
        bg: 'bg-indigo-400/10 border-indigo-400/20',
      },
      {
        label: 'Active Members',
        value: formatValue('Active Members', activePartnersCount),
        trend: 'Active',
        trendLabel: 'In network',
        icon: UserCheck,
        color: 'text-emerald-500',
        bg: 'bg-emerald-500/10 border-emerald-500/20',
      },
      {
        label: 'Inactive Members',
        value: formatValue('Inactive Members', inactiveMembersCount),
        trend: 'Inactive',
        trendLabel: 'Needs attention',
        icon: Users,
        color: 'text-red-400',
        bg: 'bg-red-400/10 border-red-400/20',
      },
      {
        label: 'Business Sent',
        value: formatValue('Business Sent', businessSentTotal ?? businessGeneratedTotal),
        trend: `${businessSentCount ?? 0} Slips`,
        trendLabel: 'Completed',
        icon: Briefcase,
        color: 'text-purple-500',
        bg: 'bg-purple-500/10 border-purple-500/20',
      },
      {
        label: 'Business Received',
        value: formatValue('Business Received', businessReceivedTotal ?? 0),
        trend: `${businessReceivedCount ?? 0} Slips`,
        trendLabel: 'Completed',
        icon: ArrowDownLeft,
        color: 'text-emerald-400',
        bg: 'bg-emerald-400/10 border-emerald-400/20',
      },
      {
        label: 'Referrals Sent',
        value: formatValue('Referrals Sent', referralsSentCount || referralsPassedCount),
        trend: 'Total',
        trendLabel: 'Sent',
        icon: Share2,
        color: 'text-purple-400',
        bg: 'bg-purple-400/10 border-purple-400/20',
      },
      {
        label: 'Referrals Received',
        value: formatValue('Referrals Received', referralsReceivedCount),
        trend: 'Total',
        trendLabel: 'Received',
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
        label: 'Chapter Meetings',
        value: formatValue('Chapter Meetings', chapterMeetingsCount || meetingsCount),
        trend: 'Total',
        trendLabel: 'Meetings',
        icon: Calendar,
        color: 'text-orange-400',
        bg: 'bg-orange-400/10 border-orange-400/20',
      },
      {
        label: 'Guests Invited',
        value: formatValue('Guests Invited', guestsInvitedCount || visitorsAttendedCount),
        trend: 'Total',
        trendLabel: 'Invited',
        icon: UserCheck,
        color: 'text-pink-500',
        bg: 'bg-pink-500/10 border-pink-500/20',
      },
      {
        label: 'Thank You Slips Sent',
        value: formatValue('Thank You Slips Sent', thankYouSlipsSentCount || businessSentCount || thankYouSlipsCount),
        trend: 'Sent',
        trendLabel: 'Slips',
        icon: FileText,
        color: 'text-cyan-400',
        bg: 'bg-cyan-400/10 border-cyan-400/20',
      },
      {
        label: 'Thank You Slips Received',
        value: formatValue('Thank You Slips Received', thankYouSlipsReceivedCount || businessReceivedCount),
        trend: 'Received',
        trendLabel: 'Slips',
        icon: FileText,
        color: 'text-teal-400',
        bg: 'bg-teal-400/10 border-teal-400/20',
      },
      {
        label: 'Testimonials Given',
        value: formatValue('Testimonials Given', testimonialsGivenCount || testimonialsCount),
        trend: 'Given',
        trendLabel: 'By network',
        icon: Star,
        color: 'text-amber-400',
        bg: 'bg-amber-400/10 border-amber-400/20',
      },
      {
        label: 'Testimonials Received',
        value: formatValue('Testimonials Received', testimonialsReceivedCount),
        trend: 'Received',
        trendLabel: 'By network',
        icon: Star,
        color: 'text-yellow-400',
        bg: 'bg-yellow-400/10 border-yellow-400/20',
      }
    ];
  };

  const stats = getStatsForRole();
  const normRole = (role || '').toUpperCase();
  const normPos = (position || '').toLowerCase();

  // ONLY Chapter Admin or Master Admin cards are clickable
  const isChapterAdmin = normRole === 'CHAPTER_ADMIN' || normPos === 'chapter_admin';
  const isMasterAdmin = normRole === 'MASTER_ADMIN';
  const isClickable = isChapterAdmin || isMasterAdmin;

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: {
            staggerChildren: 0.03
          }
        }
      }}
      className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5"
    >
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        const isScheduled = stat.trend === 'Scheduled';
        
        return (
          <motion.div 
            key={idx}
            onClick={() => {
              if (isClickable) {
                onCardClick?.(stat.label);
              }
            }}
            variants={{
              hidden: { opacity: 0, y: 15 },
              show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
            }}
            whileHover={isClickable ? { 
               y: -6, 
               scale: 1.02, 
               boxShadow: "0 12px 30px rgba(0,0,0,0.6)",
               borderColor: "rgba(255, 255, 255, 0.15)"
            } : undefined}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className={`bg-[#111827] rounded-[20px] p-3 sm:p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/5 flex flex-col justify-center items-center text-center h-[140px] sm:h-[160px] transition-all duration-300 group col-span-1 w-full gap-1.5 sm:gap-2 ${isClickable ? 'cursor-pointer hover:border-white/20' : 'cursor-default'}`}
          >
            <motion.div 
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: idx * 0.2 }}
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
