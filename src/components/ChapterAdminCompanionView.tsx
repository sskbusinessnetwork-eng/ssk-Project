import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Calendar, CheckCircle2, UserPlus, Users, Share2, Handshake,
  Clock, Target, Shield, Award, ChevronRight, FileText, BarChart3, TrendingUp, CheckSquare, ChevronDown, Star, ArrowRight, Crown
} from 'lucide-react';
import { UserProfile } from '../types';
import { format } from 'date-fns';

import { cn } from '../lib/utils';

interface ChapterAdminCompanionViewProps {
  profile: UserProfile | null;
  chapterHealthScore: number;
  chapterMemberCount: number;
  chapterReferrals: number;
  chapterBusiness: number;
  finalRecentActivities: any[];
  
  chapterSlips?: any[];
  chapterReferralsList?: any[];
  tasks?: any[];
}

export function ChapterAdminCompanionView({
  profile,
  chapterHealthScore,
  chapterMemberCount,
  chapterReferrals,
  chapterBusiness,
  finalRecentActivities,
  chapterSlips = [],
  chapterReferralsList = [],
  tasks = [],
}: ChapterAdminCompanionViewProps) {
  
  const formatRevenueLabel = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
    return `₹${Math.round(val)}`;
  };

  const { revenuePoints, referralsPoints, areaPoints, maxRevenue, maxReferrals, latestRevenue } = React.useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // Filter to current month slips
    const monthlySlips = (chapterSlips || []).filter(s => {
      const d = new Date(s.createdAt || s.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    // Filter to current month referrals
    const monthlyRefs = (chapterReferralsList || []).filter(r => {
      const d = new Date(r.createdAt || r.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    const targetDays = [1, 7, 14, 21, 28, 31];
    
    const revenueVals = targetDays.map(day => {
      const itemsUpToDay = monthlySlips.filter(s => {
        const d = new Date(s.createdAt || s.date);
        return d.getDate() <= day;
      });
      return itemsUpToDay.reduce((sum, s) => sum + (Number(s.businessValue) || 0), 0);
    });

    const referralVals = targetDays.map(day => {
      const itemsUpToDay = monthlyRefs.filter(r => {
        const d = new Date(r.createdAt || r.date);
        return d.getDate() <= day;
      });
      return itemsUpToDay.length;
    });

    const maxRev = Math.max(...revenueVals, 0);
    const maxRef = Math.max(...referralVals, 0);

    const xCoords = [60, 200, 340, 480, 620, 760];
    
    const scaleY = (val: number, max: number) => {
      const minY = 200;
      const maxY = 40;
      if (max === 0) return 200;
      return minY - ((val / max) * (minY - maxY));
    };

    const revY = revenueVals.map(val => scaleY(val, maxRev));
    const refY = referralVals.map(val => scaleY(val, maxRef));

    const revPath = revY.map((y, idx) => `${idx === 0 ? 'M' : 'L'} ${xCoords[idx]} ${y}`).join(' ');
    const refPath = refY.map((y, idx) => `${idx === 0 ? 'M' : 'L'} ${xCoords[idx]} ${y}`).join(' ');

    const areaPath = revY.length > 0
      ? `${revY.map((y, idx) => `${idx === 0 ? 'M' : 'L'} ${xCoords[idx]} ${y}`).join(' ')} L 760 220 L 60 220 Z`
      : '';

    return {
      revenuePoints: revPath,
      referralsPoints: refPath,
      areaPoints: areaPath,
      maxRevenue: maxRev,
      maxReferrals: maxRef,
      latestRevenue: revenueVals[revenueVals.length - 1] || 0
    };
  }, [chapterSlips, chapterReferralsList]);

  const topLabel = maxRevenue > 0 ? formatRevenueLabel(maxRevenue) : '0';
  const midLabel = maxRevenue > 0 ? formatRevenueLabel(maxRevenue * 2 / 3) : '0';
  const lowLabel = maxRevenue > 0 ? formatRevenueLabel(maxRevenue * 1 / 3) : '0';

  const displayTasks = tasks.length > 0 ? tasks : [
    { key: 't1', label: "Schedule Chapter Sync Assemblies", isDone: true, link: "/meetings", linkText: "View" },
    { key: 't2', label: "Moderate Guest Onboarding Protocols", isDone: true, link: "/guests", linkText: "Guests" },
    { key: 't3', label: "Validate Weekly Referral Audits", isDone: false, link: "/reports", linkText: "Audit" },
  ];
  
  const completedCount = displayTasks.filter(t => t.isDone).length;
  const progressPercent = displayTasks.length > 0 ? Math.round((completedCount / displayTasks.length) * 100) : 100;

  const operations = [
    { icon: Calendar, label: 'Start Meeting', desc: 'Organize logs', path: '/meetings', color: 'text-red-500', bg: 'bg-red-500/10' },
    { icon: CheckCircle2, label: 'Attendance', desc: 'Verify rosters', path: '/meetings', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { icon: UserPlus, label: 'Add Visitor', desc: 'Onboard guests', path: '/guests', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { icon: Users, label: 'Manage Roster', desc: 'Moderate members', path: '/members', color: 'text-orange-400', bg: 'bg-orange-500/10' }
  ];

  return (
    <div className="space-y-8 sm:space-y-10">
      
      {/* 1. Core Operations */}
      <motion.div 
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1
            }
          }
        }}
        className="w-full bg-[#111827] rounded-[20px] p-5 md:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.5)] border border-white/5 flex flex-col relative overflow-hidden"
      >
        <div className="flex items-center justify-between mb-5 relative z-10">
          <h3 className="text-[17px] font-bold text-white tracking-tight">Core Operations</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10 w-full">
          {operations.map((op, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.4 }}
              whileHover={{ 
                y: -5, 
                scale: 1.02, 
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                borderColor: "rgba(255, 255, 255, 0.1)"
              }}
            >
              <Link 
                to={op.path} 
                className="bg-[#0B1220]/60 border border-white/5 rounded-[18px] h-[72px] px-4 flex items-center justify-between transition-colors duration-300 group cursor-pointer w-full"
              >
                <div className="flex items-center gap-3">
                  <motion.div 
                    whileHover={{ rotate: [0, 8, -8, 0] }}
                    className={`w-10 h-10 rounded-[12px] ${op.bg} ${op.color} flex items-center justify-center border border-white/5 shadow-sm shrink-0`}
                  >
                    <op.icon size={18} />
                  </motion.div>
                  <div>
                    <h4 className="text-[13px] font-bold text-white">{op.label}</h4>
                    <p className="text-[11px] text-[#9CA3AF] font-medium">{op.desc}</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-[#4B5563] group-hover:text-white group-hover:translate-x-1 transition-all" />
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* 2. Workspace Checklist */}
      <motion.div 
        id="workspace-checklist"
        variants={{
          hidden: { opacity: 0, y: 20 },
          show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
        }}
        initial="hidden"
        animate="show"
        className={cn(
          "w-full bg-gradient-to-b from-[#1B122C] to-[#111827] rounded-[20px] p-5 md:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.5)] border flex flex-col relative overflow-hidden transition-all duration-700 border-white/5"
        )}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[17px] font-bold text-white tracking-tight flex items-center gap-2">
            <motion.div 
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-8 h-8 rounded-[12px] bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/20"
            >
              <CheckSquare size={16} />
            </motion.div>
            Chapter Tasks Checklist
          </h3>
          <span className="text-[11px] font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider border border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.15)]">
            {completedCount} / {displayTasks.length} COMPLETE
          </span>
        </div>

        <div className="flex flex-col gap-3.5 w-full">
          {displayTasks.map((task, index) => (
            <motion.div 
              key={task.key} 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.5, ease: "easeOut" }}
              whileHover={{ y: -2, backgroundColor: "rgba(23, 32, 51, 0.85)", borderColor: "rgba(220, 20, 60, 0.2)", boxShadow: "0 10px 30px rgba(0,0,0,0.4)" }}
              className="bg-[#0B1220]/60 border border-white/5 px-4 sm:px-5 py-4 rounded-[20px] flex items-center justify-between gap-4 transition-all duration-300 group w-full min-h-[84px] py-4"
            >
              {/* Left Column: Icon Indicator & Title */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Non-interactive check/clock indicator */}
                <div className="shrink-0">
                  {task.isDone ? (
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_8px_rgba(52,211,153,0.15)]">
                      <CheckSquare size={12} />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-neutral-500/10 text-neutral-500 flex items-center justify-center border border-neutral-500/20">
                      <Clock size={12} />
                    </div>
                  )}
                </div>
                
                {/* Title */}
                <h4 className={cn(
                  "text-[12px] sm:text-[14px] font-bold tracking-tight leading-snug transition-all duration-300 line-clamp-2 min-w-0 flex-1 break-words pr-2",
                  task.isDone ? "text-gray-500 line-through opacity-70" : "text-white"
                )}>
                  {task.label}
                </h4>
              </div>

              {/* Right Column: CTA Button */}
              <motion.div
                className="shrink-0 flex flex-col gap-1.5"
              >
                {task.customActions ? (
                  task.customActions.map((act: any, i: number) => (
                    <button
                      key={i}
                      onClick={act.onClick}
                      className={cn(
                        "h-7 w-full px-3 flex items-center justify-center text-center text-[10px] sm:text-[11px] font-bold uppercase tracking-wider rounded-[8px] transition-all border",
                        act.className
                      )}
                    >
                      {act.label}
                    </button>
                  ))
                ) : (
                  <Link 
                    to={task.link} 
                    className="h-9 sm:h-10 w-[95px] sm:w-[105px] flex items-center justify-center text-center bg-[#DC143C] hover:bg-[#B22222] text-white font-semibold text-[11px] sm:text-[13px] tracking-wider uppercase rounded-[12px] transition-all duration-250 shadow-[0_8px_24px_rgba(220,20,60,0.35)] hover:shadow-[0_12px_30px_rgba(220,20,60,0.5)] border border-transparent shrink-0"
                  >
                    {task.linkText}
                  </Link>
                )}
              </motion.div>
            </motion.div>
          ))}
        </div>

        <div className="mt-5 pt-4 border-t border-white/5">
          <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest mb-2">
            <span className="text-[#9CA3AF]">Progress Indicator</span>
            <span className="text-white">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 bg-[#1F2937] rounded-full overflow-hidden border border-white/5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-purple-500 to-red-500 rounded-full shadow-[0_0_12px_rgba(168,85,247,0.5)]" 
            />
          </div>
        </div>
      </motion.div>

      {/* 3. Recent Activity */}
      <motion.div 
        variants={{
          hidden: { opacity: 0, y: 20 },
          show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
        }}
        initial="hidden"
        animate="show"
        className="w-full bg-[#111827] rounded-[20px] p-5 md:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.5)] border border-white/5 flex flex-col relative overflow-hidden"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[17px] font-bold text-white tracking-tight">Recent Activity</h3>
          <span className="text-[11px] font-bold text-red-500 hover:text-red-400 uppercase tracking-wider cursor-pointer transition-all hover:tracking-widest">View All</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 relative w-full">
          {finalRecentActivities.length > 0 ? (
             finalRecentActivities.slice(0, 5).map((act, idx) => {
              const IconComponent = act.icon || Target;
              return (
                <motion.div 
                  key={idx} 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.08, duration: 0.4 }}
                  whileHover={{ scale: 1.01, backgroundColor: "rgba(23, 32, 51, 0.8)", borderColor: "rgba(255,255,255,0.12)" }}
                  className="flex flex-col justify-between gap-3 relative z-10 bg-[#0B1220]/40 border border-white/5 p-4 rounded-[18px] min-h-[120px] hover:bg-[#172033] transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className={`w-9 h-9 rounded-[12px] bg-red-500/10 text-red-500 border-red-500/20 flex items-center justify-center shrink-0 border border-white/5`}>
                      <IconComponent size={16} />
                    </div>
                    <span className="text-[10px] font-semibold text-[#6B7280]">
                      {act.time ? format(new Date(act.time), 'MMM dd') : 'Just now'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[12px] font-bold text-white truncate leading-tight">{act.title}</h4>
                    <p className="text-[11px] text-[#9CA3AF] font-medium mt-1 leading-snug line-clamp-2">{act.desc}</p>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="col-span-5 text-center py-8 text-neutral-400 text-[13px] font-semibold uppercase tracking-[0.2em]">
              No recent activity
            </div>
          )}
        </div>
      </motion.div>

      {/* 4. Business Overview */}
      <motion.div 
        variants={{
          hidden: { opacity: 0, y: 20 },
          show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
        }}
        initial="hidden"
        animate="show"
        className="w-full bg-[#111827] rounded-[20px] p-5 md:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.5)] border border-white/5 flex flex-col relative overflow-hidden"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[17px] font-bold text-white tracking-tight">
            Hub Business Overview
          </h3>
          <button className="flex items-center gap-1.5 bg-[#0B1220] border border-white/10 px-3 py-1 rounded-full text-[11px] font-bold text-white shadow-sm hover:bg-[#1F2937] transition-colors">
            This Month <ChevronDown size={12} />
          </button>
        </div>
        
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)] animate-pulse" />
            <span className="text-[11px] font-bold text-[#D1D5DB]">Revenue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6] shadow-[0_0_8px_rgba(139,92,246,0.7)] animate-pulse" />
            <span className="text-[11px] font-bold text-[#D1D5DB]">Referrals</span>
          </div>
        </div>

        <div className="flex-1 w-full relative min-h-[220px] mb-4">
          <svg viewBox="0 0 800 220" className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="purple-area-chapter" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25"/>
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0"/>
              </linearGradient>
            </defs>
            <line x1="0" y1="40" x2="800" y2="40" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="0" y1="100" x2="800" y2="100" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="0" y1="160" x2="800" y2="160" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="3 3" />
            
            <text x="0" y="45" fill="#4B5563" fontSize="9" fontWeight="bold">{topLabel}</text>
            <text x="0" y="105" fill="#4B5563" fontSize="9" fontWeight="bold">{midLabel}</text>
            <text x="0" y="165" fill="#4B5563" fontSize="9" fontWeight="bold">{lowLabel}</text>

            {maxRevenue === 0 && maxReferrals === 0 && (
              <text x="400" y="120" fill="#4B5563" fontSize="14" fontWeight="bold" textAnchor="middle">
                No data available in the current month
              </text>
            )}

            {/* Red line with drawing animation (Revenue) */}
            {maxRevenue > 0 && revenuePoints && (
              <motion.path 
                d={revenuePoints} 
                fill="none" 
                stroke="#E53935" 
                strokeWidth="3.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="drop-shadow-[0_2px_8px_rgba(229,57,53,0.5)]" 
                initial={{ strokeDashoffset: 850, strokeDasharray: 850 }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 1.8, ease: "easeOut", delay: 0.2 }}
              />
            )}
            
            {/* Purple area and line with drawing animation (Referrals) */}
            {maxReferrals > 0 && areaPoints && (
              <motion.path 
                d={areaPoints} 
                fill="url(#purple-area-chapter)" 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.8 }}
              />
            )}
            
            {maxReferrals > 0 && referralsPoints && (
              <motion.path 
                d={referralsPoints} 
                fill="none" 
                stroke="#8B5CF6" 
                strokeWidth="3.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="drop-shadow-[0_2px_8px_rgba(139,92,246,0.5)]" 
                initial={{ strokeDashoffset: 850, strokeDasharray: 850 }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 1.8, ease: "easeOut", delay: 0.4 }}
              />
            )}
            
            {maxReferrals > 0 && (
              <motion.circle 
                cx="760" 
                cy="100" 
                r="5" 
                fill="#8B5CF6" 
                stroke="#111827" 
                strokeWidth="2.5" 
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
            
            {/* Tooltip with fade-in and slide up */}
            {maxRevenue > 0 && (
              <motion.g 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5, duration: 0.5, type: "spring", stiffness: 100 }}
              >
                <rect x="525" y="90" width="70" height="32" rx="8" fill="#0B1220" stroke="rgba(255,255,255,0.15)" strokeWidth="1" filter="drop-shadow(0 4px 12px rgba(0,0,0,0.5))" />
                <text x="560" y="103" fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle">{formatRevenueLabel(latestRevenue)}</text>
                <text x="560" y="115" fill="#9CA3AF" fontSize="8" fontWeight="medium" textAnchor="middle">{format(new Date(), 'dd MMM')}</text>
              </motion.g>
            )}
          </svg>
          <div className="flex justify-between px-6 text-[9px] font-bold text-[#4B5563] mt-1">
            <span>01 {format(new Date(), 'MMM')}</span><span>07 {format(new Date(), 'MMM')}</span><span>14 {format(new Date(), 'MMM')}</span><span>21 {format(new Date(), 'MMM')}</span><span>28 {format(new Date(), 'MMM')}</span><span>31 {format(new Date(), 'MMM')}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/5 text-center md:text-left">
          <div>
            <span className="text-[10px] font-bold text-[#9CA3AF] block mb-0.5">Revenue</span>
            <div className="text-[16px] font-extrabold text-white leading-tight">
              {chapterBusiness >= 100000 ? `₹${(chapterBusiness / 100000).toFixed(2)}L` : `₹${chapterBusiness.toLocaleString('en-IN')}`}
            </div>
            <span className="text-[9px] font-bold text-emerald-400 flex items-center justify-center md:justify-start gap-0.5 mt-0.5"><TrendingUp size={8}/> Dynamic</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#9CA3AF] block mb-0.5">Referrals</span>
            <div className="text-[16px] font-extrabold text-white leading-tight">{chapterReferrals}</div>
            <span className="text-[9px] font-bold text-emerald-400 flex items-center justify-center md:justify-start gap-0.5 mt-0.5"><TrendingUp size={8}/> Dynamic</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#9CA3AF] block mb-0.5">Members</span>
            <div className="text-[16px] font-extrabold text-white leading-tight">{chapterMemberCount}</div>
            <span className="text-[9px] font-bold text-emerald-400 flex items-center justify-center md:justify-start gap-0.5 mt-0.5"><TrendingUp size={8}/> Dynamic</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#9CA3AF] block mb-0.5">Health</span>
            <div className="text-[16px] font-extrabold text-white leading-tight">{chapterHealthScore}%</div>
            <span className="text-[9px] font-bold text-emerald-400 flex items-center justify-center md:justify-start gap-0.5 mt-0.5"><TrendingUp size={8}/> Dynamic</span>
          </div>
        </div>
      </motion.div>

      {/* 5. Upgrade Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="w-full bg-gradient-to-br from-[#1E123B] via-[#0E071A] to-[#111827] rounded-[20px] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-purple-500/10 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex-1 text-center md:text-left space-y-2">
          <h2 className="text-[17px] font-bold text-white flex items-center justify-center md:justify-start gap-1.5">
            Upgrade to Platinum <Crown size={16} className="text-[#FBBF24] animate-pulse" />
          </h2>
          <p className="text-[13px] text-[#9CA3AF] font-medium leading-relaxed max-w-md">
            Unlock advanced enterprise analytics, global network matching, priority support and higher operations thresholds.
          </p>
          <div className="pt-2">
            <motion.button 
              whileHover={{ scale: 1.03, y: -2, boxShadow: "0 0 15px rgba(229,57,53,0.3)" }}
              whileTap={{ scale: 0.97 }}
              className="w-full md:w-auto bg-gradient-to-r from-red-600 to-[#E53935] hover:opacity-90 text-white px-5 py-2.5 rounded-[16px] font-bold text-[12px] flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(229,57,53,0.3)] transition-all"
            >
              Upgrade Now
              <ChevronRight size={14} />
            </motion.button>
          </div>
        </div>
      </motion.div>

    </div>
  );
}

