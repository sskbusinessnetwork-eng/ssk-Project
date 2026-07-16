import os

member_view_content = """import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Share2, Handshake, UserPlus, Users, Clock, Calendar, 
  Target, Shield, Award, ChevronRight, FileText, BarChart3, TrendingUp, CheckSquare, ChevronDown
} from 'lucide-react';
import { Meeting, UserProfile } from '../types';
import { format } from 'date-fns';

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
  completedFocusCount,
  focusProgressPercent,
  activeFocusTasks,
  finalRecentActivities,
  businessGrowthScore,
}: MemberCompanionViewProps) {
  
  const tasks = [
    { key: 'attendMeeting', label: 'Attend Weekly Meeting', desc: 'Show commitment to your local chapter syncs', isDone: activeFocusTasks.attendMeeting, link: '/meetings', linkText: 'JOIN', iconColor: 'text-[#8B5CF6]', bgColor: 'bg-[#F5F3FF]', icon: Calendar },
    { key: 'passReferral', label: 'Pass a Warm Referral', desc: 'Share commercial opportunities', isDone: activeFocusTasks.passReferral, link: '/refer', linkText: 'PASS SLIP', iconColor: 'text-[#F59E0B]', bgColor: 'bg-[#FFFBEB]', icon: Share2 },
    { key: 'scheduleOneToOne', label: 'Book a 1-to-1 Session', desc: 'Coordinate synergy meetings', isDone: activeFocusTasks.scheduleOneToOne, link: '/one-to-one', linkText: 'BOOK 1-1', iconColor: 'text-[#3B82F6]', bgColor: 'bg-[#EFF6FF]', icon: Handshake },
    { key: 'followUpReferral', label: 'Follow Up Referral Slips', desc: 'Track conversion status on active leads', isDone: activeFocusTasks.followUpReferral, link: '/refer?tab=received', linkText: 'MY SLIPS', iconColor: 'text-[#10B981]', bgColor: 'bg-[#ECFDF5]', icon: CheckSquare },
    { key: 'inviteGuest', label: 'Invite a Business Peer', desc: 'Expand network strength', isDone: activeFocusTasks.inviteGuest, link: '/guests', linkText: 'INVITE', iconColor: 'text-[#F43F5E]', bgColor: 'bg-[#FFF1F2]', icon: UserPlus }
  ];

  const operations = [
    { icon: Share2, label: 'Pass Referral', desc: 'Generate leads', path: '/refer', color: 'text-[#EF4444]', bg: 'bg-[#FEF2F2]', iconBg: 'bg-white text-[#EF4444]' },
    { icon: Calendar, label: 'Book 1-to-1', desc: 'Schedule sync', path: '/one-to-one', color: 'text-[#3B82F6]', bg: 'bg-[#EFF6FF]', iconBg: 'bg-white text-[#3B82F6]' },
    { icon: UserPlus, label: 'Invite Member', desc: 'Grow your network', path: '/guests', color: 'text-[#10B981]', bg: 'bg-[#ECFDF5]', iconBg: 'bg-white text-[#10B981]' },
    { icon: Users, label: 'Find Members', desc: 'Explore directory', path: '/directory', color: 'text-[#F59E0B]', bg: 'bg-[#FFFBEB]', iconBg: 'bg-white text-[#F59E0B]' }
  ];

  return (
    <div className="space-y-6">
      
      {/* SECOND ROW SPLIT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Workspace Checklist */}
        <div className="lg:col-span-4 bg-gradient-to-b from-[#F3E8FF] to-[#FAF5FF] rounded-[32px] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-[#E9D5FF] flex flex-col h-full relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[20px] font-black text-[#111827] tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#A855F7] to-[#7E22CE] text-white flex items-center justify-center shadow-md">
                <CheckSquare size={20} />
              </div>
              Workspace Checklist
            </h3>
            <span className="text-[11px] font-bold text-[#7E22CE] bg-[#F3E8FF] px-3 py-1.5 rounded-full uppercase tracking-wider border border-[#E9D5FF]">
              0 / 5 COMPLETE
            </span>
          </div>

          <div className="space-y-4 flex-1">
            {tasks.map((task) => (
              <div key={task.key} className="flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl ${task.bgColor} ${task.iconColor} flex items-center justify-center shrink-0 border border-white shadow-sm`}>
                    <task.icon size={20} />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-bold text-[#111827] tracking-tight">{task.label}</h4>
                    <p className="text-[12px] text-neutral-500 font-medium leading-snug">{task.desc}</p>
                  </div>
                </div>
                <button className={`bg-white border font-bold text-[11px] px-3 py-1.5 rounded-lg transition-colors shadow-sm tracking-wider ${task.iconColor.replace('text-', 'border-').replace('text-', 'text-')} hover:bg-neutral-50 shrink-0`}>
                  {task.linkText}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6">
            <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest mb-3">
              <span className="text-[#111827]">Daily Progress</span>
              <span className="text-[#111827]">20%</span>
            </div>
            <div className="w-full h-3 bg-white/60 rounded-full overflow-hidden border border-white">
              <div className="h-full bg-gradient-to-r from-[#C084FC] to-[#9333EA] rounded-full w-[20%]" />
            </div>
          </div>
        </div>

        {/* Business Overview */}
        <div className="lg:col-span-5 bg-gradient-to-b from-[#EFF6FF] to-[#F8FAFC] rounded-[32px] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-[#DBEAFE] flex flex-col relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[20px] font-black text-[#111827] tracking-tight">Business Overview</h3>
            <button className="flex items-center gap-2 bg-white border border-[#DBEAFE] px-4 py-2 rounded-full text-[13px] font-bold text-[#111827] shadow-sm">
              This Month <ChevronDown size={14} />
            </button>
          </div>
          
          <div className="flex items-center gap-6 mb-6">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#EF4444]" /><span className="text-[12px] font-bold text-[#111827]">Revenue</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#8B5CF6]" /><span className="text-[12px] font-bold text-[#111827]">Referrals</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#3B82F6]" /><span className="text-[12px] font-bold text-[#111827]">Deals</span></div>
          </div>

          <div className="flex-1 w-full relative min-h-[200px] mb-6">
            {/* Mockup SVG Chart matching the reference */}
            <svg viewBox="0 0 400 200" className="w-full h-full preserve-3d" preserveAspectRatio="none">
              <defs>
                <linearGradient id="area-blue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2"/>
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <line x1="0" y1="50" x2="400" y2="50" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="100" x2="400" y2="100" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="150" x2="400" y2="150" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 4" />
              
              <text x="0" y="55" fill="#94A3B8" fontSize="10">60K</text>
              <text x="0" y="105" fill="#94A3B8" fontSize="10">40K</text>
              <text x="0" y="155" fill="#94A3B8" fontSize="10">20K</text>

              {/* Red Line */}
              <path d="M 30 180 L 80 160 L 130 140 L 180 100 L 230 120 L 280 80 L 330 90 L 380 40" fill="none" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="280" cy="80" r="5" fill="#EF4444" stroke="#fff" strokeWidth="2" />
              <rect x="250" y="40" width="60" height="24" rx="4" fill="#fff" stroke="#E2E8F0" />
              <text x="280" y="55" fill="#111827" fontSize="10" fontWeight="bold" textAnchor="middle">₹24.50L</text>

              {/* Blue Line with Area */}
              <path d="M 30 190 L 80 180 L 130 170 L 180 160 L 230 180 L 280 150 L 330 140 L 380 110 L 380 200 L 30 200 Z" fill="url(#area-blue)" />
              <path d="M 30 190 L 80 180 L 130 170 L 180 160 L 230 180 L 280 150 L 330 140 L 380 110" fill="none" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              
              {/* Purple Line */}
              <path d="M 30 170 L 80 190 L 130 180 L 180 190 L 230 150 L 280 170 L 330 190 L 380 180" fill="none" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="flex justify-between px-8 text-[10px] font-bold text-neutral-400 mt-2">
              <span>01 Jul</span><span>07 Jul</span><span>14 Jul</span><span>21 Jul</span><span>28 Jul</span><span>31 Jul</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 pt-6 border-t border-[#DBEAFE]">
            <div>
              <span className="text-[11px] font-bold text-[#64748B] block mb-1">Revenue</span>
              <div className="text-[18px] font-black text-[#111827]">₹24.50L</div>
              <span className="text-[11px] font-bold text-[#10B981] flex items-center gap-1 mt-1"><TrendingUp size={10}/> 18%</span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-[#64748B] block mb-1">Referrals</span>
              <div className="text-[18px] font-black text-[#111827]">842</div>
              <span className="text-[11px] font-bold text-[#10B981] flex items-center gap-1 mt-1"><TrendingUp size={10}/> 8%</span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-[#64748B] block mb-1">Deals Closed</span>
              <div className="text-[18px] font-black text-[#111827]">128</div>
              <span className="text-[11px] font-bold text-[#10B981] flex items-center gap-1 mt-1"><TrendingUp size={10}/> 24%</span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-[#64748B] block mb-1">Attendance</span>
              <div className="text-[18px] font-black text-[#111827]">76%</div>
              <span className="text-[11px] font-bold text-[#10B981] flex items-center gap-1 mt-1"><TrendingUp size={10}/> 16%</span>
            </div>
          </div>
        </div>

        {/* Growth Scorecard */}
        <div className="lg:col-span-3 bg-gradient-to-b from-[#FFF7ED] to-[#FFFAF5] rounded-[32px] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-[#FFEDD5] flex flex-col items-center">
           <div className="flex items-center justify-between w-full mb-8">
             <h3 className="text-[20px] font-black text-[#111827] tracking-tight">Growth Scorecard</h3>
             <button className="flex items-center gap-1 bg-white border border-[#FFEDD5] px-3 py-1.5 rounded-full text-[11px] font-bold text-[#111827] shadow-sm">
               Rising <ChevronDown size={14} />
             </button>
           </div>
           
           <div className="relative w-[200px] h-[200px] flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {/* Outermost Ring (Orange) */}
                <circle cx="50" cy="50" r="45" stroke="#FFEDD5" strokeWidth="8" fill="transparent" />
                <circle cx="50" cy="50" r="45" stroke="#F97316" strokeWidth="8" fill="transparent" strokeDasharray="282.7" strokeDashoffset={282.7 * 0.12} strokeLinecap="round" />
                
                {/* Middle Ring (Red) */}
                <circle cx="50" cy="50" r="35" stroke="#FFEDD5" strokeWidth="8" fill="transparent" />
                <circle cx="50" cy="50" r="35" stroke="#EF4444" strokeWidth="8" fill="transparent" strokeDasharray="219.9" strokeDashoffset={219.9 * 0.16} strokeLinecap="round" />
                
                {/* Inner Ring (Blue) */}
                <circle cx="50" cy="50" r="25" stroke="#FFEDD5" strokeWidth="8" fill="transparent" />
                <circle cx="50" cy="50" r="25" stroke="#3B82F6" strokeWidth="8" fill="transparent" strokeDasharray="157" strokeDashoffset={157 * 0.22} strokeLinecap="round" />
              </svg>
           </div>

           <div className="w-full mt-6 space-y-3">
              <div className="flex items-center justify-between text-[13px] font-bold text-[#111827]">
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]"/> Network Strength</div>
                <span>92%</span>
              </div>
              <div className="flex items-center justify-between text-[13px] font-bold text-[#111827]">
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#F97316]"/> Referrals</div>
                <span>84%</span>
              </div>
              <div className="flex items-center justify-between text-[13px] font-bold text-[#111827]">
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]"/> Engagement</div>
                <span>78%</span>
              </div>
              <div className="flex items-center justify-between text-[13px] font-bold text-[#111827]">
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"/> Meetings</div>
                <span>88%</span>
              </div>
           </div>
           
           <div className="w-full mt-8 flex items-center justify-between border-t border-[#FFEDD5] pt-6">
             <div className="flex flex-col">
               <span className="text-[13px] font-bold text-[#111827]">Overall Score</span>
               <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider w-max mt-1">Excellent</div>
             </div>
             <span className="text-[40px] font-black text-[#111827] leading-none">85%</span>
           </div>

           {/* Active Recommendation */}
           <div className="w-full bg-white rounded-2xl p-4 mt-6 border border-[#FFEDD5] shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer">
             <div className="w-10 h-10 rounded-full bg-[#FFFBEB] flex items-center justify-center shrink-0">
               <Star size={20} className="text-[#F59E0B]" />
             </div>
             <div className="flex-1">
               <h4 className="text-[13px] font-bold text-[#111827]">Active Recommendation</h4>
               <p className="text-[11px] text-[#64748B] font-medium leading-snug mt-0.5">Schedule 1-to-1 sessions to boost network visibility.</p>
             </div>
             <ChevronRight size={16} className="text-[#94A3B8]" />
           </div>
        </div>
      </div>

      {/* THIRD ROW: Operations, Activity, Top Members */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Core Operations */}
        <div className="lg:col-span-4 bg-white rounded-[32px] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-neutral-100 flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[20px] font-black text-[#111827] tracking-tight">Core Operations</h3>
            <span className="text-[12px] font-bold text-[#EF4444] uppercase tracking-wider cursor-pointer">View All</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 flex-1">
            {operations.map((op, idx) => (
              <Link key={idx} to={op.path} className={`rounded-[24px] p-6 flex flex-col items-center justify-center text-center ${op.bg} hover:-translate-y-1 transition-transform cursor-pointer group`}>
                <div className={`w-14 h-14 rounded-full ${op.iconBg} shadow-sm flex items-center justify-center mb-4`}>
                  <op.icon size={24} />
                </div>
                <h4 className="text-[14px] font-bold text-[#111827] mb-1">{op.label}</h4>
                <p className="text-[11px] text-[#64748B] font-medium">{op.desc}</p>
                <div className={`mt-4 w-8 h-8 rounded-full bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${op.color}`}>
                  <ArrowRight size={16} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-4 bg-[#F8FAFC] rounded-[32px] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-[#E2E8F0] flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[20px] font-black text-[#111827] tracking-tight">Recent Activity</h3>
            <span className="text-[12px] font-bold text-[#EF4444] uppercase tracking-wider cursor-pointer">View All</span>
          </div>
          <div className="space-y-6 flex-1 overflow-y-auto pr-2">
            {[
              { icon: Target, title: 'New Partner Joined', desc: 'Sudarshan Vagale registered as Real Estate', time: '05:30 AM', color: 'text-[#EF4444]', bg: 'bg-[#FEF2F2]' },
              { icon: Share2, title: 'Referral Passed', desc: 'Commercial lead forwarded to partner', time: 'Yesterday', color: 'text-[#F59E0B]', bg: 'bg-[#FFFBEB]' },
              { icon: Calendar, title: 'Meeting Completed', desc: '1-to-1 with Real Estate Chapter', time: '12 Jul', color: 'text-[#10B981]', bg: 'bg-[#ECFDF5]' },
              { icon: UserPlus, title: 'New Member Added', desc: 'Amit Patil joined the network', time: '10 Jul', color: 'text-[#3B82F6]', bg: 'bg-[#EFF6FF]' },
              { icon: FileText, title: 'Business Planning Session', desc: 'Virtual meeting scheduled', time: '08 Jul', color: 'text-[#8B5CF6]', bg: 'bg-[#F5F3FF]' },
            ].map((act, idx) => (
              <div key={idx} className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${act.bg} ${act.color} flex items-center justify-center shrink-0`}>
                  <act.icon size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="text-[14px] font-bold text-[#111827]">{act.title}</h4>
                  <p className="text-[12px] text-[#64748B] font-medium mt-0.5">{act.desc}</p>
                </div>
                <span className="text-[10px] font-bold text-[#94A3B8] shrink-0 mt-1">{act.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performing Members */}
        <div className="lg:col-span-4 bg-white rounded-[32px] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-neutral-100 flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[20px] font-black text-[#111827] tracking-tight">Top Performing Members</h3>
            <span className="text-[12px] font-bold text-[#EF4444] uppercase tracking-wider cursor-pointer">View All</span>
          </div>
          
          <div className="grid grid-cols-3 gap-4 flex-1">
            {[
              { pos: 1, name: 'Amit Patil', type: 'Real Estate', score: 128, trend: '+18%' },
              { pos: 2, name: 'Neha Shah', type: 'Finance', score: 94, trend: '+12%' },
              { pos: 3, name: 'Raj Mehta', type: 'IT Services', score: 76, trend: '+8%' }
            ].map((member, idx) => (
              <div key={idx} className="flex flex-col items-center bg-[#F8FAFC] rounded-[24px] p-4 text-center border border-neutral-100 hover:-translate-y-1 transition-transform">
                <div className="relative mb-3">
                  <div className="w-16 h-16 rounded-full border-4 border-white shadow-sm overflow-hidden bg-neutral-200">
                    <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`} alt="Member" className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-[#F59E0B] text-white flex items-center justify-center text-[10px] font-black border-2 border-white shadow-sm">
                    {member.pos}
                  </div>
                </div>
                <h4 className="text-[13px] font-bold text-[#111827] leading-tight">{member.name}</h4>
                <span className="text-[10px] font-bold text-[#64748B] mt-1">{member.type}</span>
                <div className="text-[20px] font-black text-[#111827] mt-3">{member.score}</div>
                <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-widest mt-0.5 mb-2">Referrals</span>
                <span className="text-[11px] font-bold text-[#10B981] flex items-center gap-1 bg-[#ECFDF5] px-2 py-0.5 rounded-md"><TrendingUp size={10}/> {member.trend}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
"""

with open('src/components/MemberCompanionView.tsx', 'w') as f:
    f.write(member_view_content)
