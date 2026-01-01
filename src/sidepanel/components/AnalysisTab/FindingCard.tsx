// Card component for displaying individual findings

import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import {
  Badge,
  Box,
  Button,
  Collapse,
  HStack,
  Text,
  useColorModeValue,
  useDisclosure,
  VStack,
} from '@chakra-ui/react';
import { type AnalysisFinding, getSeverityColorScheme } from '../../../utils/analysis-types';

interface FindingCardProps {
  finding: AnalysisFinding;
}

export default function FindingCard({ finding }: FindingCardProps) {
  const { isOpen, onToggle } = useDisclosure();

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const labelColor = useColorModeValue('gray.500', 'gray.500');
  const detailBg = useColorModeValue('gray.50', 'gray.900');

  const severityColor = getSeverityColorScheme(finding.severity);

  return (
    <Box
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="md"
      bg={cardBg}
      overflow="hidden"
      mb={2}
    >
      {/* Header - always visible */}
      <Box p={3}>
        <HStack justify="space-between" align="start">
          <VStack align="start" spacing={1} flex="1">
            <HStack spacing={2}>
              <Badge colorScheme={severityColor} fontSize="xs">
                {finding.severity.toUpperCase()}
              </Badge>
              <Badge variant="outline" fontSize="xs">
                {finding.category.replace('_', ' ')}
              </Badge>
            </HStack>
            <Text fontSize="sm" fontWeight="medium">
              {finding.title}
            </Text>
          </VStack>
          <Button
            size="xs"
            variant="ghost"
            onClick={onToggle}
            rightIcon={isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
          >
            {isOpen ? 'Less' : 'More'}
          </Button>
        </HStack>

        <Text fontSize="xs" color={labelColor} mt={2}>
          {finding.userExplanation}
        </Text>
      </Box>

      {/* Expandable details */}
      <Collapse in={isOpen}>
        <Box p={3} bg={detailBg} borderTopWidth="1px" borderColor={borderColor}>
          <VStack align="stretch" spacing={3}>
            {finding.description && (
              <Box>
                <Text fontSize="xs" fontWeight="semibold" color={labelColor} mb={1}>
                  Technical Details
                </Text>
                <Text fontSize="xs">{finding.description}</Text>
              </Box>
            )}

            {finding.evidence && (
              <Box>
                <Text fontSize="xs" fontWeight="semibold" color={labelColor} mb={1}>
                  Evidence
                </Text>
                <Text fontSize="xs" fontFamily="mono">
                  {finding.evidence}
                </Text>
              </Box>
            )}

            {finding.potentialImpact && (
              <Box>
                <Text fontSize="xs" fontWeight="semibold" color={labelColor} mb={1}>
                  Potential Impact
                </Text>
                <Text fontSize="xs">{finding.potentialImpact}</Text>
              </Box>
            )}

            {finding.mitigation && (
              <Box>
                <Text fontSize="xs" fontWeight="semibold" color={labelColor} mb={1}>
                  Mitigation
                </Text>
                <Text fontSize="xs">{finding.mitigation}</Text>
              </Box>
            )}

            {finding.affectedActions.length > 0 && (
              <Box>
                <Text fontSize="xs" fontWeight="semibold" color={labelColor} mb={1}>
                  Affected Actions
                </Text>
                <HStack spacing={1} flexWrap="wrap">
                  {finding.affectedActions.map((actionIndex) => (
                    <Badge key={actionIndex} size="sm" variant="subtle">
                      #{actionIndex}
                    </Badge>
                  ))}
                </HStack>
              </Box>
            )}
          </VStack>
        </Box>
      </Collapse>
    </Box>
  );
}
