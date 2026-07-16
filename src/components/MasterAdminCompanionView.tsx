import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Users, Shield, Calendar, Activity, Sparkles, CircleCheck as CheckCircle2, Clock, Handshake, UserPlus, ArrowRight, Trophy, Target, Globe } from 'lucide-react';
import { UserProfile } from '../types';
import { format } from 'date-fns';

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

interface MasterAdminCompanionViewProps {
  profile: UserProfile | null;
  networkHealthScore: number;
  globalMemberCount: number;
  globalChapterCount: number;
  globalBusinessGenerated: number;
  globalReferralsCount: number;
  finalRecentActivities: any[];
  setActiveTab: (tab: 'companion' | 'reports') => void;
}

export function MasterAdminCompanionView({
  profile,
  networkHealthScore,
  globalMemberCount,
  globalChapterCount,
  globalBusinessGenerated,
  globalReferralsCount,
  finalRecentActivities,
  setActiveTab,
}: MasterAdminCompanionViewProps) {
  
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-10 font-sans"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Strategic Focus, Quick Controls, Recent Activity */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* TODAY'S FOCUS CARD */}
          <motion.div 
            id="master-todays-focus" 
            variants={itemVariants}
            className="bg-white rounded-[24px] p-5 sm:p-8 border border-neutral-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] relative overflow-hidden group transition-all duration-300"
          >
            <div className="absolute top-0 left-0 w-2 h-full bg-primary" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-[16px] border border-neutral-100 bg-[#F7F8FA] text-[#111827] flex items-center justify-center shrink-0 shadow-sm">
                  <Globe size={24} strokeWidth={2} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.2em] text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">
                      Global Control
                    </span>
                    <span className="text-[12px] font-semibold uppercase tracking-[0.2em] text-primary">
                      Command Center
                    </span>
                  </div>
                  <h3 className="text-[24px] sm:text-[28px] font-semibold text-[#111827] tracking-tight mt-2 leading-tight">Executive Focus</h3>
                  <p className="text-[15px] text-neutral-500 mt-1 leading-relaxed font-medium">
                    Priority: <span className="font-semibold text-[#111827]">Verify regional chapter compliance and audit financial streams.</span>
                  </p>
                </div>
              </div>
              
              <div className="shrink-0 hidden sm:block">
                <span className="text-[12px] bg-primary/10 text-primary px-3 py-1.5 rounded-lg font-semibold uppercase tracking-[0.2em] shadow-sm border border-primary/20">
                  100% OPERATIONAL
                </span>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-10 relative z-10 pt-4">
              <div className="relative shrink-0 flex items-center justify-center w-[140px] h-[140px] bg-white rounded-full shadow-[0_2px_8px_rgba(11,11,13,0.03),0_8px_24px_-4px_rgba(11,11,13,0.04)] border border-neutral-100">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="70" cy="70" r="60" stroke="#F7F8FA" strokeWidth="8" fill="transparent" />
                  <circle
                    cx="70" cy="70" r="60" stroke="#DC2626" strokeWidth="8" fill="transparent"
                    strokeDasharray={377}
                    strokeDashoffset={0}
                    className="transition-all duration-1000 ease-out"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-[32px] font-semibold text-[#111827] leading-none tracking-tight">100%</span>
                  <span className="text-[10px] text-neutral-400 font-semibold uppercase mt-1 tracking-[0.2em]">Active</span>
                </div>
              </div>

              <div className="flex-1 w-full space-y-3">
                {[
                  { isDone: true, label: "Audit & Authorize Chapter Admin Credentials", desc: "Review and approve regional chapter presidents to unlock local executive consoles.", link: "/admins", linkText: "Admins" },
                  { isDone: true, label: "Monitor Global Directory and Listings Database", desc: "Scan across all chapters to approve pending membership applications.", link: "/members", linkText: "Members" },
                  { isDone: false, label: "Review Cross-Region Referral Metrics", desc: "Ensure multi-chapter business transactions are being correctly reported.", link: "/reports", linkText: "Reports" },
                ].map((item, idx) => (
                  <motion.div 
                    key={idx}
                    whileHover={{ x: 4 }}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-[16px] border transition-all duration-300",
                      item.isDone 
                        ? "bg-[#F7F8FA] border-transparent opacity-70" 
                        : "bg-white border-neutral-200 hover:border-primary/20 hover:shadow-[0_2px_8px_rgba(11,11,13,0.03),0_8px_24px_-4px_rgba(11,11,13,0.04)] cursor-pointer"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-md border flex items-center justify-center shrink-0 transition-all duration-300",
                      item.isDone 
                        ? "bg-primary border-primary text-white" 
                        : "border-neutral-300 bg-white hover:border-primary"
                    )}>
                      {item.isDone && <CheckCircle2 size={16} strokeWidth={3} />}
                    </div>
                    <div className="flex-1 min-w-0 flex items-center justify-between">
                      <div>
                        <span className={cn(
                          "text-[16px] font-semibold transition-colors duration-300 tracking-tight block",
                          item.isDone ? "text-neutral-500 line-through" : "text-[#111827]"
                        )}>
                          {item.label}
                        </span>
                        <span className="text-[14px] text-neutral-500 font-medium block mt-0.5 hidden sm:block">
                          {item.desc}
                        </span>
                      </div>
                      {!item.isDone && (
                        <Link 
                          to={item.link} 
                          className="text-[13px] font-semibold text-primary uppercase tracking-[0.15em] bg-primary/5 hover:bg-primary hover:text-white px-3 py-1.5 rounded-lg shrink-0 flex items-center gap-1.5 transition-colors border border-primary/10 ml-4"
                        >
                          {item.linkText} <ArrowRight size={12} />
                        </Link>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* NEXT BEST ACTION CARD */}
          <motion.div 
            id="master-next-opportunity" 
            variants={itemVariants}
            className="bg-white rounded-[24px] p-5 sm:p-8 border border-neutral-200/80 shadow-[0_2px_8px_rgba(11,11,13,0.03),0_8px_24px_-4px_rgba(11,11,13,0.04)] relative overflow-hidden group transition-all duration-300 hover:border-primary/30"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none transition-transform duration-700 group-hover:scale-110" />
            
            <div className="flex flex-col md:flex-row gap-6 items-center justify-between relative z-10">
              <div className="w-16 h-16 rounded-[16px] border border-neutral-200 bg-[#F7F8FA] text-primary flex items-center justify-center shrink-0 shadow-sm">
                <Shield size={24} strokeWidth={2} className="animate-pulse" />
              </div>
              
              <div className="space-y-2 flex-1 min-w-0 text-center md:text-left">
                <span className="text-[12px] bg-primary/5 text-primary px-3 py-1.5 rounded-lg font-semibold uppercase tracking-[0.2em] inline-block border border-primary/10">
                  System Telemetry
                </span>
                <h4 className="text-[20px] font-semibold text-[#111827] tracking-tight mt-1">
                  Verify Chapter Onboarding Registrations
                </h4>
                <p className="text-[15px] text-neutral-500 leading-relaxed font-medium">
                  There are newly registered members awaiting official assignment to their local chapters. Review pending membership requests and finalize category authorizations.
                </p>
              </div>
              
              <Link 
                to="/members" 
                className="bg-[#0B0B0D] text-white px-6 py-4 rounded-[14px] text-[14px] font-semibold uppercase tracking-[0.15em] hover:bg-primary transition-all duration-300 shadow-sm whitespace-nowrap shrink-0 group-hover:-translate-y-0.5 active:scale-[0.98]"
              >
                Approve Partners
              </Link>
            </div>
          </motion.div>

          {/* RECENT ACTIVITY TIMELINE */}
          <motion.div 
            id="master-recent-activity" 
            variants={itemVariants}
            className="bg-white rounded-[24px] p-5 sm:p-8 border border-neutral-200/80 shadow-[0_2px_8px_rgba(11,11,13,0.03),0_8px_24px_-4px_rgba(11,11,13,0.04)]"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <span className="text-[12px] font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1">System Log</span>
                <h3 className="text-[22px] font-semibold text-[#111827] tracking-tight">Global Network Activity</h3>
              </div>
            </div>

            <div className="relative border-l-2 border-neutral-100 pl-6 ml-3 space-y-8 pt-2">
              {finalRecentActivities.length > 0 ? (
                finalRecentActivities.map((act, index) => {
                  const IconComponent = act.icon;
                  return (
                    <motion.div 
                      key={act.id} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + (index * 0.1), duration: 0.4 }}
                      className="relative group"
                    >
                      <div className="absolute -left-[41px] top-1 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white bg-[#F7F8FA] text-primary shadow-sm shrink-0 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                        <IconComponent size={14} strokeWidth={2} />
                      </div>
                      <div className="space-y-1 pl-2">
                        <span className="text-[11px] text-neutral-400 font-semibold block uppercase tracking-widest">
                          {act.time ? format(new Date(act.time), 'hh:mm a • dd MMM') : 'Just now'}
                        </span>
                        <h4 className="text-[15px] font-semibold text-[#111827] group-hover:text-primary transition-colors duration-300 tracking-tight">
                          {act.title}
                        </h4>
                        <p className="text-[14px] text-neutral-500 leading-relaxed font-medium">
                          {act.desc}
                        </p>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-neutral-400 text-[13px] font-semibold uppercase tracking-[0.2em]">
                  No recent activity logs generated today
                </div>
              )}
            </div>
          </motion.div>

        </div>

        {/* RIGHT COLUMN: AI Advisor, Global Performance, Quick Controls */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* EXECUTIVE SMART AI ADVISOR */}
          <motion.div 
            id="master-ai-advisor" 
            variants={itemVariants}
            className="dark-glass-card text-white border border-neutral-800/80 rounded-[24px] p-8 shadow-[0_20px_40px_rgba(11,11,13,0.15)] relative overflow-hidden group hover:border-neutral-700 transition-all duration-300"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-[60px] transition-transform duration-700 group-hover:scale-110 pointer-events-none" />
            
            <div className="flex flex-col gap-8 relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Operations Advisor
                  </span>
                </div>
                <div className="p-2 bg-white/5 border border-white/10 text-neutral-300 rounded-[12px] shrink-0">
                  <Sparkles size={16} className="animate-pulse" />
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[20px] font-semibold text-white tracking-tight leading-snug">
                  Cross-Chapter Sync Strategy
                </h4>
                <p className="text-[15px] text-neutral-400 leading-relaxed font-medium">
                  Global transaction volume has accelerated by <span className="font-semibold text-white">18%</span> this quarter. Direct chapter leaders to prioritize visitor sectors matching complementary vacancies to compound regional multipliers!
                </p>
              </div>

              <div>
                <button 
                  onClick={() => setActiveTab('reports')}
                  className="w-full text-center bg-primary hover:bg-primary/90 text-white text-[14px] font-semibold py-4 rounded-[14px] uppercase tracking-[0.15em] inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm"
                >
                  <span>Analyze Metrics</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* GLOBAL PERFORMANCE */}
          <motion.div 
            id="master-weekly-progress" 
            variants={itemVariants}
            className="bg-white rounded-[24px] p-5 sm:p-8 border border-neutral-200/80 shadow-[0_2px_8px_rgba(11,11,13,0.03),0_8px_24px_-4px_rgba(11,11,13,0.04)] space-y-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[12px] text-neutral-500 uppercase font-semibold tracking-[0.2em] block mb-1">Enterprise Status</span>
                <h4 className="text-[22px] font-semibold text-[#111827] tracking-tight">Global Score</h4>
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] bg-primary/5 text-primary px-3 py-1.5 rounded-[10px] shrink-0 border border-primary/10">
                {networkHealthScore > 80 ? '🏆 ELITE SYSTEM' : '🥈 STABLE'}
              </span>
            </div>

            <div className="flex items-center gap-8">
              <div className="relative shrink-0 flex items-center justify-center w-28 h-28 bg-white rounded-full p-2 shadow-[0_2px_8px_rgba(11,11,13,0.03),0_8px_24px_-4px_rgba(11,11,13,0.04)] border border-neutral-100">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="56" cy="56" r="48" stroke="#F7F8FA" strokeWidth="8" fill="transparent" />
                  <circle
                    cx="56" cy="56" r="48" stroke="#DC2626" strokeWidth="8" fill="transparent"
                    strokeDasharray={301.6}
                    strokeDashoffset={301.6 - (301.6 * networkHealthScore) / 100}
                    className="transition-all duration-1000 ease-out"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-[28px] font-semibold text-[#111827] leading-none">{networkHealthScore}</span>
                  <span className="text-[10px] text-neutral-400 font-semibold uppercase mt-1 tracking-[0.2em]">Index</span>
                </div>
              </div>

              <div className="flex-1 space-y-5 text-[15px] font-medium">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                  <span className="text-neutral-500 font-semibold uppercase text-[11px] tracking-[0.15em]">Fastest Growing</span>
                  <span className="font-semibold text-primary">SSK Founders</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 font-semibold uppercase text-[11px] tracking-[0.15em]">Top Performing</span>
                  <span className="font-semibold text-[#111827]">SSK Elite</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-neutral-100 space-y-5 text-[15px]">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 font-medium">Global Roster</span>
                <span className="font-semibold text-[#111827]">{globalMemberCount} Partners</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 font-medium">Active Chapter Hubs</span>
                <span className="font-semibold text-[#111827]">{globalChapterCount} Hubs</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 font-medium">Aggregate Transactions</span>
                <span className="font-semibold text-primary tracking-tight">₹{globalBusinessGenerated.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 font-medium">Referrals Passed</span>
                <span className="font-semibold text-[#111827]">{globalReferralsCount} Total</span>
              </div>
            </div>

            <div className="pt-6 border-t border-neutral-100 flex items-center gap-3 bg-[#F7F8FA] p-4 rounded-[16px] border border-neutral-200/50">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-[12px] text-neutral-600 font-semibold uppercase tracking-[0.15em]">All chapters online & compliant</span>
            </div>
          </motion.div>

          {/* CORE CONTROLS */}
          <motion.div id="master-quick-actions" variants={itemVariants} className="space-y-5">
            <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-500 ml-1">Enterprise Console</h4>
            <div className="grid grid-cols-2 gap-4">
              
              <Link 
                to="/members" 
                className="hover-lift bg-white p-5 rounded-[20px] border border-neutral-200/80 shadow-[0_2px_8px_rgba(11,11,13,0.03),0_8px_24px_-4px_rgba(11,11,13,0.04)] hover:border-primary/20 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 group flex flex-col justify-between min-h-[140px]"
              >
                <div className="w-12 h-12 rounded-[14px] bg-[#F7F8FA] text-[#111827] flex items-center justify-center group-hover:scale-105 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                  <Users size={20} strokeWidth={2} />
                </div>
                <div className="mt-4">
                  <h4 className="text-[14px] font-semibold text-[#111827] tracking-tight">Directory</h4>
                  <p className="text-[12px] text-neutral-500 mt-1 leading-snug font-medium">Onboard globally.</p>
                </div>
              </Link>

              <Link 
                to="/admins" 
                className="hover-lift bg-white p-5 rounded-[20px] border border-neutral-200/80 shadow-[0_2px_8px_rgba(11,11,13,0.03),0_8px_24px_-4px_rgba(11,11,13,0.04)] hover:border-primary/20 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 group flex flex-col justify-between min-h-[140px]"
              >
                <div className="w-12 h-12 rounded-[14px] bg-[#F7F8FA] text-[#111827] flex items-center justify-center group-hover:scale-105 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                  <Shield size={20} strokeWidth={2} />
                </div>
                <div className="mt-4">
                  <h4 className="text-[14px] font-semibold text-[#111827] tracking-tight">Chapters</h4>
                  <p className="text-[12px] text-neutral-500 mt-1 leading-snug font-medium">Authorize admins.</p>
                </div>
              </Link>

              <Link 
                to="/meetings" 
                className="hover-lift bg-white p-5 rounded-[20px] border border-neutral-200/80 shadow-[0_2px_8px_rgba(11,11,13,0.03),0_8px_24px_-4px_rgba(11,11,13,0.04)] hover:border-primary/20 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 group flex flex-col justify-between min-h-[140px]"
              >
                <div className="w-12 h-12 rounded-[14px] bg-[#F7F8FA] text-[#111827] flex items-center justify-center group-hover:scale-105 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                  <Calendar size={20} strokeWidth={2} />
                </div>
                <div className="mt-4">
                  <h4 className="text-[14px] font-semibold text-[#111827] tracking-tight">Meeting</h4>
                  <p className="text-[12px] text-neutral-500 mt-1 leading-snug font-medium">Setup calendar.</p>
                </div>
              </Link>

              <button 
                onClick={() => setActiveTab('reports')} 
                className="hover-lift bg-white p-5 rounded-[20px] border border-neutral-200/80 shadow-[0_2px_8px_rgba(11,11,13,0.03),0_8px_24px_-4px_rgba(11,11,13,0.04)] hover:border-primary/20 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition-all duration-300 group flex flex-col justify-between min-h-[140px] text-left"
              >
                <div className="w-12 h-12 rounded-[14px] bg-[#F7F8FA] text-[#111827] flex items-center justify-center group-hover:scale-105 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                  <Activity size={20} strokeWidth={2} />
                </div>
                <div className="mt-4">
                  <h4 className="text-[14px] font-semibold text-[#111827] tracking-tight">Reports</h4>
                  <p className="text-[12px] text-neutral-500 mt-1 leading-snug font-medium">Performance info.</p>
                </div>
              </button>
            </div>
          </motion.div>

        </div>
      </div>
    </motion.div>
  );
}
