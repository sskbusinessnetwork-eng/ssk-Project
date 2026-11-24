import React, { useState, useEffect, useMemo, useRef, useDeferredValue } from 'react';
import { Search, ChevronDown, X, Check, Building2, Users, Tag } from 'lucide-react';
import { cn } from '../lib/utils';
import { getCleanFullName, getDisplayPosition } from '../utils/authUtils';

export interface NormalizedMemberOption {
  id: string;
  displayName: string;
  category: string;
  chapterId: string;
  chapterName: string;
  position: string;
  phone: string;
  photoURL: string;
}

export function extractMemberExtraData(rawPhoto: any): Record<string, any> {
  if (typeof rawPhoto !== 'string') return {};
  const trimmed = rawPhoto.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        if (parsed.extra && typeof parsed.extra === 'object') return parsed.extra;
        return parsed;
      }
    } catch {
      return {};
    }
  }
  if (rawPhoto.includes('|||')) {
    try {
      return JSON.parse(rawPhoto.split('|||')[1] || '{}') || {};
    } catch {
      return {};
    }
  }
  return {};
}

export function extractCleanPhotoUrl(rawPhoto: any): string {
  if (typeof rawPhoto !== 'string') return '';
  const trimmed = rawPhoto.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        return typeof parsed.url === 'string' ? parsed.url : '';
      }
    } catch {
      return '';
    }
  }
  return rawPhoto.includes('|||') ? rawPhoto.split('|||')[0] : rawPhoto;
}

export function buildCategoryLookup(categoriesRows: any[] | null | undefined): {
  categoryMap: Map<string, string>;
  validCategoryNames: Set<string>;
} {
  const categoryMap = new Map<string, string>();
  const validCategoryNames = new Set<string>();
  (categoriesRows || []).forEach((cat: any) => {
    const cleanName = String(cat?.name || '').trim();
    if (cleanName) {
      validCategoryNames.add(cleanName.toLowerCase());
      if (cat?.id) {
        categoryMap.set(String(cat.id).trim().toLowerCase(), cleanName);
      }
    }
  });
  return { categoryMap, validCategoryNames };
}

function firstNonEmpty(...values: any[]): string {
  for (const v of values) {
    if (v !== undefined && v !== null) {
      const s = String(v).trim();
      if (s && s.toLowerCase() !== 'null' && s.toLowerCase() !== 'undefined') {
        return s;
      }
    }
  }
  return '';
}

export function resolveMemberCategory(
  u: any,
  extraDataInput?: Record<string, any>,
  categoryMap?: Map<string, string>,
  validCategoryNames?: Set<string>
): string {
  const extraData =
    extraDataInput || extractMemberExtraData(u?.profile_photo || u?.photo_url || u?.photoURL || '');

  const rawDbCat = firstNonEmpty(u?.category);
  const rawExtraCat = firstNonEmpty(extraData?.category);

  let primaryCat = '';
  if (rawExtraCat && rawDbCat) {
    if (rawExtraCat.toLowerCase() === rawDbCat.toLowerCase()) {
      primaryCat = rawExtraCat;
    } else if (
      validCategoryNames &&
      validCategoryNames.size > 0 &&
      validCategoryNames.has(rawDbCat.toLowerCase()) &&
      !validCategoryNames.has(rawExtraCat.toLowerCase())
    ) {
      // Admin renamed a category on users.category while profile_photo extraData kept the old name
      primaryCat = rawDbCat;
    } else {
      // Historically database.ts stripped category on profile/member edits and wrote it only into extraData.category
      primaryCat = rawExtraCat;
    }
  } else {
    primaryCat = rawExtraCat || rawDbCat;
  }

  const rawCategoryId = firstNonEmpty(
    u?.category_id,
    u?.categoryId,
    extraData?.category_id,
    extraData?.categoryId
  );
  const mappedCatFromId =
    rawCategoryId && categoryMap ? categoryMap.get(rawCategoryId.toLowerCase()) || '' : '';

  return (
    firstNonEmpty(
      primaryCat,
      extraData?.business_category,
      u?.business_category,
      extraData?.businessCategory,
      u?.businessCategory,
      mappedCatFromId,
      extraData?.profession_designation,
      u?.profession_designation,
      extraData?.designation,
      u?.designation,
      extraData?.business_name,
      u?.business_name,
      u?.businessName,
      extraData?.businessName,
      u?.companyName
    ) || 'Business Owner'
  );
}

