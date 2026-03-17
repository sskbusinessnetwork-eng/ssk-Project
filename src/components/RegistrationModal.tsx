import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, Phone, User, Briefcase, Calendar, Building2, MapPin } from 'lucide-react';
import { firestoreService } from '../services/firestoreService';
import { Chapter, UserProfile } from '../types';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  'Real Estate',
  'Financial Services',
  'IT & Software',
  'Healthcare',
  'Education',
  'Manufacturing',
  'Retail',
  'Consulting',
  'Hospitality',
  'Automobile'
];

export function RegistrationModal({ isOpen, onClose }: RegistrationModalProps) {
  const [step, setStep] = React.useState<'form' | 'success'>('form');
  const [loading, setLoading] = React.useState(false);
  const [chapters, setChapters] = React.useState<Chapter[]>([]);
  const [admins, setAdmins] = React.useState<UserProfile[]>([]);
  const [formData, setFormData] = React.useState({
    fullName: '',
    mobile: '',
    companyName: '',
    businessCategory: '',
    address: '',
    meetingSlot: '',
    chapterId: ''
  });

  React.useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        const [chaptersData, usersData] = await Promise.all([
          firestoreService.list<Chapter>('chapters'),
          firestoreService.list<UserProfile>('users')
        ]);
        setChapters(chaptersData);
        setAdmins(usersData.filter(u => u.role === 'chapter_admin'));
      };
      fetchData();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const selectedChapter = chapters.find(c => c.id === formData.chapterId);
      const adminId = selectedChapter?.adminIds?.[0] || '';

      await firestoreService.create('applications', {
        ...formData,
        adminId,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setStep('success');
    } catch (error) {
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all z-10"
        >
          <X size={20} />
        </button>

        <AnimatePresence mode="wait">
          {step === 'form' ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-8 md:p-12"
            >
              <div className="mb-8">
                <h2 className="text-3xl font-extrabold text-slate-900">Join the Network</h2>
                <p className="text-slate-500 mt-2">Fill out the form below to start your membership journey.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <User size={14} /> Full Name
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="Enter your full name"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>

                  {/* Mobile */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Phone size={14} /> Mobile Number
                    </label>
                    <input
                      required
                      type="tel"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      placeholder="Enter mobile number"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>

                  {/* Company Name */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Building2 size={14} /> Company Name
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      placeholder="Enter company name"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>

                  {/* Business Category */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Briefcase size={14} /> Business Category
                    </label>
                    <select
                      required
                      value={formData.businessCategory}
                      onChange={(e) => setFormData({ ...formData, businessCategory: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    >
                      <option value="">Select Category</option>
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <MapPin size={14} /> Office Address
                  </label>
                  <textarea
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter full office address"
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Chapter Selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Building2 size={14} /> Select Chapter
                    </label>
                    <select
                      required
                      value={formData.chapterId}
                      onChange={(e) => setFormData({ ...formData, chapterId: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    >
                      <option value="">Select Chapter</option>
                      {chapters.map(chapter => {
                        const admin = admins.find(a => chapter.adminIds.includes(a.uid));
                        return (
                          <option key={chapter.id} value={chapter.id}>
                            {chapter.name} {admin ? `(${admin.displayName})` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Meeting Slot */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Calendar size={14} /> Preferred Meeting Slot
                    </label>
                    <select
                      required
                      value={formData.meetingSlot}
                      onChange={(e) => setFormData({ ...formData, meetingSlot: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    >
                      <option value="">Select Slot</option>
                      <option value="Monday 8:00 AM">Monday 8:00 AM</option>
                      <option value="Wednesday 8:00 AM">Wednesday 8:00 AM</option>
                      <option value="Friday 8:00 AM">Friday 8:00 AM</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Submit Application'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-12 text-center"
            >
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={48} />
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Application Submitted!</h2>
              <p className="text-slate-500 max-w-sm mx-auto mb-8">
                Thank you for your interest. Your application has been sent to the Chapter Admin for review. You will be contacted shortly.
              </p>
              <button
                onClick={onClose}
                className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
              >
                Close
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
