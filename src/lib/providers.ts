/**
 * Provider abstraction for both local and cloud LLM engines.
 *
 * Local providers (Ollama, LM Studio): no data leaves the machine.
 * Cloud providers (OpenAI, Anthropic, Gemini, etc.): require API key,
 *   data is sent to the provider's servers. Only enabled when user
 *   explicitly configures a key.
 */

// ---------- Types ----------

export type ProviderType =
  | "ollama"
  | "lmstudio"
  | "jan"
  | "localai"
  | "llamacpp"
  | "custom-local"
  | "openai"
  | "anthropic"
  | "gemini"
  | "xai"
  | "mistral"
  | "deepseek"
  | "groq"
  | "openrouter"
  | "custom-cloud";

export interface LLMModel {
  id: string;
  name: string;
  provider: ProviderType;
  badge: "lock" | "cloud";
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface RunOptions {
  model: string;
  provider: ProviderType;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  onToken: (token: string) => void;
  onDone: (stats: RunStats) => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}

export interface RunStats {
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  duration_ms: number;
}

// ---------- Provider registry ----------

interface ProviderConfig {
  name: string;
  type: ProviderType;
  badge: "lock" | "cloud";
  baseUrl: string | (() => string);
  modelsEndpoint?: string;
  requiresKey: boolean;
  keyHeader: string;
  keyPrefix?: string;
  /** Known models to show even without a models API call */
  knownModels?: { id: string; name: string }[];
  /** Custom streaming handler; null = use OpenAI-compatible */
  customHandler?: "anthropic" | "gemini" | null;
}

const PROVIDERS: Record<ProviderType, ProviderConfig> = {
  ollama: {
    name: "Ollama",
    type: "ollama",
    badge: "lock",
    baseUrl: () => {
      const port = localStorage.getItem("pn:ollamaPort") || "11434";
      return `http://localhost:${port}`;
    },
    modelsEndpoint: "/api/tags",
    requiresKey: false,
    keyHeader: "",
    customHandler: null,
  },
  lmstudio: {
    name: "LM Studio",
    type: "lmstudio",
    badge: "lock",
    baseUrl: () => {
      const port = localStorage.getItem("pn:lmstudioPort") || "1234";
      return `http://localhost:${port}`;
    },
    modelsEndpoint: "/v1/models",
    requiresKey: false,
    keyHeader: "",
    customHandler: null,
  },
  jan: {
    name: "Jan",
    type: "jan",
    badge: "lock",
    baseUrl: () => {
      const port = localStorage.getItem("pn:janPort") || "1337";
      return `http://localhost:${port}`;
    },
    modelsEndpoint: "/v1/models",
    requiresKey: false,
    keyHeader: "",
    customHandler: null,
  },
  localai: {
    name: "LocalAI",
    type: "localai",
    badge: "lock",
    baseUrl: () => {
      const port = localStorage.getItem("pn:localaiPort") || "8080";
      return `http://localhost:${port}`;
    },
    modelsEndpoint: "/v1/models",
    requiresKey: false,
    keyHeader: "",
    customHandler: null,
  },
  llamacpp: {
    name: "llama.cpp",
    type: "llamacpp",
    badge: "lock",
    baseUrl: () => {
      const port = localStorage.getItem("pn:llamacppPort") || "8080";
      return `http://localhost:${port}`;
    },
    modelsEndpoint: "/v1/models",
    requiresKey: false,
    keyHeader: "",
    customHandler: null,
  },
  "custom-local": {
    name: "Custom (local)",
    type: "custom-local",
    badge: "lock",
    baseUrl: () => {
      return localStorage.getItem("pn:customLocalUrl") || "http://localhost:5000";
    },
    modelsEndpoint: "/v1/models",
    requiresKey: false,
    keyHeader: "",
    customHandler: null,
  },
  openai: {
    name: "OpenAI",
    type: "openai",
    badge: "cloud",
    baseUrl: "https://api.openai.com",
    modelsEndpoint: "/v1/models",
    requiresKey: true,
    keyHeader: "Authorization",
    keyPrefix: "Bearer ",
    knownModels: [
      { id: "gpt-5.4", name: "GPT-5.4" },
      { id: "gpt-5.4-mini", name: "GPT-5.4 Mini" },
      { id: "gpt-5.4-nano", name: "GPT-5.4 Nano" },
      { id: "gpt-4.1", name: "GPT-4.1" },
      { id: "gpt-4.1-mini", name: "GPT-4.1 Mini" },
      { id: "o4-mini", name: "o4-mini" },
      { id: "o3-mini", name: "o3-mini" },
    ],
    customHandler: null,
  },
  anthropic: {
    name: "Anthropic",
    type: "anthropic",
    badge: "cloud",
    baseUrl: "https://api.anthropic.com",
    requiresKey: true,
    keyHeader: "x-api-key",
    knownModels: [
      { id: "claude-opus-4-6-20260401", name: "Claude Opus 4.6" },
      { id: "claude-sonnet-4-6-20260401", name: "Claude Sonnet 4.6" },
      { id: "claude-haiku-4-5-20260301", name: "Claude Haiku 4.5" },
      { id: "claude-opus-4-20250514", name: "Claude Opus 4" },
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4" },
    ],
    customHandler: "anthropic",
  },
  gemini: {
    name: "Google Gemini",
    type: "gemini",
    badge: "cloud",
    baseUrl: "https://generativelanguage.googleapis.com",
    requiresKey: true,
    keyHeader: "x-goog-api-key",
    knownModels: [
      { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview" },
      { id: "gemini-3.1-flash-live-preview", name: "Gemini 3.1 Flash Live" },
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
    ],
    customHandler: "gemini",
  },
  xai: {
    name: "xAI (Grok)",
    type: "xai",
    badge: "cloud",
    baseUrl: "https://api.x.ai",
    requiresKey: true,
    keyHeader: "Authorization",
    keyPrefix: "Bearer ",
    knownModels: [
      { id: "grok-4.20-beta-2", name: "Grok 4.20 Beta 2" },
      { id: "grok-4.1", name: "Grok 4.1" },
      { id: "grok-3", name: "Grok 3" },
    ],
    customHandler: null,
  },
  mistral: {
    name: "Mistral",
    type: "mistral",
    badge: "cloud",
    baseUrl: "https://api.mistral.ai",
    requiresKey: true,
    keyHeader: "Authorization",
    keyPrefix: "Bearer ",
    knownModels: [
      { id: "mistral-large-3", name: "Mistral Large 3" },
      { id: "mistral-small-4", name: "Mistral Small 4" },
      { id: "mistral-medium-3", name: "Mistral Medium 3" },
      { id: "codestral-latest", name: "Codestral" },
    ],
    customHandler: null,
  },
  deepseek: {
    name: "DeepSeek",
    type: "deepseek",
    badge: "cloud",
    baseUrl: "https://api.deepseek.com",
    requiresKey: true,
    keyHeader: "Authorization",
    keyPrefix: "Bearer ",
    knownModels: [
      { id: "deepseek-chat", name: "DeepSeek V3.2" },
      { id: "deepseek-reasoner", name: "DeepSeek V3.2 Reasoner" },
    ],
    customHandler: null,
  },
  groq: {
    name: "Groq",
    type: "groq",
    badge: "cloud",
    baseUrl: "https://api.groq.com/openai",
    requiresKey: true,
    keyHeader: "Authorization",
    keyPrefix: "Bearer ",
    knownModels: [
      { id: "llama-4-scout", name: "Llama 4 Scout" },
      { id: "llama-4-maverick-17b", name: "Llama 4 Maverick 17B" },
      { id: "gpt-oss-120b", name: "GPT-OSS 120B" },
      { id: "qwen3-32b", name: "Qwen3 32B" },
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B" },
    ],
    customHandler: null,
  },
  openrouter: {
    name: "OpenRouter",
    type: "openrouter",
    badge: "cloud",
    baseUrl: "https://openrouter.ai/api",
    requiresKey: true,
    keyHeader: "Authorization",
    keyPrefix: "Bearer ",
    knownModels: [
      { id: "anthropic/claude-sonnet-4.6", name: "Claude Sonnet 4.6 (via OR)" },
      { id: "openai/gpt-5.4", name: "GPT-5.4 (via OR)" },
      { id: "google/gemini-3.1-pro-preview", name: "Gemini 3.1 Pro (via OR)" },
      { id: "x-ai/grok-4.20-beta-2", name: "Grok 4.20 (via OR)" },
      { id: "meta-llama/llama-4-scout", name: "Llama 4 Scout (via OR)" },
    ],
    customHandler: null,
  },
  "custom-cloud": {
    name: "Custom (cloud)",
    type: "custom-cloud",
    badge: "cloud",
    baseUrl: () => {
      return localStorage.getItem("pn:customCloudUrl") || "https://api.example.com";
    },
    requiresKey: true,
    keyHeader: "Authorization",
    keyPrefix: "Bearer ",
    customHandler: null,
  },
};

// ---------- API key management (OS keychain with localStorage fallback) ----------

import { invoke } from "@tauri-apps/api/core";

const KEYCHAIN_SERVICE = "com.prompthangar.apikeys";

// Cache keys in memory to avoid async lookups on every render
const keyCache = new Map<string, string>();

/** Get API key — reads from memory cache (sync). Call loadApiKeys() on boot to populate. */
export function getApiKey(provider: ProviderType): string | null {
  return keyCache.get(provider) ?? null;
}

/** Set API key — stores in OS keychain + memory cache */
export async function setApiKey(provider: ProviderType, key: string) {
  if (key.trim()) {
    keyCache.set(provider, key.trim());
    try {
      await invoke("keychain_set", { service: KEYCHAIN_SERVICE, key: provider, value: key.trim() });
    } catch {
      // Fallback to localStorage if keychain fails (e.g. Linux without libsecret)
      localStorage.setItem(`pn:apikey:${provider}`, key.trim());
      console.warn(`[PromptHangar] OS keychain unavailable — API key for ${provider} stored in localStorage (less secure). Install libsecret on Linux for encrypted storage.`);
    }
  } else {
    keyCache.delete(provider);
    try {
      await invoke("keychain_delete", { service: KEYCHAIN_SERVICE, key: provider });
    } catch { /* ignore */ }
    localStorage.removeItem(`pn:apikey:${provider}`);
  }
}

/** Load all API keys from keychain into memory cache. Call once on boot. */
export async function loadApiKeys() {
  const cloudProviders: ProviderType[] = [
    "openai", "anthropic", "gemini", "xai", "mistral", "deepseek", "groq", "openrouter", "custom-cloud",
  ];
  for (const provider of cloudProviders) {
    try {
      const val: string | null = await invoke("keychain_get", { service: KEYCHAIN_SERVICE, key: provider });
      if (val) {
        keyCache.set(provider, val);
        continue;
      }
    } catch { /* keychain not available */ }
    // Fallback: try localStorage (migration from old storage)
    const lsVal = localStorage.getItem(`pn:apikey:${provider}`);
    if (lsVal) {
      keyCache.set(provider, lsVal);
      // Migrate to keychain silently
      try {
        await invoke("keychain_set", { service: KEYCHAIN_SERVICE, key: provider, value: lsVal });
        localStorage.removeItem(`pn:apikey:${provider}`);
      } catch { /* keep in localStorage */ }
    }
  }
}

export function getEnabledProviders(): ProviderType[] {
  const all: ProviderType[] = ["ollama", "lmstudio", "jan", "localai", "llamacpp"];
  // Custom local — only if URL is configured
  if (localStorage.getItem("pn:customLocalUrl")) all.push("custom-local");
  // Cloud providers — only if API key is set
  for (const [type, config] of Object.entries(PROVIDERS)) {
    if (config.requiresKey && getApiKey(type as ProviderType)) {
      all.push(type as ProviderType);
    }
  }
  return all;
}

export function getProviderConfig(type: ProviderType): ProviderConfig {
  return PROVIDERS[type];
}

export function getAllProviderConfigs(): ProviderConfig[] {
  return Object.values(PROVIDERS);
}

// ---------- Airgap check ----------

function isAirgapActive(): boolean {
  try {
    return localStorage.getItem("pn:airgapHardLock") === "true";
  } catch {
    return false;
  }
}

function resolveBase(config: ProviderConfig): string {
  return typeof config.baseUrl === "function" ? config.baseUrl() : config.baseUrl;
}

// ---------- Discovery ----------

export async function discoverModels(): Promise<LLMModel[]> {
  if (isAirgapActive()) return [];

  const results: LLMModel[] = [];

  // Local providers: try to connect
  const localProviders: ProviderType[] = ["ollama", "lmstudio", "jan", "localai", "llamacpp", "custom-local"];
  for (const type of localProviders) {
    const config = PROVIDERS[type];
    const base = resolveBase(config);
    try {
      const res = await fetch(`${base}${config.modelsEndpoint}`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = await res.json();
        const models = type === "ollama" ? (data.models ?? []) : (data.data ?? []);
        for (const m of models) {
          const id = type === "ollama" ? (m.name ?? m.model) : m.id;
          results.push({
            id,
            name: id,
            provider: type,
            badge: "lock",
          });
        }
      }
    } catch {
      // Not running
    }
  }

  // Cloud providers: show known models if API key is set
  for (const [type, config] of Object.entries(PROVIDERS)) {
    if (!config.requiresKey) continue;
    const key = getApiKey(type as ProviderType);
    if (!key) continue;
    if (config.knownModels) {
      for (const m of config.knownModels) {
        results.push({
          id: m.id,
          name: `${m.name}`,
          provider: type as ProviderType,
          badge: "cloud",
        });
      }
    }
  }

  return results;
}

// ---------- Streaming execution ----------

export async function runPrompt(opts: RunOptions): Promise<void> {
  if (isAirgapActive()) {
    opts.onError("Airgap mode active — all network I/O blocked. Disable in Settings.");
    return;
  }

  const config = PROVIDERS[opts.provider];
  if (!config) {
    opts.onError(`Unknown provider: ${opts.provider}`);
    return;
  }

  if (config.requiresKey) {
    const key = getApiKey(opts.provider);
    if (!key) {
      opts.onError(`No API key configured for ${config.name}. Add it in Settings.`);
      return;
    }
  }

  const start = Date.now();

  try {
    if (opts.provider === "ollama") {
      await runOllama(opts, start);
    } else if (config.customHandler === "anthropic") {
      await runAnthropic(opts, start, config);
    } else if (config.customHandler === "gemini") {
      await runGemini(opts, start, config);
    } else {
      // OpenAI-compatible (OpenAI, xAI, Mistral, DeepSeek, Groq, OpenRouter, LM Studio)
      await runOpenAICompat(opts, start, resolveBase(config), config);
    }
  } catch (err) {
    if ((err as Error).name === "AbortError") return;
    opts.onError(String(err));
  }
}

// ---------- Ollama ----------

async function runOllama(opts: RunOptions, start: number): Promise<void> {
  const config = PROVIDERS.ollama;
  const base = resolveBase(config);
  const body: Record<string, unknown> = {
    model: opts.model,
    messages: opts.messages,
    stream: true,
  };
  if (opts.temperature !== undefined || opts.max_tokens !== undefined) {
    body.options = {
      ...(opts.temperature !== undefined && { temperature: opts.temperature }),
      ...(opts.max_tokens !== undefined && { num_predict: opts.max_tokens }),
    };
  }

  const res = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  if (!res.ok) {
    opts.onError(`Ollama error ${res.status}: ${await res.text()}`);
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) { opts.onError("No stream"); return; }

  const decoder = new TextDecoder();
  let completionTokens = 0;
  let promptTokens = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of decoder.decode(value, { stream: true }).split("\n")) {
      if (!line.trim()) continue;
      try {
        const p = JSON.parse(line);
        if (p.message?.content) { opts.onToken(p.message.content); completionTokens++; }
        if (p.done) {
          promptTokens = p.prompt_eval_count ?? 0;
          completionTokens = p.eval_count ?? completionTokens;
        }
      } catch { /* skip */ }
    }
  }

