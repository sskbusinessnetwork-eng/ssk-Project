import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { toast, ToastItem } from '../services/toastService';

export function GlobalToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const unsubscribe = toast.subscribe((updatedToasts) => {
      setToasts(updatedToasts);
    });
    return () => unsubscribe();
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="assertive"
      className="fixed top-4 sm:top-6 left-3 right-3 sm:left-auto sm:right-6 z-[99999] pointer-events-none flex flex-col gap-3 max-w-md sm:w-full items-center sm:items-end"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => {
          const isError = t.type === 'error';
          const isSuccess = t.type === 'success';
          const isWarning = t.type === 'warning';

          const borderColor = isError
            ? 'border-red-500/40 bg-[#171A29]'
            : isSuccess
            ? 'border-emerald-500/40 bg-[#122320]'
            : isWarning
            ? 'border-amber-500/40 bg-[#251E14]'
            : 'border-blue-500/40 bg-[#141C2B]';

          const accentColor = isError
            ? 'bg-red-500'
            : isSuccess
            ? 'bg-emerald-500'
            : isWarning
            ? 'bg-amber-500'
            : 'bg-blue-500';

          const iconColor = isError
            ? 'text-red-400'
            : isSuccess
            ? 'text-emerald-400'
            : isWarning
            ? 'text-amber-400'
            : 'text-blue-400';

          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -16 }}
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              role="alert"
              className={`pointer-events-auto relative w-full rounded-2xl border ${borderColor} shadow-2xl backdrop-blur-2xl overflow-hidden p-4 sm:p-5 flex flex-col gap-3 text-white`}
              style={{
                boxShadow: isError 
                  ? '0 20px 40px -15px rgba(239, 68, 68, 0.25), 0 0 0 1px rgba(239, 68, 68, 0.15)'
                  : '0 20px 40px -15px rgba(0, 0, 0, 0.5)'
              }}
            >
              {/* Top Accent Strip */}
              <div className={`absolute top-0 left-0 right-0 h-1 ${accentColor}`} />

              <div className="flex items-start gap-3.5 pt-0.5">
                {/* Icon */}
                <div className={`shrink-0 p-2 rounded-xl bg-white/5 ${iconColor} mt-0.5 flex items-center justify-center`}>
                  {isError && <AlertCircle size={20} />}
                  {isWarning && <AlertTriangle size={20} />}
                  {isSuccess && <CheckCircle2 size={20} />}
                  {t.type === 'info' && <Info size={20} />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-white">
                      {t.title}
                    </h4>
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-200 mt-1 leading-relaxed break-words font-medium">
                    {t.message}
                  </p>
                </div>

                {/* Dismiss Button */}
                <button
                  type="button"
                  onClick={() => toast.removeToast(t.id)}
                  aria-label="Close notification"
                  className="shrink-0 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer active:scale-95"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Action Button or Footer if provided */}
              <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] text-neutral-400">
                <span>{isError ? 'Action required' : 'Notification'}</span>
                <div className="flex items-center gap-3">
                  {t.action && (
                    <button
                      type="button"
                      onClick={() => {
                        t.action?.onClick();
                        toast.removeToast(t.id);
                      }}
                      className="font-bold text-xs text-primary hover:underline cursor-pointer"
                    >
                      {t.action.label}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => toast.removeToast(t.id)}
                    className="font-bold tracking-wider text-[11px] uppercase text-neutral-300 hover:text-white transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
