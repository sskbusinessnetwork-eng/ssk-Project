import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabaseClient';
import { databaseService } from '../../services/databaseService';
import { notificationService } from '../../services/notificationService';
import { Modal } from '../Modal';
import { Users, Building2, AlertCircle, Calendar, Clock, MapPin, Video, Search, ChevronRight } from 'lucide-react';
import { showError, showSuccess, scrollToError } from '../../services/toastService';
import { cn } from '../../lib/utils';
import { Avatar } from '../Avatar';

interface ScheduleOneToOneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialParticipantId?: string;
}

export function ScheduleOneToOneModal({
  isOpen,
  onClose,
  onSuccess,
  initialParticipantId
}: ScheduleOneToOneModalProps) {
  const { profile } = useAuth();
  const currentUserId = profile?.uid || (profile as any)?.id;

  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [memberTab, setMemberTab] = useState<'my_chapter' | 'all'>('my_chapter');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    participantId: initialParticipantId || '',
    date: '',
    time: '',
    venue: '',
    notes: '',
    locationType: 'In Person' as 'In Person' | 'Online'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialParticipantId) {
      setFormData(prev => ({ ...prev, participantId: initialParticipantId }));
    }
  }, [initialParticipantId]);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setIsDropdownOpen(false);
      return;
    }

    let isMounted = true;
    const fetchMembers = async () => {
      try {
        const { data: usersData, error: usersErr } = await supabase
          .from('users')
          .select('*')
          .order('name', { ascending: true });

        if (usersErr) throw usersErr;

        const { data: chaptersData } = await supabase
          .from('chapters')
          .select('id, chapter_name, name');

        const chapterMap = new Map<string, string>();
        if (chaptersData) {
          chaptersData.forEach(c => {
            if (c.id) {
              chapterMap.set(String(c.id).trim().toLowerCase(), c.chapter_name || c.name || '');
            }
          });
        }

        if (isMounted && usersData) {
          const mapped = usersData
            .filter((u: any) => {
              const uId = u.id || u.uid;
              const isCurrentUser = String(uId).trim().toLowerCase() === String(currentUserId).trim().toLowerCase();
              const isMaster = u.role === 'MASTER_ADMIN';
              return !isCurrentUser && !isMaster;
            })
            .map((u: any) => {
              const chapId = u.chapter_id || u.chapterId || '';
              const chapName = chapId ? chapterMap.get(String(chapId).trim().toLowerCase()) || '' : '';
              return {
                ...u,
                id: u.id || u.uid,
                displayName: u.name || u.displayName || 'Member',
                chapterName: chapName || u.chapterName || '',
                position: u.position || u.role || 'Member',
                phone: u.phone || u.phoneNumber || '',
                businessCategory: u.category || u.business_category || u.businessName || u.business_name || 'General'
              };
            });
          setAllMembers(mapped);
        }
      } catch (err: any) {
        console.warn('Error loading members for 1-to-1 modal:', err);
      }
    };

    fetchMembers();
    return () => { isMounted = false; };
  }, [isOpen, currentUserId]);

  const effectiveUserChapterId = useMemo(() => {
    return profile?.chapter_id || (profile as any)?.chapterId || (profile as any)?.adminId || '';
  }, [profile]);

  const filteredMembers = useMemo(() => {
    return allMembers.filter(m => {
      // 1. Tab filter
      if (memberTab === 'my_chapter') {
        const myChapId = String(effectiveUserChapterId || '').trim().toLowerCase();
        const memChapId = String(m.chapter_id || m.chapterId || '').trim().toLowerCase();
        if (myChapId && memChapId && myChapId !== memChapId) {
          return false;
        }
      }

      // 2. Search query filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const name = (m.displayName || m.name || '').toLowerCase();
        const role = (m.position || m.role || '').toLowerCase();
        const category = (m.businessCategory || '').toLowerCase();
        const chapter = (m.chapterName || '').toLowerCase();
        const phone = (m.phone || '').toLowerCase();
        return name.includes(q) || role.includes(q) || category.includes(q) || chapter.includes(q) || phone.includes(q);
      }

      return true;
    });
  }, [allMembers, memberTab, searchTerm, effectiveUserChapterId]);

  const selectedMember = useMemo(() => {
    if (!formData.participantId) return null;
    return allMembers.find(m => String(m.id).toLowerCase() === String(formData.participantId).toLowerCase());
  }, [allMembers, formData.participantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!formData.participantId) {
      const msg = 'Please select a member for the One-to-One meeting.';
      setError(msg);
      showError(msg);
      scrollToError();
      return;
    }
    if (!formData.date) {
      const msg = 'Please select a meeting date.';
      setError(msg);
      showError(msg);
      scrollToError();
      return;
    }
    if (!formData.time) {
      const msg = 'Please select a meeting time.';
      setError(msg);
      showError(msg);
      scrollToError();
      return;
    }
    if (!formData.venue.trim()) {
      const msg = formData.locationType === 'Online' ? 'Please provide the meeting link.' : 'Please provide the meeting venue/location.';
      setError(msg);
      showError(msg);
      scrollToError();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const currentAuthId = profile?.id || profile?.uid || (await supabase.auth.getUser()).data?.user?.id;
      if (!currentAuthId) throw new Error('User not authenticated.');

      const participant = selectedMember;
      const title = formData.title.trim() || `1-to-1: ${profile.name || 'Member'} & ${participant?.displayName || 'Member'}`;

      const meetingPayload = {
        title: title,
        requester_id: currentAuthId,
        requesterId: currentAuthId,
        participant_id: formData.participantId,
        participantId: formData.participantId,
        creator_id: currentAuthId,
        creatorId: currentAuthId,
        member1_id: currentAuthId,
        member1Id: currentAuthId,
        member2_id: formData.participantId,
        member2Id: formData.participantId,
        date: formData.date,
        time: formData.time,
        location: formData.venue.trim(),
        venue: formData.venue.trim(),
        location_type: formData.locationType,
        locationType: formData.locationType,
        topics: formData.notes.trim(),
        notes: formData.notes.trim(),
        status: 'SCHEDULED',
        meeting_status: 'SCHEDULED',
        is_completed: false,
        isCompleted: false,
        chapter_id: profile.chapter_id || (profile as any).chapterId || participant?.chapter_id || null,
        chapterId: profile.chapter_id || (profile as any).chapterId || participant?.chapter_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Direct insert into Supabase
      const { error: insertErr } = await supabase
        .from('one_to_one_meetings')
        .insert([meetingPayload]);

      if (insertErr) {
        // Fallback to databaseService if needed
        try {
          await databaseService.create('one_to_one_meetings', meetingPayload);
        } catch (dbErr: any) {
          throw insertErr;
        }
      }

      // Send notification to invited participant
      try {
        await notificationService.sendNotification({
          userId: formData.participantId,
          role: 'MEMBER',
          type: 'MEETING',
          title: 'New 1-to-1 Meeting Scheduled',
          message: `${profile.name || 'A member'} has scheduled a 1-to-1 meeting with you for ${formData.date} at ${formData.time}.`,
          relatedUserId: currentAuthId,
          link: '/one-to-one'
        });
      } catch (notifErr) {
        console.warn('1-to-1 notification error:', notifErr);
      }

      showSuccess('One-to-One Meeting scheduled successfully!');
      window.dispatchEvent(new CustomEvent('onetoone-updated'));
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));

      setFormData({
        title: '',
        participantId: '',
        date: '',
        time: '',
        venue: '',
        notes: '',
        locationType: 'In Person'
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Schedule 1-to-1 error:', err);
      const errMsg = err?.message || 'Failed to schedule meeting. Please try again.';
      setError(errMsg);
      showError(errMsg);
      scrollToError();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title="Schedule One-to-One Meeting"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Member Selector Dropdown */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
            Select Member <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full px-3.5 py-3 rounded-xl border border-white/10 bg-[#151C2E] cursor-pointer flex items-center justify-between text-left transition-all hover:border-primary/50"
            >
              {selectedMember ? (
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <Avatar
                    src={selectedMember.photoURL || selectedMember.photo_url || selectedMember.avatar_url}
                    name={selectedMember.displayName}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {selectedMember.displayName} <span className="text-xs font-semibold text-primary">({selectedMember.position})</span>
                    </p>
                    <p className="text-[10px] text-neutral-400 truncate">
                      {selectedMember.businessCategory} • {selectedMember.chapterName || 'Chapter'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-neutral-400 text-sm">
                  <Users size={16} />
                  <span>Choose a member...</span>
                </div>
              )}
              <ChevronRight size={16} className={cn('text-neutral-400 transition-transform', isDropdownOpen ? 'rotate-90' : '')} />
            </button>

            {isDropdownOpen && (
              <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-[#111827] rounded-xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in duration-150">
                {/* Filter Tabs */}
                <div className="flex border-b border-white/5 bg-[#151C2E]">
                  <button
                    type="button"
                    onClick={() => setMemberTab('my_chapter')}
                    className={cn(
                      'flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all text-center cursor-pointer',
                      memberTab === 'my_chapter' ? 'bg-primary/20 text-primary border-b-2 border-primary' : 'text-neutral-400 hover:text-white'
                    )}
                  >
                    My Chapter
                  </button>
                  <button
                    type="button"
                    onClick={() => setMemberTab('all')}
                    className={cn(
                      'flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all text-center cursor-pointer',
                      memberTab === 'all' ? 'bg-primary/20 text-primary border-b-2 border-primary' : 'text-neutral-400 hover:text-white'
                    )}
                  >
                    All Members
                  </button>
                </div>

                {/* Search */}
                <div className="p-2 border-b border-white/5 bg-[#151C2E]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={13} />
                    <input
                      type="text"
                      placeholder="Search member..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-white/5 bg-[#111827] text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* List */}
                <div className="max-h-48 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                  {filteredMembers.length > 0 ? (
                    filteredMembers.map((member) => (
                      <div
                        key={member.id}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, participantId: member.id }));
                          setIsDropdownOpen(false);
                        }}
                        className={cn(
                          'flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all hover:bg-[#151C2E]',
                          formData.participantId === member.id ? 'bg-primary/15 border border-primary/30' : ''
                        )}
                      >
                        <Avatar
                          src={member.photoURL || member.photo_url || member.avatar_url}
                          name={member.displayName}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate">{member.displayName}</p>
                          <p className="text-[10px] text-neutral-400 truncate">
                            {member.position} • {member.chapterName}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-4 text-xs text-neutral-400">No members found.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={13} className="text-primary" />
              <span>Date <span className="text-red-400">*</span></span>
            </label>
            <input
              required
              type="date"
              value={formData.date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3.5 py-3 bg-[#151C2E] border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={13} className="text-primary" />
              <span>Time <span className="text-red-400">*</span></span>
            </label>
            <input
              required
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="w-full px-3.5 py-3 bg-[#151C2E] border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm"
            />
          </div>
        </div>

        {/* Location Type & Venue */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              Meeting Mode
            </label>
            <div className="flex bg-[#151C2E] p-1 rounded-lg border border-white/5">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, locationType: 'In Person' })}
                className={cn(
                  'px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer',
                  formData.locationType === 'In Person' ? 'bg-primary text-white' : 'text-neutral-400 hover:text-white'
                )}
              >
                <MapPin size={12} />
                In Person
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, locationType: 'Online' })}
                className={cn(
                  'px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer',
                  formData.locationType === 'Online' ? 'bg-primary text-white' : 'text-neutral-400 hover:text-white'
                )}
              >
                <Video size={12} />
                Online
              </button>
            </div>
          </div>

          <input
            required
            type="text"
            value={formData.venue}
            onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
            placeholder={formData.locationType === 'Online' ? 'Google Meet / Zoom URL' : 'Cafe / Office Address / Location'}
            className="w-full px-3.5 py-3 bg-[#151C2E] border border-white/10 text-white placeholder-neutral-500 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm"
          />
        </div>

        {/* Discussion Topics */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
            Discussion Topics / Agenda (Optional)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Key collaboration opportunities, synergy, questions..."
            rows={2}
            className="w-full px-3.5 py-3 bg-[#151C2E] border border-white/10 text-white placeholder-neutral-500 rounded-xl focus:ring-2 focus:ring-primary outline-none resize-none text-sm"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-primary text-white rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Scheduling...</span>
              </>
            ) : (
              'Schedule Meeting'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
