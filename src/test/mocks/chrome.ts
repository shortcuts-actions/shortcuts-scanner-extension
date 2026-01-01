import { vi } from 'vitest';

// In-memory storage implementation
class MockStorageArea {
  private storage = new Map<string, unknown>();

  async get(keys?: string | string[] | null): Promise<Record<string, unknown>> {
    if (!keys) {
      return Object.fromEntries(this.storage);
    }
    const keyArray = typeof keys === 'string' ? [keys] : keys;
    const result: Record<string, unknown> = {};
    for (const key of keyArray) {
      if (this.storage.has(key)) {
        result[key] = this.storage.get(key);
      }
    }
    return result;
  }

  async set(items: Record<string, unknown>): Promise<void> {
    for (const [key, value] of Object.entries(items)) {
      this.storage.set(key, value);
    }
  }

  async remove(keys: string | string[]): Promise<void> {
    const keyArray = typeof keys === 'string' ? [keys] : keys;
    for (const key of keyArray) {
      this.storage.delete(key);
    }
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }

  reset() {
    this.storage.clear();
  }
}

const localStorageArea = new MockStorageArea();
const sessionStorageArea = new MockStorageArea();

export function setupChromeMock() {
  (globalThis as any).chrome = {
    storage: {
      local: {
        get: vi.fn((keys) => localStorageArea.get(keys)),
        set: vi.fn((items) => localStorageArea.set(items)),
        remove: vi.fn((keys) => localStorageArea.remove(keys)),
        clear: vi.fn(() => localStorageArea.clear()),
      },
      session: {
        get: vi.fn((keys) => sessionStorageArea.get(keys)),
        set: vi.fn((items) => sessionStorageArea.set(items)),
        remove: vi.fn((keys) => sessionStorageArea.remove(keys)),
        clear: vi.fn(() => sessionStorageArea.clear()),
        setAccessLevel: vi.fn(() => Promise.resolve()),
      },
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
        hasListener: vi.fn(() => false),
      },
    },
    runtime: {
      id: 'test-extension-id-12345',
      sendMessage: vi.fn(() => Promise.resolve()),
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
        hasListener: vi.fn(() => false),
      },
      getURL: vi.fn((path) => `chrome-extension://test-id/${path}`),
    },
    alarms: {
      create: vi.fn(() => Promise.resolve()),
      clear: vi.fn(() => Promise.resolve(true)),
      get: vi.fn(() => Promise.resolve(undefined)),
      getAll: vi.fn(() => Promise.resolve([])),
      onAlarm: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
    tabs: {
      query: vi.fn(() => Promise.resolve([])),
      sendMessage: vi.fn(() => Promise.resolve()),
    },
  };
}

export function resetChromeMocks() {
  localStorageArea.reset();
  sessionStorageArea.reset();
  vi.clearAllMocks();
}

export { localStorageArea, sessionStorageArea };
