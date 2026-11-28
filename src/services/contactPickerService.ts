import { dedupePhoneNumbers, normalizePickedPhoneNumber } from '../utils/phoneUtils';

export interface PickedContact {
  phone: string;
  name?: string;
}

export interface ParsedVCardContact {
  name: string;
  phones: string[];
}

export type ContactPickerUnavailableReason =
  | 'unsupported'
  | 'iframe_blocked'
  | 'permission_denied'
  | 'blocked';

export type NativeBridgeType =
  | 'capacitor'
  | 'cordova'
  | 'android-js'
  | 'react-native'
  | 'flutter';

export interface ContactPickerRuntimeInfo {
  isInIframe: boolean;
  isSecureContext: boolean;
  userAgent: string;
  isAndroid: boolean;
  isIOS: boolean;
  isWebView: boolean;
  hasNativeBridge: boolean;
  nativeBridgeType: NativeBridgeType | null;
  hasWebContactPicker: boolean;
}

export interface ContactPickerEnvironment {
  windowObj?: any;
  navigatorObj?: any;
}

export type ContactResolutionResult =
  | { status: 'selected'; contact: PickedContact; source: 'native' | 'web' }
  | { status: 'multiple_numbers'; name: string; phones: string[]; source: 'native' | 'web' }
  | { status: 'no_phone'; name?: string; source: 'native' | 'web' }
  | { status: 'cancelled'; source: 'native' | 'web' }
  | {
      status: 'unavailable';
      reason: ContactPickerUnavailableReason;
      errorName?: string;
      runtime: ContactPickerRuntimeInfo;
    };

