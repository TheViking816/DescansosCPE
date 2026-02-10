export function normalizePhoneE164(input) {
  let v = String(input ?? '').trim();
  if (!v) return '';
  v = v.replace(/\s+/g, '');
  v = v.replace(/[()-]/g, '');
  if (v.startsWith('00')) v = `+${v.slice(2)}`;

  // If user types "346..." (Spain without +), normalize to +34...
  if (!v.startsWith('+')) {
    if (/^34\d{9}$/.test(v)) return `+${v}`;
    if (/^\d{9}$/.test(v)) return `+34${v}`;
    // fallback: prefix +
    if (/^\d+$/.test(v)) return `+${v}`;
  }

  return v;
}

export function isProbablyE164(phone) {
  return /^\+\d{8,15}$/.test(String(phone ?? '').trim());
}

