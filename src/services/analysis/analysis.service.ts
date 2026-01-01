// Main analysis service - orchestrates the complete analysis pipeline

import type {
  AnalysisError,
  AnalysisMode,
  AnalysisResult,
  QuickScanResult,
  SupportedProvider,
} from '../../utils/analysis-types';
import type { ParsedShortcut } from '../../utils/types';
import { apiKeyManagerService } from '../api-key-manager.service';
import { type LLMError, llmClientService } from './llm-client.service';
import { preprocessingService } from './preprocessing.service';
import { buildQuickScanPrompt, QUICK_SCAN_MAX_TOKENS } from './prompts/quick-scan';
import {
  buildDeepAnalysisPrompt,
  buildStandardPrompt,
  DEEP_MAX_TOKENS,
  STANDARD_MAX_TOKENS,
} from './prompts/standard';
import { SYSTEM_PROMPT } from './prompts/system-prompt';
import { validationService } from './validation.service';

export type ProgressCallback = (phase: string, percentage: number) => void;

export class AnalysisService {
  async analyze(
    shortcut: ParsedShortcut,
    mode: AnalysisMode,
    provider: SupportedProvider,
    model: string,
    onProgress: ProgressCallback,
  ): Promise<AnalysisResult | QuickScanResult> {
    // 1. Check if API key is unlocked
    onProgress('Checking API key...', 5);
    const isUnlocked = await apiKeyManagerService.isUnlocked(provider);
    if (!isUnlocked) {
      throw this.createError(
        'SESSION_EXPIRED',
        'API key session has expired. Please unlock to continue.',
      );
    }

    // Get the API key
    const apiKey = await apiKeyManagerService.getUnlockedKey(provider);
    if (!apiKey) {
      throw this.createError('SESSION_EXPIRED', 'Could not retrieve API key. Please unlock again.');
    }

    try {
      // 2. Pre-process shortcut data
      onProgress('Analyzing shortcut structure...', 15);
      const preprocessed = preprocessingService.process(shortcut);

      // 3. Build prompts based on mode
      onProgress('Preparing analysis prompts...', 25);
      const fullActions = JSON.stringify(shortcut.data.WFWorkflowActions, null, 2);
      const { systemPrompt, userPrompt, maxTokens } = this.buildPrompts(
        mode,
        preprocessed,
        fullActions,
      );

      // 4. Call LLM
      onProgress('Running AI security analysis...', 40);
      const llmResponse = await llmClientService.call(provider, model, apiKey, {
        systemPrompt,
        userPrompt,
        maxTokens,
        temperature: 0.3,
      });

      // 5. Parse response
      onProgress('Processing analysis results...', 75);
      const result = this.parseResponse(llmResponse.content, mode, provider, model);

      // 6. For quick scan, return early without validation
      if (mode === 'quick') {
        onProgress('Complete', 100);
        return result as QuickScanResult;
      }

      // 7. Run validation layer for standard/deep modes
      onProgress('Validating findings...', 85);
      const fullResult = result as AnalysisResult;
      const validation = validationService.validate(fullResult, preprocessed);

      // 8. Apply validation results
      onProgress('Finalizing report...', 95);
      const finalResult = validationService.applyValidation(fullResult, validation);

      onProgress('Complete', 100);
      return finalResult;
    } catch (error) {
      // Convert LLM errors to analysis errors
      if (this.isLLMError(error)) {
        throw this.convertLLMError(error);
      }
      throw error;
    }
  }

  private buildPrompts(
    mode: AnalysisMode,
    preprocessed: ReturnType<typeof preprocessingService.process>,
    fullActions: string,
  ): { systemPrompt: string; userPrompt: string; maxTokens: number } {
    switch (mode) {
      case 'quick':
        return {
          systemPrompt: SYSTEM_PROMPT,
          userPrompt: buildQuickScanPrompt(preprocessed),
          maxTokens: QUICK_SCAN_MAX_TOKENS,
        };
      case 'standard':
        return {
          systemPrompt: SYSTEM_PROMPT,
          userPrompt: buildStandardPrompt(preprocessed, fullActions),
          maxTokens: STANDARD_MAX_TOKENS,
        };
      case 'deep':
        return {
          systemPrompt: SYSTEM_PROMPT,
          userPrompt: buildDeepAnalysisPrompt(preprocessed, fullActions),
          maxTokens: DEEP_MAX_TOKENS,
        };
    }
  }

