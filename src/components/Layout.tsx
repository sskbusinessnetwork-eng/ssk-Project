import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Sidebar } from './Sidebar';
import { 
  Menu, 
  X, 
  LayoutDashboard, 
  Users, 
  Share2, 
  User,
  Plus,
  AlertTriangle,
  HelpCircle,
  Search,
  UserPlus,
  FileText,
  Calendar,
  Bell,
  Monitor,
  Sparkles,
  Sun,
  MessageSquare,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { getDashboardPath as getDashboardPathUtil } from '../utils/authUtils';
import { differenceInDays } from 'date-fns';
import { firestoreService } from '../services/firestoreService';
import { where } from 'firebase/firestore';

export function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
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

  const getDashboardPath = () => getDashboardPathUtil(profile?.role);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/analytics' || path === '/dashboard' || path.includes('/analytics')) return 'HOME COMMAND';
    if (path === '/network') return 'ENTERPRISE NETWORK';
    if (path === '/refer') return 'OUTBOUND REFERRALS';
    if (path === '/profile') return 'MY PROFILE';
    if (path === '/one-to-one') return 'ONE-TO-ONE MEETINGS';
    if (path === '/activity') return 'ACTIVITY FEED';
    if (path === '/meetings') return 'CHAPTER SYNCS';
    if (path === '/thank-you-slips') return 'THANK YOU SLIPS';
    if (path === '/guests') return 'VISITOR REGISTRY';
    if (path === '/admins') return 'CHAPTER PRESIDENTS';
    if (path === '/members') return 'ACTIVE ROSTER';
    if (path === '/categories') return 'SECTOR CATEGORIES';
    if (path === '/notifications') return 'NOTIFICATIONS';
    return 'SSK NETWORK';
  };

  const getSubscriptionWarning = () => {
    if (profile?.role === 'MEMBER' && profile.subscriptionEnd) {
      const expiryDate = new Date(profile.subscriptionEnd);
      const now = new Date();
      const daysLeft = differenceInDays(expiryDate, now);
      
      if (daysLeft >= 0 && daysLeft <= 7) {
        return daysLeft === 0 ? 'Your subscription expires today!' : `Your subscription will expire in ${daysLeft} days. Please renew.`;
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
    <div className="min-h-screen bg-neutral-50/50 flex flex-col md:flex-row overflow-hidden text-neutral-900 selection:bg-primary/10 selection:text-primary relative font-sans">
      
      {/* Background aesthetic blobs */}
      <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-gradient-to-b from-primary/5 to-transparent rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-gradient-to-t from-primary/2 to-transparent rounded-full blur-2xl pointer-events-none z-0" />

      {/* Sidebar (Desktop) */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* Main Content Area */}
      <main className="flex-1 md:ml-72 pb-24 md:pb-0 min-h-screen relative overflow-y-auto custom-scrollbar z-10">
        
        {/* Sticky Premium Header */}
        <header className="bg-white sticky top-0 z-40 px-6 md:px-8 py-3.5 flex items-center justify-between border-b border-neutral-200 shadow-sm shadow-neutral-100/5 h-[70px]">
          
          {/* Left: Mobile burger & brand identity */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 hover:bg-neutral-100 active:scale-95 rounded-xl transition-all text-neutral-800"
            >
              <Menu size={20} />
            </button>
            
            <div className="flex items-center gap-2.5">
              <img 
                src="https://i.pinimg.com/736x/f8/86/19/f8861925810bc3b81b6066e5a6e7495b.jpg" 
                alt="SSK Logo" 
                className="h-8 w-8 object-contain rounded-xl border border-neutral-200"
                referrerPolicy="no-referrer"
              />
              <span className="text-[15px] font-bold tracking-tight text-[#111827] font-heading uppercase hidden sm:inline-block">
                SSK BUSINESS NETWORK
              </span>
              <span className="text-[12px] font-bold tracking-tight text-[#111827] font-heading uppercase sm:hidden">
                SSK NETWORK
              </span>
            </div>
          </div>

          {/* Center: Search input representing Vercel/Stripe style commands */}
          <div className="hidden lg:flex items-center gap-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-full px-4 py-2 w-full max-w-[480px] transition-all hover:border-[#D1D5DB] focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/5">
            <Search size={16} className="text-[#9CA3AF]" />
            <input 
              type="text" 
              placeholder="Search members, referrals, meetings..." 
              className="bg-transparent border-none outline-none text-[13px] text-neutral-800 placeholder-neutral-400 w-full font-sans"
              disabled
            />
            <span className="text-[11px] text-neutral-400 font-sans font-medium bg-white px-2 py-0.5 rounded-md border border-[#E5E7EB] shadow-sm select-none">⌘ K</span>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-4">
            {/* Theme Sun Toggle */}
            <button 
              className="p-2 hover:bg-[#F3F4F6] active:scale-95 rounded-full transition-all text-neutral-500 hover:text-neutral-900 hidden sm:block"
              title="Light Mode"
            >
              <Sun size={18} strokeWidth={2} />
            </button>

            {/* Notification Bell */}
            <Link 
              to="/notifications" 
              className="relative p-2 hover:bg-[#F3F4F6] active:scale-95 rounded-full transition-all text-neutral-700"
              title="Notifications"
            >
              <Bell size={18} strokeWidth={2} />
              <span className="absolute top-1 right-1 bg-primary w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm animate-pulse-subtle" />
            </Link>

            {/* Chat Messages Icon */}
            <Link 
              to="/notifications" 
              className="relative p-2 hover:bg-[#F3F4F6] active:scale-95 rounded-full transition-all text-neutral-700"
              title="Messages"
            >
              <MessageSquare size={18} strokeWidth={2} />
              <span className="absolute top-1.5 right-1.5 bg-primary w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm" />
            </Link>

            {/* Separator */}
            <div className="h-6 w-px bg-neutral-200 hidden sm:block" />

            {/* User Profile Block (exactly like the mockup) */}
            <Link to="/profile" className="flex items-center gap-3 hover:opacity-95 transition-opacity">
              <div className="relative shrink-0">
                <img 
                  src={profile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || 'User')}&background=DC2626&color=ffffff`} 
                  alt="Profile Avatar" 
                  className="w-9 h-9 rounded-full border border-neutral-200 object-cover bg-neutral-50"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
              </div>
              
              <div className="hidden md:flex flex-col text-left">
                <span className="text-[13px] font-bold text-[#111827] leading-none">
                  {profile?.name || 'Sudarshan Vagale'}
                </span>
                <span className="text-[11px] text-[#6B7280] mt-1 font-medium">
                  {profile?.role === 'MASTER_ADMIN' ? 'Platinum Director' : profile?.role === 'CHAPTER_ADMIN' ? 'Platinum President' : 'Platinum Member'}
                </span>
              </div>
              <ChevronDown size={14} className="text-neutral-400 hidden md:block shrink-0" />
            </Link>
          </div>
        </header>

        {warningMessage && (
          <div className="bg-primary/5 border-b border-primary/10 px-6 py-3.5 flex items-center justify-center gap-3 text-primary">
            <AlertTriangle size={16} className="shrink-0" />
            <p className="text-[10px] font-black uppercase tracking-widest leading-none">{warningMessage}</p>
          </div>
        )}

        {/* Dynamic page container */}
        <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 lg:p-10">
          <Outlet />
        </div>
      </main>

      {/* Mobile Floating Bottom Bar (Glassmorphic dark design like Apple Wallet/Spotify) */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 bg-neutral-900/95 backdrop-blur-md px-2 py-3.5 flex items-center justify-around z-50 rounded-[22px] border border-white/5 shadow-2xl shadow-neutral-950/20">
        {mobileNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="outline-none"
            >
              <div className="relative flex flex-col items-center justify-center min-w-[55px] transition-all active:scale-90 group">
                <item.icon 
                  size={18} 
                  className={cn(
                    "transition-all duration-300 mb-1",
                    isActive ? "text-primary scale-110" : "text-neutral-400 group-hover:text-white"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className={cn(
                  "text-[8px] font-black tracking-wider transition-all duration-300 uppercase",
                  isActive ? "text-white" : "text-neutral-500 group-hover:text-neutral-300"
                )}>
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="active-underline"
                    className="absolute -bottom-1 w-5 h-0.5 bg-primary rounded-full"
                    transition={{ type: 'spring', bounce: 0.1, duration: 0.5 }}
                  />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
