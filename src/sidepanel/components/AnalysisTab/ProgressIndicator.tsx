// Progress indicator during analysis

import {
  Box,
  CircularProgress,
  CircularProgressLabel,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react';
import type { AnalysisProgress } from '../../../utils/analysis-types';

interface ProgressIndicatorProps {
  progress: AnalysisProgress;
}

export default function ProgressIndicator({ progress }: ProgressIndicatorProps) {
  const textColor = useColorModeValue('gray.600', 'gray.400');

  return (
    <Box py={8}>
      <VStack spacing={4}>
        <CircularProgress
          value={progress.percentage}
          size="80px"
          thickness="8px"
          color="brand.500"
          trackColor={useColorModeValue('gray.200', 'gray.700')}
        >
          <CircularProgressLabel fontSize="sm" fontWeight="bold">
            {progress.percentage}%
          </CircularProgressLabel>
        </CircularProgress>

        <Text fontSize="sm" color={textColor} textAlign="center">
          {progress.phase || 'Preparing...'}
        </Text>
      </VStack>
    </Box>
  );
}
