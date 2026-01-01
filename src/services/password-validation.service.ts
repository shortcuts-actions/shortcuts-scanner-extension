// Password validation service
// Enforces minimum security requirements per OWASP guidelines

import { SECURITY_CONFIG } from '../config/security.config';

const { password: passwordConfig } = SECURITY_CONFIG;

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong';
  score: number; // 0-100
  entropyBits: number; // Estimated entropy in bits (72+ recommended for API keys)
}

// Common passwords to reject (expand this list in production)
const COMMON_PASSWORDS = new Set([
  'password1234',
  'password12345',
  '123456789012',
  'qwertyuiopas',
  'abcdefghijkl',
  'letmein12345',
  'welcome12345',
  'admin1234567',
  'iloveyou1234',
  'monkey123456',
  'dragon123456',
  'master123456',
  'login1234567',
  'princess1234',
  'qwerty123456',
]);

/**
 * Password validation service
 * Enforces minimum security requirements
 */
export class PasswordValidationService {
  private static instance: PasswordValidationService;

  private constructor() {}

  static getInstance(): PasswordValidationService {
    if (!PasswordValidationService.instance) {
      PasswordValidationService.instance = new PasswordValidationService();
    }
    return PasswordValidationService.instance;
  }

  /**
   * Validates password against security requirements
   */
  validate(password: string): PasswordValidationResult {
    const errors: string[] = [];
    let score = 0;

    // Length check
    if (password.length < passwordConfig.minLength) {
      errors.push(`Password must be at least ${passwordConfig.minLength} characters`);
    } else {
      score += 20;
      // Bonus for longer passwords
      score += Math.min(20, (password.length - passwordConfig.minLength) * 2);
    }

    if (password.length > passwordConfig.maxLength) {
      errors.push(`Password must be less than ${passwordConfig.maxLength} characters`);
    }

    // Character type checks
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    const characterTypes = [hasUppercase, hasLowercase, hasNumbers, hasSpecial];
    const typeCount = characterTypes.filter(Boolean).length;

    if (typeCount < passwordConfig.minCharacterTypes) {
      errors.push(
        `Password must contain at least ${passwordConfig.minCharacterTypes} of: ` +
          'uppercase letters, lowercase letters, numbers, special characters',
      );
    } else {
      score += typeCount * 10;
    }

    // Specific requirements (if configured)
    if (passwordConfig.requireUppercase && !hasUppercase) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (passwordConfig.requireLowercase && !hasLowercase) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (passwordConfig.requireNumbers && !hasNumbers) {
      errors.push('Password must contain at least one number');
    }
    if (passwordConfig.requireSpecial && !hasSpecial) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common passwords
    if (this.isCommonPassword(password)) {
      errors.push('Password is too common. Please choose a more unique password.');
      score = Math.max(0, score - 30);
    }

    // Check for repeated characters
    if (this.hasExcessiveRepeats(password)) {
      errors.push('Password contains too many repeated characters');
      score = Math.max(0, score - 20);
    }

    // Check for sequential patterns
    if (this.hasSequentialPattern(password)) {
      score = Math.max(0, score - 10);
    }

    // Determine strength
    const strength = this.calculateStrength(score);

    // Calculate entropy
    const entropyBits = this.estimateEntropy(password);

    return {
      valid: errors.length === 0,
      errors,
      strength,
      score: Math.min(100, score),
      entropyBits,
    };
  }

  private isCommonPassword(password: string): boolean {
    const normalized = password.toLowerCase().replace(/[^a-z0-9]/g, '');
    return COMMON_PASSWORDS.has(normalized) || COMMON_PASSWORDS.has(password.toLowerCase());
  }

  private hasExcessiveRepeats(password: string): boolean {
    // Check for 4+ consecutive identical characters
    return /(.)\1{3,}/.test(password);
  }

  private hasSequentialPattern(password: string): boolean {
    const sequences = [
      'abcdefghijklmnopqrstuvwxyz',
      'zyxwvutsrqponmlkjihgfedcba',
      '01234567890',
      '09876543210',
      'qwertyuiop',
      'asdfghjkl',
      'zxcvbnm',
    ];

    const lower = password.toLowerCase();
    for (const seq of sequences) {
      for (let i = 0; i <= seq.length - 4; i++) {
        if (lower.includes(seq.substring(i, i + 4))) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Estimates password entropy in bits
   * Recommended minimum: 72 bits for API key protection
   */
  private estimateEntropy(password: string): number {
    let charsetSize = 0;
    if (/[a-z]/.test(password)) charsetSize += 26;
    if (/[A-Z]/.test(password)) charsetSize += 26;
    if (/[0-9]/.test(password)) charsetSize += 10;
    if (/[^A-Za-z0-9]/.test(password)) charsetSize += 32;

    if (charsetSize === 0) return 0;

    // Entropy = log2(charsetSize^length)
    return Math.floor(password.length * Math.log2(charsetSize));
  }

  private calculateStrength(score: number): 'weak' | 'fair' | 'good' | 'strong' {
    if (score < 30) return 'weak';
    if (score < 50) return 'fair';
    if (score < 70) return 'good';
    return 'strong';
  }

  /**
   * Generates password requirements message for UI
   */
  getRequirementsMessage(): string {
    const requirements = [
      `At least ${passwordConfig.minLength} characters`,
      `At least ${passwordConfig.minCharacterTypes} character types (uppercase, lowercase, numbers, special)`,
    ];

    if (passwordConfig.requireUppercase) requirements.push('One uppercase letter');
    if (passwordConfig.requireLowercase) requirements.push('One lowercase letter');
    if (passwordConfig.requireNumbers) requirements.push('One number');
    if (passwordConfig.requireSpecial) requirements.push('One special character');

    return requirements.join('\n');
  }
}

export const passwordValidationService = PasswordValidationService.getInstance();
