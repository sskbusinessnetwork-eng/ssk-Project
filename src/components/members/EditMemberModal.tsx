import React, { useEffect } from 'react';
import { UserCircle, Save } from 'lucide-react';
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
      title={`Edit Member: ${member?.name || member?.displayName}`}
    >
      <form onSubmit={onSubmit} className="space-y-4">
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
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">New Password (Optional)</label>
            <input
              type="password"
              value={formData.password || ''}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Leave blank to keep current"
              className="w-full h-11 px-4 rounded-xl bg-muted border border-transparent focus:bg-white focus:border-primary outline-none transition-all text-sm font-bold"
            />
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

        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 bg-primary text-white rounded-xl font-bold uppercase tracking-widest hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
