export function normalizeChapa(input) {
  // Keep only digits, preserve leading zeros, max 5 chars.
  return String(input ?? '')
    .trim()
    .replace(/\D+/g, '')
    .slice(0, 5);
}

export function isValidChapa(chapa) {
  return /^\d{5}$/.test(chapa);
}

// Supabase Auth does not support username/password. We map `chapa` -> a deterministic email
// so users can sign up/sign in with password without asking for email.
export function authEmailFromChapa(chapa) {
  const c = normalizeChapa(chapa);
  if (!isValidChapa(c)) throw new Error('Invalid chapa (must be 5 digits).');
  // Use a syntactically valid domain (avoid .local).
  return `${c}@descansos-cpe.com`;
}
