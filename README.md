# Shortcuts Scanner

Shortcuts Scanner is a Chrome extension that allows you to view, inspect, download and perform AI-powered security analysis for Apple Shortcuts directly from iCloud.com.

## Features

- **Automatic Detection**: Automatically detects when you're viewing an Apple Shortcut on iCloud.com
- **Side Panel Interface**: Clean, modern side panel UI built with React and Chakra UI
- **Multiple Views**:
  - **Overview**: View metadata, general information, shortcut URL with visual icon and color previews
  - **Actions**: Browse all actions with search, expand/collapse all functionality
  - **Scanner**: AI-powered security scanner & analysis with risk assessment and recommendations
  - **API Response**: View the raw iCloud API response data
  - **Raw XML**: View and download the shortcut in XML plist format
  - **Raw JSON**: View and download the shortcut in JSON format
- **Download Options**: Download as `.shortcut`, XML, or JSON from the header
- **Visual Previews**: See actual icon images and color swatches in the Overview tab
- **Search**: Search through actions, XML, JSON, and API response content
- **Copy to Clipboard**: Easy copy for URLs and code snippets

## AI Security Analysis

The extension includes a powerful AI-powered security analysis feature that helps you understand potential risks before installing a shortcut.

### Supported AI Providers

- **OpenAI** (GPT-4o, GPT-4o Mini, GPT-4 Turbo)
- **Anthropic** (Claude Sonnet 4.5, Claude Opus 4.5, Claude 4.5 Haiku)
- **OpenRouter** (Models above, Gemini 2.0 Flash, DeepSeek v3.2, Qwen3 Max and Llama 3.1)

### Analysis Modes

- **Quick Scan**: Fast initial assessment. Provides a quick risk overview and top concerns.
- **Standard Analysis**: Comprehensive review. Detailed findings, data flow analysis, and recommendations.
- **Deep Analysis**: Thorough security audit. Includes adversarial analysis, obfuscation detection, and trust chain review.

### What It Analyzes

- **Purpose Analysis**: Compares what the shortcut claims to do vs. what it actually does
- **Data Flow Tracking**: Maps how data moves from sources (clipboard, files, user input) to destinations (network, files)
- **External Connections**: Identifies all URLs and network calls with reputation assessment
- **Permission Analysis**: Reviews required permissions and flags potentially unnecessary access
- **Red Flags**: Detects suspicious patterns like path traversal, hardcoded API keys, or obfuscation
- **Positive Indicators**: Highlights legitimate patterns that suggest safe behavior

### Security & Privacy

Your API keys are encrypted locally using AES-256-GCM with PBKDF2 key derivation (800,000 iterations). Keys are bound to your browser installation and cannot be extracted. They are never sent anywhere except to the AI provider you select for analysis.

### Setup

1. Open Settings (gear icon in the top-right)
2. Add your API key for your preferred provider
3. Create a strong encryption password
4. Select your preferred model for analysis
5. Navigate to any shortcut and click the "Analysis" tab
6. Click "Run Security Analysis"

## Tech Stack

- **TypeScript** - Type-safe development
- **React 18** - UI framework
- **Chakra UI** - Component library
- **Zustand** - State management with persistence
- **Vite** - Build tool
- **@plist/parse** - Binary plist parsing
- **Chrome Extension Manifest V3** - Modern extension API
- **Web Crypto API** - AES-256-GCM encryption for API keys

## Installation

### For Development

1. **Clone the repository**:
   ```bash
   cd /shortcuts-scanner-extension
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the extension**:
   ```bash
   npm run build
   ```

4. **Load in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `dist` folder from this project

### For Development with Hot Reload

```bash
npm run dev
```

Then load the `dist` folder as an unpacked extension. The extension will rebuild automatically when you make changes.

## Usage

1. **Navigate to an iCloud Shortcut**:
   - Go to any shortcut on iCloud.com (e.g., `https://www.icloud.com/shortcuts/abc123...`)

2. **Open the Side Panel**:
   - The side panel should open automatically when a shortcut is detected
   - Or click the extension icon in the toolbar to manually open it

3. **Explore the Shortcut**:
   - **Overview Tab**: See general info like action count, client version, etc.
   - **Actions Tab**: Browse all actions with search and expandable details
   - **Raw XML Tab**: View the complete XML plist format
   - **Raw JSON Tab**: View the complete JSON format

