import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ParsedShortcut } from '../utils/types';
import { useShortcutStore } from './shortcutStore';

describe('ShortcutStore', () => {
  // Clear store before each test
  beforeEach(() => {
    const { result } = renderHook(() => useShortcutStore());
    act(() => {
      result.current.clearAll();
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
  const mockShortcut: ParsedShortcut = {
    metadata: {
      name: 'Test Shortcut',
    },
    data: {
      WFWorkflowActions: [],
      WFWorkflowTypes: [],
    },
    raw: {},
  };

  const mockBinaryData = new ArrayBuffer(8);
  const mockApiResponse = { fields: {} };
  const testUrl = 'https://www.icloud.com/shortcuts/test123';

  it('should initialize with empty cache', () => {
    const { result } = renderHook(() => useShortcutStore());

    expect(result.current.cache.size).toBe(0);
  });

  it('should cache a shortcut', () => {
    const { result } = renderHook(() => useShortcutStore());

    act(() => {
      result.current.setCached(testUrl, mockShortcut, mockBinaryData, mockApiResponse);
    });

    expect(result.current.cache.size).toBe(1);
    expect(result.current.cache.has(testUrl)).toBe(true);
  });

  it('should retrieve cached shortcut', () => {
    const { result } = renderHook(() => useShortcutStore());

    act(() => {
      result.current.setCached(testUrl, mockShortcut, mockBinaryData, mockApiResponse);
    });

    const cached = result.current.getCached(testUrl);

    expect(cached).not.toBeNull();
    expect(cached?.url).toBe(testUrl);
    expect(cached?.data).toEqual(mockShortcut);
    expect(cached?.binaryData).toBe(mockBinaryData);
    expect(cached?.apiResponse).toEqual(mockApiResponse);
  });

  it('should return null for non-existent URL', () => {
    const { result } = renderHook(() => useShortcutStore());

    const cached = result.current.getCached('https://nonexistent.com');

    expect(cached).toBeNull();
  });

  it('should include timestamp when caching', () => {
    const { result } = renderHook(() => useShortcutStore());
    const beforeTime = Date.now();

    act(() => {
      result.current.setCached(testUrl, mockShortcut, mockBinaryData, mockApiResponse);
    });

    const cached = result.current.getCached(testUrl);
    const afterTime = Date.now();

    expect(cached).not.toBeNull();
    if (cached) {
      expect(cached.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(cached.timestamp).toBeLessThanOrEqual(afterTime);
    }
  });

  it('should set expiration time when caching', () => {
    const { result } = renderHook(() => useShortcutStore());
    const beforeTime = Date.now();

    act(() => {
      result.current.setCached(testUrl, mockShortcut, mockBinaryData, mockApiResponse);
    });

    const cached = result.current.getCached(testUrl);
    const expectedExpiry = beforeTime + 2 * 60 * 1000; // 2 minutes

    expect(cached).not.toBeNull();
    if (cached) {
      expect(cached.expiresAt).toBeGreaterThanOrEqual(expectedExpiry - 100); // Allow small timing variance
      expect(cached.expiresAt).toBeLessThanOrEqual(expectedExpiry + 100);
    }
  });

  it('should remove expired entries when getCached is called', () => {
    const { result } = renderHook(() => useShortcutStore());

    // Mock Date.now to control time
    const originalNow = Date.now;
    let currentTime = originalNow();
    vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

    act(() => {
      result.current.setCached(testUrl, mockShortcut, mockBinaryData, mockApiResponse);
    });

    // Verify it's cached
    expect(result.current.getCached(testUrl)).not.toBeNull();

    // Advance time past expiration (2 minutes + 1 second)
    currentTime += 2 * 60 * 1000 + 1000;

    // Should be null and removed from cache
    const cached = result.current.getCached(testUrl);
    expect(cached).toBeNull();

    // Restore Date.now
    vi.spyOn(Date, 'now').mockRestore();
  });

  it('should update existing cache entry', () => {
    const { result } = renderHook(() => useShortcutStore());

    act(() => {
      result.current.setCached(testUrl, mockShortcut, mockBinaryData, mockApiResponse);
    });

    const updatedShortcut: ParsedShortcut = {
      ...mockShortcut,
      metadata: { name: 'Updated Shortcut' },
    };

    act(() => {
      result.current.setCached(testUrl, updatedShortcut, mockBinaryData, mockApiResponse);
    });

    const cached = result.current.getCached(testUrl);

    expect(cached?.data.metadata.name).toBe('Updated Shortcut');
  });

  it('should cache multiple shortcuts', () => {
    const { result } = renderHook(() => useShortcutStore());

    const url1 = 'https://www.icloud.com/shortcuts/test1';
    const url2 = 'https://www.icloud.com/shortcuts/test2';
    const url3 = 'https://www.icloud.com/shortcuts/test3';

    act(() => {
      result.current.setCached(url1, mockShortcut, mockBinaryData, mockApiResponse);
      result.current.setCached(url2, mockShortcut, mockBinaryData, mockApiResponse);
      result.current.setCached(url3, mockShortcut, mockBinaryData, mockApiResponse);
    });

    expect(result.current.cache.size).toBe(3);
    expect(result.current.getCached(url1)).not.toBeNull();
    expect(result.current.getCached(url2)).not.toBeNull();
    expect(result.current.getCached(url3)).not.toBeNull();
  });

  it('should clear expired entries', () => {
    const { result } = renderHook(() => useShortcutStore());

    const url1 = 'https://www.icloud.com/shortcuts/test1';
    const url2 = 'https://www.icloud.com/shortcuts/test2';

    const originalNow = Date.now;
    let currentTime = originalNow();
    vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

    act(() => {
      result.current.setCached(url1, mockShortcut, mockBinaryData, mockApiResponse);
    });

    // Advance time a bit
    currentTime += 1000;

    act(() => {
      result.current.setCached(url2, mockShortcut, mockBinaryData, mockApiResponse);
    });

    // Advance time past first entry's expiration
    currentTime += 2 * 60 * 1000;

    act(() => {
      result.current.clearExpired();
    });

    // First entry should be removed, second should remain
    expect(result.current.cache.size).toBe(1);
    expect(result.current.cache.has(url1)).toBe(false);
    expect(result.current.cache.has(url2)).toBe(true);

    vi.spyOn(Date, 'now').mockRestore();
  });

  it('should clear all cache entries', () => {
    const { result } = renderHook(() => useShortcutStore());

    act(() => {
      result.current.setCached(
        'https://www.icloud.com/shortcuts/test1',
        mockShortcut,
        mockBinaryData,
        mockApiResponse,
      );
      result.current.setCached(
        'https://www.icloud.com/shortcuts/test2',
        mockShortcut,
        mockBinaryData,
        mockApiResponse,
      );
      result.current.setCached(
        'https://www.icloud.com/shortcuts/test3',
        mockShortcut,
        mockBinaryData,
        mockApiResponse,
      );
    });

    expect(result.current.cache.size).toBe(3);

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.cache.size).toBe(0);
  });

  it('should maintain cache independence across instances', () => {
    const { result: result1 } = renderHook(() => useShortcutStore());
    const { result: result2 } = renderHook(() => useShortcutStore());

    // Both should reference the same store
    act(() => {
      result1.current.setCached(testUrl, mockShortcut, mockBinaryData, mockApiResponse);
    });

    expect(result2.current.cache.size).toBe(1);
    expect(result2.current.getCached(testUrl)).not.toBeNull();
  });

  it('should handle binary data correctly', () => {
    const { result } = renderHook(() => useShortcutStore());

    const binaryData = new ArrayBuffer(16);
    const view = new Uint8Array(binaryData);
    view[0] = 255;
    view[15] = 128;

    act(() => {
      result.current.setCached(testUrl, mockShortcut, binaryData, mockApiResponse);
    });

    const cached = result.current.getCached(testUrl);

    expect(cached).not.toBeNull();
    if (cached) {
      const cachedView = new Uint8Array(cached.binaryData);
      expect(cached.binaryData.byteLength).toBe(16);
      expect(cachedView[0]).toBe(255);
      expect(cachedView[15]).toBe(128);
    }
  });

  it('should handle complex API responses', () => {
    const { result } = renderHook(() => useShortcutStore());

    const complexApiResponse = {
      fields: {
        shortcut: {
          value: {
            downloadURL: 'https://example.com/shortcut.plist',
          },
        },
        name: {
          value: 'Test Shortcut',
        },
      },
      recordName: 'test123',
    };

    act(() => {
      result.current.setCached(testUrl, mockShortcut, mockBinaryData, complexApiResponse);
    });

    const cached = result.current.getCached(testUrl);

    expect(cached).not.toBeNull();
    if (cached) {
      expect(cached.apiResponse).toEqual(complexApiResponse);
    }
  });
});
