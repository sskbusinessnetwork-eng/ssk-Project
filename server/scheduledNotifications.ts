import type { SupabaseClient } from '@supabase/supabase-js';

export type NotificationSlot = 'morning' | 'afternoon' | 'evening' | 'night';

export interface PendingTaskSummary {
  id: string;
  label: string;
  link: string;
  urgent?: boolean;
  overdue?: boolean;
}

export interface StoredPushDevice {
  id?: string;
  userId: string;
  endpoint: string;
  p256dh?: string;
  auth?: string;
  subscription: {
    endpoint: string;
    expirationTime?: number | null;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  deviceLabel?: string;
  platform?: string;
  userAgent?: string;
  isActive: boolean;
  failureCount?: number;
  lastError?: string | null;
  lastSentAt?: string | null;
  lastSeenAt?: string | null;
  source?: 'table' | 'profile_meta';
}

export interface WebPushClientLike {
  sendNotification: (subscription: any, payload?: string | Buffer | null, options?: any) => Promise<any>;
}

const IST_OFFSET_MS = 19_800_000; // Asia/Kolkata is fixed UTC+05:30

export function getISTNowParts(date = new Date()): {
  istDate: string;
  hour: number;
  minute: number;
} {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  return {
    istDate: `${year}-${month}-${day}`,
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

export function resolveNotificationSlot(
  explicitSlot?: string | null,
  date = new Date()
): NotificationSlot {
  const normalized = String(explicitSlot || '').trim().toLowerCase();
  if (
    normalized === 'morning' ||
    normalized === 'afternoon' ||
    normalized === 'evening' ||
    normalized === 'night'
  ) {
    return normalized;
  }

  const { hour } = getISTNowParts(date);
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'night';
}

export function toISTDateKey(input: unknown): string {
  if (!input) return '';
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return getISTNowParts(parsed).istDate;
    }
    return '';
  }
  if (input instanceof Date && !Number.isNaN(input.getTime())) {
    return getISTNowParts(input).istDate;
  }
  return '';
}

export function isValidPushEndpointUrl(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== 'string' || !endpoint.trim() || endpoint.length > 2048) {
    return false;
  }
  try {
    const url = new URL(endpoint.trim());
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.endsWith('.local') ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) {
      return false;
    }
    return Boolean(host);
  } catch {
    return false;
  }
}

export function getGreetingTitle(memberName: string, slot: NotificationSlot): string {
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

export function buildPersonalizedNotificationContent(
  memberName: string,
  slot: NotificationSlot,
  tasks: PendingTaskSummary[]
): { title: string; body: string; targetUrl: string; pendingCount: number } {
  const cleanName = (memberName || 'Member').trim() || 'Member';
  const count = tasks.length;
  const title = getGreetingTitle(cleanName, slot);

  if (count === 0) {
    const emptyBody: Record<NotificationSlot, string> = {
      morning: `Good Morning, ${cleanName}! Have a productive day.`,
      afternoon: `Good Afternoon, ${cleanName}! Wishing you a great and productive afternoon.`,
      evening: `Good Evening, ${cleanName}! You have completed all your chapter tasks today.`,
      night: `Good Night, ${cleanName}! All tasks are complete today. Rest well and prepare for tomorrow.`,
    };
    return {
      title,
      body: emptyBody[slot],
      targetUrl: '/dashboard',
      pendingCount: 0,
    };
  }

  const topTasks = tasks.slice(0, 2).map((t) => t.label);
  const extraCount = count > 2 ? ` +${count - 2} more` : '';
  const summary = `${topTasks.join(', ')}${extraCount}`;
  const firstLink = (tasks.find((t) => t.overdue || t.urgent) || tasks[0])?.link || '/notifications';

  const taskWord = count === 1 ? 'task' : 'tasks';
  const activityWord = count === 1 ? 'activity' : 'activities';

  const bodies: Record<NotificationSlot, string> = {
    morning: `Good Morning, ${cleanName}! Have a productive day. You have ${count} pending ${taskWord}: ${summary}.`,
    afternoon: `Good Afternoon, ${cleanName}! Don't forget to complete your ${count} pending chapter ${activityWord}: ${summary}.`,
    evening: `Good Evening, ${cleanName}! Take a moment to finish your ${count} remaining ${taskWord}: ${summary}.`,
    night: `Good Night, ${cleanName}! Check your ${count} remaining pending ${taskWord} (${summary}) and prepare for tomorrow.`,
  };

  return {
    title,
    body: bodies[slot],
    targetUrl: firstLink,
    pendingCount: count,
  };
}

function isMissingTableError(error: any): boolean {
  const code = String(error?.code || '');
  const msg = String(error?.message || '').toLowerCase();
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.includes('does not exist') ||
    msg.includes('could not find the table')
  );
}

