import React, { useState, useEffect } from 'react';
import { db } from '../lib/database';
import {  collection, query, getDocs, doc, writeBatch, where  } from '../lib/database';
import { UserProfile } from '../types';
import { Building, MapPin, CheckCircle2, User } from 'lucide-react';

export function CreateChapter() {
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    chapter_name: '',
    meeting_venue: '',
    chapter_admin_id: '',
    president_id: '',
    vice_president_id: '',
    treasurer_id: ''
  });

  useEffect(() => {
    // Fetch all members who don't have a chapter_admin role or maybe all users to allow selection
    // The requirement says "The dropdown should list existing Members."
    const q = query(collection(db, 'users'));
    getDocs(q).then(snap => {
      setMembers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.values(formData).some(val => !val)) {
      alert("All fields are mandatory.");
      return;
    }

    // Ensure we don't pick the same person for multiple roles if not allowed (optional validation)
    const selectedIds = [
      formData.chapter_admin_id,
      formData.president_id,
      formData.vice_president_id,
      formData.treasurer_id
    ];
    if (new Set(selectedIds).size !== selectedIds.length) {
      alert("A member can only hold one leadership position per chapter.");
      return;
    }

    setLoading(true);
    try {
      const batch = writeBatch(db);
      
      const chapterRef = doc(collection(db, 'chapters'));
      const chapterId = chapterRef.id;

      // 1. Create chapter
      batch.set(chapterRef, {
        id: chapterId,
        chapter_name: formData.chapter_name,
        meeting_venue: formData.meeting_venue,
        chapter_admin_id: formData.chapter_admin_id,
        president_id: formData.president_id,
        vice_president_id: formData.vice_president_id,
        treasurer_id: formData.treasurer_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // 2. Assign positions to the selected members
      const assignments = [
        { id: formData.chapter_admin_id, pos: 'chapter_admin', role: 'CHAPTER_ADMIN' },
        { id: formData.president_id, pos: 'president', role: 'MEMBER' },
        { id: formData.vice_president_id, pos: 'vice_president', role: 'MEMBER' },
        { id: formData.treasurer_id, pos: 'treasurer', role: 'MEMBER' }
      ];

      for (const assignment of assignments) {
        batch.update(doc(db, 'users', assignment.id), {
          chapter_id: chapterId,
          position: assignment.pos,
          role: assignment.role
        });
      }

      await batch.commit();

      setSuccess(true);
      setFormData({
        chapter_name: '',
        meeting_venue: '',
        chapter_admin_id: '',
        president_id: '',
        vice_president_id: '',
        treasurer_id: ''
      });
      
      setTimeout(() => setSuccess(false), 3000);

    } catch (error) {
      console.error("Error creating chapter:", error);
      alert("Failed to create chapter.");
    } finally {
      setLoading(false);
    }
  };

  const memberOptions = members.map(m => (
    <option key={m.uid} value={m.uid} className="bg-[#161B22] text-white">
      {m.name || m.displayName} {m.businessName ? `(${m.businessName})` : ''}
    </option>
  ));

  return (
    <div className="bg-[#161B22] border border-white/[0.08] rounded-[20px] shadow-[0_15px_40px_rgba(0,0,0,0.35)] p-6 sm:p-8">
      <h2 className="text-xl font-bold text-white mb-6">Create New Chapter</h2>
      
      {success && (
        <div className="mb-6 p-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 size={18} />
          Chapter created successfully. Leadership positions have been assigned.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        
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
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-[0.5px] border-b border-white/[0.08] pb-2">
            Assign Leadership (Mandatory)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-primary uppercase tracking-[0.5px] ml-1 block">Chapter Admin *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-hover:text-primary transition-colors" size={16} />
                <select
                  required
                  value={formData.chapter_admin_id}
                  onChange={(e) => setFormData(f => ({ ...f, chapter_admin_id: e.target.value }))}
                  className="w-full h-[50px] pl-10 pr-4 bg-[#0F172A] border border-white/10 rounded-[14px] focus:bg-[#0F172A] focus:border-primary focus:shadow-[0_0_0_3px_rgba(239,68,68,0.18)] outline-none text-white text-sm transition-all appearance-none cursor-pointer"
                >
                  <option value="" className="bg-[#161B22] text-white">Select Member...</option>
                  {memberOptions}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#E5E7EB] uppercase tracking-[0.5px] ml-1 block">President *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-hover:text-primary transition-colors" size={16} />
                <select
                  required
                  value={formData.president_id}
                  onChange={(e) => setFormData(f => ({ ...f, president_id: e.target.value }))}
                  className="w-full h-[50px] pl-10 pr-4 bg-[#0F172A] border border-white/10 rounded-[14px] focus:bg-[#0F172A] focus:border-primary focus:shadow-[0_0_0_3px_rgba(239,68,68,0.18)] outline-none text-white text-sm transition-all appearance-none cursor-pointer"
                >
                  <option value="" className="bg-[#161B22] text-white">Select Member...</option>
                  {memberOptions}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#E5E7EB] uppercase tracking-[0.5px] ml-1 block">Vice President *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-hover:text-primary transition-colors" size={16} />
                <select
                  required
                  value={formData.vice_president_id}
                  onChange={(e) => setFormData(f => ({ ...f, vice_president_id: e.target.value }))}
                  className="w-full h-[50px] pl-10 pr-4 bg-[#0F172A] border border-white/10 rounded-[14px] focus:bg-[#0F172A] focus:border-primary focus:shadow-[0_0_0_3px_rgba(239,68,68,0.18)] outline-none text-white text-sm transition-all appearance-none cursor-pointer"
                >
                  <option value="" className="bg-[#161B22] text-white">Select Member...</option>
                  {memberOptions}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#E5E7EB] uppercase tracking-[0.5px] ml-1 block">Treasurer *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-hover:text-primary transition-colors" size={16} />
                <select
                  required
                  value={formData.treasurer_id}
                  onChange={(e) => setFormData(f => ({ ...f, treasurer_id: e.target.value }))}
                  className="w-full h-[50px] pl-10 pr-4 bg-[#0F172A] border border-white/10 rounded-[14px] focus:bg-[#0F172A] focus:border-primary focus:shadow-[0_0_0_3px_rgba(239,68,68,0.18)] outline-none text-white text-sm transition-all appearance-none cursor-pointer"
                >
                  <option value="" className="bg-[#161B22] text-white">Select Member...</option>
                  {memberOptions}
                </select>
              </div>
            </div>

          </div>
        </div>

        <div className="pt-4 flex justify-end">
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
