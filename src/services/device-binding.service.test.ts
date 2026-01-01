import { beforeEach, describe, expect, it } from 'vitest';
import { resetChromeMocks } from '../test/mocks/chrome';
import { deviceBindingService } from './device-binding.service';

describe('DeviceBindingService', () => {
  beforeEach(() => {
    resetChromeMocks();
    deviceBindingService.clearCache();
  });

  describe('getDeviceSecret', () => {
    it('should generate a device secret on first call', async () => {
      const secret = await deviceBindingService.getDeviceSecret();

      expect(secret).toBeDefined();
      expect(secret.length).toBeGreaterThan(0);
    });

    it('should return the same secret on subsequent calls (cached)', async () => {
      const secret1 = await deviceBindingService.getDeviceSecret();
      const secret2 = await deviceBindingService.getDeviceSecret();

      expect(secret1).toBe(secret2);
    });

    it('should generate different secrets for different extension IDs', async () => {
      const secret1 = await deviceBindingService.getDeviceSecret();

      // Simulate different extension ID by changing runtime.id
      (chrome.runtime.id as any) = 'different-extension-id';
      deviceBindingService.clearCache();

      const secret2 = await deviceBindingService.getDeviceSecret();

      expect(secret1).not.toBe(secret2);

      // Restore original ID
      (chrome.runtime.id as any) = 'test-extension-id-12345';
    });

    it('should persist salt in storage', async () => {
      await deviceBindingService.getDeviceSecret();

      // Check that salt was stored
      const result = await chrome.storage.local.get('device_binding_salt');
      expect(result.device_binding_salt).toBeDefined();
      expect(result.device_binding_salt.length).toBeGreaterThan(0);
    });

    it('should reuse existing salt from storage', async () => {
      // Get secret and salt
      await deviceBindingService.getDeviceSecret();
      const result1 = await chrome.storage.local.get('device_binding_salt');
      const originalSalt = result1.device_binding_salt;

      // Clear cache and get secret again
      deviceBindingService.clearCache();
      await deviceBindingService.getDeviceSecret();

      // Salt should be the same
      const result2 = await chrome.storage.local.get('device_binding_salt');
      expect(result2.device_binding_salt).toBe(originalSalt);
    });

    it('should be deterministic for same extension ID and salt', async () => {
      const secret1 = await deviceBindingService.getDeviceSecret();

      // Clear cache to force re-derivation
      deviceBindingService.clearCache();

      const secret2 = await deviceBindingService.getDeviceSecret();

      expect(secret1).toBe(secret2);
    });
  });

  describe('createCompoundPassword', () => {
    it('should create compound password from user password', async () => {
      const userPassword = 'MySecurePassword123!';

      const compoundPassword = await deviceBindingService.createCompoundPassword(userPassword);

      expect(compoundPassword).toBeDefined();
      expect(compoundPassword.length).toBeGreaterThan(0);
      expect(compoundPassword).not.toBe(userPassword);
    });

    it('should be deterministic for same user password', async () => {
      const userPassword = 'TestPassword123!';

      const compound1 = await deviceBindingService.createCompoundPassword(userPassword);
      const compound2 = await deviceBindingService.createCompoundPassword(userPassword);

      expect(compound1).toBe(compound2);
    });

    it('should produce different compound passwords for different user passwords', async () => {
      const compound1 = await deviceBindingService.createCompoundPassword('Password1!');
      const compound2 = await deviceBindingService.createCompoundPassword('Password2!');

      expect(compound1).not.toBe(compound2);
    });

    it('should produce different compound passwords on different devices', async () => {
      const userPassword = 'TestPassword123!';

      const compound1 = await deviceBindingService.createCompoundPassword(userPassword);

      // Simulate different device by changing extension ID
      (chrome.runtime.id as any) = 'different-device-id';
      deviceBindingService.clearCache();

      const compound2 = await deviceBindingService.createCompoundPassword(userPassword);

      expect(compound1).not.toBe(compound2);

      // Restore original ID
      (chrome.runtime.id as any) = 'test-extension-id-12345';
    });

    it('should handle empty password', async () => {
      const compoundPassword = await deviceBindingService.createCompoundPassword('');

      expect(compoundPassword).toBeDefined();
      expect(compoundPassword.length).toBeGreaterThan(0);
    });

    it('should handle special characters in password', async () => {
      const userPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';

      const compoundPassword = await deviceBindingService.createCompoundPassword(userPassword);

      expect(compoundPassword).toBeDefined();
      expect(compoundPassword.length).toBeGreaterThan(0);
    });

    it('should handle unicode characters in password', async () => {
      const userPassword = '你好世界🌍émojis™';

      const compoundPassword = await deviceBindingService.createCompoundPassword(userPassword);

      expect(compoundPassword).toBeDefined();
      expect(compoundPassword.length).toBeGreaterThan(0);
    });
  });

  describe('clearCache', () => {
    it('should clear the device secret cache', async () => {
      // Get secret to populate cache
      const secret1 = await deviceBindingService.getDeviceSecret();

      // Clear cache
      deviceBindingService.clearCache();

      // Mock storage to verify it re-derives from storage
      const result = await chrome.storage.local.get('device_binding_salt');
      expect(result.device_binding_salt).toBeDefined();

      // Get secret again - should derive from storage, not cache
      const secret2 = await deviceBindingService.getDeviceSecret();

      // Should be same secret (from storage), but had to re-derive
      expect(secret1).toBe(secret2);
    });
  });

  describe('security properties', () => {
    it('should make encrypted data device-specific', async () => {
      // This test verifies that the compound password is different on different devices
      // which means encrypted data cannot be moved between devices

      const userPassword = 'MyPassword123!';

      // Device 1
      const compound1 = await deviceBindingService.createCompoundPassword(userPassword);

      // Simulate device 2 (different extension ID = different device/installation)
      resetChromeMocks();
      deviceBindingService.clearCache();
      (chrome.runtime.id as any) = 'different-extension-installation-id';

      const compound2 = await deviceBindingService.createCompoundPassword(userPassword);

      // Compound passwords should be different, preventing encrypted blob portability
      expect(compound1).not.toBe(compound2);

      // Restore
      (chrome.runtime.id as any) = 'test-extension-id-12345';
    });

    it('should generate sufficiently long device secret', async () => {
      const secret = await deviceBindingService.getDeviceSecret();

      // Base64 encoded 256 bits should be ~44 characters
      expect(secret.length).toBeGreaterThanOrEqual(40);
    });

    it('should generate sufficiently long compound password', async () => {
      const compound = await deviceBindingService.createCompoundPassword('password');

      // Base64 encoded 512 bits should be ~88 characters
      expect(compound.length).toBeGreaterThanOrEqual(80);
    });
  });
});
