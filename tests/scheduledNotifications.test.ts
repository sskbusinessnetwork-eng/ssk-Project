import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getISTNowParts,
  resolveNotificationSlot,
  buildPersonalizedNotificationContent,
  isValidPushEndpointUrl,
  computeMemberPendingTasks,
  upsertDeviceSubscription,
  getUserDeviceSubscriptions,
  deactivateDeviceSubscription,
  sendPushToUserDevices,
  runScheduledNotificationDispatch,
} from '../server/scheduledNotifications';

function createMockSupabase(initialData: Record<string, any[]> = {}) {
  const tables: Record<string, any[]> = {
    users: [...(initialData.users || [])],
    master_admins: [...(initialData.master_admins || [])],
    push_subscriptions: [...(initialData.push_subscriptions || [])],
    notification_logs: [...(initialData.notification_logs || [])],
    notifications: [...(initialData.notifications || [])],
    one_to_one_meetings: [...(initialData.one_to_one_meetings || [])],
    referrals: [...(initialData.referrals || [])],
    thank_you_slips: [...(initialData.thank_you_slips || [])],
    testimonials: [...(initialData.testimonials || [])],
    guest_invitations: [...(initialData.guest_invitations || [])],
    meetings: [...(initialData.meetings || [])],
  };

  function makeQuery(tableName: string) {
    let filters: Array<(row: any) => boolean> = [];
    let pendingUpdate: Record<string, any> | null = null;
    let pendingInsert: any[] | null = null;
    let pendingUpsert: { rows: any[]; onConflict?: string } | null = null;
    let orderCol: string | null = null;
    let orderAsc = true;
    let limitCount: number | null = null;

    const execute = async (singleMode: 'none' | 'maybe' | 'single' = 'none') => {
      const list = tables[tableName] || [];

      if (pendingUpsert) {
        const conflictKey = pendingUpsert.onConflict || 'id';
        for (const row of pendingUpsert.rows) {
          const idx = list.findIndex((r) => r[conflictKey] === row[conflictKey]);
          if (idx >= 0) {
            list[idx] = { ...list[idx], ...row };
          } else {
            list.push({ id: row.id || `row-${list.length + 1}`, ...row });
          }
        }
        return { data: pendingUpsert.rows, error: null };
      }

      if (pendingInsert) {
        const inserted = pendingInsert.map((r, i) => ({
          id: r.id || `ins-${list.length + i + 1}`,
          created_at: r.created_at || new Date().toISOString(),
          ...r,
        }));
        list.push(...inserted);
        return { data: inserted, error: null };
      }

      const matched = list.filter((row) => filters.every((fn) => fn(row)));

      if (pendingUpdate) {
        for (const row of matched) {
          Object.assign(row, pendingUpdate);
        }
        return { data: matched, error: null };
      }

      let result = [...matched];
      if (orderCol) {
        result.sort((a, b) => {
          const av = String(a[orderCol!] || '');
          const bv = String(b[orderCol!] || '');
          return orderAsc ? av.localeCompare(bv) : bv.localeCompare(av);
        });
      }
      if (limitCount !== null) {
        result = result.slice(0, limitCount);
      }

      if (singleMode === 'maybe') {
        return { data: result[0] || null, error: null };
      }
      if (singleMode === 'single') {
        return result[0]
          ? { data: result[0], error: null }
          : { data: null, error: { code: 'PGRST116', message: 'Not found' } };
      }
      return { data: result, error: null };
    };

    const builder: any = {
      select() {
        return builder;
      },
      eq(col: string, val: any) {
        filters.push((row) => String(row[col] ?? '') === String(val ?? ''));
        return builder;
      },
      not(col: string, op: string, val: any) {
        if (op === 'is' && val === null) {
          filters.push((row) => row[col] !== null && row[col] !== undefined);
        }
        return builder;
      },
      or(expr: string) {
        const clauses = expr.split(',').map((part) => {
          const [col, op, ...rest] = part.trim().split('.');
          return { col, op, val: rest.join('.') };
        });
        filters.push((row) =>
          clauses.some((c) => c.op === 'eq' && String(row[c.col] ?? '') === String(c.val ?? ''))
        );
        return builder;
      },
      order(col: string, opts?: { ascending?: boolean }) {
        orderCol = col;
        orderAsc = opts?.ascending !== false;
        return builder;
      },
      limit(n: number) {
        limitCount = n;
        return builder;
      },
      update(patch: Record<string, any>) {
        pendingUpdate = patch;
        return builder;
      },
      insert(rows: any | any[]) {
        pendingInsert = Array.isArray(rows) ? rows : [rows];
        return builder;
      },
      upsert(rows: any | any[], opts?: { onConflict?: string }) {
        pendingUpsert = {
          rows: Array.isArray(rows) ? rows : [rows],
          onConflict: opts?.onConflict,
        };
        return builder;
      },
      maybeSingle() {
        return execute('maybe');
      },
      single() {
        return execute('single');
      },
      then(resolve: any, reject: any) {
        return execute('none').then(resolve, reject);
      },
    };

    return builder;
  }

  return {
    tables,
    from(tableName: string) {
      return makeQuery(tableName);
    },
  } as any;
}

