import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Bell, Info, Award, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle2, Trash2, UserPlus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { firestoreService } from '../services/firestoreService';
import { Notification } from '../types';
import { where, orderBy, limit, query, collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

import { useNavigate } from 'react-router-dom';

export function Notifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!profile) return;
    
    const constraints = [
      where('userId', '==', profile.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    ];
    
    const unsubscribe = firestoreService.subscribe<Notification>('notifications', constraints, (data) => {
      setNotifications(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching notifications:", error);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [profile]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!profile || notifications.length === 0) return;
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;

    try {
      const promises = unread.map(n => updateDoc(doc(db, 'notifications', n.id), { read: true }));
      await Promise.all(promises);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const clearAllNotifications = async () => {
    if (!profile || notifications.length === 0) return;
    
    try {
      const q = query(collection(db, 'notifications'), where('userId', '==', profile.uid));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'notifications', d.id)));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24 px-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-primary/10 rounded-2xl flex items-center justify-center text-primary ring-1 ring-primary/15">
            <Bell size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Notifications</h1>
            <p className="text-sm text-neutral-500 font-medium tracking-tight">Stay updated with your network</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {notifications.some(n => !n.read) && (
            <button
              onClick={markAllAsRead}
              className="px-3.5 py-2 text-primary bg-primary/5 hover:bg-primary/10 rounded-xl transition-all text-sm font-bold shadow-sm shadow-primary/10 hover:shadow-md hover:shadow-primary/15"
            >
              Mark all as read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAllNotifications}
              className="flex items-center gap-2 px-3.5 py-2 text-red-600 bg-red-50/60 hover:bg-red-50 rounded-xl transition-all text-sm font-bold shadow-sm hover:shadow-md shadow-red-500/10"
            >
              <Trash2 size={15} />
              Clear All
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-semibold text-neutral-400 tracking-tight">Loading notifications…</p>
          </div>
        ) : notifications.length > 0 ? (
          notifications.map((notif, i) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => {
                if (!notif.read) markAsRead(notif.id);
                if (notif.type === 'UPGRADE_REQUEST' && notif.relatedUserId) {
                  navigate(`/profile?id=${notif.relatedUserId}`);
                } else if (notif.type === 'GUEST_REGISTRATION' && notif.relatedUserId) {
                  navigate(`/guests?highlight=${notif.relatedUserId}`);
                } else if (notif.type === 'ASSOCIATE_MEMBER_INVITE') {
                  navigate(`/members?tab=invites`);
                }
              }}
              className={cn(
                "bg-white p-4 rounded-[14px] border border-neutral-200/80 shadow-sm shadow-neutral-900/[0.03] flex gap-4 items-start group hover:shadow-md hover:shadow-neutral-900/[0.06] hover:-translate-y-0.5 hover:border-primary/30 transition-all cursor-pointer relative overflow-hidden",
                !notif.read && "border-l-[3px] border-l-primary"
              )}
            >
              {!notif.read && (
                <div className="absolute top-3 right-3 w-2 h-2 bg-primary rounded-full ring-2 ring-white" />
              )}
              <div className={cn(
                "w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ring-1",
                (notif.type === 'UPGRADE' || notif.type === 'UPGRADE_REQUEST') ? "bg-emerald-50 text-emerald-600 ring-emerald-200/70" :
                notif.type === 'SUBSCRIPTION' ? "bg-red-50 text-red-600 ring-red-200/70" :
                notif.type === 'REFERRAL' ? "bg-blue-50 text-blue-600 ring-blue-200/70" :
                notif.type === 'GUEST_REGISTRATION' ? "bg-purple-50 text-purple-600 ring-purple-200/70" :
                notif.type === 'THANKYOU' ? "bg-amber-50 text-amber-600 ring-amber-200/70" :
                "bg-primary/5 text-primary ring-primary/20"
              )}>
                {(notif.type === 'UPGRADE' || notif.type === 'UPGRADE_REQUEST') ? <Award size={20} /> :
                 notif.type === 'SUBSCRIPTION' ? <AlertTriangle size={20} /> :
                 notif.type === 'REFERRAL' ? <CheckCircle2 size={20} /> :
                 notif.type === 'GUEST_REGISTRATION' ? <UserPlus size={20} /> :
                 notif.type === 'THANKYOU' ? <Award size={20} /> :
                 <Info size={20} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <span className={cn(
                    "text-[11px] font-bold tracking-tight px-2.5 py-0.5 rounded-full border",
                    (notif.type === 'UPGRADE' || notif.type === 'UPGRADE_REQUEST') ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    notif.type === 'SUBSCRIPTION' ? "bg-red-50 text-red-700 border-red-200" :
                    notif.type === 'REFERRAL' ? "bg-blue-50 text-blue-700 border-blue-200" :
                    notif.type === 'GUEST_REGISTRATION' ? "bg-purple-50 text-purple-700 border-purple-200" :
                    notif.type === 'THANKYOU' ? "bg-amber-50 text-amber-700 border-amber-200" :
                    "bg-neutral-100 text-neutral-600 border-neutral-200"
                  )}>
                    {notif.type.replace('_', ' ')}
                  </span>
                  <span className="text-[11px] text-neutral-400 font-semibold tracking-tight shrink-0">
                    {format(new Date(notif.createdAt), 'dd MMM • HH:mm')}
                  </span>
                </div>
                <p className={cn(
                  "text-sm leading-relaxed",
                  !notif.read ? "font-bold text-neutral-900" : "font-medium text-neutral-600"
                )}>{notif.message}</p>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="py-20 text-center bg-white rounded-[18px] border border-dashed border-neutral-300">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-neutral-50 flex items-center justify-center ring-1 ring-neutral-200/80">
              <Bell size={26} className="text-neutral-300" />
            </div>
            <h3 className="text-base font-bold text-neutral-900 tracking-tight">No notifications</h3>
            <p className="text-sm text-neutral-400 font-medium mt-1 tracking-tight">We'll notify you when something important happens.</p>
          </div>
        )}
      </div>
    </div>
  );
}

