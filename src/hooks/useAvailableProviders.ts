// Hook to get available API providers with their status

import { useCallback, useEffect, useState } from 'react';
import { apiKeyManagerService } from '../services/api-key-manager.service';
import type { ProviderStatus, SupportedProvider } from '../utils/analysis-types';

const SUPPORTED_PROVIDERS: SupportedProvider[] = ['openai', 'anthropic', 'openrouter'];

export function useAvailableProviders(): {
  providers: ProviderStatus[];
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const checkProviders = useCallback(async () => {
    try {
      const statuses = await Promise.all(
        SUPPORTED_PROVIDERS.map(async (provider) => ({
          provider,
          hasKey: await apiKeyManagerService.hasKey(provider),
          isUnlocked: await apiKeyManagerService.isUnlocked(provider),
        })),
      );
      // Only return providers that have a key configured
      setProviders(statuses.filter((p) => p.hasKey));
    } catch (error) {
      console.error('Failed to check provider statuses:', error);
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial check
  useEffect(() => {
    checkProviders();
  }, [checkProviders]);

  // Listen for session lock/unlock events to update status
  useEffect(() => {
    const handleMessage = (message: { type: string }) => {
      if (message.type === 'SESSION_LOCKED' || message.type === 'SESSION_UNLOCKED') {
        // Re-check provider statuses when session is locked or unlocked
        checkProviders();
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [checkProviders]);

  return { providers, loading, refresh: checkProviders };
}

export function useProviderUnlockStatus(provider: SupportedProvider | null): {
  isUnlocked: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    if (!provider) {
      setIsUnlocked(false);
      setLoading(false);
      return;
    }

    try {
      const unlocked = await apiKeyManagerService.isUnlocked(provider);
      setIsUnlocked(unlocked);
    } catch (error) {
      console.error('Failed to check unlock status:', error);
      setIsUnlocked(false);
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Listen for session lock/unlock events
  useEffect(() => {
    const handleMessage = (message: { type: string; provider?: string }) => {
      if (message.type === 'SESSION_LOCKED') {
        setIsUnlocked(false);
      } else if (message.type === 'SESSION_UNLOCKED') {
        // Always re-check status when any provider is unlocked
        // This ensures we catch the current provider being unlocked
        checkStatus();
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [checkStatus]);

  return { isUnlocked, loading, refresh: checkStatus };
}
