import { Badge, HStack, Text, VStack } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { getActionDefinition } from '../actions/registry';
import { type ActionRendererProps, WFControlFlowMode } from '../types';
import { type FilterTemplate, formatCondition, formatFilterTemplate } from '../utils/valueParser';
import { ActionCard } from './ActionCard';
import { ActionErrorBoundary } from './ActionErrorBoundary';
import { DictionaryTable } from './DictionaryTable';
import { FilterRenderer } from './FilterRenderer';
import { ValueRenderer } from './ValueRenderer';

/**
 * Main action renderer that dispatches to specific renderers based on action type
 */
export function ActionRenderer({
  identifier,
  params,
  uuid,
  index,
  controlFlowMode,
}: ActionRendererProps & { index: number }) {
  const definition = getActionDefinition(identifier);

  // Handle control flow mode for title changes
  let title = definition.title || 'Action';
  if (controlFlowMode !== undefined) {
    title = getControlFlowTitle(identifier, controlFlowMode, title);
  }

  // Get the header content and body content based on action type
  const { headerContent, bodyContent } = renderActionContent(identifier, params, controlFlowMode);

  return (
    <ActionErrorBoundary actionName={title}>
      <ActionCard
        title={title}
        icon={definition.icon}
        color={definition.background}
        uuid={uuid}
        index={index}
        headerContent={headerContent}
      >
        {bodyContent}
      </ActionCard>
    </ActionErrorBoundary>
  );
}

/**
 * Get the title for control flow actions based on mode
 */
function getControlFlowTitle(
  identifier: string,
  mode: WFControlFlowMode,
  defaultTitle: string,
): string {
  if (identifier === 'is.workflow.actions.conditional') {
    switch (mode) {
      case WFControlFlowMode.Start:
        return 'If';
      case WFControlFlowMode.Item:
        return 'Otherwise';
      case WFControlFlowMode.End:
        return 'End If';
    }
  }

  if (
    identifier === 'is.workflow.actions.repeat.count' ||
    identifier === 'is.workflow.actions.repeat.each'
  ) {
    if (mode === WFControlFlowMode.End) {
      return 'End Repeat';
    }
  }

  if (identifier === 'is.workflow.actions.choosefrommenu') {
    switch (mode) {
      case WFControlFlowMode.Start:
        return 'Menu';
      case WFControlFlowMode.Item:
        return 'Menu Item';
      case WFControlFlowMode.End:
        return 'End Menu';
    }
  }

  return defaultTitle;
}

/**
 * Render action-specific content
 */
