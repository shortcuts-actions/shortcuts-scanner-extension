import { Box, useColorModeValue, VStack } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { WFControlFlowMode } from '../types';

interface ControlFlowContainerProps {
  mode: WFControlFlowMode;
  colorScheme?: string;
  children: ReactNode;
}

export function ControlFlowContainer({
  mode,
  colorScheme = 'gray',
  children,
}: ControlFlowContainerProps) {
  const connectorColor = useColorModeValue(`${colorScheme}.200`, `${colorScheme}.700`);

  // End actions just close the container - no wrapper needed
  if (mode === WFControlFlowMode.End) {
    return null;
  }

  return (
    <Box position="relative" ml={4} mt={1} mb={1}>
      {/* Vertical connector line */}
      <Box
        position="absolute"
        left="0"
        top="0"
        bottom="0"
        width="3px"
        bg={connectorColor}
        borderRadius="full"
      />

      {/* Children content */}
      <VStack spacing={2} align="stretch" pl={4}>
        {children}
      </VStack>
    </Box>
  );
}

/**
 * Simple visual connector between actions in a control flow
 */
export function ControlFlowConnector({ colorScheme = 'gray' }: { colorScheme?: string }) {
  const connectorColor = useColorModeValue(`${colorScheme}.200`, `${colorScheme}.700`);

  return <Box height="16px" width="3px" bg={connectorColor} borderRadius="full" ml={4} />;
}
