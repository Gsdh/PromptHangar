/**
 * Unit tests for the prompt compressor engine.
 * Run with: npx vitest run src/lib/__tests__/compressor.test.ts
 */

import { describe, it, expect } from "vitest";
import { compressPrompt, generateTips } from "../compressor";

describe("compressPrompt", () => {
  it("removes verbose starters", () => {
    const result = compressPrompt("I would like you to write a blog post about AI.");
    expect(result.compressed).not.toContain("I would like you to");
    expect(result.compressed).toContain("write a blog post about AI");
    expect(result.savings.savedTokens).toBeGreaterThan(0);
  });

  it("replaces filler phrases", () => {
    const result = compressPrompt("In order to achieve this, you need to work hard.");
    expect(result.compressed).toContain("To achieve this");
    expect(result.compressed).not.toContain("In order to");
  });

  it("removes redundant qualifiers", () => {
    const result = compressPrompt("This is very important and completely unique.");
    expect(result.compressed).toContain("important");
    expect(result.compressed).toContain("unique");
    expect(result.compressed).not.toContain("very important");
    expect(result.compressed).not.toContain("completely unique");
  });

  it("normalizes whitespace", () => {
    const result = compressPrompt("Hello\n\n\n\n\nWorld\n\n\n\nTest");
    expect(result.compressed).toBe("Hello\n\nWorld\n\nTest");
  });

  it("removes duplicate sentences", () => {
    const result = compressPrompt(
      "This is a test sentence that is quite long enough. This is a test sentence that is quite long enough."
    );
    // Should have fewer occurrences
    const count = (result.compressed.match(/This is a test sentence/g) || []).length;
    expect(count).toBeLessThanOrEqual(1);
  });

  it("removes AI context bloat", () => {
    const result = compressPrompt("As an AI language model, please help me write code.");
    expect(result.compressed).not.toContain("As an AI language model");
    expect(result.compressed).toContain("help me write code");
  });

  it("returns zero savings for already concise text", () => {
    const result = compressPrompt("Write code.");
    expect(result.savings.savedPercent).toBe(0);
  });

  it("tracks applied rules", () => {
    const result = compressPrompt("I would like you to please make sure to do this. Could you please help?");
    expect(result.appliedRules.length).toBeGreaterThan(0);
    expect(result.appliedRules.some((r) => r.name.includes("Verbose"))).toBe(true);
  });
});

describe("generateTips", () => {
  it("detects verbose phrases", () => {
    const tips = generateTips("I would like you to write a comprehensive blog post.");
    expect(tips.some((t) => t.type === "verbose")).toBe(true);
  });

  it("detects long paragraphs", () => {
    const longParagraph = "This is a sentence. ".repeat(20);
    const tips = generateTips(longParagraph);
    expect(tips.some((t) => t.type === "structure")).toBe(true);
  });

  it("detects repeated words", () => {
    const text = "The important thing is important because important matters are important to consider when important decisions happen.";
    const tips = generateTips(text);
    expect(tips.some((t) => t.type === "redundancy")).toBe(true);
  });

  it("returns empty for clean text", () => {
    const tips = generateTips("Write clean code.");
    expect(tips.length).toBe(0);
  });

  it("detects AI bloat", () => {
    const tips = generateTips("As an AI language model, I can help.");
    expect(tips.some((t) => t.type === "filler")).toBe(true);
  });
});
