/**
 * Prompt Token Compressor — rule-based compression engine + tip generator.
 *
 * Tier 1: instant rule-based compression (no LLM needed)
 * Tier 2: analysis that generates tips without modifying text
 *
 * Inspired by LLMLingua, Selective Context, and PCToolkit research.
 */

import { estimateTokens } from "./pricing";

// ---------- Types ----------

export interface CompressResult {
  compressed: string;
  appliedRules: AppliedRule[];
  savings: TokenSavings;
}

export interface AppliedRule {
  name: string;
  count: number;
  saved: number; // characters saved
}

export interface TokenSavings {
  originalTokens: number;
  compressedTokens: number;
  savedTokens: number;
  savedPercent: number;
}

export interface CompressorTip {
  type: "redundancy" | "verbose" | "structure" | "filler" | "whitespace";
  message: string;
  original: string;
  suggestion: string;
  severity: "info" | "warning";
  lineStart?: number;
}

// ---------- Verbose phrase patterns ----------

interface ReplacementRule {
  name: string;
  pattern: RegExp;
  replacement: string;
}

const VERBOSE_REPLACEMENTS: ReplacementRule[] = [
  // Polite starters → direct
  { name: "Verbose start", pattern: /\bI would like you to\b/gi, replacement: "" },
  { name: "Verbose start", pattern: /\bI want you to\b/gi, replacement: "" },
  { name: "Verbose start", pattern: /\bCould you please\b/gi, replacement: "Please" },
  { name: "Verbose start", pattern: /\bWould you please\b/gi, replacement: "Please" },
  { name: "Verbose start", pattern: /\bCan you please\b/gi, replacement: "Please" },
  { name: "Verbose start", pattern: /\bI need you to\b/gi, replacement: "" },
  { name: "Verbose start", pattern: /\bPlease make sure to\b/gi, replacement: "Ensure" },
  { name: "Verbose start", pattern: /\bPlease make sure that\b/gi, replacement: "Ensure" },
  { name: "Verbose start", pattern: /\bPlease ensure that\b/gi, replacement: "Ensure" },

  // Filler phrases
  { name: "Filler phrase", pattern: /\bIn order to\b/gi, replacement: "To" },
  { name: "Filler phrase", pattern: /\bIt is important to note that\b/gi, replacement: "Note:" },
  { name: "Filler phrase", pattern: /\bIt is important that\b/gi, replacement: "Ensure" },
  { name: "Filler phrase", pattern: /\bIt should be noted that\b/gi, replacement: "Note:" },
  { name: "Filler phrase", pattern: /\bKeep in mind that\b/gi, replacement: "Note:" },
  { name: "Filler phrase", pattern: /\bPlease keep in mind\b/gi, replacement: "Note:" },
  { name: "Filler phrase", pattern: /\bAs a result of this\b/gi, replacement: "Therefore" },
  { name: "Filler phrase", pattern: /\bDue to the fact that\b/gi, replacement: "Because" },
  { name: "Filler phrase", pattern: /\bFor the purpose of\b/gi, replacement: "To" },
  { name: "Filler phrase", pattern: /\bWith regard to\b/gi, replacement: "Regarding" },
  { name: "Filler phrase", pattern: /\bWith respect to\b/gi, replacement: "Regarding" },
  { name: "Filler phrase", pattern: /\bIn the event that\b/gi, replacement: "If" },
  { name: "Filler phrase", pattern: /\bAt this point in time\b/gi, replacement: "Now" },
  { name: "Filler phrase", pattern: /\bAt the present time\b/gi, replacement: "Now" },
  { name: "Filler phrase", pattern: /\bIn spite of the fact that\b/gi, replacement: "Although" },
  { name: "Filler phrase", pattern: /\bOn the other hand\b/gi, replacement: "However" },

  // Redundant qualifiers
  { name: "Redundant qualifier", pattern: /\bcompletely unique\b/gi, replacement: "unique" },
  { name: "Redundant qualifier", pattern: /\babsolutely essential\b/gi, replacement: "essential" },
  { name: "Redundant qualifier", pattern: /\bvery important\b/gi, replacement: "important" },
  { name: "Redundant qualifier", pattern: /\bextremely important\b/gi, replacement: "critical" },
  { name: "Redundant qualifier", pattern: /\breally important\b/gi, replacement: "important" },
  { name: "Redundant qualifier", pattern: /\bvery unique\b/gi, replacement: "unique" },
  { name: "Redundant qualifier", pattern: /\bquite significant\b/gi, replacement: "significant" },

  // Wordy constructions
  { name: "Wordy construction", pattern: /\bhas the ability to\b/gi, replacement: "can" },
  { name: "Wordy construction", pattern: /\bis able to\b/gi, replacement: "can" },
  { name: "Wordy construction", pattern: /\bare able to\b/gi, replacement: "can" },
  { name: "Wordy construction", pattern: /\bin a way that is\b/gi, replacement: "that is" },
  { name: "Wordy construction", pattern: /\bthe majority of\b/gi, replacement: "most" },
  { name: "Wordy construction", pattern: /\ba large number of\b/gi, replacement: "many" },
  { name: "Wordy construction", pattern: /\ba small number of\b/gi, replacement: "few" },
  { name: "Wordy construction", pattern: /\bin close proximity to\b/gi, replacement: "near" },
  { name: "Wordy construction", pattern: /\bat the end of the day\b/gi, replacement: "ultimately" },
  { name: "Wordy construction", pattern: /\bas a matter of fact\b/gi, replacement: "in fact" },

  // AI-specific bloat (common in AI prompts)
  { name: "AI context removal", pattern: /\bAs an AI language model,?\s*/gi, replacement: "" },
  { name: "AI context removal", pattern: /\bAs a helpful assistant,?\s*/gi, replacement: "" },
  { name: "AI context removal", pattern: /\bYou are a helpful,? harmless,? and honest assistant\.?\s*/gi, replacement: "" },
  { name: "AI context removal", pattern: /\bRemember,? you are an AI\b.*?\.\s*/gi, replacement: "" },
];

