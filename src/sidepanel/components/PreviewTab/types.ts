// Type definitions for the custom shortcut preview

import type { ComponentType } from 'react';

// Action color names matching Apple Shortcuts
export type ActionColor =
  | 'Red'
  | 'Yellow'
  | 'Orange'
  | 'Green'
  | 'Blue'
  | 'LightBlue'
  | 'Purple'
  | 'Gray';

// Control flow modes matching Shortcuts app
export enum WFControlFlowMode {
  Start = 0, // Opens nested block (If, Repeat start, Menu)
  Item = 1, // Sibling in block (Otherwise, Menu item)
  End = 2, // Closes block (End If, End Repeat)
}

// Action definition for registry
export interface ActionDefinition {
  /** Display title for the action */
  title?: string;
  /** Icon name from react-icons */
  icon?: string;
  /** Background color name */
  background?: ActionColor;
  /** Custom render component - if not provided, uses FallbackView */
  Component?: ComponentType<ActionRendererProps>;
}

// Props passed to action renderer components
export interface ActionRendererProps {
  /** The action identifier (e.g., "is.workflow.actions.setvariable") */
  identifier: string;
  /** Action parameters */
  params: Record<string, unknown>;
  /** Action UUID for variable linking */
  uuid?: string;
  /** Control flow mode if applicable */
  controlFlowMode?: WFControlFlowMode;
}

// WFValue structures from shortcuts
export interface WFValue {
  Value?: WFValueContent;
  WFSerializationType?: string;
}

export interface WFValueContent {
  Type?:
    | 'Variable'
    | 'ActionOutput'
    | 'ExtensionInput'
    | 'Ask'
    | 'CurrentDate'
    | 'Clipboard'
    | 'ShortcutInput'
    | string;
  VariableName?: string;
  OutputName?: string;
  OutputUUID?: string;
  PropertyName?: string;
  Aggrandizements?: Aggrandizement[];
  attachmentsByRange?: Record<string, AttachmentValue>;
  string?: string;
  WFDictionaryFieldValueItems?: DictionaryItem[];
}

export interface Aggrandizement {
  Type: string;
  PropertyName?: string;
  DictionaryKey?: string;
  CoercionItemClass?: string;
}

export interface AttachmentValue {
  Type: string;
  OutputUUID?: string;
  OutputName?: string;
  VariableName?: string;
  Variable?: string;
  PropertyName?: string;
  Aggrandizements?: Aggrandizement[];
}

export interface DictionaryItem {
  WFKey: string | WFValue;
  WFItemType: number;
  WFValue: WFValue;
}

// Dictionary item types
export enum DictionaryItemType {
  Text = 0,
  Number = 3,
  Array = 1,
  Dictionary = 2,
  Boolean = 4,
}

// Action node for tree structure
export interface ActionNode {
  action: {
    WFWorkflowActionIdentifier: string;
    WFWorkflowActionParameters?: Record<string, unknown>;
    UUID?: string;
  };
  index: number;
  children?: ActionNode[];
}

// Context value type
export interface PreviewContextValue {
  registerAction: (uuid: string, ref: React.RefObject<HTMLDivElement>, index: number) => void;
  scrollToAction: (uuid: string) => void;
  getActionByUUID: (
    uuid: string,
  ) => { ref: React.RefObject<HTMLDivElement>; index: number } | undefined;
}
