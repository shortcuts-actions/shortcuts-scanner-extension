import { create } from 'zustand';
import type { ParsedShortcut } from '../utils/types';

interface CachedShortcut {
  url: string;
  data: ParsedShortcut;
  binaryData: ArrayBuffer;
  apiResponse: any;
  timestamp: number;
  expiresAt: number;
}

interface ShortcutStore {
  // Cache storage
  cache: Map<string, CachedShortcut>;

  // Actions
  getCached: (url: string) => CachedShortcut | null;
  setCached: (url: string, data: ParsedShortcut, binaryData: ArrayBuffer, apiResponse: any) => void;
  clearExpired: () => void;
  clearAll: () => void;
}

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export const useShortcutStore = create<ShortcutStore>((set, get) => ({
  cache: new Map(),

  getCached: (url: string) => {
    const cached = get().cache.get(url);

    if (!cached) return null;

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      // Remove expired entry
      set((state) => {
        const newCache = new Map(state.cache);
        newCache.delete(url);
        return { cache: newCache };
      });
      return null;
    }

    return cached;
  },

  setCached: (url, data, binaryData, apiResponse) => {
    const now = Date.now();
    const cached: CachedShortcut = {
      url,
      data,
      binaryData,
      apiResponse,
      timestamp: now,
      expiresAt: now + CACHE_TTL_MS,
    };

    set((state) => {
      const newCache = new Map(state.cache);
      newCache.set(url, cached);
      return { cache: newCache };
    });
  },

  clearExpired: () => {
    const now = Date.now();
    set((state) => {
      const newCache = new Map(state.cache);
      for (const [url, cached] of newCache.entries()) {
        if (now > cached.expiresAt) {
          newCache.delete(url);
        }
      }
      return { cache: newCache };
    });
  },

  clearAll: () => {
    set({ cache: new Map() });
  },
}));
