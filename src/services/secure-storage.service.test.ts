import { beforeEach, describe, expect, it } from 'vitest';
import { resetChromeMocks } from '../test/mocks/chrome';
import { StorageError, secureStorageService } from './secure-storage.service';

describe('SecureStorageService', () => {
  beforeEach(() => {
    resetChromeMocks();
  });

  describe('saveKey and getKey', () => {
    it('should save encrypted key to storage', async () => {
      const provider = 'openai';
      const apiKey = 'sk-proj-test1234567890';
      const password = 'SecurePassword123!';

      await secureStorageService.saveKey(provider, apiKey, password);

      const hasKey = await secureStorageService.hasKey(provider);
      expect(hasKey).toBe(true);
    });

    it('should retrieve saved key with correct password', async () => {
      const provider = 'anthropic';
      const apiKey = 'sk-ant-api03-testkey1234567890';
      const password = 'MyPassword123!';

      await secureStorageService.saveKey(provider, apiKey, password);
      const retrieved = await secureStorageService.getKey(provider, password);

      expect(retrieved).toBe(apiKey);
    });

    it('should fail to retrieve with wrong password', async () => {
      const provider = 'openai';
      const apiKey = 'sk-test-key';
      const password = 'CorrectPassword123!';

      await secureStorageService.saveKey(provider, apiKey, password);

      await expect(secureStorageService.getKey(provider, 'WrongPassword123!')).rejects.toThrow(
        StorageError,
      );
      await expect(
        secureStorageService.getKey(provider, 'WrongPassword123!'),
      ).rejects.toMatchObject({
        code: 'DECRYPTION_ERROR',
      });
    });

    it('should update lastUsed timestamp on retrieval', async () => {
      const provider = 'openai';
      const apiKey = 'sk-test';
      const password = 'Pass123!';

      await secureStorageService.saveKey(provider, apiKey, password);

      const metadataBefore = await secureStorageService.getKeyMetadata(provider);
      expect(metadataBefore?.lastUsed).toBeUndefined();

      await secureStorageService.getKey(provider, password);

      const metadataAfter = await secureStorageService.getKeyMetadata(provider);
      expect(metadataAfter?.lastUsed).toBeGreaterThan(0);
      expect(metadataAfter?.lastUsed).toBeDefined();
    });

    it('should enforce minimum operation time for timing attack prevention', async () => {
      const provider = 'openai';
      const password = 'Password123!';

      const start = performance.now();

      try {
        await secureStorageService.getKey(provider, password);
      } catch (_error) {
        // Expected to fail - key doesn't exist
      }

      const elapsed = performance.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(400); // MIN_OPERATION_TIME
    });

    it('should handle multiple providers', async () => {
      const password = 'Password123!';

      await secureStorageService.saveKey('openai', 'sk-openai-123', password);
      await secureStorageService.saveKey('anthropic', 'sk-ant-456', password);
      await secureStorageService.saveKey('openrouter', 'sk-or-789', password);

      const openaiKey = await secureStorageService.getKey('openai', password);
      const anthropicKey = await secureStorageService.getKey('anthropic', password);
      const openrouterKey = await secureStorageService.getKey('openrouter', password);

      expect(openaiKey).toBe('sk-openai-123');
      expect(anthropicKey).toBe('sk-ant-456');
      expect(openrouterKey).toBe('sk-or-789');
    });

    it('should overwrite existing key for same provider', async () => {
      const provider = 'openai';
      const password = 'Password123!';

      await secureStorageService.saveKey(provider, 'old-key', password);
      await secureStorageService.saveKey(provider, 'new-key', password);

      const retrieved = await secureStorageService.getKey(provider, password);
      expect(retrieved).toBe('new-key');
    });
  });

  describe('removeKey', () => {
    it('should remove key from storage', async () => {
      const provider = 'openai';
      const apiKey = 'sk-test';
      const password = 'Pass123!';

      await secureStorageService.saveKey(provider, apiKey, password);
      expect(await secureStorageService.hasKey(provider)).toBe(true);

      await secureStorageService.removeKey(provider);
      expect(await secureStorageService.hasKey(provider)).toBe(false);
    });

    it('should not throw when removing non-existent key', async () => {
      await expect(secureStorageService.removeKey('non-existent')).resolves.not.toThrow();
    });

    it('should only remove specified provider', async () => {
      const password = 'Password123!';

      await secureStorageService.saveKey('openai', 'sk-1', password);
      await secureStorageService.saveKey('anthropic', 'sk-2', password);

      await secureStorageService.removeKey('openai');

      expect(await secureStorageService.hasKey('openai')).toBe(false);
      expect(await secureStorageService.hasKey('anthropic')).toBe(true);
    });
  });

  describe('listProviders', () => {
    it('should list all stored providers', async () => {
      const password = 'Password123!';

      await secureStorageService.saveKey('openai', 'sk-1', password);
      await secureStorageService.saveKey('anthropic', 'sk-ant-2', password);

      const providers = await secureStorageService.listProviders();
      expect(providers).toContain('openai');
      expect(providers).toContain('anthropic');
      expect(providers).toHaveLength(2);
    });

    it('should return empty array when no keys stored', async () => {
      const providers = await secureStorageService.listProviders();
      expect(providers).toEqual([]);
    });

    it('should not include removed providers', async () => {
      const password = 'Password123!';

      await secureStorageService.saveKey('openai', 'sk-1', password);
      await secureStorageService.saveKey('anthropic', 'sk-2', password);
      await secureStorageService.removeKey('openai');

      const providers = await secureStorageService.listProviders();
      expect(providers).not.toContain('openai');
      expect(providers).toContain('anthropic');
    });
  });

  describe('hasKey', () => {
    it('should return true for existing key', async () => {
      await secureStorageService.saveKey('openai', 'sk-test', 'Password123!');
      expect(await secureStorageService.hasKey('openai')).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      expect(await secureStorageService.hasKey('non-existent')).toBe(false);
    });

    it('should return false after key is removed', async () => {
      await secureStorageService.saveKey('openai', 'sk-test', 'Password123!');
      await secureStorageService.removeKey('openai');
      expect(await secureStorageService.hasKey('openai')).toBe(false);
    });
  });

  describe('getKeyMetadata', () => {
    it('should return metadata for existing key', async () => {
      const provider = 'openai';
      const password = 'Password123!';

      await secureStorageService.saveKey(provider, 'sk-test', password);

      const metadata = await secureStorageService.getKeyMetadata(provider);
      expect(metadata).toBeDefined();
      expect(metadata?.provider).toBe(provider);
      expect(metadata?.createdAt).toBeGreaterThan(0);
    });

    it('should return null for non-existent key', async () => {
      const metadata = await secureStorageService.getKeyMetadata('non-existent');
      expect(metadata).toBeNull();
    });

    it('should not include encrypted key in metadata', async () => {
      await secureStorageService.saveKey('openai', 'sk-test', 'Password123!');

      const metadata = await secureStorageService.getKeyMetadata('openai');
      expect(metadata).not.toHaveProperty('encryptedKey');
    });

    it('should track lastUsed after key retrieval', async () => {
      const provider = 'openai';
      const password = 'Password123!';

      await secureStorageService.saveKey(provider, 'sk-test', password);

      // Get metadata before first use
      const metadataBefore = await secureStorageService.getKeyMetadata(provider);
      expect(metadataBefore?.lastUsed).toBeUndefined();
      expect(metadataBefore?.createdAt).toBeDefined();

      // Use the key
      await secureStorageService.getKey(provider, password);

      // Check metadata after use
      const metadataAfter = await secureStorageService.getKeyMetadata(provider);
      expect(metadataAfter?.lastUsed).toBeDefined();
      expect(metadataAfter?.lastUsed).toBeGreaterThan(metadataBefore?.createdAt ?? 0);
    });
  });

  describe('error handling', () => {
    it('should throw KEY_NOT_FOUND when trying to get non-existent key', async () => {
      await expect(secureStorageService.getKey('non-existent', 'password')).rejects.toMatchObject({
        code: 'KEY_NOT_FOUND',
      });
    });

    it('should handle special characters in API keys', async () => {
      const apiKey = 'sk-test!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      const password = 'Password123!';

      await secureStorageService.saveKey('openai', apiKey, password);
      const retrieved = await secureStorageService.getKey('openai', password);

      expect(retrieved).toBe(apiKey);
    });

    it('should handle very long API keys', async () => {
      const apiKey = `sk-${'a'.repeat(1000)}`;
      const password = 'Password123!';

      await secureStorageService.saveKey('openai', apiKey, password);
      const retrieved = await secureStorageService.getKey('openai', password);

      expect(retrieved).toBe(apiKey);
    });
  });
});
