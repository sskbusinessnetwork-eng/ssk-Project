import React, { useState } from 'react';
import { Modal } from '../Modal';
import { UserProfile } from '../../types';
import { Building2, ArrowRight } from 'lucide-react';

interface TransferMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (memberId: string, newChapterId: string) => void;
  members: UserProfile[];
  chapters: { id: string; chapter_name: string }[];
  preSelectedMember?: UserProfile | null;
}

export function TransferMemberModal({
  isOpen,
  onClose,
  onConfirm,
  members,
  chapters,
  preSelectedMember
}: TransferMemberModalProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string>(preSelectedMember?.uid || preSelectedMember?.id || '');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [step, setStep] = useState<'selection' | 'confirmation'>('selection');

  const selectedMember = members.find(m => (m.uid || m.id) === selectedMemberId);
  const targetChapter = chapters.find(c => c.id === selectedChapterId);

  const handleReset = () => {
    setSelectedMemberId(preSelectedMember?.uid || preSelectedMember?.id || '');
    setSelectedChapterId('');
    setStep('selection');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Transfer Member">
      {step === 'selection' ? (
        <div className="space-y-4 py-4">
          {!preSelectedMember && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-400 uppercase">Select Member</label>
              <select 
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full h-11 px-4 bg-[#0F172A] border border-white/10 rounded-lg text-white text-sm outline-none"
              >
                <option value="">Select a member...</option>
                {members.map(m => <option key={m.uid || m.id} value={m.uid || m.id}>{m.name || m.displayName}</option>)}
              </select>
            </div>
          )}

          {selectedMember && (
            <div className="p-4 bg-[#0F172A] rounded-lg border border-white/5">
              <p className="text-xs text-neutral-400 font-bold uppercase">Current Chapter</p>
              <p className="text-white font-bold">{selectedMember.chapter_name || selectedMember.chapterName || 'No Chapter'}</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-400 uppercase">Transfer To</label>
            <select 
              value={selectedChapterId}
              onChange={(e) => setSelectedChapterId(e.target.value)}
              className="w-full h-11 px-4 bg-[#0F172A] border border-white/10 rounded-lg text-white text-sm outline-none"
            >
              <option value="">Select a chapter...</option>
              {chapters.filter(c => c.id !== selectedMember?.chapter_id && c.id !== (selectedMember as any)?.chapterId).map(c => (
                <option key={c.id} value={c.id}>{c.chapter_name}</option>
              ))}
            </select>
          </div>

          <button
            disabled={!selectedMemberId || !selectedChapterId}
            onClick={() => setStep('confirmation')}
            className="w-full py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 disabled:opacity-50"
          >
            Review Transfer
          </button>
        </div>
      ) : (
        <div className="space-y-6 py-4">
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-amber-500 text-sm font-bold text-center">Are you sure?</p>
            <p className="text-neutral-400 text-xs text-center mt-2">
              This will transfer <strong className="text-white">{selectedMember?.name}</strong> from <strong className="text-white">{selectedMember?.chapter_name || selectedMember?.chapterName || 'Current Chapter'}</strong> to <strong className="text-white">{targetChapter?.chapter_name}</strong>.
            </p>
            <p className="text-neutral-500 text-[10px] text-center mt-4">
              Historical data will remain with the old chapter. Only the current active chapter will change.
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setStep('selection')}
              className="flex-1 py-3 bg-neutral-800 text-white rounded-lg font-bold"
            >
              Back
            </button>
            <button
              onClick={() => {
                onConfirm(selectedMemberId, selectedChapterId);
                handleClose();
              }}
              className="flex-1 py-3 bg-primary text-white rounded-lg font-bold"
            >
              Confirm Transfer
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
