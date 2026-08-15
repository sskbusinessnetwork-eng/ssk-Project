import { getWorkspaceChecklistTasks } from './src/utils/growthScore.ts';

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
  created_at: '2026-08-15'
}];

const tasks = getWorkspaceChecklistTasks(profile, {
  allReferrals,
}, { start: new Date('2026-08-15T00:00:00Z'), end: new Date('2026-08-15T00:00:00Z') });

console.log('Tasks:', JSON.stringify(tasks, null, 2));