function unescapeVCardValue(value: string): string {
  return value
    .replace(/\\n/gi, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

function decodeQuotedPrintable(input: string): string {
  try {
    const cleaned = input.replace(/=\r?\n/g, '');
    const bytes: number[] = [];
    for (let i = 0; i < cleaned.length; i++) {
      if (cleaned[i] === '=' && /^[0-9A-Fa-f]{2}$/.test(cleaned.slice(i + 1, i + 3))) {
        bytes.push(parseInt(cleaned.slice(i + 1, i + 3), 16));
        i += 2;
      } else {
        bytes.push(cleaned.charCodeAt(i));
      }
    }
    return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
  } catch {
    return input;
  }
}

/**
 * Parses .vcf (vCard 2.1 / 3.0 / 4.0) text into normalized, deduplicated contacts.
 * Preserves international country codes (+91, +1, etc.) and ignores invalid entries.
 */
export function parseVCardContacts(vcfText: string): ParsedVCardContact[] {
  if (!vcfText || typeof vcfText !== 'string') return [];

  // Remove UTF-8 BOM and normalize line endings
  const cleanText = vcfText
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // Join Quoted-Printable soft line breaks (=<newline>) before standard RFC folding
  const qpUnfolded = cleanText.replace(/=\n(?![A-Z0-9.-]+[:;])/gi, '');
  // Unfold RFC 6350/2426 folded lines (newline followed by space or tab)
  const unfolded = qpUnfolded.replace(/\n[ \t]/g, '');

  const blocks = unfolded.split(/BEGIN:VCARD/i).slice(1);
  const rawContacts: ParsedVCardContact[] = [];

  for (const block of blocks) {
    const endIdx = block.search(/END:VCARD/i);
    const body = endIdx >= 0 ? block.slice(0, endIdx) : block;
    const lines = body
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    let fullName = '';
    let fallbackName = '';
    const candidatePhones: string[] = [];

    for (const line of lines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;

      const left = line.slice(0, colonIdx).toUpperCase();
      let right = line.slice(colonIdx + 1).trim();

      if (left.includes('QUOTED-PRINTABLE')) {
        right = decodeQuotedPrintable(right);
      }

      const propName = left.split(';')[0].replace(/^ITEM\d+\./, '');

      if (propName === 'FN' && right) {
        fullName = unescapeVCardValue(right);
      } else if (propName === 'N' && right && !fallbackName) {
        const parts = right
          .split(';')
          .map((p) => unescapeVCardValue(p))
          .filter(Boolean);
        if (parts.length > 0) {
          fallbackName = parts.length >= 2 ? `${parts[1]} ${parts[0]}`.trim() : parts[0];
        }
      } else if (propName === 'TEL' && right) {
        const normalized = normalizePickedPhoneNumber(right);
        if (normalized) {
          candidatePhones.push(normalized);
        }
      }
    }

    const phones = dedupePhoneNumbers(candidatePhones);
    if (phones.length > 0) {
      rawContacts.push({
        name: (fullName || fallbackName || 'Contact').trim(),
        phones
      });
    }
  }

  // Deduplicate duplicate contacts inside the same .vcf (matching name + overlapping phone)
  const merged: ParsedVCardContact[] = [];
  for (const entry of rawContacts) {
    const entryNameKey = entry.name.toLowerCase().trim();
    const existing = merged.find((m) => {
      if (m.name.toLowerCase().trim() !== entryNameKey) return false;
      return m.phones.some((p1) => entry.phones.some((p2) => p1 === p2 || p1.slice(-10) === p2.slice(-10)));
    });

    if (existing) {
      existing.phones = dedupePhoneNumbers([...existing.phones, ...entry.phones]);
    } else {
      merged.push({ ...entry, phones: [...entry.phones] });
    }
  }

  return merged;
}

export function extractRawPhoneValue(rawTelItem: any): string {
  if (rawTelItem === null || rawTelItem === undefined) return '';
  if (typeof rawTelItem === 'string' || typeof rawTelItem === 'number') {
    return String(rawTelItem).trim();
  }
  if (typeof rawTelItem === 'object') {
    return String(
      rawTelItem.value ||
        rawTelItem.number ||
        rawTelItem.phoneNumber ||
        rawTelItem.phone ||
        rawTelItem.tel ||
        ''
    ).trim();
  }
  return String(rawTelItem).trim();
}

const ANDROID_JS_BRIDGE_KEYS = [
  'AndroidContactPicker',
  'SSKAndroidBridge',
  'NativeContactPicker',
  'Android'
] as const;

const ANDROID_JS_METHODS = [
  'pickContact',
  'selectContact',
  'openContactPicker',
  'openPhonebook'
] as const;

function getAndroidJsBridge(win: any): { bridge: any; methodName: string } | null {
  if (!win || typeof win !== 'object') return null;
  for (const key of ANDROID_JS_BRIDGE_KEYS) {
    const candidate = win[key];
    if (candidate && typeof candidate === 'object') {
      for (const methodName of ANDROID_JS_METHODS) {
        if (typeof candidate[methodName] === 'function') {
          return { bridge: candidate, methodName };
        }
      }
    }
  }
  return null;
}

export function detectContactPickerRuntime(env?: ContactPickerEnvironment): ContactPickerRuntimeInfo {
  const win = env?.windowObj ?? (typeof window !== 'undefined' ? (window as any) : undefined);
  const nav = env?.navigatorObj ?? (typeof navigator !== 'undefined' ? (navigator as any) : undefined);

  let isInIframe = false;
  if (win) {
    try {
      isInIframe = Boolean(win.self !== win.top);
    } catch {
      isInIframe = true;
    }
  }

  const isSecureContext = Boolean(win ? win.isSecureContext ?? true : true);
  const userAgent = String(nav?.userAgent || '');
  const isAndroid = /Android/i.test(userAgent);
  const isIOS = /iPad|iPhone|iPod/i.test(userAgent) || (userAgent.includes('Macintosh') && Number(nav?.maxTouchPoints || 0) > 1);

  let nativeBridgeType: NativeBridgeType | null = null;
  if (win?.Capacitor?.Plugins?.Contacts && typeof win.Capacitor.Plugins.Contacts.pickContact === 'function') {
    nativeBridgeType = 'capacitor';
  } else if (nav?.contacts && typeof nav.contacts.pickContact === 'function') {
    nativeBridgeType = 'cordova';
  } else if (getAndroidJsBridge(win)) {
    nativeBridgeType = 'android-js';
  } else if (win?.ReactNativeWebView && typeof win.ReactNativeWebView.postMessage === 'function') {
    nativeBridgeType = 'react-native';
  } else if (win?.flutter_inappwebview && typeof win.flutter_inappwebview.callHandler === 'function') {
    nativeBridgeType = 'flutter';
  }

  const hasWebViewToken =
    /; wv\)/i.test(userAgent) ||
    /\bwv\b/i.test(userAgent) ||
    /FBAN|FBAV|Instagram|Line\/|MicroMessenger|MiuiBrowser.*wv|HeyTapBrowser.*wv|VivoBrowser.*wv/i.test(userAgent);

  const isWebView = Boolean(hasWebViewToken || nativeBridgeType);
  const hasWebContactPicker = Boolean(
    nav && 'contacts' in nav && nav.contacts && typeof nav.contacts.select === 'function'
  );

  return {
    isInIframe,
    isSecureContext,
    userAgent,
    isAndroid,
    isIOS,
    isWebView,
    hasNativeBridge: nativeBridgeType !== null,
    nativeBridgeType,
    hasWebContactPicker
  };
}

export interface NormalizedNativePayload {
  status: 'picked' | 'cancelled' | 'permission_denied' | 'no_phone' | 'error';
  name?: string;
  phones: string[];
  errorName?: string;
}

export function normalizeNativeContactPayload(rawPayload: any): NormalizedNativePayload {
  if (rawPayload === null || rawPayload === undefined || rawPayload === '') {
    return { status: 'cancelled', phones: [] };
  }

  let payload = rawPayload;
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    if (!trimmed) return { status: 'cancelled', phones: [] };
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        payload = JSON.parse(trimmed);
      } catch {
        const directPhone = normalizePickedPhoneNumber(trimmed);
        return directPhone
          ? { status: 'picked', phones: [directPhone] }
          : { status: 'error', phones: [], errorName: 'InvalidPayload' };
      }
    } else {
      if (/^(cancel|cancelled|canceled|abort|aborted)$/i.test(trimmed)) {
        return { status: 'cancelled', phones: [] };
      }
      if (/permission|denied|not_allowed/i.test(trimmed)) {
        return { status: 'permission_denied', phones: [], errorName: 'PermissionDenied' };
      }
      const directPhone = normalizePickedPhoneNumber(trimmed);
      return directPhone
        ? { status: 'picked', phones: [directPhone] }
        : { status: 'error', phones: [], errorName: 'InvalidPayload' };
    }
  }

  if (Array.isArray(payload)) {
    if (payload.length === 0) return { status: 'cancelled', phones: [] };
    payload = payload[0];
  }

  if (typeof payload !== 'object' || payload === null) {
    return { status: 'error', phones: [], errorName: 'InvalidPayload' };
  }

  // Handle wrapped responses { contact: {...} } or { data: {...} } or { contacts: [...] }
  if (payload.cancelled === true || payload.canceled === true || String(payload.status || '').toLowerCase() === 'cancelled' || String(payload.status || '').toLowerCase() === 'canceled') {
    return { status: 'cancelled', phones: [] };
  }

  const errorCode = String(payload.error || payload.errorCode || payload.code || payload.reason || '').toLowerCase();
  if (
    payload.denied === true ||
    payload.permissionDenied === true ||
    String(payload.status || '').toLowerCase() === 'permission_denied' ||
    errorCode.includes('permission') ||
    errorCode.includes('denied') ||
    errorCode === 'not_allowed'
  ) {
    return { status: 'permission_denied', phones: [], errorName: 'PermissionDenied' };
  }

  if (errorCode.includes('cancel') || errorCode.includes('abort')) {
    return { status: 'cancelled', phones: [] };
  }

  if (payload.error && !payload.phone && !payload.phones && !payload.phoneNumbers && !payload.tel && !payload.contact && !payload.contacts && !payload.data) {
    return { status: 'error', phones: [], errorName: String(payload.error) };
  }

  const target =
    payload.contact ||
    (Array.isArray(payload.contacts) && payload.contacts[0]) ||
    payload.data ||
    payload;

  const rawName =
    (typeof target?.name === 'string' && target.name) ||
    (typeof target?.name?.display === 'string' && target.name.display) ||
    (typeof target?.name?.formatted === 'string' && target.name.formatted) ||
    (Array.isArray(target?.name) && target.name[0]) ||
    target?.displayName ||
    target?.fullName ||
    '';
  const name = rawName ? String(rawName).trim() : undefined;

  const rawCandidates: any[] = [];
  if (Array.isArray(target?.phones)) rawCandidates.push(...target.phones);
  if (Array.isArray(target?.phoneNumbers)) rawCandidates.push(...target.phoneNumbers);
  if (Array.isArray(target?.tel)) rawCandidates.push(...target.tel);
  if (target?.phone) rawCandidates.push(target.phone);
  if (target?.phoneNumber) rawCandidates.push(target.phoneNumber);
  if (target?.number) rawCandidates.push(target.number);
  if (target?.mobile) rawCandidates.push(target.mobile);

  const phones = dedupePhoneNumbers(rawCandidates.map(extractRawPhoneValue));

  if (phones.length === 0) {
    return { status: 'no_phone', name, phones: [] };
  }

  return { status: 'picked', name, phones };
}

