import { Alert, AlertIcon, Box, Text, useColorModeValue } from '@chakra-ui/react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ActionErrorBoundaryProps {
  actionName: string;
  children: ReactNode;
}

interface ActionErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary that catches rendering errors in action components.
 * Falls back to displaying just the action name with a warning.
 */
export class ActionErrorBoundary extends Component<
  ActionErrorBoundaryProps,
  ActionErrorBoundaryState
> {
  constructor(props: ActionErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ActionErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error for debugging
    console.warn(
      `[ShortcutPreview] Failed to render action "${this.props.actionName}":`,
      error.message,
      errorInfo.componentStack,
    );
  }

  render() {
    if (this.state.hasError) {
      return <ActionErrorFallback actionName={this.props.actionName} />;
    }

    return this.props.children;
  }
}

/**
 * Fallback UI shown when an action fails to render
 */
function ActionErrorFallback({ actionName }: { actionName: string }) {
  const bgColor = useColorModeValue('orange.50', 'orange.900');
  const borderColor = useColorModeValue('orange.200', 'orange.700');

  return (
    <Box borderRadius="lg" borderWidth="1px" borderColor={borderColor} bg={bgColor} p={3}>
      <Alert status="warning" variant="subtle" borderRadius="md" py={2} px={3}>
        <AlertIcon boxSize={4} />
        <Box>
          <Text fontSize="sm" fontWeight="medium">
            {actionName}
          </Text>
          <Text fontSize="xs" color="gray.500">
            Unable to render action parameters
          </Text>
        </Box>
      </Alert>
    </Box>
  );
}
