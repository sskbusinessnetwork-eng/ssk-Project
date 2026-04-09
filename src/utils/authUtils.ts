import { UserRole } from '../types';

export const getDashboardPath = (role: UserRole | undefined): string => {
  if (role === 'MASTER_ADMIN' || role === 'CHAPTER_ADMIN') {
    return '/admin/analytics';
  }
  return '/analytics';
};
