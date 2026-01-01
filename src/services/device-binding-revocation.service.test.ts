import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SECURITY_CONFIG } from '../config/security.config';
import { DeviceBindingRevocationService } from './device-binding-revocation.service';

describe('DeviceBindingRevocationService', () => {
	let service: DeviceBindingRevocationService;
	let mockLocalStorage: Map<string, unknown>;

	beforeEach(() => {
		// Reset singleton instance
		// @ts-expect-error - accessing private static property for testing
		DeviceBindingRevocationService.instance = undefined;
		service = DeviceBindingRevocationService.getInstance();

		// Mock chrome.storage.local
		mockLocalStorage = new Map();
		(globalThis as any).chrome = {
			storage: {
				local: {
					get: vi.fn((key: string | string[]) => {
						if (typeof key === 'string') {
							const value = mockLocalStorage.get(key);
							return Promise.resolve(value ? { [key]: value } : {});
						}
						const result: Record<string, unknown> = {};
						for (const k of key) {
							const value = mockLocalStorage.get(k);
							if (value !== undefined) {
								result[k] = value;
							}
						}
						return Promise.resolve(result);
					}),
					remove: vi.fn((key: string) => {
						mockLocalStorage.delete(key);
						return Promise.resolve();
					}),
				},
			},
		} as any;
	});

	afterEach(() => {
		vi.clearAllMocks();
		mockLocalStorage.clear();
	});

	describe('getInstance', () => {
		it('should return singleton instance', () => {
			const instance1 = DeviceBindingRevocationService.getInstance();
			const instance2 = DeviceBindingRevocationService.getInstance();
			expect(instance1).toBe(instance2);
		});
	});

	describe('checkForOrphanedKeys', () => {
		it('should return no orphaned keys when no keys exist', async () => {
			const result = await service.checkForOrphanedKeys();

			expect(result.hasOrphanedKeys).toBe(false);
			expect(result.providers).toEqual([]);
			expect(result.message).toBe('');
		});

		it('should return no orphaned keys when storage is empty', async () => {
			mockLocalStorage.set(SECURITY_CONFIG.storageKeys.apiKeys, {
				keys: {},
			});

			const result = await service.checkForOrphanedKeys();

			expect(result.hasOrphanedKeys).toBe(false);
			expect(result.providers).toEqual([]);
			expect(result.message).toBe('');
		});

		it('should return no orphaned keys when device salt exists', async () => {
			mockLocalStorage.set(SECURITY_CONFIG.storageKeys.apiKeys, {
				keys: {
					openai: { encrypted: 'some-encrypted-data' },
					anthropic: { encrypted: 'another-encrypted-data' },
				},
			});
			mockLocalStorage.set(SECURITY_CONFIG.storageKeys.deviceSalt, 'some-salt-value');

			const result = await service.checkForOrphanedKeys();

			expect(result.hasOrphanedKeys).toBe(false);
			expect(result.providers).toEqual([]);
			expect(result.message).toBe('');
		});

		it('should detect orphaned keys when keys exist but no device salt', async () => {
			mockLocalStorage.set(SECURITY_CONFIG.storageKeys.apiKeys, {
				keys: {
					openai: { encrypted: 'some-encrypted-data' },
					anthropic: { encrypted: 'another-encrypted-data' },
				},
			});
			// No device salt

			const result = await service.checkForOrphanedKeys();

			expect(result.hasOrphanedKeys).toBe(true);
			expect(result.providers).toEqual(['openai', 'anthropic']);
			expect(result.message).toContain('Found 2 stored API key(s)');
			expect(result.message).toContain('cannot be decrypted');
			expect(result.message).toContain('reinstalling the extension');
		});

		it('should detect orphaned keys for single provider', async () => {
			mockLocalStorage.set(SECURITY_CONFIG.storageKeys.apiKeys, {
				keys: {
					openrouter: { encrypted: 'encrypted-key' },
				},
			});

			const result = await service.checkForOrphanedKeys();

			expect(result.hasOrphanedKeys).toBe(true);
			expect(result.providers).toEqual(['openrouter']);
			expect(result.message).toContain('Found 1 stored API key(s)');
		});

		it('should handle malformed storage gracefully', async () => {
			mockLocalStorage.set(SECURITY_CONFIG.storageKeys.apiKeys, {
				// Missing 'keys' property
			});

			const result = await service.checkForOrphanedKeys();

			expect(result.hasOrphanedKeys).toBe(false);
			expect(result.providers).toEqual([]);
		});

		it('should handle null storage gracefully', async () => {
			mockLocalStorage.set(SECURITY_CONFIG.storageKeys.apiKeys, null);

			const result = await service.checkForOrphanedKeys();

			expect(result.hasOrphanedKeys).toBe(false);
			expect(result.providers).toEqual([]);
		});

		it('should handle errors gracefully', async () => {
			// Mock error
			(globalThis as any).chrome.storage.local.get = vi.fn(() =>
				Promise.reject(new Error('Storage error')),
			);

			const result = await service.checkForOrphanedKeys();

			expect(result.hasOrphanedKeys).toBe(false);
			expect(result.providers).toEqual([]);
			expect(result.message).toBe('');
		});
	});

	describe('cleanupOrphanedKeys', () => {
		it('should remove API keys from storage', async () => {
			mockLocalStorage.set(SECURITY_CONFIG.storageKeys.apiKeys, {
				keys: {
					openai: { encrypted: 'data' },
				},
			});

			await service.cleanupOrphanedKeys();

			expect(chrome.storage.local.remove).toHaveBeenCalledWith(
				SECURITY_CONFIG.storageKeys.apiKeys,
			);
			expect(mockLocalStorage.has(SECURITY_CONFIG.storageKeys.apiKeys)).toBe(false);
		});

		it('should work even if no keys exist', async () => {
			await service.cleanupOrphanedKeys();

			expect(chrome.storage.local.remove).toHaveBeenCalledWith(
				SECURITY_CONFIG.storageKeys.apiKeys,
			);
		});
	});

	describe('getUninstallWarning', () => {
		it('should return appropriate warning message', () => {
			const warning = service.getUninstallWarning();

			expect(warning).toContain('Uninstalling this extension');
			expect(warning).toContain('permanently unrecoverable');
			expect(warning).toContain('delete or back up your keys');
		});

		it('should be consistent across calls', () => {
			const warning1 = service.getUninstallWarning();
			const warning2 = service.getUninstallWarning();

			expect(warning1).toBe(warning2);
		});
	});

	describe('getOrphanedKeysWarning', () => {
		it('should format warning for single provider', () => {
			const warning = service.getOrphanedKeysWarning(['openai']);

			expect(warning).toContain('openai');
			expect(warning).toContain('cannot be decrypted');
			expect(warning).toContain('reinstalling the extension');
			expect(warning).toContain('delete these entries');
		});

		it('should format warning for multiple providers', () => {
			const warning = service.getOrphanedKeysWarning(['openai', 'anthropic', 'openrouter']);

			expect(warning).toContain('openai, anthropic, openrouter');
			expect(warning).toContain('cannot be decrypted');
		});

		it('should handle empty array', () => {
			const warning = service.getOrphanedKeysWarning([]);

			expect(warning).toContain('cannot be decrypted');
			expect(warning).toBe(
				'The following API keys cannot be decrypted: . ' +
					'This typically happens after reinstalling the extension. ' +
					'Please delete these entries and re-enter your API keys.',
			);
		});

		it('should join providers with commas', () => {
			const providers = ['provider1', 'provider2', 'provider3'];
			const warning = service.getOrphanedKeysWarning(providers);

			expect(warning).toContain('provider1, provider2, provider3');
		});
	});

	describe('integration scenarios', () => {
		it('should handle complete orphaned key detection and cleanup flow', async () => {
			// Setup orphaned keys
			mockLocalStorage.set(SECURITY_CONFIG.storageKeys.apiKeys, {
				keys: {
					openai: { encrypted: 'data1' },
					anthropic: { encrypted: 'data2' },
				},
			});

			// Detect orphaned keys
			const checkResult = await service.checkForOrphanedKeys();
			expect(checkResult.hasOrphanedKeys).toBe(true);
			expect(checkResult.providers).toEqual(['openai', 'anthropic']);

			// Get warning
			const warning = service.getOrphanedKeysWarning(checkResult.providers);
			expect(warning).toContain('openai, anthropic');

			// Cleanup
			await service.cleanupOrphanedKeys();

			// Verify cleanup
			const afterCleanup = await service.checkForOrphanedKeys();
			expect(afterCleanup.hasOrphanedKeys).toBe(false);
		});

		it('should differentiate between valid and orphaned keys', async () => {
			// Setup with device salt (valid keys)
			mockLocalStorage.set(SECURITY_CONFIG.storageKeys.apiKeys, {
				keys: {
					openai: { encrypted: 'data' },
				},
			});
			mockLocalStorage.set(SECURITY_CONFIG.storageKeys.deviceSalt, 'salt-value');

			const validResult = await service.checkForOrphanedKeys();
			expect(validResult.hasOrphanedKeys).toBe(false);

			// Remove salt (simulate reinstall)
			mockLocalStorage.delete(SECURITY_CONFIG.storageKeys.deviceSalt);

			const orphanedResult = await service.checkForOrphanedKeys();
			expect(orphanedResult.hasOrphanedKeys).toBe(true);
		});

		it('should handle reinstallation scenario', async () => {
			// Initial state: keys with device salt
			mockLocalStorage.set(SECURITY_CONFIG.storageKeys.apiKeys, {
				keys: {
					openai: { encrypted: 'encrypted-key' },
				},
			});
			mockLocalStorage.set(SECURITY_CONFIG.storageKeys.deviceSalt, 'original-salt');

			// Extension is uninstalled (all storage cleared)
			mockLocalStorage.clear();

			// Extension is reinstalled but old keys might be in sync storage
			// Only API keys remain, no device salt
			mockLocalStorage.set(SECURITY_CONFIG.storageKeys.apiKeys, {
				keys: {
					openai: { encrypted: 'encrypted-key' },
				},
			});

			// Check should detect orphaned keys
			const result = await service.checkForOrphanedKeys();
			expect(result.hasOrphanedKeys).toBe(true);
			expect(result.providers).toEqual(['openai']);

			// Cleanup orphaned keys
			await service.cleanupOrphanedKeys();

			// Verify
			const afterCleanup = await service.checkForOrphanedKeys();
			expect(afterCleanup.hasOrphanedKeys).toBe(false);
		});
	});
});
