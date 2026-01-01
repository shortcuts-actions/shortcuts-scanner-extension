import { ChakraProvider } from '@chakra-ui/react';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import theme from '../../sidepanel/theme';

/**
 * Render a React component with Chakra UI provider
 */
export function renderWithProviders(ui: ReactElement) {
  return render(<ChakraProvider theme={theme}>{ui}</ChakraProvider>);
}
