import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  extractShortcutData,
  getActionCount,
  getActionName,
  getClientVersion,
  getIconInfo,
  parsePlist,
} from './parser';
import type { ShortcutData } from './types';

// Mock @plist/parse
vi.mock('@plist/parse', () => ({
  parse: vi.fn(),
}));

describe('parser', () => {
  let mockParse: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const plistModule = await import('@plist/parse');
    mockParse = plistModule.parse as ReturnType<typeof vi.fn>;

    vi.clearAllMocks();
    // Default mock implementation
    mockParse.mockImplementation((buffer: ArrayBuffer) => {
      if (buffer.byteLength === 0) {
        throw new Error('Empty buffer');
      }
      return {
        WFWorkflowActions: [
          { WFWorkflowActionIdentifier: 'is.workflow.actions.gettext' },
          { WFWorkflowActionIdentifier: 'is.workflow.actions.showresult' },
        ],
        WFWorkflowClientVersion: '1234',
        WFWorkflowClientRelease: '16.0',
        WFWorkflowIcon: {
          WFWorkflowIconStartColor: 4282601983,
          WFWorkflowIconGlyphNumber: 59511,
        },
      };
    });
  });

  describe('parsePlist', () => {
    it('should parse a valid plist buffer', () => {
      const buffer = new ArrayBuffer(10);
      const result = parsePlist(buffer);

      expect(result).toBeDefined();
      expect(result.WFWorkflowActions).toBeDefined();
    });

    it('should throw error for empty buffer', () => {
      const buffer = new ArrayBuffer(0);
      expect(() => parsePlist(buffer)).toThrow('Failed to parse plist');
    });

    it('should sanitize BigInt values', () => {
      mockParse.mockReturnValueOnce({
        number: BigInt(12345),
        nested: {
          bigNum: BigInt(67890),
        },
        array: [BigInt(111), BigInt(222)],
      });

      const buffer = new ArrayBuffer(10);
      const result = parsePlist(buffer);

      expect(typeof result.number).toBe('number');
      expect(typeof result.nested.bigNum).toBe('number');
      expect(typeof result.array[0]).toBe('number');
      expect(typeof result.array[1]).toBe('number');
    });

    it('should handle BigInt values exceeding safe integer range', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const largeBigInt = BigInt(Number.MAX_SAFE_INTEGER) + BigInt(1000);
      mockParse.mockReturnValueOnce({
        largeNumber: largeBigInt,
      });

      const buffer = new ArrayBuffer(10);
      const result = parsePlist(buffer);

      expect(typeof result.largeNumber).toBe('number');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('exceeds safe integer range'),
      );

      consoleSpy.mockRestore();
    });

    it('should preserve non-BigInt values', () => {
      mockParse.mockReturnValueOnce({
        string: 'test',
        number: 123,
        boolean: true,
        null: null,
        array: [1, 'two', true],
      });

      const buffer = new ArrayBuffer(10);
      const result = parsePlist(buffer);

      expect(result.string).toBe('test');
      expect(result.number).toBe(123);
      expect(result.boolean).toBe(true);
      expect(result.null).toBeNull();
      expect(result.array).toEqual([1, 'two', true]);
    });
  });

  describe('extractShortcutData', () => {
    it('should extract valid shortcut data', () => {
      const mockData = {
        WFWorkflowActions: [{ WFWorkflowActionIdentifier: 'is.workflow.actions.gettext' }],
        WFWorkflowClientVersion: '1234',
      };

      const result = extractShortcutData(mockData);
      expect(result).toEqual(mockData);
    });

    it('should throw error for null input', () => {
      expect(() => extractShortcutData(null)).toThrow('Invalid plist data structure');
    });

    it('should throw error for non-object input', () => {
      expect(() => extractShortcutData('not an object')).toThrow('Invalid plist data structure');
    });

    it('should throw error for missing WFWorkflowActions', () => {
      const mockData = {
        WFWorkflowClientVersion: '1234',
      };

      expect(() => extractShortcutData(mockData)).toThrow('Missing WFWorkflowActions array');
    });

    it('should throw error for non-array WFWorkflowActions', () => {
      const mockData = {
        WFWorkflowActions: 'not an array',
      };

      expect(() => extractShortcutData(mockData)).toThrow('Missing WFWorkflowActions array');
    });

    it('should accept empty WFWorkflowActions array', () => {
      const mockData = {
        WFWorkflowActions: [],
      };

      const result = extractShortcutData(mockData);
      expect(result.WFWorkflowActions).toEqual([]);
    });
  });

  describe('getActionName', () => {
    it('should extract action name from identifier', () => {
      const result = getActionName('is.workflow.actions.gettext');
      expect(result).toBe('Gettext');
    });

    it('should handle camelCase action names', () => {
      const result = getActionName('is.workflow.actions.showResult');
      expect(result).toBe('Show Result');
    });

    it('should handle multiple uppercase letters', () => {
      const result = getActionName('is.workflow.actions.getURLContents');
      expect(result).toBe('Get U R L Contents');
    });

    it('should handle single word identifier', () => {
      const result = getActionName('action');
      expect(result).toBe('Action');
    });

    it('should handle identifier without dots', () => {
      const result = getActionName('myCustomAction');
      expect(result).toBe('My Custom Action');
    });

    it('should handle all lowercase identifier', () => {
      const result = getActionName('is.workflow.actions.comment');
      expect(result).toBe('Comment');
    });

    it('should handle identifier with numbers', () => {
      const result = getActionName('is.workflow.actions.base64Encode');
      expect(result).toBe('Base64 Encode');
    });
  });

  describe('getActionCount', () => {
    it('should return count of actions', () => {
      const data: ShortcutData = {
        WFWorkflowActions: [
          { WFWorkflowActionIdentifier: 'action1' },
          { WFWorkflowActionIdentifier: 'action2' },
          { WFWorkflowActionIdentifier: 'action3' },
        ],
      };

      const result = getActionCount(data);
      expect(result).toBe(3);
    });

    it('should return 0 for empty actions array', () => {
      const data: ShortcutData = {
        WFWorkflowActions: [],
      };

      const result = getActionCount(data);
      expect(result).toBe(0);
    });

    it('should return 0 for undefined WFWorkflowActions', () => {
      const data: ShortcutData = {} as any;

      const result = getActionCount(data);
      expect(result).toBe(0);
    });

    it('should handle large action counts', () => {
      const actions = Array.from({ length: 1000 }, (_, i) => ({
        WFWorkflowActionIdentifier: `action${i}`,
      }));
      const data: ShortcutData = { WFWorkflowActions: actions };

      const result = getActionCount(data);
      expect(result).toBe(1000);
    });
  });

  describe('getClientVersion', () => {
    it('should return formatted version with both version and release', () => {
      const data: ShortcutData = {
        WFWorkflowActions: [],
        WFWorkflowClientVersion: '1234',
        WFWorkflowClientRelease: '16.0',
      };

      const result = getClientVersion(data);
      expect(result).toBe('16.0 (1234)');
    });

    it('should return version only when release is missing', () => {
      const data: ShortcutData = {
        WFWorkflowActions: [],
        WFWorkflowClientVersion: '1234',
      };

      const result = getClientVersion(data);
      expect(result).toBe('1234');
    });

    it('should return release only when version is missing', () => {
      const data: ShortcutData = {
        WFWorkflowActions: [],
        WFWorkflowClientRelease: '16.0',
      };

      const result = getClientVersion(data);
      expect(result).toBe('16.0');
    });

    it('should return Unknown when both are missing', () => {
      const data: ShortcutData = {
        WFWorkflowActions: [],
      };

      const result = getClientVersion(data);
      expect(result).toBe('Unknown');
    });

    it('should handle empty strings', () => {
      const data: ShortcutData = {
        WFWorkflowActions: [],
        WFWorkflowClientVersion: '',
        WFWorkflowClientRelease: '',
      };

      const result = getClientVersion(data);
      expect(result).toBe('Unknown');
    });
  });

  describe('getIconInfo', () => {
    it('should extract icon color and glyph', () => {
      const data: ShortcutData = {
        WFWorkflowActions: [],
        WFWorkflowIcon: {
          WFWorkflowIconStartColor: 4282601983,
          WFWorkflowIconGlyphNumber: 59511,
        },
      };

      const result = getIconInfo(data);
      expect(result.color).toBe(4282601983);
      expect(result.glyph).toBe(59511);
    });

    it('should return undefined values when icon is missing', () => {
      const data: ShortcutData = {
        WFWorkflowActions: [],
      };

      const result = getIconInfo(data);
      expect(result.color).toBeUndefined();
      expect(result.glyph).toBeUndefined();
    });

    it('should handle partial icon data (color only)', () => {
      const data: ShortcutData = {
        WFWorkflowActions: [],
        WFWorkflowIcon: {
          WFWorkflowIconStartColor: 4282601983,
        } as any,
      };

      const result = getIconInfo(data);
      expect(result.color).toBe(4282601983);
      expect(result.glyph).toBeUndefined();
    });

    it('should handle partial icon data (glyph only)', () => {
      const data: ShortcutData = {
        WFWorkflowActions: [],
        WFWorkflowIcon: {
          WFWorkflowIconGlyphNumber: 59511,
        } as any,
      };

      const result = getIconInfo(data);
      expect(result.color).toBeUndefined();
      expect(result.glyph).toBe(59511);
    });

    it('should handle zero values', () => {
      const data: ShortcutData = {
        WFWorkflowActions: [],
        WFWorkflowIcon: {
          WFWorkflowIconStartColor: 0,
          WFWorkflowIconGlyphNumber: 0,
        },
      };

      const result = getIconInfo(data);
      expect(result.color).toBe(0);
      expect(result.glyph).toBe(0);
    });
  });

  describe('sanitizeBigInt edge cases', () => {
    it('should handle deeply nested BigInt values', () => {
      mockParse.mockReturnValueOnce({
        level1: {
          level2: {
            level3: {
              bigNum: BigInt(123),
            },
          },
        },
      });

      const buffer = new ArrayBuffer(10);
      const result = parsePlist(buffer);

      expect(typeof result.level1.level2.level3.bigNum).toBe('number');
      expect(result.level1.level2.level3.bigNum).toBe(123);
    });

    it('should handle mixed arrays with BigInt and other types', () => {
      mockParse.mockReturnValueOnce({
        mixed: [BigInt(1), 'string', 3, true, null, { nested: BigInt(5) }],
      });

      const buffer = new ArrayBuffer(10);
      const result = parsePlist(buffer);

      expect(result.mixed[0]).toBe(1);
      expect(result.mixed[1]).toBe('string');
      expect(result.mixed[2]).toBe(3);
      expect(result.mixed[3]).toBe(true);
      expect(result.mixed[4]).toBeNull();
      expect(result.mixed[5].nested).toBe(5);
    });

    it('should handle objects with non-plain constructors', () => {
      class CustomClass {
        value = BigInt(123);
      }

      mockParse.mockReturnValueOnce({
        custom: new CustomClass(),
        date: new Date(),
      });

      const buffer = new ArrayBuffer(10);
      const result = parsePlist(buffer);

      // Non-plain objects should be returned as-is
      expect(result.custom).toBeInstanceOf(CustomClass);
      expect(result.date).toBeInstanceOf(Date);
    });
  });
});
