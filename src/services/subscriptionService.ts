import { supabase } from '../lib/supabaseClient';

export interface MemberSubscriptionRecord {
  id?: string;
  user_id: string;
  member_name?: string | null;
  chapter_id?: string | null;
  chapter_name?: string | null;
  position_name?: string | null;
  subscription_start?: string | null;
  subscription_end?: string | null;
  membership_status?: string | null;
  account_status?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const subscriptionService = {
  /**
   * Save or update a member subscription record in `member_subscriptions`.
   * Performs an upsert based on `user_id`.
   */
  async upsertSubscription(record: MemberSubscriptionRecord): Promise<{ data: any; error: any }> {
    if (!record.user_id) {
      console.error("subscriptionService.upsertSubscription error: Missing user_id");
      return { data: null, error: new Error("Missing user_id for subscription record") };
    }

    const payload: MemberSubscriptionRecord = {
      user_id: record.user_id,
      member_name: record.member_name || null,
      chapter_id: record.chapter_id || null,
      chapter_name: record.chapter_name || null,
      position_name: record.position_name || null,
      subscription_start: record.subscription_start || null,
      subscription_end: record.subscription_end || null,
      membership_status: record.membership_status || 'Active',
      account_status: record.account_status || 'Active',
      created_by: record.created_by || null,
      updated_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('member_subscriptions')
        .upsert(payload, { onConflict: 'user_id' })
        .select();

      if (error) {
        console.error("Error saving to member_subscriptions:", error);
      }
      return { data, error };
    } catch (err: any) {
      console.error("Unexpected error in upsertSubscription:", err);
      return { data: null, error: err };
    }
  },

  /**
   * Get subscription records from `member_subscriptions` optionally filtered by chapter_id or user_id.
   */
  async getSubscriptions(chapterId?: string, userId?: string) {
    try {
      let query = supabase.from('member_subscriptions').select('*');
      if (userId) {
        query = query.eq('user_id', userId);
      } else if (chapterId) {
        query = query.eq('chapter_id', chapterId);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching member_subscriptions:", error);
      }
      return { data: data || [], error };
    } catch (err: any) {
      console.error("Unexpected error in getSubscriptions:", err);
      return { data: [], error: err };
    }
  }
};
