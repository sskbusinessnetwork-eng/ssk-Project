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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 pb-[calc(92px+env(safe-area-inset-bottom,16px))] sm:pb-6 overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-xl transition-all duration-500"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`relative w-full ${maxWidth} bg-card backdrop-blur-2xl rounded-2xl sm:rounded-[24px] shadow-2xl overflow-hidden border border-white/5 flex flex-col max-h-[calc(100dvh-120px)] sm:max-h-[85vh] my-auto`}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-primary shrink-0" />
            
            {/* Header */}
            <div className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-white/5 shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-1.5 h-5 sm:h-6 bg-primary rounded-full" />
                <h2 className="text-base sm:text-xl font-bold text-text-primary uppercase tracking-widest">{title}</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 sm:p-2 bg-muted hover:bg-border rounded-xl transition-all text-text-secondary hover:text-text-primary active:scale-90 cursor-pointer"
              >
                <X size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar text-text-primary">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
