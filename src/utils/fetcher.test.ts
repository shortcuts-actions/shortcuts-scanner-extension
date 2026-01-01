import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { iCloudAPIResponse } from './types';
import {
	convertToAPIEndpoint,
	downloadBinaryPlist,
	fetchShortcutFromiCloud,
	fetchShortcutMetadata,
} from './fetcher';

describe('fetcher', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('convertToAPIEndpoint', () => {
		it('should convert valid iCloud shortcut URL to API endpoint', () => {
			const url = 'https://www.icloud.com/shortcuts/abc123def456';
			const expected = 'https://www.icloud.com/shortcuts/api/records/abc123def456';
			expect(convertToAPIEndpoint(url)).toBe(expected);
		});

		it('should handle URLs without www', () => {
			const url = 'https://icloud.com/shortcuts/xyz789';
			const expected = 'https://www.icloud.com/shortcuts/api/records/xyz789';
			expect(convertToAPIEndpoint(url)).toBe(expected);
		});

		it('should handle URLs with trailing slash', () => {
			const url = 'https://www.icloud.com/shortcuts/abc123/';
			const expected = 'https://www.icloud.com/shortcuts/api/records/abc123';
			expect(convertToAPIEndpoint(url)).toBe(expected);
		});

		it('should handle alphanumeric shortcut IDs', () => {
			const url = 'https://www.icloud.com/shortcuts/AbC123DeF456';
			const expected = 'https://www.icloud.com/shortcuts/api/records/AbC123DeF456';
			expect(convertToAPIEndpoint(url)).toBe(expected);
		});

		it('should throw error for invalid URL format', () => {
			const url = 'https://google.com/shortcuts/abc123';
			expect(() => convertToAPIEndpoint(url)).toThrow('Invalid iCloud shortcut URL');
		});

		it('should throw error for URL without shortcut ID', () => {
			const url = 'https://www.icloud.com/shortcuts/';
			expect(() => convertToAPIEndpoint(url)).toThrow('Invalid iCloud shortcut URL');
		});

		it('should throw error for completely invalid URL', () => {
			const url = 'not-a-url';
			expect(() => convertToAPIEndpoint(url)).toThrow('Invalid iCloud shortcut URL');
		});
	});

	describe('fetchShortcutMetadata', () => {
		const mockAPIResponse: iCloudAPIResponse = {
			fields: {
				name: { value: 'Test Shortcut' },
				icon: {
					value: {
						downloadURL: 'https://example.com/icon.png',
					},
				},
				shortcut: {
					value: {
						downloadURL: 'https://example.com/shortcut.plist',
					},
				},
			},
		};

		beforeEach(() => {
			globalThis.fetch = vi.fn();
		});

		it('should fetch and parse shortcut metadata', async () => {
			(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				json: async () => mockAPIResponse,
			});

			const url = 'https://www.icloud.com/shortcuts/abc123';
			const result = await fetchShortcutMetadata(url);

			expect(result.metadata.name).toBe('Test Shortcut');
			expect(result.metadata.isSigned).toBe(false);
			expect(result.downloadURL).toBe('https://example.com/shortcut.plist');
			expect(result.apiResponse).toEqual(mockAPIResponse);
		});

		it('should handle signed shortcuts', async () => {
			const signedResponse: iCloudAPIResponse = {
				fields: {
					name: { value: 'Signed Shortcut' },
					signedShortcut: {
						value: {
							downloadURL: 'https://example.com/signed.plist',
						},
					},
				},
			};

			(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				json: async () => signedResponse,
			});

			const url = 'https://www.icloud.com/shortcuts/signed123';
			const result = await fetchShortcutMetadata(url);

			expect(result.metadata.name).toBe('Signed Shortcut');
			expect(result.metadata.isSigned).toBe(true);
			expect(result.downloadURL).toBe('https://example.com/signed.plist');
		});

		it('should prefer unsigned shortcut over signed', async () => {
			const bothResponse: iCloudAPIResponse = {
				fields: {
					name: { value: 'Both Versions' },
					shortcut: {
						value: {
							downloadURL: 'https://example.com/unsigned.plist',
						},
					},
					signedShortcut: {
						value: {
							downloadURL: 'https://example.com/signed.plist',
						},
					},
				},
			};

			(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				json: async () => bothResponse,
			});

			const url = 'https://www.icloud.com/shortcuts/both123';
			const result = await fetchShortcutMetadata(url);

			expect(result.downloadURL).toBe('https://example.com/unsigned.plist');
			expect(result.metadata.isSigned).toBe(false);
		});

		it('should use default name when name is missing', async () => {
			const noNameResponse: iCloudAPIResponse = {
				fields: {
					shortcut: {
						value: {
							downloadURL: 'https://example.com/shortcut.plist',
						},
					},
				},
			};

			(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				json: async () => noNameResponse,
			});

			const url = 'https://www.icloud.com/shortcuts/unnamed123';
			const result = await fetchShortcutMetadata(url);

			expect(result.metadata.name).toBe('Unnamed Shortcut');
		});

		it('should throw error when download URL is missing', async () => {
			const noDownloadResponse: iCloudAPIResponse = {
				fields: {
					name: { value: 'No Download' },
				},
			};

			(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				json: async () => noDownloadResponse,
			});

			const url = 'https://www.icloud.com/shortcuts/nodownload123';

			await expect(fetchShortcutMetadata(url)).rejects.toThrow('No download URL found');
		});

		it('should throw error when API request fails', async () => {
			(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: false,
				statusText: 'Not Found',
			});

			const url = 'https://www.icloud.com/shortcuts/notfound123';

			await expect(fetchShortcutMetadata(url)).rejects.toThrow(
				'Failed to fetch shortcut metadata: Not Found',
			);
		});

		it('should handle network errors', async () => {
			(globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
				new Error('Network error'),
			);

			const url = 'https://www.icloud.com/shortcuts/error123';

			await expect(fetchShortcutMetadata(url)).rejects.toThrow('Network error');
		});

		it('should include icon in metadata when available', async () => {
			(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				json: async () => mockAPIResponse,
			});

			const url = 'https://www.icloud.com/shortcuts/abc123';
			const result = await fetchShortcutMetadata(url);

			expect(result.metadata.icon).toEqual({
				downloadURL: 'https://example.com/icon.png',
			});
		});
	});

	describe('downloadBinaryPlist', () => {
		beforeEach(() => {
			globalThis.fetch = vi.fn();
		});

		it('should download and return ArrayBuffer', async () => {
			const mockBuffer = new ArrayBuffer(100);
			(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				arrayBuffer: async () => mockBuffer,
			});

			const result = await downloadBinaryPlist('https://example.com/shortcut.plist');

			expect(result).toBe(mockBuffer);
			expect(globalThis.fetch).toHaveBeenCalledWith('https://example.com/shortcut.plist');
		});

		it('should throw error when download fails', async () => {
			(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: false,
				statusText: 'Forbidden',
			});

			await expect(downloadBinaryPlist('https://example.com/forbidden.plist')).rejects.toThrow(
				'Failed to download shortcut: Forbidden',
			);
		});

		it('should handle network errors', async () => {
			(globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
				new Error('Connection refused'),
			);

			await expect(downloadBinaryPlist('https://example.com/error.plist')).rejects.toThrow(
				'Connection refused',
			);
		});

		it('should handle empty response', async () => {
			const emptyBuffer = new ArrayBuffer(0);
			(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				arrayBuffer: async () => emptyBuffer,
			});

			const result = await downloadBinaryPlist('https://example.com/empty.plist');

			expect(result.byteLength).toBe(0);
		});
	});

	describe('fetchShortcutFromiCloud', () => {
		const mockAPIResponse: iCloudAPIResponse = {
			fields: {
				name: { value: 'Complete Shortcut' },
				icon: {
					value: {
						downloadURL: 'https://example.com/icon.png',
					},
				},
				shortcut: {
					value: {
						downloadURL: 'https://example.com/shortcut.plist',
					},
				},
			},
		};

		const mockBinaryData = new ArrayBuffer(1024);

		beforeEach(() => {
			globalThis.fetch = vi.fn();
		});

		it('should fetch complete shortcut with metadata and binary data', async () => {
			(globalThis.fetch as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => mockAPIResponse,
				})
				.mockResolvedValueOnce({
					ok: true,
					arrayBuffer: async () => mockBinaryData,
				});

			const url = 'https://www.icloud.com/shortcuts/complete123';
			const result = await fetchShortcutFromiCloud(url);

			expect(result.metadata.name).toBe('Complete Shortcut');
			expect(result.metadata.isSigned).toBe(false);
			expect(result.binaryData).toBe(mockBinaryData);
			expect(result.apiResponse).toEqual(mockAPIResponse);
		});

		it('should make two fetch calls in correct order', async () => {
			(globalThis.fetch as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => mockAPIResponse,
				})
				.mockResolvedValueOnce({
					ok: true,
					arrayBuffer: async () => mockBinaryData,
				});

			const url = 'https://www.icloud.com/shortcuts/order123';
			await fetchShortcutFromiCloud(url);

			expect(globalThis.fetch).toHaveBeenCalledTimes(2);
			expect(globalThis.fetch).toHaveBeenNthCalledWith(
				1,
				'https://www.icloud.com/shortcuts/api/records/order123',
			);
			expect(globalThis.fetch).toHaveBeenNthCalledWith(2, 'https://example.com/shortcut.plist');
		});

		it('should handle signed shortcuts end-to-end', async () => {
			const signedResponse: iCloudAPIResponse = {
				fields: {
					name: { value: 'Signed E2E' },
					signedShortcut: {
						value: {
							downloadURL: 'https://example.com/signed-e2e.plist',
						},
					},
				},
			};

			(globalThis.fetch as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => signedResponse,
				})
				.mockResolvedValueOnce({
					ok: true,
					arrayBuffer: async () => mockBinaryData,
				});

			const url = 'https://www.icloud.com/shortcuts/signed-e2e123';
			const result = await fetchShortcutFromiCloud(url);

			expect(result.metadata.isSigned).toBe(true);
			expect(result.binaryData).toBe(mockBinaryData);
		});

		it('should fail if metadata fetch fails', async () => {
			(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: false,
				statusText: 'Server Error',
			});

			const url = 'https://www.icloud.com/shortcuts/fail-metadata';

			await expect(fetchShortcutFromiCloud(url)).rejects.toThrow(
				'Failed to fetch shortcut metadata',
			);
		});

		it('should fail if binary download fails', async () => {
			(globalThis.fetch as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => mockAPIResponse,
				})
				.mockResolvedValueOnce({
					ok: false,
					statusText: 'Gone',
				});

			const url = 'https://www.icloud.com/shortcuts/fail-binary';

			await expect(fetchShortcutFromiCloud(url)).rejects.toThrow(
				'Failed to download shortcut: Gone',
			);
		});

		it('should handle network errors during metadata fetch', async () => {
			(globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
				new Error('DNS lookup failed'),
			);

			const url = 'https://www.icloud.com/shortcuts/dns-error';

			await expect(fetchShortcutFromiCloud(url)).rejects.toThrow('DNS lookup failed');
		});

		it('should handle network errors during binary download', async () => {
			(globalThis.fetch as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => mockAPIResponse,
				})
				.mockRejectedValueOnce(new Error('Connection timeout'));

			const url = 'https://www.icloud.com/shortcuts/timeout';

			await expect(fetchShortcutFromiCloud(url)).rejects.toThrow('Connection timeout');
		});
	});

	describe('integration tests', () => {
		beforeEach(() => {
			globalThis.fetch = vi.fn();
		});

		it('should handle complete workflow from URL to binary data', async () => {
			const apiResponse: iCloudAPIResponse = {
				fields: {
					name: { value: 'Integration Test Shortcut' },
					icon: {
						value: {
							downloadURL: 'https://example.com/icon.png',
						},
					},
					shortcut: {
						value: {
							downloadURL: 'https://example.com/integration.plist',
						},
					},
				},
			};

			const binaryData = new ArrayBuffer(2048);

			(globalThis.fetch as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => apiResponse,
				})
				.mockResolvedValueOnce({
					ok: true,
					arrayBuffer: async () => binaryData,
				});

			const inputURL = 'https://www.icloud.com/shortcuts/integration123';

			// Convert to API endpoint
			const apiEndpoint = convertToAPIEndpoint(inputURL);
			expect(apiEndpoint).toBe(
				'https://www.icloud.com/shortcuts/api/records/integration123',
			);

			// Fetch complete shortcut
			const result = await fetchShortcutFromiCloud(inputURL);

			expect(result.metadata.name).toBe('Integration Test Shortcut');
			expect(result.binaryData).toBe(binaryData);
			expect(result.apiResponse).toEqual(apiResponse);
		});

		it('should handle various URL formats consistently', async () => {
			const urls = [
				'https://www.icloud.com/shortcuts/test123',
				'https://icloud.com/shortcuts/test123',
				'https://www.icloud.com/shortcuts/test123/',
			];

			for (const url of urls) {
				const endpoint = convertToAPIEndpoint(url);
				expect(endpoint).toBe('https://www.icloud.com/shortcuts/api/records/test123');
			}
		});
	});
});