4. **Download or Copy**:
   - Use the download buttons to save XML or JSON files
   - Use the copy button to copy content to clipboard


## How It Works

1. **Content Script Detection**: When you visit `iCloud.com/shortcuts/*`, the content script detects the shortcut URL and notifies the background service worker.

2. **Side Panel Opens**: The background worker opens the side panel and sends the shortcut URL.

3. **Fetching Data**: The side panel:
   - Converts the iCloud URL to the API endpoint
   - Fetches shortcut metadata from the iCloud API
   - Downloads the unsigned binary plist file
   - Parses the binary plist using `@plist/parse`

4. **Display**: The parsed data is displayed in a user-friendly interface with multiple tabs for different views.

5. **Export**: Users can download or copy the data in XML or JSON format.

## API Reference

### iCloud Shortcuts API

The extension uses the unofficial iCloud Shortcuts API:

```
Endpoint: https://www.icloud.com/shortcuts/api/records/{shortcut_id}
```

This returns metadata including:
- Shortcut name
- Icon URL
- Download URL for the unsigned binary plist
- Signing status

## Development

### Type Checking

```bash
npm run type-check
```

### Testing

The project uses [Vitest](https://vitest.dev/) for unit testing with comprehensive coverage of services, hooks, stores, and components.

#### Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests once (CI mode)
npm run test:run

# Run tests with coverage report
npm run test:coverage

# Open Vitest UI for visual test debugging
npm run test:ui
```

#### Test Infrastructure

- **Test Runner**: Vitest with happy-dom environment
- **Component Testing**: @testing-library/react for React components
- **Chrome API Mocking**: Custom mocks for chrome.storage, chrome.runtime, chrome.alarms
- **Crypto Testing**: @peculiar/webcrypto polyfill for Web Crypto API
- **API Mocking**: MSW (Mock Service Worker) for LLM API calls
- **Test Data**: Faker.js factories for generating test data

#### Coverage Targets

- **Overall**: 80% lines, functions, and statements
- **Critical Security Services**: 95%+ coverage
  - crypto.service.ts (AES-256-GCM encryption)
  - secure-storage.service.ts (Chrome storage with encryption)
  - device-binding.service.ts (Device-specific binding)
  - api-key-manager.service.ts (Key lifecycle management)

#### Writing Tests

Tests are co-located with source files:
```
src/services/crypto.service.ts
src/services/crypto.service.test.ts  ← Test file
```

Example test structure:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { encrypt, decrypt } from './crypto.service';

describe('CryptoService', () => {
  it('should encrypt and decrypt data successfully', async () => {
    const plaintext = 'secret-data';
    const password = 'SecurePassword123!';

    const encrypted = await encrypt(plaintext, password);
    const decrypted = await decrypt(encrypted, password);

    expect(decrypted).toBe(plaintext);
  });
});
```

### Building for Production

```bash
npm run build
```

The built extension will be in the `dist/` folder.

**Note**: The build script runs linting, type checking, and code quality checks before building. If you encounter errors during the build:

- **Linting errors**: Run `npm run lint:fix` to automatically fix linting issues
- **Code quality errors**: Run `npm run check:fix` to automatically fix formatting and code quality issues
- **Fix all errors**: Run `npm run fix`
- **Type errors**: These must be fixed manually - check the output from `npm run type-check`

After fixing issues, run `npm run build` again.

## Known Limitations

- Requires the shortcut to be publicly accessible on iCloud.com
- Does not support converting XML back to binary plist

## Troubleshooting

### Side Panel Doesn't Open

- Make sure you're on a valid shortcut URL: `https://www.icloud.com/shortcuts/[id]`
- Try clicking the extension icon manually
- Check the browser console for errors

### "Failed to fetch shortcut" Error

- The shortcut may be private or not publicly accessible
- The iCloud API may be temporarily unavailable
- Network issues may prevent fetching

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Security
For more technical security implementation see [SECURITY](SECURITY) for details.

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for details.


Made with ❤️ by [Shortcut Actions](https://www.shortcutactions.com)

Download [AI & Automation Actions For Apple Shortcuts](https://apps.apple.com/us/app/ai-automation-for-shortcuts/id6756338677)
[![Download AI & Automation Actions For Shortcuts on the App Store](https://img.shields.io/badge/Download-App%20Store-blue)](https://apps.apple.com/us/app/ai-automation-for-shortcuts/id6756338677)