  opts.onDone({
    total_tokens: promptTokens + completionTokens,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    duration_ms: Date.now() - start,
  });
}

// ---------- OpenAI-compatible (OpenAI, xAI, Mistral, DeepSeek, Groq, OpenRouter, LM Studio) ----------

async function runOpenAICompat(
  opts: RunOptions,
  start: number,
  baseUrl: string,
  config: ProviderConfig,
): Promise<void> {
  const body: Record<string, unknown> = {
    model: opts.model,
    messages: opts.messages,
    stream: true,
  };
  if (opts.temperature !== undefined) body.temperature = opts.temperature;
  if (opts.max_tokens !== undefined) body.max_tokens = opts.max_tokens;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.requiresKey) {
    const key = getApiKey(config.type)!;
    headers[config.keyHeader] = (config.keyPrefix ?? "") + key;
  }

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    opts.onError(`${config.name} error ${res.status}: ${errText.slice(0, 200)}`);
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) { opts.onError("No stream"); return; }

  const decoder = new TextDecoder();
  let totalTokens = 0;
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data: ")) continue;
      const payload = t.slice(6);
      if (payload === "[DONE]") continue;
      try {
        const p = JSON.parse(payload);
        const delta = p.choices?.[0]?.delta?.content;
        if (delta) { opts.onToken(delta); totalTokens++; }
        if (p.usage) totalTokens = p.usage.total_tokens ?? totalTokens;
      } catch { /* skip */ }
    }
  }

  opts.onDone({
    total_tokens: totalTokens,
    prompt_tokens: 0,
    completion_tokens: totalTokens,
    duration_ms: Date.now() - start,
  });
}

