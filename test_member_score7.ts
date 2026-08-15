import { calculateMemberGrowthScoreData } from './src/utils/growthScore.ts';

const profile = {
  uid: 'test1',
  role: 'MEMBER',
  subscriptionStart: '2026-08-01',
  subscriptionEnd: '2026-08-02',
};

const data = calculateMemberGrowthScoreData({
  profile,
  activeDateRange: undefined,
});

console.log('Total tasks:', data.total_tasks);
console.log('Completed tasks:', data.completed_tasks);
console.log('Score:', data.score);
