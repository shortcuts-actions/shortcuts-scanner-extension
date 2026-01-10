import { ChakraProvider } from '@chakra-ui/react';
import { type RenderOptions, render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { vi } from 'vitest';
import { PreviewProvider } from '../../sidepanel/components/PreviewTab/context/PreviewContext';
import type { PreviewContextValue } from '../../sidepanel/components/PreviewTab/types';

/**
 * Render a component with ChakraProvider wrapper
 */
export function renderWithChakra(ui: ReactElement, options?: RenderOptions) {
  return render(<ChakraProvider>{ui}</ChakraProvider>, options);
}

/**
 * Create a mock PreviewContextValue
 */
export function createMockPreviewContext(): PreviewContextValue {
  return {
    registerAction: vi.fn(),
    scrollToAction: vi.fn(),
    getActionByUUID: vi.fn(),
  };
}

/**
 * Render a component with PreviewProvider wrapper
 */
export function renderWithPreviewContext(ui: ReactElement, options?: RenderOptions) {
  return render(<PreviewProvider>{ui}</PreviewProvider>, options);
}

/**
 * Render a component with both ChakraProvider and PreviewProvider
 */
export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  return render(
    <ChakraProvider>
      <PreviewProvider>{ui}</PreviewProvider>
    </ChakraProvider>,
    options,
  );
}
