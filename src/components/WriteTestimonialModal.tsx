import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, MessageSquare, Sparkles } from 'lucide-react';
import { databaseService } from '../services/databaseService';
import { notificationService } from '../services/notificationService';
import { UserProfile } from '../types';

interface WriteTestimonialModalProps {
  isOpen: boolean;
  onClose: () => void;
  author: UserProfile | null;
  receiver: UserProfile;
  referralId?: string;
  referralObj?: any;
  oneToOneId?: string;
}

export function WriteTestimonialModal({ isOpen, onClose, author, receiver, referralId, referralObj, oneToOneId }: WriteTestimonialModalProps) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [testimonial, setTestimonial] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const targetRefId = referralId || referralObj?.id || null;
  const customerName = referralObj?.contactName || referralObj?.contact_name || referralObj?.customerName || referralObj?.customer_name || '';
  const refTitle = referralObj?.title || referralObj?.referral_title || referralObj?.business_category || 'Completed Referral';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !author || !testimonial.trim()) return;

    setIsSubmitting(true);
    try {
      const authorUid = author.uid || (author as any).id;
      const receiverUid = receiver.uid || (receiver as any).id;
      const chapterId = receiver.chapter_id || (receiver as any).chapterId || receiver.adminId || author.chapter_id || (author as any).chapterId || author.adminId || null;

      await databaseService.create('testimonials', {
        receiver_id: receiverUid,
        receiverMemberId: receiverUid,
        author_id: authorUid,
        authorMemberId: authorUid,
        chapter_id: chapterId,
        chapterId: chapterId,
        referral_id: targetRefId,
        referralId: targetRefId,
        one_to_one_id: oneToOneId || null,
        oneToOneId: oneToOneId || null,
        rating,
        title: title ? title.trim() : '',
        testimonial: testimonial.trim(),
        status: 'APPROVED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      window.dispatchEvent(new CustomEvent('testimonials-updated'));
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));
      window.dispatchEvent(new CustomEvent('profile-updated'));

      // Send notification
      try {
        await notificationService.sendNotification({
          userId: receiver.uid || (receiver as any).id,
          role: receiver.role || 'MEMBER',
          type: 'TESTIMONIAL',
          title: 'Testimonial Received',
          message: `You received a Testimonial from ${author.name}.`,
          relatedUserId: author.uid || (author as any).id,
          link: '/testimonials'
        });
      } catch (nErr) {
        console.warn("Notification send warning:", nErr);
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setTestimonial('');
        setTitle('');
        setRating(5);
        onClose();
      }, 2000);
    } catch (error: any) {
      console.error('Error creating testimonial', error);
      alert('Failed to submit testimonial: ' + (error?.message || 'Server error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-6 pb-[calc(92px+env(safe-area-inset-bottom,16px))] sm:pb-6 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[#111827] rounded-2xl sm:rounded-[24px] border border-white/10 p-4 sm:p-6 w-full max-w-md relative shadow-2xl flex flex-col max-h-[calc(100dvh-120px)] sm:max-h-[85vh] my-auto overflow-hidden text-left"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[#9CA3AF] hover:text-white transition-colors p-2 z-10"
          >
            <X size={20} />
          </button>

          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {success ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">✅ Thank you for sharing your testimonial.</h3>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <Star size={24} className="fill-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Write Testimonial</h3>
                    <p className="text-sm text-[#9CA3AF]">For {receiver.name}</p>
                  </div>
                </div>

                {/* Auto-Filled Referral Reference Context */}
                {(targetRefId || customerName) && (
                  <div className="bg-[#1F2937] p-3.5 rounded-xl border border-white/10 space-y-1.5 text-xs">
                    <div className="text-[10px] font-extrabold text-primary uppercase tracking-wider flex items-center gap-1">
                      <Sparkles size={12} /> Auto-Filled Completed Referral Reference
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-white">
                      <div>
                        <span className="text-[#9CA3AF] text-[10px] block">Recipient</span>
                        <strong className="font-bold">{receiver.name}</strong>
                      </div>
                      {targetRefId && (
                        <div>
                          <span className="text-[#9CA3AF] text-[10px] block">Referral Ref</span>
                          <strong className="font-mono text-emerald-400 font-bold">#REF-{String(targetRefId).slice(-6).toUpperCase()}</strong>
                        </div>
                      )}
                      {customerName && (
                        <div>
                          <span className="text-[#9CA3AF] text-[10px] block">Customer Name</span>
                          <strong className="font-bold">{customerName}</strong>
                        </div>
                      )}
                      <div>
                        <span className="text-[#9CA3AF] text-[10px] block">Referral</span>
                        <strong className="font-bold truncate block">{refTitle}</strong>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                  <div>
                    <label className="block text-sm font-bold text-[#9CA3AF] mb-1">Rating</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className={`p-1 transition-colors ${rating >= star ? 'text-[#F59E0B]' : 'text-[#374151]'}`}
                        >
                          <Star size={28} fill={rating >= star ? 'currentColor' : 'transparent'} strokeWidth={rating >= star ? 0 : 2} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#9CA3AF] mb-1">Title (Optional)</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-[#1F2937] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                      placeholder="e.g. Highly recommended!"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#9CA3AF] mb-1">Testimonial Message <span className="text-red-500">*</span></label>
                    <textarea
                      value={testimonial}
                      onChange={(e) => setTestimonial(e.target.value)}
                      className="w-full bg-[#1F2937] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors h-32 resize-none"
                      placeholder="Share your experience working with them..."
                      required
                    />
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-[#1F2937] hover:bg-[#374151] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !testimonial.trim()}
                      className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
