import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePickedPhoneNumber,
  dedupePhoneNumbers,
  normalizePhoneDigits
} from '../src/utils/phoneUtils.js';
import {
  detectContactPickerRuntime,
  normalizeNativeContactPayload,
  parseVCardContacts,
  resolveContactSelection
} from '../src/services/contactPickerService.js';

function createTopWindow(extra: Record<string, any> = {}) {
  const listeners: Record<string, Array<(e: any) => void>> = {};
  const win: any = {
    isSecureContext: true,
    addEventListener: (type: string, cb: (e: any) => void) => {
      listeners[type] = listeners[type] || [];
      listeners[type].push(cb);
    },
    removeEventListener: (type: string, cb: (e: any) => void) => {
      listeners[type] = (listeners[type] || []).filter((fn) => fn !== cb);
    },
    dispatchMockEvent: (type: string, event: any) => {
      for (const fn of [...(listeners[type] || [])]) fn(event);
    },
    ...extra
  };
  win.self = win;
  if (!('top' in extra)) {
    win.top = win;
  }
  return win;
}

// 1. Contact picker supported (Web Contact Picker API + country codes + formatting cleanup)
test('1. Web Contact Picker API supported: selects contact, preserves country codes, cleans formatting', async () => {
  const win = createTopWindow();
  const nav = {
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
    contacts: {
      getProperties: async () => ['name', 'tel', 'email'],
      select: async (props: string[]) => {
        assert.deepEqual(props, ['name', 'tel']);
        return [
          {
            name: ['  Ramesh Sharma  '],
            tel: ['+91 (987) 654-3210']
          }
        ];
      }
    }
  };

  const result = await resolveContactSelection({ env: { windowObj: win, navigatorObj: nav } });
  assert.equal(result.status, 'selected');
  if (result.status === 'selected') {
    assert.equal(result.source, 'web');
    assert.equal(result.contact.phone, '+919876543210');
    assert.equal(result.contact.name, 'Ramesh Sharma');
  }
});

test('1b. Web Contact Picker API retries with ["tel"] when partial Chromium/OEM throws TypeError/NotSupportedError on "name"', async () => {
  const win = createTopWindow();
  const requestedPropsHistory: string[][] = [];
  const nav = {
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S918B) SamsungBrowser/24.0 Chrome/117.0 Mobile Safari/537.36',
    contacts: {
      select: async (props: string[]) => {
        requestedPropsHistory.push(props);
        if (props.includes('name')) {
          throw Object.assign(new Error('name property unsupported'), { name: 'NotSupportedError' });
        }
        return [{ tel: ['tel:+1 (415) 555-0199;ext=42'] }];
      }
    }
  };

  const result = await resolveContactSelection({ env: { windowObj: win, navigatorObj: nav } });
  assert.equal(requestedPropsHistory.length, 2);
  assert.deepEqual(requestedPropsHistory[0], ['name', 'tel']);
  assert.deepEqual(requestedPropsHistory[1], ['tel']);
  assert.equal(result.status, 'selected');
  if (result.status === 'selected') {
    assert.equal(result.contact.phone, '+14155550199');
  }
});

// 2. Contact picker unsupported (iOS Safari, Desktop Firefox/Chrome, Android WebView without bridge)
test('2. Contact picker unsupported: triggers unsupported fallback cleanly on iOS Safari / desktop / bare WebView', async () => {
  const iosWin = createTopWindow();
  const iosNav = {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'
  };
  const iosRes = await resolveContactSelection({ env: { windowObj: iosWin, navigatorObj: iosNav } });
  assert.equal(iosRes.status, 'unavailable');
  if (iosRes.status === 'unavailable') {
    assert.equal(iosRes.reason, 'unsupported');
    assert.equal(iosRes.runtime.isIOS, true);
    assert.equal(iosRes.runtime.hasWebContactPicker, false);
  }

  // Android System WebView without native bridge
  const wvWin = createTopWindow();
  const wvNav = {
    userAgent:
      'Mozilla/5.0 (Linux; Android 13; Redmi Note 12; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36'
  };
  const wvRes = await resolveContactSelection({ env: { windowObj: wvWin, navigatorObj: wvNav } });
  assert.equal(wvRes.status, 'unavailable');
  if (wvRes.status === 'unavailable') {
    assert.equal(wvRes.reason, 'unsupported');
    assert.equal(wvRes.runtime.isAndroid, true);
    assert.equal(wvRes.runtime.isWebView, true);
  }
});

