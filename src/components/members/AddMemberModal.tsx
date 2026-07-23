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
  errors?: Record<string, string>;
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
  error,
  errors = {}
}: AddMemberModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Member"
    >
      <form onSubmit={onSubmit} className="space-y-5 py-2">
        <div className="p-3 bg-primary/10 border border-primary/20 text-neutral-300 rounded-[12px] text-[10px] font-medium leading-relaxed">
          <strong className="text-primary block mb-1">Note:</strong> 
          Leadership positions (Chapter Admin, President, Vice President, and Treasurer) are managed exclusively by the Master Admin. Members added from this page will be created as regular Members only.
        </div>
        
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-[12px] text-xs font-bold flex items-center gap-2">
            <HelpCircle size={16} />
            {error}
          </div>
        )}

        {/* Chapter Name Field (Read-only) */}
        <div className="space-y-2">
          <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Chapter Name</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <input
              type="text"
              value={profile?.chapterName || profile?.chapter_name || 'Loading Chapter...'}
              disabled
              readOnly
              className="w-full h-11 pl-8 pr-4 rounded-[12px] bg-[#151C2E]/60 border border-white/5 text-xs font-bold text-neutral-400 opacity-95 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Full Name *</label>
          <input
            
            type="text"
            name="name"
            placeholder="Enter full name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full h-11 px-4 rounded-[12px] bg-[#151C2E] border border-white/5 focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none transition-all text-sm font-semibold text-white placeholder:text-[#8A93A7]"
          />
          {errors.name && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.name}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">WhatsApp Number *</label>
            <div className="relative">
              <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input
                
                type="tel"
                name="whatsapp"
                placeholder="e.g. 9876543210"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="w-full h-11 pl-10 pr-4 rounded-[12px] bg-[#151C2E] border border-white/5 focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none transition-all text-sm font-semibold text-white placeholder:text-[#8A93A7]"
              />
            </div>
            {errors.whatsapp && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.whatsapp}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Mobile Number *</label>
            <div className="relative">
              <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input
                
                type="tel"
                name="phone"
                placeholder="e.g. 9876543210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full h-11 pl-10 pr-4 rounded-[12px] bg-[#151C2E] border border-white/5 focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none transition-all text-sm font-semibold text-white placeholder:text-[#8A93A7]"
              />
            </div>
            {errors.phone && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.phone}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Default Password *</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input
              
              type="text"
              name="password"
              placeholder="Set initial password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full h-11 pl-10 pr-4 rounded-[12px] bg-[#151C2E] border border-white/5 focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none transition-all text-sm font-semibold text-white placeholder:text-[#8A93A7]"
            />
          </div>
          {errors.password && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.password}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Subscription Start Date *</label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input
                
                type="date"
                name="subscriptionStart"
                value={formData.subscriptionStart}
                onChange={(e) => setFormData({ ...formData, subscriptionStart: e.target.value })}
                className="w-full h-11 pl-10 pr-4 rounded-[12px] bg-[#151C2E] border border-white/5 focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none transition-all text-sm font-semibold text-white"
              />
            </div>
            {errors.subscriptionStart && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.subscriptionStart}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Subscription End Date *</label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input
                
                type="date"
                name="subscriptionEnd"
                value={formData.subscriptionEnd}
                onChange={(e) => setFormData({ ...formData, subscriptionEnd: e.target.value })}
                className="w-full h-11 pl-10 pr-4 rounded-[12px] bg-[#151C2E] border border-white/5 focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none transition-all text-sm font-semibold text-white"
              />
            </div>
            {errors.subscriptionEnd && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.subscriptionEnd}</p>}
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 bg-[#151C2E] text-white rounded-[12px] font-bold text-xs uppercase tracking-wider hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-2 h-11 bg-primary text-white rounded-[12px] font-bold text-xs uppercase tracking-wider hover:bg-primary/90 transition-all shadow-[0_4px_20px_rgba(229,57,53,0.3)] disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Account'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
