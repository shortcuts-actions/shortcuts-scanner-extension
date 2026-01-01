import { faker } from '@faker-js/faker';
import type {
  ParsedShortcut,
  ShortcutAction,
  ShortcutData,
  ShortcutMetadata,
} from '../../utils/types';

export const shortcutFactory = {
  /**
   * Generate a mock shortcut action
   */
  action: (overrides?: Partial<ShortcutAction>): ShortcutAction => ({
    WFWorkflowActionIdentifier:
      overrides?.WFWorkflowActionIdentifier ||
      faker.helpers.arrayElement([
        'is.workflow.actions.url',
        'is.workflow.actions.getcontentsofurl',
        'is.workflow.actions.setvariable',
        'is.workflow.actions.conditional',
      ]),
    WFWorkflowActionParameters: overrides?.WFWorkflowActionParameters || {},
    UUID: overrides?.UUID || faker.string.uuid(),
    ...overrides,
  }),

  /**
   * Generate mock shortcut metadata
   */
  metadata: (overrides?: Partial<ShortcutMetadata>): ShortcutMetadata => ({
    name: overrides?.name || faker.lorem.words(3),
    color: overrides?.color ?? faker.number.int({ min: 0, max: 16 }),
    glyph: overrides?.glyph ?? faker.number.int({ min: 0, max: 100 }),
    icon: overrides?.icon || {
      downloadURL: faker.internet.url(),
    },
    isSigned: overrides?.isSigned ?? faker.datatype.boolean(),
    ...overrides,
  }),

  /**
   * Generate mock shortcut data
   */
  data: (overrides?: Partial<ShortcutData>): ShortcutData => ({
    WFWorkflowActions: overrides?.WFWorkflowActions || [shortcutFactory.action()],
    WFWorkflowClientVersion: overrides?.WFWorkflowClientVersion || '2302.0.4',
    WFWorkflowClientRelease: overrides?.WFWorkflowClientRelease || '17.0',
    WFWorkflowMinimumClientVersion: overrides?.WFWorkflowMinimumClientVersion ?? 1200,
    WFWorkflowMinimumClientRelease: overrides?.WFWorkflowMinimumClientRelease || '12.0',
    WFWorkflowIcon: overrides?.WFWorkflowIcon || {
      WFWorkflowIconStartColor: faker.number.int({ min: 0, max: 16 }),
      WFWorkflowIconGlyphNumber: faker.number.int({ min: 0, max: 100 }),
    },
    WFWorkflowTypes: overrides?.WFWorkflowTypes || ['NCWidgetExtension'],
    WFWorkflowInputContentItemClasses: overrides?.WFWorkflowInputContentItemClasses || [
      'WFAppStoreAppContentItem',
      'WFArticleContentItem',
    ],
    recordName: overrides?.recordName || faker.string.uuid(),
    recordType: overrides?.recordType || 'com.apple.shortcuts',
    deleted: overrides?.deleted ?? false,
    modified: overrides?.modified || {
      timestamp: faker.date.recent().getTime(),
      deviceId: faker.string.uuid(),
      userRecordName: faker.internet.userName(),
    },
    created: overrides?.created || {
      timestamp: faker.date.past().getTime(),
      deviceId: faker.string.uuid(),
      userRecordName: faker.internet.userName(),
    },
    ...overrides,
  }),

  /**
   * Generate a complete parsed shortcut
   */
  parsedShortcut: (overrides?: Partial<ParsedShortcut>): ParsedShortcut => {
    const metadata = overrides?.metadata || shortcutFactory.metadata();
    const data = overrides?.data || shortcutFactory.data();

    return {
      metadata,
      data,
      raw: overrides?.raw || { metadata, data },
      ...overrides,
    };
  },

  /**
   * Generate a shortcut with risky actions
   */
  riskyShortcut: (): ParsedShortcut => {
    return shortcutFactory.parsedShortcut({
      data: shortcutFactory.data({
        WFWorkflowActions: [
          shortcutFactory.action({
            WFWorkflowActionIdentifier: 'is.workflow.actions.getcontentsofurl',
            WFWorkflowActionParameters: {
              WFHTTPMethod: 'POST',
              WFJSONValues: { apiKey: 'hardcoded-key' },
            },
          }),
          shortcutFactory.action({
            WFWorkflowActionIdentifier: 'is.workflow.actions.runshellscript',
            WFWorkflowActionParameters: {
              WFShellScriptInputMethod: 'Text',
              WFShellScript: 'curl http://malicious.com',
            },
          }),
        ],
      }),
    });
  },

  /**
   * Generate a network action (high risk)
   */
  networkAction: (): ShortcutAction => ({
    WFWorkflowActionIdentifier: 'is.workflow.actions.downloadurl',
    WFWorkflowActionParameters: {
      WFHTTPMethod: 'GET',
      WFURL: faker.internet.url(),
    },
    UUID: faker.string.uuid(),
  }),

  /**
   * Generate a script action (critical risk)
   */
  scriptAction: (): ShortcutAction => ({
    WFWorkflowActionIdentifier: 'is.workflow.actions.runscript',
    WFWorkflowActionParameters: {
      WFScript: 'echo "Hello World"',
    },
    UUID: faker.string.uuid(),
  }),
};
