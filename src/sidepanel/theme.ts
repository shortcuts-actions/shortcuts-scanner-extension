import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'system',
  useSystemColorMode: true,
};

const theme = extendTheme({
  config,
  styles: {
    global: (props: any) => ({
      body: {
        bg: props.colorMode === 'dark' ? 'gray.900' : 'gray.50',
      },
    }),
  },
  colors: {
    brand: {
      50: '#e3f2fd',
      100: '#bbdefb',
      200: '#90caf9',
      300: '#64b5f6',
      400: '#42a5f5',
      500: '#2196f3',
      600: '#1e88e5',
      700: '#1976d2',
      800: '#1565c0',
      900: '#0d47a1',
    },
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'brand',
      },
    },
    Card: {
      baseStyle: (props: any) => ({
        container: {
          bg: props.colorMode === 'dark' ? 'gray.800' : 'white',
        },
      }),
    },
    Box: {
      baseStyle: (props: any) => ({
        bg: props.colorMode === 'dark' ? 'gray.800' : 'white',
      }),
    },
    Tabs: {
      variants: {
        enclosed: (props: any) => ({
          tab: {
            bg: props.colorMode === 'dark' ? 'gray.800' : 'white',
            borderColor: props.colorMode === 'dark' ? 'gray.700' : 'gray.200',
            color: props.colorMode === 'dark' ? 'gray.300' : 'gray.600',
            _selected: {
              bg: props.colorMode === 'dark' ? 'gray.900' : 'gray.50',
              color: props.colorMode === 'dark' ? 'white' : 'brand.600',
              borderColor: props.colorMode === 'dark' ? 'gray.600' : 'gray.300',
              borderBottomColor: props.colorMode === 'dark' ? 'gray.900' : 'gray.50',
            },
            _hover: {
              bg: props.colorMode === 'dark' ? 'gray.750' : 'gray.100',
            },
          },
          tablist: {
            borderColor: props.colorMode === 'dark' ? 'gray.700' : 'gray.200',
            bg: 'transparent',
          },
          tabpanel: {
            bg: props.colorMode === 'dark' ? 'gray.900' : 'gray.50',
          },
          tabpanels: {
            bg: props.colorMode === 'dark' ? 'gray.900' : 'gray.50',
          },
        }),
      },
    },
    Input: {
      baseStyle: (props: any) => ({
        field: {
          bg: props.colorMode === 'dark' ? 'gray.700' : 'white',
          borderColor: props.colorMode === 'dark' ? 'gray.600' : 'gray.200',
          color: props.colorMode === 'dark' ? 'white' : 'gray.800',
          _placeholder: {
            color: props.colorMode === 'dark' ? 'gray.400' : 'gray.500',
          },
        },
      }),
    },
    Accordion: {
      baseStyle: (props: any) => ({
        container: {
          bg: props.colorMode === 'dark' ? 'gray.800' : 'white',
          borderColor: props.colorMode === 'dark' ? 'gray.700' : 'gray.200',
        },
      }),
    },
  },
});

export default theme;
