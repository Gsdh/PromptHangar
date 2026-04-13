import { useCallback, useEffect, useRef, useState } from "react";
import {
  Minimize2,
  Lightbulb,
  Columns2,
  Wand2,
  Check,
  ArrowDown,
  AlertTriangle,
  Info,
  RefreshCw,
  Play,
  Square,
} from "lucide-react";
import clsx from "clsx";
import { useAppStore } from "../store";
import {
  compressPrompt,
  generateTips,
  computeSimpleDiff,
  type CompressResult,
} from "../lib/compressor";
import { estimateTokens, estimateCost, formatCost } from "../lib/pricing";
import {
  discoverModels,
  runPrompt,
  type LLMModel,
  type ChatMessage,
} from "../lib/providers";
import { toast } from "./Toast";

type Tab = "auto" | "tips" | "compare" | "llm";

export function CompressorPanel() {
  const draftContent = useAppStore((s) => s.draftContent);
  const draftSystemPrompt = useAppStore((s) => s.draftSystemPrompt);
  const draftModel = useAppStore((s) => s.draftModel);
  const setDraft = useAppStore((s) => s.setDraft);
  const [tab, setTab] = useState<Tab>("auto");

  if (!draftContent.trim()) {
    return (
      <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-5 py-4 text-center text-xs text-[var(--color-text-muted)]">
        <Minimize2 size={14} className="mx-auto mb-1 opacity-40" />
        Write a prompt to compress.
      </div>
    );
  }

  return (
    <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
      {/* Tab bar */}
      <div className="flex border-b border-[var(--color-border)] text-[10px] font-semibold uppercase tracking-wider">
        <TabBtn icon={<Minimize2 size={10} />} label="Auto" active={tab === "auto"} onClick={() => setTab("auto")} />
        <TabBtn icon={<Lightbulb size={10} />} label="Tips" active={tab === "tips"} onClick={() => setTab("tips")} />
        <TabBtn icon={<Columns2 size={10} />} label="Compare" active={tab === "compare"} onClick={() => setTab("compare")} />
        <TabBtn icon={<Wand2 size={10} />} label="LLM Rewrite" active={tab === "llm"} onClick={() => setTab("llm")} />
      </div>

      {/* Tab content */}
      <div className="max-h-72 overflow-y-auto">
        {tab === "auto" && (
          <AutoTab content={draftContent} model={draftModel} onApply={(text) => {
            setDraft({ content: text });
            toast("Prompt compressed", "success");
          }} />
        )}
        {tab === "tips" && <TipsTab content={draftContent + "\n" + draftSystemPrompt} />}
        {tab === "compare" && <CompareTab content={draftContent} model={draftModel} />}
        {tab === "llm" && (
          <LlmTab content={draftContent} onApply={(text) => {
            setDraft({ content: text });
            toast("LLM rewrite applied", "success");
          }} />
        )}
      </div>
    </div>
  );
}

function TabBtn({ icon, label, active, onClick }: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors border-b-2",
        active
          ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-bg-subtle)]"
          : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// ---------- Auto Tab ----------