  private parseResponse(
    content: string,
    mode: AnalysisMode,
    provider: SupportedProvider,
    model: string,
  ): AnalysisResult | QuickScanResult {
    const parsed = llmClientService.parseJSON<Record<string, unknown>>(content);
    const now = Date.now();

    if (mode === 'quick') {
      // Validate quick scan response structure
      const quickResult: QuickScanResult = {
        overallRisk: this.validateRiskLevel(parsed.overallRisk),
        oneLiner: String(parsed.oneLiner || 'Analysis complete'),
        topConcerns: Array.isArray(parsed.topConcerns) ? parsed.topConcerns.map(String) : [],
        verdict: this.validateVerdict(parsed.verdict),
        shouldInstall: Boolean(parsed.shouldInstall),
        needsDeepAnalysis: Boolean(parsed.needsDeepAnalysis),
        reasonForDeepAnalysis: parsed.reasonForDeepAnalysis
          ? String(parsed.reasonForDeepAnalysis)
          : undefined,
        analysisMode: 'quick',
        analyzedAt: now,
        provider,
        model,
      };
      return quickResult;
    }

    // Full analysis result
    const result: AnalysisResult = {
      overallRisk: this.validateRiskLevel(parsed.overallRisk),
      confidenceScore: this.validateConfidence(parsed.confidenceScore),
      summary: this.parseSummary(parsed.summary),
      purposeAnalysis: this.parsePurposeAnalysis(parsed.purposeAnalysis),
      findings: this.parseFindings(parsed.findings),
      dataFlows: this.parseDataFlows(parsed.dataFlows),
      externalConnections: this.parseExternalConnections(parsed.externalConnections),
      permissions: this.parsePermissions(parsed.permissions),
      redFlags: this.parseRedFlags(parsed.redFlags),
      positiveIndicators: Array.isArray(parsed.positiveIndicators)
        ? parsed.positiveIndicators.map(String)
        : [],
      recommendation: this.parseRecommendation(parsed.recommendation),
      analysisMode: mode,
      analyzedAt: now,
      provider,
      model,
    };

    return result;
  }

  private validateRiskLevel(value: unknown): 'low' | 'medium' | 'high' | 'critical' {
    const validLevels = ['low', 'medium', 'high', 'critical'];
    if (typeof value === 'string' && validLevels.includes(value)) {
      return value as 'low' | 'medium' | 'high' | 'critical';
    }
    return 'medium'; // Default to medium if invalid
  }

  private validateVerdict(value: unknown): 'safe' | 'caution' | 'warning' | 'dangerous' {
    const validVerdicts = ['safe', 'caution', 'warning', 'dangerous'];
    if (typeof value === 'string' && validVerdicts.includes(value)) {
      return value as 'safe' | 'caution' | 'warning' | 'dangerous';
    }
    return 'caution'; // Default to caution if invalid
  }

  private validateConfidence(value: unknown): number {
    if (typeof value === 'number' && value >= 0 && value <= 1) {
      return value;
    }
    return 0.7; // Default confidence
  }

