/**
 * Normalizes any Nigerian phone number format into strict E.164 (+234...)
 * 
 * Supports:
 * - "+2348022883383"   -> "+2348022883383"
 * - "+234 08022883383" -> "+2348022883383" (strips erroneous leading 0 after country code)
 * - "08022883383"      -> "+2348022883383" (replaces local 0 with +234)
 * - "8022883383"       -> "+2348022883383" (prepends +234 to 10-digit number)
 */
export function normalizeNigerianPhone(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // Case 1: +2340... (user selected +234 and still typed 080...)
  if (cleaned.startsWith('+2340')) {
    cleaned = '+234' + cleaned.slice(5);
  }
  // Case 2: 2340...
  else if (cleaned.startsWith('2340')) {
    cleaned = '+234' + cleaned.slice(4);
  }
  // Case 3: 234... (missing +)
  else if (cleaned.startsWith('234')) {
    cleaned = '+' + cleaned;
  }
  // Case 4: Local 11-digit 080...
  else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '+234' + cleaned.slice(1);
  }
  // Case 5: 10-digit 802...
  else if (/^[789][01]\d{8}$/.test(cleaned)) {
    cleaned = '+234' + cleaned;
  }

  return cleaned;
}
