import { useCallback, useEffect, useRef, useState } from "react";
import {
  X,
  Link2,
  Plus,
  ArrowRight,
  ArrowDown,
  Trash2,
  Play,
  Square,
  Check,
  Clock,
  Loader2,
} from "lucide-react";
import clsx from "clsx";
import { useAppStore } from "../store";
import * as api from "../api";
import type { ChainWithSteps, PromptWithLatest } from "../types";
import {
  discoverModels,
  runPrompt,
  type LLMModel,
  type ChatMessage,
} from "../lib/providers";
import { toast } from "./Toast";

interface Props {
  onClose: () => void;
}

export function ChainsModal({ onClose }: Props) {
  const [chains, setChains] = useState<ChainWithSteps[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function refresh() {
    try {
      const data = await api.listChains();
      setChains(data);
    } catch (err) {
      toast("Failed to load chains: " + String(err), "error");
    }
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="glass-panel max-w-3xl w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <Link2 size={16} className="text-[var(--color-accent)]" />
            <h2 className="text-base font-semibold">Prompt Chains</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-[var(--color-accent)] text-white rounded text-xs font-medium hover:brightness-110"
            >
              <Plus size={10} />
              New chain
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded hover:bg-[var(--color-bg-subtle)]"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="text-center text-sm text-[var(--color-text-muted)] py-8">
              Loading...
            </div>
          ) : creating ? (
            <ChainCreator
              onDone={async () => {
                setCreating(false);
                await refresh();
              }}
              onCancel={() => setCreating(false)}
            />
          ) : chains.length === 0 ? (
            <div className="text-center py-8">
              <Link2
                size={24}
                className="mx-auto mb-2 text-[var(--color-text-muted)] opacity-40"
              />
              <div className="text-sm text-[var(--color-text-muted)] mb-2">
                No chains yet
              </div>
              <div className="text-xs text-[var(--color-text-muted)]">
                Chains let you link prompts as pipeline steps: output of step A
                becomes input for step B.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {chains.map((cws) => (
                <ChainCard
                  key={cws.chain.id}
                  chain={cws}
                  onDelete={async () => {
                    await api.deleteChain(cws.chain.id);
                    await refresh();
                    toast("Chain deleted", "info");
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Chain Card with Run ----------

interface StepResult {
  status: "pending" | "running" | "done" | "error" | "review";
  output: string;
  editedOutput?: string;
  durationMs?: number;
}

function ChainCard({
  chain: cws,
  onDelete,
}: {
  chain: ChainWithSteps;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<StepResult[]>([]);
  const [models, setModels] = useState<LLMModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<LLMModel | null>(null);
  const [reviewMode, setReviewMode] = useState(true);
  const continueRef = useRef<(() => void) | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const discover = useCallback(async () => {
    const found = await discoverModels();
    setModels(found);
    if (found.length > 0 && !selectedModel) setSelectedModel(found[0]);
  }, [selectedModel]);

  useEffect(() => {
    if (expanded) void discover();
  }, [expanded, discover]);

  async function handleRun() {
    if (!selectedModel || running) return;
    setRunning(true);

    const controller = new AbortController();
    abortRef.current = controller;

    let steps: { prompt_id: string; title: string | null; content: string | null; system_prompt: string | null }[];
    try {
      steps = await api.getChainContents(cws.chain.id);
    } catch (err) {
      toast("Failed to load chain: " + String(err), "error");
      setRunning(false);
      return;
    }

    const stepResults: StepResult[] = steps.map(() => ({
      status: "pending" as const,
      output: "",
    }));
    setResults([...stepResults]);

    let previousOutput = "";

    for (let i = 0; i < steps.length; i++) {
      if (controller.signal.aborted) break;

      const step = steps[i];
      stepResults[i] = { status: "running", output: "" };
      setResults([...stepResults]);

      let promptContent = step.content ?? "";
      if (previousOutput && i > 0) {
        promptContent = `${promptContent}\n\n--- Input from previous step ---\n${previousOutput}`;
      }

      const messages: ChatMessage[] = [];
      if (step.system_prompt) {
        messages.push({ role: "system", content: step.system_prompt });
      }
      messages.push({ role: "user", content: promptContent });

      let fullOutput = "";
      const start = Date.now();

      try {
        await runPrompt({
          model: selectedModel.id,
          provider: selectedModel.provider,
          messages,
          signal: controller.signal,
          onToken(token) {
            fullOutput += token;
            stepResults[i] = { status: "running", output: fullOutput };
            setResults([...stepResults]);
          },
          onDone() {
            stepResults[i] = {
              status: "done",
              output: fullOutput,
              editedOutput: fullOutput,
              durationMs: Date.now() - start,
            };
            setResults([...stepResults]);
          },
          onError(err) {
            stepResults[i] = { status: "error", output: err };
            setResults([...stepResults]);
          },
        });
      } catch (err) {
        stepResults[i] = { status: "error", output: String(err) };
        setResults([...stepResults]);
        break;
      }

      if (stepResults[i].status === "error") break;

      // Pause for review if enabled and not last step
      if (reviewMode && i < steps.length - 1 && !controller.signal.aborted) {
        stepResults[i] = { ...stepResults[i], status: "review" };
        setResults([...stepResults]);
        // Wait for user to click "Continue"
        await new Promise<void>((resolve) => {
          continueRef.current = resolve;
        });
        continueRef.current = null;
    

        if (controller.signal.aborted) break;
        // Use potentially edited output
        previousOutput = stepResults[i].editedOutput ?? stepResults[i].output;
        stepResults[i] = { ...stepResults[i], status: "done" };
        setResults([...stepResults]);
      } else {
        previousOutput = fullOutput;
      }
    }

    setRunning(false);

    abortRef.current = null;
    if (!controller.signal.aborted) {
      toast(`Chain "${cws.chain.name}" completed`, "success");
    }
  }

  function handleContinueAfterReview() {
    if (continueRef.current) continueRef.current();
  }

  function updateStepOutput(index: number, edited: string) {
    setResults((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], editedOutput: edited };
      return next;
    });
  }

  function handleStop() {
    abortRef.current?.abort();
    setRunning(false);
  }

  return (
    <div className="border border-[var(--color-border)] rounded-md bg-[var(--color-bg)] overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-[var(--color-bg-subtle)] transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <ArrowDown
          size={12}
          className={clsx(
            "text-[var(--color-text-muted)] transition-transform shrink-0",
            !expanded && "-rotate-90"
          )}
        />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{cws.chain.name}</div>
          {cws.chain.description && (
            <div className="text-xs text-[var(--color-text-muted)] truncate">
              {cws.chain.description}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Step pills */}
          <div className="flex items-center gap-0.5">
            {cws.steps.map((step, i) => (
              <div key={step.id} className="flex items-center gap-0.5">
                {i > 0 && (
                  <ArrowRight size={8} className="text-[var(--color-accent)]" />
                )}
                <span className="text-[9px] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded px-1.5 py-0.5 truncate max-w-[80px]">
                  {step.prompt_title ?? "?"}
                </span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete chain "${cws.chain.name}"?`)) onDelete();
            }}
            className="p-1 text-[var(--color-text-muted)] hover:text-red-500"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* Expanded: run controls + results */}
      {expanded && (
        <div className="border-t border-[var(--color-border)] p-4 space-y-3">
          {/* Model selector + run */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)] shrink-0 cursor-pointer">
              <input
                type="checkbox"
                checked={reviewMode}
                onChange={(e) => setReviewMode(e.target.checked)}
                className="accent-[var(--color-accent)]"
              />
              Review between steps
            </label>
            <div className="flex-1" />
            <select
              value={selectedModel ? `${selectedModel.provider}::${selectedModel.id}` : ""}
              onChange={(e) => {
                const [prov, ...rest] = e.target.value.split("::");
                const mid = rest.join("::");
                setSelectedModel(models.find((m) => m.provider === prov && m.id === mid) ?? null);
              }}
              disabled={running}
              className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 text-xs focus:outline-none focus:border-[var(--color-accent)] max-w-[250px]"
            >
              {models.length === 0 && (
                <option value="">No models found</option>
              )}
              {models.map((m) => (
                <option key={`${m.provider}-${m.id}`} value={`${m.provider}::${m.id}`}>
                  {m.badge === "lock" ? "🔒" : "☁️"} {m.name} ({m.provider})
                </option>
              ))}
            </select>

            {running ? (
              <button
                onClick={handleStop}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600"
              >
                <Square size={10} />
                Stop
              </button>
            ) : (
              <button
                onClick={() => void handleRun()}
                disabled={!selectedModel}
                className={clsx(
                  "flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium",
                  selectedModel
                    ? "bg-[var(--color-accent)] text-white hover:brightness-110"
                    : "bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] cursor-not-allowed"
                )}
              >
                <Play size={10} />
                Run chain
              </button>
            )}
          </div>

          {/* Step results */}
          {results.length > 0 && (
            <div className="space-y-2">
              {cws.steps.map((step, i) => {
                const r = results[i];
                if (!r) return null;
                return (
                  <div
                    key={step.id}
                    className="border border-[var(--color-border)] rounded overflow-hidden"
                  >
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)]">
                      <span className="text-[10px] font-mono font-semibold">
                        Step {i + 1}
                      </span>
                      <span className="text-[10px] text-[var(--color-text-muted)] truncate flex-1">
                        {step.prompt_title}
                      </span>
                      {r.status === "running" && (
                        <Loader2
                          size={10}
                          className="animate-spin text-[var(--color-accent)]"
                        />
                      )}
                      {r.status === "done" && (
                        <span className="flex items-center gap-1 text-[9px] text-emerald-500">
                          <Check size={9} />
                          {r.durationMs && `${(r.durationMs / 1000).toFixed(1)}s`}
                        </span>
                      )}
                      {r.status === "error" && (
                        <span className="text-[9px] text-red-500">Error</span>
                      )}
                      {r.status === "pending" && (
                        <span className="text-[9px] text-[var(--color-text-muted)]">
                          <Clock size={9} />
                        </span>
                      )}
                    </div>
                    {r.output && (
                      <div className="px-3 py-2">
                        {r.status === "review" ? (
                          <div className="space-y-2">
                            <div className="text-[9px] text-amber-500 font-semibold uppercase tracking-wider">
                              Review & edit before continuing
                            </div>
                            <textarea
                              value={r.editedOutput ?? r.output}
                              onChange={(e) => updateStepOutput(i, e.target.value)}
                              className="w-full bg-[var(--color-bg)] border border-amber-500/30 rounded p-2 text-xs font-mono whitespace-pre-wrap max-h-40 focus:outline-none focus:border-[var(--color-accent)] resize-y"
                              rows={4}
                            />
                            <div className="flex items-center gap-2">
                              <button
                                onClick={handleContinueAfterReview}
                                className="flex items-center gap-1 px-3 py-1.5 bg-[var(--color-accent)] text-white rounded text-[10px] font-medium hover:brightness-110"
                              >
                                <ArrowRight size={10} />
                                Continue to step {i + 2}
                              </button>
                              <span className="text-[9px] text-[var(--color-text-muted)]">
                                Edit the output above before continuing, or click to proceed as-is.
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                            {r.output}
                            {r.status === "running" && (
                              <span className="inline-block w-1.5 h-3.5 bg-[var(--color-accent)] animate-pulse ml-0.5" />
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Chain Creator ----------

function ChainCreator({
  onDone,
  onCancel,
}: {
  onDone: () => void;
  onCancel: () => void;
}) {
  const selectedFolderId = useAppStore((s) => s.selectedFolderId);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const [allPrompts, setAllPrompts] = useState<PromptWithLatest[]>([]);
  useEffect(() => {
    api.listPrompts(null).then(setAllPrompts).catch(() => {});
  }, []);

  function addPrompt(id: string) {
    if (!selectedIds.includes(id)) {
      setSelectedIds([...selectedIds, id]);
    }
  }

  function removeStep(index: number) {
    setSelectedIds(selectedIds.filter((_, i) => i !== index));
  }

  async function save() {
    if (!name.trim() || selectedIds.length < 2) return;
    setBusy(true);
    try {
      await api.createChain({
        name: name.trim(),
        description: description.trim() || null,
        folder_id: selectedFolderId,
        prompt_ids: selectedIds,
      });
      toast("Chain created", "success");
      onDone();
    } catch (err) {
      toast("Failed: " + String(err), "error");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div className="text-sm font-semibold">Create new chain</div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-muted)]">
            Name
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Blog pipeline"
            className="mt-1 w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-muted)]">
            Description (optional)
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this chain does"
            className="mt-1 w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>
      </div>

      {/* Steps */}
      <div>
        <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-muted)]">
          Steps (min. 2) — output of each step becomes input for the next
        </label>
        <div className="mt-1 space-y-1">
          {selectedIds.map((id, i) => {
            const p = allPrompts.find((ap) => ap.prompt.id === id);
            return (
              <div
                key={`${id}-${i}`}
                className="flex items-center gap-2 p-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded"
              >
                <span className="text-[10px] text-[var(--color-text-muted)] font-mono w-4">
                  {i + 1}.
                </span>
                {i > 0 && (
                  <ArrowRight
                    size={10}
                    className="text-[var(--color-accent)] shrink-0"
                  />
                )}
                <span className="text-xs font-medium flex-1 truncate">
                  {p?.prompt.title ?? id}
                </span>
                <button
                  type="button"
                  onClick={() => removeStep(i)}
                  className="text-[var(--color-text-muted)] hover:text-red-500 p-0.5"
                >
                  <X size={10} />
                </button>
              </div>
            );
          })}
        </div>

        <select
          value=""
          onChange={(e) => {
            if (e.target.value) addPrompt(e.target.value);
          }}
          className="mt-2 w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1.5 text-xs focus:outline-none focus:border-[var(--color-accent)]"
        >
          <option value="">+ Add step...</option>
          {allPrompts.map((p) => (
            <option key={p.prompt.id} value={p.prompt.id}>
              {p.prompt.title}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={() => void save()}
          disabled={!name.trim() || selectedIds.length < 2 || busy}
          className={clsx(
            "flex-1 py-1.5 rounded text-xs font-medium",
            name.trim() && selectedIds.length >= 2 && !busy
              ? "bg-[var(--color-accent)] text-white hover:brightness-110"
              : "bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] cursor-not-allowed"
          )}
        >
          {busy ? "Saving..." : "Create chain"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 border border-[var(--color-border)] rounded text-xs hover:bg-[var(--color-bg-subtle)]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
