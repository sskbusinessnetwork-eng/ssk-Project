import os

layout_content = """import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './Sidebar';
import { 
  Menu, X, LayoutDashboard, Users, Share2, User, Search, Bell, MessageSquare, ChevronDown
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { getDashboardPath as getDashboardPathUtil } from '../utils/authUtils';
import { differenceInDays } from 'date-fns';
import { firestoreService } from '../services/firestoreService';
import { where } from 'firebase/firestore';

export function Layout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(() => {
    return localStorage.getItem('ssk_sidebar_collapsed') === 'true';
  });
  
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    localStorage.setItem('ssk_sidebar_collapsed', isDesktopCollapsed.toString());
  }, [isDesktopCollapsed]);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileSidebarOpen) {
        setIsMobileSidebarOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobileSidebarOpen]);

  const getDashboardPath = () => getDashboardPathUtil(profile?.role);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/analytics' || path === '/dashboard' || path.includes('/analytics')) return 'Dashboard';
    if (path === '/network') return 'Network';
    if (path === '/refer') return 'Referrals';
    if (path === '/profile') return 'Profile';
    if (path === '/one-to-one') return '1-to-1 Meetings';
    if (path === '/activity') return 'Activity';
    if (path === '/meetings') return 'Meetings';
    if (path === '/thank-you-slips') return 'Thank You Slips';
    if (path === '/guests') return 'Guests';
    if (path === '/admins') return 'Admins';
    if (path === '/members') return 'Members';
    if (path === '/categories') return 'Categories';
    if (path === '/notifications') return 'Notifications';
    return 'SSK Network';
  };

  const getSubscriptionWarning = () => {
    if (profile?.role === 'MEMBER' && profile.subscriptionEnd) {
      const expiryDate = new Date(profile.subscriptionEnd);
      const now = new Date();
      const daysLeft = differenceInDays(expiryDate, now);
      
      if (daysLeft >= 0 && daysLeft <= 7) {
        return daysLeft === 0 ? 'Your subscription expires today!' : `Your subscription expires in ${daysLeft} days.`;
      }
    }
    return null;
  };

  const warningMessage = getSubscriptionWarning();

  const mobileNavItems = [
    { icon: LayoutDashboard, label: 'Home', path: '/analytics' },
    { icon: Users, label: 'Network', path: '/network' },
    { icon: Share2, label: 'Refer', path: '/refer' },
    { icon: Calendar, label: 'Meetings', path: '/meetings' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col md:flex-row overflow-hidden text-[#111827] font-sans">
      
      {/* Sidebar - Handles Desktop and Tablet Overlay */}
      <Sidebar 
        isOpen={isMobileSidebarOpen} 
        onClose={() => setIsMobileSidebarOpen(false)} 
        isCollapsed={isDesktopCollapsed}
        onToggleCollapse={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
      />
      
      {/* Main Content Area */}
      <main className={cn(
        "flex-1 md:pb-0 min-h-screen relative overflow-y-auto custom-scrollbar z-10 transition-all duration-300",
        "pb-[80px]", // padding for mobile bottom nav
        isDesktopCollapsed ? "lg:ml-[78px]" : "lg:ml-[290px]"
      )}>
        
        {/* Sticky Premium Header */}
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 px-6 md:px-8 py-4 flex items-center justify-between border-b border-[#E5E7EB] shadow-[0_2px_10px_rgba(0,0,0,0.02)] h-[72px]">
          
          <div className="flex items-center gap-4">
            {/* Tablet/Mobile Burger - only visible below lg */}
            <button 
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-neutral-100 active:scale-95 rounded-xl transition-all text-[#111827]"
            >
              <Menu size={20} />
            </button>
            
            <div className="flex flex-col">
              <span className="text-[12px] font-semibold tracking-[0.05em] text-[#6B7280] uppercase hidden sm:block">
                Overview
              </span>
              <h1 className="text-[18px] sm:text-[20px] font-bold tracking-tight text-[#111827] leading-tight">
                {getPageTitle()}
              </h1>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 bg-[#F7F8FA] border border-[#E5E7EB] rounded-full px-4 py-2 w-full max-w-[400px] transition-all hover:border-[#D1D5DB] focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10">
            <Search size={16} className="text-[#6B7280]" />
            <input 
              type="text" 
              placeholder="Search anything..." 
              className="bg-transparent border-none outline-none text-[13px] text-[#111827] placeholder-[#6B7280] w-full font-medium"
              disabled
            />
            <span className="text-[10px] text-[#6B7280] font-semibold bg-white px-2 py-0.5 rounded border border-[#E5E7EB] shadow-sm select-none">⌘ K</span>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <Link 
              to="/messages" 
              className="relative p-2 hover:bg-[#F3F4F6] active:scale-95 rounded-full transition-all text-[#6B7280] hover:text-[#111827]"
            >
              <MessageSquare size={18} strokeWidth={2} />
            </Link>

            <Link 
              to="/notifications" 
              className="relative p-2 hover:bg-[#F3F4F6] active:scale-95 rounded-full transition-all text-[#6B7280] hover:text-[#111827]"
            >
              <Bell size={18} strokeWidth={2} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 bg-[#DC2626] w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm" />
              )}
            </Link>

            <div className="h-6 w-px bg-[#E5E7EB] hidden sm:block" />

            <Link to="/profile" className="flex items-center gap-3 hover:opacity-95 transition-opacity group">
              <div className="relative shrink-0">
                <img 
                  src={profile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || 'User')}&background=DC2626&color=ffffff`} 
                  alt="Profile" 
                  className="w-9 h-9 rounded-full border border-[#E5E7EB] object-cover bg-white shadow-sm group-hover:border-[#DC2626]/30 transition-colors"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-[13px] font-semibold text-[#111827] leading-tight">
                  {profile?.name || 'User'}
                </span>
                <span className="text-[11px] text-[#6B7280] font-medium capitalize">
                  {profile?.role?.replace('_', ' ').toLowerCase() || 'Member'}
                </span>
              </div>
            </Link>
          </div>
        </header>

        {warningMessage && (
          <div className="bg-[#DC2626]/10 border-b border-[#DC2626]/20 px-6 py-2.5 flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] animate-pulse" />
            <p className="text-[13px] text-[#DC2626] font-medium">{warningMessage}</p>
          </div>
        )}

        <div className="p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto w-full">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation Menu */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB] px-2 py-2 pb-safe flex items-center justify-around z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        {mobileNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="outline-none"
            >
              <div className="relative flex flex-col items-center justify-center min-w-[64px] h-[52px] transition-all group">
                <item.icon 
                  size={20} 
                  className={cn(
                    "transition-all duration-300 mb-1",
                    isActive ? "text-[#DC2626] -translate-y-1" : "text-[#6B7280]"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className={cn(
                  "text-[10px] font-semibold transition-all duration-300",
                  isActive ? "text-[#DC2626] opacity-100" : "text-[#6B7280] opacity-0 group-hover:opacity-100"
                )}>
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className="absolute -top-2 w-10 h-1 bg-[#DC2626] rounded-b-full"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Tablet Overlay Backdrop */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-[#0B0B0D]/40 backdrop-blur-sm z-[55] lg:hidden transition-opacity duration-300 cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsMobileSidebarOpen(false);
          }}
          aria-label="Close sidebar overlay"
        />
      )}
    </div>
  );
}
"""

with open('src/components/Layout.tsx', 'w') as f:
    f.write(layout_content)

