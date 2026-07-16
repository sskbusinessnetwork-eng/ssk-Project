import React from 'react';
import { Users, Calendar, Target, TrendingUp, Share2, Briefcase } from 'lucide-react';
import { motion } from 'motion/react';

export default function StatGrid() {
  const stats = [
    {
      label: 'Active Partners',
      value: '1',
      trend: '12%',
      trendLabel: 'vs last month',
      icon: Users,
      color: 'text-red-500', 
      bg: 'bg-red-500/10 border-red-500/20',
      trendColor: 'text-emerald-400',
      path: "M0,35 Q10,25 20,28 T40,20 T60,15 T80,5 T100,2"
    },
    {
      label: 'Business Generated',
      value: '₹4.2M+',
      trend: '24%',
      trendLabel: 'vs last month',
      icon: Briefcase,
      color: 'text-purple-500', 
      bg: 'bg-purple-500/10 border-purple-500/20',
      trendColor: 'text-emerald-400',
      path: "M0,25 Q15,10 30,30 T60,20 T80,10 T100,5"
    },
    {
      label: 'Referrals Passed',
      value: '845',
      trend: '8%',
      trendLabel: 'vs last month',
      icon: Share2, 
      color: 'text-emerald-400', 
      bg: 'bg-emerald-400/10 border-emerald-400/20',
      trendColor: 'text-emerald-400',
      path: "M0,30 Q20,30 30,20 T50,25 T70,10 T100,5"
    },
    {
      label: 'Upcoming Syncs',
      value: '12',
      trend: 'Scheduled',
      trendLabel: 'next 14 days',
      icon: Calendar,
      color: 'text-orange-400', 
      bg: 'bg-orange-400/10 border-orange-400/20',
      trendColor: 'text-orange-400',
      path: "M0,20 Q20,5 40,20 T60,15 T80,25 T100,10"
    },
    {
      label: 'Completion Index',
      value: '94%',
      trend: '2%',
      trendLabel: 'vs last week',
      icon: Target, 
      color: 'text-blue-400', 
      bg: 'bg-blue-400/10 border-blue-400/20',
      trendColor: 'text-emerald-400',
      path: "M0,35 Q10,15 25,25 T45,10 T70,15 T100,5"
    }
  ];

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
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5"
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
            className="bg-[#111827] rounded-[20px] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/5 flex justify-between gap-3 h-[142px] cursor-pointer transition-all duration-300 group"
          >
            {/* Left Column: Icon and Trend */}
            <div className="flex flex-col justify-between h-full">
              <motion.div 
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: idx * 0.4 }}
                className={`w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 border ${stat.bg} ${stat.color} shadow-[0_0_15px_rgba(0,0,0,0.2)]`}
              >
                <Icon size={18} strokeWidth={2.5} />
              </motion.div>
              
              <div className="flex flex-col mt-2">
                <span className={`text-[12px] font-black flex items-center gap-0.5 ${isScheduled ? 'text-orange-400' : 'text-emerald-400'}`}>
                  {!isScheduled && <TrendingUp size={11} strokeWidth={3} />}
                  {stat.trend}
                </span>
                <span className="text-[9px] font-bold text-[#9CA3AF] leading-none uppercase mt-1 whitespace-nowrap">
                  {stat.trendLabel}
                </span>
              </div>
            </div>

            {/* Right Column: Label, Value, and Sparkline Graph */}
            <div className="flex flex-col justify-between items-end h-full flex-1">
              <div className="text-right">
                <span className="text-[11px] font-bold text-[#9CA3AF] block uppercase tracking-wider leading-none">
                  {stat.label}
                </span>
                <div className="text-[24px] font-black text-white leading-none tracking-tight mt-1.5">
                  {stat.value}
                </div>
              </div>

              <div className="w-20 h-8 relative opacity-75 group-hover:opacity-100 transition-opacity mt-auto">
                <svg viewBox="0 0 100 40" className="w-full h-full" preserveAspectRatio="none">
                  <motion.path 
                    d={stat.path}
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="3.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className={stat.color}
                    initial={{ strokeDashoffset: 120, strokeDasharray: 120 }}
                    animate={{ strokeDashoffset: 0 }}
                    transition={{ duration: 1.2, delay: idx * 0.1, ease: "easeOut" }}
                  />
                </svg>
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
