const fs = require('fs');

const code = `import { supabase } from '../lib/supabaseClient';
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  UserPlus, 
  MessageSquare, 
  Calendar,
  Eye,
  AlertCircle,
  CheckCircle2,
  Phone
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { databaseService } from '../services/databaseService';
import { Category } from '../types';
import { Modal } from '../components/Modal';
import { format } from 'date-fns';
import { db } from '../lib/database';
import { normalizePhoneNumber } from '../utils/phoneUtils';
import { cn } from '../lib/utils';

export default function Guests() {
  const { profile } = useAuth();
  
  const [invitations, setInvitations] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<any[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    guestName: '',
    guestPhone: '',
    guestWhatsapp: '',
    guestBusiness: '',
    meetingId: ''
  });

  const fetchInitialData = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      // 1. Fetch Categories
      const cats = await databaseService.list<Category>('categories');
      setCategories(cats);
      
      // 2. Fetch Upcoming Meetings
      if (profile.chapter_id) {
        const todayStr = new Date().toISOString().split('T')[0];
        const { data: fetchedMeetings } = await supabase
          .from('meetings')
          .select('*')
          .eq('chapter_id', profile.chapter_id)
          .gte('date', todayStr)
          .order('date', { ascending: true });
        
        if (fetchedMeetings) setUpcomingMeetings(fetchedMeetings);
      }
      
      // 3. Fetch Guest Invitations History
      const { data: invs } = await supabase
        .from('guest_invitations')
        .select('*')
        .eq('invited_by', profile.uid)
        .order('created_at', { ascending: false });
        
      if (invs) setInvitations(invs);
      
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    // Validation
    if (!formData.guestName || !formData.guestPhone || !formData.guestWhatsapp || !formData.guestBusiness || !formData.meetingId) {
      setError("Please fill all required fields.");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    try {
      const selectedMeeting = upcomingMeetings.find(m => m.id === formData.meetingId);
      if (!selectedMeeting) throw new Error("Please select a valid meeting.");

      const newInvitation = {
        invited_by: profile.uid,
        invited_by_name: profile.name || profile.full_name || 'Member',
        invited_by_chapter: profile.chapter_id || 'Unknown',
        guest_name: formData.guestName,
        guest_phone: formData.guestPhone,
        guest_whatsapp: formData.guestWhatsapp,
        business_category: formData.guestBusiness,
        meeting_id: formData.meetingId,
        meeting_title: selectedMeeting.title || 'Weekly Chapter Meeting',
        meeting_date: selectedMeeting.date,
        meeting_time: selectedMeeting.time || '10:00 AM',
        venue: selectedMeeting.venue || selectedMeeting.location || 'SSK Business Hall',
        status: 'Pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error: insertError } = await supabase
        .from('guest_invitations')
        .insert([newInvitation])
        .select();
        
      if (insertError) throw insertError;
      
      // Refresh list
      fetchInitialData();
      
      // WhatsApp sharing logic
      const message = \`Hello *\${formData.guestName}*,\\n\\nYou are warmly invited to attend the SSK Business Network Chapter Meeting.\\n\\n📅 Date: \${selectedMeeting.date}\\n🕙 Time: \${selectedMeeting.time || '10:00 AM'}\\n📍 Venue: \${selectedMeeting.venue || selectedMeeting.location || 'SSK Business Hall'}\\n\\nWe would be delighted to have you join us to connect with local business professionals, build relationships, and explore new business opportunities.\\n\\nLooking forward to seeing you.\\n\\nRegards,\\n\${profile.name || profile.full_name || 'Member'}\\nSSK Business Network\`;
      
      const waUrl = \`https://wa.me/\${normalizePhoneNumber(formData.guestWhatsapp)}?text=\${encodeURIComponent(message)}\`;
      window.open(waUrl, '_blank');
      
      setShowSuccess(true);
      setFormData({
        guestName: '',
        guestPhone: '',
        guestWhatsapp: '',
        guestBusiness: '',
        meetingId: ''
      });
      
      // Update workspace checklist automatically
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      setError(error.message || "Failed to send invitation. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3 sm:px-6 lg:px-6 py-4 md:py-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Guest Invitations</h1>
          <p className="text-sm text-neutral-400 mt-1">Invite and track your guests to upcoming chapter meetings.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              setIsModalOpen(true);
              setShowSuccess(false);
            }}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-[12px] font-bold uppercase tracking-widest hover:bg-primary/90 transition-all text-xs"
          >
            <Plus size={16} />
            <span>Invite a New Guest</span>
          </button>
        </div>
      </header>

      {/* Guest Invitation History */}
      <div className="bg-[#111827] rounded-[16px] border border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-lg font-bold text-white">Guest Invitation History</h2>
        </div>
        
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : invitations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#151C2E]">
                  <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest whitespace-nowrap">Guest</th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest whitespace-nowrap">Contact</th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest whitespace-nowrap">Category</th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest whitespace-nowrap">Meeting</th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#1C2538] transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-bold text-white">{inv.guest_name}</p>
                        <p className="text-[10px] text-neutral-400 mt-1">{format(new Date(inv.created_at), 'dd MMM yyyy')}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs text-neutral-300">
                          <Phone size={12} className="text-primary" />
                          {inv.guest_phone}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-neutral-300">
                          <MessageSquare size={12} className="text-emerald-400" />
                          {inv.guest_whatsapp}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-[#151C2E] border border-white/5 rounded-full text-[10px] font-bold text-neutral-300">
                        {inv.business_category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-xs font-medium text-white">{inv.meeting_title || 'Chapter Meeting'}</p>
                        <p className="text-[10px] text-neutral-400 mt-1">
                          {inv.meeting_date ? format(new Date(inv.meeting_date), 'dd MMM yyyy') : 'N/A'} at {inv.meeting_time}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-[10px] font-bold uppercase tracking-widest inline-block text-center w-fit">
                          {inv.status || 'Pending'}
                        </span>
                        <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                          <CheckCircle2 size={10} />
                          WhatsApp Sent
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-[#151C2E] rounded-full flex items-center justify-center mb-4 border border-white/5">
              <UserPlus size={24} className="text-neutral-500" />
            </div>
            <p className="text-neutral-400 font-medium">No guests invited yet.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 text-primary text-sm font-bold uppercase tracking-widest hover:underline"
            >
              Invite Your First Guest
            </button>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsModalOpen(false);
            setShowSuccess(false);
          }
        }}
        title="Invite a New Guest"
      >
        {showSuccess ? (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 border border-emerald-500/20">
              <CheckCircle2 size={32} className="text-emerald-500" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Invitation Sent!</h3>
            <p className="text-neutral-400 mb-8 max-w-sm">
              The invitation has been saved and WhatsApp has been opened for sharing.
            </p>
            <button
              onClick={() => {
                setShowSuccess(false);
                setIsModalOpen(false);
              }}
              className="w-full py-4 bg-[#151C2E] text-white rounded-[12px] font-bold hover:bg-[#1C2538] transition-all border border-white/5 uppercase tracking-widest text-xs"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-[12px] flex items-start gap-3">
                <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-red-400 font-medium">{error}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Guest Name <span className="text-red-400">*</span></label>
              <input
                required
                type="text"
                value={formData.guestName}
                onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                placeholder="Enter guest name"
                className="w-full px-4 py-3 bg-[#151C2E] text-white border border-white/5 rounded-[12px] focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-neutral-600 font-medium text-sm"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Guest Phone <span className="text-red-400">*</span></label>
                <input
                  required
                  type="tel"
                  value={formData.guestPhone}
                  onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
                  placeholder="e.g. +91 9876543210"
                  className="w-full px-4 py-3 bg-[#151C2E] text-white border border-white/5 rounded-[12px] focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-neutral-600 font-medium text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">WhatsApp Number <span className="text-red-400">*</span></label>
                <input
                  required
                  type="tel"
                  value={formData.guestWhatsapp}
                  onChange={(e) => setFormData({ ...formData, guestWhatsapp: e.target.value })}
                  placeholder="For invitation message"
                  className="w-full px-4 py-3 bg-[#151C2E] text-white border border-white/5 rounded-[12px] focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-neutral-600 font-medium text-sm"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Business Category <span className="text-red-400">*</span></label>
              <select
                required
                value={formData.guestBusiness}
                onChange={(e) => setFormData({ ...formData, guestBusiness: e.target.value })}
                className="w-full px-4 py-3 bg-[#151C2E] text-white border border-white/5 rounded-[12px] focus:ring-2 focus:ring-primary outline-none transition-all font-medium text-sm"
              >
                <option value="" className="bg-[#111827] text-white">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name} className="bg-[#111827] text-white">{cat.name}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Meeting <span className="text-red-400">*</span></label>
              <select
                required
                value={formData.meetingId}
                onChange={(e) => setFormData({ ...formData, meetingId: e.target.value })}
                className="w-full px-4 py-3 bg-[#151C2E] text-white border border-white/5 rounded-[12px] focus:ring-2 focus:ring-primary outline-none transition-all font-medium text-sm"
              >
                <option value="" className="bg-[#111827] text-white">Select Upcoming Meeting</option>
                {upcomingMeetings.map((m) => (
                  <option key={m.id} value={m.id} className="bg-[#111827] text-white">
                    {m.title || 'Weekly Chapter Meeting'} - {format(new Date(m.date), 'dd MMM yyyy')} {m.time || '10:00 AM'} ({m.venue || m.location || 'SSK Business Hall'})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-primary text-white rounded-[12px] font-bold uppercase tracking-widest text-xs hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
`;

fs.writeFileSync('src/pages/Guests.tsx', code);
