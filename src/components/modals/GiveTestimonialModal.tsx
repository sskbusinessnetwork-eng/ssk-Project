import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabaseClient';
import { databaseService } from '../../services/databaseService';
import { notificationService } from '../../services/notificationService';
import { Modal } from '../Modal';
import { Avatar } from '../Avatar';
import { Star, AlertCircle, CheckCircle2, Search, ChevronRight, MessageSquare, Sparkles } from 'lucide-react';
import { showError, showSuccess, scrollToError } from '../../services/toastService';
import { cn } from '../../lib/utils';
import { UserProfile } from '../../types';
import {
  extractMemberExtraData,
  extractCleanPhotoUrl,
  buildCategoryLookup,
  resolveMemberCategory
} from '../OfflineReferralMemberSelect';
import { getCleanFullName, getDisplayPosition } from '../../utils/authUtils';
import { getDirectorySnapshot, withTimeout } from '../../utils/directoryCache';

interface GiveTestimonialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialReceiverId?: string;
  initialReferralId?: string;
}

export function GiveTestimonialModal({
  isOpen,
  onClose,
  onSuccess,
  initialReceiverId,
  initialReferralId
}: GiveTestimonialModalProps) {
  const { profile } = useAuth();
  const currentUserId = profile?.uid || (profile as any)?.id;

  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [selectedReceiverId, setSelectedReceiverId] = useState<string>(initialReceiverId || '');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);

  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [testimonial, setTestimonial] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    if (initialReceiverId) {
      setSelectedReceiverId(initialReceiverId);
    }
  }, [initialReceiverId]);

  const fetchMembers = useCallback(async (forceRefresh = false) => {
    try {
      const snapshot = await getDirectorySnapshot({ forceRefresh });
      const usersData = snapshot.users;

      const chapterMap = new Map<string, string>();
      if (snapshot.chapters) {
        snapshot.chapters.forEach((c: any) => {
          if (c.id) {
            chapterMap.set(String(c.id).trim().toLowerCase(), c.chapter_name || '');
          }
        });
      }

      const { categoryMap, validCategoryNames } = buildCategoryLookup(snapshot.categories);

      if (isMountedRef.current && usersData) {
        const mapped = usersData
          .filter((u: any) => {
            const uId = u.id || u.uid;
            const isCurrentUser = String(uId).trim().toLowerCase() === String(currentUserId).trim().toLowerCase();
            const isMaster = u.role === 'MASTER_ADMIN';
            return !isCurrentUser && !isMaster;
          })
          .map((u: any) => {
            const rawPhoto = u.profile_photo || u.photo_url || u.photoURL || '';
            const extraData = extractMemberExtraData(rawPhoto);
            const cleanPhoto = extractCleanPhotoUrl(rawPhoto);

            const chapId = String(u.chapter_id || u.chapterId || extraData.chapter_id || extraData.chapterId || '').trim();
            const mappedChapName = chapId ? chapterMap.get(chapId.toLowerCase()) || '' : '';
            const chapName = String(mappedChapName || u.chapter_name || u.chapterName || extraData.chapter_name || extraData.chapterName || '').trim();

            const category = resolveMemberCategory(u, extraData, categoryMap, validCategoryNames);

            const formattedPos = getDisplayPosition(
              u.position || extraData.position || u.chapter_position || extraData.chapter_position,
              u.role
            );

            return {
              ...u,
              id: u.id || u.uid,
              uid: u.uid || u.id,
              photoURL: cleanPhoto,
              displayName: getCleanFullName(u.name || u.full_name || u.displayName || extraData.name || 'Member'),
              chapterName: chapName || 'General Chapter',
              position: formattedPos,
              category,
              businessName: String(u.business_name || u.businessName || extraData.business_name || extraData.businessName || category).trim()
            };
          })
          .sort((a: any, b: any) =>
            String(a.displayName || '').localeCompare(String(b.displayName || ''), undefined, { sensitivity: 'base' })
          );
        setAllMembers(mapped);
      }
    } catch (err: any) {
      console.warn('Error loading members for testimonial modal:', err);
    }
  }, [currentUserId]);

  useEffect(() => {
    isMountedRef.current = true;
    if (!isOpen) {
      setError(null);
      setIsMemberDropdownOpen(false);
      return;
    }

    const handleRefreshMembers = () => {
      void fetchMembers(true);
    };

    void fetchMembers(false);
    window.addEventListener('profile-updated', handleRefreshMembers);
    window.addEventListener('members-refresh', handleRefreshMembers);
    return () => {
      isMountedRef.current = false;
      window.removeEventListener('profile-updated', handleRefreshMembers);
      window.removeEventListener('members-refresh', handleRefreshMembers);
    };
  }, [isOpen, fetchMembers]);

  const filteredMembers = useMemo(() => {
    if (!memberSearchQuery.trim()) return allMembers;
    const q = memberSearchQuery.toLowerCase().trim();
    return allMembers.filter(m => {
      const name = (m.displayName || m.name || '').toLowerCase();
      const cat = (m.category || '').toLowerCase();
      const pos = (m.position || '').toLowerCase();
      const chap = (m.chapterName || '').toLowerCase();
      const bus = (m.businessName || '').toLowerCase();
      return name.includes(q) || cat.includes(q) || pos.includes(q) || chap.includes(q) || bus.includes(q);
    });
  }, [allMembers, memberSearchQuery]);

  const selectedReceiver = useMemo(() => {
    if (!selectedReceiverId) return null;
    return allMembers.find(m => String(m.id).toLowerCase() === String(selectedReceiverId).toLowerCase() || String(m.uid).toLowerCase() === String(selectedReceiverId).toLowerCase());
  }, [allMembers, selectedReceiverId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || isSubmittingRef.current) return;

    if (!selectedReceiverId || !selectedReceiver) {
      const msg = 'Please select a member to receive your testimonial.';
      setError(msg);
      showError(msg);
      scrollToError();
      return;
    }

    if (!testimonial.trim()) {
      const msg = 'Please write your testimonial message.';
      setError(msg);
      showError(msg);
      scrollToError();
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setError(null);

    try {
      const authorUid = profile.uid || (profile as any).id;
      const receiverUid = selectedReceiver.uid || selectedReceiver.id;
      const targetChapId = selectedReceiver.chapter_id || selectedReceiver.chapterId || profile.chapter_id || (profile as any).chapterId || null;

      const testimonialPayload = {
        receiver_id: receiverUid,
        receiverMemberId: receiverUid,
        author_id: authorUid,
        authorMemberId: authorUid,
        chapter_id: targetChapId,
        chapterId: targetChapId,
        referral_id: initialReferralId || null,
        referralId: initialReferralId || null,
        rating: rating,
        title: title ? title.trim() : '',
        testimonial: testimonial.trim(),
        status: 'APPROVED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const { error: insertErr } = await withTimeout<any>(
        supabase
          .from('testimonials')
          .insert([testimonialPayload]),
        12_000,
        'Submitting testimonial'
      );

      if (insertErr) {
        try {
          await databaseService.create('testimonials', testimonialPayload);
        } catch (dbErr: any) {
          throw insertErr;
        }
      }

      // Send notification
      try {
        await notificationService.sendNotification({
          userId: receiverUid,
          role: selectedReceiver.role || 'MEMBER',
          type: 'TESTIMONIAL',
          title: 'Testimonial Received',
          message: `You received a ${rating}-star testimonial from ${profile.name || 'a member'}.`,
          relatedUserId: authorUid,
          link: '/testimonials'
        });
      } catch (nErr) {
        console.warn('Testimonial notification notice:', nErr);
      }

      showSuccess('Testimonial submitted successfully!');
      window.dispatchEvent(new CustomEvent('testimonials-updated'));
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));

      setTestimonial('');
      setTitle('');
      setRating(5);
      setSelectedReceiverId('');

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Testimonial submission error:', err);
      const errMsg = err?.message || 'Failed to submit testimonial. Please try again.';
      setError(errMsg);
      showError(errMsg);
      scrollToError();
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title="Give Testimonial"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Member Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
            Select Member to Commend <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                const nextOpen = !isMemberDropdownOpen;
                setIsMemberDropdownOpen(nextOpen);
                if (nextOpen && allMembers.length === 0) void fetchMembers(false);
              }}
              className="w-full px-3.5 py-3 rounded-xl border border-white/10 bg-[#151C2E] cursor-pointer flex items-center justify-between text-left transition-all hover:border-primary/50"
            >
              {selectedReceiver ? (
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <Avatar
                    src={selectedReceiver.photoURL || selectedReceiver.photo_url || selectedReceiver.avatar_url}
                    name={selectedReceiver.displayName}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {selectedReceiver.displayName}
                    </p>
                    <p className="text-[10px] text-neutral-400 truncate">
                      Category: <span className="text-primary font-semibold">{selectedReceiver.category || 'Business Owner'}</span> • {selectedReceiver.chapterName || 'Chapter'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-neutral-400 text-sm">
                  <Search size={16} />
                  <span>Choose a member...</span>
                </div>
              )}
              <ChevronRight size={16} className={cn('text-neutral-400 transition-transform', isMemberDropdownOpen ? 'rotate-90' : '')} />
            </button>

            {isMemberDropdownOpen && (
              <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-[#111827] rounded-xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in duration-150">
                <div className="p-2 border-b border-white/5 bg-[#151C2E]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={13} />
                    <input
                      type="text"
                      placeholder="Search by name, category, chapter..."
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-white/5 bg-[#111827] text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                  {filteredMembers.length > 0 ? (
                    filteredMembers.map((member) => (
                      <div
                        key={member.id}
                        onClick={() => {
                          setSelectedReceiverId(member.id);
                          setIsMemberDropdownOpen(false);
                        }}
                        className={cn(
                          'flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all hover:bg-[#151C2E]',
                          selectedReceiverId === member.id ? 'bg-primary/15 border border-primary/30' : ''
                        )}
                      >
                        <Avatar
                          src={member.photoURL || member.photo_url || member.avatar_url}
                          name={member.displayName}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate">{member.displayName}</p>
                          <p className="text-[10px] text-neutral-400 truncate">
                            Category: <span className="text-primary font-semibold">{member.category || 'Business Owner'}</span> • {member.chapterName}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-4 text-xs text-neutral-400">No members found.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rating */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
            Rating <span className="text-red-400">*</span>
          </label>
          <div className="flex items-center gap-2 bg-[#151C2E] p-3 rounded-xl border border-white/10">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="cursor-pointer transition-transform hover:scale-110 active:scale-95"
              >
                <Star
                  size={24}
                  className={cn(
                    'transition-colors',
                    star <= rating ? 'text-amber-400 fill-amber-400' : 'text-neutral-600'
                  )}
                />
              </button>
            ))}
            <span className="text-xs font-bold text-amber-400 ml-2">
              {rating} / 5 Stars
            </span>
          </div>
        </div>

        {/* Headline Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
            Headline / Topic (Optional)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Exceptional Service & Timely Delivery"
            className="w-full px-3.5 py-3 bg-[#151C2E] border border-white/10 text-white placeholder-neutral-500 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm"
          />
        </div>

        {/* Testimonial Message */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
            Testimonial <span className="text-red-400">*</span>
          </label>
          <textarea
            required
            rows={4}
            value={testimonial}
            onChange={(e) => setTestimonial(e.target.value)}
            placeholder="Share how this member helped you or your clients, their professionalism, and recommendations..."
            className="w-full px-3.5 py-3 bg-[#151C2E] border border-white/10 text-white placeholder-neutral-500 rounded-xl focus:ring-2 focus:ring-primary outline-none resize-none text-sm"
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
                <span>Submitting...</span>
              </>
            ) : (
              'Submit Testimonial'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
