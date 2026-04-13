/**
 * Unit tests for secret leak detection.
 */

import { describe, it, expect } from "vitest";
import { scanForSecrets, hasHighConfidenceSecrets } from "../secrets";

describe("scanForSecrets", () => {
  it("detects OpenAI API keys", () => {
    const warnings = scanForSecrets("My key is sk-abc123def456ghi789jkl012mno345pqr678stu901vwx");
    expect(warnings.some((w) => w.type === "OpenAI API key")).toBe(true);
  });

  it("detects Anthropic API keys", () => {
    const warnings = scanForSecrets("sk-ant-abc123def456ghi789jkl012mno345pqr678stu901vwx");
    expect(warnings.some((w) => w.type === "Anthropic API key")).toBe(true);
  });

  it("detects GitHub tokens", () => {
    const warnings = scanForSecrets("ghp_1234567890abcdefghijklmnopqrstuvwxyz12");
    expect(warnings.some((w) => w.type === "GitHub token")).toBe(true);
  });

  it("detects AWS keys", () => {
    const warnings = scanForSecrets("AKIAIOSFODNN7EXAMPLE");
    expect(warnings.some((w) => w.type === "AWS Access Key")).toBe(true);
  });

  it("returns empty for clean text", () => {
    const warnings = scanForSecrets("Write a blog post about machine learning.");
    expect(warnings.length).toBe(0);
  });

  it("truncates long matches", () => {
    const warnings = scanForSecrets("sk-ant-abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnop");
    expect(warnings[0]?.match.length).toBeLessThanOrEqual(25);
  });
});

describe("hasHighConfidenceSecrets", () => {
  it("returns true for API keys", () => {
    const warnings = scanForSecrets("sk-abc123def456ghi789jkl012mno345pqr678stu901vwx");
    expect(hasHighConfidenceSecrets(warnings)).toBe(true);
  });

  it("returns false for clean text", () => {
    const warnings = scanForSecrets("Normal text without secrets.");
    expect(hasHighConfidenceSecrets(warnings)).toBe(false);
  });
});
