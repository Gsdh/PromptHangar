import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Square, Zap, Clock, Hash, RefreshCw, Lightbulb, Lock } from "lucide-react";
import clsx from "clsx";
import { useAppStore } from "../store";
import {
  discoverModels,
  runPrompt,
  type LLMModel,
  type RunStats,
  type ChatMessage,
} from "../lib/providers";
import * as api from "../api";

export function PlaygroundPanel() {
  const activePrompt = useAppStore((s) => s.activePrompt);
  const draftContent = useAppStore((s) => s.draftContent);
  const draftSystemPrompt = useAppStore((s) => s.draftSystemPrompt);
  const draftParams = useAppStore((s) => s.draftParams);
  const addOutput = useAppStore((s) => s.addOutput);
  const updateOutput = useAppStore((s) => s.updateOutput);

  const [models, setModels] = useState<LLMModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<LLMModel | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [running, setRunning] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [stats, setStats] = useState<RunStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-discover models on mount and when panel becomes visible
  const discover = useCallback(async () => {
    setDiscovering(true);
    try {
      const found = await discoverModels();
      setModels(found);
      if (found.length > 0 && !selectedModel) {
        setSelectedModel(found[0]);
      }
    } catch {
      // Discovery failed silently
    }
    setDiscovering(false);
  }, [selectedModel]);

  useEffect(() => {
    discover();
  }, [discover]);

  if (!activePrompt) return null;

  async function handleRun() {
    if (!selectedModel || running || !draftContent.trim()) return;
    setRunning(true);
    setStreamContent("");
    setStats(null);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    const messages: ChatMessage[] = [];
    if (draftSystemPrompt.trim()) {
      messages.push({ role: "system", content: draftSystemPrompt });
    }
    messages.push({ role: "user", content: draftContent });

    let fullContent = "";

    await runPrompt({
      model: selectedModel.id,
      provider: selectedModel.provider,
      messages,
      temperature: (draftParams.temperature as number) ?? undefined,
      max_tokens: (draftParams.max_tokens as number) ?? undefined,
      signal: controller.signal,
      onToken(token) {
        fullContent += token;
        setStreamContent(fullContent);
        // Auto-scroll to bottom
        if (outputRef.current) {
          outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
      },
      async onDone(s) {
        setStats(s);
        setRunning(false);
        abortRef.current = null;

        // Auto-save as revision output + trace
        if (fullContent.trim()) {
          try {
            const output = await addOutput(
              `${selectedModel.badge === "lock" ? "🔒" : "☁️"} ${selectedModel.name}`
            );
            if (output) {
              await updateOutput({
                id: output.id,
                content: fullContent,
                notes: `${s.duration_ms}ms · ${s.total_tokens} tokens`,
              });
            }
            // Save trace for observability
            await api.saveTrace({
              prompt_id: activePrompt?.prompt.id,
              revision_id: activePrompt?.latest_revision?.id,
              provider: selectedModel.provider,
              model: selectedModel.id,
              input_messages: JSON.stringify(messages),
              output: fullContent,
              input_tokens: s.prompt_tokens || null,
              output_tokens: s.completion_tokens || null,
              latency_ms: s.duration_ms,
              status: "success",
            });
          } catch {
            // trace save failure is non-critical
          }
        }
      },
      onError(err) {
        setError(err);
        setRunning(false);
        abortRef.current = null;
      },
    });
  }

  function handleStop() {
    abortRef.current?.abort();
    setRunning(false);
  }

  return (
    <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-5 py-2 border-b border-[var(--color-border)]">
        <Zap size={12} className="text-[var(--color-accent)]" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Playground
        </span>

        {/* Model selector */}
        <select
          value={selectedModel ? `${selectedModel.provider}::${selectedModel.id}` : ""}
          onChange={(e) => {
            const [prov, ...rest] = e.target.value.split("::");
            const mid = rest.join("::");
            const m = models.find((m) => m.provider === prov && m.id === mid);
            setSelectedModel(m ?? null);
          }}
          disabled={running}
          className="ml-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 text-xs focus:outline-none focus:border-[var(--color-accent)] max-w-[200px]"
        >
          {models.length === 0 && (
            <option value="">
              {discovering ? "Searching…" : "No models found"}
            </option>
          )}
          {models.map((m) => (
            <option key={`${m.provider}-${m.id}`} value={`${m.provider}::${m.id}`}>
              {m.badge === "lock" ? "🔒" : "☁️"} {m.name} ({m.provider})
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => void discover()}
          disabled={discovering}
          className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded hover:bg-[var(--color-bg-subtle)]"
          title="Re-detect models"
        >
          <RefreshCw
            size={10}
            className={discovering ? "animate-spin" : ""}
          />
        </button>

        <div className="flex-1" />

        {/* Stats */}
        {stats && (
          <div className="flex items-center gap-3 text-[10px] text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1">
              <Clock size={9} />
              {(stats.duration_ms / 1000).toFixed(1)}s
            </span>
            <span className="flex items-center gap-1">
              <Hash size={9} />
              {stats.total_tokens} tokens
            </span>
          </div>
        )}

        {/* Run / Stop */}
        {running ? (
          <button
            type="button"
            onClick={handleStop}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded text-[10px] font-medium hover:bg-red-600"
          >
            <Square size={10} />
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleRun()}
            disabled={!selectedModel || !draftContent.trim()}
            className={clsx(
              "flex items-center gap-1 px-3 py-1.5 rounded text-[10px] font-medium transition-colors",
              selectedModel && draftContent.trim()
                ? "bg-[var(--color-accent)] text-white hover:brightness-110"
                : "bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] cursor-not-allowed"
            )}
          >
            <Play size={10} />
            Run
          </button>
        )}
      </div>

      {/* Output area */}
      {(streamContent || error || running) && (
        <div
          ref={outputRef}
          className="px-5 py-3 max-h-64 overflow-y-auto font-mono text-xs leading-relaxed whitespace-pre-wrap"
        >
          {error ? (
            <div className="text-red-500">
              <span className="font-semibold">Error:</span> {error}
              {error.includes("fetch") && (
                <div className="mt-2 text-[var(--color-text-muted)] font-sans flex items-center gap-1">
                  <Lightbulb size={12} /> Make sure Ollama or LM Studio is running on localhost. Start
                  Ollama with{" "}
                  <code className="bg-[var(--color-bg-subtle)] px-1 rounded">
                    ollama serve
                  </code>
                </div>
              )}
            </div>
          ) : (
            <>
              {streamContent}
              {running && (
                <span className="inline-block w-1.5 h-4 bg-[var(--color-accent)] animate-pulse ml-0.5 -mb-0.5" />
              )}
            </>
          )}
        </div>
      )}

      {/* Empty state */}
      {models.length === 0 && !discovering && !running && !streamContent && (
        <div className="px-5 py-4 text-xs text-[var(--color-text-muted)] text-center">
          <Zap
            size={16}
            className="mx-auto mb-1.5 opacity-40"
          />
          <div>
            No local models found. Start{" "}
            <strong>Ollama</strong> (port 11434) or{" "}
            <strong>LM Studio</strong> (port 1234) to test prompts locally.
          </div>
          <div className="mt-1 opacity-60 flex items-center justify-center gap-1">
            <Lock size={12} /> Everything stays on your machine — zero data leaves.
          </div>
        </div>
      )}
    </div>
  );
}
