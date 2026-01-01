// Secure storage service for encrypted API keys
// Uses AES-256-GCM encryption with device binding

import { SECURITY_CONFIG } from '../config/security.config';
import { CryptoError, decrypt, encrypt } from './crypto.service';
import { deviceBindingService } from './device-binding.service';

const { storageKeys, schemaVersion } = SECURITY_CONFIG;

export interface StoredApiKey {
  encryptedKey: string;
  provider: string;
  createdAt: number;
  lastUsed?: number;
}

export interface ApiKeyStore {
  keys: Record<string, StoredApiKey>;
  version: number;
}

export type StorageErrorCode =
  | 'STORAGE_ERROR'
  | 'KEY_NOT_FOUND'
  | 'ENCRYPTION_ERROR'
  | 'DECRYPTION_ERROR';

export class StorageError extends Error {
  constructor(
    public readonly code: StorageErrorCode,
    message?: string,
  ) {
    super(message || code);
    this.name = 'StorageError';
  }
}

/**
 * Secure storage service for encrypted API keys
 */
export class SecureStorageService {
  private static instance: SecureStorageService;

  private constructor() {}

  static getInstance(): SecureStorageService {
    if (!SecureStorageService.instance) {
      SecureStorageService.instance = new SecureStorageService();
    }
    return SecureStorageService.instance;
  }

  /**
   * Gets the current key store from storage
   */
  private async getStore(): Promise<ApiKeyStore> {
    try {
      const result = await chrome.storage.local.get(storageKeys.apiKeys);
      const store = result[storageKeys.apiKeys];

      if (!store) {
        return { keys: {}, version: schemaVersion };
      }

      // Handle version migration if needed
      if (store.version < schemaVersion) {
        return await this.migrateStore(store);
      }

      return store;
    } catch {
      throw new StorageError('STORAGE_ERROR', 'Failed to access storage');
    }
  }

  /**
   * Saves the key store to storage
   */
  private async saveStore(store: ApiKeyStore): Promise<void> {
    try {
      await chrome.storage.local.set({ [storageKeys.apiKeys]: store });
    } catch {
      throw new StorageError('STORAGE_ERROR', 'Failed to save to storage');
    }
  }

  /**
   * Migrates store from older versions
   */
  private async migrateStore(store: ApiKeyStore): Promise<ApiKeyStore> {
    // Version 1 -> 2: Re-encryption with higher iterations
    // Note: This would require user to re-enter their password
    // For now, just update version number for new keys
    return {
      ...store,
      version: schemaVersion,
    };
  }

  /**
   * Saves an encrypted API key
   */
  async saveKey(provider: string, apiKey: string, password: string): Promise<void> {
    try {
      // Create compound password with device binding
      const compoundPassword = await deviceBindingService.createCompoundPassword(password);

      // Encrypt the API key
      const encryptedKey = await encrypt(apiKey, compoundPassword);

      // Update store
      const store = await this.getStore();
      store.keys[provider] = {
        encryptedKey,
        provider,
        createdAt: Date.now(),
      };

      await this.saveStore(store);
    } catch (error) {
      if (error instanceof CryptoError) {
        throw new StorageError('ENCRYPTION_ERROR');
      }
      if (error instanceof StorageError) throw error;
      throw new StorageError('STORAGE_ERROR');
    }
  }

  /**
   * Retrieves and decrypts an API key
   *
   * SECURITY: Implements timing normalization to prevent timing attacks.
   * While PBKDF2's high iteration count provides natural timing normalization,
   * we add explicit minimum operation time for additional defense-in-depth.
   */
  async getKey(provider: string, password: string): Promise<string> {
    const startTime = performance.now();
    const MIN_OPERATION_TIME = 400; // ms - minimum time for any attempt

    const store = await this.getStore();
    const storedKey = store.keys[provider];

    if (!storedKey) {
      // Ensure minimum time even for "not found" errors
      const elapsed = performance.now() - startTime;
      if (elapsed < MIN_OPERATION_TIME) {
        await new Promise((r) => setTimeout(r, MIN_OPERATION_TIME - elapsed));
      }
      throw new StorageError('KEY_NOT_FOUND');
    }

    try {
      const compoundPassword = await deviceBindingService.createCompoundPassword(password);
      const decryptedKey = await decrypt(storedKey.encryptedKey, compoundPassword);

      // Update last used timestamp
      store.keys[provider].lastUsed = Date.now();
      await this.saveStore(store);

      return decryptedKey;
    } catch (error) {
      // Ensure minimum operation time even on failure to prevent timing attacks
      const elapsed = performance.now() - startTime;
      if (elapsed < MIN_OPERATION_TIME) {
        await new Promise((r) => setTimeout(r, MIN_OPERATION_TIME - elapsed));
      }

      if (error instanceof CryptoError) {
        throw new StorageError('DECRYPTION_ERROR');
      }
      throw error;
    }
  }

  /**
   * Removes an API key from storage
   */
  async removeKey(provider: string): Promise<void> {
    const store = await this.getStore();

    if (store.keys[provider]) {
      delete store.keys[provider];
      await this.saveStore(store);
    }
  }

  /**
   * Checks if a key exists for a provider
   */
  async hasKey(provider: string): Promise<boolean> {
    const store = await this.getStore();
    return !!store.keys[provider];
  }

  /**
   * Lists all stored providers
   */
  async listProviders(): Promise<string[]> {
    const store = await this.getStore();
    return Object.keys(store.keys);
  }

  /**
   * Gets metadata for a stored key (without decrypting)
   */
  async getKeyMetadata(provider: string): Promise<Omit<StoredApiKey, 'encryptedKey'> | null> {
    const store = await this.getStore();
    const key = store.keys[provider];

    if (!key) return null;

    return {
      provider: key.provider,
      createdAt: key.createdAt,
      lastUsed: key.lastUsed,
    };
  }
}

export const secureStorageService = SecureStorageService.getInstance();
