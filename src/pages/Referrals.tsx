import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Phone, 
  MessageSquare,
  ArrowRightLeft,
  Heart,
  AlertCircle,
  Share2,
  Users
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSearchParams, Link } from 'react-router-dom';
import { databaseService } from '../services/databaseService';
import { Referral, UserProfile, ThankYouSlip } from '../types';
import { Modal } from '../components/Modal';
import { format } from 'date-fns';
import {  where, orderBy, onSnapshot, collection  } from '../lib/database';
import { db } from '../lib/database';
import { cn } from '../lib/utils';
import { normalizePhoneNumber } from '../utils/phoneUtils';
import { notificationService } from '../services/notificationService';
import { supabase } from '../lib/supabaseClient';

export function Referrals() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [thankYouSlips, setThankYouSlips] = useState<ThankYouSlip[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<'passed' | 'received'>('received');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isThankYouModalOpen, setIsThankYouModalOpen] = useState(false);
  const [isNotConvertedModalOpen, setIsNotConvertedModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [notConvertedReason, setNotConvertedReason] = useState('');
  const [thankYouData, setThankYouData] = useState({
    businessValue: '',
    notes: ''
  });

  // Form state
  const [formData, setFormData] = useState({
    toUserId: '',
    contactName: '',
    contactPhone: '',
    requirement: '',
    notes: ''
  });

  useEffect(() => {
    const toUserId = searchParams.get('to');
    if (toUserId) {
      setFormData(prev => ({ ...prev, toUserId }));
      setIsModalOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!profile) return;

    const timeoutId = setTimeout(() => {
      if (loading) {
        setLoading(false);
        console.error("Referrals loading timed out");
      }
    }, 10000);

    let constraints: any[] = [orderBy('createdAt', 'desc')];
    
    const isAdmin = profile.role === 'MASTER_ADMIN';
    const isChapterAdmin = profile.role === 'CHAPTER_ADMIN' || (profile.role === 'MEMBER' && profile.position === 'chapter_admin');

    // For Master Admin and Chapter Admin, we don't filter by user ID to show all referrals (we'll filter in UI for Chapter Admin)
    if (!isAdmin && !isChapterAdmin) {
      constraints.unshift(where(filter === 'passed' ? 'fromUserId' : 'toUserId', '==', profile.uid));
    }

    const unsubscribe = databaseService.subscribe<Referral>('referrals', constraints, (data) => {
      setReferrals(data);
      setLoading(false);
      clearTimeout(timeoutId);
    }, (error) => {
      setLoading(false);
      clearTimeout(timeoutId);
      console.error("Referrals subscription error:", error);
    });

    // Subscribe to thank you slips to show notes in "Passed" tab
    const unsubSlips = onSnapshot(collection(db, 'thank_you_slips'), (snapshot) => {
      const slips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ThankYouSlip));
      setThankYouSlips(slips);
    });

    // Fetch members/users
    databaseService.list<UserProfile>('users', []).then(data => {
      if (isAdmin || isChapterAdmin) {
        setMembers(data);
      } else {
        setMembers(data.filter(m => m.uid !== profile.uid && (m.status === 'ACTIVE' || m.membershipStatus === 'ACTIVE')));
      }
    });

    return () => {
      unsubscribe();
      unsubSlips();
      clearTimeout(timeoutId);
    };
  }, [profile, filter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    // Manual validation to highlight and scroll
    const requiredFields = [
      { id: 'toUserId', value: formData.toUserId, name: 'Member' },
      { id: 'contactName', value: formData.contactName, name: 'Contact Name' },
      { id: 'contactPhone', value: formData.contactPhone, name: 'Contact Phone' },
      { id: 'requirement', value: formData.requirement, name: 'Requirement' }
    ];

    for (const field of requiredFields) {
      if (!field.value.trim()) {
        const el = document.getElementById(`referral-${field.id}`);
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-red-500', 'border-red-500');
          setTimeout(() => el.classList.remove('ring-2', 'ring-red-500', 'border-red-500'), 3000);
        }
        
        let validationMsg = `${field.name} is required.`;
        if (field.id === 'toUserId') {
          validationMsg = "Receiver not selected.";
        }
        setErrorMessage(validationMsg);
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const normalizedPhone = normalizePhoneNumber(formData.contactPhone);
      const toUser = members.find(m => m.uid === formData.toUserId);
      
      const currentUser = profile;
      const sender_id = profile?.uid || null;
      const receiver_id = formData.toUserId || null;
      const chapter_id = profile?.chapter_id || null;
      const customer_name = formData.contactName || null;
      const customer_mobile = normalizedPhone || null;
      const requirement = formData.requirement || null;

      // 1. Before Insert Print values in browser console
      console.log({
        currentUser,
        sender_id,
        receiver_id,
        chapter_id,
        customer_name,
        customer_mobile,
        requirement
      });

      if (!currentUser) throw new Error("currentUser is missing.");
      if (!sender_id) throw new Error("sender_id is missing.");
      if (!receiver_id) throw new Error("receiver_id is missing.");
      if (!chapter_id) throw new Error("chapter_id is missing.");
      if (!customer_name) throw new Error("customer_name is missing.");
      if (!customer_mobile) throw new Error("customer_mobile is missing.");
      if (!requirement) throw new Error("requirement is missing.");

      // 2. Check Authentication
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated.");
      }

      // 3. Verify Current User in database
      const { data: dbUser, error: dbUserError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (dbUserError || !dbUser) {
        console.error("User verification error:", dbUserError);
        throw new Error("Logged-in user profile not found in users table.");
      }

      // Verify necessary fields
      if (!dbUser.id) throw new Error("Sender id is missing.");
      if (!dbUser.chapter_id) throw new Error("Sender chapter_id is missing.");
      if (!dbUser.role) throw new Error("Sender role is missing.");

      // 4. Verify Receiver
      const { data: receiverProfile, error: receiverError } = await supabase
        .from('users')
        .select('*')
        .eq('id', receiver_id)
        .single();

      if (receiverError || !receiverProfile) {
        console.error("Receiver verification error:", receiverError);
        throw new Error("Selected member not found.");
      }

      // 8. Verify Foreign Keys
      const { data: chapterProfile, error: chapterError } = await supabase
        .from('chapters')
        .select('*')
        .eq('id', chapter_id)
        .single();

      if (chapterError || !chapterProfile) {
        console.error("Chapter verification error:", chapterError);
        throw new Error("Sender chapter does not exist in chapters table.");
      }

      // 5. Verify and Build Insert Columns (supports old and new names)
      const newReferral = {
        sender_id: sender_id,
        from_user_id: sender_id,
        receiver_id: receiver_id,
        to_user_id: receiver_id,
        chapter_id: chapter_id,
        customer_name: customer_name,
        contact_name: customer_name,
        customer_mobile: customer_mobile,
        contact_phone: customer_mobile,
        requirement: requirement,
        notes: formData.notes || '',
        status: 'PENDING',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Create referral
      const { error: insertError } = await supabase
        .from('referrals')
        .insert([newReferral]);

      if (insertError) {
        throw insertError;
      }
      
      // Create notifications
      await notificationService.createNotification(
        formData.toUserId, 
        'MEMBER', 
        'REFERRAL', 
        `You have received a new referral from ${profile.name} for ${formData.contactName}.`
      );

      // Notify recipient's admin
      if (toUser && toUser.adminId) {
        await notificationService.createNotification(
          toUser.adminId,
          'CHAPTER_ADMIN',
          'REFERRAL',
          `${profile.name} has passed a referral to ${toUser.name}.`
        );
      }

      // Notify sender's admin (if different from recipient's admin)
      if (profile.adminId && toUser && profile.adminId !== toUser.adminId) {
        await notificationService.createNotification(
          profile.adminId,
          'CHAPTER_ADMIN',
          'REFERRAL',
          `${profile.name} has passed a referral to ${toUser.name}.`
        );
      }

      await notificationService.notifyMasterAdmins('REFERRAL', `${profile.name} has passed a referral to ${toUser.name}.`);

      // 9. After Successful Insert: close popup, refresh, update analytics, show message
      setSuccessMessage("Referral submitted successfully.");
      setTimeout(() => setSuccessMessage(null), 3000);
      setIsModalOpen(false);
      setFormData({ toUserId: '', contactName: '', contactPhone: '', requirement: '', notes: '' });

      // Refresh lists & update analytics immediately
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));
    } catch (error: any) {
      // 6 & 10. Replace Generic Error and never swallow errors
      console.error("Referral Error:", error);
      alert(error.message);
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (id: string, status: Referral['status']) => {
    try {
      await databaseService.update('referrals', id, { 
        status,
        updatedAt: new Date().toISOString()
      });
      setSuccessMessage(`Referral status updated to ${status.replace('_', ' ')}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      console.error("Error updating status:", error);
      setErrorMessage(error.message || "Failed to update status");
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  const handleThankYouSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedReferral || isSubmitting) return;

    // Guard: Check if already processed
    if (selectedReferral.status === 'COMPLETED' || selectedReferral.status === 'NOT_CONVERTED') {
      setErrorMessage("This referral has already been processed.");
      setIsThankYouModalOpen(false);
      setSelectedReferral(null);
      return;
    }

    if (!thankYouData.businessValue) {
      setErrorMessage("Please enter the business value.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Double check latest status from Firestore for safety
      const latestRef = await databaseService.get<Referral>('referrals', selectedReferral.id);
      if (latestRef && (latestRef.status === 'COMPLETED' || latestRef.status === 'NOT_CONVERTED')) {
        setErrorMessage("Already submitted.");
        setIsThankYouModalOpen(false);
        setSelectedReferral(null);
        return;
      }

      const newSlip = {
        referralId: selectedReferral.id,
        fromUserId: profile.uid, // The person saying thank you (receiver of referral)
        toUserId: selectedReferral.fromUserId, // The person being thanked (giver of referral)
        customerName: selectedReferral.contactName,
        businessValue: Number(thankYouData.businessValue),
        notes: thankYouData.notes,
        createdAt: new Date().toISOString()
      };

      await databaseService.create('thank_you_slips', newSlip);
      
      // Create notifications
      await notificationService.createNotification(
        selectedReferral.fromUserId,
        'MEMBER',
        'THANKYOU',
        `${profile.name} has submitted a Thank You slip for the referral you passed.`
      );

      const fromUser = members.find(m => m.uid === selectedReferral.fromUserId);
      const fromName = selectedReferral.fromUserName || fromUser?.name || 'Member';

      await notificationService.notifyMasterAdmins('THANKYOU', `${profile.name} submitted a Thank You slip to ${fromName}.`);
      
      // Mark referral as completed after submitting thank you slip
      await databaseService.update('referrals', selectedReferral.id, { 
        status: 'COMPLETED',
        updatedAt: new Date().toISOString()
      });

      setSuccessMessage("Referral updated successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
      setIsThankYouModalOpen(false);
      setThankYouData({ businessValue: '', notes: '' });
      setSelectedReferral(null);
    } catch (error: any) {
      console.error("Error submitting thank you slip:", error);
      const errorMessage = error?.message || "Failed to submit thank you slip. Please try again.";
      setErrorMessage(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNotConverted = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedReferral || !notConvertedReason || isSubmitting) return;

    // Guard: Check if already processed
    if (selectedReferral.status === 'COMPLETED' || selectedReferral.status === 'NOT_CONVERTED') {
      setErrorMessage("This referral has already been processed.");
      setIsNotConvertedModalOpen(false);
      setSelectedReferral(null);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Double check latest status from Firestore for safety
      const latestRef = await databaseService.get<Referral>('referrals', selectedReferral.id);
      if (latestRef && (latestRef.status === 'COMPLETED' || latestRef.status === 'NOT_CONVERTED')) {
        setErrorMessage("Already submitted.");
        setIsNotConvertedModalOpen(false);
        setSelectedReferral(null);
        return;
      }

      await databaseService.update('referrals', selectedReferral.id, { 
        status: 'NOT_CONVERTED',
        notConvertedReason: notConvertedReason,
        updatedAt: new Date().toISOString()
      });

      setSuccessMessage("Referral updated successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
      setIsNotConvertedModalOpen(false);
      setNotConvertedReason('');
      setSelectedReferral(null);
    } catch (error: any) {
      console.error("Error marking referral as not converted:", error);
      const errorMessage = error?.message || "Failed to update referral status. Please try again.";
      setErrorMessage(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAdmin = profile?.role === 'MASTER_ADMIN';
  const isChapterAdmin = profile?.role === 'CHAPTER_ADMIN' || (profile?.role === 'MEMBER' && profile?.position === 'chapter_admin');
  const isPending = profile?.membershipStatus === 'PENDING' && !isAdmin && !isChapterAdmin;

  if (isAdmin || filter === 'chapter' || filter === 'all') {
    const associatedMemberIds = isChapterAdmin 
      ? [...members.filter(m => m.chapter_id === profile?.chapter_id || m.adminId === profile?.uid).map(m => m.uid || (m as any).id), profile?.uid]
      : [];

    const filteredReferrals = isChapterAdmin
      ? referrals.filter(ref => associatedMemberIds.includes(ref.fromUserId) || associatedMemberIds.includes(ref.toUserId))
      : referrals;

    return (
      <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-6 py-6 md:py-8 pb-24">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-[16px] flex items-center justify-center shrink-0 shadow-sm shadow-primary/5">
              <Users size={24} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight uppercase">
                Business Referrals
              </h1>
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-[0.15em] mt-0.5">
                Monitor business transactions and conversion rates
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#111827] rounded-[16px] border border-white/5 shadow-sm overflow-hidden mb-12">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#151C2E] border-b border-white/5 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Referral ID</th>
                  <th className="px-6 py-4 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Sent By</th>
                  <th className="px-6 py-4 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Received By</th>
                  {isAdmin && <th className="px-6 py-4 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Chapter</th>}
                  <th className="px-6 py-4 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} className="px-6 py-8 text-center">
                      <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Loading Data...</p>
                    </td>
                  </tr>
                ) : filteredReferrals.length > 0 ? (
                  filteredReferrals.map((ref) => {
                    const fromUser = members.find(m => m.uid === ref.fromUserId);
                    const toUser = members.find(m => m.uid === ref.toUserId);
                    const slip = thankYouSlips.find(s => s.referralId === ref.id);
                    const chapterAdmin = members.find(m => m.uid === (toUser?.adminId || fromUser?.adminId));

                    return (
                      <tr key={ref.id} className="hover:bg-[#1C2538] transition-colors group cursor-pointer" onClick={() => {
                        setSelectedReferral(ref);
                        setIsDetailModalOpen(true);
                      }}>
                        <td className="px-6 py-4">
                          <span className="text-[11px] font-mono font-medium text-neutral-400 uppercase">
                            #{ref.id.slice(-6)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-white">{ref.fromUserName || fromUser?.name || 'Unknown'}</span>
                            <span className="text-[11px] text-neutral-400 font-medium truncate max-w-[150px]">{fromUser?.category || 'Member'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-white">{toUser?.name || 'Unknown'}</span>
                            <span className="text-[11px] text-neutral-400 font-medium truncate max-w-[150px]">{toUser?.category || 'Member'}</span>
                          </div>
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4">
                            <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                              {chapterAdmin?.businessName || 'Independent'}
                            </span>
                          </td>
                        )}
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-neutral-300">
                            {format(new Date(ref.createdAt), 'dd MMM yyyy')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider",
                            ref.status === 'PENDING' && "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                            ref.status === 'COMPLETED' && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                            ref.status === 'NOT_CONVERTED' && "bg-red-500/10 text-red-400 border border-red-500/20",
                            ref.status === 'CONTACTED' && "bg-primary/10 text-primary border border-primary/20"
                          )}>
                            {isChapterAdmin ? (
                              (ref.status === 'COMPLETED' || ref.status === 'CONVERTED') ? 'Converted' :
                              (ref.status === 'NOT_CONVERTED' || ref.status === 'CLOSED') ? 'Lost' :
                              'Pending'
                            ) : ref.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-emerald-400">
                            {slip ? `₹${slip.businessValue.toLocaleString()}` : '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs font-medium text-neutral-400 line-clamp-1 max-w-[150px]" title={ref.notes}>
                            {ref.notes || '-'}
                          </p>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} className="px-6 py-20 text-center">
                      <Share2 size={40} className="mx-auto text-neutral-500 mb-3" />
                      <h3 className="text-sm font-bold text-white">No referrals found</h3>
                      <p className="text-xs text-neutral-400 mt-1">The referral history is currently empty.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-24 px-4 sm:px-0 py-6 md:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-[16px] flex items-center justify-center shrink-0 shadow-sm shadow-primary/5">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-white tracking-tight uppercase">
              My Referrals
            </h1>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-[0.12em] mt-0.5">
              Pass and receive business opportunities
            </p>
          </div>
        </div>
        {!isPending && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 h-11 px-5 bg-primary text-white rounded-[12px] text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-[0_2px_10px_rgba(0,0,0,0.02)] shadow-primary/10 hover:bg-primary/90 shrink-0"
          >
            <Plus size={14} />
            <span>Pass Referral</span>
          </button>
        )}
      </div>

      {/* Feedback Messages */}
      {successMessage && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-24 right-4 left-4 z-[100] bg-emerald-500 text-white px-6 py-4 rounded-[16px] shadow-2xl flex items-center gap-3"
        >
          <CheckCircle2 size={24} />
          <span className="font-bold text-sm uppercase tracking-wider">{successMessage}</span>
        </motion.div>
      )}

      {errorMessage && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-24 right-4 left-4 z-[100] bg-red-500 text-white px-6 py-4 rounded-[16px] shadow-2xl flex items-center gap-3"
        >
          <AlertCircle size={24} />
          <span className="font-bold text-sm uppercase tracking-wider">{errorMessage}</span>
        </motion.div>
      )}

      {/* Tabs & Action */}
      <div className="bg-[#111827] p-4 rounded-[20px] border border-white/5 space-y-4">
        <div className="flex gap-2 p-1 bg-[#05070D] rounded-[12px]">
          <button
            onClick={() => setFilter('received')}
            className={cn(
              "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
              filter === 'received' ? "bg-primary text-white shadow-sm" : "text-neutral-400 hover:bg-[#1C2538]"
            )}
          >
            Received
          </button>
          <button
            onClick={() => setFilter('passed')}
            className={cn(
              "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
              filter === 'passed' ? "bg-primary text-white shadow-sm" : "text-neutral-400 hover:bg-[#1C2538]"
            )}
          >
            Given
          </button>
        </div>
      </div>

      {isPending && (
        <div className="p-4 bg-amber-950/20 border border-amber-900/30 rounded-[14px] flex items-center gap-3 text-amber-400">
          <AlertCircle size={20} className="text-amber-500 shrink-0" />
          <p className="text-[11px] font-bold leading-tight">
            Membership <span className="text-amber-500 uppercase">Pending</span>. You can pass referrals once approved.
          </p>
        </div>
      )}

      {/* Referral List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-8 text-center">
            <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Loading Referrals...</p>
          </div>
        ) : (referrals.filter(r => filter === 'received' ? r.toUserId === profile?.uid : r.fromUserId === profile?.uid)).length > 0 ? (
          (referrals.filter(r => filter === 'received' ? r.toUserId === profile?.uid : r.fromUserId === profile?.uid)).map((ref, i) => {
            const fromUser = members.find(m => m.uid === ref.fromUserId);
            const toUser = members.find(m => m.uid === ref.toUserId);
            const otherUser = filter === 'received' ? fromUser : toUser;
            const otherName = filter === 'received' ? (ref.fromUserName || fromUser?.name || 'Member') : (toUser?.name || 'Member');
            
            return (
              <motion.div
                key={ref.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => {
                  setSelectedReferral(ref);
                  setIsDetailModalOpen(true);
                }}
                className={cn(
                  "bg-[#111827] p-5 rounded-[16px] shadow-sm border flex items-center gap-4 group active:scale-[0.99] transition-all duration-300 cursor-pointer relative overflow-hidden",
                  ref.status === 'PENDING' && filter === 'received' ? "border-amber-900/30 bg-amber-950/10" : "border-white/5"
                )}
              >
                {/* Left: Icon */}
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center shrink-0 relative",
                  ref.status === 'COMPLETED' ? "bg-emerald-500/10 text-emerald-400" : "bg-primary/10 text-primary"
                )}>
                  {ref.status === 'COMPLETED' ? <CheckCircle2 size={24} /> : <ArrowRightLeft size={24} />}
                  {ref.status === 'PENDING' && filter === 'received' && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                    </span>
                  )}
                </div>

                {/* Middle: Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-white truncate">
                      {filter === 'received' ? 'From: ' : 'To: '}{otherName}
                    </h3>
                  </div>
                  <p className="text-[10px] sm:text-[11px] font-medium text-neutral-400 truncate">
                    For: {ref.contactName} • {ref.requirement || 'Business Referral'}
                  </p>
                </div>

                {/* Right: Date + Status */}
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    {format(new Date(ref.createdAt), 'dd MMM')}
                  </p>
                  <span className={cn(
                    "text-[9px] font-bold uppercase tracking-widest",
                    ref.status === 'PENDING' && "text-amber-400",
                    ref.status === 'COMPLETED' && "text-emerald-400",
                    ref.status === 'NOT_CONVERTED' && "text-red-400",
                    ref.status === 'CONTACTED' && "text-blue-400"
                  )}>
                    {ref.status.replace('_', ' ')}
                  </span>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="py-20 text-center bg-[#111827] rounded-[14px] border border-dashed border-white/5">
            <Share2 size={40} className="mx-auto text-neutral-500 mb-3" />
            <h3 className="text-sm font-bold text-white">No referrals yet</h3>
            <p className="text-xs text-neutral-400 mt-1">Your business referrals will appear here.</p>
          </div>
        )}
      </div>

      {/* Pass Referral Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Pass a New Referral"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-neutral-300 uppercase tracking-wider">Select Member</label>
            <select
              id="referral-toUserId"
              required
              value={formData.toUserId}
              onChange={(e) => setFormData({ ...formData, toUserId: e.target.value })}
              className="w-full px-4 py-3 bg-[#151C2E] border border-white/5 text-white rounded-[12px] focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            >
              <option value="" className="bg-[#111827] text-white">Choose a member...</option>
              {members.map((m) => (
                <option key={m.uid} value={m.uid} className="bg-[#111827] text-white">{m.name || m.displayName} ({m.businessName} - {m.category})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-neutral-300 uppercase tracking-wider">Contact Name</label>
              <input
                id="referral-contactName"
                required
                type="text"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                placeholder="Who are you referring?"
                className="w-full px-4 py-3 bg-[#151C2E] border border-white/5 text-white placeholder-neutral-500 rounded-[12px] focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-neutral-300 uppercase tracking-wider">Contact Phone</label>
              <input
                id="referral-contactPhone"
                required
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                placeholder="Phone number"
                className="w-full px-4 py-3 bg-[#151C2E] border border-white/5 text-white placeholder-neutral-500 rounded-[12px] focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-neutral-300 uppercase tracking-wider">Business Requirement</label>
            <textarea
              id="referral-requirement"
              required
              value={formData.requirement}
              onChange={(e) => setFormData({ ...formData, requirement: e.target.value })}
              placeholder="What does the contact need?"
              rows={3}
              className="w-full px-4 py-3 bg-[#151C2E] border border-white/5 text-white placeholder-neutral-500 rounded-[12px] focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-neutral-300 uppercase tracking-wider">Additional Notes (Optional)</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any extra info for the member?"
              className="w-full px-4 py-3 bg-[#151C2E] border border-white/5 text-white placeholder-neutral-500 rounded-[12px] focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "w-full py-4 bg-primary text-white rounded-[12px] font-bold hover:bg-red-700 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)] shadow-red-500/20 active:scale-[0.98] flex items-center justify-center gap-2",
                isSubmitting && "opacity-70 cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Referral"
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Thank You Modal */}
      <Modal
        isOpen={isThankYouModalOpen}
        onClose={() => setIsThankYouModalOpen(false)}
        title="Submit Thank You Slip"
      >
        <form onSubmit={handleThankYouSubmit} className="space-y-6">
          <div className="p-4 bg-[#151C2E] rounded-[16px] border border-white/5">
            <p className="text-xs text-neutral-400 uppercase font-bold tracking-widest mb-1">Referral From</p>
            <p className="text-sm font-bold text-white">
              {selectedReferral?.fromUserName || members.find(m => m.uid === selectedReferral?.fromUserId)?.name || 'Member'}
            </p>
            <p className="text-xs text-neutral-400 mt-2">For: {selectedReferral?.contactName}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-neutral-300 uppercase tracking-wider">Business Value (₹)</label>
            <input
              required
              type="number"
              value={thankYouData.businessValue}
              onChange={(e) => setThankYouData({ ...thankYouData, businessValue: e.target.value })}
              placeholder="Enter amount in INR"
              className="w-full px-4 py-3 bg-[#151C2E] border border-white/5 text-white placeholder-neutral-500 rounded-[12px] focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-neutral-300 uppercase tracking-wider">Notes (Optional)</label>
            <textarea
              value={thankYouData.notes}
              onChange={(e) => setThankYouData({ ...thankYouData, notes: e.target.value })}
              placeholder="Add a thank you note..."
              rows={3}
              className="w-full px-4 py-3 bg-[#151C2E] border border-white/5 text-white placeholder-neutral-500 rounded-[12px] focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setIsThankYouModalOpen(false);
                setIsDetailModalOpen(true);
              }}
              disabled={isSubmitting}
              className="flex-1 px-6 py-4 border border-white/10 text-neutral-400 rounded-[12px] font-bold uppercase tracking-widest text-[10px] hover:bg-[#1C2538] transition-all disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "flex-2 py-4 bg-red-600 text-white rounded-[12px] font-bold hover:bg-red-700 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)] shadow-red-500/20 flex items-center justify-center gap-2",
                isSubmitting && "opacity-70 cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Thank You Slip"
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Not Converted Modal */}
      <Modal
        isOpen={isNotConvertedModalOpen}
        onClose={() => {
          setIsNotConvertedModalOpen(false);
          setSelectedReferral(null);
          setNotConvertedReason('');
        }}
        title="Reason for Not Converted"
      >
        <form onSubmit={handleNotConverted} className="space-y-6">
          <div className="space-y-4">
            <div className="p-4 bg-red-950/20 rounded-[16px] border border-red-900/30">
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">Referral Details</p>
              <p className="text-sm font-bold text-white">{selectedReferral?.contactName}</p>
              <p className="text-xs text-neutral-400">{selectedReferral?.requirement}</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">
                Select Reason
              </label>
              <select
                required
                value={notConvertedReason}
                onChange={(e) => setNotConvertedReason(e.target.value)}
                className="w-full px-4 py-3 bg-[#151C2E] border border-white/5 text-white rounded-[12px] focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm font-medium"
              >
                <option value="" className="bg-[#111827] text-white">Choose a reason...</option>
                <option value="Price Related" className="bg-[#111827] text-white">Price Related</option>
                <option value="Material / Product Not Available" className="bg-[#111827] text-white">Material / Product Not Available</option>
                <option value="Requirement Not Available" className="bg-[#111827] text-white">Requirement Not Available</option>
                <option value="Customer Not Interested" className="bg-[#111827] text-white">Customer Not Interested</option>
                <option value="Other" className="bg-[#111827] text-white">Other</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setIsNotConvertedModalOpen(false);
                setIsDetailModalOpen(true);
              }}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 border border-white/10 text-neutral-400 rounded-[12px] font-bold uppercase tracking-widest text-[10px] hover:bg-[#1C2538] transition-all disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "flex-1 px-6 py-3 bg-red-600 text-white rounded-[12px] font-bold uppercase tracking-widest text-[10px] hover:bg-red-700 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)] shadow-red-200 flex items-center justify-center gap-2",
                isSubmitting && "opacity-70 cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit"
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Referral Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedReferral(null);
        }}
        title="Referral Details"
      >
        {selectedReferral && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="p-4 bg-[#151C2E] rounded-[16px] border border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
                      {filter === 'received' ? 'From' : 'To'}
                    </p>
                    <p className="text-sm font-bold text-white">
                      {filter === 'received' 
                        ? (selectedReferral.fromUserName || members.find(m => m.uid === selectedReferral.fromUserId)?.name || 'Member')
                        : (members.find(m => m.uid === selectedReferral.toUserId)?.name || 'Member')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Date</p>
                    <p className="text-xs font-bold text-white">{format(new Date(selectedReferral.createdAt), 'dd MMM yyyy')}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-white/5">
                  <div>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Contact Details</p>
                    <p className="text-sm font-bold text-white">{selectedReferral.contactName}</p>
                    <p className="text-xs font-medium text-neutral-400">{selectedReferral.contactPhone}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Requirement</p>
                    <p className="text-sm font-medium text-white leading-relaxed">{selectedReferral.requirement}</p>
                  </div>
                  {selectedReferral.notes && (
                    <div>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Notes</p>
                      <p className="text-sm font-medium text-white leading-relaxed italic">"{selectedReferral.notes}"</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Specific Info */}
              {selectedReferral.status === 'COMPLETED' && (
                <div className="p-4 bg-emerald-950/20 rounded-[16px] border border-emerald-900/30">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 size={18} className="text-emerald-400" />
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Referral Converted</p>
                  </div>
                  {thankYouSlips.find(s => s.referralId === selectedReferral.id) && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-tight">Amount Generated</span>
                        <span className="text-sm font-bold text-emerald-400">₹{thankYouSlips.find(s => s.referralId === selectedReferral.id)?.businessValue.toLocaleString()}</span>
                      </div>
                      {thankYouSlips.find(s => s.referralId === selectedReferral.id)?.notes && (
                        <div>
                          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-tight mb-1">Thank You Note</p>
                          <p className="text-xs font-medium text-emerald-400 italic">"{thankYouSlips.find(s => s.referralId === selectedReferral.id)?.notes}"</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {selectedReferral.status === 'NOT_CONVERTED' && (
                <div className="p-4 bg-red-950/20 rounded-[16px] border border-red-900/30">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle size={18} className="text-red-400" />
                    <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Not Converted</p>
                  </div>
                  <p className="text-xs font-bold text-red-400">Reason: {selectedReferral.notConvertedReason}</p>
                </div>
              )}
            </div>

            {/* Actions for Received Tab */}
            {filter === 'received' && selectedReferral.status === 'PENDING' && (
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    setIsNotConvertedModalOpen(true);
                  }}
                  className="flex-1 py-3 bg-[#151C2E] border border-red-900/30 text-red-400 rounded-[12px] font-bold uppercase tracking-widest text-[10px] hover:bg-red-950/20 transition-all active:scale-95"
                >
                  Lost
                </button>
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    setIsThankYouModalOpen(true);
                  }}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-[12px] font-bold uppercase tracking-widest text-[10px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] shadow-emerald-500/20 hover:bg-emerald-700 transition-all active:scale-95"
                >
                  Convert
                </button>
              </div>
            )}

            <button
              onClick={() => setIsDetailModalOpen(false)}
              className="w-full py-3 text-neutral-400 font-bold uppercase tracking-widest text-[10px] hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
