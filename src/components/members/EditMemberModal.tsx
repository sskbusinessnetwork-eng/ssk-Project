import React, { useEffect } from 'react';
import { CircleUser as UserCircle, Save, Smartphone, Briefcase, Tag, Globe, MapPin, Lock, Circle as HelpCircle } from 'lucide-react';
import { Modal } from '../Modal';
import { Category, UserProfile } from '../../types';

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  member: UserProfile | null;
  formData: any;
  setFormData: (data: any) => void;
  isMasterAdmin: boolean;
  categories: Category[];
}

export function EditMemberModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  member,
  formData,
  setFormData,
  isMasterAdmin,
  categories
}: EditMemberModalProps) {
  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name || member.displayName || '',
        phone: member.phone || '',
        businessName: member.businessName || '',
        category: member.category || '',
        state: member.state || '',
        city: member.city || '',
        area: member.area || '',
        address: member.address || ''
      });
    }
  }, [member, setFormData]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Member Profile"
    >
      <form onSubmit={onSubmit} className="space-y-5 py-2">
        <div className="space-y-2">
          <label className="text-xs font-bold text-neutral-500">Full Name</label>
          <input
            required
            type="text"
            placeholder="John Doe"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full h-11 px-4 rounded-xl bg-neutral-50 border border-neutral-200/80 text-[14px] font-medium text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-500">Phone Number</label>
            <div className="relative">
              <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input
                required
                type="tel"
                placeholder="+91 99999 99999"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-neutral-50 border border-neutral-200/80 text-[14px] font-medium text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-500">Business Name</label>
            <div className="relative">
              <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input
                required
                type="text"
                placeholder="Acme Corp"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-neutral-50 border border-neutral-200/80 text-[14px] font-medium text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-500">Industry Category</label>
            <div className="relative">
              <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-neutral-50 border border-neutral-200/80 text-[14px] font-medium text-neutral-800 appearance-none cursor-pointer focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-500">New Password (Optional)</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input
                type="password"
                value={formData.password || ''}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Leave blank to keep current"
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-neutral-50 border border-neutral-200/80 text-[14px] font-medium text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-500">State</label>
            <div className="relative">
              <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input
                required
                type="text"
                placeholder="Karnataka"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-neutral-50 border border-neutral-200/80 text-[14px] font-medium text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-500">City</label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input
                required
                type="text"
                placeholder="Bengaluru"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-neutral-50 border border-neutral-200/80 text-[14px] font-medium text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-500">Area</label>
            <input
              required
              type="text"
              placeholder="Indiranagar"
              value={formData.area}
              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              className="w-full h-11 px-4 rounded-xl bg-neutral-50 border border-neutral-200/80 text-[14px] font-medium text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-500">Complete Address</label>
            <input
              required
              type="text"
              placeholder="123, 100 Feet Rd"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full h-11 px-4 rounded-xl bg-neutral-50 border border-neutral-200/80 text-[14px] font-medium text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
            />
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 bg-primary text-white rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/25"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving changes...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
