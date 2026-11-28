import { supabase } from '../lib/supabaseClient';

export interface DirectorySnapshot {
  users: any[];
  chapters: any[];
  categories: any[];
  fetchedAt: number;
}

const DEFAULT_DIRECTORY_TTL_MS = 30_000;

let cachedSnapshot: DirectorySnapshot | null = null;
let inFlightSnapshot: Promise<DirectorySnapshot> | null = null;
let listenersAttached = false;

/**
 * Race a promise or thenable (such as a Supabase Postgrest builder) against a timeout.
 * Ensures UI loading states never hang indefinitely on stalled network requests.
 */
export function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number = 12_000,
  label: string = 'Request'
): Promise<T> {
  if (!Number.isFinite(ms) || ms <= 0) {
    return Promise.resolve(promise);
  }
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s. Please try again.`));
      }
    }, ms);

    Promise.resolve(promise).then(
      (value) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(value);
        }
      },
      (err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(err);
        }
      }
    );
  });
}

/**
 * Standard fetch wrapper with an AbortController timeout so slow /api/* calls fail cleanly.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs: number = 12_000
): Promise<Response> {
  const controller = new AbortController();
  const externalSignal = init.signal;

  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  let timedOut = false;
  const timer =
    Number.isFinite(timeoutMs) && timeoutMs > 0
      ? setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, timeoutMs)
      : null;

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err: any) {
    if (timedOut) {
      const timeoutErr = new Error('Request timed out. Please check your connection and try again.');
      timeoutErr.name = 'TimeoutError';
      throw timeoutErr;
    }
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

export function invalidateDirectoryCache() {
  cachedSnapshot = null;
}

function attachDirectoryInvalidationListeners() {
  if (listenersAttached || typeof window === 'undefined') return;
  listenersAttached = true;
  const events = ['members-refresh', 'profile-updated', 'dashboard-refresh', 'categories-updated'];
  events.forEach((evt) => {
    window.addEventListener(evt, invalidateDirectoryCache);
  });
}

/**
 * Shared cached snapshot of users, chapters, and categories across modals and pages.
 * Deduplicates simultaneous calls and reuses results for 30s unless forceRefresh is true.
 */
export async function getDirectorySnapshot(options?: {
  forceRefresh?: boolean;
  ttlMs?: number;
  timeoutMs?: number;
}): Promise<DirectorySnapshot> {
  attachDirectoryInvalidationListeners();

  const ttlMs = options?.ttlMs ?? DEFAULT_DIRECTORY_TTL_MS;
  const timeoutMs = options?.timeoutMs ?? 12_000;

  if (!options?.forceRefresh && cachedSnapshot && Date.now() - cachedSnapshot.fetchedAt < ttlMs) {
    return cachedSnapshot;
  }

  if (!options?.forceRefresh && inFlightSnapshot) {
    return inFlightSnapshot;
  }

  const request = (async (): Promise<DirectorySnapshot> => {
    const [usersRes, chaptersRes, categoriesRes] = await withTimeout(
      Promise.all([
        supabase.from('users').select('*'),
        supabase.from('chapters').select('id, chapter_name, name'),
        supabase.from('categories').select('*')
      ]),
      timeoutMs,
      'Loading member directory'
    );

    const snapshot: DirectorySnapshot = {
      users: usersRes?.data || [],
      chapters: chaptersRes?.data || [],
      categories: categoriesRes?.data || [],
      fetchedAt: Date.now()
    };

    // Only cache if users call did not error out cleanly; still return whatever we got
    if (!usersRes?.error) {
      cachedSnapshot = snapshot;
    }
    return snapshot;
  })();

  inFlightSnapshot = request;
  try {
    return await request;
  } finally {
    if (inFlightSnapshot === request) {
      inFlightSnapshot = null;
    }
  }
}
