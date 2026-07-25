import { databaseService } from '../services/databaseService';
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

const STORAGE_KEY = 'top_performance_settings';

export async function getTopPerformanceSettings(): Promise<TopPerformanceSettings> {
  const defaultSettings: TopPerformanceSettings = {
    showOnLandingPage: true,
    startDate: null,
    endDate: null,
  };

  try {
    const docData = await databaseService.get<any>('users', 'global_top_performance_settings');
    if (docData && docData.topPerformanceSettings) {
      const parsed = typeof docData.topPerformanceSettings === 'string'
        ? JSON.parse(docData.topPerformanceSettings)
        : docData.topPerformanceSettings;
      return {
        showOnLandingPage: parsed.showOnLandingPage ?? true,
        startDate: parsed.startDate || null,
        endDate: parsed.endDate || null,
      };
    }
  } catch (e) {
    console.warn('Could not fetch top performance settings from database:', e);
  }

  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      return {
        showOnLandingPage: parsed.showOnLandingPage ?? true,
        startDate: parsed.startDate || null,
        endDate: parsed.endDate || null,
      };
    }
  } catch (e) {}

  return defaultSettings;
}

export async function saveTopPerformanceSettings(settings: TopPerformanceSettings): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {}

  try {
    await databaseService.create(
      'users',
      { topPerformanceSettings: JSON.stringify(settings) },
      'global_top_performance_settings'
    );
  } catch (e) {
    console.error('Error saving top performance settings to database:', e);
  }
}

export function subscribeTopPerformanceSettings(callback: (settings: TopPerformanceSettings) => void): () => void {
  return databaseService.subscribe<any>(
    'users',
    [{ type: 'where', field: 'id', op: '==', val: 'global_top_performance_settings' }],
    (docs) => {
      const defaultSettings: TopPerformanceSettings = {
        showOnLandingPage: true,
        startDate: null,
        endDate: null,
      };
      
      const docData = docs.length > 0 ? docs[0] : null;
      if (docData && docData.topPerformanceSettings) {
        const parsed = typeof docData.topPerformanceSettings === 'string'
          ? JSON.parse(docData.topPerformanceSettings)
          : docData.topPerformanceSettings;
        callback({
          showOnLandingPage: parsed.showOnLandingPage ?? true,
          startDate: parsed.startDate || null,
          endDate: parsed.endDate || null,
        });
      } else {
         try {
           const local = localStorage.getItem(STORAGE_KEY);
           if (local) {
             const parsed = JSON.parse(local);
             callback({
                showOnLandingPage: parsed.showOnLandingPage ?? true,
                startDate: parsed.startDate || null,
                endDate: parsed.endDate || null,
             });
             return;
           }
         } catch(e) {}
         callback(defaultSettings);
      }
    }
  );
}

export async function fetchTopPerformingMembers(customSettings?: TopPerformanceSettings): Promise<TopMemberPublicItem[]> {
  const settings = customSettings || await getTopPerformanceSettings();
  if (!settings.showOnLandingPage) {
    return [];
  }

  const [users, referrals, oneToOnes, meetings, guestInvitations] = await Promise.all([
    databaseService.list<UserProfile>('users'),
    databaseService.list<any>('referrals'),
    databaseService.list<any>('one_to_ones'),
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
