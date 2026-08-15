import { getWorkspaceChecklistTasks } from './src/utils/growthScore.ts';

const profile = {
  uid: 'test1',
  role: 'MEMBER',
  subscriptionStart: '2026-08-01',
  subscriptionEnd: '2030-08-01',
};

const tasks = getWorkspaceChecklistTasks(profile, {}, { start: new Date('2026-08-01'), end: new Date('2026-08-02') });

console.log(tasks.length);
console.log(tasks.map(t => t.label));
