// Prompt shown when no API keys are configured

import { LockIcon, SettingsIcon } from '@chakra-ui/icons';
import {
  Button,
  Card,
  CardBody,
  Icon,
  Link,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react';

interface SetupPromptProps {
  onOpenSettings: () => void;
  onHelpOpen: () => void;
}

export default function SetupPrompt({ onOpenSettings, onHelpOpen }: SetupPromptProps) {
  const cardBg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const iconColor = useColorModeValue('gray.400', 'gray.500');
  const linkColor = useColorModeValue('blue.500', 'blue.300');

  return (
    <Card bg={cardBg}>
      <CardBody>
        <VStack spacing={4} py={6} textAlign="center">
          <Icon as={LockIcon} boxSize={10} color={iconColor} />
          <Text fontWeight="bold" fontSize="lg">
            API Key Required
          </Text>
          <Text fontSize="sm" color={textColor} maxW="280px">
            Configure an API key in Settings to enable AI-powered security scan and analysis of
            shortcuts.
          </Text>
          <Text fontSize="xs" color={textColor}>
            Supported providers: OpenAI, Anthropic, OpenRouter
          </Text>
          <Link
            fontSize="xs"
            color={linkColor}
            onClick={onHelpOpen}
            cursor="pointer"
            _hover={{ textDecoration: 'underline' }}
          >
            Learn more about security
          </Link>
          <Button
            size="sm"
            colorScheme="brand"
            leftIcon={<SettingsIcon />}
            onClick={onOpenSettings}
          >
            Open Settings
          </Button>
        </VStack>
      </CardBody>
    </Card>
  );
}
