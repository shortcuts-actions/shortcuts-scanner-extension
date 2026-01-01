// Rate limiting service to prevent brute-force attacks
// Uses exponential backoff with configurable parameters

import { SECURITY_CONFIG } from '../config/security.config';

const { rateLimit, storageKeys } = SECURITY_CONFIG;

interface RateLimitState {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil: number;
  consecutiveLockouts: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
  attemptsRemaining?: number;
}

/**
 * Rate limiting service to prevent brute-force attacks
 * Uses exponential backoff with configurable parameters
 */
export class RateLimitService {
  private static instance: RateLimitService;

  private constructor() {}

  static getInstance(): RateLimitService {
    if (!RateLimitService.instance) {
      RateLimitService.instance = new RateLimitService();
    }
    return RateLimitService.instance;
  }

  private getStorageKey(identifier: string): string {
    return `${storageKeys.rateLimitPrefix}${identifier}`;
  }

  private async getState(identifier: string): Promise<RateLimitState> {
    const key = this.getStorageKey(identifier);
    const result = await chrome.storage.session.get(key);
    return (
      result[key] || {
        attempts: 0,
        firstAttemptAt: 0,
        lockedUntil: 0,
        consecutiveLockouts: 0,
      }
    );
  }

  private async setState(identifier: string, state: RateLimitState): Promise<void> {
    const key = this.getStorageKey(identifier);
    await chrome.storage.session.set({ [key]: state });
  }

  /**
   * Check if an action is allowed under rate limiting rules
   */
  async checkLimit(identifier: string): Promise<RateLimitResult> {
    const state = await this.getState(identifier);
    const now = Date.now();

    // Check if currently locked out
    if (state.lockedUntil > now) {
      return {
        allowed: false,
        retryAfterMs: state.lockedUntil - now,
      };
    }

    // Reset attempts if outside the attempt window
    if (now - state.firstAttemptAt > rateLimit.attemptWindowMs) {
      return {
        allowed: true,
        attemptsRemaining: rateLimit.maxAttempts,
      };
    }

    // Check remaining attempts
    const attemptsRemaining = rateLimit.maxAttempts - state.attempts;
    return {
      allowed: attemptsRemaining > 0,
      attemptsRemaining: Math.max(0, attemptsRemaining),
    };
  }

  /**
   * Record a failed attempt and potentially trigger lockout
   */
  async recordFailure(identifier: string): Promise<RateLimitResult> {
    const state = await this.getState(identifier);
    const now = Date.now();

    // Reset if outside attempt window
    if (now - state.firstAttemptAt > rateLimit.attemptWindowMs) {
      state.attempts = 0;
      state.firstAttemptAt = now;
    }

    state.attempts++;

    // Check if lockout should be triggered
    if (state.attempts >= rateLimit.maxAttempts) {
      // Calculate lockout duration with exponential backoff
      const lockoutDuration = Math.min(
        rateLimit.initialLockoutMs * rateLimit.lockoutMultiplier ** state.consecutiveLockouts,
        rateLimit.maxLockoutMs,
      );

      state.lockedUntil = now + lockoutDuration;
      state.consecutiveLockouts++;
      state.attempts = 0;
      state.firstAttemptAt = 0;

      await this.setState(identifier, state);

      return {
        allowed: false,
        retryAfterMs: lockoutDuration,
      };
    }

    await this.setState(identifier, state);

    return {
      allowed: true,
      attemptsRemaining: rateLimit.maxAttempts - state.attempts,
    };
  }

  /**
   * Record a successful attempt (resets the rate limit state)
   */
  async recordSuccess(identifier: string): Promise<void> {
    const key = this.getStorageKey(identifier);
    await chrome.storage.session.remove(key);
  }

  /**
   * Get human-readable lockout message
   */
  formatLockoutMessage(retryAfterMs: number): string {
    const seconds = Math.ceil(retryAfterMs / 1000);
    if (seconds < 60) {
      return `Too many attempts. Try again in ${seconds} seconds.`;
    }
    const minutes = Math.ceil(seconds / 60);
    return `Too many attempts. Try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`;
  }
}

export const rateLimitService = RateLimitService.getInstance();
