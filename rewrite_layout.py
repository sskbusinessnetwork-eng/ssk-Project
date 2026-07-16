import os

layout_content = """import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './Sidebar';
import { 
  Menu, Search, Bell, MessageSquare, Plus, ChevronDown, Calendar, Users, LayoutDashboard, Share2, User
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { getDashboardPath as getDashboardPathUtil } from '../utils/authUtils';
import { differenceInDays } from 'date-fns';
import { firestoreService } from '../services/firestoreService';
import { where } from 'firebase/firestore';

export function Layout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(8);

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
    return 'SSK BUSINESS NETWORK'; // Following the reference image
  };

  const mobileNavItems = [
    { icon: LayoutDashboard, label: 'Home', path: '/analytics' },
    { icon: Users, label: 'Network', path: '/network' },
    { icon: Calendar, label: 'Meetings', path: '/meetings' },
    { icon: Share2, label: 'Refer', path: '/refer' },
    { icon: User, label: 'More', path: '/profile' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row overflow-hidden text-[#111827] font-sans">
      
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
        isDesktopCollapsed ? "lg:ml-[78px]" : "lg:ml-[280px]"
      )}>
        
        {/* Top Header */}
        <header className="bg-white sticky top-0 z-40 px-6 py-4 flex items-center justify-between h-[80px]">
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-neutral-100 active:scale-95 rounded-xl transition-all text-[#111827]"
            >
              <Menu size={20} />
            </button>
            <button className="hidden lg:flex p-2 hover:bg-neutral-100 rounded-xl transition-all text-[#111827]">
              <Menu size={20} />
            </button>
          </div>

          <div className="flex-1 max-w-[600px] px-6 hidden lg:block">
            <div className="relative flex items-center bg-[#F3F4F6] rounded-full px-4 py-2.5 hover:bg-[#E5E7EB] transition-colors focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 border border-transparent">
              <Search size={18} className="text-[#6B7280]" />
              <input 
                type="text" 
                placeholder="Search members, referrals, meetings..." 
                className="bg-transparent border-none outline-none text-[14px] text-[#111827] placeholder-[#9CA3AF] w-full font-medium ml-3"
              />
              <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded shadow-sm border border-[#E5E7EB]">
                <span className="text-[11px] font-bold text-[#6B7280]">⌘</span>
                <span className="text-[11px] font-bold text-[#6B7280]">K</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <button className="hidden sm:flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-full text-[13px] font-bold transition-all shadow-[0_4px_12px_rgba(220,38,38,0.2)]">
              <Plus size={16} strokeWidth={3} />
              Quick Add
            </button>

            <div className="flex items-center gap-4">
              <Link to="/notifications" className="relative group">
                <div className="p-2.5 text-[#6B7280] group-hover:text-[#111827] transition-colors">
                  <Bell size={22} strokeWidth={1.5} />
                </div>
                <span className="absolute top-1.5 right-1.5 bg-primary text-white text-[10px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                  8
                </span>
              </Link>
              
              <Link to="/messages" className="relative group">
                <div className="p-2.5 text-[#6B7280] group-hover:text-[#111827] transition-colors">
                  <MessageSquare size={22} strokeWidth={1.5} />
                </div>
                <span className="absolute top-1.5 right-1.5 bg-primary text-white text-[10px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                  1
                </span>
              </Link>
            </div>

            <Link to="/profile" className="flex items-center gap-3 hover:opacity-95 transition-opacity pl-2 sm:border-l border-[#E5E7EB]">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-[14px] border-2 border-[#FFE4E6]">
                SV
              </div>
              <div className="hidden lg:flex flex-col text-left mr-2">
                <span className="text-[14px] font-bold text-[#111827] leading-tight">
                  {profile?.name || 'Sudarshan Vagale'}
                </span>
                <span className="text-[12px] text-[#6B7280] font-medium">
                  Platinum Member
                </span>
              </div>
              <ChevronDown size={16} className="text-[#9CA3AF] hidden lg:block" />
            </Link>
          </div>
        </header>

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
                    isActive ? "text-primary" : "text-[#6B7280]"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className={cn(
                  "text-[10px] font-bold transition-all duration-300",
                  isActive ? "text-primary opacity-100" : "text-[#6B7280] opacity-0 group-hover:opacity-100"
                )}>
                  {item.label}
                </span>
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
