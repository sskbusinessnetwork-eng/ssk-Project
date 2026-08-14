const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const target = `      {(profile?.role === 'CHAPTER_ADMIN' || profile?.position === 'chapter_admin') && (
        <ChapterAdminCompanionView
          profile={profile}
          chapterHealthScore={chapterGrowthScoreData.score}
          membersAnalysed={chapterGrowthScoreData.membersAnalysed}
          daysAnalysedText={chapterGrowthScoreData.daysAnalysedText}
          scoreText={chapterGrowthScoreData.scoreText}
          onOpenFilterModal={() => setIsFilterModalOpen(true)}
          chapterMemberCount={totalMembersCount}
          chapterReferrals={referralsPassedCount}
          chapterBusiness={businessGeneratedTotal}
          finalRecentActivities={filteredRecentActivities}
          tasks={chapterAdminTasks}
        />
      )}`;

const replacement = ``;

code = code.replace(target, replacement);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
console.log('done patch dashboard');
