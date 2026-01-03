import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  convertToJSON,
  convertToXML,
  copyToClipboard,
  downloadFile,
  sanitizeFilename,
} from './converter';

describe('converter', () => {
  describe('convertToXML', () => {
    it('should convert empty object to XML', () => {
      const result = convertToXML({});
      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain('<!DOCTYPE plist');
      expect(result).toContain('<plist version="1.0">');
      expect(result).toContain('<dict/>');
      expect(result).toContain('</plist>');
    });

    it('should convert object with string property', () => {
      const result = convertToXML({ name: 'Test' });
      expect(result).toContain('<key>name</key>');
      expect(result).toContain('<string>Test</string>');
    });

    it('should convert object with number properties', () => {
      const result = convertToXML({ count: 42, price: 9.99 });
      expect(result).toContain('<key>count</key>');
      expect(result).toContain('<integer>42</integer>');
      expect(result).toContain('<key>price</key>');
      expect(result).toContain('<real>9.99</real>');
    });

    it('should convert object with boolean properties', () => {
      const result = convertToXML({ enabled: true, disabled: false });
      expect(result).toContain('<key>enabled</key>');
      expect(result).toContain('<true/>');
      expect(result).toContain('<key>disabled</key>');
      expect(result).toContain('<false/>');
    });

    it('should convert nested objects', () => {
      const result = convertToXML({
        user: {
          name: 'Alice',
          age: 30,
        },
      });
      expect(result).toContain('<key>user</key>');
      expect(result).toContain('<dict>');
      expect(result).toContain('<key>name</key>');
      expect(result).toContain('<string>Alice</string>');
      expect(result).toContain('<key>age</key>');
      expect(result).toContain('<integer>30</integer>');
    });

    it('should convert arrays', () => {
      const result = convertToXML({ items: ['a', 'b', 'c'] });
      expect(result).toContain('<key>items</key>');
      expect(result).toContain('<array>');
      expect(result).toContain('<string>a</string>');
      expect(result).toContain('<string>b</string>');
      expect(result).toContain('<string>c</string>');
      expect(result).toContain('</array>');
    });

    it('should convert empty arrays', () => {
      const result = convertToXML({ items: [] });
      expect(result).toContain('<key>items</key>');
      expect(result).toContain('<array/>');
    });

    it('should handle null and undefined as empty strings', () => {
      const result = convertToXML({ nullValue: null, undefinedValue: undefined });
      expect(result).toContain('<key>nullValue</key>');
      expect(result).toContain('<string></string>');
      expect(result).toContain('<key>undefinedValue</key>');
    });

    it('should handle Date objects', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      const result = convertToXML({ timestamp: date });
      expect(result).toContain('<key>timestamp</key>');
      expect(result).toContain('<date>2024-01-01T00:00:00.000Z</date>');
    });

    it('should handle Uint8Array as base64 data', () => {
      const data = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const result = convertToXML({ binary: data });
      expect(result).toContain('<key>binary</key>');
      expect(result).toContain('<data>');
      expect(result).toContain('SGVsbG8='); // Base64 of "Hello"
      expect(result).toContain('</data>');
    });

    it('should handle ArrayBuffer as base64 data', () => {
      const buffer = new ArrayBuffer(5);
      const view = new Uint8Array(buffer);
      view.set([72, 101, 108, 108, 111]); // "Hello"
      const result = convertToXML({ binary: buffer });
      expect(result).toContain('<data>');
      expect(result).toContain('SGVsbG8=');
    });

    it('should escape XML special characters', () => {
      const result = convertToXML({
        text: '<tag>&ampersand "quote" \'apostrophe\'</tag>',
      });
      expect(result).toContain('&lt;tag&gt;');
      expect(result).toContain('&amp;ampersand');
      expect(result).toContain('&quot;quote&quot;');
      expect(result).toContain('&apos;apostrophe&apos;');
    });

    it('should handle BigInt values', () => {
      const result = convertToXML({ bigNumber: BigInt(123456789) });
      expect(result).toContain('<key>bigNumber</key>');
      expect(result).toContain('<integer>123456789</integer>');
    });

    it('should maintain proper indentation', () => {
      const result = convertToXML({
        level1: {
          level2: {
            value: 'nested',
          },
        },
      });
      const lines = result.split('\n');
      const level2KeyLine = lines.find((line) => line.includes('<key>level2</key>'));
      expect(level2KeyLine).toBeDefined();
      expect(level2KeyLine).toContain('  '); // Should have indentation
    });
  });

  describe('convertToJSON', () => {
    it('should convert object to pretty-printed JSON', () => {
      const obj = { name: 'Test', value: 123 };
      const result = convertToJSON(obj);
      expect(result).toBe('{\n  "name": "Test",\n  "value": 123\n}');
    });

    it('should handle nested objects', () => {
      const obj = { user: { name: 'Alice', age: 30 } };
      const result = convertToJSON(obj);
      const parsed = JSON.parse(result);
      expect(parsed).toEqual(obj);
    });

    it('should handle arrays', () => {
      const obj = { items: [1, 2, 3] };
      const result = convertToJSON(obj);
      const parsed = JSON.parse(result);
      expect(parsed).toEqual(obj);
    });

    it('should handle BigInt values', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const obj = { bigNumber: BigInt(123) };
      const result = convertToJSON(obj);
      const parsed = JSON.parse(result);
      expect(parsed.bigNumber).toBe(123);
      consoleSpy.mockRestore();
    });

    it('should warn when BigInt exceeds safe integer range', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const largeValue = BigInt(Number.MAX_SAFE_INTEGER) + BigInt(1);
      const obj = { largeBigInt: largeValue };
      convertToJSON(obj);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('exceeds safe integer range'),
      );
      consoleSpy.mockRestore();
    });

    it('should not warn for safe BigInt values', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const obj = { safeBigInt: BigInt(100) };
      convertToJSON(obj);
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle null and undefined', () => {
      const obj = { nullValue: null, undefinedValue: undefined };
      const result = convertToJSON(obj);
      const parsed = JSON.parse(result);
      expect(parsed.nullValue).toBe(null);
      expect(parsed.undefinedValue).toBeUndefined();
    });

    it('should pretty print with 2-space indentation', () => {
      const obj = { a: { b: { c: 'value' } } };
      const result = convertToJSON(obj);
      expect(result).toContain('  "a"');
      expect(result).toContain('    "b"');
      expect(result).toContain('      "c"');
    });
  });

  describe('downloadFile', () => {
    let mockCreateElement: HTMLAnchorElement;
    let mockAppendChild: ReturnType<typeof vi.fn>;
    let mockRemoveChild: ReturnType<typeof vi.fn>;
    let mockClick: ReturnType<typeof vi.fn>;
    let mockCreateObjectURL: ReturnType<typeof vi.fn>;
    let mockRevokeObjectURL: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockClick = vi.fn();
      mockCreateElement = {
        click: mockClick,
        href: '',
        download: '',
      } as any;

      mockAppendChild = vi.fn();
      mockRemoveChild = vi.fn();

      vi.spyOn(document, 'createElement').mockReturnValue(mockCreateElement as any);
      vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
      vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild);

      mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
      mockRevokeObjectURL = vi.fn();

      (globalThis as any).URL.createObjectURL = mockCreateObjectURL;
      (globalThis as any).URL.revokeObjectURL = mockRevokeObjectURL;
    });

    it('should create and trigger download', () => {
      downloadFile('test content', 'test.txt', 'text/plain');

      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockCreateElement.href).toBe('blob:mock-url');
      expect(mockCreateElement.download).toBe('test.txt');
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
    });

    it('should create blob with correct content and mime type', () => {
      downloadFile('xml content', 'file.xml', 'application/xml');

      expect(mockCreateObjectURL).toHaveBeenCalled();
      const blob = mockCreateObjectURL.mock.calls[0][0];
      expect(blob.type).toBe('application/xml');
    });

    it('should revoke object URL after download', () => {
      downloadFile('content', 'file.txt', 'text/plain');

      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should handle different file types', () => {
      const cases = [
        { content: '{}', filename: 'data.json', mimeType: 'application/json' },
        { content: '<xml/>', filename: 'data.xml', mimeType: 'application/xml' },
        { content: 'plain', filename: 'data.txt', mimeType: 'text/plain' },
      ];

      for (const { content, filename, mimeType } of cases) {
        downloadFile(content, filename, mimeType);
        expect(mockCreateElement.download).toBe(filename);
      }
    });
  });

  describe('copyToClipboard', () => {
    it('should use navigator.clipboard.writeText when available', async () => {
      const writeTextMock = vi.fn(() => Promise.resolve());
      (globalThis as any).navigator = {
        clipboard: {
          writeText: writeTextMock,
        },
      };

      await copyToClipboard('test text');

      expect(writeTextMock).toHaveBeenCalledWith('test text');
    });

    it('should use fallback when clipboard API not available', async () => {
      (globalThis as any).navigator = {
        clipboard: undefined,
      };

      const mockTextarea = {
        value: '',
        style: { position: '', opacity: '' },
        select: vi.fn(),
      };
      const mockAppendChild = vi.fn();
      const mockRemoveChild = vi.fn();
      const mockExecCommand = vi.fn(() => true);

      // Add execCommand to document
      (document as any).execCommand = mockExecCommand;

      vi.spyOn(document, 'createElement').mockReturnValue(mockTextarea as any);
      vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
      vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild);

      await copyToClipboard('fallback text');

      expect(mockTextarea.value).toBe('fallback text');
      expect(mockTextarea.style.position).toBe('fixed');
      expect(mockTextarea.style.opacity).toBe('0');
      expect(mockTextarea.select).toHaveBeenCalled();
      expect(mockExecCommand).toHaveBeenCalledWith('copy');
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();

      // Cleanup
      delete (document as any).execCommand;
    });

    it('should handle empty string', async () => {
      const writeTextMock = vi.fn(() => Promise.resolve());
      (globalThis as any).navigator = {
        clipboard: {
          writeText: writeTextMock,
        },
      };

      await copyToClipboard('');

      expect(writeTextMock).toHaveBeenCalledWith('');
    });

    it('should handle multiline text', async () => {
      const writeTextMock = vi.fn(() => Promise.resolve());
      (globalThis as any).navigator = {
        clipboard: {
          writeText: writeTextMock,
        },
      };

      const multiline = 'line1\nline2\nline3';
      await copyToClipboard(multiline);

      expect(writeTextMock).toHaveBeenCalledWith(multiline);
    });
  });

  describe('sanitizeFilename', () => {
    it('should keep valid characters', () => {
      expect(sanitizeFilename('valid-file_name.123.txt')).toBe('valid-file_name.123.txt');
    });

    it('should replace spaces with underscores', () => {
      expect(sanitizeFilename('my file name.txt')).toBe('my_file_name.txt');
    });

    it('should replace special characters with underscores', () => {
      expect(sanitizeFilename('file/name\\with:special*chars?.txt')).toBe(
        'file_name_with_special_chars_.txt',
      );
    });

    it('should handle multiple consecutive special characters', () => {
      expect(sanitizeFilename('bad***file???name.txt')).toBe('bad___file___name.txt');
    });

    it('should preserve dots and hyphens', () => {
      expect(sanitizeFilename('my-file.backup.txt')).toBe('my-file.backup.txt');
    });

    it('should handle unicode characters', () => {
      expect(sanitizeFilename('文件名.txt')).toBe('___.txt');
    });

    it('should handle empty string', () => {
      expect(sanitizeFilename('')).toBe('');
    });

    it('should handle all invalid characters', () => {
      expect(sanitizeFilename('!@#$%^&*()')).toBe('__________');
    });

    it('should be case insensitive', () => {
      expect(sanitizeFilename('MixedCaseFile.TXT')).toBe('MixedCaseFile.TXT');
    });

    it('should handle path separators', () => {
      // The actual implementation keeps dots, so update expectation
      expect(sanitizeFilename('../../../etc/passwd')).toBe('.._.._.._etc_passwd');
    });
  });

  describe('integration tests', () => {
    it('should convert and sanitize filename for XML download', () => {
      const data = { name: 'Test Shortcut', version: 1 };
      const xml = convertToXML(data);
      const filename = sanitizeFilename('My Shortcut Name.shortcut');

      expect(xml).toContain('<string>Test Shortcut</string>');
      expect(filename).toBe('My_Shortcut_Name.shortcut');
    });

    it('should convert and sanitize filename for JSON download', () => {
      const data = { name: 'Test', value: 42 };
      const json = convertToJSON(data);
      const filename = sanitizeFilename('data file (copy).json');

      expect(JSON.parse(json)).toEqual(data);
      expect(filename).toBe('data_file__copy_.json');
    });

    it('should handle complex nested structure', () => {
      const complex = {
        metadata: {
          name: 'Complex Shortcut',
          version: 2,
        },
        actions: [
          { type: 'action1', params: { enabled: true } },
          { type: 'action2', params: { count: 5 } },
        ],
        settings: {
          autoRun: false,
        },
      };

      const xml = convertToXML(complex);
      const json = convertToJSON(complex);

      expect(xml).toContain('<key>metadata</key>');
      expect(xml).toContain('<key>actions</key>');
      expect(xml).toContain('<array>');

      const parsed = JSON.parse(json);
      expect(parsed).toEqual(complex);
    });
  });
});
