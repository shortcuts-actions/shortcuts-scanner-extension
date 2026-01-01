// Prompt shown when no API keys are configured

import { LockIcon, SettingsIcon } from '@chakra-ui/icons';
import { Button, Card, CardBody, Icon, Text, useColorModeValue, VStack } from '@chakra-ui/react';

interface SetupPromptProps {
  onOpenSettings: () => void;
}

export default function SetupPrompt({ onOpenSettings }: SetupPromptProps) {
  const cardBg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const iconColor = useColorModeValue('gray.400', 'gray.500');

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
