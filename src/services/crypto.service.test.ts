import { describe, expect, it } from 'vitest';
import {
  CryptoError,
  decrypt,
  deriveWithHKDF,
  encrypt,
  generateSecureRandom,
} from './crypto.service';

describe('CryptoService', () => {
  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt data successfully', async () => {
      const plaintext = 'sensitive-api-key-sk-1234567890';
      const password = 'SecurePassword123!@#';

      const encrypted = await encrypt(plaintext, password);
      const decrypted = await decrypt(encrypted, password);

      expect(decrypted).toBe(plaintext);
    });

    it('should fail decryption with wrong password', async () => {
      const plaintext = 'secret-data';
      const password = 'CorrectPassword123!';
      const wrongPassword = 'WrongPassword456!';

      const encrypted = await encrypt(plaintext, password);

      await expect(decrypt(encrypted, wrongPassword)).rejects.toThrow(CryptoError);
      await expect(decrypt(encrypted, wrongPassword)).rejects.toMatchObject({
        code: 'DECRYPTION_FAILED',
      });
    });

    it('should produce different ciphertexts for same plaintext (unique IV/salt)', async () => {
      const plaintext = 'same-data';
      const password = 'Password123!';

      const encrypted1 = await encrypt(plaintext, password);
      const encrypted2 = await encrypt(plaintext, password);

      expect(encrypted1).not.toBe(encrypted2);
      expect(await decrypt(encrypted1, password)).toBe(plaintext);
      expect(await decrypt(encrypted2, password)).toBe(plaintext);
    });

    it('should handle empty plaintext', async () => {
      const encrypted = await encrypt('', 'Password123!');
      const decrypted = await decrypt(encrypted, 'Password123!');
      expect(decrypted).toBe('');
    });

    it('should reject corrupted ciphertext', async () => {
      const password = 'Password123!';
      const corrupted = 'corrupted-base64-data';

      await expect(decrypt(corrupted, password)).rejects.toThrow(CryptoError);
    });

    it('should reject too-short ciphertext', async () => {
      const password = 'Password123!';
      const tooShort = btoa('abc'); // Less than salt + IV + 16 bytes

      await expect(decrypt(tooShort, password)).rejects.toMatchObject({
        code: 'INVALID_DATA',
      });
    });

    it('should handle long plaintext', async () => {
      const plaintext = 'a'.repeat(10000);
      const password = 'Password123!';

      const encrypted = await encrypt(plaintext, password);
      const decrypted = await decrypt(encrypted, password);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters in plaintext', async () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      const password = 'Password123!';

      const encrypted = await encrypt(plaintext, password);
      const decrypted = await decrypt(encrypted, password);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', async () => {
      const plaintext = '你好世界🌍émojis™';
      const password = 'Password123!';

      const encrypted = await encrypt(plaintext, password);
      const decrypted = await decrypt(encrypted, password);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('generateSecureRandom', () => {
    it('should generate random hex string of correct length', () => {
      const random = generateSecureRandom(32);
      expect(random).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(random).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate unique values', () => {
      const random1 = generateSecureRandom(32);
      const random2 = generateSecureRandom(32);
      expect(random1).not.toBe(random2);
    });

    it('should work with different lengths', () => {
      expect(generateSecureRandom(16)).toHaveLength(32);
      expect(generateSecureRandom(64)).toHaveLength(128);
      expect(generateSecureRandom(1)).toHaveLength(2);
    });
  });

  describe('deriveWithHKDF', () => {
    it('should derive deterministic output', async () => {
      const input = 'input-key-material';
      const salt = 'salt-value';
      const info = 'context-info';

      const derived1 = await deriveWithHKDF(input, salt, info);
      const derived2 = await deriveWithHKDF(input, salt, info);

      expect(derived1).toBe(derived2);
    });

    it('should produce different outputs for different inputs', async () => {
      const salt = 'salt';
      const info = 'info';

      const derived1 = await deriveWithHKDF('input1', salt, info);
      const derived2 = await deriveWithHKDF('input2', salt, info);

      expect(derived1).not.toBe(derived2);
    });

    it('should produce different outputs for different salts', async () => {
      const input = 'input';
      const info = 'info';

      const derived1 = await deriveWithHKDF(input, 'salt1', info);
      const derived2 = await deriveWithHKDF(input, 'salt2', info);

      expect(derived1).not.toBe(derived2);
    });

    it('should produce different outputs for different info', async () => {
      const input = 'input';
      const salt = 'salt';

      const derived1 = await deriveWithHKDF(input, salt, 'info1');
      const derived2 = await deriveWithHKDF(input, salt, 'info2');

      expect(derived1).not.toBe(derived2);
    });

    it('should work with custom length', async () => {
      const derived256 = await deriveWithHKDF('input', 'salt', 'info', 256);
      const derived512 = await deriveWithHKDF('input', 'salt', 'info', 512);

      // Base64 encoded lengths will differ
      expect(derived256.length).toBeLessThan(derived512.length);
    });
  });
});
