import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabaseClient';
import { databaseService } from '../../services/databaseService';
import { notificationService } from '../../services/notificationService';
import { Modal } from '../Modal';
import { Users, Building2, AlertCircle, CheckCircle2, Phone, User, FileText } from 'lucide-react';
import { showError, showSuccess, scrollToError } from '../../services/toastService';
import { cn } from '../../lib/utils';
import { normalizePhoneNumber } from '../../utils/phoneUtils';

interface PassReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialToUserId?: string;
}

export function PassReferralModal({
  isOpen,
  onClose,
  onSuccess,
  initialToUserId
}: PassReferralModalProps) {
  const { profile } = useAuth();
  const currentUserId = profile?.uid || (profile as any)?.id;

  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [memberFilter, setMemberFilter] = useState<'all' | 'my_chapter'>('my_chapter');
  const [formData, setFormData] = useState({
    toUserId: initialToUserId || '',
    contactName: '',
    contactPhone: '',
    requirement: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialToUserId) {
      setFormData(prev => ({ ...prev, toUserId: initialToUserId }));
    }
  }, [initialToUserId]);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      return;
    }

    let isMounted = true;
    const fetchMembers = async () => {
      try {
        const { data: usersData, error: usersErr } = await supabase
          .from('users')
          .select('*')
          .order('name', { ascending: true });

        if (usersErr) throw usersErr;

        const { data: chaptersData } = await supabase
          .from('chapters')
          .select('id, chapter_name, name');

        const chapterMap = new Map<string, string>();
        if (chaptersData) {
          chaptersData.forEach(c => {
            if (c.id) {
              chapterMap.set(String(c.id).trim().toLowerCase(), c.chapter_name || c.name || '');
            }
          });
        }

        if (isMounted && usersData) {
          const mapped = usersData
            .filter((u: any) => {
              const uId = u.id || u.uid;
              const isCurrentUser = String(uId).trim().toLowerCase() === String(currentUserId).trim().toLowerCase();
              const isMaster = u.role === 'MASTER_ADMIN';
              return !isCurrentUser && !isMaster;
            })
            .map((u: any) => {
              const chapId = u.chapter_id || u.chapterId || '';
              const chapName = chapId ? chapterMap.get(String(chapId).trim().toLowerCase()) || '' : '';
              return {
                ...u,
                id: u.id || u.uid,
                displayName: u.name || u.displayName || 'Member',
                chapterName: chapName || u.chapterName || '',
                position: u.position || u.role || 'Member',
                phone: u.phone || u.phoneNumber || ''
              };
            });
          setAllMembers(mapped);
        }
      } catch (err: any) {
        console.warn('Error loading members for referral modal:', err);
      }
    };

    fetchMembers();
    return () => { isMounted = false; };
  }, [isOpen, currentUserId]);

  const effectiveUserChapterId = useMemo(() => {
    return profile?.chapter_id || (profile as any)?.chapterId || (profile as any)?.adminId || '';
  }, [profile]);

  const filteredMembers = useMemo(() => {
    if (memberFilter === 'my_chapter') {
      const myChapId = String(effectiveUserChapterId || '').trim().toLowerCase();
      if (!myChapId) return allMembers;
      const matching = allMembers.filter(m => {
        const memberChapId = String(m.chapter_id || m.chapterId || '').trim().toLowerCase();
        return memberChapId && memberChapId === myChapId;
      });
      return matching.length > 0 ? matching : allMembers;
    }
    return allMembers;
  }, [allMembers, memberFilter, effectiveUserChapterId]);

  const allCount = allMembers.length;
  const myChapterCount = useMemo(() => {
    const myChapId = String(effectiveUserChapterId || '').trim().toLowerCase();
    if (!myChapId) return allMembers.length;
    return allMembers.filter(m => {
      const memberChapId = String(m.chapter_id || m.chapterId || '').trim().toLowerCase();
      return memberChapId && memberChapId === myChapId;
    }).length;
  }, [allMembers, effectiveUserChapterId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!formData.toUserId) {
      const msg = 'Please select a recipient member.';
      setError(msg);
      showError(msg);
      scrollToError();
      return;
    }
    if (!formData.contactName.trim()) {
      const msg = 'Contact Name is required.';
      setError(msg);
      showError(msg);
      scrollToError();
      return;
    }
    if (!formData.contactPhone.trim()) {
      const msg = 'Contact Phone is required.';
      setError(msg);
      showError(msg);
      scrollToError();
      return;
    }
    if (!formData.requirement.trim()) {
      const msg = 'Business Requirement is required.';
      setError(msg);
      showError(msg);
      scrollToError();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const normalizedPhone = normalizePhoneNumber(formData.contactPhone);
      const currentAuthId = profile?.id || profile?.uid || (await supabase.auth.getUser()).data?.user?.id;

      if (!currentAuthId) {
        throw new Error('Missing sender: User is not authenticated.');
      }

      // Sender lookup
      let { data: currentUserRecord } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentAuthId)
        .maybeSingle();

      if (!currentUserRecord && profile?.uid) {
        const { data: altUser } = await supabase
          .from('users')
          .select('*')
          .eq('uid', profile.uid)
          .maybeSingle();
        currentUserRecord = altUser;
      }

      const sender_id = currentUserRecord?.id || currentAuthId;
      let chapter_id = currentUserRecord?.chapter_id || profile?.chapter_id || (profile as any)?.chapterId;

      const { data: receiverRecord, error: receiverError } = await supabase
        .from('users')
        .select('*')
        .eq('id', formData.toUserId)
        .maybeSingle();

      if (receiverError || !receiverRecord) {
        throw new Error('The selected recipient member could not be verified.');
      }

      if (!chapter_id) {
        chapter_id = receiverRecord.chapter_id;
      }

      const contact_name = formData.contactName.trim();
      const contact_phone = normalizedPhone ? normalizedPhone.trim() : formData.contactPhone.trim();
      const business_requirement = formData.requirement.trim();

      const newReferral = {
        sender_id: sender_id,
        receiver_id: receiverRecord.id,
        chapter_id: chapter_id || receiverRecord.chapter_id || null,
        from_user_id: sender_id,
        to_user_id: receiverRecord.id,
        contact_name: contact_name,
        contact_phone: contact_phone,
        business_requirement: business_requirement,
        customer_name: contact_name,
        customer_mobile: contact_phone,
        requirement: business_requirement,
        notes: formData.notes ? formData.notes.trim() : '',
        status: 'Pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: insertError } = await supabase
        .from('referrals')
        .insert([newReferral]);

      if (insertError) {
        throw insertError;
      }

      // Send Notification to recipient
      try {
        await notificationService.sendNotification({
          userId: receiverRecord.id,
          role: 'MEMBER',
          type: 'REFERRAL',
          title: 'Referral Received',
          message: `You received a new referral from ${profile?.name || currentUserRecord?.name || 'a member'} for ${contact_name}.`,
          relatedUserId: profile?.uid || profile?.id,
          link: '/referrals'
        });
      } catch (notifErr) {
        console.warn('Referral notification notice:', notifErr);
      }

      showSuccess('Referral passed successfully!');
      window.dispatchEvent(new CustomEvent('referrals-updated'));
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));

      setFormData({
        toUserId: '',
        contactName: '',
        contactPhone: '',
        requirement: '',
        notes: ''
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Referral submission error:', err);
      const errMsg = err?.message || 'Failed to pass referral. Please try again.';
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
      title="Pass a New Referral"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Member Filter */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
            Filter Members
          </label>
          <div className="grid grid-cols-2 gap-2 bg-[#111827] p-1.5 rounded-xl border border-white/5">
            <button
              type="button"
              onClick={() => setMemberFilter('my_chapter')}
              className={cn(
                'py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer',
                memberFilter === 'my_chapter'
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'text-neutral-400 hover:text-white'
              )}
            >
              <Building2 size={14} />
              My Chapter ({myChapterCount})
            </button>
            <button
              type="button"
              onClick={() => setMemberFilter('all')}
              className={cn(
                'py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer',
                memberFilter === 'all'
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'text-neutral-400 hover:text-white'
              )}
            >
              <Users size={14} />
              All Members ({allCount})
            </button>
          </div>
        </div>

        {/* Member Selection Dropdown */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              Select Member <span className="text-red-400">*</span>
            </label>
            <span className="text-[11px] text-neutral-400 font-semibold">
              {filteredMembers.length} member(s)
            </span>
          </div>
          <select
            id="referral-toUserId"
            required
            value={formData.toUserId}
            onChange={(e) => setFormData({ ...formData, toUserId: e.target.value })}
            className="w-full px-3.5 py-3 bg-[#151C2E] border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm font-medium"
          >
            <option value="" className="bg-[#111827] text-neutral-400">Choose a member...</option>
            {filteredMembers.map((m) => {
              const nameStr = m.displayName || m.name || 'Member';
              const chapterStr = m.chapterName ? ` (${m.chapterName})` : '';
              const posStr = m.position ? ` - ${m.position}` : '';
              const phoneStr = m.phone ? ` • ${m.phone}` : '';
              return (
                <option key={m.id} value={m.id} className="bg-[#111827] text-white">
                  {nameStr}{chapterStr}{posStr}{phoneStr}
                </option>
              );
            })}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              Contact Name <span className="text-red-400">*</span>
            </label>
            <input
              id="referral-contactName"
              required
              type="text"
              value={formData.contactName}
              onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
              placeholder="Who are you referring?"
              className="w-full px-3.5 py-3 bg-[#151C2E] border border-white/10 text-white placeholder-neutral-500 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              Contact Phone <span className="text-red-400">*</span>
            </label>
            <input
              id="referral-contactPhone"
              required
              type="tel"
              value={formData.contactPhone}
              onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
              placeholder="Phone number"
              className="w-full px-3.5 py-3 bg-[#151C2E] border border-white/10 text-white placeholder-neutral-500 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
            Business Requirement <span className="text-red-400">*</span>
          </label>
          <textarea
            id="referral-requirement"
            required
            value={formData.requirement}
            onChange={(e) => setFormData({ ...formData, requirement: e.target.value })}
            placeholder="What does the contact need?"
            rows={3}
            className="w-full px-3.5 py-3 bg-[#151C2E] border border-white/10 text-white placeholder-neutral-500 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
            Additional Notes (Optional)
          </label>
          <input
            type="text"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Any extra info for the member?"
            className="w-full px-3.5 py-3 bg-[#151C2E] border border-white/10 text-white placeholder-neutral-500 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm"
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
                <span>Passing Referral...</span>
              </>
            ) : (
              'Pass Referral'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
