/**
 * Unit tests for the pricing engine.
 */

import { describe, it, expect } from "vitest";
import { estimateCost, estimateTokens, formatCost, isLocalModel } from "../pricing";

describe("estimateTokens", () => {
  it("estimates tokens from text length", () => {
    expect(estimateTokens("Hello world")).toBeGreaterThan(0);
    expect(estimateTokens("")).toBe(0);
  });

  it("longer text = more tokens", () => {
    const short = estimateTokens("Hello");
    const long = estimateTokens("Hello world, this is a much longer text with many more words.");
    expect(long).toBeGreaterThan(short);
  });
});

describe("estimateCost", () => {
  it("returns cost for known models", () => {
    const cost = estimateCost("gpt-5.4", 1000000);
    expect(cost).not.toBeNull();
    expect(cost!.input).toBeGreaterThan(0);
  });

  it("returns null for unknown models", () => {
    const cost = estimateCost("totally-unknown-model", 1000);
    expect(cost).toBeNull();
  });

  it("returns null for local Ollama models", () => {
    // Ollama models use "model:tag" format — not in pricing table
    const cost = estimateCost("llama3:latest", 1000);
    expect(cost).toBeNull();
  });

  it("calculates output cost when provided", () => {
    const cost = estimateCost("gpt-5.4", 500, 500);
    expect(cost).not.toBeNull();
    expect(cost!.output).toBeGreaterThan(0);
    expect(cost!.total).toBe(cost!.input + cost!.output);
  });
});

describe("formatCost", () => {
  it("formats tiny costs", () => {
    expect(formatCost(0.0001)).toBe("<$0.001");
  });

  it("formats small costs", () => {
    expect(formatCost(0.005)).toContain("$0.005");
  });

  it("formats larger costs", () => {
    expect(formatCost(1.5)).toBe("$1.50");
  });
});

describe("isLocalModel", () => {
  it("detects Ollama format (model:tag) as local", () => {
    expect(isLocalModel("llama3:latest")).toBe(true);
    expect(isLocalModel("mistral:7b-instruct")).toBe(true);
  });

  it("detects cloud models in pricing table as NOT local", () => {
    expect(isLocalModel("gpt-5.4")).toBe(false);
    expect(isLocalModel("claude-opus-4.6")).toBe(false);
  });

  it("detects ollama/ prefix as local", () => {
    expect(isLocalModel("ollama/llama3")).toBe(true);
    expect(isLocalModel("lmstudio/mistral")).toBe(true);
  });
});
