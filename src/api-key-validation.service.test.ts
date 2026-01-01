import { beforeEach, describe, expect, it } from 'vitest';
import {
  ApiKeyValidationService,
  PROVIDER_DISPLAY_NAMES,
  SUPPORTED_PROVIDERS,
} from './api-key-validation.service';

describe('ApiKeyValidationService', () => {
  let service: ApiKeyValidationService;

  beforeEach(() => {
    service = ApiKeyValidationService.getInstance();
  });

  describe('getInstance', () => {
    it('should return the same instance (singleton)', () => {
      const instance1 = ApiKeyValidationService.getInstance();
      const instance2 = ApiKeyValidationService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('validate - OpenAI', () => {
    it('should validate legacy OpenAI API key format', () => {
      const result = service.validate('openai', 'sk-abc123def456ghi789jkl');
      expect(result.valid).toBe(true);
      expect(result.sanitizedKey).toBe('sk-abc123def456ghi789jkl');
      expect(result.error).toBeUndefined();
    });

    it('should validate OpenAI project key format', () => {
      const result = service.validate('openai', 'sk-proj-abc123def456ghi789jkl');
      expect(result.valid).toBe(true);
      expect(result.sanitizedKey).toBe('sk-proj-abc123def456ghi789jkl');
    });

    it('should validate OpenAI service account key format', () => {
      const result = service.validate('openai', 'sk-svcacct-abc123def456ghi789jkl');
      expect(result.valid).toBe(true);
      expect(result.sanitizedKey).toBe('sk-svcacct-abc123def456ghi789jkl');
    });

    it('should reject invalid OpenAI key format', () => {
      const result = service.validate('openai', 'invalid-key-format');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid OpenAI API key format');
    });

    it('should reject OpenAI key that is too short', () => {
      const result = service.validate('openai', 'sk-abc');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('validate - Anthropic', () => {
    it('should validate Anthropic API key format (api03)', () => {
      const validKey = `sk-ant-api03-${'a'.repeat(40)}`;
      const result = service.validate('anthropic', validKey);
      expect(result.valid).toBe(true);
      expect(result.sanitizedKey).toBe(validKey);
    });

    it('should validate Anthropic API key with longer suffix', () => {
      const validKey = `sk-ant-api03-${'a'.repeat(50)}`;
      const result = service.validate('anthropic', validKey);
      expect(result.valid).toBe(true);
    });

    it('should validate Anthropic API key with different version', () => {
      const validKey = `sk-ant-xyz-${'a'.repeat(40)}`;
      const result = service.validate('anthropic', validKey);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid Anthropic key format', () => {
      const result = service.validate('anthropic', 'sk-invalid-format');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid Anthropic API key format');
    });

    it('should reject Anthropic key with too short suffix', () => {
      const result = service.validate('anthropic', 'sk-ant-api03-short');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('validate - OpenRouter', () => {
    it('should validate OpenRouter API key format', () => {
      const validKey = `sk-or-v1-${'a'.repeat(64)}`;
      const result = service.validate('openrouter', validKey);
      expect(result.valid).toBe(true);
      expect(result.sanitizedKey).toBe(validKey);
    });

    it('should reject OpenRouter key with wrong suffix length', () => {
      const result = service.validate('openrouter', `sk-or-v1-${'a'.repeat(50)}`);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject invalid OpenRouter key format', () => {
      const result = service.validate('openrouter', 'invalid-openrouter-key');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('validate - General validation', () => {
    it('should trim whitespace from API keys', () => {
      const result = service.validate('openai', '  sk-abc123def456ghi789jkl  ');
      expect(result.valid).toBe(true);
      expect(result.sanitizedKey).toBe('sk-abc123def456ghi789jkl');
    });

    it('should reject empty API key', () => {
      const result = service.validate('openai', '');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('API key cannot be empty');
    });

    it('should reject API key with spaces', () => {
      const result = service.validate('openai', 'sk-abc 123def456');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('API key cannot contain spaces or newlines');
    });

    it('should reject API key with newlines', () => {
      const result = service.validate('openai', 'sk-abc\n123def456');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('API key cannot contain spaces or newlines');
    });

    it('should handle trimmed whitespace-only string', () => {
      const result = service.validate('openai', '   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('API key cannot be empty');
    });
  });

  describe('validate - Unknown provider', () => {
    it('should apply basic validation for unknown provider', () => {
      const result = service.validate('unknown-provider', 'a'.repeat(20));
      expect(result.valid).toBe(true);
      expect(result.sanitizedKey).toBe('a'.repeat(20));
    });

    it('should reject too short key for unknown provider', () => {
      const result = service.validate('unknown-provider', 'shortkey');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('API key seems too short');
    });

    it('should reject too long key for unknown provider', () => {
      const result = service.validate('unknown-provider', 'a'.repeat(300));
      expect(result.valid).toBe(false);
      expect(result.error).toBe('API key seems too long');
    });

    it('should accept key at upper limit for unknown provider', () => {
      const result = service.validate('unknown-provider', 'a'.repeat(256));
      expect(result.valid).toBe(true);
    });

    it('should accept key at lower limit for unknown provider', () => {
      const result = service.validate('unknown-provider', 'a'.repeat(16));
      expect(result.valid).toBe(true);
    });
  });

  describe('getSupportedProviders', () => {
    it('should return list of supported providers', () => {
      const providers = service.getSupportedProviders();
      expect(providers).toContain('openai');
      expect(providers).toContain('anthropic');
      expect(providers).toContain('openrouter');
      expect(providers.length).toBeGreaterThan(0);
    });

    it('should match SUPPORTED_PROVIDERS constant', () => {
      const providers = service.getSupportedProviders();
      SUPPORTED_PROVIDERS.forEach((provider) => {
        expect(providers).toContain(provider);
      });
    });
  });

  describe('getFormatHint', () => {
    it('should return format hint for OpenAI', () => {
      const hint = service.getFormatHint('openai');
      expect(hint).toBeDefined();
      expect(hint).toContain('sk-');
    });

    it('should return format hint for Anthropic', () => {
      const hint = service.getFormatHint('anthropic');
      expect(hint).toBeDefined();
      expect(hint).toContain('sk-ant-');
    });

    it('should return format hint for OpenRouter', () => {
      const hint = service.getFormatHint('openrouter');
      expect(hint).toBeDefined();
      expect(hint).toContain('sk-or-v1-');
    });

    it('should return null for unknown provider', () => {
      const hint = service.getFormatHint('unknown-provider');
      expect(hint).toBeNull();
    });

    it('should handle case-insensitive provider name', () => {
      const hint = service.getFormatHint('OPENAI');
      expect(hint).toBeDefined();
      expect(hint).toContain('sk-');
    });
  });

  describe('getExample', () => {
    it('should return example for OpenAI', () => {
      const example = service.getExample('openai');
      expect(example).toBeDefined();
      expect(example).toContain('sk-');
    });

    it('should return example for Anthropic', () => {
      const example = service.getExample('anthropic');
      expect(example).toBeDefined();
      expect(example).toContain('sk-ant-');
    });

    it('should return example for OpenRouter', () => {
      const example = service.getExample('openrouter');
      expect(example).toBeDefined();
      expect(example).toContain('sk-or-v1-');
    });

    it('should return null for unknown provider', () => {
      const example = service.getExample('unknown-provider');
      expect(example).toBeNull();
    });
  });

  describe('maskKey', () => {
    it('should mask a long API key showing first 6 and last 4 characters', () => {
      const masked = service.maskKey('sk-abc123def456ghi789jkl');
      expect(masked).toBe('sk-abc********9jkl');
      expect(masked.length).toBe(18); // 6 + 8 + 4
    });

    it('should mask a short key completely', () => {
      const masked = service.maskKey('shortkey');
      expect(masked).toBe('********');
    });

    it('should mask a key exactly at threshold (12 chars)', () => {
      const masked = service.maskKey('a'.repeat(12));
      expect(masked).toBe('*'.repeat(12));
    });

    it('should mask a key just above threshold (13 chars)', () => {
      const masked = service.maskKey('a'.repeat(13));
      expect(masked).toMatch(/^a{6}\*{8}.{4}$/);
    });

    it('should mask very long API key', () => {
      const longKey = `sk-${'a'.repeat(100)}`;
      const masked = service.maskKey(longKey);
      expect(masked).toContain('sk-aaa');
      expect(masked).toContain('aaaa');
      expect(masked).toContain('********');
      expect(masked.length).toBe(18);
    });
  });

  describe('PROVIDER_DISPLAY_NAMES', () => {
    it('should have display names for all supported providers', () => {
      SUPPORTED_PROVIDERS.forEach((provider) => {
        expect(PROVIDER_DISPLAY_NAMES[provider]).toBeDefined();
        expect(PROVIDER_DISPLAY_NAMES[provider].length).toBeGreaterThan(0);
      });
    });
  });

  describe('case sensitivity', () => {
    it('should handle uppercase provider names', () => {
      const result = service.validate('OPENAI', 'sk-abc123def456ghi789jkl');
      expect(result.valid).toBe(true);
    });

    it('should handle mixed case provider names', () => {
      const result = service.validate('OpenAI', 'sk-abc123def456ghi789jkl');
      expect(result.valid).toBe(true);
    });
  });
});
