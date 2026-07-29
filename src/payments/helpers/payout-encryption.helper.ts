import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * AES-256-GCM encryption for sensitive payout-account fields at rest
 * (account number, IFSC). Never log plaintext or the derived key.
 *
 * Key source: `PAYOUT_ENCRYPTION_KEY` env var — must be a 64-character hex
 * string (32 bytes). There is no fallback: an unset or malformed key fails
 * startup rather than silently encrypting bank details with a constant
 * that's public in git history.
 */
@Injectable()
export class PayoutEncryptionHelper {
  private readonly key = this.deriveKey();

  /** Returns `iv:authTag:cipherText`, all base64. */
  encrypt(plainText: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return [
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted.toString('base64'),
    ].join(':');
  }

  decrypt(payload: string): string {
    const [ivB64, tagB64, dataB64] = payload.split(':');
    if (!ivB64 || !tagB64 || !dataB64) {
      throw new InternalServerErrorException('Malformed encrypted payload');
    }
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(tagB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');
    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new InternalServerErrorException('Invalid auth tag');
    }
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      'utf8',
    );
  }

  private deriveKey(): Buffer {
    const raw = process.env.PAYOUT_ENCRYPTION_KEY ?? '';
    if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
      throw new InternalServerErrorException(
        'PAYOUT_ENCRYPTION_KEY must be set to a 64-character hex string (32 bytes)',
      );
    }
    return Buffer.from(raw, 'hex');
  }
}
