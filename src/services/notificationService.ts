import { databaseService } from './databaseService';
import type { UserRole, Notification } from '../types';
import { where, doc, updateDoc, deleteDoc, db } from '../lib/database';
import { supabase } from '../lib/supabaseClient';

export type NotificationType = 
  | 'REFERRAL' 
  | 'MEETING' 
  | 'GUEST' 
  | 'SUBSCRIPTION' 
  | 'SYSTEM' 
  | 'THANKYOU' 
  | 'TESTIMONIAL' 
  | 'MEMBER_ADD' 
  | 'UPGRADE' 
  | 'UPGRADE_REQUEST' 
  | 'GUEST_REGISTRATION' 
  | 'ASSOCIATE_MEMBER_INVITE'
  | 'PROFILE';

export interface CreateNotificationParams {
  userId: string;
  role?: UserRole;
  type: NotificationType;
  title?: string;
  message: string;
  relatedUserId?: string;
  relatedId?: string;
  link?: string;
}

export interface TaskChecklistItem {
  id: string;
  title: string;
  type: 'chapter_meeting' | 'one_to_one' | 'attendance' | 'referral' | 'guest' | 'subscription' | 'profile' | 'thankyou' | 'testimonial';
  link: string;
  statusText?: string;
  urgent?: boolean;
}

