import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Building2, MapPin, Calendar, Clock, Edit2, Shield } from 'lucide-react';
import { firestoreService } from '../services/firestoreService';
import { Chapter, UserProfile } from '../types';
import { Modal } from '../components/Modal';

export function Chapters() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [admins, setAdmins] = useState<UserProfile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    meetingDay: 'Wednesday',
    meetingTime: '07:30 AM',
    meetingVenue: '',
    status: 'active' as Chapter['status']
  });

  useEffect(() => {
    const unsubscribe = firestoreService.subscribe<Chapter>('chapters', [], (data) => {
      setChapters(data);
      setLoading(false);
    });

    // Fetch potential chapter admins
    firestoreService.list<UserProfile>('users', []).then(data => {
      setAdmins(data.filter(u => u.role === 'chapter_admin' || u.role === 'admin'));
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newChapter: Omit<Chapter, 'id'> = {
      ...formData,
      adminIds: [],
      createdAt: new Date().toISOString()
    };

    await firestoreService.create('chapters', newChapter);
    setIsModalOpen(false);
    setFormData({ name: '', location: '', meetingDay: 'Wednesday', meetingTime: '07:30 AM', meetingVenue: '', status: 'active' });
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Chapter Management</h1>
          <p className="text-slate-500 mt-1">Create and manage networking chapters across regions.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
        >
          <Plus size={20} />
          <span>Create Chapter</span>
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500 mx-auto"></div>
          </div>
        ) : chapters.length > 0 ? (
          chapters.map((chapter) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={chapter.id}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all group overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <Building2 size={24} />
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                    chapter.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  )}>
                    {chapter.status}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-4">{chapter.name}</h3>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <MapPin size={16} className="text-slate-400" />
                    <span>{chapter.location}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <Calendar size={16} className="text-slate-400" />
                    <span>Every {chapter.meetingDay}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <Clock size={16} className="text-slate-400" />
                    <span>{chapter.meetingTime}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">
                        {i}
                      </div>
                    ))}
                  </div>
                  <button className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">
                    <Edit2 size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full p-20 text-center bg-white rounded-3xl border border-dashed border-slate-300">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Building2 size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No chapters created</h3>
            <p className="text-slate-500 mt-1">Start by creating your first networking chapter.</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Chapter"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Chapter Name</label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. SSK Elite Bangalore"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Location (City)</label>
              <input
                required
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Bangalore"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Meeting Day</label>
              <select
                required
                value={formData.meetingDay}
                onChange={(e) => setFormData({ ...formData, meetingDay: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white"
              >
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Meeting Time</label>
              <input
                required
                type="text"
                value={formData.meetingTime}
                onChange={(e) => setFormData({ ...formData, meetingTime: e.target.value })}
                placeholder="e.g. 07:30 AM"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Status</label>
              <select
                required
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Chapter['status'] })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white"
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Meeting Venue</label>
            <textarea
              required
              value={formData.meetingVenue}
              onChange={(e) => setFormData({ ...formData, meetingVenue: e.target.value })}
              placeholder="Full address of the meeting location..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
          >
            Create Chapter
          </button>
        </form>
      </Modal>
    </div>
  );
}

import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}
