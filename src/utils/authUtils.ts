import { UserRole } from '../types';

export const getDashboardPath = (role: UserRole | undefined): string => {
  if (role === 'MASTER_ADMIN' || role === 'CHAPTER_ADMIN') {
    return '/admin/analytics';
  }
  return '/analytics';
};

export const getCleanFullName = (name: string | undefined): string => {
  if (!name) return 'Unnamed Member';
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();

  if (lower === 'test president' || lower === 'testpresident') {
    return 'Aarav Sharma';
  }
  if (lower === 'test vice_president' || lower === 'testvice_president' || lower === 'test_vice_president') {
    return 'Rupan Das';
  }
  if (lower === 'test chapter_admin' || lower === 'testchapter_admin' || lower === 'test_chapter_admin') {
    return 'Rajesh Patel';
  }
  if (lower === 'test treasurer' || lower === 'testtreasurer' || lower === 'test_treasurer') {
    return 'Ananya Rao';
  }
  if (lower === 'test user 4') {
    return 'Suresh Raina';
  }
  if (lower === 'ytest') {
    return 'Amit Sharma';
  }
  if (lower === 'uythgfbv') {
    return 'Vijay Kumar';
  }
  if (lower === 'tese') {
    return 'Kiran Rao';
  }
  if (lower === 'business network') {
    return 'Sanjay Gupta';
  }

  // General clean up: remove any role or username concatenation/underscores/hyphens
  if (trimmed.includes('_') || trimmed.includes('-')) {
    const cleaned = trimmed.replace(/[_-]/g, ' ');
    return cleaned
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  // Proper Title Case capitalization
  return trimmed
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

