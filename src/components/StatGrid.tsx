import React from 'react';
import { Users, FileCheck, Calendar, Target, TrendingUp, TrendingDown, LayoutDashboard } from 'lucide-react';
import { motion } from 'motion/react';

export default function StatGrid() {
  const stats = [
    {
      label: 'Active Partners',
      value: '1',
      trend: '+12%',
      trendLabel: 'vs last month',
      icon: Users,
      color: 'text-red-500', // Red
      bg: 'bg-red-500/10 border-red-500/20',
      trendColor: 'text-red-500',
      path: "M0,35 Q10,25 20,28 T40,20 T60,15 T80,5 T100,2"
    },
    {
      label: 'Business Generated',
      value: '₹4.2M+',
      trend: '+24%',
      trendLabel: 'vs last month',
      icon: Users,
      color: 'text-purple-500', // Purple
      bg: 'bg-purple-500/10 border-purple-500/20',
      trendColor: 'text-purple-500',
      path: "M0,25 Q15,10 30,30 T60,20 T80,10 T100,5"
    },
    {
      label: 'Referrals Passed',
      value: '845',
      trend: '+8%',
      trendLabel: 'vs last month',
      icon: Users, // Using a generic user-like icon to match reference 
      color: 'text-emerald-400', // Green
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
      color: 'text-orange-400', // Orange
      bg: 'bg-orange-400/10 border-orange-400/20',
      trendColor: 'text-orange-400',
      path: "M0,20 Q20,5 40,20 T60,15 T80,25 T100,10"
    },
    {
      label: 'Completion Index',
      value: '94%',
      trend: '+2%',
      trendLabel: 'vs last week',
      icon: Target, 
      color: 'text-blue-400', // Blue
      bg: 'bg-blue-400/10 border-blue-400/20',
      trendColor: 'text-blue-400',
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
      className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-6"
    >
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        // Make the 5th card (Completion Index) span full width on mobile for visual balance
        const isLast = idx === 4;
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
            className={`bg-[#111827] rounded-[18px] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-white/5 flex flex-col justify-between h-[110px] cursor-pointer transition-colors duration-300 group ${
              isLast ? 'col-span-2 lg:col-span-1' : ''
            }`}
          >
            {/* Top row: Icon and mini sparkline */}
            <div className="flex items-center justify-between w-full">
              <motion.div 
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: idx * 0.4 }}
                className={`w-8 h-8 rounded-[12px] flex items-center justify-center shrink-0 border ${stat.bg} ${stat.color} shadow-[0_0_10px_rgba(0,0,0,0.1)]`}
              >
                <Icon size={16} strokeWidth={2.5} />
              </motion.div>
              <div className="w-16 h-6 relative opacity-70 group-hover:opacity-100 transition-opacity">
                <svg viewBox="0 0 100 40" className="w-full h-full" preserveAspectRatio="none">
                  <motion.path 
                    d={stat.path}
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="3.5" 
                    strokeLinecap="round" 
                    className={stat.color}
                    initial={{ strokeDashoffset: 120, strokeDasharray: 120 }}
                    animate={{ strokeDashoffset: 0 }}
                    transition={{ duration: 1.2, delay: idx * 0.1, ease: "easeOut" }}
                  />
                </svg>
              </div>
            </div>
            
            {/* Value and label */}
            <div className="mt-auto space-y-0.5">
              <span className="text-[11px] font-bold text-[#9CA3AF] block uppercase tracking-wider">
                {stat.label}
              </span>
              <div className="flex items-baseline justify-between">
                <div className="text-[18px] font-black text-white leading-none tracking-tight">
                  {stat.value}
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-[10px] font-bold flex items-center ${stat.trendColor}`}>
                    {stat.trend}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
