import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Trash2, Edit2 } from 'lucide-react';
import { databaseService } from '../services/databaseService';
import { useAuth } from '../hooks/useAuth';
import { Meeting, UserProfile } from '../types';
import { where } from '../lib/database';
import { cn } from '../lib/utils';
import { getCleanFullName, isChapterLeaderRole } from '../utils/authUtils';
import {
  getISTNow,
  getMeetingTimestampInIST,
  isMeetingCancelled,
  isMeetingCompleted,
  isMeetingPending,
  isSameMeetingDate,
  parseMeetingDateParts
} from '../utils/recurringMeetingUtils';
import { showSuccess, showError } from '../services/toastService';

export type PresentationDisplayStatus = 'Upcoming' | 'Pending' | 'Completed' | 'Absent';

export function FuturePresentations() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [existingPresentations, setExistingPresentations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [, setNowTick] = useState<number>(() => Date.now());
  const syncedStatusRef = useRef<Record<string, string>>({});

  const [formData, setFormData] = useState({
    memberId: '',
    presentationDate: ''
  });

  const isAuthorized = profile?.role === 'MASTER_ADMIN' || isChapterLeaderRole(profile);
  const userChapId = profile?.chapter_id || (profile as any)?.chapterId;

  const loadData = async () => {
    try {
      const constraints = (profile?.role !== 'MASTER_ADMIN' && userChapId)
        ? [where('chapter_id', '==', userChapId)]
        : [];
      const membersList = await databaseService.list<UserProfile>('users', constraints);
      const filteredMembers = (membersList || [])
        .filter(m => m.role !== 'MASTER_ADMIN')
        .filter(m => {
          if (profile?.role === 'MASTER_ADMIN' || !userChapId) return true;
          const mChap = m.chapter_id || (m as any)?.chapterId;
          return !mChap || String(mChap) === String(userChapId);
        })
        .sort((a, b) => getCleanFullName(a.name).localeCompare(getCleanFullName(b.name)));
      setMembers(filteredMembers);

      const meetingsList = await databaseService.list<Meeting>('meetings', constraints);
      setMeetings(meetingsList || []);

      const presList = await databaseService.list<any>('future_presentations', []);
      const filteredPres = (presList || []).filter(p => {
        if (profile?.role === 'MASTER_ADMIN' || !userChapId) return true;
        const pChap = p.chapter_id || p.chapterId;
        if (pChap) return String(pChap) === String(userChapId);
        const mId = p.memberId || p.member_id;
        return filteredMembers.some(m => String(m.uid || m.id) === String(mId));
      });
      setExistingPresentations(filteredPres);
    } catch (err) {
      console.error('Error loading future presentations data:', err);
    }
  };

  useEffect(() => {
    loadData();

    const meetingConstraints = (profile?.role !== 'MASTER_ADMIN' && userChapId)
      ? [where('chapter_id', '==', userChapId)]
      : [];

    const unsubMeetings = databaseService.subscribe<Meeting>('meetings', meetingConstraints, (liveMeetings) => {
      setMeetings(liveMeetings || []);
    });

    const unsubPresentations = databaseService.subscribe<any>('future_presentations', [], (livePres) => {
      const filteredPres = (livePres || []).filter(p => {
        if (profile?.role === 'MASTER_ADMIN' || !userChapId) return true;
        const pChap = p.chapter_id || p.chapterId;
        if (pChap) return String(pChap) === String(userChapId);
        return true;
      });
      setExistingPresentations(filteredPres);
    });

    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 10000);

    return () => {
      unsubMeetings();
      unsubPresentations();
      clearInterval(timer);
    };
  }, [userChapId, profile?.role]);

  const formatDateDDMMYYYY = (dateVal: string) => {
    const parts = parseMeetingDateParts(dateVal);
    if (!parts) return dateVal;
    const dd = String(parts.day).padStart(2, '0');
    const mm = String(parts.month).padStart(2, '0');
    return `${dd}/${mm}/${parts.year}`;
  };

  const hasPresentationDatePassed = (dateVal: string, meetingTime?: string): boolean => {
    const parts = parseMeetingDateParts(dateVal, meetingTime || '07:30');
    if (!parts) return false;
    const istNow = getISTNow();
    const todayISTStr = `${istNow.year}-${String(istNow.month).padStart(2, '0')}-${String(istNow.day).padStart(2, '0')}`;
    if (parts.dateString < todayISTStr) {
      return true;
    }
    if (parts.dateString === todayISTStr && parts.timestampMs < Date.now()) {
      return true;
    }
    return false;
  };

  /**
   * Resolves the presentation status based on:
   * 1. Matching meeting (same date + same scheduled member / chapter)
   * 2. Attendance rule: if member is marked Absent on that meeting date -> "Absent"
   * 3. Meeting status:
   *    - Completed -> "Completed"
   *    - Pending -> "Pending"
   *    - Upcoming -> "Upcoming"
   * 4. Once the scheduled presentation date has passed, do not keep it as "Upcoming" (becomes "Pending" if not Completed/Absent).
   */
  const resolvePresentationStatus = (item: any): PresentationDisplayStatus => {
    const rawDate = item.presentationDate || item.presentation_date || '';
    const mId = String(item.memberId || item.member_id || '');
    const memberObj = members.find(
      m => String(m.uid || m.id) === mId || String(m.id) === mId || String(m.uid) === mId
    );
    const itemChap = item.chapter_id || item.chapterId || memberObj?.chapter_id || (memberObj as any)?.chapterId || userChapId;

    // Find meetings on the same date that correspond to the scheduled member / member's chapter
    const dateMatchedMeetings = meetings
      .filter(m => !isMeetingCancelled(m) && isSameMeetingDate(m.date, rawDate))
      .filter(m => {
        const att = m.attendance || {};
        const hasMemberInAttendance =
          (mId && att[mId] !== undefined) ||
          (memberObj?.uid && att[memberObj.uid] !== undefined) ||
          (memberObj?.id && att[memberObj.id] !== undefined);
        if (hasMemberInAttendance) return true;

        const mChap = m.chapter_id || (m as any)?.chapterId;
        if (mChap && itemChap) {
          return String(mChap) === String(itemChap);
        }
        return true;
      });

    if (dateMatchedMeetings.length > 0) {
      // Check Attendance Rule across matching meetings on that date
      for (const m of dateMatchedMeetings) {
        const att = m.attendance || {};
        const rawMemberAtt =
          (mId ? att[mId] : undefined) ??
          (memberObj?.uid ? att[memberObj.uid] : undefined) ??
          (memberObj?.id ? att[memberObj.id] : undefined);
        const attUpper = String(rawMemberAtt || '').trim().toUpperCase();
        if (attUpper === 'ABSENT' || attUpper === 'NO') {
          return 'Absent';
        }
      }

      // Prioritize completed meeting, then pending meeting, then upcoming meeting
      const completedMeeting = dateMatchedMeetings.find(m => isMeetingCompleted(m));
      if (completedMeeting) {
        return 'Completed';
      }

      const pendingMeeting = dateMatchedMeetings.find(m => isMeetingPending(m));
      if (pendingMeeting) {
        return 'Pending';
      }

      const primaryMeeting = dateMatchedMeetings[0];
      if (hasPresentationDatePassed(rawDate, primaryMeeting?.time)) {
        return 'Pending';
      }

      return 'Upcoming';
    }

    // No active meeting record found for this date: check stored status and whether date has passed
    const storedStatusUpper = String(item.status || '').trim().toUpperCase();
    if (storedStatusUpper === 'ABSENT') return 'Absent';
    if (storedStatusUpper === 'COMPLETED') return 'Completed';

    if (hasPresentationDatePassed(rawDate)) {
      return 'Pending';
    }

    return 'Upcoming';
  };

  // Automatically sync resolved presentation statuses to database when they change
  useEffect(() => {
    if (existingPresentations.length === 0) return;

    existingPresentations.forEach(item => {
      if (!item?.id) return;
      const computedStatus = resolvePresentationStatus(item);
      const currentStored = String(item.status || '');
      const lastSynced = syncedStatusRef.current[String(item.id)];

      if (currentStored !== computedStatus && lastSynced !== computedStatus) {
        syncedStatusRef.current[String(item.id)] = computedStatus;
        databaseService.update('future_presentations', item.id, {
          status: computedStatus,
          updatedAt: new Date().toISOString()
        }).catch(() => {});
      }
    });
  }, [existingPresentations, meetings, members]);

  /**
   * Sort all scheduled presentations by date:
   * 1. Most upcoming presentation first.
   * 2. Second most upcoming presentation next.
   * 3. Continue in chronological order.
   */
  const sortedPresentations = useMemo(() => {
    return [...existingPresentations].sort((a, b) => {
      const statusA = resolvePresentationStatus(a);
      const statusB = resolvePresentationStatus(b);

      const isUpcomingA = statusA === 'Upcoming';
      const isUpcomingB = statusB === 'Upcoming';

      // Ensure upcoming presentations are at the top so the most upcoming is #1, second most upcoming is #2, etc.
      if (isUpcomingA !== isUpcomingB) {
        return isUpcomingA ? -1 : 1;
      }

      const dateA = a.presentationDate || a.presentation_date || '';
      const dateB = b.presentationDate || b.presentation_date || '';
      const timeA = getMeetingTimestampInIST(dateA, '07:30');
      const timeB = getMeetingTimestampInIST(dateB, '07:30');

      if (timeA !== timeB) {
        return timeA - timeB;
      }

      const nameA = String(a.memberName || a.member_name || '');
      const nameB = String(b.memberName || b.member_name || '');
      return nameA.localeCompare(nameB);
    });
  }, [existingPresentations, meetings, members]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) {
      showError('Only authorized roles can manage Feature Presentations.');
      return;
    }
    if (!formData.memberId || !formData.presentationDate) {
      showError('Please select both a Member and Presentation Date.');
      return;
    }

    const isDuplicate = existingPresentations.some(p => {
      if (editingId && String(p.id) === String(editingId)) return false;
      const pStatus = String(p.status || '').toUpperCase();
      if (pStatus === 'CANCELLED') return false;
      const pMemberId = String(p.memberId || p.member_id || '');
      const pDate = p.presentationDate || p.presentation_date || '';
      return pMemberId === String(formData.memberId) && isSameMeetingDate(pDate, formData.presentationDate);
    });

    if (isDuplicate) {
      showError('A Feature Presentation is already scheduled for this member on this date.');
      return;
    }

    const selectedMember = members.find(m => String(m.uid || m.id) === String(formData.memberId));
    const memberName = selectedMember ? getCleanFullName(selectedMember.name) : '';
    const memberCategory = selectedMember?.category || (selectedMember as any)?.business_category || (selectedMember as any)?.businessCategory || '';
    const chapterId = selectedMember?.chapter_id || (selectedMember as any)?.chapterId || userChapId || null;

    const computedStatus = resolvePresentationStatus({
      memberId: formData.memberId,
      presentationDate: formData.presentationDate,
      chapter_id: chapterId
    });

    setLoading(true);
    try {
      if (editingId) {
        await databaseService.update('future_presentations', editingId, {
          memberId: formData.memberId,
          memberName,
          memberCategory,
          chapter_id: chapterId,
          presentationDate: formData.presentationDate,
          status: computedStatus,
          updatedAt: new Date().toISOString()
        });
        showSuccess('Feature Presentation updated successfully.');
        setEditingId(null);
      } else {
        await databaseService.create('future_presentations', {
          memberId: formData.memberId,
          memberName,
          memberCategory,
          chapter_id: chapterId,
          presentationDate: formData.presentationDate,
          status: computedStatus,
          createdAt: new Date().toISOString(),
          createdBy: profile?.uid || profile?.id
        });
        showSuccess('Feature Presentation scheduled successfully.');
      }

      setFormData({ memberId: '', presentationDate: '' });
      await loadData();
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));
      navigate('/meetings');
    } catch (err) {
      showError('Failed to save Feature Presentation.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    const parts = parseMeetingDateParts(item.presentationDate || item.presentation_date);
    setFormData({
      memberId: item.memberId || item.member_id || '',
      presentationDate: parts ? parts.dateString : (item.presentationDate || item.presentation_date || '')
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await databaseService.delete('future_presentations', id);
      showSuccess('Feature Presentation removed.');
      await loadData();
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));
    } catch (err) {
      showError('Failed to remove Feature Presentation.');
    }
  };

  const getStatusBadgeClasses = (status: PresentationDisplayStatus) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Pending':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Absent':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'Upcoming':
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-8">
      <header className="flex items-center gap-4 border-b border-white/5 pb-6">
        <div className="w-12 h-12 bg-primary/10 text-primary rounded-[16px] flex items-center justify-center shrink-0">
          <Calendar size={24} />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight uppercase">
            Feature Presentation
          </h1>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-[0.15em] mt-0.5">
            Schedule member presentations for upcoming chapter meetings
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="bg-[#111827] p-5 sm:p-6 rounded-[20px] border border-white/5 space-y-5 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">
              Select Member <span className="text-red-500">*</span>
            </label>
            <select
              required
              className="w-full bg-[#0B1220] border border-white/10 px-3.5 py-3 rounded-xl text-sm font-semibold text-white focus:border-red-500 outline-none transition-colors"
              value={formData.memberId}
              onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
            >
              <option value="">Select a member</option>
              {members.map(m => {
                const mId = m.uid || m.id;
                const mCat = m.category || (m as any).business_category || (m as any).businessCategory || 'No Category';
                return (
                  <option key={mId} value={mId}>
                    {getCleanFullName(m.name)} — Category: {mCat}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">
              Presentation Date <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="date"
              className="w-full bg-[#0B1220] border border-white/10 px-3.5 py-3 rounded-xl text-sm font-semibold text-white focus:border-red-500 outline-none transition-colors"
              value={formData.presentationDate}
              onChange={(e) => setFormData({ ...formData, presentationDate: e.target.value })}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setFormData({ memberId: '', presentationDate: '' });
              }}
              className="px-5 py-3 bg-[#151C2E] hover:bg-[#1C2538] text-neutral-300 font-bold text-xs uppercase tracking-wider rounded-xl border border-white/10 transition-all cursor-pointer"
            >
              Cancel Edit
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all shadow-lg shadow-red-600/20 cursor-pointer"
          >
            {loading ? 'Saving...' : editingId ? 'Update Presentation' : 'Save Presentation'}
          </button>
        </div>
      </form>

      {/* Scheduled Presentations List */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <div className="w-1.5 h-5 bg-red-500 rounded-full" />
          <h2 className="text-sm font-bold text-white uppercase tracking-widest">
            Scheduled Presentations ({sortedPresentations.length})
          </h2>
        </div>

        {sortedPresentations.length === 0 ? (
          <div className="bg-[#111827] border border-dashed border-white/10 rounded-[20px] p-8 text-center text-xs font-semibold text-neutral-400">
            No Feature Presentations scheduled yet.
          </div>
        ) : (
          <div className="bg-[#111827] border border-white/5 rounded-[20px] divide-y divide-white/5 overflow-hidden">
            {sortedPresentations.map((item) => {
              const mId = item.memberId || item.member_id;
              const memberObj = members.find(
                m => String(m.uid || m.id) === String(mId) || String(m.id) === String(mId) || String(m.uid) === String(mId)
              );
              const displayName = item.memberName || item.member_name || (memberObj ? getCleanFullName(memberObj.name) : 'Member');
              const rawDate = item.presentationDate || item.presentation_date || '';
              const displayStatus = resolvePresentationStatus(item);

              return (
                <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#151C2E]/60 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-sm font-bold text-white">
                        Feature Presentation by {displayName}
                      </span>
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border",
                        getStatusBadgeClasses(displayStatus)
                      )}>
                        {displayStatus}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-400 font-medium">
                      <Calendar size={13} className="text-red-400" />
                      <span>Scheduled Date: <strong className="text-neutral-200">{formatDateDDMMYYYY(rawDate)}</strong></span>
                    </div>
                  </div>

                  {isAuthorized && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        className="px-3 py-1.5 bg-[#151C2E] hover:bg-[#1C2538] text-neutral-200 border border-white/10 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Edit2 size={12} />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
