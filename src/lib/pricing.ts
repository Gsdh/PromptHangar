/**
 * Model pricing lookup table.
 * Prices are per million tokens (input/output) in USD.
 * Source: provider pricing pages as of April 2026.
 * Local models (Ollama/LM Studio) are always $0.
 */

interface ModelPricing {
  input: number;   // $ per 1M input tokens
  output: number;  // $ per 1M output tokens
}

const PRICING: Record<string, ModelPricing> = {
  // Anthropic Claude (April 2026)
  "claude-opus-4.6":        { input: 15.00, output: 75.00 },
  "claude-opus-4-6":        { input: 15.00, output: 75.00 },
  "claude-sonnet-4.6":      { input: 3.00,  output: 15.00 },
  "claude-sonnet-4-6":      { input: 3.00,  output: 15.00 },
  "claude-haiku-4.5":       { input: 0.80,  output: 4.00 },
  "claude-haiku-4-5":       { input: 0.80,  output: 4.00 },
  "claude-opus-4":          { input: 15.00, output: 75.00 },
  "claude-sonnet-4":        { input: 3.00,  output: 15.00 },

  // OpenAI (April 2026)
  "gpt-5.4":                { input: 2.50,  output: 10.00 },
  "gpt-5.4-mini":           { input: 0.15,  output: 0.60 },
  "gpt-5.4-nano":           { input: 0.05,  output: 0.20 },
  "gpt-4.1":                { input: 2.00,  output: 8.00 },
  "gpt-4.1-mini":           { input: 0.40,  output: 1.60 },
  "o4-mini":                { input: 1.10,  output: 4.40 },
  "o3-mini":                { input: 1.10,  output: 4.40 },

  // Google Gemini (April 2026)
  "gemini-3.1-pro":         { input: 1.25,  output: 10.00 },
  "gemini-3.1-flash":       { input: 0.15,  output: 0.60 },
  "gemini-2.5-pro":         { input: 1.25,  output: 10.00 },
  "gemini-2.5-flash":       { input: 0.15,  output: 0.60 },

  // xAI Grok (April 2026)
  "grok-4.20":              { input: 3.00,  output: 15.00 },
  "grok-4.1":               { input: 0.20,  output: 0.50 },
  "grok-3":                 { input: 3.00,  output: 15.00 },

  // Mistral (April 2026)
  "mistral-large-3":        { input: 2.00,  output: 6.00 },
  "mistral-medium-3":       { input: 0.40,  output: 1.20 },
  "mistral-small-4":        { input: 0.20,  output: 0.60 },
  "codestral":              { input: 0.30,  output: 0.90 },

  // DeepSeek (April 2026 — V3.2 current)
  "deepseek-chat":          { input: 0.14,  output: 0.28 },
  "deepseek-reasoner":      { input: 0.55,  output: 2.19 },

  // Groq (fast inference, April 2026)
  "llama-4-scout":          { input: 0.11,  output: 0.34 },
  "llama-4-maverick":       { input: 0.20,  output: 0.60 },
  "gpt-oss-120b":           { input: 0.30,  output: 0.90 },
  "qwen3-32b":              { input: 0.10,  output: 0.30 },
};

/**
 * Estimate cost for a given model + token counts.
 * Returns null if the model is not in the pricing table (e.g. local models).
 */
export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens?: number
): { input: number; output: number; total: number } | null {
  // Normalize: lowercase, strip leading/trailing whitespace
  const key = model.trim().toLowerCase();

  // Find exact match or prefix match
  const pricing =
    PRICING[key] ??
    Object.entries(PRICING).find(([k]) => key.includes(k))?.[1] ??
    null;

  if (!pricing) return null;

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = ((outputTokens ?? 0) / 1_000_000) * pricing.output;

  return {
    input: inputCost,
    output: outputCost,
    total: inputCost + outputCost,
  };
}

/**
 * Rough token estimate from character count.
 * ~4 chars per token for English, ~3 for code, ~3.5 average.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

/**
 * Format a cost as a human-readable string.
 */
export function formatCost(usd: number): string {
  if (usd < 0.001) return "<$0.001";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  if (usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}

/**
 * Cost-write helper: always returns a number so the trace layer can safely
 * populate `cost_usd` for every run (local → 0, unknown → 0, cloud → computed).
 * Used by the Playground, multi-run, and multi-provider fan-out paths so the
 * analytics screen can compare spend across providers without gaps.
 */
export function estimateCostUsd(
  model: string,
  inputTokens: number | null | undefined,
  outputTokens: number | null | undefined,
): number {
  if (!model) return 0;
  if (isLocalModel(model)) return 0;
  const hit = estimateCost(model, inputTokens ?? 0, outputTokens ?? 0);
  return hit?.total ?? 0;
}

/**
 * Check if a model name likely refers to a local model (Ollama/LM Studio).
 * Strategy: if the model is in our cloud PRICING table, it's NOT local.
 * Ollama models use "model:tag" format (e.g. llama3:latest).
 */
export function isLocalModel(model: string): boolean {
  const key = model.trim().toLowerCase();
  // If it's in our paid pricing table → it's a cloud model
  if (PRICING[key]) return false;
  // Prefix match against pricing table
  const hasCloudMatch = Object.keys(PRICING).some((k) => key.includes(k));
  if (hasCloudMatch) return false;
  // Ollama format: contains colon (model:tag)
  if (key.includes(":")) return true;
  // Explicit local prefixes
  if (key.startsWith("ollama/") || key.startsWith("lmstudio/")) return true;
  // Otherwise: not enough info, assume cloud (safer — don't show "gratis" falsely)
  return false;
}
