// Security configuration for API key storage
// OWASP 2024/2025 compliant cryptographic parameters

export const SECURITY_CONFIG = {
  // Cryptographic parameters (OWASP 2024/2025 compliant)
  crypto: {
    algorithm: 'AES-GCM' as const,
    keyLength: 256,
    ivLength: 12, // 96 bits - recommended for AES-GCM
    saltLength: 32, // 256 bits - OWASP recommendation for high-security applications
    tagLength: 128, // 128 bits - maximum security
    pbkdf2Iterations: 800_000, // OWASP 2025 recommendation
    pbkdf2Hash: 'SHA-256' as const,
  },

  // Password requirements
  password: {
    minLength: 12,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecial: false, // Recommended but not required
    minCharacterTypes: 3, // At least 3 of the 4 character types
  },

  // Rate limiting
  rateLimit: {
    maxAttempts: 5,
    initialLockoutMs: 30_000, // 30 seconds
    lockoutMultiplier: 2, // Double each time
    maxLockoutMs: 3_600_000, // 1 hour maximum
    attemptWindowMs: 900_000, // 15 minute window
  },

  // Session cache
  session: {
    cacheExpiryMs: 30 * 60 * 1000, // 30 minutes
    inactivityTimeoutMs: 15 * 60 * 1000, // 15 minutes
    accessLevel: 'TRUSTED_CONTEXTS' as const,
  },

  // Storage keys
  storageKeys: {
    apiKeys: 'secure_api_keys_v2',
    deviceSalt: 'device_binding_salt',
    rateLimitPrefix: 'rate_limit_',
    sessionCache: 'decrypted_keys_cache',
    sessionSettings: 'session_settings_v1',
    persistedSessionKey: 'persisted_session_key',
  },

  // Current schema version for migrations
  schemaVersion: 2,
} as const;

export type SecurityConfig = typeof SECURITY_CONFIG;
