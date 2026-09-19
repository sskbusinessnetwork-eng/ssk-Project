import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Theme Selection"
      className={cn(
        "relative flex items-center p-0.5 sm:p-1 rounded-full transition-all shrink-0 select-none",
        theme === 'day'
          ? "bg-[#F1F5F9] border border-[#CBD5E1] shadow-inner"
          : "bg-[#111827] border border-white/10 shadow-inner",
        className
      )}
    >
      {/* Option 1: Default (Dark) */}
      <button
        type="button"
        role="radio"
        aria-checked={theme === 'default'}
        onClick={() => setTheme('default')}
        title="Default Theme (Original Dark Theme)"
        className={cn(
          "relative z-10 flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold transition-all cursor-pointer",
          theme === 'default'
            ? "text-white shadow-sm"
            : theme === 'day'
              ? "text-[#64748B] hover:text-[#0F172A]"
              : "text-[#9CA3AF] hover:text-white"
        )}
      >
        {theme === 'default' && (
          <motion.div
            layoutId="themeTogglePill"
            transition={{ type: "spring", stiffness: 450, damping: 30 }}
            className="absolute inset-0 bg-[#E53935] rounded-full shadow-sm"
          />
        )}
        <Moon size={12} className="relative z-10 shrink-0" />
        <span className="relative z-10 whitespace-nowrap">Default</span>
      </button>

      {/* Option 2: Day (Light) */}
      <button
        type="button"
        role="radio"
        aria-checked={theme === 'day'}
        onClick={() => setTheme('day')}
        title="Day Theme (Clean Light Theme)"
        className={cn(
          "relative z-10 flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold transition-all cursor-pointer",
          theme === 'day'
            ? "text-[#0F172A] shadow-sm font-extrabold"
            : "text-[#9CA3AF] hover:text-white"
        )}
      >
        {theme === 'day' && (
          <motion.div
            layoutId="themeTogglePill"
            transition={{ type: "spring", stiffness: 450, damping: 30 }}
            className="absolute inset-0 bg-white border border-[#CBD5E1] shadow-sm rounded-full"
          />
        )}
        <Sun size={12} className={cn("relative z-10 shrink-0", theme === 'day' ? "text-amber-500" : "")} />
        <span className="relative z-10 whitespace-nowrap">Day</span>
      </button>
    </div>
  );
}
