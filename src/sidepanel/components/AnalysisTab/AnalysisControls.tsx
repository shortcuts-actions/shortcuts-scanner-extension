// Controls for selecting provider, mode and running analysis

import { SearchIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Radio,
  RadioGroup,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react';
import {
  ANALYSIS_MODES,
  type AnalysisMode,
  type ProviderStatus,
  type SupportedProvider,
} from '../../../utils/analysis-types';

interface AnalysisControlsProps {
  providers: ProviderStatus[];
  selectedProvider: SupportedProvider | null;
  selectedModel: string | null;
  selectedMode: AnalysisMode;
  onProviderChange: (provider: SupportedProvider) => void;
  onModeChange: (mode: AnalysisMode) => void;
  onRunAnalysis: () => void;
  isRunning: boolean;
  isUnlocked: boolean;
}

export default function AnalysisControls({
  selectedProvider,
  selectedModel,
  selectedMode,
  onModeChange,
  onRunAnalysis,
  isRunning,
  isUnlocked,
}: AnalysisControlsProps) {
  const labelColor = useColorModeValue('gray.700', 'gray.300');
  const descColor = useColorModeValue('gray.500', 'gray.500');
  const radioBg = useColorModeValue('white', 'gray.800');

  const isReady = selectedProvider && selectedModel && !isRunning;

  return (
    <VStack spacing={4} align="stretch">
      {/* Analysis Mode Selection */}
      <FormControl>
        <FormLabel fontSize="sm" color={labelColor}>
          Analysis Mode
        </FormLabel>
        <RadioGroup value={selectedMode} onChange={(value) => onModeChange(value as AnalysisMode)}>
          <VStack align="stretch" spacing={2}>
            {ANALYSIS_MODES.map((mode) => (
              <Box
                key={mode.id}
                p={2}
                borderRadius="md"
                bg={radioBg}
                borderWidth="1px"
                borderColor={selectedMode === mode.id ? 'brand.500' : 'transparent'}
              >
                <Radio value={mode.id} size="sm" colorScheme="brand">
                  <Box ml={1}>
                    <Text fontSize="sm" fontWeight="medium">
                      {mode.name}
                    </Text>
                    <Text fontSize="xs" color={descColor}>
                      {mode.description}
                    </Text>
                  </Box>
                </Radio>
              </Box>
            ))}
          </VStack>
        </RadioGroup>
      </FormControl>

      {/* Run Button */}
      <Button
        colorScheme="brand"
        size="md"
        leftIcon={<SearchIcon />}
        onClick={onRunAnalysis}
        isDisabled={!isReady || !isUnlocked}
        isLoading={isRunning}
        loadingText="Analyzing..."
        mt={2}
      >
        Run Security Analysis
      </Button>
    </VStack>
  );
}
