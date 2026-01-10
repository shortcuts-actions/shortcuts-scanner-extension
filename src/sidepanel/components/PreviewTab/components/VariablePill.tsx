import { Badge, HStack, Icon, Text, Tooltip, useColorModeValue } from '@chakra-ui/react';
import {
  FiCalendar,
  FiClipboard,
  FiGlobe,
  FiHash,
  FiLayers,
  FiMessageSquare,
  FiZap,
} from 'react-icons/fi';
import { useOptionalPreviewContext } from '../context/PreviewContext';
import type { Aggrandizement } from '../types';
import { getVariableColorScheme } from '../utils/colorUtils';
import { getAggrandizementSuffix, getVariableDisplayName } from '../utils/valueParser';

interface VariablePillProps {
  name?: string;
  type?: string;
  uuid?: string;
  aggrandizements?: Aggrandizement[];
}

const TYPE_ICONS: Record<string, typeof FiHash> = {
  Variable: FiHash,
  ActionOutput: FiZap,
  CurrentDate: FiCalendar,
  Clipboard: FiClipboard,
  Ask: FiMessageSquare,
  ShortcutInput: FiLayers,
  ExtensionInput: FiLayers,
  DeviceDetails: FiGlobe,
};

export function VariablePill({
  name,
  type = 'Variable',
  uuid,
  aggrandizements,
}: VariablePillProps) {
  const context = useOptionalPreviewContext();
  const colorScheme = getVariableColorScheme(type);

  const pillBg = useColorModeValue(`${colorScheme}.100`, `${colorScheme}.800`);
  const pillColor = useColorModeValue(`${colorScheme}.700`, `${colorScheme}.200`);
  const hoverBg = useColorModeValue(`${colorScheme}.200`, `${colorScheme}.700`);

  const isClickable = uuid && context?.getActionByUUID(uuid);
  const IconComponent = TYPE_ICONS[type || 'Variable'] || FiHash;

  // Build display text
  let displayText = name || 'Variable';
  const suffix = getAggrandizementSuffix(aggrandizements);
  if (suffix) {
    displayText += suffix;
  }

  const handleClick = () => {
    if (uuid && context) {
      context.scrollToAction(uuid);
    }
  };

  const pillContent = (
    <Badge
      px={2}
      py={0.5}
      borderRadius="full"
      bg={pillBg}
      color={pillColor}
      cursor={isClickable ? 'pointer' : 'default'}
      _hover={isClickable ? { bg: hoverBg } : undefined}
      onClick={isClickable ? handleClick : undefined}
      transition="background 0.2s"
      display="inline-flex"
      alignItems="center"
    >
      <HStack spacing={1}>
        <Icon as={IconComponent} boxSize={3} />
        <Text fontSize="xs" fontWeight="medium">
          {displayText}
        </Text>
      </HStack>
    </Badge>
  );

  if (isClickable) {
    return (
      <Tooltip label="Click to jump to source action" fontSize="xs" hasArrow>
        {pillContent}
      </Tooltip>
    );
  }

  return pillContent;
}

/**
 * Create a VariablePill from WFValueContent data
 */
export function VariablePillFromContent({
  content,
}: {
  content: {
    Type?: string;
    VariableName?: string;
    OutputName?: string;
    PropertyName?: string;
    OutputUUID?: string;
    Aggrandizements?: Aggrandizement[];
  };
}) {
  const displayName = getVariableDisplayName(content);

  return (
    <VariablePill
      name={displayName}
      type={content.Type}
      uuid={content.OutputUUID}
      aggrandizements={content.Aggrandizements}
    />
  );
}