// ---------- Anthropic (Messages API with SSE) ----------

async function runAnthropic(
  opts: RunOptions,
  start: number,
  config: ProviderConfig,
): Promise<void> {
  const key = getApiKey("anthropic")!;
  const base = resolveBase(config);

  // Anthropic separates system from messages
  const systemMsg = opts.messages.find((m) => m.role === "system")?.content;
  const userMessages = opts.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));

  const body: Record<string, unknown> = {
    model: opts.model,
    messages: userMessages,
    max_tokens: opts.max_tokens ?? 4096,
    stream: true,
  };
  if (systemMsg) body.system = systemMsg;
  if (opts.temperature !== undefined) body.temperature = opts.temperature;

  const res = await fetch(`${base}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    opts.onError(`Anthropic error ${res.status}: ${errText.slice(0, 200)}`);
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) { opts.onError("No stream"); return; }

  const decoder = new TextDecoder();
  let inputTokens = 0;
  let outputTokens = 0;
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data: ")) continue;
      const payload = t.slice(6);
      try {
        const p = JSON.parse(payload);
        if (p.type === "content_block_delta" && p.delta?.text) {
          opts.onToken(p.delta.text);
          outputTokens++;
        }
        if (p.type === "message_delta" && p.usage) {
          outputTokens = p.usage.output_tokens ?? outputTokens;
        }
        if (p.type === "message_start" && p.message?.usage) {
          inputTokens = p.message.usage.input_tokens ?? 0;
        }
      } catch { /* skip */ }
    }
  }

  opts.onDone({
    total_tokens: inputTokens + outputTokens,
    prompt_tokens: inputTokens,
    completion_tokens: outputTokens,
    duration_ms: Date.now() - start,
  });
}

// ---------- Google Gemini (generateContent streaming) ----------

async function runGemini(
  opts: RunOptions,
  start: number,
  config: ProviderConfig,
): Promise<void> {
  const key = getApiKey("gemini")!;
  const base = resolveBase(config);

  // Convert ChatMessage format to Gemini format
  const systemInstruction = opts.messages.find((m) => m.role === "system")?.content;
  const contents = opts.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const body: Record<string, unknown> = { contents };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }
  if (opts.temperature !== undefined || opts.max_tokens !== undefined) {
    body.generationConfig = {
      ...(opts.temperature !== undefined && { temperature: opts.temperature }),
      ...(opts.max_tokens !== undefined && { maxOutputTokens: opts.max_tokens }),
    };
  }

  const url = `${base}/v1beta/models/${opts.model}:streamGenerateContent?alt=sse&key=${key}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    opts.onError(`Gemini error ${res.status}: ${errText.slice(0, 200)}`);
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) { opts.onError("No stream"); return; }

  const decoder = new TextDecoder();
  let totalTokens = 0;
  let promptTokens = 0;
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data: ")) continue;
      const payload = t.slice(6);
      try {
        const p = JSON.parse(payload);
        const text = p.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) { opts.onToken(text); totalTokens++; }
        if (p.usageMetadata) {
          promptTokens = p.usageMetadata.promptTokenCount ?? 0;
          totalTokens = p.usageMetadata.totalTokenCount ?? totalTokens;
        }
      } catch { /* skip */ }
    }
  }

  opts.onDone({
    total_tokens: totalTokens,
    prompt_tokens: promptTokens,
    completion_tokens: totalTokens - promptTokens,
    duration_ms: Date.now() - start,
  });
}