function renderActionContent(
  identifier: string,
  params: Record<string, unknown>,
  controlFlowMode?: WFControlFlowMode,
): { headerContent: ReactNode; bodyContent: ReactNode } {
  const labelColor = 'gray.500';

  // Text action
  if (identifier === 'is.workflow.actions.gettext') {
    return {
      headerContent: null,
      bodyContent: <ValueRenderer value={params.WFTextActionText} placeholder="Text" />,
    };
  }

  // Comment action
  if (identifier === 'is.workflow.actions.comment') {
    return {
      headerContent: null,
      bodyContent: <ValueRenderer value={params.WFCommentActionText} placeholder="" />,
    };
  }

  // Set Variable
  if (identifier === 'is.workflow.actions.setvariable') {
    return {
      headerContent: (
        <HStack spacing={2}>
          <ValueRenderer value={params.WFVariableName} placeholder="variable" />
          <Text fontSize="sm" color={labelColor}>
            to
          </Text>
          <ValueRenderer value={params.WFInput} placeholder="input" />
        </HStack>
      ),
      bodyContent: null,
    };
  }

  // Get Variable
  if (identifier === 'is.workflow.actions.getvariable') {
    return {
      headerContent: <ValueRenderer value={params.WFVariable} placeholder="variable" />,
      bodyContent: null,
    };
  }

  // Add to Variable
  if (identifier === 'is.workflow.actions.appendvariable') {
    return {
      headerContent: (
        <HStack spacing={2}>
          <ValueRenderer value={params.WFInput} placeholder="input" />
          <Text fontSize="sm" color={labelColor}>
            to
          </Text>
          <ValueRenderer value={params.WFVariableName} placeholder="variable" />
        </HStack>
      ),
      bodyContent: null,
    };
  }

  // If/Otherwise conditional
  if (identifier === 'is.workflow.actions.conditional') {
    if (controlFlowMode === WFControlFlowMode.Start) {
      return {
        headerContent: renderConditionalHeader(params),
        bodyContent: null,
      };
    }
    return { headerContent: null, bodyContent: null };
  }

  // Repeat
  if (identifier === 'is.workflow.actions.repeat.count') {
    if (controlFlowMode === WFControlFlowMode.Start) {
      return {
        headerContent: (
          <HStack spacing={2}>
            <ValueRenderer value={params.WFRepeatCount} placeholder="times" />
            <Text fontSize="sm" color={labelColor}>
              times
            </Text>
          </HStack>
        ),
        bodyContent: null,
      };
    }
    return { headerContent: null, bodyContent: null };
  }

  // Repeat with Each
  if (identifier === 'is.workflow.actions.repeat.each') {
    if (controlFlowMode === WFControlFlowMode.Start) {
      return {
        headerContent: (
          <HStack spacing={2}>
            <Text fontSize="sm" color={labelColor}>
              in
            </Text>
            <ValueRenderer value={params.WFInput} placeholder="items" />
          </HStack>
        ),
        bodyContent: null,
      };
    }
    return { headerContent: null, bodyContent: null };
  }

  // Choose from Menu
  if (identifier === 'is.workflow.actions.choosefrommenu') {
    if (controlFlowMode === WFControlFlowMode.Start) {
      const menuItems = params.WFMenuItems as Array<{ WFValue?: unknown }> | undefined;
      return {
        headerContent: (
          <HStack spacing={2}>
            <Text fontSize="sm" color={labelColor}>
              with
            </Text>
            <ValueRenderer value={params.WFMenuPrompt} placeholder="prompt" />
          </HStack>
        ),
        bodyContent: menuItems ? (
          <VStack align="stretch" spacing={1}>
            {menuItems.map((item, idx) => (
              <HStack key={idx} spacing={2}>
                <Text fontSize="sm">•</Text>
                <ValueRenderer value={item.WFValue} placeholder="Item" />
              </HStack>
            ))}
          </VStack>
        ) : null,
      };
    }
    if (controlFlowMode === WFControlFlowMode.Item) {
      return {
        headerContent: (
          <ValueRenderer
            value={params.WFMenuItemTitle || params.WFMenuItemAttributedTitle || 'Item'}
            placeholder="Item"
          />
        ),
        bodyContent: null,
      };
    }
    return { headerContent: null, bodyContent: null };
  }

  // Choose from List
  if (identifier === 'is.workflow.actions.choosefromlist') {
    return {
      headerContent: <ValueRenderer value={params.WFInput} placeholder="list" />,
      bodyContent: renderParameters(params, [
        'WFChooseFromListActionPrompt',
        'WFChooseFromListActionSelectMultiple',
      ]),
    };
  }

  // Dictionary
  if (identifier === 'is.workflow.actions.dictionary') {
    const items = (params.WFItems as { Value?: { WFDictionaryFieldValueItems?: unknown[] } })?.Value
      ?.WFDictionaryFieldValueItems;
    return {
      headerContent: null,
      bodyContent: items ? <DictionaryTable items={items as any} /> : null,
    };
  }

  // Get Dictionary Value
  if (identifier === 'is.workflow.actions.getvalueforkey') {
    return {
      headerContent: (
        <HStack spacing={2}>
          <ValueRenderer value={params.WFGetDictionaryValueType || 'Value'} />
          {params.WFDictionaryKey ? (
            <>
              <Text fontSize="sm" color={labelColor}>
                for
              </Text>
              <ValueRenderer value={params.WFDictionaryKey} placeholder="key" />
            </>
          ) : null}
          <Text fontSize="sm" color={labelColor}>
            in
          </Text>
          <ValueRenderer value={params.WFInput} placeholder="dictionary" />
        </HStack>
      ),
      bodyContent: null,
    };
  }

  // Set Dictionary Value
  if (identifier === 'is.workflow.actions.setvalueforkey') {
    return {
      headerContent: (
        <HStack spacing={2}>
          <ValueRenderer value={params.WFDictionaryKey} placeholder="key" />
          <Text fontSize="sm" color={labelColor}>
            to
          </Text>
          <ValueRenderer value={params.WFDictionaryValue} placeholder="value" />
          <Text fontSize="sm" color={labelColor}>
            in
          </Text>
          <ValueRenderer value={params.WFInput} placeholder="dictionary" />
        </HStack>
      ),
      bodyContent: null,
    };
  }

  // List
  if (identifier === 'is.workflow.actions.list') {
    const items = params.WFItems as unknown[];
    return {
      headerContent: null,
      bodyContent: items ? (
        <VStack align="stretch" spacing={1}>
          {items.map((item, idx) => (
            <HStack key={idx} spacing={2}>
              <Text fontSize="xs" color="gray.500" minW="20px">
                {idx + 1}.
              </Text>
              <ValueRenderer value={item} />
            </HStack>
          ))}
        </VStack>
      ) : null,
    };
  }

  // Get Item from List
  if (identifier === 'is.workflow.actions.getitemfromlist') {
    return {
      headerContent: (
        <HStack spacing={2}>
          <ValueRenderer value={params.WFItemSpecifier || 'First Item'} />
          <Text fontSize="sm" color={labelColor}>
            from
          </Text>
          <ValueRenderer value={params.WFInput} placeholder="list" />
        </HStack>
      ),
      bodyContent: null,
    };
  }

  // Count
  if (identifier === 'is.workflow.actions.count') {
    return {
      headerContent: (
        <HStack spacing={2}>
          <ValueRenderer value={params.WFCountType || 'Items'} />
          <Text fontSize="sm" color={labelColor}>
            in
          </Text>
          <ValueRenderer value={params.Input} placeholder="input" />
        </HStack>
      ),
      bodyContent: null,
    };
  }

  // URL
  if (identifier === 'is.workflow.actions.url') {
    return {
      headerContent: <ValueRenderer value={params.WFURLActionURL} placeholder="URL" />,
      bodyContent: null,
    };
  }

  // Open URL
  if (identifier === 'is.workflow.actions.openurl') {
    return {
      headerContent: <ValueRenderer value={params.WFInput} placeholder="URL" />,
      bodyContent: null,
    };
  }

  // Download URL / Get Contents of URL
  if (identifier === 'is.workflow.actions.downloadurl') {
    return {
      headerContent: <ValueRenderer value={params.WFURL} placeholder="URL" />,
      bodyContent: renderParameters(params, ['WFHTTPMethod', 'WFHTTPBodyType']),
    };
  }

  // Show Alert
  if (identifier === 'is.workflow.actions.alert') {
    return {
      headerContent: <ValueRenderer value={params.WFAlertActionTitle} placeholder="Alert" />,
      bodyContent: params.WFAlertActionMessage ? (
        <ValueRenderer value={params.WFAlertActionMessage} />
      ) : null,
    };
  }

  // Show Notification
  if (identifier === 'is.workflow.actions.notification') {
    return {
      headerContent: (
        <ValueRenderer value={params.WFNotificationActionTitle} placeholder="Notification" />
      ),
      bodyContent: params.WFNotificationActionBody ? (
        <ValueRenderer value={params.WFNotificationActionBody} />
      ) : null,
    };
  }

  // Ask for Input
  if (identifier === 'is.workflow.actions.ask') {
    return {
      headerContent: (
        <HStack spacing={2}>
          <ValueRenderer value={params.WFInputType || 'Text'} />
          <Text fontSize="sm" color={labelColor}>
            with
          </Text>
          <ValueRenderer value={params.WFAskActionPrompt} placeholder="prompt" />
        </HStack>
      ),
      bodyContent: renderParameters(params, ['WFAskActionDefaultAnswer']),
    };
  }

  // Show Result
  if (identifier === 'is.workflow.actions.showresult') {
    return {
      headerContent: null,
      bodyContent: <ValueRenderer value={params.Text} placeholder="result" />,
    };
  }

  // Number
  if (identifier === 'is.workflow.actions.number') {
    return {
      headerContent: <ValueRenderer value={params.WFNumberActionNumber} placeholder="0" />,
      bodyContent: null,
    };
  }

  // Calculate
  if (identifier === 'is.workflow.actions.math') {
    const operations: Record<string, string> = {
      '+': '+',
      '-': '−',
      '×': '×',
      '÷': '÷',
      '...': '...',
    };
    return {
      headerContent: (
        <HStack spacing={2}>
          <ValueRenderer value={params.WFInput} placeholder="number" />
          <Text fontSize="sm">{operations[params.WFMathOperation as string] || '+'}</Text>
          <ValueRenderer value={params.WFMathOperand} placeholder="number" />
        </HStack>
      ),
      bodyContent: null,
    };
  }

  // Run Shortcut
  if (identifier === 'is.workflow.actions.runworkflow') {
    return {
      headerContent: (
        <ValueRenderer value={params.WFWorkflow || params.WFWorkflowName} placeholder="shortcut" />
      ),
      bodyContent: params.WFInput ? (
        <HStack spacing={2}>
          <Text fontSize="sm" color={labelColor}>
            with
          </Text>
          <ValueRenderer value={params.WFInput} placeholder="input" />
        </HStack>
      ) : null,
    };
  }

  // Copy to Clipboard
  if (identifier === 'is.workflow.actions.setclipboard') {
    return {
      headerContent: (
        <HStack spacing={2}>
          <ValueRenderer value={params.WFInput} placeholder="content" />
          <Text fontSize="sm" color={labelColor}>
            to clipboard
          </Text>
        </HStack>
      ),
      bodyContent: null,
    };
  }

  // Wait
  if (identifier === 'is.workflow.actions.delay') {
    return {
      headerContent: (
        <HStack spacing={2}>
          <ValueRenderer value={params.WFDelayTime || 1} />
          <Text fontSize="sm" color={labelColor}>
            seconds
          </Text>
        </HStack>
      ),
      bodyContent: null,
    };
  }

  // Open App
  if (identifier === 'is.workflow.actions.openapp') {
    return {
      headerContent: (
        <ValueRenderer value={params.WFAppIdentifier || params.WFApp} placeholder="app" />
      ),
      bodyContent: null,
    };
  }

  // Combine Text
  if (identifier === 'is.workflow.actions.text.combine') {
    return {
      headerContent: (
        <HStack spacing={2}>
          <ValueRenderer value={params.text} placeholder="text" />
          <Text fontSize="sm" color={labelColor}>
            with
          </Text>
          <ValueRenderer value={params.WFTextSeparator || 'New Lines'} />
        </HStack>
      ),
      bodyContent: null,
    };
  }

  // Split Text
  if (identifier === 'is.workflow.actions.text.split') {
    return {
      headerContent: (
        <HStack spacing={2}>
          <ValueRenderer value={params.text} placeholder="text" />
          <Text fontSize="sm" color={labelColor}>
            by
          </Text>
          <ValueRenderer value={params.WFTextSeparator || 'New Lines'} />
        </HStack>
      ),
      bodyContent: null,
    };
  }

  // Replace Text
  if (identifier === 'is.workflow.actions.text.replace') {
    return {
      headerContent: (
        <HStack spacing={2}>
          <ValueRenderer value={params.WFReplaceTextFind} placeholder="find" />
          <Text fontSize="sm" color={labelColor}>
            with
          </Text>
          <ValueRenderer value={params.WFReplaceTextReplace} placeholder="replace" />
          <Text fontSize="sm" color={labelColor}>
            in
          </Text>
          <ValueRenderer value={params.WFInput} placeholder="text" />
        </HStack>
      ),
      bodyContent: null,
    };
  }

  // Date
  if (identifier === 'is.workflow.actions.date') {
    const mode = params.WFDateActionMode as string;
    return {
      headerContent: (
        <ValueRenderer
          value={mode === 'Specified Date' ? params.WFDateActionDate : 'Current Date'}
          placeholder="date"
        />
      ),
      bodyContent: null,
    };
  }

  // Device toggles (WiFi, Bluetooth, etc.)
  const toggleActions = [
    'is.workflow.actions.wifi.set',
    'is.workflow.actions.bluetooth.set',
    'is.workflow.actions.airplanemode.set',
    'is.workflow.actions.cellulardata.set',
    'is.workflow.actions.lowpowermode.set',
  ];
  if (toggleActions.includes(identifier)) {
    const operation = params.operation || params.OnValue !== undefined;
    const state = params.OnValue ?? params.state ?? true;
    return {
      headerContent: (
        <HStack spacing={2}>
          <Text fontSize="sm">{operation ? 'Turn' : 'Toggle'}</Text>
          {operation && <ValueRenderer value={state ? 'On' : 'Off'} />}
        </HStack>
      ),
      bodyContent: null,
    };
  }

  // Set Brightness / Volume
  if (
    identifier === 'is.workflow.actions.setbrightness' ||
    identifier === 'is.workflow.actions.setvolume'
  ) {
    return {
      headerContent: (
        <HStack spacing={2}>
          <Text fontSize="sm" color={labelColor}>
            to
          </Text>
          <ValueRenderer value={params.WFBrightness || params.WFVolume} placeholder="50%" />
        </HStack>
      ),
      bodyContent: null,
    };
  }

  // Find/Filter actions (Find Calendar Events, Find Reminders, Find Contacts, etc.)
  if (identifier.includes('filter.')) {
    const filter = params.WFContentItemFilter;
    const sortProperty = params.WFContentItemSortProperty;
    const sortOrder = params.WFContentItemSortOrder;
    const limitEnabled = params.WFContentItemLimitEnabled;
    const limitNumber = params.WFContentItemLimitNumber;

    return {
      headerContent: null,
      bodyContent: (
        <VStack align="stretch" spacing={2}>
          {filter !== undefined && <FilterRenderer filter={filter} />}
          {sortProperty !== undefined && (
            <HStack spacing={2}>
              <Text fontSize="xs" color={labelColor}>
                Sort by:
              </Text>
              <ValueRenderer value={sortProperty} />
              {sortOrder !== undefined && (
                <HStack spacing={1}>
                  <Text fontSize="sm">•</Text>
                  <ValueRenderer value={sortOrder} />
                </HStack>
              )}
            </HStack>
          )}
          {limitEnabled === true && limitNumber !== undefined && (
            <HStack spacing={2}>
              <Text fontSize="xs" color={labelColor}>
                Limit:
              </Text>
              <ValueRenderer value={limitNumber} />
            </HStack>
          )}
        </VStack>
      ),
    };
  }

  // Default: show all parameters, but use FilterRenderer for filter params
  return {
    headerContent: null,
    bodyContent: renderAllParameters(params),
  };
}

