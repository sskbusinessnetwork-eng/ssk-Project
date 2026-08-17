import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabaseClient';
import { databaseService } from '../../services/databaseService';
import { Modal } from '../Modal';
import { CategorySelect } from '../CategorySelect';
import { AlertCircle, CheckCircle2, User, Phone, MessageSquare, Calendar, Building2 } from 'lucide-react';
import { showError, showSuccess, scrollToError } from '../../services/toastService';
import { cn } from '../../lib/utils';
import { safeFormat as format } from '../../utils/dateUtils';
import { normalizePhoneNumber } from '../../utils/phoneUtils';

interface InviteGuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function InviteGuestModal({
  isOpen,
  onClose,
  onSuccess
}: InviteGuestModalProps) {
  const { profile } = useAuth();
  const currentUserId = profile?.uid || (profile as any)?.id;

  const [categories, setCategories] = useState<any[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<any[]>([]);
  const [existingMembers, setExistingMembers] = useState<any[]>([]);
  const [existingGuests, setExistingGuests] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    guestName: '',
    guestPhone: '',
    guestWhatsapp: '',
    guestBusiness: '',
    meetingId: ''
  });

  const [matchedMember, setMatchedMember] = useState<any | null>(null);
  const [duplicateMeetingError, setDuplicateMeetingError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setMatchedMember(null);
      setDuplicateMeetingError(null);
      return;
    }

    let isMounted = true;
    const loadData = async () => {
      try {
        const userChapId = profile?.chapter_id || (profile as any)?.chapterId || (profile as any)?.adminId;

        // 1. Categories
        const { data: catData } = await supabase
          .from('categories')
          .select('*')
          .order('name', { ascending: true });
        if (isMounted && catData) setCategories(catData);

        // 2. Upcoming meetings
        let meetingQuery = supabase
          .from('meetings')
          .select('*')
          .order('date', { ascending: true });

        if (userChapId && profile?.role !== 'MASTER_ADMIN') {
          meetingQuery = meetingQuery.eq('chapter_id', userChapId);
        }

        const { data: meetData } = await meetingQuery;
        if (isMounted && meetData) {
          const valid = meetData.filter((m: any) => {
            const s = String(m.status || '').trim().toUpperCase();
            if (s === 'COMPLETED' || s === 'CANCELLED') return false;
            return true;
          });
          setUpcomingMeetings(valid);
          if (valid.length > 0 && !formData.meetingId) {
            setFormData(prev => ({ ...prev, meetingId: valid[0].id }));
          }
        }

        // 3. Existing members for duplicate check
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name, phone, phoneNumber, position, role');
        if (isMounted && usersData) setExistingMembers(usersData);

        // 4. Existing guests for duplicate meeting check
        const { data: guestsData } = await supabase
          .from('guests')
          .select('id, guest_phone, phone, meeting_id, meetingId, guest_name, name');
        if (isMounted && guestsData) setExistingGuests(guestsData);

      } catch (err: any) {
        console.warn('Error loading invite guest data:', err);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [isOpen, profile]);

  const validatePhone = (phone: string, meetingId: string) => {
    const rawClean = phone.replace(/\D/g, '');
    if (rawClean.length < 7) {
      setMatchedMember(null);
      setDuplicateMeetingError(null);
      return;
    }

    const last10 = rawClean.slice(-10);

    // Member check
    const foundMem = existingMembers.find(m => {
      const p = String(m.phone || m.phoneNumber || '').replace(/\D/g, '');
      return p && p.slice(-10) === last10;
    });

    if (foundMem) {
      setMatchedMember(foundMem);
      return;
    } else {
      setMatchedMember(null);
    }

    // Duplicate guest in same meeting check
    if (meetingId) {
      const foundGuest = existingGuests.find(g => {
        const p = String(g.guest_phone || g.phone || '').replace(/\D/g, '');
        const m = String(g.meeting_id || g.meetingId || '');
        return p && p.slice(-10) === last10 && m === String(meetingId);
      });

      if (foundGuest) {
        setDuplicateMeetingError(`This guest has already been invited to the selected meeting.`);
      } else {
        setDuplicateMeetingError(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (matchedMember) {
      const msg = `${matchedMember.name} is already a member and cannot be added as a guest.`;
      setError(msg);
      showError(msg);
      scrollToError();
      return;
    }

    if (duplicateMeetingError) {
      setError(duplicateMeetingError);
      showError(duplicateMeetingError);
      scrollToError();
      return;
    }

    if (!formData.guestName.trim()) {
      const msg = 'Guest Name is required.';
      setError(msg);
      showError(msg);
      scrollToError();
      return;
    }

    if (!formData.guestPhone.trim()) {
      const msg = 'Guest Phone is required.';
      setError(msg);
      showError(msg);
      scrollToError();
      return;
    }

    if (!formData.guestBusiness.trim()) {
      const msg = 'Please select a Business Category.';
      setError(msg);
      showError(msg);
      scrollToError();
      return;
    }

    if (!formData.meetingId) {
      const msg = 'Please select a Meeting.';
      setError(msg);
      showError(msg);
      scrollToError();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const currentAuthId = profile?.id || profile?.uid || (await supabase.auth.getUser()).data?.user?.id;
      const userChapId = profile.chapter_id || (profile as any).chapterId || (profile as any).adminId || null;

      const normPhone = normalizePhoneNumber(formData.guestPhone) || formData.guestPhone.trim();
      const normWhatsapp = normalizePhoneNumber(formData.guestWhatsapp) || formData.guestWhatsapp.trim() || normPhone;

      const guestPayload = {
        name: formData.guestName.trim(),
        guest_name: formData.guestName.trim(),
        phone: normPhone,
        guest_phone: normPhone,
        whatsapp: normWhatsapp,
        guest_whatsapp: normWhatsapp,
        business_category: formData.guestBusiness.trim(),
        guest_business: formData.guestBusiness.trim(),
        meeting_id: formData.meetingId,
        meetingId: formData.meetingId,
        invited_by: currentAuthId,
        invitedBy: currentAuthId,
        chapter_id: userChapId,
        chapterId: userChapId,
        status: 'INVITED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: insertErr } = await supabase
        .from('guests')
        .insert([guestPayload]);

      if (insertErr) {
        try {
          await databaseService.create('guests', guestPayload);
        } catch (dbErr: any) {
          throw insertErr;
        }
      }

      showSuccess('Guest invited successfully!');
      window.dispatchEvent(new CustomEvent('guests-updated'));
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));

      setFormData({
        guestName: '',
        guestPhone: '',
        guestWhatsapp: '',
        guestBusiness: '',
        meetingId: ''
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Invite guest error:', err);
      const errMsg = err?.message || 'Failed to send guest invitation. Please try again.';
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
      title="Invite Guest"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {matchedMember && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl space-y-1">
            <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
              <AlertCircle size={15} />
              <span>Already a Registered Member</span>
            </div>
            <p className="text-[11px] text-neutral-300">
              <strong className="text-white">{matchedMember.name}</strong> is already registered in the network ({matchedMember.position}) and cannot be invited as a guest.
            </p>
          </div>
        )}

        {duplicateMeetingError && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{duplicateMeetingError}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
            Guest Name <span className="text-red-400">*</span>
          </label>
          <input
            required
            type="text"
            value={formData.guestName}
            onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
            placeholder="Enter guest full name"
            className="w-full px-3.5 py-3 bg-[#151C2E] border border-white/10 text-white placeholder-neutral-500 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              Guest Phone <span className="text-red-400">*</span>
            </label>
            <input
              required
              type="tel"
              value={formData.guestPhone}
              onChange={(e) => {
                const val = e.target.value;
                const prevPhone = formData.guestPhone;
                setFormData(prev => ({
                  ...prev,
                  guestPhone: val,
                  guestWhatsapp: prev.guestWhatsapp === '' || prev.guestWhatsapp === prevPhone ? val : prev.guestWhatsapp
                }));
                validatePhone(val, formData.meetingId);
              }}
              onBlur={() => validatePhone(formData.guestPhone, formData.meetingId)}
              placeholder="e.g. +91 9876543210"
              className={cn(
                'w-full px-3.5 py-3 bg-[#151C2E] border text-white placeholder-neutral-500 rounded-xl outline-none text-sm',
                matchedMember ? 'border-red-500 ring-1 ring-red-500' : 'border-white/10 focus:ring-2 focus:ring-primary'
              )}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              WhatsApp Number <span className="text-red-400">*</span>
            </label>
            <input
              required
              type="tel"
              value={formData.guestWhatsapp}
              onChange={(e) => setFormData({ ...formData, guestWhatsapp: e.target.value })}
              placeholder="For invitation messages"
              className="w-full px-3.5 py-3 bg-[#151C2E] border border-white/10 text-white placeholder-neutral-500 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
            Business Category <span className="text-red-400">*</span>
          </label>
          <CategorySelect
            value={formData.guestBusiness}
            onChange={(val) => setFormData({ ...formData, guestBusiness: val })}
            categories={categories}
            placeholder="Select Business Category"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
            Meeting to Attend <span className="text-red-400">*</span>
          </label>
          <select
            required
            value={formData.meetingId}
            onChange={(e) => {
              const mId = e.target.value;
              setFormData({ ...formData, meetingId: mId });
              validatePhone(formData.guestPhone, mId);
            }}
            className="w-full px-3.5 py-3 bg-[#151C2E] border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-medium"
          >
            <option value="" className="bg-[#111827]">Select an Upcoming Meeting</option>
            {upcomingMeetings.map((m) => (
              <option key={m.id} value={m.id} className="bg-[#111827]">
                {m.title || 'Chapter Meeting'} - {format(new Date(m.date), 'dd MMM yyyy')} ({m.venue || m.location || 'Hall'})
              </option>
            ))}
          </select>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting || Boolean(matchedMember) || Boolean(duplicateMeetingError)}
            className="w-full py-3.5 bg-primary text-white rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Sending Invitation...</span>
              </>
            ) : (
              'Send Invitation'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
