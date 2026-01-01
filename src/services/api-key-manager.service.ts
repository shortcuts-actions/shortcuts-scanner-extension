// Main API Key Manager service
// Coordinates all security services for a complete API key management solution

import {
  type ApiKeyValidationResult,
  apiKeyValidationService,
} from '../api-key-validation.service';
import {
  type PasswordValidationResult,
  passwordValidationService,
} from './password-validation.service';
import { rateLimitService } from './rate-limit.service';
import { StorageError, secureStorageService } from './secure-storage.service';
import { sessionCacheService } from './session-cache.service';

export type ApiKeyManagerErrorCode =
  | 'RATE_LIMITED'
  | 'INVALID_PASSWORD'
  | 'INVALID_API_KEY'
  | 'WRONG_PASSWORD'
  | 'KEY_NOT_FOUND'
  | 'STORAGE_ERROR'
  | 'PASSWORDS_MISMATCH';

export class ApiKeyManagerError extends Error {
  constructor(
    public readonly code: ApiKeyManagerErrorCode,
    message?: string,
    public readonly retryAfterMs?: number,
  ) {
    super(message || code);
    this.name = 'ApiKeyManagerError';
  }
}

export interface SaveKeyOptions {
  provider: string;
  apiKey: string;
  password: string;
  confirmPassword: string;
}

export interface UnlockResult {
  success: boolean;
  apiKey?: string;
  error?: ApiKeyManagerError;
}

export interface SaveResult {
  success: boolean;
  error?: ApiKeyManagerError;
}

/**
 * Main API Key Manager service
 * Coordinates all security services for a complete API key management solution
 */
export class ApiKeyManagerService {
  private static instance: ApiKeyManagerService;

  private constructor() {}

  static getInstance(): ApiKeyManagerService {
    if (!ApiKeyManagerService.instance) {
      ApiKeyManagerService.instance = new ApiKeyManagerService();
    }
    return ApiKeyManagerService.instance;
  }

  /**
   * Saves a new API key with encryption
   */
  async saveKey(options: SaveKeyOptions): Promise<SaveResult> {
    const { provider, apiKey, password, confirmPassword } = options;

    // Validate passwords match
    if (password !== confirmPassword) {
      return {
        success: false,
        error: new ApiKeyManagerError('PASSWORDS_MISMATCH', 'Passwords do not match'),
      };
    }

    // Validate password strength
    const passwordValidation = passwordValidationService.validate(password);
    if (!passwordValidation.valid) {
      return {
        success: false,
        error: new ApiKeyManagerError('INVALID_PASSWORD', passwordValidation.errors.join('. ')),
      };
    }

    // Validate API key format
    const apiKeyValidation = apiKeyValidationService.validate(provider, apiKey);
    if (!apiKeyValidation.valid) {
      return {
        success: false,
        error: new ApiKeyManagerError('INVALID_API_KEY', apiKeyValidation.error),
      };
    }

    try {
      const sanitizedKey = apiKeyValidation.sanitizedKey ?? apiKey;
      // Save encrypted key
      await secureStorageService.saveKey(provider, sanitizedKey, password);

      // Cache the decrypted key for immediate use
      await sessionCacheService.cacheKey(provider, sanitizedKey);

      return { success: true };
    } catch {
      return {
        success: false,
        error: new ApiKeyManagerError('STORAGE_ERROR', 'Failed to save API key'),
      };
    }
  }

  /**
   * Unlocks an API key with password
   */
  async unlock(provider: string, password: string): Promise<UnlockResult> {
    // Check rate limit first
    const rateLimitCheck = await rateLimitService.checkLimit(provider);
    if (!rateLimitCheck.allowed && rateLimitCheck.retryAfterMs) {
      return {
        success: false,
        error: new ApiKeyManagerError(
          'RATE_LIMITED',
          rateLimitService.formatLockoutMessage(rateLimitCheck.retryAfterMs),
          rateLimitCheck.retryAfterMs,
        ),
      };
    }

    // Check cache first
    const cachedKey = await sessionCacheService.getCachedKey(provider);
    if (cachedKey) {
      await rateLimitService.recordSuccess(provider);
      return { success: true, apiKey: cachedKey };
    }

    try {
      // Decrypt from storage
      const apiKey = await secureStorageService.getKey(provider, password);

      // Cache for future use
      await sessionCacheService.cacheKey(provider, apiKey);

      // Reset rate limit on success
      await rateLimitService.recordSuccess(provider);

      return { success: true, apiKey };
    } catch (error) {
      if (error instanceof StorageError) {
        if (error.code === 'KEY_NOT_FOUND') {
          return {
            success: false,
            error: new ApiKeyManagerError('KEY_NOT_FOUND', 'No API key found for this provider'),
          };
        }

        if (error.code === 'DECRYPTION_ERROR') {
          // Record failed attempt
          const rateLimitResult = await rateLimitService.recordFailure(provider);

          const message =
            rateLimitResult.allowed || !rateLimitResult.retryAfterMs
              ? `Wrong password. ${rateLimitResult.attemptsRemaining} attempts remaining.`
              : rateLimitService.formatLockoutMessage(rateLimitResult.retryAfterMs);

          return {
            success: false,
            error: new ApiKeyManagerError('WRONG_PASSWORD', message, rateLimitResult.retryAfterMs),
          };
        }
      }

      return {
        success: false,
        error: new ApiKeyManagerError('STORAGE_ERROR', 'Failed to access API key'),
      };
    }
  }

