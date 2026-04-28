import { supabase } from '../config/supabase';

// ---------------------------------------------------------------------------
// Activation Key (Browser Extension) Service
// ---------------------------------------------------------------------------
// Activation keys are short, human-friendly secrets that the browser extension
// uses to bind itself to a SureShopPH user account. We never store the raw key
// in the database — only a SHA-256 hash. The plaintext key is returned to the
// user exactly once at generation time.
//
// Schema (table: public.access_tokens)
//   id          uuid PK
//   user_id     uuid (auth.users.id)
//   token_hash  text (SHA-256 hex of the plaintext key)
//   revoked     bool
//   created_at  timestamptz
// ---------------------------------------------------------------------------

const KEY_PREFIX = 'SSPH';
const KEY_GROUPS = 4;       // 4 groups
const KEY_GROUP_LEN = 4;    // 4 chars each => total 16 random chars
// Crockford-style alphabet (no I, L, O, U, 0, 1) for unambiguous reading.
const KEY_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

const getCrypto = () => {
  if (typeof window !== 'undefined' && window.crypto) return window.crypto;
  if (typeof self !== 'undefined' && self.crypto) return self.crypto;
  return null;
};

const generatePlainKey = () => {
  const cryptoObj = getCrypto();
  const totalChars = KEY_GROUPS * KEY_GROUP_LEN;
  const bytes = new Uint8Array(totalChars);

  if (cryptoObj?.getRandomValues) {
    cryptoObj.getRandomValues(bytes);
  } else {
    // Fallback (should not normally hit in modern browsers).
    for (let i = 0; i < totalChars; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  let chars = '';
  for (let i = 0; i < totalChars; i += 1) {
    chars += KEY_ALPHABET[bytes[i] % KEY_ALPHABET.length];
  }

  const groups = [];
  for (let g = 0; g < KEY_GROUPS; g += 1) {
    groups.push(chars.slice(g * KEY_GROUP_LEN, (g + 1) * KEY_GROUP_LEN));
  }
  return `${KEY_PREFIX}-${groups.join('-')}`;
};

const sha256Hex = async (input) => {
  const cryptoObj = getCrypto();
  if (!cryptoObj?.subtle) {
    throw new Error('Secure crypto API is not available in this environment.');
  }
  const data = new TextEncoder().encode(input);
  const buf = await cryptoObj.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

const getAuthedUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const user = data?.user;
  if (!user) throw new Error('You must be signed in to manage activation keys.');
  return user;
};

/**
 * Generate a fresh activation key for the current user.
 *
 * Behavior:
 *  - All existing non-revoked tokens for this user are revoked first
 *    (one active key at a time).
 *  - A new random key is generated, SHA-256 hashed, and inserted.
 *  - The plaintext key is returned ONCE — it cannot be retrieved later.
 *
 * @returns {Promise<{ plainKey: string, tokenId: string, createdAt: string }>}
 */
export const generateActivationKey = async () => {
  const user = await getAuthedUser();

  // Revoke previous active tokens so only the latest key works.
  const { error: revokeError } = await supabase
    .from('access_tokens')
    .update({ revoked: true })
    .eq('user_id', user.id)
    .eq('revoked', false);

  if (revokeError) {
    throw new Error(revokeError.message || 'Failed to revoke previous activation keys.');
  }

  const plainKey = generatePlainKey();
  const tokenHash = await sha256Hex(plainKey);

  const { data, error } = await supabase
    .from('access_tokens')
    .insert({
      user_id: user.id,
      token_hash: tokenHash,
      revoked: false,
    })
    .select('id, created_at')
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to generate activation key.');
  }

  return {
    plainKey,
    tokenId: data.id,
    createdAt: data.created_at,
  };
};

/**
 * Returns the active (non-revoked) activation token row for the current user,
 * or null if none exists. The plaintext key is NOT returned — only metadata.
 */
export const getActiveActivationToken = async () => {
  const user = await getAuthedUser();
  const { data, error } = await supabase
    .from('access_tokens')
    .select('id, created_at, revoked')
    .eq('user_id', user.id)
    .eq('revoked', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message || 'Failed to load activation key status.');
  return data || null;
};

/**
 * Revoke all active activation keys for the current user.
 */
export const revokeAllActivationKeys = async () => {
  const user = await getAuthedUser();
  const { error } = await supabase
    .from('access_tokens')
    .update({ revoked: true })
    .eq('user_id', user.id)
    .eq('revoked', false);

  if (error) throw new Error(error.message || 'Failed to revoke activation keys.');
  return true;
};

/**
 * Verify a plaintext activation key against the user's stored hashes.
 * Useful for manual debugging / future "paste your key" flows.
 *
 * @param {string} plainKey
 * @returns {Promise<boolean>}
 */
export const verifyActivationKey = async (plainKey) => {
  if (typeof plainKey !== 'string' || !plainKey.trim()) return false;
  const user = await getAuthedUser();
  const tokenHash = await sha256Hex(plainKey.trim().toUpperCase());

  const { data, error } = await supabase
    .from('access_tokens')
    .select('id')
    .eq('user_id', user.id)
    .eq('token_hash', tokenHash)
    .eq('revoked', false)
    .limit(1);

  if (error) throw new Error(error.message || 'Failed to verify activation key.');
  return Array.isArray(data) && data.length > 0;
};