export function normalizeMemberOption(
  u: any,
  chapterMap: Map<string, string>,
  categoryMap?: Map<string, string>,
  validCategoryNames?: Set<string>
): NormalizedMemberOption | null {
  const id = String(u?.id || u?.uid || '').trim();
  if (!id) return null;

  const rawPhoto = u.profile_photo || u.photo_url || u.photoURL || '';
  const extraData = extractMemberExtraData(rawPhoto);
  const photoURL = extractCleanPhotoUrl(rawPhoto);
  const rawName = u.name || u.full_name || u.displayName || extraData.name || extraData.full_name || '';
  const displayName = getCleanFullName(rawName);

  const chapId = String(u.chapter_id || u.chapterId || extraData.chapter_id || extraData.chapterId || '').trim();
  const mappedChapName = chapId ? chapterMap.get(chapId.toLowerCase()) || '' : '';
  const chapterName = String(
    mappedChapName ||
      u.chapter_name ||
      u.chapterName ||
      extraData.chapter_name ||
      extraData.chapterName ||
      ''
  ).trim();

  const category = resolveMemberCategory(u, extraData, categoryMap, validCategoryNames);

  const rawPos = String(u.position || extraData.position || u.chapter_position || extraData.chapter_position || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ');
  const rawRole = String(u.role || '').trim().toUpperCase();
  let position = '';
  if (rawRole === 'PRESIDENT' || rawPos === 'president') position = 'President';
  else if (rawRole === 'VICE_PRESIDENT' || rawPos === 'vice president' || rawPos === 'vp') position = 'Vice President';
  else if (rawRole === 'TREASURER' || rawPos === 'treasurer') position = 'Treasurer';
  else if (rawRole === 'CHAPTER_ADMIN' || rawPos === 'chapter admin') position = 'Chapter Admin';
  else if (rawPos && rawPos !== 'member') position = getDisplayPosition(rawPos, rawRole);

  return {
    id,
    displayName,
    category,
    chapterId: chapId,
    chapterName: chapterName || 'General Chapter',
    position,
    phone: String(u.phone || u.phoneNumber || u.mobile || '').trim(),
    photoURL,
  };
}

interface OfflineReferralMemberSelectProps {
  members: NormalizedMemberOption[];
  value: string;
  onChange: (memberId: string, member?: NormalizedMemberOption) => void;
  userChapterId?: string;
  placeholder?: string;
}

export function OfflineReferralMemberSelect({
  members,
  value,
  onChange,
  userChapterId,
  placeholder = 'Select member who gave the referral...',
}: OfflineReferralMemberSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [chapterFilter, setChapterFilter] = useState<string>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  const normalizedUserChapId = String(userChapterId || '').trim().toLowerCase();

  // Strictly sort all members alphabetically A -> Z
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) =>
      a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' })
    );
  }, [members]);

  // Distinct chapters sorted (user's chapter first, then alphabetical)
  const chapterOptions = useMemo(() => {
    const map = new Map<string, { key: string; label: string; isMyChapter: boolean; count: number }>();
    sortedMembers.forEach((m) => {
      const chapKey = (m.chapterName || 'General Chapter').trim();
      const existing = map.get(chapKey);
      const isMine = Boolean(normalizedUserChapId && m.chapterId && m.chapterId.toLowerCase() === normalizedUserChapId);
      if (existing) {
        existing.count += 1;
        if (isMine) existing.isMyChapter = true;
      } else {
        map.set(chapKey, {
          key: chapKey,
          label: chapKey,
          isMyChapter: isMine,
          count: 1,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.isMyChapter && !b.isMyChapter) return -1;
      if (!a.isMyChapter && b.isMyChapter) return 1;
      return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
    });
  }, [sortedMembers, normalizedUserChapId]);

  const myChapterCount = useMemo(() => {
    if (!normalizedUserChapId) return 0;
    return sortedMembers.filter((m) => m.chapterId && m.chapterId.toLowerCase() === normalizedUserChapId).length;
  }, [sortedMembers, normalizedUserChapId]);

  const filteredMembers = useMemo(() => {
    let list = sortedMembers;

    if (chapterFilter === 'my_chapter' && normalizedUserChapId) {
      list = list.filter((m) => m.chapterId && m.chapterId.toLowerCase() === normalizedUserChapId);
    } else if (chapterFilter !== 'all' && chapterFilter !== 'my_chapter') {
      list = list.filter((m) => m.chapterName === chapterFilter);
    }

    if (deferredSearchTerm.trim()) {
      const q = deferredSearchTerm.toLowerCase().trim();
      list = list.filter((m) => {
        return (
          m.displayName.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q) ||
          m.chapterName.toLowerCase().includes(q) ||
          m.position.toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [sortedMembers, chapterFilter, normalizedUserChapId, deferredSearchTerm]);

  // Group filtered members chapter-wise (My Chapter first, then alphabetical chapters; members A-Z inside each)
  const groupedByChapter = useMemo(() => {
    const groups = new Map<string, { chapterName: string; isMyChapter: boolean; items: NormalizedMemberOption[] }>();

    filteredMembers.forEach((m) => {
      const chapLabel = m.chapterName || 'General Chapter';
      const isMine = Boolean(normalizedUserChapId && m.chapterId && m.chapterId.toLowerCase() === normalizedUserChapId);
      const existing = groups.get(chapLabel);
      if (existing) {
        existing.items.push(m);
        if (isMine) existing.isMyChapter = true;
      } else {
        groups.set(chapLabel, {
          chapterName: chapLabel,
          isMyChapter: isMine,
          items: [m],
        });
      }
    });

    return Array.from(groups.values()).sort((a, b) => {
      if (a.isMyChapter && !b.isMyChapter) return -1;
      if (!a.isMyChapter && b.isMyChapter) return 1;
      return a.chapterName.localeCompare(b.chapterName, undefined, { sensitivity: 'base' });
    });
  }, [filteredMembers, normalizedUserChapId]);

  const selectedMember = useMemo(() => {
    if (!value) return null;
    return sortedMembers.find((m) => String(m.id) === String(value)) || null;
  }, [sortedMembers, value]);

  return (
    <div className="space-y-2" ref={dropdownRef}>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className="w-full px-3 py-2.5 rounded-xl border border-white/10 bg-[#111827] text-white text-xs outline-none focus:border-primary font-medium flex items-center justify-between gap-2 text-left cursor-pointer hover:border-white/20 transition-all"
        >
          {selectedMember ? (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-white truncate">{selectedMember.displayName}</span>
                {selectedMember.position && (
                  <span className="text-[10px] font-semibold text-amber-400">({selectedMember.position})</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-400 truncate">
                <span className="text-primary font-semibold truncate">{selectedMember.category}</span>
                <span>•</span>
                <span className="truncate">{selectedMember.chapterName}</span>
              </div>
            </div>
          ) : (
            <span className="text-neutral-400 truncate">{placeholder}</span>
          )}
          <ChevronDown
            size={16}
            className={cn(
              'shrink-0 text-neutral-400 transition-transform duration-200',
              isOpen && 'rotate-180 text-primary'
            )}
          />
        </button>

        {isOpen && (
          <div className="mt-1.5 bg-[#151C2E] border border-white/15 rounded-xl shadow-2xl overflow-hidden z-50">
            {/* Search Box */}
            <div className="p-2.5 border-b border-white/10 bg-[#111827] space-y-2">
              <div className="relative flex items-center">
                <Search size={14} className="absolute left-3 text-neutral-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search member by name, category, or chapter..."
                  className="w-full h-9 pl-8 pr-8 text-xs font-medium rounded-lg bg-[#151C2E] border border-white/10 text-white placeholder-neutral-400 focus:outline-none focus:border-primary transition-all"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-2 p-0.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Chapter Filter Controls */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setChapterFilter('all')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1',
                    chapterFilter === 'all'
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-[#151C2E] text-neutral-400 hover:text-white border border-white/5'
                  )}
                >
                  <Users size={11} />
                  All Chapters ({sortedMembers.length})
                </button>
                {myChapterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setChapterFilter('my_chapter')}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1',
                      chapterFilter === 'my_chapter'
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-[#151C2E] text-neutral-400 hover:text-white border border-white/5'
                    )}
                  >
                    <Building2 size={11} />
                    My Chapter ({myChapterCount})
                  </button>
                )}
                {chapterOptions.length > 1 && (
                  <select
                    value={chapterFilter !== 'all' && chapterFilter !== 'my_chapter' ? chapterFilter : ''}
                    onChange={(e) => setChapterFilter(e.target.value || 'all')}
                    aria-label="Filter by chapter"
                    className="ml-auto px-2 py-1 rounded-lg text-[10px] font-bold bg-[#151C2E] text-neutral-200 border border-white/10 outline-none focus:border-primary max-w-[170px] cursor-pointer"
                  >
                    <option value="">Jump to Chapter...</option>
                    {chapterOptions.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label} ({c.count})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Chapter-wise Alphabetical Member List */}
            <div className="max-h-64 overflow-y-auto p-1.5 space-y-2 custom-scrollbar bg-[#111827]">
              {groupedByChapter.length > 0 ? (
                groupedByChapter.map((group) => (
                  <div key={group.chapterName} className="space-y-0.5">
                    <div className="sticky top-0 z-10 px-2.5 py-1.5 rounded-lg bg-[#1A2236] border border-white/5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Building2 size={12} className="text-primary shrink-0" />
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-200 truncate">
                          {group.chapterName}
                        </span>
                        {group.isMyChapter && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary shrink-0">
                            My Chapter
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-neutral-400 shrink-0">
                        {group.items.length}
                      </span>
                    </div>

                    {group.items.map((m) => {
                      const isSelected = String(value) === String(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            onChange(m.id, m);
                            setIsOpen(false);
                          }}
                          className={cn(
                            'w-full text-left px-3 py-2 rounded-lg flex items-center justify-between gap-2 transition-colors cursor-pointer',
                            isSelected
                              ? 'bg-primary/20 border border-primary/40 text-white'
                              : 'hover:bg-[#151C2E] text-white border border-transparent'
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={cn('text-xs font-bold truncate', isSelected ? 'text-primary' : 'text-white')}>
                                {m.displayName}
                              </span>
                              {m.position && (
                                <span className="text-[10px] font-semibold text-amber-400">
                                  ({m.position})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                              <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold truncate">
                                <Tag size={10} className="shrink-0" />
                                {m.category}
                              </span>
                              <span className="text-neutral-600">•</span>
                              <span className="text-neutral-400 truncate">{m.chapterName}</span>
                            </div>
                          </div>
                          {isSelected && <Check size={14} className="shrink-0 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs font-medium text-neutral-400">
                  {searchTerm.trim()
                    ? `No members found matching "${searchTerm}"`
                    : 'No members available.'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
