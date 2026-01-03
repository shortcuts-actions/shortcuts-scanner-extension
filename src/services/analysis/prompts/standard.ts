// Standard and deep analysis prompts

import type { EnrichedAction, PreprocessedData } from '../../../utils/analysis-types';

function formatEnrichedActions(actions: EnrichedAction[]): string {
  return actions
    .map((a) => {
      const flags = a.flags.length > 0 ? ` [${a.flags.join(', ')}]` : '';
      const paramsPreview = Object.keys(a.parameters).slice(0, 3).join(', ');
      return `${a.index}. ${a.friendlyName} (${a.identifier})${flags}
   Risk: ${a.riskTier} | Category: ${a.category}${paramsPreview ? `\n   Params: ${paramsPreview}...` : ''}`;
    })
    .join('\n\n');
}

export function buildStandardPrompt(data: PreprocessedData, fullActions: string): string {
  return `Analyze this Apple Shortcut for security and privacy risks.

## Shortcut Metadata
- Name: ${data.shortcutName}
- Action Count: ${data.actionCount}
- Accepts Input From: ${data.acceptsShareSheet ? data.inputTypes.join(', ') : 'None'}
- Permissions Required: ${data.permissionsRequired.join(', ') || 'None detected'}

## Risk Summary
- Critical Risk Actions: ${data.actionBreakdown.critical}
- High Risk Actions: ${data.actionBreakdown.high}
- Medium Risk Actions: ${data.actionBreakdown.medium}
- Network Calls: ${data.sinks.filter((s) => s.type === 'network').length}
- File Operations: ${data.sinks.filter((s) => s.type === 'file_write').length}
- External Shortcut Calls: ${data.hasExternalCalls ? 'Yes' : 'No'}
- Self-Recursion: ${data.hasSelfRecursion ? 'Yes' : 'No'}

## Extracted URLs and Domains
${
  data.urls.length > 0
    ? data.urls.map((u) => `- [Action ${u.action}] ${u.url} (${u.type})`).join('\n')
    : 'None detected'
}

## Data Flow Summary
**Sources** (where data comes from):
${data.sources.map((s) => `- ${s.type}${s.action !== undefined ? ` (action ${s.action})` : ''}`).join('\n') || 'None detected'}

**Sinks** (where data goes):
${data.sinks.map((s) => `- ${s.type}${s.url ? `: ${s.url}` : ''} (action ${s.action})`).join('\n') || 'None detected'}

**Key Flows**:
${data.flows.map((f) => `- ${f.from} → ${f.to} via actions [${f.via.join(', ')}]${f.transforms.length > 0 ? ` (transforms: ${f.transforms.join(', ')})` : ''}`).join('\n') || 'No significant flows detected'}

## Action Sequence Overview
${formatEnrichedActions(data.enrichedActions.slice(0, 30))}
${data.enrichedActions.length > 30 ? `\n... and ${data.enrichedActions.length - 30} more actions` : ''}

## Full Action Details (for reference)
${fullActions}

---

## Your Analysis Tasks

### 1. Purpose Analysis
- What does this shortcut claim or appear to do based on its name?
- What does it ACTUALLY do based on the action sequence?
- Is there any mismatch between apparent and actual purpose?

### 2. Permission & Purpose Alignment
For each permission required, evaluate:
- Is this permission EXPECTED for a shortcut with this name/purpose? (e.g., a "Photo Editor" accessing photos is expected)
- If expected: note as legitimate and move on
- If unexpected: flag for user attention and explain the concern

Remember: Many useful shortcuts legitimately require access to photos, contacts, calendars, location, clipboard, etc. Only flag permissions that don't align with the shortcut's stated purpose.

### 3. Data Flow Analysis (Critical)
Focus on WHERE data goes, not just what's accessed:
- **Local processing only**: Generally safe - data stays on device
- **Standard iOS sharing** (share sheet, messages to user-selected contacts): Low risk
- **External transmission**: Requires scrutiny - what data, to where, why?

For external transmissions:
- What specific data is being sent?
- Is the destination a known/legitimate service?
- Does the user benefit from this transmission?
- Is the URL hardcoded or user-provided?

### 4. Network Analysis
For each external URL/API:
- What service is this? Is it a well-known API (weather, translation, etc.)?
- What data is sent to it?
- Is this transmission necessary for the shortcut's purpose?
- Are there any suspicious patterns (IP addresses, URL shorteners, encoded URLs)?

### 5. Red Flag Detection
Focus on genuinely suspicious patterns:
- Data harvesting + external transmission (contacts/photos sent to unknown URLs)
- Purpose mismatch (data access unrelated to shortcut name)
- Obfuscation (base64 URLs, string concatenation hiding destinations)
- Credential collection (prompting for passwords/API keys)
- Silent operation (accessing sensitive data with no user feedback)

Do NOT flag as concerning:
- Expected data access that matches purpose
- Local-only data processing
- Standard iOS share sheet usage
- Well-known API integrations

### 6. Control Flow Analysis
- Any infinite loops or resource exhaustion?
- Recursive calls - are they bounded?
- External shortcut calls - what do they invoke?
- Error handling - what happens on failure?

---

Respond with ONLY valid JSON matching this schema:

{
  "overallRisk": "low" | "medium" | "high" | "critical",
  "confidenceScore": 0.0-1.0,

  "summary": {
    "oneLiner": "<one sentence risk summary for UI badge>",
    "forUser": "<2-3 paragraph explanation a non-technical user can understand>",
    "forTechnical": "<detailed technical summary>"
  },

  "purposeAnalysis": {
    "statedPurpose": "<what it appears to do>",
    "actualPurpose": "<what it actually does>",
    "purposeMismatch": true | false,
    "mismatchExplanation": "<if mismatch, explain>"
  },

  "findings": [
    {
      "id": "<unique id like F1, F2>",
      "severity": "critical" | "high" | "medium" | "low" | "info",
      "category": "data_access" | "data_transmission" | "persistence" | "system" | "deception" | "control_flow",
      "title": "<short title>",
      "description": "<detailed explanation>",
      "userExplanation": "<plain language for consumers>",
      "affectedActions": [<action indices>],
      "evidence": "<specific data from shortcut>",
      "potentialImpact": "<what could go wrong>",
      "mitigation": "<how to address if possible>"
    }
  ],

  "dataFlows": [
    {
      "source": "<where data comes from>",
      "sink": "<where data goes>",
      "dataType": "<what kind of data>",
      "isExternal": true | false,
      "alignsWithPurpose": true | false,
      "risk": "none" | "low" | "medium" | "high",
      "explanation": "<why this flow matters - focus on external/misaligned flows>"
    }
  ],

  "externalConnections": [
    {
      "url": "<full url or domain>",
      "purpose": "<what it's used for>",
      "dataSent": "<what data is transmitted>",
      "isKnownService": true | false,
      "serviceReputation": "trusted" | "unknown" | "suspicious",
      "riskAssessment": "<analysis>"
    }
  ],

  "permissions": [
    {
      "permission": "<permission name>",
      "usedFor": "<how it's used>",
      "alignsWithPurpose": true | false,
      "dataDestination": "local" | "shared_via_ios" | "external_service" | "unknown",
      "assessment": "<brief assessment - only note concerns if misaligned or externally transmitted>"
    }
  ],

  "redFlags": [
    {
      "flag": "<what was detected>",
      "severity": "critical" | "high" | "medium" | "low",
      "explanation": "<why this is genuinely concerning - not just data access but actual suspicious patterns>"
    }
  ],

  "positiveIndicators": [
    "<things that suggest legitimacy>"
  ],

  "recommendation": {
    "verdict": "safe" | "caution" | "warning" | "dangerous",
    "shouldInstall": true | false,
    "conditions": ["<conditions for safe use if any>"],
    "userGuidance": "<what to tell the user>"
  }
}`;
}