test('IST slot resolution aligns with 08:00, 13:00, 18:00, and 21:00 IST cron times', () => {
  // 08:00 IST = 02:30 UTC
  const tMorning = new Date('2026-11-28T02:30:00.000Z');
  assert.equal(getISTNowParts(tMorning).hour, 8);
  assert.equal(resolveNotificationSlot(null, tMorning), 'morning');

  // 13:00 IST = 07:30 UTC
  const tAfternoon = new Date('2026-11-28T07:30:00.000Z');
  assert.equal(getISTNowParts(tAfternoon).hour, 13);
  assert.equal(resolveNotificationSlot(null, tAfternoon), 'afternoon');

  // 18:00 IST = 12:30 UTC
  const tEvening = new Date('2026-11-28T12:30:00.000Z');
  assert.equal(getISTNowParts(tEvening).hour, 18);
  assert.equal(resolveNotificationSlot(null, tEvening), 'evening');

  // 21:00 IST = 15:30 UTC
  const tNight = new Date('2026-11-28T15:30:00.000Z');
  assert.equal(getISTNowParts(tNight).hour, 21);
  assert.equal(resolveNotificationSlot(null, tNight), 'night');
});

test('Personalized messages include member name + task count/summary, or greeting-only when 0 tasks', () => {
  const withTasks = buildPersonalizedNotificationContent('Aarav Sharma', 'morning', [
    { id: '1', label: '1 overdue 1-to-1 meeting', link: '/one-to-one', urgent: true, overdue: true },
    { id: '2', label: 'Update 2 pending referrals', link: '/referrals', urgent: true },
    { id: '3', label: 'Invite Guest', link: '/guests?action=new' },
  ]);
  assert.equal(withTasks.title, 'Good Morning, Aarav!');
  assert.match(withTasks.body, /Aarav Sharma/);
  assert.match(withTasks.body, /3 pending tasks/);
  assert.match(withTasks.body, /\+1 more/);
  assert.equal(withTasks.targetUrl, '/one-to-one');

  const noTasks = buildPersonalizedNotificationContent('Meera Nair', 'night', []);
  assert.equal(noTasks.title, 'Good Night, Meera!');
  assert.match(noTasks.body, /Meera Nair/);
  assert.doesNotMatch(noTasks.body, /pending task/i);
  assert.equal(noTasks.targetUrl, '/dashboard');
});

test('Push endpoint URL validation rejects insecure HTTP and internal hosts', () => {
  assert.equal(isValidPushEndpointUrl('https://fcm.googleapis.com/fcm/send/abc123'), true);
  assert.equal(isValidPushEndpointUrl('https://web.push.apple.com/QAbc123'), true);
  assert.equal(isValidPushEndpointUrl('http://fcm.googleapis.com/fcm/send/abc123'), false);
  assert.equal(isValidPushEndpointUrl('https://127.0.0.1:8080/push'), false);
  assert.equal(isValidPushEndpointUrl('https://localhost/push'), false);
  assert.equal(isValidPushEndpointUrl('https://192.168.1.25/push'), false);
});

test('computeMemberPendingTasks strictly isolates private tasks per authenticated member', async () => {
  const supabase = createMockSupabase({
    users: [
      { id: 'u1', name: 'Member One', role: 'MEMBER', chapter_id: 'ch1', business_name: 'Biz 1', profession_designation: 'CEO', profile_photo: 'x.jpg', bio: 'Bio' },
      { id: 'u2', name: 'Member Two', role: 'MEMBER', chapter_id: 'ch2', business_name: 'Biz 2', profession_designation: 'Founder', profile_photo: 'y.jpg', bio: 'Bio' },
    ],
    referrals: [
      { id: 'ref-u2-secret', from_user_id: 'u9', to_user_id: 'u2', status: 'Pending', created_at: '2026-11-27T10:00:00Z' },
    ],
    one_to_one_meetings: [
      { id: 'm-u1', creator_id: 'u1', member_id: 'u3', date: '2026-11-27', status: 'UPCOMING' },
    ],
  });

  const u1Tasks = await computeMemberPendingTasks(supabase, supabase.tables.users[0], '2026-11-28');
  assert.equal(u1Tasks.some((t) => t.id === 'overdue-1to1'), true);
  assert.equal(u1Tasks.some((t) => t.id === 'pending-referrals'), false);

  const u2Tasks = await computeMemberPendingTasks(supabase, supabase.tables.users[1], '2026-11-28');
  assert.equal(u2Tasks.some((t) => t.id === 'pending-referrals'), true);
  assert.equal(u2Tasks.some((t) => t.id === 'overdue-1to1'), false);
});

