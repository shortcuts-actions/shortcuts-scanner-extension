// Pre-processing service for shortcut data before LLM analysis

import type {
  ActionCategory,
  ActionRiskTier,
  DataFlow,
  DataFlowSink,
  DataFlowSource,
  EnrichedAction,
  ExtractedUrl,
  PreprocessedData,
} from '../../utils/analysis-types';
import { getActionName } from '../../utils/parser';
import type { ParsedShortcut, ShortcutAction } from '../../utils/types';

// ============================================================================
// Action Classification Maps
// ============================================================================

const CRITICAL_RISK_ACTIONS = new Set([
  'is.workflow.actions.runscript',
  'is.workflow.actions.runsshscript',
  'is.workflow.actions.runworkflow',
  'is.workflow.actions.openxcallbackurl',
  'is.workflow.actions.runjavascriptonwebpage',
]);

const HIGH_RISK_ACTIONS = new Set([
  'is.workflow.actions.downloadurl',
  'is.workflow.actions.getcontentsofurl',
  'is.workflow.actions.url.getheaders',
  'is.workflow.actions.sendmessage',
  'is.workflow.actions.sendemail',
  'is.workflow.actions.documentpicker.save',
  'is.workflow.actions.file.append',
  'is.workflow.actions.getmyworkflows',
  'is.workflow.actions.runshortcut',
  'is.workflow.actions.sharewith',
]);

const MEDIUM_RISK_ACTIONS = new Set([
  'is.workflow.actions.getcontacts',
  'is.workflow.actions.filter.contacts',
  'is.workflow.actions.getcalendarevents',
  'is.workflow.actions.getlocations',
  'is.workflow.actions.location',
  'is.workflow.actions.getclipboard',
  'is.workflow.actions.setclipboard',
  'is.workflow.actions.openurl',
  'is.workflow.actions.getimagesfromimport',
  'is.workflow.actions.selectphoto',
  'is.workflow.actions.takephoto',
  'is.workflow.actions.getreminders',
  'is.workflow.actions.gethealthsample',
  'is.workflow.actions.documentpicker.open',
  'is.workflow.actions.file.getlink',
]);

const CATEGORY_MAP: Record<string, ActionCategory> = {
  // Network actions
  downloadurl: 'network',
  getcontentsofurl: 'network',
  'url.getheaders': 'network',
  openurl: 'network',
  sendmessage: 'network',
  sendemail: 'network',
  sharewith: 'network',

  // Data access actions
  getcontacts: 'data_access',
  'filter.contacts': 'data_access',
  getcalendarevents: 'data_access',
  getlocations: 'data_access',
  location: 'data_access',
  getclipboard: 'data_access',
  selectphoto: 'data_access',
  getimagesfromimport: 'data_access',
  takephoto: 'data_access',
  getreminders: 'data_access',
  gethealthsample: 'data_access',

  // File operations
  'documentpicker.save': 'file_ops',
  'documentpicker.open': 'file_ops',
  'file.append': 'file_ops',
  'file.createfolder': 'file_ops',
  'file.delete': 'file_ops',
  'file.getlink': 'file_ops',

  // System actions
  runscript: 'system',
  runsshscript: 'system',
  runworkflow: 'system',
  runshortcut: 'system',
  openxcallbackurl: 'system',
  runjavascriptonwebpage: 'system',
  getmyworkflows: 'system',

  // User interaction
  ask: 'user_interaction',
  alert: 'user_interaction',
  choosefrommenu: 'user_interaction',
  showresult: 'user_interaction',
  notification: 'user_interaction',
  vibratedevice: 'user_interaction',
};

// ============================================================================
// Helper Functions
// ============================================================================

function getActionShortName(identifier: string): string {
  const parts = identifier.split('.');
  return parts[parts.length - 1].toLowerCase();
}

function classifyRiskTier(identifier: string): ActionRiskTier {
  const lowerIdentifier = identifier.toLowerCase();

  if (CRITICAL_RISK_ACTIONS.has(lowerIdentifier)) {
    return 'critical';
  }
  if (HIGH_RISK_ACTIONS.has(lowerIdentifier)) {
    return 'high';
  }
  if (MEDIUM_RISK_ACTIONS.has(lowerIdentifier)) {
    return 'medium';
  }
  return 'low';
}

function classifyCategory(identifier: string): ActionCategory {
  const shortName = getActionShortName(identifier);

  // Check direct match
  if (CATEGORY_MAP[shortName]) {
    return CATEGORY_MAP[shortName];
  }

  // Check partial matches
  for (const [key, category] of Object.entries(CATEGORY_MAP)) {
    if (shortName.includes(key) || key.includes(shortName)) {
      return category;
    }
  }

  return 'other';
}

