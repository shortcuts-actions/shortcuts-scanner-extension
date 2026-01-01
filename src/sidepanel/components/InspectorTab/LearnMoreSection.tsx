import { ExternalLinkIcon } from '@chakra-ui/icons';
import {
  Box,
  Heading,
  Link,
  List,
  ListItem,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react';

export default function LearnMoreSection() {
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const headingColor = useColorModeValue('gray.700', 'gray.300');
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const linkColor = useColorModeValue('blue.600', 'blue.300');

  return (
    <Box bg={bgColor} p={4} borderRadius="md" borderWidth="1px" borderColor={borderColor}>
      <VStack spacing={4} align="stretch">
        <Box>
          <Heading size="sm" color={headingColor} mb={2}>
            What is this data?
          </Heading>
          <Text fontSize="sm" color={textColor}>
            Apple Shortcuts are stored as "property list" (plist) files. This is Apple's standard
            format for storing structured data. The shortcut contains all the actions, their
            settings, and how they connect together.
          </Text>
        </Box>

        <Box>
          <Heading size="sm" color={headingColor} mb={2}>
            XML vs JSON
          </Heading>
          <List spacing={2} fontSize="sm" color={textColor}>
            <ListItem>
              <Text as="span" fontWeight="semibold">
                XML (Extensible Markup Language):
              </Text>{' '}
              Apple's native format. Uses tags like {'<dict>'} and {'<array>'}. This is exactly how
              the shortcut is stored on your device.
            </ListItem>
            <ListItem>
              <Text as="span" fontWeight="semibold">
                JSON (JavaScript Object Notation):
              </Text>{' '}
              A developer-friendly format that's easier to read. Same data, just displayed
              differently.
            </ListItem>
          </List>
        </Box>

        <Box>
          <Heading size="sm" color={headingColor} mb={2}>
            Apple Documentation
          </Heading>
          <VStack spacing={1} align="stretch">
            <Link
              href="https://developer.apple.com/library/archive/documentation/General/Reference/InfoPlistKeyReference/Articles/AboutInformationPropertyListFiles.html"
              isExternal
              fontSize="sm"
              color={linkColor}
            >
              About Property List Files <ExternalLinkIcon mx="2px" />
            </Link>
            <Link
              href="https://developer.apple.com/documentation/appintents"
              isExternal
              fontSize="sm"
              color={linkColor}
            >
              Shortcuts Developer Documentation <ExternalLinkIcon mx="2px" />
            </Link>
            <Link
              href="https://support.apple.com/guide/shortcuts/intro-to-shortcuts-apdf22b0444c/ios"
              isExternal
              fontSize="sm"
              color={linkColor}
            >
              Shortcuts User Guide <ExternalLinkIcon mx="2px" />
            </Link>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
}
