import { UserRole } from '../types';
import { supabase } from '../lib/supabaseClient';

export const validateUserChapterId = (profile: any): { isValid: boolean; errorMessage?: string } => {
  if (!profile) {
    return { isValid: false, errorMessage: 'User is not authenticated.' };
  }
  if (profile.role === 'MASTER_ADMIN') {
    return { isValid: true };
  }
  if (!profile.chapter_id) {
    return {
      isValid: false,
      errorMessage: 'This account is missing a chapter assignment. Please contact your Chapter Admin or Master Admin.'
    };
  }
  return { isValid: true };
};

export const ensureUserChapterId = async (userRecord: any): Promise<any> => {
  if (!userRecord) return userRecord;

  const userId = userRecord.id || userRecord.uid;
  if (!userId) return userRecord;

  try {
    // 0. Always check member_subscriptions to ensure latest subscription end date is attached
    const { data: subData } = await supabase
      .from('member_subscriptions')
      .select('subscription_start, subscription_end, membership_status, account_status')
      .eq('user_id', userId)
      .maybeSingle();

    if (subData) {
      if (subData.subscription_end) {
        userRecord.subscriptionEnd = subData.subscription_end;
        userRecord.subscription_end = subData.subscription_end;
        userRecord.subscriptionEndDate = subData.subscription_end;
      }
      if (subData.subscription_start) {
        userRecord.subscriptionStart = subData.subscription_start;
        userRecord.subscription_start = subData.subscription_start;
        userRecord.subscriptionStartDate = subData.subscription_start;
      }
      if (subData.membership_status) {
        userRecord.membership_status = subData.membership_status;
        userRecord.membershipStatus = subData.membership_status;
      }
    }

    if (userRecord.role === 'MASTER_ADMIN') {
      return userRecord;
    }

    // If chapter_id is already populated, return as is
    if (userRecord.chapter_id) {
      return userRecord;
    }

    let assignedChapterId: string | null = null;

    // 1. Check if user's created_by user has a chapter_id
    if (userRecord.created_by) {
      const { data: creator } = await supabase
        .from('users')
        .select('chapter_id')
        .eq('id', userRecord.created_by)
        .single();
      if (creator && creator.chapter_id) {
        assignedChapterId = creator.chapter_id;
      }
    }

    // 2. If not found, check if this user is a leader of a chapter
    if (!assignedChapterId) {
      const { data: chapter } = await supabase
        .from('chapters')
        .select('id')
        .or(`president.eq.${userId},vice_president.eq.${userId},treasurer.eq.${userId},chapter_admin.eq.${userId}`)
        .limit(1);
      if (chapter && chapter.length > 0) {
        assignedChapterId = chapter[0].id;
      }
    }

    // 3. Fallback: pick the first available chapter in chapters table
    if (!assignedChapterId) {
      const { data: chapters } = await supabase
        .from('chapters')
        .select('id')
        .limit(1);
      if (chapters && chapters.length > 0) {
        assignedChapterId = chapters[0].id;
      }
    }

    // If an assigned chapter ID was found, update the user in Supabase
    if (assignedChapterId) {
      console.log(`Auto-healing chapter_id for user ${userId} -> ${assignedChapterId}`);
      await supabase
        .from('users')
        .update({ chapter_id: assignedChapterId })
        .eq('id', userId);

      userRecord.chapter_id = assignedChapterId;
    }
  } catch (err) {
    console.error('Error in ensureUserChapterId:', err);
  }

  return userRecord;
};

export const getDashboardPath = (role: UserRole | undefined, position?: string): string => {
  if (role === 'MASTER_ADMIN') {
    return '/admin/home';
  }
  const posLower = position?.toLowerCase() || '';
  if (role === 'CHAPTER_ADMIN' || posLower === 'chapter_admin' || posLower === 'chapter admin') {
    return '/chapter-admin/home';
  }
  return '/member/home';
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

