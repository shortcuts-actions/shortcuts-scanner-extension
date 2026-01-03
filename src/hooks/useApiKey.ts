// React hook for API key management
// Provides a simple interface for components to interact with the API key manager

import { useCallback, useEffect, useState } from 'react';
import { apiKeyManagerService, type SaveKeyOptions } from '../services/api-key-manager.service';

export interface UseApiKeyState {
  isUnlocked: boolean;
  hasKey: boolean;
  loading: boolean;
  error: string | null;
  retryAfterMs: number | null;
}

export interface UseApiKeyActions {
  saveKey: (options: Omit<SaveKeyOptions, 'provider'>) => Promise<boolean>;
  unlock: (password: string) => Promise<string | null>;
  lock: () => Promise<void>;
  deleteKey: () => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
    confirmNewPassword: string,
  ) => Promise<boolean>;
  clearError: () => void;
}

export interface UseApiKeyResult extends UseApiKeyState, UseApiKeyActions {
  validatePassword: (password: string) => {
    valid: boolean;
    errors: string[];
    strength: string;
    score: number;
  };
  validateApiKey: (apiKey: string) => { valid: boolean; error?: string };
  passwordRequirements: string;
  apiKeyFormatHint: string | null;
}

/**
 * React hook for API key management
 */
export function useApiKey(provider: string): UseApiKeyResult {
  const [state, setState] = useState<UseApiKeyState>({
    isUnlocked: false,
    hasKey: false,
    loading: true,
    error: null,
    retryAfterMs: null,
  });

  // Check initial state
  useEffect(() => {
    const checkState = async () => {
      try {
        const [hasKey, isUnlocked] = await Promise.all([
          apiKeyManagerService.hasKey(provider),
          apiKeyManagerService.isUnlocked(provider),
        ]);
        setState((prev) => ({ ...prev, hasKey, isUnlocked, loading: false }));
      } catch {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'Failed to check API key status',
        }));
      }
    };
    checkState();
  }, [provider]);

  // Listen for session lock events
  useEffect(() => {
    const handleMessage = (message: { type: string }) => {
      if (message.type === 'SESSION_LOCKED') {
        setState((prev) => ({ ...prev, isUnlocked: false }));
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const saveKey = useCallback(
    async (options: Omit<SaveKeyOptions, 'provider'>): Promise<boolean> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const result = await apiKeyManagerService.saveKey({ ...options, provider });

      setState((prev) => ({
        ...prev,
        loading: false,
        hasKey: result.success || prev.hasKey,
        isUnlocked: result.success || prev.isUnlocked,
        error: result.error?.message || null,
      }));

      return result.success;
    },
    [provider],
  );

  const unlock = useCallback(
    async (password: string): Promise<string | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const result = await apiKeyManagerService.unlock(provider, password);

      setState((prev) => ({
        ...prev,
        loading: false,
        isUnlocked: result.success,
        error: result.error?.message || null,
        retryAfterMs: result.error?.retryAfterMs || null,
      }));

      // Broadcast unlock event so other components can update their state
      if (result.success) {
        try {
          chrome.runtime.sendMessage({ type: 'SESSION_UNLOCKED', provider });
        } catch {
          // Ignore - listeners may not be ready yet (e.g., during component mounting)
        }
      }

      return result.success && result.apiKey ? result.apiKey : null;
    },
    [provider],
  );

  const lock = useCallback(async (): Promise<void> => {
    await apiKeyManagerService.lock(provider);
    setState((prev) => ({ ...prev, isUnlocked: false }));
  }, [provider]);

  const deleteKey = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, loading: true }));
    await apiKeyManagerService.deleteKey(provider);
    setState((prev) => ({
      ...prev,
      loading: false,
      hasKey: false,
      isUnlocked: false,
    }));
  }, [provider]);

  const changePassword = useCallback(
    async (
      currentPassword: string,
      newPassword: string,
      confirmNewPassword: string,
    ): Promise<boolean> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const result = await apiKeyManagerService.changePassword(
        provider,
        currentPassword,
        newPassword,
        confirmNewPassword,
      );

      setState((prev) => ({
        ...prev,
        loading: false,
        error: result.error?.message || null,
      }));

      return result.success;
    },
    [provider],
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null, retryAfterMs: null }));
  }, []);

  const validatePassword = useCallback((password: string) => {
    const result = apiKeyManagerService.validatePassword(password);
    return {
      valid: result.valid,
      errors: result.errors,
      strength: result.strength,
      score: result.score,
    };
  }, []);

  const validateApiKey = useCallback(
    (apiKey: string) => {
      return apiKeyManagerService.validateApiKey(provider, apiKey);
    },
    [provider],
  );

  return {
    ...state,
    saveKey,
    unlock,
    lock,
    deleteKey,
    changePassword,
    clearError,
    validatePassword,
    validateApiKey,
    passwordRequirements: apiKeyManagerService.getPasswordRequirements(),
    apiKeyFormatHint: apiKeyManagerService.getApiKeyFormatHint(provider),
  };
}
