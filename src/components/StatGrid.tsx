import React from 'react';
import { Users, UserCheck, UserPlus, Share2, Briefcase, ArrowDownLeft, Handshake, Calendar, FileText, Star, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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
  meetingsScheduledCount?: number;
  meetingsAttendedCount?: number;
  oneToOneScheduledCount?: number;
  oneToOneCompletedCount?: number;
  guestsJoinedCount?: number;
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
  businessSentTotal = 0,
  businessSentCount = 0,
  businessReceivedTotal = 0,
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
  meetingsScheduledCount = 0,
  meetingsAttendedCount = 0,
  oneToOneScheduledCount = 0,
  oneToOneCompletedCount = 0,
  guestsJoinedCount = 0,
  onCardClick,
}: StatGridProps) {
  const formatValue = (label: string, val: any) => {
    if (label.includes('Business')) {
      const num = Number(val || 0);
      if (num === 0) return '₹0';
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
    
    if (normRole !== 'MASTER_ADMIN') {
      // Member / Position dashboards -> Merged Cards for "My Analytics"
      return [
        {
          label: 'REFERRALS',
          isMerged: true,
          icon: Share2,
          color: 'text-purple-400',
          bg: 'bg-purple-950/80 border-purple-500/30 text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.2)]',
          rows: [
            { label: 'Sent', value: String(referralsSentCount ?? 0) },
            { label: 'Received', value: String(referralsReceivedCount ?? 0) },
          ]
        },
        {
          label: 'BUSINESS',
          isMerged: true,
          icon: Briefcase,
          color: 'text-emerald-400',
          bg: 'bg-emerald-950/80 border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]',
          rows: [
            { label: 'Sent', value: formatValue('Business', businessSentTotal) },
            { label: 'Received', value: formatValue('Business', businessReceivedTotal) },
          ]
        },
        {
          label: 'THANK YOU SLIPS',
          isMerged: true,
          icon: FileText,
          color: 'text-cyan-400',
          bg: 'bg-cyan-950/80 border-cyan-500/30 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.2)]',
          rows: [
            { label: 'Sent', value: String(thankYouSlipsSentCount ?? businessSentCount ?? 0) },
            { label: 'Received', value: String(thankYouSlipsReceivedCount ?? businessReceivedCount ?? 0) },
          ]
        },
        {
          label: 'MEETINGS',
          isMerged: true,
          icon: Calendar,
          color: 'text-orange-400',
          bg: 'bg-orange-950/80 border-orange-500/30 text-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.2)]',
          rows: [
            { label: 'Scheduled', value: String(meetingsScheduledCount ?? 0) },
            { label: 'Attended', value: String(meetingsAttendedCount ?? 0) },
          ]
        },
        {
          label: 'ONE-TO-ONE MEETINGS',
          isMerged: true,
          icon: Handshake,
          color: 'text-blue-400',
          bg: 'bg-blue-950/80 border-blue-500/30 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.2)]',
          rows: [
            { label: 'Scheduled', value: String(oneToOneScheduledCount ?? 0) },
            { label: 'Completed', value: String(oneToOneCompletedCount ?? 0) },
          ]
        },
        {
          label: 'GUESTS',
          isMerged: true,
          icon: UserPlus,
          color: 'text-pink-400',
          bg: 'bg-pink-950/80 border-pink-500/30 text-pink-400 shadow-[0_0_12px_rgba(236,72,153,0.2)]',
          rows: [
            { label: 'Invited', value: String(guestsInvitedCount ?? 0) },
            { label: 'Joined', value: String(guestsJoinedCount ?? visitorsAttendedCount ?? 0) },
          ]
        },
        /* {
          label: 'TESTIMONIALS',
          isMerged: true,
          icon: Star,
          color: 'text-amber-400',
          bg: 'bg-amber-950/80 border-amber-500/30 text-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.2)]',
          rows: [
            { label: 'Sent', value: String(testimonialsGivenCount ?? testimonialsCount ?? 0) },
            { label: 'Received', value: String(testimonialsReceivedCount ?? 0) },
          ]
        } */
      ];
    }
    // MASTER_ADMIN gets global admin stats
    return [
      {
        label: 'NETWORK',
        isMerged: true,
        icon: Users,
        color: 'text-violet-400',
        bg: 'bg-violet-950/80 border-violet-500/30 text-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.2)]',
        rows: [
          { label: 'Chapters', value: formatValue('Total Chapters', totalChaptersCount) },
          { label: 'Members', value: formatValue('Total Members', totalMembersCount) },
        ]
      },
      {
        label: 'MEMBERSHIP',
        isMerged: true,
        icon: UserCheck,
        color: 'text-emerald-500',
        bg: 'bg-emerald-950/80 border-emerald-500/30 text-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.2)]',
        rows: [
          { label: 'Active', value: formatValue('Active Members', activePartnersCount) },
          { label: 'Inactive', value: formatValue('Inactive Members', inactiveMembersCount) },
        ]
      },
      {
        label: 'BUSINESS',
        isMerged: true,
        icon: Briefcase,
        color: 'text-emerald-400',
        bg: 'bg-emerald-950/80 border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]',
        rows: [
          { label: 'Sent', value: formatValue('Business Sent', businessSentTotal ?? businessGeneratedTotal) },
          { label: 'Received', value: formatValue('Business Received', businessReceivedTotal ?? 0) },
        ]
      },
      {
        label: 'REFERRALS',
        isMerged: true,
        icon: Share2,
        color: 'text-purple-400',
        bg: 'bg-purple-950/80 border-purple-500/30 text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.2)]',
        rows: [
          { label: 'Sent', value: formatValue('Referrals Sent', referralsSentCount || referralsPassedCount) },
          { label: 'Received', value: formatValue('Referrals Received', referralsReceivedCount) },
        ]
      },
      {
        label: 'THANK YOU SLIPS',
        isMerged: true,
        icon: FileText,
        color: 'text-cyan-400',
        bg: 'bg-cyan-950/80 border-cyan-500/30 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.2)]',
        rows: [
          { label: 'Sent', value: formatValue('Thank You Slips Sent', thankYouSlipsSentCount || businessSentCount || thankYouSlipsCount) },
          { label: 'Received', value: formatValue('Thank You Slips Received', thankYouSlipsReceivedCount || businessReceivedCount) },
        ]
      },
      {
        label: 'MEETINGS',
        isMerged: true,
        icon: Calendar,
        color: 'text-orange-400',
        bg: 'bg-orange-950/80 border-orange-500/30 text-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.2)]',
        rows: [
          { label: '1-to-1s', value: formatValue('One-to-One Meetings', oneToOneMeetingsCount) },
          { label: 'Chapter', value: formatValue('Chapter Meetings', chapterMeetingsCount || meetingsCount) },
        ]
      },
      {
        label: 'GUESTS',
        isMerged: true,
        icon: UserCheck,
        color: 'text-pink-500',
        bg: 'bg-pink-950/80 border-pink-500/30 text-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.2)]',
        rows: [
          { label: 'Invited', value: formatValue('Guests Invited', guestsInvitedCount || visitorsAttendedCount) }
        ]
      }
    ];
  };

  const stats = getStatsForRole();
  const normRole = (role || '').toUpperCase();
  const isMasterAdmin = normRole === 'MASTER_ADMIN';
  const isClickable = isMasterAdmin || Boolean(onCardClick);

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
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-[10px] sm:gap-3.5 w-full"
    >
      {stats.map((stat: any, idx: number) => {
        const Icon = stat.icon;
        
        if (stat.isMerged) {
          return (
            <motion.div 
              key={idx}
              onClick={() => {
                if (isClickable) {
                  onCardClick?.(stat.label);
                }
              }}
              variants={{
                hidden: { opacity: 0, y: 12 },
                show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } }
              }}
              whileHover={isClickable ? { 
                 y: -3, 
                 scale: 1.015, 
                 boxShadow: "0 12px 24px rgba(0,0,0,0.5), 0 0 15px rgba(255,255,255,0.05)",
                 borderColor: "rgba(255, 255, 255, 0.25)"
              } : undefined}
              whileTap={isClickable ? { scale: 0.98 } : undefined}
              transition={{ type: "spring", stiffness: 220, damping: 20 }}
              className={`bg-[#080d1a]/95 backdrop-blur-xl rounded-[16px] px-3.5 py-3 shadow-[0_6px_20px_rgba(0,0,0,0.5)] border border-white/10 flex flex-col justify-between transition-all duration-300 group col-span-1 w-full gap-2.5 ${isClickable ? 'cursor-pointer hover:border-white/25 active:scale-[0.98]' : 'cursor-default'}`}
            >
              {/* Top Row: Icon + Title */}
              <div className="flex items-center gap-3 w-full">
                <div className={`w-[36px] h-[36px] rounded-full flex items-center justify-center shrink-0 border ${stat.bg}`}>
                  <Icon size={18} className="shrink-0" strokeWidth={2.2} />
                </div>
                <span className="text-[13px] sm:text-[14px] font-extrabold text-white uppercase tracking-wider truncate leading-tight">
                  {stat.label}
                </span>
              </div>

              {/* Bottom Row: Metrics with vertical divider */}
              <div className="flex items-center w-full pt-0.5">
                {stat.rows[0] && (
                  <div className="flex items-center gap-1.5 flex-1 min-w-0 pr-1">
                    <span className="text-[12px] font-medium text-gray-400 shrink-0">
                      {stat.rows[0].label.replace(':', '')}:
                    </span>
                    <span className={`text-[15px] sm:text-[16px] font-bold tracking-tight truncate ${stat.color}`}>
                      {stat.rows[0].value}
                    </span>
                  </div>
                )}

                <div className="w-[1px] h-4 bg-white/15 shrink-0 mx-2.5 sm:mx-3" />

                {stat.rows[1] && (
                  <div className="flex items-center gap-1.5 flex-1 min-w-0 pl-1">
                    <span className="text-[12px] font-medium text-gray-400 shrink-0">
                      {stat.rows[1].label.replace(':', '')}:
                    </span>
                    <span className={`text-[15px] sm:text-[16px] font-bold tracking-tight truncate ${stat.color}`}>
                      {stat.rows[1].value}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        }

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
              show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } }
            }}
            whileHover={isClickable ? { 
               y: -4, 
               scale: 1.02, 
               boxShadow: "0 12px 28px rgba(0,0,0,0.6)",
               borderColor: "rgba(255, 255, 255, 0.25)"
            } : undefined}
            whileTap={isClickable ? { scale: 0.97 } : undefined}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
            className={`bg-[#0F172A]/80 backdrop-blur-md rounded-[14px] px-[12px] py-[10px] sm:p-3.5 shadow-[0_8px_25px_rgba(0,0,0,0.5)] border border-white/10 flex flex-col justify-center items-center text-center h-[82px] sm:h-[135px] transition-all duration-300 group col-span-1 w-full gap-1 ${isClickable ? 'cursor-pointer hover:border-white/25 active:scale-[0.98]' : 'cursor-default'}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${stat.bg}`}>
              <Icon size={15} strokeWidth={2.5} />
            </div>
            
            <span className="text-[10px] sm:text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider leading-none truncate w-full">
              {stat.label}
            </span>

            <div className="text-[18px] sm:text-[22px] font-black text-white leading-none tracking-tight truncate w-full">
              {stat.value}
            </div>

            <div className="flex flex-col items-center justify-center gap-0.5 w-full">
              <span className={`text-[10px] sm:text-[11px] font-black flex items-center gap-0.5 justify-center ${isScheduled ? 'text-orange-400' : 'text-emerald-400'} truncate w-full`}>
                {!isScheduled && <TrendingUp size={10} strokeWidth={3} />}
                {stat.trend}
              </span>

              <span className="text-[8px] sm:text-[9px] font-bold text-[#9CA3AF] leading-none uppercase truncate w-full">
                {stat.trendLabel}
              </span>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
