import React from 'react';
import { UserPlus, Lock } from 'lucide-react';
import { Modal } from '../Modal';
import { Category } from '../../types';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  formData: any;
  setFormData: (data: any) => void;
  isMasterAdmin: boolean;
  categories: Category[];
  profile: any;
  error?: string | null;
}

export function AddMemberModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  formData,
  setFormData,
  isMasterAdmin,
  categories,
  profile,
  error
}: AddMemberModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Member"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-bold">
            {error}
          </div>
        )}
        {/* Chapter Admin Field (Read-only) */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Chapter Admin</label>
          <input
            type="text"
            value={profile?.name || profile?.displayName || ''}
            disabled
            className="w-full h-11 px-4 rounded-xl bg-muted border border-transparent text-sm font-bold opacity-70 cursor-not-allowed"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Full Name</label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full h-11 px-4 rounded-xl bg-muted border border-transparent focus:bg-white focus:border-primary outline-none transition-all text-sm font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Phone Number</label>
            <input
              required
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full h-11 px-4 rounded-xl bg-muted border border-transparent focus:bg-white focus:border-primary outline-none transition-all text-sm font-bold"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
              <input
                required
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-muted border border-transparent focus:bg-white focus:border-primary outline-none transition-all text-sm font-bold"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Business Name</label>
            <input
              required
              type="text"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              className="w-full h-11 px-4 rounded-xl bg-muted border border-transparent focus:bg-white focus:border-primary outline-none transition-all text-sm font-bold"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Category</label>
            <select
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full h-11 px-4 rounded-xl bg-muted border border-transparent focus:bg-white focus:border-primary outline-none transition-all text-sm font-bold appearance-none cursor-pointer"
            >
              <option value="">Select Category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">State</label>
            <input
              required
              type="text"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className="w-full h-11 px-4 rounded-xl bg-muted border border-transparent focus:bg-white focus:border-primary outline-none transition-all text-sm font-bold"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">City</label>
            <input
              required
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full h-11 px-4 rounded-xl bg-muted border border-transparent focus:bg-white focus:border-primary outline-none transition-all text-sm font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Area</label>
            <input
              required
              type="text"
              value={formData.area}
              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              className="w-full h-11 px-4 rounded-xl bg-muted border border-transparent focus:bg-white focus:border-primary outline-none transition-all text-sm font-bold"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Address</label>
            <input
              required
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full h-11 px-4 rounded-xl bg-muted border border-transparent focus:bg-white focus:border-primary outline-none transition-all text-sm font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Subscription Start Date</label>
            <input
              required
              type="date"
              value={formData.subscriptionStart}
              onChange={(e) => setFormData({ ...formData, subscriptionStart: e.target.value })}
              className="w-full h-11 px-4 rounded-xl bg-muted border border-transparent focus:bg-white focus:border-primary outline-none transition-all text-sm font-bold"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Subscription End Date</label>
            <input
              required
              type="date"
              value={formData.subscriptionEnd}
              onChange={(e) => setFormData({ ...formData, subscriptionEnd: e.target.value })}
              className="w-full h-11 px-4 rounded-xl bg-muted border border-transparent focus:bg-white focus:border-primary outline-none transition-all text-sm font-bold"
            />
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 bg-primary text-white rounded-xl font-bold uppercase tracking-widest hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating Member...
              </>
            ) : (
              <>
                <UserPlus size={18} />
                Create Member
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
