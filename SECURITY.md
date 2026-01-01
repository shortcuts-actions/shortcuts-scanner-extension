# Security Documentation

## API Key Storage Architecture

This extension implements a multi-layered security system for storing sensitive API keys (OpenAI, Anthropic, OpenRouter) using industry best practices and OWASP 2024/2025 guidelines.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface                           │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Key Manager                            │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐     │
│  │  Password   │  │    Rate      │  │    API Key          │     │
│  │  Validator  │  │   Limiter    │  │    Validator        │     │
│  └─────────────┘  └──────────────┘  └─────────────────────┘     │
└─────────────────────────────┬───────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
┌───────────────────┐ ┌─────────────┐ ┌─────────────────────┐
│  Crypto Service   │ │   Device    │ │   Session Cache     │
│  (AES-GCM +       │ │   Binding   │ │   (chrome.storage   │
│   PBKDF2 800k)    │ │   Service   │ │    .session)        │
└─────────┬─────────┘ └──────┬──────┘ └─────────────────────┘
          │                  │
          ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│              Secure Storage (chrome.storage.local)              │
│                    [Encrypted API Keys]                         │
└─────────────────────────────────────────────────────────────────┘
```

## Security Layers

### Layer 1: Encryption at Rest
- **Algorithm**: AES-256-GCM (Authenticated Encryption)
- **Key Derivation**: PBKDF2 with 800,000 iterations (OWASP 2025 standard)
- **Hash Function**: SHA-256
- **IV (Initialization Vector)**: 96 bits, randomly generated per encryption
- **Salt**: 256 bits (32 bytes), randomly generated per key
- **Authentication Tag**: 128 bits for integrity verification

### Layer 2: Device Binding
- **Purpose**: Prevents encrypted keys from being copied to other machines or extension installations
- **Implementation**: Uses HKDF (HMAC-based Key Derivation Function) to combine:
  - User-provided password
  - Extension ID (unique per installation)
  - Randomly generated device salt (stored locally)
- **Result**: Encrypted keys become device-specific and cannot be decrypted on different installations

### Layer 3: Rate Limiting
- **Max Attempts**: 5 failed password attempts
- **Lockout Strategy**: Exponential backoff
  - 1st lockout: 30 seconds
  - 2nd lockout: 60 seconds
  - 3rd lockout: 120 seconds
  - Maximum lockout: 1 hour
- **Attack Window**: 15 minutes
- **Storage**: Rate limit state stored in `chrome.storage.session` (cleared on browser close)

### Layer 4: Session Caching
- **Cache Duration**: User-configurable from 5 minutes to 6 hours (default: 30 minutes)
- **Inactivity Timeout**: User-configurable from 5 to 60 minutes (default: 15 minutes)
- **Session Persistence**: Optional setting to keep session active when sidepanel closes (default: disabled)
- **Storage**: `chrome.storage.session` (memory-only, cleared on browser close)
- **Access Level**: `TRUSTED_CONTEXTS` (not accessible to content scripts)
- **Additional Protection**: Cached keys are encrypted with an ephemeral runtime key to mitigate `onChanged` listener leak vulnerabilities
- **Persistence Protection**: When session persistence is enabled, the ephemeral key is encrypted with HKDF-derived key (protector + extension ID) and stored in session storage

### Layer 5: Password Requirements
- **Minimum Length**: 12 characters
- **Complexity**: At least 3 of 4 character types (uppercase, lowercase, numbers, special)
- **Validation**:
  - Common password rejection (dictionary check)
  - Sequential pattern detection (e.g., "abcd", "1234")
  - Excessive character repetition detection (e.g., "aaaa")
- **Entropy**: Minimum 72 bits recommended for API key protection

## Security Features

### Timing Attack Protection
All decryption operations enforce a minimum execution time of 400ms to prevent timing-based password guessing attacks, even when keys don't exist.

### Error Message Safety
Error messages are designed to never leak sensitive information:
- No distinction between "key not found" and "wrong password" timing
- Generic error codes instead of detailed failure reasons
- No API key content in logs or error messages

### External Communication Blocking
- All external messages from other extensions are blocked via `onMessageExternal`
- All external connections are blocked via `onConnectExternal`
- API key operations are never exposed externally

### Session Management
- Uses `chrome.alarms` API for reliable timeout handling (survives service worker restarts)
- Automatic session clearing on extension suspend
- SESSION_LOCKED messages notify UI when timeout occurs
- **Configurable Settings**:
  - Session expiry: 5 minutes to 6 hours (with security warning at maximum)
  - Inactivity timeout: 5 to 60 minutes
  - Session persistence toggle for convenience vs. security trade-off
- **Validation Enforcement**: Settings limits are enforced at multiple levels:
  - UI validation (prevents selection beyond limits)
  - Storage validation (sanitizes on save)
  - Retrieval validation (clamps on read - defense against HTML injection attacks)

### Device Reinstallation Handling
- Orphaned key detection after extension reinstallation
- User warnings about unrecoverable keys
- Cleanup utilities for removing orphaned data

## Password Security

### Validation Rules
1. **Length**: 12-128 characters
2. **Character Types**: Must contain at least 3 of:
   - Uppercase letters (A-Z)
   - Lowercase letters (a-z)
   - Numbers (0-9)
   - Special characters (!@#$%^&*)
3. **Quality Checks**:
   - Not in common password list
   - No more than 3 consecutive identical characters
   - No sequential patterns (keyboard walks, alphabetical sequences)

### Password Strength Scoring
- **Weak** (0-29): Does not meet minimum requirements
- **Fair** (30-49): Meets minimum but could be stronger
- **Good** (50-69): Strong password
- **Strong** (70-100): Excellent password

### Entropy Calculation
Password entropy is calculated as: `log2(charset_size^length)`
- Recommended minimum: 72 bits for protecting API keys
- Displayed to users for education

## API Key Validation

### Supported Providers
1. **OpenAI**:
   - Formats: `sk-*`, `sk-proj-*`, `sk-svcacct-*`
   - Validation: Regex pattern matching
2. **Anthropic**:
   - Format: `sk-ant-*`
   - Validation: Strict pattern matching
3. **OpenRouter**:
   - Format: `sk-or-v1-*`
   - Validation: 64-character suffix verification

### Validation Process
1. Trim whitespace
2. Check for invalid characters (spaces, newlines)
3. Validate against provider-specific regex patterns
4. Sanitize for safe storage

### Display Masking
API keys are masked when displayed: `sk-pro********abc1`
- Shows first 6 characters
- Shows last 4 characters
- Masks middle with 8 asterisks

## Content Security Policy

The extension enforces strict CSP to prevent injection attacks:

```
script-src 'self';              // Only allow scripts from extension
object-src 'none';              // Block plugins
base-uri 'none';                // Prevent base tag hijacking
connect-src 'self' [APIs];      // Restrict network requests
form-action 'none';             // Prevent form submissions
frame-ancestors 'none';         // Prevent framing
```

## Cryptographic Implementation Details

### Encryption Process
1. Generate random 256-bit salt
2. Generate random 96-bit IV
3. Derive encryption key using PBKDF2:
   - Input: compound password (user password + device secret)
   - Salt: random salt
   - Iterations: 800,000
   - Hash: SHA-256
   - Output: 256-bit AES key
4. Encrypt plaintext using AES-256-GCM
5. Combine: `salt || iv || ciphertext || auth_tag`
6. Encode as base64 for storage

### Decryption Process
1. Decode base64 ciphertext
2. Extract: salt, IV, ciphertext, auth tag
3. Derive decryption key using same PBKDF2 parameters
4. Decrypt and verify authentication tag
5. Return plaintext or throw DECRYPTION_ERROR

### Key Derivation (HKDF)
Used for device binding and compound password creation:
- **Input Key Material**: User password or extension ID
- **Salt**: Device-specific random salt or device secret
- **Info**: Context-specific string (e.g., "compound-password-v2")
- **Output**: Derived key material

## Threat Model & Mitigations

### Threat: Brute Force Password Attack
**Mitigation**:
- 800,000 PBKDF2 iterations (computationally expensive)
- Rate limiting with exponential backoff
- Account lockout after 5 attempts

### Threat: Timing Attacks
**Mitigation**:
- Minimum 400ms operation time for all decryption attempts
- Constant-time comparisons where possible
- PBKDF2 naturally normalizes timing

### Threat: Key Extraction (Physical Access)
**Mitigation**:
- Device binding prevents cross-machine usage
- Keys never stored in plaintext
- Session cache cleared on browser close

### Threat: Extension Reinstallation
**Mitigation**:
- New device salt generated on reinstall
- Old keys become unrecoverable (by design)
- User warnings about data loss

### Threat: Content Script Injection
**Mitigation**:
- Session storage set to TRUSTED_CONTEXTS only
- External messaging blocked
- Strict CSP prevents code injection

### Threat: Session Settings Tampering (HTML Injection)
**Mitigation**:
- All session settings values are validated and clamped at multiple levels
- Maximum limits strictly enforced regardless of stored values
- Settings are sanitized on both save AND retrieval (defense in depth)
- UI prevents selection of values outside allowed ranges

### Threat: Memory Forensics
**Limitation**: JavaScript cannot guarantee secure memory clearing
**Mitigation**:
- Minimize time secrets exist in memory
- Use typed arrays (Uint8Array) where possible
- Best-effort secure wipe with random overwrite

### Threat: Man-in-the-Middle (API Calls)
**Mitigation**:
- All API endpoints use HTTPS (enforced by CSP)
- Host permissions restricted to specific domains

## Compliance & Standards

This implementation follows:
- **OWASP 2024/2025** cryptographic recommendations
- **NIST SP 800-132** password-based key derivation guidelines
- **Chrome Extension MV3** security best practices
- **OWASP Top 10** vulnerability prevention

## Security Audit Checklist

- [x] AES-256-GCM with 128-bit authentication tag
- [x] PBKDF2 with 800,000 iterations
- [x] Random IV generation (96 bits)
- [x] Random salt generation (256 bits)
- [x] HKDF for device binding
- [x] Rate limiting with exponential backoff
- [x] Session timeout (configurable: 5 min to 6 hours, default 30 min)
- [x] Inactivity timeout (configurable: 5 to 60 min, default 15 min)
- [x] Session persistence with encrypted key storage
- [x] Multi-level validation enforcement (UI, storage, retrieval)
- [x] 6-hour maximum limit with security warning
- [x] Password strength validation
- [x] Common password rejection
- [x] Timing attack protection
- [x] External message blocking
- [x] Strict Content Security Policy
- [x] TRUSTED_CONTEXTS session storage
- [x] Ephemeral session key encryption
- [x] Chrome alarms for timeout persistence

## Known Limitations

1. **JavaScript Memory**: Cannot guarantee secure memory clearing due to language limitations. Garbage collector may leave traces of decrypted keys in memory.

2. **Browser Extensions**: Extension storage can be accessed by users with physical access to the machine through browser developer tools (though keys are encrypted).

3. **Key Recovery**: If a user forgets their password, there is no recovery mechanism. This is by design - no backdoors.

4. **Device Reinstall**: Reinstalling the extension makes old encrypted keys permanently unrecoverable.

5. **Session Persistence Trade-off**: When session persistence is enabled, the ephemeral session key is stored (encrypted) in session storage rather than memory-only. While still protected by encryption and device binding, this slightly reduces security in exchange for convenience. Users who require maximum security should leave session persistence disabled.

## Reporting Security Issues

If you discover a security vulnerability in this implementation, please report it via:
- GitHub Security Advisories
- Email: [Your security contact]

**Please do not disclose security issues publicly until they have been addressed.**

## Version History

- **v2.1**: Session Settings Update
  - Configurable session expiry (5 min to 6 hours)
  - Configurable inactivity timeout (5 to 60 min)
  - Optional session persistence across sidepanel close/open
  - Multi-level validation enforcement for settings
  - Security warning at 6-hour maximum
  - HKDF-encrypted session key persistence

- **v2**: Base implementation
  - PBKDF2 iterations: 800,000
  - Ephemeral session key encryption
  - Device binding v2
  - Timing attack protection

## References

- [OWASP Key Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html)
- [NIST SP 800-132: Recommendation for Password-Based Key Derivation](https://csrc.nist.gov/publications/detail/sp/800-132/final)
- [Chrome Extension Security Best Practices](https://developer.chrome.com/docs/extensions/mv3/security/)
- [Web Crypto API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)

## Disclaimer

**IMPORTANT: USE AT YOUR OWN RISK**

While this extension implements industry-standard cryptographic practices and follows OWASP 2024/2025 security guidelines, **no security system is completely infallible**. By using this extension to store API keys, you acknowledge and accept the following:

1. **Inherent Security Risks**: Browser extensions operate within a complex security model with multiple attack surfaces. Despite defense-in-depth measures, vulnerabilities may exist in the browser, operating system, hardware, or this implementation.

2. **No Absolute Security Guarantees**: Cryptographic security is only as strong as its weakest component. Factors beyond this extension's control—including compromised systems, sophisticated attacks, or undiscovered vulnerabilities—may expose stored credentials.

3. **User Responsibility**: You are solely responsible for:
   - Choosing strong, unique passwords for API key encryption
   - Maintaining secure computing environments
   - Monitoring API key usage for unauthorized access
   - Rotating API keys regularly through provider consoles
   - Understanding the security implications of browser extension storage

4. **Limited Liability**: This software is provided "as is" without warranty of any kind, either expressed or implied. The authors and contributors assume no liability for data breaches, unauthorized access, financial losses, or any other damages resulting from the use of this extension.

**By proceeding to use this extension, you acknowledge that you have read, understood, and accepted these risks and responsibilities.**

