/**
 * Secret leak detection. Scans prompt content for patterns that look like
 * API keys, tokens, credentials, and other sensitive data.
 *
 * Returns a list of warnings. Never auto-removes — the user decides.
 */

interface SecretWarning {
  type: string;
  match: string;      // The matched text (truncated to 20 chars for display)
  line: number;
  column: number;
}

const PATTERNS: { name: string; regex: RegExp }[] = [
  // API keys / tokens
  { name: "OpenAI API key",          regex: /sk-[A-Za-z0-9_-]{20,}/g },
  { name: "Anthropic API key",       regex: /sk-ant-[A-Za-z0-9_-]{20,}/g },
  { name: "Google API key",          regex: /AIza[A-Za-z0-9_-]{35,}/g },
  { name: "AWS Access Key",          regex: /AKIA[A-Z0-9]{16}/g },
  { name: "AWS Secret Key",          regex: /(?:aws_secret|secret_key)[=:]\s*["']?[A-Za-z0-9/+=]{40}/gi },
  { name: "GitHub token",            regex: /gh[ps]_[A-Za-z0-9_]{36,}/g },
  { name: "Slack token",             regex: /xox[bpsa]-[A-Za-z0-9-]+/g },
  { name: "Stripe key",              regex: /[sr]k_(live|test)_[A-Za-z0-9]{20,}/g },
  { name: "Bearer token",            regex: /Bearer\s+[A-Za-z0-9._\-]{20,}/g },

  // Generic long secrets
  { name: "Hex secret (32+ chars)",  regex: /(?:secret|token|key|password|api_key)[=:]\s*["']?[0-9a-f]{32,}/gi },
  { name: "Base64 secret (40+)",     regex: /(?:secret|token|key|password)[=:]\s*["']?[A-Za-z0-9+/]{40,}={0,2}/gi },

  // PII patterns
  { name: "IBAN",                    regex: /[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}/g },
  { name: "Credit card (16 digits)", regex: /\b(?:\d[ -]*?){13,19}\b/g },
  { name: "BSN (NL)",                regex: /\b\d{9}\b/g },
  { name: "Email + password combo",  regex: /[\w.+-]+@[\w.-]+:\S+/g },
];

/**
 * Scan text for potential secret leaks.
 * Returns an empty array if nothing suspicious is found.
 */
export function scanForSecrets(text: string): SecretWarning[] {
  const warnings: SecretWarning[] = [];
  const lines = text.split("\n");

  for (const { name, regex } of PATTERNS) {
    // Reset regex state
    regex.lastIndex = 0;
    let m;
    while ((m = regex.exec(text)) !== null) {
      // Find line and column
      let lineNum = 1;
      let col = 0;
      let pos = 0;
      for (const line of lines) {
        if (pos + line.length >= m.index) {
          col = m.index - pos;
          break;
        }
        pos += line.length + 1; // +1 for newline
        lineNum++;
      }

      const matchStr = m[0].length > 24
        ? m[0].slice(0, 12) + "…" + m[0].slice(-8)
        : m[0];

      warnings.push({
        type: name,
        match: matchStr,
        line: lineNum,
        column: col,
      });
    }
  }

  // De-duplicate by type + line (avoid multiple warnings for overlapping patterns)
  const seen = new Set<string>();
  return warnings.filter((w) => {
    const key = `${w.type}:${w.line}:${w.column}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Check if warnings contain high-confidence secrets (not just PII patterns
 * that might be false positives like 9-digit numbers).
 */
export function hasHighConfidenceSecrets(warnings: SecretWarning[]): boolean {
  const highConfidence = [
    "OpenAI API key",
    "Anthropic API key",
    "Google API key",
    "AWS Access Key",
    "AWS Secret Key",
    "GitHub token",
    "Slack token",
    "Stripe key",
    "Bearer token",
  ];
  return warnings.some((w) => highConfidence.includes(w.type));
}
