import { Box, Code, HStack, Icon, Text, useColorModeValue, VStack } from '@chakra-ui/react';
import { FiCheck, FiMapPin, FiX } from 'react-icons/fi';
import type { AttachmentValue, WFValue, WFValueContent } from '../types';
import {
  hasInlineAttachments,
  isDictionaryValue,
  isPrimitive,
  isVariableReference,
  isWFValue,
  parseInlineAttachments,
} from '../utils/valueParser';
import { DictionaryTable } from './DictionaryTable';
import { VariablePill, VariablePillFromContent } from './VariablePill';

interface ValueRendererProps {
  value: unknown;
  placeholder?: string;
}

export function ValueRenderer({ value, placeholder = '...' }: ValueRendererProps) {
  const stringColor = useColorModeValue('gray.800', 'gray.200');
  const numberColor = useColorModeValue('blue.600', 'blue.300');
  const placeholderColor = useColorModeValue('gray.400', 'gray.500');

  // Null/undefined
  if (value === null || value === undefined) {
    return (
      <Text color={placeholderColor} fontStyle="italic" fontSize="sm">
        {placeholder}
      </Text>
    );
  }

  // Boolean
  if (typeof value === 'boolean') {
    return (
      <HStack spacing={1}>
        <Icon as={value ? FiCheck : FiX} color={value ? 'green.500' : 'red.500'} boxSize={4} />
        <Text fontSize="sm" fontWeight="medium" color={value ? 'green.600' : 'red.600'}>
          {value ? 'Yes' : 'No'}
        </Text>
      </HStack>
    );
  }

  // Number
  if (typeof value === 'number' || typeof value === 'bigint') {
    return (
      <Text color={numberColor} fontWeight="semibold" fontSize="sm">
        {String(value)}
      </Text>
    );
  }

  // String
  if (typeof value === 'string') {
    return (
      <Text color={stringColor} fontSize="sm" whiteSpace="pre-wrap">
        {value}
      </Text>
    );
  }

  // Object values
  if (typeof value === 'object') {
    // Check for WFValue structure
    if (isWFValue(value)) {
      return <WFValueRenderer value={value} placeholder={placeholder} />;
    }

    // Check for Variable wrapper pattern: { Type: "Variable", Variable: { Value: {...}, WFSerializationType: "..." } }
    const obj = value as Record<string, unknown>;
    if (obj.Type === 'Variable' && obj.Variable && typeof obj.Variable === 'object') {
      const innerVar = obj.Variable as Record<string, unknown>;
      if (isWFValue(innerVar)) {
        return <WFValueRenderer value={innerVar as WFValue} placeholder={placeholder} />;
      }
    }

    // Check for direct variable reference (no WFValue wrapper): { Type: "ExtensionInput", Aggrandizements?: [...] }
    if (obj.Type && typeof obj.Type === 'string' && isVariableReference(obj as WFValueContent)) {
      return <VariablePillFromContent content={obj as WFValueContent} />;
    }

    // Check for location object
    if (isLocationValue(value)) {
      return <LocationRenderer location={value as LocationValue} />;
    }

    // Array rendering
    if (Array.isArray(value)) {
      return <ArrayRenderer items={value} />;
    }

    // Fallback for generic objects
    return <FallbackObjectRenderer obj={value as Record<string, unknown>} />;
  }

  // Fallback for any other type
  return <Text fontSize="sm">{String(value)}</Text>;
}

function WFValueRenderer({ value, placeholder }: { value: WFValue; placeholder?: string }) {
  const content = value.Value;

  if (!content) {
    return <ValueRenderer value={null} placeholder={placeholder} />;
  }

  // Variable reference
  if (isVariableReference(content)) {
    return <VariablePillFromContent content={content} />;
  }

  // Inline text with attachments
  if (hasInlineAttachments(content) && content.string && content.attachmentsByRange) {
    return <InlineTextRenderer text={content.string} attachments={content.attachmentsByRange} />;
  }

  // Dictionary items
  if (isDictionaryValue(content) && content.WFDictionaryFieldValueItems) {
    return <DictionaryTable items={content.WFDictionaryFieldValueItems} />;
  }

  // Simple string value
  if (content.string) {
    return <ValueRenderer value={content.string} />;
  }

  // Fallback for other content types
  return <FallbackObjectRenderer obj={content as Record<string, unknown>} />;
}

function InlineTextRenderer({
  text,
  attachments,
}: {
  text: string;
  attachments: Record<string, AttachmentValue>;
}) {
  const parts = parseInlineAttachments(text, attachments);

  return (
    <HStack spacing={1} flexWrap="wrap" alignItems="center">
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return (
            <Text key={index} as="span" fontSize="sm">
              {part.content}
            </Text>
          );
        }

        const { attachment } = part;
        return (
          <VariablePill
            key={index}
            name={
              attachment.OutputName ||
              attachment.VariableName ||
              attachment.Variable ||
              attachment.PropertyName ||
              'Variable'
            }
            type={attachment.Type}
            uuid={attachment.OutputUUID}
            aggrandizements={attachment.Aggrandizements}
          />
        );
      })}
    </HStack>
  );
}

function ArrayRenderer({ items }: { items: unknown[] }) {
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  if (items.length === 0) {
    return (
      <Text fontSize="sm" color="gray.500" fontStyle="italic">
        Empty list
      </Text>
    );
  }

  // If all items are primitives, render as a simple list
  if (items.every(isPrimitive)) {
    return (
      <VStack align="stretch" spacing={1}>
        {items.map((item, index) => (
          <HStack key={index} spacing={2}>
            <Text fontSize="xs" color="gray.500" minW="20px">
              {index + 1}.
            </Text>
            <ValueRenderer value={item} />
          </HStack>
        ))}
      </VStack>
    );
  }

  // For complex items, render each with ValueRenderer
  return (
    <VStack align="stretch" spacing={2}>
      {items.map((item, index) => (
        <Box key={index} pl={3} borderLeft="2px solid" borderColor={borderColor}>
          <ValueRenderer value={item} />
        </Box>
      ))}
    </VStack>
  );
}

