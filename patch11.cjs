const fs = require('fs');
let code = fs.readFileSync('src/components/StatGrid.tsx', 'utf-8');

code = code.replace(/if \(isChapterRole && normRole !== 'MASTER_ADMIN'\) \{[\s\S]*?return \[[\s\S]*?\{[\s\S]*?label: 'Total Members',[\s\S]*?\},[\s\S]*?\{[\s\S]*?label: 'Active Members',[\s\S]*?\},[\s\S]*?\{[\s\S]*?label: 'Inactive Members',[\s\S]*?\},/, `if (isChapterRole && normRole !== 'MASTER_ADMIN') {
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
        ] : []),`);

code = code.replace(/\{[\s\S]*?label: 'Referrals Sent',/, `{
          label: 'Referrals Sent',`);

code = code.replace(/\];\s*\}\s*\/\/ MASTER_ADMIN gets global admin stats/, `];
      return baseStats;
    }
    // MASTER_ADMIN gets global admin stats`);

fs.writeFileSync('src/components/StatGrid.tsx', code);
