import { ChevronDownIcon, ChevronUpIcon, SearchIcon } from '@chakra-ui/icons';
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Badge,
  Box,
  Button,
  ButtonGroup,
  Code,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react';
import { useState } from 'react';
import { getActionName } from '../../../utils/parser';
import type { ShortcutData } from '../../../utils/types';
import ParametersView from '../ParametersView';

interface DataViewProps {
  data: ShortcutData;
}

export default function ParsedDataView({ data }: DataViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIndexes, setExpandedIndexes] = useState<number[]>([]);
  const actions = data.WFWorkflowActions || [];

  // Color mode values
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const accordionBg = useColorModeValue('white', 'gray.800');
  const accordionExpandedBg = useColorModeValue('brand.50', 'gray.700');

  // Custom replacer to handle BigInt values
  const bigIntReplacer = (_key: string, value: unknown) => {
    if (typeof value === 'bigint') {
      return Number(value);
    }
    return value;
  };

  // Expand all actions
  const handleExpandAll = () => {
    setExpandedIndexes(actions.map((_, index) => index));
  };

  // Collapse all actions
  const handleCollapseAll = () => {
    setExpandedIndexes([]);
  };

  // Filter actions based on search query
  const filteredActions = actions.filter((action) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    const identifier = action.WFWorkflowActionIdentifier?.toLowerCase() || '';
    const name = getActionName(action.WFWorkflowActionIdentifier).toLowerCase();
    const paramsString = JSON.stringify(
      action.WFWorkflowActionParameters || {},
      bigIntReplacer,
    ).toLowerCase();

    return identifier.includes(query) || name.includes(query) || paramsString.includes(query);
  });

  return (
    <VStack spacing={4} align="stretch">
      <HStack spacing={3}>
        <InputGroup flex="1">
          <InputLeftElement pointerEvents="none">
            <SearchIcon color="gray.400" />
          </InputLeftElement>
          <Input
            placeholder="Search actions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </InputGroup>

        <ButtonGroup size="sm" isAttached variant="outline">
          <Button leftIcon={<ChevronDownIcon />} onClick={handleExpandAll}>
            Expand All
          </Button>
          <Button leftIcon={<ChevronUpIcon />} onClick={handleCollapseAll}>
            Collapse All
          </Button>
        </ButtonGroup>
      </HStack>

      <Text fontSize="sm" color={textColor}>
        Showing {filteredActions.length} of {actions.length} actions
      </Text>

      <Accordion
        allowMultiple
        index={expandedIndexes}
        onChange={(indexes) => setExpandedIndexes(indexes as number[])}
      >
        {filteredActions.map((action, index) => {
          const actionName = getActionName(action.WFWorkflowActionIdentifier);
          const originalIndex = actions.indexOf(action);

          return (
            <AccordionItem key={action.UUID || index} bg={accordionBg} borderRadius="md" mb={2}>
              <h2>
                <AccordionButton _expanded={{ bg: accordionExpandedBg }}>
                  <Box flex="1" textAlign="left">
                    <HStack spacing={3}>
                      <Badge colorScheme="brand" fontSize="xs">
                        {originalIndex + 1}
                      </Badge>
                      <Text fontWeight="semibold">{actionName}</Text>
                    </HStack>
                    <Text fontSize="xs" color={textColor} mt={1}>
                      {action.WFWorkflowActionIdentifier}
                    </Text>
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
              </h2>
              <AccordionPanel pb={4}>
                <VStack spacing={3} align="stretch">
                  {action.UUID && (
                    <Box>
                      <Text fontSize="xs" fontWeight="semibold" color={textColor} mb={1}>
                        UUID
                      </Text>
                      <Code
                        fontSize="xs"
                        p={2}
                        borderRadius="md"
                        display="block"
                        wordBreak="break-all"
                      >
                        {action.UUID}
                      </Code>
                    </Box>
                  )}

                  {action.WFWorkflowActionParameters &&
                    Object.keys(action.WFWorkflowActionParameters).length > 0 && (
                      <Box>
                        <Text fontSize="xs" fontWeight="semibold" color={textColor} mb={2}>
                          Parameters
                        </Text>
                        <ParametersView parameters={action.WFWorkflowActionParameters} />
                      </Box>
                    )}

                  {/* Show other properties if they exist */}
                  {Object.keys(action)
                    .filter(
                      (key) =>
                        key !== 'WFWorkflowActionIdentifier' &&
                        key !== 'WFWorkflowActionParameters' &&
                        key !== 'UUID',
                    )
                    .map((key) => (
                      <Box key={key}>
                        <Text fontSize="xs" fontWeight="semibold" color={textColor} mb={1}>
                          {key}
                        </Text>
                        <Code
                          fontSize="xs"
                          p={2}
                          borderRadius="md"
                          display="block"
                          whiteSpace="pre-wrap"
                          wordBreak="break-all"
                        >
                          {typeof action[key] === 'object'
                            ? JSON.stringify(action[key], bigIntReplacer, 2)
                            : typeof action[key] === 'bigint'
                              ? String(Number(action[key]))
                              : String(action[key])}
                        </Code>
                      </Box>
                    ))}
                </VStack>
              </AccordionPanel>
            </AccordionItem>
          );
        })}
      </Accordion>

      {filteredActions.length === 0 && (
        <Box textAlign="center" py={8}>
          <Text color="gray.500">No actions found matching "{searchQuery}"</Text>
        </Box>
      )}
    </VStack>
  );
}
