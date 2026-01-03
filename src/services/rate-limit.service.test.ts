import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SECURITY_CONFIG } from '../config/security.config';
import { RateLimitService } from './rate-limit.service';

describe('RateLimitService', () => {
  let service: RateLimitService;
  let mockStorage: Map<string, unknown>;

  beforeEach(() => {
    // Reset singleton instance
    // @ts-expect-error - accessing private static property for testing
    RateLimitService.instance = undefined;
    service = RateLimitService.getInstance();

    // Mock chrome.storage.session
    mockStorage = new Map();
    (globalThis as any).chrome = {
      storage: {
        session: {
          get: vi.fn((key: string) => {
            const value = mockStorage.get(key);
            return Promise.resolve(value ? { [key]: value } : {});
          }),
          set: vi.fn((items: Record<string, unknown>) => {
            for (const [key, value] of Object.entries(items)) {
              mockStorage.set(key, value);
            }
            return Promise.resolve();
          }),
          remove: vi.fn((key: string) => {
            mockStorage.delete(key);
            return Promise.resolve();
          }),
        },
      },
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockStorage.clear();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = RateLimitService.getInstance();
      const instance2 = RateLimitService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('checkLimit', () => {
    it('should allow initial attempt', async () => {
      const result = await service.checkLimit('test-user');

      expect(result.allowed).toBe(true);
      expect(result.attemptsRemaining).toBe(SECURITY_CONFIG.rateLimit.maxAttempts);
    });

    it('should return locked status when within lockout period', async () => {
      // Setup locked state
      const now = Date.now();
      const lockedUntil = now + 60000; // Locked for 1 minute
      const key = `${SECURITY_CONFIG.storageKeys.rateLimitPrefix}test-user`;

      mockStorage.set(key, {
        attempts: 5,
        firstAttemptAt: now - 10000,
        lockedUntil,
        consecutiveLockouts: 1,
      });

      const result = await service.checkLimit('test-user');

      expect(result.allowed).toBe(false);
      expect(result.retryAfterMs).toBeGreaterThan(0);
      expect(result.retryAfterMs).toBeLessThanOrEqual(60000);
    });

    it('should reset attempts after attempt window expires', async () => {
      const now = Date.now();
      const key = `${SECURITY_CONFIG.storageKeys.rateLimitPrefix}test-user`;

      // Setup old state (outside attempt window)
      mockStorage.set(key, {
        attempts: 4,
        firstAttemptAt: now - SECURITY_CONFIG.rateLimit.attemptWindowMs - 1000,
        lockedUntil: 0,
        consecutiveLockouts: 0,
      });

      const result = await service.checkLimit('test-user');

      expect(result.allowed).toBe(true);
      expect(result.attemptsRemaining).toBe(SECURITY_CONFIG.rateLimit.maxAttempts);
    });

    it('should calculate remaining attempts correctly', async () => {
      const now = Date.now();
      const key = `${SECURITY_CONFIG.storageKeys.rateLimitPrefix}test-user`;

      mockStorage.set(key, {
        attempts: 2,
        firstAttemptAt: now,
        lockedUntil: 0,
        consecutiveLockouts: 0,
      });

      const result = await service.checkLimit('test-user');

      expect(result.allowed).toBe(true);
      expect(result.attemptsRemaining).toBe(SECURITY_CONFIG.rateLimit.maxAttempts - 2);
    });

    it('should deny when max attempts reached', async () => {
      const now = Date.now();
      const key = `${SECURITY_CONFIG.storageKeys.rateLimitPrefix}test-user`;

      mockStorage.set(key, {
        attempts: SECURITY_CONFIG.rateLimit.maxAttempts,
        firstAttemptAt: now,
        lockedUntil: 0,
        consecutiveLockouts: 0,
      });

      const result = await service.checkLimit('test-user');

      expect(result.allowed).toBe(false);
      expect(result.attemptsRemaining).toBe(0);
    });
  });

  describe('recordFailure', () => {
    it('should increment attempt counter', async () => {
      await service.recordFailure('test-user');

      const key = `${SECURITY_CONFIG.storageKeys.rateLimitPrefix}test-user`;
      const stored = mockStorage.get(key) as any;

      expect(stored.attempts).toBe(1);
      expect(stored.firstAttemptAt).toBeGreaterThan(0);
    });

    it('should trigger lockout after max attempts', async () => {
      // Record max attempts
      for (let i = 0; i < SECURITY_CONFIG.rateLimit.maxAttempts - 1; i++) {
        await service.recordFailure('test-user');
      }

      // This should trigger lockout
      const result = await service.recordFailure('test-user');

      expect(result.allowed).toBe(false);
      expect(result.retryAfterMs).toBe(SECURITY_CONFIG.rateLimit.initialLockoutMs);

      const key = `${SECURITY_CONFIG.storageKeys.rateLimitPrefix}test-user`;
      const stored = mockStorage.get(key) as any;
      expect(stored.consecutiveLockouts).toBe(1);
      expect(stored.attempts).toBe(0); // Reset after lockout
    });

    it('should apply exponential backoff for consecutive lockouts', async () => {
      const key = `${SECURITY_CONFIG.storageKeys.rateLimitPrefix}test-user`;

      // Simulate first lockout
      mockStorage.set(key, {
        attempts: 0,
        firstAttemptAt: 0,
        lockedUntil: 0,
        consecutiveLockouts: 1,
      });

      // Trigger second lockout
      for (let i = 0; i < SECURITY_CONFIG.rateLimit.maxAttempts; i++) {
        await service.recordFailure('test-user');
      }

      const stored = mockStorage.get(key) as any;
      expect(stored.consecutiveLockouts).toBe(2);

      // Lockout duration should be doubled
      const expectedDuration =
        SECURITY_CONFIG.rateLimit.initialLockoutMs *
        SECURITY_CONFIG.rateLimit.lockoutMultiplier ** 1;

      const actualDuration = stored.lockedUntil - Date.now();
      expect(actualDuration).toBeGreaterThanOrEqual(expectedDuration - 100); // Allow 100ms tolerance
      expect(actualDuration).toBeLessThanOrEqual(expectedDuration + 100);
    });

    it('should cap lockout duration at maxLockoutMs', async () => {
      const key = `${SECURITY_CONFIG.storageKeys.rateLimitPrefix}test-user`;

      // Simulate many consecutive lockouts to exceed max
      mockStorage.set(key, {
        attempts: 0,
        firstAttemptAt: 0,
        lockedUntil: 0,
        consecutiveLockouts: 20, // Very high number
      });

      // Trigger lockout
      for (let i = 0; i < SECURITY_CONFIG.rateLimit.maxAttempts; i++) {
        await service.recordFailure('test-user');
      }

      const stored = mockStorage.get(key) as any;
      const actualDuration = stored.lockedUntil - Date.now();

      expect(actualDuration).toBeLessThanOrEqual(SECURITY_CONFIG.rateLimit.maxLockoutMs + 100);
    });

    it('should reset attempts when outside attempt window', async () => {
      const now = Date.now();
      const key = `${SECURITY_CONFIG.storageKeys.rateLimitPrefix}test-user`;

      // Setup old state
      mockStorage.set(key, {
        attempts: 3,
        firstAttemptAt: now - SECURITY_CONFIG.rateLimit.attemptWindowMs - 1000,
        lockedUntil: 0,
        consecutiveLockouts: 0,
      });

      await service.recordFailure('test-user');

      const stored = mockStorage.get(key) as any;
      expect(stored.attempts).toBe(1); // Should be reset and incremented once
    });

    it('should return attempts remaining after failure', async () => {
      const result = await service.recordFailure('test-user');

      expect(result.allowed).toBe(true);
      expect(result.attemptsRemaining).toBe(SECURITY_CONFIG.rateLimit.maxAttempts - 1);
    });
  });

  describe('recordSuccess', () => {
    it('should clear rate limit state', async () => {
      // Setup some failures
      await service.recordFailure('test-user');
      await service.recordFailure('test-user');

      // Record success
      await service.recordSuccess('test-user');

      // Check that state is cleared
      const result = await service.checkLimit('test-user');
      expect(result.allowed).toBe(true);
      expect(result.attemptsRemaining).toBe(SECURITY_CONFIG.rateLimit.maxAttempts);
    });

    it('should remove storage key', async () => {
      await service.recordFailure('test-user');
      await service.recordSuccess('test-user');

      const key = `${SECURITY_CONFIG.storageKeys.rateLimitPrefix}test-user`;
      expect(chrome.storage.session.remove).toHaveBeenCalledWith(key);
      expect(mockStorage.has(key)).toBe(false);
    });
  });

  describe('formatLockoutMessage', () => {
    it('should format seconds correctly', () => {
      const message = service.formatLockoutMessage(5000);
      expect(message).toBe('Too many attempts. Try again in 5 seconds.');
    });

    it('should format single second correctly', () => {
      const message = service.formatLockoutMessage(1000);
      expect(message).toBe('Too many attempts. Try again in 1 seconds.');
    });

    it('should format minutes correctly', () => {
      const message = service.formatLockoutMessage(120000);
      expect(message).toBe('Too many attempts. Try again in 2 minutes.');
    });

    it('should format single minute correctly', () => {
      const message = service.formatLockoutMessage(60000);
      expect(message).toBe('Too many attempts. Try again in 1 minute.');
    });

    it('should round up fractional seconds', () => {
      const message = service.formatLockoutMessage(1500);
      expect(message).toBe('Too many attempts. Try again in 2 seconds.');
    });

    it('should round up fractional minutes', () => {
      const message = service.formatLockoutMessage(90000);
      expect(message).toBe('Too many attempts. Try again in 2 minutes.');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete failure-to-success flow', async () => {
      const identifier = 'test-user';

      // First attempt fails
      let result = await service.recordFailure(identifier);
      expect(result.allowed).toBe(true);
      expect(result.attemptsRemaining).toBe(4);

      // Second attempt fails
      result = await service.recordFailure(identifier);
      expect(result.allowed).toBe(true);
      expect(result.attemptsRemaining).toBe(3);

      // Check limit
      let checkResult = await service.checkLimit(identifier);
      expect(checkResult.allowed).toBe(true);
      expect(checkResult.attemptsRemaining).toBe(3);

      // Success - should reset everything
      await service.recordSuccess(identifier);

      // Check limit after success
      checkResult = await service.checkLimit(identifier);
      expect(checkResult.allowed).toBe(true);
      expect(checkResult.attemptsRemaining).toBe(5);
    });

    it('should handle multiple users independently', async () => {
      // User 1 fails
      await service.recordFailure('user1');
      await service.recordFailure('user1');

      // User 2 fails
      await service.recordFailure('user2');

      // Check both users
      const result1 = await service.checkLimit('user1');
      const result2 = await service.checkLimit('user2');

      expect(result1.attemptsRemaining).toBe(3);
      expect(result2.attemptsRemaining).toBe(4);
    });

    it('should handle lockout expiration', async () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      // Trigger lockout
      for (let i = 0; i < SECURITY_CONFIG.rateLimit.maxAttempts; i++) {
        await service.recordFailure('test-user');
      }

      // Should be locked
      let result = await service.checkLimit('test-user');
      expect(result.allowed).toBe(false);

      // Fast forward past lockout period
      vi.setSystemTime(now + SECURITY_CONFIG.rateLimit.initialLockoutMs + 1000);

      // Should be unlocked but attempts reset
      result = await service.checkLimit('test-user');
      expect(result.allowed).toBe(true);

      vi.useRealTimers();
    });
  });
});
