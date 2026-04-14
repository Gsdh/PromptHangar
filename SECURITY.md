# Security Policy

PromptHangar is a privacy-first, offline desktop app that stores all data locally on your machine. Because of this, the threat surface is small — but bugs in how we handle API keys, local databases, network requests, and file I/O can still matter. We take security reports seriously.

## Supported Versions

Only the latest release line (`0.1.x`) receives security fixes. Older pre-release versions are not patched — please update to the current release first.

| Version | Supported |
| ------- | --------- |
| 0.1.x   | ✅ Yes    |
| < 0.1.0 | ❌ No     |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Instead, use GitHub's private vulnerability reporting:

1. Go to https://github.com/Gsdh/PromptHangar/security/advisories/new
2. Fill in the details (affected version, reproduction steps, impact)
3. Submit — only repository maintainers will see the report

You can also reach out directly to the maintainer listed on the GitHub profile if the private advisory flow is not available to you.

### What to include

To help triage quickly, please include:

- The PromptHangar version (see Settings → About or the footer of the Help Guide)
- Your operating system and version (macOS 14.x, Windows 11, Ubuntu 22.04, etc.)
- Clear reproduction steps
- The impact you believe this has — e.g., credential exposure, local file read, code execution, data corruption
- A proof-of-concept if you have one

### What to expect

- **Acknowledgement:** within 72 hours
- **Initial assessment:** within 7 days
- **Fix timeline:** depends on severity — critical issues get an out-of-band patch release; lower severity rolls into the next regular release
- **Disclosure:** coordinated — we will credit you in the release notes and security advisory unless you prefer to stay anonymous

## Scope

In scope:

- The PromptHangar Tauri app (Rust backend + React frontend)
- IPC command handlers in `src-tauri/src/commands.rs`
- SQLite schema and queries (risk: SQL injection, data leakage)
- API key handling (must go through OS Keychain, never plain files)
- File export/import handlers (risk: path traversal, arbitrary write)
- Network handling for cloud model providers (risk: URL injection, credential leaks in traces)
- CSP and Tauri security config (`tauri.conf.json`)
- Release workflow and build provenance

Out of scope:

- Vulnerabilities in upstream dependencies — please report those upstream. If a vulnerable dependency affects us directly, Dependabot will open a PR; feel free to open a regular issue noting you noticed it.
- Vulnerabilities in third-party cloud model providers (OpenAI, Anthropic, etc.) — report to the provider.
- Social-engineering issues or physical access to an unlocked machine.
- Denial-of-service caused by extremely large user-provided input.

## Safe Harbor

We consider good-faith security research to be authorized activity. We will not pursue civil or criminal action against researchers who:

- Make a good-faith effort to avoid privacy violations, data destruction, and service interruption
- Only interact with accounts and data they own or have explicit permission to test
- Report the vulnerability privately and give us a reasonable time to fix before public disclosure

Thank you for helping keep PromptHangar users safe.
