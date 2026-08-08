import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Users, Shield, Calendar, Activity,
  Clock, Target, ChevronRight, TrendingUp, CheckSquare, ChevronDown, ArrowRight, Crown, Tags, CreditCard, Settings
} from 'lucide-react';
import { UserProfile } from '../types';
import { isValid } from 'date-fns';
import { safeFormat as format } from '../utils/dateUtils';

import { cn } from '../lib/utils';

interface MasterAdminCompanionViewProps {
  profile: UserProfile | null;
  networkHealthScore: number;
  membersAnalysed?: number;
  daysAnalysedText?: string;
  scoreText?: string;
  globalMemberCount: number;
  globalChapterCount: number;
  globalBusinessGenerated: number;
  globalReferralsCount: number;
  finalRecentActivities: any[];
  setActiveTab: (tab: 'companion' | 'reports') => void;
  topPerformingChapters?: { name: string; business: number }[];
  allSlips?: any[];
  allReferrals?: any[];
  subscriptionStats?: {
    active: number;
    expired: number;
    renewalsDue: number;
    renewed: number;
  };
  leadershipStats?: {
    chapterAdmins: number;
    presidents: number;
    vicePresidents: number;
    treasurers: number;
  };
  tasks?: any[];
}

export function MasterAdminCompanionView({
  profile,
  networkHealthScore,
  membersAnalysed,
  daysAnalysedText,
  scoreText,
  globalMemberCount,
  globalChapterCount,
  globalBusinessGenerated,
  globalReferralsCount,
  finalRecentActivities,
  setActiveTab,
  topPerformingChapters = [],
  allSlips = [],
  allReferrals = [],
  subscriptionStats = { active: 0, expired: 0, renewalsDue: 0, renewed: 0 },
  leadershipStats = { chapterAdmins: 0, presidents: 0, vicePresidents: 0, treasurers: 0 },
  tasks = [],
}: MasterAdminCompanionViewProps) {
  
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
    const monthlySlips = (allSlips || []).filter(s => {
      const d = new Date(s.createdAt || s.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    // Filter to current month referrals
    const monthlyRefs = (allReferrals || []).filter(r => {
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
  }, [allSlips, allReferrals]);

  const topLabel = maxRevenue > 0 ? formatRevenueLabel(maxRevenue) : '0';
  const midLabel = maxRevenue > 0 ? formatRevenueLabel(maxRevenue * 2 / 3) : '0';
  const lowLabel = maxRevenue > 0 ? formatRevenueLabel(maxRevenue * 1 / 3) : '0';

  const operations = [
    { icon: Crown, label: 'Manage Chapters', desc: 'Chapter setup & governance', path: '/manage-chapter', color: 'text-red-500', bg: 'bg-red-500/10' },
    { icon: Users, label: 'Manage Members', desc: 'Global member directory', path: '/members', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { icon: Tags, label: 'Manage Categories', desc: 'Business classifications', path: '/categories', color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { icon: CreditCard, label: 'Manage Subscriptions', desc: 'Plans & member renewals', path: '/subscriptions', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { icon: TrendingUp, label: 'Organization Analytics', desc: 'Network-wide statistics', path: '/admin/analytics', color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { icon: Activity, label: 'Reports', desc: 'Performance reports', path: '/reports', color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { icon: Settings, label: 'System Settings', desc: 'System configuration', path: '/settings', color: 'text-cyan-400', bg: 'bg-cyan-500/10' }
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

      {/* 2. Recent Activity */}
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
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[12px] bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20">
              <Activity size={16} />
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-white tracking-tight">Recent Activity</h3>
              <p className="text-[11px] text-[#9CA3AF] font-medium">Organization-wide real-time event logs</p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider border border-emerald-500/20">
            Live Database
          </span>
        </div>

        <div className="overflow-x-auto rounded-[16px] border border-white/5 bg-[#0B1220]/60 custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="border-b border-white/10 bg-[#0B1220]">
                <th className="p-3.5 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Activity</th>
                <th className="p-3.5 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Member Name</th>
                <th className="p-3.5 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Chapter Name</th>
                <th className="p-3.5 text-xs font-black text-[#9CA3AF] uppercase tracking-wider">Date & Time</th>
                <th className="p-3.5 text-xs font-black text-[#9CA3AF] uppercase tracking-wider text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {finalRecentActivities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-sm font-bold text-[#6B7280] uppercase tracking-wide">
                    No recent organization activity recorded
                  </td>
                </tr>
              ) : (
                finalRecentActivities.slice(0, 15).map((act, idx) => {
                  const actName = act.activity || act.title || 'Activity Logged';
                  const memName = act.memberName || act.fromUserName || 'N/A';
                  const chapName = act.chapterName || 'Organization';
                  const rawTime = act.dateTime || act.time;
                  const formattedDateTime = rawTime ? format(new Date(rawTime), 'MMM dd, yyyy HH:mm') : 'Just now';
                  const statusVal = (act.status || 'COMPLETED').toUpperCase();

                  const getBadgeColor = (status: string) => {
                    if (['APPROVED', 'ACTIVE', 'CLOSED', 'COMPLETED', 'RENEWED'].includes(status)) {
                      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                    }
                    if (['SCHEDULED', 'PASSED', 'PROCESSED', 'UPDATED'].includes(status)) {
                      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                    }
                    if (['PENDING', 'REQUESTED'].includes(status)) {
                      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                    }
                    if (['INACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED'].includes(status)) {
                      return 'bg-red-500/10 text-red-400 border-red-500/20';
                    }
                    return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
                  };

                  return (
                    <tr key={act.id || idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5">
                        <div className="text-[13px] font-bold text-white">{actName}</div>
                        {act.desc && <div className="text-[11px] text-[#9CA3AF] font-medium max-w-sm truncate">{act.desc}</div>}
                      </td>
                      <td className="p-3.5 text-[13px] font-semibold text-white/90">
                        {memName}
                      </td>
                      <td className="p-3.5 text-[13px] font-medium text-[#9CA3AF]">
                        {chapName}
                      </td>
                      <td className="p-3.5 text-[12px] font-medium text-[#9CA3AF]">
                        {formattedDateTime}
                      </td>
                      <td className="p-3.5 text-right">
                        <span className={cn(
                          "inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border",
                          getBadgeColor(statusVal)
                        )}>
                          {statusVal}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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
            Global Business Overview
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
              <linearGradient id="purple-area-master" x1="0" y1="0" x2="0" y2="1">
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
                fill="url(#purple-area-master)" 
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
              {globalBusinessGenerated >= 100000 ? `₹${(globalBusinessGenerated / 100000).toFixed(2)}L` : `₹${globalBusinessGenerated.toLocaleString('en-IN')}`}
            </div>
            <span className="text-[9px] font-bold text-emerald-400 flex items-center justify-center md:justify-start gap-0.5 mt-0.5"><TrendingUp size={8}/> Dynamic</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#9CA3AF] block mb-0.5">Referrals</span>
            <div className="text-[16px] font-extrabold text-white leading-tight">{globalReferralsCount}</div>
            <span className="text-[9px] font-bold text-emerald-400 flex items-center justify-center md:justify-start gap-0.5 mt-0.5"><TrendingUp size={8}/> Dynamic</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#9CA3AF] block mb-0.5">Chapters</span>
            <div className="text-[16px] font-extrabold text-white leading-tight">{globalChapterCount}</div>
            <span className="text-[9px] font-bold text-emerald-400 flex items-center justify-center md:justify-start gap-0.5 mt-0.5"><TrendingUp size={8}/> Dynamic</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#9CA3AF] block mb-0.5">Health</span>
            <div className="text-[16px] font-extrabold text-white leading-tight">{networkHealthScore}%</div>
            <span className="text-[9px] font-bold text-emerald-400 flex items-center justify-center md:justify-start gap-0.5 mt-0.5"><TrendingUp size={8}/> Dynamic</span>
          </div>
        </div>
      </motion.div>

      {/* Subscription & Leadership Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6 w-full">
        {/* Subscription Statistics Panel */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
          }}
          initial="hidden"
          animate="show"
          className="w-full bg-[#111827] rounded-[20px] p-5 md:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.5)] border border-white/5 flex flex-col relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[17px] font-bold text-white tracking-tight flex items-center gap-2">
              <div className="w-8 h-8 rounded-[12px] bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <Shield size={16} />
              </div>
              Subscription Statistics
            </h3>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider border border-emerald-500/20">
              Live Database
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#0B1220]/60 border border-white/5 p-4 rounded-[18px] flex flex-col justify-between h-[105px]">
              <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider">Active Subscriptions</span>
              <div className="flex items-baseline gap-2">
                <span className="text-[28px] font-black text-white">{subscriptionStats.active}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
              </div>
              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest mt-1">Status: Active</span>
            </div>

            <div className="bg-[#0B1220]/60 border border-white/5 p-4 rounded-[18px] flex flex-col justify-between h-[105px]">
              <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider">Expired Subscriptions</span>
              <div className="flex items-baseline gap-2">
                <span className="text-[28px] font-black text-white">{subscriptionStats.expired}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
              </div>
              <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest mt-1">Needs Renewal</span>
            </div>

            <div className="bg-[#0B1220]/60 border border-white/5 p-4 rounded-[18px] flex flex-col justify-between h-[105px]">
              <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider">Renewals Due (30d)</span>
              <span className="text-[28px] font-black text-white">{subscriptionStats.renewalsDue}</span>
              <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest mt-1">Critical Window</span>
            </div>

            <div className="bg-[#0B1220]/60 border border-white/5 p-4 rounded-[18px] flex flex-col justify-between h-[105px]">
              <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider">Renewed Members</span>
              <span className="text-[28px] font-black text-white">{subscriptionStats.renewed}</span>
              <span className="text-[9px] font-bold text-violet-400 uppercase tracking-widest mt-1">Processed</span>
            </div>
          </div>
        </motion.div>

        {/* Leadership Statistics Panel */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
          }}
          initial="hidden"
          animate="show"
          className="w-full bg-[#111827] rounded-[20px] p-5 md:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.5)] border border-white/5 flex flex-col relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[17px] font-bold text-white tracking-tight flex items-center gap-2">
              <div className="w-8 h-8 rounded-[12px] bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/20">
                <Crown size={16} />
              </div>
              Leadership Statistics
            </h3>
            <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider border border-purple-500/20">
              Live Database
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#0B1220]/60 border border-white/5 p-4 rounded-[18px] flex flex-col justify-between h-[105px]">
              <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider">Chapter Admins</span>
              <span className="text-[28px] font-black text-white">{leadershipStats.chapterAdmins}</span>
              <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mt-1">Administrators</span>
            </div>

            <div className="bg-[#0B1220]/60 border border-white/5 p-4 rounded-[18px] flex flex-col justify-between h-[105px]">
              <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider">Presidents</span>
              <span className="text-[28px] font-black text-white">{leadershipStats.presidents}</span>
              <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest mt-1">Leaders</span>
            </div>

            <div className="bg-[#0B1220]/60 border border-white/5 p-4 rounded-[18px] flex flex-col justify-between h-[105px]">
              <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider">Vice Presidents</span>
              <span className="text-[28px] font-black text-white">{leadershipStats.vicePresidents}</span>
              <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mt-1">Support Leadership</span>
            </div>

            <div className="bg-[#0B1220]/60 border border-white/5 p-4 rounded-[18px] flex flex-col justify-between h-[105px]">
              <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider">Treasurers</span>
              <span className="text-[28px] font-black text-white">{leadershipStats.treasurers}</span>
              <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest mt-1">Financial Officers</span>
            </div>
          </div>
        </motion.div>
      </div>

    </div>
  );
}