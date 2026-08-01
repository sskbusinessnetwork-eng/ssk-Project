const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');

code = code.replace(/<ChapterAdminCompanionView[\s\S]*?tasks=\{chapterAdminTasks\}/, `<ChapterAdminCompanionView
          profile={profile}
          chapterHealthScore={chapterGrowthScoreData.score}
          membersAnalysed={chapterGrowthScoreData.membersAnalysed}
          daysAnalysedText={chapterGrowthScoreData.daysAnalysedText}
          scoreText={chapterGrowthScoreData.scoreText}
          chapterMemberCount={totalMembersCount}
          chapterReferrals={referralsPassedCount}
          chapterBusiness={businessGeneratedTotal}
          finalRecentActivities={filteredRecentActivities}
          tasks={chapterAdminTasks}`);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
