import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SESSION_SETTINGS,
  formatMinutes,
  INACTIVITY_TIMEOUT_MARKS,
  SESSION_EXPIRY_MARKS,
  SESSION_LIMITS,
  type SessionSettings,
} from './session-settings';

describe('session-settings', () => {
  describe('DEFAULT_SESSION_SETTINGS', () => {
    it('should have secure defaults', () => {
      expect(DEFAULT_SESSION_SETTINGS.persistSession).toBe(false);
      expect(DEFAULT_SESSION_SETTINGS.sessionExpiryMinutes).toBe(30);
      expect(DEFAULT_SESSION_SETTINGS.inactivityTimeoutMinutes).toBe(15);
    });

    it('should not persist session by default for security', () => {
      expect(DEFAULT_SESSION_SETTINGS.persistSession).toBe(false);
    });

    it('should have reasonable default session expiry', () => {
      expect(DEFAULT_SESSION_SETTINGS.sessionExpiryMinutes).toBe(30);
    });

    it('should have inactivity timeout less than session expiry', () => {
      expect(DEFAULT_SESSION_SETTINGS.inactivityTimeoutMinutes).toBeLessThan(
        DEFAULT_SESSION_SETTINGS.sessionExpiryMinutes,
      );
    });
  });

  describe('SESSION_LIMITS', () => {
    it('should have maximum expiry of 6 hours', () => {
      expect(SESSION_LIMITS.maxExpiryMinutes).toBe(360);
    });

    it('should have minimum expiry of 5 minutes', () => {
      expect(SESSION_LIMITS.minExpiryMinutes).toBe(5);
    });

    it('should show warning at 6 hours', () => {
      expect(SESSION_LIMITS.warningThresholdMinutes).toBe(360);
    });

    it('should have maximum inactivity of 1 hour', () => {
      expect(SESSION_LIMITS.maxInactivityMinutes).toBe(60);
    });

    it('should have minimum inactivity of 5 minutes', () => {
      expect(SESSION_LIMITS.minInactivityMinutes).toBe(5);
    });

    it('should have max inactivity less than or equal to max expiry', () => {
      expect(SESSION_LIMITS.maxInactivityMinutes).toBeLessThanOrEqual(
        SESSION_LIMITS.maxExpiryMinutes,
      );
    });

    it('should have consistent minimum limits', () => {
      expect(SESSION_LIMITS.minExpiryMinutes).toBe(SESSION_LIMITS.minInactivityMinutes);
    });
  });

  describe('SESSION_EXPIRY_MARKS', () => {
    it('should have 6 slider marks', () => {
      expect(SESSION_EXPIRY_MARKS).toHaveLength(6);
    });

    it('should start at minimum expiry', () => {
      expect(SESSION_EXPIRY_MARKS[0].value).toBe(SESSION_LIMITS.minExpiryMinutes);
    });

    it('should end at maximum expiry', () => {
      const lastMark = SESSION_EXPIRY_MARKS[SESSION_EXPIRY_MARKS.length - 1];
      expect(lastMark.value).toBe(SESSION_LIMITS.maxExpiryMinutes);
    });

    it('should have correct labels', () => {
      expect(SESSION_EXPIRY_MARKS[0].label).toBe('5m');
      expect(SESSION_EXPIRY_MARKS[1].label).toBe('30m');
      expect(SESSION_EXPIRY_MARKS[2].label).toBe('1h');
      expect(SESSION_EXPIRY_MARKS[5].label).toBe('6h');
    });

    it('should be in ascending order', () => {
      for (let i = 1; i < SESSION_EXPIRY_MARKS.length; i++) {
        expect(SESSION_EXPIRY_MARKS[i].value).toBeGreaterThan(SESSION_EXPIRY_MARKS[i - 1].value);
      }
    });
  });

  describe('INACTIVITY_TIMEOUT_MARKS', () => {
    it('should have 5 slider marks', () => {
      expect(INACTIVITY_TIMEOUT_MARKS).toHaveLength(5);
    });

    it('should start at minimum inactivity', () => {
      expect(INACTIVITY_TIMEOUT_MARKS[0].value).toBe(SESSION_LIMITS.minInactivityMinutes);
    });

    it('should end at maximum inactivity', () => {
      const lastMark = INACTIVITY_TIMEOUT_MARKS[INACTIVITY_TIMEOUT_MARKS.length - 1];
      expect(lastMark.value).toBe(SESSION_LIMITS.maxInactivityMinutes);
    });

    it('should have correct labels', () => {
      expect(INACTIVITY_TIMEOUT_MARKS[0].label).toBe('5m');
      expect(INACTIVITY_TIMEOUT_MARKS[1].label).toBe('15m');
      expect(INACTIVITY_TIMEOUT_MARKS[2].label).toBe('30m');
      expect(INACTIVITY_TIMEOUT_MARKS[4].label).toBe('60m');
    });

    it('should be in ascending order', () => {
      for (let i = 1; i < INACTIVITY_TIMEOUT_MARKS.length; i++) {
        expect(INACTIVITY_TIMEOUT_MARKS[i].value).toBeGreaterThan(
          INACTIVITY_TIMEOUT_MARKS[i - 1].value,
        );
      }
    });
  });

  describe('formatMinutes', () => {
    it('should format single minute', () => {
      expect(formatMinutes(1)).toBe('1 minute');
    });

    it('should format plural minutes', () => {
      expect(formatMinutes(5)).toBe('5 minutes');
      expect(formatMinutes(30)).toBe('30 minutes');
      expect(formatMinutes(45)).toBe('45 minutes');
    });

    it('should format exact hours', () => {
      expect(formatMinutes(60)).toBe('1 hour');
      expect(formatMinutes(120)).toBe('2 hours');
      expect(formatMinutes(180)).toBe('3 hours');
    });

    it('should format hours and minutes', () => {
      expect(formatMinutes(90)).toBe('1 hour 30 minutes');
      expect(formatMinutes(150)).toBe('2 hours 30 minutes');
      expect(formatMinutes(61)).toBe('1 hour 1 minute');
    });

    it('should handle zero minutes', () => {
      expect(formatMinutes(0)).toBe('0 minutes');
    });

    it('should handle large values', () => {
      expect(formatMinutes(360)).toBe('6 hours');
      expect(formatMinutes(365)).toBe('6 hours 5 minutes');
    });

    it('should use correct singular/plural forms', () => {
      expect(formatMinutes(1)).not.toContain('minutes');
      expect(formatMinutes(2)).toContain('minutes');
      expect(formatMinutes(60)).toContain('hour');
      expect(formatMinutes(60)).not.toContain('hours');
      expect(formatMinutes(120)).toContain('hours');
    });

    it('should format default session expiry correctly', () => {
      const result = formatMinutes(DEFAULT_SESSION_SETTINGS.sessionExpiryMinutes);
      expect(result).toBe('30 minutes');
    });

    it('should format default inactivity timeout correctly', () => {
      const result = formatMinutes(DEFAULT_SESSION_SETTINGS.inactivityTimeoutMinutes);
      expect(result).toBe('15 minutes');
    });

    it('should format all expiry marks correctly', () => {
      const formatted = SESSION_EXPIRY_MARKS.map((mark) => ({
        value: mark.value,
        formatted: formatMinutes(mark.value),
      }));

      expect(formatted[0].formatted).toBe('5 minutes');
      expect(formatted[1].formatted).toBe('30 minutes');
      expect(formatted[2].formatted).toBe('1 hour');
      expect(formatted[5].formatted).toBe('6 hours');
    });

    it('should format all inactivity marks correctly', () => {
      const formatted = INACTIVITY_TIMEOUT_MARKS.map((mark) => ({
        value: mark.value,
        formatted: formatMinutes(mark.value),
      }));

      expect(formatted[0].formatted).toBe('5 minutes');
      expect(formatted[1].formatted).toBe('15 minutes');
      expect(formatted[2].formatted).toBe('30 minutes');
      expect(formatted[4].formatted).toBe('1 hour');
    });
  });

  describe('SessionSettings type', () => {
    it('should allow valid settings', () => {
      const settings: SessionSettings = {
        persistSession: true,
        sessionExpiryMinutes: 60,
        inactivityTimeoutMinutes: 30,
      };

      expect(settings).toBeDefined();
      expect(settings.persistSession).toBe(true);
    });

    it('should match default settings structure', () => {
      const settings: SessionSettings = DEFAULT_SESSION_SETTINGS;

      expect(settings).toHaveProperty('persistSession');
      expect(settings).toHaveProperty('sessionExpiryMinutes');
      expect(settings).toHaveProperty('inactivityTimeoutMinutes');
    });
  });

  describe('security considerations', () => {
    it('should have secure defaults (no persistence)', () => {
      expect(DEFAULT_SESSION_SETTINGS.persistSession).toBe(false);
    });

    it('should have reasonable timeout defaults', () => {
      // Session should timeout within 1 hour
      expect(DEFAULT_SESSION_SETTINGS.sessionExpiryMinutes).toBeLessThanOrEqual(60);

      // Inactivity should timeout within 30 minutes
      expect(DEFAULT_SESSION_SETTINGS.inactivityTimeoutMinutes).toBeLessThanOrEqual(30);
    });

    it('should allow short timeouts for high security', () => {
      expect(SESSION_LIMITS.minExpiryMinutes).toBe(5);
      expect(SESSION_LIMITS.minInactivityMinutes).toBe(5);
    });

    it('should limit maximum timeouts', () => {
      // Max session shouldn't exceed 6 hours
      expect(SESSION_LIMITS.maxExpiryMinutes).toBeLessThanOrEqual(360);

      // Max inactivity shouldn't exceed 1 hour
      expect(SESSION_LIMITS.maxInactivityMinutes).toBeLessThanOrEqual(60);
    });
  });
});
