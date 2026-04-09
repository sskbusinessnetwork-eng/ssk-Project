import React from 'react';
import { Modal } from '../Modal';
import { UserProfile } from '../../types';

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
      title={`Subscription: ${selectedMember?.name}`}
    >
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Subscription Start Date</label>
          <input
            required
            type="date"
            value={subDates.subscriptionStart}
            onChange={(e) => setSubDates({ ...subDates, subscriptionStart: e.target.value })}
            className="w-full h-11 px-4 rounded-xl bg-muted border border-transparent focus:bg-white focus:border-primary outline-none transition-all text-sm font-bold"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Subscription End Date</label>
          <input
            required
            type="date"
            value={subDates.subscriptionEnd}
            onChange={(e) => setSubDates({ ...subDates, subscriptionEnd: e.target.value })}
            className="w-full h-11 px-4 rounded-xl bg-muted border border-transparent focus:bg-white focus:border-primary outline-none transition-all text-sm font-bold"
          />
        </div>
        <button
          type="submit"
          className="w-full h-12 bg-primary text-white rounded-xl font-bold uppercase tracking-widest hover:bg-primary/90 transition-all active:scale-95 shadow-lg"
        >
          Update Subscription
        </button>
      </form>
    </Modal>
  );
}
