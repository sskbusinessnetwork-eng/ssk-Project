import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ isOpen, onClose, title, children, maxWidth = "max-w-2xl" }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#0B0B0D]/70 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 30 }}
            transition={{ type: "spring", damping: 28, stiffness: 320, mass: 0.8 }}
            className={`relative w-full ${maxWidth} bg-white rounded-t-[28px] sm:rounded-[24px] shadow-[0_20px_60px_rgba(11,11,13,0.15)] overflow-hidden border border-border max-h-[92vh] flex flex-col`}
          >
            {/* Header */}
            <div className="shrink-0 px-5 sm:px-6 md:px-8 pt-5 sm:pt-6 pb-4 border-b border-border bg-gradient-to-b from-neutral-50/50 to-white">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-1 h-6 bg-primary rounded-full shrink-0" />
                  <h2 className="text-[17px] sm:text-[18px] font-bold text-[#111827] tracking-tight truncate">
                    {title}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-muted rounded-xl transition-all text-text-secondary hover:text-[#111827] active:scale-90 shrink-0"
                  aria-label="Close modal"
                >
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-5 sm:px-6 md:px-8 py-5 sm:py-6 text-[#111827]">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
