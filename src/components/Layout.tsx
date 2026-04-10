import React, { useState } from 'react';
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
  Calendar
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { getDashboardPath as getDashboardPathUtil } from '../utils/authUtils';
import { differenceInDays } from 'date-fns';

export function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const getDashboardPath = () => getDashboardPathUtil(profile?.role);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/analytics' || path === '/dashboard' || path.includes('/analytics')) return 'HOME';
    if (path === '/network') return 'NETWORK';
    if (path === '/refer') return 'REFERRALS';
    if (path === '/profile') return 'PROFILE';
    if (path === '/one-to-one') return 'ONE-TO-ONE';
    if (path === '/activity') return 'ACTIVITY FEED';
    if (path === '/meetings') return 'WEEKLY MEETINGS';
    if (path === '/thank-you-slips') return 'THANK YOU SLIPS';
    if (path === '/guests') return 'GUEST INVITATIONS';
    if (path === '/admins') return 'CHAPTER ADMINS';
    if (path === '/members') return 'MEMBERS';
    if (path === '/categories') return 'CATEGORIES';
    if (path === '/notifications') return 'NOTIFICATIONS';
    return 'SSK BUSINESS NETWORK';
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
    { icon: Calendar, label: 'Meeting', path: '/meetings' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row overflow-hidden text-foreground selection:bg-primary/30 selection:text-primary relative">
      {/* Sidebar (Desktop) */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* Main Content */}
      <main className="flex-1 md:ml-72 pb-28 md:pb-0 min-h-screen relative overflow-y-auto custom-scrollbar">
        {/* Header */}
        <header className="bg-white sticky top-0 z-40 px-4 md:px-8 py-3 md:py-4 flex items-center border-b border-border shadow-sm">
          {/* Left Side: Logo on Mobile, Empty on Desktop */}
          <div className="flex-1 flex items-center">
            <div className="flex items-center gap-2 md:hidden">
              <img 
                src="https://i.pinimg.com/736x/f3/63/13/f363133013d828ffadc4ce4c61dedcd4.jpg" 
                alt="SSK Logo" 
                className="h-8 w-8 object-contain rounded-lg shadow-sm"
                referrerPolicy="no-referrer"
              />
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-text-primary uppercase leading-none tracking-tighter">SSK Business Network</span>
              </div>
            </div>
          </div>

          {/* Center: Page Title */}
          <h1 className="text-xs sm:text-sm md:text-base font-bold text-text-primary tracking-tight uppercase whitespace-nowrap px-2 truncate max-w-[120px] sm:max-w-none">
            {getPageTitle()}
          </h1>

          {/* Right Side: Burger on Mobile, Logo on Desktop */}
          <div className="flex-1 flex items-center justify-end">
            <div className="hidden md:flex items-center gap-3">
              <div className="flex flex-col text-right">
                <span className="text-sm font-black text-text-primary uppercase leading-none tracking-tighter">SSK Business Network</span>
              </div>
              <img 
                src="https://i.pinimg.com/736x/f3/63/13/f363133013d828ffadc4ce4c61dedcd4.jpg" 
                alt="SSK Logo" 
                className="h-10 w-10 object-contain rounded-xl shadow-md border border-border"
                referrerPolicy="no-referrer"
              />
            </div>
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 hover:bg-muted rounded-full transition-colors"
            >
              <Menu size={24} className="text-text-primary" />
            </button>
          </div>
        </header>

        {warningMessage && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-3 flex items-center justify-center gap-3 text-amber-500">
            <AlertTriangle size={18} className="text-amber-500 shrink-0" />
            <p className="text-xs font-bold uppercase tracking-widest leading-none">{warningMessage}</p>
          </div>
        )}
        <div className="max-w-7xl mx-auto p-2 sm:p-4 md:p-12">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-primary px-2 pb-6 pt-3 flex items-center justify-around z-50 shadow-lg border-t border-white/10">
        {mobileNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="outline-none"
            >
              <div className="relative flex flex-col items-center justify-center min-w-[60px] transition-all active:scale-90 group">
                <item.icon 
                  size={22} 
                  className={cn(
                    "transition-all duration-300 mb-1",
                    isActive ? "text-white scale-110" : "text-white/70 group-hover:text-white"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className={cn(
                  "text-[9px] font-bold tracking-tight transition-all duration-300 uppercase",
                  isActive ? "text-white" : "text-white/70"
                )}>
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="active-underline"
                    className="absolute -bottom-1 w-6 h-0.5 bg-white rounded-full"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
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
          className="fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
