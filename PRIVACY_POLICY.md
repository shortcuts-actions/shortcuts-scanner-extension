# Privacy Policy for Shortcuts Scanner

**Effective Date:** December 29, 2025
**Last Updated:** December 29, 2025
**Version:** 1.0.0

---

## Introduction

Shortcuts Scanner ("the Extension", "we", "our") is a Chrome browser extension that allows users to view, inspect, and analyze Apple Shortcuts from iCloud.com. We are committed to protecting your privacy and being transparent about our data practices.

This Privacy Policy explains what information the Extension collects, how it is used, and your rights regarding that information.

---

## Information We Collect

### Data Stored Locally on Your Device

The Extension stores the following data locally in your browser:

1. **API Keys** (Optional)
   - If you choose to use AI-powered security analysis, you may provide API keys for supported AI providers (OpenAI, Anthropic, OpenRouter)
   - API keys are encrypted using AES-256-GCM encryption with PBKDF2 key derivation (800,000 iterations)
   - Keys are bound to your specific browser installation using device-specific binding
   - Encrypted keys are stored in Chrome's local storage

2. **Model Preferences**
   - Your selected AI provider and model preferences
   - Stored in browser localStorage

3. **Session Settings**
   - Session timeout preferences (5-360 minutes)
   - Device binding configuration
   - Stored in browser localStorage

### Data Stored Temporarily in Memory

1. **Cached Shortcuts**
   - Shortcut data is cached in memory for performance
   - Cache expires after 2 minutes (TTL)
   - Cleared when you close the browser tab

2. **Analysis Results**
   - AI security analysis results are not persisted
   - Stored only in memory during your session
   - Cleared when you close the browser tab

### Data We Do NOT Collect

- **No tracking or analytics** - We do not use Google Analytics, Mixpanel, or any other analytics service
- **No telemetry** - We do not collect usage statistics or crash reports
- **No user identification** - We do not create accounts or track users across sessions
- **No browsing history** - We do not access or store your browsing history
- **No personal information** - We do not collect names, emails, or any personally identifiable information

---

## How We Use Your Information

### Local Data Usage

- **API Keys**: Used solely to authenticate requests to your selected AI provider for security analysis
- **Model Preferences**: Used to remember your preferred AI model settings
- **Session Settings**: Used to configure session timeout and security behavior
- **Cached Shortcuts**: Used to improve performance when viewing the same shortcut multiple times

### Data Transmission

When you use the AI security analysis feature:

1. **Shortcut Content**: The content of the shortcut you are analyzing is sent to your selected AI provider (OpenAI, Anthropic, or OpenRouter) for security analysis
2. **API Keys**: Your API key is transmitted only to the respective AI provider via secure HTTPS connection
3. **No Developer Transmission**: No data is ever sent to the Extension developer or any server we control

---

## Third-Party Services

The Extension integrates with the following third-party services. When you use these services, their respective privacy policies apply:

### AI Providers (Optional - Only if you use AI Analysis)

| Provider | Purpose | Privacy Policy |
|----------|---------|----------------|
| OpenAI | AI-powered security analysis | [openai.com/privacy](https://openai.com/privacy) |
| Anthropic | AI-powered security analysis | [anthropic.com/privacy](https://www.anthropic.com/privacy) |
| OpenRouter | AI-powered security analysis | [openrouter.ai/privacy](https://openrouter.ai/privacy) |

### Apple iCloud (Required for Core Functionality)

| Service | Purpose | Privacy Policy |
|---------|---------|----------------|
| iCloud.com | Fetch shortcut data from iCloud | [apple.com/privacy](https://www.apple.com/privacy/) |

**Important**: We have no control over how these third-party services handle your data. We encourage you to review their privacy policies.

---

## Data Storage and Security

### Encryption

- **Algorithm**: AES-256-GCM authenticated encryption
- **Key Derivation**: PBKDF2 with 800,000 iterations (OWASP 2025 compliant)
- **Device Binding**: HKDF-based binding prevents key extraction to other devices
- **Random Generation**: Cryptographically secure random IVs and salts via Web Crypto API

### Security Measures

- All API communications use HTTPS/TLS encryption
- No data is stored on external servers
- Rate limiting prevents brute-force attacks on encrypted keys
- Session timeouts automatically clear sensitive data from memory
- Password strength validation enforces secure encryption passwords

### Local-Only Storage

All data remains on your device:
- Chrome's `chrome.storage.local` for encrypted API keys
- Browser `localStorage` for preferences
- Browser memory for temporary cache and analysis results

---

## Data Retention

| Data Type | Retention Period | How to Delete |
|-----------|------------------|---------------|
| Encrypted API Keys | Until you manually delete them | Settings > Delete API Key |
| Model Preferences | Until you manually clear them | Clear browser localStorage |
| Session Settings | Until you manually clear them | Clear browser localStorage |
| Cached Shortcuts | 2 minutes (auto-expires) | Close browser tab |
| Analysis Results | Session only | Close browser tab |

---

## Your Rights

You have full control over your data:

### Right to Access
- View your stored preferences in the Extension settings
- All data is stored locally and accessible to you

### Right to Delete
- **Delete API Keys**: Use the Settings panel to delete stored API keys
- **Revoke Device Binding**: Delete and re-encrypt keys to reset device binding
- **Clear All Data**: Uninstall the Extension to remove all stored data

### Right to Portability
- Export shortcut data in multiple formats (JSON, XML, .shortcut)

### Right to Opt-Out
- AI analysis is completely optional
- Core inspection features work without providing any API keys
- No tracking to opt out of (we don't track you)

### No Account Required
- The Extension does not require account creation
- No login, registration, or user identification of any kind

---

## Children's Privacy

The Extension is not directed at children under the age of 13. We do not knowingly collect personal information from children. Since we do not collect any personal information from any users, this policy applies equally to all users regardless of age.

---

## Changes to This Policy

We may update this Privacy Policy from time to time. When we make changes:

1. We will update the "Last Updated" date at the top of this policy
2. We will update the version number
3. For significant changes, we will update the Extension version

We encourage you to review this Privacy Policy periodically for any changes.

---

## Contact Information

If you have questions about this Privacy Policy or the Extension's data practices:

- **GitHub Issues**: [Report an issue](https://github.com/shortcut-actions/shortcuts-inspector-extension/issues)

---

## Additional Information

### Open Source

This Extension is open source under the Apache 2.0 License. You can review the complete source code to verify our privacy practices.

### Manifest V3 Compliance

The Extension is built on Chrome's Manifest V3 platform, which provides enhanced security and privacy protections including:
- Limited background script capabilities
- Stricter Content Security Policy
- Declarative API usage

### Permissions Explanation

| Permission | Why We Need It |
|------------|----------------|
| `sidePanel` | Display the inspection interface |
| `activeTab` | Detect when you're viewing a shortcut on iCloud.com |
| `storage` | Store encrypted API keys locally |
| `alarms` | Handle session timeouts |
| `icloud.com` | Read shortcut data from iCloud |
| `icloud-content.com` | Download shortcut files from iCloud CDN |
| AI Provider URLs | Send shortcuts for AI analysis (optional) |

---

**Shortcuts Scanner** is not affiliated with, endorsed by, or sponsored by Apple Inc. "Apple", "Shortcuts", and "iCloud" are trademarks of Apple Inc.
