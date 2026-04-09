/**
 * Normalizes a phone number to the format +91XXXXXXXXXX
 * @param phone The phone number string to normalize
 * @returns Normalized phone number string
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return "";
  return "+91" + phone.toString().replace(/\D/g, "").slice(-10);
}
