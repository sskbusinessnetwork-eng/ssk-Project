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
  Bell,
  X,
  Sparkles,
  Layers,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ isOpen, onClose, isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const { profile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

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
    <>
      {/* Desktop collapsible sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed left-0 top-0 z-[60] h-screen bg-[#0B0B0D] border-r border-white/5 transition-all duration-500 ease-[0.16,1,0.3,1] custom-scrollbar-dark",
          isCollapsed ? "w-[78px]" : "w-[290px]"
        )}
      >
        {/* Brand Header */}
        <div className={cn(
          "border-b border-white/5 flex items-center bg-gradient-to-b from-white/[0.03] to-transparent h-[70px] shrink-0",
          isCollapsed ? "justify-center px-2" : "justify-between px-5"
        )}>
          <Link to={getDashboardPath()} className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <img 
                src="https://i.pinimg.com/736x/f8/86/19/f8861925810bc3b81b6066e5a6e7495b.jpg" 
                alt="SSK Logo" 
                className="h-9 w-9 object-contain rounded-xl border border-white/10"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full animate-pulse" />
            </div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.3 }}
                  className="min-w-0"
                >
                  <h1 className="text-[13px] font-bold tracking-[0.08em] text-white uppercase leading-none">
                    SSK <span className="text-primary">Networks</span>
                  </h1>
                  <p className="text-[8px] text-neutral-500 font-semibold uppercase tracking-[0.2em] mt-1">
                    Enterprise Platform
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </Link>
          {!isCollapsed && onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 hover:bg-white/5 rounded-lg text-neutral-500 hover:text-white transition-colors shrink-0"
              title="Collapse sidebar"
            >
              <PanelLeftClose size={18} />
            </button>
          )}
        </div>

        {/* Collapse toggle when collapsed */}
        {isCollapsed && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="absolute top-[78px] -right-3 z-10 w-6 h-6 bg-white border border-border rounded-full flex items-center justify-center text-neutral-600 shadow-md hover:text-primary hover:border-primary transition-colors"
            title="Expand sidebar"
          >
            <ChevronRight size={14} />
          </button>
        )}

        {/* Profile Section */}
        <div className={cn(
          "border-b border-white/5 bg-white/[0.02]",
          isCollapsed ? "px-2 py-3" : "px-5 py-4"
        )}>
          <div className={cn("flex items-start", isCollapsed ? "justify-center" : "gap-3")}>
            <div className="relative shrink-0">
              <img 
                src={profile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || 'User')}&background=DC2626&color=ffffff`} 
                className={cn("rounded-full border-2 border-white/10 object-cover bg-neutral-900", isCollapsed ? "w-9 h-9" : "w-10 h-10")}
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#0B0B0D] rounded-full" />
            </div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="min-w-0 flex-1"
                >
                  <h3 className="text-[12px] font-bold text-white truncate leading-tight">
                    {profile?.name || profile?.displayName || 'User'}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[8px] font-bold uppercase tracking-widest text-primary border border-primary/30 px-1.5 py-0.5 rounded-md leading-none bg-primary/5">
                      {profile?.role?.replace('_', ' ') || 'MEMBER'}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto custom-scrollbar-dark flex flex-col">
          <div className="space-y-0.5 flex-1">
            {filteredMenu.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onMouseEnter={() => setHoveredItem(item.path)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={cn(
                    "flex items-center rounded-xl transition-all duration-300 group relative",
                    isCollapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3.5 py-2.5",
                    isActive 
                      ? "text-white bg-primary shadow-lg shadow-primary/20" 
                      : "text-neutral-400 hover:bg-white/5 hover:text-white"
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-glow"
                      className="absolute inset-0 rounded-xl bg-primary"
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                      style={{ zIndex: -1 }}
                    />
                  )}
                  <Icon 
                    size={18} 
                    strokeWidth={isActive ? 2.5 : 2} 
                    className={cn(
                      "transition-transform duration-300 shrink-0",
                      isActive ? "scale-110" : "group-hover:scale-110"
                    )} 
                  />
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -5 }}
                        className="font-semibold text-[13px] flex-1"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {!isCollapsed && item.label === 'Notifications' && unreadCount > 0 && (
                    <span className="bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-md shrink-0">
                      {unreadCount}
                    </span>
                  )}
                  {!isCollapsed && item.label === 'Profile' && (
                    <ChevronRight size={12} className="text-neutral-600 group-hover:text-white transition-colors shrink-0" />
                  )}
                  
                  {/* Collapsed tooltip */}
                  {isCollapsed && hoveredItem === item.path && (
                    <motion.div
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="absolute left-full ml-3 px-3 py-1.5 bg-white text-[#111827] text-[12px] font-semibold rounded-lg shadow-xl border border-border whitespace-nowrap z-50 pointer-events-none"
                    >
                      {item.label}
                      {item.label === 'Notifications' && unreadCount > 0 && (
                        <span className="ml-2 bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                      )}
                    </motion.div>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="pt-3 mt-3 border-t border-white/5">
            <button
              onClick={handleLogout}
              className={cn(
                "flex items-center rounded-xl text-neutral-500 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300 font-semibold text-[13px] group w-full",
                isCollapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3.5 py-2.5"
              )}
              title={isCollapsed ? "Logout" : undefined}
            >
              <LogOut size={18} className="group-hover:translate-x-0.5 transition-transform shrink-0" />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    Logout
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </nav>

        {/* Upgrade Box */}
        <div className={cn("border-t border-white/5 bg-white/[0.02]", isCollapsed ? "p-2" : "p-4")}>
          {isCollapsed ? (
            <button
              onClick={handleUpgradeSubscription}
              disabled={isUpgrading}
              className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
              title="Request Upgrade"
            >
              <Sparkles size={18} />
            </button>
          ) : (
            <div className="p-4 bg-white/[0.03] rounded-2xl border border-white/5 relative overflow-hidden group hover:border-primary/30 transition-all duration-300">
              <div className="absolute top-3 right-3 text-primary/30 group-hover:text-primary/50 transition-colors">
                <Sparkles size={14} className="animate-pulse" />
              </div>
              <div className="relative z-10 space-y-1.5">
                <h4 className="text-[11px] font-bold text-white uppercase tracking-wider">
                  Upgrade to <span className="text-primary">Platinum</span>
                </h4>
                <p className="text-[10px] text-neutral-400 leading-relaxed">
                  Unlock advanced analytics and deeper network tools.
                </p>
                <button
                  onClick={handleUpgradeSubscription}
                  disabled={isUpgrading}
                  className="mt-2 py-2 px-3.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-300 active:scale-95 disabled:opacity-45 w-full text-center"
                >
                  {isUpgrading ? 'Sending...' : 'Request Upgrade'}
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile drawer sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] md:hidden"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
              className="md:hidden fixed left-0 top-0 z-[80] h-screen w-[280px] bg-[#0B0B0D] border-r border-white/5 flex flex-col"
            >
              {/* Mobile Brand Header */}
              <div className="p-5 border-b border-white/5 flex items-center justify-between h-[70px] shrink-0">
                <Link to={getDashboardPath()} className="flex items-center gap-3">
                  <img 
                    src="https://i.pinimg.com/736x/f8/86/19/f8861925810bc3b81b6066e5a6e7495b.jpg" 
                    alt="SSK Logo" 
                    className="h-9 w-9 object-contain rounded-xl border border-white/10"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h1 className="text-[13px] font-bold tracking-[0.08em] text-white uppercase leading-none">
                      SSK <span className="text-primary">Networks</span>
                    </h1>
                    <p className="text-[8px] text-neutral-500 font-semibold uppercase tracking-[0.2em] mt-1">
                      Enterprise Platform
                    </p>
                  </div>
                </Link>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-white/5 rounded-xl text-neutral-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Mobile Profile */}
              <div className="px-5 py-4 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <img 
                      src={profile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || 'User')}&background=DC2626&color=ffffff`} 
                      className="w-10 h-10 rounded-full border-2 border-white/10 object-cover bg-neutral-900"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#0B0B0D] rounded-full" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[12px] font-bold text-white truncate leading-tight">
                      {profile?.name || profile?.displayName || 'User'}
                    </h3>
                    <span className="text-[8px] font-bold uppercase tracking-widest text-primary border border-primary/30 px-1.5 py-0.5 rounded-md leading-none bg-primary/5 inline-block mt-1.5">
                      {profile?.role?.replace('_', ' ') || 'MEMBER'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Mobile Nav */}
              <nav className="flex-1 px-3 py-4 overflow-y-auto custom-scrollbar-dark">
                <div className="space-y-0.5">
                  {filteredMenu.map((item) => {
                    const isActive = location.pathname === item.path;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-300 group",
                          isActive 
                            ? "text-white bg-primary shadow-lg shadow-primary/20 font-bold" 
                            : "text-neutral-400 hover:bg-white/5 hover:text-white font-semibold"
                        )}
                      >
                        <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={cn("transition-transform shrink-0", isActive ? "scale-110" : "group-hover:scale-110")} />
                        <span className="text-[13px] flex-1">{item.label}</span>
                        {item.label === 'Notifications' && unreadCount > 0 && (
                          <span className="bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
                <div className="pt-3 mt-3 border-t border-white/5">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3.5 py-3 w-full rounded-xl text-neutral-500 hover:bg-red-500/10 hover:text-red-400 transition-all font-semibold text-[13px] text-left"
                  >
                    <LogOut size={18} />
                    <span>Logout</span>
                  </button>
                </div>
              </nav>

              {/* Mobile Upgrade */}
              <div className="p-4 border-t border-white/5 bg-white/[0.02]">
                <div className="p-4 bg-white/[0.03] rounded-2xl border border-white/5 relative overflow-hidden">
                  <div className="absolute top-3 right-3 text-primary/30">
                    <Sparkles size={14} className="animate-pulse" />
                  </div>
                  <h4 className="text-[11px] font-bold text-white uppercase tracking-wider">
                    Upgrade to <span className="text-primary">Platinum</span>
                  </h4>
                  <p className="text-[10px] text-neutral-400 leading-relaxed mt-1">
                    Unlock advanced analytics and network tools.
                  </p>
                  <button
                    onClick={handleUpgradeSubscription}
                    disabled={isUpgrading}
                    className="mt-2 py-2 px-3.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-45 w-full"
                  >
                    {isUpgrading ? 'Sending...' : 'Request Upgrade'}
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
