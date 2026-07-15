import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Share2, 
  Handshake, 
  UserPlus, 
  Users, 
  Clock, 
  Calendar, 
  Flame, 
  Target, 
  Shield, 
  Zap, 
  Award, 
  Sparkles, 
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { Meeting, UserProfile } from '../types';
import { format } from 'date-fns';
import targetBullseyeImg from '../assets/images/3d_target_bullseye_1784110490406.jpg';
import robotAdvisorImg from '../assets/images/3d_robot_advisor_1784110502585.jpg';

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
  recommendation,
}: MemberCompanionViewProps) {
  // Define animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }
  };

  return (
    <motion.div 
      id="member-companion-root" 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-10"
    >
      {/* ==================== PREMIUM LIVE METRICS ROW ==================== */}
      <motion.div 
        variants={itemVariants}
        className="grid grid-cols-2 md:grid-cols-5 gap-4"
      >
        {/* Metric 1: Referrals Sent */}
        <div className="bg-white rounded-[24px] p-5 border border-neutral-100 shadow-lg shadow-neutral-100/20 hover:shadow-xl transition-all duration-300 flex items-center gap-4 group hover-lift">
          <div className="w-11 h-11 rounded-2xl bg-red-500/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Share2 size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] text-neutral-400 font-extrabold uppercase tracking-widest block leading-none">Referrals</span>
            <span className="text-lg font-black text-neutral-900 mt-1 block leading-none">{currentMonthMetrics.referralsSent || 0}</span>
            <span className="text-[9px] text-emerald-500 font-bold flex items-center gap-0.5 mt-1 leading-none">
              <TrendingUp size={10} /> +12%
            </span>
          </div>
        </div>

        {/* Metric 2: 1-to-1 Meetings */}
        <div className="bg-white rounded-[24px] p-5 border border-neutral-100 shadow-lg shadow-neutral-100/20 hover:shadow-xl transition-all duration-300 flex items-center gap-4 group hover-lift">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Handshake size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] text-neutral-400 font-extrabold uppercase tracking-widest block leading-none">1-to-1s</span>
            <span className="text-lg font-black text-neutral-900 mt-1 block leading-none">{currentMonthMetrics.oneToOnes || 0}</span>
            <span className="text-[9px] text-emerald-500 font-bold flex items-center gap-0.5 mt-1 leading-none">
              <TrendingUp size={10} /> +18%
            </span>
          </div>
        </div>

        {/* Metric 3: Meetings Attended */}
        <div className="bg-white rounded-[24px] p-5 border border-neutral-100 shadow-lg shadow-neutral-100/20 hover:shadow-xl transition-all duration-300 flex items-center gap-4 group hover-lift">
          <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Calendar size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] text-neutral-400 font-extrabold uppercase tracking-widest block leading-none">Attendance</span>
            <span className="text-lg font-black text-neutral-900 mt-1 block leading-none">{currentMonthMetrics.attendanceCount || 0}</span>
            <span className="text-[9px] text-emerald-500 font-bold flex items-center gap-0.5 mt-1 leading-none">
              <TrendingUp size={10} /> +8%
            </span>
          </div>
        </div>

        {/* Metric 4: Closed Business Generated */}
        <div className="bg-white rounded-[24px] p-5 border border-neutral-100 shadow-lg shadow-neutral-100/20 hover:shadow-xl transition-all duration-300 flex items-center gap-4 group md:col-span-1 col-span-2 hover-lift">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <TrendingUp size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] text-neutral-400 font-extrabold uppercase tracking-widest block leading-none">Closed Deals</span>
            <span className="text-xs font-black text-neutral-900 mt-1 block leading-none truncate" title={`₹${(currentMonthMetrics.businessGenerated || 0).toLocaleString('en-IN')}`}>
              ₹{(currentMonthMetrics.businessGenerated || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[9px] text-emerald-500 font-bold flex items-center gap-0.5 mt-1 leading-none">
              <TrendingUp size={10} /> +24%
            </span>
          </div>
        </div>

        {/* Metric 5: Thank You Slips */}
        <div className="bg-white rounded-[24px] p-5 border border-neutral-100 shadow-lg shadow-neutral-100/20 hover:shadow-xl transition-all duration-300 flex items-center gap-4 group hover-lift">
          <div className="w-11 h-11 rounded-2xl bg-pink-500/10 text-pink-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Award size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] text-neutral-400 font-extrabold uppercase tracking-widest block leading-none">Thank-You's</span>
            <span className="text-lg font-black text-neutral-900 mt-1 block leading-none">
              {currentMonthMetrics.referralsReceived || 0}
            </span>
            <span className="text-[9px] text-emerald-500 font-bold flex items-center gap-0.5 mt-1 leading-none">
              <TrendingUp size={10} /> +16%
            </span>
          </div>
        </div>
      </motion.div>

      {/* ==================== CORE CONTENT GRID ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Growth Checklist, Next Milestone, Live Feed */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* TODAY'S GROWTH PLAN CARD */}
          <motion.div 
            id="member-todays-focus" 
            variants={itemVariants}
            className="bg-white rounded-[32px] p-6 sm:p-8 border border-neutral-100 shadow-xl shadow-neutral-100/40 relative overflow-hidden group hover:shadow-2xl hover:shadow-neutral-200/50 transition-all duration-500"
          >
            {/* Subtle decorative background illustration & gradient */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-primary/5 to-transparent rounded-full pointer-events-none transition-transform duration-700 group-hover:scale-110 animate-pulse-subtle" />
            <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 relative z-10">
              <div className="flex items-center gap-4">
                {/* Generated Target Bullseye Asset */}
                <div className="w-16 h-16 rounded-2xl overflow-hidden border border-neutral-100 bg-neutral-50/50 p-1 flex-shrink-0 shadow-inner">
                  <img src={targetBullseyeImg} alt="Target Bullseye" className="w-full h-full object-contain" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary bg-primary/5 px-2 py-0.5 rounded">
                      Companion Guide
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-[0.1em] text-neutral-400">
                      {dynamicContext.period} Sync
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight mt-1">Today's Growth Plan</h3>
                  <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                    Priority: <span className="font-bold text-neutral-800">{dynamicContext.priority}</span>
                  </p>
                </div>
              </div>
              
              <div className="shrink-0">
                <span className="text-[10px] bg-neutral-950 text-white px-4 py-2 rounded-xl font-black uppercase tracking-widest shadow-md">
                  {completedFocusCount} / 5 COMPLETE
                </span>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
              {/* Dynamic Progress Indicator Gauge */}
              <div className="relative shrink-0 flex items-center justify-center w-36 h-36 bg-neutral-50/50 rounded-full p-2 border border-neutral-100 shadow-inner">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="72" cy="72" r="62" stroke="#F4F4F5" strokeWidth="8" fill="transparent" />
                  <circle
                    cx="72" cy="72" r="62" stroke="#D32F2F" strokeWidth="8" fill="transparent"
                    strokeDasharray={389}
                    strokeDashoffset={389 - (389 * focusProgressPercent) / 100}
                    className="transition-all duration-1000 ease-out"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-neutral-900 leading-none tracking-tighter">{focusProgressPercent}%</span>
                  <span className="text-[9px] text-neutral-400 font-extrabold uppercase mt-1.5 tracking-widest">Completed</span>
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
                        "flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all duration-300",
                        isDone 
                          ? "bg-neutral-50/50 border-neutral-100 text-neutral-400" 
                          : "bg-white border-neutral-100 hover:border-primary/20 hover:shadow-lg hover:shadow-neutral-100/50"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-all duration-300",
                        isDone 
                          ? "bg-primary border-primary text-white" 
                          : "border-neutral-300 hover:border-primary"
                      )}>
                        {isDone && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <span className={cn(
                            "text-sm font-bold transition-colors duration-300 tracking-tight",
                            isDone ? "text-neutral-400 line-through font-medium" : "text-neutral-800"
                          )}>
                            {item.label}
                          </span>
                          {!isDone && (
                            <Link 
                              to={item.link} 
                              onClick={(e) => e.stopPropagation()} 
                              className="text-[9px] font-black text-primary uppercase tracking-widest bg-red-500/5 hover:bg-primary hover:text-white px-2.5 py-1 rounded-full shrink-0 flex items-center gap-0.5 transition-colors border border-red-500/10"
                            >
                              {item.linkText} <ArrowRight size={10} />
                            </Link>
                          )}
                        </div>
                        <p className={cn("text-[11px] mt-1 leading-relaxed", isDone ? "text-neutral-400/80" : "text-neutral-500")}>
                          {item.desc}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* NEXT MILESTONE MEETING COUNTDOWN */}
          <motion.div 
            id="member-next-opportunity" 
            variants={itemVariants}
            className="bg-white rounded-[32px] p-6 sm:p-8 border border-neutral-100 shadow-xl shadow-neutral-100/40 relative overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-neutral-400 block">Next Milestone</span>
                <h3 className="text-xl font-black text-neutral-900 tracking-tight mt-0.5">Upcoming Chapter Assembly</h3>
              </div>
              {nextMeeting && (
                <span className="text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary px-3 py-1.5 rounded-full flex items-center gap-1.5 self-start sm:self-auto">
                  <Clock size={12} className="animate-pulse" /> COUNTDOWN ACTIVE
                </span>
              )}
            </div>

            {nextMeeting ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Meeting Box redesigned as nice calendar sheet */}
                <div className="md:col-span-7 flex items-start gap-4 bg-neutral-50 p-4 sm:p-5 rounded-2xl border border-neutral-100/80">
                  <div className="w-14 h-15 bg-white border border-neutral-200 rounded-xl flex flex-col items-center overflow-hidden shrink-0 shadow-sm animate-fade-in">
                    <span className="w-full bg-primary text-[8px] text-white font-black uppercase py-0.5 text-center tracking-widest leading-none">
                      {format(new Date(nextMeeting.date), 'MMM')}
                    </span>
                    <span className="text-xl font-black mt-1 text-neutral-800 leading-none">
                      {format(new Date(nextMeeting.date), 'd')}
                    </span>
                    <span className="text-[7px] text-neutral-400 font-bold uppercase mt-1 leading-none">
                      {format(new Date(nextMeeting.date), 'EEE')}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-base font-black text-neutral-900 truncate">
                      {profile?.chapterName || "Weekly Chapter Assembly"}
                    </h4>
                    <p className="text-xs text-primary font-bold uppercase tracking-wider mt-1.5">
                      {format(new Date(nextMeeting.date), 'EEEE • ')} {nextMeeting.time || "8:00 AM"}
                    </p>
                    {nextMeeting.location && (
                      <p className="text-[11px] text-neutral-400 truncate mt-1">
                        📍 {nextMeeting.location}
                      </p>
                    )}
                  </div>
                </div>

                {/* Live Countdown in Dark Theme */}
                <div className="md:col-span-5 grid grid-cols-3 gap-3 text-center bg-[#0c0c0c] text-white p-4 rounded-2xl shadow-lg">
                  <div className="border-r border-white/10">
                    <span className="block text-2xl font-black tracking-tight">{countdown.days}</span>
                    <span className="text-[8px] text-white/50 font-black uppercase tracking-widest mt-0.5">Days</span>
                  </div>
                  <div className="border-r border-white/10">
                    <span className="block text-2xl font-black tracking-tight">{countdown.hours}</span>
                    <span className="text-[8px] text-white/50 font-black uppercase tracking-widest mt-0.5">Hours</span>
                  </div>
                  <div>
                    <span className="block text-2xl font-black tracking-tight">{countdown.minutes}</span>
                    <span className="text-[8px] text-white/50 font-black uppercase tracking-widest mt-0.5">Mins</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
                <Calendar size={32} className="mx-auto text-neutral-300 mb-2" />
                <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider">No Chapter sync meetings configured</p>
                <Link to="/meetings" className="mt-3 inline-block text-[11px] font-black text-primary uppercase tracking-widest hover:underline bg-white px-4 py-2 rounded-xl shadow-sm border border-neutral-100">
                  Check Calendar Schedule →
                </Link>
              </div>
            )}
          </motion.div>

          {/* RECENT ACTIVITY TIMELINE */}
          <motion.div 
            id="member-recent-activity" 
            variants={itemVariants}
            className="bg-white rounded-[32px] p-6 sm:p-8 border border-neutral-100 shadow-xl shadow-neutral-100/40"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-neutral-400 block">Live Feed</span>
                <h3 className="text-xl font-black text-neutral-900 tracking-tight mt-0.5">Recent Activity</h3>
              </div>
            </div>

            <div className="relative border-l border-neutral-100 pl-6 ml-4 space-y-8 pt-2">
              {finalRecentActivities.length > 0 ? (
                finalRecentActivities.map((act) => {
                  const IconComponent = act.icon;
                  return (
                    <div key={act.id} className="relative group">
                      {/* Floating indicator */}
                      <div className="absolute -left-[37px] top-0.5 w-7 h-7 rounded-full flex items-center justify-center border border-neutral-100 bg-white text-primary shadow-md shrink-0 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                        <IconComponent size={12} />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-neutral-400 font-black block uppercase tracking-wider">
                          {act.time ? format(new Date(act.time), 'hh:mm a • dd MMM yyyy') : 'Just now'}
                        </span>
                        <h4 className="text-sm font-bold text-neutral-800 group-hover:text-primary transition-colors duration-300">
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
                <div className="text-center py-6 text-neutral-400 text-xs font-bold uppercase tracking-wider">
                  No recent activity logged in your chapter
                </div>
              )}
            </div>
          </motion.div>

        </div>

        {/* RIGHT COLUMN: Strategic AI Advisor, Scorecard, Quick Operations */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* SMART RECOMMENDATION WITH GENERATED 3D ROBOT */}
          <motion.div 
            id="member-smart-recommendation" 
            variants={itemVariants}
            className="bg-[#0c0c0c] text-white border border-neutral-900 rounded-[32px] p-6 shadow-2xl relative overflow-hidden group hover-lift"
          >
            {/* Subtle glow highlight */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-primary/20 rounded-full blur-2xl transition-transform duration-700 group-hover:scale-110 pointer-events-none" />
            
            <div className="flex flex-col gap-5 relative z-10">
              
              {/* Header block */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-1 rounded">
                    Strategic AI Advisor
                  </span>
                  <span className="text-[8px] bg-white/10 text-white/90 px-2 py-0.5 rounded font-black uppercase tracking-widest">
                    SMART ACTION
                  </span>
                </div>
                <div className="p-2 bg-primary/15 text-primary rounded-xl shrink-0">
                  <Sparkles size={14} className="animate-pulse" />
                </div>
              </div>

              {/* Character & recommendation content in clean horizontal split */}
              <div className="flex items-start gap-4">
                {/* 3D Robot Asset */}
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 p-0.5 shrink-0 shadow-md animate-float-delayed">
                  <img src={robotAdvisorImg} alt="Strategic AI Advisor Robot" className="w-full h-full object-contain" />
                </div>
                
                <div className="space-y-1.5 flex-1 min-w-0">
                  <h4 className="text-sm font-black text-white leading-snug">
                    {recommendation.title}
                  </h4>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    {recommendation.description}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <Link 
                  to={recommendation.link} 
                  className="w-full text-center bg-primary hover:bg-red-700 text-white text-xs font-black py-3 rounded-xl uppercase tracking-widest inline-flex items-center justify-center gap-2 transition-all group-hover:shadow-lg group-hover:shadow-primary/10"
                >
                  <span>{recommendation.action}</span>
                  <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

            </div>
          </motion.div>

          {/* COCKPIT STATS & GAMIFICATION */}
          <motion.div 
            id="member-gamification" 
            variants={itemVariants}
            className="bg-white rounded-[32px] p-6 border border-neutral-100 shadow-xl shadow-neutral-100/40 space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[9px] text-neutral-400 uppercase font-black tracking-widest block">Level Index</span>
                <h4 className="text-sm font-black text-neutral-950 uppercase tracking-tight">Growth Scorecard</h4>
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider bg-primary text-white px-3 py-1.5 rounded-full shrink-0">
                {businessGrowthScore < 50 ? '🌱 RISING' : businessGrowthScore < 75 ? '🥈 SILVER' : '🏆 ELITE'}
              </span>
            </div>

            {/* Business Growth Score */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-neutral-500 uppercase tracking-wider text-[10px]">Commercial Index</span>
                <span className="text-primary font-black">{businessGrowthScore} / 100 XP</span>
              </div>
              <div className="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden p-0.5 border border-neutral-100">
                <motion.div 
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${businessGrowthScore}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Referral Streak & Goal Tracker */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
              <div className="bg-neutral-50/50 p-3 rounded-2xl border border-neutral-100/80 flex flex-col justify-between">
                <span className="text-[9px] text-neutral-400 font-extrabold uppercase tracking-widest flex items-center gap-1">
                  <Flame size={12} className="text-primary animate-bounce-subtle" /> Active Streak
                </span>
                <span className="text-xs font-black text-neutral-800 mt-2">
                  {currentMonthMetrics.referralsSent > 0 ? '2 Weeks 🔥' : '0 Weeks'}
                </span>
              </div>
              <div className="bg-neutral-50/50 p-3 rounded-2xl border border-neutral-100/80 flex flex-col justify-between">
                <span className="text-[9px] text-neutral-400 font-extrabold uppercase tracking-widest flex items-center gap-1">
                  <Target size={12} className="text-primary" /> Target Goal
                </span>
                <span className="text-xs font-black text-neutral-800 mt-2">4 Referrals</span>
              </div>
            </div>

            {/* Achievement Badges */}
            <div className="pt-4 border-t border-neutral-100">
              <span className="text-[9px] text-neutral-400 uppercase font-black tracking-widest block mb-3">Earned Credentials</span>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center gap-2 bg-neutral-50/30 p-2.5 rounded-xl border border-neutral-100" title="Founding Partner Badge">
                  <div className="w-7 h-7 rounded-full bg-neutral-900 text-white flex items-center justify-center shadow-md shadow-neutral-900/10">
                    <Shield size={14} />
                  </div>
                  <span className="text-[8px] text-neutral-600 font-black uppercase tracking-tight">Founding</span>
                </div>

                <div className="flex flex-col items-center gap-2 bg-neutral-50/30 p-2.5 rounded-xl border border-neutral-100" title="Super Connector Badge">
                  <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shadow-md", hasLoggedOneToOne ? "bg-primary text-white shadow-primary/20" : "bg-neutral-200 text-neutral-400 shadow-sm")}>
                    <Zap size={14} />
                  </div>
                  <span className="text-[8px] text-neutral-600 font-black uppercase tracking-tight">Connector</span>
                </div>

                <div className="flex flex-col items-center gap-2 bg-neutral-50/30 p-2.5 rounded-xl border border-neutral-100" title="Network Catalyst Badge">
                  <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shadow-md", hasSentThankYouSlip ? "bg-primary text-white shadow-primary/20" : "bg-neutral-200 text-neutral-400 shadow-sm")}>
                    <Award size={14} />
                  </div>
                  <span className="text-[8px] text-neutral-600 font-black uppercase tracking-tight">Catalyst</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* QUICK OPERATIONS */}
          <motion.div id="member-quick-actions" variants={itemVariants} className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 ml-1">Core Operations</h4>
            <div className="grid grid-cols-2 gap-4">
              <Link to="/refer" className="bg-white p-5 rounded-[22px] border border-neutral-100 shadow-lg shadow-neutral-100/40 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group flex flex-col justify-between min-h-[130px]">
                <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                  <Share2 size={16} />
                </div>
                <div className="mt-4">
                  <h4 className="text-xs font-black text-neutral-800 uppercase tracking-wider">Pass Referral</h4>
                  <p className="text-[10px] text-neutral-400 mt-1 leading-snug">Share commercial leads.</p>
                </div>
              </Link>

              <Link to="/one-to-one" className="bg-white p-5 rounded-[22px] border border-neutral-100 shadow-lg shadow-neutral-100/40 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group flex flex-col justify-between min-h-[130px]">
                <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                  <Handshake size={16} />
                </div>
                <div className="mt-4">
                  <h4 className="text-xs font-black text-neutral-800 uppercase tracking-wider">Book 1-to-1</h4>
                  <p className="text-[10px] text-neutral-400 mt-1 leading-snug">Coordinate sync sessions.</p>
                </div>
              </Link>

              <Link to="/guests" className="bg-white p-5 rounded-[22px] border border-neutral-100 shadow-lg shadow-neutral-100/40 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group flex flex-col justify-between min-h-[130px]">
                <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                  <UserPlus size={16} />
                </div>
                <div className="mt-4">
                  <h4 className="text-xs font-black text-neutral-800 uppercase tracking-wider">Invite Guest</h4>
                  <p className="text-[10px] text-neutral-400 mt-1 leading-snug">Expand local categories.</p>
                </div>
              </Link>

              <Link to="/members" className="bg-white p-5 rounded-[22px] border border-neutral-100 shadow-lg shadow-neutral-100/40 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group flex flex-col justify-between min-h-[130px]">
                <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                  <Users size={16} />
                </div>
                <div className="mt-4">
                  <h4 className="text-xs font-black text-neutral-800 uppercase tracking-wider">Find Members</h4>
                  <p className="text-[10px] text-neutral-400 mt-1 leading-snug">Browse directory roster.</p>
                </div>
              </Link>
            </div>
          </motion.div>

        </div>

      </div>
    </motion.div>
  );
}
