import { Avatar } from '../components/Avatar';
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
import { notificationService } from '../services/notificationService';
import {  where  } from '../lib/database';
import { BrandLogo } from './BrandLogo';

export function Layout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebar_collapsed');
      try { return saved ? JSON.parse(saved) : false; } catch (e) { return false; }
    } catch (e) {
      return false;
    }
  });
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  const toggleDesktopCollapsed = () => {
    setIsDesktopCollapsed((prev: boolean) => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_collapsed', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };
  
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const userId = profile?.uid || profile?.id;
    if (!userId) return;

    const unsubscribe = notificationService.subscribeUserNotifications(
      userId,
      undefined,
      (list) => {
        const unread = list.filter(n => !n.read && !n.is_read).length;
        setUnreadCount(unread);
      }
    );

    return () => unsubscribe();
  }, [profile?.uid, profile?.id]);

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
      navigate('/login', { replace: true, state: { message: 'You have been logged out successfully.' } });
    } catch (error) {
      console.error('Logout failed:', error);
      navigate('/login', { replace: true, state: { message: 'You have been logged out successfully.' } });
    }
  };

  const getDashboardPath = () => getDashboardPathUtil(profile?.role, profile?.position);

  const userRole = profile?.role || 'MEMBER';
  const isMasterAdmin = userRole === 'MASTER_ADMIN';
  const isChapterAdmin = profile?.position === 'chapter_admin' || userRole === 'CHAPTER_ADMIN';
  const canAccessSettings = isMasterAdmin;

  const mobileNavItems: { icon: any; label: string; path?: string; isAction?: boolean; action?: () => void }[] = [
    { icon: LayoutDashboard, label: 'Home', path: getDashboardPath() },
    { icon: Calendar, label: 'Meetings', path: '/meetings' },
    { icon: Share2, label: 'Referrals', path: '/refer' },
  ];

  return (
    <div className="min-h-screen bg-[#05070E] flex flex-col md:flex-row overflow-hidden text-white font-sans">
      
      {/* Sidebar - Handles Desktop and Tablet Overlay */}
      <Sidebar 
        isOpen={isMobileSidebarOpen} 
        onClose={() => setIsMobileSidebarOpen(false)} 
        isCollapsed={isDesktopCollapsed}
        onToggleCollapse={toggleDesktopCollapsed}
      />
      
      {/* Main Content Area */}
      <main className={cn(
        "flex-1 min-h-screen relative overflow-y-auto custom-scrollbar z-10 transition-all duration-300",
        "pb-[110px] lg:pb-0", // padding for floating mobile bottom nav
        isDesktopCollapsed ? "lg:ml-[78px]" : "lg:ml-[280px]"
      )}>
        
        {/* Top Header */}
        <header className="bg-[#05070E]/80 backdrop-blur-xl sticky top-0 z-40 px-2 sm:px-4 lg:px-6 flex items-center justify-between h-[60px] sm:h-[64px] lg:h-[80px] border-b border-white/5 transition-all">
          
          <div className="flex items-center gap-1.5 sm:gap-3 lg:gap-4 min-w-0 flex-1 mr-1 sm:mr-2">
            <button 
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="lg:hidden p-1.5 sm:p-2 hover:bg-white/10 active:scale-95 rounded-xl transition-all text-white shrink-0 z-[10000] relative"
              aria-label={isMobileSidebarOpen ? "Close menu" : "Open menu"}
            >
              {isMobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            
            {/* Header Logo branding */}
            <Link to="/dashboard" className="flex items-center min-w-0 shrink">
              <BrandLogo 
                size="sm" 
                showText={true} 
                subtitle="ENTERPRISE PLATFORM" 
                subtitleClassName="hidden lg:block"
                textClassName="text-[11px] sm:text-[13px] lg:text-sm tracking-tighter sm:tracking-tight lg:tracking-wider font-extrabold truncate"
                className="gap-1.5 sm:gap-2.5"
              />
            </Link>
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

          <div className="flex items-center gap-1.5 sm:gap-4 lg:gap-6 shrink-0">
            <div className="flex items-center">
              <Link to="/notifications" className="relative group shrink-0">
                <div className="p-1.5 sm:p-2.5 text-[#9CA3AF] group-hover:text-white transition-colors bg-[#111827] rounded-full border border-white/5 flex items-center justify-center">
                  <Bell size={18} strokeWidth={2} className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                </div>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-white text-[9px] font-black min-w-[14px] h-[14px] sm:min-w-[16px] sm:h-[16px] px-1 flex items-center justify-center rounded-full border-2 border-[#05070E] shadow-sm">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            </div>

            {profile?.role === 'MASTER_ADMIN' ? (
              <div className="flex items-center gap-2 sm:gap-3 pl-0 sm:pl-2 sm:border-l border-white/10 shrink-0">
                <div className="w-7 h-7 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-full bg-amber-500 flex items-center justify-center text-black font-bold text-[10px] sm:text-sm shrink-0 border border-amber-400/20 sm:border-2">
                  {profile?.name ? profile.name.substring(0, 2).toUpperCase() : 'MA'}
                </div>
                <div className="hidden lg:flex flex-col text-left mr-2">
                  <span className="text-[14px] font-bold text-white leading-tight">
                    {profile?.name || 'Master Admin'}
                  </span>
                  <span className="text-[12px] text-amber-400 font-bold">
                    Master Admin
                  </span>
                </div>
              </div>
            ) : (
              <Link to="/profile" className="flex items-center gap-2 sm:gap-3 hover:opacity-95 transition-opacity pl-0 sm:pl-2 sm:border-l border-white/10 shrink-0">
                <div className="w-7 h-7 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-[10px] sm:text-sm shrink-0 border border-[#FFE4E6]/20 sm:border-2">
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
            )}
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
                {profile?.role === 'MASTER_ADMIN' ? (
                  <div className="flex items-center justify-between p-4 mb-2 bg-[#1F2937] rounded-2xl border border-white/5">
                    <div className="flex items-center gap-4">
                      <Avatar src={profile?.photoURL} name={profile?.name} size="w-12 h-12" className="border border-white/10 shadow-sm" fallbackClassName="text-lg" />
                      <div className="flex flex-col">
                        <span className="font-bold text-white">{profile?.name || 'Master Admin'}</span>
                        <span className="text-[12px] font-bold text-amber-400 flex items-center gap-1">
                          <Crown size={12} /> Master Admin
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Link to="/profile" className="flex items-center justify-between p-4 mb-2 bg-[#1F2937] rounded-2xl border border-white/5 hover:bg-[#374151] transition-colors active:bg-[#4B5563]">
                    <div className="flex items-center gap-4">
                      <Avatar src={profile?.photoURL} name={profile?.name} size="w-12 h-12" className="border border-white/10 shadow-sm" fallbackClassName="text-lg" />
                      <div className="flex flex-col">
                        <span className="font-bold text-white">{profile?.name || 'User'}</span>
                        <span className="text-[12px] font-bold text-primary flex items-center gap-1">
                          <Crown size={12} /> Platinum Member
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-[#9CA3AF]" />
                  </Link>
                )}

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
                  
                  {canAccessSettings && (
                    <Link to="/settings" className="flex items-center justify-between p-3 rounded-xl hover:bg-[#1F2937] transition-colors active:bg-[#374151]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1F2937] flex items-center justify-center text-[#9CA3AF]">
                          <Settings size={18} />
                        </div>
                        <span className="font-bold text-[#E5E7EB]">Settings</span>
                      </div>
                      <ChevronRight size={18} className="text-[#6B7280]" />
                    </Link>
                  )}
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
