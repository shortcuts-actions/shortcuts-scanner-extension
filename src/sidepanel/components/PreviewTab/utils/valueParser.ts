// Value parsing utilities for extracting data from WFValue structures

import type { Aggrandizement, AttachmentValue, WFValue, WFValueContent } from '../types';

/**
 * Check if a value is a WFValue structure
 */
export function isWFValue(value: unknown): value is WFValue {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return 'Value' in obj || 'WFSerializationType' in obj;
}

/**
 * Special variable types that don't require a name (identified by Type alone)
 */
const SPECIAL_VARIABLE_TYPES = [
  'ExtensionInput',
  'CurrentDate',
  'Ask',
  'Clipboard',
  'DeviceDetails',
  'ShortcutInput',
];

/**
 * Check if value content represents a variable reference
 */
export function isVariableReference(content: WFValueContent): boolean {
  if (!content.Type) return false;

  // Special types that are always variable references (no name needed)
  if (SPECIAL_VARIABLE_TYPES.includes(content.Type)) {
    return true;
  }

  // Regular variables need a name or UUID
  return !!(content.VariableName || content.OutputName || content.OutputUUID);
}

/**
 * Check if value content has inline attachments (embedded variables in text)
 */
export function hasInlineAttachments(content: WFValueContent): boolean {
  return !!(content.attachmentsByRange && content.string !== undefined);
}

/**
 * Check if value content is a dictionary
 */
export function isDictionaryValue(content: WFValueContent): boolean {
  return !!content.WFDictionaryFieldValueItems;
}

/**
 * Get display name for a variable
 */
export function getVariableDisplayName(content: WFValueContent): string {
  let name = content.VariableName || content.OutputName || content.PropertyName || 'Variable';

  // Handle special type names
  if (content.Type === 'ExtensionInput' || name === 'ShortcutInput') {
    name = 'Shortcut Input';
  } else if (content.Type === 'CurrentDate' || name === 'CurrentDate') {
    name = 'Current Date';
  } else if (content.Type === 'Ask' || name === 'Ask') {
    name = 'Ask Each Time';
  } else if (content.Type === 'Clipboard' || name === 'Clipboard') {
    name = 'Clipboard';
  } else if (content.Type === 'DeviceDetails' || name === 'DeviceDetails') {
    name = 'Device Details';
  }

  return name;
}

/**
 * Get aggrandizement suffix (property access display)
 */
export function getAggrandizementSuffix(aggrandizements?: Aggrandizement[]): string {
  if (!aggrandizements || aggrandizements.length === 0) return '';

  const parts: string[] = [];

  for (const aggr of aggrandizements) {
    if (aggr.PropertyName) {
      parts.push(aggr.PropertyName);
    }
    if (aggr.DictionaryKey) {
      parts.push(aggr.DictionaryKey);
    }
    if (aggr.CoercionItemClass) {
      // Map coercion class to friendly name
      const className = aggr.CoercionItemClass.replace('WF', '').replace('ContentItem', '');
      parts.push(`as ${className}`);
    }
  }

  return parts.length > 0 ? ` (${parts.join(' > ')})` : '';
}

/**
 * Parse inline attachments from text with embedded variables
 */
export function parseInlineAttachments(
  text: string,
  attachments: Record<string, AttachmentValue>,
): Array<
  | { type: 'text'; content: string }
  | { type: 'variable'; attachment: AttachmentValue; position: number }
> {
  const parts: Array<
    | { type: 'text'; content: string }
    | { type: 'variable'; attachment: AttachmentValue; position: number }
  > = [];

  // Sort attachments by position
  const sortedAttachments = Object.entries(attachments)
    .map(([range, attachment]) => {
      // Range format: "{start, length}"
      const match = range.match(/\{(\d+),\s*(\d+)\}/);
      return {
        start: match ? parseInt(match[1], 10) : 0,
        length: match ? parseInt(match[2], 10) : 0,
        attachment,
      };
    })
    .sort((a, b) => a.start - b.start);

  let currentIndex = 0;

  for (const { start, length, attachment } of sortedAttachments) {
    // Add text before this attachment
    if (start > currentIndex) {
      const textContent = text.slice(currentIndex, start);
      if (textContent) {
        parts.push({ type: 'text', content: textContent });
      }
    }

    // Add the variable
    parts.push({ type: 'variable', attachment, position: start });

    currentIndex = start + length;
  }

  // Add remaining text
  if (currentIndex < text.length) {
    const remaining = text.slice(currentIndex);
    // Replace placeholder character if present
    const cleanText = remaining.replace(/\uFFFC/g, '');
    if (cleanText) {
      parts.push({ type: 'text', content: cleanText });
    }
  }

  return parts;
}

/**
 * Get the effective value from a WFValue or raw value
 */
