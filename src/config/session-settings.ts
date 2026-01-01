// Session settings configuration for API key storage
// Controls session persistence and timeout behavior

export interface SessionSettings {
  persistSession: boolean; // Keep session active when panel closes
  sessionExpiryMinutes: number; // How long before cached keys expire
  inactivityTimeoutMinutes: number; // Auto-lock after inactivity
}

export const DEFAULT_SESSION_SETTINGS: SessionSettings = {
  persistSession: false, // Default: require password each time (most secure)
  sessionExpiryMinutes: 30, // Default: 30 minutes
  inactivityTimeoutMinutes: 15, // Default: 15 minutes
};

export const SESSION_LIMITS = {
  // Session expiry limits
  maxExpiryMinutes: 360, // 6 hours maximum
  minExpiryMinutes: 5, // 5 minutes minimum
  warningThresholdMinutes: 360, // Show warning at 6 hours

  // Inactivity timeout limits
  maxInactivityMinutes: 60, // 1 hour maximum
  minInactivityMinutes: 5, // 5 minutes minimum
} as const;

// Slider marks for session expiry (5 min to 6 hours)
export const SESSION_EXPIRY_MARKS = [
  { value: 5, label: '5m' },
  { value: 30, label: '30m' },
  { value: 60, label: '1h' },
  { value: 120, label: '2h' },
  { value: 240, label: '4h' },
  { value: 360, label: '6h' },
];

// Slider marks for inactivity timeout (5 min to 60 min)
export const INACTIVITY_TIMEOUT_MARKS = [
  { value: 5, label: '5m' },
  { value: 15, label: '15m' },
  { value: 30, label: '30m' },
  { value: 45, label: '45m' },
  { value: 60, label: '60m' },
];

/**
 * Formats minutes into a human-readable string
 * e.g., 90 -> "1 hour 30 minutes", 30 -> "30 minutes"
 */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }

  return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
}