function classifyNativeError(err: any): 'cancelled' | 'permission_denied' | 'unsupported' | 'blocked' {
  const name = String(err?.name || '');
  const code = String(err?.code || '');
  const msg = String(err?.message || err || '').toLowerCase();

  if (name === 'AbortError' || code === '6' || msg.includes('cancel') || msg.includes('abort') || msg.includes('user dismissed')) {
    return 'cancelled';
  }
  if (
    name === 'NotAllowedError' ||
    code === '20' ||
    msg.includes('permission') ||
    msg.includes('denied') ||
    msg.includes('read_contacts')
  ) {
    return 'permission_denied';
  }
  if (msg.includes('unimplemented') || msg.includes('not implemented') || msg.includes('unavailable')) {
    return 'unsupported';
  }
  return 'blocked';
}

async function waitForNativeAsyncCallback(
  win: any,
  trigger: () => any,
  timeoutMs = 60000
): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!win) {
      reject(new Error('Window unavailable'));
      return;
    }

    let settled = false;
    const prevReceiver = win.__sskReceiveNativeContact;
    const prevAltReceiver = win.__receiveNativeContact;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      if (prevReceiver === undefined) {
        delete win.__sskReceiveNativeContact;
      } else {
        win.__sskReceiveNativeContact = prevReceiver;
      }
      if (prevAltReceiver === undefined) {
        delete win.__receiveNativeContact;
      } else {
        win.__receiveNativeContact = prevAltReceiver;
      }
      if (typeof win.removeEventListener === 'function') {
        win.removeEventListener('ssk-native-contact', handleCustomEvent);
        win.removeEventListener('message', handlePostMessage);
      }
    };

    const finish = (value: any) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    const fail = (err: any) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };

    const handleCustomEvent = (event: any) => {
      finish(event?.detail);
    };

    const handlePostMessage = (event: any) => {
      const data = event?.data;
      if (!data) return;
      let parsed = data;
      if (typeof data === 'string' && data.trim().startsWith('{')) {
        try {
          parsed = JSON.parse(data);
        } catch {
          return;
        }
      }
      if (
        typeof parsed === 'object' &&
        (parsed.type === 'SSK_NATIVE_CONTACT' ||
          parsed.type === 'NATIVE_CONTACT_SELECTED' ||
          parsed.type === 'CONTACT_PICKED' ||
          parsed.type === 'CONTACT_PICK_CANCELLED' ||
          parsed.type === 'CONTACT_PICK_ERROR')
      ) {
        finish(parsed);
      }
    };

    const timer = setTimeout(() => {
      fail(Object.assign(new Error('Native contact picker timed out'), { name: 'TimeoutError' }));
    }, timeoutMs);

    win.__sskReceiveNativeContact = (data: any) => finish(data);
    win.__receiveNativeContact = (data: any) => finish(data);

    if (typeof win.addEventListener === 'function') {
      win.addEventListener('ssk-native-contact', handleCustomEvent);
      win.addEventListener('message', handlePostMessage);
    }

    try {
      const result = trigger();
      if (result !== undefined) {
        if (result !== null && typeof result.then === 'function') {
          result.then(finish, fail);
        } else {
          finish(result);
        }
      }
    } catch (err) {
      fail(err);
    }
  });
}