// 3. Native Android picker integration (Android @JavascriptInterface, Capacitor, Cordova, ReactNativeWebView, Flutter)
test('3. Native Android bridges take priority over missing/web contact APIs', async () => {
  // 3a. Custom Android WebView @JavascriptInterface with async callback receiver
  const androidWin = createTopWindow({
    AndroidContactPicker: {
      pickContact: () => {
        queueMicrotask(() => {
          androidWin.__sskReceiveNativeContact(
            JSON.stringify({ name: 'Anita Deshmukh', phone: '+91 98201 12345' })
          );
        });
      }
    }
  });
  const wvNav = {
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Vivo V29; wv) AppleWebKit/537.36 Chrome/122.0 Mobile Safari/537.36'
  };
  const androidRes = await resolveContactSelection({ env: { windowObj: androidWin, navigatorObj: wvNav } });
  assert.equal(androidRes.status, 'selected');
  if (androidRes.status === 'selected') {
    assert.equal(androidRes.source, 'native');
    assert.equal(androidRes.contact.phone, '+919820112345');
    assert.equal(androidRes.contact.name, 'Anita Deshmukh');
  }
  assert.equal(androidWin.__sskReceiveNativeContact, undefined, 'cleans up temporary receiver callback');

  // 3b. Capacitor Contacts Plugin
  const capWin = createTopWindow({
    Capacitor: {
      Plugins: {
        Contacts: {
          requestPermissions: async () => ({ contacts: 'granted' }),
          pickContact: async () => ({
            contact: {
              name: { display: 'Vikram Patel' },
              phones: [{ number: '09876543210' }]
            }
          })
        }
      }
    }
  });
  const capRes = await resolveContactSelection({ env: { windowObj: capWin, navigatorObj: wvNav } });
  assert.equal(capRes.status, 'selected');
  if (capRes.status === 'selected') {
    assert.equal(capRes.source, 'native');
    assert.equal(capRes.contact.phone, '09876543210');
    assert.equal(capRes.contact.name, 'Vikram Patel');
  }

  // 3c. ReactNativeWebView postMessage bridge
  const rnWin = createTopWindow({
    ReactNativeWebView: {
      postMessage: (msg: string) => {
        const parsed = JSON.parse(msg);
        assert.equal(parsed.type, 'PICK_CONTACT');
        queueMicrotask(() => {
          rnWin.dispatchMockEvent('message', {
            data: JSON.stringify({
              type: 'SSK_NATIVE_CONTACT',
              name: 'Suresh Nair',
              phone: '0044 7911 123456'
            })
          });
        });
      }
    }
  });
  const rnRes = await resolveContactSelection({ env: { windowObj: rnWin, navigatorObj: wvNav } });
  assert.equal(rnRes.status, 'selected');
  if (rnRes.status === 'selected') {
    assert.equal(rnRes.source, 'native');
    assert.equal(rnRes.contact.phone, '+447911123456');
  }

  // 3d. Cordova navigator.contacts.pickContact
  const cordovaNav = {
    userAgent: 'Mozilla/5.0 (Linux; Android 12; Oppo Reno; wv)',
    contacts: {
      pickContact: (ok: (c: any) => void) => {
        ok({ displayName: 'Kiran Rao', phoneNumbers: [{ value: '+91-99887-76655' }] });
      }
    }
  };
  const cordovaRes = await resolveContactSelection({
    env: { windowObj: createTopWindow(), navigatorObj: cordovaNav }
  });
  assert.equal(cordovaRes.status, 'selected');
  if (cordovaRes.status === 'selected') {
    assert.equal(cordovaRes.source, 'native');
    assert.equal(cordovaRes.contact.phone, '+919988776655');
  }
});

