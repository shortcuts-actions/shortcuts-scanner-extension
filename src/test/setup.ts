import '@testing-library/jest-dom';
import { Crypto } from '@peculiar/webcrypto';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { resetChromeMocks, setupChromeMock } from './mocks/chrome';
import { server } from './mocks/msw/server';

// Setup Web Crypto API
const cryptoInstance = new Crypto();
Object.defineProperty(globalThis, 'crypto', {
  value: cryptoInstance,
  writable: true,
  configurable: true,
});

// Setup chrome API mocks
setupChromeMock();

// Setup MSW server for API mocking
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetChromeMocks();
});
afterAll(() => server.close());

// Mock console methods to reduce noise in test output
globalThis.console = {
  ...console,
  warn: vi.fn(),
  error: vi.fn(),
} as any;

// Performance API mock
(globalThis as any).performance = {
  now: () => Date.now(),
};
