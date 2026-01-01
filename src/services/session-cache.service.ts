// Session cache service for decrypted API keys
// Provides fast access to unlocked keys during active use
// Keys are stored in memory-only session storage

import { SECURITY_CONFIG } from '../config/security.config';
import { DEFAULT_SESSION_SETTINGS, type SessionSettings } from '../config/session-settings';
import { decrypt, deriveWithHKDF, encrypt, generateSecureRandom } from './crypto.service';
import { sanitizeSessionSettings } from './session-settings.service';

const { session, storageKeys } = SECURITY_CONFIG;

interface CachedKey {
  encryptedKey: string; // Encrypted even in session storage
  expiresAt: number;
  provider: string;
}

interface SessionCache {
  keys: Record<string, CachedKey>;
  lastActivity: number;
}

interface PersistedSessionKey {
  encryptedKey: string; // Session key encrypted with derived passphrase
  protector: string; // Random value used in key derivation
  createdAt: number;
}

/**
 * Session cache service for decrypted API keys
 * Provides fast access to unlocked keys during active use
 * Keys are stored in memory-only session storage
 *
 * SECURITY NOTE: chrome.storage.session data can leak to content scripts
 * via the onChanged listener, even when set to TRUSTED_CONTEXTS.
 * To mitigate this, we encrypt cached keys with an ephemeral runtime key.
 */
export class SessionCacheService {
  private static instance: SessionCacheService;
  // Ephemeral encryption key - only exists in memory for this browser session
  private sessionEncryptionKey: string | null = null;
  // Cached settings to avoid repeated storage reads
  private settingsCache: SessionSettings | null = null;

  private constructor() {}

  static getInstance(): SessionCacheService {
    if (!SessionCacheService.instance) {
      SessionCacheService.instance = new SessionCacheService();
    }
    return SessionCacheService.instance;
  }

  /**
   * Gets session settings from storage
   * Always sanitizes values to enforce limits
   */
  private async getSettings(): Promise<SessionSettings> {
    if (this.settingsCache) {
      return this.settingsCache;
    }

    try {
      const result = await chrome.storage.local.get(storageKeys.sessionSettings);
      const stored = result[storageKeys.sessionSettings];
      // Always sanitize to enforce limits (defense against HTML injection)
      this.settingsCache = sanitizeSessionSettings(stored || {});
      return this.settingsCache;
    } catch {
      return DEFAULT_SESSION_SETTINGS;
    }
  }

  /**
   * Clears the settings cache
   * Call this when settings are changed externally
   */
  clearSettingsCache(): void {
    this.settingsCache = null;
  }

  /**
   * Gets or restores the ephemeral session encryption key
   * When persistence is enabled, attempts to restore from session storage
   * Otherwise generates a new ephemeral key
   */
  private async getSessionKey(): Promise<string> {
    // If we already have the key in memory, return it
    if (this.sessionEncryptionKey) {
      return this.sessionEncryptionKey;
    }

    const settings = await this.getSettings();

    // If persistence is enabled, try to restore from session storage
    if (settings.persistSession) {
      const restored = await this.tryRestoreSessionKey();
      if (restored) {
        this.sessionEncryptionKey = restored;
        return this.sessionEncryptionKey;
      }
    }

    // Generate new ephemeral key
    this.sessionEncryptionKey = generateSecureRandom(32);

    // If persistence is enabled, persist the new key
    if (settings.persistSession) {
      await this.persistSessionKey(this.sessionEncryptionKey);
    }

    return this.sessionEncryptionKey;
  }

  /**
   * Attempts to restore the session key from session storage
   * Returns null if not found or decryption fails
   */
  private async tryRestoreSessionKey(): Promise<string | null> {
    try {
      const result = await chrome.storage.session.get(storageKeys.persistedSessionKey);
      const persisted = result[storageKeys.persistedSessionKey] as PersistedSessionKey | undefined;

      if (!persisted) {
        return null;
      }

      // Derive decryption key from protector + extension ID
      const derivedKey = await deriveWithHKDF(
        chrome.runtime.id,
        persisted.protector,
        'session-key-protection-v1',
        256,
      );

      // Decrypt the session key
      const sessionKey = await decrypt(persisted.encryptedKey, derivedKey);
      return sessionKey;
    } catch {
      // Decryption failed, clear stale entry
      await chrome.storage.session.remove(storageKeys.persistedSessionKey);
      return null;
    }
  }

