import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, Square, Zap, Clock, Hash, RefreshCw, Lightbulb, Lock, Columns3, Check } from "lucide-react";
import clsx from "clsx";
import { useAppStore } from "../store";
import {
  discoverModels,
  runPrompt,
  type LLMModel,
  type RunStats,
  type ChatMessage,
} from "../lib/providers";
import { estimateCostUsd, formatCost } from "../lib/pricing";
import * as api from "../api";
import { FloatingMenu } from "./FloatingMenu";
import { toast } from "./Toast";

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

  // --- Multi-provider fan-out (Epic 6) ---
  // We keep multi-select state alongside single-select so the default single
  // run UX is untouched. Keyed by `provider::id` so two providers can expose
  // the same model id without clobbering each other.
  const [compareMode, setCompareMode] = useState(false);
  const [selectedMultiKeys, setSelectedMultiKeys] = useState<Set<string>>(new Set());
  const [compareMenuOpen, setCompareMenuOpen] = useState(false);
  const compareBtnRef = useRef<HTMLButtonElement>(null);
  const [fanOutProgress, setFanOutProgress] = useState<{
    total: number;
    done: number;
    failed: number;
  } | null>(null);

  // --- Multi-run samples (Epic 5) ---
  // N-runs-of-the-same-model to see stochastic variance in the output. Max
  // capped at 8 so users can't accidentally fire dozens of cloud calls.
  const [runCount, setRunCount] = useState(1);

  const modelKey = (m: LLMModel) => `${m.provider}::${m.id}`;
  const selectedMulti: LLMModel[] = useMemo(
    () => models.filter((m) => selectedMultiKeys.has(modelKey(m))),
    [models, selectedMultiKeys],
  );
  // Estimated cost of a fan-out based on a prompt-length token guess — lets
  // users see "this compare will cost about $0.024" before they click Run.
  const fanOutEstimate = useMemo(() => {
    if (!compareMode || selectedMulti.length === 0) return null;
    // Very rough: assume ~500 output tokens per run.
    const inputApprox = Math.max(
      50,
      Math.ceil((draftContent.length + draftSystemPrompt.length) / 3.5),
    );
    let total = 0;
    for (const m of selectedMulti) {
      total += estimateCostUsd(m.id, inputApprox, 500);
    }
    return total;
  }, [compareMode, selectedMulti, draftContent, draftSystemPrompt]);

  // Auto-discover models on mount and when panel becomes visible
  const discover = useCallback(async () => {
    setDiscovering(true);
    try {
      const found = await discoverModels();
      setModels(found);
      setSelectedModel((prev) => (prev ? prev : found[0] ?? null));
    } catch {
      // Discovery failed silently
    }
    setDiscovering(false);
  }, []);

  useEffect(() => {
    discover();
  }, [discover]);

  if (!activePrompt) return null;

  /**
   * Execute a single model and persist its output + trace.
   * Returns once the model is fully done (success or failure).
   *
   * Shared by both the single-run button and the multi-provider fan-out,
   * so every run — live, multi — stamps `cost_usd` via estimateCostUsd.
   */
  async function runOne({
    model,
    messages,
    promptId,
    revisionId,
    runGroupId,
    signal,
    streamTo,
  }: {
    model: LLMModel;
    messages: ChatMessage[];
    promptId: string;
    revisionId: string | null;
    runGroupId: string | null;
    signal: AbortSignal;
    streamTo: "panel" | "silent";
  }): Promise<{ ok: boolean; content: string; stats: RunStats | null; error?: string }> {
    let fullContent = "";
    let finalStats: RunStats | null = null;
    let finalError: string | undefined;

    await new Promise<void>((resolve) => {
      void runPrompt({
        model: model.id,
        provider: model.provider,
        messages,
        temperature: (draftParams.temperature as number) ?? undefined,
        max_tokens: (draftParams.max_tokens as number) ?? undefined,
        signal,
        onToken(token) {
          fullContent += token;
          if (streamTo === "panel") {
            setStreamContent(fullContent);
            if (outputRef.current) {
              outputRef.current.scrollTop = outputRef.current.scrollHeight;
            }
          }
        },
        async onDone(s) {
          finalStats = s;
          if (fullContent.trim()) {
            try {
              const label = `${model.badge === "lock" ? "🔒" : "☁️"} ${model.name}`;
              // For fan-out we skip the addOutput() helper because it only
              // creates a blank row — we want the content + notes + group id
              // in a single call. For single runs we retain the existing
              // addOutput/updateOutput pairing so the optimistic UX is intact.
              if (runGroupId) {
                const targetRevision = revisionId;
                if (targetRevision) {
                  await api.createOutput({
                    revision_id: targetRevision,
                    label,
                    content: fullContent,
                    notes: `${s.duration_ms}ms · ${s.total_tokens} tokens`,
                    run_group_id: runGroupId,
                  });
                }
              } else {
                const output = await addOutput(label);
                if (output) {
                  await updateOutput({
                    id: output.id,
                    content: fullContent,
                    notes: `${s.duration_ms}ms · ${s.total_tokens} tokens`,
                  });
                }
              }
              const costUsd = estimateCostUsd(
                model.id,
                s.prompt_tokens,
                s.completion_tokens,
              );
              await api.saveTrace({
                prompt_id: promptId,
                revision_id: revisionId,
                provider: model.provider,
                model: model.id,
                input_messages: JSON.stringify(messages),
                output: fullContent,
                input_tokens: s.prompt_tokens || null,
                output_tokens: s.completion_tokens || null,
                latency_ms: s.duration_ms,
                cost_usd: costUsd,
                status: "success",
                source: "live",
                run_group_id: runGroupId ?? undefined,
              });
            } catch {
              /* trace save failure non-critical */
            }
          }
          resolve();
        },
        onError(err) {
          finalError = err;
          resolve();
        },
      });
    });

    return {
      ok: finalError == null,
      content: fullContent,
      stats: finalStats,
      error: finalError,
    };
  }

  async function handleRun() {
    if (!selectedModel || running || !draftContent.trim() || !activePrompt) return;
    const promptId = activePrompt.prompt.id;
    const revisionId = activePrompt.latest_revision?.id ?? null;
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

    // Multi-run (Epic 5): same model, N parallel samples sharing a run_group_id
    // so Analytics shows them as one batch and the Results panel groups them.
    if (runCount > 1) {
      const runGroupId = crypto.randomUUID();
      setFanOutProgress({ total: runCount, done: 0, failed: 0 });

      const tasks = Array.from({ length: runCount }, (_, i) => i);
      const results = await Promise.all(
        tasks.map(async (i) => {
          const r = await runOne({
            model: selectedModel,
            messages,
            promptId,
            revisionId,
            runGroupId,
            signal: controller.signal,
            // Stream only the first run to the panel so users still see
            // something move; the rest land silently in Results.
            streamTo: i === 0 ? "panel" : "silent",
          });
          setFanOutProgress((prev) =>
            prev
              ? {
                  ...prev,
                  done: prev.done + 1,
                  failed: prev.failed + (r.ok ? 0 : 1),
                }
              : prev,
          );
          return r;
        }),
      );

      setRunning(false);
      abortRef.current = null;
      await useAppStore.getState().refreshOutputs();

      const firstOk = results.find((r) => r.ok);
      if (firstOk) setStats(firstOk.stats);
      const failed = results.filter((r) => !r.ok);
      if (failed.length === results.length) {
        setError(failed[0].error ?? "unknown error");
        toast(`All ${failed.length} samples failed`, "error");
      } else if (failed.length > 0) {
        toast(
          `${results.length - failed.length} / ${results.length} samples succeeded`,
          "info",
        );
      } else {
        toast(`${results.length} samples run`, "success");
      }
      setTimeout(() => setFanOutProgress(null), 2500);
      return;
    }

    // Single-run path (default)
    const result = await runOne({
      model: selectedModel,
      messages,
      promptId,
      revisionId,
      runGroupId: null,
      signal: controller.signal,
      streamTo: "panel",
    });
    if (!result.ok && result.error) setError(result.error);
    setStats(result.stats);
    setRunning(false);
    abortRef.current = null;
  }

  /**
   * Fan out the current prompt to every selected model in parallel and
   * group the traces/outputs by a shared run_group_id. Streaming is
   * suppressed because N concurrent streams would garble the output
   * panel — the Results panel shows each completed run inline instead.
   */
  async function handleFanOut() {
    if (
      running ||
      !draftContent.trim() ||
      !activePrompt ||
      selectedMulti.length === 0
    )
      return;

    const promptId = activePrompt.prompt.id;
    const revisionId = activePrompt.latest_revision?.id ?? null;
    const runGroupId = crypto.randomUUID();

    setRunning(true);
    setStreamContent("");
    setStats(null);
    setError(null);
    setFanOutProgress({ total: selectedMulti.length, done: 0, failed: 0 });

    const controller = new AbortController();
    abortRef.current = controller;

    const messages: ChatMessage[] = [];
    if (draftSystemPrompt.trim()) {
      messages.push({ role: "system", content: draftSystemPrompt });
    }
    messages.push({ role: "user", content: draftContent });

    const results = await Promise.all(
      selectedMulti.map(async (m) => {
        const r = await runOne({
          model: m,
          messages,
          promptId,
          revisionId,
          runGroupId,
          signal: controller.signal,
          streamTo: "silent",
        });
        setFanOutProgress((prev) =>
          prev
            ? {
                ...prev,
                done: prev.done + 1,
                failed: prev.failed + (r.ok ? 0 : 1),
              }
            : prev,
        );
        return { model: m, ...r };
      }),
    );

    setRunning(false);
    abortRef.current = null;
    // Refresh the outputs panel so every fan-out result appears.
    await useAppStore.getState().refreshOutputs();

    const failed = results.filter((r) => !r.ok);
    const ok = results.length - failed.length;
    if (failed.length === 0) {
      toast(`Fan-out complete: ${ok} / ${results.length} models`, "success");
    } else if (ok === 0) {
      toast(`All ${failed.length} models failed`, "error");
      setError(failed[0].error ?? "unknown error");
    } else {
      toast(`${ok} / ${results.length} models succeeded`, "info");
    }
    setTimeout(() => setFanOutProgress(null), 2500);
  }

  function handleStop() {
    abortRef.current?.abort();
    setRunning(false);
  }

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg-elevated)] min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-5 py-2 border-b border-[var(--color-border)] shrink-0 flex-wrap">
        <Zap size={12} className="text-[var(--color-accent)]" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Playground
        </span>

        {/* Model selector — single mode uses the dropdown, compare mode
            shows a summary chip + floating multi-select popover. */}
        {!compareMode ? (
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
        ) : (
          <>
            <button
              ref={compareBtnRef}
              type="button"
              disabled={running}
              onClick={() => setCompareMenuOpen((o) => !o)}
              className="ml-2 flex items-center gap-1.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 text-xs hover:border-[var(--color-accent)] focus:outline-none"
            >
              <Columns3 size={11} className="text-[var(--color-accent)]" />
              <span>
                {selectedMulti.length > 0
                  ? `${selectedMulti.length} model${selectedMulti.length === 1 ? "" : "s"} selected`
                  : "Pick models…"}
              </span>
            </button>
            <FloatingMenu
              open={compareMenuOpen}
              anchorRef={compareBtnRef}
              placement="bottom-start"
              onClose={() => setCompareMenuOpen(false)}
              className="py-1 min-w-[260px] max-h-[320px] overflow-y-auto"
            >
              <div className="px-3 py-1.5 flex items-center justify-between gap-2 text-[9px] uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                <span>Models ({models.length})</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedMultiKeys(new Set(models.map(modelKey)))}
                    className="hover:text-[var(--color-text)]"
                  >
                    All
                  </button>
                  <span>·</span>
                  <button
                    onClick={() => setSelectedMultiKeys(new Set())}
                    className="hover:text-[var(--color-text)]"
                  >
                    None
                  </button>
                </div>
              </div>
              {models.map((m) => {
                const key = modelKey(m);
                const on = selectedMultiKeys.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setSelectedMultiKeys((prev) => {
                        const next = new Set(prev);
                        if (next.has(key)) next.delete(key);
                        else next.add(key);
                        return next;
                      })
                    }
                    className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-xs hover:bg-[var(--color-bg-subtle)]"
                  >
                    <span
                      className={clsx(
                        "w-3 h-3 rounded border flex items-center justify-center shrink-0",
                        on
                          ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-white"
                          : "border-[var(--color-border)]",
                      )}
                    >
                      {on && <Check size={8} />}
                    </span>
                    <span className="flex-1 truncate">
                      {m.badge === "lock" ? "🔒" : "☁️"} {m.name}
                    </span>
                    <span className="text-[9px] font-mono text-[var(--color-text-muted)] shrink-0">
                      {m.provider}
                    </span>
                  </button>
                );
              })}
            </FloatingMenu>
          </>
        )}

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

        <button
          type="button"
          onClick={() => {
            setCompareMode((m) => !m);
            setCompareMenuOpen(false);
          }}
          disabled={running}
          className={clsx(
            "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors",
            compareMode
              ? "bg-[var(--color-accent)] text-white"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]",
          )}
          title="Run the prompt against multiple models at once"
        >
          <Columns3 size={10} />
          Compare
        </button>

        <div className="flex-1" />

        {/* Stats (single-run) or fan-out progress (multi-run / compare) */}
        {!compareMode && !fanOutProgress && stats && (
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
        {fanOutProgress && (
          <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
            <RefreshCw
              size={9}
              className={fanOutProgress.done < fanOutProgress.total ? "animate-spin" : ""}
            />
            {fanOutProgress.done} / {fanOutProgress.total} done
            {fanOutProgress.failed > 0 && (
              <span className="text-red-500">· {fanOutProgress.failed} failed</span>
            )}
          </span>
        )}
        {compareMode && !running && !fanOutProgress && fanOutEstimate !== null && (
          <span
            className="text-[10px] text-[var(--color-text-muted)] font-mono"
            title="Rough cost estimate assuming ~500 output tokens per model"
          >
            ≈ {formatCost(fanOutEstimate)}
          </span>
        )}

        {/* Multi-run stepper (single-model only) — hidden in compare mode */}
        {!compareMode && !running && (
          <div
            className="flex items-center border border-[var(--color-border)] rounded overflow-hidden"
            title="Run N samples against the same model (Epic 5)"
          >
            <button
              type="button"
              onClick={() => setRunCount((n) => Math.max(1, n - 1))}
              disabled={runCount <= 1}
              className="px-1.5 py-1 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-40"
            >
              −
            </button>
            <span className="px-1.5 text-[10px] font-mono tabular-nums w-8 text-center">
              ×{runCount}
            </span>
            <button
              type="button"
              onClick={() => setRunCount((n) => Math.min(8, n + 1))}
              disabled={runCount >= 8}
              className="px-1.5 py-1 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-40"
            >
              +
            </button>
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
        ) : compareMode ? (
          <button
            type="button"
            onClick={() => void handleFanOut()}
            disabled={selectedMulti.length === 0 || !draftContent.trim()}
            className={clsx(
              "flex items-center gap-1 px-3 py-1.5 rounded text-[10px] font-medium transition-colors",
              selectedMulti.length > 0 && draftContent.trim()
                ? "bg-[var(--color-accent)] text-white hover:brightness-110"
                : "bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] cursor-not-allowed",
            )}
          >
            <Play size={10} />
            Run on {selectedMulti.length || 0}
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
            {runCount > 1 ? `Run ×${runCount}` : "Run"}
          </button>
        )}
      </div>

      {/* Output area — flex-1 so it fills whatever vertical space the panel has
          (bottom or side), min-h-0 so overflow-y-auto actually kicks in. */}
      {(streamContent || error || running) && (
        <div
          ref={outputRef}
          className="flex-1 min-h-0 overflow-y-auto px-5 py-3 font-mono text-xs leading-relaxed whitespace-pre-wrap"
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
