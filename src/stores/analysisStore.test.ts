import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { AnalysisResult, QuickScanResult } from '../utils/analysis-types';
import { useAnalysisStore } from './analysisStore';

describe('AnalysisStore', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useAnalysisStore());
    act(() => {
      result.current.reset();
      result.current.clearCache();
    });
  });

  const mockAnalysisResult: AnalysisResult = {
    overallRisk: 'low',
    confidenceScore: 0.9,
    summary: {
      oneLiner: 'Safe shortcut',
      forUser: 'This is safe',
      forTechnical: 'No issues',
    },
    purposeAnalysis: {
      statedPurpose: 'Test',
      actualPurpose: 'Test',
      purposeMismatch: false,
    },
    findings: [],
    dataFlows: [],
    externalConnections: [],
    permissions: [],
    redFlags: [],
    positiveIndicators: [],
    recommendation: {
      verdict: 'safe',
      shouldInstall: true,
      conditions: [],
      userGuidance: 'Safe to use',
    },
    analysisMode: 'standard',
    analyzedAt: Date.now(),
    provider: 'openai',
    model: 'gpt-4',
  };

  const mockQuickScanResult: QuickScanResult = {
    overallRisk: 'low',
    oneLiner: 'Quick scan complete',
    topConcerns: [],
    verdict: 'safe',
    shouldInstall: true,
    needsDeepAnalysis: false,
    analysisMode: 'quick',
    analyzedAt: Date.now(),
    provider: 'openai',
    model: 'gpt-4',
  };

  describe('initial state', () => {
    it('should have idle status initially', () => {
      const { result } = renderHook(() => useAnalysisStore());

      expect(result.current.status).toBe('idle');
      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should have default selected mode', () => {
      const { result } = renderHook(() => useAnalysisStore());

      expect(result.current.selectedMode).toBe('standard');
    });
  });

  describe('provider and model selection', () => {
    it('should set selected provider', () => {
      const { result } = renderHook(() => useAnalysisStore());

      act(() => {
        result.current.setSelectedProvider('anthropic');
      });

      expect(result.current.selectedProvider).toBe('anthropic');
    });

    it('should set selected model', () => {
      const { result } = renderHook(() => useAnalysisStore());

      act(() => {
        result.current.setSelectedModel('gpt-4');
      });

      expect(result.current.selectedModel).toBe('gpt-4');
    });

    it('should set selected mode', () => {
      const { result } = renderHook(() => useAnalysisStore());

      act(() => {
        result.current.setSelectedMode('deep');
      });

      expect(result.current.selectedMode).toBe('deep');
    });
  });

  describe('model preferences', () => {
    it('should save model preference for provider', () => {
      const { result } = renderHook(() => useAnalysisStore());

      act(() => {
        result.current.setModelPreference('openai', 'gpt-4');
      });

      expect(result.current.getModelPreference('openai')).toBe('gpt-4');
    });

    it('should return null for unsaved preference', () => {
      const { result } = renderHook(() => useAnalysisStore());

      expect(result.current.getModelPreference('openrouter')).toBeNull();
    });

    it('should load saved model when provider is selected', () => {
      const { result } = renderHook(() => useAnalysisStore());

      act(() => {
        result.current.setModelPreference('anthropic', 'claude-3-opus');
        result.current.setSelectedProvider('anthropic');
      });

      expect(result.current.selectedModel).toBe('claude-3-opus');
    });
  });

  describe('analysis lifecycle', () => {
    it('should start analysis', () => {
      const { result } = renderHook(() => useAnalysisStore());

      act(() => {
        result.current.startAnalysis();
      });

      expect(result.current.status).toBe('preprocessing');
      expect(result.current.error).toBeNull();
      expect(result.current.progress.percentage).toBe(10);
    });

    it('should update progress', () => {
      const { result } = renderHook(() => useAnalysisStore());

      act(() => {
        result.current.updateProgress('Processing...', 50);
      });

      expect(result.current.progress.phase).toBe('Processing...');
      expect(result.current.progress.percentage).toBe(50);
    });

    it('should complete analysis with result', () => {
      const { result } = renderHook(() => useAnalysisStore());

      act(() => {
        result.current.completeAnalysis(mockAnalysisResult);
      });

      expect(result.current.status).toBe('complete');
      expect(result.current.result).toEqual(mockAnalysisResult);
      expect(result.current.error).toBeNull();
      expect(result.current.progress.percentage).toBe(100);
    });

    it('should set error', () => {
      const { result } = renderHook(() => useAnalysisStore());

      const error = {
        code: 'NETWORK_ERROR' as const,
        message: 'Network failed',
        retryable: true,
      };

      act(() => {
        result.current.setError(error);
      });

      expect(result.current.status).toBe('error');
      expect(result.current.error).toEqual(error);
    });

    it('should set status', () => {
      const { result } = renderHook(() => useAnalysisStore());

      act(() => {
        result.current.setStatus('analyzing');
      });

      expect(result.current.status).toBe('analyzing');
    });
  });

  describe('reset and clear', () => {
    it('should reset to initial state while preserving selections', () => {
      const { result } = renderHook(() => useAnalysisStore());

      act(() => {
        result.current.setSelectedProvider('openai');
        result.current.setSelectedModel('gpt-4');
        result.current.setSelectedMode('deep');
        result.current.completeAnalysis(mockAnalysisResult);
        result.current.reset();
      });

      expect(result.current.status).toBe('idle');
      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.selectedProvider).toBe('openai');
      expect(result.current.selectedModel).toBe('gpt-4');
      expect(result.current.selectedMode).toBe('deep');
    });

    it('should clear result', () => {
      const { result } = renderHook(() => useAnalysisStore());

      act(() => {
        result.current.completeAnalysis(mockAnalysisResult);
        result.current.clearResult();
      });

      expect(result.current.result).toBeNull();
      expect(result.current.status).toBe('idle');
    });

    it('should clear error', () => {
      const { result } = renderHook(() => useAnalysisStore());

      const error = {
        code: 'API_ERROR' as const,
        message: 'Failed',
        retryable: false,
      };

      act(() => {
        result.current.setError(error);
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.status).toBe('idle');
    });
  });

  describe('result cache', () => {
    const testUrl = 'https://www.icloud.com/shortcuts/test123';

    it('should cache analysis result', () => {
      const { result } = renderHook(() => useAnalysisStore());

      act(() => {
        result.current.cacheResult(testUrl, mockAnalysisResult);
      });

      const cached = result.current.getCachedResult(testUrl);
      expect(cached).toEqual(mockAnalysisResult);
    });

    it('should return null for uncached URL', () => {
      const { result } = renderHook(() => useAnalysisStore());

      const cached = result.current.getCachedResult('https://nonexistent.com');
      expect(cached).toBeNull();
    });

    it('should cache quick scan result', () => {
      const { result } = renderHook(() => useAnalysisStore());

      act(() => {
        result.current.cacheResult(testUrl, mockQuickScanResult);
      });

      const cached = result.current.getCachedResult(testUrl);
      expect(cached).toEqual(mockQuickScanResult);
    });

    it('should update cached result', () => {
      const { result } = renderHook(() => useAnalysisStore());

      const updatedResult: AnalysisResult = {
        ...mockAnalysisResult,
        overallRisk: 'high',
      };

      act(() => {
        result.current.cacheResult(testUrl, mockAnalysisResult);
        result.current.cacheResult(testUrl, updatedResult);
      });

      const cached = result.current.getCachedResult(testUrl);
      expect((cached as AnalysisResult)?.overallRisk).toBe('high');
    });

    it('should clear all cached results', () => {
      const { result } = renderHook(() => useAnalysisStore());

      act(() => {
        result.current.cacheResult('url1', mockAnalysisResult);
        result.current.cacheResult('url2', mockQuickScanResult);
        result.current.clearCache();
      });

      expect(result.current.getCachedResult('url1')).toBeNull();
      expect(result.current.getCachedResult('url2')).toBeNull();
    });
  });

  describe('persistence', () => {
    it('should persist model preferences across instances', () => {
      const { result: result1 } = renderHook(() => useAnalysisStore());

      act(() => {
        result1.current.setModelPreference('openai', 'gpt-4-turbo');
      });

      const { result: result2 } = renderHook(() => useAnalysisStore());

      expect(result2.current.getModelPreference('openai')).toBe('gpt-4-turbo');
    });
  });

  describe('complete workflow', () => {
    it('should handle full analysis workflow', () => {
      const { result } = renderHook(() => useAnalysisStore());

      // Setup
      act(() => {
        result.current.setSelectedProvider('openai');
        result.current.setSelectedModel('gpt-4');
        result.current.setSelectedMode('standard');
      });

      // Start
      act(() => {
        result.current.startAnalysis();
      });
      expect(result.current.status).toBe('preprocessing');

      // Progress
      act(() => {
        result.current.updateProgress('Analyzing...', 50);
      });
      expect(result.current.progress.phase).toBe('Analyzing...');

      // Complete
      act(() => {
        result.current.completeAnalysis(mockAnalysisResult);
      });
      expect(result.current.status).toBe('complete');
      expect(result.current.result).toEqual(mockAnalysisResult);
    });

    it('should handle error workflow', () => {
      const { result } = renderHook(() => useAnalysisStore());

      act(() => {
        result.current.startAnalysis();
      });

      const error = {
        code: 'RATE_LIMIT' as const,
        message: 'Rate limited',
        retryable: true,
        retryAfterMs: 5000,
      };

      act(() => {
        result.current.setError(error);
      });

      expect(result.current.status).toBe('error');
      expect(result.current.error).toEqual(error);
    });
  });

  describe('state transitions', () => {
    it('should transition through analysis states', () => {
      const { result } = renderHook(() => useAnalysisStore());

      expect(result.current.status).toBe('idle');

      act(() => result.current.startAnalysis());
      expect(result.current.status).toBe('preprocessing');

      act(() => result.current.setStatus('analyzing'));
      expect(result.current.status).toBe('analyzing');

      act(() => result.current.setStatus('validating'));
      expect(result.current.status).toBe('validating');

      act(() => result.current.completeAnalysis(mockAnalysisResult));
      expect(result.current.status).toBe('complete');
    });
  });
});
