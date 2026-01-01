import type { ChromeMessage } from '../utils/types';

/**
 * Content script that runs on iCloud.com/shortcuts/* pages
 * Detects shortcut pages and communicates with the side panel
 */

let currentShortcutUrl: string | null = null;

/**
 * Extracts the shortcut URL from the current page
 */
function extractShortcutUrl(): string | null {
  const url = window.location.href;
  const match = url.match(/icloud\.com\/shortcuts\/([a-zA-Z0-9]+)/);
  return match ? url : null;
}

/**
 * Checks if we're on a shortcut detail page
 */
function isOnShortcutPage(): boolean {
  const url = window.location.href;
  return /icloud\.com\/shortcuts\/[a-zA-Z0-9]+/.test(url);
}

/**
 * Notifies the background script and side panel that a shortcut was detected
 * Includes retry logic to handle service worker startup delays
 */
async function notifyShortcutDetected(url: string): Promise<void> {
  const message: ChromeMessage = {
    type: 'SHORTCUT_DETECTED',
    payload: { url },
  };

  // Retry configuration
  const maxRetries = 3;
  const baseDelay = 100; // milliseconds

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await chrome.runtime.sendMessage(message);
      return;
    } catch (error) {
      const isLastAttempt = attempt === maxRetries - 1;

      if (error instanceof Error && error.message.includes('Receiving end does not exist')) {
        if (isLastAttempt) {
          // Expected if sidepanel isn't open - message will be delivered when it opens
          return;
        } else {
          // Wait before retrying with exponential backoff
          const delay = baseDelay * 2 ** attempt;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      } else {
        // Different error, log and stop retrying
        console.error('Failed to send message:', error);
        return;
      }
    }
  }
}

/**
 * Checks the current page and notifies if a shortcut is detected
 */
function checkForShortcut(): void {
  if (isOnShortcutPage()) {
    const url = extractShortcutUrl();
    if (url && url !== currentShortcutUrl) {
      currentShortcutUrl = url;
      notifyShortcutDetected(url);
    }
  } else {
    currentShortcutUrl = null;
  }
}

/**
 * Observes URL changes (for SPA navigation)
 */
function observeUrlChanges(): void {
  let lastUrl = location.href;

  new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      checkForShortcut();
    }
  }).observe(document.body, {
    subtree: true,
    childList: true,
  });
}

/**
 * Initialize the content script
 */
function init(): void {
  // Check immediately
  checkForShortcut();

  // Observe URL changes
  observeUrlChanges();

  // Also check on page load events
  window.addEventListener('load', checkForShortcut);

  // Listen for popstate events (back/forward navigation)
  window.addEventListener('popstate', checkForShortcut);
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Listen for messages from side panel requesting shortcut data
chrome.runtime.onMessage.addListener((message: ChromeMessage, _sender, sendResponse) => {
  if (message.type === 'FETCH_SHORTCUT') {
    const url = extractShortcutUrl();
    if (url) {
      sendResponse({ url });
    } else {
      sendResponse({ error: 'Not on a shortcut page' });
    }
    return true; // Will respond asynchronously
  }
});
