const fs = require('fs');

let code = fs.readFileSync('src/components/StatGrid.tsx', 'utf-8');

const newBaseStats = `      const baseStats = [
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
        {
          label: 'Referrals Sent',
          value: formatValue('Referrals Sent', referralsSentCount || referralsPassedCount),
          trend: 'Sent',
          trendLabel: isChapterAdmin ? 'By chapter' : 'Personal',
          icon: Share2,
          color: 'text-purple-400',
          bg: 'bg-purple-400/10 border-purple-400/20',
        },
        {
          label: 'Referrals Received',
          value: formatValue('Referrals Received', referralsReceivedCount),
          trend: 'Received',
          trendLabel: isChapterAdmin ? 'By chapter' : 'Personal',
          icon: Share2,
          color: 'text-emerald-400',
          bg: 'bg-emerald-400/10 border-emerald-400/20',
        },
        {
          label: 'Business Sent',
          value: formatValue('Business Sent', businessSentTotal ?? businessGeneratedTotal),
          trend: \`\${businessSentCount ?? 0} Slips\`,
          trendLabel: 'Given',
          icon: Briefcase,
          color: 'text-purple-500',
          bg: 'bg-purple-500/10 border-purple-500/20',
        },
        {
          label: 'Business Received',
          value: formatValue('Business Received', businessReceivedTotal ?? 0),
          trend: \`\${businessReceivedCount ?? 0} Slips\`,
          trendLabel: 'Earned',
          icon: ArrowDownLeft,
          color: 'text-emerald-400',
          bg: 'bg-emerald-400/10 border-emerald-400/20',
        },
        {
          label: 'One-to-One Meetings',
          value: formatValue('One-to-One Meetings', oneToOneMeetingsCount),
          trend: 'Total',
          trendLabel: 'Completed',
          icon: Handshake,
          color: 'text-blue-500',
          bg: 'bg-blue-500/10 border-blue-500/20',
        },
        {
          label: 'Meetings Attended',
          value: formatValue('Meetings Attended', chapterMeetingsCount || meetingsCount),
          trend: 'Total',
          trendLabel: 'Attended',
          icon: Calendar,
          color: 'text-orange-400',
          bg: 'bg-orange-400/10 border-orange-400/20',
        },
        {
          label: 'Meetings Scheduled',
          value: formatValue('Meetings Scheduled', upcomingSyncsCount),
          trend: 'Total',
          trendLabel: 'Scheduled',
          icon: Calendar,
          color: 'text-orange-400',
          bg: 'bg-orange-400/10 border-orange-400/20',
        },
        {
          label: 'Guests Invited',
          value: formatValue('Guests Invited', guestsInvitedCount || visitorsAttendedCount),
          trend: 'Total',
          trendLabel: 'Invited',
          icon: UserCheck,
          color: 'text-pink-500',
          bg: 'bg-pink-500/10 border-pink-500/20',
        },
        {
          label: 'Thank You Slips Sent',
          value: formatValue('Thank You Slips Sent', thankYouSlipsSentCount || businessSentCount || thankYouSlipsCount),
          trend: 'Sent',
          trendLabel: 'Slips',
          icon: FileText,
          color: 'text-cyan-400',
          bg: 'bg-cyan-400/10 border-cyan-400/20',
        },
        {
          label: 'Thank You Slips Received',
          value: formatValue('Thank You Slips Received', thankYouSlipsReceivedCount || businessReceivedCount),
          trend: 'Received',
          trendLabel: 'Slips',
          icon: FileText,
          color: 'text-teal-400',
          bg: 'bg-teal-400/10 border-teal-400/20',
        },
        {
          label: 'Testimonials Given',
          value: formatValue('Testimonials Given', testimonialsGivenCount || testimonialsCount),
          trend: 'Given',
          trendLabel: isChapterAdmin ? 'By chapter' : 'Personal',
          icon: Star,
          color: 'text-amber-400',
          bg: 'bg-amber-400/10 border-amber-400/20',
        },
        {
          label: 'Testimonials Received',
          value: formatValue('Testimonials Received', testimonialsReceivedCount),
          trend: 'Received',
          trendLabel: isChapterAdmin ? 'By chapter' : 'Personal',
          icon: Star,
          color: 'text-yellow-400',
          bg: 'bg-yellow-400/10 border-yellow-400/20',
        },
        {
          label: 'Attendance',
          value: formatValue('Attendance', weeklyMeetingAttendance),
          trend: 'Avg',
          trendLabel: isChapterAdmin ? 'Chapter' : 'Personal',
          icon: TrendingUp,
          color: 'text-emerald-400',
          bg: 'bg-emerald-400/10 border-emerald-400/20',
        }
      ];`;

const startIndex = code.indexOf('const baseStats = [');
const endIndex = code.indexOf('];\n      return baseStats;');
if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + newBaseStats + code.substring(endIndex + 2);
  fs.writeFileSync('src/components/StatGrid.tsx', code);
  console.log("Successfully replaced baseStats.");
} else {
  console.log("Could not find start/end bounds.");
}