async function tryNativeAndroidBridge(
  runtime: ContactPickerRuntimeInfo,
  env?: ContactPickerEnvironment,
  nativeTimeoutMs = 120000
): Promise<ContactResolutionResult | null> {
  const win = env?.windowObj ?? (typeof window !== 'undefined' ? (window as any) : undefined);
  const nav = env?.navigatorObj ?? (typeof navigator !== 'undefined' ? (navigator as any) : undefined);

  if (!runtime.hasNativeBridge) return null;

  let rawResponse: any;

  try {
    if (runtime.nativeBridgeType === 'capacitor') {
      const plugin = win.Capacitor.Plugins.Contacts;
      if (typeof plugin.requestPermissions === 'function') {
        const perm = await plugin.requestPermissions();
        if (perm?.contacts === 'denied') {
          return {
            status: 'unavailable',
            reason: 'permission_denied',
            errorName: 'PermissionDenied',
            runtime
          };
        }
      }
      rawResponse = await plugin.pickContact({
        projection: { name: true, phones: true }
      });
    } else if (runtime.nativeBridgeType === 'cordova') {
      rawResponse = await new Promise((resolve, reject) => {
        nav.contacts.pickContact(
          (contact: any) => resolve(contact),
          (err: any) => reject(err)
        );
      });
    } else if (runtime.nativeBridgeType === 'android-js') {
      const found = getAndroidJsBridge(win);
      if (!found) return null;
      // Supports sync return values, Promises, or void methods calling back asynchronously
      rawResponse = await waitForNativeAsyncCallback(
        win,
        () => found.bridge[found.methodName](),
        nativeTimeoutMs
      );
    } else if (runtime.nativeBridgeType === 'react-native') {
      rawResponse = await waitForNativeAsyncCallback(
        win,
        () => {
          win.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PICK_CONTACT' }));
          return undefined;
        },
        nativeTimeoutMs
      );
    } else if (runtime.nativeBridgeType === 'flutter') {
      rawResponse = await win.flutter_inappwebview.callHandler('pickContact');
    } else {
      return null;
    }
  } catch (err: any) {
    const classified = classifyNativeError(err);
    if (classified === 'cancelled') {
      return { status: 'cancelled', source: 'native' };
    }
    if (classified === 'permission_denied') {
      return {
        status: 'unavailable',
        reason: 'permission_denied',
        errorName: err?.name || 'PermissionDenied',
        runtime
      };
    }
    if (classified === 'unsupported') {
      // Fall through to web Contact Picker API if bridge reported unavailable
      return null;
    }
    return {
      status: 'unavailable',
      reason: 'blocked',
      errorName: err?.name || 'NativeBridgeError',
      runtime
    };
  }

  const normalized = normalizeNativeContactPayload(rawResponse);
  if (normalized.status === 'cancelled') {
    return { status: 'cancelled', source: 'native' };
  }
  if (normalized.status === 'permission_denied') {
    return {
      status: 'unavailable',
      reason: 'permission_denied',
      errorName: normalized.errorName || 'PermissionDenied',
      runtime
    };
  }
  if (normalized.status === 'no_phone') {
    return { status: 'no_phone', name: normalized.name, source: 'native' };
  }
  if (normalized.status === 'error') {
    return {
      status: 'unavailable',
      reason: 'blocked',
      errorName: normalized.errorName || 'NativePayloadError',
      runtime
    };
  }

  if (normalized.phones.length === 1) {
    return {
      status: 'selected',
      contact: { phone: normalized.phones[0], name: normalized.name },
      source: 'native'
    };
  }

  return {
    status: 'multiple_numbers',
    name: normalized.name || 'Contact',
    phones: normalized.phones,
    source: 'native'
  };
}

