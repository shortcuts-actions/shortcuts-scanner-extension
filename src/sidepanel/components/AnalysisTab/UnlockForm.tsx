// Inline unlock form for session expiration

import { LockIcon, RepeatIcon } from '@chakra-ui/icons';
import {
  Badge,
  Box,
  Button,
  HStack,
  IconButton,
  Input,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import { useState } from 'react';
import { apiKeyManagerService } from '../../../services/api-key-manager.service';
import { PROVIDER_DISPLAY_NAMES, type SupportedProvider } from '../../../utils/analysis-types';

interface UnlockFormProps {
  provider: SupportedProvider;
  onUnlock: (apiKey: string) => void;
  onCancel: () => void;
  onRefresh?: () => void;
}

export default function UnlockForm({ provider, onUnlock, onCancel, onRefresh }: UnlockFormProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const providerName = PROVIDER_DISPLAY_NAMES[provider];
  const borderColor = useColorModeValue('orange.200', 'orange.700');
  const bgColor = useColorModeValue('orange.50', 'orange.900');

  const handleUnlock = async () => {
    if (!password) return;

    setLoading(true);
    setError(null);

    try {
      const result = await apiKeyManagerService.unlock(provider, password);

      if (result.success && result.apiKey) {
        setPassword('');
        onUnlock(result.apiKey);
      } else {
        setError(result.error?.message || 'Failed to unlock API key');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleUnlock();
    }
  };

  return (
    <Box p={3} borderRadius="md" borderWidth="1px" borderColor={borderColor} bg={bgColor}>
      <HStack spacing={2} wrap="wrap">
        <LockIcon color="orange.500" boxSize={4} />
        <Badge colorScheme="orange" fontSize="xs">
          {providerName}
        </Badge>
        <Input
          type="password"
          size="sm"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          flex="1"
          minW="120px"
          bg={useColorModeValue('white', 'gray.800')}
        />
        <Button
          size="sm"
          colorScheme="orange"
          onClick={handleUnlock}
          isLoading={loading}
          isDisabled={!password}
        >
          Unlock
        </Button>
        {onRefresh && (
          <IconButton
            aria-label="Refresh unlock status"
            icon={<RepeatIcon />}
            size="sm"
            variant="ghost"
            onClick={onRefresh}
            title="Already unlocked? Click to refresh"
          />
        )}
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </HStack>
      {error && (
        <Text color="red.500" fontSize="xs" mt={2}>
          {error}
        </Text>
      )}
    </Box>
  );
}
