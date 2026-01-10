import { Box, Text, useColorModeValue, VStack } from '@chakra-ui/react';
import type { ParsedShortcut } from '../../../utils/types';
import { ShortcutPreview } from './ShortcutPreview';

interface PreviewTabProps {
  shortcut: ParsedShortcut;
}

export default function PreviewTab({ shortcut }: PreviewTabProps) {
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const actions = shortcut.data?.WFWorkflowActions || [];

  if (actions.length === 0) {
    return (
      <VStack spacing={4} align="stretch">
        <Text fontSize="sm" color={textColor}>
          Visual preview of the shortcut actions as they appear in iOS.
        </Text>
        <Box p={8} borderRadius="md" borderWidth="1px" borderColor={borderColor} textAlign="center">
          <Text color="gray.500" fontStyle="italic">
            No actions found in this shortcut.
          </Text>
        </Box>
      </VStack>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      <Text fontSize="sm" color={textColor}>
        Visual preview of the shortcut actions as they appear in iOS.
      </Text>
      <Box
        borderRadius="md"
        borderWidth="1px"
        borderColor={borderColor}
        p={4}
        maxH="70vh"
        overflow="auto"
      >
        <ShortcutPreview actions={actions} />
      </Box>
    </VStack>
  );
}
