function normalizePhone(value) {
  if (!value || typeof value !== 'string') return null;

  let digits = value.trim();
  // Keep only digits and leading +
  digits = digits.replace(/[\s()-]/g, '');

  if (digits.startsWith('+')) {
    digits = digits.slice(1);
  }

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  // If the number starts with 0 and is 11 digits, convert to country code 92
  if (/^0\d{10}$/.test(digits)) {
    digits = '92' + digits.slice(1);
  }

  // If the number is a local mobile without leading 0 (e.g. 3001234567), normalize to 92...
  if (/^3\d{9}$/.test(digits)) {
    digits = '92' + digits;
  }

  // For 11 digits that already include 92 but are missing one leading zero, keep as-is
  if (/^92\d{10}$/.test(digits)) {
    return digits;
  }

  // If it already looks like a normalized international number with more digits, return digits as-is.
  return digits;
}

function isEmail(value) {
  return typeof value === 'string' && value.includes('@');
}

module.exports = { normalizePhone, isEmail };
