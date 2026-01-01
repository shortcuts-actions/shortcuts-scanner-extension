// Post-LLM validation service with deterministic checks

import type {
  AnalysisResult,
  PreprocessedData,
  RedFlag,
  RiskLevel,
} from '../../utils/analysis-types';

export interface ValidationResult {
  overrides: string[];
  additionalFlags: RedFlag[];
  adjustedRisk?: RiskLevel;
  adjustedConfidence: number;
}

// Known suspicious domains used for payload hosting
const SUSPICIOUS_DOMAINS = [
  'pastebin.com',
  'hastebin.com',
  'ghostbin.com',
  'paste.ee',
  'dpaste.org',
  'rentry.co',
  'textbin.net',
  'justpaste.it',
];

// API key patterns that should never be hardcoded
const API_KEY_PATTERNS = [
  { pattern: /sk-[a-zA-Z0-9]{20,}/, name: 'OpenAI API key' },
  { pattern: /sk-ant-[a-zA-Z0-9-]{20,}/, name: 'Anthropic API key' },
  { pattern: /sk-or-v1-[a-zA-Z0-9]{20,}/, name: 'OpenRouter API key' },
  { pattern: /gsk_[a-zA-Z0-9]{20,}/, name: 'Groq API key' },
  { pattern: /ghp_[a-zA-Z0-9]{36}/, name: 'GitHub Personal Access Token' },
  { pattern: /gho_[a-zA-Z0-9]{36}/, name: 'GitHub OAuth Token' },
  { pattern: /xox[baprs]-[a-zA-Z0-9-]{10,}/, name: 'Slack Token' },
  { pattern: /AIza[a-zA-Z0-9_-]{35}/, name: 'Google API key' },
  { pattern: /AKIA[A-Z0-9]{16}/, name: 'AWS Access Key' },
];

