# SSK Business Network — Android Native Wrapper

Standalone Kotlin Android Studio project that wraps the production SSK Business Network HTTPS website inside a hardened `WebView` and exposes the native `window.AndroidContactPicker` bridge expected by the frontend (`src/services/contactPickerService.ts`).

## Key Capabilities

- **Direct Native System Contacts Picker**: Clicking any phonebook icon (`ContactPickerButton`) invokes `window.AndroidContactPicker.pickContact()`, opening Android's native Contacts picker (`Intent.ACTION_PICK`) instead of falling back to `.vcf` import.
- **Multi-Number & Single-Number Support**: Uses `ContentResolver` on `ContactsContract.CommonDataKinds.Phone.CONTENT_URI` with just-in-time `READ_CONTACTS` runtime permission (falling back cleanly to single-row `Phone.CONTENT_URI` one-time URI access if permission is declined).
- **Bridge Callback Contract**: Returns JSON payloads directly to `window.__sskReceiveNativeContact(...)`:
  - Selected: `{"name":"...","phones":["+91...","..."]}`
  - Cancelled: `{"cancelled":true}`
  - Permission denied: `{"permissionDenied":true}`
- **Origin Guard & Hardened WebView**:
  - `OriginGuard` validates HTTPS scheme and exact host match (`www.sskbusiness.com` / `sskbusiness.com` in release; also includes Cloud Run staging hosts in debug builds) before launching Contacts and before delivering JS callbacks.
  - `MIXED_CONTENT_NEVER_ALLOW`, `allowFileAccess = false`, `allowContentAccess = false`, `safeBrowsingEnabled = true`, and R8/ProGuard keep rules for `@JavascriptInterface`.
- **External Links & Uploads**: `tel:`, `mailto:`, `whatsapp:` / `wa.me`, and `upi:` route to native Android apps; external HTTPS pages open in Chrome Custom Tabs; `onShowFileChooser` supports file uploads.

## Build an Installable APK

### Option 1: Android Studio (Recommended)
1. Copy or open the `android-wrapper/` directory in **Android Studio** (Ladybug or newer, JDK 17, Android SDK 35).
2. Let Gradle sync (Gradle 8.9).
3. To build an installable debug APK:
   - Menu: **Build → Build Bundle(s) / APK(s) → Build APK(s)** (or run `./gradlew assembleDebug` / `gradle assembleDebug`).
   - Output APK: `app/build/outputs/apk/debug/app-debug.apk`.
4. To build a signed release APK for Play Store / distribution:
   - Menu: **Build → Generate Signed Bundle / APK...** and choose your keystore.

### Option 2: GitHub Actions CI
Use the included `android-wrapper/.github/workflows/build-apk.yml` workflow definition (copy into your repo root `.github/workflows/`) to run `gradle testDebugUnitTest assembleDebug` and download the built `.apk` artifact.

## Acceptance Test Checklist (Physical Android Devices)
Verify on Samsung, Xiaomi/Redmi/POCO, Vivo, Oppo/Realme, OnePlus, and Pixel:
1. Open SSK app → navigate to a form with a mobile number field (e.g., Register / Pass Referral / Invite Guest).
2. Tap the phonebook icon → native Android Contacts picker opens immediately.
3. Select a contact with 1 number → phone number populates the existing input field automatically.
4. Select a contact with multiple numbers → `Select Contact` modal displays all numbers cleanly for one-tap choice.
5. Press Back / Cancel in the Contacts picker → field remains unchanged with no error popup.
6. Deny `READ_CONTACTS` → falls back cleanly to single-row pick or graceful permission handling without crashing.
