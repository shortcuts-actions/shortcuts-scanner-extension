// API Key Settings Component
// Provides UI for managing encrypted API keys for LLM providers

import {
  CheckIcon,
  DeleteIcon,
  LockIcon,
  UnlockIcon,
  ViewIcon,
  ViewOffIcon,
} from '@chakra-ui/icons';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Collapse,
  Divider,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Progress,
  Select,
  Text,
  useColorModeValue,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { useCallback, useEffect, useState } from 'react';
import {
  PROVIDER_DISPLAY_NAMES,
  SUPPORTED_PROVIDERS,
  type SupportedProvider,
} from '../../api-key-validation.service';
import { useApiKey } from '../../hooks/useApiKey';
import { deviceBindingRevocationService } from '../../services/device-binding-revocation.service';
import { useAnalysisStore } from '../../stores/analysisStore';
import { SUPPORTED_MODELS } from '../../utils/analysis-types';
import SessionSettingsCard from './SessionSettingsCard';

interface ProviderKeyCardProps {
  provider: SupportedProvider;
}

function ProviderKeyCard({ provider }: ProviderKeyCardProps) {
  const {
    hasKey,
    isUnlocked,
    loading,
    error,
    saveKey,
    unlock,
    lock,
    deleteKey,
    validatePassword,
    validateApiKey,
    clearError,
    passwordRequirements,
    apiKeyFormatHint,
  } = useApiKey(provider);

  // Model preference from store
  const { getModelPreference, setModelPreference } = useAnalysisStore();
  const savedModel = getModelPreference(provider as SupportedProvider);
  const models = SUPPORTED_MODELS[provider as SupportedProvider] || [];
  const currentModel = savedModel || (models.length > 0 ? models[0].id : '');

  const [apiKeyInput, setApiKeyInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [unlockPasswordInput, setUnlockPasswordInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<{
    strength: string;
    score: number;
    errors: string[];
  } | null>(null);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const toast = useToast();
  const { isOpen: isFormOpen, onToggle: onFormToggle, onClose: onFormClose } = useDisclosure();

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const labelColor = useColorModeValue('gray.600', 'gray.400');

  const displayName = PROVIDER_DISPLAY_NAMES[provider] || provider;

  // Validate password as user types
  const handlePasswordChange = useCallback(
    (value: string) => {
      setPasswordInput(value);
      if (value) {
        const result = validatePassword(value);
        setPasswordStrength({
          strength: result.strength,
          score: result.score,
          errors: result.errors,
        });
      } else {
        setPasswordStrength(null);
      }
    },
    [validatePassword],
  );

  // Validate API key as user types
  const handleApiKeyChange = useCallback(
    (value: string) => {
      setApiKeyInput(value);
      if (value) {
        const result = validateApiKey(value);
        setApiKeyError(result.valid ? null : result.error || 'Invalid API key format');
      } else {
        setApiKeyError(null);
      }
    },
    [validateApiKey],
  );

  const handleSaveKey = async () => {
    const success = await saveKey({
      apiKey: apiKeyInput,
      password: passwordInput,
      confirmPassword: confirmPasswordInput,
    });

    if (success) {
      toast({
        title: 'API key saved',
        description: `Your ${displayName} API key has been securely encrypted and saved.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      resetForm();
      onFormClose();
    }
  };

  const handleUnlock = async () => {
    const apiKey = await unlock(unlockPasswordInput);
    if (apiKey) {
      toast({
        title: 'API key unlocked',
        description: `Your ${displayName} API key is now available for use.`,
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
      setUnlockPasswordInput('');
    }
  };

  const handleLock = async () => {
    await lock();
    toast({
      title: 'API key locked',
      description: `Your ${displayName} API key has been locked.`,
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };

  const handleDelete = async () => {
    if (
      window.confirm(
        `Are you sure you want to delete your ${displayName} API key? This cannot be undone.`,
      )
    ) {
      await deleteKey();
      toast({
        title: 'API key deleted',
        description: `Your ${displayName} API key has been permanently deleted.`,
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
      resetForm();
      onFormClose();
    }
  };

  const resetForm = () => {
    setApiKeyInput('');
    setPasswordInput('');
    setConfirmPasswordInput('');
    setUnlockPasswordInput('');
    setPasswordStrength(null);
    setApiKeyError(null);
    setIsEditing(false);
    clearError();
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'weak':
        return 'red';
      case 'fair':
        return 'orange';
      case 'good':
        return 'yellow';
      case 'strong':
        return 'green';
      default:
        return 'gray';
    }
  };

  const canSave =
    apiKeyInput &&
    passwordInput &&
    confirmPasswordInput &&
    passwordInput === confirmPasswordInput &&
    passwordStrength?.strength !== 'weak' &&
    !apiKeyError &&
    passwordStrength?.errors.length === 0;

  return (
    <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
      <CardBody>
        <HStack justify="space-between" mb={hasKey || isFormOpen ? 3 : 0}>
          <HStack spacing={3}>
            <Text fontWeight="semibold" fontSize="md">
              {displayName}
            </Text>
            {hasKey && (
              <Badge colorScheme={isUnlocked ? 'green' : 'gray'} variant="subtle">
                {isUnlocked ? 'Unlocked' : 'Locked'}
              </Badge>
            )}
          </HStack>
          <HStack spacing={2}>
            {hasKey ? (
              <>
                {isUnlocked ? (
                  <IconButton
                    aria-label="Lock API key"
                    icon={<LockIcon />}
                    size="sm"
                    variant="ghost"
                    onClick={handleLock}
                    isLoading={loading}
                  />
                ) : null}
                <IconButton
                  aria-label="Delete API key"
                  icon={<DeleteIcon />}
                  size="sm"
                  variant="ghost"
                  colorScheme="red"
                  onClick={handleDelete}
                  isLoading={loading}
                />
              </>
            ) : (
              <Button
                size="sm"
                variant={isFormOpen ? 'outline' : 'solid'}
                onClick={() => {
                  onFormToggle();
                  if (!isFormOpen) {
                    setIsEditing(true);
                  } else {
                    resetForm();
                  }
                }}
              >
                {isFormOpen ? 'Cancel' : 'Add Key'}
              </Button>
            )}
          </HStack>
        </HStack>

        {/* Unlock form for existing keys */}
        {hasKey && !isUnlocked && (
          <Box mt={3}>
            <FormControl isInvalid={!!error}>
              <FormLabel fontSize="sm" color={labelColor}>
                Enter password to unlock
              </FormLabel>
              <HStack>
                <InputGroup size="sm">
                  <Input
                    type={showUnlockPassword ? 'text' : 'password'}
                    value={unlockPasswordInput}
                    onChange={(e) => setUnlockPasswordInput(e.target.value)}
                    placeholder="Enter your password"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && unlockPasswordInput) {
                        handleUnlock();
                      }
                    }}
                  />
                  <InputRightElement>
                    <IconButton
                      aria-label={showUnlockPassword ? 'Hide password' : 'Show password'}
                      icon={showUnlockPassword ? <ViewOffIcon /> : <ViewIcon />}
                      size="xs"
                      variant="ghost"
                      onClick={() => setShowUnlockPassword(!showUnlockPassword)}
                    />
                  </InputRightElement>
                </InputGroup>
                <IconButton
                  aria-label="Unlock"
                  icon={<UnlockIcon />}
                  size="sm"
                  colorScheme="brand"
                  onClick={handleUnlock}
                  isLoading={loading}
                  isDisabled={!unlockPasswordInput}
                />
              </HStack>
              {error && <FormErrorMessage>{error}</FormErrorMessage>}
            </FormControl>
          </Box>
        )}

        {/* Success state for unlocked keys */}
        {hasKey && isUnlocked && (
          <VStack spacing={3} align="stretch">
            <Alert status="success" size="sm" borderRadius="md">
              <AlertIcon />
              <AlertDescription fontSize="sm">
                API key is unlocked and ready for use in security scanner & analysis.
              </AlertDescription>
            </Alert>

            {/* Model selector */}
            <FormControl>
              <FormLabel fontSize="sm" color={labelColor}>
                Default Model for Security Analysis
              </FormLabel>
              <Select
                size="sm"
                value={currentModel}
                onChange={(e) => setModelPreference(provider as SupportedProvider, e.target.value)}
              >
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} - {model.description}
                  </option>
                ))}
              </Select>
            </FormControl>
          </VStack>
        )}

        {/* Add/Edit key form */}
        <Collapse in={isFormOpen && isEditing} animateOpacity>
          <VStack spacing={4} align="stretch" mt={hasKey ? 0 : 0}>
            <Divider />

            {/* API Key Input */}
            <FormControl isInvalid={!!apiKeyError}>
              <FormLabel fontSize="sm" color={labelColor}>
                API Key
              </FormLabel>
              <InputGroup size="sm">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder={`Enter your ${displayName} API key`}
                  fontFamily="monospace"
                />
                <InputRightElement>
                  <IconButton
                    aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                    icon={showApiKey ? <ViewOffIcon /> : <ViewIcon />}
                    size="xs"
                    variant="ghost"
                    onClick={() => setShowApiKey(!showApiKey)}
                  />
                </InputRightElement>
              </InputGroup>
              {apiKeyFormatHint && !apiKeyError && (
                <FormHelperText fontSize="xs">Expected format: {apiKeyFormatHint}</FormHelperText>
              )}
              {apiKeyError && <FormErrorMessage>{apiKeyError}</FormErrorMessage>}
            </FormControl>

            {/* Password Input */}
            <FormControl isInvalid={passwordStrength?.errors && passwordStrength.errors.length > 0}>
              <FormLabel fontSize="sm" color={labelColor}>
                Encryption Password
              </FormLabel>
              <Text fontSize="xs" color={labelColor} mb={2}>
                This password encrypts your API key locally using AES-256-GCM. It never leaves your
                device and is required each time you unlock the key. There is no recovery if
                forgotten.
              </Text>
              <InputGroup size="sm">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder="Create a strong password"
                />
                <InputRightElement>
                  <IconButton
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                    size="xs"
                    variant="ghost"
                    onClick={() => setShowPassword(!showPassword)}
                  />
                </InputRightElement>
              </InputGroup>

              {/* Password strength indicator */}
              {passwordStrength && (
                <Box mt={2}>
                  <HStack justify="space-between" mb={1}>
                    <Text fontSize="xs" color={labelColor}>
                      Password strength:
                    </Text>
                    <Badge colorScheme={getStrengthColor(passwordStrength.strength)} size="sm">
                      {passwordStrength.strength}
                    </Badge>
                  </HStack>
                  <Progress
                    value={passwordStrength.score}
                    size="xs"
                    colorScheme={getStrengthColor(passwordStrength.strength)}
                    borderRadius="full"
                  />
                </Box>
              )}

              {passwordStrength?.errors && passwordStrength.errors.length > 0 && (
                <FormErrorMessage>{passwordStrength.errors[0]}</FormErrorMessage>
              )}

              <FormHelperText fontSize="xs" whiteSpace="pre-line">
                {passwordRequirements}
              </FormHelperText>
            </FormControl>

            {/* Confirm Password */}
            <FormControl
              isInvalid={confirmPasswordInput !== '' && passwordInput !== confirmPasswordInput}
            >
              <FormLabel fontSize="sm" color={labelColor}>
                Confirm Password
              </FormLabel>
              <Input
                type="password"
                size="sm"
                value={confirmPasswordInput}
                onChange={(e) => setConfirmPasswordInput(e.target.value)}
                placeholder="Confirm your password"
              />
              {confirmPasswordInput && passwordInput !== confirmPasswordInput && (
                <FormErrorMessage>Passwords do not match</FormErrorMessage>
              )}
            </FormControl>

            {/* Error display */}
            {error && (
              <Alert status="error" size="sm" borderRadius="md">
                <AlertIcon />
                <AlertDescription fontSize="sm">{error}</AlertDescription>
              </Alert>
            )}

            {/* Save button */}
            <Button
              leftIcon={<CheckIcon />}
              colorScheme="brand"
              size="sm"
              onClick={handleSaveKey}
              isLoading={loading}
              isDisabled={!canSave}
            >
              Save API Key
            </Button>
          </VStack>
        </Collapse>
      </CardBody>
    </Card>
  );
}

export default function ApiKeySettings() {
  const [orphanedKeysWarning, setOrphanedKeysWarning] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<SupportedProvider>('openai');

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.600', 'gray.400');

  // Check for orphaned keys on mount
  useEffect(() => {
    const checkOrphanedKeys = async () => {
      const result = await deviceBindingRevocationService.checkForOrphanedKeys();
      if (result.hasOrphanedKeys) {
        setOrphanedKeysWarning(result.message);
      }
    };
    checkOrphanedKeys();
  }, []);

  const handleCleanupOrphanedKeys = async () => {
    await deviceBindingRevocationService.cleanupOrphanedKeys();
    setOrphanedKeysWarning(null);
  };

  return (
    <VStack spacing={4} align="stretch" p={4}>
      <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
        <CardBody>
          <Text fontSize="lg" fontWeight="bold" mb={2}>
            API Key Settings
          </Text>
          <Text fontSize="sm" color={textColor} mb={4}>
            Securely store API keys for LLM providers. Keys are encrypted with AES-256-GCM and bound
            to this device. They will be used the for AI-powered security analysis of Apple
            Shortcuts.
          </Text>

          {/* Orphaned keys warning */}
          {orphanedKeysWarning && (
            <Alert status="warning" mb={4} borderRadius="md">
              <AlertIcon />
              <Box flex="1">
                <AlertDescription fontSize="sm">{orphanedKeysWarning}</AlertDescription>
                <Button size="xs" mt={2} colorScheme="orange" onClick={handleCleanupOrphanedKeys}>
                  Delete Unrecoverable Keys
                </Button>
              </Box>
            </Alert>
          )}

          {/* Provider selection for adding new keys */}
          <FormControl mb={4}>
            <FormLabel fontSize="sm">Select Provider</FormLabel>
            <Select
              size="sm"
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value as SupportedProvider)}
            >
              {SUPPORTED_PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {PROVIDER_DISPLAY_NAMES[p] || p}
                </option>
              ))}
            </Select>
          </FormControl>

          <Divider mb={4} />

          {/* Provider card for selected provider */}
          <ProviderKeyCard key={selectedProvider} provider={selectedProvider} />
        </CardBody>
      </Card>

      {/* Session settings */}
      <SessionSettingsCard />

      {/* Security info */}
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <Box>
          <Text fontWeight="semibold" fontSize="sm">
            Security Information
          </Text>
          <Text fontSize="xs" mt={1}>
            Your API keys are encrypted using AES-256-GCM with PBKDF2 key derivation (800,000
            iterations). Keys are bound to this browser installation and cannot be extracted or used
            elsewhere. Uninstalling the extension will make stored keys permanently unrecoverable.
          </Text>
        </Box>
      </Alert>
    </VStack>
  );
}
