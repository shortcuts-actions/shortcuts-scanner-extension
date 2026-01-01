import { beforeEach, describe, expect, it } from 'vitest';
import { apiKeyFactory } from '../test/factories/apiKey.factory';
import { resetChromeMocks } from '../test/mocks/chrome';
import { apiKeyManagerService } from './api-key-manager.service';
import { rateLimitService } from './rate-limit.service';

describe('ApiKeyManagerService', () => {
  beforeEach(() => {
    resetChromeMocks();
  });

  describe('saveKey', () => {
    it('should save a valid API key with strong password', async () => {
      const result = await apiKeyManagerService.saveKey({
        provider: 'openai',
        apiKey: apiKeyFactory.openai(),
        password: 'StrongPassword123!',
        confirmPassword: 'StrongPassword123!',
      });

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject password mismatch', async () => {
      const result = await apiKeyManagerService.saveKey({
        provider: 'openai',
        apiKey: apiKeyFactory.openai(),
        password: 'Password123!',
        confirmPassword: 'Different123!',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PASSWORDS_MISMATCH');
    });

    it('should reject weak password', async () => {
      const result = await apiKeyManagerService.saveKey({
        provider: 'openai',
        apiKey: apiKeyFactory.openai(),
        password: 'weak',
        confirmPassword: 'weak',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_PASSWORD');
    });

    it('should reject invalid API key format', async () => {
      const result = await apiKeyManagerService.saveKey({
        provider: 'openai',
        apiKey: 'invalid-key-format',
        password: 'StrongPassword123!',
        confirmPassword: 'StrongPassword123!',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_API_KEY');
    });

    it('should cache API key after saving', async () => {
      const apiKey = apiKeyFactory.openai();
      const password = 'StrongPassword123!';

      await apiKeyManagerService.saveKey({
        provider: 'openai',
        apiKey,
        password,
        confirmPassword: password,
      });

      const isUnlocked = await apiKeyManagerService.isUnlocked('openai');
      expect(isUnlocked).toBe(true);
    });

    it('should save keys for multiple providers', async () => {
      const password = 'StrongPassword123!';

      await apiKeyManagerService.saveKey({
        provider: 'openai',
        apiKey: apiKeyFactory.openai(),
        password,
        confirmPassword: password,
      });

      await apiKeyManagerService.saveKey({
        provider: 'anthropic',
        apiKey: apiKeyFactory.anthropic(),
        password,
        confirmPassword: password,
      });

      expect(await apiKeyManagerService.hasKey('openai')).toBe(true);
      expect(await apiKeyManagerService.hasKey('anthropic')).toBe(true);
    });
  });

  describe('unlock', () => {
    it('should unlock key with correct password', async () => {
      const apiKey = apiKeyFactory.openai();
      const password = 'StrongPassword123!';

      await apiKeyManagerService.saveKey({
        provider: 'openai',
        apiKey,
        password,
        confirmPassword: password,
      });

      // Lock it first
      await apiKeyManagerService.lock('openai');

      const result = await apiKeyManagerService.unlock('openai', password);

      expect(result.success).toBe(true);
      expect(result.apiKey).toBe(apiKey);
    });

    it('should fail to unlock with wrong password', async () => {
      const password = 'StrongPassword123!';

      await apiKeyManagerService.saveKey({
        provider: 'openai',
        apiKey: apiKeyFactory.openai(),
        password,
        confirmPassword: password,
      });

      await apiKeyManagerService.lock('openai');

      const result = await apiKeyManagerService.unlock('openai', 'WrongPassword123!');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('WRONG_PASSWORD');
    });

    it('should return cached key if already unlocked', async () => {
      const apiKey = apiKeyFactory.openai();
      const password = 'StrongPassword123!';

      await apiKeyManagerService.saveKey({
        provider: 'openai',
        apiKey,
        password,
        confirmPassword: password,
      });

      // Key should be cached from save
      const result = await apiKeyManagerService.unlock('openai', password);

      expect(result.success).toBe(true);
      expect(result.apiKey).toBe(apiKey);
    });

    it('should fail when key does not exist', async () => {
      const result = await apiKeyManagerService.unlock('non-existent', 'password');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('KEY_NOT_FOUND');
    });

    it('should track failed attempts and lock out', async () => {
      const password = 'StrongPassword123!';

      await apiKeyManagerService.saveKey({
        provider: 'openai',
        apiKey: apiKeyFactory.openai(),
        password,
        confirmPassword: password,
      });

      await apiKeyManagerService.lock('openai');

      // Make 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await apiKeyManagerService.unlock('openai', 'WrongPassword!');
      }

      // 6th attempt should be rate limited
      const result = await apiKeyManagerService.unlock('openai', 'WrongPassword!');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('RATE_LIMITED');
      expect(result.error?.retryAfterMs).toBeGreaterThan(0);
    });

    it('should reset rate limit on successful unlock', async () => {
      const password = 'StrongPassword123!';

      await apiKeyManagerService.saveKey({
        provider: 'openai',
        apiKey: apiKeyFactory.openai(),
        password,
        confirmPassword: password,
      });

      await apiKeyManagerService.lock('openai');

      // Make 2 failed attempts
      await apiKeyManagerService.unlock('openai', 'WrongPassword!');
      await apiKeyManagerService.unlock('openai', 'WrongPassword!');

      // Successful unlock
      await apiKeyManagerService.unlock('openai', password);

      // Check rate limit was reset
      const limitCheck = await rateLimitService.checkLimit('openai');
      expect(limitCheck.attemptsRemaining).toBe(5);
    });
  });

  describe('lock and lockAll', () => {
    it('should lock a specific provider', async () => {
      const password = 'StrongPassword123!';

      await apiKeyManagerService.saveKey({
        provider: 'openai',
        apiKey: apiKeyFactory.openai(),
        password,
        confirmPassword: password,
      });

      expect(await apiKeyManagerService.isUnlocked('openai')).toBe(true);

      await apiKeyManagerService.lock('openai');

      expect(await apiKeyManagerService.isUnlocked('openai')).toBe(false);
    });

    it('should lock all providers', async () => {
      const password = 'StrongPassword123!';

      await apiKeyManagerService.saveKey({
        provider: 'openai',
        apiKey: apiKeyFactory.openai(),
        password,
        confirmPassword: password,
      });

      await apiKeyManagerService.saveKey({
        provider: 'anthropic',
        apiKey: apiKeyFactory.anthropic(),
        password,
        confirmPassword: password,
      });

      await apiKeyManagerService.lockAll();

      expect(await apiKeyManagerService.isUnlocked('openai')).toBe(false);
      expect(await apiKeyManagerService.isUnlocked('anthropic')).toBe(false);
    });
  });

  describe('deleteKey', () => {
    it('should delete a key completely', async () => {
      const password = 'StrongPassword123!';

      await apiKeyManagerService.saveKey({
        provider: 'openai',
        apiKey: apiKeyFactory.openai(),
        password,
        confirmPassword: password,
      });

      expect(await apiKeyManagerService.hasKey('openai')).toBe(true);

      await apiKeyManagerService.deleteKey('openai');

      expect(await apiKeyManagerService.hasKey('openai')).toBe(false);
      expect(await apiKeyManagerService.isUnlocked('openai')).toBe(false);
    });

    it('should only delete specified provider', async () => {
      const password = 'StrongPassword123!';

      await apiKeyManagerService.saveKey({
        provider: 'openai',
        apiKey: apiKeyFactory.openai(),
        password,
        confirmPassword: password,
      });

      await apiKeyManagerService.saveKey({
        provider: 'anthropic',
        apiKey: apiKeyFactory.anthropic(),
        password,
        confirmPassword: password,
      });

      await apiKeyManagerService.deleteKey('openai');

      expect(await apiKeyManagerService.hasKey('openai')).toBe(false);
      expect(await apiKeyManagerService.hasKey('anthropic')).toBe(true);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const apiKey = apiKeyFactory.openai();
      const oldPassword = 'OldPassword123!';
      const newPassword = 'NewPassword456!';

      await apiKeyManagerService.saveKey({
        provider: 'openai',
        apiKey,
        password: oldPassword,
        confirmPassword: oldPassword,
      });

      const result = await apiKeyManagerService.changePassword(
        'openai',
        oldPassword,
        newPassword,
        newPassword,
      );

      expect(result.success).toBe(true);

      // Verify can unlock with new password
      await apiKeyManagerService.lock('openai');
      const unlockResult = await apiKeyManagerService.unlock('openai', newPassword);
      expect(unlockResult.success).toBe(true);
      expect(unlockResult.apiKey).toBe(apiKey);
    });

    it('should fail with wrong current password', async () => {
      const password = 'StrongPassword123!';

      await apiKeyManagerService.saveKey({
        provider: 'openai',
        apiKey: apiKeyFactory.openai(),
        password,
        confirmPassword: password,
      });

      // Lock the key first to ensure unlock is attempted with wrong password
      await apiKeyManagerService.lock('openai');

      const result = await apiKeyManagerService.changePassword(
        'openai',
        'WrongPassword!',
        'NewPassword123!',
        'NewPassword123!',
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('WRONG_PASSWORD');
    });

    it('should reject new password mismatch', async () => {
      const password = 'StrongPassword123!';

      await apiKeyManagerService.saveKey({
        provider: 'openai',
        apiKey: apiKeyFactory.openai(),
        password,
        confirmPassword: password,
      });

      const result = await apiKeyManagerService.changePassword(
        'openai',
        password,
        'NewPassword123!',
        'Different456!',
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PASSWORDS_MISMATCH');
    });

    it('should reject weak new password', async () => {
      const password = 'StrongPassword123!';

      await apiKeyManagerService.saveKey({
        provider: 'openai',
        apiKey: apiKeyFactory.openai(),
        password,
        confirmPassword: password,
      });

      const result = await apiKeyManagerService.changePassword('openai', password, 'weak', 'weak');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_PASSWORD');
    });

    it('should keep key cached after password change', async () => {
      const password = 'StrongPassword123!';
      const newPassword = 'NewPassword123!';

      await apiKeyManagerService.saveKey({
        provider: 'openai',
        apiKey: apiKeyFactory.openai(),
        password,
        confirmPassword: password,
      });

      await apiKeyManagerService.changePassword('openai', password, newPassword, newPassword);

      expect(await apiKeyManagerService.isUnlocked('openai')).toBe(true);
    });
  });

  describe('listProviders', () => {
    it('should list all providers with status', async () => {
      const password = 'StrongPassword123!';

      await apiKeyManagerService.saveKey({
        provider: 'openai',
        apiKey: apiKeyFactory.openai(),
        password,
        confirmPassword: password,
      });

      await apiKeyManagerService.saveKey({
        provider: 'anthropic',
        apiKey: apiKeyFactory.anthropic(),
        password,
        confirmPassword: password,
      });

      // Lock one provider
      await apiKeyManagerService.lock('anthropic');

      const providers = await apiKeyManagerService.listProviders();

      expect(providers).toHaveLength(2);
      expect(providers.find((p) => p.provider === 'openai')?.isUnlocked).toBe(true);
      expect(providers.find((p) => p.provider === 'anthropic')?.isUnlocked).toBe(false);
    });

    it('should include metadata in provider list', async () => {
      const password = 'StrongPassword123!';

      await apiKeyManagerService.saveKey({
        provider: 'openai',
        apiKey: apiKeyFactory.openai(),
        password,
        confirmPassword: password,
      });

      const providers = await apiKeyManagerService.listProviders();

      expect(providers).toHaveLength(1);
      expect(providers[0].createdAt).toBeGreaterThan(0);
    });
  });

  describe('validation helpers', () => {
    it('should validate password without saving', () => {
      const result = apiKeyManagerService.validatePassword('weak');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      const strongResult = apiKeyManagerService.validatePassword('StrongPassword123!');
      expect(strongResult.valid).toBe(true);
    });

    it('should validate API key format without saving', () => {
      const result = apiKeyManagerService.validateApiKey('openai', 'invalid-key');
      expect(result.valid).toBe(false);

      const validResult = apiKeyManagerService.validateApiKey('openai', apiKeyFactory.openai());
      expect(validResult.valid).toBe(true);
    });

    it('should get password requirements', () => {
      const requirements = apiKeyManagerService.getPasswordRequirements();
      expect(requirements).toBeDefined();
      expect(requirements.length).toBeGreaterThan(0);
    });

    it('should get API key format hint', () => {
      const hint = apiKeyManagerService.getApiKeyFormatHint('openai');
      expect(hint).toBeDefined();
      expect(hint).toContain('sk-');
    });

    it('should mask API key for display', () => {
      const apiKey = apiKeyFactory.openai();
      const masked = apiKeyManagerService.maskApiKey(apiKey);

      expect(masked).not.toBe(apiKey);
      expect(masked).toContain('***');
    });
  });

  describe('getUnlockedKey', () => {
    it('should return unlocked key from cache', async () => {
      const apiKey = apiKeyFactory.openai();
      const password = 'StrongPassword123!';

      await apiKeyManagerService.saveKey({
        provider: 'openai',
        apiKey,
        password,
        confirmPassword: password,
      });

      const unlockedKey = await apiKeyManagerService.getUnlockedKey('openai');
      expect(unlockedKey).toBe(apiKey);
    });

    it('should return null for locked key', async () => {
      const password = 'StrongPassword123!';

      await apiKeyManagerService.saveKey({
        provider: 'openai',
        apiKey: apiKeyFactory.openai(),
        password,
        confirmPassword: password,
      });

      await apiKeyManagerService.lock('openai');

      const unlockedKey = await apiKeyManagerService.getUnlockedKey('openai');
      expect(unlockedKey).toBeNull();
    });
  });
});
