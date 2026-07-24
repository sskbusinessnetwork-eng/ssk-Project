import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type ChapterPositionKey = 'chapter_admin' | 'president' | 'vice_president' | 'treasurer' | 'member';

export function getMemberPositionKey(member: {
  position?: string | null;
  chapter_position?: string | null;
  role?: string | null;
} | null | undefined): ChapterPositionKey {
  if (!member) return 'member';

  const p = String(member.position || '').toLowerCase().trim().replace(/[\s-]/g, '_');
  const c = String(member.chapter_position || '').toLowerCase().trim().replace(/[\s-]/g, '_');
  const r = String(member.role || '').toLowerCase().trim().replace(/[\s-]/g, '_');

  if (p === 'chapter_admin' || c === 'chapter_admin' || r === 'chapter_admin') {
    return 'chapter_admin';
  }
  if (p === 'president' || c === 'president') {
    return 'president';
  }
  if (p === 'vice_president' || c === 'vice_president') {
    return 'vice_president';
  }
  if (p === 'treasurer' || c === 'treasurer') {
    return 'treasurer';
  }
  return 'member';
}

