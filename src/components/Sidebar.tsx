import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Share2, 
  Award, 
  UserPlus, 
  User, 
  LogOut,
  Tags,
  Shield,
  CreditCard,
  Bell,
  X,
  Sparkles,
  Layers,
  ArrowRight,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { getDashboardPath as getDashboardPathUtil } from '../utils/authUtils';
import { format, differenceInDays } from 'date-fns';
import { firestoreService } from '../services/firestoreService';
import { notificationService } from '../services/notificationService';
import { where } from 'firebase/firestore';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { profile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isUpgrading, setIsUpgrading] = useState(false);
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

  const handleUpgradeSubscription = async () => {
    if (!profile) return;
    setIsUpgrading(true);
    
    try {
      if (profile.adminId) {
        await notificationService.createNotification(
          profile.adminId, 
          'CHAPTER_ADMIN', 
          'UPGRADE_REQUEST', 
          `${profile.name || profile.displayName} has requested a subscription upgrade.`,
          profile.uid
        );
      }
      
      await notificationService.notifyMasterAdmins(
        'UPGRADE_REQUEST', 
        `${profile.name || profile.displayName} has requested a subscription upgrade.`,
        profile.uid
      );
      
      alert("Upgrade request sent successfully");
      
    } catch (error) {
      console.error('Error requesting subscription upgrade:', error);
      alert("Failed to send upgrade request. Please try again.");
    } finally {
      setIsUpgrading(false);
    }
  };

  const canUpgrade = () => {
    if (!profile?.subscriptionEnd) return false;
    const expiryDate = new Date(profile.subscriptionEnd);
    const now = new Date();
    const daysLeft = differenceInDays(expiryDate, now);
    return daysLeft <= 30;
  };

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
    { icon: Users, label: 'Members', path: '/members', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN'] },
    { icon: Shield, label: 'Admins', path: '/admins', roles: ['MASTER_ADMIN'] },
    { icon: Calendar, label: 'Meetings', path: '/meetings', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER'] },
    { icon: Layers, label: 'One-to-One', path: '/one-to-one', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER'] },
    { icon: Share2, label: 'Refer', path: '/refer', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER'] },
    { icon: Award, label: 'Thank You Slips', path: '/thank-you-slips', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER'] },
    { icon: UserPlus, label: 'Guests', path: '/guests', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER'] },
    { icon: Bell, label: 'Notifications', path: '/notifications', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER'] },
    { icon: Tags, label: 'Categories', path: '/categories', roles: ['MASTER_ADMIN'] },
    { icon: User, label: 'Profile', path: '/profile', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER'] },
  ];

  const filteredMenu = menuItems.filter(item => profile && item.roles.includes(profile.role));

  return (
    <div className={cn(
      "w-72 bg-[#0F1117] h-screen flex flex-col fixed left-0 top-0 z-[60] transition-transform duration-500 ease-[0.16,1,0.3,1] md:tranneutral-x-0 border-r border-neutral-900 shadow-2xl",
      isOpen ? "tranneutral-x-0" : "-tranneutral-x-full"
    )}>
      {/* Brand Header */}
      <div className="p-6 border-b border-neutral-900/80 flex items-center justify-between bg-gradient-to-b from-neutral-950 to-transparent">
        <Link to={getDashboardPath()} className="flex items-center gap-3">
          <div className="relative">
            <img 
              src="https://i.pinimg.com/736x/f8/86/19/f8861925810bc3b81b6066e5a6e7495b.jpg" 
              alt="SSK Logo" 
              className="h-10 w-10 object-contain rounded-xl border border-neutral-800"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-[0.1em] text-white uppercase leading-none">
              SSK <span className="text-primary font-bold">NETWORKS</span>
            </h1>
            <p className="text-[8px] text-neutral-500 font-extrabold uppercase tracking-[0.25em] mt-1">
              EST. 2024 PLATINUM
            </p>
          </div>
        </Link>
        <button 
          onClick={onClose}
          className="md:hidden p-2 hover:bg-neutral-900 rounded-xl text-neutral-400 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Profile Section (matches the design image layout) */}
      <div className="px-6 py-4 border-b border-neutral-900/40 bg-neutral-950/20">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <img 
              src={profile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || 'User')}&background=D32F2F&color=ffffff`} 
              className="w-11 h-11 rounded-full border-2 border-neutral-800 object-cover bg-neutral-900"
              referrerPolicy="no-referrer"
            />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#0C0C0C] rounded-full" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[12px] font-extrabold text-white truncate leading-tight uppercase">
              {profile?.name || profile?.displayName || 'Sudarshan Vagale'}
            </h3>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[8px] font-black uppercase tracking-widest text-primary border border-primary/30 px-1.5 py-0.5 rounded-md leading-none bg-primary/5">
                {profile?.role?.replace('_', ' ') || 'MASTER ADMIN'}
              </span>
              <span className="text-[8px] font-black uppercase tracking-widest bg-primary text-white px-1.5 py-0.5 rounded-md leading-none">
                Active
              </span>
            </div>
            
            <div className="mt-3.5 space-y-1 text-[9px] text-neutral-500">
              <div className="flex items-center justify-between">
                <span>Member ID</span>
                <span className="text-neutral-300 font-extrabold font-mono">
                  SSK-{profile?.uid ? profile.uid.slice(0, 5).toUpperCase() : '10001'}
                </span>
              </div>
              <div className="flex items-center justify-between text-neutral-500">
                <span>Valid Till</span>
                <span className="text-primary font-black flex items-center gap-1">
                  <Calendar size={10} />
                  {profile?.subscriptionEnd ? format(new Date(profile.subscriptionEnd), 'dd MMM yyyy') : '28 Apr 2027'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation items list */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar flex flex-col">
        <div className="space-y-1 flex-1">
          {filteredMenu.map((item, index) => {
            const isActive = location.pathname === item.path;
            return (
              <div key={item.path}>
                <Link
                  to={item.path}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3.5 px-4 py-2.5 rounded-xl transition-all duration-300 group relative",
                    isActive 
                      ? "text-white bg-primary font-bold shadow-lg shadow-primary/15" 
                      : "text-neutral-400 hover:bg-neutral-900/40 hover:text-white"
                  )}
                >
                  <item.icon size={16} strokeWidth={isActive ? 2.5 : 2} className={cn(
                    "transition-transform duration-300 shrink-0",
                    isActive ? "scale-110" : "group-hover:scale-110 group-hover:text-primary"
                  )} />
                  <span className="font-extrabold text-[11px] uppercase tracking-wider flex-1">
                    {item.label === 'Analytics' || item.label === 'Home' ? 'Home' : item.label}
                  </span>
                  {item.label === 'Notifications' && unreadCount > 0 && (
                    <span className="bg-primary text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-md">
                      {unreadCount}
                    </span>
                  )}
                  {item.label === 'Profile' && (
                    <ChevronRight size={12} className="text-neutral-500 group-hover:text-white transition-colors ml-1" />
                  )}
                </Link>
              </div>
            );
          })}
        </div>

        <div className="pt-4 mt-4 border-t border-neutral-900/80">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3.5 px-4 py-2.5 w-full rounded-xl text-neutral-500 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300 font-extrabold text-[11px] uppercase tracking-wider group text-left"
          >
            <LogOut size={16} className="group-hover:tranneutral-x-0.5 transition-transform shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </nav>

      {/* Upgrade Box (premium enterprise SaaS minimalist styling) */}
      <div className="p-4 border-t border-neutral-900/60 bg-neutral-950/20">
        <div className="p-4 bg-[#161920] rounded-xl border border-neutral-800 relative overflow-hidden group hover:border-primary/30 transition-all duration-300">
          <div className="absolute top-3 right-3 text-primary/30 group-hover:text-primary/50 transition-colors">
            <Sparkles size={16} className="animate-pulse" />
          </div>
          <div className="relative z-10 space-y-1.5">
            <h4 className="text-[11px] font-bold text-white uppercase tracking-wider">
              Upgrade to <span className="text-primary">Platinum</span>
            </h4>
            <p className="text-[9px] text-neutral-400 leading-relaxed">
              Unlock priority placement, advanced analytics, and deeper network tools.
            </p>
            <button
              onClick={handleUpgradeSubscription}
              disabled={isUpgrading}
              className="mt-2 py-1.5 px-3.5 bg-primary hover:bg-primary/95 text-white rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all duration-300 active:scale-95 disabled:opacity-45 w-full text-center"
            >
              {isUpgrading ? 'Sending...' : 'Request Upgrade'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
