import type {
  Aggrandizement,
  AttachmentValue,
  DictionaryItem,
  WFControlFlowMode,
  WFValue,
  WFValueContent,
} from '../../sidepanel/components/PreviewTab/types';
import type { FilterTemplate } from '../../sidepanel/components/PreviewTab/utils/valueParser';
import type { ShortcutAction } from '../../utils/types';

/**
 * Factory functions for creating test data for Preview components
 */
export const previewFactory = {
  /**
   * Create a WFValue object
   */
  wfValue(overrides?: Partial<WFValue>): WFValue {
    return {
      Value: { string: 'test value' },
      WFSerializationType: 'WFTextTokenString',
      ...overrides,
    };
  },

  /**
   * Create a variable reference WFValueContent
   */
  variableReference(name: string, uuid?: string): WFValueContent {
    return {
      Type: 'Variable',
      VariableName: name,
      ...(uuid && { OutputUUID: uuid }),
    };
  },

  /**
   * Create an action output reference
   */
  actionOutputReference(name: string, uuid: string): WFValueContent {
    return {
      Type: 'ActionOutput',
      OutputName: name,
      OutputUUID: uuid,
    };
  },

  /**
   * Create inline text with attachments
   */
  inlineTextWithAttachments(
    text: string,
    attachments: Record<string, AttachmentValue>,
  ): WFValueContent {
    return {
      string: text,
      attachmentsByRange: attachments,
    };
  },

  /**
   * Create an attachment value
   */
  attachment(
    type: string,
    name?: string,
    uuid?: string,
    aggrandizements?: Aggrandizement[],
  ): AttachmentValue {
    return {
      Type: type,
      ...(name && { VariableName: name, OutputName: name }),
      ...(uuid && { OutputUUID: uuid }),
      ...(aggrandizements && { Aggrandizements: aggrandizements }),
    };
  },

  /**
   * Create an aggrandizement (property accessor)
   */
  aggrandizement(
    type: string,
    props?: {
      propertyName?: string;
      dictionaryKey?: string;
      coercionClass?: string;
    },
  ): Aggrandizement {
    return {
      Type: type,
      ...(props?.propertyName && { PropertyName: props.propertyName }),
      ...(props?.dictionaryKey && { DictionaryKey: props.dictionaryKey }),
      ...(props?.coercionClass && { CoercionItemClass: props.coercionClass }),
    };
  },

  /**
   * Create a location value
   */
  location(
    lat: number,
    lng: number,
    name?: string,
    address?: { city?: string; state?: string; country?: string },
  ) {
    return {
      region: {
        center: {
          latitude: lat,
          longitude: lng,
        },
        radius: 100,
      },
      ...(name && {
        placemark: {
          Name: name,
          ...address,
        },
      }),
    };
  },

  /**
   * Create a dictionary item
   */
  dictionaryItem(key: string | WFValue, value: unknown, itemType = 0): DictionaryItem {
    return {
      WFKey: typeof key === 'string' ? { Value: { string: key } } : key,
      WFItemType: itemType,
      WFValue:
        typeof value === 'object' && value !== null && 'Value' in value
          ? (value as WFValue)
          : { Value: { string: String(value) } },
    };
  },

  /**
   * Create a filter template
   */
  filterTemplate(
    property: string,
    operator: number,
    values?: {
      Number?: number | string;
      Unit?: number;
      String?: string;
      Bool?: boolean;
      Enumeration?: string | Record<string, unknown>;
    },
    variableOverrides?: Record<string, unknown>,
  ): FilterTemplate {
    return {
      Property: property,
      Operator: operator,
      ...(values && { Values: values }),
      ...(variableOverrides && { VariableOverrides: variableOverrides }),
    };
  },

  /**
   * Create a shortcut action
   */
  shortcutAction(
    identifier: string,
    params?: Record<string, unknown>,
    uuid?: string,
  ): ShortcutAction {
    return {
      WFWorkflowActionIdentifier: identifier,
      WFWorkflowActionParameters: {
        ...(uuid && { UUID: uuid }),
        ...params,
      },
    };
  },

  /**
   * Create a control flow action
   */
  controlFlowAction(
    identifier: string,
    mode: WFControlFlowMode,
    params?: Record<string, unknown>,
    uuid?: string,
  ): ShortcutAction {
    return {
      WFWorkflowActionIdentifier: identifier,
      WFWorkflowActionParameters: {
        WFControlFlowMode: mode,
        ...(uuid && { UUID: uuid }),
        ...params,
      },
    };
  },

  /**
   * Create a simple "Get Text" action
   */
  textAction(text: string, uuid?: string): ShortcutAction {
    return this.shortcutAction('is.workflow.actions.gettext', { WFTextActionText: text }, uuid);
  },

  /**
   * Create a "Set Variable" action
   */
  setVariableAction(variableName: string, value: unknown, uuid?: string): ShortcutAction {
    return this.shortcutAction(
      'is.workflow.actions.setvariable',
      { WFVariableName: variableName, WFInput: value },
      uuid,
    );
  },

  /**
   * Create a "Get Variable" action
   */
  getVariableAction(variableName: string, uuid?: string): ShortcutAction {
    return this.shortcutAction(
      'is.workflow.actions.getvariable',
      {
        WFVariable: {
          Value: { Type: 'Variable', VariableName: variableName },
          WFSerializationType: 'WFVariable',
        },
      },
      uuid,
    );
  },

  /**
   * Create an "If" conditional action (start)
   */
  ifAction(
    inputVar: unknown,
    condition: number,
    compareValue?: unknown,
    uuid?: string,
  ): ShortcutAction {
    return this.controlFlowAction(
      'is.workflow.actions.conditional',
      0, // WFControlFlowMode.Start
      {
        WFInput: inputVar,
        WFCondition: condition,
        ...(compareValue !== undefined && {
          WFConditionalActionString: compareValue,
        }),
      },
      uuid,
    );
  },

  /**
   * Create an "Otherwise" action
   */
  otherwiseAction(uuid?: string): ShortcutAction {
    return this.controlFlowAction(
      'is.workflow.actions.conditional',
      1, // WFControlFlowMode.Item
      {},
      uuid,
    );
  },

  /**
   * Create an "End If" action
   */
  endIfAction(uuid?: string): ShortcutAction {
    return this.controlFlowAction(
      'is.workflow.actions.conditional',
      2, // WFControlFlowMode.End
      {},
      uuid,
    );
  },

  /**
   * Create a "Repeat" action (start)
   */
  repeatAction(count: number, uuid?: string): ShortcutAction {
    return this.controlFlowAction(
      'is.workflow.actions.repeat.count',
      0, // WFControlFlowMode.Start
      { WFRepeatCount: count },
      uuid,
    );
  },

  /**
   * Create an "End Repeat" action
   */
  endRepeatAction(uuid?: string): ShortcutAction {
    return this.controlFlowAction(
      'is.workflow.actions.repeat.count',
      2, // WFControlFlowMode.End
      {},
      uuid,
    );
  },
};
