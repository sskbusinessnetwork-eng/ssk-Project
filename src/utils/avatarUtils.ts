import superAdminImg from '../assets/images/super_admin_3d_1784203984512.jpg';
import adminImg from '../assets/images/admin_3d_1784204000230.jpg';
import salesGrowthImg from '../assets/images/sales_growth_3d_1784204015293.jpg';
import businessOwnerImg from '../assets/images/business_owner_3d_1784204028584.jpg';
import supportTeamImg from '../assets/images/support_team_3d_1784204041062.jpg';
import financeManagerImg from '../assets/images/finance_manager_3d_1784204059346.jpg';

import { UserProfile } from '../types';

export interface AvatarStyle {
  id: string;
  name: string;
  description: string;
  image: string;
  roleHint: string;
}

export const AVATAR_STYLES: AvatarStyle[] = [
  {
    id: 'super_admin',
    name: 'Super Admin',
    description: 'Professional business leader with tablet and analytics dashboard.',
    image: superAdminImg,
    roleHint: 'MASTER_ADMIN'
  },
  {
    id: 'admin',
    name: 'Admin',
    description: 'Operations manager reviewing tasks on a laptop.',
    image: adminImg,
    roleHint: 'CHAPTER_ADMIN'
  },
  {
    id: 'sales_manager',
    name: 'Sales Manager',
    description: 'Sales executive pointing to an increasing growth chart.',
    image: salesGrowthImg,
    roleHint: 'MEMBER'
  },
  {
    id: 'marketing_manager',
    name: 'Marketing Manager',
    description: 'Digital marketer working with social media, ads, and analytics.',
    image: salesGrowthImg, // Shares the growth/analytics layout
    roleHint: 'MEMBER'
  },
  {
    id: 'business_owner',
    name: 'Business Owner',
    description: 'Entrepreneur confidently checking business performance.',
    image: businessOwnerImg,
    roleHint: 'MEMBER'
  },
  {
    id: 'team_member',
    name: 'Team Member',
    description: 'Friendly employee organizing tasks with a tablet.',
    image: supportTeamImg,
    roleHint: 'MEMBER'
  },
  {
    id: 'support_executive',
    name: 'Support Executive',
    description: 'Customer support specialist wearing a headset and smiling.',
    image: supportTeamImg,
    roleHint: 'MEMBER'
  },
  {
    id: 'finance_manager',
    name: 'Finance Manager',
    description: 'Financial analyst reviewing reports and revenue charts.',
    image: financeManagerImg,
    roleHint: 'MEMBER'
  },
  {
    id: 'hr_manager',
    name: 'HR Manager',
    description: 'HR professional welcoming new employees.',
    image: supportTeamImg, // Warm, friendly welcoming pose
    roleHint: 'MEMBER'
  }
];

export function getDashboardAvatar(profile: UserProfile | null): AvatarStyle {
  if (!profile) {
    return AVATAR_STYLES.find(a => a.id === 'business_owner') || AVATAR_STYLES[4];
  }

  // 1. If user has explicitly chosen an avatar style, use that
  if (profile.avatarStyle) {
    const chosen = AVATAR_STYLES.find(a => a.id === profile.avatarStyle);
    if (chosen) return chosen;
  }

  // 2. Default mapping based on role
  if (profile.role === 'MASTER_ADMIN') {
    return AVATAR_STYLES.find(a => a.id === 'super_admin') || AVATAR_STYLES[0];
  }

  if (profile.role === 'CHAPTER_ADMIN') {
    return AVATAR_STYLES.find(a => a.id === 'admin') || AVATAR_STYLES[1];
  }

  // 3. MEMBER: Map dynamically based on Category
  const category = (profile.category || '').toLowerCase();
  
  if (category.includes('sales') || category.includes('development') || category.includes('real estate')) {
    return AVATAR_STYLES.find(a => a.id === 'sales_manager') || AVATAR_STYLES[2];
  }
  
  if (category.includes('marketing') || category.includes('ads') || category.includes('social') || category.includes('digital') || category.includes('media')) {
    return AVATAR_STYLES.find(a => a.id === 'marketing_manager') || AVATAR_STYLES[3];
  }

  if (category.includes('finance') || category.includes('chartered') || category.includes('accounting') || category.includes('bank') || category.includes('tax') || category.includes('ca')) {
    return AVATAR_STYLES.find(a => a.id === 'finance_manager') || AVATAR_STYLES[7];
  }

  if (category.includes('hr') || category.includes('recruitment') || category.includes('staffing') || category.includes('hiring')) {
    return AVATAR_STYLES.find(a => a.id === 'hr_manager') || AVATAR_STYLES[8];
  }

  if (category.includes('support') || category.includes('customer') || category.includes('service')) {
    return AVATAR_STYLES.find(a => a.id === 'support_executive') || AVATAR_STYLES[6];
  }

  if (category.includes('it') || category.includes('software') || category.includes('tech') || category.includes('developer') || category.includes('engineer')) {
    return AVATAR_STYLES.find(a => a.id === 'team_member') || AVATAR_STYLES[5];
  }

  // Fallback default for members is Business Owner
  return AVATAR_STYLES.find(a => a.id === 'business_owner') || AVATAR_STYLES[4];
}