function extractFlags(action: ShortcutAction, category: ActionCategory): string[] {
  const flags: string[] = [];
  const params = action.WFWorkflowActionParameters || {};

  if (category === 'network') {
    flags.push('external_network');
    if (params.WFHTTPBodyType === 'Form' || params.WFHTTPBodyType === 'JSON') {
      flags.push('sends_data');
    }
  }

  if (category === 'data_access') {
    flags.push('accesses_user_data');
  }

  if (category === 'file_ops') {
    if (action.WFWorkflowActionIdentifier.includes('save')) {
      flags.push('writes_file');
    }
  }

  if (category === 'system') {
    flags.push('system_access');
    if (action.WFWorkflowActionIdentifier.includes('script')) {
      flags.push('executes_code');
    }
  }

  return flags;
}

function extractUrlsFromAction(action: ShortcutAction, index: number): ExtractedUrl[] {
  const urls: ExtractedUrl[] = [];
  const params = action.WFWorkflowActionParameters || {};

  // Check WFInput, WFURL, WFURLActionURL, etc.
  const urlFields = ['WFInput', 'WFURL', 'WFURLActionURL', 'WFHTTPMethod'];

  for (const field of urlFields) {
    const value = params[field];
    if (
      typeof value === 'string' &&
      (value.startsWith('http://') || value.startsWith('https://'))
    ) {
      urls.push({
        url: value,
        action: index,
        type: determineUrlType(value, action.WFWorkflowActionIdentifier),
      });
    }
  }

  // Deep search for URLs in nested objects
  const searchForUrls = (obj: unknown, depth = 0): void => {
    if (depth > 5) return; // Limit recursion depth

    if (typeof obj === 'string') {
      const urlMatch = obj.match(/https?:\/\/[^\s"'<>]+/g);
      if (urlMatch) {
        for (const url of urlMatch) {
          // Avoid duplicates
          if (!urls.some((u) => u.url === url)) {
            urls.push({
              url,
              action: index,
              type: determineUrlType(url, action.WFWorkflowActionIdentifier),
            });
          }
        }
      }
    } else if (Array.isArray(obj)) {
      for (const item of obj) {
        searchForUrls(item, depth + 1);
      }
    } else if (obj && typeof obj === 'object') {
      for (const value of Object.values(obj)) {
        searchForUrls(value, depth + 1);
      }
    }
  };

  searchForUrls(params);

  return urls;
}

function determineUrlType(
  url: string,
  identifier: string,
): 'api_endpoint' | 'user_navigation' | 'unknown' {
  const lowerUrl = url.toLowerCase();

  // API patterns
  if (
    lowerUrl.includes('/api/') ||
    lowerUrl.includes('/v1/') ||
    lowerUrl.includes('/v2/') ||
    lowerUrl.includes('api.')
  ) {
    return 'api_endpoint';
  }

  // Navigation patterns
  if (
    identifier.includes('openurl') ||
    lowerUrl.includes('console.') ||
    lowerUrl.includes('dashboard.')
  ) {
    return 'user_navigation';
  }

  // Content fetch patterns
  if (identifier.includes('downloadurl') || identifier.includes('getcontentsofurl')) {
    return 'api_endpoint';
  }

  return 'unknown';
}

function extractDomains(urls: ExtractedUrl[]): string[] {
  const domains = new Set<string>();

  for (const { url } of urls) {
    try {
      const parsed = new URL(url);
      domains.add(parsed.hostname);
    } catch {
      // Invalid URL, skip
    }
  }

  return Array.from(domains);
}

function identifyDataSources(actions: ShortcutAction[], inputTypes: string[]): DataFlowSource[] {
  const sources: DataFlowSource[] = [];

  // Check if accepts share sheet input
  if (inputTypes.length > 0) {
    sources.push({
      type: 'share_sheet',
      dataTypes: inputTypes,
    });
  }

  // Scan actions for data sources
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    const identifier = action.WFWorkflowActionIdentifier.toLowerCase();
    const params = action.WFWorkflowActionParameters || {};

    if (identifier.includes('ask') || identifier.includes('input')) {
      sources.push({
        type: 'user_input',
        action: i,
        prompt: params.WFAskActionPrompt || params.WFInputType || undefined,
      });
    }

    if (identifier.includes('getclipboard') || identifier.includes('clipboard.get')) {
      sources.push({
        type: 'clipboard',
        action: i,
      });
    }

    if (
      identifier.includes('documentpicker.open') ||
      (identifier.includes('file.') && identifier.includes('get'))
    ) {
      sources.push({
        type: 'file_read',
        action: i,
        path: params.WFFilePath || params.WFFile?.path || undefined,
      });
    }

    if (
      identifier.includes('getcontacts') ||
      identifier.includes('getlocations') ||
      identifier.includes('getphotos') ||
      identifier.includes('gethealthsample')
    ) {
      sources.push({
        type: 'data_access',
        action: i,
      });
    }
  }

  return sources;
}

function identifyDataSinks(actions: ShortcutAction[]): DataFlowSink[] {
  const sinks: DataFlowSink[] = [];

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    const identifier = action.WFWorkflowActionIdentifier.toLowerCase();
    const params = action.WFWorkflowActionParameters || {};

    if (
      identifier.includes('downloadurl') ||
      identifier.includes('getcontentsofurl') ||
      identifier.includes('sendmessage') ||
      identifier.includes('sendemail')
    ) {
      sinks.push({
        type: 'network',
        action: i,
        url: params.WFURL || params.WFInput || undefined,
        method: params.WFHTTPMethod || 'GET',
      });
    }

    if (identifier.includes('documentpicker.save') || identifier.includes('file.append')) {
      sinks.push({
        type: 'file_write',
        action: i,
        path: params.WFFilePath || params.WFFile?.path || undefined,
      });
    }

    if (
      identifier.includes('showresult') ||
      identifier.includes('alert') ||
      identifier.includes('notification')
    ) {
      sinks.push({
        type: 'display',
        action: i,
      });
    }

    if (identifier.includes('setclipboard')) {
      sinks.push({
        type: 'clipboard',
        action: i,
      });
    }

    if (identifier.includes('sharewith')) {
      sinks.push({
        type: 'message',
        action: i,
      });
    }
  }

  return sinks;
}

