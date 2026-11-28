import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getISTDateString,
  getISTDayBounds,
  getWorkspaceChecklistTasks,
  calculateChapterGrowthScoreData
} from '../src/utils/growthScore.js';
import { withTimeout, fetchWithTimeout } from '../src/utils/directoryCache.js';

test('1. getISTDateString and getISTDayBounds compute exact Asia/Kolkata (+05:30) day boundaries', () => {
  // 2026-06-15T19:00:00Z is 2026-06-16T00:30:00+05:30 (next day in IST)
  assert.equal(getISTDateString('2026-06-15T19:00:00.000Z'), '2026-06-16');
  // Fast path YYYY-MM-DD preserved directly
  assert.equal(getISTDateString('2026-11-28'), '2026-11-28');

  const bounds = getISTDayBounds('2026-11-28');
  assert.equal(bounds.start.toISOString(), '2026-11-27T18:30:00.000Z');
  assert.equal(bounds.end.toISOString(), '2026-11-28T18:29:59.999Z');
});

test('2. getWorkspaceChecklistTasks and calculateChapterGrowthScoreData scale smoothly across 50 members x 120 days', () => {
  const members = Array.from({ length: 50 }, (_, idx) => ({
    id: `m-${idx}`,
    uid: `m-${idx}`,
    name: `Member ${idx}`,
    role: 'MEMBER',
    status: 'ACTIVE',
    chapter_id: 'chap-1',
    phone: '9876543210',
    email: `m${idx}@example.com`,
    category: 'Consulting',
    businessName: `Biz ${idx}`,
    city: 'Mumbai',
    state: 'Maharashtra'
  }));

  const now = Date.now();
  const referrals = Array.from({ length: 120 }, (_, i) => ({
    id: `ref-${i}`,
    fromUserId: `m-${i % 50}`,
    toUserId: `m-${(i + 1) % 50}`,
    status: i % 2 === 0 ? 'CONVERTED' : 'PENDING',
    created_at: new Date(now - i * 86_400_000).toISOString(),
    updated_at: new Date(now - i * 86_400_000).toISOString()
  }));

  const oneToOnes = Array.from({ length: 100 }, (_, i) => ({
    id: `o2o-${i}`,
    organizer_id: `m-${i % 50}`,
    member_id: `m-${(i + 2) % 50}`,
    status: 'COMPLETED',
    scheduled_date: new Date(now - i * 86_400_000).toISOString()
  }));

  const guestInvitations = Array.from({ length: 60 }, (_, i) => ({
    id: `g-${i}`,
    invited_by: `m-${i % 50}`,
    status: 'Attended',
    created_at: new Date(now - i * 86_400_000).toISOString()
  }));

  const testimonials = Array.from({ length: 80 }, (_, i) => ({
    id: `t-${i}`,
    author_id: `m-${i % 50}`,
    receiver_id: `m-${(i + 3) % 50}`,
    created_at: new Date(now - i * 86_400_000).toISOString()
  }));

  const allSlips = Array.from({ length: 60 }, (_, i) => ({
    id: `s-${i}`,
    referral_id: `ref-${i * 2}`,
    from_user_id: `m-${(i * 2 + 1) % 50}`,
    to_user_id: `m-${(i * 2) % 50}`,
    business_value: 25000,
    created_at: new Date(now - i * 86_400_000).toISOString()
  }));

  const start = new Date(now - 120 * 86_400_000);
  const end = new Date(now);

  const t0 = performance.now();
  const tasks = getWorkspaceChecklistTasks(
    members[0],
    {
      allReferrals: referrals,
      oneToOnes,
      meetings: [],
      guestInvitations,
      allSlips,
      testimonials,
      allUsers: members
    },
    { start, end }
  );
  const chapterResult = calculateChapterGrowthScoreData({
    chapterMembers: members,
    activeDateRange: { start, end },
    allReferrals: referrals,
    oneToOnes,
    meetings: [],
    guestInvitations,
    allSlips,
    testimonials
  });
  const elapsedMs = performance.now() - t0;

  assert.equal(tasks.length > 0, true);
  assert.equal(chapterResult.membersAnalysed, 50);
  assert.equal(Number.isFinite(chapterResult.score), true);
  assert.equal(elapsedMs < 350, true, `Expected benchmark < 350ms, got ${elapsedMs.toFixed(1)}ms`);
});

test('3. withTimeout resolves fast promises and rejects stalled promises cleanly', async () => {
  const fastResult = await withTimeout(Promise.resolve('ok'), 200, 'Fast op');
  assert.equal(fastResult, 'ok');

  const neverResolving = new Promise<string>(() => {});
  await assert.rejects(
    () => withTimeout(neverResolving, 25, 'Stalled op'),
    /Stalled op timed out/
  );
});

test('4. fetchWithTimeout aborts hung fetches with TimeoutError and respects caller AbortSignal', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = ((_: RequestInfo | URL, init?: RequestInit) => {
      if (init?.signal?.aborted) {
        return Promise.reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
      }
      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
        });
      });
    }) as typeof fetch;

    await assert.rejects(
      () => fetchWithTimeout('/api/test-slow', {}, 25),
      (err: any) => err?.name === 'TimeoutError'
    );

    const callerController = new AbortController();
    callerController.abort();
    await assert.rejects(
      () => fetchWithTimeout('/api/test-aborted', { signal: callerController.signal }, 500),
      (err: any) => err?.name === 'AbortError'
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