// ---------- Compression engine ----------

export function compressPrompt(text: string): CompressResult {
  const original = text;
  let result = text;
  const ruleMap = new Map<string, { count: number; saved: number }>();

  // Pass 1: Apply verbose phrase replacements
  for (const rule of VERBOSE_REPLACEMENTS) {
    const before = result;
    result = result.replace(rule.pattern, rule.replacement);
    if (result !== before) {
      const saved = before.length - result.length;
      const existing = ruleMap.get(rule.name);
      if (existing) {
        existing.count++;
        existing.saved += saved;
      } else {
        ruleMap.set(rule.name, { count: 1, saved });
      }
    }
  }

  // Pass 2: Normalize whitespace
  {
    const before = result;
    // Collapse multiple blank lines to single
    result = result.replace(/\n{3,}/g, "\n\n");
    // Trim trailing spaces per line
    result = result.replace(/[ \t]+$/gm, "");
    // Collapse multiple spaces (not in code blocks)
    result = result.replace(/(?<!```)  +(?!```)/g, " ");
    // Trim start/end
    result = result.trim();
    const saved = before.length - result.length;
    if (saved > 0) {
      ruleMap.set("Whitespace cleanup", { count: 1, saved });
    }
  }

  // Pass 3: Remove duplicate sentences (fuzzy)
  {
    const sentences = result.split(/(?<=[.!?])\s+/);
    const seen = new Set<string>();
    const deduped: string[] = [];
    let dupeCount = 0;
    for (const s of sentences) {
      const normalized = s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
      if (normalized.length > 20 && seen.has(normalized)) {
        dupeCount++;
      } else {
        seen.add(normalized);
        deduped.push(s);
      }
    }
    if (dupeCount > 0) {
      const before = result;
      result = deduped.join(" ");
      ruleMap.set("Duplicate removal", {
        count: dupeCount,
        saved: before.length - result.length,
      });
    }
  }

  // Pass 4: Clean up artifacts (double spaces from removals, leading spaces)
  result = result.replace(/  +/g, " ");
  result = result.replace(/^ +/gm, "");
  result = result.replace(/\n +\n/g, "\n\n");

  // Build result
  const appliedRules: AppliedRule[] = [];
  for (const [name, data] of ruleMap) {
    appliedRules.push({ name, count: data.count, saved: data.saved });
  }
  appliedRules.sort((a, b) => b.saved - a.saved);

  const originalTokens = estimateTokens(original);
  const compressedTokens = estimateTokens(result);
  const savedTokens = originalTokens - compressedTokens;

  return {
    compressed: result,
    appliedRules,
    savings: {
      originalTokens,
      compressedTokens,
      savedTokens,
      savedPercent:
        originalTokens > 0
          ? Math.round((savedTokens / originalTokens) * 100)
          : 0,
    },
  };
}

