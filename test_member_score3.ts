import { calculateMemberGrowthScoreData } from './src/utils/growthScore.ts';

const profile = {
  uid: 'test1',
  role: 'MEMBER',
  subscriptionStart: '2026-08-01',
  subscriptionEnd: '2030-08-01',
};

const allReferrals = [{
  id: 'ref1',
  fromUserId: 'test1',
  toUserId: 'test2',
  created_at: '2026-08-05'
}];

const data = calculateMemberGrowthScoreData({
  profile,
  allReferrals,
  activeDateRange: { start: new Date('2026-08-01'), end: new Date('2026-08-15') },
});

console.log('Total tasks:', data.total_tasks);
console.log('Completed tasks:', data.completed_tasks);
console.log('Score:', data.score);
