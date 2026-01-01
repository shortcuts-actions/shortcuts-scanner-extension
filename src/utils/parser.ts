import { parse } from '@plist/parse';
import type { ShortcutData } from './types';

/**
 * Recursively converts all BigInt values to Numbers in an object structure.
 * This is necessary because @plist/parse returns BigInt for 64-bit integers,
 * which causes issues with JSON.stringify and arithmetic operations.
 */
function sanitizeBigInt(obj: any): any {
  // Handle BigInt primitive
  if (typeof obj === 'bigint') {
    // Check if conversion is safe
    if (obj > Number.MAX_SAFE_INTEGER || obj < Number.MIN_SAFE_INTEGER) {
      console.warn(`BigInt value ${obj} exceeds safe integer range and may lose precision`);
    }
    return Number(obj);
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeBigInt(item));
  }

  // Handle plain objects
  if (obj !== null && typeof obj === 'object' && obj.constructor === Object) {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.hasOwn(obj, key)) {
        sanitized[key] = sanitizeBigInt(obj[key]);
      }
    }
    return sanitized;
  }

  // Return primitives and other types as-is
  return obj;
}

/**
 * Parses a binary plist ArrayBuffer into a JavaScript object
 */
export function parsePlist(arrayBuffer: ArrayBuffer): any {
  try {
    const parsed = parse(arrayBuffer);
    // Sanitize BigInt values to prevent serialization and arithmetic errors
    return sanitizeBigInt(parsed);
  } catch (error) {
    throw new Error(
      `Failed to parse plist: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Extracts shortcut data from parsed plist
 */
export function extractShortcutData(parsed: any): ShortcutData {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid plist data structure');
  }

  if (!Array.isArray(parsed.WFWorkflowActions)) {
    throw new Error('Missing WFWorkflowActions array');
  }

  return parsed as ShortcutData;
}

/**
 * Gets a human-readable action name from the action identifier
 */
export function getActionName(identifier: string): string {
  // Remove the reverse domain notation prefix
  const parts = identifier.split('.');
  const name = parts[parts.length - 1];

  // Convert from camelCase to Title Case
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Counts the number of actions in a shortcut
 */
export function getActionCount(data: ShortcutData): number {
  return data.WFWorkflowActions?.length || 0;
}

/**
 * Gets the client version string
 */
export function getClientVersion(data: ShortcutData): string {
  const version = data.WFWorkflowClientVersion;
  const release = data.WFWorkflowClientRelease;

  if (version && release) {
    return `${release} (${version})`;
  }
  return version || release || 'Unknown';
}

/**
 * Extracts icon information
 */
export function getIconInfo(data: ShortcutData): {
  color?: number;
  glyph?: number;
} {
  return {
    color: data.WFWorkflowIcon?.WFWorkflowIconStartColor,
    glyph: data.WFWorkflowIcon?.WFWorkflowIconGlyphNumber,
  };
}
