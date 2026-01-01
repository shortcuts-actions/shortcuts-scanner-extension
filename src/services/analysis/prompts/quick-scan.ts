// Quick scan prompt for fast safety assessment

import type { PreprocessedData } from '../../../utils/analysis-types';

export function buildQuickScanPrompt(data: PreprocessedData): string {
  const highRiskActions = data.enrichedActions.filter(
    (a) => a.riskTier === 'critical' || a.riskTier === 'high',
  );

  return `Quick security scan of this Apple Shortcut.

## Key Facts
- Name: ${data.shortcutName}
- Actions: ${data.actionCount} (${data.actionBreakdown.critical} critical, ${data.actionBreakdown.high} high-risk)
- Network calls: ${data.sinks.filter((s) => s.type === 'network').length}
- File operations: ${data.sinks.filter((s) => s.type === 'file_write').length}
- Permissions: ${data.permissionsRequired.join(', ') || 'None detected'}
- External shortcut calls: ${data.hasExternalCalls ? 'Yes' : 'No'}
- Self-recursion: ${data.hasSelfRecursion ? 'Yes' : 'No'}

## URLs/Domains
${data.domains.length > 0 ? data.domains.join('\n') : 'None detected'}

## High-Risk Actions
${
  highRiskActions.length > 0
    ? highRiskActions
        .map((a) => `- [${a.index}] ${a.friendlyName} (${a.identifier}) - ${a.riskTier} risk`)
        .join('\n')
    : 'None detected'
}

---

Provide a fast risk assessment. Respond with ONLY valid JSON:

{
  "overallRisk": "low" | "medium" | "high" | "critical",
  "oneLiner": "<one sentence summary>",
  "topConcerns": ["<up to 3 main concerns>"],
  "verdict": "safe" | "caution" | "warning" | "dangerous",
  "shouldInstall": true | false,
  "needsDeepAnalysis": true | false,
  "reasonForDeepAnalysis": "<if true, explain why deeper analysis is recommended>"
}`;
}

export const QUICK_SCAN_MAX_TOKENS = 500;
