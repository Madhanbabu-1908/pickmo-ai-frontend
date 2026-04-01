/**
 * Mask personal information in text
 * Redacts emails, phone numbers, and credit card numbers
 */
export function maskPersonalInfo(text) {
  if (!text) return text;
  
  let masked = text;
  
  // Mask email addresses
  masked = masked.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL REDACTED]');
  
  // Mask Indian phone numbers (10-digit starting with 6-9, optionally with +91 or 0)
  masked = masked.replace(/\b(\+?91|0)?[6-9]\d{9}\b/g, '[PHONE REDACTED]');
  
  // Mask simple credit card patterns (13-16 digits, with optional spaces/dashes)
  masked = masked.replace(/\b(?:\d[ -]*?){13,16}\b/g, '[CARD REDACTED]');
  
  // Mask Aadhaar-like numbers (12 digits)
  masked = masked.replace(/\b\d{4}[ -]?\d{4}[ -]?\d{4}\b/g, '[AADHAAR REDACTED]');
  
  // Mask PAN card (5 letters + 4 digits + 1 letter)
  masked = masked.replace(/\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g, '[PAN REDACTED]');
  
  return masked;
}
