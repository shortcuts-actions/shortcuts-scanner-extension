import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SESSION_SETTINGS, SESSION_LIMITS } from '../config/session-settings';
import {
  SessionSettingsService,
  sanitizeSessionSettings,
  shouldShowSecurityWarning,
  validateInactivityTimeout,
  validateSessionExpiry,
} from './session-settings.service';

describe('SessionSettingsService', () => {
  let service: SessionSettingsService;

  beforeEach(() => {
    service = SessionSettingsService.getInstance();
    service.clearCache();
    vi.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return the same instance (singleton)', () => {
      const instance1 = SessionSettingsService.getInstance();
      const instance2 = SessionSettingsService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('validateSessionExpiry', () => {
    it('should accept valid expiry within range', () => {
      const result = validateSessionExpiry(30);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject expiry below minimum', () => {
      const result = validateSessionExpiry(3);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Minimum session expiry is 5 minutes');
    });

    it('should reject expiry above maximum', () => {
      const result = validateSessionExpiry(400);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Maximum session expiry is 360 minutes');
    });

    it('should accept expiry at minimum boundary', () => {
      const result = validateSessionExpiry(SESSION_LIMITS.minExpiryMinutes);
      expect(result.valid).toBe(true);
    });

    it('should accept expiry at maximum boundary', () => {
      const result = validateSessionExpiry(SESSION_LIMITS.maxExpiryMinutes);
      expect(result.valid).toBe(true);
    });

    it('should reject non-number values', () => {
      const result = validateSessionExpiry('30' as any);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid expiry value');
    });

    it('should reject NaN values', () => {
      const result = validateSessionExpiry(NaN);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid expiry value');
    });
  });

  describe('validateInactivityTimeout', () => {
    it('should accept valid timeout within range', () => {
      const result = validateInactivityTimeout(15);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject timeout below minimum', () => {
      const result = validateInactivityTimeout(3);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Minimum inactivity timeout is 5 minutes');
    });

    it('should reject timeout above maximum', () => {
      const result = validateInactivityTimeout(90);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Maximum inactivity timeout is 60 minutes');
    });

    it('should accept timeout at minimum boundary', () => {
      const result = validateInactivityTimeout(SESSION_LIMITS.minInactivityMinutes);
      expect(result.valid).toBe(true);
    });

    it('should accept timeout at maximum boundary', () => {
      const result = validateInactivityTimeout(SESSION_LIMITS.maxInactivityMinutes);
      expect(result.valid).toBe(true);
    });

    it('should reject non-number values', () => {
      const result = validateInactivityTimeout('15' as any);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid timeout value');
    });

    it('should reject NaN values', () => {
      const result = validateInactivityTimeout(NaN);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid timeout value');
    });
  });

  describe('shouldShowSecurityWarning', () => {
    it('should show warning for expiry at threshold', () => {
      const result = shouldShowSecurityWarning(SESSION_LIMITS.warningThresholdMinutes);
      expect(result).toBe(true);
    });

    it('should show warning for expiry above threshold', () => {
      const result = shouldShowSecurityWarning(SESSION_LIMITS.warningThresholdMinutes + 1);
      expect(result).toBe(true);
    });

    it('should not show warning for expiry below threshold', () => {
      const result = shouldShowSecurityWarning(SESSION_LIMITS.warningThresholdMinutes - 1);
      expect(result).toBe(false);
    });

    it('should not show warning for low expiry values', () => {
      const result = shouldShowSecurityWarning(30);
      expect(result).toBe(false);
    });
  });

  describe('sanitizeSessionSettings', () => {
    it('should return default values for empty object', () => {
      const result = sanitizeSessionSettings({});
      expect(result.persistSession).toBe(false);
      expect(result.sessionExpiryMinutes).toBe(DEFAULT_SESSION_SETTINGS.sessionExpiryMinutes);
      expect(result.inactivityTimeoutMinutes).toBe(
        DEFAULT_SESSION_SETTINGS.inactivityTimeoutMinutes,
      );
    });

    it('should preserve valid boolean persistSession', () => {
      const result = sanitizeSessionSettings({ persistSession: true });
      expect(result.persistSession).toBe(true);
    });

    it('should default persistSession for invalid values', () => {
      const result = sanitizeSessionSettings({ persistSession: 'true' as any });
      expect(result.persistSession).toBe(false);
    });

    it('should clamp sessionExpiryMinutes above maximum', () => {
      const result = sanitizeSessionSettings({ sessionExpiryMinutes: 500 });
      expect(result.sessionExpiryMinutes).toBe(SESSION_LIMITS.maxExpiryMinutes);
    });

    it('should clamp sessionExpiryMinutes below minimum', () => {
      const result = sanitizeSessionSettings({ sessionExpiryMinutes: 2 });
      expect(result.sessionExpiryMinutes).toBe(SESSION_LIMITS.minExpiryMinutes);
    });

    it('should clamp inactivityTimeoutMinutes above maximum', () => {
      const result = sanitizeSessionSettings({ inactivityTimeoutMinutes: 100 });
      expect(result.inactivityTimeoutMinutes).toBe(SESSION_LIMITS.maxInactivityMinutes);
    });

    it('should clamp inactivityTimeoutMinutes below minimum', () => {
      const result = sanitizeSessionSettings({ inactivityTimeoutMinutes: 2 });
      expect(result.inactivityTimeoutMinutes).toBe(SESSION_LIMITS.minInactivityMinutes);
    });

    it('should use defaults for NaN values', () => {
      const result = sanitizeSessionSettings({
        sessionExpiryMinutes: NaN,
        inactivityTimeoutMinutes: NaN,
      });
      expect(result.sessionExpiryMinutes).toBe(DEFAULT_SESSION_SETTINGS.sessionExpiryMinutes);
      expect(result.inactivityTimeoutMinutes).toBe(
        DEFAULT_SESSION_SETTINGS.inactivityTimeoutMinutes,
      );
    });

    it('should use defaults for undefined values', () => {
      const result = sanitizeSessionSettings({
        sessionExpiryMinutes: undefined,
        inactivityTimeoutMinutes: undefined,
      });
      expect(result.sessionExpiryMinutes).toBe(DEFAULT_SESSION_SETTINGS.sessionExpiryMinutes);
      expect(result.inactivityTimeoutMinutes).toBe(
        DEFAULT_SESSION_SETTINGS.inactivityTimeoutMinutes,
      );
    });

    it('should preserve valid values within range', () => {
      const result = sanitizeSessionSettings({
        persistSession: true,
        sessionExpiryMinutes: 60,
        inactivityTimeoutMinutes: 30,
      });
      expect(result.persistSession).toBe(true);
      expect(result.sessionExpiryMinutes).toBe(60);
      expect(result.inactivityTimeoutMinutes).toBe(30);
    });

    it('should handle partial settings', () => {
      const result = sanitizeSessionSettings({ sessionExpiryMinutes: 45 });
      expect(result.sessionExpiryMinutes).toBe(45);
      expect(result.inactivityTimeoutMinutes).toBe(
        DEFAULT_SESSION_SETTINGS.inactivityTimeoutMinutes,
      );
    });
  });

  describe('getSettings', () => {
    it('should return cached settings if available', async () => {
      const mockSettings = {
        persistSession: true,
        sessionExpiryMinutes: 60,
        inactivityTimeoutMinutes: 30,
      };

      // First call to populate cache
      chrome.storage.local.get = vi.fn().mockResolvedValue({
        session_settings_v1: mockSettings,
      });

      const result1 = await service.getSettings();
      const result2 = await service.getSettings();

      expect(result1).toEqual(sanitizeSessionSettings(mockSettings));
      expect(result2).toEqual(sanitizeSessionSettings(mockSettings));
      expect(chrome.storage.local.get).toHaveBeenCalledTimes(1);
    });

    it('should load and sanitize settings from storage', async () => {
      chrome.storage.local.get = vi.fn().mockResolvedValue({
        session_settings_v1: {
          persistSession: true,
          sessionExpiryMinutes: 60,
          inactivityTimeoutMinutes: 30,
        },
      });

      const result = await service.getSettings();
      expect(result.persistSession).toBe(true);
      expect(result.sessionExpiryMinutes).toBe(60);
      expect(result.inactivityTimeoutMinutes).toBe(30);
    });

    it('should return defaults when storage is empty', async () => {
      chrome.storage.local.get = vi.fn().mockResolvedValue({});

      const result = await service.getSettings();
      expect(result).toEqual(DEFAULT_SESSION_SETTINGS);
    });

    it('should return defaults when storage throws error', async () => {
      chrome.storage.local.get = vi.fn().mockRejectedValue(new Error('Storage error'));

      const result = await service.getSettings();
      expect(result).toEqual(DEFAULT_SESSION_SETTINGS);
    });

    it('should sanitize invalid values from storage', async () => {
      chrome.storage.local.get = vi.fn().mockResolvedValue({
        session_settings_v1: {
          sessionExpiryMinutes: 1000, // Above max
          inactivityTimeoutMinutes: 1, // Below min
        },
      });

      const result = await service.getSettings();
      expect(result.sessionExpiryMinutes).toBe(SESSION_LIMITS.maxExpiryMinutes);
      expect(result.inactivityTimeoutMinutes).toBe(SESSION_LIMITS.minInactivityMinutes);
    });
  });

  describe('saveSettings', () => {
    it('should save sanitized settings to storage', async () => {
      chrome.storage.local.set = vi.fn().mockResolvedValue(undefined);

      await service.saveSettings({
        persistSession: true,
        sessionExpiryMinutes: 60,
      });

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        session_settings_v1: expect.objectContaining({
          persistSession: true,
          sessionExpiryMinutes: 60,
        }),
      });
    });

    it('should sanitize values before saving', async () => {
      chrome.storage.local.set = vi.fn().mockResolvedValue(undefined);

      await service.saveSettings({
        sessionExpiryMinutes: 1000, // Above max
      });

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        session_settings_v1: expect.objectContaining({
          sessionExpiryMinutes: SESSION_LIMITS.maxExpiryMinutes,
        }),
      });
    });

    it('should merge with existing cached settings', async () => {
      chrome.storage.local.get = vi.fn().mockResolvedValue({
        session_settings_v1: {
          persistSession: false,
          sessionExpiryMinutes: 30,
          inactivityTimeoutMinutes: 15,
        },
      });
      chrome.storage.local.set = vi.fn().mockResolvedValue(undefined);

      await service.getSettings(); // Populate cache
      await service.saveSettings({ persistSession: true });

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        session_settings_v1: expect.objectContaining({
          persistSession: true,
          sessionExpiryMinutes: 30,
          inactivityTimeoutMinutes: 15,
        }),
      });
    });

    it('should update cache after saving', async () => {
      chrome.storage.local.set = vi.fn().mockResolvedValue(undefined);

      await service.saveSettings({ persistSession: true });

      // Cache should be updated, so subsequent call should use cache
      chrome.storage.local.get = vi.fn(); // Should not be called
      const result = await service.getSettings();

      expect(result.persistSession).toBe(true);
    });
  });

  describe('clearCache', () => {
    it('should clear the settings cache', async () => {
      chrome.storage.local.get = vi.fn().mockResolvedValue({
        session_settings_v1: { persistSession: true },
      });

      await service.getSettings(); // Populate cache
      service.clearCache();
      await service.getSettings(); // Should fetch again

      expect(chrome.storage.local.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('resetToDefaults', () => {
    it('should reset settings to defaults', async () => {
      chrome.storage.local.set = vi.fn().mockResolvedValue(undefined);

      await service.resetToDefaults();

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        session_settings_v1: DEFAULT_SESSION_SETTINGS,
      });
    });
  });
});
