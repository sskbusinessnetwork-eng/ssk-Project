import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Calendar, Share2, Award, UserPlus, User, LogOut,
  Shield, Bell, X, Sparkles, Layers, ChevronLeft, ChevronRight, Activity, FileText,
  MessageSquare, Settings, HelpCircle, LogIn, Crown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { getDashboardPath as getDashboardPathUtil } from '../utils/authUtils';
import { differenceInDays } from 'date-fns';
import { databaseService } from '../services/databaseService';
import { notificationService } from '../services/notificationService';
import {  where  } from '../lib/database';

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
    const unsubscribe = databaseService.subscribe(
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

  const menuItems: { icon: any; label: string; path: string; roles: string[]; badge?: number }[] = [
    { icon: LayoutDashboard, label: 'Home', path: '/analytics', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER'] },
    { icon: Users, label: 'Network', path: '/network', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN'] },
    { icon: Calendar, label: 'Meetings', path: '/meetings', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER'] },
    { icon: Layers, label: 'One-to-One', path: '/one-to-one', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER'] },
    { icon: Share2, label: 'Referrals', path: '/refer', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER'] },
    { icon: FileText, label: 'Directory', path: '/directory', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER'] },
    { icon: Activity, label: 'Reports', path: '/reports', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER'] },
    { icon: Award, label: 'Thank You Slips', path: '/thank-you-slips', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER'] },
    { icon: MessageSquare, label: 'Testimonials', path: '/testimonials', roles: ['CHAPTER_ADMIN', 'MEMBER'] },
    { icon: MessageSquare, label: 'Testimonial Reports', path: '/testimonial-reports', roles: ['MASTER_ADMIN'] },
    { icon: Crown, label: 'Manage Chapter', path: '/manage-chapter', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN'] },
    { icon: UserPlus, label: 'Guests', path: '/guests', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER'] },
    { icon: Settings, label: 'Settings', path: '/settings', roles: ['CHAPTER_ADMIN', 'MEMBER'] },
  ];

  const userRole = profile?.role || 'MEMBER';
  const visibleMenuItems = menuItems.filter(item => 
    item.roles.includes(userRole)
  );

  return (
    <div className={cn(
      "h-[100vh] bg-[#11131A] flex flex-col fixed left-0 top-0 border-r border-[#1F2937] transition-transform duration-300 ease-in-out",
      // Mobile/Tablet off-canvas drawer styling (<1024px)
      "w-[280px] md:w-[320px] z-[9999]",
      isOpen ? "translate-x-0" : "-translate-x-full",
      // Desktop persistent styling (>=1024px)
      "lg:translate-x-0 lg:z-30",
      isCollapsed ? "lg:w-[78px]" : "lg:w-[280px]"
    )}>
      
      {/* Brand Section (Max 64px) */}
      <div className="h-[64px] px-4 border-b border-[#1F2937]/50 flex items-center shrink-0 relative">
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onClose) onClose();
          }}
          type="button"
          aria-label="Close sidebar"
          className="lg:hidden absolute top-4 right-4 p-2 hover:bg-[#1F2937] rounded-xl text-[#9CA3AF] hover:text-white transition-colors cursor-pointer z-[70]"
        >
          <X size={18} />
        </button>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          {!isCollapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#E53935] flex items-center justify-center text-white font-black text-sm tracking-tighter shadow-[0_0_12px_rgba(229,57,53,0.4)]">
                SSK
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold text-[13px] leading-tight tracking-wide">BUSINESS NETWORK</span>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <div className="w-8 h-8 rounded-lg bg-[#E53935] flex items-center justify-center text-white font-black text-sm tracking-tighter shadow-[0_0_12px_rgba(229,57,53,0.4)]">
                SSK
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* User Profile (Compact) */}
      <div className="p-4 border-b border-[#1F2937]/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <img 
              src={profile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || 'User')}&background=E53935&color=ffffff`} 
              alt="Profile" 
              className={cn("rounded-full border border-[#1F2937] object-cover bg-white", isCollapsed ? "w-10 h-10 mx-auto" : "w-[48px] h-[48px]")}
              referrerPolicy="no-referrer"
            />
            {!isCollapsed && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#11131A] flex items-center justify-center">
                <span className="absolute w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping opacity-75" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </div>
            )}
          </div>
          {!isCollapsed && (
            <div className="flex flex-col flex-1 overflow-hidden justify-center">
              <span className="text-[14px] font-bold text-white leading-tight truncate mb-1">
                {profile?.name || 'User'}
              </span>
              <span className="text-[10px] font-bold text-white bg-[#E53935]/20 text-[#E53935] w-fit px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-[#E53935]/10">
                Member
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation (Scrollable Only) */}
      <style>
        {`
          .custom-thin-scrollbar::-webkit-scrollbar {
            width: 4px;
            opacity: 0;
            transition: opacity 0.3s;
          }
          .custom-thin-scrollbar:hover::-webkit-scrollbar {
            opacity: 1;
          }
          .custom-thin-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-thin-scrollbar::-webkit-scrollbar-thumb {
            background: #374151;
            border-radius: 10px;
          }
          .custom-thin-scrollbar:hover::-webkit-scrollbar-thumb {
            background: #4B5563;
          }
        `}
      </style>
      <div className="flex-1 overflow-y-auto custom-thin-scrollbar py-3 px-3 flex flex-col gap-[6px]">
        {visibleMenuItems.map((item) => {
          const isActive = location.pathname === item.path || 
                          (item.path === '/analytics' && location.pathname === '/dashboard');
          
          return (
            <div key={item.path} className="relative">
              <Link
                to={item.path}
                onClick={() => onClose?.()}
                className={cn(
                  "flex items-center gap-3 px-3 h-[46px] rounded-[14px] transition-all duration-300 relative overflow-hidden group",
                  isActive 
                    ? "text-white font-bold bg-[#E53935]/10 shadow-[0_0_15px_rgba(229,57,53,0.12)] border border-[#E53935]/20" 
                    : "text-[#9CA3AF] hover:bg-[#1F2937]/50 hover:text-white font-medium"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeNavIndicator" 
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#E53935] rounded-r-full shadow-[0_0_12px_rgba(229,57,53,0.8)]" 
                  />
                )}
                
                <motion.div
                  whileHover={{ scale: 1.12, rotate: 4 }}
                  transition={{ type: "spring", stiffness: 400, damping: 12 }}
                  className="relative z-10 shrink-0"
                >
                  <item.icon 
                    size={20} 
                    strokeWidth={isActive ? 2.5 : 2} 
                    className={cn(
                      "transition-colors duration-200",
                      isActive ? "text-[#E53935] drop-shadow-[0_0_8px_rgba(229,57,53,0.6)]" : "text-[#9CA3AF] group-hover:text-white"
                    )} 
                  />
                </motion.div>
                
                {!isCollapsed && (
                  <span className="text-[14px] whitespace-nowrap flex-1 relative z-10 font-semibold tracking-tight">
                    {item.label}
                  </span>
                )}

                {!isCollapsed && item.badge && (
                  <motion.span 
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="bg-[#E53935] text-white text-[10px] font-extrabold w-[18px] h-[18px] flex items-center justify-center rounded-full relative z-10 shadow-[0_0_8px_rgba(229,57,53,0.5)]"
                  >
                    {item.badge}
                  </motion.span>
                )}
              </Link>
            </div>
          );
        })}
      </div>

      {/* Bottom Cards (Sticky) */}
      <div className="shrink-0 p-3 flex flex-col gap-3 border-t border-[#1F2937]/50 bg-[#11131A] z-20">
        {/* Upgrade Card (Compact) */}
        {!isCollapsed && (
          <div className="rounded-[14px] p-3 relative overflow-hidden bg-gradient-to-br from-[#2D1B4E]/80 to-[#140C27] border border-[#4C2A8A]/30 flex items-center justify-between group cursor-pointer hover:border-[#4C2A8A]/60 transition-colors duration-200">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#7C3AED]/20 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex flex-col z-10">
              <h4 className="text-[12px] font-bold text-white flex items-center gap-1">
                Upgrade <Crown size={12} className="text-[#FBBF24]" />
              </h4>
              <p className="text-[10px] text-[#8B5CF6] font-medium max-w-[120px] truncate">
                Get priority features
              </p>
            </div>
            
            <button className="bg-primary/90 hover:bg-primary text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-sm transition-transform duration-200 group-hover:scale-105 z-10">
              Pro
            </button>
          </div>
        )}

        {/* Network Strength (Compact) */}
        {!isCollapsed && (
          <div className="rounded-[14px] p-3 relative overflow-hidden bg-[#1A1D24] border border-[#2D333D] h-[80px] flex items-center gap-3">
             <div className="relative w-10 h-10 shrink-0">
               <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                 <circle cx="50" cy="50" r="40" stroke="#2D333D" strokeWidth="12" fill="none" strokeDasharray="188 251" strokeLinecap="round" />
                 <circle cx="50" cy="50" r="40" stroke="#10B981" strokeWidth="12" fill="none" strokeDasharray="140 251" strokeLinecap="round" />
               </svg>
               <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-[10px]">
                 92%
               </div>
             </div>
             
             <div className="flex flex-col flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-white">Network</span>
                  <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider bg-emerald-500/10 px-1.5 py-0.5 rounded">Good</span>
                </div>
                {/* Mini Graph */}
                <div className="flex items-end gap-[2px] h-4 mt-auto">
                  <div className="w-full bg-[#10B981]/50 rounded-t-[1px]" style={{height: '30%'}} />
                  <div className="w-full bg-[#10B981]/60 rounded-t-[1px]" style={{height: '50%'}} />
                  <div className="w-full bg-[#10B981]/70 rounded-t-[1px]" style={{height: '40%'}} />
                  <div className="w-full bg-[#10B981]/80 rounded-t-[1px]" style={{height: '70%'}} />
                  <div className="w-full bg-[#10B981]/90 rounded-t-[1px]" style={{height: '60%'}} />
                  <div className="w-full bg-[#DC2626] rounded-t-[1px] shadow-[0_0_4px_rgba(220,38,38,0.5)]" style={{height: '90%'}} />
                  <div className="w-full bg-[#10B981] rounded-t-[1px]" style={{height: '40%'}} />
                </div>
             </div>
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2 border-t border-[#1F2937]/50 mt-1">
          <button 
            onClick={onToggleCollapse} 
            className="flex items-center gap-3 text-neutral-400 hover:text-white transition-colors p-2 rounded-xl hover:bg-[#1F2937] text-[13px] font-bold w-full justify-start outline-none"
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            {!isCollapsed && <span className="font-semibold text-[#9CA3AF]">Collapse Menu</span>}
          </button>
          
          <div className={cn("flex items-center justify-between px-1.5 mt-1", isCollapsed ? "flex-col gap-3" : "")}>
            <Link to="/settings" className="text-neutral-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-[#1F2937]">
              <Settings size={isCollapsed ? 20 : 18} />
            </Link>
            <button onClick={handleLogout} className="text-neutral-400 hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-primary/10">
              <LogOut size={isCollapsed ? 20 : 18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
