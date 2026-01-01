// React hook for managing session settings
// Provides loading, saving, and validation for session security settings

import { useCallback, useEffect, useState } from 'react';
import { SECURITY_CONFIG } from '../config/security.config';
import {
  DEFAULT_SESSION_SETTINGS,
  formatMinutes,
  type SessionSettings,
} from '../config/session-settings';
import { sessionCacheService } from '../services/session-cache.service';
import {
  sanitizeSessionSettings,
  shouldShowSecurityWarning,
  validateInactivityTimeout,
  validateSessionExpiry,
} from '../services/session-settings.service';

const { storageKeys } = SECURITY_CONFIG;

export interface UseSessionSettingsResult {
  settings: SessionSettings;
  loading: boolean;
  saving: boolean;
  error: string | null;
  showSecurityWarning: boolean;

  // Actions
  updatePersistSession: (enabled: boolean) => Promise<void>;
  updateSessionExpiry: (minutes: number) => Promise<void>;
  updateInactivityTimeout: (minutes: number) => Promise<void>;
  resetToDefaults: () => Promise<void>;

  // Validation
  validateExpiry: (minutes: number) => { valid: boolean; error?: string };
  validateInactivity: (minutes: number) => { valid: boolean; error?: string };

  // Formatting
  formatExpiryDisplay: (minutes: number) => string;
}

export function useSessionSettings(): UseSessionSettingsResult {
  const [settings, setSettings] = useState<SessionSettings>(DEFAULT_SESSION_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await chrome.storage.local.get(storageKeys.sessionSettings);
        const stored = result[storageKeys.sessionSettings];
        // Always sanitize loaded settings
        setSettings(sanitizeSessionSettings(stored || {}));
      } catch {
        setError('Failed to load session settings');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Listen for external settings changes
  useEffect(() => {
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string,
    ) => {
      if (areaName === 'local' && changes[storageKeys.sessionSettings]) {
        const newValue = changes[storageKeys.sessionSettings].newValue;
        setSettings(sanitizeSessionSettings(newValue || {}));
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  // Save settings helper
  const saveSettings = useCallback(async (newSettings: SessionSettings) => {
    setSaving(true);
    setError(null);

    try {
      // Sanitize before saving
      const sanitized = sanitizeSessionSettings(newSettings);

      await chrome.storage.local.set({
        [storageKeys.sessionSettings]: sanitized,
      });

      setSettings(sanitized);

      // Notify session cache service to update its cache
      sessionCacheService.clearSettingsCache();
    } catch {
      setError('Failed to save session settings');
    } finally {
      setSaving(false);
    }
  }, []);

  // Update persist session toggle
  const updatePersistSession = useCallback(
    async (enabled: boolean) => {
      const newSettings = { ...settings, persistSession: enabled };
      await saveSettings(newSettings);

      // Handle persistence toggle in session cache
      await sessionCacheService.handlePersistenceToggle(enabled);
    },
    [settings, saveSettings],
  );

  // Update session expiry
  const updateSessionExpiry = useCallback(
    async (minutes: number) => {
      const validation = validateSessionExpiry(minutes);
      if (!validation.valid) {
        setError(validation.error || 'Invalid session expiry');
        return;
      }

      const newSettings = { ...settings, sessionExpiryMinutes: minutes };
      await saveSettings(newSettings);
    },
    [settings, saveSettings],
  );

  // Update inactivity timeout
  const updateInactivityTimeout = useCallback(
    async (minutes: number) => {
      const validation = validateInactivityTimeout(minutes);
      if (!validation.valid) {
        setError(validation.error || 'Invalid inactivity timeout');
        return;
      }

      const newSettings = { ...settings, inactivityTimeoutMinutes: minutes };
      await saveSettings(newSettings);

      // Update the timer with new settings
      await sessionCacheService.updateInactivityTimer();
    },
    [settings, saveSettings],
  );

  // Reset to defaults
  const resetToDefaults = useCallback(async () => {
    await saveSettings(DEFAULT_SESSION_SETTINGS);

    // If persistence was enabled, clear persisted key
    await sessionCacheService.handlePersistenceToggle(false);
    await sessionCacheService.updateInactivityTimer();
  }, [saveSettings]);

  // Check if security warning should be shown
  const showSecurityWarning = shouldShowSecurityWarning(settings.sessionExpiryMinutes);

  return {
    settings,
    loading,
    saving,
    error,
    showSecurityWarning,

    updatePersistSession,
    updateSessionExpiry,
    updateInactivityTimeout,
    resetToDefaults,

    validateExpiry: validateSessionExpiry,
    validateInactivity: validateInactivityTimeout,
    formatExpiryDisplay: formatMinutes,
  };
}