function AutoTab({ content, model, onApply }: { content: string; model: string; onApply: (text: string) => void }) {
  const [result, setResult] = useState<CompressResult | null>(null);

  function run() {
    setResult(compressPrompt(content));
  }

  if (!result) {
    return (
      <div className="px-5 py-4 text-center">
        <p className="text-xs text-[var(--color-text-muted)] mb-3">
          Analyze your prompt and automatically remove unnecessary words, fillers, and repetitions.
        </p>
        <button onClick={run} className="px-4 py-1.5 bg-[var(--color-accent)] text-white rounded text-xs font-medium hover:brightness-110">
          <Minimize2 size={10} className="inline mr-1.5" />
          Compress
        </button>
      </div>
    );
  }

  const { savings, appliedRules, compressed } = result;
  const cost = model ? estimateCost(model, savings.savedTokens) : null;

  return (
    <div className="px-5 py-3 space-y-3">
      {/* Savings badge */}
      <div className="flex items-center gap-3 p-3 bg-[var(--color-bg)] rounded-md border border-[var(--color-border)]">
        <div className="text-2xl font-bold text-emerald-500 tabular-nums">
          −{savings.savedPercent}%
        </div>
        <div className="flex-1 text-xs space-y-0.5">
          <div>{savings.originalTokens} → <strong>{savings.compressedTokens}</strong> tokens</div>
          <div className="text-[var(--color-text-muted)]">
            {savings.savedTokens} tokens saved
            {cost && ` · ~${formatCost(cost.input)} saved per request`}
          </div>
        </div>
      </div>

      {/* Applied rules */}
      {appliedRules.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-muted)] mb-1">
            Applied rules
          </div>
          <div className="space-y-0.5">
            {appliedRules.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <Check size={9} className="text-emerald-500 shrink-0" />
                <span>{r.name}</span>
                <span className="text-[var(--color-text-muted)]">({r.count}x, −{r.saved} chars)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {savings.savedTokens === 0 && (
        <div className="text-xs text-[var(--color-text-muted)] text-center py-2">
          Your prompt is already efficient — no rule-based compression possible.
          Try the <strong>LLM Rewrite</strong> tab for deeper optimization.
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onApply(compressed)}
          disabled={savings.savedTokens === 0}
          className={clsx(
            "flex-1 py-1.5 rounded text-xs font-medium",
            savings.savedTokens > 0
              ? "bg-[var(--color-accent)] text-white hover:brightness-110"
              : "bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] cursor-not-allowed"
          )}
        >
          <ArrowDown size={10} className="inline mr-1" />
          Apply
        </button>
        <button
          onClick={() => setResult(null)}
          className="px-3 py-1.5 border border-[var(--color-border)] rounded text-xs hover:bg-[var(--color-bg-subtle)]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ---------- Tips Tab ----------

function TipsTab({ content }: { content: string }) {
  const tips = generateTips(content);
  const SEVERITY_ICON = {
    warning: <AlertTriangle size={10} className="text-amber-500" />,
    info: <Info size={10} className="text-[var(--color-accent)]" />,
  };

  if (tips.length === 0) {
    return (
      <div className="px-5 py-6 text-center text-xs text-[var(--color-text-muted)]">
        <Check size={16} className="mx-auto mb-1.5 text-emerald-500" />
        No optimization tips — your prompt looks good.
      </div>
    );
  }

  return (
    <div className="px-5 py-3 space-y-2">
      <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-muted)]">
        {tips.length} tip{tips.length !== 1 ? "s" : ""}
      </div>
      {tips.map((tip, i) => (
        <div key={i} className="p-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0">{SEVERITY_ICON[tip.severity]}</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium">{tip.message}</div>
              {tip.lineStart && (
                <div className="text-[9px] text-[var(--color-text-muted)] mt-0.5">
                  Line {tip.lineStart}
                </div>
              )}
              <div className="mt-1.5 grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <span className="text-[var(--color-text-muted)]">Now: </span>
                  <span className="line-through opacity-60">{tip.original}</span>
                </div>
                <div>
                  <span className="text-[var(--color-text-muted)]">Suggestion: </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">{tip.suggestion}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Compare Tab ----------

function CompareTab({ content, model }: { content: string; model: string }) {
  const result = compressPrompt(content);
  const { left, right } = computeSimpleDiff(content, result.compressed);
  const origTokens = estimateTokens(content);
  const compTokens = estimateTokens(result.compressed);
  const cost = model ? estimateCost(model, origTokens - compTokens) : null;

  return (
    <div className="px-5 py-3">
      {/* Stats header */}
      <div className="flex items-center gap-4 mb-3 text-xs">
        <div>
          <span className="text-[var(--color-text-muted)]">Original: </span>
          <span className="font-mono font-semibold">{origTokens}</span>
          <span className="text-[var(--color-text-muted)]"> tokens</span>
        </div>
        <div className="text-emerald-500 font-semibold">→</div>
        <div>
          <span className="text-[var(--color-text-muted)]">Compressed: </span>
          <span className="font-mono font-semibold text-emerald-500">{compTokens}</span>
          <span className="text-[var(--color-text-muted)]"> tokens</span>
        </div>
        {cost && cost.input > 0 && (
          <div className="text-[10px] text-[var(--color-text-muted)]">
            ~{formatCost(cost.input)} saved/request
          </div>
        )}
      </div>

      {/* Side-by-side diff */}
      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
        <div className="text-[10px] font-mono whitespace-pre-wrap p-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded">
          {left.map((l, i) => (
            <div key={i} className={clsx(l.type === "removed" && "bg-red-500/10 text-red-600 dark:text-red-400 line-through")}>
              {l.text || "\u00A0"}
            </div>
          ))}
        </div>
        <div className="text-[10px] font-mono whitespace-pre-wrap p-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded">
          {right.map((l, i) => (
            <div key={i} className={clsx(l.type === "added" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400")}>
              {l.text || "\u00A0"}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- LLM Rewrite Tab ----------

function LlmTab({ content, onApply }: {
  content: string; systemPrompt?: string; onApply: (text: string) => void;
}) {
  const [models, setModels] = useState<LLMModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<LLMModel | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const discover = useCallback(async () => {
    setDiscovering(true);
    try {
      const found = await discoverModels();
      setModels(found);
      if (found.length > 0 && !selectedModel) setSelectedModel(found[0]);
    } catch { /* discovery failed silently */ }
    setDiscovering(false);
  }, [selectedModel]);

  // Auto-discover on mount
  useEffect(() => { void discover(); }, []);

  const origTokens = estimateTokens(content);

  async function handleRun() {
    if (!selectedModel || running) return;
    setRunning(true);
    setOutput("");
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    let full = "";

    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          "Compress the following prompt while preserving its exact intent and all instructions. " +
          "Use concise language, remove redundancy, convert verbose descriptions to bullet points where appropriate. " +
          "Output ONLY the compressed prompt — no explanations, no preamble, no commentary.",
      },
      { role: "user", content },
    ];

    await runPrompt({
      model: selectedModel.id,
      provider: selectedModel.provider,
      messages,
      temperature: 0.3,
      signal: controller.signal,
      onToken(t) {
        full += t;
        setOutput(full);
      },
      onDone() {
        setRunning(false);
        abortRef.current = null;
      },
      onError(err) {
        setError(err);
        setRunning(false);
        abortRef.current = null;
      },
    });
  }

  const compTokens = output ? estimateTokens(output) : 0;
  const saved = origTokens - compTokens;
  const savedPct = origTokens > 0 ? Math.round((saved / origTokens) * 100) : 0;

  return (
    <div className="px-5 py-3 space-y-3">
      {/* Model selector + run */}
      <div className="flex items-center gap-2">
        <select
          value={selectedModel ? `${selectedModel.provider}::${selectedModel.id}` : ""}
          onChange={(e) => {
            const [prov, ...rest] = e.target.value.split("::");
            const mid = rest.join("::");
            setSelectedModel(models.find((m) => m.provider === prov && m.id === mid) ?? null);
          }}
          disabled={running}
          className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 text-xs focus:outline-none focus:border-[var(--color-accent)]"
        >
          {models.length === 0 && <option value="">{discovering ? "Searching…" : "No models"}</option>}
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
        >
          <RefreshCw size={10} className={discovering ? "animate-spin" : ""} />
        </button>
        {running ? (
          <button
            onClick={() => abortRef.current?.abort()}
            className="px-3 py-1 bg-red-500 text-white rounded text-[10px] font-medium"
          >
            <Square size={9} className="inline mr-1" />
            Stop
          </button>
        ) : (
          <button
            onClick={() => void handleRun()}
            disabled={!selectedModel}
            className={clsx(
              "px-3 py-1 rounded text-[10px] font-medium",
              selectedModel
                ? "bg-[var(--color-accent)] text-white hover:brightness-110"
                : "bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] cursor-not-allowed"
            )}
          >
            <Play size={9} className="inline mr-1" />
            Rewrite
          </button>
        )}
      </div>

      {/* Output */}
      {error && (
        <div className="text-xs text-red-500 p-2 bg-red-500/10 rounded">
          {error}
        </div>
      )}

      {(output || running) && (
        <div className="p-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded font-mono text-xs whitespace-pre-wrap max-h-40 overflow-y-auto">
          {output}
          {running && <span className="inline-block w-1.5 h-3.5 bg-[var(--color-accent)] animate-pulse ml-0.5" />}
        </div>
      )}

      {/* Savings + apply */}
      {output && !running && (
        <div className="flex items-center gap-3">
          <div className="flex-1 text-xs">
            <span className="text-[var(--color-text-muted)]">{origTokens} → </span>
            <span className="font-semibold text-emerald-500">{compTokens}</span>
            <span className="text-[var(--color-text-muted)]"> tokens</span>
            {saved > 0 && (
              <span className="ml-2 text-emerald-500 font-semibold">
                −{savedPct}%
              </span>
            )}
          </div>
          <button
            onClick={() => onApply(output)}
            className="px-3 py-1.5 bg-[var(--color-accent)] text-white rounded text-[10px] font-medium hover:brightness-110"
          >
            <ArrowDown size={9} className="inline mr-1" />
            Apply
          </button>
        </div>
      )}

      {models.length === 0 && !discovering && !running && !output && (
        <div className="text-[10px] text-[var(--color-text-muted)] text-center py-2">
          Start Ollama or LM Studio to rewrite prompts locally.
        </div>
      )}
    </div>
  );
}