  /**
   * Persists the session key to session storage (encrypted)
   * Uses HKDF to derive an encryption key from a random protector + extension ID
   */
  private async persistSessionKey(sessionKey: string): Promise<void> {
    try {
      // Generate random protector
      const protector = generateSecureRandom(32);

      // Derive encryption key from protector + extension ID
      const derivedKey = await deriveWithHKDF(
        chrome.runtime.id,
        protector,
        'session-key-protection-v1',
        256,
      );

      // Encrypt the session key
      const encryptedKey = await encrypt(sessionKey, derivedKey);

      // Store in session storage (clears on browser close)
      await chrome.storage.session.set({
        [storageKeys.persistedSessionKey]: {
          encryptedKey,
          protector,
          createdAt: Date.now(),
        } as PersistedSessionKey,
      });
    } catch {
      // Failed to persist, but we can still continue with in-memory key
      console.warn('Failed to persist session key');
    }
  }

  /**
   * Clears the persisted session key
   * Call this when persistence is disabled
   */
  async clearPersistedSessionKey(): Promise<void> {
    await chrome.storage.session.remove(storageKeys.persistedSessionKey);
  }

  /**
   * Initializes session storage access level
   * Must be called from service worker on startup
   */
  async initialize(): Promise<void> {
    try {
      await chrome.storage.session.setAccessLevel({
        accessLevel: session.accessLevel,
      });

      const settings = await this.getSettings();

      // Try to restore session key if persistence is enabled
      if (settings.persistSession) {
        const restored = await this.tryRestoreSessionKey();
        if (restored) {
          this.sessionEncryptionKey = restored;
          return;
        }
      }

      // Generate fresh session key
      this.sessionEncryptionKey = generateSecureRandom(32);

      // Persist if enabled
      if (settings.persistSession) {
        await this.persistSessionKey(this.sessionEncryptionKey);
      }
    } catch {
      // Log safely without sensitive details
      console.warn('Failed to set session storage access level');
    }
  }

  /**
   * Gets the current session cache
   */
  private async getCache(): Promise<SessionCache> {
    const result = await chrome.storage.session.get(storageKeys.sessionCache);
    return result[storageKeys.sessionCache] || { keys: {}, lastActivity: Date.now() };
  }

  /**
   * Saves the session cache
   */
  private async saveCache(cache: SessionCache): Promise<void> {
    await chrome.storage.session.set({ [storageKeys.sessionCache]: cache });
  }

  /**
   * Caches a decrypted key for quick access
   * Keys are encrypted with an ephemeral session key to mitigate onChanged leaks
   */
  async cacheKey(provider: string, decryptedKey: string): Promise<void> {
    const sessionKey = await this.getSessionKey();
    const encryptedSessionValue = await encrypt(decryptedKey, sessionKey);

    // Get settings for configurable expiry (always sanitized)
    const settings = await this.getSettings();
    const expiryMs = settings.sessionExpiryMinutes * 60 * 1000;

    const cache = await this.getCache();

    cache.keys[provider] = {
      encryptedKey: encryptedSessionValue, // Store encrypted even in session
      expiresAt: Date.now() + expiryMs,
      provider,
    };
    cache.lastActivity = Date.now();

    await this.saveCache(cache);
    await this.resetInactivityTimer();
  }

  /**
   * Retrieves a cached key if not expired
   */
  async getCachedKey(provider: string): Promise<string | null> {
    const cache = await this.getCache();
    const cached = cache.keys[provider];

    if (!cached) {
      return null;
    }

    // Check expiration
    if (cached.expiresAt < Date.now()) {
      delete cache.keys[provider];
      await this.saveCache(cache);
      return null;
    }

    // Decrypt the cached key using ephemeral session key
    try {
      const sessionKey = await this.getSessionKey();
      const decryptedKey = await decrypt(cached.encryptedKey, sessionKey);

      // Update activity timestamp
      cache.lastActivity = Date.now();
      await this.saveCache(cache);
      await this.resetInactivityTimer();

      return decryptedKey;
    } catch {
      // If decryption fails (e.g., service worker restarted), remove stale entry
      delete cache.keys[provider];
      await this.saveCache(cache);
      return null;
    }
  }

