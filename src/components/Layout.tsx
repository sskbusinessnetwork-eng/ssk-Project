import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './Sidebar';
import { Menu, X, LayoutDashboard, Users, Share2, User, Plus, TriangleAlert as AlertTriangle, Circle as HelpCircle, Search, UserPlus, FileText, Calendar, Bell, Monitor, Sparkles, Sun, MessageSquare, ChevronDown, ChevronRight, Hop as Home, MoveHorizontal as MoreHorizontal, Zap } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { getDashboardPath as getDashboardPathUtil } from '../utils/authUtils';
import { differenceInDays } from 'date-fns';
import { firestoreService } from '../services/firestoreService';
import { where } from 'firebase/firestore';

export function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
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
    if (path === '/analytics' || path === '/dashboard' || path.includes('/analytics')) return 'Home';
    if (path === '/network') return 'Network';
    if (path === '/refer') return 'Referrals';
    if (path === '/profile') return 'Profile';
    if (path === '/one-to-one') return 'One-to-One';
    if (path === '/activity') return 'Activity';
    if (path === '/meetings') return 'Meetings';
    if (path === '/thank-you-slips') return 'Thank You Slips';
    if (path === '/guests') return 'Guests';
    if (path === '/admins') return 'Admins';
    if (path === '/members') return 'Members';
    if (path === '/categories') return 'Categories';
    if (path === '/notifications') return 'Notifications';
    return 'Dashboard';
  };

  const getBreadcrumb = () => {
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);
    return segments.length > 0 ? segments.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' / ') : 'Home';
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
    { icon: MoreHorizontal, label: 'More', path: '/profile' },
  ];

  const sidebarWidth = isCollapsed ? 78 : 290;

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row overflow-hidden text-foreground selection:bg-primary/10 selection:text-primary relative font-sans">
      
      {/* Background aesthetic blobs */}
      <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-gradient-to-b from-primary/5 to-transparent rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-gradient-to-t from-primary/2 to-transparent rounded-full blur-2xl pointer-events-none z-0" />

      {/* Sidebar (Desktop collapsible + Mobile drawer) */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />
      
      {/* Main Content Area */}
      <main 
        className="flex-1 min-h-screen relative overflow-y-auto custom-scrollbar z-10 pb-24 md:pb-0"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        
        {/* Premium Sticky Header */}
        <header className="bg-white/80 backdrop-blur-xl sticky top-0 z-40 border-b border-border h-[70px] flex items-center justify-between px-4 sm:px-6 md:px-8">
          
          {/* Left: Mobile burger + Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 hover:bg-muted active:scale-95 rounded-xl transition-all text-foreground shrink-0"
            >
              <Menu size={20} />
            </button>
            
            {/* Breadcrumb + Page Title */}
            <div className="min-w-0 hidden sm:block">
              <div className="flex items-center gap-1.5 text-[12px] text-text-secondary font-medium">
                <Home size={12} className="text-text-secondary/60" />
                <ChevronRight size={10} className="text-text-secondary/40" />
                <span className="truncate">{getPageTitle()}</span>
              </div>
              <h1 className="text-[18px] sm:text-[20px] font-bold text-foreground tracking-tight leading-tight truncate">
                {getPageTitle()}
              </h1>
            </div>

            {/* Mobile: just logo */}
            <div className="sm:hidden flex items-center gap-2">
              <img 
                src="https://i.pinimg.com/736x/f8/86/19/f8861925810bc3b81b6066e5a6e7495b.jpg" 
                alt="SSK Logo" 
                className="h-7 w-7 object-contain rounded-lg border border-border"
                referrerPolicy="no-referrer"
              />
              <span className="text-[13px] font-bold tracking-tight text-foreground">
                SSK
              </span>
            </div>
          </div>

          {/* Center: Search */}
          <div className="hidden lg:flex items-center gap-2.5 bg-muted border border-border rounded-full px-4 py-2 w-full max-w-[400px] transition-all hover:border-primary/30 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/5">
            <Search size={16} className="text-text-secondary/60" />
            <input 
              type="text" 
              placeholder="Search members, referrals, meetings..." 
              className="bg-transparent border-none outline-none text-[13px] text-foreground placeholder-text-secondary/60 w-full font-medium"
              disabled
            />
            <span className="text-[10px] text-text-secondary/50 font-medium bg-white px-1.5 py-0.5 rounded-md border border-border shadow-sm select-none">⌘K</span>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick Action */}
            <button className="hidden sm:flex items-center gap-2 h-9 px-3.5 bg-foreground text-white rounded-full text-[13px] font-semibold hover:bg-primary transition-all active:scale-95">
              <Plus size={14} strokeWidth={2.5} />
              <span className="hidden md:inline">Quick Add</span>
            </button>

            {/* Separator */}
            <div className="h-6 w-px bg-border hidden sm:block" />

            {/* Notifications */}
            <Link 
              to="/notifications" 
              className="relative p-2 hover:bg-muted active:scale-95 rounded-full transition-all text-foreground"
              title="Notifications"
            >
              <Bell size={18} strokeWidth={2} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 bg-primary w-2.5 h-2.5 rounded-full border-2 border-white" />
              )}
            </Link>

            {/* Messages */}
            <Link 
              to="/notifications" 
              className="relative p-2 hover:bg-muted active:scale-95 rounded-full transition-all text-foreground hidden sm:block"
              title="Messages"
            >
              <MessageSquare size={18} strokeWidth={2} />
            </Link>

            {/* Separator */}
            <div className="h-6 w-px bg-border hidden sm:block" />

            {/* User Profile */}
            <Link to="/profile" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
              <div className="relative shrink-0">
                <img 
                  src={profile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || 'User')}&background=DC2626&color=ffffff`} 
                  alt="Profile Avatar" 
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-border object-cover bg-muted"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
              </div>
              
              <div className="hidden md:flex flex-col text-left">
                <span className="text-[13px] font-bold text-foreground leading-none">
                  {profile?.name || 'User'}
                </span>
                <span className="text-[11px] text-text-secondary mt-1 font-medium">
                  {profile?.role === 'MASTER_ADMIN' ? 'Platinum Director' : profile?.role === 'CHAPTER_ADMIN' ? 'Platinum President' : 'Platinum Member'}
                </span>
              </div>
              <ChevronDown size={14} className="text-text-secondary hidden md:block shrink-0" />
            </Link>
          </div>
        </header>

        {/* Subscription Warning */}
        <AnimatePresence>
          {warningMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-primary/5 border-b border-primary/10 px-4 sm:px-6 py-3 flex items-center justify-center gap-3 text-primary"
            >
              <AlertTriangle size={16} className="shrink-0" />
              <p className="text-[11px] font-bold uppercase tracking-widest leading-none">{warningMessage}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page Content with transitions */}
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-[1600px] mx-auto p-4 sm:p-6 md:p-8 lg:p-10"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-border z-50 safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          {mobileNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="outline-none flex-1"
              >
                <div className="relative flex flex-col items-center justify-center min-h-[48px] transition-all active:scale-90 group">
                  <item.icon 
                    size={20} 
                    className={cn(
                      "transition-all duration-300 mb-1",
                      isActive ? "text-primary scale-110" : "text-text-secondary group-hover:text-foreground"
                    )}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span className={cn(
                    "text-[10px] font-semibold tracking-wide transition-all duration-300",
                    isActive ? "text-primary" : "text-text-secondary"
                  )}>
                    {item.label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="mobile-active-indicator"
                      className="absolute -top-2 w-8 h-0.5 bg-primary rounded-full"
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                    />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
