import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Crown, PlusCircle } from 'lucide-react';
import { Positions } from './Positions';
import { CreateChapter } from '../components/CreateChapter';

export function ManageChapter() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'positions' | 'create'>('positions');

  const isMasterAdmin = profile?.role === 'MASTER_ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Manage Chapter</h1>
          <p className="text-sm text-neutral-400">Create chapters and manage leadership positions.</p>
        </div>
      </div>

      {isMasterAdmin && (
        <div className="flex bg-white/5 p-1 rounded-xl w-fit border border-white/10">
          <button
            onClick={() => setActiveTab('positions')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'positions'
                ? 'bg-primary text-white shadow-[0_0_15px_rgba(229,57,53,0.3)]'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Manage Positions
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'create'
                ? 'bg-primary text-white shadow-[0_0_15px_rgba(229,57,53,0.3)]'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <PlusCircle size={16} />
            Create Chapter
          </button>
        </div>
      )}

      {activeTab === 'positions' ? <Positions /> : <CreateChapter />}
    </div>
  );
}