function identifyPermissions(actions: ShortcutAction[]): string[] {
  const permissions = new Set<string>();

  for (const action of actions) {
    const identifier = action.WFWorkflowActionIdentifier.toLowerCase();

    if (identifier.includes('contact')) permissions.add('contacts');
    if (identifier.includes('calendar') || identifier.includes('event'))
      permissions.add('calendar');
    if (identifier.includes('location')) permissions.add('location');
    if (identifier.includes('photo') || identifier.includes('image')) permissions.add('photos');
    if (identifier.includes('reminder')) permissions.add('reminders');
    if (identifier.includes('health')) permissions.add('health');
    if (identifier.includes('clipboard')) permissions.add('clipboard');
    if (
      identifier.includes('downloadurl') ||
      identifier.includes('getcontentsofurl') ||
      identifier.includes('openurl')
    ) {
      permissions.add('network');
    }
    if (identifier.includes('documentpicker') || identifier.includes('file.')) {
      permissions.add('files');
    }
  }

  return Array.from(permissions);
}

function checkForSelfRecursion(actions: ShortcutAction[]): boolean {
  for (const action of actions) {
    const identifier = action.WFWorkflowActionIdentifier.toLowerCase();
    const params = action.WFWorkflowActionParameters || {};

    if (identifier.includes('runworkflow') || identifier.includes('runshortcut')) {
      // Check if it's calling itself
      if (params.WFWorkflow?.isSelf === true || params.WFRunWorkflowName?.isSelf === true) {
        return true;
      }
    }
  }
  return false;
}

function checkForExternalCalls(actions: ShortcutAction[]): boolean {
  for (const action of actions) {
    const identifier = action.WFWorkflowActionIdentifier.toLowerCase();
    const params = action.WFWorkflowActionParameters || {};

    if (identifier.includes('runworkflow') || identifier.includes('runshortcut')) {
      // Check if it's NOT calling itself (i.e., external)
      if (params.WFWorkflow?.isSelf !== true && params.WFRunWorkflowName?.isSelf !== true) {
        return true;
      }
    }
  }
  return false;
}

// ============================================================================
// Main Preprocessing Service
// ============================================================================

export class PreprocessingService {
  process(shortcut: ParsedShortcut): PreprocessedData {
    const actions = shortcut.data.WFWorkflowActions || [];
    const inputTypes = shortcut.data.WFWorkflowInputContentItemClasses || [];

    // Enrich each action
    const enrichedActions = this.enrichActions(actions);

    // Count by risk tier
    const actionBreakdown = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const action of enrichedActions) {
      actionBreakdown[action.riskTier]++;
    }

    // Extract URLs
    const urls: ExtractedUrl[] = [];
    for (let i = 0; i < actions.length; i++) {
      urls.push(...extractUrlsFromAction(actions[i], i));
    }

    // Identify sources and sinks
    const sources = identifyDataSources(actions, inputTypes);
    const sinks = identifyDataSinks(actions);

    // Simple data flows (source → sink based on action proximity)
    const flows = this.buildSimpleFlows(sources, sinks, actions);

