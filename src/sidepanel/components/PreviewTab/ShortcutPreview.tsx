import { Box, VStack } from '@chakra-ui/react';
import { useMemo } from 'react';
import type { ShortcutAction } from '../../../utils/types';
import { getActionDefinition } from './actions/registry';
import { ActionRenderer } from './components/ActionRenderer';
import { ControlFlowContainer } from './components/ControlFlowContainer';
import { PreviewProvider } from './context/PreviewContext';
import { type ActionNode, WFControlFlowMode } from './types';
import { getActionColorScheme } from './utils/colorUtils';

interface ShortcutPreviewProps {
  actions: ShortcutAction[];
}

export function ShortcutPreview({ actions }: ShortcutPreviewProps) {
  // Build nested tree structure from flat action array
  const actionTree = useMemo(() => buildActionTree(actions), [actions]);

  return (
    <PreviewProvider>
      <VStack spacing={2} align="stretch">
        {renderActionTree(actionTree)}
      </VStack>
    </PreviewProvider>
  );
}

/**
 * Build a nested tree structure from flat action array based on control flow
 */
function buildActionTree(actions: ShortcutAction[]): ActionNode[] {
  const tree: ActionNode[] = [];
  const stack: ActionNode[][] = [tree];

  actions.forEach((action, index) => {
    const params = action.WFWorkflowActionParameters || {};
    const flowMode = params.WFControlFlowMode as number | undefined;

    const node: ActionNode = { action, index };

    if (flowMode === WFControlFlowMode.End) {
      // End: pop up first, then add to parent level (sibling of Start)
      if (stack.length > 1) {
        stack.pop();
      }
      stack[stack.length - 1].push(node);
    } else if (flowMode === WFControlFlowMode.Item) {
      // Item (Otherwise/Menu Item): pop up one level, create new branch
      if (stack.length > 1) {
        stack.pop();
      }
      node.children = [];
      stack[stack.length - 1].push(node);
      stack.push(node.children);
    } else if (flowMode === WFControlFlowMode.Start) {
      // Start: add node with children, push children array onto stack
      node.children = [];
      stack[stack.length - 1].push(node);
      stack.push(node.children);
    } else {
      // Regular action: add to current level
      stack[stack.length - 1].push(node);
    }
  });

  return tree;
}

/**
 * Recursively render the action tree
 */
function renderActionTree(nodes: ActionNode[], depth = 0): React.ReactNode {
  return nodes.map((node) => {
    const { action, index, children } = node;
    const identifier = action.WFWorkflowActionIdentifier;
    const params = action.WFWorkflowActionParameters || {};
    const flowMode = params.WFControlFlowMode as WFControlFlowMode | undefined;
    const uuid = params.UUID as string | undefined;
    // Use UUID if available, otherwise use action index as a stable key
    const key = uuid || `action-${index}`;

    const definition = getActionDefinition(identifier);
    const colorScheme = getActionColorScheme(definition.background);

    const hasChildren = children && children.length > 0;

    // For End actions, just render them inline
    if (flowMode === WFControlFlowMode.End) {
      return (
        <ActionRenderer
          key={key}
          identifier={identifier}
          params={params}
          uuid={uuid}
          index={index}
          controlFlowMode={flowMode}
        />
      );
    }

    // For Start/Item actions with children, render with container
    if (hasChildren) {
      return (
        <Box key={key}>
          <ActionRenderer
            identifier={identifier}
            params={params}
            uuid={uuid}
            index={index}
            controlFlowMode={flowMode}
          />
          <ControlFlowContainer
            mode={flowMode || WFControlFlowMode.Start}
            colorScheme={colorScheme}
          >
            {renderActionTree(children, depth + 1)}
          </ControlFlowContainer>
        </Box>
      );
    }

    // Regular action
    return (
      <ActionRenderer
        key={key}
        identifier={identifier}
        params={params}
        uuid={uuid}
        index={index}
        controlFlowMode={flowMode}
      />
    );
  });
}
