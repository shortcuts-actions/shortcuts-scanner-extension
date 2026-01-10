import { ChevronDownIcon, ChevronUpIcon, InfoIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  ButtonGroup,
  Collapse,
  HStack,
  Text,
  useColorModeValue,
  useDisclosure,
  VStack,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { convertToJSON, convertToXML, sanitizeFilename } from '../../../utils/converter';
import type { ShortcutData, ShortcutMetadata } from '../../../utils/types';
import CodeViewer from './CodeViewer';
import LearnMoreSection from './LearnMoreSection';
import ParsedDataView from './ParsedDataView';

interface RawDataSectionProps {
  data: any;
  shortcutData: ShortcutData;
  metadata: ShortcutMetadata;
}

type DataFormat = 'data' | 'xml' | 'json';

export default function RawDataSection({ data, shortcutData, metadata }: RawDataSectionProps) {
  const [format, setFormat] = useState<DataFormat>(() => {
    const stored = localStorage.getItem('inspector-data-format');
    return stored === 'data' || stored === 'xml' || stored === 'json' ? stored : 'data';
  });
  const { isOpen: isLearnMoreOpen, onToggle: toggleLearnMore } = useDisclosure();

  const hintBg = useColorModeValue('green.50', 'green.900');
  const hintTextColor = useColorModeValue('green.700', 'green.200');
  const headingColor = useColorModeValue('gray.700', 'gray.200');

  useEffect(() => {
    localStorage.setItem('inspector-data-format', format);
  }, [format]);

  const getHintText = () => {
    if (format === 'data') {
      return 'Parsed action data showing each step with its parameters. Useful for understanding the shortcut structure.';
    }
    return "Raw workflow definition - the step-by-step instructions that make the shortcut work. XML is Apple's native format; JSON is easier to read.";
  };

  return (
    <VStack spacing={3} align="stretch" p={4}>
      <HStack justify="space-between" align="center">
        <Text fontSize="md" fontWeight="semibold" color={headingColor}>
          Raw Shortcut Data
        </Text>

        <ButtonGroup size="sm" isAttached variant="outline">
          <Button
            variant={format === 'data' ? 'solid' : 'outline'}
            colorScheme={format === 'data' ? 'brand' : 'gray'}
            onClick={() => setFormat('data')}
          >
            Data
          </Button>
          <Button
            variant={format === 'xml' ? 'solid' : 'outline'}
            colorScheme={format === 'xml' ? 'brand' : 'gray'}
            onClick={() => setFormat('xml')}
          >
            XML
          </Button>
          <Button
            variant={format === 'json' ? 'solid' : 'outline'}
            colorScheme={format === 'json' ? 'brand' : 'gray'}
            onClick={() => setFormat('json')}
          >
            JSON
          </Button>
        </ButtonGroup>
      </HStack>

      <Box bg={hintBg} p={3} borderRadius="md" borderLeftWidth="3px" borderLeftColor="green.400">
        <HStack spacing={2} align="flex-start">
          <InfoIcon color={hintTextColor} mt={0.5} boxSize={4} />
          <Text fontSize="sm" color={hintTextColor}>
            {getHintText()}
          </Text>
        </HStack>
      </Box>

      {format !== 'data' && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLearnMore}
            rightIcon={isLearnMoreOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
            alignSelf="flex-start"
            fontWeight="normal"
          >
            {isLearnMoreOpen ? 'Hide details' : 'Learn more about these formats'}
          </Button>

          <Collapse in={isLearnMoreOpen} animateOpacity>
            <LearnMoreSection />
          </Collapse>
        </>
      )}

      {format === 'data' ? (
        <ParsedDataView data={shortcutData} />
      ) : (
        <CodeViewer
          content={format === 'xml' ? convertToXML(data) : convertToJSON(data)}
          searchPlaceholder={`Search in ${format.toUpperCase()}...`}
          downloadFilename={`${sanitizeFilename(metadata.name)}.${format}`}
          downloadMimeType={format === 'xml' ? 'application/xml' : 'application/json'}
          downloadLabel={`Download ${format.toUpperCase()}`}
        />
      )}
    </VStack>
  );
}
