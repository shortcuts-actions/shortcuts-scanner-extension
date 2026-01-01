import { vi } from 'vitest';

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  timeout = 5000,
  interval = 50,
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

/**
 * Wait for a specific amount of time
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a mock function that can be awaited
 */
export function createAsyncMock<T = any>(returnValue?: T) {
  return vi.fn(async () => returnValue);
}

/**
 * Create a mock function that rejects with an error
 */
export function createRejectedMock(error: Error) {
  return vi.fn(async () => {
    throw error;
  });
}
