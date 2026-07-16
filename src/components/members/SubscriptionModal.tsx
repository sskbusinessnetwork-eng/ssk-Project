import React from 'react';
import { Modal } from '../Modal';
import { UserProfile } from '../../types';
import { Calendar, CircleCheck as CheckCircle2 } from 'lucide-react';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  selectedMember: UserProfile | null;
  subDates: {
    subscriptionStart: string;
    subscriptionEnd: string;
  };
  setSubDates: (dates: any) => void;
}

export function SubscriptionModal({
  isOpen,
  onClose,
  onSubmit,
  selectedMember,
  subDates,
  setSubDates
}: SubscriptionModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Member Subscription"
    >
      <form onSubmit={onSubmit} className="space-y-5 py-2">
        <div className="p-4 bg-primary/[0.03] border border-primary/10 rounded-[16px] flex items-start gap-3">
          <Calendar className="text-primary mt-0.5 shrink-0" size={18} />
          <div>
            <h4 className="text-sm font-bold text-neutral-900 mb-1">
              {selectedMember?.name || selectedMember?.displayName || 'Active Member'}
            </h4>
            <p className="text-xs text-neutral-500 font-medium leading-relaxed">
              Modify joining & validity dates. System warnings will be sent automatically based on expiration.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-neutral-500">Subscription Start Date</label>
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input
              required
              type="date"
              value={subDates.subscriptionStart}
              onChange={(e) => setSubDates({ ...subDates, subscriptionStart: e.target.value })}
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-neutral-50 border border-neutral-200/80 text-[14px] font-medium text-neutral-800 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-neutral-500">Subscription End Date</label>
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input
              required
              type="date"
              value={subDates.subscriptionEnd}
              onChange={(e) => setSubDates({ ...subDates, subscriptionEnd: e.target.value })}
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-neutral-50 border border-neutral-200/80 text-[14px] font-medium text-neutral-800 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
            />
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            className="w-full h-12 bg-primary text-white rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/25"
          >
            <CheckCircle2 size={18} />
            <span>Update Subscription</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
