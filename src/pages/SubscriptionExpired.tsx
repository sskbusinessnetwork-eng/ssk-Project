import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogOut, ShieldAlert, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { databaseService } from '../services/databaseService';
import { notificationService } from '../services/notificationService';
import { supabase } from '../lib/supabaseClient';

export function SubscriptionExpired() {
  const navigate = useNavigate();
  const { profile, logout, refreshProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const isAlreadyRequested = profile?.renewalRequested || false;

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
      navigate('/login', { replace: true });
    }
  };

  const handleRequestRenewal = async () => {
    if (!profile) return;
    setIsSubmitting(true);
    setSuccessMsg('');
    try {
      // 1. Update the user profile to set renewal_requested = true
      await databaseService.update('users', profile.uid, {
        renewalRequested: true,
        renewalRequestedAt: new Date().toISOString()
      });

      // 2. Dispatch notifications to appropriate admins
      const isChapterAdmin = profile.role === 'CHAPTER_ADMIN' || (profile.role === 'MEMBER' && profile.position === 'chapter_admin');
      if (profile.role === 'MEMBER' && !isChapterAdmin) {
        const chapterId = profile.chapterId || (profile as any).chapter_id;
        if (chapterId) {
          // Find all chapter admins for this chapter
          const { data: admins, error } = await supabase
            .from('users')
            .select('id')
            .eq('chapter_id', chapterId)
            .eq('position', 'chapter_admin');
          
          if (!error && admins && admins.length > 0) {
            for (const admin of admins) {
              await notificationService.sendNotification({
                userId: admin.id,
                role: 'CHAPTER_ADMIN',
                type: 'SUBSCRIPTION',
                title: 'Renewal Request',
                message: `${profile.name} has submitted a membership renewal request.`,
                relatedUserId: profile.uid || profile.id,
                link: '/manage-subscriptions'
              });
            }
          }
        }
      } else if (isChapterAdmin) {
        // Find all master admins
        const { data: masterAdmins, error } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'MASTER_ADMIN');
        
        if (!error && masterAdmins && masterAdmins.length > 0) {
          for (const admin of masterAdmins) {
            await notificationService.sendNotification({
              userId: admin.id,
              role: 'MASTER_ADMIN',
              type: 'SUBSCRIPTION',
              title: 'Chapter Admin Renewal Request',
              message: `${profile.name} (Chapter Admin) has requested renewal of their chapter membership.`,
              relatedUserId: profile.uid || profile.id,
              link: '/manage-subscriptions'
            });
          }
        }
      }

      // 3. Create a confirmation notification for the user themselves
      await notificationService.sendNotification({
        userId: profile.uid || profile.id,
        role: profile.role,
        type: 'SUBSCRIPTION',
        title: 'Renewal Request Submitted',
        message: 'Your membership renewal request has been submitted.',
        relatedUserId: profile.uid || profile.id,
        link: '/subscriptions'
      });

      // 4. Refresh local profile state
      await refreshProfile();
      setSuccessMsg('Your renewal request has been submitted successfully.');
    } catch (error) {
      console.error('Error requesting renewal:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAdminUser = profile?.role === 'CHAPTER_ADMIN' || (profile?.role === 'MEMBER' && profile?.position === 'chapter_admin');

  return (
    <div className="min-h-screen bg-[#05070E] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-900/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#DC143C]/5 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-[#111827]/60 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-8 text-center space-y-8 relative z-10 shadow-2xl shadow-black/50"
      >
        <div className="w-24 h-24 bg-red-500/10 text-[#EF4444] rounded-full flex items-center justify-center mx-auto shadow-inner border border-red-500/10">
          <ShieldAlert size={48} className="animate-pulse" />
        </div>
        
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-white tracking-tight uppercase leading-none font-display">
            Membership Expired
          </h1>
          <p className="text-[#9CA3AF] font-medium text-sm leading-relaxed px-2">
            Your membership subscription has expired.
            {isAdminUser 
              ? ' Please submit a renewal request to the Master Admin to restore dashboard access.'
              : ' Please submit a renewal request to your Chapter Admin to restore your access to referrals, meetings, and the directory.'
            }
          </p>
        </div>

        {/* Status Indicators & Submission Forms */}
        <div className="space-y-4 pt-2">
          {successMsg || isAlreadyRequested ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex flex-col items-center gap-2 text-emerald-400"
            >
              <CheckCircle2 size={32} />
              <span className="text-sm font-bold uppercase tracking-wider">Renewal Requested</span>
              <p className="text-xs text-[#9CA3AF] text-center">
                Your request is currently pending approval. You will receive a notification as soon as it is approved.
              </p>
            </motion.div>
          ) : (
            <button
              onClick={handleRequestRenewal}
              disabled={isSubmitting}
              className="w-full h-14 bg-gradient-to-r from-red-600 to-[#DC143C] text-white rounded-[16px] font-bold uppercase tracking-wider text-xs hover:from-red-500 hover:to-red-600 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 shadow-lg shadow-red-900/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Submitting Request...
                </>
              ) : (
                'Request Membership Renewal'
              )}
            </button>
          )}

          <button
            onClick={handleLogout}
            className="w-full h-14 bg-white/5 hover:bg-white/10 text-white rounded-[16px] font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-3 active:scale-95 border border-white/5"
          >
            <LogOut size={18} className="text-[#9CA3AF]" />
            Logout Account
          </button>
        </div>

        <div className="pt-2">
          <p className="text-[10px] text-[#6B7280] font-bold uppercase tracking-[0.2em]">
            SSK Business Network
          </p>
        </div>
      </motion.div>
    </div>
  );
}
