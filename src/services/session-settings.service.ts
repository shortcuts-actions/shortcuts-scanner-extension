// Session settings validation and management service
// Provides validation and sanitization for session security settings

import { SECURITY_CONFIG } from '../config/security.config';
import {
  DEFAULT_SESSION_SETTINGS,
  SESSION_LIMITS,
  type SessionSettings,
} from '../config/session-settings';

const { storageKeys } = SECURITY_CONFIG;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates session expiry value
 * Ensures value is within allowed range (5 min to 6 hours)
 */
export function validateSessionExpiry(minutes: number): ValidationResult {
  if (typeof minutes !== 'number' || Number.isNaN(minutes)) {
    return { valid: false, error: 'Invalid expiry value' };
  }

  if (minutes < SESSION_LIMITS.minExpiryMinutes) {
    return {
      valid: false,
      error: `Minimum session expiry is ${SESSION_LIMITS.minExpiryMinutes} minutes`,
    };
  }

  if (minutes > SESSION_LIMITS.maxExpiryMinutes) {
    return {
      valid: false,
      error: `Maximum session expiry is ${SESSION_LIMITS.maxExpiryMinutes} minutes (6 hours)`,
    };
  }

  return { valid: true };
}

/**
 * Validates inactivity timeout value
 * Ensures value is within allowed range (5 min to 60 min)
 */
export function validateInactivityTimeout(minutes: number): ValidationResult {
  if (typeof minutes !== 'number' || Number.isNaN(minutes)) {
    return { valid: false, error: 'Invalid timeout value' };
  }

  if (minutes < SESSION_LIMITS.minInactivityMinutes) {
    return {
      valid: false,
      error: `Minimum inactivity timeout is ${SESSION_LIMITS.minInactivityMinutes} minutes`,
    };
  }

  if (minutes > SESSION_LIMITS.maxInactivityMinutes) {
    return {
      valid: false,
      error: `Maximum inactivity timeout is ${SESSION_LIMITS.maxInactivityMinutes} minutes`,
    };
  }

  return { valid: true };
}

/**
 * Checks if the session expiry warrants a security warning
 */
export function shouldShowSecurityWarning(expiryMinutes: number): boolean {
  return expiryMinutes >= SESSION_LIMITS.warningThresholdMinutes;
}

/**
 * Sanitizes session settings to ensure all values are within valid ranges
 * This is critical for defense against HTML injection attacks
 * Always clamp values regardless of what was stored
 */
export function sanitizeSessionSettings(settings: Partial<SessionSettings>): SessionSettings {
  return {
    persistSession: typeof settings.persistSession === 'boolean' ? settings.persistSession : false,
    sessionExpiryMinutes: clampValue(
      settings.sessionExpiryMinutes,
      SESSION_LIMITS.minExpiryMinutes,
      SESSION_LIMITS.maxExpiryMinutes,
      DEFAULT_SESSION_SETTINGS.sessionExpiryMinutes,
    ),
    inactivityTimeoutMinutes: clampValue(
      settings.inactivityTimeoutMinutes,
      SESSION_LIMITS.minInactivityMinutes,
      SESSION_LIMITS.maxInactivityMinutes,
      DEFAULT_SESSION_SETTINGS.inactivityTimeoutMinutes,
    ),
  };
}

/**
 * Clamps a value to be within min and max bounds
 * Returns default if value is invalid
 */
function clampValue(
  value: number | undefined,
  min: number,
  max: number,
  defaultValue: number,
): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return defaultValue;
  }
  return Math.min(Math.max(value, min), max);
}

/**
 * Session Settings Service
 * Manages loading, saving, and validation of session settings
 */
export class SessionSettingsService {
  private static instance: SessionSettingsService;
  private settingsCache: SessionSettings | null = null;

  private constructor() {}

  static getInstance(): SessionSettingsService {
    if (!SessionSettingsService.instance) {
      SessionSettingsService.instance = new SessionSettingsService();
    }
    return SessionSettingsService.instance;
  }

  /**
   * Loads session settings from storage
   * Always sanitizes values to ensure they're within valid ranges
   */
  async getSettings(): Promise<SessionSettings> {
    if (this.settingsCache) {
      return this.settingsCache;
    }

    try {
      const result = await chrome.storage.local.get(storageKeys.sessionSettings);
      const stored = result[storageKeys.sessionSettings];

      // Always sanitize stored values (defense against HTML injection)
      this.settingsCache = sanitizeSessionSettings(stored || {});
      return this.settingsCache;
    } catch {
      return DEFAULT_SESSION_SETTINGS;
    }
  }

  /**
   * Saves session settings to storage
   * Validates and sanitizes before saving
   */
  async saveSettings(settings: Partial<SessionSettings>): Promise<void> {
    // Sanitize before saving
    const sanitized = sanitizeSessionSettings({
      ...this.settingsCache,
      ...settings,
    });

    await chrome.storage.local.set({
      [storageKeys.sessionSettings]: sanitized,
    });

    this.settingsCache = sanitized;
  }

  /**
   * Clears the settings cache
   * Call this when settings are changed externally
   */
  clearCache(): void {
    this.settingsCache = null;
  }

  /**
   * Resets settings to defaults
   */
  async resetToDefaults(): Promise<void> {
    await this.saveSettings(DEFAULT_SESSION_SETTINGS);
  }
}

export const sessionSettingsService = SessionSettingsService.getInstance();
