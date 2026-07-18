import React, { useState, useEffect } from 'react';
import { db } from '../lib/database';
import { collection, doc, writeBatch, query, getDocs, where } from '../lib/database';
import { UserProfile } from '../types';
import { Building, MapPin, CheckCircle2, User, Phone, Mail, MessageCircle, Lock } from 'lucide-react';
import { useAuth } from "../hooks/useAuth";
import { normalizePhoneNumber } from '../utils/phoneUtils';
import { createClient } from '@supabase/supabase-js';

const tempClient = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://wfbkgfotpzscjyaanzpx.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmtnZm90cHpzY2p5YWFuenB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzMzNjEsImV4cCI6MjA5OTUwOTM2MX0.Z_Is7xk8QdTWCTgj-L9X6Bm7s0-RTMBE9DW7o2qSHg4',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

interface LeaderForm {
  fullName: string;
  mobile: string;
  whatsapp: string;
  email: string;
}

export function CreateChapter() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    chapter_name: '',
    meeting_venue: '',
  });

  const [leaders, setLeaders] = useState({
    chapter_admin: { fullName: '', mobile: '', whatsapp: '', email: '' } as LeaderForm,
    president: { fullName: '', mobile: '', whatsapp: '', email: '' } as LeaderForm,
    vice_president: { fullName: '', mobile: '', whatsapp: '', email: '' } as LeaderForm,
    treasurer: { fullName: '', mobile: '', whatsapp: '', email: '' } as LeaderForm,
  });

  const handleLeaderChange = (position: keyof typeof leaders, field: keyof LeaderForm, value: string) => {
    setLeaders(prev => ({
      ...prev,
      [position]: {
        ...prev[position],
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.chapter_name.trim() || !formData.meeting_venue.trim()) {
      alert("Chapter Name and Meeting Venue are mandatory.");
      return;
    }

    const positions = ['chapter_admin', 'president', 'vice_president', 'treasurer'] as const;
    
    // Validate required fields
    for (const pos of positions) {
      const l = leaders[pos];
      if (!l.fullName.trim() || !l.mobile.trim()) {
        alert(`Full Name and Mobile Number are required for ${pos.replace('_', ' ').toUpperCase()}.`);
        return;
      }
    }

    // Check duplicates in form
    const mobiles = positions.map(p => normalizePhoneNumber(leaders[p].mobile));
    if (new Set(mobiles).size !== mobiles.length) {
      alert("Mobile numbers must be unique across all leadership roles.");
      return;
    }

    const emails = positions.map(p => leaders[p].email.trim().toLowerCase()).filter(Boolean);
    if (new Set(emails).size !== emails.length) {
      alert("Email addresses must be unique across all leadership roles.");
      return;
    }

    setLoading(true);
    try {
      // Check existing users in DB
      for (const pos of positions) {
        const phone = normalizePhoneNumber(leaders[pos].mobile);
        const q = query(collection(db, 'users'), where('phone', '==', phone));
        const existing = await getDocs(q);
        if (!existing.empty) {
          throw new Error(`An account with mobile ${phone} already exists (used by ${pos.replace('_', ' ').toUpperCase()}).`);
        }
      }

      const batch = writeBatch(db);
      const chapterRef = doc(collection(db, 'chapters'));
      const chapterId = chapterRef.id;

      // Prepare user UIDs
      const leaderUIDs = {
        chapter_admin: doc(collection(db, 'users')).id,
        president: doc(collection(db, 'users')).id,
        vice_president: doc(collection(db, 'users')).id,
        treasurer: doc(collection(db, 'users')).id,
      };

      // 1. Create chapter
      batch.set(chapterRef, {
        id: chapterId,
        chapter_name: formData.chapter_name,
        meeting_venue: formData.meeting_venue,
        chapter_admin_id: leaderUIDs.chapter_admin,
        president_id: leaderUIDs.president,
        vice_president_id: leaderUIDs.vice_president,
        treasurer_id: leaderUIDs.treasurer,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // 2. Create users
      for (const pos of positions) {
        const leader = leaders[pos];
        const phone = normalizePhoneNumber(leader.mobile);
        const uid = leaderUIDs[pos];
        const defaultPassword = 'Welcometosskbusiness';

        const userProfile = {
          uid,
          name: leader.fullName.trim(),
          phone: phone,
          whatsapp: leader.whatsapp.trim() || phone,
          email: leader.email.trim() || undefined,
          password: defaultPassword,
          role: pos === 'chapter_admin' ? 'CHAPTER_ADMIN' : 'MEMBER',
          membershipStatus: 'ACTIVE',
          chapterName: formData.chapter_name,
          chapter_id: chapterId,
          position: pos,
          must_change_password: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        batch.set(doc(db, 'users', uid), userProfile);
        
        batch.set(doc(db, 'auth_data', uid), {
          uid,
          password: defaultPassword,
          updatedAt: new Date().toISOString()
        });

        // Create Supabase Auth Account
        const signupEmail = leader.email.trim() || `${phone}@ssknetwork.com`;
        await tempClient.auth.signUp({
          email: signupEmail,
          password: defaultPassword,
        }).catch(e => console.error('Supabase auth signup failed, ignoring:', e));
      }

      await batch.commit();

      setSuccess(true);
      setFormData({
        chapter_name: '',
        meeting_venue: '',
      });
      setLeaders({
        chapter_admin: { fullName: '', mobile: '', whatsapp: '', email: '' },
        president: { fullName: '', mobile: '', whatsapp: '', email: '' },
        vice_president: { fullName: '', mobile: '', whatsapp: '', email: '' },
        treasurer: { fullName: '', mobile: '', whatsapp: '', email: '' },
      });
      
      setTimeout(() => setSuccess(false), 3000);

    } catch (error: any) {
      console.error("Error creating chapter:", error);
      alert(error.message || "Failed to create chapter.");
    } finally {
      setLoading(false);
    }
  };

  const renderLeaderForm = (title: string, pos: keyof typeof leaders) => (
    <div className="space-y-4 pt-6 border-t border-white/[0.08]">
      <h3 className="text-sm font-bold text-primary uppercase tracking-[0.5px]">
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Read-only Chapter Name */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-[#E5E7EB] uppercase tracking-[0.5px] ml-1 block">Chapter Name *</label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
            <input
              readOnly
              value={formData.chapter_name || 'Auto-filled'}
              className="w-full h-[40px] pl-9 pr-4 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white/70 text-xs cursor-not-allowed select-none"
            />
          </div>
        </div>
        
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-[#E5E7EB] uppercase tracking-[0.5px] ml-1 block">Full Name *</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-hover:text-primary transition-colors" size={14} />
            <input
              required
              type="text"
              placeholder="Full Name"
              value={leaders[pos].fullName}
              onChange={(e) => handleLeaderChange(pos, 'fullName', e.target.value)}
              className="w-full h-[40px] pl-9 pr-4 bg-[#0F172A] border border-white/10 rounded-lg focus:bg-[#0F172A] focus:border-primary focus:shadow-[0_0_0_3px_rgba(239,68,68,0.18)] outline-none text-white placeholder-white/50 text-xs transition-all"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-[#E5E7EB] uppercase tracking-[0.5px] ml-1 block">Mobile Number *</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-hover:text-primary transition-colors" size={14} />
            <input
              required
              type="tel"
              placeholder="e.g. 9876543210"
              value={leaders[pos].mobile}
              onChange={(e) => handleLeaderChange(pos, 'mobile', e.target.value)}
              className="w-full h-[40px] pl-9 pr-4 bg-[#0F172A] border border-white/10 rounded-lg focus:bg-[#0F172A] focus:border-primary focus:shadow-[0_0_0_3px_rgba(239,68,68,0.18)] outline-none text-white placeholder-white/50 text-xs transition-all"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-[0.5px] ml-1 block">WhatsApp (Optional)</label>
          <div className="relative">
            <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-hover:text-primary transition-colors" size={14} />
            <input
              type="tel"
              placeholder="Same as mobile if empty"
              value={leaders[pos].whatsapp}
              onChange={(e) => handleLeaderChange(pos, 'whatsapp', e.target.value)}
              className="w-full h-[40px] pl-9 pr-4 bg-[#0F172A] border border-white/10 rounded-lg focus:bg-[#0F172A] focus:border-primary outline-none text-white placeholder-white/50 text-xs transition-all"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-[0.5px] ml-1 block">Email (Optional)</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-hover:text-primary transition-colors" size={14} />
            <input
              type="email"
              placeholder="Email address"
              value={leaders[pos].email}
              onChange={(e) => handleLeaderChange(pos, 'email', e.target.value)}
              className="w-full h-[40px] pl-9 pr-4 bg-[#0F172A] border border-white/10 rounded-lg focus:bg-[#0F172A] focus:border-primary outline-none text-white placeholder-white/50 text-xs transition-all"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-[#E5E7EB] uppercase tracking-[0.5px] ml-1 block">Default Password *</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
            <input
              readOnly
              value="Welcometosskbusiness"
              className="w-full h-[40px] pl-9 pr-4 bg-[#0F172A]/50 border border-white/10 rounded-lg text-white/70 text-xs cursor-not-allowed select-none"
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-[#161B22] border border-white/[0.08] rounded-[20px] shadow-[0_15px_40px_rgba(0,0,0,0.35)] p-6 sm:p-8">
      <h2 className="text-xl font-bold text-white mb-6">Create New Chapter</h2>
      
      {success && (
        <div className="mb-6 p-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 size={18} />
          Chapter created successfully. Leadership positions have been created and assigned.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-[0.5px] border-b border-white/[0.08] pb-2">
            Chapter Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#E5E7EB] uppercase tracking-[0.5px] ml-1 block">Chapter Name *</label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-hover:text-primary transition-colors" size={16} />
                <input
                  required
                  type="text"
                  placeholder="e.g., Bangalore Central"
                  value={formData.chapter_name}
                  onChange={(e) => setFormData(f => ({ ...f, chapter_name: e.target.value }))}
                  className="w-full h-[50px] pl-10 pr-4 bg-[#0F172A] border border-white/10 rounded-[14px] focus:bg-[#0F172A] focus:border-primary focus:shadow-[0_0_0_3px_rgba(239,68,68,0.18)] outline-none text-white placeholder-white/50 text-sm transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#E5E7EB] uppercase tracking-[0.5px] ml-1 block">Meeting Venue *</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-hover:text-primary transition-colors" size={16} />
                <input
                  required
                  type="text"
                  placeholder="e.g., Koramangala Community Hall"
                  value={formData.meeting_venue}
                  onChange={(e) => setFormData(f => ({ ...f, meeting_venue: e.target.value }))}
                  className="w-full h-[50px] pl-10 pr-4 bg-[#0F172A] border border-white/10 rounded-[14px] focus:bg-[#0F172A] focus:border-primary focus:shadow-[0_0_0_3px_rgba(239,68,68,0.18)] outline-none text-white placeholder-white/50 text-sm transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Leadership */}
        <div className="space-y-2 pt-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-[0.5px] pb-2">
            Assign Leadership (Mandatory)
          </h3>
          <p className="text-xs text-neutral-400 mb-2">Create the 4 primary leadership accounts for this new chapter.</p>
          
          {renderLeaderForm('1. Chapter Admin', 'chapter_admin')}
          {renderLeaderForm('2. President', 'president')}
          {renderLeaderForm('3. Vice President', 'vice_president')}
          {renderLeaderForm('4. Treasurer', 'treasurer')}

        </div>

        <div className="pt-8 flex justify-end border-t border-white/[0.08]">
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-primary text-white font-bold text-sm uppercase tracking-widest rounded-[14px] hover:bg-[#DC2626] hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all duration-300 disabled:opacity-70 flex items-center gap-2"
          >
            {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {loading ? 'Creating...' : 'Create Chapter'}
          </button>
        </div>
      </form>
    </div>
  );
}