// 4. Permission denied (distinguishes top-level permission_denied vs embedded iframe_blocked vs native denied)
test('4. Permission denied handled gracefully without crashing or confusing iframe message', async () => {
  const topWin = createTopWindow();
  const deniedWebNav = {
    userAgent: 'Mozilla/5.0 (Linux; Android 14; OnePlus 12) Chrome/125.0 Mobile Safari/537.36',
    contacts: {
      select: async () => {
        throw Object.assign(new Error('Permission denied by user'), { name: 'NotAllowedError' });
      }
    }
  };
  const topDenied = await resolveContactSelection({ env: { windowObj: topWin, navigatorObj: deniedWebNav } });
  assert.equal(topDenied.status, 'unavailable');
  if (topDenied.status === 'unavailable') {
    assert.equal(topDenied.reason, 'permission_denied');
    assert.equal(topDenied.runtime.isInIframe, false);
  }

  // Inside embedded iframe: NotAllowedError classifies as iframe_blocked
  const iframeWin = createTopWindow({ top: { differentWindow: true } });
  const iframeDenied = await resolveContactSelection({ env: { windowObj: iframeWin, navigatorObj: deniedWebNav } });
  assert.equal(iframeDenied.status, 'unavailable');
  if (iframeDenied.status === 'unavailable') {
    assert.equal(iframeDenied.reason, 'iframe_blocked');
    assert.equal(iframeDenied.runtime.isInIframe, true);
  }

  // Native bridge permission denied
  const capDeniedWin = createTopWindow({
    Capacitor: {
      Plugins: {
        Contacts: {
          requestPermissions: async () => ({ contacts: 'denied' }),
          pickContact: async () => {
            throw new Error('Should not open picker when permission denied');
          }
        }
      }
    }
  });
  const nativeDenied = await resolveContactSelection({
    env: { windowObj: capDeniedWin, navigatorObj: { userAgent: 'Android' } }
  });
  assert.equal(nativeDenied.status, 'unavailable');
  if (nativeDenied.status === 'unavailable') {
    assert.equal(nativeDenied.reason, 'permission_denied');
  }
});

// 5. User cancels contact selection (Browser AbortError, empty array, native cancel)
test('5. User cancellation exits cleanly without triggering error/fallback', async () => {
  const win = createTopWindow();
  const abortNav = {
    userAgent: 'Android Chrome/125',
    contacts: {
      select: async () => {
        throw Object.assign(new Error('User aborted'), { name: 'AbortError' });
      }
    }
  };
  const webCancel = await resolveContactSelection({ env: { windowObj: win, navigatorObj: abortNav } });
  assert.equal(webCancel.status, 'cancelled');

  const emptyNav = {
    userAgent: 'Android Chrome/125',
    contacts: {
      select: async () => []
    }
  };
  const webEmptyCancel = await resolveContactSelection({ env: { windowObj: win, navigatorObj: emptyNav } });
  assert.equal(webEmptyCancel.status, 'cancelled');

  const nativeCancelWin = createTopWindow({
    SSKAndroidBridge: {
      openContactPicker: () => JSON.stringify({ cancelled: true })
    }
  });
  const nativeCancel = await resolveContactSelection({
    env: { windowObj: nativeCancelWin, navigatorObj: { userAgent: 'Android wv' } }
  });
  assert.equal(nativeCancel.status, 'cancelled');
});

// 6. Multiple phone numbers (returns deduplicated list for user selection instead of silently taking first)
test('6. Multiple phone numbers preserved and deduplicated for user selection', async () => {
  const win = createTopWindow();
  const multiNav = {
    userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/125.0 Mobile Safari/537.36',
    contacts: {
      select: async () => [
        {
          name: ['Deepak Joshi'],
          tel: [
            '+91 98765 43210',
            '9876543210', // equivalent 10-digit duplicate -> should dedupe keeping +919876543210
            '+91 98765-43210', // duplicate formatting -> deduped
            '022-24567890' // distinct second number
          ]
        }
      ]
    }
  };

  const res = await resolveContactSelection({ env: { windowObj: win, navigatorObj: multiNav } });
  assert.equal(res.status, 'multiple_numbers');
  if (res.status === 'multiple_numbers') {
    assert.equal(res.name, 'Deepak Joshi');
    assert.deepEqual(res.phones, ['+919876543210', '02224567890']);
  }

  // Distinct international country codes (+91 vs +1) must both remain distinct,
  // while 10-digit and 0-prefixed local equivalents merge into +91
  assert.deepEqual(
    dedupePhoneNumbers(['+91 9876543210', '+1 9876543210', '9876543210', '09876543210']),
    ['+919876543210', '+19876543210']
  );
});

