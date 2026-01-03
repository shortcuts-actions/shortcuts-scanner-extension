// Main AnalysisTab component - orchestrates analysis UI states

import { RepeatIcon } from '@chakra-ui/icons';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react';
import { useCallback, useEffect, useRef } from 'react';
import {
  useAvailableProviders,
  useProviderUnlockStatus,
} from '../../../hooks/useAvailableProviders';
import { analysisService } from '../../../services/analysis/analysis.service';
import { useAnalysisStore } from '../../../stores/analysisStore';
import {
  type AnalysisError,
  getDefaultModel,
  type SupportedProvider,
} from '../../../utils/analysis-types';
import type { ParsedShortcut } from '../../../utils/types';
import AnalysisControls from './AnalysisControls';
import AnalysisResults from './AnalysisResults';
import ProgressIndicator from './ProgressIndicator';
import SetupPrompt from './SetupPrompt';
import UnlockForm from './UnlockForm';

interface AnalysisTabProps {
  shortcut: ParsedShortcut;
  shortcutUrl: string;
  onOpenSettings: () => void;
  onHelpOpen: () => void;
}

export default function AnalysisTab({
  shortcut,
  shortcutUrl,
  onOpenSettings,
  onHelpOpen,
}: AnalysisTabProps) {
  const {
    providers,
    loading: providersLoading,
    refresh: refreshProviders,
  } = useAvailableProviders();

  const {
    status,
    result,
    error,
    progress,
    selectedProvider,
    selectedModel,
    selectedMode,
    setSelectedProvider,
    setSelectedModel,
    setSelectedMode,
    startAnalysis,
    updateProgress,
    completeAnalysis,
    setError,
    clearResult,
    clearError,
    getCachedResult,
    cacheResult,
    getModelPreference,
  } = useAnalysisStore();

  const { isUnlocked, refresh: refreshUnlockStatus } = useProviderUnlockStatus(selectedProvider);

  const textColor = useColorModeValue('gray.600', 'gray.400');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Track the last URL we processed to detect URL changes
  const lastProcessedUrl = useRef<string | null>(null);

  // Handle shortcut URL changes - load cached result or clear current result
  useEffect(() => {
    // Skip if we already processed this URL
    if (lastProcessedUrl.current === shortcutUrl) {
      return;
    }

    lastProcessedUrl.current = shortcutUrl;

    // Check for cached result for the new URL
    const cached = getCachedResult(shortcutUrl);
    if (cached) {
      // Load the cached result
      completeAnalysis(cached);
    } else {
      // No cache for this URL - clear any existing result to show controls
      clearResult();
    }
  }, [shortcutUrl, getCachedResult, completeAnalysis, clearResult]);

  // Set default provider and model if not set
  useEffect(() => {
    if (providers.length > 0) {
      if (!selectedProvider) {
        // No provider set - set first available provider and its default model
        const firstProvider = providers[0].provider;
        setSelectedProvider(firstProvider);
        setSelectedModel(getDefaultModel(firstProvider));
      } else if (!selectedModel) {
        // Provider is set but model is null - set default model for current provider
        setSelectedModel(getDefaultModel(selectedProvider));
      }
    }
  }, [providers, selectedProvider, selectedModel, setSelectedProvider, setSelectedModel]);

  const handleProviderChange = useCallback(
    (provider: SupportedProvider) => {
      setSelectedProvider(provider);
      // Load saved model preference or use default
      const savedModel = getModelPreference(provider);
      setSelectedModel(savedModel || getDefaultModel(provider));
      refreshUnlockStatus();
    },
    [setSelectedProvider, setSelectedModel, getModelPreference, refreshUnlockStatus],
  );

  const runAnalysis = useCallback(async () => {
    if (!selectedProvider || !selectedModel) return;

    clearError();
    startAnalysis();

    try {
      const analysisResult = await analysisService.analyze(
        shortcut,
        selectedMode,
        selectedProvider,
        selectedModel,
        (phase, percentage) => updateProgress(phase, percentage),
      );

      completeAnalysis(analysisResult);
      cacheResult(shortcutUrl, analysisResult);
    } catch (err) {
      const analysisError = err as AnalysisError;
      setError({
        code: analysisError.code || 'API_ERROR',
        message: analysisError.message || 'An unexpected error occurred',
        retryable: analysisError.retryable ?? true,
        retryAfterMs: analysisError.retryAfterMs,
      });
    }
  }, [
    selectedProvider,
    selectedModel,
    selectedMode,
    shortcut,
    shortcutUrl,
    clearError,
    startAnalysis,
    updateProgress,
    completeAnalysis,
    cacheResult,
    setError,
  ]);

  const handleUnlock = useCallback(
    async (apiKey: string) => {
      // API key is now unlocked, clear error and retry analysis
      if (apiKey) {
        clearError();
        await refreshUnlockStatus();
      }
    },
    [clearError, refreshUnlockStatus],
  );

  const handleRetry = useCallback(() => {
    clearError();
    runAnalysis();
  }, [clearError, runAnalysis]);

  const handleNewAnalysis = useCallback(() => {
    clearResult();
    refreshProviders();
  }, [clearResult, refreshProviders]);

  // Loading providers
  if (providersLoading) {
    return (
      <Box py={8} textAlign="center">
        <Text fontSize="sm" color={textColor}>
          Checking available providers...
        </Text>
      </Box>
    );
  }

  // No providers configured
  if (providers.length === 0) {
    return <SetupPrompt onOpenSettings={onOpenSettings} onHelpOpen={onHelpOpen} />;
  }

  // Session expired error - show unlock form
  if (error?.code === 'SESSION_EXPIRED' && selectedProvider) {
    return (
      <VStack spacing={4} align="stretch">
        <UnlockForm
          provider={selectedProvider}
          onUnlock={handleUnlock}
          onCancel={() => clearError()}
          onRefresh={refreshUnlockStatus}
        />
      </VStack>
    );
  }

  // Other error
  if (error) {
    return (
      <VStack spacing={4} align="stretch">
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <Box flex="1">
            <AlertDescription fontSize="sm">{error.message}</AlertDescription>
          </Box>
        </Alert>

        {error.retryable && (
          <Button size="sm" variant="outline" leftIcon={<RepeatIcon />} onClick={handleRetry}>
            {error.retryAfterMs ? `Retry in ${Math.ceil(error.retryAfterMs / 1000)}s` : 'Retry'}
          </Button>
        )}

        <Button size="sm" variant="ghost" onClick={() => clearError()}>
          Cancel
        </Button>
      </VStack>
    );
  }

  // Analyzing
  if (status !== 'idle' && status !== 'complete' && status !== 'error') {
    return <ProgressIndicator progress={progress} />;
  }

  // Show results
  if (result) {
    return (
      <VStack spacing={4} align="stretch">
        <AnalysisResults result={result} />

        {/* Re-run options */}
        <Box p={3} borderRadius="md" borderWidth="1px" borderColor={borderColor}>
          <Text fontSize="sm" fontWeight="medium" mb={2}>
            Run Again
          </Text>
          <VStack spacing={2} align="stretch">
            {result.analysisMode !== 'deep' && (
              <Button
                size="sm"
                variant="outline"
                leftIcon={<RepeatIcon />}
                onClick={() => {
                  setSelectedMode('deep');
                  clearResult();
                  // Small delay to allow state update before running
                  setTimeout(() => runAnalysis(), 100);
                }}
              >
                Run Deep Analysis
              </Button>
            )}
            <Button size="sm" variant="ghost" leftIcon={<RepeatIcon />} onClick={handleNewAnalysis}>
              {result.analysisMode === 'deep' ? 'Run Again' : 'Change Settings'}
            </Button>
          </VStack>
        </Box>
      </VStack>
    );
  }

  // Show controls (idle state)
  return (
    <VStack spacing={4} align="stretch">
      {/* Show unlock form if provider is locked */}
      {selectedProvider && !isUnlocked && (
        <UnlockForm
          provider={selectedProvider}
          onUnlock={handleUnlock}
          onCancel={() => {}}
          onRefresh={refreshUnlockStatus}
        />
      )}

      <AnalysisControls
        providers={providers}
        selectedProvider={selectedProvider}
        selectedModel={selectedModel}
        selectedMode={selectedMode}
        onProviderChange={handleProviderChange}
        onModeChange={setSelectedMode}
        onRunAnalysis={runAnalysis}
        isRunning={status !== 'idle'}
        isUnlocked={isUnlocked}
      />
    </VStack>
  );
}
