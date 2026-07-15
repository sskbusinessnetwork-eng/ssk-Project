import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Users, 
  Shield, 
  Calendar, 
  Activity, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Handshake, 
  UserPlus,
  ArrowRight,
  Trophy,
  Target
} from 'lucide-react';
import { UserProfile } from '../types';
import { format } from 'date-fns';
import robotAdvisorImg from '../assets/images/3d_robot_advisor_1784110502585.jpg';
import businessHeroImg from '../assets/images/3d_business_character_hero_1784110459127.jpg';

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
      id="master-admin-companion-root" 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
    >
      {/* LEFT COLUMN: Focus Checklist, Regional Audits, Timeline */}
      <div className="lg:col-span-8 space-y-8">
        
        {/* EXECUTIVE STRATEGIC FOCUS CARD (TODAY'S PRIORITIES) */}
        <motion.div 
          id="master-todays-focus" 
          variants={itemVariants}
          className="bg-white rounded-[32px] p-6 sm:p-8 border border-neutral-100 shadow-xl shadow-neutral-100/30 relative overflow-hidden group hover:shadow-2xl hover:shadow-neutral-200/40 transition-all duration-500"
        >
          {/* Subtle gradient accent */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-primary/5 to-transparent rounded-full pointer-events-none transition-transform duration-700 group-hover:scale-110" />
          <div className="absolute top-0 left-0 w-2 h-full bg-neutral-900" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-10">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary bg-primary/5 px-2.5 py-1 rounded-md">
                  Global Enterprise Control
                </span>
                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-neutral-400">
                  Network Command Center
                </span>
              </div>
              <h3 className="text-2xl font-black text-neutral-900 tracking-tight uppercase">
                Executive Strategic Focus
              </h3>
              <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                Network Priority: <span className="font-bold text-neutral-800">Verify regional chapter compliance, audit financial streams, and authorize enterprise applications.</span>
              </p>
            </div>
            
            <div className="shrink-0">
              <span className="text-[10px] bg-neutral-900 text-white px-4 py-2.5 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-neutral-900/10 block">
                100% OPERATIONAL
              </span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
            {/* Health Score Ring */}
            <div className="relative shrink-0 flex items-center justify-center w-36 h-36 bg-neutral-50/50 rounded-full p-2.5 border border-neutral-100/80 shadow-inner">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="72" cy="72" r="60" stroke="#F4F4F5" strokeWidth="8" fill="transparent" />
                <circle
                  cx="72" cy="72" r="60" stroke="#D32F2F" strokeWidth="8" fill="transparent"
                  strokeDasharray={377}
                  strokeDashoffset={0}
                  className="transition-all duration-1000 ease-out"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-neutral-900 leading-none tracking-tighter">100%</span>
                <span className="text-[8px] text-neutral-400 font-extrabold uppercase mt-1 tracking-widest">Active</span>
              </div>
            </div>

            {/* Operational Checklist */}
            <div className="flex-1 w-full space-y-3.5">
              {[
                { isDone: true, label: "Audit & Authorize Chapter Admin Credentials", desc: "Review and approve regional chapter presidents to unlock local executive consoles." },
                { isDone: true, label: "Monitor Global Directory and Listings Database", desc: "Scan across all chapters to approve pending membership applications." },
                { isDone: true, label: "Configure Master Category Ratios", desc: "Verify industry category mappings, capping sectors, and optimizing global vacancy lists." },
                { isDone: true, label: "Verify Aggregated Network Transactions Flow", desc: "Validate transaction values, audit referral exchanges, and check scaling performance." },
              ].map((item, idx) => (
                <div 
                  key={idx}
                  className="flex items-start gap-4 p-4 rounded-2xl border border-neutral-100/80 bg-neutral-50/40 text-neutral-400"
                >
                  <div className="w-5 h-5 rounded-lg bg-primary border border-primary flex items-center justify-center shrink-0 mt-0.5 shadow-md shadow-primary/10 text-white">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-black tracking-tight text-neutral-400 line-through font-bold">
                      {item.label}
                    </span>
                    <p className="text-xs mt-1 text-neutral-400/80 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* REGIONAL AUDITS OVERVIEW WITH 3D BUSINESS HERO */}
        <motion.div 
          id="master-next-opportunity" 
          variants={itemVariants}
          className="glass-card rounded-[32px] p-6 shadow-xl relative overflow-hidden group hover-lift transition-all duration-500"
        >
          {/* Subtle gradient highlights */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none transition-transform duration-700 group-hover:scale-110" />
          
          <div className="flex flex-col md:flex-row gap-6 items-center justify-between relative z-10">
            {/* Visual 3D Asset Cover */}
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white/50 border border-neutral-100 p-0.5 shrink-0 shadow-md animate-float">
              <img src={businessHeroImg} alt="3D Supreme Business Character Hero" className="w-full h-full object-contain" />
            </div>
            
            <div className="space-y-1.5 flex-1 min-w-0 text-center md:text-left">
              <span className="text-[9px] bg-primary/10 text-primary px-3 py-1 rounded-full font-black uppercase tracking-widest inline-block">
                System Telemetry
              </span>
              <h4 className="text-base font-black text-neutral-950 uppercase tracking-tight mt-1">
                Verify Chapter Onboarding Registrations
              </h4>
              <p className="text-xs text-neutral-500 leading-relaxed">
                There are newly registered members awaiting official assignment to their local chapters. Review pending membership requests and finalize category authorizations.
              </p>
            </div>
            
            <Link 
              to="/members" 
              className="bg-neutral-950 text-white px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary transition-all duration-300 shadow-lg shadow-neutral-900/10 whitespace-nowrap shrink-0 group-hover:-translate-y-0.5"
            >
              Approve Partners
            </Link>
          </div>
        </motion.div>

        {/* GLOBAL TELEMETRY OPERATIONS TIMELINE */}
        <motion.div 
          id="master-recent-activity" 
          variants={itemVariants}
          className="bg-white rounded-[32px] p-6 sm:p-8 border border-neutral-100 shadow-xl shadow-neutral-100/30"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400 block">System Log</span>
              <h3 className="text-xl font-black text-neutral-900 tracking-tight uppercase mt-1">
                Global Network Activity
              </h3>
            </div>
          </div>

          <div className="relative border-l border-neutral-100 pl-8 ml-4 space-y-8 pt-2">
            {finalRecentActivities.length > 0 ? (
              finalRecentActivities.map((act) => {
                const IconComponent = act.icon;
                return (
                  <div key={act.id} className="relative group">
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
                No active global telemetry logs generated today
              </div>
            )}
          </div>
        </motion.div>

      </div>

      {/* RIGHT COLUMN: Executive AI Smart Advisor, Global Performance scorecard, Quick controls */}
      <div className="lg:col-span-4 space-y-8">
        
        {/* REGIONAL OPERATIONS ADVISOR (SMART AI ADVISOR) */}
        <motion.div 
          id="master-smart-recommendation" 
          variants={itemVariants}
          className="bg-[#0c0c0c] text-white border border-neutral-900 rounded-[32px] p-6 shadow-2xl relative overflow-hidden group"
        >
          {/* Subtle glow highlight */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-primary/20 rounded-full blur-2xl transition-transform duration-700 group-hover:scale-110 pointer-events-none" />
          
          <div className="flex flex-col gap-5 relative z-10">
            {/* Header badges */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-1 rounded">
                  Operations Advisor
                </span>
                <span className="text-[8px] bg-white/10 text-white/90 px-2 py-0.5 rounded font-black uppercase tracking-widest">
                  SMART SYSTEM
                </span>
              </div>
              <div className="p-2 bg-primary/15 text-primary rounded-xl shrink-0">
                <Sparkles size={14} className="animate-pulse" />
              </div>
            </div>

            {/* Split layout: 3D robot advisor & text */}
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 p-0.5 shrink-0 shadow-md">
                <img src={robotAdvisorImg} alt="Strategic AI Advisor" className="w-full h-full object-contain" />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <h4 className="text-sm font-black text-white uppercase tracking-tight leading-snug">
                  Cross-Chapter Sync Strategy
                </h4>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Global transaction volume has accelerated by <span className="font-bold text-white">18%</span> this quarter. Direct chapter leaders to prioritize visitor sectors matching complementary vacancies to compound regional multipliers!
                </p>
              </div>
            </div>

            {/* Directive Action button */}
            <div className="pt-2">
              <button 
                onClick={() => setActiveTab('reports')}
                className="w-full text-center bg-primary hover:bg-red-700 text-white text-xs font-black py-3 rounded-xl uppercase tracking-widest inline-flex items-center justify-center gap-2 transition-all group-hover:shadow-lg group-hover:shadow-primary/15"
              >
                <span>Analyze Metrics</span>
                <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* GLOBAL PERFORMANCE SCORECARD */}
        <motion.div 
          id="master-weekly-progress" 
          variants={itemVariants}
          className="bg-white rounded-[32px] p-6 border border-neutral-100 shadow-xl shadow-neutral-100/30 space-y-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[9px] text-neutral-400 uppercase font-black tracking-widest block">Enterprise Status</span>
              <h4 className="text-sm font-black text-neutral-950 uppercase tracking-tight">Global Health score</h4>
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider bg-primary text-white px-3 py-1.5 rounded-full shrink-0">
              {networkHealthScore > 80 ? '🏆 ELITE SYSTEM' : '🥈 STABLE'}
            </span>
          </div>

          <div className="flex items-center gap-6">
            {/* Health Score ring in Crimson Red */}
            <div className="relative shrink-0 flex items-center justify-center w-24 h-24 bg-neutral-50/50 rounded-full border border-neutral-100">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="48" cy="48" r="38" stroke="#F4F4F5" strokeWidth="6" fill="transparent" />
                <circle
                  cx="48" cy="48" r="38" stroke="#D32F2F" strokeWidth="6" fill="transparent"
                  strokeDasharray={239}
                  strokeDashoffset={239 - (239 * networkHealthScore) / 100}
                  className="transition-all duration-1000 ease-out"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-xl font-black text-neutral-900 leading-none">{networkHealthScore}</span>
                <span className="text-[8px] text-neutral-400 font-extrabold uppercase mt-1 tracking-wider">Index</span>
              </div>
            </div>

            <div className="flex-1 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-neutral-50">
                <span className="text-neutral-500 font-black uppercase text-[9px] tracking-wider font-sans">Fastest growing</span>
                <span className="font-black text-primary uppercase bg-primary/5 px-2.5 py-0.5 rounded-full truncate max-w-[120px]">SSK Founders</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 font-black uppercase text-[9px] tracking-wider font-sans">Top performing</span>
                <span className="font-black text-neutral-950 uppercase bg-neutral-100 px-2.5 py-0.5 rounded-full truncate max-w-[120px]">SSK Elite</span>
              </div>
            </div>
          </div>

          {/* Operational Metrics list */}
          <div className="pt-4 border-t border-neutral-100 space-y-3.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-neutral-500 font-medium">Global Roster</span>
              <span className="font-black text-neutral-950">{globalMemberCount} Partners</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-500 font-medium">Active Chapter Hubs</span>
              <span className="font-black text-neutral-950">{globalChapterCount} Hubs</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-500 font-medium">Aggregate Transactions</span>
              <span className="font-black text-primary font-mono">₹{globalBusinessGenerated.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-500 font-medium">Referral Slips Exchanged</span>
              <span className="font-black text-neutral-950">{globalReferralsCount} Passed</span>
            </div>
          </div>

          {/* Core system status ping */}
          <div className="pt-2.5 border-t border-neutral-50 flex items-center gap-2.5 bg-neutral-50/50 p-3.5 rounded-2xl border border-neutral-100/80">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-neutral-600 font-black uppercase tracking-wider">All chapters online & compliant</span>
          </div>
        </motion.div>

        {/* ENTERPRISE OPERATIONS CONSOLE QUICK ACTION GRID */}
        <motion.div id="master-quick-actions" variants={itemVariants} className="space-y-4">
          <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400 ml-1">Enterprise Console</h4>
          <div className="grid grid-cols-2 gap-4">
            
            <Link 
              to="/members" 
              className="bg-white p-5 rounded-[24px] border border-neutral-100 shadow-lg shadow-neutral-100/30 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group flex flex-col justify-between min-h-[130px]"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                <Users size={16} />
              </div>
              <div className="mt-4">
                <h4 className="text-xs font-black text-neutral-800 uppercase tracking-wider">Members Directory</h4>
                <p className="text-[10px] text-neutral-400 mt-1 leading-snug">Onboard partners globally.</p>
              </div>
            </Link>

            <Link 
              to="/admins" 
              className="bg-white p-5 rounded-[24px] border border-neutral-100 shadow-lg shadow-neutral-100/30 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group flex flex-col justify-between min-h-[130px]"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                <Shield size={16} />
              </div>
              <div className="mt-4">
                <h4 className="text-xs font-black text-neutral-800 uppercase tracking-wider">Create Chapter</h4>
                <p className="text-[10px] text-neutral-400 mt-1 leading-snug">Authorize chapter admins.</p>
              </div>
            </Link>

            <Link 
              to="/meetings" 
              className="bg-white p-5 rounded-[24px] border border-neutral-100 shadow-lg shadow-neutral-100/30 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group flex flex-col justify-between min-h-[130px]"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                <Calendar size={16} />
              </div>
              <div className="mt-4">
                <h4 className="text-xs font-black text-neutral-800 uppercase tracking-wider">Setup Meeting</h4>
                <p className="text-[10px] text-neutral-400 mt-1 leading-snug">Setup new calendars.</p>
              </div>
            </Link>

            <button 
              onClick={() => setActiveTab('reports')} 
              className="bg-white p-5 rounded-[24px] border border-neutral-100 shadow-lg shadow-neutral-100/30 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group flex flex-col justify-between text-left min-h-[130px]"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                <Activity size={16} />
              </div>
              <div className="mt-4">
                <h4 className="text-xs font-black text-neutral-800 uppercase tracking-wider">View Reports</h4>
                <p className="text-[10px] text-neutral-400 mt-1 leading-snug">Access performance index.</p>
              </div>
            </button>

          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
