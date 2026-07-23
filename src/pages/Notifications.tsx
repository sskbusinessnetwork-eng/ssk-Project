import { Avatar } from '../components/Avatar';
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Bell, 
  Info, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  Trash2, 
  UserPlus, 
  Calendar, 
  Share2, 
  CreditCard, 
  User, 
  ChevronRight, 
  Filter, 
  BellOff, 
  Sparkles,
  Check
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Notification } from '../types';
import { notificationService, TaskChecklistItem } from '../services/notificationService';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

type FilterCategory = 'ALL' | 'UNREAD' | 'MEETINGS' | 'REFERRALS' | 'GUESTS' | 'SUBSCRIPTION' | 'SYSTEM';

export function Notifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [tasks, setTasks] = useState<TaskChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('ALL');
  const [permissionState, setPermissionState] = useState<NotificationPermission>(
    notificationService.getPermissionState()
  );
  const navigate = useNavigate();

  const userId = profile?.uid || profile?.id || '';

  // 1. Subscribe to real-time notifications & run automated checks
  useEffect(() => {
    if (!userId) return;

    setLoading(true);

    // Initial automated check for reminders
    notificationService.runAutomatedReminders(profile);

    // Load task checklist
    notificationService.getTodayTaskChecklist(userId, profile).then(setTasks);

    // Subscribe to notifications table
    const unsubscribe = notificationService.subscribeUserNotifications(
      userId,
      (newNotif) => {
        // New notification received via Realtime
        setNotifications(prev => [newNotif, ...prev]);
      },
      (list) => {
        setNotifications(list);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, profile]);

  // Request Notification Permission
  const handleEnableNotifications = async () => {
    if (!userId) return;
    const res = await notificationService.requestPermission(userId);
    setPermissionState(res);
  };

  // Mark single as read
  const handleMarkAsRead = async (id: string) => {
    await notificationService.markAsRead(id);
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    if (!userId) return;
    await notificationService.markAllAsRead(userId);
  };

  // Delete notification
  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await notificationService.deleteNotification(id);
  };

  // Clear all notifications
  const handleClearAll = async () => {
    if (!userId) return;
    await notificationService.clearAll(userId);
  };

  // Handle notification click
  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.read && !notif.is_read) {
      await handleMarkAsRead(notif.id);
    }

    const targetUrl = notif.link || notificationService.getDefaultLinkForType(
      notif.type, 
      notif.relatedUserId || notif.relatedId
    );
    
    navigate(targetUrl);
  };

  // Filtered Notifications List
  const filteredNotifications = notifications.filter(n => {
    const isUnread = !n.read && !n.is_read;
    if (activeFilter === 'UNREAD') return isUnread;
    if (activeFilter === 'MEETINGS') return n.type === 'MEETING';
    if (activeFilter === 'REFERRALS') return n.type === 'REFERRAL' || n.type === 'THANKYOU';
    if (activeFilter === 'GUESTS') return n.type === 'GUEST' || n.type === 'GUEST_REGISTRATION';
    if (activeFilter === 'SUBSCRIPTION') return n.type === 'SUBSCRIPTION';
    if (activeFilter === 'SYSTEM') return n.type === 'SYSTEM' || n.type === 'PROFILE' || n.type === 'MEMBER_ADD';
    return true; // ALL
  });

  const unreadCount = notifications.filter(n => !n.read && !n.is_read).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] p-5 rounded-[20px] border border-white/5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-[14px] flex items-center justify-center text-primary relative">
            <Bell size={24} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#111827]">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white tracking-wide">Notification Center</h1>
              {unreadCount > 0 && (
                <span className="text-[10px] font-extrabold bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {unreadCount} Unread
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-400 font-medium">Real-time alerts, meetings & referral updates</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-all text-[11px] font-bold uppercase tracking-wider active:scale-95"
            >
              <Check size={14} />
              Mark All Read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all text-[11px] font-bold uppercase tracking-wider active:scale-95"
            >
              <Trash2 size={14} />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Push Notification Permission Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "p-4 rounded-[16px] border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg",
          permissionState === 'granted' 
            ? "bg-gradient-to-r from-emerald-500/20 via-emerald-500/5 to-transparent border-emerald-500/30"
            : "bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-primary/30"
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
            permissionState === 'granted' ? "bg-emerald-500/20 text-emerald-400" : "bg-primary/20 text-primary"
          )}>
            {permissionState === 'granted' ? <Bell size={20} /> : <BellOff size={20} />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Push Notifications</h3>
            <p className="text-xs text-neutral-300">
              {permissionState === 'granted' 
                ? "You will receive referral, meeting, and task reminders."
                : permissionState === 'denied'
                ? "Notifications are disabled. Please enable them in your browser settings to receive reminders."
                : "Enable notifications to receive referral, meeting, and task reminders."}
            </p>
          </div>
        </div>
        <button
          onClick={handleEnableNotifications}
          disabled={permissionState === 'granted'}
          className={cn(
            "shrink-0 px-4 py-2 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all",
            permissionState === 'granted'
              ? "bg-emerald-600/50 cursor-default opacity-80"
              : permissionState === 'denied'
              ? "bg-neutral-600 hover:bg-neutral-500 active:scale-95"
              : "bg-primary hover:bg-primary/90 active:scale-95"
          )}
        >
          {permissionState === 'granted' ? '✓ Notifications Enabled' : 'Enable Notifications'}
        </button>
      </motion.div>

      {/* Today's Task Checklist Section */}
      <div className="bg-[#111827] rounded-[20px] p-5 border border-white/5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-amber-400" />
            <h2 className="text-sm font-black text-white uppercase tracking-wider">Today's Task Checklist</h2>
          </div>
          <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest bg-[#151C2E] px-2 py-0.5 rounded-md">
            {format(new Date(), 'dd MMM yyyy')}
          </span>
        </div>

        {tasks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tasks.map(task => (
              <div
                key={task.id}
                onClick={() => navigate(task.link)}
                className={cn(
                  "p-3.5 rounded-[14px] border flex items-center justify-between gap-3 cursor-pointer transition-all hover:scale-[1.01] active:scale-95 group",
                  task.urgent ? "bg-red-500/5 border-red-500/30 hover:border-red-500/50" : "bg-[#151C2E] border-white/5 hover:border-primary/30"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold",
                    task.type === 'one_to_one' ? "bg-blue-500/10 text-blue-400" :
                    task.type === 'referral' ? "bg-emerald-500/10 text-emerald-400" :
                    task.type === 'subscription' ? "bg-red-500/10 text-red-400" :
                    task.type === 'guest' ? "bg-purple-500/10 text-purple-400" :
                    "bg-amber-500/10 text-amber-400"
                  )}>
                    {task.type === 'one_to_one' ? <Calendar size={16} /> :
                     task.type === 'referral' ? <Share2 size={16} /> :
                     task.type === 'subscription' ? <CreditCard size={16} /> :
                     task.type === 'guest' ? <UserPlus size={16} /> :
                     <CheckCircle2 size={16} />}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white truncate group-hover:text-primary transition-colors">{task.title}</h4>
                    {task.statusText && (
                      <p className="text-[10px] text-neutral-400 truncate">{task.statusText}</p>
                    )}
                  </div>
                </div>
                <ChevronRight size={16} className="text-neutral-500 group-hover:text-primary transition-colors shrink-0" />
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 text-center bg-[#151C2E] rounded-xl border border-emerald-500/20 flex items-center justify-center gap-2 text-emerald-400">
            <CheckCircle2 size={20} />
            <span className="text-xs font-bold uppercase tracking-wider">You're all caught up for today.</span>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {(['ALL', 'UNREAD', 'MEETINGS', 'REFERRALS', 'GUESTS', 'SUBSCRIPTION', 'SYSTEM'] as FilterCategory[]).map(tab => {
          const isActive = activeFilter === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-widest whitespace-nowrap transition-all border shrink-0",
                isActive 
                  ? "bg-primary text-white border-primary shadow-md shadow-primary/20" 
                  : "bg-[#111827] text-neutral-400 border-white/5 hover:border-white/10 hover:text-white"
              )}
            >
              {tab.replace('_', ' ')}
            </button>
          );
        })}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Loading Notifications...</p>
          </div>
        ) : filteredNotifications.length > 0 ? (
          filteredNotifications.map((notif, i) => {
            const isUnread = !notif.read && !notif.is_read;
            const notifTitle = notif.title || notificationService.getDefaultTitleForType(notif.type);

            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => handleNotificationClick(notif)}
                className={cn(
                  "bg-[#111827] p-4 rounded-[16px] border flex gap-4 items-start group hover:border-primary/40 transition-all cursor-pointer relative overflow-hidden shadow-sm",
                  isUnread ? "border-l-4 border-l-primary bg-[#111827]" : "border-white/5 bg-[#111827]/60"
                )}
              >
                {isUnread && (
                  <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />
                )}

                {/* Type Icon */}
                <div className={cn(
                  "w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                  notif.type === 'REFERRAL' ? "bg-emerald-500/10 text-emerald-400" :
                  notif.type === 'MEETING' ? "bg-blue-500/10 text-blue-400" :
                  notif.type === 'SUBSCRIPTION' ? "bg-red-500/10 text-red-400" :
                  notif.type === 'GUEST' || notif.type === 'GUEST_REGISTRATION' ? "bg-purple-500/10 text-purple-400" :
                  notif.type === 'THANKYOU' ? "bg-amber-500/10 text-amber-400" :
                  "bg-primary/10 text-primary"
                )}>
                  {notif.type === 'REFERRAL' ? <Share2 size={20} /> :
                   notif.type === 'MEETING' ? <Calendar size={20} /> :
                   notif.type === 'SUBSCRIPTION' ? <CreditCard size={20} /> :
                   notif.type === 'GUEST' || notif.type === 'GUEST_REGISTRATION' ? <UserPlus size={20} /> :
                   notif.type === 'THANKYOU' ? <Award size={20} /> :
                   <Info size={20} />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md",
                      notif.type === 'REFERRAL' ? "bg-emerald-500/10 text-emerald-400" :
                      notif.type === 'MEETING' ? "bg-blue-500/10 text-blue-400" :
                      notif.type === 'SUBSCRIPTION' ? "bg-red-500/10 text-red-400" :
                      "bg-[#151C2E] text-neutral-400"
                    )}>
                      {notif.type.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-bold">
                      {format(new Date(notif.createdAt), 'dd MMM • HH:mm')}
                    </span>
                  </div>

                  <h3 className={cn("text-xs font-bold mb-0.5", isUnread ? "text-white" : "text-neutral-300")}>
                    {notifTitle}
                  </h3>
                  <p className={cn("text-xs leading-relaxed", isUnread ? "text-neutral-200 font-medium" : "text-neutral-400")}>
                    {notif.message}
                  </p>
                </div>

                {/* Action buttons */}
                <button
                  onClick={(e) => handleDeleteNotification(e, notif.id)}
                  title="Delete notification"
                  className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-all shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </motion.div>
            );
          })
        ) : (
          <div className="py-16 text-center bg-[#111827] rounded-[24px] border border-dashed border-white/5">
            <Bell size={40} className="mx-auto text-neutral-600 mb-3" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">No notifications</h3>
            <p className="text-xs text-neutral-400 font-medium mt-1">We'll notify you when new events or task reminders occur.</p>
          </div>
        )}
      </div>
    </div>
  );
}
