// Type definitions for Apple Shortcuts

export interface ShortcutMetadata {
  name: string;
  color?: number;
  glyph?: number;
  icon?: {
    downloadURL: string;
  };
  isSigned?: boolean;
}

export interface ShortcutAction {
  WFWorkflowActionIdentifier: string;
  WFWorkflowActionParameters?: Record<string, any>;
  UUID?: string;
  [key: string]: any;
}

interface ShortcutDate {
  deviceId?: string;
  timestamp: number;
  userRecordName?: string;
}

export interface ShortcutData {
  WFWorkflowActions: ShortcutAction[];
  WFWorkflowClientVersion?: string;
  WFWorkflowClientRelease?: string;
  WFWorkflowMinimumClientVersion?: number;
  WFWorkflowMinimumClientRelease?: string;
  WFWorkflowIcon?: {
    WFWorkflowIconStartColor?: number;
    WFWorkflowIconGlyphNumber?: number;
  };
  WFWorkflowTypes?: string[];
  WFWorkflowInputContentItemClasses?: string[];
  recordName?: string;
  recordType?: string;
  deleted?: boolean;
  modified?: ShortcutDate;
  created?: ShortcutDate;
}

export interface ParsedShortcut {
  metadata: ShortcutMetadata;
  data: ShortcutData;
  raw: any;
}

export interface iCloudAPIResponse {
  fields: {
    shortcut?: {
      value: {
        downloadURL: string;
      };
    };
    signedShortcut?: {
      value: {
        downloadURL: string;
      };
    };
    icon?: {
      value: {
        downloadURL: string;
      };
    };
    name?: {
      value: string;
    };
  };
  [key: string]: any;
}

export type MessageType =
  | 'SHORTCUT_DETECTED'
  | 'TAB_CHANGED'
  | 'FETCH_SHORTCUT'
  | 'SHORTCUT_DATA'
  | 'ERROR';

export interface TabChangedPayload {
  tabId: number;
  url: string;
  isShortcutPage: boolean;
}

export interface ChromeMessage {
  type: MessageType;
  payload?: any;
  error?: string;
}
