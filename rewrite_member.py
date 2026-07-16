import re

new_content = """import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Share2, Handshake, UserPlus, Users, Clock, Calendar, 
  Flame, Target, Shield, Zap, Award, Sparkles, ArrowRight, 
  TrendingUp, CheckCircle2, Lock, Activity
} from 'lucide-react';
import { Meeting, UserProfile } from '../types';
import { format } from 'date-fns';

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

interface MemberCompanionViewProps {
  profile: UserProfile | null;
  dynamicContext: { period: string; priority: string; tip: string; badge: string };
  completedFocusCount: number;
  focusProgressPercent: number;
  activeFocusTasks: {
    attendMeeting: boolean;
    passReferral: boolean;
    scheduleOneToOne: boolean;
    followUpReferral: boolean;
    inviteGuest: boolean;
  };
  handleToggleTask: (taskKey: 'attendMeeting' | 'passReferral' | 'scheduleOneToOne' | 'followUpReferral' | 'inviteGuest') => void;
  nextMeeting: Meeting | null;
  countdown: { days: number; hours: number; minutes: number };
  finalRecentActivities: any[];
  businessGrowthScore: number;
  currentMonthMetrics: any;
  hasLoggedOneToOne: boolean;
  hasSentThankYouSlip: boolean;
  recommendation: { title: string; description: string; action: string; link: string };
}

export function MemberCompanionView({
  profile,
  dynamicContext,
  completedFocusCount,
  focusProgressPercent,
  activeFocusTasks,
  handleToggleTask,
  nextMeeting,
  countdown,
  finalRecentActivities,
  businessGrowthScore,
  currentMonthMetrics,
  hasLoggedOneToOne,
  hasSentThankYouSlip,
  recommendation
}: MemberCompanionViewProps) {
  
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
        
        {/* LEFT COLUMN: Growth Checklist, Operations */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* TODAY'S GROWTH PLAN CARD */}
          <motion.div 
            id="member-todays-focus" 
            variants={itemVariants}
            className="bg-white rounded-[24px] p-8 border border-neutral-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] relative overflow-hidden group transition-all duration-300"
          >
            <div className="absolute top-0 left-0 w-2 h-full bg-primary" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-[16px] border border-neutral-100 bg-[#F7F8FA] text-[#111827] flex items-center justify-center shrink-0 shadow-sm">
                  <Target size={24} strokeWidth={2} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.2em] text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">
                      Growth Plan
                    </span>
                    <span className="text-[12px] font-semibold uppercase tracking-[0.2em] text-primary">
                      {dynamicContext.period} Sync
                    </span>
                  </div>
                  <h3 className="text-[24px] sm:text-[28px] font-semibold text-[#111827] tracking-tight mt-2 leading-tight">Workspace Checklist</h3>
                  <p className="text-[15px] text-neutral-500 mt-1 leading-relaxed font-medium">
                    Priority: <span className="font-semibold text-[#111827]">{dynamicContext.priority}</span>
                  </p>
                </div>
              </div>
              
              <div className="shrink-0 hidden sm:block">
                <span className="text-[12px] bg-primary/10 text-primary px-3 py-1.5 rounded-lg font-semibold uppercase tracking-[0.2em] shadow-sm border border-primary/20">
                  {completedFocusCount} / 5 Complete
                </span>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-10 relative z-10 pt-4">
              {/* Dynamic Progress Indicator Gauge */}
              <div className="relative shrink-0 flex items-center justify-center w-[140px] h-[140px] bg-white rounded-full shadow-soft border border-neutral-100">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="70" cy="70" r="60" stroke="#F7F8FA" strokeWidth="8" fill="transparent" />
                  <circle
                    cx="70" cy="70" r="60" stroke="#DC2626" strokeWidth="8" fill="transparent"
                    strokeDasharray={377}
                    strokeDashoffset={377 - (377 * focusProgressPercent) / 100}
                    className="transition-all duration-1000 ease-out"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-[32px] font-semibold text-[#111827] leading-none tracking-tight">{focusProgressPercent}%</span>
                </div>
              </div>

              {/* Interactive Checklist */}
              <div className="flex-1 w-full space-y-3">
                {[
                  { key: 'attendMeeting', label: "Attend Weekly Meeting", desc: "Show commitment to your local business chapter syncs", link: "/meetings", linkText: "Join" },
                  { key: 'passReferral', label: "Pass a warm Referral", desc: "Share commercial client opportunities with partners", link: "/refer", linkText: "Pass Slip" },
                  { key: 'scheduleOneToOne', label: "Book a 1-to-1 Session", desc: "Coordinate synergy meetings with adjacent businesses", link: "/one-to-one", linkText: "Book 1-1" },
                  { key: 'followUpReferral', label: "Follow Up Referral Slips", desc: "Track conversion status on active passed leads", link: "/refer", linkText: "My Slips" },
                  { key: 'inviteGuest', label: "Invite a Business Peer", desc: "Onboard new professions to expand chapter strength", link: "/guests", linkText: "Invite" },
                ].map((item) => {
                  const isDone = activeFocusTasks[item.key as keyof typeof activeFocusTasks];
                  return (
                    <motion.div 
                      key={item.key} 
                      onClick={() => handleToggleTask(item.key as any)}
                      whileHover={{ x: 4 }}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-[16px] border cursor-pointer transition-all duration-300",
                        isDone 
                          ? "bg-[#F7F8FA] border-transparent opacity-70" 
                          : "bg-white border-neutral-200 hover:border-primary/30 hover:shadow-soft"
                      )}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded-md border flex items-center justify-center shrink-0 transition-all duration-300",
                        isDone 
                          ? "bg-primary border-primary text-white" 
                          : "border-neutral-300 bg-white group-hover:border-primary"
                      )}>
                        {isDone && <CheckCircle2 size={16} strokeWidth={3} />}
                      </div>
                      <div className="flex-1 min-w-0 flex items-center justify-between">
                        <div>
                          <span className={cn(
                            "text-[16px] font-semibold transition-colors duration-300 tracking-tight block",
                            isDone ? "text-neutral-500 line-through" : "text-[#111827]"
                          )}>
                            {item.label}
                          </span>
                          <span className="text-[14px] text-neutral-500 font-medium block mt-0.5 hidden sm:block">
                            {item.desc}
                          </span>
                        </div>
                        {!isDone && (
                          <Link 
                            to={item.link} 
                            onClick={(e) => e.stopPropagation()}
                            className="text-[13px] font-semibold text-primary uppercase tracking-[0.15em] bg-primary/5 hover:bg-primary hover:text-white px-3 py-1.5 rounded-lg shrink-0 flex items-center gap-1.5 transition-colors border border-primary/10 ml-4"
                          >
                            {item.linkText} <ArrowRight size={12} />
                          </Link>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* CORE OPERATIONS */}
          <motion.div id="member-quick-actions" variants={itemVariants} className="space-y-5">
            <h4 className="text-[13px] font-semibold uppercase tracking-[0.2em] text-neutral-500 ml-1">Core Operations</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <Link 
                to="/refer" 
                className="bg-white p-6 rounded-[24px] border border-neutral-200/80 shadow-soft hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] hover:border-primary/30 transition-all duration-400 group flex items-start gap-5"
              >
                <div className="w-12 h-12 rounded-[16px] bg-primary/5 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-400 shrink-0 border border-primary/10 group-hover:scale-105">
                  <Share2 size={20} strokeWidth={2} />
                </div>
                <div>
                  <h4 className="text-[16px] font-semibold text-[#111827] tracking-tight">Pass Referral</h4>
                  <p className="text-[14px] text-neutral-500 mt-1 leading-snug font-medium">Generate outbound leads for chapter partners.</p>
                </div>
              </Link>

              <Link 
                to="/one-to-one" 
                className="bg-white p-6 rounded-[24px] border border-neutral-200/80 shadow-soft hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] hover:border-primary/30 transition-all duration-400 group flex items-start gap-5"
              >
                <div className="w-12 h-12 rounded-[16px] bg-primary/5 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-400 shrink-0 border border-primary/10 group-hover:scale-105">
                  <Handshake size={20} strokeWidth={2} />
                </div>
                <div>
                  <h4 className="text-[16px] font-semibold text-[#111827] tracking-tight">Book 1-to-1</h4>
                  <p className="text-[14px] text-neutral-500 mt-1 leading-snug font-medium">Schedule synergy sessions with partners.</p>
                </div>
              </Link>

              <Link 
                to="/guests" 
                className="bg-white p-6 rounded-[24px] border border-neutral-200/80 shadow-soft hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] hover:border-primary/30 transition-all duration-400 group flex items-start gap-5"
              >
                <div className="w-12 h-12 rounded-[16px] bg-primary/5 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-400 shrink-0 border border-primary/10 group-hover:scale-105">
                  <UserPlus size={20} strokeWidth={2} />
                </div>
                <div>
                  <h4 className="text-[16px] font-semibold text-[#111827] tracking-tight">Invite Visitor</h4>
                  <p className="text-[14px] text-neutral-500 mt-1 leading-snug font-medium">Onboard new professions to the hub.</p>
                </div>
              </Link>

              <Link 
                to="/members" 
                className="bg-white p-6 rounded-[24px] border border-neutral-200/80 shadow-soft hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] hover:border-primary/30 transition-all duration-400 group flex items-start gap-5"
              >
                <div className="w-12 h-12 rounded-[16px] bg-primary/5 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-400 shrink-0 border border-primary/10 group-hover:scale-105">
                  <Users size={20} strokeWidth={2} />
                </div>
                <div>
                  <h4 className="text-[16px] font-semibold text-[#111827] tracking-tight">Directory</h4>
                  <p className="text-[14px] text-neutral-500 mt-1 leading-snug font-medium">Search for commercial services globally.</p>
                </div>
              </Link>
            </div>
          </motion.div>

        </div>

        {/* RIGHT COLUMN: Growth Scorecard, Recent Activity */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* GROWTH SCORECARD */}
          <motion.div 
            id="member-weekly-progress" 
            variants={itemVariants}
            className="bg-white rounded-[24px] p-8 border border-neutral-200/80 shadow-soft space-y-8"
          >
            <div>
              <span className="text-[12px] text-neutral-500 uppercase font-semibold tracking-[0.2em] block mb-1">Executive KPI</span>
              <h4 className="text-[22px] font-semibold text-[#111827] tracking-tight">Growth Scorecard</h4>
            </div>

            <div className="flex flex-col items-center">
              <div className="relative shrink-0 flex items-center justify-center w-36 h-36 bg-white rounded-full p-2 shadow-soft border border-neutral-100 group">
                <div className="absolute inset-0 rounded-full border border-neutral-100 shadow-[0_0_20px_rgba(220,38,38,0.05)] group-hover:shadow-[0_0_30px_rgba(220,38,38,0.1)] transition-shadow duration-500" />
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="54" stroke="#F7F8FA" strokeWidth="8" fill="transparent" />
                  <motion.circle
                    cx="64" cy="64" r="54" stroke="#DC2626" strokeWidth="8" fill="transparent"
                    strokeDasharray={339.29}
                    strokeDashoffset={339.29}
                    animate={{ strokeDashoffset: 339.29 - (339.29 * businessGrowthScore) / 100 }}
                    transition={{ delay: 0.8, duration: 1.5, ease: "easeOut" }}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-[40px] font-semibold text-[#111827] leading-none tracking-tight">{businessGrowthScore}</span>
                  <span className="text-[10px] text-neutral-400 font-semibold uppercase mt-1 tracking-[0.2em]">Score</span>
                </div>
              </div>
            </div>

            <div className="space-y-5 text-[15px] font-medium pt-2">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <span className="text-neutral-500 font-semibold">1-to-1 Sessions</span>
                <span className="font-semibold text-[#111827] flex items-center gap-2">
                  {currentMonthMetrics.oneToOnes || 0}
                  {hasLoggedOneToOne && <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>}
                </span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <span className="text-neutral-500 font-semibold">Thank You Slips</span>
                <span className="font-semibold text-[#111827] flex items-center gap-2">
                  {currentMonthMetrics.slipsGiven || 0}
                  {hasSentThankYouSlip && <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 font-semibold">Business Generated</span>
                <span className="font-semibold text-primary tracking-tight">
                  ₹{(currentMonthMetrics.businessGiven || 0).toLocaleString()}
                </span>
              </div>
            </div>
            
            <div className="pt-4 border-t border-neutral-100">
              <div className="bg-[#F7F8FA] p-4 rounded-[16px] border border-neutral-200/50 flex items-start gap-4">
                <div className="mt-1">
                  <Award size={18} className="text-amber-500" />
                </div>
                <div>
                  <span className="text-[13px] font-semibold text-[#111827] block tracking-tight">Active Recommendation</span>
                  <span className="text-[13px] text-neutral-500 leading-snug mt-1 block">
                    Your highest leverage activity today is scheduling a 1-to-1 session to boost visibility.
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* RECENT ACTIVITY TIMELINE */}
          <motion.div 
            id="member-recent-activity" 
            variants={itemVariants}
            className="bg-white rounded-[24px] p-8 border border-neutral-200/80 shadow-soft"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <span className="text-[12px] font-semibold uppercase tracking-[0.2em] text-neutral-500 block mb-1">Network Feed</span>
                <h3 className="text-[22px] font-semibold text-[#111827] tracking-tight">Recent Activity</h3>
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
                  No recent activity
                </div>
              )}
            </div>
          </motion.div>

        </div>
      </div>
    </motion.div>
  );
}
"""
with open('src/components/MemberCompanionView.tsx', 'w') as f:
    f.write(new_content)
