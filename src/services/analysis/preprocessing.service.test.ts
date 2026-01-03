import { describe, expect, it } from 'vitest';
import type { ParsedShortcut, ShortcutAction } from '../../utils/types';
import { preprocessingService } from './preprocessing.service';

describe('PreprocessingService', () => {
  const createShortcut = (
    actions: ShortcutAction[],
    inputTypes: string[] = [],
  ): ParsedShortcut => ({
    metadata: {
      name: 'Test Shortcut',
    },
    data: {
      WFWorkflowActions: actions,
      WFWorkflowInputContentItemClasses: inputTypes,
      WFWorkflowTypes: [],
    },
    raw: {},
  });

  describe('process', () => {
    it('should process a simple shortcut', () => {
      const shortcut = createShortcut([
        {
          WFWorkflowActionIdentifier: 'is.workflow.actions.gettext',
          WFWorkflowActionParameters: {
            WFTextActionText: 'Hello',
          },
        },
      ]);

      const result = preprocessingService.process(shortcut);

      expect(result.shortcutName).toBe('Test Shortcut');
      expect(result.actionCount).toBe(1);
      expect(result.enrichedActions).toHaveLength(1);
      expect(result.enrichedActions[0].identifier).toBe('is.workflow.actions.gettext');
    });

    it('should classify action risk tiers correctly', () => {
      const shortcut = createShortcut([
        { WFWorkflowActionIdentifier: 'is.workflow.actions.runscript' }, // Critical
        { WFWorkflowActionIdentifier: 'is.workflow.actions.downloadurl' }, // High
        { WFWorkflowActionIdentifier: 'is.workflow.actions.getclipboard' }, // Medium
        { WFWorkflowActionIdentifier: 'is.workflow.actions.gettext' }, // Low
      ]);

      const result = preprocessingService.process(shortcut);

      expect(result.actionBreakdown.critical).toBe(1);
      expect(result.actionBreakdown.high).toBe(1);
      expect(result.actionBreakdown.medium).toBe(1);
      expect(result.actionBreakdown.low).toBe(1);
    });

    it('should extract URLs from action parameters', () => {
      const shortcut = createShortcut([
        {
          WFWorkflowActionIdentifier: 'is.workflow.actions.downloadurl',
          WFWorkflowActionParameters: {
            WFURL: 'https://api.example.com/data',
          },
        },
      ]);

      const result = preprocessingService.process(shortcut);

      expect(result.urls).toHaveLength(1);
      expect(result.urls[0].url).toBe('https://api.example.com/data');
      expect(result.urls[0].action).toBe(0);
      expect(result.urls[0].type).toBe('api_endpoint');
    });

    it('should extract domains from URLs', () => {
      const shortcut = createShortcut([
        {
          WFWorkflowActionIdentifier: 'is.workflow.actions.downloadurl',
          WFWorkflowActionParameters: {
            WFURL: 'https://api.example.com/data',
          },
        },
        {
          WFWorkflowActionIdentifier: 'is.workflow.actions.openurl',
          WFWorkflowActionParameters: {
            WFURL: 'https://example.com/page',
          },
        },
      ]);

      const result = preprocessingService.process(shortcut);

      expect(result.domains).toContain('api.example.com');
      expect(result.domains).toContain('example.com');
    });

    it('should identify data sources from actions', () => {
      const shortcut = createShortcut([
        {
          WFWorkflowActionIdentifier: 'is.workflow.actions.ask',
          WFWorkflowActionParameters: {
            WFAskActionPrompt: 'Enter your name',
          },
        },
        {
          WFWorkflowActionIdentifier: 'is.workflow.actions.getclipboard',
        },
      ]);

      const result = preprocessingService.process(shortcut);

      expect(result.sources.length).toBeGreaterThanOrEqual(2);
      expect(result.sources.some((s) => s.type === 'user_input')).toBe(true);
      expect(result.sources.some((s) => s.type === 'clipboard')).toBe(true);
    });

    it('should identify data sinks from actions', () => {
      const shortcut = createShortcut([
        {
          WFWorkflowActionIdentifier: 'is.workflow.actions.downloadurl',
          WFWorkflowActionParameters: {
            WFURL: 'https://example.com',
            WFHTTPMethod: 'POST',
          },
        },
        {
          WFWorkflowActionIdentifier: 'is.workflow.actions.showresult',
        },
      ]);

      const result = preprocessingService.process(shortcut);

      expect(result.sinks.length).toBeGreaterThanOrEqual(2);
      expect(result.sinks.some((s) => s.type === 'network')).toBe(true);
      expect(result.sinks.some((s) => s.type === 'display')).toBe(true);
    });

    it('should detect share sheet input', () => {
      const shortcut = createShortcut(
        [
          {
            WFWorkflowActionIdentifier: 'is.workflow.actions.gettext',
          },
        ],
        ['WFTextContentItem', 'WFImageContentItem'],
      );

      const result = preprocessingService.process(shortcut);

      expect(result.acceptsShareSheet).toBe(true);
      expect(result.inputTypes).toContain('WFTextContentItem');
      expect(result.inputTypes).toContain('WFImageContentItem');
    });

    it('should detect external shortcut calls', () => {
      const shortcut = createShortcut([
        {
          WFWorkflowActionIdentifier: 'is.workflow.actions.runworkflow',
          WFWorkflowActionParameters: {
            WFWorkflow: {
              workflowName: 'Other Shortcut',
              isSelf: false,
            },
          },
        },
      ]);

      const result = preprocessingService.process(shortcut);

      expect(result.hasExternalCalls).toBe(true);
    });

    it('should detect self-recursion', () => {
      const shortcut = createShortcut([
        {
          WFWorkflowActionIdentifier: 'is.workflow.actions.runworkflow',
          WFWorkflowActionParameters: {
            WFWorkflow: {
              isSelf: true,
            },
          },
        },
      ]);

      const result = preprocessingService.process(shortcut);

      expect(result.hasSelfRecursion).toBe(true);
    });

    it('should detect file storage', () => {
      const shortcut = createShortcut([
        {
          WFWorkflowActionIdentifier: 'is.workflow.actions.documentpicker.save',
          WFWorkflowActionParameters: {
            WFFilePath: '/path/to/file',
          },
        },
      ]);

      const result = preprocessingService.process(shortcut);

      expect(result.storesData).toBe(true);
    });

    it('should detect external data transmission', () => {
      const shortcut = createShortcut([
        {
          WFWorkflowActionIdentifier: 'is.workflow.actions.downloadurl',
          WFWorkflowActionParameters: {
            WFURL: 'https://example.com',
          },
        },
      ]);

      const result = preprocessingService.process(shortcut);

      expect(result.sendsDataExternally).toBe(true);
    });

    it('should identify required permissions', () => {
      const shortcut = createShortcut([
        { WFWorkflowActionIdentifier: 'is.workflow.actions.getcontacts' },
        { WFWorkflowActionIdentifier: 'is.workflow.actions.getcalendarevents' },
        { WFWorkflowActionIdentifier: 'is.workflow.actions.location' },
        { WFWorkflowActionIdentifier: 'is.workflow.actions.downloadurl' },
      ]);

      const result = preprocessingService.process(shortcut);

      expect(result.permissionsRequired).toContain('contacts');
      expect(result.permissionsRequired).toContain('calendar');
      expect(result.permissionsRequired).toContain('location');
      expect(result.permissionsRequired).toContain('network');
    });

    it('should categorize actions correctly', () => {
      const shortcut = createShortcut([
        { WFWorkflowActionIdentifier: 'is.workflow.actions.downloadurl' }, // network
        { WFWorkflowActionIdentifier: 'is.workflow.actions.getcontacts' }, // data_access
        { WFWorkflowActionIdentifier: 'is.workflow.actions.file.append' }, // file_ops
        { WFWorkflowActionIdentifier: 'is.workflow.actions.runscript' }, // system
        { WFWorkflowActionIdentifier: 'is.workflow.actions.ask' }, // user_interaction
      ]);

      const result = preprocessingService.process(shortcut);

      expect(result.enrichedActions[0].category).toBe('network');
      expect(result.enrichedActions[1].category).toBe('data_access');
      expect(result.enrichedActions[2].category).toBe('file_ops');
      expect(result.enrichedActions[3].category).toBe('system');
      expect(result.enrichedActions[4].category).toBe('user_interaction');
    });

    it('should extract flags for network actions', () => {
      const shortcut = createShortcut([
        {
          WFWorkflowActionIdentifier: 'is.workflow.actions.downloadurl',
          WFWorkflowActionParameters: {
            WFHTTPBodyType: 'JSON',
          },
        },
      ]);

      const result = preprocessingService.process(shortcut);

      expect(result.enrichedActions[0].flags).toContain('external_network');
      expect(result.enrichedActions[0].flags).toContain('sends_data');
    });

    it('should extract flags for data access actions', () => {
      const shortcut = createShortcut([
        {
          WFWorkflowActionIdentifier: 'is.workflow.actions.getcontacts',
        },
      ]);

      const result = preprocessingService.process(shortcut);

      expect(result.enrichedActions[0].flags).toContain('accesses_user_data');
    });

    it('should extract flags for file operations', () => {
      const shortcut = createShortcut([
        {
          WFWorkflowActionIdentifier: 'is.workflow.actions.documentpicker.save',
        },
      ]);

      const result = preprocessingService.process(shortcut);

      expect(result.enrichedActions[0].flags).toContain('writes_file');
    });

    it('should extract flags for system actions with scripts', () => {
      const shortcut = createShortcut([
        {
          WFWorkflowActionIdentifier: 'is.workflow.actions.runscript',
        },
      ]);

      const result = preprocessingService.process(shortcut);

      expect(result.enrichedActions[0].flags).toContain('system_access');
      expect(result.enrichedActions[0].flags).toContain('executes_code');
    });

    it('should build data flows from source to sink', () => {
      const shortcut = createShortcut([
        { WFWorkflowActionIdentifier: 'is.workflow.actions.getclipboard' },
        { WFWorkflowActionIdentifier: 'is.workflow.actions.gettext' },
        {
          WFWorkflowActionIdentifier: 'is.workflow.actions.downloadurl',
          WFWorkflowActionParameters: {
            WFURL: 'https://example.com',
            WFHTTPMethod: 'POST',
          },
        },
      ]);

      const result = preprocessingService.process(shortcut);

      expect(result.flows.length).toBeGreaterThan(0);
      expect(result.flows.some((f) => f.from.includes('clipboard'))).toBe(true);
      expect(result.flows.some((f) => f.to.includes('network'))).toBe(true);
    });

    it('should detect transforms in data flows', () => {
      const shortcut = createShortcut([
        { WFWorkflowActionIdentifier: 'is.workflow.actions.getclipboard' },
        {
          WFWorkflowActionIdentifier: 'is.workflow.actions.replacetext',
          WFWorkflowActionParameters: {
            WFReplaceTextFind: 'old',
            WFReplaceTextReplace: 'new',
          },
        },
        { WFWorkflowActionIdentifier: 'is.workflow.actions.base64encode' },
        {
          WFWorkflowActionIdentifier: 'is.workflow.actions.downloadurl',
          WFWorkflowActionParameters: {
            WFURL: 'https://example.com',
          },
        },
      ]);

      const result = preprocessingService.process(shortcut);

      const flow = result.flows.find((f) => f.from.includes('clipboard'));
      expect(flow).toBeDefined();
      // At least one transform should be detected
      expect(flow?.transforms.length).toBeGreaterThan(0);
      expect(flow?.transforms).toContain('encoding');
    });

    it('should find URLs in nested objects', () => {
      const shortcut = createShortcut([
        {
          WFWorkflowActionIdentifier: 'is.workflow.actions.downloadurl',
          WFWorkflowActionParameters: {
            WFHTTPHeaders: {
              Authorization: 'Bearer token',
            },
            Advanced: {
              WFURL: 'https://hidden.example.com/api',
            },
          },
        },
      ]);

      const result = preprocessingService.process(shortcut);

      expect(result.urls.some((u) => u.url.includes('hidden.example.com'))).toBe(true);
    });

    it('should classify URL types correctly', () => {
      const shortcut = createShortcut([
        {
          WFWorkflowActionIdentifier: 'is.workflow.actions.openurl',
          WFWorkflowActionParameters: {
            WFURL: 'https://console.example.com/dashboard',
          },
        },
        {
          WFWorkflowActionIdentifier: 'is.workflow.actions.downloadurl',
          WFWorkflowActionParameters: {
            WFURL: 'https://api.example.com/v1/data',
          },
        },
      ]);

      const result = preprocessingService.process(shortcut);

      expect(result.urls[0].type).toBe('user_navigation');
      expect(result.urls[1].type).toBe('api_endpoint');
    });

    it('should handle shortcuts with no actions', () => {
      const shortcut = createShortcut([]);

      const result = preprocessingService.process(shortcut);

      expect(result.actionCount).toBe(0);
      expect(result.enrichedActions).toHaveLength(0);
      expect(result.sources).toHaveLength(0);
      expect(result.sinks).toHaveLength(0);
    });

    it('should handle actions with no parameters', () => {
      const shortcut = createShortcut([
        {
          WFWorkflowActionIdentifier: 'is.workflow.actions.gettext',
        },
      ]);

      const result = preprocessingService.process(shortcut);

      expect(result.actionCount).toBe(1);
      expect(result.enrichedActions[0].parameters).toEqual({});
    });

    it('should detect file read operations', () => {
      const shortcut = createShortcut([
        {
          WFWorkflowActionIdentifier: 'is.workflow.actions.documentpicker.open',
          WFWorkflowActionParameters: {
            WFFilePath: '/path/to/file',
          },
        },
      ]);

      const result = preprocessingService.process(shortcut);

      expect(result.sources.some((s) => s.type === 'file_read')).toBe(true);
    });

    it('should detect message sinks', () => {
      const shortcut = createShortcut([
        {
          WFWorkflowActionIdentifier: 'is.workflow.actions.sharewith',
        },
      ]);

      const result = preprocessingService.process(shortcut);

      expect(result.sinks.some((s) => s.type === 'message')).toBe(true);
    });

    it('should detect clipboard sink', () => {
      const shortcut = createShortcut([
        {
          WFWorkflowActionIdentifier: 'is.workflow.actions.setclipboard',
        },
      ]);

      const result = preprocessingService.process(shortcut);

      expect(result.sinks.some((s) => s.type === 'clipboard')).toBe(true);
    });

    it('should include action indices in enriched actions', () => {
      const shortcut = createShortcut([
        { WFWorkflowActionIdentifier: 'is.workflow.actions.gettext' },
        { WFWorkflowActionIdentifier: 'is.workflow.actions.showresult' },
      ]);

      const result = preprocessingService.process(shortcut);

      expect(result.enrichedActions[0].index).toBe(0);
      expect(result.enrichedActions[1].index).toBe(1);
    });

    it('should handle complex shortcuts with many actions', () => {
      const actions: ShortcutAction[] = [];
      for (let i = 0; i < 50; i++) {
        actions.push({
          WFWorkflowActionIdentifier: 'is.workflow.actions.gettext',
          WFWorkflowActionParameters: {
            WFTextActionText: `Action ${i}`,
          },
        });
      }
      const shortcut = createShortcut(actions);

      const result = preprocessingService.process(shortcut);

      expect(result.actionCount).toBe(50);
      expect(result.enrichedActions).toHaveLength(50);
    });

    it('should handle duplicate URLs correctly', () => {
      const shortcut = createShortcut([
        {
          WFWorkflowActionIdentifier: 'is.workflow.actions.downloadurl',
          WFWorkflowActionParameters: {
            WFURL: 'https://example.com',
            WFInput: 'https://example.com', // Same URL in different field
          },
        },
      ]);

      const result = preprocessingService.process(shortcut);

      // The service detects duplicates and skips them
      const exampleUrls = result.urls.filter((u) => u.url === 'https://example.com');
      expect(exampleUrls.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle invalid URLs gracefully', () => {
      const shortcut = createShortcut([
        {
          WFWorkflowActionIdentifier: 'is.workflow.actions.downloadurl',
          WFWorkflowActionParameters: {
            WFURL: 'not-a-valid-url',
          },
        },
      ]);

      const result = preprocessingService.process(shortcut);

      // Should not crash, but may not extract the invalid URL
      expect(result).toBeDefined();
    });

    it('should detect data access permissions', () => {
      const shortcut = createShortcut([
        { WFWorkflowActionIdentifier: 'is.workflow.actions.selectphoto' },
        { WFWorkflowActionIdentifier: 'is.workflow.actions.getreminders' },
        { WFWorkflowActionIdentifier: 'is.workflow.actions.gethealthsample' },
      ]);

      const result = preprocessingService.process(shortcut);

      expect(result.permissionsRequired).toContain('photos');
      expect(result.permissionsRequired).toContain('reminders');
      expect(result.permissionsRequired).toContain('health');
    });
  });

  describe('generateSummary', () => {
    it('should generate a compact summary', () => {
      const preprocessed = preprocessingService.process(
        createShortcut([{ WFWorkflowActionIdentifier: 'is.workflow.actions.gettext' }]),
      );

      const summary = preprocessingService.generateSummary(preprocessed);

      expect(summary).toContain('Test Shortcut');
      expect(summary).toContain('Actions: 1');
    });

    it('should include domains in summary', () => {
      const preprocessed = preprocessingService.process(
        createShortcut([
          {
            WFWorkflowActionIdentifier: 'is.workflow.actions.downloadurl',
            WFWorkflowActionParameters: {
              WFURL: 'https://api.example.com/data',
            },
          },
        ]),
      );

      const summary = preprocessingService.generateSummary(preprocessed);

      expect(summary).toContain('Domains contacted');
      expect(summary).toContain('api.example.com');
    });

    it('should limit URLs in summary to 10', () => {
      const actions: ShortcutAction[] = [];
      for (let i = 0; i < 15; i++) {
        actions.push({
          WFWorkflowActionIdentifier: 'is.workflow.actions.downloadurl',
          WFWorkflowActionParameters: {
            WFURL: `https://example${i}.com`,
          },
        });
      }

      const preprocessed = preprocessingService.process(createShortcut(actions));
      const summary = preprocessingService.generateSummary(preprocessed);

      expect(summary).toContain('and 5 more');
    });
  });

  describe('getHighRiskActions', () => {
    it('should return only critical and high risk actions', () => {
      const preprocessed = preprocessingService.process(
        createShortcut([
          { WFWorkflowActionIdentifier: 'is.workflow.actions.runscript' }, // Critical
          { WFWorkflowActionIdentifier: 'is.workflow.actions.downloadurl' }, // High
          { WFWorkflowActionIdentifier: 'is.workflow.actions.getclipboard' }, // Medium
          { WFWorkflowActionIdentifier: 'is.workflow.actions.gettext' }, // Low
        ]),
      );

      const highRiskActions = preprocessingService.getHighRiskActions(preprocessed);

      expect(highRiskActions).toHaveLength(2);
      expect(highRiskActions[0].riskTier).toBe('critical');
      expect(highRiskActions[1].riskTier).toBe('high');
    });

    it('should return empty array when no high risk actions', () => {
      const preprocessed = preprocessingService.process(
        createShortcut([{ WFWorkflowActionIdentifier: 'is.workflow.actions.gettext' }]),
      );

      const highRiskActions = preprocessingService.getHighRiskActions(preprocessed);

      expect(highRiskActions).toHaveLength(0);
    });
  });
});