/**
 * Executes the cross-device contact picker priority chain:
 * 1. Native Android / Hybrid WebView bridge (Capacitor, Cordova, Android @JavascriptInterface, RN, Flutter)
 * 2. Browser Contact Picker API (`navigator.contacts.select`) with capability negotiation
 * 3. Returns typed `'unavailable'` reason so UI opens `.vcf` / Paste / Member Directory fallback cleanly
 */
export async function resolveContactSelection(options?: {
  env?: ContactPickerEnvironment;
  nativeTimeoutMs?: number;
}): Promise<ContactResolutionResult> {
  const env = options?.env;
  const nav = env?.navigatorObj ?? (typeof navigator !== 'undefined' ? (navigator as any) : undefined);
  const runtime = detectContactPickerRuntime(env);

  // Priority 1: Native Android / WebView Bridge
  if (runtime.hasNativeBridge) {
    const nativeResult = await tryNativeAndroidBridge(runtime, env, options?.nativeTimeoutMs);
    if (nativeResult) {
      return nativeResult;
    }
  }

  // Priority 2: Browser Contact Picker API (Android Chrome/Edge/Samsung Internet on top-level HTTPS)
  if (!runtime.hasWebContactPicker) {
    return {
      status: 'unavailable',
      reason: 'unsupported',
      runtime
    };
  }

  try {
    // Call select() immediately with zero prior awaits to preserve transient user activation
    let contacts: any[] | null = null;
    try {
      contacts = await nav.contacts.select(['name', 'tel'], { multiple: false });
    } catch (propErr: any) {
      const errName = String(propErr?.name || '');
      const canRetryTelOnly =
        errName === 'TypeError' || errName === 'NotSupportedError' || errName === 'InvalidAccessError';

      if (canRetryTelOnly) {
        try {
          contacts = await nav.contacts.select(['tel'], { multiple: false });
        } catch (telErr: any) {
          if (String(telErr?.name || '') === 'TypeError') {
            contacts = await nav.contacts.select(['tel']);
          } else {
            throw telErr;
          }
        }
      } else {
        throw propErr;
      }
    }

    const contactList = Array.isArray(contacts) ? contacts : contacts ? [contacts] : [];
    if (contactList.length === 0) {
      return { status: 'cancelled', source: 'web' };
    }

    const contact = contactList[0];
    const rawName =
      Array.isArray(contact?.name) && contact.name.length > 0
        ? String(contact.name[0] || '').trim()
        : typeof contact?.name === 'string'
          ? contact.name.trim()
          : undefined;

    const telList = Array.isArray(contact?.tel)
      ? contact.tel
      : contact?.tel
        ? [contact.tel]
        : [];

    const phones = dedupePhoneNumbers(telList.map(extractRawPhoneValue));

    if (phones.length === 0) {
      return { status: 'no_phone', name: rawName, source: 'web' };
    }

    if (phones.length === 1) {
      return {
        status: 'selected',
        contact: { phone: phones[0], name: rawName },
        source: 'web'
      };
    }

    return {
      status: 'multiple_numbers',
      name: rawName || 'Contact',
      phones,
      source: 'web'
    };
  } catch (err: any) {
    const errName = String(err?.name || '');

    if (errName === 'AbortError') {
      return { status: 'cancelled', source: 'web' };
    }

    if (errName === 'NotAllowedError') {
      return {
        status: 'unavailable',
        reason: runtime.isInIframe ? 'iframe_blocked' : 'permission_denied',
        errorName: errName,
        runtime
      };
    }

    if (errName === 'SecurityError' || errName === 'InvalidStateError') {
      return {
        status: 'unavailable',
        reason: runtime.isInIframe ? 'iframe_blocked' : 'blocked',
        errorName: errName,
        runtime
      };
    }

    return {
      status: 'unavailable',
      reason: runtime.isInIframe ? 'iframe_blocked' : 'blocked',
      errorName: errName || 'ContactPickerError',
      runtime
    };
  }
}