export function buildDeepAnalysisPrompt(data: PreprocessedData, fullActions: string): string {
  const basePrompt = buildStandardPrompt(data, fullActions);

  const adversarialSection = `

---

## ADDITIONAL: Adversarial Analysis (Deep Mode)

Perform adversarial thinking on this shortcut:

### Think Like an Attacker
1. If you were trying to hide malware in this shortcut, where would you put it?
2. What legitimate-looking actions could mask malicious behavior?
3. Are there any actions that seem unnecessary for the stated purpose?
4. Could any "error handling" actually be exfiltration?

### Obfuscation Detection
Examine for:
- String concatenation hiding URLs
- Base64 or encoding of payloads
- Variable indirection obscuring data flow
- Comments that mislead about true purpose
- Conditional branches that always execute one path

### Timing Analysis
- Are there delays that might wait out user attention?
- Do network calls happen after user interaction completes?
- Could wait actions mask background activity?

### Trust Chain Analysis
- If it calls other shortcuts, can those be trusted?
- Are there URL schemes that could trigger untrusted apps?
- Does it modify itself or other shortcuts?

Add an "adversarialAnalysis" field to your response:

"adversarialAnalysis": {
  "hidingSpots": ["<where malware could hide>"],
  "obfuscationFound": [{"technique": "", "location": "", "evidence": ""}],
  "timingConcerns": ["<timing-based risks>"],
  "trustChainIssues": ["<external dependency risks>"]
}`;

  return basePrompt + adversarialSection;
}

export const STANDARD_MAX_TOKENS = 4000;
export const DEEP_MAX_TOKENS = 6000;
