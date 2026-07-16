import os

statgrid_content = """import React from 'react';
import { Users, FileCheck, IndianRupee, Calendar, Target, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

export default function StatGrid() {
  const stats = [
    {
      label: 'Active Partners',
      value: '1',
      trend: '+12%',
      trendLabel: 'vs last month',
      icon: Users,
      color: 'text-[#DC2626]', // Red
      bg: 'bg-[#FEF2F2]',
      trendColor: 'text-[#10B981]'
    },
    {
      label: 'Business Generated',
      value: '₹4.2M+',
      trend: '+24%',
      trendLabel: 'vs last month',
      icon: IndianRupee,
      color: 'text-[#8B5CF6]', // Purple
      bg: 'bg-[#F5F3FF]',
      trendColor: 'text-[#10B981]'
    },
    {
      label: 'Referrals Passed',
      value: '845',
      trend: '+8%',
      trendLabel: 'vs last month',
      icon: FileCheck,
      color: 'text-[#10B981]', // Green
      bg: 'bg-[#ECFDF5]',
      trendColor: 'text-[#10B981]'
    },
    {
      label: 'Upcoming Syncs',
      value: '12',
      trend: 'Scheduled',
      trendLabel: 'next 14 days',
      icon: Calendar,
      color: 'text-[#F59E0B]', // Orange
      bg: 'bg-[#FFFBEB]',
      trendColor: 'text-[#F59E0B]'
    },
    {
      label: 'Completion Index',
      value: '94%',
      trend: '+2%',
      trendLabel: 'vs last week',
      icon: Target, 
      color: 'text-[#3B82F6]', // Blue
      bg: 'bg-[#EFF6FF]',
      trendColor: 'text-[#10B981]'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-6">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div 
            key={idx}
            className="bg-white rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-neutral-100 flex flex-col justify-between group hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300"
          >
            <div className="flex justify-between items-start mb-6">
              <div className={`w-12 h-12 rounded-[16px] flex items-center justify-center shrink-0 ${stat.bg} ${stat.color}`}>
                <Icon size={24} strokeWidth={2.5} />
              </div>
              <div className="w-16 h-12 relative opacity-50 group-hover:opacity-100 transition-opacity">
                {/* Simulated colorful sparkline */}
                <svg viewBox="0 0 100 40" className="w-full h-full" preserveAspectRatio="none">
                  <path 
                    d="M0,35 Q10,25 20,28 T40,20 T60,15 T80,5 T100,2" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="3" 
                    strokeLinecap="round" 
                    className={stat.color}
                  />
                </svg>
              </div>
            </div>
            
            <div className="space-y-1">
              <span className="text-[12px] font-bold text-neutral-800 block">
                {stat.label}
              </span>
              <div className="text-[32px] font-black text-[#111827] leading-none tracking-tighter pt-1 pb-3">
                {stat.value}
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
                <span className={`text-[12px] font-bold flex items-center gap-1 ${stat.trendColor}`}>
                  <TrendingUp size={12} strokeWidth={3} />
                  {stat.trend}
                </span>
                <span className="text-[11px] text-neutral-400 font-semibold">
                  {stat.trendLabel}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
"""

with open('src/components/StatGrid.tsx', 'w') as f:
    f.write(statgrid_content)

