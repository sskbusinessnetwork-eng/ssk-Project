import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

type NotificationSlot = 'morning' | 'afternoon' | 'evening' | 'night';

interface PendingTaskSummary {
  id: string;
  label: string;
  link: string;
  urgent?: boolean;
  overdue?: boolean;
}

const IST_OFFSET_MS = 19_800_000; // UTC+05:30

function getISTParts(date = new Date()) {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  const hour = shifted.getUTCHours();
  const minute = shifted.getUTCMinutes();
  return {
    istDate: `${year}-${month}-${day}`,
    hour,
    minute,
  };
}

function resolveSlot(explicitSlot?: string | null, date = new Date()): NotificationSlot {
  const normalized = String(explicitSlot || '').trim().toLowerCase();
  if (
    normalized === 'morning' ||
    normalized === 'afternoon' ||
    normalized === 'evening' ||
    normalized === 'night'
  ) {
    return normalized;
  }

  const { hour } = getISTParts(date);
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'night';
}

function toISTDateKey(input: unknown): string {
  if (!input) return '';
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return getISTParts(parsed).istDate;
    }
    return '';
  }
  if (input instanceof Date && !Number.isNaN(input.getTime())) {
    return getISTParts(input).istDate;
  }
  return '';
}

function getGreetingTitle(memberName: string, slot: NotificationSlot): string {
  const firstName = (memberName || 'Member').trim().split(/\s+/)[0] || 'Member';
  switch (slot) {
    case 'morning':
      return `Good Morning, ${firstName}!`;
    case 'afternoon':
      return `Good Afternoon, ${firstName}!`;
    case 'evening':
      return `Good Evening, ${firstName}!`;
    case 'night':
      return `Good Night, ${firstName}!`;
  }
}

function buildNotificationMessage(
  memberName: string,
  slot: NotificationSlot,
  tasks: PendingTaskSummary[]
) {
  const cleanName = (memberName || 'Member').trim() || 'Member';
  const count = tasks.length;
  const title = getGreetingTitle(cleanName, slot);

  if (count === 0) {
    const emptyBody: Record<NotificationSlot, string> = {
      morning: `Good Morning, ${cleanName}! Have a productive day. All your chapter tasks are up to date.`,
      afternoon: `Good Afternoon, ${cleanName}! Great job keeping up with your chapter activities today.`,
      evening: `Good Evening, ${cleanName}! You have completed all your tasks for today.`,
      night: `Good Night, ${cleanName}! All tasks are complete today. Rest well and prepare for tomorrow.`,
    };
    return {
      title,
      body: emptyBody[slot],
      targetUrl: '/dashboard',
    };
  }

  const topTasks = tasks.slice(0, 2).map((t) => t.label);
  const extraCount = count > 2 ? ` +${count - 2} more` : '';
  const summary = `${topTasks.join(', ')}${extraCount}`;
  const firstLink = (tasks.find((t) => t.urgent) || tasks[0])?.link || '/notifications';

  const bodies: Record<NotificationSlot, string> = {
    morning: `Good Morning, ${cleanName}! Have a productive day. You have ${count} pending ${count === 1 ? 'task' : 'tasks'}: ${summary}.`,
    afternoon: `Good Afternoon, ${cleanName}! Don't forget to complete your ${count} pending chapter ${count === 1 ? 'activity' : 'activities'}: ${summary}.`,
    evening: `Good Evening, ${cleanName}! Take a moment to finish your ${count} remaining ${count === 1 ? 'task' : 'tasks'}: ${summary}.`,
    night: `Good Night, ${cleanName}! You have ${count} pending ${count === 1 ? 'task' : 'tasks'} (${summary}). Check them and prepare for tomorrow.`,
  };

  return {
    title,
    body: bodies[slot],
    targetUrl: firstLink,
  };
}

