import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Gets the encryption key from environment variables.
 * Should be a 32-byte string or base64 encoded string.
 */
function getEncryptionKey(): Buffer {
  const key = process.env.AMR_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('AMR_ENCRYPTION_KEY environment variable is not set');
  }

  // If the key is provided as a hex or base64 string, decode it.
  // We assume the key is exactly 32 bytes for AES-256
  const keyBuffer = Buffer.from(key, key.length === 64 ? 'hex' : 'utf-8');
  
  if (keyBuffer.length !== KEY_LENGTH) {
    throw new Error(`AMR_ENCRYPTION_KEY must be exactly ${KEY_LENGTH} bytes long. Current length: ${keyBuffer.length}`);
  }

  return keyBuffer;
}

/**
 * Encrypts a string using AES-256-GCM.
 * @param text The plain text to encrypt (e.g., AMR password)
 * @returns Base64 encoded string containing IV, AuthTag, and CipherText
 */
export function encryptAmr(text: string): string | null {
  if (!text) return null;

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encryptedText (all hex strings), then convert the whole thing to base64
    const payload = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    return Buffer.from(payload).toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw error;
  }
}

/**
 * Decrypts a string using AES-256-GCM.
 * @param encryptedBase64 The encrypted string returned from encryptAmr
 * @returns The original plain text
 */
export function decryptAmr(encryptedBase64: string): string | null {
  if (!encryptedBase64) return null;

  try {
    const key = getEncryptionKey();
    const payload = Buffer.from(encryptedBase64, 'base64').toString('utf8');
    const parts = payload.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted payload format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw error;
  }
}