export function parseProfilePhotoEnvelope(rawValue?: string | null): {
  photoUrl: string;
  extraData: Record<string, any>;
  format: 'json' | 'pipe' | 'plain';
} {
  const raw = String(rawValue || '').trim();
  if (!raw) return { photoUrl: '', extraData: {}, format: 'pipe' };

  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          photoUrl: String(parsed.url || ''),
          extraData: parsed.extra && typeof parsed.extra === 'object' ? { ...parsed.extra } : {},
          format: 'json',
        };
      }
    } catch {
      // fall through
    }
  }

  if (raw.includes('|||')) {
    const parts = raw.split('|||');
    let extraData: Record<string, any> = {};
    try {
      extraData = JSON.parse(parts[1] || '{}');
    } catch {
      extraData = {};
    }
    return {
      photoUrl: parts[0] || '',
      extraData: extraData && typeof extraData === 'object' ? extraData : {},
      format: 'pipe',
    };
  }

  return { photoUrl: raw, extraData: {}, format: 'plain' };
}

export function serializeProfilePhotoEnvelope(
  photoUrl: string,
  extraData: Record<string, any>,
  preferredFormat: 'json' | 'pipe' | 'plain' = 'pipe'
): string {
  if (preferredFormat === 'json') {
    return JSON.stringify({ url: photoUrl || '', extra: extraData });
  }
  return `${photoUrl || ''}|||${JSON.stringify(extraData)}`;
}

async function resolveMemberTableAndRow(
  supabase: SupabaseClient,
  userId: string
): Promise<{ table: 'users' | 'master_admins'; row: Record<string, any> } | null> {
  const uid = String(userId || '').trim();
  if (!uid) return null;

  const { data: userRow } = await supabase
    .from('users')
    .select('*')
    .or(`id.eq.${uid},uid.eq.${uid}`)
    .maybeSingle();

  if (userRow) {
    return { table: 'users', row: userRow };
  }

  const { data: maRow } = await supabase
    .from('master_admins')
    .select('*')
    .eq('id', uid)
    .maybeSingle();

  if (maRow) {
    return { table: 'master_admins', row: maRow };
  }

  return null;
}

function extractFallbackDevices(userId: string, extraData: Record<string, any>): StoredPushDevice[] {
  const devices: StoredPushDevice[] = [];
  const seenEndpoints = new Set<string>();

  if (Array.isArray(extraData.push_subscriptions)) {
    for (const item of extraData.push_subscriptions) {
      const ep = item?.endpoint || item?.subscription?.endpoint;
      const subObj = item?.subscription || (ep ? { endpoint: ep, keys: item?.keys } : null);
      if (!ep || !subObj?.keys?.p256dh || !subObj?.keys?.auth || seenEndpoints.has(ep)) continue;
      seenEndpoints.add(ep);
      devices.push({
        userId,
        endpoint: ep,
        p256dh: subObj.keys.p256dh,
        auth: subObj.keys.auth,
        subscription: subObj,
        deviceLabel: item.deviceLabel || 'Web Browser',
        platform: item.platform || 'web',
        userAgent: item.userAgent || '',
        isActive: item.isActive !== false,
        failureCount: Number(item.failureCount || 0),
        lastError: item.lastError || null,
        lastSentAt: item.lastSentAt || null,
        lastSeenAt: item.lastSeenAt || null,
        source: 'profile_meta',
      });
    }
  }

  if (extraData.push_token && typeof extraData.push_token === 'object') {
    const ep = extraData.push_token.endpoint;
    const keys = extraData.push_token.keys;
    if (ep && keys?.p256dh && keys?.auth && !seenEndpoints.has(ep)) {
      devices.push({
        userId,
        endpoint: ep,
        p256dh: keys.p256dh,
        auth: keys.auth,
        subscription: extraData.push_token,
        deviceLabel: 'Registered Device',
        platform: 'web',
        isActive: true,
        source: 'profile_meta',
      });
    }
  }

  return devices;
}

