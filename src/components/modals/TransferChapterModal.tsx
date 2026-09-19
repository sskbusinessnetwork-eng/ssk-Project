import React, { useState } from 'react';
import { Modal } from '../Modal';
import { UserProfile } from '../../types';

interface TransferChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newChapterId: string) => void;
  member: UserProfile | null;
  chapters: { id: string; chapter_name: string }[];
  isSubmitting: boolean;
}

export function TransferChapterModal({
  isOpen,
  onClose,
  onSubmit,
  member,
  chapters,
  isSubmitting
}: TransferChapterModalProps) {
  const [selectedChapterId, setSelectedChapterId] = useState('');

  if (!member) return null;

  const currentChapter = chapters.find(c => c.id === member.chapter_id);
  const newChapter = chapters.find(c => c.id === selectedChapterId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Transfer Member Chapter"
    >
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(selectedChapterId); }} className="space-y-6 py-4">
        <div className="space-y-4">
          <div className="p-4 bg-neutral-50 rounded-xl">
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Member</p>
            <p className="text-sm font-bold text-neutral-900">{member.name}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-neutral-50 rounded-xl">
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Current Chapter</p>
              <p className="text-sm font-bold text-neutral-900">{currentChapter?.chapter_name || 'Unknown'}</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">New Chapter</label>
              <select
                required
                value={selectedChapterId}
                onChange={(e) => setSelectedChapterId(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-200 rounded-lg text-sm font-medium focus:border-primary outline-none"
              >
                <option value="">Select a chapter</option>
                {chapters.map(chap => (
                  chap.id !== member.chapter_id && (
                    <option key={chap.id} value={chap.id}>{chap.chapter_name}</option>
                  )
                ))}
              </select>
            </div>
          </div>
        </div>

        {newChapter && (
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
            <p className="text-xs font-bold text-amber-800">
              Transfer {member.name} from {currentChapter?.chapter_name} to {newChapter.chapter_name}?
            </p>
            <p className="text-[10px] text-amber-700 mt-1">
              The member will be removed from the current chapter and assigned to the new chapter. All historical records (referrals, TYS, meetings, etc.) will remain preserved in {currentChapter?.chapter_name}.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-neutral-100 text-neutral-600 rounded-[12px] font-bold hover:bg-neutral-200 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !selectedChapterId}
            className="flex-1 py-3 bg-primary text-white rounded-[12px] font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
          >
            {isSubmitting ? 'Transferring...' : 'Confirm Transfer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
