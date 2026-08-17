import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabaseClient';
import { databaseService } from '../../services/databaseService';
import { notificationService } from '../../services/notificationService';
import { Modal } from '../Modal';
import { IndianRupee, AlertCircle, CheckCircle2, Award, FileText, User, Calendar } from 'lucide-react';
import { showError, showSuccess, scrollToError } from '../../services/toastService';
import { safeFormat as format } from '../../utils/dateUtils';
import { cn } from '../../lib/utils';

interface SubmitThankYouSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialReferralId?: string;
}

export function SubmitThankYouSlipModal({
  isOpen,
  onClose,
  onSuccess,
  initialReferralId
}: SubmitThankYouSlipModalProps) {
  const { profile } = useAuth();
  const currentUserId = profile?.uid || (profile as any)?.id;

  const [referrals, setReferrals] = useState<any[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});
  const [formData, setFormData] = useState({
    referralId: initialReferralId || '',
    customerName: '',
    contactPhone: '',
    businessRequirement: '',
    senderName: '',
    senderId: '',
    referralDate: '',
    businessValue: '',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      return;
    }

    let isMounted = true;
    const loadReferrals = async () => {
      try {
        const uId = profile?.uid || (profile as any)?.id;
        if (!uId) return;

        // Fetch users map for sender names
        const { data: usersData } = await supabase.from('users').select('*');
        const uMap: Record<string, any> = {};
        if (usersData) {
          usersData.forEach((u: any) => {
            if (u.id) uMap[String(u.id).toLowerCase()] = u;
            if (u.uid) uMap[String(u.uid).toLowerCase()] = u;
          });
        }
        if (isMounted) setUsersMap(uMap);

        // Fetch existing slips to exclude already thanked referrals
        const { data: slipsData } = await supabase.from('thank_you_slips').select('referral_id, referralId');
        const thankedRefIds = new Set<string>();
        if (slipsData) {
          slipsData.forEach((s: any) => {
            const rId = s.referral_id || s.referralId;
            if (rId) thankedRefIds.add(String(rId));
          });
        }

        // Fetch referrals received by this user
        let query = supabase
          .from('referrals')
          .select('*')
          .or(`receiver_id.eq.${uId},to_user_id.eq.${uId}`)
          .order('created_at', { ascending: false });

        const { data: refData, error: refErr } = await query;
        if (refErr) throw refErr;

        if (isMounted && refData) {
          const eligible = refData
            .filter((r: any) => !thankedRefIds.has(String(r.id)))
            .map((r: any) => {
              const sId = r.sender_id || r.from_user_id || '';
              const senderObj = uMap[String(sId).toLowerCase()];
              const sName = senderObj?.name || senderObj?.displayName || r.sender_name || 'Member';
              return {
                id: r.id,
                contactName: r.contact_name || r.customer_name || 'Client',
                contactPhone: r.contact_phone || r.customer_mobile || '',
                requirement: r.business_requirement || r.requirement || '',
                senderId: sId,
                senderName: sName,
                createdAt: r.created_at || r.createdAt || new Date().toISOString()
              };
            });

          setReferrals(eligible);

          if (initialReferralId) {
            const target = eligible.find(r => String(r.id) === String(initialReferralId));
            if (target) {
              setFormData(prev => ({
                ...prev,
                referralId: target.id,
                customerName: target.contactName,
                contactPhone: target.contactPhone,
                businessRequirement: target.requirement,
                senderName: target.senderName,
                senderId: target.senderId,
                referralDate: target.createdAt ? format(new Date(target.createdAt), 'dd MMM yyyy') : ''
              }));
            }
          }
        }
      } catch (err: any) {
        console.warn('Error loading referrals for slip modal:', err);
      }
    };

    loadReferrals();
    return () => { isMounted = false; };
  }, [isOpen, profile, initialReferralId]);

  const handleReferralSelect = (selectedId: string) => {
    const selected = referrals.find(r => String(r.id) === String(selectedId));
    if (selected) {
      setFormData(prev => ({
        ...prev,
        referralId: selected.id,
        customerName: selected.contactName || '',
        contactPhone: selected.contactPhone || '',
        businessRequirement: selected.requirement || '',
        senderName: selected.senderName || 'Member',
        senderId: selected.senderId || '',
        referralDate: selected.createdAt ? format(new Date(selected.createdAt), 'dd MMM yyyy') : ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        referralId: '',
        customerName: '',
        contactPhone: '',
        businessRequirement: '',
        senderName: '',
        senderId: '',
        referralDate: ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!formData.referralId) {
      const msg = 'Please select a converted referral.';
      setError(msg);
      showError(msg);
      scrollToError();
      return;
    }

    if (!formData.businessValue || Number(formData.businessValue) <= 0) {
      const msg = 'Please enter a valid transaction value in ₹.';
      setError(msg);
      showError(msg);
      scrollToError();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const currentAuthId = profile?.uid || profile?.id || (await supabase.auth.getUser()).data?.user?.id;
      const targetReferrerId = String(formData.senderId || '');

      const cleanDbPayload = {
        referral_id: String(formData.referralId),
        referralId: String(formData.referralId),
        sender_id: currentAuthId,
        receiver_id: targetReferrerId || null,
        submitted_by: currentAuthId,
        from_user_id: currentAuthId,
        to_user_id: targetReferrerId || null,
        customer_name: formData.customerName || '',
        business_value: Number(formData.businessValue),
        notes: formData.notes ? formData.notes.trim() : '',
        thank_you_message: formData.notes ? formData.notes.trim() : '',
        chapter_id: profile.chapter_id || (profile as any).chapterId || null,
        chapterId: profile.chapter_id || (profile as any).chapterId || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: directSlipErr } = await supabase
        .from('thank_you_slips')
        .insert([cleanDbPayload]);

      if (directSlipErr) {
        if (directSlipErr.code === '23505' || directSlipErr.message?.toLowerCase().includes('unique') || directSlipErr.message?.toLowerCase().includes('duplicate')) {
          throw new Error('A Thank You Slip has already been submitted for this referral.');
        }
        throw directSlipErr;
      }

      // Update referral status to Completed
      await supabase
        .from('referrals')
        .update({
          status: 'Completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', formData.referralId);

      // Send notification to referrer
      if (targetReferrerId) {
        try {
          await notificationService.sendNotification({
            userId: targetReferrerId,
            role: 'MEMBER',
            type: 'THANKYOU',
            title: 'Thank You Slip Received',
            message: `You received a Thank You Slip of ₹${Number(formData.businessValue).toLocaleString('en-IN')} from ${profile.name || 'a member'}.`,
            relatedUserId: currentAuthId,
            link: '/thank-you-slips'
          });
        } catch (nErr) {
          console.warn('Thank you slip notification notice:', nErr);
        }
      }

      showSuccess('Thank You Slip submitted successfully!');
      window.dispatchEvent(new CustomEvent('slips-updated'));
      window.dispatchEvent(new CustomEvent('referrals-updated'));
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));

      setFormData({
        referralId: '',
        customerName: '',
        contactPhone: '',
        businessRequirement: '',
        senderName: '',
        senderId: '',
        referralDate: '',
        businessValue: '',
        notes: ''
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Submit slip error:', err);
      const errMsg = err?.message || 'Failed to submit thank you slip. Please try again.';
      setError(errMsg);
      showError(errMsg);
      scrollToError();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title="Submit Thank You Slip"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Referral Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
            Select Converted Referral <span className="text-red-400">*</span>
          </label>
          <select
            required
            value={formData.referralId}
            onChange={(e) => handleReferralSelect(e.target.value)}
            className="w-full px-3.5 py-3 rounded-xl border border-white/10 bg-[#151C2E] text-white focus:ring-2 focus:ring-primary outline-none transition-all text-sm font-medium"
          >
            <option value="" className="bg-[#111827]">Choose an eligible converted referral...</option>
            {referrals.map((r) => {
              const dateStr = r.createdAt ? format(new Date(r.createdAt), 'dd MMM yyyy') : '';
              return (
                <option key={r.id} value={r.id} className="bg-[#111827]">
                  {r.contactName} - {r.requirement || 'Requirement'} {dateStr ? `(${dateStr})` : ''} [From: {r.senderName}]
                </option>
              );
            })}
          </select>
          <p className="text-[11px] text-neutral-400">
            Only referrals received by you that haven't received a slip will appear here.
          </p>
        </div>

        {/* Auto-filled details */}
        {formData.referralId && (
          <div className="p-3.5 rounded-xl bg-[#151C2E]/80 border border-white/10 space-y-3">
            <p className="text-[11px] font-bold text-primary uppercase tracking-wider">
              Referral Information
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-semibold">Customer Name</span>
                <span className="text-white font-bold">{formData.customerName || 'N/A'}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-semibold">Referral Sender</span>
                <span className="text-white font-bold">{formData.senderName || 'Member'}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-semibold">Requirement</span>
                <span className="text-neutral-300 font-medium">{formData.businessRequirement || 'N/A'}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-semibold">Date Received</span>
                <span className="text-neutral-300 font-medium">{formData.referralDate || 'N/A'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Value */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
            Transaction Value (₹) <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
              <IndianRupee size={16} />
            </div>
            <input
              required
              type="number"
              min="1"
              step="any"
              value={formData.businessValue}
              onChange={(e) => setFormData({ ...formData, businessValue: e.target.value })}
              placeholder="e.g. 50000"
              className="w-full pl-9 pr-4 py-3 rounded-xl border border-white/10 bg-[#151C2E] text-white focus:ring-2 focus:ring-primary outline-none text-sm font-semibold"
            />
          </div>
        </div>

        {/* Thank You Note */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
            Thank You Message (Optional)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Write a brief thank you note to the referrer..."
            rows={3}
            className="w-full px-3.5 py-3 rounded-xl border border-white/10 bg-[#151C2E] text-white placeholder-neutral-500 focus:ring-2 focus:ring-primary outline-none resize-none text-sm"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-primary text-white rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Submitting Slip...</span>
              </>
            ) : (
              'Submit Thank You Slip'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
