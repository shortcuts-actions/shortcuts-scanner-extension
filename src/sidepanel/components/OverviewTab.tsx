import { CopyIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  Card,
  CardBody,
  Divider,
  Grid,
  GridItem,
  HStack,
  Image,
  Text,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { copyToClipboard } from '../../utils/converter';
import { getActionCount, getClientVersion } from '../../utils/parser';
import type { ParsedShortcut } from '../../utils/types';

interface OverviewTabProps {
  shortcut: ParsedShortcut;
  shortcutUrl: string;
}

interface InfoRowProps {
  label: string;
  value: string | number | undefined;
}

function InfoRow({ label, value }: InfoRowProps) {
  const labelColor = useColorModeValue('gray.600', 'gray.400');
  const valueColor = useColorModeValue('gray.800', 'gray.200');

  return (
    <Grid templateColumns="140px 1fr" gap={3} py={2}>
      <GridItem>
        <Text fontSize="sm" fontWeight="semibold" color={labelColor}>
          {label}
        </Text>
      </GridItem>
      <GridItem>
        <Text fontSize="sm" color={valueColor} wordBreak="break-word">
          {value || 'N/A'}
        </Text>
      </GridItem>
    </Grid>
  );
}

// Helper function to convert RGBA-8 to hex color
function rgba8ToHex(rgba8: number | bigint): string {
  // Convert BigInt to Number if necessary (defensive check)
  const value = typeof rgba8 === 'bigint' ? Number(rgba8) : rgba8;

  // RGBA-8 format: 0xRRGGBBAA
  const r = (value >>> 24) & 0xff;
  const g = (value >>> 16) & 0xff;
  const b = (value >>> 8) & 0xff;
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Helper function to format record type by adding spaces between capital letters
function formatRecordType(recordType: string | undefined): string | undefined {
  if (!recordType) return recordType;
  // Add space before each capital letter except the first one
  return recordType.replace(/([A-Z])/g, (match, _, offset) => {
    return offset === 0 ? match : ` ${match}`;
  });
}

export default function OverviewTab({ shortcut, shortcutUrl }: OverviewTabProps) {
  const { metadata, data } = shortcut;
  const actionCount = getActionCount(data);
  const clientVersion = getClientVersion(data);
  const toast = useToast();
  const labelColor = useColorModeValue('gray.600', 'gray.400');
  const valueColor = useColorModeValue('gray.800', 'gray.200');
  const subtleTextColor = useColorModeValue('gray.500', 'gray.400');
  const iconBg = useColorModeValue('gray.100', 'gray.700');
  const borderColor = useColorModeValue('gray.300', 'gray.600');
  const listTextColor = useColorModeValue('gray.700', 'gray.300');

  const handleCopyUrl = async () => {
    try {
      await copyToClipboard(shortcutUrl);
      toast({
        title: 'URL copied to clipboard',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const iconColor = data.WFWorkflowIcon?.WFWorkflowIconStartColor;
  const iconColorHex = iconColor ? rgba8ToHex(iconColor) : undefined;

  return (
    <VStack spacing={4} align="stretch">
      <Card>
        <CardBody>
          <Text fontSize="md" fontWeight="bold" mb={3}>
            General Information
          </Text>
          <Divider mb={3} />

          <VStack spacing={0} align="stretch" divider={<Divider />}>
            <InfoRow label="Name" value={metadata.name} />
            <InfoRow label="Action Count" value={actionCount} />
            <InfoRow label="Signed" value={metadata.isSigned ? 'Yes' : 'No'} />
            <InfoRow label="Client Version" value={clientVersion} />
            <InfoRow label="Record Name" value={data.recordName} />
            <InfoRow label="Record Type" value={formatRecordType(data.recordType)} />
            <InfoRow label="Deleted" value={data.deleted ? 'Yes' : 'No'} />
            <InfoRow
              label="Created"
              value={data.created ? new Date(data.created.timestamp).toLocaleString() : 'N/A'}
            />
            <InfoRow
              label="Last Modified"
              value={data.modified ? new Date(data.modified.timestamp).toLocaleString() : 'N/A'}
            />

            {/* URL Row with copy button */}
            <Grid templateColumns="140px 1fr" gap={3} py={2}>
              <GridItem>
                <Text fontSize="sm" fontWeight="semibold" color={labelColor}>
                  URL
                </Text>
              </GridItem>
              <GridItem>
                <HStack spacing={2}>
                  <Text fontSize="sm" color={valueColor} wordBreak="break-all" flex="1">
                    {shortcutUrl}
                  </Text>
                  <Button size="xs" leftIcon={<CopyIcon />} onClick={handleCopyUrl}>
                    Copy
                  </Button>
                </HStack>
              </GridItem>
            </Grid>
          </VStack>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Text fontSize="md" fontWeight="bold" mb={3}>
            Technical Details
          </Text>
          <Divider mb={3} />

          <VStack spacing={0} align="stretch" divider={<Divider />}>
            <InfoRow label="Minimum Version" value={data.WFWorkflowMinimumClientVersion} />
            <InfoRow label="Minimum Release" value={data.WFWorkflowMinimumClientRelease} />

            {/* Icon with visual preview */}
            {metadata.icon?.downloadURL && (
              <Grid templateColumns="140px 1fr" gap={3} py={2}>
                <GridItem>
                  <Text fontSize="sm" fontWeight="semibold" color={labelColor}>
                    Icon
                  </Text>
                </GridItem>
                <GridItem>
                  <HStack spacing={3}>
                    <Image
                      src={metadata.icon.downloadURL}
                      alt="Shortcut icon"
                      boxSize="40px"
                      borderRadius="md"
                      bg={iconBg}
                    />
                    <Text fontSize="sm" color={subtleTextColor}>
                      Glyph #{data.WFWorkflowIcon?.WFWorkflowIconGlyphNumber || 'N/A'}
                    </Text>
                  </HStack>
                </GridItem>
              </Grid>
            )}

            {/* Icon Color with visual preview */}
            {iconColorHex && (
              <Grid templateColumns="140px 1fr" gap={3} py={2}>
                <GridItem>
                  <Text fontSize="sm" fontWeight="semibold" color={labelColor}>
                    Icon Color
                  </Text>
                </GridItem>
                <GridItem>
                  <HStack spacing={3}>
                    <Box
                      w="40px"
                      h="40px"
                      bg={iconColorHex}
                      borderRadius="md"
                      border="1px solid"
                      borderColor={borderColor}
                    />
                    <VStack align="start" spacing={0}>
                      <Text fontSize="sm" color={valueColor} fontFamily="monospace">
                        {iconColorHex}
                      </Text>
                      <Text fontSize="xs" color={subtleTextColor}>
                        RGBA: {iconColor}
                      </Text>
                    </VStack>
                  </HStack>
                </GridItem>
              </Grid>
            )}
          </VStack>
        </CardBody>
      </Card>

      {data.WFWorkflowTypes && data.WFWorkflowTypes.length > 0 && (
        <Card>
          <CardBody>
            <Text fontSize="md" fontWeight="bold" mb={3}>
              Workflow Types
            </Text>
            <Divider mb={3} />

            <VStack spacing={2} align="stretch">
              {data.WFWorkflowTypes.map((type) => (
                <HStack key={type} spacing={2}>
                  <Box w={2} h={2} borderRadius="full" bg="brand.500" flexShrink={0} />
                  <Text fontSize="sm" color={listTextColor}>
                    {type}
                  </Text>
                </HStack>
              ))}
            </VStack>
          </CardBody>
        </Card>
      )}

      {data.WFWorkflowInputContentItemClasses &&
        data.WFWorkflowInputContentItemClasses.length > 0 && (
          <Card>
            <CardBody>
              <Text fontSize="md" fontWeight="bold" mb={3}>
                Input Content Types
              </Text>
              <Divider mb={3} />

              <VStack spacing={2} align="stretch">
                {data.WFWorkflowInputContentItemClasses.map((type) => (
                  <HStack key={type} spacing={2}>
                    <Box w={2} h={2} borderRadius="full" bg="green.500" flexShrink={0} />
                    <Text fontSize="sm" color={listTextColor}>
                      {type}
                    </Text>
                  </HStack>
                ))}
              </VStack>
            </CardBody>
          </Card>
        )}
    </VStack>
  );
}
