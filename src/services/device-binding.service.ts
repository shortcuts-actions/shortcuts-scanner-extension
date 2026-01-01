// Device binding service for API key security
// Prevents encrypted blobs from being used on different machines/installations

import { SECURITY_CONFIG } from '../config/security.config';
import { deriveWithHKDF, generateSecureRandom } from './crypto.service';

const { storageKeys } = SECURITY_CONFIG;

/**
 * Manages device-specific secrets for key binding
 * Prevents encrypted blobs from being used on different machines
 */
export class DeviceBindingService {
  private static instance: DeviceBindingService;
  private deviceSecretCache: string | null = null;

  private constructor() {}

  static getInstance(): DeviceBindingService {
    if (!DeviceBindingService.instance) {
      DeviceBindingService.instance = new DeviceBindingService();
    }
    return DeviceBindingService.instance;
  }

  /**
   * Gets or creates a device-bound secret
   * Uses extension ID + random salt, derived through HKDF
   * The salt is stored, but the final secret is derived (not stored directly)
   */
  async getDeviceSecret(): Promise<string> {
    if (this.deviceSecretCache) {
      return this.deviceSecretCache;
    }

    // Get or create the device salt
    const result = await chrome.storage.local.get(storageKeys.deviceSalt);
    let salt = result[storageKeys.deviceSalt];

    if (!salt) {
      // Generate new salt on first use
      salt = generateSecureRandom(32);
      await chrome.storage.local.set({ [storageKeys.deviceSalt]: salt });
    }

    // Derive device secret using:
    // - Extension ID (unique per installation, changes on reinstall)
    // - Random salt (stored locally)
    // - HKDF for proper key derivation
    const extensionId = chrome.runtime.id;

    this.deviceSecretCache = await deriveWithHKDF(extensionId, salt, 'device-binding-v2', 256);

    return this.deviceSecretCache;
  }

  /**
   * Creates a compound password by combining user password with device secret
   * Uses HKDF to properly mix entropy from both sources
   */
  async createCompoundPassword(userPassword: string): Promise<string> {
    const deviceSecret = await this.getDeviceSecret();

    return await deriveWithHKDF(userPassword, deviceSecret, 'compound-password-v2', 512);
  }

  /**
   * Clears cached device secret (useful for testing)
   */
  clearCache(): void {
    this.deviceSecretCache = null;
  }
}

// Export singleton instance
export const deviceBindingService = DeviceBindingService.getInstance();
