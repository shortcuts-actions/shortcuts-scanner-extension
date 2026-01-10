import { Box, useColorModeValue } from '@chakra-ui/react';
import { type ReactNode, useEffect, useRef } from 'react';
import { useOptionalPreviewContext } from '../context/PreviewContext';
import type { ActionColor } from '../types';
import { getActionColorScheme } from '../utils/colorUtils';
import { ActionHeader } from './ActionHeader';

interface ActionCardProps {
  title: string;
  icon?: string;
  color?: ActionColor;
  uuid?: string;
  index: number;
  isNested?: boolean;
  headerContent?: ReactNode;
  children?: ReactNode;
}

export function ActionCard({
  title,
  icon,
  color,
  uuid,
  index,
  isNested = false,
  headerContent,
  children,
}: ActionCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const context = useOptionalPreviewContext();
  const colorScheme = getActionColorScheme(color);

  // Use darker shades for gray to contrast with the gray background
  const isGray = colorScheme === 'gray';
  const bg = useColorModeValue(
    isGray ? 'gray.100' : `${colorScheme}.50`,
    isGray ? 'gray.700' : `${colorScheme}.900`,
  );
  const borderColor = useColorModeValue(
    isGray ? 'gray.300' : `${colorScheme}.200`,
    isGray ? 'gray.600' : `${colorScheme}.700`,
  );

  // Register this action for UUID linking
  useEffect(() => {
    if (uuid && context) {
      context.registerAction(uuid, cardRef, index);
    }
  }, [uuid, context, index]);

  return (
    <Box
      ref={cardRef}
      bg={bg}
      borderRadius="3xl"
      borderWidth="1px"
      borderColor={borderColor}
      p={3}
      shadow="sm"
      transition="box-shadow 0.3s ease-in-out"
      ml={isNested ? 4 : 0}
      pr={4}
      mb={4}
    >
      <ActionHeader title={title} icon={icon} color={color}>
        {headerContent}
      </ActionHeader>

      {children && (
        <Box mt={3} pl={9}>
          {children}
        </Box>
      )}
    </Box>
  );
}
