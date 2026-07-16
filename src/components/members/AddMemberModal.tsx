import React from 'react';
import { UserPlus, Lock, Smartphone, Briefcase, Tag, Globe, MapPin, Calendar, HelpCircle } from 'lucide-react';
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
      <form onSubmit={onSubmit} className="space-y-5 py-2">
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-[12px] text-xs font-bold flex items-center gap-2">
            <HelpCircle size={16} />
            {error}
          </div>
        )}

        {/* Chapter Admin Field (Read-only) */}
        <div className="space-y-2">
          <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Chapter Admin Assignment</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <input
              type="text"
              value={profile?.name || profile?.displayName || 'Chapter Admin'}
              disabled
              className="w-full h-11 pl-8 pr-4 rounded-[12px] bg-[#151C2E]/60 border border-white/5 text-xs font-bold text-neutral-400 opacity-95 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Full Name</label>
          <input
            required
            type="text"
            placeholder="John Doe"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full h-11 px-4 rounded-[12px] bg-[#151C2E] border border-white/5 focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none transition-all text-sm font-semibold text-white placeholder:text-[#8A93A7]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Phone Number</label>
            <div className="relative">
              <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input
                required
                type="tel"
                placeholder="+91 99999 99999"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full h-11 pl-10 pr-4 rounded-[12px] bg-[#151C2E] border border-white/5 focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none transition-all text-sm font-semibold text-white placeholder:text-[#8A93A7]"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Login Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input
                required
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full h-11 pl-10 pr-4 rounded-[12px] bg-[#151C2E] border border-white/5 focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none transition-all text-sm font-semibold text-white placeholder:text-[#8A93A7]"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Business Name</label>
            <div className="relative">
              <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input
                required
                type="text"
                placeholder="Acme Corp"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full h-11 pl-10 pr-4 rounded-[12px] bg-[#151C2E] border border-white/5 focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none transition-all text-sm font-semibold text-white placeholder:text-[#8A93A7]"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Industry Category</label>
            <div className="relative">
              <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full h-11 pl-10 pr-4 rounded-[12px] bg-[#151C2E] border border-white/5 focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none transition-all text-sm font-semibold text-white appearance-none cursor-pointer"
              >
                <option value="" className="bg-[#151C2E] text-white">Select Category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name} className="bg-[#151C2E] text-white">{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">State</label>
            <div className="relative">
              <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input
                required
                type="text"
                placeholder="Karnataka"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full h-11 pl-10 pr-4 rounded-[12px] bg-[#151C2E] border border-white/5 focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none transition-all text-sm font-semibold text-white placeholder:text-[#8A93A7]"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">City</label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input
                required
                type="text"
                placeholder="Bengaluru"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full h-11 pl-10 pr-4 rounded-[12px] bg-[#151C2E] border border-white/5 focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none transition-all text-sm font-semibold text-white placeholder:text-[#8A93A7]"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Area</label>
            <input
              required
              type="text"
              placeholder="Indiranagar"
              value={formData.area}
              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              className="w-full h-11 px-4 rounded-[12px] bg-[#151C2E] border border-white/5 focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none transition-all text-sm font-semibold text-white placeholder:text-[#8A93A7]"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Complete Address</label>
            <input
              required
              type="text"
              placeholder="123, 100 Feet Rd"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full h-11 px-4 rounded-[12px] bg-[#151C2E] border border-white/5 focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none transition-all text-sm font-semibold text-white placeholder:text-[#8A93A7]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Subscription Start</label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input
                required
                type="date"
                value={formData.subscriptionStart}
                onChange={(e) => setFormData({ ...formData, subscriptionStart: e.target.value })}
                className="w-full h-11 pl-10 pr-4 rounded-[12px] bg-[#151C2E] border border-white/5 focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none transition-all text-sm font-semibold text-white"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest font-mono">Subscription End</label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input
                required
                type="date"
                value={formData.subscriptionEnd}
                onChange={(e) => setFormData({ ...formData, subscriptionEnd: e.target.value })}
                className="w-full h-11 pl-10 pr-4 rounded-[12px] bg-[#151C2E] border border-white/5 focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none transition-all text-sm font-semibold text-white"
              />
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 bg-primary text-white rounded-[12px] text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-[0_2px_10px_rgba(0,0,0,0.02)] shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-primary/90"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Creating Member...</span>
              </>
            ) : (
              <>
                <UserPlus size={16} />
                <span>Create Member Account</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
