import { Badge, Box, HStack, Text, useColorModeValue, VStack } from '@chakra-ui/react';
import { type FilterTemplate, formatFilterTemplate } from '../utils/valueParser';
import { ValueRenderer } from './ValueRenderer';

interface ContentItemFilterValue {
  WFActionParameterFilterPrefix?: number;
  WFActionParameterFilterTemplates?: FilterTemplate[];
}

interface FilterRendererProps {
  filter: unknown;
  compact?: boolean;
}

/**
 * Renders WFContentItemFilter values in a human-readable format
 */
export function FilterRenderer({ filter, compact = false }: FilterRendererProps) {
  // Extract filter value from wrapper if present
  const filterValue = extractFilterValue(filter);

  if (!filterValue) {
    return <ValueRenderer value={filter} placeholder="filter" />;
  }

  const templates = filterValue.WFActionParameterFilterTemplates || [];
  const prefix = filterValue.WFActionParameterFilterPrefix;

  if (templates.length === 0) {
    return (
      <Text fontSize="sm" color="gray.500" fontStyle="italic">
        No filters
      </Text>
    );
  }

  // Prefix determines AND (1) vs OR (0)
  const conjunction = prefix === 0 ? 'OR' : 'AND';

  if (compact && templates.length > 1) {
    return (
      <HStack spacing={1}>
        <Text fontSize="sm">{templates.length} filters</Text>
        <Badge size="sm" colorScheme={prefix === 0 ? 'orange' : 'blue'}>
          {conjunction}
        </Badge>
      </HStack>
    );
  }

  return (
    <VStack align="stretch" spacing={2}>
      {templates.map((template, index) => (
        <FilterTemplateRow
          key={index}
          template={template}
          showConjunction={index > 0}
          conjunction={conjunction}
        />
      ))}
    </VStack>
  );
}

/**
 * Renders a single filter template as a readable row
 */
function FilterTemplateRow({
  template,
  showConjunction,
  conjunction,
}: {
  template: FilterTemplate;
  showConjunction: boolean;
  conjunction: string;
}) {
  const labelColor = useColorModeValue('gray.600', 'gray.400');
  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const { property, operator, value } = formatFilterTemplate(template);

  // Check for variable overrides (values from variables instead of literals)
  const hasVariableOverride =
    template.VariableOverrides && Object.keys(template.VariableOverrides).length > 0;

  return (
    <Box>
      {showConjunction && (
        <Text fontSize="xs" color={labelColor} mb={1} fontWeight="medium">
          {conjunction}
        </Text>
      )}
      <HStack
        spacing={2}
        p={2}
        bg={bgColor}
        borderRadius="md"
        border="1px solid"
        borderColor={borderColor}
        flexWrap="wrap"
      >
        <Badge colorScheme="purple" variant="subtle">
          {property}
        </Badge>
        <Text fontSize="sm" color={labelColor}>
          {operator}
        </Text>
        {value && !hasVariableOverride && <Text fontSize="sm">{value}</Text>}
        {hasVariableOverride && template.VariableOverrides && (
          <ValueRenderer value={Object.values(template.VariableOverrides)[0]} placeholder="value" />
        )}
      </HStack>
    </Box>
  );
}

/**
 * Extract the filter value from various wrapper formats
 */
function extractFilterValue(filter: unknown): ContentItemFilterValue | null {
  if (!filter || typeof filter !== 'object') return null;

  const obj = filter as Record<string, unknown>;

  // Direct filter value
  if (obj.WFActionParameterFilterTemplates) {
    return obj as ContentItemFilterValue;
  }

  // Wrapped in Value
  if (obj.Value && typeof obj.Value === 'object') {
    const value = obj.Value as Record<string, unknown>;
    if (value.WFActionParameterFilterTemplates) {
      return value as ContentItemFilterValue;
    }
  }

  return null;
}

/**
 * Check if a value is a content item filter
 */
export function isContentItemFilter(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;

  const obj = value as Record<string, unknown>;

  // Direct check
  if (obj.WFActionParameterFilterTemplates) return true;

  // Check wrapped value
  if (obj.Value && typeof obj.Value === 'object') {
    const wrapped = obj.Value as Record<string, unknown>;
    return !!wrapped.WFActionParameterFilterTemplates;
  }

  return false;
}