export async function upsertDeviceSubscription(
  supabase: SupabaseClient,
  params: {
    userId: string;
    subscription: {
      endpoint: string;
      expirationTime?: number | null;
      keys: { p256dh: string; auth: string };
    };
    deviceLabel?: string;
    platform?: string;
    userAgent?: string;
  }
): Promise<{ success: boolean; storage: 'table' | 'profile_meta'; deviceCount: number }> {
  const userId = String(params.userId || '').trim();
  const sub = params.subscription;

  if (!userId) {
    throw new Error('Missing user ID');
  }
  if (!sub || !isValidPushEndpointUrl(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) {
    throw new Error('Invalid push subscription payload');
  }

  const member = await resolveMemberTableAndRow(supabase, userId);
  if (!member) {
    throw new Error('Authenticated member account not found');
  }

  const canonicalUserId = String(member.row.id || userId).trim();
  const nowIso = new Date().toISOString();
  const deviceLabel = String(params.deviceLabel || 'Web Browser').slice(0, 120);
  const platform = String(params.platform || 'web').slice(0, 60);
  const userAgent = String(params.userAgent || '').slice(0, 400);

  // 1. Primary path: dedicated push_subscriptions table
  const { error: upsertErr } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: canonicalUserId,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        subscription_json: sub,
        device_label: deviceLabel,
        platform,
        user_agent: userAgent,
        is_active: true,
        failure_count: 0,
        last_error: null,
        last_seen_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: 'endpoint' }
    );

  if (!upsertErr) {
    const { data: activeRows } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', canonicalUserId)
      .eq('is_active', true);

    return {
      success: true,
      storage: 'table',
      deviceCount: activeRows?.length || 1,
    };
  }

  if (!isMissingTableError(upsertErr)) {
    console.warn('push_subscriptions upsert fallback notice:', upsertErr.message);
  }

  // 2. Fallback path: multi-device array inside member profile_photo metadata (preserves existing devices)
  const { photoUrl, extraData, format } = parseProfilePhotoEnvelope(member.row.profile_photo);
  const existingDevices = extractFallbackDevices(canonicalUserId, extraData).filter(
    (d) => d.endpoint !== sub.endpoint
  );

  const updatedDevice = {
    endpoint: sub.endpoint,
    subscription: sub,
    deviceLabel,
    platform,
    userAgent,
    isActive: true,
    failureCount: 0,
    lastError: null,
    lastSeenAt: nowIso,
  };

  const nextList = [
    updatedDevice,
    ...existingDevices.map((d) => ({
      endpoint: d.endpoint,
      subscription: d.subscription,
      deviceLabel: d.deviceLabel,
      platform: d.platform,
      userAgent: d.userAgent,
      isActive: d.isActive,
      failureCount: d.failureCount || 0,
      lastError: d.lastError || null,
      lastSentAt: d.lastSentAt || null,
      lastSeenAt: d.lastSeenAt || null,
    })),
  ].slice(0, 15);

  extraData.push_subscriptions = nextList;
  extraData.push_token = sub; // keep backward compatibility with single-token readers

  const nextProfilePhoto = serializeProfilePhotoEnvelope(
    photoUrl,
    extraData,
    format === 'json' ? 'json' : 'pipe'
  );

  const { error: metaErr } = await supabase
    .from(member.table)
    .update({ profile_photo: nextProfilePhoto })
    .eq('id', member.row.id);

  if (metaErr) {
    throw new Error(metaErr.message || 'Failed to store push subscription');
  }

  return {
    success: true,
    storage: 'profile_meta',
    deviceCount: nextList.filter((d) => d.isActive).length,
  };
}

