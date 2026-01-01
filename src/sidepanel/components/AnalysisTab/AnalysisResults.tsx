// Display analysis results in collapsible sections

import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons';
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Badge,
  Box,
  Card,
  CardBody,
  HStack,
  Icon,
  List,
  ListIcon,
  ListItem,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react';
import {
  type AnalysisResult,
  getRiskColorScheme,
  getVerdictColorScheme,
  getVerdictLabel,
  isQuickScanResult,
  type QuickScanResult,
} from '../../../utils/analysis-types';
import FindingCard from './FindingCard';

interface AnalysisResultsProps {
  result: AnalysisResult | QuickScanResult;
}

export default function AnalysisResults({ result }: AnalysisResultsProps) {
  // All hooks at the top level
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const labelColor = useColorModeValue('gray.500', 'gray.500');
  const accordionBg = useColorModeValue('white', 'gray.800');
  const yellowBg = useColorModeValue('yellow.50', 'yellow.900');
  const yellowText = useColorModeValue('yellow.800', 'yellow.200');
  const redBg = useColorModeValue('red.50', 'red.900');

  const verdictColor = getVerdictColorScheme(
    isQuickScanResult(result) ? result.verdict : result.recommendation.verdict,
  );
  const riskColor = getRiskColorScheme(result.overallRisk);

  // Quick scan has a simpler display
  if (isQuickScanResult(result)) {
    return (
      <VStack spacing={4} align="stretch">
        {/* Risk Header */}
        <Card bg={cardBg}>
          <CardBody>
            <VStack spacing={3} align="stretch">
              <HStack justify="space-between">
                <Badge colorScheme={verdictColor} fontSize="md" px={3} py={1}>
                  {getVerdictLabel(result.verdict)}
                </Badge>
                <Badge colorScheme={riskColor} variant="outline">
                  {result.overallRisk.toUpperCase()} RISK
                </Badge>
              </HStack>

              <Text fontSize="sm">{result.oneLiner}</Text>

              {result.topConcerns.length > 0 && (
                <Box>
                  <Text fontSize="xs" fontWeight="semibold" color={labelColor} mb={1}>
                    Top Concerns
                  </Text>
                  <List spacing={1}>
                    {result.topConcerns.map((concern) => (
                      <ListItem key={concern} fontSize="xs">
                        <ListIcon as={WarningIcon} color="orange.500" />
                        {concern}
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {result.needsDeepAnalysis && (
                <Box p={2} bg={yellowBg} borderRadius="md">
                  <Text fontSize="xs" color={yellowText}>
                    <strong>Recommendation:</strong>{' '}
                    {result.reasonForDeepAnalysis ||
                      'A deeper analysis is recommended for this shortcut.'}
                  </Text>
                </Box>
              )}
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    );
  }

  // Full analysis result display
  const fullResult = result as AnalysisResult;

  return (
    <VStack spacing={4} align="stretch">
      {/* Risk Header */}
      <Card bg={cardBg}>
        <CardBody>
          <VStack spacing={3} align="stretch">
            <HStack justify="space-between">
              <Badge colorScheme={verdictColor} fontSize="md" px={3} py={1}>
                {getVerdictLabel(fullResult.recommendation.verdict)}
              </Badge>
              <VStack align="end" spacing={0}>
                <Badge colorScheme={riskColor} variant="outline">
                  {fullResult.overallRisk.toUpperCase()} RISK
                </Badge>
                <Text fontSize="xs" color={labelColor}>
                  {Math.round(fullResult.confidenceScore * 100)}% confidence
                </Text>
              </VStack>
            </HStack>

            <Text fontSize="sm">{fullResult.summary.oneLiner}</Text>
          </VStack>
        </CardBody>
      </Card>

      {/* Summary */}
      <Card bg={cardBg}>
        <CardBody>
          <Text fontSize="xs" fontWeight="semibold" color={labelColor} mb={2}>
            Summary
          </Text>
          <Text fontSize="sm" whiteSpace="pre-wrap">
            {fullResult.summary.forUser}
          </Text>
        </CardBody>
      </Card>

      {/* Recommendation - always visible */}
      <Card bg={cardBg}>
        <CardBody>
          <Text fontSize="xs" fontWeight="semibold" color={labelColor} mb={2}>
            Recommendation
          </Text>
          <HStack mb={2}>
            <Text fontSize="sm" fontWeight="medium">
              Should install:
            </Text>
            <Badge colorScheme={fullResult.recommendation.shouldInstall ? 'green' : 'red'}>
              {fullResult.recommendation.shouldInstall ? 'Yes' : 'No'}
            </Badge>
          </HStack>

          <Text fontSize="sm" mb={2}>
            {fullResult.recommendation.userGuidance}
          </Text>

          {fullResult.recommendation.conditions.length > 0 && (
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color={labelColor} mb={1}>
                Conditions for safe use:
              </Text>
              <List spacing={1}>
                {fullResult.recommendation.conditions.map((condition) => (
                  <ListItem key={condition} fontSize="xs">
                    • {condition}
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </CardBody>
      </Card>

      {/* Accordion sections */}
      <Accordion allowMultiple defaultIndex={[0]}>
        {/* Findings */}
        {fullResult.findings.length > 0 && (
          <AccordionItem border="none" mb={2}>
            <AccordionButton
              bg={accordionBg}
              borderRadius="md"
              borderWidth="1px"
              borderColor={borderColor}
            >
              <HStack flex="1" spacing={2}>
                <Text fontWeight="semibold" fontSize="sm">
                  Findings
                </Text>
                <Badge colorScheme="gray">{fullResult.findings.length}</Badge>
              </HStack>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel px={0} pt={2}>
              {fullResult.findings.map((finding) => (
                <FindingCard key={finding.id} finding={finding} />
              ))}
            </AccordionPanel>
          </AccordionItem>
        )}

        {/* Data Flows */}
        {fullResult.dataFlows.length > 0 && (
          <AccordionItem border="none" mb={2}>
            <AccordionButton
              bg={accordionBg}
              borderRadius="md"
              borderWidth="1px"
              borderColor={borderColor}
            >
              <HStack flex="1" spacing={2}>
                <Text fontWeight="semibold" fontSize="sm">
                  Data Flows
                </Text>
                <Badge colorScheme="gray">{fullResult.dataFlows.length}</Badge>
              </HStack>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel px={0} pt={2}>
              <VStack align="stretch" spacing={2}>
                {fullResult.dataFlows.map((flow) => (
                  <Box
                    key={`${flow.source}-${flow.sink}-${flow.dataType}`}
                    p={3}
                    bg={cardBg}
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor={borderColor}
                  >
                    <HStack justify="space-between" mb={1}>
                      <Text fontSize="xs" fontWeight="medium">
                        {flow.source} → {flow.sink}
                      </Text>
                      <Badge colorScheme={getRiskColorScheme(flow.risk)} size="sm">
                        {flow.risk}
                      </Badge>
                    </HStack>
                    <Text fontSize="xs" color={labelColor}>
                      Data type: {flow.dataType}
                    </Text>
                    <Text fontSize="xs" mt={1}>
                      {flow.explanation}
                    </Text>
                  </Box>
                ))}
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        )}

        {/* External Connections */}
        {fullResult.externalConnections.length > 0 && (
          <AccordionItem border="none" mb={2}>
            <AccordionButton
              bg={accordionBg}
              borderRadius="md"
              borderWidth="1px"
              borderColor={borderColor}
            >
              <HStack flex="1" spacing={2}>
                <Text fontWeight="semibold" fontSize="sm">
                  External Connections
                </Text>
                <Badge colorScheme="gray">{fullResult.externalConnections.length}</Badge>
              </HStack>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel px={0} pt={2}>
              <VStack align="stretch" spacing={2}>
                {fullResult.externalConnections.map((conn) => (
                  <Box
                    key={conn.url}
                    p={3}
                    bg={cardBg}
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor={borderColor}
                  >
                    <Text fontSize="xs" fontWeight="medium" wordBreak="break-all">
                      {conn.url}
                    </Text>
                    <HStack mt={1} spacing={2}>
                      <Badge
                        colorScheme={
                          conn.serviceReputation === 'trusted'
                            ? 'green'
                            : conn.serviceReputation === 'suspicious'
                              ? 'red'
                              : 'gray'
                        }
                        size="sm"
                      >
                        {conn.serviceReputation}
                      </Badge>
                      {conn.isKnownService && (
                        <Badge colorScheme="blue" size="sm">
                          Known service
                        </Badge>
                      )}
                    </HStack>
                    <Text fontSize="xs" color={labelColor} mt={1}>
                      Purpose: {conn.purpose}
                    </Text>
                    <Text fontSize="xs" color={labelColor}>
                      Data sent: {conn.dataSent}
                    </Text>
                  </Box>
                ))}
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        )}

        {/* Permissions */}
        {fullResult.permissions.length > 0 && (
          <AccordionItem border="none" mb={2}>
            <AccordionButton
              bg={accordionBg}
              borderRadius="md"
              borderWidth="1px"
              borderColor={borderColor}
            >
              <HStack flex="1" spacing={2}>
                <Text fontWeight="semibold" fontSize="sm">
                  Permissions
                </Text>
                <Badge colorScheme="gray">{fullResult.permissions.length}</Badge>
              </HStack>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel px={0} pt={2}>
              <VStack align="stretch" spacing={2}>
                {fullResult.permissions.map((perm) => (
                  <Box
                    key={perm.permission}
                    p={3}
                    bg={cardBg}
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor={borderColor}
                  >
                    <HStack justify="space-between">
                      <Text fontSize="xs" fontWeight="medium">
                        {perm.permission}
                      </Text>
                      <Icon
                        as={perm.necessary ? CheckCircleIcon : WarningIcon}
                        color={perm.necessary ? 'green.500' : 'orange.500'}
                        boxSize={3}
                      />
                    </HStack>
                    <Text fontSize="xs" color={labelColor} mt={1}>
                      Used for: {perm.usedFor}
                    </Text>
                    {!perm.necessary && (
                      <Text fontSize="xs" color="orange.500" mt={1}>
                        Risk: {perm.riskIfAbused}
                      </Text>
                    )}
                  </Box>
                ))}
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        )}

        {/* Red Flags */}
        {fullResult.redFlags.length > 0 && (
          <AccordionItem border="none" mb={2}>
            <AccordionButton
              bg={accordionBg}
              borderRadius="md"
              borderWidth="1px"
              borderColor={borderColor}
            >
              <HStack flex="1" spacing={2}>
                <Text fontWeight="semibold" fontSize="sm" color="red.500">
                  Red Flags
                </Text>
                <Badge colorScheme="red">{fullResult.redFlags.length}</Badge>
              </HStack>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel px={0} pt={2}>
              <VStack align="stretch" spacing={2}>
                {fullResult.redFlags.map((flag) => (
                  <Box
                    key={flag.flag}
                    p={3}
                    bg={redBg}
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor="red.200"
                  >
                    <HStack>
                      <WarningIcon color="red.500" />
                      <Text fontSize="xs" fontWeight="medium">
                        {flag.flag}
                      </Text>
                    </HStack>
                    <Text fontSize="xs" mt={1}>
                      {flag.explanation}
                    </Text>
                  </Box>
                ))}
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        )}

        {/* Positive Indicators */}
        {fullResult.positiveIndicators.length > 0 && (
          <AccordionItem border="none" mb={2}>
            <AccordionButton
              bg={accordionBg}
              borderRadius="md"
              borderWidth="1px"
              borderColor={borderColor}
            >
              <HStack flex="1" spacing={2}>
                <Text fontWeight="semibold" fontSize="sm" color="green.500">
                  Positive Indicators
                </Text>
                <Badge colorScheme="green">{fullResult.positiveIndicators.length}</Badge>
              </HStack>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel px={0} pt={2}>
              <List spacing={1}>
                {fullResult.positiveIndicators.map((indicator) => (
                  <ListItem key={indicator} fontSize="xs">
                    <ListIcon as={CheckCircleIcon} color="green.500" />
                    {indicator}
                  </ListItem>
                ))}
              </List>
            </AccordionPanel>
          </AccordionItem>
        )}
      </Accordion>
    </VStack>
  );
}
