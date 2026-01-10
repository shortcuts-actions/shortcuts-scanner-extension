import { describe, expect, it } from 'vitest';
import type { ActionColor } from '../types';
import {
  getActionColorScheme,
  getActionHexColor,
  getVariableColorScheme,
  SHORTCUT_COLORS,
  VARIABLE_TYPE_COLORS,
} from './colorUtils';

describe('colorUtils', () => {
  describe('getActionColorScheme', () => {
    it('should map "Red" to "red"', () => {
      expect(getActionColorScheme('Red')).toBe('red');
    });

    it('should map "Yellow" to "yellow"', () => {
      expect(getActionColorScheme('Yellow')).toBe('yellow');
    });

    it('should map "Orange" to "orange"', () => {
      expect(getActionColorScheme('Orange')).toBe('orange');
    });

    it('should map "Green" to "green"', () => {
      expect(getActionColorScheme('Green')).toBe('green');
    });

    it('should map "Blue" to "blue"', () => {
      expect(getActionColorScheme('Blue')).toBe('blue');
    });

    it('should map "LightBlue" to "cyan"', () => {
      expect(getActionColorScheme('LightBlue')).toBe('cyan');
    });

    it('should map "Purple" to "purple"', () => {
      expect(getActionColorScheme('Purple')).toBe('purple');
    });

    it('should map "Gray" to "gray"', () => {
      expect(getActionColorScheme('Gray')).toBe('gray');
    });

    it('should default to "gray" for undefined', () => {
      expect(getActionColorScheme(undefined)).toBe('gray');
    });

    it('should default to "gray" for unknown colors', () => {
      expect(getActionColorScheme('Unknown' as ActionColor)).toBe('gray');
    });
  });

  describe('getVariableColorScheme', () => {
    it('should map "Variable" to "purple"', () => {
      expect(getVariableColorScheme('Variable')).toBe('purple');
    });

    it('should map "ActionOutput" to "blue"', () => {
      expect(getVariableColorScheme('ActionOutput')).toBe('blue');
    });

    it('should map "CurrentDate" to "green"', () => {
      expect(getVariableColorScheme('CurrentDate')).toBe('green');
    });

    it('should map "Clipboard" to "orange"', () => {
      expect(getVariableColorScheme('Clipboard')).toBe('orange');
    });

    it('should map "Ask" to "cyan"', () => {
      expect(getVariableColorScheme('Ask')).toBe('cyan');
    });

    it('should map "ShortcutInput" to "teal"', () => {
      expect(getVariableColorScheme('ShortcutInput')).toBe('teal');
    });

    it('should map "ExtensionInput" to "pink"', () => {
      expect(getVariableColorScheme('ExtensionInput')).toBe('pink');
    });

    it('should default to "blue" for undefined', () => {
      expect(getVariableColorScheme(undefined)).toBe('blue');
    });

    it('should default to "blue" for unknown types', () => {
      expect(getVariableColorScheme('UnknownType')).toBe('blue');
    });
  });

  describe('getActionHexColor', () => {
    it('should return hex color for "Red"', () => {
      expect(getActionHexColor('Red')).toBe('#ff3b2f');
    });

    it('should return hex color for "Blue"', () => {
      expect(getActionHexColor('Blue')).toBe('#007aff');
    });

    it('should return hex color for "LightBlue"', () => {
      expect(getActionHexColor('LightBlue')).toBe('#55bef0');
    });

    it('should return hex color for "Purple"', () => {
      expect(getActionHexColor('Purple')).toBe('#5e5ce6');
    });

    it('should default to Gray hex for undefined', () => {
      expect(getActionHexColor(undefined)).toBe(SHORTCUT_COLORS.Gray.hex);
    });

    it('should default to Gray hex for unknown colors', () => {
      expect(getActionHexColor('Unknown' as ActionColor)).toBe(SHORTCUT_COLORS.Gray.hex);
    });
  });

  describe('SHORTCUT_COLORS constant', () => {
    it('should have all ActionColor values defined', () => {
      const expectedColors: ActionColor[] = [
        'Red',
        'Yellow',
        'Orange',
        'Green',
        'Blue',
        'LightBlue',
        'Purple',
        'Gray',
      ];

      for (const color of expectedColors) {
        expect(SHORTCUT_COLORS[color]).toBeDefined();
        expect(SHORTCUT_COLORS[color]).toHaveProperty('hex');
        expect(SHORTCUT_COLORS[color]).toHaveProperty('chakra');
      }
    });

    it('should have valid hex color format', () => {
      const hexRegex = /^#[0-9a-f]{6}$/i;

      for (const color of Object.values(SHORTCUT_COLORS)) {
        expect(color.hex).toMatch(hexRegex);
      }
    });
  });

  describe('VARIABLE_TYPE_COLORS constant', () => {
    it('should have all expected variable types', () => {
      const expectedTypes = [
        'Variable',
        'ActionOutput',
        'CurrentDate',
        'Clipboard',
        'Ask',
        'ShortcutInput',
        'ExtensionInput',
      ];

      for (const type of expectedTypes) {
        expect(VARIABLE_TYPE_COLORS[type]).toBeDefined();
        expect(typeof VARIABLE_TYPE_COLORS[type]).toBe('string');
      }
    });
  });
});
