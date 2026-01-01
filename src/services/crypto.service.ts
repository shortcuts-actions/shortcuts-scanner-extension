// Cryptographic utilities for secure API key storage
// Uses AES-256-GCM with PBKDF2 key derivation (800k iterations per OWASP 2025)

import { SECURITY_CONFIG } from '../config/security.config';

const { crypto: cryptoConfig } = SECURITY_CONFIG;

/**
 * Custom error class for cryptographic operations
 * Does not expose sensitive information in error messages
 */
export class CryptoError extends Error {
  constructor(
    public readonly code:
      | 'ENCRYPTION_FAILED'
      | 'DECRYPTION_FAILED'
      | 'KEY_DERIVATION_FAILED'
      | 'INVALID_DATA',
    message?: string,
  ) {
    super(message || code);
    this.name = 'CryptoError';
  }
}

/**
 * Derives an encryption key from password and salt using PBKDF2
 * Uses 800,000 iterations per OWASP 2024/2025 recommendations
 */
async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  try {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey'],
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt.buffer,
        iterations: cryptoConfig.pbkdf2Iterations,
        hash: cryptoConfig.pbkdf2Hash,
      },
      keyMaterial,
      {
        name: cryptoConfig.algorithm,
        length: cryptoConfig.keyLength,
      },
      false, // Not extractable
      ['encrypt', 'decrypt'],
    );
  } catch {
    throw new CryptoError('KEY_DERIVATION_FAILED');
  }
}

/**
 * Derives additional keying material using HKDF
 * Used for combining password with device secret
 */
export async function deriveWithHKDF(
  inputKey: string,
  salt: string,
  info: string,
  lengthBits = 512,
): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(inputKey),
      'HKDF',
      false,
      ['deriveBits'],
    );

    const saltBytes = encoder.encode(salt);
    const infoBytes = encoder.encode(info);

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: saltBytes.buffer,
        info: infoBytes.buffer,
      },
      keyMaterial,
      lengthBits,
    );

    return arrayToBase64(new Uint8Array(derivedBits));
  } catch {
    throw new CryptoError('KEY_DERIVATION_FAILED');
  }
}

/**
 * Encrypts plaintext using AES-256-GCM
 * Returns base64-encoded string containing: salt || iv || ciphertext || tag
 */
export async function encrypt(plaintext: string, password: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const salt = new Uint8Array(new ArrayBuffer(cryptoConfig.saltLength));
    const iv = new Uint8Array(new ArrayBuffer(cryptoConfig.ivLength));
    crypto.getRandomValues(salt);
    crypto.getRandomValues(iv);

    const key = await deriveKey(password, salt);

    const encryptedData = await crypto.subtle.encrypt(
      {
        name: cryptoConfig.algorithm,
        iv: iv.buffer,
        tagLength: cryptoConfig.tagLength,
      },
      key,
      encoder.encode(plaintext),
    );

    // Combine: salt (32) + iv (12) + ciphertext+tag (variable)
    const combined = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encryptedData), salt.length + iv.length);

    return arrayToBase64(combined);
  } catch (error) {
    if (error instanceof CryptoError) throw error;
    throw new CryptoError('ENCRYPTION_FAILED');
  }
}

/**
 * Decrypts ciphertext using AES-256-GCM
 * Expects base64-encoded string containing: salt || iv || ciphertext || tag
 */
export async function decrypt(ciphertext: string, password: string): Promise<string> {
  try {
    const combined = base64ToArray(ciphertext);

    if (combined.length < cryptoConfig.saltLength + cryptoConfig.ivLength + 16) {
      throw new CryptoError('INVALID_DATA');
    }

    // Extract parts and copy to new ArrayBuffers to ensure proper typing
    const saltSlice = combined.slice(0, cryptoConfig.saltLength);
    const ivSlice = combined.slice(
      cryptoConfig.saltLength,
      cryptoConfig.saltLength + cryptoConfig.ivLength,
    );
    const data = combined.slice(cryptoConfig.saltLength + cryptoConfig.ivLength);

    // Create new Uint8Arrays with explicit ArrayBuffer backing
    const salt = new Uint8Array(new ArrayBuffer(saltSlice.length));
    salt.set(saltSlice);
    const iv = new Uint8Array(new ArrayBuffer(ivSlice.length));
    iv.set(ivSlice);

    const key = await deriveKey(password, salt);

    const decryptedData = await crypto.subtle.decrypt(
      {
        name: cryptoConfig.algorithm,
        iv: iv.buffer,
        tagLength: cryptoConfig.tagLength,
      },
      key,
      data,
    );

    return new TextDecoder().decode(decryptedData);
  } catch (error) {
    if (error instanceof CryptoError) throw error;
    // Don't expose whether it was wrong password or corrupted data
    throw new CryptoError('DECRYPTION_FAILED');
  }
}

/**
 * Generates cryptographically secure random bytes as hex string
 */
export function generateSecureRandom(lengthBytes: number): string {
  const array = crypto.getRandomValues(new Uint8Array(lengthBytes));
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Best-effort secure memory wipe for Uint8Array
 *
 * IMPORTANT: JavaScript cannot guarantee secure memory clearing.
 * Setting variables to null does NOT overwrite memory contents - the data
 * remains until garbage collected and can be extracted via memory dumps.
 *
 * This function provides defense-in-depth by overwriting typed arrays,
 * but cannot prevent memory forensics attacks. For sensitive data:
 * - Minimize time data exists in memory
 * - Use typed arrays (Uint8Array) instead of strings where possible
 * - Clear arrays immediately after use
 */
export function secureWipe(array: Uint8Array): void {
  crypto.getRandomValues(array); // Overwrite with random data
  array.fill(0); // Then zero out
}

// Utility functions for base64 encoding/decoding
function arrayToBase64(array: Uint8Array): string {
  return btoa(String.fromCharCode(...array));
}

function base64ToArray(base64: string): Uint8Array {
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return array;
}
