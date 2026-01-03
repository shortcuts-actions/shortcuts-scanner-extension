// Type definitions for security analysis feature

// ============================================================================
// Provider and Model Types
// ============================================================================

export type SupportedProvider = 'openai' | 'anthropic' | 'openrouter';

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
}

export const SUPPORTED_MODELS: Record<SupportedProvider, ModelInfo[]> = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable, best for deep analysis' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and cost-effective' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'High capability, 128K context' },
  ],
  anthropic: [
    {
      id: 'claude-sonnet-4-5',
      name: 'Claude Sonnet 4.5',
      description: 'Best balance of speed and capability. Latest model.',
    },
    {
      id: 'claude-opus-4-5',
      name: 'Claude Opus 4.5',
      description: 'Most capable, best for deep analysis. Latest model.',
    },
    {
      id: 'claude-sonnet-4-0',
      name: 'Claude Sonnet 4',
      description: 'Best balance of speed and capability',
    },
    {
      id: 'claude-opus-4-1',
      name: 'Claude Opus 4.1',
      description: 'Most capable, best for deep analysis',
    },
    {
      id: 'claude-haiku-4-5',
      name: 'Claude 4.5 Haiku',
      description: 'Fast and cost-effective',
    },
  ],
  openrouter: [
    {
      id: 'anthropic/claude-sonnet-4-5',
      name: 'Claude Sonnet 4.5',
      description: 'Best balance of speed and capability',
    },
    {
      id: 'anthropic/claude-opus-4-5',
      name: 'Claude Opus 4.5',
      description: 'Most capable, best for deep analysis',
    },
    { id: 'openai/gpt-4o', name: 'GPT-4o', description: 'Most capable OpenAI model' },
    {
      id: 'openai/gpt-4o-mini',
      name: 'GPT-4o Mini',
      description: 'Fast and cost-effective OpenAI model',
    },
    {
      id: 'google/gemini-2.0-flash-exp',
      name: 'Gemini 2.0 Flash',
      description: 'Fast Google model',
    },
    {
      id: 'google/gemini-pro-1.5',
      name: 'Gemini Pro 1.5',
      description: 'Capable Google model',
    },
    {
      id: 'deepseek/deepseek-v3.2',
      name: 'DeepSeek v3.2',
      description: 'Capable DeepSeek model',
    },
    {
      id: 'qwen/qwen3-max',
      name: 'Qwen3 Max',
      description: 'High performance Qwen model',
    },
    {
      id: 'meta-llama/llama-3.1-405b',
      name: 'Llama 3.1',
      description: 'Large Meta Llama model',
    },
    {
      id: 'meta-llama/llama-3.3-70b-instruct:free',
      name: 'Llama 3.3 Instruct (Free)',
      description: 'Free Meta Llama instruct model',
    },
    {
      id: 'deepseek/deepseek-r1-0528:free',
      name: 'DeepSeek R1 (Free)',
      description: 'Free DeepSeek model',
    },
    {
      id: 'allenai/olmo-3.1-32b-think:free',
      name: 'Olmo 3.1 Think (Free)',
      description: 'Free AllenAI Olmo model',
    },
    {
      id: 'xiaomi/mimo-v2-flash:free',
      name: 'Mimo v2 Flash (Free)',
      description: 'Free Xiaomi Mimo model',
    },
  ],
};

export const PROVIDER_DISPLAY_NAMES: Record<SupportedProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  openrouter: 'OpenRouter',
};

// Special ID for the "Other" custom model option
export const CUSTOM_MODEL_OPTION_ID = '__custom__';

// ============================================================================
// Analysis Mode and Risk Types
// ============================================================================

export type AnalysisMode = 'quick' | 'standard' | 'deep';

export interface AnalysisModeInfo {
  id: AnalysisMode;
  name: string;
  description: string;
  estimatedTime: string;
}

export const ANALYSIS_MODES: AnalysisModeInfo[] = [
  {
    id: 'quick',
    name: 'Quick Scan',
    description: 'Basic safety check',
    estimatedTime: '~5 seconds',
  },
  {
    id: 'standard',
    name: 'Standard',
    description: 'Comprehensive analysis',
    estimatedTime: '~10 seconds',
  },
  {
    id: 'deep',
    name: 'Deep Analysis',
    description: 'Adversarial detection',
    estimatedTime: '~30 seconds',
  },
];

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type Verdict = 'safe' | 'caution' | 'warning' | 'dangerous';
export type FindingCategory =
  | 'data_access'
  | 'data_transmission'
  | 'persistence'
  | 'system'
  | 'deception'
  | 'control_flow';

// ============================================================================
// Pre-processing Types
// ============================================================================

export type ActionCategory =
  | 'network'
  | 'data_access'
  | 'file_ops'
  | 'system'
  | 'user_interaction'
  | 'other';
export type ActionRiskTier = 'critical' | 'high' | 'medium' | 'low';

export interface EnrichedAction {
  index: number;
  identifier: string;
  friendlyName: string;
  category: ActionCategory;
  riskTier: ActionRiskTier;
  parameters: Record<string, unknown>;
  inputSources: string[];
  outputTargets: string[];
  flags: string[];
}

export interface DataFlowSource {
  type: 'share_sheet' | 'user_input' | 'file_read' | 'clipboard' | 'data_access';
  dataTypes?: string[];
  action?: number;
  prompt?: string;
  path?: string;
}

export interface DataFlowSink {
  type: 'network' | 'file_write' | 'display' | 'clipboard' | 'message';
  url?: string;
  method?: string;
  path?: string;
  action: number;
}

export interface DataFlow {
  from: string;
  to: string;
  via: number[];
  transforms: string[];
}

export interface ExtractedUrl {
  url: string;
  action: number;
  type: 'api_endpoint' | 'user_navigation' | 'unknown';
}

