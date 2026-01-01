// Session Settings Card Component
// Provides UI for configuring session persistence and timeout settings

import { InfoIcon } from '@chakra-ui/icons';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Card,
  CardBody,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Slider,
  SliderFilledTrack,
  SliderMark,
  SliderThumb,
  SliderTrack,
  Spinner,
  Switch,
  Text,
  Tooltip,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react';
import { useState } from 'react';
import {
  INACTIVITY_TIMEOUT_MARKS,
  SESSION_EXPIRY_MARKS,
  SESSION_LIMITS,
} from '../../config/session-settings';
import { useSessionSettings } from '../../hooks/useSessionSettings';

export default function SessionSettingsCard() {
  const {
    settings,
    loading,
    saving,
    showSecurityWarning,
    updatePersistSession,
    updateSessionExpiry,
    updateInactivityTimeout,
    formatExpiryDisplay,
  } = useSessionSettings();

  // Local state for slider values (for smooth dragging)
  const [localSessionExpiry, setLocalSessionExpiry] = useState<number | null>(null);
  const [localInactivityTimeout, setLocalInactivityTimeout] = useState<number | null>(null);

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const labelColor = useColorModeValue('gray.600', 'gray.400');
  const markColor = useColorModeValue('gray.500', 'gray.400');

  // Use local value while dragging, otherwise use settings
  const sessionExpiryValue = localSessionExpiry ?? settings.sessionExpiryMinutes;
  const inactivityTimeoutValue = localInactivityTimeout ?? settings.inactivityTimeoutMinutes;

  // Check if warning should be shown (for current or local value while dragging)
  const showWarning =
    showSecurityWarning ||
    (localSessionExpiry !== null && localSessionExpiry >= SESSION_LIMITS.warningThresholdMinutes);

  if (loading) {
    return (
      <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
        <CardBody>
          <HStack justify="center" py={4}>
            <Spinner size="sm" />
            <Text fontSize="sm" color={labelColor}>
              Loading session settings...
            </Text>
          </HStack>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
      <CardBody>
        <VStack spacing={5} align="stretch">
          <HStack justify="space-between">
            <Text fontSize="lg" fontWeight="bold">
              Session Settings
            </Text>
            {saving && <Spinner size="xs" />}
          </HStack>

          <Text fontSize="sm" color={labelColor}>
            Configure how long your unlocked API keys remain accessible.
          </Text>

          <Divider />

          {/* Session Persistence Toggle */}
          <FormControl display="flex" alignItems="center" justifyContent="space-between">
            <Box>
              <FormLabel htmlFor="persist-session" mb={0} fontSize="sm">
                Keep session active when panel closes
              </FormLabel>
              <FormHelperText mt={1} fontSize="xs">
                When enabled, you won't need to re-enter your password after closing the panel
              </FormHelperText>
            </Box>
            <Switch
              id="persist-session"
              isChecked={settings.persistSession}
              onChange={(e) => updatePersistSession(e.target.checked)}
              colorScheme="brand"
            />
          </FormControl>

          <Divider />

          {/* Session Expiry Slider */}
          <FormControl>
            <HStack justify="space-between" mb={2}>
              <FormLabel mb={0} fontSize="sm">
                Session timeout
              </FormLabel>
              <HStack spacing={1}>
                <Text fontSize="sm" fontWeight="medium" color="brand.500">
                  {formatExpiryDisplay(sessionExpiryValue)}
                </Text>
                <Tooltip
                  label="How long until your unlocked API keys expire and require password re-entry"
                  fontSize="xs"
                >
                  <InfoIcon boxSize={3} color={labelColor} />
                </Tooltip>
              </HStack>
            </HStack>

            <Box px={2} pt={2} pb={6}>
              <Slider
                aria-label="Session timeout"
                min={SESSION_LIMITS.minExpiryMinutes}
                max={SESSION_LIMITS.maxExpiryMinutes}
                step={5}
                value={sessionExpiryValue}
                onChange={(val) => setLocalSessionExpiry(val)}
                onChangeEnd={(val) => {
                  setLocalSessionExpiry(null);
                  updateSessionExpiry(val);
                }}
                colorScheme="brand"
              >
                {SESSION_EXPIRY_MARKS.map((mark) => (
                  <SliderMark
                    key={mark.value}
                    value={mark.value}
                    mt={3}
                    ml={-2}
                    fontSize="xs"
                    color={markColor}
                  >
                    {mark.label}
                  </SliderMark>
                ))}
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb boxSize={4} />
              </Slider>
            </Box>
          </FormControl>

          {/* Security Warning at 6 hours */}
          {showWarning && (
            <Alert status="warning" borderRadius="md" size="sm">
              <AlertIcon />
              <AlertDescription fontSize="xs">
                6 hours is the maximum allowed. Shorter durations are recommended for security.
              </AlertDescription>
            </Alert>
          )}

          <Divider />

          {/* Inactivity Timeout Slider */}
          <FormControl>
            <HStack justify="space-between" mb={2}>
              <FormLabel mb={0} fontSize="sm">
                Inactivity timeout
              </FormLabel>
              <HStack spacing={1}>
                <Text fontSize="sm" fontWeight="medium" color="brand.500">
                  {formatExpiryDisplay(inactivityTimeoutValue)}
                </Text>
                <Tooltip
                  label="Auto-lock your API keys after this period of no activity"
                  fontSize="xs"
                >
                  <InfoIcon boxSize={3} color={labelColor} />
                </Tooltip>
              </HStack>
            </HStack>

            <Box px={2} pt={2} pb={6}>
              <Slider
                aria-label="Inactivity timeout"
                min={SESSION_LIMITS.minInactivityMinutes}
                max={SESSION_LIMITS.maxInactivityMinutes}
                step={5}
                value={inactivityTimeoutValue}
                onChange={(val) => setLocalInactivityTimeout(val)}
                onChangeEnd={(val) => {
                  setLocalInactivityTimeout(null);
                  updateInactivityTimeout(val);
                }}
                colorScheme="brand"
              >
                {INACTIVITY_TIMEOUT_MARKS.map((mark) => (
                  <SliderMark
                    key={mark.value}
                    value={mark.value}
                    mt={3}
                    ml={-2}
                    fontSize="xs"
                    color={markColor}
                  >
                    {mark.label}
                  </SliderMark>
                ))}
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb boxSize={4} />
              </Slider>
            </Box>

            <FormHelperText fontSize="xs">
              Auto-lock after this period of no activity
            </FormHelperText>
          </FormControl>
        </VStack>
      </CardBody>
    </Card>
  );
}
