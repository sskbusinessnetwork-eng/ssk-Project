import os

dashboard_content = """import React, { useState, useEffect } from 'react';
import { 
  Share2, Award, Calendar, UserPlus, ChevronRight, Users, Handshake, BookOpen, 
  Eye, Plus, Filter, TrendingUp, CheckCircle2, Clock, Sparkles, Target, Compass, 
  HelpCircle, Activity, Briefcase, ArrowRight, Trophy, Flame, Star, Zap, Shield, Rocket
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { MemberCompanionView } from '../components/MemberCompanionView';
import { ChapterAdminCompanionView } from '../components/ChapterAdminCompanionView';
import { MasterAdminCompanionView } from '../components/MasterAdminCompanionView';
import StatGrid from '../components/StatGrid';

export function Analytics() {
  const { profile } = useAuth();
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'GOOD MORNING, 👋';
    if (hour < 18) return 'GOOD AFTERNOON, 👋';
    return 'GOOD EVENING, 👋';
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 sm:space-y-8 pb-20 md:pb-8 relative">
      
      {/* Background decorations matching the mockup style */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-[-1]">
        <div className="absolute top-[-10%] right-[-5%] w-[60%] h-[50%] bg-[#FF6321]/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#4F46E5]/5 blur-[120px] rounded-full" />
      </div>

      {/* TOP HERO HEADER */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-1 xl:grid-cols-12 gap-6"
      >
        {/* Left/Center Wrapper */}
        <div className="xl:col-span-8 bg-gradient-to-r from-[#FFF5F3] to-[#F5F3FF] rounded-[32px] p-8 sm:p-10 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between">
          <div className="absolute inset-0 bg-white/40 backdrop-blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex-1 space-y-4">
            <span className="text-[13px] font-extrabold text-neutral-500 uppercase tracking-[0.2em]">{getGreeting()}</span>
            <h1 className="text-[42px] sm:text-[48px] font-black text-[#111827] leading-[1.1] tracking-tighter">
              {profile?.name || 'Sudarshan\nVagale'}
            </h1>
            <p className="text-[15px] font-medium text-[#4B5563] max-w-[300px] pt-2">
              Welcome back to <strong className="text-primary">SSK Business Network.</strong><br/>
              Here is your enterprise operations overview for today.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-6">
              <button className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-full font-bold text-[14px] flex items-center gap-2 shadow-[0_4px_15px_rgba(220,38,38,0.25)] transition-all">
                <Rocket size={18} />
                Growth Companion
              </button>
              <button className="bg-white hover:bg-neutral-50 text-[#111827] px-6 py-3 rounded-full font-bold text-[14px] flex items-center gap-2 shadow-sm border border-neutral-200 transition-all">
                <Activity size={18} />
                View Reports
              </button>
            </div>
          </div>

          <div className="relative z-10 mt-10 md:mt-0 flex items-center justify-center shrink-0 w-48 h-48">
             {/* Large Health Score Circular Gauge */}
             <div className="absolute inset-0 rounded-full border border-white shadow-[0_0_50px_rgba(255,255,255,1)]" />
             <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
               <defs>
                 <linearGradient id="score-grad" x1="0" y1="0" x2="1" y2="1">
                   <stop offset="0%" stopColor="#DC2626" />
                   <stop offset="100%" stopColor="#4F46E5" />
                 </linearGradient>
               </defs>
               <circle cx="50" cy="50" r="44" stroke="#FFFFFF" strokeWidth="8" fill="none" />
               <circle cx="50" cy="50" r="44" stroke="url(#score-grad)" strokeWidth="8" fill="none" strokeDasharray="276" strokeDashoffset="22" strokeLinecap="round" />
             </svg>
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-white m-3 rounded-full shadow-sm">
               <span className="text-[48px] font-black text-[#111827] leading-none tracking-tighter">92</span>
               <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mt-1">Health Score</span>
               <div className="mt-2 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider">
                 Excellent
               </div>
             </div>
             
             {/* Trend Indicators connecting to the right */}
             <div className="absolute -right-24 top-1/2 -translate-y-1/2 flex flex-col gap-6">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-[14px]">
                    <TrendingUp size={16} strokeWidth={3} />
                    +4%
                  </div>
                  <span className="text-[11px] font-bold text-neutral-500 mt-1">Weekly<br/><span className="text-neutral-400 font-medium">vs last week</span></span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-[14px]">
                    <TrendingUp size={16} strokeWidth={3} />
                    +12%
                  </div>
                  <span className="text-[11px] font-bold text-neutral-500 mt-1">Monthly<br/><span className="text-neutral-400 font-medium">vs last month</span></span>
                </div>
             </div>
          </div>
        </div>

        {/* Right Membership Card */}
        <div className="xl:col-span-4 bg-[#0B0B0D] rounded-[32px] p-8 shadow-[0_20px_40px_rgba(11,11,13,0.15)] relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-primary/20 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 right-0 w-[150px] h-[150px] bg-purple-600/20 rounded-full blur-[60px]" />
          
          <div className="relative z-10 flex justify-between items-start">
             <div>
               <div className="flex items-center gap-2 mb-3">
                 <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                 <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">ACTIVE ACCESS</span>
               </div>
               <h3 className="text-white text-[28px] font-black tracking-tight leading-tight">Platinum<br/>Member</h3>
               <p className="text-[#9CA3AF] text-[14px] font-medium mt-2">SSK Business Network</p>
             </div>
             <div className="w-12 h-12 rounded-[16px] bg-white/10 flex items-center justify-center text-[#FBBF24] border border-white/5 backdrop-blur-md">
               <Trophy size={24} />
             </div>
          </div>

          <div className="relative z-10 mt-8">
            <div className="flex justify-between items-end mb-2">
              <span className="text-[12px] font-bold text-[#9CA3AF]">Next Milestone</span>
              <span className="text-[13px] font-bold text-white">Diamond Partner</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
               <div className="w-[75%] h-full bg-gradient-to-r from-[#8B5CF6] to-[#DC2626] rounded-full" />
            </div>
            <div className="flex items-center justify-between mt-8">
               <span className="text-[12px] font-bold text-[#9CA3AF] uppercase tracking-widest">ENTERPRISE SEAT</span>
               <button className="bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-full text-[13px] font-bold transition-colors">
                 Manage
               </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* KPI CARDS ROW */}
      <StatGrid />

      {/* COMPANION / REPORTS VIEW BASED ON ROLE */}
      {profile?.role === 'MEMBER' && (
        <MemberCompanionView
          profile={profile}
          dynamicContext={{ period: 'Weekly', priority: 'Engage', tip: '', badge: '' }}
          completedFocusCount={0}
          focusProgressPercent={20}
          activeFocusTasks={{ attendMeeting: false, passReferral: false, scheduleOneToOne: false, followUpReferral: false, inviteGuest: false }}
          handleToggleTask={() => {}}
          nextMeeting={null}
          countdown={{ days: 0, hours: 0, minutes: 0 }}
          finalRecentActivities={[
            { id: '1', title: 'New Partner Joined', desc: 'Sudarshan Vagale registered as Real Estate', type: 'member', time: new Date().getTime() },
            { id: '2', title: 'Referral Passed', desc: 'Commercial lead forwarded to partner', type: 'referral', time: new Date().getTime() - 86400000 },
            { id: '3', title: 'Meeting Completed', desc: '1-to-1 with Real Estate Chapter', type: 'onetoone', time: new Date().getTime() - 86400000 * 2 }
          ]}
          businessGrowthScore={85}
          currentMonthMetrics={{}}
          hasLoggedOneToOne={false}
          hasSentThankYouSlip={false}
          recommendation={{ title: 'Schedule 1-to-1', description: 'Schedule 1-to-1 sessions to boost network visibility.', action: 'Schedule', link: '/one-to-one' }}
        />
      )}
      
      {/* Include Admin views if necessary... */}

    </div>
  );
}
"""

with open('src/pages/Dashboard.tsx', 'w') as f:
    f.write(dashboard_content)