export interface PreprocessedData {
  shortcutName: string;
  actionCount: number;
  enrichedActions: EnrichedAction[];
  actionBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  sources: DataFlowSource[];
  sinks: DataFlowSink[];
  flows: DataFlow[];
  urls: ExtractedUrl[];
  domains: string[];
  permissionsRequired: string[];
  hasExternalCalls: boolean;
  hasSelfRecursion: boolean;
  acceptsShareSheet: boolean;
  inputTypes: string[];
  storesData: boolean;
  sendsDataExternally: boolean;
}

// ============================================================================
// LLM Response Types
// ============================================================================

export interface AnalysisFinding {
  id: string;
  severity: Severity;
  category: FindingCategory;
  title: string;
  description: string;
  userExplanation: string;
  affectedActions: number[];
  evidence: string;
  potentialImpact: string;
  mitigation: string;
}

export interface AnalysisDataFlow {
  source: string;
  sink: string;
  dataType: string;
  risk: RiskLevel;
  explanation: string;
}

export interface ExternalConnection {
  url: string;
  purpose: string;
  dataSent: string;
  isKnownService: boolean;
  serviceReputation: 'trusted' | 'unknown' | 'suspicious';
  riskAssessment: string;
}

export interface PermissionAnalysis {
  permission: string;
  usedFor: string;
  alignsWithPurpose: boolean;
  dataDestination: 'local' | 'shared_via_ios' | 'external_service' | 'unknown';
  assessment: string;
}

export interface RedFlag {
  flag: string;
  severity: Severity;
  explanation: string;
}

export interface PurposeAnalysis {
  statedPurpose: string;
  actualPurpose: string;
  purposeMismatch: boolean;
  mismatchExplanation?: string;
}

export interface AnalysisSummary {
  oneLiner: string;
  forUser: string;
  forTechnical: string;
}

export interface AnalysisRecommendation {
  verdict: Verdict;
  shouldInstall: boolean;
  conditions: string[];
  userGuidance: string;
}

export interface AnalysisResult {
  overallRisk: RiskLevel;
  confidenceScore: number;
  summary: AnalysisSummary;
  purposeAnalysis: PurposeAnalysis;
  findings: AnalysisFinding[];
  dataFlows: AnalysisDataFlow[];
  externalConnections: ExternalConnection[];
  permissions: PermissionAnalysis[];
  redFlags: RedFlag[];
  positiveIndicators: string[];
  recommendation: AnalysisRecommendation;
  // Metadata
  analysisMode: AnalysisMode;
  analyzedAt: number;
  provider: SupportedProvider;
  model: string;
  validationOverrides?: string[];
}

// Quick scan has a simplified result structure
export interface QuickScanResult {
  overallRisk: RiskLevel;
  oneLiner: string;
  topConcerns: string[];
  verdict: Verdict;
  shouldInstall: boolean;
  needsDeepAnalysis: boolean;
  reasonForDeepAnalysis?: string;
  // Metadata
  analysisMode: 'quick';
  analyzedAt: number;
  provider: SupportedProvider;
  model: string;
}

// ============================================================================
// Analysis State Types
// ============================================================================

export type AnalysisStatus =
  | 'idle'
  | 'preprocessing'
  | 'analyzing'
  | 'validating'
  | 'complete'
  | 'error';

export type AnalysisErrorCode =
  | 'API_ERROR'
  | 'RATE_LIMIT'
  | 'INVALID_KEY'
  | 'NETWORK_ERROR'
  | 'PARSE_ERROR'
  | 'SESSION_EXPIRED';

export interface AnalysisError {
  code: AnalysisErrorCode;
  message: string;
  retryable: boolean;
  retryAfterMs?: number;
}

export interface AnalysisProgress {
  phase: string;
  percentage: number;
}

export interface AnalysisState {
  status: AnalysisStatus;
  result: AnalysisResult | QuickScanResult | null;
  error: AnalysisError | null;
  progress: AnalysisProgress;
  selectedProvider: SupportedProvider | null;
  selectedModel: string | null;
  selectedMode: AnalysisMode;
}

// ============================================================================
// Provider Status Types
// ============================================================================

export interface ProviderStatus {
  provider: SupportedProvider;
  hasKey: boolean;
  isUnlocked: boolean;
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getDefaultModel(provider: SupportedProvider): string {
  return SUPPORTED_MODELS[provider][0].id;
}

export function getModelsForProvider(provider: SupportedProvider): ModelInfo[] {
  return SUPPORTED_MODELS[provider];
}

export function isQuickScanResult(
  result: AnalysisResult | QuickScanResult,
): result is QuickScanResult {
  return result.analysisMode === 'quick';
}

export function getRiskColorScheme(risk: RiskLevel): string {
  switch (risk) {
    case 'critical':
      return 'red';
    case 'high':
      return 'orange';
    case 'medium':
      return 'yellow';
    case 'low':
      return 'green';
  }
}

export function getVerdictLabel(verdict: Verdict): string {
  switch (verdict) {
    case 'safe':
      return 'Safe';
    case 'caution':
      return 'Caution';
    case 'warning':
      return 'Warning';
    case 'dangerous':
      return 'Dangerous';
  }
}

export function getVerdictColorScheme(verdict: Verdict): string {
  switch (verdict) {
    case 'safe':
      return 'green';
    case 'caution':
      return 'yellow';
    case 'warning':
      return 'orange';
    case 'dangerous':
      return 'red';
  }
}

export function getSeverityColorScheme(severity: Severity): string {
  switch (severity) {
    case 'critical':
      return 'red';
    case 'high':
      return 'orange';
    case 'medium':
      return 'yellow';
    case 'low':
      return 'blue';
    case 'info':
      return 'gray';
  }
}
