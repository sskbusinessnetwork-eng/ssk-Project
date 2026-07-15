import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Calendar, 
  CheckCircle2, 
  UserPlus, 
  Users, 
  Sparkles, 
  Clock, 
  Handshake,
  ArrowRight,
  TrendingUp,
  Award,
  Flame,
  Target,
  Shield,
  Zap,
  TrendingDown
} from 'lucide-react';
import { UserProfile } from '../types';
import { format } from 'date-fns';
import robotAdvisorImg from '../assets/images/3d_robot_advisor_1784110502585.jpg';
import rocketImg from '../assets/images/3d_rocket_upgrade_1784110475703.jpg';

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

interface ChapterAdminCompanionViewProps {
  profile: UserProfile | null;
  chapterHealthScore: number;
  chapterMemberCount: number;
  chapterReferrals: number;
  chapterBusiness: number;
  finalRecentActivities: any[];
}

export function ChapterAdminCompanionView({
  profile,
  chapterHealthScore,
  chapterMemberCount,
  chapterReferrals,
  chapterBusiness,
  finalRecentActivities,
}: ChapterAdminCompanionViewProps) {
  
  // Animation presets
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { 
      opacity: 1, 
      y: 0, 
      transition: { type: 'spring', stiffness: 110, damping: 16 } 
    }
  };

  return (
    <motion.div 
      id="chapter-admin-companion-root" 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
    >
      {/* LEFT COLUMN: Command Suite, Recruitment Opportunity, Recent Activity */}
      <div className="lg:col-span-8 space-y-8">
        
        {/* TODAY'S HUB PRIORITIES (COMMAND SUITE) */}
        <motion.div 
          id="chapter-todays-focus" 
          variants={itemVariants}
          className="bg-white rounded-[32px] p-6 sm:p-8 border border-neutral-100 shadow-xl shadow-neutral-100/30 relative overflow-hidden group hover:shadow-2xl hover:shadow-neutral-200/40 transition-all duration-500"
        >
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-primary/5 to-transparent rounded-full pointer-events-none transition-transform duration-700 group-hover:scale-110" />
          <div className="absolute top-0 left-0 w-2 h-full bg-primary" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-10">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary bg-primary/5 px-2.5 py-1 rounded-md">
                  President Command Suite
                </span>
                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-neutral-400">
                  Chapter Operations
                </span>
              </div>
              <h3 className="text-2xl font-black text-neutral-900 tracking-tight uppercase">
                Today's Hub Priorities
              </h3>
              <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                Management Directive: <span className="font-bold text-neutral-800">Audit attendee logs, review guest conversion metrics, and sync schedules.</span>
              </p>
            </div>
            
            <div className="shrink-0">
              <span className="text-[10px] bg-neutral-900 text-white px-4 py-2.5 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-neutral-900/10 block">
                75% COMPLETED
              </span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
            {/* Circular Progress Meter */}
            <div className="relative shrink-0 flex items-center justify-center w-36 h-36 bg-neutral-50/50 rounded-full p-2.5 border border-neutral-100/80 shadow-inner">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="72" cy="72" r="60" stroke="#F4F4F5" strokeWidth="8" fill="transparent" />
                <circle
                  cx="72" cy="72" r="60" stroke="#D32F2F" strokeWidth="8" fill="transparent"
                  strokeDasharray={377}
                  strokeDashoffset={377 - (377 * 75) / 100}
                  className="transition-all duration-1000 ease-out"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-neutral-900 leading-none tracking-tighter">75%</span>
                <span className="text-[8px] text-neutral-400 font-extrabold uppercase mt-1 tracking-widest">Done</span>
              </div>
            </div>

            {/* Operational Directive Checklist */}
            <div className="flex-1 w-full space-y-3.5">
              {[
                { isDone: true, label: "Schedule Chapter Sync Assemblies", desc: "Configure session dates, locations, speaker notes, and visitor registries." },
                { isDone: true, label: "Moderate Guest Onboarding Protocols", desc: "Ensure all external professional visitors receive invitations and onboarding updates." },
                { isDone: true, label: "Verify Chapter Business Categories Mapping", desc: "Audit category alignments, mapping vacancies, and identifying hot leads." },
                { isDone: false, label: "Authorize and Sign Assembly Logbooks", desc: "Verify marked attendance and sync-rate logsheets for the active chapter cycle.", link: "/meetings", linkText: "Open Syncs" },
              ].map((item, idx) => (
                <motion.div 
                  key={idx}
                  whileHover={{ x: 4 }}
                  className={cn(
                    "flex items-start gap-4 p-4 rounded-2xl border transition-all duration-300",
                    item.isDone 
                      ? "bg-neutral-50/40 border-neutral-100/80 text-neutral-400" 
                      : "bg-white border-neutral-100 hover:border-primary/20 hover:shadow-xl hover:shadow-neutral-100/30"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-all duration-300",
                    item.isDone 
                      ? "bg-primary border-primary text-white" 
                      : "border-neutral-200 hover:border-primary bg-white"
                  )}>
                    {item.isDone && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className={cn(
                        "text-sm font-black transition-colors duration-300 tracking-tight",
                        item.isDone ? "text-neutral-400 line-through font-bold" : "text-neutral-900"
                      )}>
                        {item.label}
                      </span>
                      {!item.isDone && item.link && (
                        <Link 
                          to={item.link} 
                          className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline shrink-0 flex items-center gap-1"
                        >
                          {item.linkText} <ArrowRight size={10} />
                        </Link>
                      )}
                    </div>
                    <p className={cn("text-xs mt-1 leading-relaxed", item.isDone ? "text-neutral-400/80" : "text-neutral-500")}>
                      {item.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* RECRUITMENT & COMMERCIAL EXPANSION BANNER */}
        <motion.div 
          id="chapter-next-opportunity" 
          variants={itemVariants}
          className="glass-card rounded-[32px] p-6 shadow-xl relative overflow-hidden group hover-lift transition-all duration-500"
        >
          {/* Subtle glow highlight */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none transition-transform duration-700 group-hover:scale-110" />
          
          <div className="flex flex-col md:flex-row gap-6 items-center justify-between relative z-10">
            {/* Visual 3D Asset Cover */}
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white/50 border border-neutral-100 p-0.5 shrink-0 shadow-md animate-float">
              <img src={rocketImg} alt="3D Commercial Growth Rocket" className="w-full h-full object-contain" />
            </div>
            
            <div className="space-y-1.5 flex-1 min-w-0 text-center md:text-left">
              <span className="text-[9px] bg-primary/10 text-primary px-3 py-1 rounded-full font-black uppercase tracking-widest inline-block">
                Commercial Expansion
              </span>
              <h4 className="text-base font-black text-neutral-950 uppercase tracking-tight mt-1">
                Recruit a Chartered Accountant or Digital Marketer
              </h4>
              <p className="text-xs text-neutral-500 leading-relaxed">
                These critical industry categories are currently vacant in your chapter. Introducing peer representatives to fill these categories historically drives a <span className="font-bold text-neutral-900">3.4x outbound referral multiplication rate</span> across active business accounts!
              </p>
            </div>
            
            <Link 
              to="/guests" 
              className="bg-neutral-950 text-white px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary transition-all duration-300 shadow-lg shadow-neutral-900/10 whitespace-nowrap shrink-0 group-hover:-translate-y-0.5"
            >
              Invite Guest
            </Link>
          </div>
        </motion.div>

        {/* CHAPTER RECENT OPERATIONS LOG */}
        <motion.div 
          id="chapter-recent-activity" 
          variants={itemVariants}
          className="bg-white rounded-[32px] p-6 sm:p-8 border border-neutral-100 shadow-xl shadow-neutral-100/30"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400 block">Hub telemetry</span>
              <h3 className="text-xl font-black text-neutral-900 tracking-tight uppercase mt-1">
                Chapter Activity
              </h3>
            </div>
          </div>

          <div className="relative border-l border-neutral-100 pl-8 ml-4 space-y-8 pt-2">
            {finalRecentActivities.length > 0 ? (
              finalRecentActivities.map((act) => {
                const IconComponent = act.icon;
                return (
                  <div key={act.id} className="relative group">
                    {/* Pulsing visual node background */}
                    <div className="absolute -left-[45px] top-0.5 w-8 h-8 rounded-xl flex items-center justify-center border border-neutral-100 bg-white text-primary shadow-md shrink-0 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                      <IconComponent size={14} />
                    </div>
                    <div className="space-y-1.5 pl-1">
                      <span className="text-[9px] text-neutral-400 font-black block uppercase tracking-wider">
                        {act.time ? format(new Date(act.time), 'hh:mm a • dd MMM yyyy') : 'Just now'}
                      </span>
                      <h4 className="text-sm font-black text-neutral-800 group-hover:text-primary transition-colors duration-300 uppercase tracking-tight">
                        {act.title}
                      </h4>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        {act.desc}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-neutral-400 text-xs font-black uppercase tracking-widest">
                No active operations logged in your chapter yet
              </div>
            )}
          </div>
        </motion.div>

      </div>

      {/* RIGHT COLUMN: Quick Controls, Hub Performance, AI Advisor */}
      <div className="lg:col-span-4 space-y-8">
        
        {/* EXECUTIVE EXECUTIVE ADVISOR (SMART AI ADVISOR) */}
        <motion.div 
          id="chapter-smart-recommendation" 
          variants={itemVariants}
          className="bg-[#0c0c0c] text-white border border-neutral-900 rounded-[32px] p-6 shadow-2xl relative overflow-hidden group"
        >
          {/* Glowing gradient backdrops */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-primary/20 rounded-full blur-2xl transition-transform duration-700 group-hover:scale-110 pointer-events-none" />
          
          <div className="flex flex-col gap-5 relative z-10">
            {/* Header badges */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-1 rounded">
                  Executive Advisor
                </span>
                <span className="text-[8px] bg-white/10 text-white/90 px-2 py-0.5 rounded font-black uppercase tracking-widest">
                  SMART SYSTEM
                </span>
              </div>
              <div className="p-2 bg-primary/15 text-primary rounded-xl shrink-0">
                <Sparkles size={14} className="animate-pulse" />
              </div>
            </div>

            {/* Split layout: 3D advisor and text advice */}
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 p-0.5 shrink-0 shadow-md">
                <img src={robotAdvisorImg} alt="Strategic AI Advisor" className="w-full h-full object-contain" />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <h4 className="text-sm font-black text-white uppercase tracking-tight leading-snug">
                  Target Guest Sync Strategy
                </h4>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Currently, onboarding partner reps in the <span className="font-bold text-white">Accounting</span> or <span className="font-bold text-white">Digital Marketing</span> sectors triggers the fastest outbound transaction velocity. Coordinate active members to prioritize these vacancies!
                </p>
              </div>
            </div>

            {/* Directive Action button */}
            <div className="pt-2">
              <Link 
                to="/guests" 
                className="w-full text-center bg-primary hover:bg-red-700 text-white text-xs font-black py-3 rounded-xl uppercase tracking-widest inline-flex items-center justify-center gap-2 transition-all group-hover:shadow-lg group-hover:shadow-primary/15"
              >
                <span>Deploy Strategy</span>
                <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </motion.div>

        {/* HUB PERFORMANCE SCORE (HEALTH INDEX) */}
        <motion.div 
          id="chapter-weekly-progress" 
          variants={itemVariants}
          className="bg-white rounded-[32px] p-6 border border-neutral-100 shadow-xl shadow-neutral-100/30 space-y-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[9px] text-neutral-400 uppercase font-black tracking-widest block">Chapter Health</span>
              <h4 className="text-sm font-black text-neutral-950 uppercase tracking-tight">Hub performance</h4>
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider bg-primary text-white px-3 py-1.5 rounded-full shrink-0">
              {chapterHealthScore > 80 ? '🏆 ELITE HUB' : '🥈 STABLE'}
            </span>
          </div>

          <div className="flex items-center gap-6">
            {/* Visual Ring Gauge */}
            <div className="relative shrink-0 flex items-center justify-center w-24 h-24 bg-neutral-50/50 rounded-full border border-neutral-100">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="48" cy="48" r="38" stroke="#F4F4F5" strokeWidth="6" fill="transparent" />
                <circle
                  cx="48" cy="48" r="38" stroke="#D32F2F" strokeWidth="6" fill="transparent"
                  strokeDasharray={239}
                  strokeDashoffset={239 - (239 * chapterHealthScore) / 100}
                  className="transition-all duration-1000 ease-out"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-xl font-black text-neutral-900 leading-none">{chapterHealthScore}</span>
                <span className="text-[8px] text-neutral-400 font-extrabold uppercase mt-1 tracking-wider">Index</span>
              </div>
            </div>

            <div className="flex-1 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-neutral-50">
                <span className="text-neutral-500 font-black uppercase text-[9px] tracking-wider">Roster Activity</span>
                <span className="font-bold text-primary">85% Active 📈</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 font-black uppercase text-[9px] tracking-wider">Growth MoM</span>
                <span className="font-bold text-neutral-800">+12% growth</span>
              </div>
            </div>
          </div>

          {/* Operational Metrics list */}
          <div className="pt-4 border-t border-neutral-100 space-y-3.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-neutral-500 font-medium">Chapter Roster</span>
              <span className="font-black text-neutral-950">{chapterMemberCount} active members</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-500 font-medium">Referrals Exchanged</span>
              <span className="font-black text-neutral-950">{chapterReferrals} passed</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-500 font-medium">Aggregate Chapter Business</span>
              <span className="font-black text-primary font-mono text-xs">₹{chapterBusiness.toLocaleString()}</span>
            </div>
          </div>
        </motion.div>

        {/* CORE OPERATIONS QUICK ACTION GRID */}
        <motion.div id="chapter-quick-actions" variants={itemVariants} className="space-y-4">
          <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400 ml-1">Chapter Controls</h4>
          <div className="grid grid-cols-2 gap-4">
            
            <Link 
              to="/meetings" 
              className="bg-white p-5 rounded-[24px] border border-neutral-100 shadow-lg shadow-neutral-100/30 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group flex flex-col justify-between min-h-[130px]"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                <Calendar size={16} />
              </div>
              <div className="mt-4">
                <h4 className="text-xs font-black text-neutral-800 uppercase tracking-wider">Start Meeting</h4>
                <p className="text-[10px] text-neutral-400 mt-1 leading-snug">Organize assembly logs.</p>
              </div>
            </Link>

            <Link 
              to="/meetings" 
              className="bg-white p-5 rounded-[24px] border border-neutral-100 shadow-lg shadow-neutral-100/30 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group flex flex-col justify-between min-h-[130px]"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                <CheckCircle2 size={16} />
              </div>
              <div className="mt-4">
                <h4 className="text-xs font-black text-neutral-800 uppercase tracking-wider">Attendance</h4>
                <p className="text-[10px] text-neutral-400 mt-1 leading-snug">Verify chapter rosters.</p>
              </div>
            </Link>

            <Link 
              to="/guests" 
              className="bg-white p-5 rounded-[24px] border border-neutral-100 shadow-lg shadow-neutral-100/30 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group flex flex-col justify-between min-h-[130px]"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                <UserPlus size={16} />
              </div>
              <div className="mt-4">
                <h4 className="text-xs font-black text-neutral-800 uppercase tracking-wider">Add Visitor</h4>
                <p className="text-[10px] text-neutral-400 mt-1 leading-snug">Onboard assembly guests.</p>
              </div>
            </Link>

            <Link 
              to="/members" 
              className="bg-white p-5 rounded-[24px] border border-neutral-100 shadow-lg shadow-neutral-100/30 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group flex flex-col justify-between min-h-[130px]"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                <Users size={16} />
              </div>
              <div className="mt-4">
                <h4 className="text-xs font-black text-neutral-800 uppercase tracking-wider">Manage Roster</h4>
                <p className="text-[10px] text-neutral-400 mt-1 leading-snug">Moderate active members.</p>
              </div>
            </Link>

          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
