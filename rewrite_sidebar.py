import os

sidebar_content = """import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Calendar, Share2, Award, UserPlus, User, LogOut,
  Shield, Bell, X, Sparkles, Layers, ChevronLeft, ChevronRight, Activity, FileText,
  MessageSquare, Settings, HelpCircle, LogIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { getDashboardPath as getDashboardPathUtil } from '../utils/authUtils';
import { differenceInDays } from 'date-fns';
import { firestoreService } from '../services/firestoreService';
import { notificationService } from '../services/notificationService';
import { where } from 'firebase/firestore';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }: SidebarProps) {
  const { profile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!profile?.uid) return;
    const unsubscribe = firestoreService.subscribe(
      'notifications',
      [
        where('userId', '==', profile.uid),
        where('read', '==', false)
      ],
      (notifications) => {
        setUnreadCount(notifications.length);
      }
    );
    return () => unsubscribe();
  }, [profile?.uid]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
      navigate('/login', { replace: true });
    }
  };

  const getDashboardPath = () => getDashboardPathUtil(profile?.role);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Home', path: '/analytics', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER'] },
    { icon: Users, label: 'Network', path: '/network', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER'] },
    { icon: Calendar, label: 'Meetings', path: '/meetings', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER'] },
    { icon: Layers, label: 'One-to-One', path: '/one-to-one', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER'] },
    { icon: Share2, label: 'Referrals', path: '/refer', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER'] },
    { icon: FileText, label: 'Directory', path: '/directory', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER'] },
    { icon: Activity, label: 'Reports', path: '/reports', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER'] },
    { icon: MessageSquare, label: 'Messages', path: '/messages', badge: 3, roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER'] },
    { icon: Settings, label: 'Settings', path: '/settings', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER'] },
  ];

  const visibleMenuItems = menuItems.filter(item => 
    profile?.role && item.roles.includes(profile.role)
  );

  return (
    <div className={cn(
      "h-screen bg-[#11131A] flex flex-col fixed left-0 top-0 z-[60] transition-all duration-300 ease-[0.16,1,0.3,1] border-r border-[#1F2937]",
      "hidden md:flex", 
      isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      isCollapsed ? "lg:w-[78px]" : "w-[290px] sm:w-[320px] lg:w-[280px]"
    )}>
      
      {/* Brand & Profile Section */}
      <div className="p-6 border-b border-[#1F2937]/50 flex flex-col shrink-0 relative">
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onClose) onClose();
          }}
          type="button"
          aria-label="Close sidebar"
          className="lg:hidden absolute top-4 right-4 p-2 hover:bg-[#1F2937] rounded-xl text-[#9CA3AF] hover:text-white transition-colors cursor-pointer relative z-[70]"
        >
          <X size={18} />
        </button>

        {!isCollapsed && (
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-black text-xl tracking-tighter">
              SSK
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold text-[14px] leading-tight">BUSINESS</span>
              <span className="text-white font-bold text-[14px] leading-tight">NETWORK</span>
              <span className="text-[9px] text-neutral-400 uppercase tracking-widest mt-0.5">Enterprise Platform</span>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="flex justify-center mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-black text-xl tracking-tighter">
              SSK
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <img 
              src={profile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || 'User')}&background=DC2626&color=ffffff`} 
              alt="Profile" 
              className={cn("rounded-full border-2 border-[#1F2937] object-cover bg-white shadow-sm", isCollapsed ? "w-10 h-10 mx-auto" : "w-12 h-12")}
              referrerPolicy="no-referrer"
            />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <span className="text-[14px] font-bold text-white leading-tight truncate">
                {profile?.name || 'User'}
              </span>
              <div className="mt-1">
                <span className="text-[10px] font-bold text-white bg-primary px-2 py-0.5 rounded-full uppercase tracking-wider">
                  PLATINUM MEMBER
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <span className="text-[12px] font-medium text-neutral-400">Online</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto custom-scrollbar py-4 px-4 flex flex-col gap-1.5">
        {visibleMenuItems.map((item) => {
          const isActive = location.pathname === item.path || 
                          (item.path === '/analytics' && location.pathname === '/dashboard');
          
          return (
            <div key={item.path} className="relative group">
              <Link
                to={item.path}
                onClick={() => onClose?.()}
                className={cn(
                  "flex items-center gap-3.5 px-3.5 py-3 rounded-[16px] transition-all duration-300 relative overflow-hidden",
                  isActive 
                    ? "text-white font-bold bg-gradient-to-r from-primary to-[#FF6B6B] shadow-[0_4px_15px_rgba(220,38,38,0.25)]" 
                    : "text-[#9CA3AF] hover:bg-[#1F2937]/80 hover:text-white font-semibold"
                )}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] animate-[shimmer_2s_infinite]" />
                )}
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} className={cn(
                  "shrink-0 transition-transform duration-300 relative z-10",
                  isActive ? "text-white" : "group-hover:scale-110"
                )} />
                
                {!isCollapsed && (
                  <span className="text-[14px] whitespace-nowrap flex-1 relative z-10">
                    {item.label}
                  </span>
                )}

                {!isCollapsed && item.badge && (
                  <span className="bg-primary text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm relative z-10">
                    {item.badge}
                  </span>
                )}
              </Link>
            </div>
          );
        })}
      </div>

      {/* Bottom Cards */}
      {!isCollapsed && (
        <div className="p-4 flex flex-col gap-4 mt-auto">
          {/* Upgrade Card */}
          <div className="rounded-[20px] p-5 relative overflow-hidden bg-gradient-to-br from-[#2D1B4E] to-[#140C27] border border-[#4C2A8A]/30">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#7C3AED]/20 rounded-full blur-3xl pointer-events-none" />
            
            <h4 className="text-[13px] font-bold text-white mb-1">Upgrade to <span className="text-[#A78BFA]">Platinum</span></h4>
            <p className="text-[11px] text-[#8B5CF6] font-medium leading-relaxed mb-4 max-w-[180px]">
              Unlock advanced analytics and priority support.
            </p>
            <div className="absolute right-2 bottom-8 text-[#FBBF24] opacity-80">
               {/* Crown Icon Placeholder */}
               <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4h20M2 20h20M4 4v16M20 4v16M9 4v16M15 4v16"/></svg>
            </div>
            
            <button className="w-full bg-gradient-to-r from-primary to-[#FF6B6B] text-white font-bold text-[13px] py-2.5 rounded-xl shadow-[0_4px_15px_rgba(220,38,38,0.3)] hover:shadow-[0_6px_20px_rgba(220,38,38,0.4)] transition-all hover:scale-[1.02]">
              Upgrade Now
            </button>
          </div>

          {/* Network Strength */}
          <div className="rounded-[20px] p-5 relative overflow-hidden bg-[#1A1D24] border border-[#2D333D]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[13px] font-bold text-white">Network Strength</span>
              <HelpCircle size={14} className="text-neutral-500" />
            </div>
            <div className="flex items-end justify-between">
              <div>
                <span className="text-[28px] font-black text-white leading-none block">92%</span>
                <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-widest mt-1 block">Excellent</span>
              </div>
              <div className="relative w-12 h-12">
                 <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                   <circle cx="50" cy="50" r="40" stroke="#2D333D" strokeWidth="8" fill="none" strokeDasharray="188 251" strokeLinecap="round" />
                   <circle cx="50" cy="50" r="40" stroke="#10B981" strokeWidth="8" fill="none" strokeDasharray="140 251" strokeLinecap="round" />
                 </svg>
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                 {/* Needle */}
                 <div className="absolute top-1/2 left-1/2 w-5 h-0.5 bg-white origin-left -rotate-45" />
              </div>
            </div>
            {/* Tiny Bar Chart */}
            <div className="flex items-end gap-1.5 h-8 mt-4">
              <div className="w-full bg-[#10B981] rounded-t-sm" style={{height: '30%'}} />
              <div className="w-full bg-[#10B981] rounded-t-sm" style={{height: '50%'}} />
              <div className="w-full bg-[#10B981] rounded-t-sm" style={{height: '40%'}} />
              <div className="w-full bg-[#10B981] rounded-t-sm" style={{height: '70%'}} />
              <div className="w-full bg-[#10B981] rounded-t-sm" style={{height: '60%'}} />
              <div className="w-full bg-[#DC2626] rounded-t-sm shadow-[0_0_8px_rgba(220,38,38,0.5)]" style={{height: '90%'}} />
              <div className="w-full bg-[#10B981] rounded-t-sm" style={{height: '40%'}} />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 px-2">
            <button className="text-neutral-400 hover:text-white transition-colors">
              <Settings size={18} />
            </button>
            <button className="text-neutral-400 hover:text-white transition-colors">
              <HelpCircle size={18} />
            </button>
            <button onClick={handleLogout} className="text-neutral-400 hover:text-white transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
"""

with open('src/components/Sidebar.tsx', 'w') as f:
    f.write(sidebar_content)
