import { databaseService } from './databaseService';
import type { UserRole, Notification } from '../types';
import { where, doc, updateDoc, deleteDoc, db } from '../lib/database';
import { supabase } from '../lib/supabaseClient';
import { parseDateToYYYYMMDD } from '../utils/memberStatus';
import { SSK_OFFICIAL_LOGO } from '../constants/brand';
import { fetchWithTimeout, withTimeout } from '../utils/directoryCache';

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

function getSubscriptionDates(user: any): { startDate: Date | null; endDate: Date | null; endDateStr: string } {
  if (!user) return { startDate: null, endDate: null, endDateStr: '' };
  const startVal = user.subscriptionEnd !== undefined && user.subscriptionStart !== undefined ? user.subscriptionStart : (user.subscription_start || user.subscription_start_date || user.subscriptionStartDate || user.subscriptionStart);
  const endVal = user.subscriptionEnd !== undefined ? user.subscriptionEnd : (user.subscription_end || user.subscription_end_date || user.subscriptionEndDate || user.subscriptionEnd);
  
  const startParsed = parseDateToYYYYMMDD(startVal);
  const endParsed = parseDateToYYYYMMDD(endVal);
  
  return { startDate: startParsed.date, endDate: endParsed.date, endDateStr: endParsed.ymd };
}

export interface PushCapability {
  supported: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  needsIOSHomeScreen: boolean;
  permission: NotificationPermission;
}

export interface PushSubscriptionState {
  supported: boolean;
  permission: NotificationPermission;
  subscribed: boolean;
  deviceCount: number;
  deviceLabel: string;
  needsIOSHomeScreen: boolean;
}

const PUSH_OPT_OUT_PREFIX = 'ssk_push_opted_out_';

