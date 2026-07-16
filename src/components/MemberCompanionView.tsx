import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Share2, Handshake, UserPlus, Users, Clock, Calendar, 
  Target, Shield, Award, ChevronRight, FileText, BarChart3, TrendingUp, CheckSquare, ChevronDown, Star, ArrowRight, Crown
} from 'lucide-react';
import { Meeting, UserProfile } from '../types';

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
}

export function MemberCompanionView({
  activeFocusTasks,
  handleToggleTask,
  businessGrowthScore,
}: MemberCompanionViewProps) {
  
  // Local state to simulate interactive checkbox toggling if handleToggleTask is just a mock
  const [localTasks, setLocalTasks] = useState([
    { key: 'attendMeeting', label: 'Attend Weekly Meeting', desc: 'Show commitment to your local chapter syncs', isDone: false, link: '/meetings', linkText: 'JOIN', iconColor: 'text-purple-400', bgColor: 'bg-purple-500/10', icon: Calendar },
    { key: 'passReferral', label: 'Pass a Warm Referral', desc: 'Share commercial opportunities', isDone: false, link: '/refer', linkText: 'PASS', iconColor: 'text-orange-400', bgColor: 'bg-orange-500/10', icon: Share2 },
    { key: 'scheduleOneToOne', label: 'Book a 1-to-1 Session', desc: 'Coordinate synergy meetings', isDone: false, link: '/one-to-one', linkText: 'BOOK', iconColor: 'text-blue-400', bgColor: 'bg-blue-500/10', icon: Handshake },
    { key: 'followUpReferral', label: 'Follow Up Referral Slips', desc: 'Track conversion status on active leads', isDone: false, link: '/refer?tab=received', linkText: 'SLIPS', iconColor: 'text-emerald-400', bgColor: 'bg-emerald-500/10', icon: CheckSquare },
    { key: 'inviteGuest', label: 'Invite a Business Peer', desc: 'Expand network strength', isDone: false, link: '/guests', linkText: 'INVITE', iconColor: 'text-pink-400', bgColor: 'bg-pink-500/10', icon: UserPlus }
  ]);

  const handleCheckboxClick = (key: string) => {
    setLocalTasks(prev => prev.map(t => t.key === key ? { ...t, isDone: !t.isDone } : t));
    if (handleToggleTask) {
      handleToggleTask(key);
    }
  };

  const completedCount = localTasks.filter(t => t.isDone).length;
  const progressPercent = Math.round((completedCount / localTasks.length) * 100);

  const operations = [
    { icon: Share2, label: 'Pass Referral', desc: 'Generate leads', path: '/refer', color: 'text-red-500', bg: 'bg-red-500/10' },
    { icon: Calendar, label: 'Book 1-to-1', desc: 'Schedule sync', path: '/one-to-one', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { icon: UserPlus, label: 'Invite Member', desc: 'Grow your network', path: '/guests', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { icon: Users, label: 'Find Members', desc: 'Explore directory', path: '/directory', color: 'text-orange-400', bg: 'bg-orange-500/10' }
  ];

  return (
    <div className="space-y-6">
      
      {/* SECOND ROW SPLIT GRID */}
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
        className="grid grid-cols-1 lg:grid-cols-12 gap-5"
      >
        
        {/* Workspace Checklist */}
        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
          }}
          className="lg:col-span-4 bg-gradient-to-b from-[#1B122C] to-[#111827] rounded-[20px] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.5)] border border-white/5 flex flex-col h-full relative overflow-hidden"
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
              Workspace Checklist
            </h3>
            <span className="text-[11px] font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider border border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.15)]">
              {completedCount} / 5 COMPLETE
            </span>
          </div>

          <div className="space-y-3 flex-1">
            {localTasks.map((task, index) => (
              <motion.div 
                key={task.key} 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.4 }}
                whileHover={{ x: 4, backgroundColor: "rgba(23, 32, 51, 0.8)", borderColor: "rgba(168, 85, 247, 0.2)" }}
                className="bg-[#0B1220]/60 border border-white/5 p-3 rounded-[18px] flex items-center justify-between transition-colors duration-300 group"
              >
                <div className="flex items-center gap-3">
                  <motion.button 
                    onClick={() => handleCheckboxClick(task.key)}
                    whileTap={{ scale: 0.8 }}
                    className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-300 ${
                      task.isDone 
                        ? 'bg-purple-600 border-purple-600 shadow-[0_0_12px_rgba(147,51,234,0.7)]' 
                        : 'border-white/20 hover:border-purple-400/50'
                    }`}
                  >
                    {task.isDone ? (
                      <motion.span 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 15 }}
                        className="w-2 h-2 rounded-full bg-white block animate-pulse" 
                      />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-purple-400/30 transition-colors" />
                    )}
                  </motion.button>
                  <div>
                    <h4 className={`text-[13px] font-bold tracking-tight transition-all duration-300 ${task.isDone ? 'text-gray-500 line-through opacity-70' : 'text-white'}`}>{task.label}</h4>
                    <p className="text-[11px] text-[#9CA3AF] font-medium leading-snug">{task.desc}</p>
                  </div>
                </div>
                <Link to={task.link} className="bg-[#111827] hover:bg-[#1F2937] hover:border-white/25 border border-white/10 font-bold text-[11px] px-3 py-1.5 rounded-[16px] transition-all text-white shrink-0 shadow-md">
                  {task.linkText}
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-white/5">
            <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest mb-2">
              <span className="text-[#9CA3AF]">Daily Progress</span>
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

        {/* Business Overview */}
        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
          }}
          className="lg:col-span-5 bg-[#111827] rounded-[20px] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.5)] border border-white/5 flex flex-col relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[17px] font-bold text-white tracking-tight">Business Overview</h3>
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

          <div className="flex-1 w-full relative min-h-[160px] mb-4">
            <svg viewBox="0 0 400 180" className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="purple-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25"/>
                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <line x1="0" y1="40" x2="400" y2="40" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="90" x2="400" y2="90" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="140" x2="400" y2="140" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="3 3" />
              
              <text x="0" y="45" fill="#4B5563" fontSize="9" fontWeight="bold">60K</text>
              <text x="0" y="95" fill="#4B5563" fontSize="9" fontWeight="bold">40K</text>
              <text x="0" y="145" fill="#4B5563" fontSize="9" fontWeight="bold">20K</text>

              {/* Red line with drawing animation */}
              <motion.path 
                d="M 30 150 L 80 130 L 130 115 L 180 85 L 230 100 L 280 65 L 330 75 L 380 35" 
                fill="none" 
                stroke="#E53935" 
                strokeWidth="3.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="drop-shadow-[0_2px_8px_rgba(229,57,53,0.5)]" 
                initial={{ strokeDashoffset: 450, strokeDasharray: 450 }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 1.8, ease: "easeOut", delay: 0.2 }}
              />
              
              {/* Purple area and line with drawing animation */}
              <motion.path 
                d="M 30 160 L 80 150 L 130 140 L 180 130 L 230 145 L 280 120 L 330 110 L 380 85 L 380 180 L 30 180 Z" 
                fill="url(#purple-area)" 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.8 }}
              />
              
              <motion.path 
                d="M 30 160 L 80 150 L 130 140 L 180 130 L 230 145 L 280 120 L 330 110 L 380 85" 
                fill="none" 
                stroke="#8B5CF6" 
                strokeWidth="3.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="drop-shadow-[0_2px_8px_rgba(139,92,246,0.5)]" 
                initial={{ strokeDashoffset: 450, strokeDasharray: 450 }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 1.8, ease: "easeOut", delay: 0.4 }}
              />
              
              <motion.circle 
                cx="280" 
                cy="120" 
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
                <rect x="250" y="85" width="60" height="22" rx="6" fill="#1F2937" stroke="rgba(255,255,255,0.1)" />
                <text x="280" y="99" fill="#FFFFFF" fontSize="9" fontWeight="bold" textAnchor="middle">₹24.50L</text>
              </motion.g>
              
              {/* Blue line with drawing animation */}
              <motion.path 
                d="M 30 140 L 80 160 L 130 150 L 180 160 L 230 125 L 280 140 L 330 160 L 380 150" 
                fill="none" 
                stroke="#3B82F6" 
                strokeWidth="3" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="drop-shadow-[0_2px_6px_rgba(59,130,246,0.4)]" 
                initial={{ strokeDashoffset: 450, strokeDasharray: 450 }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 1.8, ease: "easeOut", delay: 0.6 }}
              />
            </svg>
            <div className="flex justify-between px-6 text-[9px] font-bold text-[#4B5563] mt-1">
              <span>01 Jul</span><span>07 Jul</span><span>14 Jul</span><span>21 Jul</span><span>28 Jul</span><span>31 Jul</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-4 border-t border-white/5 text-center sm:text-left">
            <div>
              <span className="text-[10px] font-bold text-[#9CA3AF] block mb-0.5">Revenue</span>
              <div className="text-[14px] font-extrabold text-white leading-tight">₹24.50L</div>
              <span className="text-[9px] font-bold text-emerald-400 flex items-center justify-center sm:justify-start gap-0.5 mt-0.5"><TrendingUp size={8}/> 18%</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#9CA3AF] block mb-0.5">Referrals</span>
              <div className="text-[14px] font-extrabold text-white leading-tight">842</div>
              <span className="text-[9px] font-bold text-emerald-400 flex items-center justify-center sm:justify-start gap-0.5 mt-0.5"><TrendingUp size={8}/> 8%</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#9CA3AF] block mb-0.5">Deals</span>
              <div className="text-[14px] font-extrabold text-white leading-tight">128 Clsd</div>
              <span className="text-[9px] font-bold text-emerald-400 flex items-center justify-center sm:justify-start gap-0.5 mt-0.5"><TrendingUp size={8}/> 24%</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#9CA3AF] block mb-0.5">Attend</span>
              <div className="text-[14px] font-extrabold text-white leading-tight">76%</div>
              <span className="text-[9px] font-bold text-emerald-400 flex items-center justify-center sm:justify-start gap-0.5 mt-0.5"><TrendingUp size={8}/> 16%</span>
            </div>
          </div>
        </motion.div>

        {/* Growth Scorecard */}
        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
          }}
          className="lg:col-span-3 bg-[#111827] rounded-[20px] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.5)] border border-white/5 flex flex-col items-center relative overflow-hidden"
        >
           <div className="absolute top-0 left-0 w-full h-[120px] bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
           <div className="flex items-center justify-between w-full mb-5 relative z-10">
             <h3 className="text-[17px] font-bold text-white tracking-tight">Growth Scorecard</h3>
             <button className="flex items-center gap-1 bg-[#0B1220] border border-white/10 px-2.5 py-1 rounded-full text-[10px] font-bold text-white shadow-sm hover:bg-[#1F2937] transition-colors">
               Rising <ChevronDown size={12} />
             </button>
           </div>
           
           <div className="relative w-[140px] h-[140px] flex items-center justify-center z-10">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {/* Outermost Ring */}
                <circle cx="50" cy="50" r="40" stroke="#1F2937" strokeWidth="10" fill="transparent" />
                {/* Segment 1: Red (Circumference ~251.2) with draw animation */}
                <motion.circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  stroke="#E53935" 
                  strokeWidth="10" 
                  fill="transparent" 
                  strokeDasharray="60 251.2" 
                  initial={{ strokeDashoffset: 251.2 }}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                  className="drop-shadow-[0_0_6px_rgba(229,57,53,0.5)]" 
                />
                {/* Segment 2: Purple */}
                <motion.circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  stroke="#8B5CF6" 
                  strokeWidth="10" 
                  fill="transparent" 
                  strokeDasharray="50 251.2" 
                  initial={{ strokeDashoffset: 251.2 }}
                  animate={{ strokeDashoffset: -65 }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.4 }}
                  className="drop-shadow-[0_0_6px_rgba(139,92,246,0.5)]" 
                />
                {/* Segment 3: Blue */}
                <motion.circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  stroke="#3B82F6" 
                  strokeWidth="10" 
                  fill="transparent" 
                  strokeDasharray="45 251.2" 
                  initial={{ strokeDashoffset: 251.2 }}
                  animate={{ strokeDashoffset: -120 }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.6 }}
                  className="drop-shadow-[0_0_6px_rgba(59,130,246,0.5)]" 
                />
                {/* Segment 4: Green */}
                <motion.circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  stroke="#10B981" 
                  strokeWidth="10" 
                  fill="transparent" 
                  strokeDasharray="55 251.2" 
                  initial={{ strokeDashoffset: 251.2 }}
                  animate={{ strokeDashoffset: -170 }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.8 }}
                  className="drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]" 
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.8 }}
                    className="w-12 h-12 rounded-full bg-[#0B1220] border border-white/5 flex flex-col items-center justify-center shadow-inner"
                  >
                    <span className="text-[16px] font-black text-white leading-none">85%</span>
                    <span className="text-[7px] font-bold text-emerald-400 mt-0.5">EXCELLENT</span>
                  </motion.div>
              </div>
           </div>

           <div className="w-full mt-5 space-y-2 relative z-10 text-[12px]">
              <div className="flex items-center justify-between font-bold text-white">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#E53935] shadow-[0_0_6px_rgba(229,57,53,0.8)]"/> Network Strength</div>
                <span>92%</span>
              </div>
              <div className="flex items-center justify-between font-bold text-white">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#8B5CF6] shadow-[0_0_6px_rgba(139,92,246,0.8)]"/> Referrals</div>
                <span>84%</span>
              </div>
              <div className="flex items-center justify-between font-bold text-white">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#3B82F6] shadow-[0_0_6px_rgba(59,130,246,0.8)]"/> Engagement</div>
                <span>78%</span>
              </div>
              <div className="flex items-center justify-between font-bold text-white">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_6px_rgba(16,185,129,0.8)]"/> Meetings</div>
                <span>88%</span>
              </div>
           </div>

           {/* Active Recommendation */}
           <motion.div 
             whileHover={{ scale: 1.03, backgroundColor: "rgba(23, 32, 51, 0.85)" }}
             className="w-full bg-[#0B1220]/80 rounded-[18px] p-3 mt-4 border border-white/5 flex items-center gap-3 transition-colors cursor-pointer relative z-10"
           >
             <motion.div 
               animate={{ scale: [1, 1.15, 1] }}
               transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
               className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0 border border-orange-500/20"
             >
               <Star size={14} className="text-orange-400" />
             </motion.div>
             <div className="flex-1">
               <h4 className="text-[11px] font-bold text-white uppercase tracking-wider">Recommendation</h4>
               <p className="text-[11px] text-[#9CA3AF] font-semibold leading-snug mt-0.5">Schedule 1-to-1 sessions to boost visibility.</p>
             </div>
             <ChevronRight size={14} className="text-[#6B7280]" />
           </motion.div>
         </motion.div>
      </motion.div>

      {/* THIRD ROW: Operations, Activity, Top Members */}
      <motion.div 
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1,
              delayChildren: 0.2
            }
          }
        }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-5"
      >
        
        {/* Core Operations */}
        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
          }}
          className="lg:col-span-4 bg-[#111827] rounded-[20px] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.5)] border border-white/5 flex flex-col h-full relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-5 relative z-10">
            <h3 className="text-[17px] font-bold text-white tracking-tight">Core Operations</h3>
            <span className="text-[11px] font-bold text-red-500 hover:text-red-400 uppercase tracking-wider cursor-pointer transition-all hover:tracking-widest">View All</span>
          </div>
          
          <div className="flex flex-col gap-3 flex-1 relative z-10 w-full">
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

        {/* Recent Activity */}
        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
          }}
          className="lg:col-span-4 bg-[#111827] rounded-[20px] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.5)] border border-white/5 flex flex-col h-full relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[17px] font-bold text-white tracking-tight">Recent Activity</h3>
            <span className="text-[11px] font-bold text-red-500 hover:text-red-400 uppercase tracking-wider cursor-pointer transition-all hover:tracking-widest">View All</span>
          </div>
          <div className="space-y-4 flex-1 relative h-[310px] overflow-y-auto pr-1 custom-scrollbar">
            {/* Timeline progression animation */}
            <motion.div 
              initial={{ height: 0 }}
              animate={{ height: "95%" }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="absolute top-2 bottom-2 left-[15px] w-px bg-white/10 z-0" 
            />
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
                className="flex items-center gap-3 relative z-10 bg-[#0B1220]/40 border border-white/5 p-2 rounded-[18px] h-[70px] shrink-0 hover:bg-[#172033] transition-all cursor-pointer"
              >
                <div className={`w-9 h-9 rounded-[12px] ${act.bg} ${act.color} flex items-center justify-center shrink-0 border border-white/5`}>
                  <act.icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[12px] font-bold text-white truncate leading-tight">{act.title}</h4>
                  <p className="text-[11px] text-[#9CA3AF] font-medium truncate mt-0.5 leading-snug">{act.desc}</p>
                </div>
                <span className="text-[10px] font-semibold text-[#6B7280] shrink-0 pr-1">{act.time}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Top Performing Members */}
        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
          }}
          className="lg:col-span-4 bg-[#111827] rounded-[20px] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.5)] border border-white/5 flex flex-col h-full relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[17px] font-bold text-white tracking-tight">Top Performing Members</h3>
            <span className="text-[11px] font-bold text-red-500 hover:text-red-400 uppercase tracking-wider cursor-pointer transition-all hover:tracking-widest">View All</span>
          </div>
          
          {/* Horizontal Scroll on Mobile, Grid on Desktop */}
          <div className="flex lg:grid lg:grid-cols-3 gap-3 overflow-x-auto pb-2 lg:pb-0 scrollbar-none snap-x snap-mandatory">
            {[
               { pos: 1, name: 'Amit Patil', type: 'Real Estate', score: 128, trend: '+18%' },
               { pos: 2, name: 'Neha Shah', type: 'Finance', score: 94, trend: '+12%' },
               { pos: 3, name: 'Raj Mehta', type: 'IT Services', score: 76, trend: '+8%' }
            ].map((member, idx) => (
              <motion.div 
                key={idx} 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1, duration: 0.5, type: "spring", stiffness: 100 }}
                whileHover={{ 
                  y: -6, 
                  borderColor: "rgba(229, 57, 53, 0.25)",
                  boxShadow: "0 8px 24px rgba(229, 57, 53, 0.08)",
                  scale: 1.02
                }}
                className="flex flex-col items-center bg-[#0B1220]/60 border border-white/5 rounded-[18px] p-3 text-center shrink-0 w-[120px] lg:w-auto snap-center transition-all duration-300 cursor-pointer"
              >
                <div className="relative mb-2">
                  <div className="w-12 h-12 rounded-full border-2 border-white/10 overflow-hidden bg-neutral-800 transition-all group-hover:border-[#E53935]/50">
                    <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=0F172A&color=ffffff`} alt="Member" className="w-full h-full object-cover" />
                  </div>
                  <motion.div 
                    animate={{ y: [0, -2, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: idx * 0.5 }}
                    className={`absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border-2 border-[#111827] text-white shadow-md ${
                     member.pos === 1 ? 'bg-gradient-to-r from-orange-400 to-yellow-500' : 
                     member.pos === 2 ? 'bg-gradient-to-r from-gray-300 to-gray-400' : 
                     'bg-gradient-to-r from-amber-600 to-amber-700'
                    }`}
                  >
                    {member.pos}
                  </motion.div>
                </div>
                <h4 className="text-[11px] font-bold text-white leading-tight truncate w-full">{member.name}</h4>
                <span className="text-[9px] font-bold text-[#9CA3AF] mt-0.5 truncate w-full">{member.type}</span>
                <div className="mt-2 pt-2 border-t border-white/5 w-full text-center">
                  <div className="text-[15px] font-black text-white leading-none">{member.score}</div>
                  <span className="text-[8px] font-bold text-[#6B7280] uppercase tracking-wider block mt-0.5">Referrals</span>
                  <div className="flex justify-center w-full mt-1">
                    <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-0.5 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/10">
                      <TrendingUp size={8}/> {member.trend}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

      </motion.div>

      {/* BOTTOM UPGRADE BANNER */}
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
