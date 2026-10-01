import { Avatar } from '../components/Avatar';
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Calendar, Award, UserPlus, LogOut, CreditCard,
  X, Layers, ChevronLeft, ChevronRight, Activity, FileText,
  MessageSquare, Settings, Crown, Tags, BarChart3, Wallet
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';
import { getDashboardPath as getDashboardPathUtil, isChapterLeaderRole } from '../utils/authUtils';
import { databaseService } from '../services/databaseService';
import { where } from '../lib/database';
import { BrandLogo } from './BrandLogo';
import { isLightColor } from '../utils/contrastUtils';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  backgroundColor?: string;
}

export function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse, backgroundColor }: SidebarProps) {
  const { profile, logout } = useAuth();
  const { theme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [, setUnreadCount] = useState(0);

  const sidebarRef = useRef<HTMLElement>(null);
  const [computedIsLight, setComputedIsLight] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ssk_app_theme') === 'day' || 
             document.documentElement.classList.contains('theme-day') ||
             (backgroundColor ? isLightColor(backgroundColor) : false);
    } catch {
      return false;
    }
  });

  // Dynamic contrast evaluation based on current theme, custom color, or computed DOM style
  useEffect(() => {
    const evaluateContrast = () => {
      if (backgroundColor) {
        setComputedIsLight(isLightColor(backgroundColor));
        return;
      }

      if (theme === 'day' || document.documentElement.classList.contains('theme-day')) {
        setComputedIsLight(true);
        return;
      }

      if (sidebarRef.current) {
        const computedBg = window.getComputedStyle(sidebarRef.current).backgroundColor;
        if (computedBg && computedBg !== 'transparent' && computedBg !== 'rgba(0, 0, 0, 0)') {
          setComputedIsLight(isLightColor(computedBg));
          return;
        }
      }

      setComputedIsLight(false);
    };

    evaluateContrast();

    // Observe class or attribute changes on html/body (for instant theme switches)
    const observer = new MutationObserver(() => {
      evaluateContrast();
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme'] });

    window.addEventListener('resize', evaluateContrast);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', evaluateContrast);
    };
  }, [theme, backgroundColor]);

  // Combined flag: light mode active if computed, theme, or prop indicates a light/white background
  const isLight = computedIsLight || theme === 'day' || (backgroundColor ? isLightColor(backgroundColor) : false);

  useEffect(() => {
    if (!profile?.uid) return;
    const unsubscribe = databaseService.subscribe(
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

  const menuItems: { icon: any; label: string; path: string; roles: string[]; badge?: number }[] = [
    { icon: LayoutDashboard, label: 'Home', path: getDashboardPath(), roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER'] },
    { icon: Wallet, label: 'Wallet', path: '/wallet', roles: ['CHAPTER_ADMIN', 'MEMBER'] },
    { icon: Calendar, label: 'Meetings', path: '/meetings', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER'] },
    { icon: Layers, label: 'One-to-One', path: '/one-to-one', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER'] },
    { icon: Activity, label: 'Activity', path: '/activity', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER'] },
    { icon: FileText, label: 'Members', path: '/directory', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER'] },
    { icon: BarChart3, label: 'Reports', path: '/reports', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN'] },
    { icon: MessageSquare, label: 'Testimonials', path: '/testimonials', roles: ['CHAPTER_ADMIN', 'MEMBER'] },
    { icon: MessageSquare, label: 'Testimonial Reports', path: '/testimonial-reports', roles: ['MASTER_ADMIN'] },
    { icon: Crown, label: 'Manage Chapter', path: '/manage-chapter', roles: ['MASTER_ADMIN'] },
    { icon: Users, label: 'Manage Members', path: '/members', roles: ['MASTER_ADMIN'] },
    { icon: Award, label: 'Member TYS', path: '/member-tys', roles: ['CHAPTER_ADMIN', 'MASTER_ADMIN'] },
    { icon: UserPlus, label: 'Add Member', path: '/add-member', roles: ['CHAPTER_ADMIN'] },
    { icon: Calendar, label: 'Feature Presentation', path: '/future-presentation', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN'] },
    { icon: CreditCard, label: 'Manage Subscriptions', path: '/subscriptions', roles: ['MASTER_ADMIN'] },
    { icon: Tags, label: 'Manage Categories', path: '/categories', roles: ['MASTER_ADMIN'] },
    { icon: UserPlus, label: 'Guests', path: '/guests', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER'] },
  ];

  const userRole = profile?.role || 'MEMBER';
  const isMasterAdmin = userRole === 'MASTER_ADMIN';
  const isChapterAdmin = isChapterLeaderRole(profile) || userRole === 'CHAPTER_ADMIN';
  const canAccessSettings = isMasterAdmin;

  const visibleMenuItems = menuItems.filter(item => {
    if (isMasterAdmin) {
      return item.roles.includes('MASTER_ADMIN');
    }
    if (isChapterAdmin) {
      return item.roles.includes('CHAPTER_ADMIN') || item.roles.includes('MEMBER');
    }
    return item.roles.includes('MEMBER') && item.label !== 'Settings';
  });

  const userRoleDisplay = 
    profile?.role === 'MASTER_ADMIN' ? 'Master Admin' :
    profile?.role === 'CHAPTER_ADMIN' ? 'Chapter Admin' :
    profile?.position === 'president' ? 'President' :
    profile?.position === 'vice_president' ? 'Vice President' :
    profile?.position === 'treasurer' ? 'Treasurer' :
    profile?.position === 'chapter_admin' ? 'Chapter Admin' :
    'Associate Member';

  return (
    <aside 
      ref={sidebarRef}
      style={backgroundColor ? { backgroundColor } : undefined}
      className={cn(
        "sidebar-container h-[100vh] h-[100dvh] max-h-[100dvh] flex flex-col fixed left-0 top-0 transition-all duration-300 ease-in-out",
        isLight 
          ? "bg-white border-r border-slate-200/90 shadow-sm" 
          : "bg-[#11131A] border-r border-[#1F2937]",
        // Mobile/Tablet off-canvas drawer styling (<1024px)
        "w-[280px] sm:w-[320px] z-[9999]",
        isOpen ? "translate-x-0" : "-translate-x-full",
        // Desktop persistent styling (>=1024px)
        "lg:translate-x-0 lg:z-30",
        isCollapsed ? "lg:w-[78px]" : "lg:w-[280px]"
      )}
    >
      
      {/* Brand Section (Max 64px) */}
      <div className={cn(
        "h-[64px] flex items-center shrink-0 relative transition-all duration-300",
        isLight ? "border-b border-slate-200/90" : "border-b border-[#1F2937]/50",
        isCollapsed ? "px-2 justify-center gap-1.5" : "px-4 justify-between"
      )}>
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onClose) onClose();
          }}
          type="button"
          aria-label="Close sidebar"
          className={cn(
            "lg:hidden absolute top-4 right-4 p-2 rounded-xl transition-colors cursor-pointer z-[70]",
            isLight 
              ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80" 
              : "hover:bg-[#1F2937] text-[#9CA3AF] hover:text-white"
          )}
        >
          <X size={18} />
        </button>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-2 overflow-hidden"
        >
          {!isCollapsed ? (
            <BrandLogo size="sm" showText={true} lightText={!isLight} />
          ) : (
            <BrandLogo size="sm" showText={false} />
          )}
        </motion.div>

        {/* Desktop Collapse/Expand Toggle Button */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "hidden lg:flex items-center justify-center p-1.5 rounded-lg transition-all cursor-pointer shrink-0 shadow-sm",
              isLight 
                ? "bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200" 
                : "bg-[#1F2937]/80 hover:bg-[#1F2937] text-[#9CA3AF] hover:text-white border border-white/10"
            )}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        )}
      </div>

      {/* User Profile (Compact when collapsed) */}
      <div className={cn(
        "p-4 shrink-0 transition-all duration-300", 
        isLight ? "border-b border-slate-200/90" : "border-b border-[#1F2937]/50",
        isCollapsed && "px-2 py-3"
      )}>
        <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
          <div className="relative shrink-0 group">
            <Avatar 
              src={profile?.photoURL} 
              name={profile?.name} 
              size={isCollapsed ? "w-9 h-9" : "w-[48px] h-[48px]"} 
              className={cn(
                "mx-auto",
                isLight ? "border border-slate-200 bg-slate-100 text-slate-800" : "border border-[#1F2937] bg-[#111827]"
              )} 
              fallbackClassName="text-lg" 
            />
            {!isCollapsed && (
              <div className={cn(
                "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 flex items-center justify-center",
                isLight ? "border-white" : "border-[#11131A]"
              )}>
                <span className="absolute w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping opacity-75" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </div>
            )}
            {isCollapsed && (
              <div className={cn(
                "hidden lg:group-hover:flex pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap z-[100] animate-in fade-in duration-150 flex-col gap-0.5",
                isLight ? "bg-slate-900 text-white border border-slate-700" : "bg-[#1F2937] text-white border border-white/10"
              )}>
                <span className="font-bold text-white">{profile?.name || 'User'}</span>
                <span className={cn("text-[10px] capitalize", isLight ? "text-slate-300" : "text-gray-400")}>
                  {userRoleDisplay}
                </span>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <div className="flex flex-col flex-1 overflow-hidden justify-center">
              <span className={cn(
                "text-[14px] font-bold leading-tight truncate mb-1",
                isLight ? "text-slate-900" : "text-white"
              )}>
                {profile?.name || 'User'}
              </span>
              <span className={cn(
                "text-[10px] font-bold w-fit px-2.5 py-0.5 rounded-full uppercase tracking-wider",
                isLight 
                  ? "text-red-700 bg-red-50 border border-red-200" 
                  : "text-[#E53935] bg-[#E53935]/20 border border-[#E53935]/10"
              )}>
                {userRoleDisplay}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation (Scrollable Only) */}
      <style>
        {`
          .custom-thin-scrollbar::-webkit-scrollbar {
            width: 4px;
            opacity: 0;
            transition: opacity 0.3s;
          }
          .custom-thin-scrollbar:hover::-webkit-scrollbar {
            opacity: 1;
          }
          .custom-thin-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-thin-scrollbar::-webkit-scrollbar-thumb {
            background: ${isLight ? '#CBD5E1' : '#374151'};
            border-radius: 10px;
          }
          .custom-thin-scrollbar:hover::-webkit-scrollbar-thumb {
            background: ${isLight ? '#94A3B8' : '#4B5563'};
          }
        `}
      </style>
      <div className="flex-1 overflow-y-auto custom-thin-scrollbar py-3 px-3 flex flex-col gap-[6px]">
        {visibleMenuItems.map((item) => {
          const homePaths = ['/analytics', '/dashboard', '/admin/analytics', '/admin/home', '/chapter-admin/home', '/member/home'];
          const isHomeItem = item.label === 'Home' || homePaths.includes(item.path);
          const isActive = location.pathname === item.path || (isHomeItem && homePaths.includes(location.pathname));
          
          return (
            <div key={item.path} className="relative group">
              <Link
                to={item.path}
                onClick={() => onClose?.()}
                data-active={isActive ? "true" : undefined}
                className={cn(
                  "sidebar-nav-item flex items-center gap-3 px-3 h-[46px] rounded-[14px] transition-all duration-300 relative overflow-hidden group",
                  isCollapsed && "justify-center px-0",
                  isActive 
                    ? isLight
                      ? "sidebar-active-item text-slate-900 font-bold bg-red-50/90 shadow-sm border border-red-200/90"
                      : "sidebar-active-item text-white font-bold bg-[#E53935]/10 shadow-[0_0_15px_rgba(229,57,53,0.12)] border border-[#E53935]/20"
                    : isLight
                      ? "text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-semibold"
                      : "text-[#9CA3AF] hover:bg-[#1F2937]/50 hover:text-white font-medium"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeNavIndicator" 
                    className={cn(
                      "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full",
                      isLight 
                        ? "bg-[#DC2626] shadow-[0_0_8px_rgba(220,38,38,0.4)]" 
                        : "bg-[#E53935] shadow-[0_0_12px_rgba(229,57,53,0.8)]"
                    )} 
                  />
                )}
                
                <motion.div
                  whileHover={{ scale: 1.12, rotate: 4 }}
                  transition={{ type: "spring", stiffness: 400, damping: 12 }}
                  className="relative z-10 shrink-0"
                >
                  <item.icon 
                    size={20} 
                    strokeWidth={isActive ? 2.5 : 2} 
                    className={cn(
                      "transition-colors duration-200",
                      isActive 
                        ? isLight 
                          ? "text-[#DC2626]" 
                          : "text-[#E53935] drop-shadow-[0_0_8px_rgba(229,57,53,0.6)]" 
                        : isLight 
                          ? "text-slate-500 group-hover:text-slate-900" 
                          : "text-[#9CA3AF] group-hover:text-white"
                    )} 
                  />
                </motion.div>
                
                <span className={cn(
                  "text-[14px] whitespace-nowrap flex-1 relative z-10 tracking-tight",
                  isActive
                    ? isLight ? "text-slate-900 font-bold" : "text-white font-bold"
                    : isLight ? "text-slate-700 group-hover:text-slate-900 font-semibold" : "text-[#9CA3AF] group-hover:text-white font-medium"
                )}>
                  {item.label}
                </span>

                {item.badge && (
                  <motion.span 
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className={cn(
                      "text-white text-[10px] font-extrabold w-[18px] h-[18px] flex items-center justify-center rounded-full relative z-10 shadow-sm",
                      isLight ? "bg-[#DC2626]" : "bg-[#E53935] shadow-[0_0_8px_rgba(229,57,53,0.5)]"
                    )}
                  >
                    {item.badge}
                  </motion.span>
                )}
              </Link>

              {/* Floating Tooltip in Collapsed Desktop Mode */}
              {isCollapsed && (
                <div className={cn(
                  "hidden lg:group-hover:flex pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap z-[100] items-center gap-1.5 animate-in fade-in duration-150",
                  isLight 
                    ? "bg-slate-900 text-white border border-slate-700" 
                    : "bg-[#1F2937] text-white border border-white/10"
                )}>
                  <span className="text-white font-medium">{item.label}</span>
                  {item.badge && (
                    <span className={cn(
                      "text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                      isLight ? "bg-[#DC2626]" : "bg-[#E53935]"
                    )}>
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Actions (Sticky) */}
      <div className={cn(
        "shrink-0 p-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-4 lg:pb-3 flex flex-col gap-1.5 z-30 relative transition-all duration-300",
        isLight ? "border-t border-slate-200/90 bg-white" : "border-t border-[#1F2937]/50 bg-[#11131A]",
        isCollapsed && "px-2"
      )}>
        {canAccessSettings && (
          <div className="relative group w-full">
            <Link 
              to="/settings" 
              onClick={() => onClose?.()}
              data-active={location.pathname === '/settings' ? "true" : undefined}
              className={cn(
                "sidebar-nav-item flex items-center gap-3 px-3 h-[42px] rounded-[14px] transition-all touch-manipulation group",
                isCollapsed && "justify-center px-0",
                location.pathname === '/settings'
                  ? isLight
                    ? "sidebar-active-item text-slate-900 font-bold bg-red-50/90 shadow-sm border border-red-200/90"
                    : "sidebar-active-item text-white font-bold bg-[#E53935]/10 shadow-[0_0_15px_rgba(229,57,53,0.12)] border border-[#E53935]/20"
                  : isLight
                    ? "text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-semibold"
                    : "text-[#9CA3AF] hover:bg-[#1F2937]/50 hover:text-white font-medium"
              )}
            >
              <Settings 
                size={20} 
                className={cn(
                  "shrink-0 transition-colors",
                  location.pathname === '/settings'
                    ? isLight ? "text-[#DC2626]" : "text-[#E53935]"
                    : isLight ? "text-slate-500 group-hover:text-slate-900" : "text-[#9CA3AF] group-hover:text-white"
                )} 
              />
              <span className={cn(
                "text-[14px] truncate",
                isCollapsed && "hidden",
                location.pathname === '/settings' ? (isLight ? "text-slate-900 font-bold" : "text-white font-bold") : (isLight ? "text-slate-700 font-semibold" : "")
              )}>
                Settings
              </span>
            </Link>
            {isCollapsed && (
              <div className={cn(
                "hidden lg:group-hover:flex pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap z-[100] animate-in fade-in duration-150",
                isLight ? "bg-slate-900 text-white border border-slate-700" : "bg-[#1F2937] text-white border border-white/10"
              )}>
                Settings
              </div>
            )}
          </div>
        )}
        <div className="relative group w-full">
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose?.();
              handleLogout();
            }} 
            className={cn(
              "flex items-center gap-3 px-3 h-[44px] w-full rounded-[14px] transition-all text-left cursor-pointer shrink-0 touch-manipulation z-30 group",
              isCollapsed && "justify-center px-0",
              isLight
                ? "text-red-600 hover:bg-red-50 hover:text-red-700 active:bg-red-100 font-semibold"
                : "text-red-400 hover:bg-red-500/10 hover:text-red-300 active:bg-red-500/20 font-medium"
            )}
          >
            <LogOut 
              size={20} 
              className={cn(
                "shrink-0 transition-colors",
                isLight ? "text-red-600 group-hover:text-red-700" : "text-red-400 group-hover:text-red-300"
              )} 
            />
            <span className={cn(
              "text-[14px] truncate",
              isCollapsed && "hidden",
              isLight ? "text-red-600 group-hover:text-red-700 font-semibold" : "text-red-400 font-medium"
            )}>
              Logout
            </span>
          </button>
          {isCollapsed && (
            <div className={cn(
              "hidden lg:group-hover:flex pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap z-[100] animate-in fade-in duration-150",
              isLight ? "bg-slate-900 text-white border border-slate-700" : "bg-[#1F2937] text-white border border-white/10"
            )}>
              Logout
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
