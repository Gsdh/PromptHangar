import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Square, RefreshCw, ListTree } from "lucide-react";
import { useAppStore } from "../store";
import {
  discoverModels,
  runPrompt,
  type LLMModel,
  type ChatMessage,
} from "../lib/providers";

function expandTemplate(text: string, values: Record<string, any>): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const trimmed = key.trim();
    return values[trimmed] !== undefined ? String(values[trimmed]) : `{{${trimmed}}}`;
  });
}

export function BatchEvalPanel() {
  const activePrompt = useAppStore((s) => s.activePrompt);
  const draftContent = useAppStore((s) => s.draftContent);
  const draftSystemPrompt = useAppStore((s) => s.draftSystemPrompt);
  const draftParams = useAppStore((s) => s.draftParams);

  const [models, setModels] = useState<LLMModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<LLMModel | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [running, setRunning] = useState(false);
  
  const [jsonInput, setJsonInput] = useState("[\n  {}\n]");
  const [evalPrompt, setEvalPrompt] = useState("");
  const [results, setResults] = useState<Array<{ inputs: Record<string,any>, output: string, score: string, error?: string }>>([]);
  const [progress, setProgress] = useState(0);

  const abortRef = useRef<AbortController | null>(null);

  const discover = useCallback(async () => {
    setDiscovering(true);
    try {
      const found = await discoverModels();
      setModels(found);
      if (found.length > 0 && !selectedModel) {
        setSelectedModel(found[0]);
      }
    } catch {}
    setDiscovering(false);
  }, [selectedModel]);

  useEffect(() => {
    discover();
  }, [discover]);

  if (!activePrompt) return null;

  async function handleRunBatch() {
    if (!selectedModel || running || !draftContent.trim()) return;
    
    let items: Record<string, any>[] = [];
    try {
      items = JSON.parse(jsonInput);
      if (!Array.isArray(items)) throw new Error("JSON must be an array");
    } catch(e) {
      alert("Invalid JSON array provided");
      return;
    }

    setRunning(true);
    setResults([]);
    setProgress(0);

    const controller = new AbortController();
    abortRef.current = controller;

    for (let i = 0; i < items.length; i++) {
        if (controller.signal.aborted) break;
        const item = items[i];

        const expandedUser = expandTemplate(draftContent, item);
        const expandedSystem = expandTemplate(draftSystemPrompt, item);

        const messages: ChatMessage[] = [];
        if (expandedSystem.trim()) messages.push({ role: "system", content: expandedSystem });
        messages.push({ role: "user", content: expandedUser });

        let outputContent = "";
        let errorMsg = "";

        await new Promise<void>((resolve) => {
            runPrompt({
                model: selectedModel.id,
                provider: selectedModel.provider,
                messages,
                temperature: (draftParams.temperature as number) ?? undefined,
                max_tokens: (draftParams.max_tokens as number) ?? undefined,
                signal: controller.signal,
                onToken(t) { outputContent += t; },
                onDone() { resolve(); },
                onError(err) { errorMsg = err; resolve(); }
            });
        });

        let score = "";
        if (!errorMsg && evalPrompt.trim()) {
            const evalSystem = "You are an evaluator. Score the output on a scale of 1-5 based on the user's criteria. ONLY return a single number (1, 2, 3, 4, or 5) and nothing else.";
            const evalUser = `Criteria:\n${evalPrompt}\n\nOutput to evaluate:\n${outputContent}`;
            
            await new Promise<void>((resolve) => {
                runPrompt({
                    model: selectedModel.id,
                    provider: selectedModel.provider,
                    messages: [
                        { role: "system", content: evalSystem },
                        { role: "user", content: evalUser }
                    ],
                    temperature: 0,
                    signal: controller.signal,
                    onToken(t) { score += t; },
                    onDone() { resolve(); },
                    onError() { resolve(); }
                });
            });
        }

        setResults(pr => [...pr, { inputs: item, output: outputContent, score: score.trim(), error: errorMsg }]);
        setProgress(i + 1);
    }

    setRunning(false);
    abortRef.current = null;
  }

  function handleStop() {
    abortRef.current?.abort();
    setRunning(false);
  }

  return (
    <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-elevated)] flex flex-col max-h-[500px]">
      <div className="flex items-center gap-2 px-5 py-2 border-b border-[var(--color-border)] shrink-0">
        <ListTree size={12} className="text-[var(--color-accent)]" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Batch Evaluations
        </span>

        <select
          value={selectedModel ? `${selectedModel.provider}::${selectedModel.id}` : ""}
          onChange={(e) => {
            const [prov, ...rest] = e.target.value.split("::");
            const mid = rest.join("::");
            setSelectedModel(models.find((m) => m.provider === prov && m.id === mid) ?? null);
          }}
          disabled={running}
          className="ml-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 text-xs focus:outline-none focus:border-[var(--color-accent)] max-w-[200px]"
        >
          {models.length === 0 && <option value="">{discovering ? "Searching…" : "No models found"}</option>}
          {models.map((m) => (
            <option key={`${m.provider}-${m.id}`} value={`${m.provider}::${m.id}`}>
              {m.badge === "lock" ? "🔒" : "☁️"} {m.name} ({m.provider})
            </option>
          ))}
        </select>

        <button type="button" onClick={() => void discover()} disabled={discovering} className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded hover:bg-[var(--color-bg-subtle)]">
          <RefreshCw size={10} className={discovering ? "animate-spin" : ""} />
        </button>

        <div className="flex-1" />

        {running ? (
          <button type="button" onClick={handleStop} className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded text-[10px] font-medium hover:bg-red-600">
            <Square size={10} /> Stop ({progress})
          </button>
        ) : (
          <button type="button" onClick={() => void handleRunBatch()} disabled={!selectedModel || !draftContent.trim()} className="flex items-center gap-1 px-3 py-1.5 bg-[var(--color-accent)] text-white hover:brightness-110 rounded text-[10px] font-medium transition-colors">
            <Play size={10} /> Run Batch
          </button>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Editor sidebar */}
        <div className="w-64 border-r border-[var(--color-border)] flex flex-col shrink-0">
            <div className="p-3 border-b border-[var(--color-border)] flex-1 flex flex-col">
                <label className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase mb-1">Inputs (JSON Array)</label>
                <textarea
                    value={jsonInput}
                    onChange={e => setJsonInput(e.target.value)}
                    className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-xs p-2 font-mono focus:border-[var(--color-accent)] outline-none resize-none"
                    placeholder="[{ &quot;topic&quot;: &quot;A&quot; }, ...]"
                />
            </div>
            <div className="p-3 flex-1 flex flex-col">
                <label className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase mb-1">Eval prompt (optional)</label>
                <textarea
                    value={evalPrompt}
                    onChange={e => setEvalPrompt(e.target.value)}
                    className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-xs p-2 font-sans focus:border-[var(--color-accent)] outline-none resize-none"
                    placeholder="Is the output polite?"
                />
            </div>
        </div>
        
        {/* Results table */}
        <div className="flex-1 overflow-auto bg-[var(--color-bg)] p-4">
            {results.length === 0 ? (
                <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] text-sm opacity-50">
                    No results yet.
                </div>
            ) : (
                <table className="w-full text-xs text-left border-collapse">
                    <thead>
                        <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                            <th className="py-2 px-3 font-semibold w-1/4">Input</th>
                            <th className="py-2 px-3 font-semibold">Output</th>
                            {evalPrompt.trim() && <th className="py-2 px-3 font-semibold w-16">Score</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {results.map((r, idx) => (
                            <tr key={idx} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)] align-top">
                                <td className="py-2 px-3">
                                    <pre className="whitespace-pre-wrap font-mono text-[9px] text-[var(--color-text-muted)]">{JSON.stringify(r.inputs, null, 2)}</pre>
                                </td>
                                <td className="py-2 px-3 whitespace-pre-wrap text-[11px] max-w-sm">
                                    {r.error ? <span className="text-red-500">{r.error}</span> : r.output}
                                </td>
                                {evalPrompt.trim() && (
                                    <td className="py-2 px-3 text-center font-bold text-[var(--color-accent)]">{r.score}</td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
      </div>
    </div>
  );
}