  /**
   * Removes a specific key from cache
   */
  async removeCachedKey(provider: string): Promise<void> {
    const cache = await this.getCache();

    if (cache.keys[provider]) {
      delete cache.keys[provider];
      await this.saveCache(cache);
    }
  }

  /**
   * Clears all cached keys (locks all providers)
   */
  async clearAllCachedKeys(): Promise<void> {
    await chrome.storage.session.remove(storageKeys.sessionCache);
    this.clearInactivityTimer();
  }

  /**
   * Checks if any keys are currently cached (unlocked)
   */
  async hasUnlockedKeys(): Promise<boolean> {
    const cache = await this.getCache();
    const now = Date.now();

    return Object.values(cache.keys).some((key) => key.expiresAt > now);
  }

  /**
   * Gets list of unlocked providers
   */
  async getUnlockedProviders(): Promise<string[]> {
    const cache = await this.getCache();
    const now = Date.now();

    return Object.entries(cache.keys)
      .filter(([, value]) => value.expiresAt > now)
      .map(([, value]) => value.provider);
  }

  /**
   * Resets the inactivity timer using chrome.alarms API
   *
   * SECURITY NOTE: Service workers can be terminated by Chrome at any time.
   * Using chrome.alarms ensures reliable timeout handling even after
   * service worker restarts. setTimeout would not survive a worker restart.
   */
  private async resetInactivityTimer(): Promise<void> {
    await this.clearInactivityTimer();

    // Get configurable inactivity timeout from settings
    const settings = await this.getSettings();
    const timeoutMinutes = settings.inactivityTimeoutMinutes;

    // Use chrome.alarms for reliable timing across service worker restarts
    await chrome.alarms.create('session-timeout', {
      delayInMinutes: timeoutMinutes,
    });
  }

  /**
   * Updates the inactivity timer with new settings
   * Call this when settings are changed
   */
  async updateInactivityTimer(): Promise<void> {
    // Clear settings cache to get fresh values
    this.clearSettingsCache();

    // Check if there are any unlocked keys
    const hasKeys = await this.hasUnlockedKeys();
    if (hasKeys) {
      // Reset timer with new settings
      await this.resetInactivityTimer();
    }
  }

  /**
   * Clears the inactivity timer
   */
  private async clearInactivityTimer(): Promise<void> {
    await chrome.alarms.clear('session-timeout');
  }

  /**
   * Handles session timeout alarm - should be called from background.ts
   */
  async handleSessionTimeout(): Promise<void> {
    await this.clearAllCachedKeys();
    // Notify UI about session lock
    try {
      await chrome.runtime.sendMessage({ type: 'SESSION_LOCKED' });
    } catch {
      // UI might not be open, ignore
    }
  }

  /**
   * Extends session for a provider (refreshes expiry)
   */
  async extendSession(provider: string): Promise<boolean> {
    const cache = await this.getCache();
    const cached = cache.keys[provider];

    if (!cached || cached.expiresAt < Date.now()) {
      return false;
    }

    // Get configurable expiry from settings
    const settings = await this.getSettings();
    const expiryMs = settings.sessionExpiryMinutes * 60 * 1000;

    cached.expiresAt = Date.now() + expiryMs;
    cache.lastActivity = Date.now();
    await this.saveCache(cache);
    this.resetInactivityTimer();

    return true;
  }

  /**
   * Handles when persistence setting is toggled
   * If disabled, clears persisted session key
   * If enabled, persists current session key
   */
  async handlePersistenceToggle(enabled: boolean): Promise<void> {
    if (enabled) {
      // Persist current session key if we have one
      if (this.sessionEncryptionKey) {
        await this.persistSessionKey(this.sessionEncryptionKey);
      }
    } else {
      // Clear persisted key
      await this.clearPersistedSessionKey();
    }
  }
}

export const sessionCacheService = SessionCacheService.getInstance();
