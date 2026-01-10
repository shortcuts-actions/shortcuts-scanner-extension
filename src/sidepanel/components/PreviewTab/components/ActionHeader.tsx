import { Box, HStack, Icon, Text, useColorModeValue } from '@chakra-ui/react';
import {
  FiAlertCircle,
  FiBattery,
  FiBell,
  FiBluetooth,
  FiBook,
  FiCalendar,
  FiClock,
  FiCode,
  FiCopy,
  FiDivide,
  FiDownload,
  FiEdit3,
  FiExternalLink,
  FiEye,
  FiFileText,
  FiFolder,
  FiGitBranch,
  FiGlobe,
  FiHash,
  FiHeart,
  FiHome,
  FiImage,
  FiLayers,
  FiList,
  FiMail,
  FiMap,
  FiMessageSquare,
  FiMinus,
  FiPercent,
  FiPhone,
  FiPlay,
  FiPlus,
  FiRepeat,
  FiSearch,
  FiSettings,
  FiSmartphone,
  FiStopCircle,
  FiSun,
  FiTrash2,
  FiType,
  FiUpload,
  FiUser,
  FiVolume2,
  FiWifi,
  FiX,
  FiZap,
} from 'react-icons/fi';
import type { ActionColor } from '../types';
import { getActionColorScheme } from '../utils/colorUtils';

interface ActionHeaderProps {
  title: string;
  icon?: string;
  color?: ActionColor;
  children?: React.ReactNode;
}

// Icon mapping
const ICON_MAP: Record<string, typeof FiFileText> = {
  // Text
  doc_text: FiFileText,
  text_alignleft: FiType,
  'icon-text_alignleft': FiType,
  textformat_abc: FiHash,
  // Variables
  f_cursive: FiHash,
  f_cursive_circle: FiPercent,
  // Control flow
  arrow_branch: FiGitBranch,
  arrow_2_squarepath: FiRepeat,
  arrow_2_circlepath_circle_fill: FiRepeat,
  square_list: FiList,
  square_list_fill: FiList,
  // Alerts & notifications
  plus_bubble_fill: FiMessageSquare,
  text_bubble: FiMessageSquare,
  exclamationmark_bubble: FiAlertCircle,
  bell_fill: FiBell,
  // Actions
  play_fill: FiPlay,
  stop_fill: FiStopCircle,
  timer: FiClock,
  clock: FiClock,
  // Web
  globe: FiGlobe,
  square_arrow_down: FiDownload,
  square_arrow_up: FiUpload,
  link: FiExternalLink,
  safari: FiGlobe,
  // Files
  doc_fill: FiFileText,
  folder_fill: FiFolder,
  folder_fill_badge_plus: FiFolder,
  trash_fill: FiTrash2,
  doc_on_clipboard: FiCopy,
  doc_on_doc_fill: FiCopy,
  // Settings
  gear: FiSettings,
  wifi: FiWifi,
  antenna_radiowaves_left_right: FiBluetooth,
  speaker_wave_2_fill: FiVolume2,
  sun_max_fill: FiSun,
  battery_100: FiBattery,
  desktopcomputer: FiSmartphone,
  airplane: FiZap,
  // Data
  book_fill: FiBook,
  sum: FiPlus,
  number: FiHash,
  hexagon_fill: FiCode,
  // Lists
  list_bullet: FiList,
  checklist: FiList,
  // Media
  photo_fill: FiImage,
  camera_fill: FiImage,
  eye_fill: FiEye,
  pencil: FiEdit3,
  // Special
  layers_fill: FiLayers,
  calendar: FiCalendar,
  location_fill: FiMap,
  envelope_fill: FiMail,
  phone_fill: FiPhone,
  wand_stars: FiZap,
  sparkles: FiZap,
  // Math
  plus: FiPlus,
  minus: FiMinus,
  multiply: FiX,
  divide: FiDivide,
  // Search
  magnifyingglass: FiSearch,
  // Home
  house_fill: FiHome,
  // Contacts
  person_fill: FiUser,
  // Health
  heart_fill: FiHeart,
  // Map (alternate)
  map: FiMap,
  // Default
  square_grid_2x2: FiSettings,
};

function getIconComponent(iconName?: string): typeof FiFileText {
  if (!iconName) return FiSettings;
  return ICON_MAP[iconName] || FiSettings;
}

export function ActionHeader({ title, icon, color, children }: ActionHeaderProps) {
  const colorScheme = getActionColorScheme(color);

  const iconBg = useColorModeValue(`${colorScheme}.500`, `${colorScheme}.600`);
  const titleColor = useColorModeValue('gray.700', 'gray.200');

  const IconComponent = getIconComponent(icon);

  return (
    <HStack spacing={3} align="flex-start" flexWrap="wrap">
      {/* Icon */}
      <Box
        bg={iconBg}
        color="white"
        borderRadius="md"
        p={1.5}
        display="flex"
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
      >
        <Icon as={IconComponent} boxSize={4} />
      </Box>

      {/* Title and inline values */}
      <HStack spacing={2} flex={1} flexWrap="wrap" alignItems="flex-start" minH="28px">
        <Text
          fontWeight="semibold"
          fontSize="sm"
          color={titleColor}
          flexShrink={0}
          lineHeight="28px"
        >
          {title}
        </Text>
        {children}
      </HStack>
    </HStack>
  );
}