export function getEffectiveValue(value: unknown): unknown {
  if (isWFValue(value)) {
    const content = value.Value;
    if (!content) return null;

    // If it's a simple string value
    if (content.string && !content.attachmentsByRange) {
      return content.string;
    }

    // Return the full content for complex values
    return content;
  }

  return value;
}

/**
 * Check if a value is a primitive (string, number, boolean)
 */
export function isPrimitive(value: unknown): value is string | number | boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

/**
 * Format a condition number to human-readable text
 */
export function formatCondition(condition?: number): string {
  switch (condition) {
    case 0:
      return 'is less than';
    case 1:
      return 'is less than or equal to';
    case 2:
      return 'is greater than';
    case 3:
      return 'is greater than or equal to';
    case 4:
      return 'is';
    case 5:
      return 'is not';
    case 8:
      return 'begins with';
    case 9:
      return 'ends with';
    case 99:
      return 'contains';
    case 100:
      return 'has any value';
    case 101:
      return 'does not have any value';
    case 999:
      return 'does not contain';
    case 1003:
      return 'is between';
    default:
      return 'matches';
  }
}

/**
 * Filter operator codes used in WFActionParameterFilterTemplates
 */
export function formatFilterOperator(operator?: number): string {
  switch (operator) {
    // Basic comparison operators
    case 0:
      return 'is less than';
    case 1:
      return 'is less than or equal to';
    case 2:
      return 'is greater than';
    case 3:
      return 'is greater than or equal to';
    case 4:
      return 'is';
    case 5:
      return 'is not';
    case 8:
      return 'begins with';
    case 9:
      return 'ends with';
    case 99:
      return 'contains';
    case 999:
      return 'does not contain';
    // Date operators
    case 1000:
      return 'is exactly';
    case 1001:
      return 'is not exactly';
    case 1002:
      return 'is in the last';
    case 1003:
      return 'is between';
    case 1004:
      return 'is before';
    case 1005:
      return 'is after';
    case 1006:
      return 'is today';
    case 1007:
      return 'is not today';
    case 1101:
      return 'is in the next';
    // Existence operators
    case 100:
      return 'has any value';
    case 101:
      return 'does not have any value';
    default:
      return 'matches';
  }
}

/**
 * Time unit codes used in filter values
 */
export function formatTimeUnit(unit?: number, plural = true): string {
  const suffix = plural ? 's' : '';
  switch (unit) {
    case 4:
      return `year${suffix}`;
    case 8:
      return `month${suffix}`;
    case 16:
      return `day${suffix}`;
    case 32:
      return `hour${suffix}`;
    case 64:
      return `minute${suffix}`;
    case 128:
      return `second${suffix}`;
    case 256:
      return `week${suffix}`;
    default:
      return `unit${suffix}`;
  }
}

/**
 * Filter template structure from WFActionParameterFilterTemplates
 */
export interface FilterTemplate {
  Property?: string;
  Operator?: number;
  Values?: {
    Unit?: number;
    Number?: number | string; // Can be number or string
    Date?: unknown;
    String?: string;
    Bool?: boolean;
    Enumeration?: string | Record<string, unknown>; // Can be string or WFValue object
  };
  VariableOverrides?: Record<string, unknown>;
  Removable?: boolean;
}

/**
 * Format a filter template to human-readable string
 */
export function formatFilterTemplate(template: FilterTemplate): {
  property: string;
  operator: string;
  value: string | null;
} {
  const property = template.Property || 'Unknown';
  const operator = formatFilterOperator(template.Operator);
  const values = template.Values;

  let value: string | null = null;

  if (values) {
    // Date duration (e.g., "7 days")
    if (values.Number !== undefined && values.Unit !== undefined) {
      // Number can be a string or number
      const num = typeof values.Number === 'string' ? Number(values.Number) : values.Number;
      const unit = formatTimeUnit(values.Unit, num !== 1);
      value = `${num} ${unit}`;
    }
    // Just a unit (e.g., for date comparison)
    else if (values.Unit !== undefined) {
      value = formatTimeUnit(values.Unit, true);
    }
    // String value
    else if (values.String !== undefined) {
      value = values.String;
    }
    // Boolean value
    else if (values.Bool !== undefined) {
      value = values.Bool ? 'Yes' : 'No';
    }
    // Enumeration value (can be string or WFValue object)
    else if (values.Enumeration !== undefined) {
      const enumVal = values.Enumeration;
      if (typeof enumVal === 'string') {
        value = enumVal;
      } else if (typeof enumVal === 'object' && enumVal !== null) {
        // WFValue structure: { Value: "string", WFSerializationType: "..." }
        const enumObj = enumVal as Record<string, unknown>;
        if (typeof enumObj.Value === 'string') {
          value = enumObj.Value;
        } else {
          value = String(enumVal);
        }
      }
    }
  }

  return { property, operator, value };
}
