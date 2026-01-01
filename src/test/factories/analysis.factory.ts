import { faker } from '@faker-js/faker';
import type {
  AnalysisMode,
  AnalysisResult,
  QuickScanResult,
  RiskLevel,
  SupportedProvider,
} from '../../utils/analysis-types';

export const analysisFactory = {
  /**
   * Generate a mock analysis result
   */
  analysisResult: (overrides?: Partial<AnalysisResult>): AnalysisResult => ({
    overallRisk: overrides?.overallRisk || 'low',
    confidenceScore: overrides?.confidenceScore || 85,
    summary: overrides?.summary || {
      oneLiner: faker.lorem.sentence(),
      forUser: faker.lorem.paragraph(),
      forTechnical: faker.lorem.paragraph(),
    },
    purposeAnalysis: overrides?.purposeAnalysis || {
      statedPurpose: faker.lorem.sentence(),
      actualPurpose: faker.lorem.sentence(),
      purposeMismatch: false,
      mismatchExplanation: undefined,
    },
    findings: overrides?.findings || [],
    dataFlows: overrides?.dataFlows || [],
    externalConnections: overrides?.externalConnections || [],
    permissions: overrides?.permissions || [],
    redFlags: overrides?.redFlags || [],
    positiveIndicators: overrides?.positiveIndicators || [],
    recommendation: overrides?.recommendation || {
      verdict: 'safe',
      shouldInstall: true,
      conditions: [],
      userGuidance: faker.lorem.sentence(),
    },
    analysisMode: overrides?.analysisMode || 'standard',
    analyzedAt: overrides?.analyzedAt || Date.now(),
    provider: overrides?.provider || 'openai',
    model: overrides?.model || 'gpt-4o',
    ...overrides,
  }),

  /**
   * Generate a mock quick scan result
   */
  quickScanResult: (overrides?: Partial<QuickScanResult>): QuickScanResult => ({
    overallRisk: overrides?.overallRisk || 'low',
    oneLiner: overrides?.oneLiner || faker.lorem.sentence(),
    topConcerns: overrides?.topConcerns || [],
    verdict: overrides?.verdict || 'safe',
    shouldInstall: overrides?.shouldInstall ?? true,
    needsDeepAnalysis: overrides?.needsDeepAnalysis ?? false,
    reasonForDeepAnalysis: overrides?.reasonForDeepAnalysis,
    analysisMode: 'quick' as const,
    analyzedAt: overrides?.analyzedAt || Date.now(),
    provider: overrides?.provider || 'openai',
    model: overrides?.model || 'gpt-4o',
    ...overrides,
  }),

  /**
   * Generate a random risk level
   */
  riskLevel: (): RiskLevel => {
    return faker.helpers.arrayElement(['critical', 'high', 'medium', 'low'] as const);
  },

  /**
   * Generate a random analysis mode
   */
  analysisMode: (): AnalysisMode => {
    return faker.helpers.arrayElement(['quick', 'standard', 'deep'] as const);
  },

  /**
   * Generate a random provider
   */
  provider: (): SupportedProvider => {
    return faker.helpers.arrayElement(['openai', 'anthropic', 'openrouter'] as const);
  },
};
