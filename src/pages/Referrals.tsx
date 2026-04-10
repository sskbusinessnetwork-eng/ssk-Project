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
  Share2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSearchParams, Link } from 'react-router-dom';
import { firestoreService } from '../services/firestoreService';
import { Referral, UserProfile, ThankYouSlip } from '../types';
import { Modal } from '../components/Modal';
import { format } from 'date-fns';
import { where, orderBy, onSnapshot, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { cn } from '../lib/utils';
import { normalizePhoneNumber } from '../utils/phoneUtils';
import { notificationService } from '../services/notificationService';

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
    const isChapterAdmin = profile.role === 'CHAPTER_ADMIN';

    // For Master Admin and Chapter Admin, we don't filter by user ID to show all referrals (we'll filter in UI for Chapter Admin)
    if (!isAdmin && !isChapterAdmin) {
      constraints.unshift(where(filter === 'passed' ? 'fromUserId' : 'toUserId', '==', profile.uid));
    }

    const unsubscribe = firestoreService.subscribe<Referral>('referrals', constraints, (data) => {
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
    firestoreService.list<UserProfile>('users', []).then(data => {
      if (isAdmin || isChapterAdmin) {
        setMembers(data);
      } else {
        setMembers(data.filter(m => m.uid !== profile.uid && m.membershipStatus === 'ACTIVE'));
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

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const normalizedPhone = normalizePhoneNumber(formData.contactPhone);

      const toUser = members.find(m => m.uid === formData.toUserId);
      if (!toUser) throw new Error("Selected member not found");

      const newReferral: Omit<Referral, 'id'> = {
        ...formData,
        contactPhone: normalizedPhone,
        fromUserId: profile.uid,
        fromUserName: profile.name || profile.displayName || 'Unknown',
        fromUserRole: profile.role,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      };

      await firestoreService.create('referrals', newReferral);
      
      // Create notifications
      await notificationService.createNotification(
        formData.toUserId, 
        'MEMBER', 
        'REFERRAL', 
        `You have received a new referral from ${profile.name} for ${formData.contactName}.`
      );

      // Notify recipient's admin
      if (toUser.adminId) {
        await notificationService.createNotification(
          toUser.adminId,
          'CHAPTER_ADMIN',
          'REFERRAL',
          `${profile.name} has passed a referral to ${toUser.name}.`
        );
      }

      // Notify sender's admin (if different from recipient's admin)
      if (profile.adminId && profile.adminId !== toUser.adminId) {
        await notificationService.createNotification(
          profile.adminId,
          'CHAPTER_ADMIN',
          'REFERRAL',
          `${profile.name} has passed a referral to ${toUser.name}.`
        );
      }

      await notificationService.notifyMasterAdmins('REFERRAL', `${profile.name} has passed a referral to ${toUser.name}.`);

      setSuccessMessage("Referral passed successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
      setIsModalOpen(false);
      setFormData({ toUserId: '', contactName: '', contactPhone: '', requirement: '', notes: '' });
    } catch (error) {
      console.error("Error passing referral:", error);
      setErrorMessage("Failed to pass referral. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (id: string, status: Referral['status']) => {
    await firestoreService.update('referrals', id, { 
      status,
      updatedAt: new Date().toISOString()
    });
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
      const latestRef = await firestoreService.get<Referral>('referrals', selectedReferral.id);
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

      await firestoreService.create('thank_you_slips', newSlip);
      
      // Create notifications
      await notificationService.createNotification(
        selectedReferral.fromUserId,
        'MEMBER',
        'THANKYOU',
        `${profile.name} has submitted a Thank You slip for the referral you passed.`
      );

      await notificationService.notifyMasterAdmins('THANKYOU', `${profile.name} submitted a Thank You slip to ${selectedReferral.fromUserName}.`);
      
      // Mark referral as completed after submitting thank you slip
      await firestoreService.update('referrals', selectedReferral.id, { 
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
      const latestRef = await firestoreService.get<Referral>('referrals', selectedReferral.id);
      if (latestRef && (latestRef.status === 'COMPLETED' || latestRef.status === 'NOT_CONVERTED')) {
        setErrorMessage("Already submitted.");
        setIsNotConvertedModalOpen(false);
        setSelectedReferral(null);
        return;
      }

      await firestoreService.update('referrals', selectedReferral.id, { 
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
  const isChapterAdmin = profile?.role === 'CHAPTER_ADMIN';
  const isPending = profile?.membershipStatus === 'PENDING' && !isAdmin && !isChapterAdmin;

  if (isAdmin || isChapterAdmin) {
    const associatedMemberIds = isChapterAdmin 
      ? [...members.filter(m => m.adminId === profile?.uid).map(m => m.uid), profile?.uid]
      : [];

    const filteredReferrals = isChapterAdmin
      ? referrals.filter(ref => associatedMemberIds.includes(ref.fromUserId) || associatedMemberIds.includes(ref.toUserId))
      : referrals;

    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-24 px-4">
        <div className="bg-white rounded-[20px] card-shadow border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Referral ID</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sent By</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Received By</th>
                  {isAdmin && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Chapter</th>}
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} className="px-6 py-12 text-center">
                      <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading Data...</p>
                    </td>
                  </tr>
                ) : filteredReferrals.length > 0 ? (
                  filteredReferrals.map((ref) => {
                    const fromUser = members.find(m => m.uid === ref.fromUserId);
                    const toUser = members.find(m => m.uid === ref.toUserId);
                    const slip = thankYouSlips.find(s => s.referralId === ref.id);
                    const chapterAdmin = members.find(m => m.uid === (toUser?.adminId || fromUser?.adminId));

                    return (
                      <tr key={ref.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                            #{ref.id.slice(-6)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-navy">{ref.fromUserName || fromUser?.name || 'Unknown'}</span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{fromUser?.category || 'Member'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-navy">{toUser?.name || 'Unknown'}</span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{toUser?.category || 'Member'}</span>
                          </div>
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4">
                            <span className="text-[10px] font-black text-primary uppercase tracking-tight">
                              {chapterAdmin?.businessName || 'Independent'}
                            </span>
                          </td>
                        )}
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-slate-600">
                            {format(new Date(ref.createdAt), 'dd MMM yyyy')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest",
                            ref.status === 'PENDING' && "bg-amber-50 text-amber-600",
                            ref.status === 'COMPLETED' && "bg-emerald-50 text-emerald-600",
                            ref.status === 'NOT_CONVERTED' && "bg-rose-50 text-rose-600",
                            ref.status === 'CONTACTED' && "bg-blue-50 text-blue-600"
                          )}>
                            {isChapterAdmin ? (
                              (ref.status === 'COMPLETED' || ref.status === 'CONVERTED') ? 'Converted' :
                              (ref.status === 'NOT_CONVERTED' || ref.status === 'CLOSED') ? 'Lost' :
                              'Pending'
                            ) : ref.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-black text-emerald-600">
                            {slip ? `₹${slip.businessValue.toLocaleString()}` : '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-[10px] font-medium text-slate-500 line-clamp-1 max-w-[150px]" title={ref.notes}>
                            {ref.notes || '-'}
                          </p>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} className="px-6 py-20 text-center">
                      <Share2 size={40} className="mx-auto text-slate-200 mb-3" />
                      <h3 className="text-sm font-bold text-navy">No referrals found</h3>
                      <p className="text-xs text-slate-400 mt-1">The referral history is currently empty.</p>
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
    <div className="space-y-4 max-w-2xl mx-auto pb-24 px-1 sm:px-0">
      {/* Feedback Messages */}
      {successMessage && (
        <div className="fixed top-20 right-4 left-4 z-[100] bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={20} />
          <span className="font-bold text-xs uppercase tracking-wider">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="fixed top-20 right-4 left-4 z-[100] bg-rose-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle size={20} />
          <span className="font-bold text-xs uppercase tracking-wider">{errorMessage}</span>
        </div>
      )}

      {/* Tabs & Action */}
      <div className="bg-white p-4 rounded-[14px] card-shadow border border-border space-y-4">
        <div className="flex gap-2 p-1 bg-muted rounded-xl">
          <button
            onClick={() => setFilter('received')}
            className={cn(
              "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
              filter === 'received' ? "bg-primary text-white shadow-sm" : "text-text-secondary hover:bg-white/50"
            )}
          >
            Received
          </button>
          <button
            onClick={() => setFilter('passed')}
            className={cn(
              "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
              filter === 'passed' ? "bg-primary text-white shadow-sm" : "text-text-secondary hover:bg-white/50"
            )}
          >
            Given
          </button>
        </div>
      </div>

      {isPending && (
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-[14px] flex items-center gap-3 text-amber-900">
          <AlertCircle size={20} className="text-amber-500 shrink-0" />
          <p className="text-[11px] font-bold leading-tight">
            Membership <span className="text-amber-600 uppercase">Pending</span>. You can pass referrals once approved.
          </p>
        </div>
      )}

      {/* Referral List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center">
            <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Loading Referrals...</p>
          </div>
        ) : referrals.length > 0 ? (
          referrals.map((ref, i) => {
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
                  "bg-white p-4 rounded-[14px] card-shadow border flex items-center gap-4 group active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden",
                  ref.status === 'PENDING' && filter === 'received' ? "border-amber-200 animate-pulse-subtle" : "border-border"
                )}
              >
                {/* Left: Icon */}
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center shrink-0 relative",
                  ref.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-600" : "bg-primary/5 text-primary"
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
                    <h3 className="text-sm font-bold text-text-primary truncate">
                      {filter === 'received' ? 'From: ' : 'To: '}{otherName}
                    </h3>
                  </div>
                  <p className="text-[10px] sm:text-[11px] font-medium text-text-secondary truncate">
                    For: {ref.contactName} • {ref.requirement || 'Business Referral'}
                  </p>
                </div>

                {/* Right: Date + Status */}
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                    {format(new Date(ref.createdAt), 'dd MMM')}
                  </p>
                  <span className={cn(
                    "text-[9px] font-bold uppercase tracking-widest",
                    ref.status === 'PENDING' && "text-amber-500",
                    ref.status === 'COMPLETED' && "text-emerald-500",
                    ref.status === 'NOT_CONVERTED' && "text-rose-500",
                    ref.status === 'CONTACTED' && "text-blue-500"
                  )}>
                    {ref.status.replace('_', ' ')}
                  </span>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="py-20 text-center bg-white rounded-[14px] border border-dashed border-border">
            <Share2 size={40} className="mx-auto text-text-secondary/20 mb-3" />
            <h3 className="text-sm font-bold text-text-primary">No referrals yet</h3>
            <p className="text-xs text-text-secondary mt-1">Your business referrals will appear here.</p>
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
            <label className="text-sm font-bold text-slate-900 uppercase tracking-wider">Select Member</label>
            <select
              required
              value={formData.toUserId}
              onChange={(e) => setFormData({ ...formData, toUserId: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
            >
              <option value="">Choose a member...</option>
              {members.map((m) => (
                <option key={m.uid} value={m.uid}>{m.name || m.displayName} ({m.businessName} - {m.category})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-900 uppercase tracking-wider">Contact Name</label>
              <input
                required
                type="text"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                placeholder="Who are you referring?"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-900 uppercase tracking-wider">Contact Phone</label>
              <input
                required
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                placeholder="Phone number"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-900 uppercase tracking-wider">Business Requirement</label>
            <textarea
              required
              value={formData.requirement}
              onChange={(e) => setFormData({ ...formData, requirement: e.target.value })}
              placeholder="What does the contact need?"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-900 uppercase tracking-wider">Additional Notes (Optional)</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any extra info for the member?"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] flex items-center justify-center gap-2",
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
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Referral From</p>
            <p className="text-sm font-bold text-slate-900">
              {selectedReferral?.fromUserName || members.find(m => m.uid === selectedReferral?.fromUserId)?.name || 'Member'}
            </p>
            <p className="text-xs text-slate-600 mt-2">For: {selectedReferral?.contactName}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-900 uppercase tracking-wider">Business Value (₹)</label>
            <input
              required
              type="number"
              value={thankYouData.businessValue}
              onChange={(e) => setThankYouData({ ...thankYouData, businessValue: e.target.value })}
              placeholder="Enter amount in INR"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-900 uppercase tracking-wider">Notes (Optional)</label>
            <textarea
              value={thankYouData.notes}
              onChange={(e) => setThankYouData({ ...thankYouData, notes: e.target.value })}
              placeholder="Add a thank you note..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all resize-none"
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
              className="flex-1 px-6 py-4 border-2 border-slate-100 text-slate-600 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "flex-2 py-4 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2",
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
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
              <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mb-1">Referral Details</p>
              <p className="text-sm font-bold text-slate-900">{selectedReferral?.contactName}</p>
              <p className="text-xs text-slate-600">{selectedReferral?.requirement}</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                Select Reason
              </label>
              <select
                required
                value={notConvertedReason}
                onChange={(e) => setNotConvertedReason(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-emerald-500 focus:ring-0 transition-all text-sm font-medium"
              >
                <option value="">Choose a reason...</option>
                <option value="Price Related">Price Related</option>
                <option value="Material / Product Not Available">Material / Product Not Available</option>
                <option value="Requirement Not Available">Requirement Not Available</option>
                <option value="Customer Not Interested">Customer Not Interested</option>
                <option value="Other">Other</option>
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
              className="flex-1 px-6 py-3 border-2 border-slate-100 text-slate-600 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "flex-1 px-6 py-3 bg-rose-600 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 flex items-center justify-center gap-2",
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
              <div className="p-4 bg-muted rounded-2xl border border-border">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">
                      {filter === 'received' ? 'From' : 'To'}
                    </p>
                    <p className="text-sm font-bold text-text-primary">
                      {filter === 'received' 
                        ? (selectedReferral.fromUserName || members.find(m => m.uid === selectedReferral.fromUserId)?.name || 'Member')
                        : (members.find(m => m.uid === selectedReferral.toUserId)?.name || 'Member')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Date</p>
                    <p className="text-xs font-bold text-text-primary">{format(new Date(selectedReferral.createdAt), 'dd MMM yyyy')}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-border/50">
                  <div>
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Contact Details</p>
                    <p className="text-sm font-bold text-text-primary">{selectedReferral.contactName}</p>
                    <p className="text-xs font-medium text-text-secondary">{selectedReferral.contactPhone}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Requirement</p>
                    <p className="text-sm font-medium text-text-primary leading-relaxed">{selectedReferral.requirement}</p>
                  </div>
                  {selectedReferral.notes && (
                    <div>
                      <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Notes</p>
                      <p className="text-sm font-medium text-text-primary leading-relaxed italic">"{selectedReferral.notes}"</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Specific Info */}
              {selectedReferral.status === 'COMPLETED' && (
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Referral Converted</p>
                  </div>
                  {thankYouSlips.find(s => s.referralId === selectedReferral.id) && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-tight">Amount Generated</span>
                        <span className="text-sm font-bold text-emerald-600">₹{thankYouSlips.find(s => s.referralId === selectedReferral.id)?.businessValue.toLocaleString()}</span>
                      </div>
                      {thankYouSlips.find(s => s.referralId === selectedReferral.id)?.notes && (
                        <div>
                          <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-tight mb-1">Thank You Note</p>
                          <p className="text-xs font-medium text-emerald-700 italic">"{thankYouSlips.find(s => s.referralId === selectedReferral.id)?.notes}"</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {selectedReferral.status === 'NOT_CONVERTED' && (
                <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle size={18} className="text-rose-600" />
                    <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Not Converted</p>
                  </div>
                  <p className="text-xs font-bold text-rose-900">Reason: {selectedReferral.notConvertedReason}</p>
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
                  className="flex-1 py-3 bg-white border-2 border-rose-100 text-rose-600 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-rose-50 transition-all active:scale-95"
                >
                  Lost
                </button>
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    setIsThankYouModalOpen(true);
                  }}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all active:scale-95"
                >
                  Convert
                </button>
              </div>
            )}

            <button
              onClick={() => setIsDetailModalOpen(false)}
              className="w-full py-3 text-text-secondary font-bold uppercase tracking-widest text-[10px] hover:text-text-primary transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
