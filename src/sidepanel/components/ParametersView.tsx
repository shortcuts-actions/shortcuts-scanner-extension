import { CopyIcon } from '@chakra-ui/icons';
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Badge,
  Box,
  Button,
  Code,
  HStack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Tooltip,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react';

interface ParametersViewProps {
  parameters: Record<string, any>;
}

export default function ParametersView({ parameters }: ParametersViewProps) {
  const toast = useToast();

  // Color mode values
  const nullColor = useColorModeValue('gray.500', 'gray.500');
  const booleanColor = useColorModeValue('purple.600', 'purple.400');
  const numberColor = useColorModeValue('blue.600', 'blue.400');
  const stringColor = useColorModeValue('gray.800', 'gray.200');
  const itemBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.300', 'gray.600');
  const labelColor = useColorModeValue('gray.600', 'gray.400');
  const keyColor = useColorModeValue('gray.700', 'gray.300');
  const tabPanelBg = useColorModeValue('gray.50', 'gray.800');
  const codeBg = useColorModeValue('gray.50', 'gray.900');
  const nestedBg = useColorModeValue('gray.50', 'gray.750');
  const accordionBg = useColorModeValue('gray.100', 'gray.650');
  const accordionHoverBg = useColorModeValue('gray.200', 'gray.600');
  const tokenBorder = useColorModeValue('blue.300', 'blue.600');

  // Custom replacer to handle BigInt values
  const bigIntReplacer = (_key: string, value: any) => {
    if (typeof value === 'bigint') {
      return Number(value);
    }
    return value;
  };

  const handleCopy = () => {
    const jsonString = JSON.stringify(parameters, bigIntReplacer, 2);
    navigator.clipboard.writeText(jsonString);
    toast({
      title: 'Copied to clipboard',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  // Helper to get a summary of object contents
  const getObjectSummary = (obj: Record<string, any>): string => {
    const entries = Object.entries(obj);
    if (entries.length === 0) return 'Empty object';
    // Just show the keys, not the values
    const keys = entries.map(([k]) => k).join(', ');
    return `{ ${keys} }`;
  };

  // Helper to render type badges
  const renderTypeBadge = (type: string): JSX.Element => {
    const colorScheme =
      type === 'ActionOutput'
        ? 'blue'
        : type === 'CurrentDate'
          ? 'green'
          : type === 'Variable'
            ? 'purple'
            : 'gray';

    return (
      <Badge colorScheme={colorScheme} fontSize="xs" px={2}>
        {type}
      </Badge>
    );
  };

  // Helper to check if an object has attachmentsByRange structure
  const hasAttachmentsByRange = (obj: any): boolean => {
    if (!obj || typeof obj !== 'object') return false;
    const entries = Object.entries(obj);

    // Check if this looks like an attachmentsByRange object
    // Keys should match pattern like "{0, 1}", "{8, 1}", etc.
    return (
      entries.length > 0 &&
      entries.every(([key, val]) => {
        return /^\{[\d\s,]+\}$/.test(key) && typeof val === 'object' && val !== null;
      })
    );
  };

  // Enhanced rendering for objects with attachmentsByRange
  const renderAttachmentsByRange = (attachments: Record<string, any>): JSX.Element => {
    return (
      <VStack align="stretch" spacing={1} pl={3}>
        {Object.entries(attachments).map(([range, attachment]: [string, any]) => (
          <Box
            key={range}
            p={2}
            bg={nestedBg}
            borderRadius="md"
            borderLeftWidth="3px"
            borderLeftColor={tokenBorder}
          >
            <HStack spacing={2} mb={1}>
              <Badge colorScheme="cyan" fontSize="xs">
                {range}
              </Badge>
              {attachment.Type && renderTypeBadge(attachment.Type)}
            </HStack>
            {renderSimpleObject(attachment, 1, ['Type'])}
          </Box>
        ))}
      </VStack>
    );
  };

  // Render simple objects inline or as compact list
  const renderSimpleObject = (
    obj: Record<string, any>,
    _depth: number = 0,
    excludeKeys: string[] = [],
  ): JSX.Element => {
    const entries = Object.entries(obj).filter(([key]) => !excludeKeys.includes(key));

    if (entries.length === 0) {
      return (
        <Text color={nullColor} fontSize="xs">
          -
        </Text>
      );
    }

    return (
      <VStack align="stretch" spacing={1} width="100%">
        {entries.map(([key, val]) => (
          <HStack key={key} spacing={2}>
            <Text fontSize="xs" color={labelColor} minW="100px">
              {key}:
            </Text>
            <Box flex="1">{renderInlineValue(val)}</Box>
          </HStack>
        ))}
      </VStack>
    );
  };

  // Render inline values (non-expandable)
  const renderInlineValue = (value: any): JSX.Element => {
    if (value === null || value === undefined) {
      return (
        <Text color={nullColor} fontSize="xs">
          null
        </Text>
      );
    }

    if (typeof value === 'boolean') {
      return (
        <Text color={booleanColor} fontSize="xs" fontWeight="semibold">
          {String(value)}
        </Text>
      );
    }

    if (typeof value === 'bigint' || typeof value === 'number') {
      return (
        <Text color={numberColor} fontSize="xs" fontWeight="semibold">
          {String(value)}
        </Text>
      );
    }

    if (typeof value === 'string') {
      // UUID detection
      if (/^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i.test(value)) {
        return (
          <Tooltip label="UUID" fontSize="xs">
            <Text fontSize="xs" fontFamily="mono" color={numberColor}>
              {value}
            </Text>
          </Tooltip>
        );
      }
      return (
        <Text fontSize="xs" color={stringColor}>
          {value}
        </Text>
      );
    }

    if (Array.isArray(value)) {
      return (
        <Text fontSize="xs" color={labelColor}>
          Array ({value.length})
        </Text>
      );
    }

    if (typeof value === 'object') {
      return (
        <Text fontSize="xs" color={labelColor}>
          {getObjectSummary(value)}
        </Text>
      );
    }

    return <Text fontSize="xs">{String(value)}</Text>;
  };

  const renderFormattedValue = (value: any, depth: number = 0): JSX.Element => {
    if (value === null || value === undefined) {
      return (
        <Text color={nullColor} fontSize="sm">
          null
        </Text>
      );
    }

    if (typeof value === 'boolean') {
      return (
        <Text color={booleanColor} fontSize="sm" fontWeight="semibold">
          {String(value)}
        </Text>
      );
    }

    if (typeof value === 'bigint') {
      return (
        <Text color={numberColor} fontSize="sm" fontWeight="semibold">
          {Number(value)}
        </Text>
      );
    }

    if (typeof value === 'number') {
      return (
        <Text color={numberColor} fontSize="sm" fontWeight="semibold">
          {value}
        </Text>
      );
    }

    if (typeof value === 'string') {
      return (
        <Text color={stringColor} fontSize="sm">
          {value}
        </Text>
      );
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return (
          <Text color={nullColor} fontSize="sm">
            Empty array
          </Text>
        );
      }

      return (
        <VStack align="stretch" spacing={1} width="100%">
          {value.map((item, index) => {
            const itemKey =
              typeof item === 'object'
                ? `array-item-${index}-${JSON.stringify(item, bigIntReplacer)}`
                : `array-item-${index}-${String(item)}`;

            return (
              <Box
                key={itemKey}
                p={2}
                bg={nestedBg}
                borderRadius="md"
                borderLeftWidth="3px"
                borderLeftColor={borderColor}
              >
                <HStack align="start" spacing={3}>
                  <Badge colorScheme="gray" fontSize="xs">
                    [{index}]
                  </Badge>
                  <Box flex="1">
                    {typeof item === 'object'
                      ? renderNestedObject(item, depth + 1)
                      : renderFormattedValue(item, depth)}
                  </Box>
                </HStack>
              </Box>
            );
          })}
        </VStack>
      );
    }

    if (typeof value === 'object') {
      return renderNestedObject(value, depth);
    }

    return <Text fontSize="sm">{String(value)}</Text>;
  };

  const renderNestedObject = (obj: Record<string, any>, depth: number = 0): JSX.Element => {
    const entries = Object.entries(obj);
    if (entries.length === 0) {
      return (
        <Text color={nullColor} fontSize="sm">
          Empty object
        </Text>
      );
    }

    // For shallow objects (2-3 simple properties), render inline
    const isSimpleObject =
      entries.length <= 3 && entries.every(([_, v]) => typeof v !== 'object' || v === null);

    if (isSimpleObject && depth > 0) {
      return (
        <HStack spacing={3} flexWrap="wrap">
          {entries.map(([key, val]) => (
            <HStack key={key} spacing={1}>
              <Text fontSize="xs" color={labelColor}>
                {key}:
              </Text>
              {renderInlineValue(val)}
            </HStack>
          ))}
        </HStack>
      );
    }

    // For complex objects, render each property appropriately
    return (
      <VStack align="stretch" spacing={2} width="100%">
        {entries.map(([key, val]) => {
          // Check if this value is an attachmentsByRange object
          if (typeof val === 'object' && val !== null && hasAttachmentsByRange(val)) {
            return (
              <Box key={key}>
                <Text fontSize="xs" color={labelColor} fontWeight="semibold" mb={1}>
                  {key}:
                </Text>
                {renderAttachmentsByRange(val)}
              </Box>
            );
          }

          const isComplexValue = typeof val === 'object' && val !== null;
          const shouldUseAccordion =
            isComplexValue &&
            ((Array.isArray(val) && val.length > 0) ||
              (!Array.isArray(val) && Object.keys(val).length > 0));

          if (!shouldUseAccordion) {
            // Simple property
            return (
              <HStack key={key} align="start" spacing={2}>
                <Text fontSize="xs" color={labelColor} fontWeight="semibold" minW="120px">
                  {key}:
                </Text>
                <Box flex="1">{renderFormattedValue(val, depth + 1)}</Box>
              </HStack>
            );
          }

          // Complex property with accordion
          return (
            <Box key={key}>
              <Accordion allowMultiple defaultIndex={[]}>
                <AccordionItem border="none">
                  <AccordionButton
                    bg={accordionBg}
                    borderRadius="md"
                    _hover={{ bg: accordionHoverBg }}
                    px={3}
                    py={2}
                  >
                    <HStack flex="1" spacing={3}>
                      <Text fontSize="sm" fontWeight="bold" color={keyColor}>
                        {key}
                      </Text>
                      <Text fontSize="xs" color={labelColor}>
                        {Array.isArray(val) ? `Array (${val.length})` : getObjectSummary(val)}
                      </Text>
                    </HStack>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel pb={2} pt={2} px={3} bg={nestedBg}>
                    {renderFormattedValue(val, depth + 1)}
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
            </Box>
          );
        })}
      </VStack>
    );
  };

  return (
    <Box>
      <Tabs size="sm" variant="enclosed" colorScheme="brand">
        <HStack justify="space-between" mb={2}>
          <TabList>
            <Tab>Formatted</Tab>
            <Tab>Raw JSON</Tab>
          </TabList>
          <Button
            size="xs"
            leftIcon={<CopyIcon />}
            onClick={handleCopy}
            variant="outline"
            colorScheme="gray"
          >
            Copy JSON
          </Button>
        </HStack>

        <TabPanels>
          <TabPanel p={3} bg={tabPanelBg} borderRadius="md" maxH="800px" overflowY="auto">
            <VStack align="stretch" spacing={2}>
              {Object.entries(parameters).map(([key, value]) => (
                <Box key={key} p={3} bg={itemBg} borderRadius="md" boxShadow="sm">
                  <Text fontSize="sm" fontWeight="bold" color={keyColor} mb={2}>
                    {key}
                  </Text>
                  <Box pl={2}>{renderFormattedValue(value, 0)}</Box>
                </Box>
              ))}
            </VStack>
          </TabPanel>

          <TabPanel p={0}>
            <Code
              fontSize="xs"
              p={3}
              borderRadius="md"
              display="block"
              whiteSpace="pre-wrap"
              wordBreak="break-all"
              maxH="400px"
              overflowY="auto"
              bg={codeBg}
            >
              {JSON.stringify(parameters, bigIntReplacer, 2)}
            </Code>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}
