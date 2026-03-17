import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Phone, 
  MessageSquare,
  ArrowRightLeft
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { firestoreService } from '../services/firestoreService';
import { Referral, UserProfile } from '../types';
import { Modal } from '../components/Modal';
import { format } from 'date-fns';
import { where, orderBy } from 'firebase/firestore';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export function Referrals() {
  const { profile } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<'passed' | 'received'>('received');
  const [loading, setLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    toUserId: '',
    contactName: '',
    contactPhone: '',
    requirement: '',
    notes: ''
  });

  useEffect(() => {
    if (!profile) return;

    const constraints = [
      where(filter === 'passed' ? 'fromUserId' : 'toUserId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    ];

    const unsubscribe = firestoreService.subscribe<Referral>('referrals', constraints, (data) => {
      setReferrals(data);
      setLoading(false);
    });

    // Fetch members for the selector
    firestoreService.list<UserProfile>('users', [
      where('chapterId', '==', profile.chapterId),
      where('status', '==', 'active')
    ]).then(data => {
      setMembers(data.filter(m => m.uid !== profile.uid));
    });

    return () => unsubscribe();
  }, [profile, filter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const newReferral: Omit<Referral, 'id'> = {
      ...formData,
      fromUserId: profile.uid,
      chapterId: profile.chapterId || '',
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    await firestoreService.create('referrals', newReferral);
    setIsModalOpen(false);
    setFormData({ toUserId: '', contactName: '', contactPhone: '', requirement: '', notes: '' });
  };

  const updateStatus = async (id: string, status: Referral['status']) => {
    await firestoreService.update('referrals', id, { status });
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Referral Management</h1>
          <p className="text-slate-500 mt-1">Track and manage your business connections.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
        >
          <Plus size={20} />
          <span>Pass a Referral</span>
        </button>
      </header>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-200 rounded-xl w-fit">
        <button
          onClick={() => setFilter('received')}
          className={cn(
            "px-6 py-2 rounded-lg text-sm font-bold transition-all",
            filter === 'received' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
          )}
        >
          Received
        </button>
        <button
          onClick={() => setFilter('passed')}
          className={cn(
            "px-6 py-2 rounded-lg text-sm font-bold transition-all",
            filter === 'passed' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
          )}
        >
          Passed
        </button>
      </div>

      {/* Referral List */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500 mx-auto"></div>
          </div>
        ) : referrals.length > 0 ? (
          referrals.map((ref) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              key={ref.id}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                    <ArrowRightLeft size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{ref.contactName}</h3>
                    <p className="text-slate-500 text-sm flex items-center gap-2 mt-1">
                      <Phone size={14} /> {ref.contactPhone}
                    </p>
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-sm font-medium text-slate-700">{ref.requirement}</p>
                      {ref.notes && <p className="text-xs text-slate-500 mt-1 italic">"{ref.notes}"</p>}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-4">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                      ref.status === 'pending' && "bg-amber-100 text-amber-700",
                      ref.status === 'contacted' && "bg-blue-100 text-blue-700",
                      ref.status === 'converted' && "bg-emerald-100 text-emerald-700",
                      ref.status === 'closed' && "bg-slate-100 text-slate-700"
                    )}>
                      {ref.status}
                    </span>
                    <span className="text-xs text-slate-400">{format(new Date(ref.createdAt), 'MMM d, yyyy')}</span>
                  </div>

                  {filter === 'received' && ref.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatus(ref.id, 'contacted')}
                        className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors"
                      >
                        Mark Contacted
                      </button>
                      <button
                        onClick={() => updateStatus(ref.id, 'converted')}
                        className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-colors"
                      >
                        Converted
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="p-20 text-center bg-white rounded-2xl border border-dashed border-slate-300">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Share2 size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No referrals found</h3>
            <p className="text-slate-500 mt-1">Start growing your network by passing referrals to your chapter members.</p>
          </div>
        )}
      </div>

      {/* Pass Referral Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Pass a New Referral"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Select Member</label>
            <select
              required
              value={formData.toUserId}
              onChange={(e) => setFormData({ ...formData, toUserId: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
            >
              <option value="">Choose a member...</option>
              {members.map((m) => (
                <option key={m.uid} value={m.uid}>{m.displayName} ({m.businessName} - {m.category})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Contact Name</label>
              <input
                required
                type="text"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                placeholder="Who are you referring?"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Contact Phone</label>
              <input
                required
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                placeholder="Phone number"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Business Requirement</label>
            <textarea
              required
              value={formData.requirement}
              onChange={(e) => setFormData({ ...formData, requirement: e.target.value })}
              placeholder="What does the contact need?"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Additional Notes (Optional)</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any extra info for the member?"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
            >
              Submit Referral
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

import { Share2 } from 'lucide-react';
