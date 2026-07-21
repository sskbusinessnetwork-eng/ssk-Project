import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Share2, Handshake, UserPlus, Users, Clock, Calendar, 
  Target, Shield, Award, ChevronRight, FileText, BarChart3, TrendingUp, CheckSquare, ChevronDown, Star, ArrowRight, Crown,
  Loader2, CheckCircle2
} from 'lucide-react';
import { Meeting, UserProfile } from '../types';
import { cn } from '../lib/utils';
import { calculateSubscriptionDetails } from '../utils/timeUtils';
import { useAuth } from '../hooks/useAuth';
import { databaseService } from '../services/databaseService';
import { notificationService } from '../services/notificationService';
import { supabase } from '../lib/supabaseClient';

interface MemberCompanionViewProps {
  profile: UserProfile | null;
  dynamicContext: any;
  completedFocusCount: number;
  focusProgressPercent: number;
  activeFocusTasks: any;
  handleToggleTask: (taskKey: any) => void;
  nextMeeting: Meeting | null;
  countdown: any;
  finalRecentActivities: any[];
  businessGrowthScore: number;
  currentMonthMetrics: any;
  hasLoggedOneToOne: boolean;
  hasSentThankYouSlip: boolean;
  recommendation: any;
  isHighlightActive?: boolean;
  chapterName?: string;
  todayTasks?: any[];
}