  private parseSummary(value: unknown): AnalysisResult['summary'] {
    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>;
      return {
        oneLiner: String(obj.oneLiner || 'Analysis complete'),
        forUser: String(obj.forUser || 'No user summary available.'),
        forTechnical: String(obj.forTechnical || 'No technical summary available.'),
      };
    }
    return {
      oneLiner: 'Analysis complete',
      forUser: 'No user summary available.',
      forTechnical: 'No technical summary available.',
    };
  }

  private parsePurposeAnalysis(value: unknown): AnalysisResult['purposeAnalysis'] {
    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>;
      return {
        statedPurpose: String(obj.statedPurpose || 'Unknown'),
        actualPurpose: String(obj.actualPurpose || 'Unknown'),
        purposeMismatch: Boolean(obj.purposeMismatch),
        mismatchExplanation: obj.mismatchExplanation ? String(obj.mismatchExplanation) : undefined,
      };
    }
    return {
      statedPurpose: 'Unknown',
      actualPurpose: 'Unknown',
      purposeMismatch: false,
    };
  }

  private parseFindings(value: unknown): AnalysisResult['findings'] {
    if (!Array.isArray(value)) return [];

    return value.map((item, index) => {
      const obj = item as Record<string, unknown>;
      return {
        id: String(obj.id || `F${index + 1}`),
        severity: this.validateSeverity(obj.severity),
        category: this.validateCategory(obj.category),
        title: String(obj.title || 'Untitled finding'),
        description: String(obj.description || ''),
        userExplanation: String(obj.userExplanation || obj.description || ''),
        affectedActions: Array.isArray(obj.affectedActions) ? obj.affectedActions.map(Number) : [],
        evidence: String(obj.evidence || ''),
        potentialImpact: String(obj.potentialImpact || ''),
        mitigation: String(obj.mitigation || ''),
      };
    });
  }

  private validateSeverity(value: unknown): 'critical' | 'high' | 'medium' | 'low' | 'info' {
    const valid = ['critical', 'high', 'medium', 'low', 'info'];
    if (typeof value === 'string' && valid.includes(value)) {
      return value as 'critical' | 'high' | 'medium' | 'low' | 'info';
    }
    return 'medium';
  }

  private validateCategory(
    value: unknown,
  ): 'data_access' | 'data_transmission' | 'persistence' | 'system' | 'deception' | 'control_flow' {
    const valid = [
      'data_access',
      'data_transmission',
      'persistence',
      'system',
      'deception',
      'control_flow',
    ];
    if (typeof value === 'string' && valid.includes(value)) {
      return value as
        | 'data_access'
        | 'data_transmission'
        | 'persistence'
        | 'system'
        | 'deception'
        | 'control_flow';
    }
    return 'system';
  }

  private parseDataFlows(value: unknown): AnalysisResult['dataFlows'] {
    if (!Array.isArray(value)) return [];

    return value.map((item) => {
      const obj = item as Record<string, unknown>;
      return {
        source: String(obj.source || 'Unknown'),
        sink: String(obj.sink || 'Unknown'),
        dataType: String(obj.dataType || 'Unknown'),
        risk: this.validateRiskLevel(obj.risk),
        explanation: String(obj.explanation || ''),
      };
    });
  }

  private parseExternalConnections(value: unknown): AnalysisResult['externalConnections'] {
    if (!Array.isArray(value)) return [];

    return value.map((item) => {
      const obj = item as Record<string, unknown>;
      return {
        url: String(obj.url || ''),
        purpose: String(obj.purpose || 'Unknown'),
        dataSent: String(obj.dataSent || 'Unknown'),
        isKnownService: Boolean(obj.isKnownService),
        serviceReputation: this.validateReputation(obj.serviceReputation),
        riskAssessment: String(obj.riskAssessment || ''),
      };
    });
  }

  private validateReputation(value: unknown): 'trusted' | 'unknown' | 'suspicious' {
    const valid = ['trusted', 'unknown', 'suspicious'];
    if (typeof value === 'string' && valid.includes(value)) {
      return value as 'trusted' | 'unknown' | 'suspicious';
    }
    return 'unknown';
  }

  private parsePermissions(value: unknown): AnalysisResult['permissions'] {
    if (!Array.isArray(value)) return [];

    return value.map((item) => {
      const obj = item as Record<string, unknown>;
      return {
        permission: String(obj.permission || 'Unknown'),
        usedFor: String(obj.usedFor || ''),
        necessary: Boolean(obj.necessary),
        riskIfAbused: String(obj.riskIfAbused || ''),
      };
    });
  }

  private parseRedFlags(value: unknown): AnalysisResult['redFlags'] {
    if (!Array.isArray(value)) return [];

    return value.map((item) => {
      const obj = item as Record<string, unknown>;
      return {
        flag: String(obj.flag || ''),
        severity: this.validateSeverity(obj.severity),
        explanation: String(obj.explanation || ''),
      };
    });
  }

  private parseRecommendation(value: unknown): AnalysisResult['recommendation'] {
    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>;
      return {
        verdict: this.validateVerdict(obj.verdict),
        shouldInstall: Boolean(obj.shouldInstall),
        conditions: Array.isArray(obj.conditions) ? obj.conditions.map(String) : [],
        userGuidance: String(obj.userGuidance || ''),
      };
    }
    return {
      verdict: 'caution',
      shouldInstall: false,
      conditions: [],
      userGuidance: 'Unable to provide recommendation.',
    };
  }

  private isLLMError(error: unknown): error is LLMError {
    return typeof error === 'object' && error !== null && 'code' in error && 'message' in error;
  }

  private convertLLMError(error: LLMError): AnalysisError {
    const errorMap: Record<LLMError['code'], AnalysisError['code']> = {
      RATE_LIMIT: 'RATE_LIMIT',
      INVALID_KEY: 'INVALID_KEY',
      NETWORK_ERROR: 'NETWORK_ERROR',
      API_ERROR: 'API_ERROR',
      PARSE_ERROR: 'PARSE_ERROR',
    };

    return {
      code: errorMap[error.code],
      message: error.message,
      retryable: error.code === 'NETWORK_ERROR' || error.code === 'RATE_LIMIT',
      retryAfterMs: error.retryAfterMs,
    };
  }

  private createError(
    code: AnalysisError['code'],
    message: string,
    retryAfterMs?: number,
  ): AnalysisError {
    return {
      code,
      message,
      retryable: code === 'SESSION_EXPIRED' || code === 'NETWORK_ERROR',
      retryAfterMs,
    };
  }
}

export const analysisService = new AnalysisService();
