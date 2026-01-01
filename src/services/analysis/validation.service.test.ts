import { describe, expect, it } from 'vitest';
import type { AnalysisResult, PreprocessedData } from '../../utils/analysis-types';
import { validationService } from './validation.service';

describe('ValidationService', () => {
  const mockPreprocessed: PreprocessedData = {
    shortcutName: 'Test Shortcut',
    actionCount: 10,
    enrichedActions: [
      {
        index: 0,
        identifier: 'is.workflow.actions.gettext',
        friendlyName: 'Text',
        category: 'other',
        riskTier: 'low',
        parameters: {},
        inputSources: [],
        outputTargets: [],
        flags: [],
      },
      {
        index: 1,
        identifier: 'is.workflow.actions.getclipboard',
        friendlyName: 'Get Clipboard',
        category: 'data_access',
        riskTier: 'medium',
        parameters: {},
        inputSources: [],
        outputTargets: [],
        flags: ['accesses_user_data'],
      },
    ],
    actionBreakdown: { critical: 0, high: 0, medium: 1, low: 9 },
    sources: [],
    sinks: [],
    flows: [],
    urls: [],
    domains: [],
    permissionsRequired: ['clipboard'],
    hasExternalCalls: false,
    hasSelfRecursion: false,
    acceptsShareSheet: false,
    inputTypes: [],
    storesData: false,
    sendsDataExternally: false,
  };

  const mockLLMResult: AnalysisResult = {
    overallRisk: 'low',
    confidenceScore: 0.9,
    summary: {
      oneLiner: 'Simple shortcut',
      forUser: 'Safe to use',
      forTechnical: 'No issues found',
    },
    purposeAnalysis: {
      statedPurpose: 'Get text',
      actualPurpose: 'Get text',
      purposeMismatch: false,
    },
    findings: [],
    dataFlows: [],
    externalConnections: [],
    permissions: [],
    redFlags: [],
    positiveIndicators: ['Simple action'],
    recommendation: {
      verdict: 'safe',
      shouldInstall: true,
      conditions: [],
      userGuidance: 'Safe to use',
    },
    analysisMode: 'standard',
    analyzedAt: Date.now(),
    provider: 'openai',
    model: 'gpt-4',
  };

  describe('validate', () => {
    it('should return clean validation for safe shortcut', () => {
      const result = validationService.validate(mockLLMResult, mockPreprocessed);

      expect(result.overrides).toHaveLength(0);
      expect(result.additionalFlags).toHaveLength(0);
      expect(result.adjustedRisk).toBeUndefined();
      expect(result.adjustedConfidence).toBe(0.9);
    });

    it('should detect suspicious domains', () => {
      const preprocessedWithSuspiciousDomain: PreprocessedData = {
        ...mockPreprocessed,
        urls: [
          {
            url: 'https://pastebin.com/raw/abc123',
            action: 2,
            type: 'api_endpoint',
          },
        ],
        domains: ['pastebin.com'],
      };

      const result = validationService.validate(mockLLMResult, preprocessedWithSuspiciousDomain);

      expect(result.additionalFlags.length).toBeGreaterThan(0);
      expect(result.additionalFlags[0].flag).toContain('Suspicious domain detected');
      expect(result.additionalFlags[0].severity).toBe('high');
      expect(result.adjustedConfidence).toBeLessThan(0.9);
    });

    it('should detect path traversal patterns', () => {
      const preprocessedWithPathTraversal: PreprocessedData = {
        ...mockPreprocessed,
        enrichedActions: [
          {
            index: 0,
            identifier: 'is.workflow.actions.file.append',
            friendlyName: 'Append to File',
            category: 'file_ops',
            riskTier: 'high',
            parameters: {
              WFFilePath: '../../etc/passwd',
            },
            inputSources: [],
            outputTargets: [],
            flags: ['writes_file'],
          },
        ],
      };

      const result = validationService.validate(mockLLMResult, preprocessedWithPathTraversal);

      expect(result.additionalFlags).toContainEqual(
        expect.objectContaining({
          flag: 'Path traversal pattern detected',
          severity: 'critical',
        }),
      );
      expect(result.adjustedRisk).toBe('critical');
      expect(result.overrides).toContain('Elevated to critical due to path traversal detection');
    });

    it('should detect hardcoded API keys', () => {
      const preprocessedWithApiKey: PreprocessedData = {
        ...mockPreprocessed,
        enrichedActions: [
          {
            index: 0,
            identifier: 'is.workflow.actions.downloadurl',
            friendlyName: 'Get Contents of URL',
            category: 'network',
            riskTier: 'high',
            parameters: {
              WFHTTPHeaders: {
                Authorization: 'Bearer sk-1234567890abcdefghijklmnopqrstuvwxyz',
              },
            },
            inputSources: [],
            outputTargets: [],
            flags: ['external_network'],
          },
        ],
      };

      const result = validationService.validate(mockLLMResult, preprocessedWithApiKey);

      expect(result.additionalFlags.length).toBeGreaterThan(0);
      expect(result.additionalFlags.some((flag) => flag.flag.includes('API key'))).toBe(true);
    });

    it('should detect clipboard exfiltration pattern', () => {
      const preprocessedWithExfiltration: PreprocessedData = {
        ...mockPreprocessed,
        sources: [{ type: 'clipboard', action: 0 }],
        sinks: [
          {
            type: 'network',
            action: 2,
            url: 'https://example.com/collect',
            method: 'POST',
          },
        ],
        enrichedActions: [
          {
            index: 0,
            identifier: 'is.workflow.actions.getclipboard',
            friendlyName: 'Get Clipboard',
            category: 'data_access',
            riskTier: 'medium',
            parameters: {},
            inputSources: [],
            outputTargets: [],
            flags: [],
          },
          {
            index: 1,
            identifier: 'is.workflow.actions.text',
            friendlyName: 'Text',
            category: 'other',
            riskTier: 'low',
            parameters: {},
            inputSources: [],
            outputTargets: [],
            flags: [],
          },
          {
            index: 2,
            identifier: 'is.workflow.actions.downloadurl',
            friendlyName: 'Get Contents of URL',
            category: 'network',
            riskTier: 'high',
            parameters: {},
            inputSources: [],
            outputTargets: [],
            flags: [],
          },
        ],
      };

      const result = validationService.validate(mockLLMResult, preprocessedWithExfiltration);

      expect(result.additionalFlags).toContainEqual(
        expect.objectContaining({
          flag: 'Clipboard data sent to network',
          severity: 'high',
        }),
      );
      expect(result.adjustedRisk).toBe('high');
    });

    it('should detect inconsistency when LLM claims no network but URLs exist', () => {
      const llmResultWithInconsistency: AnalysisResult = {
        ...mockLLMResult,
        externalConnections: [],
        summary: {
          oneLiner: 'Simple shortcut',
          forUser: 'No network activity',
          forTechnical: 'This shortcut has no network access',
        },
      };

      const preprocessedWithUrls: PreprocessedData = {
        ...mockPreprocessed,
        urls: [{ url: 'https://example.com', action: 0, type: 'api_endpoint' }],
      };

      const result = validationService.validate(llmResultWithInconsistency, preprocessedWithUrls);

      expect(result.overrides).toContain(
        'Inconsistency: LLM claims no network activity but URLs were detected',
      );
      expect(result.adjustedConfidence).toBeLessThan(0.9);
    });

    it('should detect inconsistency when LLM says safe but critical actions present', () => {
      const preprocessedWithCriticalActions: PreprocessedData = {
        ...mockPreprocessed,
        actionBreakdown: { critical: 1, high: 0, medium: 0, low: 0 },
      };

      const result = validationService.validate(mockLLMResult, preprocessedWithCriticalActions);

      expect(result.overrides).toContain(
        'Inconsistency: LLM says safe but critical-risk actions present',
      );
      expect(result.adjustedConfidence).toBeLessThan(0.9);
    });

    it('should detect inconsistency when data flows missed by LLM', () => {
      const llmResultNoFlows: AnalysisResult = {
        ...mockLLMResult,
        dataFlows: [],
      };

      const preprocessedWithFlows: PreprocessedData = {
        ...mockPreprocessed,
        flows: [
          {
            from: 'source:clipboard',
            to: 'sink:network',
            via: [0, 1, 2],
            transforms: [],
          },
        ],
        sendsDataExternally: true,
      };

      const result = validationService.validate(llmResultNoFlows, preprocessedWithFlows);

      expect(result.overrides).toContain(
        'Inconsistency: Data flows detected but not reported by LLM',
      );
    });

    it('should reduce confidence for large shortcuts', () => {
      const largeShortcut: PreprocessedData = {
        ...mockPreprocessed,
        actionCount: 150,
      };

      const result = validationService.validate(mockLLMResult, largeShortcut);

      expect(result.adjustedConfidence).toBeLessThan(0.9);
      expect(result.overrides).toContain('Reduced confidence due to large shortcut size');
    });

    it('should detect obfuscation with base64', () => {
      const preprocessedWithObfuscation: PreprocessedData = {
        ...mockPreprocessed,
        enrichedActions: [
          {
            index: 0,
            identifier: 'is.workflow.actions.gettext',
            friendlyName: 'Text',
            category: 'other',
            riskTier: 'low',
            parameters: {
              WFTextActionText:
                'SGVsbG8gV29ybGQgdGhpcyBpcyBhIHZlcnkgbG9uZyBiYXNlNjQgZW5jb2RlZCBzdHJpbmc=',
            },
            inputSources: [],
            outputTargets: [],
            flags: [],
          },
        ],
      };

      const result = validationService.validate(mockLLMResult, preprocessedWithObfuscation);

      expect(result.adjustedConfidence).toBeLessThan(0.9);
      expect(result.overrides).toContain('Reduced confidence due to obfuscation patterns');
    });

    it('should override LLM verdict when critical issues found', () => {
      const llmResultSafe: AnalysisResult = {
        ...mockLLMResult,
        recommendation: {
          verdict: 'safe',
          shouldInstall: true,
          conditions: [],
          userGuidance: 'Safe to use',
        },
      };

      const preprocessedWithPathTraversal: PreprocessedData = {
        ...mockPreprocessed,
        enrichedActions: [
          {
            index: 0,
            identifier: 'is.workflow.actions.file.append',
            friendlyName: 'Append',
            category: 'file_ops',
            riskTier: 'high',
            parameters: { WFFilePath: '../../../etc/passwd' },
            inputSources: [],
            outputTargets: [],
            flags: [],
          },
        ],
      };

      const result = validationService.validate(llmResultSafe, preprocessedWithPathTraversal);

      expect(result.adjustedRisk).toBe('critical');
      expect(result.overrides).toContain(
        'Overriding LLM verdict from "safe" to "warning" due to critical findings',
      );
    });

    it('should keep confidence in valid range', () => {
      const preprocessedMultipleIssues: PreprocessedData = {
        ...mockPreprocessed,
        actionCount: 200,
        urls: [
          { url: 'https://pastebin.com/abc', action: 0, type: 'api_endpoint' },
          { url: 'https://hastebin.com/def', action: 1, type: 'api_endpoint' },
        ],
        domains: ['pastebin.com', 'hastebin.com'],
        enrichedActions: [
          {
            index: 0,
            identifier: 'is.workflow.actions.gettext',
            friendlyName: 'Text',
            category: 'other',
            riskTier: 'low',
            parameters: {
              WFTextActionText: 'dGhpcyBpcyBhIHZlcnkgbG9uZyBiYXNlNjQgc3RyaW5nIGhlcmU=',
            },
            inputSources: [],
            outputTargets: [],
            flags: [],
          },
        ],
      };

      const llmResultNoFlows: AnalysisResult = {
        ...mockLLMResult,
        dataFlows: [],
      };

      const preprocessedWithFlows: PreprocessedData = {
        ...preprocessedMultipleIssues,
        flows: [{ from: 'a', to: 'b', via: [0], transforms: [] }],
        sendsDataExternally: true,
      };

      const result = validationService.validate(llmResultNoFlows, preprocessedWithFlows);

      expect(result.adjustedConfidence).toBeGreaterThanOrEqual(0);
      expect(result.adjustedConfidence).toBeLessThanOrEqual(1);
    });

    it('should detect multiple suspicious domains', () => {
      const preprocessedWithMultipleDomains: PreprocessedData = {
        ...mockPreprocessed,
        urls: [
          { url: 'https://pastebin.com/abc', action: 0, type: 'api_endpoint' },
          { url: 'https://hastebin.com/def', action: 1, type: 'api_endpoint' },
          { url: 'https://rentry.co/xyz', action: 2, type: 'api_endpoint' },
        ],
        domains: ['pastebin.com', 'hastebin.com', 'rentry.co'],
      };

      const result = validationService.validate(mockLLMResult, preprocessedWithMultipleDomains);

      const suspiciousDomainFlags = result.additionalFlags.filter((flag) =>
        flag.flag.includes('Suspicious domain'),
      );
      expect(suspiciousDomainFlags.length).toBe(3);
    });

    it('should detect Anthropic API key pattern', () => {
      const preprocessedWithAnthropicKey: PreprocessedData = {
        ...mockPreprocessed,
        enrichedActions: [
          {
            index: 0,
            identifier: 'is.workflow.actions.downloadurl',
            friendlyName: 'Get URL',
            category: 'network',
            riskTier: 'high',
            parameters: {
              WFHTTPHeaders: {
                'x-api-key': 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz',
              },
            },
            inputSources: [],
            outputTargets: [],
            flags: [],
          },
        ],
      };

      const result = validationService.validate(mockLLMResult, preprocessedWithAnthropicKey);

      expect(
        result.additionalFlags.some((flag) => flag.flag.includes('Anthropic API key')),
      ).toBe(true);
    });

    it('should detect GitHub token pattern', () => {
      const preprocessedWithGitHubToken: PreprocessedData = {
        ...mockPreprocessed,
        enrichedActions: [
          {
            index: 0,
            identifier: 'is.workflow.actions.downloadurl',
            friendlyName: 'Get URL',
            category: 'network',
            riskTier: 'high',
            parameters: {
              Authorization: 'token ghp_1234567890abcdefghijklmnopqrstuvwxyz12',
            },
            inputSources: [],
            outputTargets: [],
            flags: [],
          },
        ],
      };

      const result = validationService.validate(mockLLMResult, preprocessedWithGitHubToken);

      expect(
        result.additionalFlags.some((flag) => flag.flag.includes('GitHub Personal Access Token')),
      ).toBe(true);
    });
  });

  describe('applyValidation', () => {
    it('should apply adjusted confidence', () => {
      const validation = {
        overrides: [],
        additionalFlags: [],
        adjustedConfidence: 0.5,
      };

      const result = validationService.applyValidation(mockLLMResult, validation);

      expect(result.confidenceScore).toBe(0.5);
    });

    it('should apply adjusted risk', () => {
      const validation = {
        overrides: [],
        additionalFlags: [],
        adjustedRisk: 'critical' as const,
        adjustedConfidence: 0.9,
      };

      const result = validationService.applyValidation(mockLLMResult, validation);

      expect(result.overallRisk).toBe('critical');
    });

    it('should merge additional flags', () => {
      const validation = {
        overrides: [],
        additionalFlags: [
          {
            flag: 'New flag',
            severity: 'high' as const,
            explanation: 'Test',
          },
        ],
        adjustedConfidence: 0.9,
      };

      const result = validationService.applyValidation(mockLLMResult, validation);

      expect(result.redFlags).toHaveLength(1);
      expect(result.redFlags[0].flag).toBe('New flag');
    });

    it('should add validation overrides', () => {
      const validation = {
        overrides: ['Override 1', 'Override 2'],
        additionalFlags: [],
        adjustedConfidence: 0.9,
      };

      const result = validationService.applyValidation(mockLLMResult, validation);

      expect(result.validationOverrides).toEqual(['Override 1', 'Override 2']);
    });

    it('should not add empty overrides', () => {
      const validation = {
        overrides: [],
        additionalFlags: [],
        adjustedConfidence: 0.9,
      };

      const result = validationService.applyValidation(mockLLMResult, validation);

      expect(result.validationOverrides).toBeUndefined();
    });

    it('should upgrade verdict when critical risk detected', () => {
      const llmResultSafe: AnalysisResult = {
        ...mockLLMResult,
        recommendation: {
          verdict: 'safe',
          shouldInstall: true,
          conditions: [],
          userGuidance: 'Safe',
        },
      };

      const validation = {
        overrides: ['Critical issue found'],
        additionalFlags: [],
        adjustedRisk: 'critical' as const,
        adjustedConfidence: 0.9,
      };

      const result = validationService.applyValidation(llmResultSafe, validation);

      expect(result.recommendation.verdict).toBe('warning');
    });

    it('should preserve verdict when no critical risk', () => {
      const validation = {
        overrides: [],
        additionalFlags: [],
        adjustedRisk: 'medium' as const,
        adjustedConfidence: 0.9,
      };

      const result = validationService.applyValidation(mockLLMResult, validation);

      expect(result.recommendation.verdict).toBe('safe');
    });
  });
});
