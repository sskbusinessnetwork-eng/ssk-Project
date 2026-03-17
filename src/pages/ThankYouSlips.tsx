import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  TrendingUp, 
  Award, 
  Calendar, 
  User, 
  IndianRupee,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { firestoreService } from '../services/firestoreService';
import { ThankYouSlip, Referral, UserProfile } from '../types';
import { Modal } from '../components/Modal';
import { format } from 'date-fns';
import { where, orderBy } from 'firebase/firestore';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export function ThankYouSlips() {
  const { profile } = useAuth();
  const [slips, setSlips] = useState<ThankYouSlip[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    referralId: '',
    customerName: '',
    businessValue: '',
    notes: ''
  });

  useEffect(() => {
    if (!profile) return;

    const constraints = [
      where('fromUserId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    ];

    const unsubscribe = firestoreService.subscribe<ThankYouSlip>('thank_you_slips', constraints, (data) => {
      setSlips(data);
      setLoading(false);
    });

    // Fetch converted referrals to show in the selector
    firestoreService.list<Referral>('referrals', [
      where('toUserId', '==', profile.uid),
      where('status', '==', 'converted')
    ]).then(setReferrals);

    return () => unsubscribe();
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const selectedReferral = referrals.find(r => r.id === formData.referralId);
    if (!selectedReferral) return;

    const newSlip: Omit<ThankYouSlip, 'id'> = {
      referralId: formData.referralId,
      fromUserId: profile.uid,
      toUserId: selectedReferral.fromUserId,
      chapterId: profile.chapterId || '',
      customerName: formData.customerName,
      businessValue: Number(formData.businessValue),
      notes: formData.notes,
      createdAt: new Date().toISOString()
    };

    await firestoreService.create('thank_you_slips', newSlip);
    
    // Close the referral status
    await firestoreService.update('referrals', formData.referralId, { status: 'closed' });
    
    setIsModalOpen(false);
    setFormData({ referralId: '', customerName: '', businessValue: '', notes: '' });
  };

  const totalBusiness = slips.reduce((acc, slip) => acc + slip.businessValue, 0);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Thank You Slips</h1>
          <p className="text-slate-500 mt-1">Record business generated from referrals.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
        >
          <Plus size={20} />
          <span>Submit Thank You Slip</span>
        </button>
      </header>

      {/* Summary Card */}
      <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Award size={120} />
        </div>
        <div className="relative z-10">
          <p className="text-emerald-400 text-sm font-bold uppercase tracking-widest mb-2">Total Business Generated</p>
          <h2 className="text-5xl font-extrabold tracking-tight flex items-center gap-2">
            <IndianRupee size={40} className="text-emerald-500" />
            {totalBusiness.toLocaleString()}
          </h2>
          <div className="mt-6 flex items-center gap-6">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span>{slips.length} Slips Submitted</span>
            </div>
          </div>
        </div>
      </div>

      {/* Slips List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Recent Transactions</h2>
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          </div>
        ) : slips.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {slips.map((slip) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={slip.id}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                    <TrendingUp size={20} />
                  </div>
                  <span className="text-xs text-slate-400 font-medium">{format(new Date(slip.createdAt), 'MMM d, yyyy')}</span>
                </div>
                
                <div className="space-y-1 mb-4">
                  <p className="text-sm text-slate-500 uppercase tracking-wider font-bold">Customer Name</p>
                  <p className="text-lg font-bold text-slate-900">{slip.customerName}</p>
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-sm text-slate-500 uppercase tracking-wider font-bold">Value</p>
                    <p className="text-2xl font-extrabold text-emerald-600">₹{slip.businessValue.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 italic mb-1">{slip.notes}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="p-20 text-center bg-white rounded-2xl border border-dashed border-slate-300">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Award size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No slips submitted yet</h3>
            <p className="text-slate-500 mt-1">Submit your first thank you slip once a referral converts into business.</p>
          </div>
        )}
      </div>

      {/* Submit Slip Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Submit Thank You Slip"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Select Referral</label>
            <select
              required
              value={formData.referralId}
              onChange={(e) => setFormData({ ...formData, referralId: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            >
              <option value="">Choose a converted referral...</option>
              {referrals.map((r) => (
                <option key={r.id} value={r.id}>{r.contactName} - {r.requirement}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500">Only referrals marked as 'Converted' will appear here.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Customer Name</label>
            <input
              required
              type="text"
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              placeholder="Who was the customer?"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Transaction Value (₹)</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <IndianRupee size={18} />
              </div>
              <input
                required
                type="number"
                value={formData.businessValue}
                onChange={(e) => setFormData({ ...formData, businessValue: e.target.value })}
                placeholder="0.00"
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Notes (Optional)</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any extra details?"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
            >
              Submit Thank You Slip
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