export const notificationService = {
  // ==========================================================
  // PUSH NOTIFICATION PERMISSION & MULTI-DEVICE NATIVE PUSH
  // ==========================================================

  // Helper for web-push base64 encoding
  urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  },

  detectDeviceInfo(): { deviceLabel: string; platform: string } {
    if (typeof navigator === 'undefined') {
      return { deviceLabel: 'Web Browser', platform: 'web' };
    }

    const ua = navigator.userAgent || '';
    const isIPadOS = /Macintosh/i.test(ua) && Number(navigator.maxTouchPoints || 0) > 1;
    let os = 'Desktop';
    let platform = 'desktop';

    if (/Android/i.test(ua)) {
      os = 'Android';
      platform = 'android';
    } else if (/iPhone/i.test(ua)) {
      os = 'iPhone';
      platform = 'ios';
    } else if (/iPad/i.test(ua) || isIPadOS) {
      os = 'iPad';
      platform = 'ios';
    } else if (/Mac OS X|Macintosh/i.test(ua)) {
      os = 'Mac';
      platform = 'macos';
    } else if (/Windows/i.test(ua)) {
      os = 'Windows';
      platform = 'windows';
    } else if (/Linux/i.test(ua)) {
      os = 'Linux';
      platform = 'linux';
    }

    let browser = 'Browser';
    if (/Edg\//i.test(ua)) browser = 'Edge';
    else if (/SamsungBrowser/i.test(ua)) browser = 'Samsung Internet';
    else if (/Firefox\//i.test(ua)) browser = 'Firefox';
    else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = 'Chrome';
    else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';

    const isStandalone =
      (typeof window !== 'undefined' &&
        window.matchMedia?.('(display-mode: standalone)')?.matches) ||
      Boolean((navigator as any).standalone);

    return {
      deviceLabel: `${os} ${browser}${isStandalone ? ' (App)' : ''}`,
      platform,
    };
  },

  getPushCapability(): PushCapability {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return {
        supported: false,
        isIOS: false,
        isStandalone: false,
        needsIOSHomeScreen: false,
        permission: 'denied',
      };
    }

    const ua = navigator.userAgent || '';
    const isIOS =
      /iPhone|iPad|iPod/i.test(ua) ||
      (/Macintosh/i.test(ua) && Number(navigator.maxTouchPoints || 0) > 1);
    const isStandalone =
      Boolean(window.matchMedia?.('(display-mode: standalone)')?.matches) ||
      Boolean((navigator as any).standalone);

    const hasNotification = 'Notification' in window;
    const hasSW = 'serviceWorker' in navigator;
    const hasPush = 'PushManager' in window;

    return {
      supported: hasNotification && hasSW && hasPush,
      isIOS,
      isStandalone,
      needsIOSHomeScreen: isIOS && !isStandalone,
      permission: hasNotification ? Notification.permission : 'denied',
    };
  },

  async saveSubscriptionToBackend(userId: string, subscription: PushSubscription | PushSubscriptionJSON) {
    if (!userId || !subscription) return null;
    const { deviceLabel, platform } = this.detectDeviceInfo();
    const subJson =
      typeof (subscription as PushSubscription).toJSON === 'function'
        ? (subscription as PushSubscription).toJSON()
        : subscription;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
    } catch {}

    const res = await fetchWithTimeout('/api/push/subscribe', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        subscription: subJson,
        uid: userId,
        deviceLabel,
        platform,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      }),
    }, 6_000);

    if (!res.ok) {
      throw new Error(`Push subscribe HTTP ${res.status}`);
    }
    return res.json();
  },

  async subscribeCurrentDevice(userId: string): Promise<PushSubscriptionState> {
    const cap = this.getPushCapability();
    const { deviceLabel } = this.detectDeviceInfo();

    if (!cap.supported || cap.permission !== 'granted' || !userId) {
      return {
        supported: cap.supported,
        permission: cap.permission,
        subscribed: false,
        deviceCount: 0,
        deviceLabel,
        needsIOSHomeScreen: cap.needsIOSHomeScreen,
      };
    }

    const reg = await this.registerServiceWorker();
    if (!reg) {
      return {
        supported: false,
        permission: cap.permission,
        subscribed: false,
        deviceCount: 0,
        deviceLabel,
        needsIOSHomeScreen: cap.needsIOSHomeScreen,
      };
    }

    const readyReg = await navigator.serviceWorker.ready;
    let subscription = await readyReg.pushManager.getSubscription();

    if (!subscription) {
      const keyRes = await fetchWithTimeout('/api/vapidPublicKey', {}, 6_000);
      if (!keyRes.ok) {
        throw new Error('Unable to load push notification key');
      }
      const { publicKey } = await keyRes.json();
      const applicationServerKey = this.urlBase64ToUint8Array(publicKey);
      subscription = await readyReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    const saved = await this.saveSubscriptionToBackend(userId, subscription);
    try {
      localStorage.removeItem(`${PUSH_OPT_OUT_PREFIX}${userId}`);
    } catch {}

    return {
      supported: true,
      permission: Notification.permission,
      subscribed: true,
      deviceCount: Number(saved?.deviceCount || 1),
      deviceLabel,
      needsIOSHomeScreen: cap.needsIOSHomeScreen,
    };
  },

  async requestPermission(userId?: string): Promise<NotificationPermission> {
    const cap = this.getPushCapability();
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications.');
      return 'denied';
    }

    // Respect prior denial cleanly — never spam denied users
    if (Notification.permission === 'denied') {
      return 'denied';
    }

    try {
      const permission =
        Notification.permission === 'granted'
          ? 'granted'
          : await Notification.requestPermission();

      if (permission === 'granted' && userId && cap.supported) {
        try {
          await this.subscribeCurrentDevice(userId);
        } catch (e) {
          console.warn('Push subscription failed:', e);
        }
      }
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return Notification.permission || 'denied';
    }
  },

  async syncExistingPushSubscription(userId?: string): Promise<void> {
    if (!userId) return;
    const cap = this.getPushCapability();
    if (!cap.supported || cap.permission !== 'granted') return;

    try {
      if (localStorage.getItem(`${PUSH_OPT_OUT_PREFIX}${userId}`) === 'true') {
        return;
      }
      await this.subscribeCurrentDevice(userId);
    } catch (e) {
      console.warn('Silent push subscription sync notice:', e);
    }
  },

  async getPushSubscriptionState(userId?: string): Promise<PushSubscriptionState> {
    const cap = this.getPushCapability();
    const { deviceLabel } = this.detectDeviceInfo();

    if (!cap.supported || !userId) {
      return {
        supported: cap.supported,
        permission: cap.permission,
        subscribed: false,
        deviceCount: 0,
        deviceLabel,
        needsIOSHomeScreen: cap.needsIOSHomeScreen,
      };
    }

    let endpoint = '';
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      const existingSub = reg ? await reg.pushManager.getSubscription() : null;
      endpoint = existingSub?.endpoint || '';
    } catch {}

    let isOptedOut = false;
    try {
      isOptedOut = localStorage.getItem(`${PUSH_OPT_OUT_PREFIX}${userId}`) === 'true';
    } catch {}

    if (cap.permission !== 'granted' || isOptedOut) {
      return {
        supported: true,
        permission: cap.permission,
        subscribed: false,
        deviceCount: 0,
        deviceLabel,
        needsIOSHomeScreen: cap.needsIOSHomeScreen,
      };
    }

    try {
      const params = new URLSearchParams({ uid: userId });
      if (endpoint) params.set('endpoint', endpoint);
      const statusRes = await fetchWithTimeout(`/api/push/status?${params.toString()}`, {}, 5_000);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        return {
          supported: true,
          permission: cap.permission,
          subscribed: Boolean(endpoint && statusData.subscribed),
          deviceCount: Number(statusData.deviceCount || 0),
          deviceLabel,
          needsIOSHomeScreen: cap.needsIOSHomeScreen,
        };
      }
    } catch {}

    return {
      supported: true,
      permission: cap.permission,
      subscribed: Boolean(endpoint),
      deviceCount: endpoint ? 1 : 0,
      deviceLabel,
      needsIOSHomeScreen: cap.needsIOSHomeScreen,
    };
  },

  async unsubscribeDevice(userId: string): Promise<{ remainingDevices: number }> {
    if (!userId) return { remainingDevices: 0 };

    try {
      localStorage.setItem(`${PUSH_OPT_OUT_PREFIX}${userId}`, 'true');
    } catch {}

    let endpoint: string | null = null;
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration('/sw.js');
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        if (sub) {
          endpoint = sub.endpoint;
          await sub.unsubscribe();
        }
      } catch {}
    }

    try {
      const res = await fetchWithTimeout('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: userId, endpoint }),
      }, 5_000);
      if (res.ok) {
        const data = await res.json();
        return { remainingDevices: Number(data.remainingDevices || 0) };
      }
    } catch {}

    return { remainingDevices: 0 };
  },

  async unsubscribeOnLogout(userId?: string): Promise<void> {
    if (!userId) return;
    let endpoint: string | null = null;

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration('/sw.js');
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        if (sub) {
          endpoint = sub.endpoint;
          await sub.unsubscribe();
        }
      } catch {}
    }

    if (!endpoint) return;

    try {
      await fetchWithTimeout('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: userId, endpoint }),
      }, 3_000);
    } catch {}
  },

  getPermissionState(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
    return Notification.permission;
  },

  async registerServiceWorker() {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        return reg;
      } catch (e) {
        console.warn('Service Worker registration notice:', e);
      }
    }
    return null;
  },

  showSystemNotification(title: string, body: string, link: string = '/notifications') {
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return;

    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(title, {
            body,
            icon: SSK_OFFICIAL_LOGO,
            badge: SSK_OFFICIAL_LOGO,
            data: { url: link },
            tag: 'ssk-push-' + Date.now()
          });
        });
      } else {
        const notif = new Notification(title, {
          body,
          icon: SSK_OFFICIAL_LOGO,
          data: { url: link }
        });
        notif.onclick = () => {
          window.focus();
          window.location.href = link;
        };
      }
    } catch (err) {
      console.warn('System notification display error:', err);
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
    // 1. Create in DB
    const res = await this.createNotification(
      params.userId,
      params.role || 'MEMBER',
      params.type,
      params.message,
      params.relatedUserId,
      params.title,
      params.link
    );
    
    // 2. Trigger web-push API in the background (non-blocking with timeout so UI actions never hang)
    void fetchWithTimeout('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: params.userId,
        payload: {
          title: params.title || this.getDefaultTitleForType(params.type),
          body: params.message,
          link: params.link || this.getDefaultLinkForType(params.type, params.relatedUserId)
        }
      })
    }, 5_000).catch((e) => {
      console.warn("Backend push failed (non-critical):", e);
    });
    
    return res;
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

  getDefaultLinkForType(type: NotificationType, relatedId?: string, userRole?: string): string {
    switch (type) {
      case 'REFERRAL': return '/referrals';
      case 'MEETING': return '/one-to-one';
      case 'GUEST': case 'GUEST_REGISTRATION': return '/guests';
      case 'SUBSCRIPTION': case 'UPGRADE': case 'UPGRADE_REQUEST': 
        return userRole === 'MASTER_ADMIN' ? '/subscriptions' : '/profile';
      case 'THANKYOU': return '/thank-you-slips';
      case 'TESTIMONIAL': 
        return userRole === 'MASTER_ADMIN' ? '/testimonial-reports' : '/testimonials';
      case 'PROFILE': return '/profile';
      case 'MEMBER_ADD': 
        return userRole === 'MASTER_ADMIN' ? '/members' : '/directory';
      case 'ASSOCIATE_MEMBER_INVITE': return '/directory';
      default: return '/dashboard';
    }
  },

  resolveLink(notif: Notification, userRole?: string): string {
    if (notif.link && notif.link !== '/notifications' && notif.link !== '#') {
      return notif.link;
    }
    const type = (notif.type || '').toUpperCase() as NotificationType;
    const text = `${notif.title || ''} ${notif.message || ''}`.toLowerCase();

    if (type === 'REFERRAL' || text.includes('referral')) return '/referrals';
    if (type === 'THANKYOU' || text.includes('thank you') || text.includes('thankyou') || text.includes('slip')) return '/thank-you-slips';
    if (type === 'MEETING' || text.includes('meeting') || text.includes('1-to-1') || text.includes('one-to-one')) return '/one-to-one';
    if (type === 'GUEST' || type === 'GUEST_REGISTRATION' || text.includes('guest')) return '/guests';
    if (type === 'TESTIMONIAL' || text.includes('testimonial')) return userRole === 'MASTER_ADMIN' ? '/testimonial-reports' : '/testimonials';
    if (type === 'SUBSCRIPTION' || type === 'UPGRADE' || type === 'UPGRADE_REQUEST' || text.includes('subscription') || text.includes('renew') || text.includes('plan')) {
      return userRole === 'MASTER_ADMIN' ? '/subscriptions' : '/profile';
    }
    if (type === 'MEMBER_ADD' || text.includes('member added') || text.includes('new member')) {
      return userRole === 'MASTER_ADMIN' ? '/members' : '/directory';
    }
    if (type === 'PROFILE' || text.includes('profile')) return '/profile';
    if (text.includes('chapter')) return userRole === 'MASTER_ADMIN' ? '/manage-chapter' : '/meetings';

    return this.getDefaultLinkForType(type, notif.relatedUserId || notif.relatedId, userRole);
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
            let notifMessage = newRow.message || 'You have a new update.';
            let extraData: any = {};
            if (notifMessage.includes('|||')) {
              const parts = notifMessage.split('|||');
              notifMessage = parts[0];
              try {
                extraData = JSON.parse(parts[1] || '{}');
              } catch(e) {}
            }

            const notifTitle = newRow.title || extraData.title || this.getDefaultTitleForType(newRow.type);
            const rawLink = newRow.link || extraData.link;
            const rawRelatedUser = newRow.related_user_id || newRow.related_id || extraData.related_user_id;

            const link = rawLink || this.getDefaultLinkForType(newRow.type, rawRelatedUser);

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
                relatedUserId: rawRelatedUser,
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
      const uidStr = String(userId).trim();
      const [
        { data: rawMeetings },
        { data: rawReferrals },
        { data: rawChapters },
        { data: rawGuests }
      ] = await withTimeout(
        Promise.all([
          supabase
            .from('one_to_one_meetings')
            .select('creator_id, sender_id, member_id, receiver_id, date, scheduled_date, status')
            .or(`creator_id.eq.${uidStr},sender_id.eq.${uidStr},member_id.eq.${uidStr},receiver_id.eq.${uidStr}`),
          supabase
            .from('referrals')
            .select('from_user_id, sender_id, to_user_id, receiver_id, status, created_at')
            .or(`from_user_id.eq.${uidStr},sender_id.eq.${uidStr},to_user_id.eq.${uidStr},receiver_id.eq.${uidStr}`),
          userProfile?.chapter_id
            ? supabase.from('chapters').select('id, chapter_name, next_meeting_date, meeting_date, meeting_venue').eq('id', userProfile.chapter_id)
            : Promise.resolve({ data: null }),
          supabase
            .from('guest_registrations')
            .select('admin_id, user_id, meeting_date')
            .or(`admin_id.eq.${uidStr},user_id.eq.${uidStr}`)
        ]),
        10_000,
        'Task checklist query'
      );

      // 1. One-to-One Meetings Today
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
      if (rawChapters && userProfile?.chapter_id) {
        const userChap = (rawChapters as any[]).find(c => String(c.id) === String(userProfile.chapter_id));
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
      const { endDate, endDateStr } = getSubscriptionDates(userProfile);
      if (endDate) {
        const diffMs = endDate.getTime() - new Date().getTime();
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
      if (rawGuests) {
        const guestsToday = (rawGuests as any[]).filter(g => {
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

    const userId = String(userProfile.id || userProfile.uid).trim();
    if (!userId) return;
    if ((this as any)._activeReminderRuns?.has(userId)) return;
    if (!(this as any)._activeReminderRuns) {
      (this as any)._activeReminderRuns = new Set<string>();
    }
    (this as any)._activeReminderRuns.add(userId);

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
      const { data: meetings } = await withTimeout<any>(
        supabase
          .from('one_to_one_meetings')
          .select('id, creator_id, sender_id, member_id, receiver_id, status, date, scheduled_date, time, scheduled_time')
          .or(`creator_id.eq.${userId},sender_id.eq.${userId},member_id.eq.${userId},receiver_id.eq.${userId}`),
        10_000,
        'One-to-one reminder query'
      );
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
      const { endDate } = getSubscriptionDates(userProfile);
      if (endDate) {
        const diffMs = endDate.getTime() - now.getTime();
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
    } finally {
      (this as any)._activeReminderRuns?.delete(userId);
    }
  }
};