function FallbackObjectRenderer({ obj }: { obj: Record<string, unknown> }) {
  const entries = Object.entries(obj).filter(([key]) => !key.startsWith('WFSerializationType'));
  const labelColor = useColorModeValue('gray.600', 'gray.400');
  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  if (entries.length === 0) {
    return (
      <Text fontSize="sm" color="gray.500" fontStyle="italic">
        Empty
      </Text>
    );
  }

  // Simple objects: render as key-value pairs
  const simpleEntries = entries.filter(([_, v]) => isPrimitive(v));
  const complexEntries = entries.filter(([_, v]) => !isPrimitive(v));

  if (complexEntries.length === 0 && simpleEntries.length <= 5) {
    return (
      <VStack align="stretch" spacing={1}>
        {simpleEntries.map(([key, val]) => (
          <HStack key={key} spacing={2}>
            <Text fontSize="xs" color={labelColor} minW="80px">
              {formatKey(key)}:
            </Text>
            <ValueRenderer value={val} />
          </HStack>
        ))}
      </VStack>
    );
  }

  // Complex objects: render as collapsible JSON
  return (
    <Box
      bg={bgColor}
      p={2}
      borderRadius="md"
      maxH="200px"
      overflowY="auto"
      border="1px solid"
      borderColor={borderColor}
    >
      <Code fontSize="xs" whiteSpace="pre-wrap" bg="transparent" display="block">
        {JSON.stringify(obj, bigIntReplacer, 2)}
      </Code>
    </Box>
  );
}

/**
 * Format a parameter key for display
 */
function formatKey(key: string): string {
  // Remove WF prefix
  let formatted = key.replace(/^WF/, '');

  // Split camelCase
  formatted = formatted.replace(/([A-Z])/g, ' $1').trim();

  return formatted;
}

/**
 * JSON replacer for BigInt values
 */
function bigIntReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? Number(value) : value;
}

/**
 * Location value structure from Shortcuts
 */
interface LocationValue {
  placemark?: {
    Name?: string;
    City?: string;
    State?: string;
    Country?: string;
    Street?: string;
    SubThoroughfare?: string;
    SubLocality?: string;
  };
  region?: {
    center?: {
      longitude?: number;
      latitude?: number;
    };
    radius?: number;
  };
  identifier?: string;
}

/**
 * Check if a value is a location object
 */
function isLocationValue(value: unknown): value is LocationValue {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  // Location objects typically have region.center with lat/lng, or placemark, or identifier with coords
  return (
    (obj.region !== undefined && typeof obj.region === 'object') ||
    (obj.placemark !== undefined && typeof obj.placemark === 'object') ||
    (typeof obj.identifier === 'string' && obj.identifier.includes(','))
  );
}

/**
 * Format coordinates for display
 */
function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`;
}

/**
 * Render location values nicely
 */
function LocationRenderer({ location }: { location: LocationValue }) {
  const labelColor = useColorModeValue('gray.600', 'gray.400');
  const coordColor = useColorModeValue('blue.600', 'blue.300');

  // Extract location info
  const placemark = location.placemark;
  const region = location.region;
  const center = region?.center;

  // Build address string from placemark
  const addressParts: string[] = [];
  if (placemark) {
    if (placemark.Name) addressParts.push(placemark.Name);
    if (placemark.Street) {
      const street = placemark.SubThoroughfare
        ? `${placemark.SubThoroughfare} ${placemark.Street}`
        : placemark.Street;
      if (!addressParts.includes(street)) addressParts.push(street);
    }
    const subLocality = placemark.SubLocality;
    if (subLocality && !addressParts.some((p) => p.includes(subLocality))) {
      addressParts.push(subLocality);
    }
    if (placemark.City) addressParts.push(placemark.City);
    if (placemark.State) addressParts.push(placemark.State);
    if (placemark.Country) addressParts.push(placemark.Country);
  }

  // Get coordinates
  let coords: string | null = null;
  if (center?.latitude !== undefined && center?.longitude !== undefined) {
    coords = formatCoordinates(center.latitude, center.longitude);
  } else if (location.identifier?.includes(',')) {
    // Parse from identifier like "<+40.38,-105.51>@..."
    const match = location.identifier.match(/<([+-]?\d+\.?\d*),\s*([+-]?\d+\.?\d*)>/);
    if (match) {
      coords = formatCoordinates(Number.parseFloat(match[1]), Number.parseFloat(match[2]));
    }
  }

  const addressStr = addressParts.length > 0 ? addressParts.slice(0, 3).join(', ') : null;

  return (
    <HStack spacing={2} alignItems="flex-start">
      <Icon as={FiMapPin} color="red.500" boxSize={4} mt={0.5} />
      <VStack align="start" spacing={0}>
        {addressStr && (
          <Text fontSize="sm" fontWeight="medium">
            {addressStr}
          </Text>
        )}
        {coords && (
          <Text fontSize="xs" color={addressStr ? labelColor : coordColor}>
            {coords}
          </Text>
        )}
        {!addressStr && !coords && (
          <Text fontSize="sm" color={labelColor} fontStyle="italic">
            Custom Location
          </Text>
        )}
      </VStack>
    </HStack>
  );
}