// 7. VCF import (handles formatting, country codes, folded lines, QUOTED-PRINTABLE, and duplicate entries)
test('7. VCF import parses multiple contacts, preserves country codes, handles QP/folding, and deduplicates', () => {
  const sampleVcf = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'N:Mehta;Priya;;;',
    'FN:Priya\\, Mehta',
    'TEL;TYPE=CELL:+91 98111-22334',
    'TEL;TYPE=HOME:9811122334',
    'TEL;TYPE=WORK;VALUE=URI:tel:+1 (415) 555-0100;ext=99',
    'END:VCARD',
    'BEGIN:VCARD',
    'VERSION:2.1',
    'FN;ENCODING=QUOTED-PRINTABLE:Arjun =',
    'Kumar',
    'TEL;CELL:0091 99001 12233',
    'END:VCARD',
    'BEGIN:VCARD',
    'VERSION:3.0',
    'FN:Priya, Mehta',
    'TEL;TYPE=CELL:+91 (981) 112-2334',
    'END:VCARD',
    'BEGIN:VCARD',
    'VERSION:3.0',
    'FN:No Number Contact',
    'EMAIL:test@example.com',
    'END:VCARD'
  ].join('\r\n');

  const contacts = parseVCardContacts(sampleVcf);
  assert.equal(contacts.length, 2);
  assert.equal(contacts[0].name, 'Priya, Mehta');
  assert.deepEqual(contacts[0].phones, ['+919811122334', '+14155550100']);
  assert.equal(contacts[1].name, 'Arjun Kumar');
  assert.deepEqual(contacts[1].phones, ['+919900112233']);
});

// 8. Invalid contact data (malformed text, too short, non-digits, corrupted JSON from native bridge)
test('8. Invalid contact data rejected safely without throwing', () => {
  assert.equal(normalizePickedPhoneNumber('not a phone 12345'), '');
  assert.equal(normalizePickedPhoneNumber('12345'), '');
  assert.equal(normalizePickedPhoneNumber('+91 123456789012345678'), '');
  assert.equal(normalizePickedPhoneNumber('abc'), '');

  assert.deepEqual(parseVCardContacts('not a vcard file'), []);
  assert.deepEqual(
    parseVCardContacts('BEGIN:VCARD\nFN:Invalid\nTEL:call-me-maybe\nTEL:123\nEND:VCARD'),
    []
  );

  const malformedNative = normalizeNativeContactPayload('{broken json');
  assert.equal(malformedNative.status, 'error');

  // Ensure original 10-digit DB utility remains untouched for existing modules
  assert.equal(normalizePhoneDigits('+91 98765-43210'), '9876543210');
});

// 9. Empty phone number (whitespace, null, tel: [], empty native payload)
test('9. Empty phone numbers handled safely with no_phone or cancelled status', async () => {
  assert.equal(normalizePickedPhoneNumber(''), '');
  assert.equal(normalizePickedPhoneNumber('   '), '');
  assert.equal(normalizePickedPhoneNumber(null), '');

  const win = createTopWindow();
  const noPhoneNav = {
    userAgent: 'Android Chrome/126',
    contacts: {
      select: async () => [{ name: ['Empty Contact'], tel: [] }]
    }
  };
  const res = await resolveContactSelection({ env: { windowObj: win, navigatorObj: noPhoneNav } });
  assert.equal(res.status, 'no_phone');
  if (res.status === 'no_phone') {
    assert.equal(res.name, 'Empty Contact');
  }

  const nativeNoPhone = normalizeNativeContactPayload({ name: 'Blank', phones: ['', '   '] });
  assert.equal(nativeNoPhone.status, 'no_phone');
});

// 10. Browser / WebView detection & fallback priority across Android OEM profiles
test('10. Runtime detection accurately classifies Android Chrome, OEM WebViews, iframes, and Flutter bridge', async () => {
  const oemRuntime = detectContactPickerRuntime({
    windowObj: createTopWindow(),
    navigatorObj: {
      userAgent:
        'Mozilla/5.0 (Linux; Android 13; M2101K6P) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/108.0.0.0 Mobile Safari/537.36 MiuiBrowser/13.0 wv'
    }
  });
  assert.equal(oemRuntime.isAndroid, true);
  assert.equal(oemRuntime.isWebView, true);
  assert.equal(oemRuntime.hasNativeBridge, false);
  assert.equal(oemRuntime.hasWebContactPicker, false);

  // Flutter InAppWebView priority over navigator.contacts
  const flutterWin = createTopWindow({
    flutter_inappwebview: {
      callHandler: async (name: string) => {
        assert.equal(name, 'pickContact');
        return { name: 'Flutter Contact', phone: '+91 91234 56789' };
      }
    }
  });
  const flutterRes = await resolveContactSelection({
    env: {
      windowObj: flutterWin,
      navigatorObj: {
        userAgent: 'Android',
        contacts: {
          select: async () => {
            throw new Error('Should not run when Flutter bridge succeeds');
          }
        }
      }
    }
  });
  assert.equal(flutterRes.status, 'selected');
  if (flutterRes.status === 'selected') {
    assert.equal(flutterRes.source, 'native');
    assert.equal(flutterRes.contact.phone, '+919123456789');
  }
});
