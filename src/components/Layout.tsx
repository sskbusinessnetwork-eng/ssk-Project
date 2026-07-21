import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './Sidebar';
import { 
  Menu, Search, Bell, MessageSquare, Plus, ChevronDown, Calendar, Users, LayoutDashboard, Share2, User,
  FileText, Activity, Settings, Crown, LogOut, ChevronRight, X
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { getDashboardPath as getDashboardPathUtil } from '../utils/authUtils';
import { differenceInDays } from 'date-fns';
import { databaseService } from '../services/databaseService';
import {  where  } from '../lib/database';

export function Layout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(8);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileSidebarOpen) {
        setIsMobileSidebarOpen(false);
      }
      if (e.key === 'Escape' && isBottomSheetOpen) {
        setIsBottomSheetOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobileSidebarOpen, isBottomSheetOpen]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        document.body.style.overflow = '';
      } else if (isMobileSidebarOpen) {
        document.body.style.overflow = 'hidden';
      }
    };

    if (isMobileSidebarOpen && window.innerWidth < 1024) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    window.addEventListener('resize', handleResize);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('resize', handleResize);
    };
  }, [isMobileSidebarOpen]);

  // Close bottom sheet and mobile sidebar on route change
  useEffect(() => {
    setIsBottomSheetOpen(false);
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

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

  const mobileNavItems = [
    { icon: LayoutDashboard, label: 'Home', path: '/analytics' },
    ...(profile?.role !== 'MEMBER' ? [{ icon: Users, label: 'Network', path: '/network' }] : []),
    { icon: Calendar, label: 'Meetings', path: '/meetings' },
    { icon: Share2, label: 'Referrals', path: '/refer' },
    { icon: Menu, label: 'More', isAction: true, action: () => setIsBottomSheetOpen(true) },
  ];

  return (
    <div className="min-h-screen bg-[#05070E] flex flex-col md:flex-row overflow-hidden text-white font-sans">
      
      {/* Sidebar - Handles Desktop and Tablet Overlay */}
      <Sidebar 
        isOpen={isMobileSidebarOpen} 
        onClose={() => setIsMobileSidebarOpen(false)} 
        isCollapsed={false}
      />
      
      {/* Main Content Area */}
      <main className={cn(
        "flex-1 min-h-screen relative overflow-y-auto custom-scrollbar z-10 transition-all duration-300",
        "pb-[110px] lg:pb-0", // padding for floating mobile bottom nav
        "lg:ml-[280px]"
      )}>
        
        {/* Top Header */}
        <header className="bg-[#05070E]/80 backdrop-blur-xl sticky top-0 z-40 px-6 py-4 flex items-center justify-between h-[80px] border-b border-white/5">
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="lg:hidden p-2 hover:bg-white/10 active:scale-95 rounded-xl transition-all text-white z-[10000] relative"
              aria-label={isMobileSidebarOpen ? "Close menu" : "Open menu"}
            >
              {isMobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            
            {/* Header Logo branding */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#E53935] flex items-center justify-center text-white font-black text-sm tracking-tighter shadow-[0_0_12px_rgba(229,57,53,0.4)] shrink-0">
                SSK
              </div>
              <div className="flex flex-col hidden xs:flex">
                <span className="text-white font-black text-[12px] leading-tight tracking-wide">BUSINESS NETWORK</span>
                <span className="text-[7px] text-[#9CA3AF] font-bold tracking-widest leading-none uppercase -mt-0.5">Enterprise Platform</span>
              </div>
            </div>
          </div>

          <div className="flex-1 max-w-[600px] px-6 hidden lg:block">
            <div className="relative flex items-center bg-[#111827] rounded-full px-4 py-2.5 hover:bg-[#1F2937] transition-colors focus-within:bg-[#111827] focus-within:ring-1 focus-within:ring-white/20 border border-white/5">
              <Search size={18} className="text-[#9CA3AF]" />
              <input 
                type="text" 
                placeholder="Search members, referrals, meetings..." 
                className="bg-transparent border-none outline-none text-[14px] text-white placeholder-[#6B7280] w-full font-medium ml-3"
              />
              <div className="flex items-center gap-1 bg-[#1F2937] px-2 py-0.5 rounded shadow-sm border border-white/10">
                <span className="text-[11px] font-bold text-[#9CA3AF]">⌘</span>
                <span className="text-[11px] font-bold text-[#9CA3AF]">K</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-4">
              <Link to="/notifications" className="relative group">
                <div className="p-2.5 text-[#9CA3AF] group-hover:text-white transition-colors bg-[#111827] rounded-full border border-white/5">
                  <Bell size={18} strokeWidth={2} />
                </div>
                <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-black w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-[#05070E] shadow-sm">
                  8
                </span>
              </Link>
              

            </div>

            <Link to="/profile" className="flex items-center gap-3 hover:opacity-95 transition-opacity pl-2 sm:border-l border-white/10">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-[14px] border-2 border-[#FFE4E6]/20">
                {profile?.name ? profile.name.substring(0, 2).toUpperCase() : 'SV'}
              </div>
              <div className="hidden lg:flex flex-col text-left mr-2">
                <span className="text-[14px] font-bold text-white leading-tight">
                  {profile?.name || 'Sudarshan Vagale'}
                </span>
                <span className="text-[12px] text-[#9CA3AF] font-medium">
                  Platinum Member
                </span>
              </div>
              <ChevronDown size={16} className="text-[#9CA3AF] hidden lg:block" />
            </Link>
          </div>
        </header>

        <div className="p-4 sm:p-6 md:p-8 lg:p-10 max-w-[1600px] mx-auto w-full space-y-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation Menu */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 h-[74px] rounded-[20px] bg-[#111827]/85 backdrop-blur-xl border border-white/5 px-2 flex items-center justify-around z-40 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
        {mobileNavItems.map((item, idx) => {
          const isActive = item.path ? location.pathname === item.path : false;
          const isSelected = item.isAction ? isBottomSheetOpen : isActive;
          return item.isAction ? (
            <button
              key={idx}
              onClick={item.action}
              className="outline-none focus:outline-none"
            >
              <div className="relative flex flex-col items-center justify-center min-w-[60px] h-[54px] transition-all group">
                <item.icon 
                  size={20} 
                  className={cn(
                    "transition-all duration-300 mb-1 relative z-10",
                    isSelected ? "text-[#E53935] drop-shadow-[0_0_8px_rgba(229,57,53,0.8)]" : "text-[#9CA3AF]"
                  )}
                  strokeWidth={isSelected ? 2.5 : 2}
                />
                <span className={cn(
                  "text-[10px] font-bold transition-all duration-300 relative z-10",
                  isSelected ? "text-[#E53935]" : "text-[#9CA3AF]"
                )}>
                  {item.label}
                </span>
                {isSelected && (
                  <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[#E53935] shadow-[0_0_8px_rgba(229,57,53,0.8)] animate-pulse" />
                )}
              </div>
            </button>
          ) : (
            <Link
              key={item.path}
              to={item.path as string}
              className="outline-none focus:outline-none"
            >
              <div className="relative flex flex-col items-center justify-center min-w-[60px] h-[54px] transition-all group">
                <item.icon 
                  size={20} 
                  className={cn(
                    "transition-all duration-300 mb-1 relative z-10",
                    isActive ? "text-[#E53935] drop-shadow-[0_0_8px_rgba(229,57,53,0.8)]" : "text-[#6B7280]"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className={cn(
                  "text-[10px] font-bold transition-all duration-300 relative z-10",
                  isActive ? "text-[#E53935]" : "text-[#6B7280]"
                )}>
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[#E53935] shadow-[0_0_8px_rgba(229,57,53,0.8)] animate-pulse" />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* More Options Bottom Sheet */}
      <AnimatePresence>
        {isBottomSheetOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-[#000000]/80 backdrop-blur-md z-[50] md:hidden cursor-pointer"
              onClick={() => setIsBottomSheetOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-[#111827] rounded-t-3xl z-[60] md:hidden overflow-hidden flex flex-col border-t border-white/10"
              style={{ maxHeight: '85vh' }}
            >
              <div className="w-full flex justify-center py-3 shrink-0">
                <div className="w-12 h-1.5 rounded-full bg-[#374151]" />
              </div>
              
              <div className="overflow-y-auto px-4 pb-8 custom-scrollbar">
                <Link to="/profile" className="flex items-center justify-between p-4 mb-2 bg-[#1F2937] rounded-2xl border border-white/5 hover:bg-[#374151] transition-colors active:bg-[#4B5563]">
                  <div className="flex items-center gap-4">
                    <img 
                      src={profile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || 'User')}&background=DC2626&color=ffffff`} 
                      alt="Profile" 
                      className="w-12 h-12 rounded-full border border-white/10 shadow-sm"
                    />
                    <div className="flex flex-col">
                      <span className="font-bold text-white">{profile?.name || 'User'}</span>
                      <span className="text-[12px] font-bold text-primary flex items-center gap-1">
                        <Crown size={12} /> Platinum Member
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-[#9CA3AF]" />
                </Link>

                <div className="flex flex-col gap-1 mt-4">
                  <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider px-2 mb-1">Navigation</span>
                  
                  <Link to="/directory" className="flex items-center justify-between p-3 rounded-xl hover:bg-[#1F2937] transition-colors active:bg-[#374151]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1F2937] flex items-center justify-center text-[#9CA3AF]">
                        <FileText size={18} />
                      </div>
                      <span className="font-bold text-[#E5E7EB]">Directory</span>
                    </div>
                    <ChevronRight size={18} className="text-[#6B7280]" />
                  </Link>

                  <Link to="/reports" className="flex items-center justify-between p-3 rounded-xl hover:bg-[#1F2937] transition-colors active:bg-[#374151]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1F2937] flex items-center justify-center text-[#9CA3AF]">
                        <Activity size={18} />
                      </div>
                      <span className="font-bold text-[#E5E7EB]">Reports</span>
                    </div>
                    <ChevronRight size={18} className="text-[#6B7280]" />
                  </Link>


                </div>

                <div className="h-px w-full bg-[#1F2937] my-4" />

                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider px-2 mb-1">Account</span>
                  
                  <Link to="/settings" className="flex items-center justify-between p-3 rounded-xl hover:bg-[#1F2937] transition-colors active:bg-[#374151]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1F2937] flex items-center justify-center text-[#9CA3AF]">
                        <Settings size={18} />
                      </div>
                      <span className="font-bold text-[#E5E7EB]">Settings</span>
                    </div>
                    <ChevronRight size={18} className="text-[#6B7280]" />
                  </Link>

                  <button onClick={handleLogout} className="flex items-center justify-between p-3 rounded-xl hover:bg-red-500/10 transition-colors active:bg-red-500/20 w-full text-left mt-2 border border-red-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">
                        <LogOut size={18} />
                      </div>
                      <span className="font-bold text-red-500">Logout</span>
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Tablet/Mobile Overlay Backdrop */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="fixed inset-0 bg-black/60 z-[9998] lg:hidden cursor-pointer animate-none"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsMobileSidebarOpen(false);
            }}
            aria-label="Close sidebar overlay"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
