// API Key validation service
// Validates format and sanitizes keys before storage

interface ApiKeyPattern {
  regex: RegExp;
  format: string;
  example: string;
}

const API_KEY_PATTERNS: Record<string, ApiKeyPattern> = {
  openai: {
    // Supports legacy (sk-), project keys (sk-proj-), and service accounts (sk-svcacct-)
    regex: /^sk-(?:proj-|svcacct-)?[a-zA-Z0-9_-]{20,}$/,
    format: 'sk-XXXX, sk-proj-XXXX, or sk-svcacct-XXXX format',
    example: 'sk-proj-abc123...',
  },
  anthropic: {
    // Flexible pattern allowing various Anthropic key formats
    // Supports: sk-ant-api03-xxx, sk-ant-xxx, and future variations
    regex: /^sk-ant-[a-zA-Z0-9]{2,10}-[a-zA-Z0-9\-_]{40,}$/,
    format: 'sk-ant-XXXX-XXXXXXXX... format',
    example: 'sk-ant-api03-...',
  },
  openrouter: {
    regex: /^sk-or-v1-[a-zA-Z0-9]{64}$/,
    format: 'sk-or-v1-XXXX format (64 character suffix)',
    example: 'sk-or-v1-abc123...',
  },
};

// Display names for providers
export const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  openrouter: 'OpenRouter',
};

// List of supported providers
export const SUPPORTED_PROVIDERS = ['openai', 'anthropic', 'openrouter'] as const;
export type SupportedProvider = (typeof SUPPORTED_PROVIDERS)[number];

export interface ApiKeyValidationResult {
  valid: boolean;
  error?: string;
  sanitizedKey?: string;
}

/**
 * API Key validation service
 * Validates format and sanitizes keys before storage
 */
export class ApiKeyValidationService {
  private static instance: ApiKeyValidationService;

  private constructor() {}

  static getInstance(): ApiKeyValidationService {
    if (!ApiKeyValidationService.instance) {
      ApiKeyValidationService.instance = new ApiKeyValidationService();
    }
    return ApiKeyValidationService.instance;
  }

  /**
   * Validates an API key for a specific provider
   */
  validate(provider: string, apiKey: string): ApiKeyValidationResult {
    // Sanitize: trim whitespace
    const sanitized = apiKey.trim();

    if (!sanitized) {
      return { valid: false, error: 'API key cannot be empty' };
    }

    // Check for obviously invalid content
    if (sanitized.includes(' ') || sanitized.includes('\n')) {
      return { valid: false, error: 'API key cannot contain spaces or newlines' };
    }

    // Get provider-specific pattern
    const pattern = API_KEY_PATTERNS[provider.toLowerCase()];

    if (!pattern) {
      // Unknown provider - basic validation only
      if (sanitized.length < 16) {
        return { valid: false, error: 'API key seems too short' };
      }
      if (sanitized.length > 256) {
        return { valid: false, error: 'API key seems too long' };
      }
      return { valid: true, sanitizedKey: sanitized };
    }

    // Validate against known pattern
    if (!pattern.regex.test(sanitized)) {
      return {
        valid: false,
        error: `Invalid ${PROVIDER_DISPLAY_NAMES[provider] || provider} API key format. Expected: ${pattern.format}`,
      };
    }

    return { valid: true, sanitizedKey: sanitized };
  }

  /**
   * Gets supported providers
   */
  getSupportedProviders(): string[] {
    return Object.keys(API_KEY_PATTERNS);
  }

  /**
   * Gets format hint for a provider
   */
  getFormatHint(provider: string): string | null {
    const pattern = API_KEY_PATTERNS[provider.toLowerCase()];
    return pattern?.format || null;
  }

  /**
   * Gets example format for a provider
   */
  getExample(provider: string): string | null {
    const pattern = API_KEY_PATTERNS[provider.toLowerCase()];
    return pattern?.example || null;
  }

  /**
   * Masks an API key for display (shows first/last few chars)
   */
  maskKey(apiKey: string): string {
    if (apiKey.length <= 12) {
      return '*'.repeat(apiKey.length);
    }
    const prefix = apiKey.substring(0, 6);
    const suffix = apiKey.substring(apiKey.length - 4);
    return `${prefix}${'*'.repeat(8)}${suffix}`;
  }
}

export const apiKeyValidationService = ApiKeyValidationService.getInstance();
