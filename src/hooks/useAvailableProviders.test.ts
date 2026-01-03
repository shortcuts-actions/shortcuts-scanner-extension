import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiKeyManagerService } from '../services/api-key-manager.service';
import { useAvailableProviders, useProviderUnlockStatus } from './useAvailableProviders';

// Mock the apiKeyManagerService
vi.mock('../services/api-key-manager.service');

describe('useAvailableProviders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    vi.mocked(apiKeyManagerService.hasKey).mockResolvedValue(false);
    vi.mocked(apiKeyManagerService.isUnlocked).mockResolvedValue(false);

    const { result } = renderHook(() => useAvailableProviders());

    expect(result.current.loading).toBe(true);
    expect(result.current.providers).toEqual([]);
  });

  it('should load providers with keys', async () => {
    vi.mocked(apiKeyManagerService.hasKey).mockImplementation(async (provider) => {
      return provider === 'openai' || provider === 'anthropic';
    });
    vi.mocked(apiKeyManagerService.isUnlocked).mockImplementation(async (provider) => {
      return provider === 'openai';
    });

    const { result } = renderHook(() => useAvailableProviders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.providers).toHaveLength(2);
    expect(result.current.providers).toContainEqual({
      provider: 'openai',
      hasKey: true,
      isUnlocked: true,
    });
    expect(result.current.providers).toContainEqual({
      provider: 'anthropic',
      hasKey: true,
      isUnlocked: false,
    });
  });

  it('should filter out providers without keys', async () => {
    vi.mocked(apiKeyManagerService.hasKey).mockImplementation(async (provider) => {
      return provider === 'openai';
    });
    vi.mocked(apiKeyManagerService.isUnlocked).mockResolvedValue(true);

    const { result } = renderHook(() => useAvailableProviders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.providers).toHaveLength(1);
    expect(result.current.providers[0].provider).toBe('openai');
  });

  it('should handle empty provider list', async () => {
    vi.mocked(apiKeyManagerService.hasKey).mockResolvedValue(false);
    vi.mocked(apiKeyManagerService.isUnlocked).mockResolvedValue(false);

    const { result } = renderHook(() => useAvailableProviders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.providers).toEqual([]);
  });

  it('should handle errors gracefully', async () => {
    vi.mocked(apiKeyManagerService.hasKey).mockRejectedValue(new Error('Storage error'));

    const { result } = renderHook(() => useAvailableProviders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.providers).toEqual([]);
  });

  it('should provide refresh function', async () => {
    vi.mocked(apiKeyManagerService.hasKey).mockResolvedValue(true);
    vi.mocked(apiKeyManagerService.isUnlocked).mockResolvedValue(true);

    const { result } = renderHook(() => useAvailableProviders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Change mock to return different results
    vi.mocked(apiKeyManagerService.hasKey).mockResolvedValue(false);

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.providers).toEqual([]);
  });

  it('should refresh on SESSION_LOCKED message', async () => {
    vi.mocked(apiKeyManagerService.hasKey).mockResolvedValue(true);
    vi.mocked(apiKeyManagerService.isUnlocked).mockResolvedValue(true);

    const { result } = renderHook(() => useAvailableProviders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Get the listener that was registered
    const addListenerCall = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0];
    const listener = addListenerCall[0];

    // Change unlock status
    vi.mocked(apiKeyManagerService.isUnlocked).mockResolvedValue(false);

    // Simulate SESSION_LOCKED message
    await act(async () => {
      listener({ type: 'SESSION_LOCKED' }, {} as chrome.runtime.MessageSender, () => {});
      // Wait for checkProviders to complete
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    await waitFor(() => {
      const openaiProvider = result.current.providers.find((p) => p.provider === 'openai');
      expect(openaiProvider?.isUnlocked).toBe(false);
    });
  });

  it('should refresh on SESSION_UNLOCKED message', async () => {
    vi.mocked(apiKeyManagerService.hasKey).mockResolvedValue(true);
    vi.mocked(apiKeyManagerService.isUnlocked).mockResolvedValue(false);

    const { result } = renderHook(() => useAvailableProviders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Get the listener that was registered
    const addListenerCall = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0];
    const listener = addListenerCall[0];

    // Change unlock status
    vi.mocked(apiKeyManagerService.isUnlocked).mockResolvedValue(true);

    // Simulate SESSION_UNLOCKED message
    await act(async () => {
      listener({ type: 'SESSION_UNLOCKED' }, {} as chrome.runtime.MessageSender, () => {});
      // Wait for checkProviders to complete
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    await waitFor(() => {
      const openaiProvider = result.current.providers.find((p) => p.provider === 'openai');
      expect(openaiProvider?.isUnlocked).toBe(true);
    });
  });
});

describe('useProviderUnlockStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    vi.mocked(apiKeyManagerService.isUnlocked).mockResolvedValue(false);

    const { result } = renderHook(() => useProviderUnlockStatus('openai'));

    expect(result.current.loading).toBe(true);
    expect(result.current.isUnlocked).toBe(false);
  });

  it('should check unlock status for provider', async () => {
    vi.mocked(apiKeyManagerService.isUnlocked).mockResolvedValue(true);

    const { result } = renderHook(() => useProviderUnlockStatus('openai'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isUnlocked).toBe(true);
    expect(apiKeyManagerService.isUnlocked).toHaveBeenCalledWith('openai');
  });

  it('should handle null provider', async () => {
    const { result } = renderHook(() => useProviderUnlockStatus(null));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isUnlocked).toBe(false);
    expect(apiKeyManagerService.isUnlocked).not.toHaveBeenCalled();
  });

  it('should update when provider changes', async () => {
    vi.mocked(apiKeyManagerService.isUnlocked).mockImplementation(async (provider) => {
      return provider === 'openai';
    });

    const { result, rerender } = renderHook(({ provider }) => useProviderUnlockStatus(provider), {
      initialProps: { provider: 'openai' as 'openai' | 'anthropic' | 'openrouter' | null },
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isUnlocked).toBe(true);

    // Change provider
    rerender({ provider: 'anthropic' as 'openai' | 'anthropic' | 'openrouter' | null });

    await waitFor(() => {
      expect(result.current.isUnlocked).toBe(false);
    });
  });

  it('should handle errors gracefully', async () => {
    vi.mocked(apiKeyManagerService.isUnlocked).mockRejectedValue(new Error('Check failed'));

    const { result } = renderHook(() => useProviderUnlockStatus('openai'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isUnlocked).toBe(false);
  });

  it('should provide refresh function', async () => {
    vi.mocked(apiKeyManagerService.isUnlocked).mockResolvedValue(false);

    const { result } = renderHook(() => useProviderUnlockStatus('openai'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isUnlocked).toBe(false);

    // Change mock to return true
    vi.mocked(apiKeyManagerService.isUnlocked).mockResolvedValue(true);

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.isUnlocked).toBe(true);
  });

  it('should update on SESSION_LOCKED message', async () => {
    vi.mocked(apiKeyManagerService.isUnlocked).mockResolvedValue(true);

    const { result } = renderHook(() => useProviderUnlockStatus('openai'));

    await waitFor(() => {
      expect(result.current.isUnlocked).toBe(true);
    });

    // Get the listener that was registered (second call, first is in useAvailableProviders)
    const calls = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls;
    const listener = calls[calls.length - 1][0];

    // Simulate SESSION_LOCKED message
    act(() => {
      listener({ type: 'SESSION_LOCKED' }, {} as chrome.runtime.MessageSender, () => {});
    });

    await waitFor(() => {
      expect(result.current.isUnlocked).toBe(false);
    });
  });

  it('should update on SESSION_UNLOCKED message for matching provider', async () => {
    vi.mocked(apiKeyManagerService.isUnlocked).mockResolvedValue(false);

    const { result } = renderHook(() => useProviderUnlockStatus('openai'));

    await waitFor(() => {
      expect(result.current.isUnlocked).toBe(false);
    });

    // Now the provider becomes unlocked
    vi.mocked(apiKeyManagerService.isUnlocked).mockResolvedValue(true);

    // Get the listener that was registered
    const calls = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls;
    const listener = calls[calls.length - 1][0];

    // Simulate SESSION_UNLOCKED message for openai
    await act(async () => {
      listener(
        { type: 'SESSION_UNLOCKED', provider: 'openai' },
        {} as chrome.runtime.MessageSender,
        () => {},
      );
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    await waitFor(() => {
      expect(result.current.isUnlocked).toBe(true);
    });
  });

  it('should re-check status on SESSION_UNLOCKED message for any provider', async () => {
    vi.mocked(apiKeyManagerService.isUnlocked).mockResolvedValue(false);

    const { result } = renderHook(() => useProviderUnlockStatus('openai'));

    await waitFor(() => {
      expect(result.current.isUnlocked).toBe(false);
    });

    // Now openai becomes unlocked (even though message is for different provider)
    vi.mocked(apiKeyManagerService.isUnlocked).mockResolvedValue(true);

    // Get the listener that was registered
    const calls = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls;
    const listener = calls[calls.length - 1][0];

    // Simulate SESSION_UNLOCKED message for different provider (anthropic)
    await act(async () => {
      listener(
        { type: 'SESSION_UNLOCKED', provider: 'anthropic' },
        {} as chrome.runtime.MessageSender,
        () => {},
      );
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    // Should have re-checked and found openai is now unlocked
    await waitFor(() => {
      expect(result.current.isUnlocked).toBe(true);
    });
  });

  it('should check status when provider is changed from null', async () => {
    vi.mocked(apiKeyManagerService.isUnlocked).mockResolvedValue(true);

    const { result, rerender } = renderHook(({ provider }) => useProviderUnlockStatus(provider), {
      initialProps: { provider: null as 'openai' | 'anthropic' | 'openrouter' | null },
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isUnlocked).toBe(false);

    // Change from null to provider
    rerender({ provider: 'openai' as 'openai' | 'anthropic' | 'openrouter' | null });

    await waitFor(() => {
      expect(result.current.isUnlocked).toBe(true);
    });
  });
});
