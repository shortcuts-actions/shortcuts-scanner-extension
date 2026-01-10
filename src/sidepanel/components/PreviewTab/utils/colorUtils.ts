// Color utilities for mapping action colors to Chakra UI color schemes

import type { ActionColor } from '../types';

// Apple Shortcuts color palette
export const SHORTCUT_COLORS: Record<ActionColor, { hex: string; chakra: string }> = {
  Red: { hex: '#ff3b2f', chakra: 'red' },
  Yellow: { hex: '#ffc200', chakra: 'yellow' },
  Orange: { hex: '#fc880f', chakra: 'orange' },
  Green: { hex: '#27cd41', chakra: 'green' },
  Blue: { hex: '#007aff', chakra: 'blue' },
  LightBlue: { hex: '#55bef0', chakra: 'cyan' },
  Purple: { hex: '#5e5ce6', chakra: 'purple' },
  Gray: { hex: '#8e8e93', chakra: 'gray' },
};

// Variable type to color mapping
export const VARIABLE_TYPE_COLORS: Record<string, string> = {
  Variable: 'purple',
  ActionOutput: 'blue',
  CurrentDate: 'green',
  Clipboard: 'orange',
  Ask: 'cyan',
  ShortcutInput: 'teal',
  ExtensionInput: 'pink',
};

/**
 * Get Chakra color scheme for an action color
 */
export function getActionColorScheme(color?: ActionColor): string {
  if (!color) return 'gray';
  return SHORTCUT_COLORS[color]?.chakra || 'gray';
}

/**
 * Get Chakra color scheme for a variable type
 */
export function getVariableColorScheme(type?: string): string {
  if (!type) return 'blue';
  return VARIABLE_TYPE_COLORS[type] || 'blue';
}

/**
 * Get hex color for an action color
 */
export function getActionHexColor(color?: ActionColor): string {
  if (!color) return SHORTCUT_COLORS.Gray.hex;
  return SHORTCUT_COLORS[color]?.hex || SHORTCUT_COLORS.Gray.hex;
}