export async function deactivateDeviceSubscription(
  supabase: SupabaseClient,
  params: { userId: string; endpoint?: string | null }
): Promise<{ success: boolean; remainingDevices: number }> {
  const userId = String(params.userId || '').trim();
  const endpoint = params.endpoint ? String(params.endpoint).trim() : null;
  if (!userId) return { success: false, remainingDevices: 0 };

  const member = await resolveMemberTableAndRow(supabase, userId);
  const canonicalUserId = String(member?.row?.id || userId).trim();

  let tableWorked = false;
  try {
    let query = supabase
      .from('push_subscriptions')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', canonicalUserId);

    if (endpoint) {
      query = query.eq('endpoint', endpoint);
    }

    const { error } = await query;
    if (!error) {
      tableWorked = true;
    } else if (!isMissingTableError(error)) {
      console.warn('push_subscriptions deactivate warning:', error.message);
    }
  } catch {}

  if (member) {
    const { photoUrl, extraData, format } = parseProfilePhotoEnvelope(member.row.profile_photo);
    const existing = extractFallbackDevices(canonicalUserId, extraData);
    const updated = existing.map((d) =>
      !endpoint || d.endpoint === endpoint
        ? { ...d, isActive: false }
        : d
    );
    const activeRemaining = updated.filter((d) => d.isActive);
    extraData.push_subscriptions = updated;
    if (!endpoint || extraData.push_token?.endpoint === endpoint) {
      extraData.push_token = activeRemaining[0]?.subscription || null;
    }
    const nextPhoto = serializeProfilePhotoEnvelope(
      photoUrl,
      extraData,
      format === 'json' ? 'json' : 'pipe'
    );
    await supabase.from(member.table).update({ profile_photo: nextPhoto }).eq('id', member.row.id);

    if (!tableWorked) {
      return { success: true, remainingDevices: activeRemaining.length };
    }
  }

  const { data: activeRows } = await supabase
    .from('push_subscriptions')
    .select('id')
    .eq('user_id', canonicalUserId)
    .eq('is_active', true);

  return { success: true, remainingDevices: activeRows?.length || 0 };
}

export async function getUserDeviceSubscriptions(
  supabase: SupabaseClient,
  userId: string
): Promise<StoredPushDevice[]> {
  const member = await resolveMemberTableAndRow(supabase, userId);
  const canonicalUserId = String(member?.row?.id || userId).trim();

  const { data: tableRows, error: tableErr } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', canonicalUserId)
    .eq('is_active', true);

  if (!tableErr && tableRows) {
    return tableRows.map((row: any) => ({
      id: row.id,
      userId: canonicalUserId,
      endpoint: row.endpoint,
      p256dh: row.p256dh,
      auth: row.auth,
      subscription: row.subscription_json || {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      },
      deviceLabel: row.device_label || 'Web Browser',
      platform: row.platform || 'web',
      userAgent: row.user_agent || '',
      isActive: Boolean(row.is_active),
      failureCount: Number(row.failure_count || 0),
      lastError: row.last_error || null,
      lastSentAt: row.last_sent_at || null,
      lastSeenAt: row.last_seen_at || null,
      source: 'table' as const,
    }));
  }

  if (!member) return [];
  const { extraData } = parseProfilePhotoEnvelope(member.row.profile_photo);
  return extractFallbackDevices(canonicalUserId, extraData).filter((d) => d.isActive);
}