test('Multi-device push registration, single-device unsubscribe, retry, and 410 expiry cleanup', async () => {
  const supabase = createMockSupabase({
    users: [{ id: 'u1', name: 'Rohan', role: 'MEMBER', status: 'ACTIVE', profile_photo: '' }],
  });

  await upsertDeviceSubscription(supabase, {
    userId: 'u1',
    deviceLabel: 'Android Chrome',
    platform: 'android',
    subscription: { endpoint: 'https://fcm.googleapis.com/sub-android', keys: { p256dh: 'p1', auth: 'a1' } },
  });
  await upsertDeviceSubscription(supabase, {
    userId: 'u1',
    deviceLabel: 'iPhone Safari (App)',
    platform: 'ios',
    subscription: { endpoint: 'https://web.push.apple.com/sub-iphone', keys: { p256dh: 'p2', auth: 'a2' } },
  });

  const devices = await getUserDeviceSubscriptions(supabase, 'u1');
  assert.equal(devices.length, 2);

  let transientAttempts = 0;
  const mockWebPush = {
    async sendNotification(sub: any) {
      if (sub.endpoint.includes('sub-android')) {
        transientAttempts++;
        if (transientAttempts === 1) {
          const err: any = new Error('Rate limited');
          err.statusCode = 429;
          throw err;
        }
        return {};
      }
      if (sub.endpoint.includes('sub-iphone')) {
        const err: any = new Error('Gone');
        err.statusCode = 410;
        throw err;
      }
      return {};
    },
  };

  const delivery = await sendPushToUserDevices(supabase, mockWebPush, 'u1', {
    title: 'Test',
    body: 'Hello',
  });

  assert.equal(delivery.devicesTargeted, 2);
  assert.equal(delivery.devicesSucceeded, 1);
  assert.equal(delivery.devicesExpired, 1);
  assert.equal(transientAttempts, 2);

  // Expired iPhone endpoint must have been auto-deactivated, keeping Android active
  const remaining = await getUserDeviceSubscriptions(supabase, 'u1');
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].endpoint, 'https://fcm.googleapis.com/sub-android');

  // Unsubscribe remaining device cleanly (e.g. logout)
  const unsubRes = await deactivateDeviceSubscription(supabase, {
    userId: 'u1',
    endpoint: 'https://fcm.googleapis.com/sub-android',
  });
  assert.equal(unsubRes.remainingDevices, 0);
});

test('runScheduledNotificationDispatch prevents duplicate deliveries for same IST date & slot', async () => {
  const supabase = createMockSupabase({
    users: [{ id: 'u1', name: 'Priya Patel', role: 'MEMBER', status: 'ACTIVE', business_name: 'Studio', profession_designation: 'Architect', profile_photo: 'p.jpg', bio: 'Bio' }],
    push_subscriptions: [
      {
        id: 'ps1',
        user_id: 'u1',
        endpoint: 'https://fcm.googleapis.com/priya-desktop',
        p256dh: 'k1',
        auth: 'a1',
        subscription_json: { endpoint: 'https://fcm.googleapis.com/priya-desktop', keys: { p256dh: 'k1', auth: 'a1' } },
        is_active: true,
      },
    ],
  });

  let sendCount = 0;
  const mockWebPush = {
    async sendNotification() {
      sendCount++;
      return {};
    },
  };

  const fixedTime = new Date('2026-11-28T02:30:00.000Z'); // 08:00 IST
  const run1 = await runScheduledNotificationDispatch(supabase, mockWebPush, { now: fixedTime });
  assert.equal(run1.slot, 'morning');
  assert.equal(run1.notificationsSent, 1);
  assert.equal(sendCount, 1);

  // Second run in same slot should skip cleanly (idempotent)
  const run2 = await runScheduledNotificationDispatch(supabase, mockWebPush, { now: fixedTime });
  assert.equal(run2.notificationsSent, 0);
  assert.equal(run2.notificationsSkipped, 1);
  assert.equal(sendCount, 1);
});
