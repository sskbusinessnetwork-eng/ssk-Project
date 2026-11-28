/**
 * Extracts and normalizes the core 10 digits of a phone number
 * removing spaces, hyphens, brackets, country codes (+91, 0, etc.)
 * @param phone The phone number string or number to extract
 * @returns 10-digit normalized phone string
 */
export function normalizePhoneDigits(phone?: string | number | null): string {
  if (!phone) return "";
  const digits = phone.toString().replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

/**
 * Normalizes a phone number to the standard format +91XXXXXXXXXX
 * @param phone The phone number string to normalize
 * @returns Normalized phone number string in +91XXXXXXXXXX format
 */
export function normalizePhoneNumber(phone?: string | number | null): string {
  if (!phone) return "";
  const digits = normalizePhoneDigits(phone);
  return digits.length >= 10 ? "+91" + digits : digits ? "+91" + digits : "";
}

/**
 * Compares two phone numbers across formatting variations
 * (e.g. +91 9876543210, 09876543210, 9876543210, +91-9876-543-210)
 * @param phone1 First phone number
 * @param phone2 Second phone number
 * @returns true if both refer to the same 10-digit number
 */
export function isSamePhoneNumber(phone1?: string | number | null, phone2?: string | number | null): boolean {
  const d1 = normalizePhoneDigits(phone1);
  const d2 = normalizePhoneDigits(phone2);
  return Boolean(d1 && d2 && d1.length >= 10 && d2.length >= 10 && d1 === d2);
}

/**
 * Normalizes a phone number picked from device contacts, vCard (.vcf), or clipboard
 * while preserving international country codes (e.g. +91, +1, +44).
 * Strips spaces, hyphens, parentheses, dots, tel: schemes, and RFC parameters.
 * Returns "" if the input does not contain a valid 7-15 digit phone number.
 */
export function normalizePickedPhoneNumber(raw?: string | number | null): string {
  if (raw === null || raw === undefined) return "";
  let str = String(raw)
    .replace(/[\u00A0\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, " ")
    .trim();
  if (!str) return "";

  // Strip tel: URI prefix and RFC 3966 parameters (;ext=..., ;isub=..., etc.)
  str = str.replace(/^tel:/i, "").split(";")[0].trim();
  if (!str) return "";

  // Reject strings that look like arbitrary text mixed with letters
  // (after removing known scheme/formatting characters)
  const withoutAllowedPunctuation = str.replace(/[\s\-().+]/g, "");
  if (!withoutAllowedPunctuation || /[^\d]/.test(withoutAllowedPunctuation)) {
    return "";
  }

  const hasLeadingPlus = str.replace(/\s/g, "").startsWith("+");
  const digits = str.replace(/\D/g, "");

  if (digits.length < 7 || digits.length > 15) {
    return "";
  }

  if (hasLeadingPlus) {
    return `+${digits}`;
  }

  // Convert 00 international dialing prefix (e.g. 00919876543210 -> +919876543210)
  if (digits.startsWith("00") && digits.length >= 11) {
    const intlDigits = digits.slice(2);
    if (intlDigits.length >= 7 && intlDigits.length <= 15) {
      return `+${intlDigits}`;
    }
  }

  return digits;
}

/**
 * Deduplicates an array of phone numbers using normalizePickedPhoneNumber.
 * Preserves order and merges local 10-digit (or 0-prefixed 11-digit) numbers
 * with their +countryCode variant (preferring the version that retains the country code).
 */
export function dedupePhoneNumbers(phones: Array<string | number | null | undefined>): string[] {
  const normalizedList: string[] = [];
  const seenExact = new Set<string>();

  for (const item of phones) {
    const normalized = normalizePickedPhoneNumber(item);
    if (!normalized || seenExact.has(normalized)) continue;
    seenExact.add(normalized);
    normalizedList.push(normalized);
  }

  // If both "+919876543210" and "9876543210"/"09876543210" exist, prefer "+919876543210"
  const intlNumbers = normalizedList.filter((p) => p.startsWith("+") && p.length > 11);
  return normalizedList.filter((p) => {
    if (p.startsWith("+")) return true;
    const isLocal10 = p.length === 10;
    const isTrunk11 = p.length === 11 && p.startsWith("0");
    if (!isLocal10 && !isTrunk11) return true;
    const tail10 = p.slice(-10);
    return !intlNumbers.some((intl) => intl.slice(-10) === tail10);
  });
}
