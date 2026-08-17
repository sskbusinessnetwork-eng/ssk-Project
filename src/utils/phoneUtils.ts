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

