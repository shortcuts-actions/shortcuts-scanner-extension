import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SESSION_SETTINGS } from '../config/session-settings';
import * as cryptoService from './crypto.service';
import { SessionCacheService } from './session-cache.service';

// Mock crypto service
vi.mock('./crypto.service', () => ({
  encrypt: vi.fn((data: string, _key: string) => Promise.resolve(`encrypted:${data}:${_key}`)),
  decrypt: vi.fn((encrypted: string, _key: string) => {
    const parts = encrypted.split(':');
    if (parts[0] !== 'encrypted') throw new Error('Invalid encrypted data');
    return Promise.resolve(parts[1]);
  }),
  generateSecureRandom: vi.fn((length: number) =>
    'random'.repeat(Math.ceil(length / 6)).substring(0, length),
  ),
  deriveWithHKDF: vi.fn(
    (extensionId: string, protector: string, info: string, keyLength: number) =>
      Promise.resolve(`hkdf:${extensionId}:${protector}:${info}:${keyLength}`),
  ),
}));

describe('SessionCacheService', () => {
  let service: SessionCacheService;

  beforeEach(() => {
    service = SessionCacheService.getInstance();
    service.clearSettingsCache();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getInstance', () => {
    it('should return the same instance (singleton)', () => {
      const instance1 = SessionCacheService.getInstance();
      const instance2 = SessionCacheService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should set session storage access level', async () => {
      chrome.storage.session.setAccessLevel = vi.fn().mockResolvedValue(undefined);
      chrome.storage.local.get = vi.fn().mockResolvedValue({});

      await service.initialize();

      expect(chrome.storage.session.setAccessLevel).toHaveBeenCalledWith({
        accessLevel: 'TRUSTED_CONTEXTS',
      });
    });

    it('should generate session key on initialization', async () => {
      chrome.storage.session.setAccessLevel = vi.fn().mockResolvedValue(undefined);
      chrome.storage.local.get = vi.fn().mockResolvedValue({});

      await service.initialize();

      expect(cryptoService.generateSecureRandom).toHaveBeenCalledWith(32);
    });

    it('should handle setAccessLevel errors gracefully', async () => {
      chrome.storage.session.setAccessLevel = vi.fn().mockRejectedValue(new Error('Access error'));
      chrome.storage.local.get = vi.fn().mockResolvedValue({});

      await expect(service.initialize()).resolves.not.toThrow();
    });

    it('should persist session key when persistence is enabled', async () => {
      chrome.storage.session.setAccessLevel = vi.fn().mockResolvedValue(undefined);
      chrome.storage.session.set = vi.fn().mockResolvedValue(undefined);
      chrome.storage.session.get = vi.fn().mockResolvedValue({});
      chrome.storage.local.get = vi.fn().mockResolvedValue({
        session_settings_v1: { persistSession: true },
      });

      await service.initialize();

      expect(chrome.storage.session.set).toHaveBeenCalled();
    });
  });

  describe('cacheKey', () => {
    beforeEach(async () => {
      chrome.storage.session.setAccessLevel = vi.fn().mockResolvedValue(undefined);
      chrome.storage.session.set = vi.fn().mockResolvedValue(undefined);
      chrome.storage.session.get = vi.fn().mockResolvedValue({});
      chrome.storage.local.get = vi.fn().mockResolvedValue({});
      chrome.alarms.create = vi.fn();
      await service.initialize();
    });

    it('should cache an encrypted key', async () => {
      const provider = 'openai';
      const apiKey = 'sk-test123';

      await service.cacheKey(provider, apiKey);

      expect(cryptoService.encrypt).toHaveBeenCalledWith(apiKey, expect.any(String));
      expect(chrome.storage.session.set).toHaveBeenCalled();
    });

    it('should set expiry time based on settings', async () => {
      const provider = 'openai';
      const apiKey = 'sk-test123';
      const now = Date.now();
      vi.setSystemTime(now);

      chrome.storage.session.get = vi.fn().mockResolvedValue({
        decrypted_keys_cache: { keys: {}, lastActivity: now },
      });

      await service.cacheKey(provider, apiKey);

      const setCalls = (chrome.storage.session.set as any).mock.calls;
      const cacheData = setCalls[setCalls.length - 1][0].decrypted_keys_cache;
      const expectedExpiry = now + DEFAULT_SESSION_SETTINGS.sessionExpiryMinutes * 60 * 1000;

      expect(cacheData.keys[provider].expiresAt).toBe(expectedExpiry);
    });

    it('should reset inactivity timer when caching key', async () => {
      const provider = 'openai';
      const apiKey = 'sk-test123';

      await service.cacheKey(provider, apiKey);

      expect(chrome.alarms.create).toHaveBeenCalledWith('session-timeout', {
        delayInMinutes: DEFAULT_SESSION_SETTINGS.inactivityTimeoutMinutes,
      });
    });
  });

  describe('getCachedKey', () => {
    beforeEach(async () => {
      chrome.storage.session.setAccessLevel = vi.fn().mockResolvedValue(undefined);
      chrome.storage.local.get = vi.fn().mockResolvedValue({});
      await service.initialize();
    });

    it('should return cached key if not expired', async () => {
      const provider = 'openai';
      const now = Date.now();
      vi.setSystemTime(now);

      chrome.storage.session.get = vi.fn().mockResolvedValue({
        decrypted_keys_cache: {
          keys: {
            [provider]: {
              encryptedKey: 'encrypted:sk-test123:somekey',
              expiresAt: now + 10000,
              provider,
            },
          },
          lastActivity: now,
        },
      });
      chrome.storage.session.set = vi.fn().mockResolvedValue(undefined);
      chrome.alarms.create = vi.fn();

      const result = await service.getCachedKey(provider);

      expect(result).toBe('sk-test123');
      expect(cryptoService.decrypt).toHaveBeenCalled();
    });

    it('should return null if key is expired', async () => {
      const provider = 'openai';
      const now = Date.now();
      vi.setSystemTime(now);

      chrome.storage.session.get = vi.fn().mockResolvedValue({
        decrypted_keys_cache: {
          keys: {
            [provider]: {
              encryptedKey: 'encrypted:sk-test123:somekey',
              expiresAt: now - 1000, // Expired
              provider,
            },
          },
          lastActivity: now,
        },
      });
      chrome.storage.session.set = vi.fn().mockResolvedValue(undefined);

      const result = await service.getCachedKey(provider);

      expect(result).toBeNull();
    });

    it('should return null if provider not found', async () => {
      chrome.storage.session.get = vi.fn().mockResolvedValue({
        decrypted_keys_cache: { keys: {}, lastActivity: Date.now() },
      });

      const result = await service.getCachedKey('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null and clean up if decryption fails', async () => {
      const provider = 'openai';
      const now = Date.now();

      chrome.storage.session.get = vi.fn().mockResolvedValue({
        decrypted_keys_cache: {
          keys: {
            [provider]: {
              encryptedKey: 'invalid-encrypted-data',
              expiresAt: now + 10000,
              provider,
            },
          },
          lastActivity: now,
        },
      });
      chrome.storage.session.set = vi.fn().mockResolvedValue(undefined);

      const result = await service.getCachedKey(provider);

      expect(result).toBeNull();
      expect(chrome.storage.session.set).toHaveBeenCalled();
    });
  });

  describe('removeCachedKey', () => {
    beforeEach(async () => {
      chrome.storage.session.setAccessLevel = vi.fn().mockResolvedValue(undefined);
      chrome.storage.local.get = vi.fn().mockResolvedValue({});
      await service.initialize();
    });

    it('should remove specific cached key', async () => {
      const provider = 'openai';
      const now = Date.now();

      chrome.storage.session.get = vi.fn().mockResolvedValue({
        decrypted_keys_cache: {
          keys: {
            [provider]: {
              encryptedKey: 'encrypted:key',
              expiresAt: now + 10000,
              provider,
            },
            anthropic: {
              encryptedKey: 'encrypted:key2',
              expiresAt: now + 10000,
              provider: 'anthropic',
            },
          },
          lastActivity: now,
        },
      });
      chrome.storage.session.set = vi.fn().mockResolvedValue(undefined);

      await service.removeCachedKey(provider);

      const setCalls = (chrome.storage.session.set as any).mock.calls;
      const cacheData = setCalls[setCalls.length - 1][0].decrypted_keys_cache;

      expect(cacheData.keys[provider]).toBeUndefined();
      expect(cacheData.keys.anthropic).toBeDefined();
    });

    it('should handle removing non-existent key', async () => {
      chrome.storage.session.get = vi.fn().mockResolvedValue({
        decrypted_keys_cache: { keys: {}, lastActivity: Date.now() },
      });
      chrome.storage.session.set = vi.fn().mockResolvedValue(undefined);

      await expect(service.removeCachedKey('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('clearAllCachedKeys', () => {
    it('should remove all cached keys', async () => {
      chrome.storage.session.remove = vi.fn().mockResolvedValue(undefined);
      chrome.alarms.clear = vi.fn().mockResolvedValue(true);

      await service.clearAllCachedKeys();

      expect(chrome.storage.session.remove).toHaveBeenCalledWith('decrypted_keys_cache');
      expect(chrome.alarms.clear).toHaveBeenCalledWith('session-timeout');
    });
  });

  describe('hasUnlockedKeys', () => {
    it('should return true if any keys are not expired', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      chrome.storage.session.get = vi.fn().mockResolvedValue({
        decrypted_keys_cache: {
          keys: {
            openai: {
              encryptedKey: 'encrypted:key',
              expiresAt: now + 10000,
              provider: 'openai',
            },
          },
          lastActivity: now,
        },
      });

      const result = await service.hasUnlockedKeys();
      expect(result).toBe(true);
    });

    it('should return false if all keys are expired', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      chrome.storage.session.get = vi.fn().mockResolvedValue({
        decrypted_keys_cache: {
          keys: {
            openai: {
              encryptedKey: 'encrypted:key',
              expiresAt: now - 1000,
              provider: 'openai',
            },
          },
          lastActivity: now,
        },
      });

      const result = await service.hasUnlockedKeys();
      expect(result).toBe(false);
    });

    it('should return false if no keys are cached', async () => {
      chrome.storage.session.get = vi.fn().mockResolvedValue({
        decrypted_keys_cache: { keys: {}, lastActivity: Date.now() },
      });

      const result = await service.hasUnlockedKeys();
      expect(result).toBe(false);
    });
  });

  describe('getUnlockedProviders', () => {
    it('should return list of providers with non-expired keys', async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      chrome.storage.session.get = vi.fn().mockResolvedValue({
        decrypted_keys_cache: {
          keys: {
            openai: {
              encryptedKey: 'encrypted:key',
              expiresAt: now + 10000,
              provider: 'openai',
            },
            anthropic: {
              encryptedKey: 'encrypted:key2',
              expiresAt: now + 10000,
              provider: 'anthropic',
            },
            expired: {
              encryptedKey: 'encrypted:key3',
              expiresAt: now - 1000,
              provider: 'expired',
            },
          },
          lastActivity: now,
        },
      });

      const result = await service.getUnlockedProviders();
      expect(result).toEqual(['openai', 'anthropic']);
    });
  });

  describe('extendSession', () => {
    beforeEach(async () => {
      chrome.storage.session.setAccessLevel = vi.fn().mockResolvedValue(undefined);
      chrome.storage.local.get = vi.fn().mockResolvedValue({});
      await service.initialize();
    });

    it('should extend expiry for existing non-expired key', async () => {
      const provider = 'openai';
      const now = Date.now();
      vi.setSystemTime(now);

      chrome.storage.session.get = vi.fn().mockResolvedValue({
        decrypted_keys_cache: {
          keys: {
            [provider]: {
              encryptedKey: 'encrypted:key',
              expiresAt: now + 5000,
              provider,
            },
          },
          lastActivity: now,
        },
      });
      chrome.storage.session.set = vi.fn().mockResolvedValue(undefined);
      chrome.alarms.create = vi.fn();

      const result = await service.extendSession(provider);

      expect(result).toBe(true);
      const setCalls = (chrome.storage.session.set as any).mock.calls;
      const cacheData = setCalls[setCalls.length - 1][0].decrypted_keys_cache;
      expect(cacheData.keys[provider].expiresAt).toBeGreaterThan(now + 5000);
    });

    it('should return false for expired key', async () => {
      const provider = 'openai';
      const now = Date.now();
      vi.setSystemTime(now);

      chrome.storage.session.get = vi.fn().mockResolvedValue({
        decrypted_keys_cache: {
          keys: {
            [provider]: {
              encryptedKey: 'encrypted:key',
              expiresAt: now - 1000,
              provider,
            },
          },
          lastActivity: now,
        },
      });

      const result = await service.extendSession(provider);
      expect(result).toBe(false);
    });

    it('should return false for non-existent provider', async () => {
      chrome.storage.session.get = vi.fn().mockResolvedValue({
        decrypted_keys_cache: { keys: {}, lastActivity: Date.now() },
      });

      const result = await service.extendSession('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('handleSessionTimeout', () => {
    it('should clear all cached keys', async () => {
      chrome.storage.session.remove = vi.fn().mockResolvedValue(undefined);
      chrome.alarms.clear = vi.fn().mockResolvedValue(true);
      chrome.runtime.sendMessage = vi.fn().mockResolvedValue(undefined);

      await service.handleSessionTimeout();

      expect(chrome.storage.session.remove).toHaveBeenCalledWith('decrypted_keys_cache');
    });

    it('should send session locked message', async () => {
      chrome.storage.session.remove = vi.fn().mockResolvedValue(undefined);
      chrome.alarms.clear = vi.fn().mockResolvedValue(true);
      chrome.runtime.sendMessage = vi.fn().mockResolvedValue(undefined);

      await service.handleSessionTimeout();

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'SESSION_LOCKED' });
    });

    it('should handle sendMessage errors gracefully', async () => {
      chrome.storage.session.remove = vi.fn().mockResolvedValue(undefined);
      chrome.alarms.clear = vi.fn().mockResolvedValue(true);
      chrome.runtime.sendMessage = vi.fn().mockRejectedValue(new Error('UI not open'));

      await expect(service.handleSessionTimeout()).resolves.not.toThrow();
    });
  });

  describe('clearPersistedSessionKey', () => {
    it('should remove persisted session key', async () => {
      chrome.storage.session.remove = vi.fn().mockResolvedValue(undefined);

      await service.clearPersistedSessionKey();

      expect(chrome.storage.session.remove).toHaveBeenCalledWith('persisted_session_key');
    });
  });

  describe('clearSettingsCache', () => {
    it('should clear the settings cache', () => {
      expect(() => service.clearSettingsCache()).not.toThrow();
    });
  });

  describe('updateInactivityTimer', () => {
    beforeEach(async () => {
      chrome.storage.session.setAccessLevel = vi.fn().mockResolvedValue(undefined);
      chrome.storage.local.get = vi.fn().mockResolvedValue({});
      await service.initialize();
    });

    it('should reset timer if keys are unlocked', async () => {
      const now = Date.now();
      chrome.storage.session.get = vi.fn().mockResolvedValue({
        decrypted_keys_cache: {
          keys: {
            openai: {
              encryptedKey: 'encrypted:key',
              expiresAt: now + 10000,
              provider: 'openai',
            },
          },
          lastActivity: now,
        },
      });
      chrome.alarms.clear = vi.fn().mockResolvedValue(true);
      chrome.alarms.create = vi.fn();

      await service.updateInactivityTimer();

      expect(chrome.alarms.clear).toHaveBeenCalledWith('session-timeout');
      expect(chrome.alarms.create).toHaveBeenCalled();
    });

    it('should not reset timer if no keys are unlocked', async () => {
      chrome.storage.session.get = vi.fn().mockResolvedValue({
        decrypted_keys_cache: { keys: {}, lastActivity: Date.now() },
      });
      chrome.alarms.clear = vi.fn().mockResolvedValue(true);
      chrome.alarms.create = vi.fn();

      await service.updateInactivityTimer();

      expect(chrome.alarms.create).not.toHaveBeenCalled();
    });
  });

  describe('handlePersistenceToggle', () => {
    beforeEach(async () => {
      chrome.storage.session.setAccessLevel = vi.fn().mockResolvedValue(undefined);
      chrome.storage.local.get = vi.fn().mockResolvedValue({});
      chrome.storage.session.set = vi.fn().mockResolvedValue(undefined);
      await service.initialize();
    });

    it('should persist session key when enabled', async () => {
      await service.handlePersistenceToggle(true);

      expect(chrome.storage.session.set).toHaveBeenCalled();
    });

    it('should clear persisted key when disabled', async () => {
      chrome.storage.session.remove = vi.fn().mockResolvedValue(undefined);

      await service.handlePersistenceToggle(false);

      expect(chrome.storage.session.remove).toHaveBeenCalledWith('persisted_session_key');
    });
  });
});
