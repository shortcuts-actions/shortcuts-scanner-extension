import { SECURITY_CONFIG } from '../config/security.config';
import type { SessionSettings } from '../config/session-settings';
import { sessionCacheService } from '../services/session-cache.service';

const { storageKeys } = SECURITY_CONFIG;

// Enable side panel to open when extension icon is clicked
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('Failed to set panel behavior:', error));

/**
 * Initialize security settings on extension install/update
 */
chrome.runtime.onInstalled.addListener(async () => {
  // Set session storage access level to TRUSTED_CONTEXTS only
  await sessionCacheService.initialize();
});

/**
 * Re-initialize on browser startup
 */
chrome.runtime.onStartup.addListener(async () => {
  await sessionCacheService.initialize();
});

/**
 * Handle session timeout alarm
 * Uses chrome.alarms for reliable timing across service worker restarts
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'session-timeout') {
    await sessionCacheService.handleSessionTimeout();
  }
});

/**
 * SECURITY: Block ALL external messages from other extensions
 * No API key operations should be externally accessible
 */
chrome.runtime.onMessageExternal?.addListener((_message, _sender, sendResponse) => {
  console.warn('Blocked external message attempt');
  sendResponse({ error: 'External messaging not supported' });
  return false;
});

/**
 * SECURITY: Block external connection attempts from other extensions
 */
chrome.runtime.onConnectExternal?.addListener((port) => {
  console.warn('Blocked external connect attempt');
  port.disconnect();
});

/**
 * Clear session cache on extension suspend (optional extra security)
 */
chrome.runtime.onSuspend?.addListener(async () => {
  await sessionCacheService.clearAllCachedKeys();
});

/**
 * Listen for session settings changes
 * Handles persistence toggle and timer updates
 */
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === 'local' && changes[storageKeys.sessionSettings]) {
    const oldSettings = changes[storageKeys.sessionSettings].oldValue as
      | SessionSettings
      | undefined;
    const newSettings = changes[storageKeys.sessionSettings].newValue as
      | SessionSettings
      | undefined;

    // Clear settings cache in session service
    sessionCacheService.clearSettingsCache();

    // If persistence was disabled, clear persisted session key and all cached keys
    if (oldSettings?.persistSession && !newSettings?.persistSession) {
      await sessionCacheService.clearPersistedSessionKey();
      await sessionCacheService.clearAllCachedKeys();
    }

    // Update inactivity timer with new settings
    await sessionCacheService.updateInactivityTimer();
  }
});

// Listen for tab activation (user switches tabs)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    // Get the active tab's URL
    const tab = await chrome.tabs.get(activeInfo.tabId);

    if (!tab.url) {
      console.warn('Tab has no URL');
      return;
    }

    // Check if it's a shortcut page
    const isShortcutPage = /icloud\.com\/shortcuts\/[a-zA-Z0-9]+/.test(tab.url);

    // Notify sidepanel about tab change
    chrome.runtime
      .sendMessage({
        type: 'TAB_CHANGED',
        payload: {
          tabId: activeInfo.tabId,
          url: tab.url,
          isShortcutPage,
        },
      })
      .catch((error) => {
        // Sidepanel might not be open, ignore error
        console.log('Failed to send TAB_CHANGED message (sidepanel may not be open):', error);
      });
  } catch (error) {
    console.error('Error handling tab activation:', error);
  }
});

// Listen for tab URL updates (user navigates within same tab)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only care about URL changes in the active tab
  if (changeInfo.url && tab.active) {
    const isShortcutPage = /icloud\.com\/shortcuts\/[a-zA-Z0-9]+/.test(changeInfo.url);

    chrome.runtime
      .sendMessage({
        type: 'TAB_CHANGED',
        payload: {
          tabId,
          url: changeInfo.url,
          isShortcutPage,
        },
      })
      .catch((error) => {
        console.log('Failed to send TAB_CHANGED message:', error);
      });
  }
});
