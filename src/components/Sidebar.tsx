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
  X
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { logOut } from '../firebase';
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
  const { profile } = useAuth();
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
    await logOut();
    localStorage.removeItem('user');
    navigate('/');
  };

  const getDashboardPath = () => getDashboardPathUtil(profile?.role);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Home', path: '/analytics', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER'] },
    { icon: Users, label: 'Network', path: '/network', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER'] },
    { icon: Users, label: 'Members', path: '/members', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN'] },
    { icon: Shield, label: 'Admins', path: '/admins', roles: ['MASTER_ADMIN'] },
    { icon: Calendar, label: 'Meetings', path: '/meetings', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER'] },
    { icon: Users, label: 'One-to-One', path: '/one-to-one', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER'] },
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
      "w-72 bg-[#050505] h-screen flex flex-col fixed left-0 top-0 z-[60] transition-transform duration-700 ease-[0.16, 1, 0.3, 1] md:translate-x-0 shadow-2xl shadow-primary/10 border-r border-white/5",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-b from-white/5 to-transparent">
        <Link to={getDashboardPath()} className="flex items-center gap-4">
          <img 
            src="https://i.pinimg.com/736x/f3/63/13/f363133013d828ffadc4ce4c61dedcd4.jpg" 
            alt="SSK Logo" 
            className="h-12 w-auto object-contain rounded-2xl shadow-2xl shadow-primary/40"
            referrerPolicy="no-referrer"
          />
          <div>
            <h1 className="text-xl font-black tracking-tighter text-white uppercase leading-none font-display warrior-glow text-primary">Business</h1>
            <p className="text-[9px] text-white font-black uppercase tracking-[0.3em] mt-1.5">Network</p>
          </div>
        </Link>
        <button 
          onClick={onClose}
          className="md:hidden p-2 hover:bg-white/10 rounded-xl text-white/40 hover:text-white"
        >
          <X size={24} />
        </button>
      </div>

      <nav className="flex-1 p-6 space-y-1.5 overflow-y-auto custom-scrollbar">
        {profile?.role === 'MEMBER' && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-8 p-5 bg-white/5 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-primary/30 transition-colors duration-500"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 transition-transform duration-700 group-hover:scale-150" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-black rounded-lg flex items-center justify-center shadow-sm">
                    <CreditCard size={12} className="text-primary" />
                  </div>
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Subscription</span>
                </div>
                {profile.subscriptionEnd && (
                  <div className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                    new Date(profile.subscriptionEnd) > new Date() 
                      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                      : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                  )}>
                    <div className={cn(
                      "w-1 h-1 rounded-full animate-pulse",
                      new Date(profile.subscriptionEnd) > new Date() ? "bg-emerald-500" : "bg-rose-500"
                    )} />
                    {new Date(profile.subscriptionEnd) > new Date() ? 'Active' : 'Expired'}
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">Start Date</span>
                  <span className="text-[10px] text-white font-black font-mono">
                    {profile.subscriptionStart ? format(new Date(profile.subscriptionStart), 'dd MMM yyyy') : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">End Date</span>
                  <span className="text-[10px] text-white font-black font-mono">
                    {profile.subscriptionEnd ? format(new Date(profile.subscriptionEnd), 'dd MMM yyyy') : '-'}
                  </span>
                </div>
                
                <button
                  disabled={isUpgrading || !canUpgrade()}
                  onClick={handleUpgradeSubscription}
                  className="w-full mt-2 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpgrading ? 'Upgrading...' : 'Upgrade Now'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        <div className="space-y-1">
          {filteredMenu.map((item, index) => {
            const isActive = location.pathname === item.path;
            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={item.path}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-500 group relative overflow-hidden",
                    isActive 
                      ? "text-white shadow-xl shadow-primary/20" 
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-pill"
                      className="absolute inset-0 bg-gradient-to-r from-primary to-orange-600"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} className={cn(
                    "transition-all duration-500 relative z-10",
                    isActive ? "drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] scale-110" : "group-hover:scale-110 group-hover:text-primary"
                  )} />
                  <span className="font-black text-[12px] uppercase tracking-[0.15em] relative z-10 flex-1">{item.label}</span>
                  {item.label === 'Notifications' && unreadCount > 0 && (
                    <span className="relative z-10 bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-rose-500/20">
                      {unreadCount}
                    </span>
                  )}
                  {isActive && (
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/30 blur-[1px] z-20" />
                  )}
                </Link>
              </motion.div>
            );
          })}
        </div>

        <div className="pt-6 mt-6 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="flex items-center gap-4 px-6 py-4 w-full rounded-2xl text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-all duration-500 font-black text-[10px] uppercase tracking-[0.15em] group active:scale-95"
          >
            <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
            <span>Logout</span>
          </button>
        </div>
      </nav>

      <div className="p-6 border-t border-white/5 bg-white/5">
        <div className="flex items-center gap-4 px-5 py-4 bg-black rounded-[2rem] border border-white/5 shadow-sm group cursor-pointer hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/20 transition-all duration-500">
          <div className="relative">
            <img 
              src={profile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || 'User')}&background=random`} 
              className="w-10 h-10 rounded-xl border-2 border-white/10 shadow-md object-cover transition-transform group-hover:scale-110 group-hover:rotate-3"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-black rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
          </div>
          <div className="overflow-hidden">
            <p className="text-[11px] font-black text-white truncate uppercase tracking-tight font-display group-hover:text-primary transition-colors">{profile?.name || profile?.displayName || 'User'}</p>
            <p className="text-[9px] text-primary font-black uppercase tracking-widest mt-0.5">{profile?.role?.replace('_', ' ') || ''}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
