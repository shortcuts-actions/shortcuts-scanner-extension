import { DownloadIcon } from '@chakra-ui/icons';
import {
  Badge,
  Box,
  Button,
  ButtonGroup,
  Flex,
  Heading,
  HStack,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { convertToJSON, convertToXML, downloadFile, sanitizeFilename } from '../../utils/converter';
import { getActionCount } from '../../utils/parser';
import type { iCloudAPIResponse, ParsedShortcut } from '../../utils/types';

interface ShortcutHeaderProps {
  shortcut: ParsedShortcut;
  binaryData: ArrayBuffer | null;
  apiResponse: iCloudAPIResponse | null;
}

export default function ShortcutHeader({ shortcut, binaryData, apiResponse }: ShortcutHeaderProps) {
  const { metadata, data, raw } = shortcut;
  const actionCount = getActionCount(data);
  const toast = useToast();
  const headerBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const iconBg = useColorModeValue('gray.100', 'gray.700');
  const textColor = useColorModeValue('gray.500', 'gray.400');

  const handleDownloadXML = () => {
    const xml = convertToXML(raw);
    const filename = `${sanitizeFilename(metadata.name)}.xml`;
    downloadFile(xml, filename, 'application/xml');
    toast({
      title: 'XML Downloaded',
      description: `Saved as ${filename}`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleDownloadJSON = () => {
    const json = convertToJSON(raw);
    const filename = `${sanitizeFilename(metadata.name)}.json`;
    downloadFile(json, filename, 'application/json');
    toast({
      title: 'JSON Downloaded',
      description: `Saved as ${filename}`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleDownloadSignedShortcut = async () => {
    const signedUrl = apiResponse?.fields?.signedShortcut?.value?.downloadURL;
    if (!signedUrl) {
      toast({
        title: 'Error',
        description: 'Signed shortcut not available',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const response = await fetch(signedUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const filename = `${metadata.name}.shortcut`;
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Signed Shortcut Downloaded',
        description: `Saved as ${filename}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch {
      toast({
        title: 'Download Failed',
        description: 'Failed to download signed shortcut',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDownloadUnsignedShortcut = () => {
    if (!binaryData) {
      toast({
        title: 'Error',
        description: 'Binary data not available',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const blob = new Blob([binaryData], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const filename = `${metadata.name}.shortcut`;
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Shortcut Downloaded',
      description: `Saved as ${filename}`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  return (
    <Box bg={headerBg} borderBottom="1px" borderColor={borderColor} p={6} shadow="sm">
      <Flex align="center" gap={4} mb={4}>
        {metadata.icon?.downloadURL && (
          <Box w="60px" h="60px" borderRadius="lg" overflow="hidden" flexShrink={0} bg={iconBg}>
            <img
              src={metadata.icon.downloadURL}
              alt={metadata.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </Box>
        )}

        <Box flex="1">
          <Flex align="center" justify="space-between" mb={2}>
            <Heading size="lg">{metadata.name}</Heading>
          </Flex>

          <HStack spacing={3}>
            <Badge colorScheme="blue" fontSize="sm">
              {actionCount} {actionCount === 1 ? 'action' : 'actions'}
            </Badge>

            {metadata.isSigned && (
              <Badge colorScheme="orange" fontSize="sm">
                Signed
              </Badge>
            )}

            {data.recordType === 'GalleryShortcut' && (
              <Badge colorScheme="purple" fontSize="sm">
                From Gallery
              </Badge>
            )}

            {data.WFWorkflowClientRelease && (
              <Text fontSize="sm" color={textColor}>
                {data.WFWorkflowClientRelease}
              </Text>
            )}
          </HStack>
        </Box>
      </Flex>

      <Flex justify="flex-end">
        <ButtonGroup size="sm" variant="outline">
          <Button
            leftIcon={<DownloadIcon />}
            onClick={handleDownloadSignedShortcut}
            isDisabled={!apiResponse?.fields?.signedShortcut?.value?.downloadURL}
          >
            .shortcut
          </Button>
          <Menu>
            <MenuButton as={Button} leftIcon={<DownloadIcon />}>
              Download options
            </MenuButton>
            <MenuList>
              <MenuItem onClick={handleDownloadUnsignedShortcut}>.shortcut (unsigned)</MenuItem>
              <MenuItem onClick={handleDownloadXML}>XML</MenuItem>
              <MenuItem onClick={handleDownloadJSON}>JSON</MenuItem>
            </MenuList>
          </Menu>
        </ButtonGroup>
      </Flex>
    </Box>
  );
}
