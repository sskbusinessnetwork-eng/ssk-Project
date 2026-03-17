import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  UserPlus, 
  MessageSquare, 
  Copy, 
  CheckCircle2, 
  Share2, 
  Calendar, 
  Clock, 
  MapPin,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { firestoreService } from '../services/firestoreService';
import { GuestInvitation, Chapter } from '../types';
import { Modal } from '../components/Modal';
import { format } from 'date-fns';
import { where, orderBy } from 'firebase/firestore';

export function Guests() {
  const { profile } = useAuth();
  const [invitations, setInvitations] = useState<GuestInvitation[]>([]);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    guestName: '',
    guestPhone: '',
    guestBusiness: ''
  });

  useEffect(() => {
    if (!profile) return;

    const constraints = [
      where('memberId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    ];

    const unsubscribe = firestoreService.subscribe<GuestInvitation>('guest_invitations', constraints, (data) => {
      setInvitations(data);
      setLoading(false);
    });

    if (profile.chapterId) {
      firestoreService.get<Chapter>('chapters', profile.chapterId).then(setChapter);
    }

    return () => unsubscribe();
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const newInvitation: Omit<GuestInvitation, 'id'> = {
      ...formData,
      memberId: profile.uid,
      chapterId: profile.chapterId || '',
      createdAt: new Date().toISOString()
    };

    await firestoreService.create('guest_invitations', newInvitation);
    setIsModalOpen(false);
    setFormData({ guestName: '', guestPhone: '', guestBusiness: '' });
  };

  const generateInviteText = (guestName: string) => {
    if (!chapter) return '';
    return `Hi ${guestName}! You're invited to SSK Business Network Weekly Business Meeting.
Date: Every ${chapter.meetingDay}
Time: ${chapter.meetingTime}
Location: ${chapter.meetingVenue}
Join as a guest entrepreneur and expand your network!`;
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleWhatsApp = (text: string, phone: string) => {
    const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Guest Invitations</h1>
          <p className="text-slate-500 mt-1">Invite entrepreneurs to visit your chapter and expand the network.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
        >
          <Plus size={20} />
          <span>Invite a Guest</span>
        </button>
      </header>

      {/* Invitations List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-full p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500 mx-auto"></div>
          </div>
        ) : invitations.length > 0 ? (
          invitations.map((inv) => {
            const inviteText = generateInviteText(inv.guestName);
            return (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                key={inv.id}
                className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                      <UserPlus size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{inv.guestName}</h3>
                      <p className="text-sm text-slate-500">{inv.guestBusiness}</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">{format(new Date(inv.createdAt), 'MMM d, yyyy')}</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
                  <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-2">Invite Content</p>
                  <p className="text-sm text-slate-600 line-clamp-3 italic">"{inviteText}"</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleWhatsApp(inviteText, inv.guestPhone)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all text-sm"
                  >
                    <MessageSquare size={18} />
                    WhatsApp
                  </button>
                  <button
                    onClick={() => handleCopy(inviteText, inv.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all text-sm"
                  >
                    {copiedId === inv.id ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Copy size={18} />}
                    {copiedId === inv.id ? 'Copied!' : 'Copy Text'}
                  </button>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="col-span-full p-20 text-center bg-white rounded-3xl border border-dashed border-slate-300">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <UserPlus size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No guests invited yet</h3>
            <p className="text-slate-500 mt-1">Invite your business contacts to visit your chapter and grow the network.</p>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Invite a New Guest"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Guest Name</label>
            <input
              required
              type="text"
              value={formData.guestName}
              onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
              placeholder="Full name of the guest"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Guest Phone</label>
              <input
                required
                type="tel"
                value={formData.guestPhone}
                onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Guest Business</label>
              <input
                required
                type="text"
                value={formData.guestBusiness}
                onChange={(e) => setFormData({ ...formData, guestBusiness: e.target.value })}
                placeholder="e.g. Interior Designer"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
            <h4 className="text-sm font-bold text-emerald-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Share2 size={16} /> Invitation Preview
            </h4>
            <div className="space-y-4 text-sm text-emerald-700 leading-relaxed">
              <div className="flex items-start gap-3">
                <Calendar size={18} className="shrink-0 mt-0.5" />
                <span>Every {chapter?.meetingDay || '---'}</span>
              </div>
              <div className="flex items-start gap-3">
                <Clock size={18} className="shrink-0 mt-0.5" />
                <span>{chapter?.meetingTime || '---'}</span>
              </div>
              <div className="flex items-start gap-3">
                <MapPin size={18} className="shrink-0 mt-0.5" />
                <span>{chapter?.meetingVenue || '---'}</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
          >
            Create Invitation
          </button>
        </form>
      </Modal>
    </div>
  );
}
