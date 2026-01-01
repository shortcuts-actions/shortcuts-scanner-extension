import { CopyIcon, DownloadIcon, SearchIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  ButtonGroup,
  Code,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  Text,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { useState } from 'react';
import { copyToClipboard, downloadFile } from '../../../utils/converter';

interface CodeViewerProps {
  content: string;
  searchPlaceholder: string;
  downloadFilename: string;
  downloadMimeType: string;
  downloadLabel: string;
}

export default function CodeViewer({
  content,
  searchPlaceholder,
  downloadFilename,
  downloadMimeType,
  downloadLabel,
}: CodeViewerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const toast = useToast();

  const toolbarBg = useColorModeValue('white', 'gray.800');
  const toolbarBorder = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.600', 'gray.400');

  const handleCopy = async () => {
    try {
      await copyToClipboard(content);
      toast({
        title: 'Copied to clipboard',
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

  const handleDownload = () => {
    downloadFile(content, downloadFilename, downloadMimeType);
    toast({
      title: 'Downloaded',
      description: `Saved as ${downloadFilename}`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const getHighlightedContent = () => {
    if (!searchQuery) return content;
    const lines = content.split('\n');
    const query = searchQuery.toLowerCase();
    return lines
      .map((line) => (line.toLowerCase().includes(query) ? `>>> ${line}` : line))
      .join('\n');
  };

  const highlightedContent = getHighlightedContent();
  const matchCount = searchQuery
    ? highlightedContent.split('\n').filter((line) => line.startsWith('>>>')).length
    : 0;

  return (
    <VStack spacing={0} align="stretch">
      <Box bg={toolbarBg} p={3} borderWidth="1px" borderColor={toolbarBorder} borderTopRadius="md">
        <HStack spacing={3} mb={searchQuery ? 2 : 0}>
          <InputGroup flex="1" size="sm">
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </InputGroup>

          <ButtonGroup size="sm" isAttached variant="outline">
            <Button leftIcon={<CopyIcon />} onClick={handleCopy}>
              Copy
            </Button>
            <Button leftIcon={<DownloadIcon />} onClick={handleDownload} colorScheme="brand">
              {downloadLabel}
            </Button>
          </ButtonGroup>
        </HStack>

        {searchQuery && (
          <Text fontSize="xs" color={textColor}>
            {matchCount} {matchCount === 1 ? 'match' : 'matches'} found
          </Text>
        )}
      </Box>

      <Box
        bg="gray.900"
        color="gray.100"
        p={4}
        overflowX="auto"
        maxH="calc(100vh - 500px)"
        overflowY="auto"
        borderBottomRadius="md"
      >
        <Code
          bg="transparent"
          color="inherit"
          fontSize="xs"
          whiteSpace="pre"
          fontFamily="monospace"
          display="block"
        >
          {highlightedContent}
        </Code>
      </Box>
    </VStack>
  );
}
