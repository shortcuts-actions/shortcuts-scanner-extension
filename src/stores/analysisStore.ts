// Zustand store for security analysis state management

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AnalysisError,
  AnalysisMode,
  AnalysisResult,
  AnalysisState,
  AnalysisStatus,
  QuickScanResult,
  SupportedProvider,
} from '../utils/analysis-types';

// Model preferences stored per provider
type ModelPreferences = Partial<Record<SupportedProvider, string>>;

interface AnalysisStore extends AnalysisState {
  // Model preferences (persisted)
  modelPreferences: ModelPreferences;
  setModelPreference: (provider: SupportedProvider, model: string) => void;
  getModelPreference: (provider: SupportedProvider) => string | null;

  // Actions
  setSelectedProvider: (provider: SupportedProvider | null) => void;
  setSelectedModel: (model: string | null) => void;
  setSelectedMode: (mode: AnalysisMode) => void;
  startAnalysis: () => void;
  setStatus: (status: AnalysisStatus) => void;
  updateProgress: (phase: string, percentage: number) => void;
  completeAnalysis: (result: AnalysisResult | QuickScanResult) => void;
  setError: (error: AnalysisError) => void;
  reset: () => void;
  clearResult: () => void;
  clearError: () => void;

  // Result cache by shortcut URL
  resultCache: Map<string, AnalysisResult | QuickScanResult>;
  getCachedResult: (url: string) => AnalysisResult | QuickScanResult | null;
  cacheResult: (url: string, result: AnalysisResult | QuickScanResult) => void;
  clearCache: () => void;
}

const initialState: AnalysisState = {
  status: 'idle',
  result: null,
  error: null,
  progress: { phase: '', percentage: 0 },
  selectedProvider: null,
  selectedModel: null,
  selectedMode: 'standard',
};

export const useAnalysisStore = create<AnalysisStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      resultCache: new Map(),
      modelPreferences: {},

      setModelPreference: (provider, model) => {
        set({
          modelPreferences: {
            ...get().modelPreferences,
            [provider]: model,
          },
        });
      },

      getModelPreference: (provider) => get().modelPreferences[provider] ?? null,

      setSelectedProvider: (provider) => {
        set({ selectedProvider: provider });
        // Load saved model preference or reset
        if (provider) {
          const savedModel = get().modelPreferences[provider];
          set({ selectedModel: savedModel ?? null });
        }
      },

      setSelectedModel: (model) => set({ selectedModel: model }),

      setSelectedMode: (mode) => set({ selectedMode: mode }),

      startAnalysis: () =>
        set({
          status: 'preprocessing',
          error: null,
          progress: { phase: 'Preparing data...', percentage: 10 },
        }),

      setStatus: (status) => set({ status }),

      updateProgress: (phase, percentage) =>
        set({
          progress: { phase, percentage },
        }),

      completeAnalysis: (result) =>
        set({
          status: 'complete',
          result,
          error: null,
          progress: { phase: 'Complete', percentage: 100 },
        }),

      setError: (error) =>
        set({
          status: 'error',
          error,
          progress: { phase: '', percentage: 0 },
        }),

      reset: () =>
        set({
          ...initialState,
          // Preserve provider/model/mode selections
          selectedProvider: get().selectedProvider,
          selectedModel: get().selectedModel,
          selectedMode: get().selectedMode,
        }),

      clearResult: () =>
        set({
          result: null,
          status: 'idle',
          error: null,
          progress: { phase: '', percentage: 0 },
        }),

      clearError: () =>
        set({
          error: null,
          status: 'idle',
        }),

      getCachedResult: (url) => get().resultCache.get(url) ?? null,

      cacheResult: (url, result) => {
        const cache = new Map(get().resultCache);
        cache.set(url, result);
        set({ resultCache: cache });
      },

      clearCache: () => set({ resultCache: new Map() }),
    }),
    {
      name: 'analysis-store',
      partialize: (state) => ({
        modelPreferences: state.modelPreferences,
      }),
    },
  ),
);
