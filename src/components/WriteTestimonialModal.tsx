import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, MessageSquare } from 'lucide-react';
import { firestoreService } from '../services/firestoreService';
import { notificationService } from '../services/notificationService';
import { UserProfile } from '../types';

interface WriteTestimonialModalProps {
  isOpen: boolean;
  onClose: () => void;
  author: UserProfile | null;
  receiver: UserProfile;
}

export function WriteTestimonialModal({ isOpen, onClose, author, receiver }: WriteTestimonialModalProps) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [testimonial, setTestimonial] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!author || !testimonial.trim()) return;

    setIsSubmitting(true);
    try {
      await firestoreService.create('testimonials', {
        receiverMemberId: receiver.uid,
        authorMemberId: author.uid,
        chapterId: receiver.associatedChapterAdminId || receiver.adminId || author.associatedChapterAdminId || author.adminId,
        rating,
        title,
        testimonial,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Send notification
      await notificationService.createNotification(
        receiver.uid,
        receiver.role || 'MEMBER',
        'TESTIMONIAL',
        `🎉 You received a new testimonial from ${author.name}.`,
        author.uid
      );

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setTestimonial('');
        setTitle('');
        setRating(5);
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error creating testimonial', error);
      alert('Failed to submit testimonial.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[#111827] rounded-[24px] border border-white/10 p-6 w-full max-w-md relative shadow-2xl"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[#9CA3AF] hover:text-white transition-colors p-2"
          >
            <X size={20} />
          </button>

          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">✅ Thank you for sharing your testimonial.</h3>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <Star size={24} className="fill-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Write Testimonial</h3>
                  <p className="text-sm text-[#9CA3AF]">For {receiver.name}</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
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
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
