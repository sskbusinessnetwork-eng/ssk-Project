import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Crown, PlusCircle } from 'lucide-react';
import { Positions } from './Positions';
import { CreateChapter } from '../components/CreateChapter'; // We will create this

export function ManageChapter() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'positions' | 'create'>('positions');

  const isMasterAdmin = profile?.role === 'MASTER_ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Manage Chapter</h1>
          <p className="text-sm text-neutral-500">Create chapters and manage leadership positions.</p>
        </div>
      </div>

      {isMasterAdmin && (
        <div className="flex bg-neutral-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('positions')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'positions'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Manage Positions
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'create'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
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
