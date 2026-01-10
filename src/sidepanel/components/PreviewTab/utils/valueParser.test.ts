import { describe, expect, it } from 'vitest';
import type { AttachmentValue, WFValue, WFValueContent } from '../types';
import {
  type FilterTemplate,
  formatCondition,
  formatFilterOperator,
  formatFilterTemplate,
  formatTimeUnit,
  getAggrandizementSuffix,
  getEffectiveValue,
  getVariableDisplayName,
  hasInlineAttachments,
  isDictionaryValue,
  isPrimitive,
  isVariableReference,
  isWFValue,
  parseInlineAttachments,
} from './valueParser';

describe('valueParser', () => {
  describe('isWFValue', () => {
    it('should return true for valid WFValue with Value property', () => {
      const value: WFValue = { Value: { Type: 'Variable' } };
      expect(isWFValue(value)).toBe(true);
    });

    it('should return true for valid WFValue with WFSerializationType', () => {
      const value = { WFSerializationType: 'WFTextTokenString' };
      expect(isWFValue(value)).toBe(true);
    });

    it('should return true for WFValue with both properties', () => {
      const value: WFValue = {
        Value: { string: 'test' },
        WFSerializationType: 'WFTextTokenString',
      };
      expect(isWFValue(value)).toBe(true);
    });

    it('should return false for primitives', () => {
      expect(isWFValue('string')).toBe(false);
      expect(isWFValue(123)).toBe(false);
      expect(isWFValue(true)).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isWFValue(null)).toBe(false);
      expect(isWFValue(undefined)).toBe(false);
    });

    it('should return false for plain objects', () => {
      expect(isWFValue({ name: 'test' })).toBe(false);
      expect(isWFValue({})).toBe(false);
    });
  });

  describe('isVariableReference', () => {
    it('should return true for ExtensionInput type', () => {
      const content: WFValueContent = { Type: 'ExtensionInput' };
      expect(isVariableReference(content)).toBe(true);
    });

    it('should return true for CurrentDate type', () => {
      const content: WFValueContent = { Type: 'CurrentDate' };
      expect(isVariableReference(content)).toBe(true);
    });

    it('should return true for Ask type', () => {
      const content: WFValueContent = { Type: 'Ask' };
      expect(isVariableReference(content)).toBe(true);
    });

    it('should return true for Clipboard type', () => {
      const content: WFValueContent = { Type: 'Clipboard' };
      expect(isVariableReference(content)).toBe(true);
    });

    it('should return true for ShortcutInput type', () => {
      const content: WFValueContent = { Type: 'ShortcutInput' };
      expect(isVariableReference(content)).toBe(true);
    });

    it('should return true for variables with VariableName', () => {
      const content: WFValueContent = {
        Type: 'Variable',
        VariableName: 'myVar',
      };
      expect(isVariableReference(content)).toBe(true);
    });

    it('should return true for variables with OutputName', () => {
      const content: WFValueContent = { Type: 'ActionOutput', OutputName: 'Result' };
      expect(isVariableReference(content)).toBe(true);
    });

    it('should return true for variables with OutputUUID', () => {
      const content: WFValueContent = {
        Type: 'ActionOutput',
        OutputUUID: '12345',
      };
      expect(isVariableReference(content)).toBe(true);
    });

    it('should return false for non-variable objects', () => {
      const content: WFValueContent = { string: 'test' };
      expect(isVariableReference(content)).toBe(false);
    });

    it('should return false for objects without Type', () => {
      const content: WFValueContent = { VariableName: 'test' };
      expect(isVariableReference(content)).toBe(false);
    });
  });

  describe('hasInlineAttachments', () => {
    it('should return true when both string and attachmentsByRange exist', () => {
      const content: WFValueContent = {
        string: 'Hello {0, 1}',
        attachmentsByRange: { '{0, 1}': { Type: 'Variable' } },
      };
      expect(hasInlineAttachments(content)).toBe(true);
    });

    it('should return false when string is missing', () => {
      const content: WFValueContent = {
        attachmentsByRange: { '{0, 1}': { Type: 'Variable' } },
      };
      expect(hasInlineAttachments(content)).toBe(false);
    });

    it('should return false when attachmentsByRange is missing', () => {
      const content: WFValueContent = { string: 'Hello' };
      expect(hasInlineAttachments(content)).toBe(false);
    });

    it('should return false when both are missing', () => {
      const content: WFValueContent = { Type: 'Variable' };
      expect(hasInlineAttachments(content)).toBe(false);
    });
  });

  describe('isDictionaryValue', () => {
    it('should return true when WFDictionaryFieldValueItems exists', () => {
      const content: WFValueContent = {
        WFDictionaryFieldValueItems: [],
      };
      expect(isDictionaryValue(content)).toBe(true);
    });

    it('should return false when WFDictionaryFieldValueItems is missing', () => {
      const content: WFValueContent = { Type: 'Variable' };
      expect(isDictionaryValue(content)).toBe(false);
    });
  });

  describe('getVariableDisplayName', () => {
    it('should return "Shortcut Input" for ExtensionInput type', () => {
      expect(getVariableDisplayName({ Type: 'ExtensionInput' })).toBe('Shortcut Input');
    });

    it('should return "Shortcut Input" for ShortcutInput name', () => {
      expect(getVariableDisplayName({ Type: 'Variable', VariableName: 'ShortcutInput' })).toBe(
        'Shortcut Input',
      );
    });

    it('should return "Current Date" for CurrentDate type', () => {
      expect(getVariableDisplayName({ Type: 'CurrentDate' })).toBe('Current Date');
    });

    it('should return "Current Date" for CurrentDate name', () => {
      expect(getVariableDisplayName({ Type: 'Variable', VariableName: 'CurrentDate' })).toBe(
        'Current Date',
      );
    });

    it('should return "Ask Each Time" for Ask type', () => {
      expect(getVariableDisplayName({ Type: 'Ask' })).toBe('Ask Each Time');
    });

    it('should return "Clipboard" for Clipboard type', () => {
      expect(getVariableDisplayName({ Type: 'Clipboard' })).toBe('Clipboard');
    });

    it('should return "Device Details" for DeviceDetails type', () => {
      expect(getVariableDisplayName({ Type: 'DeviceDetails' })).toBe('Device Details');
    });

    it('should use VariableName when available', () => {
      expect(getVariableDisplayName({ Type: 'Variable', VariableName: 'myVariable' })).toBe(
        'myVariable',
      );
    });

    it('should use OutputName when VariableName unavailable', () => {
      expect(getVariableDisplayName({ Type: 'ActionOutput', OutputName: 'Result' })).toBe('Result');
    });

    it('should use PropertyName when others unavailable', () => {
      expect(getVariableDisplayName({ Type: 'Property', PropertyName: 'Name' })).toBe('Name');
    });

    it('should fallback to "Variable" when no name', () => {
      expect(getVariableDisplayName({ Type: 'Variable' })).toBe('Variable');
    });
  });

  describe('getAggrandizementSuffix', () => {
    it('should return empty string for no aggrandizements', () => {
      expect(getAggrandizementSuffix(undefined)).toBe('');
      expect(getAggrandizementSuffix([])).toBe('');
    });

    it('should format single PropertyName', () => {
      expect(getAggrandizementSuffix([{ Type: 'Property', PropertyName: 'Name' }])).toBe(' (Name)');
    });

    it('should format single DictionaryKey', () => {
      expect(getAggrandizementSuffix([{ Type: 'Dictionary', DictionaryKey: 'key' }])).toBe(
        ' (key)',
      );
    });

    it('should format CoercionItemClass', () => {
      expect(
        getAggrandizementSuffix([{ Type: 'Coercion', CoercionItemClass: 'WFStringContentItem' }]),
      ).toBe(' (as String)');
    });

    it('should format multiple aggrandizements with separator', () => {
      expect(
        getAggrandizementSuffix([
          { Type: 'Property', PropertyName: 'Name' },
          { Type: 'Dictionary', DictionaryKey: 'firstName' },
        ]),
      ).toBe(' (Name > firstName)');
    });

    it('should combine PropertyName and CoercionItemClass', () => {
      expect(
        getAggrandizementSuffix([
          { Type: 'Property', PropertyName: 'Name' },
          { Type: 'Coercion', CoercionItemClass: 'WFStringContentItem' },
        ]),
      ).toBe(' (Name > as String)');
    });

    it('should skip aggrandizements with no relevant properties', () => {
      expect(getAggrandizementSuffix([{ Type: 'Unknown' }])).toBe('');
    });
  });

  describe('parseInlineAttachments', () => {
    it('should parse text with no attachments', () => {
      const result = parseInlineAttachments('Hello World', {});
      expect(result).toEqual([{ type: 'text', content: 'Hello World' }]);
    });

    it('should parse text with single attachment', () => {
      const attachment: AttachmentValue = { Type: 'Variable', VariableName: 'var' };
      const result = parseInlineAttachments('Hello \uFFFCWorld', {
        '{6, 1}': attachment,
      });

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ type: 'text', content: 'Hello ' });
      expect(result[1]).toMatchObject({
        type: 'variable',
        attachment,
        position: 6,
      });
      expect(result[2]).toEqual({ type: 'text', content: 'World' });
    });

    it('should parse text with multiple attachments', () => {
      const att1: AttachmentValue = { Type: 'Variable', VariableName: 'var1' };
      const att2: AttachmentValue = { Type: 'Variable', VariableName: 'var2' };

      const result = parseInlineAttachments('Hello \uFFFC and \uFFFC', {
        '{6, 1}': att1,
        '{13, 1}': att2,
      });

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ type: 'text', content: 'Hello ' });
      expect(result[1]).toMatchObject({ type: 'variable', attachment: att1 });
      expect(result[2].type).toBe('text');
      if (result[2].type === 'text') {
        expect(result[2].content).toContain(' and ');
      }
      expect(result[3]).toMatchObject({ type: 'variable', attachment: att2 });
    });

    it('should handle attachment at start of text', () => {
      const attachment: AttachmentValue = { Type: 'Variable' };
      const result = parseInlineAttachments('\uFFFCWorld', { '{0, 1}': attachment });

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ type: 'variable', position: 0 });
      expect(result[1]).toEqual({ type: 'text', content: 'World' });
    });

    it('should handle attachment at end of text', () => {
      const attachment: AttachmentValue = { Type: 'Variable' };
      const result = parseInlineAttachments('Hello\uFFFC', { '{5, 1}': attachment });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ type: 'text', content: 'Hello' });
      expect(result[1]).toMatchObject({ type: 'variable', position: 5 });
    });

    it('should remove placeholder character (\\uFFFC)', () => {
      const result = parseInlineAttachments('Hello\uFFFCWorld', {});
      // When there are no attachments, the placeholder is just removed and text is concatenated
      expect(result).toHaveLength(1);
      if (result[0].type === 'text') {
        expect(result[0].content).toBe('HelloWorld');
      }
    });

    it('should sort attachments by position', () => {
      const att1: AttachmentValue = { Type: 'Variable', VariableName: 'var1' };
      const att2: AttachmentValue = { Type: 'Variable', VariableName: 'var2' };

      // Provide attachments in reverse order
      const result = parseInlineAttachments('AB', {
        '{1, 1}': att2,
        '{0, 1}': att1,
      });

      expect(result[0]).toMatchObject({ type: 'variable', attachment: att1 });
      expect(result[1]).toMatchObject({ type: 'variable', attachment: att2 });
    });
  });

  describe('getEffectiveValue', () => {
    it('should return string from WFValue with simple string', () => {
      const value: WFValue = { Value: { string: 'test' } };
      expect(getEffectiveValue(value)).toBe('test');
    });

    it('should return full content for WFValue with attachments', () => {
      const value: WFValue = {
        Value: { string: 'test', attachmentsByRange: {} },
      };
      expect(getEffectiveValue(value)).toEqual({
        string: 'test',
        attachmentsByRange: {},
      });
    });

    it('should return null for WFValue with no content', () => {
      const value: WFValue = { Value: undefined };
      expect(getEffectiveValue(value)).toBeNull();
    });

    it('should return value itself for empty object', () => {
      const value = {};
      expect(getEffectiveValue(value)).toEqual({});
    });

    it('should return the value itself for non-WFValue', () => {
      expect(getEffectiveValue('string')).toBe('string');
      expect(getEffectiveValue(123)).toBe(123);
      expect(getEffectiveValue(true)).toBe(true);
    });
  });

  describe('isPrimitive', () => {
    it('should return true for strings', () => {
      expect(isPrimitive('test')).toBe(true);
    });

    it('should return true for numbers', () => {
      expect(isPrimitive(123)).toBe(true);
      expect(isPrimitive(0)).toBe(true);
      expect(isPrimitive(-1)).toBe(true);
    });

    it('should return true for booleans', () => {
      expect(isPrimitive(true)).toBe(true);
      expect(isPrimitive(false)).toBe(true);
    });

    it('should return false for objects', () => {
      expect(isPrimitive({})).toBe(false);
      expect(isPrimitive([])).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isPrimitive(null)).toBe(false);
      expect(isPrimitive(undefined)).toBe(false);
    });
  });

  describe('formatCondition', () => {
    it('should format comparison operators', () => {
      expect(formatCondition(0)).toBe('is less than');
      expect(formatCondition(1)).toBe('is less than or equal to');
      expect(formatCondition(2)).toBe('is greater than');
      expect(formatCondition(3)).toBe('is greater than or equal to');
      expect(formatCondition(4)).toBe('is');
      expect(formatCondition(5)).toBe('is not');
    });

    it('should format string operators', () => {
      expect(formatCondition(8)).toBe('begins with');
      expect(formatCondition(9)).toBe('ends with');
      expect(formatCondition(99)).toBe('contains');
      expect(formatCondition(999)).toBe('does not contain');
    });

    it('should format existence operators', () => {
      expect(formatCondition(100)).toBe('has any value');
      expect(formatCondition(101)).toBe('does not have any value');
    });

    it('should format range operator', () => {
      expect(formatCondition(1003)).toBe('is between');
    });

    it('should return "matches" for unknown codes', () => {
      expect(formatCondition(9999)).toBe('matches');
      expect(formatCondition(-1)).toBe('matches');
    });

    it('should return "matches" for undefined', () => {
      expect(formatCondition(undefined)).toBe('matches');
    });
  });

  describe('formatFilterOperator', () => {
    it('should format basic comparison operators', () => {
      expect(formatFilterOperator(0)).toBe('is less than');
      expect(formatFilterOperator(1)).toBe('is less than or equal to');
      expect(formatFilterOperator(2)).toBe('is greater than');
      expect(formatFilterOperator(3)).toBe('is greater than or equal to');
      expect(formatFilterOperator(4)).toBe('is');
      expect(formatFilterOperator(5)).toBe('is not');
    });

    it('should format string operators', () => {
      expect(formatFilterOperator(8)).toBe('begins with');
      expect(formatFilterOperator(9)).toBe('ends with');
      expect(formatFilterOperator(99)).toBe('contains');
      expect(formatFilterOperator(999)).toBe('does not contain');
    });

    it('should format date operators', () => {
      expect(formatFilterOperator(1000)).toBe('is exactly');
      expect(formatFilterOperator(1001)).toBe('is not exactly');
      expect(formatFilterOperator(1002)).toBe('is in the last');
      expect(formatFilterOperator(1003)).toBe('is between');
      expect(formatFilterOperator(1004)).toBe('is before');
      expect(formatFilterOperator(1005)).toBe('is after');
      expect(formatFilterOperator(1006)).toBe('is today');
      expect(formatFilterOperator(1007)).toBe('is not today');
      expect(formatFilterOperator(1101)).toBe('is in the next');
    });

    it('should format existence operators', () => {
      expect(formatFilterOperator(100)).toBe('has any value');
      expect(formatFilterOperator(101)).toBe('does not have any value');
    });

    it('should return "matches" for unknown codes', () => {
      expect(formatFilterOperator(9999)).toBe('matches');
    });
  });

  describe('formatTimeUnit', () => {
    it('should format year unit', () => {
      expect(formatTimeUnit(4, true)).toBe('years');
      expect(formatTimeUnit(4, false)).toBe('year');
    });

    it('should format month unit', () => {
      expect(formatTimeUnit(8, true)).toBe('months');
      expect(formatTimeUnit(8, false)).toBe('month');
    });

    it('should format day unit', () => {
      expect(formatTimeUnit(16, true)).toBe('days');
      expect(formatTimeUnit(16, false)).toBe('day');
    });

    it('should format hour unit', () => {
      expect(formatTimeUnit(32, true)).toBe('hours');
      expect(formatTimeUnit(32, false)).toBe('hour');
    });

    it('should format minute unit', () => {
      expect(formatTimeUnit(64, true)).toBe('minutes');
      expect(formatTimeUnit(64, false)).toBe('minute');
    });

    it('should format second unit', () => {
      expect(formatTimeUnit(128, true)).toBe('seconds');
      expect(formatTimeUnit(128, false)).toBe('second');
    });

    it('should format week unit', () => {
      expect(formatTimeUnit(256, true)).toBe('weeks');
      expect(formatTimeUnit(256, false)).toBe('week');
    });

    it('should default to "units" for unknown codes', () => {
      expect(formatTimeUnit(999, true)).toBe('units');
      expect(formatTimeUnit(999, false)).toBe('unit');
    });

    it('should default plural to true', () => {
      expect(formatTimeUnit(16)).toBe('days');
    });
  });

  describe('formatFilterTemplate', () => {
    it('should format template with Number and Unit', () => {
      const template: FilterTemplate = {
        Property: 'Date',
        Operator: 1002,
        Values: { Number: 7, Unit: 16 },
      };

      const result = formatFilterTemplate(template);
      expect(result.property).toBe('Date');
      expect(result.operator).toBe('is in the last');
      expect(result.value).toBe('7 days');
    });

    it('should format template with Number as string and Unit', () => {
      const template: FilterTemplate = {
        Property: 'Date',
        Operator: 1002,
        Values: { Number: '30', Unit: 16 },
      };

      const result = formatFilterTemplate(template);
      expect(result.value).toBe('30 days');
    });

    it('should use singular unit for Number = 1', () => {
      const template: FilterTemplate = {
        Property: 'Date',
        Operator: 1002,
        Values: { Number: 1, Unit: 16 },
      };

      const result = formatFilterTemplate(template);
      expect(result.value).toBe('1 day');
    });

    it('should format template with String value', () => {
      const template: FilterTemplate = {
        Property: 'Name',
        Operator: 99,
        Values: { String: 'test' },
      };

      const result = formatFilterTemplate(template);
      expect(result.property).toBe('Name');
      expect(result.operator).toBe('contains');
      expect(result.value).toBe('test');
    });

    it('should format template with Bool value true', () => {
      const template: FilterTemplate = {
        Property: 'IsCompleted',
        Operator: 4,
        Values: { Bool: true },
      };

      const result = formatFilterTemplate(template);
      expect(result.value).toBe('Yes');
    });

    it('should format template with Bool value false', () => {
      const template: FilterTemplate = {
        Property: 'IsCompleted',
        Operator: 4,
        Values: { Bool: false },
      };

      const result = formatFilterTemplate(template);
      expect(result.value).toBe('No');
    });

    it('should format template with Enumeration string', () => {
      const template: FilterTemplate = {
        Property: 'Status',
        Operator: 4,
        Values: { Enumeration: 'Active' },
      };

      const result = formatFilterTemplate(template);
      expect(result.value).toBe('Active');
    });

    it('should format template with Enumeration WFValue object', () => {
      const template: FilterTemplate = {
        Property: 'Type',
        Operator: 4,
        Values: { Enumeration: { Value: 'Document' } },
      };

      const result = formatFilterTemplate(template);
      expect(result.value).toBe('Document');
    });

    it('should handle missing Values object', () => {
      const template: FilterTemplate = {
        Property: 'Field',
        Operator: 100,
      };

      const result = formatFilterTemplate(template);
      expect(result.property).toBe('Field');
      expect(result.operator).toBe('has any value');
      expect(result.value).toBeNull();
    });

    it('should handle template with only Unit (no Number)', () => {
      const template: FilterTemplate = {
        Property: 'Date',
        Operator: 1006,
        Values: { Unit: 16 },
      };

      const result = formatFilterTemplate(template);
      expect(result.value).toBe('days');
    });

    it('should return "Unknown" for missing Property', () => {
      const template: FilterTemplate = {
        Operator: 4,
        Values: { String: 'test' },
      };

      const result = formatFilterTemplate(template);
      expect(result.property).toBe('Unknown');
    });
  });
});
