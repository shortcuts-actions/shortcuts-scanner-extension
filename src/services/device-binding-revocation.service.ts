// Device Binding Revocation Service
// Handles detection and cleanup of orphaned keys after reinstallation

import { SECURITY_CONFIG } from '../config/security.config';

const { storageKeys } = SECURITY_CONFIG;

export interface OrphanedKeyCheckResult {
  hasOrphanedKeys: boolean;
  providers: string[];
  message: string;
}

/**
 * Device Binding Revocation Service
 * Handles detection and cleanup of orphaned keys after reinstallation
 *
 * When the extension is reinstalled, the device binding salt is regenerated,
 * making old encrypted keys unrecoverable. This is a security feature but
 * requires proper user communication and handling.
 */
export class DeviceBindingRevocationService {
  private static instance: DeviceBindingRevocationService;

  private constructor() {}

  static getInstance(): DeviceBindingRevocationService {
    if (!DeviceBindingRevocationService.instance) {
      DeviceBindingRevocationService.instance = new DeviceBindingRevocationService();
    }
    return DeviceBindingRevocationService.instance;
  }

  /**
   * Checks if there are stored keys that cannot be decrypted
   * This happens when the extension is reinstalled (device salt regenerated)
   */
  async checkForOrphanedKeys(): Promise<OrphanedKeyCheckResult> {
    try {
      const result = await chrome.storage.local.get(storageKeys.apiKeys);
      const store = result[storageKeys.apiKeys];

      if (!store || !store.keys || Object.keys(store.keys).length === 0) {
        return {
          hasOrphanedKeys: false,
          providers: [],
          message: '',
        };
      }

      const providers = Object.keys(store.keys);

      // Try to get device secret - if the salt exists, keys are likely valid
      const saltResult = await chrome.storage.local.get(storageKeys.deviceSalt);
      const hasDeviceSalt = !!saltResult[storageKeys.deviceSalt];

      // If there are keys but no device salt, keys are orphaned
      if (!hasDeviceSalt) {
        return {
          hasOrphanedKeys: true,
          providers,
          message:
            `Found ${providers.length} stored API key(s) that cannot be decrypted. ` +
            'This typically happens after reinstalling the extension. ' +
            'These keys should be deleted and re-entered.',
        };
      }

      return {
        hasOrphanedKeys: false,
        providers: [],
        message: '',
      };
    } catch {
      return {
        hasOrphanedKeys: false,
        providers: [],
        message: '',
      };
    }
  }

  /**
   * Cleans up orphaned keys that cannot be decrypted
   */
  async cleanupOrphanedKeys(): Promise<void> {
    await chrome.storage.local.remove(storageKeys.apiKeys);
  }

  /**
   * Gets a warning message for users before uninstall
   */
  getUninstallWarning(): string {
    return (
      'Warning: Uninstalling this extension will make your stored API keys ' +
      'permanently unrecoverable. Please delete or back up your keys before uninstalling.'
    );
  }

  /**
   * Gets a warning message for users when orphaned keys are detected
   */
  getOrphanedKeysWarning(providers: string[]): string {
    const providerList = providers.join(', ');
    return (
      `The following API keys cannot be decrypted: ${providerList}. ` +
      'This typically happens after reinstalling the extension. ' +
      'Please delete these entries and re-enter your API keys.'
    );
  }
}

export const deviceBindingRevocationService = DeviceBindingRevocationService.getInstance();