/**
 * Render conditional header for If action
 */
function renderConditionalHeader(params: Record<string, unknown>): ReactNode {
  const labelColor = 'gray.500';

  // Check for multiple conditions via WFConditions (filter template format)
  const conditions = params.WFConditions as {
    Value?: {
      WFActionParameterFilterTemplates?: FilterTemplate[];
      WFActionParameterFilterPrefix?: number;
    };
  };

  if (conditions?.Value?.WFActionParameterFilterTemplates) {
    const templates = conditions.Value.WFActionParameterFilterTemplates;
    const prefix = conditions.Value.WFActionParameterFilterPrefix;

    if (templates.length === 1) {
      // Single condition from filter template
      return renderFilterCondition(templates[0], params);
    }

    // Multiple conditions - show summary in header, details in body
    return (
      <VStack align="stretch" spacing={2}>
        <HStack spacing={2}>
          <Text fontSize="sm" fontWeight="medium">
            {prefix === 0 ? 'Any' : 'All'}
          </Text>
          <Text fontSize="sm" color={labelColor}>
            of the following are true:
          </Text>
        </HStack>
        {templates.map((template, idx) => (
          <HStack key={idx} spacing={2} pl={2}>
            {idx > 0 && (
              <Badge size="sm" colorScheme={prefix === 0 ? 'orange' : 'blue'}>
                {prefix === 0 ? 'OR' : 'AND'}
              </Badge>
            )}
            {renderFilterCondition(template, params)}
          </HStack>
        ))}
      </VStack>
    );
  }

  // Simple single condition (legacy format)
  return renderSingleCondition(params);
}