// ---------- Tip generator ----------

export function generateTips(text: string): CompressorTip[] {
  const tips: CompressorTip[] = [];
  const lines = text.split("\n");

  // Check for verbose phrases (without applying them)
  for (const rule of VERBOSE_REPLACEMENTS) {
    rule.pattern.lastIndex = 0;
    const match = rule.pattern.exec(text);
    if (match) {
      const lineNum = text.substring(0, match.index).split("\n").length;
      tips.push({
        type: "verbose",
        message: `"${match[0]}" can be shortened`,
        original: match[0],
        suggestion: rule.replacement || "(remove)",
        severity: "info",
        lineStart: lineNum,
      });
    }
  }

  // Check for long paragraphs that could be bullet lists
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length > 200 && !line.startsWith("-") && !line.startsWith("•") && !line.startsWith("```")) {
      const sentenceCount = (line.match(/[.!?]+/g) || []).length;
      if (sentenceCount >= 3) {
        tips.push({
          type: "structure",
          message: `Long paragraph (${sentenceCount} sentences, ${line.length} chars) — consider bullet list`,
          original: line.substring(0, 60) + "…",
          suggestion: "Split into bullet points for better token efficiency",
          severity: "warning",
          lineStart: i + 1,
        });
      }
    }
  }

  // Check for repeated words (3+ occurrences of same word >5 chars)
  const words = text.toLowerCase().match(/\b\w{6,}\b/g) || [];
  const wordCounts = new Map<string, number>();
  for (const w of words) {
    wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
  }
  for (const [word, count] of wordCounts) {
    if (count >= 4) {
      tips.push({
        type: "redundancy",
        message: `"${word}" appears ${count}x — possible repetition`,
        original: `${word} (${count}x)`,
        suggestion: "Vary word choice or remove repetitions",
        severity: "info",
      });
    }
  }

  // Check for excessive whitespace
  const blankLines = (text.match(/\n\n\n+/g) || []).length;
  if (blankLines > 0) {
    tips.push({
      type: "whitespace",
      message: `${blankLines} unnecessary blank lines found`,
      original: "(multiple blank lines)",
      suggestion: "Reduce to at most one blank line between sections",
      severity: "info",
    });
  }

  // Check for common AI bloat patterns
  if (/as an ai|you are a helpful/i.test(text)) {
    tips.push({
      type: "filler",
      message: "AI context instruction detected — often unnecessary",
      original: text.match(/as an ai.*?[.!]/i)?.[0] || "AI context",
      suggestion:
        "Remove — models already know they are AI",
      severity: "warning",
    });
  }

  // Check total length and suggest structural compression
  const totalTokens = estimateTokens(text);
  if (totalTokens > 500) {
    tips.push({
      type: "structure",
      message: `Prompt is ${totalTokens} tokens — consider LLM Rewrite for deeper compression`,
      original: `${totalTokens} tokens`,
      suggestion: "Use the LLM Rewrite tab for intelligent compression",
      severity: "info",
    });
  }

  return tips;
}

// ---------- Diff helper for side-by-side ----------

export interface DiffLine {
  type: "same" | "added" | "removed";
  text: string;
}

export function computeSimpleDiff(
  original: string,
  compressed: string
): { left: DiffLine[]; right: DiffLine[] } {
  const origLines = original.split("\n");
  const compLines = compressed.split("\n");
  const left: DiffLine[] = [];
  const right: DiffLine[] = [];

  // Simple line-by-line diff
  let oi = 0;
  let ci = 0;

  while (oi < origLines.length || ci < compLines.length) {
    if (oi >= origLines.length) {
      right.push({ type: "added", text: compLines[ci] });
      ci++;
    } else if (ci >= compLines.length) {
      left.push({ type: "removed", text: origLines[oi] });
      oi++;
    } else if (origLines[oi] === compLines[ci]) {
      left.push({ type: "same", text: origLines[oi] });
      right.push({ type: "same", text: compLines[ci] });
      oi++;
      ci++;
    } else {
      // Check if the compressed line is a shortened version of the original
      left.push({ type: "removed", text: origLines[oi] });
      right.push({ type: "added", text: compLines[ci] });
      oi++;
      ci++;
    }
  }

  return { left, right };
}
