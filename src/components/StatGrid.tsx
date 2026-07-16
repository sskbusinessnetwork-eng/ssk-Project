import React from 'react';
import { Users, FileCheck, IndianRupee, Calendar, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface StatGridProps {
  activeMembers?: string;
  referralsPassed?: string;
  businessGenerated?: string;
  upcomingMeetings?: string;
}

export default function StatGrid({ activeMembers, referralsPassed, businessGenerated, upcomingMeetings }: StatGridProps) {
  const stats = [
    {
      label: 'Active Partners',
      value: activeMembers || '142',
      trend: '+12%',
      trendLabel: 'vs last month',
      icon: Users,
      color: 'text-primary',
      bg: 'bg-primary/5',
      border: 'border-primary/10',
      sparkColor: 'bg-primary',
    },
    {
      label: 'Business Generated',
      value: businessGenerated || '₹4.2M+',
      trend: '+24%',
      trendLabel: 'vs last month',
      icon: IndianRupee,
      color: 'text-emerald-600',
      bg: 'bg-emerald-500/5',
      border: 'border-emerald-500/10',
      sparkColor: 'bg-emerald-500',
    },
    {
      label: 'Referrals Passed',
      value: referralsPassed || '845',
      trend: '+8%',
      trendLabel: 'vs last month',
      icon: FileCheck,
      color: 'text-blue-600',
      bg: 'bg-blue-500/5',
      border: 'border-blue-500/10',
      sparkColor: 'bg-blue-500',
    },
    {
      label: 'Upcoming Syncs',
      value: upcomingMeetings || '12',
      trend: 'Scheduled',
      trendLabel: 'next 14 days',
      icon: Calendar,
      color: 'text-amber-600',
      bg: 'bg-amber-500/5',
      border: 'border-amber-500/10',
      sparkColor: 'bg-amber-500',
    },
    {
      label: 'Completion Index',
      value: '94%',
      trend: '+2%',
      trendLabel: 'vs last week',
      icon: TrendingUp,
      color: 'text-violet-600',
      bg: 'bg-violet-500/5',
      border: 'border-violet-500/10',
      sparkColor: 'bg-violet-500',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex overflow-x-auto xl:grid xl:grid-cols-5 gap-4 xl:gap-5 w-full snap-x pb-2 xl:pb-0 hide-scrollbar"
    >
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={idx}
            variants={itemVariants}
            whileHover={{ y: -4, transition: { duration: 0.25, ease: 'easeOut' } }}
            className="min-w-[240px] xl:min-w-0 snap-start bg-white rounded-[20px] p-5 shadow-[0_1px_3px_rgba(11,11,13,0.04),0_8px_20px_-4px_rgba(11,11,13,0.03)] border border-neutral-200/60 flex flex-col justify-between group hover:shadow-[0_4px_16px_rgba(11,11,13,0.06),0_16px_40px_-8px_rgba(11,11,13,0.05)] hover:border-neutral-300 transition-all duration-300"
          >
            <div className="flex justify-between items-start mb-5">
              <div className={cn('w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 border transition-transform duration-500 group-hover:scale-110', stat.bg, stat.color, stat.border)}>
                <Icon size={20} strokeWidth={2} />
              </div>

              {/* Mini Sparkline */}
              <div className="flex items-end gap-1 h-7 opacity-50">
                {[40, 65, 45, 80, 55, 90, 75].map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: 0.4 + i * 0.08, duration: 0.5, ease: 'easeOut' }}
                    className={cn('w-1.5 rounded-t-sm', stat.sparkColor)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[12px] font-semibold text-neutral-500 uppercase tracking-[0.12em] block">
                {stat.label}
              </span>
              <div className="flex items-end gap-3 pt-0.5">
                <span className="text-[28px] font-bold text-[#111827] leading-none tracking-tight">
                  {stat.value}
                </span>
              </div>
              <div className="pt-2.5 flex items-center gap-2">
                <span className={cn('text-[12px] font-semibold flex items-center gap-1', stat.color)}>
                  {stat.trend}
                </span>
                <span className="text-[12px] text-neutral-400 font-medium">
                  {stat.trendLabel}
                </span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
