import { Divider, useColorModeValue, VStack } from '@chakra-ui/react';
import type { ShortcutMetadata } from '../../../utils/types';
import APIResponseSection from './APIResponseSection';
import RawDataSection from './RawDataSection';

interface InspectorTabProps {
  apiResponse: any;
  data: any;
  metadata: ShortcutMetadata;
}

export default function InspectorTab({ apiResponse, data, metadata }: InspectorTabProps) {
  const dividerColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <VStack spacing={0} align="stretch">
      {apiResponse && <APIResponseSection apiResponse={apiResponse} />}

      <Divider borderColor={dividerColor} />

      <RawDataSection data={data} metadata={metadata} />
    </VStack>
  );
}
