import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';

export interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  categories: Array<{ id?: string; name: string }>;
  placeholder?: string;
  defaultOptionLabel?: string;
  allowAllOption?: boolean;
  className?: string;
  lightTheme?: boolean;
  disabled?: boolean;
  required?: boolean;
  icon?: React.ReactNode;
  id?: string;
}

export function CategorySelect({
  value,
  onChange,
  categories = [],
  placeholder = 'Select Category',
  defaultOptionLabel,
  allowAllOption = false,
  className = '',
  lightTheme = false,
  disabled = false,
  required = false,
  icon,
  id,
}: CategorySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Auto focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  // Sort categories alphabetically
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
    );
  }, [categories]);

  // Filter categories case-insensitively
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return sortedCategories;
    const term = searchTerm.toLowerCase().trim();
    return sortedCategories.filter(cat => (cat.name || '').toLowerCase().includes(term));
  }, [sortedCategories, searchTerm]);

  const handleSelect = (categoryName: string) => {
    onChange(categoryName);
    setIsOpen(false);
    setSearchTerm('');
  };

  const selectedDisplay = value
    ? value
    : allowAllOption
    ? defaultOptionLabel || 'All Categories'
    : placeholder || defaultOptionLabel || 'Select Category';

  const defaultAllText = defaultOptionLabel || (allowAllOption ? 'All Categories' : 'Select Category');

  return (
    <div className="relative w-full" ref={containerRef} id={id}>
      {/* Hidden input for HTML form validation if required */}
      {required && (
        <input
          type="text"
          value={value}
          onChange={() => {}}
          required={required}
          className="sr-only opacity-0 w-0 h-0 absolute pointer-events-none"
          tabIndex={-1}
        />
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={
          className ||
          (lightTheme
            ? `w-full h-11 px-4 rounded-[12px] bg-white border border-[#E5E7EB] focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] outline-none transition-all font-medium text-sm text-[#0F2040] flex items-center justify-between cursor-pointer ${
                disabled ? 'opacity-50 cursor-not-allowed' : ''
              }`
            : `w-full h-11 px-4 rounded-[12px] bg-[#151C2E] border border-white/5 focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none transition-all text-sm font-semibold text-white flex items-center justify-between cursor-pointer ${
                disabled ? 'opacity-50 cursor-not-allowed' : ''
              }`)
        }
      >
        <div className="flex items-center gap-2 truncate pr-2">
          {icon}
          <span className={`truncate ${!value && !allowAllOption ? (lightTheme ? 'text-[#9CA3AF]' : 'text-neutral-400') : ''}`}>
            {selectedDisplay}
          </span>
        </div>
        <ChevronDown
          size={16}
          className={`shrink-0 transition-transform duration-200 ${
            lightTheme ? 'text-[#6B7280]' : 'text-neutral-400'
          } ${isOpen ? 'rotate-180 text-primary' : ''}`}
        />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 top-full mt-1.5 z-50 rounded-[14px] shadow-2xl border overflow-hidden transition-all duration-150 animate-in fade-in slide-in-from-top-1 ${
            lightTheme
              ? 'bg-white border-[#E5E7EB] text-[#0F2040]'
              : 'bg-[#151C2E] border-white/10 text-white'
          }`}
        >
          {/* Search Bar */}
          <div className={`p-2.5 border-b ${lightTheme ? 'border-[#E5E7EB] bg-[#F9FAFB]' : 'border-white/5 bg-[#111827]/60'}`}>
            <div className="relative flex items-center">
              <Search
                size={15}
                className={`absolute left-3 ${lightTheme ? 'text-[#9CA3AF]' : 'text-neutral-400'}`}
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search category..."
                className={`w-full h-9 pl-9 pr-8 text-xs font-medium rounded-lg outline-none transition-all ${
                  lightTheme
                    ? 'bg-white border border-[#E5E7EB] text-[#0F2040] focus:border-[#F97316] placeholder:text-[#9CA3AF]'
                    : 'bg-[#0F172A] border border-white/10 text-white focus:border-primary placeholder:text-neutral-500'
                }`}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className={`absolute right-2.5 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 ${
                    lightTheme ? 'text-[#6B7280]' : 'text-neutral-400'
                  }`}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
            {allowAllOption && (
              <button
                type="button"
                onClick={() => handleSelect('')}
                className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                  value === ''
                    ? lightTheme
                      ? 'bg-[#F97316]/10 text-[#F97316]'
                      : 'bg-primary/20 text-primary font-bold'
                    : lightTheme
                    ? 'hover:bg-[#F3F4F6] text-[#4B5563]'
                    : 'hover:bg-white/5 text-neutral-300'
                }`}
              >
                <span>{defaultAllText}</span>
                {value === '' && <Check size={14} className="shrink-0" />}
              </button>
            )}

            {filteredCategories.length > 0 ? (
              filteredCategories.map((cat) => {
                const isSelected = value === cat.name;
                return (
                  <button
                    key={cat.id || cat.name}
                    type="button"
                    onClick={() => handleSelect(cat.name)}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? lightTheme
                          ? 'bg-[#F97316]/10 text-[#F97316]'
                          : 'bg-primary/20 text-primary font-bold'
                        : lightTheme
                        ? 'hover:bg-[#F3F4F6] text-[#1F2937]'
                        : 'hover:bg-white/5 text-neutral-200'
                    }`}
                  >
                    <span className="truncate">{cat.name}</span>
                    {isSelected && <Check size={14} className="shrink-0 ml-2 text-primary" />}
                  </button>
                );
              })
            ) : (
              <div className="py-6 text-center text-xs font-semibold text-neutral-400">
                No categories found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
