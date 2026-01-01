import { MoonIcon, QuestionIcon, RepeatIcon, SettingsIcon, SunIcon } from '@chakra-ui/icons';
import type { IconProps } from '@chakra-ui/react';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  ChakraProvider,
  Container,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  HStack,
  Icon,
  IconButton,
  Link,
  Spinner,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useColorMode,
  useColorModeValue,
  useDisclosure,
  VStack,
} from '@chakra-ui/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useShortcutStore } from '../stores/shortcutStore';
import { fetchShortcutFromiCloud } from '../utils/fetcher';
import { extractShortcutData, parsePlist } from '../utils/parser';
import type { ChromeMessage, ParsedShortcut } from '../utils/types';
import ActionsTab from './components/ActionsTab';
import AnalysisTab from './components/AnalysisTab';
import ApiKeySettings from './components/ApiKeySettings';
import InspectorTab from './components/InspectorTab';
import OverviewTab from './components/OverviewTab';
import ShortcutHeader from './components/ShortcutHeader';
import theme from './theme';

// Custom HeartIcon since @chakra-ui/icons doesn't include one
const HeartIcon = (props: IconProps) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path
      fill="currentColor"
      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
    />
  </Icon>
);

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

function SettingsDrawer({ isOpen, onClose }: SettingsDrawerProps) {
  return (
    <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="md">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>Settings</DrawerHeader>
        <DrawerBody p={0}>
          <ApiKeySettings />
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

interface SupportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface HelpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

function HelpDrawer({ isOpen, onClose }: HelpDrawerProps) {
  const textColor = useColorModeValue('gray.600', 'gray.300');
  const headingColor = useColorModeValue('gray.800', 'gray.100');
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const codeBg = useColorModeValue('gray.100', 'gray.900');
  const accentColor = useColorModeValue('blue.500', 'blue.300');

  return (
    <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="md">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>
          <HStack spacing={2}>
            <Icon viewBox="0 0 24 24" color={accentColor}>
              <path
                fill="currentColor"
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"
              />
            </Icon>
            <Text>Help & Tips</Text>
          </HStack>
        </DrawerHeader>
        <DrawerBody>
          <VStack spacing={6} align="stretch">
            {/* Signing Shortcuts Section */}
            <Box>
              <Text fontSize="md" fontWeight="bold" color={headingColor} mb={2}>
                Signing Shortcuts on macOS
              </Text>
              <Text fontSize="sm" color={textColor} mb={3}>
                Since iOS 15 and macOS 12, shortcuts must be signed before they can be imported. Use
                the macOS command-line tool to sign unsigned shortcuts:
              </Text>
              <Box bg={codeBg} p={3} borderRadius="md" fontFamily="mono" fontSize="xs">
                <Text mb={1} color={textColor}>
                  # Sign for anyone to import
                </Text>
                <Text fontWeight="medium">
                  shortcuts sign -m anyone -i "input.shortcut" -o "output.shortcut"
                </Text>
              </Box>
              <Text fontSize="xs" color={textColor} mt={2}>
                Available modes: <code>anyone</code> or <code>people-who-know-me</code>
              </Text>
            </Box>

            {/* Scanner Tab Tips */}
            <Box bg={cardBg} p={4} borderRadius="md">
              <Text fontSize="sm" fontWeight="semibold" color={headingColor} mb={2}>
                Scanner Tab
              </Text>
              <VStack align="start" spacing={2} fontSize="sm" color={textColor}>
                <Text>
                  • Uses AI to analyze shortcuts for security risks and privacy concerns
                </Text>
                <Text>
                  • <strong>Quick</strong>: Fast scan for obvious issues (~5 seconds)
                </Text>
                <Text>
                  • <strong>Standard</strong>: Balanced analysis with data flow tracking (~15
                  seconds)
                </Text>
                <Text>
                  • <strong>Deep</strong>: Comprehensive security audit (~30 seconds)
                </Text>
                <Text>• Requires an API key from OpenAI, Anthropic, or Google AI</Text>
                <Text>• API keys are encrypted with AES-256 and stored locally</Text>
              </VStack>
            </Box>

            {/* Inspector Tab Tips */}
            <Box bg={cardBg} p={4} borderRadius="md">
              <Text fontSize="sm" fontWeight="semibold" color={headingColor} mb={2}>
                Inspector Tab
              </Text>
              <VStack align="start" spacing={2} fontSize="sm" color={textColor}>
                <Text>• View the raw iCloud API response for technical debugging</Text>
                <Text>• Explore the parsed shortcut plist structure</Text>
                <Text>• See metadata like signing status, creation date, and file checksums</Text>
                <Text>• Useful for developers building shortcut tools</Text>
              </VStack>
            </Box>

            {/* Download Tips */}
            <Box bg={cardBg} p={4} borderRadius="md">
              <Text fontSize="sm" fontWeight="semibold" color={headingColor} mb={2}>
                Download Options
              </Text>
              <VStack align="start" spacing={2} fontSize="sm" color={textColor}>
                <Text>
                  • <strong>.shortcut</strong>: Signed version that can be imported directly
                </Text>
                <Text>
                  • <strong>.shortcut (unsigned)</strong>: Raw plist for editing or re-signing
                </Text>
                <Text>
                  • <strong>XML</strong>: Human-readable format for inspection
                </Text>
                <Text>
                  • <strong>JSON</strong>: For programmatic processing
                </Text>
              </VStack>
            </Box>

            {/* Quick Tips */}
            <Box>
              <Text fontSize="sm" fontWeight="semibold" color={headingColor} mb={2}>
                Quick Tips
              </Text>
              <VStack align="start" spacing={2} fontSize="sm" color={textColor}>
                <Text>• Navigate to any iCloud shortcut link to automatically load it</Text>
                <Text>• Click the refresh button to re-fetch the latest version</Text>
                <Text>• Results are cached for 2 minutes to speed up navigation</Text>
                <Text>• Use the Actions tab to see each step the shortcut performs</Text>
              </VStack>
            </Box>
          </VStack>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

function SupportDrawer({ isOpen, onClose }: SupportDrawerProps) {
  const textColor = useColorModeValue('gray.600', 'gray.300');
  const headingColor = useColorModeValue('gray.800', 'gray.100');
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const accentColor = useColorModeValue('pink.500', 'pink.300');
  const dividerBg = useColorModeValue('white', 'gray.800');

  return (
    <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="md">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>
          <HStack spacing={2}>
            <HeartIcon color={accentColor} />
            <Text>Support This Project</Text>
          </HStack>
        </DrawerHeader>
        <DrawerBody>
          <VStack spacing={6} align="stretch">
            <Box textAlign="center" py={4}>
              <Text fontSize="3xl" mb={2}>
                ❤️
              </Text>
              <Text fontSize="lg" fontWeight="bold" color={headingColor}>
                Thank You for Using Shortcuts Scanner!
              </Text>
            </Box>
            <Box>
              <Text fontSize="md" color={textColor} lineHeight="tall">
                This extension is <strong>100% free and open-source</strong>, built with love to
                help the Apple Shortcuts community stay safe. I created it because I believe
                everyone deserves to know what a shortcut does before they install it.
              </Text>
            </Box>
            <Box bg={cardBg} p={4} borderRadius="md">
              <Text fontSize="sm" fontWeight="semibold" color={headingColor} mb={2}>
                What You Get for Free:
              </Text>
              <VStack align="start" spacing={1} fontSize="sm" color={textColor}>
                <Text>• AI-powered security analysis (Quick, Standard, Deep)</Text>
                <Text>• Data flow tracking and privacy insights</Text>
                <Text>• Detection of suspicious patterns and red flags</Text>
                <Text>• Full shortcut inspection and export</Text>
                <Text>• AES-256 encrypted API key storage</Text>
              </VStack>
            </Box>
            <Box>
              <Text fontSize="md" color={textColor} lineHeight="tall">
                If this extension has helped you stay safe, please consider supporting its
                development. Your support helps me maintain this project, add new features, and keep
                it free for everyone.
              </Text>
            </Box>
            <Box bg={cardBg} p={4} borderRadius="md">
              <Text fontSize="sm" fontWeight="semibold" color={headingColor} mb={2}>
                Spread the Word
              </Text>
              <Text fontSize="sm" color={textColor}>
                Know someone who uses Apple Shortcuts? Share this extension with them! Every share
                helps more people stay safe from malicious shortcuts.
              </Text>
            </Box>
            <Link
              href="https://buymeacoffee.com/shortcutsdude"
              isExternal
              _hover={{ textDecoration: 'none' }}
            >
              <Button
                w="full"
                size="lg"
                colorScheme="yellow"
                leftIcon={<Text>☕</Text>}
                _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
                transition="all 0.2s"
              >
                Buy Me a Coffee
              </Button>
            </Link>
            <Box position="relative" py={2}>
              <Box borderBottomWidth="1px" />
              <Text
                position="absolute"
                top="50%"
                left="50%"
                transform="translate(-50%, -50%)"
                bg={dividerBg}
                px={3}
                fontSize="sm"
                color={textColor}
              >
                or
              </Text>
            </Box>
            <Box bg={cardBg} p={4} borderRadius="md">
              <Text fontSize="sm" fontWeight="semibold" color={headingColor} mb={2}>
                Get More Shortcut Power
              </Text>
              <Text fontSize="sm" color={textColor} mb={3}>
                Check out my iOS app for even more AI & Automation tools in your Shortcuts!
              </Text>
              <Link
                href="https://apps.apple.com/us/app/ai-automation-for-shortcuts/id6756338677?ref=extension"
                isExternal
              >
                <img
                  src="/images/Download_on_the_App_Store_Badge.webp"
                  alt="Download AI & Automation Actions for Shortcuts on the App Store"
                  width="140"
                />
              </Link>
            </Box>
            <Box textAlign="center" pt={2}>
              <Text fontSize="xs" color={textColor}>
                Made with ❤️ by{' '}
                <Link
                  href="https://www.shortcutactions.com?ref=extension"
                  isExternal
                  fontWeight="medium"
                >
                  Shortcut Actions
                </Link>
              </Text>
            </Box>
          </VStack>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

export function ColorModeToggle() {
  const { colorMode, toggleColorMode } = useColorMode();
  return (
    <IconButton
      aria-label="Toggle color mode"
      icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
      onClick={toggleColorMode}
      size="sm"
      variant="ghost"
    />
  );
}

export function SettingsButton({ onOpen }: { onOpen: () => void }) {
  return (
    <IconButton
      aria-label="Open settings"
      icon={<SettingsIcon />}
      onClick={onOpen}
      size="sm"
      variant="ghost"
    />
  );
}

export function SupportButton({ onOpen }: { onOpen: () => void }) {
  const hoverBg = useColorModeValue('pink.50', 'pink.900');
  return (
    <IconButton
      aria-label="Support this project"
      icon={<HeartIcon />}
      onClick={onOpen}
      size="sm"
      variant="ghost"
      color="pink.400"
      _hover={{ color: 'pink.500', bg: hoverBg }}
    />
  );
}

export function HelpButton({ onOpen }: { onOpen: () => void }) {
  return (
    <IconButton
      aria-label="Help & tips"
      icon={<QuestionIcon />}
      onClick={onOpen}
      size="sm"
      variant="ghost"
    />
  );
}

export function TopBar({
  onSettingsOpen,
  onSupportOpen,
  onHelpOpen,
  onRefresh,
}: {
  onSettingsOpen: () => void;
  onSupportOpen: () => void;
  onHelpOpen: () => void;
  onRefresh?: () => void;
}) {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.700', 'gray.100');

  return (
    <Box
      position="sticky"
      top={0}
      zIndex={10}
      bg={bgColor}
      borderBottom="1px"
      borderColor={borderColor}
      px={4}
      py={2}
    >
      <HStack justify="space-between" spacing={2}>
        <Text fontSize="md" fontWeight="semibold" color={textColor}>
          Shortcuts Scanner
        </Text>
        <HStack spacing={2}>
          {onRefresh && (
            <IconButton
              aria-label="Refresh"
              icon={<RepeatIcon />}
              onClick={onRefresh}
              size="sm"
              variant="ghost"
            />
          )}
          <HelpButton onOpen={onHelpOpen} />
          <SupportButton onOpen={onSupportOpen} />
          <ColorModeToggle />
          <SettingsButton onOpen={onSettingsOpen} />
        </HStack>
      </HStack>
    </Box>
  );
}

function App() {
  const [shortcutUrl, setShortcutUrl] = useState<string | null>(null);
  const [shortcut, setShortcut] = useState<ParsedShortcut | null>(null);
  const [binaryData, setBinaryData] = useState<ArrayBuffer | null>(null);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headingColor = useColorModeValue('gray.700', 'gray.100');
  const textColor = useColorModeValue('gray.500', 'gray.400');
  const subtleTextColor = useColorModeValue('gray.400', 'gray.500');

  // Settings drawer state
  const {
    isOpen: isSettingsOpen,
    onOpen: onSettingsOpen,
    onClose: onSettingsClose,
  } = useDisclosure();

  // Support drawer state
  const { isOpen: isSupportOpen, onOpen: onSupportOpen, onClose: onSupportClose } = useDisclosure();

  // Help drawer state
  const { isOpen: isHelpOpen, onOpen: onHelpOpen, onClose: onHelpClose } = useDisclosure();

  // Zustand store
  const { getCached, setCached } = useShortcutStore();

  // Track current fetch to prevent race conditions
  const currentFetchUrl = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadShortcut = useCallback(
    async (url: string, forceRefresh = false) => {
      // Cancel previous fetch if still in progress
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Check if already loading this URL
      if (currentFetchUrl.current === url && !forceRefresh) {
        return;
      }

      currentFetchUrl.current = url;
      setLoading(true);
      setError(null);

      try {
        // Check cache first
        if (!forceRefresh) {
          const cached = getCached(url);
          if (cached) {
            setShortcut(cached.data);
            setBinaryData(cached.binaryData);
            setApiResponse(cached.apiResponse);
            setShortcutUrl(url);
            setLoading(false);
            currentFetchUrl.current = null;
            return;
          }
        }

        // Create abort controller for this fetch
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const {
          metadata,
          binaryData: fetchedBinaryData,
          apiResponse: fetchedApiResponse,
        } = await fetchShortcutFromiCloud(url);

        // Check if this fetch was cancelled
        if (controller.signal.aborted) {
          console.warn('Fetch was cancelled', url);
          return;
        }

        const parsed = parsePlist(fetchedBinaryData);
        let data = extractShortcutData(parsed);

        data = {
          ...data,
          deleted: fetchedApiResponse.deleted === undefined,
          recordName: fetchedApiResponse.recordName,
          recordType: fetchedApiResponse.recordType,
          created: fetchedApiResponse?.created,
          modified: fetchedApiResponse?.modified,
        };

        const shortcutData: ParsedShortcut = {
          metadata: {
            ...metadata,
            isSigned: !!fetchedApiResponse.fields.signedShortcut,
          },
          data,
          raw: parsed,
        };

        // Store in cache
        setCached(url, shortcutData, fetchedBinaryData, fetchedApiResponse);

        // Update state
        setShortcut(shortcutData);
        setBinaryData(fetchedBinaryData);
        setApiResponse(fetchedApiResponse);
        setShortcutUrl(url);

        abortControllerRef.current = null;
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          console.warn('Fetch aborted', err);
          return;
        }

        console.error('Failed to load shortcut:', err);
        setError(err instanceof Error ? err.message : 'Failed to load shortcut');
      } finally {
        setLoading(false);
        currentFetchUrl.current = null;
      }
    },
    [getCached, setCached],
  );

  // Listen for messages from content script AND background
  useEffect(() => {
    const messageListener = (message: ChromeMessage) => {
      if (message.type === 'SHORTCUT_DETECTED' && message.payload?.url) {
        setShortcutUrl(message.payload.url);
        loadShortcut(message.payload.url);
      }

      // Handle tab changes from background script
      if (message.type === 'TAB_CHANGED') {
        const { url, isShortcutPage } = message.payload;

        if (isShortcutPage) {
          // Load the shortcut for the new tab
          setShortcutUrl(url);
          loadShortcut(url);
        } else {
          // Not on a shortcut page, show empty state
          setShortcutUrl(null);
          setShortcut(null);
          setBinaryData(null);
          setApiResponse(null);
          setError(null);
        }
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
      // Cancel any in-progress fetch on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadShortcut]);

  // Check if we're already on a shortcut page when the panel opens
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.url && /icloud\.com\/shortcuts\/[a-zA-Z0-9]+/.test(activeTab.url)) {
        setShortcutUrl(activeTab.url);
        loadShortcut(activeTab.url);
      }
    });
  }, [loadShortcut]);

  const handleRefresh = useCallback(() => {
    if (shortcutUrl) {
      loadShortcut(shortcutUrl, true);
    }
  }, [shortcutUrl, loadShortcut]);

  if (loading) {
    return (
      <ChakraProvider theme={theme}>
        <TopBar onSettingsOpen={onSettingsOpen} onSupportOpen={onSupportOpen} onHelpOpen={onHelpOpen} />
        <SettingsDrawer isOpen={isSettingsOpen} onClose={onSettingsClose} />
        <SupportDrawer isOpen={isSupportOpen} onClose={onSupportClose} />
        <HelpDrawer isOpen={isHelpOpen} onClose={onHelpClose} />
        <Container maxW="full" h="100vh" p={8}>
          <VStack spacing={4} align="center" justify="center" h="full">
            <Spinner size="xl" color="brand.500" thickness="4px" />
            <Text fontSize="lg" color={textColor}>
              Loading shortcut...
            </Text>
          </VStack>
        </Container>
      </ChakraProvider>
    );
  }

  if (error) {
    return (
      <ChakraProvider theme={theme}>
        <TopBar onSettingsOpen={onSettingsOpen} onSupportOpen={onSupportOpen} onHelpOpen={onHelpOpen} />
        <SettingsDrawer isOpen={isSettingsOpen} onClose={onSettingsClose} />
        <SupportDrawer isOpen={isSupportOpen} onClose={onSupportClose} />
        <HelpDrawer isOpen={isHelpOpen} onClose={onHelpClose} />
        <Container maxW="full" h="100vh" p={8}>
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <Box>
              <AlertTitle>Error Loading Shortcut</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Box>
          </Alert>
        </Container>
      </ChakraProvider>
    );
  }

  if (!shortcutUrl || !shortcut) {
    return (
      <ChakraProvider theme={theme}>
        <TopBar onSettingsOpen={onSettingsOpen} onSupportOpen={onSupportOpen} onHelpOpen={onHelpOpen} />
        <SettingsDrawer isOpen={isSettingsOpen} onClose={onSettingsClose} />
        <SupportDrawer isOpen={isSupportOpen} onClose={onSupportClose} />
        <HelpDrawer isOpen={isHelpOpen} onClose={onHelpClose} />
        <Container maxW="full" h="100vh" p={8}>
          <VStack spacing={4} align="center" justify="center" h="full">
            <Text fontSize="xl" fontWeight="bold" color={headingColor}>
              No Shortcut Detected
            </Text>
            <Text fontSize="md" color={textColor} textAlign="center">
              Navigate to an iCloud shortcut page to inspect it.
            </Text>
            <Text fontSize="sm" color={subtleTextColor} textAlign="center">
              Example: https://www.icloud.com/shortcuts/abc123...
            </Text>
            <Alert status="info" variant="subtle" borderRadius="md" mt={4}>
              <AlertIcon />
              <Box flex="1">
                <Text fontSize="sm">
                  Made with ❤️ by{' '}
                  <Link
                    href="https://www.shortcutactions.com?ref=extension"
                    isExternal
                    fontWeight="medium"
                  >
                    Shortcut Actions
                  </Link>
                </Text>
              </Box>
              <Link
                href="https://apps.apple.com/us/app/ai-automation-for-shortcuts/id6756338677?ref=extension"
                isExternal
                target="_blank"
              >
                <img
                  src="/images/Download_on_the_App_Store_Badge.webp"
                  alt="Download AI & Automation Actions for Shortcuts on the App Store"
                  width="120"
                  height="40"
                />
              </Link>
            </Alert>
          </VStack>
        </Container>
      </ChakraProvider>
    );
  }

  return (
    <ChakraProvider theme={theme}>
      <TopBar
        onSettingsOpen={onSettingsOpen}
        onSupportOpen={onSupportOpen}
        onHelpOpen={onHelpOpen}
        onRefresh={handleRefresh}
      />
      <SettingsDrawer isOpen={isSettingsOpen} onClose={onSettingsClose} />
      <SupportDrawer isOpen={isSupportOpen} onClose={onSupportClose} />
      <HelpDrawer isOpen={isHelpOpen} onClose={onHelpClose} />
      <Box minH="100vh" minW="450px">
        <ShortcutHeader shortcut={shortcut} binaryData={binaryData} apiResponse={apiResponse} />

        <Container maxW="full" p={4}>
          <Tabs colorScheme="brand" variant="enclosed">
            <TabList>
              <Tab>Overview</Tab>
              <Tab>Actions</Tab>
              <Tab>Scanner</Tab>
              <Tab>Inspector</Tab>
            </TabList>

            <TabPanels>
              <TabPanel p={4}>
                <OverviewTab shortcut={shortcut} shortcutUrl={shortcutUrl} />
              </TabPanel>

              <TabPanel p={4}>
                <ActionsTab data={shortcut.data} />
              </TabPanel>

              <TabPanel p={4}>
                <AnalysisTab
                  shortcut={shortcut}
                  shortcutUrl={shortcutUrl}
                  onOpenSettings={onSettingsOpen}
                />
              </TabPanel>

              <TabPanel p={0}>
                <InspectorTab
                  apiResponse={apiResponse}
                  data={shortcut.raw}
                  metadata={shortcut.metadata}
                />
              </TabPanel>
            </TabPanels>
          </Tabs>

          <Alert status="info" variant="subtle" borderRadius="md" mt={4}>
            <AlertIcon />
            <Box flex="1">
              <Text fontSize="sm">
                Made with ❤️ by{' '}
                <Link
                  href="https://www.shortcutactions.com?ref=extension"
                  isExternal
                  fontWeight="medium"
                >
                  Shortcut Actions
                </Link>
              </Text>
            </Box>
            <Link
              href="https://apps.apple.com/us/app/ai-automation-for-shortcuts/id6756338677?ref=extension"
              isExternal
              fontWeight="medium"
              target="_blank"
            >
              <img
                src="/images/Download_on_the_App_Store_Badge.webp"
                alt="Download AI & Automation Actions for Shortcuts on the App Store"
                width="120"
                height="40"
              />
            </Link>
          </Alert>
        </Container>
      </Box>
    </ChakraProvider>
  );
}

export default App;
