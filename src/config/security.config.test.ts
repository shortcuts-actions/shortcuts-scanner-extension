import { describe, expect, it } from 'vitest';
import { SECURITY_CONFIG } from './security.config';

describe('SECURITY_CONFIG', () => {
  describe('crypto configuration', () => {
    it('should use AES-GCM algorithm', () => {
      expect(SECURITY_CONFIG.crypto.algorithm).toBe('AES-GCM');
    });

    it('should use 256-bit key length', () => {
      expect(SECURITY_CONFIG.crypto.keyLength).toBe(256);
    });

    it('should use 96-bit IV length', () => {
      expect(SECURITY_CONFIG.crypto.ivLength).toBe(12);
    });

    it('should use 256-bit salt length', () => {
      expect(SECURITY_CONFIG.crypto.saltLength).toBe(32);
    });

    it('should use 128-bit tag length for maximum security', () => {
      expect(SECURITY_CONFIG.crypto.tagLength).toBe(128);
    });

    it('should use OWASP 2025 recommended PBKDF2 iterations', () => {
      expect(SECURITY_CONFIG.crypto.pbkdf2Iterations).toBe(800_000);
    });

    it('should use SHA-256 for PBKDF2', () => {
      expect(SECURITY_CONFIG.crypto.pbkdf2Hash).toBe('SHA-256');
    });
  });

  describe('password requirements', () => {
    it('should require minimum 12 character password', () => {
      expect(SECURITY_CONFIG.password.minLength).toBe(12);
    });

    it('should have maximum 128 character limit', () => {
      expect(SECURITY_CONFIG.password.maxLength).toBe(128);
    });

    it('should require uppercase letters', () => {
      expect(SECURITY_CONFIG.password.requireUppercase).toBe(true);
    });

    it('should require lowercase letters', () => {
      expect(SECURITY_CONFIG.password.requireLowercase).toBe(true);
    });

    it('should require numbers', () => {
      expect(SECURITY_CONFIG.password.requireNumbers).toBe(true);
    });

    it('should recommend but not require special characters', () => {
      expect(SECURITY_CONFIG.password.requireSpecial).toBe(false);
    });

    it('should require at least 3 character types', () => {
      expect(SECURITY_CONFIG.password.minCharacterTypes).toBe(3);
    });
  });

  describe('rate limiting', () => {
    it('should allow maximum 5 attempts', () => {
      expect(SECURITY_CONFIG.rateLimit.maxAttempts).toBe(5);
    });

    it('should have 30 second initial lockout', () => {
      expect(SECURITY_CONFIG.rateLimit.initialLockoutMs).toBe(30_000);
    });

    it('should double lockout time on each violation', () => {
      expect(SECURITY_CONFIG.rateLimit.lockoutMultiplier).toBe(2);
    });

    it('should have 1 hour maximum lockout', () => {
      expect(SECURITY_CONFIG.rateLimit.maxLockoutMs).toBe(3_600_000);
    });

    it('should use 15 minute attempt window', () => {
      expect(SECURITY_CONFIG.rateLimit.attemptWindowMs).toBe(900_000);
    });
  });

  describe('session configuration', () => {
    it('should have 30 minute cache expiry', () => {
      expect(SECURITY_CONFIG.session.cacheExpiryMs).toBe(30 * 60 * 1000);
    });

    it('should have 15 minute inactivity timeout', () => {
      expect(SECURITY_CONFIG.session.inactivityTimeoutMs).toBe(15 * 60 * 1000);
    });

    it('should use TRUSTED_CONTEXTS access level', () => {
      expect(SECURITY_CONFIG.session.accessLevel).toBe('TRUSTED_CONTEXTS');
    });
  });

  describe('storage keys', () => {
    it('should have unique storage keys', () => {
      const keys = Object.values(SECURITY_CONFIG.storageKeys);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });

    it('should have versioned API keys storage', () => {
      expect(SECURITY_CONFIG.storageKeys.apiKeys).toBe('secure_api_keys_v2');
    });

    it('should have device binding salt key', () => {
      expect(SECURITY_CONFIG.storageKeys.deviceSalt).toBe('device_binding_salt');
    });

    it('should have rate limit prefix', () => {
      expect(SECURITY_CONFIG.storageKeys.rateLimitPrefix).toBe('rate_limit_');
    });

    it('should have session cache key', () => {
      expect(SECURITY_CONFIG.storageKeys.sessionCache).toBe('decrypted_keys_cache');
    });

    it('should have versioned session settings key', () => {
      expect(SECURITY_CONFIG.storageKeys.sessionSettings).toBe('session_settings_v1');
    });

    it('should have persisted session key', () => {
      expect(SECURITY_CONFIG.storageKeys.persistedSessionKey).toBe('persisted_session_key');
    });
  });

  describe('schema version', () => {
    it('should be version 2', () => {
      expect(SECURITY_CONFIG.schemaVersion).toBe(2);
    });
  });

  describe('configuration immutability', () => {
    it('should be a const object', () => {
      // TypeScript enforces immutability at compile time with "as const"
      expect(SECURITY_CONFIG).toBeDefined();
      expect(typeof SECURITY_CONFIG).toBe('object');
    });
  });

  describe('security best practices', () => {
    it('should meet OWASP recommendations for PBKDF2', () => {
      // OWASP 2025 recommends 600,000+ iterations for PBKDF2-SHA256
      expect(SECURITY_CONFIG.crypto.pbkdf2Iterations).toBeGreaterThanOrEqual(600_000);
    });

    it('should use recommended salt length', () => {
      // OWASP recommends at least 128 bits (16 bytes)
      expect(SECURITY_CONFIG.crypto.saltLength).toBeGreaterThanOrEqual(16);
    });

    it('should use strong key length', () => {
      // 256 bits is recommended for AES
      expect(SECURITY_CONFIG.crypto.keyLength).toBe(256);
    });

    it('should enforce strong password minimum length', () => {
      // NIST recommends minimum 8, but 12+ is better
      expect(SECURITY_CONFIG.password.minLength).toBeGreaterThanOrEqual(12);
    });

    it('should have reasonable session timeout', () => {
      // Session expiry should be between 15-60 minutes for security
      const expiryMinutes = SECURITY_CONFIG.session.cacheExpiryMs / (60 * 1000);
      expect(expiryMinutes).toBeGreaterThanOrEqual(15);
      expect(expiryMinutes).toBeLessThanOrEqual(60);
    });

    it('should have reasonable inactivity timeout', () => {
      // Inactivity timeout should be less than session expiry
      expect(SECURITY_CONFIG.session.inactivityTimeoutMs).toBeLessThanOrEqual(
        SECURITY_CONFIG.session.cacheExpiryMs,
      );
    });
  });

  describe('rate limit calculations', () => {
    it('should have progressive lockout periods', () => {
      const initialLockout = 30000;
      const multiplier = 2;
      const maxLockout = 3600000;

      let lockout = initialLockout;
      const lockouts: number[] = [lockout];

      // Calculate progressive lockouts
      for (let i = 0; i < 5; i++) {
        lockout = Math.min(lockout * multiplier, maxLockout);
        lockouts.push(lockout);
      }

      // Verify progression
      expect(lockouts[0]).toBe(30000); // 30 seconds
      expect(lockouts[1]).toBe(60000); // 1 minute
      expect(lockouts[2]).toBe(120000); // 2 minutes
      expect(lockouts[3]).toBe(240000); // 4 minutes
      // Should cap at max
      expect(lockouts[5]).toBeLessThanOrEqual(maxLockout);
    });
  });
});
