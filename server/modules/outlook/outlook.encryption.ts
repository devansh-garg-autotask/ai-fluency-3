import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT = 'educore-outlook-tokens-salt';

// Derive an exact 32-byte key from the environment 64-hex string or fallback safely
function getEncryptionKey(): Buffer {
  const secret =
    process.env.OUTLOOK_TOKEN_ENCRYPTION_KEY ||
    '7ed1f730880f62b5f4fb5c26689f831e9e6afc84b4f84d501648d699f47f9b62';

  // 64 hex characters = exact 32 bytes for AES-256
  if (secret && secret.length === 64 && /^[0-9a-fA-F]+$/.test(secret)) {
    return Buffer.from(secret, 'hex');
  }
  return crypto.scryptSync(secret, SALT, 32);
}

export interface EncryptedPayload {
  encrypted: string;
  iv: string;
  tag: string;
  packed: string; // Self-contained format: enc:v1:<iv>:<tag>:<encrypted>
}

export function encryptToken(plainText: string): EncryptedPayload {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  const ivHex = iv.toString('hex');

  return {
    encrypted,
    iv: ivHex,
    tag,
    packed: `enc:v1:${ivHex}:${tag}:${encrypted}`,
  };
}

export function safeDecryptToken(
  encryptedOrPacked: string,
  ivHex?: string,
  tagHex?: string
): string | null {
  if (!encryptedOrPacked) return null;

  try {
    const key = getEncryptionKey();
    let iv: Buffer;
    let tag: Buffer;
    let cipherTextHex: string;

    // 1. Packed format: enc:v1:<ivHex>:<tagHex>:<cipherTextHex>
    if (encryptedOrPacked.startsWith('enc:v1:')) {
      const parts = encryptedOrPacked.split(':');
      if (parts.length !== 5) return null;
      iv = Buffer.from(parts[2], 'hex');
      tag = Buffer.from(parts[3], 'hex');
      cipherTextHex = parts[4];
    } else if (encryptedOrPacked.includes(':') && encryptedOrPacked.split(':').length === 3) {
      // 2. Format: <ivHex>:<tagHex>:<cipherTextHex>
      const parts = encryptedOrPacked.split(':');
      iv = Buffer.from(parts[0], 'hex');
      tag = Buffer.from(parts[1], 'hex');
      cipherTextHex = parts[2];
    } else {
      // 3. Separate parameters
      if (!ivHex || !tagHex) return null;
      iv = Buffer.from(ivHex, 'hex');
      tag = Buffer.from(tagHex, 'hex');
      cipherTextHex = encryptedOrPacked;
    }

    if (iv.length !== 16 || tag.length !== 16) {
      return null;
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(cipherTextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    // Decryption failed gracefully (wrong key, tag mismatch, corrupted data)
    return null;
  }
}

export function decryptToken(encrypted: string, ivHex?: string, tagHex?: string): string {
  const decrypted = safeDecryptToken(encrypted, ivHex, tagHex);
  if (decrypted === null) {
    throw new Error('Unsupported state or unable to authenticate data');
  }
  return decrypted;
}

