import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  Share2, 
  Calendar, 
  Award, 
  UserPlus, 
  MessageSquare, 
  CreditCard, 
  Trash2, 
  CheckCheck,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Notification } from '../../types';
import { notificationService } from '../../services/notificationService';
import { safeFormat } from '../../utils/dateUtils';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';

interface NotificationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

export function NotificationPopover({ isOpen, onClose, anchorRef }: NotificationPopoverProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const panelRef = useRef<HTMLDivElement>(null);

  // Position state calculated dynamically relative to the bell icon and viewport
  const [panelStyles, setPanelStyles] = useState<React.CSSProperties>({
    position: 'fixed',
    top: '64px',
    right: '12px',
    width: 'min(400px, calc(100vw - 24px))',
    maxHeight: '70vh',
    zIndex: 50,
  });

  const userId = profile?.uid || profile?.id || '';

  // 1. Dynamic positioning calculation relative to bell button
  const recalculatePosition = useCallback(() => {
    if (!isOpen) return;

    const bellEl = anchorRef?.current || document.getElementById('notification-bell-btn');
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (bellEl) {
      const rect = bellEl.getBoundingClientRect();
      const top = Math.round(rect.bottom + 8);
      // Safe max-height to ensure it never overflows bottom edge
      const maxHeight = Math.min(540, Math.max(260, vh - top - 16));

      if (vw < 480) {
        // Mobile layout: fitted within screen boundaries with 12px margin on left and right
        const width = Math.min(420, vw - 24);
        const left = Math.max(12, Math.floor((vw - width) / 2));
        setPanelStyles({
          position: 'fixed',
          top: `${top}px`,
          left: `${left}px`,
          right: 'auto',
          width: `${width}px`,
          maxHeight: `${maxHeight}px`,
          zIndex: 50,
        });
      } else {
        // Tablet & Desktop layout: anchored beneath bell icon, shifted left if needed
        const width = Math.min(400, vw - 24);
        // Distance from right edge of viewport to right edge of bell icon
        let right = Math.max(12, Math.round(vw - rect.right - 4));
        
        // Ensure left edge does not exceed viewport left boundary (keep at least 12px from left)
        if (vw - right - width < 12) {
          right = Math.max(12, vw - width - 12);
        }

        setPanelStyles({
          position: 'fixed',
          top: `${top}px`,
          right: `${right}px`,
          left: 'auto',
          width: `${width}px`,
          maxHeight: `${maxHeight}px`,
          zIndex: 50,
        });
      }
    } else {
      // Fallback if bell element is not yet rendered
      setPanelStyles({
        position: 'fixed',
        top: '64px',
        right: '16px',
        width: 'min(400px, calc(100vw - 24px))',
        maxHeight: '70vh',
        zIndex: 50,
      });
    }
  }, [isOpen, anchorRef]);

  // Update positioning when opened, resized, scrolled, or orientation changes
  useEffect(() => {
    if (!isOpen) return;

    recalculatePosition();

    const handleResizeOrScroll = () => {
      recalculatePosition();
    };

    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, true);
    window.addEventListener('orientationchange', handleResizeOrScroll);

    return () => {
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll, true);
      window.removeEventListener('orientationchange', handleResizeOrScroll);
    };
  }, [isOpen, recalculatePosition]);

  // 2. Subscribe to real-time notifications
  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    const unsubscribe = notificationService.subscribeUserNotifications(
      userId,
      (newNotif) => {
        setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)]);
      },
      (list) => {
        setNotifications(list);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // 3. Click outside and Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      // If clicking inside the popover panel, do not close
      if (panelRef.current && panelRef.current.contains(event.target as Node)) {
        return;
      }
      // If clicked the bell trigger button itself, Layout's toggle handler will handle it
      const bellButton = anchorRef?.current || document.getElementById('notification-bell-btn');
      if (bellButton && bellButton.contains(event.target as Node)) {
        return;
      }
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('touchstart', handleClickOutside, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('touchstart', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, anchorRef]);

  // Action: Mark single as read
  const handleMarkAsRead = async (id: string) => {
    await notificationService.markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true, is_read: true } : n))
    );
  };

  // Action: Mark all as read
  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) return;
    await notificationService.markAllAsRead(userId);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true, is_read: true }))
    );
  };

  // Action: Delete notification
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await notificationService.deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Action: Clear all
  const handleClearAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) return;
    await notificationService.clearAll(userId);
    setNotifications([]);
  };

  // Action: Notification Click -> Marks read & Navigates to the relevant feature screen
  const handleNotificationClick = async (notif: Notification) => {
    const isUnread = !notif.read && !notif.is_read;
    if (isUnread) {
      await handleMarkAsRead(notif.id);
    }

    const targetUrl = notificationService.resolveLink(notif, profile?.role);
    onClose();
    navigate(targetUrl);
  };

  // Helpers for Icon and category styling
  const getNotificationVisuals = (notif: Notification) => {
    const type = (notif.type || '').toUpperCase();
    const text = `${notif.title || ''} ${notif.message || ''}`.toLowerCase();

    if (type === 'REFERRAL' || text.includes('referral')) {
      return {
        icon: Share2,
        colorClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        badge: 'Referral',
        badgeColor: 'text-emerald-400 bg-emerald-500/10'
      };
    }
    if (type === 'THANKYOU' || text.includes('thank you') || text.includes('thankyou') || text.includes('slip')) {
      return {
        icon: Award,
        colorClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        badge: 'Thank You',
        badgeColor: 'text-amber-400 bg-amber-500/10'
      };
    }
    if (type === 'MEETING' || text.includes('meeting') || text.includes('1-to-1') || text.includes('one-to-one')) {
      return {
        icon: Calendar,
        colorClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        badge: 'Meeting',
        badgeColor: 'text-blue-400 bg-blue-500/10'
      };
    }
    if (type === 'GUEST' || type === 'GUEST_REGISTRATION' || text.includes('guest')) {
      return {
        icon: UserPlus,
        colorClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        badge: 'Guest',
        badgeColor: 'text-purple-400 bg-purple-500/10'
      };
    }
    if (type === 'TESTIMONIAL' || text.includes('testimonial')) {
      return {
        icon: MessageSquare,
        colorClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
        badge: 'Testimonial',
        badgeColor: 'text-indigo-400 bg-indigo-500/10'
      };
    }
    if (type === 'SUBSCRIPTION' || type === 'UPGRADE' || type === 'UPGRADE_REQUEST' || text.includes('subscription')) {
      return {
        icon: CreditCard,
        colorClass: 'bg-red-500/10 text-red-400 border-red-500/20',
        badge: 'Subscription',
        badgeColor: 'text-red-400 bg-red-500/10'
      };
    }
    if (type === 'MEMBER_ADD' || text.includes('member added') || text.includes('new member')) {
      return {
        icon: UserPlus,
        colorClass: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
        badge: 'Member',
        badgeColor: 'text-teal-400 bg-teal-500/10'
      };
    }
    return {
      icon: Bell,
      colorClass: 'bg-primary/10 text-primary border-primary/20',
      badge: notif.type ? notif.type.replace('_', ' ') : 'Alert',
      badgeColor: 'text-primary bg-primary/10'
    };
  };

  const unreadCount = notifications.filter((n) => !n.read && !n.is_read).length;
  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'UNREAD') return !n.read && !n.is_read;
    return true;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          style={panelStyles}
          className="bg-[#111827] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col backdrop-blur-2xl"
          role="dialog"
          aria-label="Notifications Panel"
        >
          {/* Header */}
          <div className="p-3.5 sm:p-4 border-b border-white/5 flex items-center justify-between gap-2 shrink-0 bg-[#141C2E]/75">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Bell size={15} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-wide">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-extrabold bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {unreadCount} new
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  title="Mark all as read"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-all text-[11px] font-semibold active:scale-95 cursor-pointer"
                >
                  <CheckCheck size={13} className="text-primary" />
                  <span className="hidden sm:inline">Mark read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  title="Clear all notifications"
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 text-neutral-400 hover:text-red-400 transition-all text-[11px] font-semibold active:scale-95 cursor-pointer"
                >
                  <Trash2 size={13} />
                </button>
              )}
              <button
                onClick={onClose}
                title="Close notifications"
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-all active:scale-95 cursor-pointer"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          {notifications.length > 0 && (
            <div className="px-3.5 py-2 border-b border-white/5 bg-[#0F1523]/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveFilter('ALL')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                    activeFilter === 'ALL'
                      ? "bg-primary text-white shadow-sm"
                      : "text-neutral-400 hover:text-neutral-200 hover:bg-white/5"
                  )}
                >
                  All ({notifications.length})
                </button>
                <button
                  onClick={() => setActiveFilter('UNREAD')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                    activeFilter === 'UNREAD'
                      ? "bg-primary text-white shadow-sm"
                      : "text-neutral-400 hover:text-neutral-200 hover:bg-white/5"
                  )}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              <span className="text-[10px] text-neutral-500 font-medium">Click item to open</span>
            </div>
          )}

          {/* Scrollable Notifications List */}
          <div className="overflow-y-auto custom-scrollbar flex-1 divide-y divide-white/5 overscroll-contain">
            {loading ? (
              <div className="py-12 text-center">
                <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-2" />
                <p className="text-[11px] font-medium text-neutral-400">Loading notifications...</p>
              </div>
            ) : filteredNotifications.length > 0 ? (
              filteredNotifications.map((notif) => {
                const isUnread = !notif.read && !notif.is_read;
                const visual = getNotificationVisuals(notif);
                const VisualIcon = visual.icon;
                const notifTitle = notif.title || notificationService.getDefaultTitleForType(notif.type);

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={cn(
                      "p-3.5 flex items-start gap-3 transition-colors cursor-pointer group relative overflow-hidden",
                      isUnread 
                        ? "bg-[#161F33]/90 hover:bg-[#1A253D]" 
                        : "hover:bg-white/[0.03]"
                    )}
                  >
                    {/* Unread Accent Indicator */}
                    {isUnread && (
                      <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                    )}

                    {/* Visual Icon */}
                    <div className={cn(
                      "w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 mt-0.5",
                      visual.colorClass
                    )}>
                      <VisualIcon size={16} />
                    </div>

                    {/* Content - Fully wrapping without horizontal overflow */}
                    <div className="flex-1 min-w-0 pr-1 space-y-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={cn(
                            "text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded",
                            visual.badgeColor
                          )}>
                            {visual.badge}
                          </span>
                          <span className="text-[10px] text-neutral-500 font-medium whitespace-nowrap">
                            {safeFormat(notif.createdAt, 'dd MMM • HH:mm')}
                          </span>
                        </div>

                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        )}
                      </div>

                      <h4 className={cn(
                        "text-xs font-bold leading-snug group-hover:text-primary transition-colors break-words",
                        isUnread ? "text-white" : "text-neutral-200"
                      )}>
                        {notifTitle}
                      </h4>

                      <p className={cn(
                        "text-[11px] leading-relaxed break-words whitespace-normal",
                        isUnread ? "text-neutral-300 font-medium" : "text-neutral-400"
                      )}>
                        {notif.message}
                      </p>
                    </div>

                    {/* Delete Action Button on Hover */}
                    <button
                      onClick={(e) => handleDelete(e, notif.id)}
                      title="Delete notification"
                      className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 p-1.5 rounded-md hover:bg-red-500/10 transition-all shrink-0 self-center cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="py-12 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-neutral-500 mx-auto mb-2.5">
                  <Bell size={18} />
                </div>
                <h4 className="text-xs font-bold text-white mb-0.5">No notifications</h4>
                <p className="text-[11px] text-neutral-400">
                  {activeFilter === 'UNREAD' 
                    ? "You have no unread notifications."
                    : "You're all caught up with meetings, referrals, and updates."}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
