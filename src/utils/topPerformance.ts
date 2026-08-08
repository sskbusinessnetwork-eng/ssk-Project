import { databaseService } from '../services/databaseService';
import { supabase } from '../lib/supabaseClient';
import { UserProfile } from '../types';
import { calculateMemberGrowthScoreData } from './growthScore';

export interface TopPerformanceSettings {
  showOnLandingPage: boolean;
  startDate: string | null;
  endDate: string | null;
}

export interface TopMemberPublicItem {
  uid: string;
  rank: number;
  name: string;
  profilePhoto: string;
  businessName?: string;
  growthScore?: number;
  totalEarned?: number;
}

export async function getTopPerformanceSettings(): Promise<TopPerformanceSettings> {
  const defaultSettings: TopPerformanceSettings = {
    showOnLandingPage: true,
    startDate: null,
    endDate: null,
  };

  try {
    const { data, error } = await supabase
      .from('assessments')
      .select('details')
      .eq('title', 'global_top_performance_settings')
      .maybeSingle();

    if (data && data.details) {
      const details = typeof data.details === 'string' ? JSON.parse(data.details) : data.details;
      return {
        showOnLandingPage: details.showOnLandingPage ?? true,
        startDate: details.startDate || null,
        endDate: details.endDate || null,
      };
    }
  } catch (e) {
    console.warn('Could not fetch global top performance settings:', e);
  }

  return defaultSettings;
}

export async function saveTopPerformanceSettings(settings: TopPerformanceSettings): Promise<void> {
  const payload = {
    showOnLandingPage: settings.showOnLandingPage,
    startDate: settings.startDate || null,
    endDate: settings.endDate || null,
  };

  try {
    const { data: existing } = await supabase
      .from('assessments')
      .select('id')
      .eq('title', 'global_top_performance_settings')
      .maybeSingle();

    if (existing) {
      await supabase
        .from('assessments')
        .update({
          details: payload,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('assessments')
        .insert([{
          title: 'global_top_performance_settings',
          details: payload
        }]);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('global_top_performance_settings_updated', { detail: payload }));
    }
  } catch (e) {
    console.error('Error saving global top performance settings:', e);
  }
}

export function subscribeTopPerformanceSettings(callback: (settings: TopPerformanceSettings) => void): () => void {
  // Fetch initial settings from Supabase
  getTopPerformanceSettings().then(callback);

  // Realtime postgres changes channel
  const channel = supabase
    .channel('realtime_global_top_performance_settings')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'assessments',
        filter: 'title=eq.global_top_performance_settings',
      },
      async () => {
        const fresh = await getTopPerformanceSettings();
        callback(fresh);
      }
    )
    .subscribe();

  // Local window event listener for same-tab updates
  const handleLocalUpdate = (e: any) => {
    if (e.detail) {
      callback({
        showOnLandingPage: e.detail.showOnLandingPage ?? true,
        startDate: e.detail.startDate || null,
        endDate: e.detail.endDate || null,
      });
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('global_top_performance_settings_updated', handleLocalUpdate);
  }

  return () => {
    supabase.removeChannel(channel);
    if (typeof window !== 'undefined') {
      window.removeEventListener('global_top_performance_settings_updated', handleLocalUpdate);
    }
  };
}

export async function fetchTopPerformingMembers(customSettings?: TopPerformanceSettings): Promise<TopMemberPublicItem[]> {
  const settings = customSettings || await getTopPerformanceSettings();
  if (!settings.showOnLandingPage) {
    return [];
  }

  const [users, referrals, oneToOnes, meetings, guestInvitations] = await Promise.all([
    databaseService.list<UserProfile>('users'),
    databaseService.list<any>('referrals'),
    databaseService.list<any>('one_to_one_meetings'),
    databaseService.list<any>('meetings'),
    databaseService.list<any>('guest_invitations'),
  ]);

  const eligibleUsers = users.filter((u: any) => {
    if (!u) return false;
    const role = (u.role || u.position || '').toUpperCase();
    if (role === 'MASTER_ADMIN') return false;
    const name = u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim();
    if (!name || name.toLowerCase() === 'admin' || name.toLowerCase() === 'master admin') return false;
    return true;
  });

  const activeDateRange = (settings.startDate || settings.endDate)
    ? {
        startDate: settings.startDate || undefined,
        endDate: settings.endDate || undefined,
      }
    : null;

  const scored = eligibleUsers.map((member: any) => {
    const scoreData = calculateMemberGrowthScoreData({
      profile: member,
      activeDateRange,
      allReferrals: referrals,
      oneToOnes,
      meetings,
      guestInvitations,
    });

    const displayName = member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Member';
    const profilePhoto = member.profilePhoto || member.profile_photo || member.photoURL || member.avatar || '';

    return {
      uid: member.uid || member.id || Math.random().toString(),
      name: displayName,
      profilePhoto,
      businessName: member.businessName || member.companyName || '',
      growthScore: scoreData.score,
      totalEarned: scoreData.totalEarned,
    };
  });

  // Sort: Growth Score desc -> totalEarned desc -> name asc
  scored.sort((a, b) => {
    if (b.growthScore !== a.growthScore) {
      return b.growthScore - a.growthScore;
    }
    if (b.totalEarned !== a.totalEarned) {
      return b.totalEarned - a.totalEarned;
    }
    return a.name.localeCompare(b.name);
  });

  const top10 = scored.slice(0, 10).map((item, index) => ({
    uid: item.uid,
    rank: index + 1,
    name: item.name,
    profilePhoto: item.profilePhoto,
    businessName: item.businessName,
    growthScore: item.growthScore,
    totalEarned: item.totalEarned,
  }));

  return top10;
}