export async function computeMemberPendingTasks(
  supabase: SupabaseClient,
  userRow: Record<string, any>,
  istDate: string
): Promise<PendingTaskSummary[]> {
  const userId = String(userRow.id || userRow.uid || '').trim();
  if (!userId) return [];

  const role = String(userRow.role || '').toUpperCase();
  const isMasterAdmin = role === 'MASTER_ADMIN';
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
      .select('id, creator_id, sender_id, member_id, receiver_id, date, scheduled_date, status, created_at, completed_at, attendance')
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
          .select('id, title, date, meeting_date, attendance, chapter_id, status')
          .eq('chapter_id', chapterId)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const meetings = meetingsRes.data || [];
  const referrals = referralsRes.data || [];
  const slips = slipsRes.data || [];
  const testimonials = testimonialsRes.data || [];
  const guests = guestsRes.data || [];
  const chapterMeetings = chapterMeetingsRes.data || [];

  const tasks: PendingTaskSummary[] = [];

  // 1. Overdue 1-to-1 meetings (scheduled before today IST and not COMPLETED/CANCELLED)
  const overdueMeetings = meetings.filter((m: any) => {
    const isCreator = String(m.creator_id || m.sender_id || '') === userId;
    const isParticipant =
      isCreator || String(m.member_id || m.receiver_id || '') === userId;
    const mDate = toISTDateKey(m.date || m.scheduled_date);
    const status = String(m.status || '').toUpperCase();
    const o2oAtt = (m.attendance || {})[userId];
    const done =
      status === 'COMPLETED' ||
      status === 'CANCELLED' ||
      o2oAtt === 'PRESENT' ||
      o2oAtt === 'Present' ||
      Boolean(m.completed_at);
    return isParticipant && Boolean(mDate) && mDate < istDate && !done;
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

  // 2. Today's 1-to-1 meetings or daily Schedule 1-to-1 activity
  const todayMeetings = meetings.filter((m: any) => {
    const isParticipant =
      String(m.creator_id || m.sender_id || '') === userId ||
      String(m.member_id || m.receiver_id || '') === userId;
    const mDate = toISTDateKey(m.date || m.scheduled_date);
    const status = String(m.status || '').toUpperCase();
    return (
      isParticipant &&
      mDate === istDate &&
      status !== 'CANCELLED' &&
      status !== 'COMPLETED' &&
      !m.completed_at
    );
  });
  if (todayMeetings.length > 0) {
    tasks.push({
      id: 'today-1to1',
      label: `${todayMeetings.length} 1-to-1 meeting${todayMeetings.length > 1 ? 's' : ''} today`,
      link: '/one-to-one',
      urgent: true,
    });
  } else if (!isMasterAdmin) {
    const scheduledToday = meetings.some((m: any) => {
      const isCreator = String(m.creator_id || m.sender_id || '') === userId;
      return (
        isCreator &&
        (toISTDateKey(m.created_at) === istDate || toISTDateKey(m.date || m.scheduled_date) === istDate)
      );
    });
    if (!scheduledToday) {
      tasks.push({
        id: 'schedule-1to1',
        label: 'Schedule 1-to-1 Meeting',
        link: '/one-to-one?action=new',
      });
    }
  }

  // 3. Pending received referrals (never include other members' private tasks)
  const pendingReceivedRefs = referrals.filter((r: any) => {
    const receiver = String(r.to_user_id || r.receiver_id || '');
    const status = String(r.status || '').toUpperCase();
    return (
      receiver === userId &&
      status !== 'CONVERTED' &&
      status !== 'COMPLETED' &&
      status !== 'CLOSED' &&
      status !== 'REJECTED'
    );
  });
  if (pendingReceivedRefs.length > 0) {
    const hasOverdueRef = pendingReceivedRefs.some((r: any) => {
      const createdDay = toISTDateKey(r.created_at);
      return Boolean(createdDay) && createdDay < istDate;
    });
    tasks.push({
      id: 'pending-referrals',
      label: `Update ${pendingReceivedRefs.length} pending referral${pendingReceivedRefs.length > 1 ? 's' : ''}`,
      link: '/referrals',
      urgent: true,
      overdue: hasOverdueRef,
    });
  }

  // 4. Converted referrals missing Thank You Slip
  const slipByRefId = new Set(
    slips.map((s: any) => String(s.referral_id || '')).filter(Boolean)
  );
  const missingSlipRefs = referrals.filter((r: any) => {
    const receiver = String(r.to_user_id || r.receiver_id || '');
    const status = String(r.status || '').toUpperCase();
    return (
      receiver === userId &&
      (status === 'CONVERTED' || status === 'COMPLETED') &&
      !slipByRefId.has(String(r.id))
    );
  });
  if (missingSlipRefs.length > 0) {
    tasks.push({
      id: 'missing-thank-you-slip',
      label: `Send Thank You Slip (${missingSlipRefs.length})`,
      link: '/thank-you-slips',
      urgent: true,
    });
  }

  // 5. Daily Pass Referral task for active chapter members
  if (!isMasterAdmin) {
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

    // 6. Daily Invite Guest task
    const invitedGuestToday = guests.some((g: any) => {
      const creator = String(
        g.invited_by_user_id || g.invited_by || g.user_id || g.member_id || ''
      );
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
  }

  // 7. Chapter Meeting Today attendance pending
  const todayChapterMeetings = chapterMeetings.filter(
    (m: any) =>
      toISTDateKey(m.date || m.meeting_date) === istDate &&
      String(m.status || '').toUpperCase() !== 'CANCELLED'
  );
  for (const cm of todayChapterMeetings) {
    const att = (cm.attendance || {})[userId];
    if (!att) {
      tasks.push({
        id: `chapter-meeting-${cm.id}`,
        label: 'Attend Chapter Meeting',
        link: `/meetings?meetingId=${cm.id}&attend=true`,
        urgent: true,
      });
      break;
    }
  }

  // 8. Complete Profile Details check
  if (!isMasterAdmin) {
    const missingProfile =
      !userRow.business_name ||
      !userRow.profession_designation ||
      !userRow.profile_photo ||
      !userRow.bio;
    if (missingProfile) {
      tasks.push({
        id: 'complete-profile',
        label: 'Complete Profile Details',
        link: '/profile',
      });
    }
  }

  // 9. Testimonial submission for received Thank You Slips
  const testByRefId = new Set(
    testimonials.map((t: any) => String(t.referral_id || '')).filter(Boolean)
  );
  const receivedSlipsPendingTestimony = slips.filter(
    (s: any) =>
      String(s.to_user_id || '') === userId &&
      toISTDateKey(s.created_at) === istDate &&
      (!s.referral_id || !testByRefId.has(String(s.referral_id)))
  );
  if (receivedSlipsPendingTestimony.length > 0) {
    tasks.push({
      id: 'give-testimonial',
      label: 'Submit Testimonial',
      link: '/testimonials?action=new',
    });
  }

  return tasks;
}

export async function sendPushWithRetry(
  webpushClient: WebPushClientLike,
  sub: any,
  payloadStr: string,
  maxAttempts = 3
): Promise<{ ok: boolean; attempts: number; expired: boolean; error?: string }> {
  let lastErr: any = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await webpushClient.sendNotification(sub, payloadStr, { TTL: 14400 });
      return { ok: true, attempts: attempt, expired: false };
    } catch (err: any) {
      lastErr = err;
      const statusCode = Number(err?.statusCode || 0);
      if (statusCode === 404 || statusCode === 410) {
        return {
          ok: false,
          attempts: attempt,
          expired: true,
          error: err?.message || `HTTP ${statusCode}`,
        };
      }
      const isRetryable = statusCode === 429 || statusCode >= 500 || statusCode === 0;
      if (!isRetryable || attempt === maxAttempts) {
        return {
          ok: false,
          attempts: attempt,
          expired: false,
          error: err?.message || 'Push send failed',
        };
      }
      await new Promise((r) => setTimeout(r, 250 * attempt));
    }
  }
  return {
    ok: false,
    attempts: maxAttempts,
    expired: false,
    error: lastErr?.message || 'Push send failed',
  };
}

export async function sendPushToUserDevices(
  supabase: SupabaseClient,
  webpushClient: WebPushClientLike,
  userId: string,
  payload: Record<string, any>
): Promise<{
  devicesTargeted: number;
  devicesSucceeded: number;
  devicesExpired: number;
  attempts: number;
  lastError: string | null;
}> {
  const devices = await getUserDeviceSubscriptions(supabase, userId);
  if (devices.length === 0) {
    return {
      devicesTargeted: 0,
      devicesSucceeded: 0,
      devicesExpired: 0,
      attempts: 0,
      lastError: 'No active subscribed devices found',
    };
  }

  const payloadStr = JSON.stringify(payload);
  let devicesSucceeded = 0;
  let devicesExpired = 0;
  let attempts = 0;
  let lastError: string | null = null;

  for (const device of devices) {
    const res = await sendPushWithRetry(webpushClient, device.subscription, payloadStr);
    attempts += res.attempts;

    if (res.ok) {
      devicesSucceeded++;
      if (device.source === 'table' && device.id) {
        await supabase
          .from('push_subscriptions')
          .update({
            last_sent_at: new Date().toISOString(),
            failure_count: 0,
            last_error: null,
          })
          .eq('id', device.id);
      }
    } else if (res.expired) {
      devicesExpired++;
      await deactivateDeviceSubscription(supabase, {
        userId,
        endpoint: device.endpoint,
      });
    } else {
      lastError = res.error || 'Delivery error';
      if (device.source === 'table' && device.id) {
        await supabase
          .from('push_subscriptions')
          .update({
            failure_count: Number(device.failureCount || 0) + 1,
            last_error: lastError,
          })
          .eq('id', device.id);
      }
    }
  }

  return {
    devicesTargeted: devices.length,
    devicesSucceeded,
    devicesExpired,
    attempts,
    lastError,
  };
}

async function listAllSubscribedUsers(
  supabase: SupabaseClient,
  targetUserId?: string
): Promise<Map<string, StoredPushDevice[]>> {
  const subsByUser = new Map<string, StoredPushDevice[]>();

  // 1. Primary table lookup
  let tableQuery = supabase
    .from('push_subscriptions')
    .select('*')
    .eq('is_active', true);

  if (targetUserId) {
    tableQuery = tableQuery.eq('user_id', targetUserId);
  }

  const { data: tableRows, error: tableErr } = await tableQuery;

  if (!tableErr && tableRows) {
    for (const row of tableRows) {
      const uid = String(row.user_id || '').trim();
      if (!uid) continue;
      const list = subsByUser.get(uid) || [];
      list.push({
        id: row.id,
        userId: uid,
        endpoint: row.endpoint,
        p256dh: row.p256dh,
        auth: row.auth,
        subscription: row.subscription_json || {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        },
        deviceLabel: row.device_label || 'Web Browser',
        platform: row.platform || 'web',
        userAgent: row.user_agent || '',
        isActive: true,
        failureCount: Number(row.failure_count || 0),
        source: 'table',
      });
      subsByUser.set(uid, list);
    }
    return subsByUser;
  }

  if (tableErr && !isMissingTableError(tableErr)) {
    throw new Error(`Failed to load push_subscriptions: ${tableErr.message}`);
  }

  // 2. Fallback scan if push_subscriptions migration has not yet been applied
  const [usersRes, mastersRes] = await Promise.all([
    targetUserId
      ? supabase.from('users').select('id, uid, profile_photo').or(`id.eq.${targetUserId},uid.eq.${targetUserId}`)
      : supabase.from('users').select('id, uid, profile_photo').not('profile_photo', 'is', null),
    targetUserId
      ? supabase.from('master_admins').select('id, profile_photo').eq('id', targetUserId)
      : supabase.from('master_admins').select('id, profile_photo').not('profile_photo', 'is', null),
  ]);

  const rows: Array<Record<string, any>> = [...(usersRes.data || []), ...(mastersRes.data || [])];
  for (const row of rows) {
    const uid = String(row.id || row.uid || '').trim();
    if (!uid) continue;
    const { extraData } = parseProfilePhotoEnvelope(row.profile_photo);
    const active = extractFallbackDevices(uid, extraData).filter((d) => d.isActive);
    if (active.length > 0) {
      subsByUser.set(uid, active);
    }
  }

  return subsByUser;
}

async function hasAlreadyDispatched(
  supabase: SupabaseClient,
  userId: string,
  idempotencyKey: string,
  slot: NotificationSlot,
  istDate: string
): Promise<boolean> {
  const { data: logRow, error: logErr } = await supabase
    .from('notification_logs')
    .select('id, status')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (!logErr) {
    return Boolean(logRow && (logRow.status === 'sent' || logRow.status === 'partial'));
  }

  if (!isMissingTableError(logErr)) {
    return false;
  }

  // Fallback duplicate check using notifications table
  const { data: existingNotifs } = await supabase
    .from('notifications')
    .select('id, link, title, message, created_at')
    .eq('user_id', userId)
    .eq('type', 'SYSTEM')
    .order('created_at', { ascending: false })
    .limit(20);

  const slotTitlePrefix =
    slot === 'morning'
      ? 'Good Morning'
      : slot === 'afternoon'
        ? 'Good Afternoon'
        : slot === 'evening'
          ? 'Good Evening'
          : 'Good Night';

  return (existingNotifs || []).some(
    (n: any) =>
      toISTDateKey(n.created_at) === istDate &&
      String(n.title || '').startsWith(slotTitlePrefix)
  );
}

export async function runScheduledNotificationDispatch(
  supabase: SupabaseClient,
  webpushClient: WebPushClientLike,
  options: {
    slot?: string | null;
    dryRun?: boolean;
    targetUserId?: string;
    now?: Date;
  } = {}
) {
  const now = options.now || new Date();
  const { istDate } = getISTNowParts(now);
  const slot = resolveNotificationSlot(options.slot, now);
  const dryRun = Boolean(options.dryRun);

  const subsByUser = await listAllSubscribedUsers(supabase, options.targetUserId);

  let usersProcessed = 0;
  let notificationsSent = 0;
  let notificationsSkipped = 0;
  let devicesExpired = 0;
  const previews: Array<{
    userId: string;
    memberName: string;
    pendingCount: number;
    title: string;
    body: string;
    targetUrl: string;
    devicesCount: number;
  }> = [];

  for (const [userId, userDevices] of subsByUser.entries()) {
    const idempotencyKey = `sched:${userId}:${istDate}:${slot}`;

    const alreadySent = await hasAlreadyDispatched(supabase, userId, idempotencyKey, slot, istDate);
    if (alreadySent) {
      notificationsSkipped++;
      continue;
    }

    const member = await resolveMemberTableAndRow(supabase, userId);
    if (!member) {
      notificationsSkipped++;
      continue;
    }

    const memberRow = member.row;
    const rawStatus = String(memberRow.account_status || memberRow.status || '').toUpperCase();
    if (rawStatus === 'DISABLED' || rawStatus === 'INACTIVE' || memberRow.disabled === true) {
      notificationsSkipped++;
      continue;
    }

    const memberName = String(memberRow.name || memberRow.full_name || 'Member').trim();
    const pendingTasks = await computeMemberPendingTasks(supabase, memberRow, istDate);
    const content = buildPersonalizedNotificationContent(memberName, slot, pendingTasks);

    if (dryRun) {
      usersProcessed++;
      previews.push({
        userId,
        memberName,
        pendingCount: content.pendingCount,
        title: content.title,
        body: content.body,
        targetUrl: content.targetUrl,
        devicesCount: userDevices.length,
      });
      continue;
    }

    const sendSummary = await sendPushToUserDevices(supabase, webpushClient, userId, {
      title: content.title,
      body: content.body,
      url: content.targetUrl,
      link: content.targetUrl,
      tag: `ssk-scheduled-${slot}-${istDate}`,
      slot,
      pendingCount: content.pendingCount,
    });

    devicesExpired += sendSummary.devicesExpired;

    const finalStatus =
      sendSummary.devicesSucceeded === sendSummary.devicesTargeted && sendSummary.devicesTargeted > 0
        ? 'sent'
        : sendSummary.devicesSucceeded > 0
          ? 'partial'
          : sendSummary.devicesExpired === sendSummary.devicesTargeted && sendSummary.devicesTargeted > 0
            ? 'expired'
            : 'failed';

    try {
      await supabase.from('notification_logs').upsert(
        {
          user_id: userId,
          subscription_id: userDevices[0]?.id || null,
          notification_date: istDate,
          slot,
          idempotency_key: idempotencyKey,
          title: content.title,
          body: content.body,
          pending_task_count: content.pendingCount,
          target_url: content.targetUrl,
          status: finalStatus,
          attempt_count: sendSummary.attempts,
          devices_targeted: sendSummary.devicesTargeted,
          devices_succeeded: sendSummary.devicesSucceeded,
          error_message: sendSummary.lastError,
        },
        { onConflict: 'idempotency_key' }
      );
    } catch {
      // Ignore if notification_logs migration is pending
    }

    if (sendSummary.devicesSucceeded > 0) {
      notificationsSent++;
      try {
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'SYSTEM',
          title: content.title,
          message: content.body,
          link: content.targetUrl,
          is_read: false,
        });
      } catch {}
    }

    usersProcessed++;
  }

  return {
    ok: true,
    istDate,
    slot,
    dryRun,
    usersProcessed,
    notificationsSent,
    notificationsSkipped,
    devicesExpired,
    ...(dryRun ? { previews } : {}),
  };
}