export function MemberCompanionView({
  profile,
  completedFocusCount,
  focusProgressPercent,
  activeFocusTasks,
  handleToggleTask,
  businessGrowthScore,
  isHighlightActive,
  chapterName,
  todayTasks = [],
}: MemberCompanionViewProps) {
  const { refreshProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleRequestRenewal = async () => {
    if (!profile) return;
    setIsSubmitting(true);
    setSuccessMsg('');
    try {
      // 1. Update user profile to request renewal
      await databaseService.update('users', profile.uid, {
        renewalRequested: true,
        renewalRequestedAt: new Date().toISOString()
      });

      // 2. Notify Chapter Admins
      const chapterId = (profile as any).chapterId || (profile as any).chapter_id;
      if (chapterId) {
        const { data: admins, error } = await supabase
          .from('users')
          .select('id')
          .eq('chapter_id', chapterId)
          .eq('role', 'CHAPTER_ADMIN');
        
        if (!error && admins && admins.length > 0) {
          for (const admin of admins) {
            await notificationService.createNotification(
              admin.id,
              'CHAPTER_ADMIN',
              'SUBSCRIPTION',
              `${profile.name} has requested renewal of his membership.`,
              profile.uid
            );
          }
        }
      }

      // 3. Confirm for user
      await notificationService.createNotification(
        profile.uid,
        profile.role,
        'SUBSCRIPTION',
        'Your membership renewal request has been submitted.',
        profile.uid
      );

      await refreshProfile();
      setSuccessMsg('Your renewal request has been submitted successfully.');
    } catch (err) {
      console.error('Error submitting renewal:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const displayTasks = todayTasks;
  const completedCount = displayTasks.filter(t => t.isDone).length;
  const progressPercent = displayTasks.length > 0 ? Math.round((completedCount / displayTasks.length) * 100) : 100;

  const operations = [
    { icon: Share2, label: 'Pass Referral', desc: 'Generate leads', path: '/refer', color: 'text-red-500', bg: 'bg-red-500/10' },
    { icon: Calendar, label: 'Book 1-to-1', desc: 'Schedule sync', path: '/one-to-one', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { icon: UserPlus, label: 'Invite Member', desc: 'Grow your network', path: '/guests', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { icon: Users, label: 'Find Members', desc: 'Explore directory', path: '/directory', color: 'text-orange-400', bg: 'bg-orange-500/10' }
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
          "w-full bg-gradient-to-b from-[#1B122C] to-[#111827] rounded-[20px] p-5 md:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.5)] border flex flex-col relative overflow-hidden transition-all duration-700",
          isHighlightActive 
            ? "border-purple-500/50 shadow-[0_0_35px_rgba(168,85,247,0.55)] scale-[1.01] bg-gradient-to-b from-[#2B1C4C] to-[#111827]" 
            : "border-white/5"
        )}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[17px] font-bold text-white tracking-tight flex items-center gap-2">
            <motion.div 
              animate={isHighlightActive ? { rotate: [0, 15, -15, 10, -10, 0] } : { rotate: [0, 5, -5, 0] }}
              transition={isHighlightActive ? { duration: 0.8 } : { duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-8 h-8 rounded-[12px] bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/20"
            >
              <CheckSquare size={16} />
            </motion.div>
            Workspace Checklist
          </h3>
          <span className="text-[11px] font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider border border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.15)]">
            {completedCount} / {displayTasks.length} COMPLETE
          </span>
        </div>

        <div className="flex flex-col gap-3.5 w-full">
          {displayTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-[#0B1220]/40 border border-white/5 rounded-[20px] px-4">
              <CheckSquare size={28} className="text-emerald-500 mb-2 opacity-60" />
              <p className="text-white text-[13px] font-bold">All Caught Up!</p>
              <p className="text-[#9CA3AF] text-[11px] mt-1 leading-snug">No scheduled workspace tasks or meetings for today.</p>
            </div>
          ) : (
            displayTasks.map((task, index) => (
              <motion.div 
                key={task.key} 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.5, ease: "easeOut" }}
                whileHover={{ y: -2, backgroundColor: "rgba(23, 32, 51, 0.85)", borderColor: "rgba(220, 20, 60, 0.2)", boxShadow: "0 10px 30px rgba(0,0,0,0.4)" }}
                className="bg-[#0B1220]/60 border border-white/5 px-4 sm:px-5 py-4 rounded-[20px] flex items-center justify-between gap-4 transition-all duration-300 group w-full h-[84px] min-h-[84px] overflow-hidden"
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
                  
                  {/* Title (max 2 lines, ellipsis) */}
                  <h4 className={cn(
                    "text-[12px] sm:text-[14px] font-bold tracking-tight leading-snug transition-all duration-300 line-clamp-2 min-w-0 flex-1 break-words pr-2",
                    task.isDone ? "text-gray-500 line-through opacity-70" : "text-white"
                  )}>
                    {task.label}
                  </h4>
                </div>

                {/* Right Column: CTA Button */}
                <motion.div
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  className="shrink-0 w-[95px] sm:w-[105px]"
                >
                  <Link 
                    to={task.link} 
                    className="h-9 sm:h-10 w-full flex items-center justify-center text-center bg-[#DC143C] hover:bg-[#B22222] text-white font-semibold text-[11px] sm:text-[13px] tracking-wider uppercase rounded-[12px] transition-all duration-250 shadow-[0_8px_24px_rgba(220,20,60,0.35)] hover:shadow-[0_12px_30px_rgba(220,20,60,0.5)] border border-transparent shrink-0"
                  >
                    {task.linkText}
                  </Link>
                </motion.div>
              </motion.div>
            ))
          )}
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
          {[
             { icon: Target, title: 'New Partner Joined', desc: 'Sudarshan Vagale registered as Real Estate', time: '05:30 AM', color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20' },
             { icon: Share2, title: 'Referral Passed', desc: 'Commercial lead forwarded to partner', time: 'Yesterday', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
             { icon: Calendar, title: 'Meeting Completed', desc: '1-to-1 with Real Estate Chapter', time: '12 Jul', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
             { icon: UserPlus, title: 'New Member Added', desc: 'Amit Patil joined the network', time: '10 Jul', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
             { icon: FileText, title: 'Business Planning Session', desc: 'Virtual meeting scheduled', time: '08 Jul', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
          ].map((act, idx) => (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08, duration: 0.4 }}
              whileHover={{ scale: 1.01, backgroundColor: "rgba(23, 32, 51, 0.8)", borderColor: "rgba(255,255,255,0.12)" }}
              className="flex flex-col justify-between gap-3 relative z-10 bg-[#0B1220]/40 border border-white/5 p-4 rounded-[18px] min-h-[120px] hover:bg-[#172033] transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className={`w-9 h-9 rounded-[12px] ${act.bg} ${act.color} flex items-center justify-center shrink-0 border border-white/5`}>
                  <act.icon size={16} />
                </div>
                <span className="text-[10px] font-semibold text-[#6B7280]">{act.time}</span>
              </div>
              <div className="min-w-0">
                <h4 className="text-[12px] font-bold text-white truncate leading-tight">{act.title}</h4>
                <p className="text-[11px] text-[#9CA3AF] font-medium mt-1 leading-snug line-clamp-2">{act.desc}</p>
              </div>
            </motion.div>
          ))}
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
            {chapterName ? `${chapterName} Business Overview` : 'Business Overview'}
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
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)] animate-pulse" />
            <span className="text-[11px] font-bold text-[#D1D5DB]">Referrals</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.7)] animate-pulse" />
            <span className="text-[11px] font-bold text-[#D1D5DB]">Deals</span>
          </div>
        </div>

        <div className="flex-1 w-full relative min-h-[220px] mb-4">
          <svg viewBox="0 0 800 220" className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="purple-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25"/>
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0"/>
              </linearGradient>
            </defs>
            <line x1="0" y1="40" x2="800" y2="40" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="0" y1="100" x2="800" y2="100" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="0" y1="160" x2="800" y2="160" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="3 3" />
            
            <text x="0" y="45" fill="#4B5563" fontSize="9" fontWeight="bold">60K</text>
            <text x="0" y="105" fill="#4B5563" fontSize="9" fontWeight="bold">40K</text>
            <text x="0" y="165" fill="#4B5563" fontSize="9" fontWeight="bold">20K</text>

            {/* Red line with drawing animation */}
            <motion.path 
              d="M 60 180 L 160 160 L 260 140 L 360 100 L 460 120 L 560 80 L 660 90 L 760 40" 
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
            
            {/* Purple area and line with drawing animation */}
            <motion.path 
              d="M 60 200 L 160 180 L 260 170 L 360 150 L 460 170 L 560 140 L 660 130 L 760 100 L 760 220 L 60 220 Z" 
              fill="url(#purple-area)" 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.8 }}
            />
            
            <motion.path 
              d="M 60 200 L 160 180 L 260 170 L 360 150 L 460 170 L 560 140 L 660 130 L 760 100" 
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
            
            <motion.circle 
              cx="560" 
              cy="140" 
              r="5" 
              fill="#8B5CF6" 
              stroke="#111827" 
              strokeWidth="2.5" 
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            
            {/* Tooltip with fade-in and slide up */}
            <motion.g 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 0.5, type: "spring", stiffness: 100 }}
            >
              <rect x="525" y="90" width="70" height="32" rx="8" fill="#0B1220" stroke="rgba(255,255,255,0.15)" strokeWidth="1" filter="drop-shadow(0 4px 12px rgba(0,0,0,0.5))" />
              <text x="560" y="103" fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle">₹24.50L</text>
              <text x="560" y="115" fill="#9CA3AF" fontSize="8" fontWeight="medium" textAnchor="middle">15 Jul</text>
            </motion.g>
            
            {/* Blue line with drawing animation */}
            <motion.path 
              d="M 60 170 L 160 190 L 260 180 L 360 190 L 460 150 L 560 170 L 660 190 L 760 180" 
              fill="none" 
              stroke="#3B82F6" 
              strokeWidth="3" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="drop-shadow-[0_2px_6px_rgba(59,130,246,0.4)]" 
              initial={{ strokeDashoffset: 850, strokeDasharray: 850 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 1.8, ease: "easeOut", delay: 0.6 }}
            />
          </svg>
          <div className="flex justify-between px-6 text-[9px] font-bold text-[#4B5563] mt-1">
            <span>01 Jul</span><span>07 Jul</span><span>14 Jul</span><span>21 Jul</span><span>28 Jul</span><span>31 Jul</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/5 text-center md:text-left">
          <div>
            <span className="text-[10px] font-bold text-[#9CA3AF] block mb-0.5">Revenue</span>
            <div className="text-[16px] font-extrabold text-white leading-tight">₹24.50L</div>
            <span className="text-[9px] font-bold text-emerald-400 flex items-center justify-center md:justify-start gap-0.5 mt-0.5"><TrendingUp size={8}/> 18%</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#9CA3AF] block mb-0.5">Referrals</span>
            <div className="text-[16px] font-extrabold text-white leading-tight">842</div>
            <span className="text-[9px] font-bold text-emerald-400 flex items-center justify-center md:justify-start gap-0.5 mt-0.5"><TrendingUp size={8}/> 8%</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#9CA3AF] block mb-0.5">Deals</span>
            <div className="text-[16px] font-extrabold text-white leading-tight">128 Clsd</div>
            <span className="text-[9px] font-bold text-emerald-400 flex items-center justify-center md:justify-start gap-0.5 mt-0.5"><TrendingUp size={8}/> 24%</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#9CA3AF] block mb-0.5">Attend</span>
            <div className="text-[16px] font-extrabold text-white leading-tight">76%</div>
            <span className="text-[9px] font-bold text-emerald-400 flex items-center justify-center md:justify-start gap-0.5 mt-0.5"><TrendingUp size={8}/> 16%</span>
          </div>
        </div>
      </motion.div>

      {/* 5. Membership Subscription Status Card */}
      {(() => {
        const rawEndDate = profile?.subscriptionEndDate || profile?.subscriptionEnd;
        const resolvedEndDate = rawEndDate || (profile?.createdAt ? new Date(new Date(profile.createdAt).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString() : new Date(new Date().getTime() + 300 * 24 * 60 * 60 * 1000).toISOString());
        const { daysRemaining, monthsRemaining } = calculateSubscriptionDetails(resolvedEndDate);
        
        const isEligibleForRenewal = daysRemaining <= 30;
        const isAlreadyRequested = profile?.renewalRequested || false;

        const formatRenewBefore = (dateStr: string) => {
          try {
            const date = new Date(dateStr);
            const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
          } catch (e) {
            return dateStr;
          }
        };

        return (
          <motion.div 
            id="subscription-card"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="w-full bg-gradient-to-br from-[#1E123B] via-[#0E071A] to-[#111827] rounded-[20px] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-purple-500/10 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 flex-1 text-center md:text-left space-y-3">
              <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-2">
                <h2 className="text-[17px] font-bold text-white flex items-center gap-1.5">
                  Membership Subscription Status <Crown size={16} className="text-[#FBBF24] animate-pulse" />
                </h2>
                <span className={cn(
                  "text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full border shrink-0",
                  isAlreadyRequested 
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/10" 
                    : daysRemaining < 0 
                      ? "bg-red-500/20 text-red-400 border-red-500/10"
                      : "bg-emerald-500/20 text-emerald-400 border-emerald-500/10"
                )}>
                  {isAlreadyRequested ? "Pending Approval" : daysRemaining < 0 ? "Expired" : "Active"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg pt-1">
                <div className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-left">
                  <span className="text-[10px] font-bold text-[#9CA3AF] block uppercase tracking-wider mb-0.5">Expires In:</span>
                  <div className="text-[16px] font-extrabold text-white">
                    {daysRemaining < 0 ? "0 Days" : `${daysRemaining} Days`}
                    <span className="text-xs font-medium text-[#9CA3AF] ml-1.5">({monthsRemaining} Months)</span>
                  </div>
                </div>
                
                <div className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-left">
                  <span className="text-[10px] font-bold text-[#9CA3AF] block uppercase tracking-wider mb-0.5">Renew Before:</span>
                  <div className="text-[15px] font-extrabold text-white">
                    {formatRenewBefore(resolvedEndDate)}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 flex flex-col items-center md:items-end shrink-0 w-full md:w-auto pt-2 md:pt-0">
              {successMsg ? (
                <div className="text-emerald-400 text-xs font-bold flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/25 px-4 py-2.5 rounded-xl">
                  <CheckCircle2 size={16} />
                  Renewal Request Sent!
                </div>
              ) : isAlreadyRequested ? (
                <div className="text-amber-400 text-xs font-bold flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/25 px-4 py-2.5 rounded-xl">
                  <Loader2 size={16} className="animate-spin" />
                  Approval Pending
                </div>
              ) : (
                <div className="flex flex-col items-center md:items-end gap-1.5 w-full">
                  <motion.button 
                    onClick={isEligibleForRenewal ? handleRequestRenewal : undefined}
                    disabled={!isEligibleForRenewal || isSubmitting}
                    whileHover={isEligibleForRenewal ? { scale: 1.03, y: -2, boxShadow: "0 0 15px rgba(229,57,53,0.3)" } : {}}
                    whileTap={isEligibleForRenewal ? { scale: 0.97 } : {}}
                    className={cn(
                      "w-full md:w-auto text-white px-5 py-2.5 rounded-[16px] font-bold text-[12px] flex items-center justify-center gap-1.5 shadow-lg transition-all",
                      isEligibleForRenewal 
                        ? "bg-gradient-to-r from-red-600 to-[#E53935] hover:opacity-90 shadow-red-900/30 cursor-pointer" 
                        : "bg-[#1F2937]/50 text-[#6B7280] border border-white/5 cursor-not-allowed shadow-none"
                    )}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Upgrade / Renew Membership
                        <ChevronRight size={14} />
                      </>
                    )}
                  </motion.button>
                  {!isEligibleForRenewal && (
                    <span className="text-[10px] text-[#6B7280] font-medium text-center md:text-right">
                      Enabled only within 30 days of expiry.
                    </span>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        );
      })()}

    </div>
  );
}
