const fs = require('fs');

const topPart = `import React from 'react';
import { Users, UserCheck, Share2, Briefcase, ArrowDownLeft, Handshake, Calendar, FileText, Star, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

interface StatGridProps {
  role?: string;
  position?: string;
  totalChaptersCount?: number;
  totalMembersCount?: number;
  activePartnersCount?: number;
  inactiveMembersCount?: number;
  businessGeneratedTotal?: number;
  businessSentTotal?: number;
  businessSentCount?: number;
  businessReceivedTotal?: number;
  businessReceivedCount?: number;
  referralsPassedCount?: number;
  referralsSentCount?: number;
  referralsReceivedCount?: number;
  thankYouSlipsCount?: number;
  thankYouSlipsSentCount?: number;
  thankYouSlipsReceivedCount?: number;
  upcomingSyncsCount?: number;
  oneToOneMeetingsCount?: number;
  visitorsAttendedCount?: number;
  guestsInvitedCount?: number;
  chapterMeetingsCount?: number;
  weeklyMeetingAttendance?: number;
  growthScore?: number;
  newMembersThisMonthCount?: number;
  testimonialsCount?: number;
  testimonialsGivenCount?: number;
  testimonialsReceivedCount?: number;
  meetingsCount?: number;
  onCardClick?: (label: string) => void;
}

export default function StatGrid({
  role = 'MEMBER',
  position = '',
  totalChaptersCount = 0,
  totalMembersCount = 0,
  activePartnersCount = 0,
  inactiveMembersCount = 0,
  businessGeneratedTotal = 0,
  businessSentTotal = 0,
  businessSentCount = 0,
  businessReceivedTotal = 0,
  businessReceivedCount = 0,
  referralsPassedCount = 0,
  referralsSentCount = 0,
  referralsReceivedCount = 0,
  thankYouSlipsCount = 0,
  thankYouSlipsSentCount = 0,
  thankYouSlipsReceivedCount = 0,
  upcomingSyncsCount = 0,
  oneToOneMeetingsCount = 0,
  visitorsAttendedCount = 0,
  guestsInvitedCount = 0,
  chapterMeetingsCount = 0,
  weeklyMeetingAttendance = 0,
  growthScore = 0,
  newMembersThisMonthCount = 0,
  testimonialsCount = 0,
  testimonialsGivenCount = 0,
  testimonialsReceivedCount = 0,
  meetingsCount = 0,
  onCardClick,
}: StatGridProps) {
  const formatValue = (label: string, val: any) => {
    if (label.includes('Business')) {
      const num = Number(val || 0);
      if (num >= 10000000) return \`₹\${(num / 10000000).toFixed(2)}Cr+\`;
      if (num >= 100000) return \`₹\${(num / 100000).toFixed(2)}L+\`;
      return \`₹\${num.toLocaleString('en-IN')}\`;
    }
    if (label === 'Weekly Meeting Attendance' || label === 'Growth Score' || label === 'Attendance') {
      return \`\${val}%\`;
    }
    return String(val ?? 0);
  };

  const getStatsForRole = () => {
    const normRole = (role || '').toUpperCase();
    const normPos = (position || '').toLowerCase();
    const isChapterRole = normRole === 'MEMBER' || normRole === 'CHAPTER_ADMIN' || normRole === 'PRESIDENT' || normRole === 'VICE_PRESIDENT' || normRole === 'TREASURER' || ['president', 'vice_president', 'treasurer', 'chapter_admin', 'member'].includes(normPos);

    if (isChapterRole && normRole !== 'MASTER_ADMIN') {
      const isChapterAdmin = normRole === 'CHAPTER_ADMIN' || normPos === 'chapter_admin';
      const baseStats = [
        ...(isChapterAdmin ? [
          {
            label: 'Total Members',
            value: formatValue('Total Members', totalMembersCount),
            trend: 'Total',
            trendLabel: 'In chapter',
            icon: Users,
            color: 'text-indigo-400',
            bg: 'bg-indigo-400/10 border-indigo-400/20',
          },
          {
            label: 'Active Members',
            value: formatValue('Active Members', activePartnersCount),
            trend: 'Active',
            trendLabel: 'In chapter',
            icon: UserCheck,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10 border-emerald-500/20',
          },
          {
            label: 'Inactive Members',
            value: formatValue('Inactive Members', inactiveMembersCount),
            trend: 'Inactive',
            trendLabel: 'In chapter',
            icon: Users,
            color: 'text-red-400',
            bg: 'bg-red-400/10 border-red-400/20',
          }
        ] : []),
`;

let code = fs.readFileSync('src/components/StatGrid.tsx', 'utf-8');
// Extract everything from "label: 'Referrals Sent'" onwards
const match = code.match(/\{\s*label: 'Referrals Sent',[\s\S]*$/);
fs.writeFileSync('src/components/StatGrid.tsx', topPart + match[0]);
