import { InfoIcon } from '@chakra-ui/icons';
import { Box, HStack, Text, useColorModeValue, VStack } from '@chakra-ui/react';
import { convertToJSON } from '../../../utils/converter';
import CodeViewer from './CodeViewer';

interface APIResponseSectionProps {
  apiResponse: any;
}

export default function APIResponseSection({ apiResponse }: APIResponseSectionProps) {
  const hintBg = useColorModeValue('blue.50', 'blue.900');
  const hintTextColor = useColorModeValue('blue.700', 'blue.200');
  const headingColor = useColorModeValue('gray.700', 'gray.200');

  const content = convertToJSON(apiResponse);

  return (
    <VStack spacing={3} align="stretch" p={4}>
      <Text fontSize="md" fontWeight="semibold" color={headingColor}>
        API Response
      </Text>

      <Box bg={hintBg} p={3} borderRadius="md" borderLeftWidth="3px" borderLeftColor="blue.400">
        <HStack spacing={2} align="flex-start">
          <InfoIcon color={hintTextColor} mt={0.5} boxSize={4} />
          <Text fontSize="sm" color={hintTextColor}>
            This is the raw response from Apple's iCloud servers. It contains metadata about the
            shortcut such as its name, creation date, and download URL.
          </Text>
        </HStack>
      </Box>

      <CodeViewer
        content={content}
        searchPlaceholder="Search in API response..."
        downloadFilename="api-response.json"
        downloadMimeType="application/json"
        downloadLabel="Download"
      />
    </VStack>
  );
}
