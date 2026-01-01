import type { iCloudAPIResponse, ShortcutMetadata } from './types';

/**
 * Converts an iCloud shortcut URL to the API endpoint
 * Example: https://www.icloud.com/shortcuts/abc123 -> https://www.icloud.com/shortcuts/api/records/abc123
 */
export function convertToAPIEndpoint(url: string): string {
  const match = url.match(/icloud\.com\/shortcuts\/([a-zA-Z0-9]+)/);
  if (!match) {
    throw new Error('Invalid iCloud shortcut URL');
  }
  const shortcutId = match[1];
  return `https://www.icloud.com/shortcuts/api/records/${shortcutId}`;
}

/**
 * Fetches shortcut metadata from the iCloud API
 */
export async function fetchShortcutMetadata(url: string): Promise<{
  metadata: ShortcutMetadata;
  downloadURL: string;
  apiResponse: iCloudAPIResponse;
}> {
  const apiEndpoint = convertToAPIEndpoint(url);

  const response = await fetch(apiEndpoint);
  if (!response.ok) {
    throw new Error(`Failed to fetch shortcut metadata: ${response.statusText}`);
  }

  const data: iCloudAPIResponse = await response.json();

  // Extract download URL (prefer unsigned version)
  const downloadURL =
    data.fields.shortcut?.value?.downloadURL || data.fields.signedShortcut?.value?.downloadURL;

  if (!downloadURL) {
    throw new Error('No download URL found in API response');
  }

  // Extract metadata
  const metadata: ShortcutMetadata = {
    name: data.fields.name?.value || 'Unnamed Shortcut',
    icon: data.fields.icon?.value,
    isSigned:
      !data.fields.shortcut?.value?.downloadURL && !!data.fields.signedShortcut?.value?.downloadURL,
  };

  return { metadata, downloadURL, apiResponse: data };
}

/**
 * Downloads the binary plist file from the download URL
 */
export async function downloadBinaryPlist(downloadURL: string): Promise<ArrayBuffer> {
  const response = await fetch(downloadURL);
  if (!response.ok) {
    throw new Error(`Failed to download shortcut: ${response.statusText}`);
  }

  return response.arrayBuffer();
}

/**
 * Main function to fetch a complete shortcut from an iCloud URL
 */
export async function fetchShortcutFromiCloud(url: string): Promise<{
  metadata: ShortcutMetadata;
  binaryData: ArrayBuffer;
  apiResponse: iCloudAPIResponse;
}> {
  const { metadata, downloadURL, apiResponse } = await fetchShortcutMetadata(url);
  const binaryData = await downloadBinaryPlist(downloadURL);

  return { metadata, binaryData, apiResponse };
}