// Path traversal indicators
const PATH_TRAVERSAL_PATTERNS = [/\.\.\//, /\.\.\\/, /%2e%2e%2f/i, /%2e%2e\//i];

export class ValidationService {
  validate(llmResult: AnalysisResult, preprocessed: PreprocessedData): ValidationResult {
    const overrides: string[] = [];
    const additionalFlags: RedFlag[] = [];
    let adjustedConfidence = llmResult.confidenceScore;
    let adjustedRisk: RiskLevel | undefined;

    // Check for suspicious domains
    for (const url of preprocessed.urls) {
      if (this.isSuspiciousDomain(url.url)) {
        const hostname = this.extractHostname(url.url);
        additionalFlags.push({
          flag: `Suspicious domain detected: ${hostname}`,
          severity: 'high',
          explanation: `This domain (${hostname}) is commonly used for payload hosting in malicious shortcuts. The shortcut fetches content from this paste site, which could contain malicious code or data.`,
        });
        adjustedConfidence -= 0.1;
      }
    }

    // Check for hardcoded API keys
    const apiKeyFindings = this.findApiKeys(preprocessed);
    for (const finding of apiKeyFindings) {
      additionalFlags.push({
        flag: `Potential ${finding.name} exposed`,
        severity: 'medium',
        explanation: `A pattern matching ${finding.name} was found in action ${finding.action}. Hardcoding API keys in shortcuts is a security risk as they can be extracted by anyone with access to the shortcut.`,
      });
    }

    // Check for path traversal
    const pathTraversalActions = this.findPathTraversal(preprocessed);
    if (pathTraversalActions.length > 0) {
      additionalFlags.push({
        flag: 'Path traversal pattern detected',
        severity: 'critical',
        explanation: `Actions ${pathTraversalActions.join(', ')} contain path traversal patterns (../) which could be used to access files outside intended directories.`,
      });
      adjustedRisk = 'critical';
      overrides.push('Elevated to critical due to path traversal detection');
    }

    // Check for clipboard to network exfiltration
    if (this.detectClipboardExfiltration(preprocessed)) {
      additionalFlags.push({
        flag: 'Clipboard data sent to network',
        severity: 'high',
        explanation:
          'This shortcut reads clipboard contents and sends them to an external server. This is a common data exfiltration pattern.',
      });
      if (!adjustedRisk || this.riskToNumber(adjustedRisk) < this.riskToNumber('high')) {
        adjustedRisk = 'high';
      }
    }

    // Consistency checks
    const consistencyIssues = this.checkConsistency(llmResult, preprocessed);
    if (consistencyIssues.length > 0) {
      adjustedConfidence -= 0.15;
      for (const issue of consistencyIssues) {
        overrides.push(issue);
      }
    }

    // Adjust confidence for large shortcuts
    if (preprocessed.actionCount > 100) {
      adjustedConfidence -= 0.1;
      overrides.push('Reduced confidence due to large shortcut size');
    }

    // Adjust for obfuscation indicators
    if (this.hasObfuscationIndicators(preprocessed)) {
      adjustedConfidence -= 0.15;
      overrides.push('Reduced confidence due to obfuscation patterns');
    }

    // Override LLM verdict if we found critical issues
    if (adjustedRisk === 'critical' && llmResult.recommendation.verdict === 'safe') {
      overrides.push('Overriding LLM verdict from "safe" to "warning" due to critical findings');
    }

    // Ensure confidence stays in valid range
    adjustedConfidence = Math.max(0, Math.min(1, adjustedConfidence));

    return {
      overrides,
      additionalFlags,
      adjustedRisk,
      adjustedConfidence,
    };
  }

  private isSuspiciousDomain(url: string): boolean {
    const hostname = this.extractHostname(url);
    return SUSPICIOUS_DOMAINS.some((domain) => hostname.includes(domain));
  }

  private extractHostname(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }

  private findApiKeys(preprocessed: PreprocessedData): Array<{ name: string; action: number }> {
    const findings: Array<{ name: string; action: number }> = [];

    for (const action of preprocessed.enrichedActions) {
      const paramsStr = JSON.stringify(action.parameters);

      for (const { pattern, name } of API_KEY_PATTERNS) {
        if (pattern.test(paramsStr)) {
          findings.push({ name, action: action.index });
          break; // One finding per action is enough
        }
      }
    }

    return findings;
  }

  private findPathTraversal(preprocessed: PreprocessedData): number[] {
    const actions: number[] = [];

    for (const action of preprocessed.enrichedActions) {
      const paramsStr = JSON.stringify(action.parameters);

      for (const pattern of PATH_TRAVERSAL_PATTERNS) {
        if (pattern.test(paramsStr)) {
          actions.push(action.index);
          break;
        }
      }
    }

    return actions;
  }

  private detectClipboardExfiltration(preprocessed: PreprocessedData): boolean {
    // Check if there's a clipboard source and network sink
    const hasClipboardSource = preprocessed.sources.some((s) => s.type === 'clipboard');
    const hasNetworkSink = preprocessed.sinks.some((s) => s.type === 'network');

    if (!hasClipboardSource || !hasNetworkSink) {
      return false;
    }

    // Check if clipboard action comes before network action
    const clipboardAction = preprocessed.enrichedActions.find((a) =>
      a.identifier.toLowerCase().includes('getclipboard'),
    );
    const networkAction = preprocessed.enrichedActions.find(
      (a) =>
        a.identifier.toLowerCase().includes('downloadurl') ||
        a.identifier.toLowerCase().includes('getcontentsofurl'),
    );

    if (clipboardAction && networkAction && clipboardAction.index < networkAction.index) {
      return true;
    }

    return false;
  }

  private checkConsistency(llmResult: AnalysisResult, preprocessed: PreprocessedData): string[] {
    const issues: string[] = [];

    // LLM says no network but we found URLs
    if (
      preprocessed.urls.length > 0 &&
      llmResult.externalConnections.length === 0 &&
      llmResult.summary.forTechnical.toLowerCase().includes('no network')
    ) {
      issues.push('Inconsistency: LLM claims no network activity but URLs were detected');
    }

    // LLM says safe but we found high-risk actions
    if (preprocessed.actionBreakdown.critical > 0 && llmResult.recommendation.verdict === 'safe') {
      issues.push('Inconsistency: LLM says safe but critical-risk actions present');
    }

    // LLM missed data exfiltration patterns
    if (
      preprocessed.flows.length > 0 &&
      preprocessed.sendsDataExternally &&
      llmResult.dataFlows.length === 0
    ) {
      issues.push('Inconsistency: Data flows detected but not reported by LLM');
    }

    return issues;
  }

  private hasObfuscationIndicators(preprocessed: PreprocessedData): boolean {
    for (const action of preprocessed.enrichedActions) {
      const paramsStr = JSON.stringify(action.parameters).toLowerCase();

      // Base64 encoded content
      if (paramsStr.includes('base64') || /[a-zA-Z0-9+/=]{40,}/.test(paramsStr)) {
        return true;
      }

      // URL encoding
      if (/%[0-9a-f]{2}/i.test(paramsStr) && paramsStr.split('%').length > 5) {
        return true;
      }

      // Suspicious string concatenation patterns
      if (action.identifier.toLowerCase().includes('combinetext')) {
        // Check if combining many small strings (possible URL obfuscation)
        const textActionText = action.parameters.WFTextActionText;
        const textParts = typeof textActionText === 'string' ? textActionText.split('') : [];
        if (textParts.length > 10) {
          return true;
        }
      }
    }

    return false;
  }

  private riskToNumber(risk: RiskLevel): number {
    switch (risk) {
      case 'low':
        return 1;
      case 'medium':
        return 2;
      case 'high':
        return 3;
      case 'critical':
        return 4;
    }
  }

  /**
   * Merge validation results into the analysis result
   */
  applyValidation(result: AnalysisResult, validation: ValidationResult): AnalysisResult {
    return {
      ...result,
      confidenceScore: validation.adjustedConfidence,
      overallRisk: validation.adjustedRisk ?? result.overallRisk,
      redFlags: [...result.redFlags, ...validation.additionalFlags],
      validationOverrides: validation.overrides.length > 0 ? validation.overrides : undefined,
      recommendation: {
        ...result.recommendation,
        // Upgrade verdict if validation found critical issues
        verdict:
          validation.adjustedRisk === 'critical' && result.recommendation.verdict === 'safe'
            ? 'warning'
            : result.recommendation.verdict,
      },
    };
  }
}

export const validationService = new ValidationService();
