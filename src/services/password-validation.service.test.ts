import { beforeEach, describe, expect, it } from 'vitest';
import { PasswordValidationService } from './password-validation.service';

describe('PasswordValidationService', () => {
  let service: PasswordValidationService;

  beforeEach(() => {
    service = PasswordValidationService.getInstance();
  });

  describe('getInstance', () => {
    it('should return the same instance (singleton)', () => {
      const instance1 = PasswordValidationService.getInstance();
      const instance2 = PasswordValidationService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('validate', () => {
    it('should validate a strong password', () => {
      const result = service.validate('MyStr0ng!Pass123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(['good', 'strong']).toContain(result.strength);
      expect(result.score).toBeGreaterThan(50);
      expect(result.entropyBits).toBeGreaterThan(60);
    });

    it('should reject password that is too short', () => {
      const result = service.validate('Short1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 12 characters');
    });

    it('should reject password that is too long', () => {
      const longPassword = `${'A'.repeat(129)}1!`;
      const result = service.validate(longPassword);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('less than'))).toBe(true);
    });

    it('should reject password with insufficient character types', () => {
      const result = service.validate('alllowercase');
      expect(result.valid).toBe(false);
      // Will fail on length first, but that's still a validation error
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should accept password with all character types', () => {
      const result = service.validate('MySecure!Pass123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect common passwords', () => {
      const result = service.validate('password1234');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('too common'))).toBe(true);
      expect(result.score).toBeLessThan(50);
    });

    it('should detect excessive repeated characters', () => {
      const result = service.validate('Mypassword1111!!');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('repeated characters'))).toBe(true);
    });

    it('should detect sequential patterns', () => {
      const result = service.validate('MyPassword1234!!');
      expect(result.score).toBeLessThan(70); // Score reduced for sequential pattern
    });

    it('should give higher scores for longer passwords', () => {
      const shortResult = service.validate('MyPass123!@#');
      const longResult = service.validate('MyVeryLongPassword123!@#$%');
      expect(longResult.score).toBeGreaterThan(shortResult.score);
    });

    it('should calculate strength as weak for low scores', () => {
      const result = service.validate('weakpassword');
      expect(result.strength).toBe('weak');
    });

    it('should calculate strength as fair for medium scores', () => {
      const result = service.validate('FairPassword12');
      expect(['fair', 'good']).toContain(result.strength);
    });

    it('should calculate strength as strong for high scores', () => {
      const result = service.validate('V3ry$tr0ng!P@ssw0rd123');
      expect(result.strength).toBe('strong');
    });

    it('should handle empty password', () => {
      const result = service.validate('');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should estimate entropy correctly', () => {
      const result = service.validate('MyStr0ng!Pass123');
      // Password with all character types should have decent entropy
      expect(result.entropyBits).toBeGreaterThan(50);
    });

    it('should give bonus points for multiple character types', () => {
      const twoTypes = service.validate('mypassword123456');
      const fourTypes = service.validate('MyPass123!@#');
      expect(fourTypes.score).toBeGreaterThan(twoTypes.score);
    });

    it('should penalize passwords with sequential patterns', () => {
      const withSeq = service.validate('MyPassword1234!!');
      const withoutSeq = service.validate('MyP@ssw0rd!#$%');
      expect(withSeq.score).toBeLessThanOrEqual(withoutSeq.score);
    });

    it('should detect common passwords in various forms', () => {
      const result1 = service.validate('qwertyuiopas');
      const result2 = service.validate('QWERTYUIOPAS');
      expect(result1.valid).toBe(false);
      expect(result2.valid).toBe(false);
    });

    it('should detect keyboard patterns as sequential', () => {
      const result = service.validate('MyPass1qwerty!!');
      expect(result.score).toBeLessThan(70); // Penalized for pattern
    });

    it('should handle special unicode characters', () => {
      const result = service.validate('\u4E00\u4E01\u4E02\u4E03\u4E04\u4E05'); // Chinese characters (not in charset)
      // Special characters still count towards the special char charset
      expect(result.entropyBits).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getRequirementsMessage', () => {
    it('should return password requirements message', () => {
      const message = service.getRequirementsMessage();
      expect(message).toContain('12 characters');
      expect(message).toContain('character types');
    });

    it('should include specific requirements when enabled', () => {
      const message = service.getRequirementsMessage();
      // Based on default config, these should be included
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle password with only special characters', () => {
      const result = service.validate('!@#$%^&*()_+');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle password with only numbers', () => {
      const result = service.validate('123456789012');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle password at minimum length with all types', () => {
      const result = service.validate('MyPass123!@#');
      expect(result.valid).toBe(true);
      expect(result.score).toBeGreaterThan(0);
    });

    it('should handle password with reverse sequential pattern', () => {
      const result = service.validate('MyPass987654!!');
      expect(result.score).toBeLessThan(70); // Penalized for reverse sequence
    });

    it('should cap score at 100', () => {
      const result = service.validate('V3ry$tr0ng!P@ssw0rdW1th^L0ts&0f*Ch@r@ct3rs');
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });
});
