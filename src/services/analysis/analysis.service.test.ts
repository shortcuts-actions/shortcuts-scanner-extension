import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ParsedShortcut } from '../../utils/types';
import { apiKeyManagerService } from '../api-key-manager.service';
import { analysisService, type ProgressCallback } from './analysis.service';
import { llmClientService } from './llm-client.service';
import { preprocessingService } from './preprocessing.service';
import { validationService } from './validation.service';

// Mock dependencies
vi.mock('../api-key-manager.service');
vi.mock('./llm-client.service');
vi.mock('./preprocessing.service');
vi.mock('./validation.service');

describe('AnalysisService', () => {
  const mockShortcut: ParsedShortcut = {
    metadata: {
      name: 'Test Shortcut',
      icon: { downloadURL: 'https://example.com/icon.png' },
    },
    data: {
      WFWorkflowActions: [
        {
          WFWorkflowActionIdentifier: 'is.workflow.actions.gettext',
          WFWorkflowActionParameters: {
            WFTextActionText: 'Hello',
          },
        },
      ],
      WFWorkflowInputContentItemClasses: [],
      WFWorkflowMinimumClientVersion: 900,
      WFWorkflowTypes: [],
    },
    raw: {},
  };

  const mockPreprocessed = {
    shortcutName: 'Test Shortcut',
    actionCount: 1,
    enrichedActions: [],
    actionBreakdown: { critical: 0, high: 0, medium: 0, low: 1 },
    sources: [],
    sinks: [],
    flows: [],
    urls: [],
    domains: [],
    permissionsRequired: [],
    hasExternalCalls: false,
    hasSelfRecursion: false,
    acceptsShareSheet: false,
    inputTypes: [],
    storesData: false,
    sendsDataExternally: false,
  };

  const mockLLMResponse = {
    content: JSON.stringify({
      overallRisk: 'low',
      confidenceScore: 0.9,
      summary: {
        oneLiner: 'Simple text shortcut',
        forUser: 'This shortcut displays text.',
        forTechnical: 'Uses GetText action only.',
      },
      purposeAnalysis: {
        statedPurpose: 'Display text',
        actualPurpose: 'Display text',
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
    }),
    usage: { inputTokens: 100, outputTokens: 50 },
  };

  const mockProgressCallback: ProgressCallback = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(apiKeyManagerService.isUnlocked).mockResolvedValue(true);
    vi.mocked(apiKeyManagerService.getUnlockedKey).mockResolvedValue('test-api-key');
    vi.mocked(preprocessingService.process).mockReturnValue(mockPreprocessed);
    vi.mocked(llmClientService.call).mockResolvedValue(mockLLMResponse);
    vi.mocked(llmClientService.parseJSON).mockImplementation((content) => JSON.parse(content));
    vi.mocked(validationService.validate).mockReturnValue({
      overrides: [],
      additionalFlags: [],
      adjustedConfidence: 0.9,
    });
    vi.mocked(validationService.applyValidation).mockImplementation((result) => result);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('analyze', () => {
    it('should successfully analyze a shortcut in standard mode', async () => {
      const result = await analysisService.analyze(
        mockShortcut,
        'standard',
        'openai',
        'gpt-4',
        mockProgressCallback,
      );

      expect(result).toBeDefined();
      expect(result.overallRisk).toBe('low');
      expect(result.analysisMode).toBe('standard');
      expect(result.provider).toBe('openai');
      expect(result.model).toBe('gpt-4');

      // Verify progress callbacks
      expect(mockProgressCallback).toHaveBeenCalledWith('Checking API key...', 5);
      expect(mockProgressCallback).toHaveBeenCalledWith('Complete', 100);
    });

    it('should successfully analyze a shortcut in quick mode', async () => {
      const quickResponse = {
        content: JSON.stringify({
          overallRisk: 'low',
          oneLiner: 'Safe shortcut',
          topConcerns: [],
          verdict: 'safe',
          shouldInstall: true,
          needsDeepAnalysis: false,
        }),
        usage: { inputTokens: 50, outputTokens: 25 },
      };

      vi.mocked(llmClientService.call).mockResolvedValue(quickResponse);

      const result = await analysisService.analyze(
        mockShortcut,
        'quick',
        'openai',
        'gpt-4',
        mockProgressCallback,
      );

      expect(result.analysisMode).toBe('quick');
      expect('needsDeepAnalysis' in result).toBe(true);
      expect(validationService.validate).not.toHaveBeenCalled();
    });

    it('should successfully analyze a shortcut in deep mode', async () => {
      const result = await analysisService.analyze(
        mockShortcut,
        'deep',
        'anthropic',
        'claude-3-opus',
        mockProgressCallback,
      );

      expect(result.analysisMode).toBe('deep');
      expect(result.provider).toBe('anthropic');
      expect(result.model).toBe('claude-3-opus');
    });

    it('should throw error when API key is not unlocked', async () => {
      vi.mocked(apiKeyManagerService.isUnlocked).mockResolvedValue(false);

      await expect(
        analysisService.analyze(mockShortcut, 'standard', 'openai', 'gpt-4', mockProgressCallback),
      ).rejects.toMatchObject({
        code: 'SESSION_EXPIRED',
        message: 'API key session has expired. Please unlock to continue.',
      });
    });

    it('should throw error when API key cannot be retrieved', async () => {
      vi.mocked(apiKeyManagerService.getUnlockedKey).mockResolvedValue(null);

      await expect(
        analysisService.analyze(mockShortcut, 'standard', 'openai', 'gpt-4', mockProgressCallback),
      ).rejects.toMatchObject({
        code: 'SESSION_EXPIRED',
        message: 'Could not retrieve API key. Please unlock again.',
      });
    });

    it('should convert LLM errors to analysis errors', async () => {
      const llmError = {
        code: 'RATE_LIMIT' as const,
        message: 'Rate limit exceeded',
        retryAfterMs: 5000,
      };

      vi.mocked(llmClientService.call).mockRejectedValue(llmError);

      await expect(
        analysisService.analyze(mockShortcut, 'standard', 'openai', 'gpt-4', mockProgressCallback),
      ).rejects.toMatchObject({
        code: 'RATE_LIMIT',
        message: 'Rate limit exceeded',
        retryable: true,
        retryAfterMs: 5000,
      });
    });

    it('should handle INVALID_KEY LLM error', async () => {
      const llmError = {
        code: 'INVALID_KEY' as const,
        message: 'Invalid API key',
      };

      vi.mocked(llmClientService.call).mockRejectedValue(llmError);

      await expect(
        analysisService.analyze(mockShortcut, 'standard', 'openai', 'gpt-4', mockProgressCallback),
      ).rejects.toMatchObject({
        code: 'INVALID_KEY',
        message: 'Invalid API key',
        retryable: false,
      });
    });

    it('should handle NETWORK_ERROR LLM error', async () => {
      const llmError = {
        code: 'NETWORK_ERROR' as const,
        message: 'Network failed',
      };

      vi.mocked(llmClientService.call).mockRejectedValue(llmError);

      await expect(
        analysisService.analyze(mockShortcut, 'standard', 'openai', 'gpt-4', mockProgressCallback),
      ).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        message: 'Network failed',
        retryable: true,
      });
    });

    it('should apply validation for standard mode', async () => {
      const mockValidation = {
        overrides: ['Test override'],
        additionalFlags: [
          {
            flag: 'Test flag',
            severity: 'high' as const,
            explanation: 'Test explanation',
          },
        ],
        adjustedRisk: 'high' as const,
        adjustedConfidence: 0.7,
      };

      vi.mocked(validationService.validate).mockReturnValue(mockValidation);
      vi.mocked(validationService.applyValidation).mockImplementation((result, validation) => ({
        ...result,
        overallRisk: validation.adjustedRisk ?? result.overallRisk,
        confidenceScore: validation.adjustedConfidence,
        redFlags: [...result.redFlags, ...validation.additionalFlags],
        validationOverrides: validation.overrides,
      }));

      const result = await analysisService.analyze(
        mockShortcut,
        'standard',
        'openai',
        'gpt-4',
        mockProgressCallback,
      );

      expect(validationService.validate).toHaveBeenCalled();
      expect(validationService.applyValidation).toHaveBeenCalled();
      expect(result.overallRisk).toBe('high');
      if (result.analysisMode !== 'quick') {
        expect(result.confidenceScore).toBe(0.7);
      }
    });

    it('should parse findings correctly', async () => {
      const responseWithFindings = {
        content: JSON.stringify({
          overallRisk: 'medium',
          confidenceScore: 0.8,
          summary: {
            oneLiner: 'Test',
            forUser: 'Test user',
            forTechnical: 'Test technical',
          },
          purposeAnalysis: {
            statedPurpose: 'Test',
            actualPurpose: 'Test',
            purposeMismatch: false,
          },
          findings: [
            {
              id: 'F1',
              severity: 'high',
              category: 'data_access',
              title: 'Test Finding',
              description: 'Test description',
              userExplanation: 'User friendly explanation',
              affectedActions: [0, 1],
              evidence: 'Test evidence',
              potentialImpact: 'Test impact',
              mitigation: 'Test mitigation',
            },
          ],
          dataFlows: [],
          externalConnections: [],
          permissions: [],
          redFlags: [],
          positiveIndicators: [],
          recommendation: {
            verdict: 'caution',
            shouldInstall: false,
            conditions: ['Review findings'],
            userGuidance: 'Be careful',
          },
        }),
        usage: { inputTokens: 100, outputTokens: 50 },
      };

      vi.mocked(llmClientService.call).mockResolvedValue(responseWithFindings);

      const result = await analysisService.analyze(
        mockShortcut,
        'standard',
        'openai',
        'gpt-4',
        mockProgressCallback,
      );

      expect('findings' in result && result.findings).toHaveLength(1);
      if ('findings' in result) {
        expect(result.findings[0].id).toBe('F1');
        expect(result.findings[0].severity).toBe('high');
        expect(result.findings[0].category).toBe('data_access');
      }
    });

    it('should validate and default invalid risk levels', async () => {
      const invalidResponse = {
        content: JSON.stringify({
          overallRisk: 'invalid-risk',
          confidenceScore: 0.5,
          summary: {
            oneLiner: 'Test',
            forUser: 'Test',
            forTechnical: 'Test',
          },
          purposeAnalysis: {
            statedPurpose: 'Test',
            actualPurpose: 'Test',
            purposeMismatch: false,
          },
          findings: [],
          dataFlows: [],
          externalConnections: [],
          permissions: [],
          redFlags: [],
          positiveIndicators: [],
          recommendation: {
            verdict: 'safe',
            shouldInstall: true,
            conditions: [],
            userGuidance: 'Ok',
          },
        }),
        usage: { inputTokens: 100, outputTokens: 50 },
      };

      vi.mocked(llmClientService.call).mockResolvedValue(invalidResponse);

      const result = await analysisService.analyze(
        mockShortcut,
        'standard',
        'openai',
        'gpt-4',
        mockProgressCallback,
      );

      expect(result.overallRisk).toBe('medium'); // Default fallback
    });

    it('should validate and default invalid confidence scores', async () => {
      const invalidResponse = {
        content: JSON.stringify({
          overallRisk: 'low',
          confidenceScore: 5.0, // Invalid: should be 0-1
          summary: {
            oneLiner: 'Test',
            forUser: 'Test',
            forTechnical: 'Test',
          },
          purposeAnalysis: {
            statedPurpose: 'Test',
            actualPurpose: 'Test',
            purposeMismatch: false,
          },
          findings: [],
          dataFlows: [],
          externalConnections: [],
          permissions: [],
          redFlags: [],
          positiveIndicators: [],
          recommendation: {
            verdict: 'safe',
            shouldInstall: true,
            conditions: [],
            userGuidance: 'Ok',
          },
        }),
        usage: { inputTokens: 100, outputTokens: 50 },
      };

      vi.mocked(llmClientService.call).mockResolvedValue(invalidResponse);

      const result = await analysisService.analyze(
        mockShortcut,
        'standard',
        'openai',
        'gpt-4',
        mockProgressCallback,
      );

      // Check if it's an AnalysisResult (not QuickScanResult)
      expect(result.analysisMode).toBe('standard');
      if (result.analysisMode !== 'quick') {
        expect(result.confidenceScore).toBe(0.7); // Default fallback
      }
    });

    it('should parse external connections correctly', async () => {
      const responseWithConnections = {
        content: JSON.stringify({
          overallRisk: 'medium',
          confidenceScore: 0.8,
          summary: {
            oneLiner: 'Test',
            forUser: 'Test',
            forTechnical: 'Test',
          },
          purposeAnalysis: {
            statedPurpose: 'Test',
            actualPurpose: 'Test',
            purposeMismatch: false,
          },
          findings: [],
          dataFlows: [],
          externalConnections: [
            {
              url: 'https://api.example.com',
              purpose: 'Fetch data',
              dataSent: 'User input',
              isKnownService: true,
              serviceReputation: 'trusted',
              riskAssessment: 'Low risk',
            },
          ],
          permissions: [],
          redFlags: [],
          positiveIndicators: [],
          recommendation: {
            verdict: 'caution',
            shouldInstall: true,
            conditions: [],
            userGuidance: 'Review connections',
          },
        }),
        usage: { inputTokens: 100, outputTokens: 50 },
      };

      vi.mocked(llmClientService.call).mockResolvedValue(responseWithConnections);

      const result = await analysisService.analyze(
        mockShortcut,
        'standard',
        'openai',
        'gpt-4',
        mockProgressCallback,
      );

      if ('externalConnections' in result) {
        expect(result.externalConnections).toHaveLength(1);
        expect(result.externalConnections[0].url).toBe('https://api.example.com');
        expect(result.externalConnections[0].serviceReputation).toBe('trusted');
      }
    });

    it('should track analysis timestamp', async () => {
      const beforeTime = Date.now();
      const result = await analysisService.analyze(
        mockShortcut,
        'standard',
        'openai',
        'gpt-4',
        mockProgressCallback,
      );
      const afterTime = Date.now();

      expect(result.analyzedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(result.analyzedAt).toBeLessThanOrEqual(afterTime);
    });

    it('should handle missing summary fields gracefully', async () => {
      const responseWithMissingSummary = {
        content: JSON.stringify({
          overallRisk: 'low',
          confidenceScore: 0.9,
          summary: {},
          purposeAnalysis: {
            statedPurpose: 'Test',
            actualPurpose: 'Test',
            purposeMismatch: false,
          },
          findings: [],
          dataFlows: [],
          externalConnections: [],
          permissions: [],
          redFlags: [],
          positiveIndicators: [],
          recommendation: {
            verdict: 'safe',
            shouldInstall: true,
            conditions: [],
            userGuidance: 'Ok',
          },
        }),
        usage: { inputTokens: 100, outputTokens: 50 },
      };

      vi.mocked(llmClientService.call).mockResolvedValue(responseWithMissingSummary);

      const result = await analysisService.analyze(
        mockShortcut,
        'standard',
        'openai',
        'gpt-4',
        mockProgressCallback,
      );

      if ('summary' in result) {
        expect(result.summary.oneLiner).toBe('Analysis complete');
        expect(result.summary.forUser).toBe('No user summary available.');
        expect(result.summary.forTechnical).toBe('No technical summary available.');
      }
    });

    it('should handle quick scan with deep analysis recommendation', async () => {
      const quickResponseNeedingDeep = {
        content: JSON.stringify({
          overallRisk: 'high',
          oneLiner: 'Potentially risky',
          topConcerns: ['Network activity', 'Data access'],
          verdict: 'warning',
          shouldInstall: false,
          needsDeepAnalysis: true,
          reasonForDeepAnalysis: 'Complex network patterns detected',
        }),
        usage: { inputTokens: 50, outputTokens: 25 },
      };

      vi.mocked(llmClientService.call).mockResolvedValue(quickResponseNeedingDeep);

      const result = await analysisService.analyze(
        mockShortcut,
        'quick',
        'openai',
        'gpt-4',
        mockProgressCallback,
      );

      expect(result.analysisMode).toBe('quick');
      if ('needsDeepAnalysis' in result) {
        expect(result.needsDeepAnalysis).toBe(true);
        expect(result.reasonForDeepAnalysis).toBe('Complex network patterns detected');
      }
    });
  });
});