/**
 * Render a single condition from a filter template
 * Handles both If conditional format (WFInput, WFCondition) and filter action format (Property, Operator, Values)
 */
function renderFilterCondition(
  template: FilterTemplate | Record<string, unknown>,
  params: Record<string, unknown>,
): ReactNode {
  const labelColor = 'gray.500';

  // Check if this is an If conditional format (has WFCondition field)
  const templateObj = template as Record<string, unknown>;
  if ('WFCondition' in templateObj || 'WFInput' in templateObj) {
    // This is If conditional format - use renderSingleCondition logic
    const condition = formatCondition(templateObj.WFCondition as number);
    const inputVar = templateObj.WFInput ?? params.WFInput;

    return (
      <HStack spacing={2} flexWrap="wrap">
        <ValueRenderer value={inputVar} placeholder="input" />
        <Text fontSize="sm" color={labelColor}>
          {condition}
        </Text>
        {templateObj.WFConditionalActionString !== undefined && (
          <ValueRenderer value={templateObj.WFConditionalActionString} placeholder="value" />
        )}
        {templateObj.WFNumberValue !== undefined && (
          <ValueRenderer value={templateObj.WFNumberValue} placeholder="number" />
        )}
      </HStack>
    );
  }

  // Filter action format (Property, Operator, Values)
  const filterTemplate = template as FilterTemplate;
  const { property, operator, value } = formatFilterTemplate(filterTemplate);

  // Check for variable overrides (the input variable)
  const variableOverrides = filterTemplate.VariableOverrides;
  const inputVar = variableOverrides?.[''] || variableOverrides?.Input || params.WFInput;

  return (
    <HStack spacing={2} flexWrap="wrap">
      {inputVar !== undefined && <ValueRenderer value={inputVar} placeholder="input" />}
      {property !== 'Unknown' && (
        <Badge colorScheme="purple" variant="subtle" fontSize="xs">
          {property}
        </Badge>
      )}
      <Text fontSize="sm" color={labelColor}>
        {operator}
      </Text>
      {value && <Text fontSize="sm">{value}</Text>}
    </HStack>
  );
}

