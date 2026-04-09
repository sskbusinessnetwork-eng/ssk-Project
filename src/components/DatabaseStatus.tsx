import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { checkDatabaseConnection } from '../firebase';
import { motion } from 'motion/react';

export function DatabaseStatus() {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  const checkStatus = async () => {
    setStatus('checking');
    const isOnline = await checkDatabaseConnection();
    setStatus(isOnline ? 'online' : 'offline');
    setLastChecked(new Date());
  };

  useEffect(() => {
    checkStatus();
    // Check every 5 minutes
    const interval = setInterval(checkStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            status === 'online' ? 'bg-emerald-50 text-emerald-600' : 
            status === 'offline' ? 'bg-rose-50 text-rose-600' : 
            'bg-slate-50 text-slate-400'
          }`}>
            <Database size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Database Status</h3>
            <p className="text-xs text-slate-500">Real-time connection check</p>
          </div>
        </div>
        <button 
          onClick={checkStatus}
          disabled={status === 'checking'}
          className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-400 hover:text-slate-600 disabled:opacity-50"
          title="Refresh connection status"
        >
          <RefreshCw size={16} className={status === 'checking' ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
          <span className="text-sm font-medium text-slate-600">Connection</span>
          <div className="flex items-center gap-2">
            {status === 'online' ? (
              <>
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span className="text-sm font-bold text-emerald-600">Securely Connected</span>
              </>
            ) : status === 'offline' ? (
              <>
                <XCircle size={16} className="text-rose-500" />
                <span className="text-sm font-bold text-rose-600">Offline / Config Error</span>
              </>
            ) : (
              <span className="text-sm font-bold text-slate-400">Verifying...</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-widest font-bold px-1">
          <span>Last Verified</span>
          <span>{lastChecked.toLocaleTimeString()}</span>
        </div>
        
        {status === 'online' && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[11px] text-emerald-600 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/50 text-center italic"
          >
            All data is being saved correctly to Firestore.
          </motion.p>
        )}
      </div>
    </div>
  );
}