    return {
      shortcutName: shortcut.metadata.name,
      actionCount: actions.length,
      enrichedActions,
      actionBreakdown,
      sources,
      sinks,
      flows,
      urls,
      domains: extractDomains(urls),
      permissionsRequired: identifyPermissions(actions),
      hasExternalCalls: checkForExternalCalls(actions),
      hasSelfRecursion: checkForSelfRecursion(actions),
      acceptsShareSheet: inputTypes.length > 0,
      inputTypes,
      storesData: sinks.some((s) => s.type === 'file_write'),
      sendsDataExternally: sinks.some((s) => s.type === 'network'),
    };
  }

  private enrichActions(actions: ShortcutAction[]): EnrichedAction[] {
    return actions.map((action, index) => {
      const identifier = action.WFWorkflowActionIdentifier;
      const category = classifyCategory(identifier);

      return {
        index,
        identifier,
        friendlyName: getActionName(identifier),
        category,
        riskTier: classifyRiskTier(identifier),
        parameters: action.WFWorkflowActionParameters || {},
        inputSources: [], // Would require deeper variable tracking
        outputTargets: [], // Would require deeper variable tracking
        flags: extractFlags(action, category),
      };
    });
  }

  private buildSimpleFlows(
    sources: DataFlowSource[],
    sinks: DataFlowSink[],
    actions: ShortcutAction[],
  ): DataFlow[] {
    const flows: DataFlow[] = [];

    // For each network sink, check if there's a data source before it
    for (const sink of sinks) {
      if (sink.type === 'network') {
        // Look for data sources that come before this network call
        for (const source of sources) {
          const sourceIndex = source.action ?? -1;
          if (sourceIndex < sink.action && sourceIndex >= 0) {
            flows.push({
              from: `source:${source.type}`,
              to: `sink:${sink.type}`,
              via: this.getActionIndicesBetween(sourceIndex, sink.action),
              transforms: this.detectTransforms(actions, sourceIndex, sink.action),
            });
          }
        }

        // Share sheet input to network
        if (sources.some((s) => s.type === 'share_sheet')) {
          flows.push({
            from: 'source:share_sheet',
            to: `sink:${sink.type}`,
            via: this.getActionIndicesBetween(0, sink.action),
            transforms: this.detectTransforms(actions, 0, sink.action),
          });
        }
      }
    }

    return flows;
  }

  private getActionIndicesBetween(start: number, end: number): number[] {
    const indices: number[] = [];
    for (let i = start; i <= end; i++) {
      indices.push(i);
    }
    return indices;
  }

  private detectTransforms(actions: ShortcutAction[], start: number, end: number): string[] {
    const transforms: string[] = [];

    for (let i = start; i <= end; i++) {
      const identifier = actions[i].WFWorkflowActionIdentifier.toLowerCase();

      if (identifier.includes('regex') || identifier.includes('matchtext')) {
        transforms.push('regex');
      }
      if (identifier.includes('replacetext')) {
        transforms.push('text_replace');
      }
      if (identifier.includes('splittext')) {
        transforms.push('text_split');
      }
      if (identifier.includes('combinetext') || identifier.includes('concatenate')) {
        transforms.push('text_concat');
      }
      if (identifier.includes('base64') || identifier.includes('encode')) {
        transforms.push('encoding');
      }
      if (identifier.includes('gettext') || identifier.includes('extracttext')) {
        transforms.push('text_extract');
      }
    }

    return [...new Set(transforms)];
  }

  /**
   * Generates a compact summary for LLM prompts
   */
  generateSummary(data: PreprocessedData): string {
    const lines: string[] = [
      `## Shortcut: ${data.shortcutName}`,
      `- Actions: ${data.actionCount} (${data.actionBreakdown.critical} critical, ${data.actionBreakdown.high} high, ${data.actionBreakdown.medium} medium risk)`,
      `- Permissions: ${data.permissionsRequired.join(', ') || 'None detected'}`,
      `- Network calls: ${data.sinks.filter((s) => s.type === 'network').length}`,
      `- File operations: ${data.sinks.filter((s) => s.type === 'file_write').length}`,
      `- External shortcut calls: ${data.hasExternalCalls ? 'Yes' : 'No'}`,
      `- Self-recursion: ${data.hasSelfRecursion ? 'Yes' : 'No'}`,
      `- Accepts share sheet input: ${data.acceptsShareSheet ? 'Yes' : 'No'}`,
    ];

    if (data.domains.length > 0) {
      lines.push(`\n## Domains contacted:`, ...data.domains.map((d) => `- ${d}`));
    }

    if (data.urls.length > 0) {
      lines.push(`\n## URLs found:`);
      for (const url of data.urls.slice(0, 10)) {
        // Limit to first 10
        lines.push(`- [Action ${url.action}] ${url.url} (${url.type})`);
      }
      if (data.urls.length > 10) {
        lines.push(`... and ${data.urls.length - 10} more`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Generates a list of high-risk actions for quick scan
   */
  getHighRiskActions(data: PreprocessedData): EnrichedAction[] {
    return data.enrichedActions.filter((a) => a.riskTier === 'critical' || a.riskTier === 'high');
  }
}

export const preprocessingService = new PreprocessingService();