/**
 * Render a simple single condition (non-filter template format)
 */
function renderSingleCondition(params: Record<string, unknown>): ReactNode {
  const labelColor = 'gray.500';
  const condition = formatCondition(params.WFCondition as number);

  return (
    <HStack spacing={2} flexWrap="wrap">
      <ValueRenderer value={params.WFInput} placeholder="input" />
      <Text fontSize="sm" color={labelColor}>
        {condition}
      </Text>
      {params.WFConditionalActionString !== undefined && (
        <ValueRenderer value={params.WFConditionalActionString} placeholder="value" />
      )}
      {params.WFNumberValue !== undefined && (
        <ValueRenderer value={params.WFNumberValue} placeholder="number" />
      )}
    </HStack>
  );
}

/**
 * Render specific parameters
 */
function renderParameters(params: Record<string, unknown>, keys: string[]): ReactNode {
  const entries = keys
    .filter((key) => params[key] !== undefined)
    .map((key) => ({ key, value: params[key] }));

  if (entries.length === 0) return null;

  return (
    <VStack align="stretch" spacing={1}>
      {entries.map(({ key, value }) => (
        <HStack key={key} spacing={2}>
          <Text fontSize="xs" color="gray.500" minW="100px">
            {formatParamKey(key)}:
          </Text>
          <ValueRenderer value={value} />
        </HStack>
      ))}
    </VStack>
  );
}

/**
 * Render all parameters as fallback
 */
function renderAllParameters(params: Record<string, unknown>): ReactNode {
  // Filter out internal/common parameters
  const skipKeys = ['UUID', 'WFControlFlowMode', 'GroupingIdentifier', 'CustomOutputName'];

  const entries = Object.entries(params).filter(
    ([key]) => !skipKeys.includes(key) && !key.startsWith('WFSerialization'),
  );

  if (entries.length === 0) return null;

  return (
    <VStack align="stretch" spacing={1}>
      {entries.map(([key, value]) => (
        <HStack key={key} spacing={2} alignItems="flex-start">
          <Text fontSize="xs" color="gray.500" minW="100px" flexShrink={0}>
            {formatParamKey(key)}:
          </Text>
          <ValueRenderer value={value} />
        </HStack>
      ))}
    </VStack>
  );
}

/**
 * Format parameter key for display
 */
function formatParamKey(key: string): string {
  return key
    .replace(/^WF/, '')
    .replace(/([A-Z])/g, ' $1')
    .trim();
}
