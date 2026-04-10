import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Bell,
  Info,
  Award,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  UserPlus
} from 'lucide-react';
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <Bell size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 uppercase tracking-widest">Notifications</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Stay updated with your network</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {notifications.some(n => !n.read) && (
            <button
              onClick={markAllAsRead}
              className="px-3 py-2 text-primary hover:bg-primary/5 rounded-lg transition-colors text-[10px] font-bold uppercase tracking-widest"
            >
              Mark all as read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAllNotifications}
              className="flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-[10px] font-bold uppercase tracking-widest"
            >
              <Trash2 size={14} />
              Clear All
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading Notifications...</p>
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
                "bg-white p-4 rounded-2xl border border-border card-shadow flex gap-4 items-start group hover:border-primary/30 transition-all cursor-pointer relative overflow-hidden",
                !notif.read && "border-l-4 border-l-primary"
              )}
            >
              {!notif.read && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
              )}
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                (notif.type === 'UPGRADE' || notif.type === 'UPGRADE_REQUEST') ? "bg-emerald-50 text-emerald-600" :
                notif.type === 'SUBSCRIPTION' ? "bg-rose-50 text-rose-600" :
                notif.type === 'REFERRAL' ? "bg-blue-50 text-blue-600" :
                notif.type === 'GUEST_REGISTRATION' ? "bg-purple-50 text-purple-600" :
                notif.type === 'THANKYOU' ? "bg-amber-50 text-amber-600" :
                "bg-primary/5 text-primary"
              )}>
                {(notif.type === 'UPGRADE' || notif.type === 'UPGRADE_REQUEST') ? <Award size={20} /> :
                 notif.type === 'SUBSCRIPTION' ? <AlertTriangle size={20} /> :
                 notif.type === 'REFERRAL' ? <CheckCircle2 size={20} /> :
                 notif.type === 'GUEST_REGISTRATION' ? <UserPlus size={20} /> :
                 notif.type === 'THANKYOU' ? <Award size={20} /> :
                 <Info size={20} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                    (notif.type === 'UPGRADE' || notif.type === 'UPGRADE_REQUEST') ? "bg-emerald-100 text-emerald-700" :
                    notif.type === 'SUBSCRIPTION' ? "bg-rose-100 text-rose-700" :
                    "bg-slate-100 text-slate-600"
                  )}>
                    {notif.type.replace('_', ' ')}
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                    {format(new Date(notif.createdAt), 'dd MMM • HH:mm')}
                  </span>
                </div>
                <p className={cn(
                  "text-sm leading-relaxed",
                  !notif.read ? "font-bold text-slate-900" : "font-medium text-slate-600"
                )}>{notif.message}</p>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
            <Bell size={48} className="mx-auto text-slate-200 mb-4" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">No notifications</h3>
            <p className="text-xs text-slate-400 font-medium mt-1">We'll notify you when something important happens.</p>
          </div>
        )}
      </div>
    </div>
  );
}