async function computeMemberPendingTasks(
  supabase: ReturnType<typeof createClient>,
  userRow: Record<string, any>,
  istDate: string
): Promise<PendingTaskSummary[]> {
  const userId = String(userRow.id || userRow.uid || '').trim();
  if (!userId) return [];

  const tasks: PendingTaskSummary[] = [];
  const chapterId = userRow.chapter_id ? String(userRow.chapter_id).trim() : '';

  const [
    meetingsRes,
    referralsRes,
    slipsRes,
    testimonialsRes,
    guestsRes,
    chapterMeetingsRes,
  ] = await Promise.all([
    supabase
      .from('one_to_one_meetings')
      .select('id, creator_id, sender_id, member_id, receiver_id, date, scheduled_date, status')
      .or(`creator_id.eq.${userId},sender_id.eq.${userId},member_id.eq.${userId},receiver_id.eq.${userId}`),
    supabase
      .from('referrals')
      .select('id, from_user_id, sender_id, to_user_id, receiver_id, status, created_at, updated_at, type')
      .or(`from_user_id.eq.${userId},sender_id.eq.${userId},to_user_id.eq.${userId},receiver_id.eq.${userId}`),
    supabase
      .from('thank_you_slips')
      .select('id, referral_id, from_user_id, to_user_id, submitted_by, created_at')
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId},submitted_by.eq.${userId}`),
    supabase
      .from('testimonials')
      .select('id, author_id, from_user_id, referral_id, receiver_id, created_at')
      .or(`author_id.eq.${userId},from_user_id.eq.${userId}`),
    supabase
      .from('guest_invitations')
      .select('id, invited_by_user_id, invited_by, user_id, member_id, status, meeting_date, created_at')
      .or(`invited_by_user_id.eq.${userId},user_id.eq.${userId},member_id.eq.${userId}`),
    chapterId
      ? supabase
          .from('meetings')
          .select('id, title, date, meeting_date, attendance, chapter_id')
          .eq('chapter_id', chapterId)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const meetings = meetingsRes.data || [];
  const referrals = referralsRes.data || [];
  const slips = slipsRes.data || [];
  const testimonials = testimonialsRes.data || [];
  const guests = guestsRes.data || [];
  const chapterMeetings = chapterMeetingsRes.data || [];

  // 1. Overdue 1-to-1 attendance / past unresolved meetings
  const overdueMeetings = meetings.filter((m: any) => {
    const isCreator = String(m.creator_id || m.sender_id || '') === userId;
    const isParticipant =
      isCreator ||
      String(m.member_id || m.receiver_id || '') === userId;
    const mDate = toISTDateKey(m.date || m.scheduled_date);
    const status = String(m.status || '').toUpperCase();
    return isParticipant && mDate && mDate < istDate && status !== 'COMPLETED' && status !== 'CANCELLED';
  });
  if (overdueMeetings.length > 0) {
    tasks.push({
      id: 'overdue-1to1',
      label: `${overdueMeetings.length} overdue 1-to-1 meeting${overdueMeetings.length > 1 ? 's' : ''}`,
      link: '/one-to-one',
      urgent: true,
      overdue: true,
    });
  }

  // 2. Today's 1-to-1 meetings
  const todayMeetings = meetings.filter((m: any) => {
    const isParticipant =
      String(m.creator_id || m.sender_id || '') === userId ||
      String(m.member_id || m.receiver_id || '') === userId;
    const mDate = toISTDateKey(m.date || m.scheduled_date);
    const status = String(m.status || '').toUpperCase();
    return isParticipant && mDate === istDate && status !== 'CANCELLED' && status !== 'COMPLETED';
  });
  if (todayMeetings.length > 0) {
    tasks.push({
      id: 'today-1to1',
      label: `${todayMeetings.length} 1-to-1 meeting${todayMeetings.length > 1 ? 's' : ''} today`,
      link: '/one-to-one',
      urgent: true,
    });
  } else {
    const scheduledToday = meetings.some((m: any) => {
      const isCreator = String(m.creator_id || m.sender_id || '') === userId;
      return isCreator && toISTDateKey(m.created_at || m.date || m.scheduled_date) === istDate;
    });
    if (!scheduledToday) {
      tasks.push({
        id: 'schedule-1to1',
        label: 'Schedule 1-to-1 Meeting',
        link: '/one-to-one?action=new',
      });
    }
  }

  // 3. Pending received referrals (today or overdue)
  const pendingReceivedRefs = referrals.filter((r: any) => {
    const receiver = String(r.to_user_id || r.receiver_id || '');
    const status = String(r.status || '').toUpperCase();
    return receiver === userId && status !== 'CONVERTED' && status !== 'COMPLETED' && status !== 'CLOSED';
  });
  if (pendingReceivedRefs.length > 0) {
    tasks.push({
      id: 'pending-referrals',
      label: `Update ${pendingReceivedRefs.length} pending referral${pendingReceivedRefs.length > 1 ? 's' : ''}`,
      link: '/referrals',
      urgent: true,
    });
  }

  // 4. Converted referrals missing Thank You Slip
  const slipByRefId = new Set(
    slips.map((s: any) => String(s.referral_id || '')).filter(Boolean)
  );
  const missingSlipRefs = referrals.filter((r: any) => {
    const receiver = String(r.to_user_id || r.receiver_id || '');
    const status = String(r.status || '').toUpperCase();
    return receiver === userId && (status === 'CONVERTED' || status === 'COMPLETED') && !slipByRefId.has(String(r.id));
  });
  if (missingSlipRefs.length > 0) {
    tasks.push({
      id: 'missing-thank-you-slip',
      label: `Send Thank You Slip (${missingSlipRefs.length})`,
      link: '/thank-you-slips',
      urgent: true,
    });
  }

  // 5. Today's Pass Referral daily activity
  const passedRefToday = referrals.some((r: any) => {
    const sender = String(r.from_user_id || r.sender_id || '');
    return sender === userId && toISTDateKey(r.created_at) === istDate;
  });
  if (!passedRefToday) {
    tasks.push({
      id: 'pass-referral',
      label: 'Pass Referral',
      link: '/referrals?action=new',
    });
  }

  // 6. Today's Invite Guest daily activity
  const invitedGuestToday = guests.some((g: any) => {
    const creator = String(g.invited_by_user_id || g.invited_by || g.user_id || g.member_id || '');
    return (
      creator === userId &&
      g.status !== 'Cancelled' &&
      (toISTDateKey(g.created_at) === istDate || toISTDateKey(g.meeting_date) === istDate)
    );
  });
  if (!invitedGuestToday) {
    tasks.push({
      id: 'invite-guest',
      label: 'Invite Guest',
      link: '/guests?action=new',
    });
  }

  // 7. Chapter Meeting Today attendance pending
  const todayChapterMeetings = chapterMeetings.filter(
    (m: any) => toISTDateKey(m.date || m.meeting_date) === istDate
  );
  for (const cm of todayChapterMeetings) {
    const att = (cm.attendance || {})[userId];
    if (!att) {
      tasks.push({
        id: `chapter-meeting-${cm.id}`,
        label: `Attend Chapter Meeting`,
        link: `/meetings?meetingId=${cm.id}&attend=true`,
        urgent: true,
      });
      break;
    }
  }

  // 8. Complete Profile check
  const missingProfile =
    !userRow.business_name || !userRow.profession_designation || !userRow.profile_photo || !userRow.bio;
  if (missingProfile) {
    tasks.push({
      id: 'complete-profile',
      label: 'Complete Profile Details',
      link: '/profile',
    });
  }

  // 9. Testimonial check for received slips
  const testByRefId = new Set(
    testimonials.map((t: any) => String(t.referral_id || '')).filter(Boolean)
  );
  const receivedSlipsToday = slips.filter(
    (s: any) =>
      String(s.to_user_id || '') === userId &&
      toISTDateKey(s.created_at) === istDate &&
      (!s.referral_id || !testByRefId.has(String(s.referral_id)))
  );
  if (receivedSlipsToday.length > 0) {
    tasks.push({
      id: 'give-testimonial',
      label: 'Submit Testimonial',
      link: '/testimonials?action=new',
    });
  }

  return tasks;
}

async function sendWithRetry(sub: any, payloadStr: string, maxAttempts = 3) {
  let lastErr: any = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await webpush.sendNotification(sub, payloadStr, { TTL: 14400 });
      return { ok: true, attempts: attempt, expired: false };
    } catch (err: any) {
      lastErr = err;
      const statusCode = Number(err?.statusCode || 0);
      if (statusCode === 404 || statusCode === 410) {
        return { ok: false, attempts: attempt, expired: true, error: err?.message || `HTTP ${statusCode}` };
      }
      const isRetryable = statusCode === 429 || statusCode >= 500 || statusCode === 0;
      if (!isRetryable || attempt === maxAttempts) {
        return { ok: false, attempts: attempt, expired: false, error: err?.message || 'Push send failed' };
      }
      await new Promise((r) => setTimeout(r, 300 * attempt));
    }
  }
  return { ok: false, attempts: maxAttempts, expired: false, error: lastErr?.message || 'Push send failed' };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const cronSecret = Deno.env.get('CRON_SECRET') || '';
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || '';
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || '';
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:sskbusinessnetwork@gmail.com';

  if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
    return new Response(
      JSON.stringify({ error: 'Missing required Supabase or VAPID secrets in Edge Function environment.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const authHeader = req.headers.get('authorization') || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const headerSecret = req.headers.get('x-cron-secret') || '';
  const isAuthorized =
    bearer === serviceRoleKey ||
    (Boolean(cronSecret) && (bearer === cronSecret || headerSecret === cronSecret));

  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let bodyJson: Record<string, any> = {};
  try {
    if (req.method === 'POST') {
      bodyJson = await req.json();
    }
  } catch {
    bodyJson = {};
  }

  const url = new URL(req.url);
  const now = new Date();
  const { istDate } = getISTParts(now);
  const slot = resolveSlot(bodyJson.slot || url.searchParams.get('slot'), now);
  const dryRun = Boolean(bodyJson.dryRun || url.searchParams.get('dryRun') === 'true');

  const { data: subscriptions, error: subErr } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('is_active', true);

  if (subErr) {
    return new Response(
      JSON.stringify({ error: 'Failed to load push subscriptions', detail: subErr.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const subsByUser = new Map<string, any[]>();
  for (const row of subscriptions || []) {
    const uid = String(row.user_id || '').trim();
    if (!uid) continue;
    const list = subsByUser.get(uid) || [];
    list.push(row);
    subsByUser.set(uid, list);
  }

  let usersProcessed = 0;
  let notificationsSent = 0;
  let notificationsSkipped = 0;
  let devicesExpired = 0;

  for (const [userId, userSubs] of subsByUser.entries()) {
    const idempotencyKey = `sched:${userId}:${istDate}:${slot}`;

    // Skip if already logged/sent for this IST date + slot
    const { data: existingLog } = await supabase
      .from('notification_logs')
      .select('id, status')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (existingLog && (existingLog.status === 'sent' || existingLog.status === 'partial')) {
      notificationsSkipped++;
      continue;
    }

    const { data: userRow } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    const memberRow =
      userRow ||
      (await supabase.from('master_admins').select('*').eq('id', userId).maybeSingle()).data;

    if (!memberRow) {
      notificationsSkipped++;
      continue;
    }

    const rawStatus = String(memberRow.account_status || memberRow.status || '').toUpperCase();
    if (rawStatus === 'DISABLED' || rawStatus === 'INACTIVE' || memberRow.disabled === true) {
      notificationsSkipped++;
      continue;
    }

    const memberName = String(memberRow.name || memberRow.full_name || 'Member').trim();
    const pendingTasks = await computeMemberPendingTasks(supabase, memberRow, istDate);
    const content = buildNotificationMessage(memberName, slot, pendingTasks);

    if (dryRun) {
      usersProcessed++;
      continue;
    }

    let succeeded = 0;
    let totalAttempts = 0;
    let lastErr: string | null = null;

    const payloadStr = JSON.stringify({
      title: content.title,
      body: content.body,
      url: content.targetUrl,
      link: content.targetUrl,
      tag: `ssk-scheduled-${slot}-${istDate}`,
      slot,
      pendingCount: pendingTasks.length,
    });

    for (const subRow of userSubs) {
      const subObj = subRow.subscription_json || {
        endpoint: subRow.endpoint,
        keys: { p256dh: subRow.p256dh, auth: subRow.auth },
      };

      const sendRes = await sendWithRetry(subObj, payloadStr);
      totalAttempts += sendRes.attempts;

      if (sendRes.ok) {
        succeeded++;
        await supabase
          .from('push_subscriptions')
          .update({ last_sent_at: new Date().toISOString(), failure_count: 0, last_error: null })
          .eq('id', subRow.id);
      } else if (sendRes.expired) {
        devicesExpired++;
        await supabase
          .from('push_subscriptions')
          .update({ is_active: false, last_error: sendRes.error || 'Subscription expired' })
          .eq('id', subRow.id);
      } else {
        lastErr = sendRes.error || 'Delivery error';
        await supabase
          .from('push_subscriptions')
          .update({
            failure_count: Number(subRow.failure_count || 0) + 1,
            last_error: lastErr,
          })
          .eq('id', subRow.id);
      }
    }

    const finalStatus =
      succeeded === userSubs.length
        ? 'sent'
        : succeeded > 0
          ? 'partial'
          : devicesExpired === userSubs.length
            ? 'expired'
            : 'failed';

    await supabase.from('notification_logs').upsert(
      {
        user_id: userId,
        subscription_id: userSubs[0]?.id || null,
        notification_date: istDate,
        slot,
        idempotency_key: idempotencyKey,
        title: content.title,
        body: content.body,
        pending_task_count: pendingTasks.length,
        target_url: content.targetUrl,
        status: finalStatus,
        attempt_count: totalAttempts,
        devices_targeted: userSubs.length,
        devices_succeeded: succeeded,
        error_message: lastErr,
      },
      { onConflict: 'idempotency_key' }
    );

    if (succeeded > 0) {
      notificationsSent++;
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'SYSTEM',
        title: content.title,
        message: content.body,
        link: content.targetUrl,
        is_read: false,
      });
    }

    usersProcessed++;
  }

  return new Response(
    JSON.stringify({
      ok: true,
      istDate,
      slot,
      dryRun,
      usersProcessed,
      notificationsSent,
      notificationsSkipped,
      devicesExpired,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
});