  /**
   * Locks a specific provider (clears from cache)
   */
  async lock(provider: string): Promise<void> {
    await sessionCacheService.removeCachedKey(provider);
  }

  /**
   * Locks all providers
   */
  async lockAll(): Promise<void> {
    await sessionCacheService.clearAllCachedKeys();
  }

  /**
   * Deletes an API key completely
   */
  async deleteKey(provider: string): Promise<void> {
    await sessionCacheService.removeCachedKey(provider);
    await secureStorageService.removeKey(provider);
  }

  /**
   * Checks if a key exists for a provider
   */
  async hasKey(provider: string): Promise<boolean> {
    return await secureStorageService.hasKey(provider);
  }

  /**
   * Checks if a provider is currently unlocked
   */
  async isUnlocked(provider: string): Promise<boolean> {
    const cached = await sessionCacheService.getCachedKey(provider);
    return cached !== null;
  }

  /**
   * Gets API key if already unlocked (from cache)
   * Does not attempt decryption
   */
  async getUnlockedKey(provider: string): Promise<string | null> {
    return await sessionCacheService.getCachedKey(provider);
  }

  /**
   * Lists all stored providers with their status
   */
  async listProviders(): Promise<
    Array<{
      provider: string;
      isUnlocked: boolean;
      createdAt?: number;
      lastUsed?: number;
    }>
  > {
    const providers = await secureStorageService.listProviders();
    const unlockedProviders = await sessionCacheService.getUnlockedProviders();

    return Promise.all(
      providers.map(async (provider) => {
        const metadata = await secureStorageService.getKeyMetadata(provider);
        return {
          provider,
          isUnlocked: unlockedProviders.includes(provider),
          createdAt: metadata?.createdAt,
          lastUsed: metadata?.lastUsed,
        };
      }),
    );
  }

  /**
   * Changes password for an existing key
   * Requires current password to decrypt, then re-encrypts with new password
   */
  async changePassword(
    provider: string,
    currentPassword: string,
    newPassword: string,
    confirmNewPassword: string,
  ): Promise<SaveResult> {
    // Validate new passwords match
    if (newPassword !== confirmNewPassword) {
      return {
        success: false,
        error: new ApiKeyManagerError('PASSWORDS_MISMATCH', 'New passwords do not match'),
      };
    }

    // Validate new password strength
    const passwordValidation = passwordValidationService.validate(newPassword);
    if (!passwordValidation.valid) {
      return {
        success: false,
        error: new ApiKeyManagerError('INVALID_PASSWORD', passwordValidation.errors.join('. ')),
      };
    }

    // Unlock with current password
    const unlockResult = await this.unlock(provider, currentPassword);
    if (!unlockResult.success) {
      return { success: false, error: unlockResult.error };
    }

    try {
      const apiKey = unlockResult.apiKey;
      if (!apiKey) {
        return {
          success: false,
          error: new ApiKeyManagerError('STORAGE_ERROR', 'Failed to retrieve API key'),
        };
      }

      // Re-save with new password
      await secureStorageService.saveKey(provider, apiKey, newPassword);

      // Update cache
      await sessionCacheService.cacheKey(provider, apiKey);

      return { success: true };
    } catch {
      return {
        success: false,
        error: new ApiKeyManagerError('STORAGE_ERROR', 'Failed to update password'),
      };
    }
  }

  /**
   * Validates a password without saving
   */
  validatePassword(password: string): PasswordValidationResult {
    return passwordValidationService.validate(password);
  }

  /**
   * Validates an API key format without saving
   */
  validateApiKey(provider: string, apiKey: string): ApiKeyValidationResult {
    return apiKeyValidationService.validate(provider, apiKey);
  }

  /**
   * Gets password requirements message
   */
  getPasswordRequirements(): string {
    return passwordValidationService.getRequirementsMessage();
  }

  /**
   * Gets API key format hint for a provider
   */
  getApiKeyFormatHint(provider: string): string | null {
    return apiKeyValidationService.getFormatHint(provider);
  }

  /**
   * Masks an API key for display
   */
  maskApiKey(apiKey: string): string {
    return apiKeyValidationService.maskKey(apiKey);
  }
}

export const apiKeyManagerService = ApiKeyManagerService.getInstance();
