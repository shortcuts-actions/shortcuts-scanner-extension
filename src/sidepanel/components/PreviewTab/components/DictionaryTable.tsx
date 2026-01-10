import { Box, Table, Tbody, Td, Text, Th, Thead, Tr, useColorModeValue } from '@chakra-ui/react';
import type { DictionaryItem } from '../types';
import { DictionaryItemType } from '../types';
import { ValueRenderer } from './ValueRenderer';

interface DictionaryTableProps {
  items: DictionaryItem[];
}

const TYPE_NAMES: Record<number, string> = {
  [DictionaryItemType.Text]: 'Text',
  [DictionaryItemType.Number]: 'Number',
  [DictionaryItemType.Array]: 'Array',
  [DictionaryItemType.Dictionary]: 'Dictionary',
  [DictionaryItemType.Boolean]: 'Boolean',
};

export function DictionaryTable({ items }: DictionaryTableProps) {
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const headerBg = useColorModeValue('gray.50', 'gray.700');
  const headerColor = useColorModeValue('gray.600', 'gray.300');

  if (!items || items.length === 0) {
    return (
      <Text fontSize="sm" color="gray.500" fontStyle="italic">
        Empty dictionary
      </Text>
    );
  }

  return (
    <Box border="1px solid" borderColor={borderColor} borderRadius="md" overflow="hidden">
      <Table size="sm" variant="simple">
        <Thead bg={headerBg}>
          <Tr>
            <Th
              color={headerColor}
              fontSize="xs"
              textTransform="none"
              fontWeight="semibold"
              borderColor={borderColor}
              py={2}
            >
              Key
            </Th>
            <Th
              color={headerColor}
              fontSize="xs"
              textTransform="none"
              fontWeight="semibold"
              borderColor={borderColor}
              py={2}
              w="80px"
            >
              Type
            </Th>
            <Th
              color={headerColor}
              fontSize="xs"
              textTransform="none"
              fontWeight="semibold"
              borderColor={borderColor}
              py={2}
            >
              Value
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {items.map((item, index) => (
            <Tr key={index}>
              <Td borderColor={borderColor} py={2}>
                <ValueRenderer value={item.WFKey} placeholder="Key" />
              </Td>
              <Td borderColor={borderColor} py={2}>
                <Text fontSize="xs" color="gray.500">
                  {TYPE_NAMES[item.WFItemType] || 'Unknown'}
                </Text>
              </Td>
              <Td borderColor={borderColor} py={2}>
                <DictionaryValueCell item={item} />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
      <Box bg={headerBg} px={3} py={1} borderTop="1px solid" borderColor={borderColor}>
        <Text fontSize="xs" color="gray.500">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </Text>
      </Box>
    </Box>
  );
}

function DictionaryValueCell({ item }: { item: DictionaryItem }) {
  const { WFItemType, WFValue } = item;

  // For nested dictionaries
  if (WFItemType === DictionaryItemType.Dictionary) {
    const nestedItems = WFValue?.Value?.WFDictionaryFieldValueItems;
    if (nestedItems) {
      return <DictionaryTable items={nestedItems} />;
    }
  }

  // For arrays
  if (WFItemType === DictionaryItemType.Array) {
    const arrayItems = WFValue?.Value?.WFDictionaryFieldValueItems;
    if (arrayItems) {
      return (
        <Box pl={2}>
          {arrayItems.map((arrayItem, index) => (
            <Box key={index} mb={1}>
              <ValueRenderer value={arrayItem.WFValue} />
            </Box>
          ))}
        </Box>
      );
    }
  }

  // Default: render the value
  return <ValueRenderer value={WFValue} placeholder="-" />;
}
