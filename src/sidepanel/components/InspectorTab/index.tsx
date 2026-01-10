import { Divider, useColorModeValue, VStack } from '@chakra-ui/react';
import type { ShortcutData, ShortcutMetadata } from '../../../utils/types';
import APIResponseSection from './APIResponseSection';
import RawDataSection from './RawDataSection';

interface InspectorTabProps {
  apiResponse: any;
  data: any;
  shortcutData: ShortcutData;
  metadata: ShortcutMetadata;
}

export default function InspectorTab({
  apiResponse,
  data,
  shortcutData,
  metadata,
}: InspectorTabProps) {
  const dividerColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <VStack spacing={0} align="stretch">
      {apiResponse && <APIResponseSection apiResponse={apiResponse} />}

      <Divider borderColor={dividerColor} />

      <RawDataSection data={data} shortcutData={shortcutData} metadata={metadata} />
    </VStack>
  );
}