export const notificationService = {
  // ==========================================================
  // PUSH NOTIFICATION PERMISSION & BROWSER NATIVE PUSH
  // ==========================================================

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn("Browser does not support notifications.");
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        this.registerServiceWorker();
      }
      return permission;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return 'denied';
    }
  },

  getPermissionState(): NotificationPermission {
    if (!('Notification' in window)) return 'denied';
    return Notification.permission;
  },

  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        console.log("Service Worker registered for push notifications:", reg.scope);
      } catch (e) {
        console.warn("Service Worker registration notice:", e);
      }
    }
  },

  showSystemNotification(title: string, body: string, link: string = '/notifications') {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            data: { url: link },
            tag: 'ssk-push-' + Date.now()
          });
        });
      } else {
        const notif = new Notification(title, {
          body,
          icon: '/favicon.ico',
          data: { url: link }
        });
        notif.onclick = () => {
          window.focus();
          window.location.href = link;
        };
      }
    } catch (err) {
      console.warn("System notification display error:", err);
    }
  },

  // ==========================================================
  // NOTIFICATION CREATION & DATABASE SYNC
  // ==========================================================

  async createNotification(
    userId: string, 
    role: UserRole = 'MEMBER', 
    type: NotificationType, 
    message: string, 
    relatedUserId?: string,
    title?: string,
    link?: string
  ) {
    if (!userId) return;

    const payload = {
      userId,
      role,
      type,
      title: title || this.getDefaultTitleForType(type),
      message,
      read: false,
      isRead: false,
      relatedUserId: relatedUserId || null,
      link: link || this.getDefaultLinkForType(type, relatedUserId),
      createdAt: new Date().toISOString()
    };

    try {
      const createdId = await databaseService.create('notifications', payload);
      return createdId;
    } catch (error) {
      console.error("Error creating notification:", error);
    }
  },

  async sendNotification(params: CreateNotificationParams) {
    return this.createNotification(
      params.userId,
      params.role || 'MEMBER',
      params.type,
      params.message,
      params.relatedUserId,
      params.title,
      params.link
    );
  },

  async notifyMasterAdmins(type: NotificationType, message: string, relatedUserId?: string, title?: string, link?: string) {
    try {
      const masterAdmins = await databaseService.list<any>('users', [
        where('role', '==', 'MASTER_ADMIN')
      ]);
      
      const promises = masterAdmins.map(admin => 
        this.createNotification(admin.uid || admin.id, 'MASTER_ADMIN', type, message, relatedUserId, title, link)
      );
      return Promise.all(promises);
    } catch (e) {
      console.warn("notifyMasterAdmins error:", e);
    }
  },

  async notifyChapterAdmins(chapterId: string, type: NotificationType, message: string, relatedUserId?: string, title?: string, link?: string) {
    if (!chapterId) return;
    try {
      const { data: chapterUsers } = await supabase
        .from('users')
        .select('*')
        .eq('chapter_id', chapterId);

      if (chapterUsers) {
        const admins = chapterUsers.filter(u => u.role === 'CHAPTER_ADMIN' || ['president', 'vice_president', 'treasurer', 'chapter_admin'].includes(u.position));
        const promises = admins.map(a => 
          this.createNotification(a.id, a.role || 'CHAPTER_ADMIN', type, message, relatedUserId, title, link)
        );
        return Promise.all(promises);
      }
    } catch (e) {
      console.warn("notifyChapterAdmins error:", e);
    }
  },

  getDefaultTitleForType(type: NotificationType): string {
    switch (type) {
      case 'REFERRAL': return 'Referral Update';
      case 'MEETING': return 'Meeting Alert';
      case 'GUEST': return 'Guest Invitation';
      case 'SUBSCRIPTION': return 'Subscription Notice';
      case 'THANKYOU': return 'Thank You Slip';
      case 'TESTIMONIAL': return 'Testimonial Received';
      case 'PROFILE': return 'Profile Reminder';
      case 'MEMBER_ADD': return 'New Member Alert';
      case 'GUEST_REGISTRATION': return 'Guest Registration';
      default: return 'System Notification';
    }
  },

  getDefaultLinkForType(type: NotificationType, relatedId?: string): string {
    switch (type) {
      case 'REFERRAL': return '/referrals';
      case 'MEETING': return '/one-to-one';
      case 'GUEST': case 'GUEST_REGISTRATION': return '/guests';
      case 'SUBSCRIPTION': return '/subscriptions';
      case 'THANKYOU': return '/my-report';
      case 'TESTIMONIAL': return '/testimonials';
      case 'PROFILE': return '/profile';
      default: return '/notifications';
    }
  },

  // ==========================================================
  // REALTIME SUBSCRIPTION
  // ==========================================================

  subscribeUserNotifications(userId: string, onNewNotification?: (notif: Notification) => void, onListUpdate?: (list: Notification[]) => void) {
    if (!userId) return () => {};

    // 1. Initial & List Subscription via databaseService
    const constraints = [
      where('userId', '==', userId)
    ];

    const unsubscribeDb = databaseService.subscribe<Notification>('notifications', constraints, (data) => {
      const sorted = [...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (onListUpdate) onListUpdate(sorted);
    });

    // 2. Direct Supabase Realtime for instant System Push
    const channelName = `realtime-push-notif-${userId}-${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newRow = payload.new;
          if (newRow) {
            const notifTitle = newRow.title || this.getDefaultTitleForType(newRow.type);
            const notifMessage = newRow.message || 'You have a new update.';
            const link = newRow.link || this.getDefaultLinkForType(newRow.type, newRow.related_user_id || newRow.related_id);

            // Show system push notification
            this.showSystemNotification(notifTitle, notifMessage, link);

            if (onNewNotification) {
              onNewNotification({
                id: newRow.id,
                userId: newRow.user_id,
                type: newRow.type,
                title: notifTitle,
                message: notifMessage,
                read: newRow.is_read || false,
                is_read: newRow.is_read || false,
                relatedUserId: newRow.related_user_id || newRow.related_id,
                link,
                createdAt: newRow.created_at || new Date().toISOString()
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      unsubscribeDb();
      supabase.removeChannel(channel);
    };
  },

  // ==========================================================
  // ACTIONS: READ, DELETE, CLEAR
  // ==========================================================

  async markAsRead(id: string) {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true, is_read: true });
    } catch (e) {
      console.error("Error marking as read:", e);
    }
  },

  async markAllAsRead(userId: string) {
    if (!userId) return;
    try {
      const { data } = await supabase.from('notifications').select('id').eq('user_id', userId).eq('is_read', false);
      if (data && data.length > 0) {
        const ids = data.map(d => d.id);
        await supabase.from('notifications').update({ is_read: true }).in('id', ids);
      }
    } catch (e) {
      console.error("Error marking all as read:", e);
    }
  },

  async deleteNotification(id: string) {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (e) {
      console.error("Error deleting notification:", e);
    }
  },

  async clearAll(userId: string) {
    if (!userId) return;
    try {
      await supabase.from('notifications').delete().eq('user_id', userId);
    } catch (e) {
      console.error("Error clearing all notifications:", e);
    }
  },

  // ==========================================================
  // TODAY'S TASK CHECKLIST CALCULATOR
  // ==========================================================

  async getTodayTaskChecklist(userId: string, userProfile: any): Promise<TaskChecklistItem[]> {
    if (!userId) return [];

    const items: TaskChecklistItem[] = [];
    const todayStr = new Date().toISOString().split('T')[0];

    try {
      // 1. One-to-One Meetings Today
      const { data: rawMeetings } = await supabase.from('one_to_one_meetings').select('*');
      if (rawMeetings) {
        const userMeetingsToday = rawMeetings.filter(m => {
          const isParticipant = String(m.creator_id || m.sender_id) === String(userId) || String(m.member_id || m.receiver_id) === String(userId);
          const isToday = m.date === todayStr || m.scheduled_date === todayStr;
          return isParticipant && isToday && m.status !== 'CANCELLED';
        });

        if (userMeetingsToday.length > 0) {
          items.push({
            id: 'task-meetings-today',
            title: `Today's One-to-One Meetings (${userMeetingsToday.length})`,
            type: 'one_to_one',
            link: '/one-to-one',
            statusText: `${userMeetingsToday.length} meeting(s) scheduled for today`,
            urgent: true
          });
        }

        // 2. Pending Attendance for past meetings
        const pendingAttendanceMeetings = rawMeetings.filter(m => {
          const isCreator = String(m.creator_id || m.sender_id) === String(userId);
          const mDate = m.date || m.scheduled_date;
          const isPast = mDate && mDate < todayStr;
          const needsAttendance = m.status === 'UPCOMING' || m.status === 'PENDING' || !m.status;
          return isCreator && isPast && needsAttendance;
        });

        if (pendingAttendanceMeetings.length > 0) {
          items.push({
            id: 'task-pending-attendance',
            title: `Pending Attendance Updates (${pendingAttendanceMeetings.length})`,
            type: 'attendance',
            link: '/one-to-one',
            statusText: `Please update attendance for past 1-to-1 meetings`,
            urgent: true
          });
        }
      }

      // 3. Pending Referrals
      const { data: rawReferrals } = await supabase.from('referrals').select('*');
      if (rawReferrals) {
        const pendingRefs = rawReferrals.filter(r => {
          const isUser = String(r.from_user_id || r.sender_id) === String(userId) || String(r.to_user_id || r.receiver_id) === String(userId);
          return isUser && (r.status === 'Pending' || r.status === 'PENDING');
        });

        if (pendingRefs.length > 0) {
          items.push({
            id: 'task-pending-referrals',
            title: `Pending Referrals (${pendingRefs.length})`,
            type: 'referral',
            link: '/referrals',
            statusText: `${pendingRefs.length} referral(s) awaiting conversion / action`
          });
        }

        // 4. Referral Received Today
        const refsReceivedToday = rawReferrals.filter(r => {
          const isReceiver = String(r.to_user_id || r.receiver_id) === String(userId);
          const rDate = (r.created_at || '').split('T')[0];
          return isReceiver && rDate === todayStr;
        });

        if (refsReceivedToday.length > 0) {
          items.push({
            id: 'task-refs-today',
            title: `Referral Received Today (${refsReceivedToday.length})`,
            type: 'referral',
            link: '/referrals',
            statusText: `New business leads received today`,
            urgent: true
          });
        }
      }

      // 5. Chapter Meeting Today
      const { data: rawChapters } = await supabase.from('chapters').select('*');
      if (rawChapters && userProfile?.chapter_id) {
        const userChap = rawChapters.find(c => String(c.id) === String(userProfile.chapter_id));
        if (userChap && (userChap.next_meeting_date === todayStr || userChap.meeting_date === todayStr)) {
          items.push({
            id: 'task-chapter-meeting-today',
            title: `Today's Chapter Meeting - ${userChap.chapter_name}`,
            type: 'chapter_meeting',
            link: '/meetings',
            statusText: `Venue: ${userChap.meeting_venue || 'Scheduled Venue'}`,
            urgent: true
          });
        }
      }

      // 6. Subscription Renewal Check
      if (userProfile?.subscription_end_date || userProfile?.subscriptionEndDate) {
        const endDateStr = userProfile.subscription_end_date || userProfile.subscriptionEndDate;
        const diffMs = new Date(endDateStr).getTime() - new Date().getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) {
          items.push({
            id: 'task-subscription-renewal',
            title: diffDays <= 0 ? `Subscription Expired!` : `Subscription Renewal (${diffDays} days left)`,
            type: 'subscription',
            link: '/subscriptions',
            statusText: diffDays <= 0 ? 'Your subscription has expired. Please renew now.' : `Expiring on ${endDateStr}`,
            urgent: diffDays <= 7
          });
        }
      }

      // 7. Complete Profile Check
      const missingFields: string[] = [];
      if (!userProfile?.business_name) missingFields.push('Business Name');
      if (!userProfile?.profession_designation) missingFields.push('Profession');
      if (!userProfile?.profile_photo && !userProfile?.photoURL) missingFields.push('Profile Photo');
      if (!userProfile?.bio) missingFields.push('Bio');

      if (missingFields.length > 0) {
        items.push({
          id: 'task-complete-profile',
          title: `Complete Profile Details`,
          type: 'profile',
          link: '/profile',
          statusText: `Missing: ${missingFields.join(', ')}`
        });
      }

      // 8. Pending Guest Meetings / Invitations Today
      const { data: rawGuests } = await supabase.from('guest_registrations').select('*');
      if (rawGuests) {
        const guestsToday = rawGuests.filter(g => {
          const isHost = String(g.admin_id) === String(userId) || String(g.user_id) === String(userId);
          const gDate = g.meeting_date || g.meetingDate;
          return isHost && gDate === todayStr;
        });

        if (guestsToday.length > 0) {
          items.push({
            id: 'task-guest-today',
            title: `Guest Meeting Today (${guestsToday.length})`,
            type: 'guest',
            link: '/guests',
            statusText: `You have ${guestsToday.length} guest(s) attending today`
          });
        }
      }
    } catch (err) {
      console.warn("Error calculating task checklist:", err);
    }

    return items;
  },

  // ==========================================================
  // AUTOMATED SCHEDULER FOR REMINDERS & DAILY TASKS
  // ==========================================================

  async runAutomatedReminders(userProfile: any) {
    if (!userProfile || (!userProfile.id && !userProfile.uid)) return;

    const userId = userProfile.id || userProfile.uid;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    try {
      // 1. Daily Task Reminder at 8:00 AM (or once daily)
      const dailyKey = `notif_daily_task_${userId}_${todayStr}`;
      if (!localStorage.getItem(dailyKey)) {
        const tasks = await this.getTodayTaskChecklist(userId, userProfile);
        if (tasks.length > 0) {
          await this.sendNotification({
            userId,
            type: 'SYSTEM',
            title: "Good Morning! Today's Agenda",
            message: `Good Morning! You have ${tasks.length} pending task(s) today.`,
            link: '/notifications'
          });
        }
        localStorage.setItem(dailyKey, 'true');
      }

      // 2. One-to-One Meeting Reminders (1 Day, 1 Hour, 15 Mins, Attendance Pending)
      const { data: meetings } = await supabase.from('one_to_one_meetings').select('*');
      if (meetings) {
        for (const m of meetings) {
          const isParticipant = String(m.creator_id || m.sender_id) === String(userId) || String(m.member_id || m.receiver_id) === String(userId);
          const isCreator = String(m.creator_id || m.sender_id) === String(userId);
          if (!isParticipant || m.status === 'CANCELLED' || m.status === 'COMPLETED') continue;

          const dateVal = m.date || m.scheduled_date;
          const timeVal = m.time || m.scheduled_time || '10:00:00';
          if (!dateVal) continue;

          let meetingDateTime = new Date(`${dateVal}T${timeVal}`);
          if (isNaN(meetingDateTime.getTime())) {
            meetingDateTime = new Date(dateVal);
          }

          const diffMs = meetingDateTime.getTime() - now.getTime();
          const diffMinutes = Math.floor(diffMs / (1000 * 60));

          // 1 Day Before (between 23 and 25 hours)
          if (diffMinutes >= 1380 && diffMinutes <= 1500) {
            const key = `notif_remind_1d_${m.id}_${userId}`;
            if (!localStorage.getItem(key)) {
              await this.sendNotification({
                userId,
                type: 'MEETING',
                title: 'Meeting Tomorrow',
                message: `Reminder: Your One-to-One Meeting is scheduled for tomorrow at ${timeVal}.`,
                relatedId: m.id,
                link: '/one-to-one'
              });
              localStorage.setItem(key, 'true');
            }
          }

          // 1 Hour Before (between 50 and 70 minutes)
          if (diffMinutes >= 50 && diffMinutes <= 70) {
            const key = `notif_remind_1h_${m.id}_${userId}`;
            if (!localStorage.getItem(key)) {
              await this.sendNotification({
                userId,
                type: 'MEETING',
                title: 'Meeting in 1 Hour',
                message: `Reminder: Your One-to-One Meeting starts in 1 hour (${timeVal}).`,
                relatedId: m.id,
                link: '/one-to-one'
              });
              localStorage.setItem(key, 'true');
            }
          }

          // 15 Minutes Before (between 10 and 20 minutes)
          if (diffMinutes >= 10 && diffMinutes <= 20) {
            const key = `notif_remind_15m_${m.id}_${userId}`;
            if (!localStorage.getItem(key)) {
              await this.sendNotification({
                userId,
                type: 'MEETING',
                title: 'Meeting in 15 Minutes',
                message: `Your One-to-One Meeting begins in 15 minutes!`,
                relatedId: m.id,
                link: '/one-to-one'
              });
              localStorage.setItem(key, 'true');
            }
          }

          // Attendance Pending (Meeting time passed by > 30 minutes)
          if (diffMinutes < -30 && isCreator && (m.status === 'UPCOMING' || m.status === 'PENDING' || !m.status)) {
            const key = `notif_attendance_${m.id}`;
            if (!localStorage.getItem(key)) {
              await this.sendNotification({
                userId,
                type: 'MEETING',
                title: 'Attendance Pending',
                message: `Please update attendance for your One-to-One Meeting.`,
                relatedId: m.id,
                link: '/one-to-one'
              });
              localStorage.setItem(key, 'true');
            }
          }
        }
      }

      // 3. Subscription Expire Warning
      if (userProfile?.subscription_end_date || userProfile?.subscriptionEndDate) {
        const endDateStr = userProfile.subscription_end_date || userProfile.subscriptionEndDate;
        const diffMs = new Date(endDateStr).getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if ([30, 15, 7, 3, 1, 0].includes(diffDays)) {
          const key = `notif_sub_remind_${diffDays}d_${userId}_${todayStr}`;
          if (!localStorage.getItem(key)) {
            const msg = diffDays === 0 
              ? "Your membership subscription expires today! Please renew immediately."
              : `Your subscription expires in ${diffDays} day(s). Please renew to maintain access.`;

            await this.sendNotification({
              userId,
              type: 'SUBSCRIPTION',
              title: 'Subscription Expiry Notice',
              message: msg,
              link: '/subscriptions'
            });
            localStorage.setItem(key, 'true');
          }
        }
      }

      // 4. Profile Completion Reminder
      const isProfileIncomplete = !userProfile?.business_name || !userProfile?.profession_designation || !userProfile?.profile_photo;
      if (isProfileIncomplete) {
        const key = `notif_profile_remind_${userId}_${todayStr}`;
        if (!localStorage.getItem(key)) {
          await this.sendNotification({
            userId,
            type: 'PROFILE',
            title: 'Complete Your Profile',
            message: 'Enable full networking visibility by completing your business profile details.',
            link: '/profile'
          });
          localStorage.setItem(key, 'true');
        }
      }
    } catch (err) {
      console.warn("Error running automated reminders:", err);
    }
  }
};
