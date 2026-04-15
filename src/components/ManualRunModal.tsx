import { useMemo, useState } from "react";
import { X, ClipboardPaste, Info } from "lucide-react";
import { useAppStore } from "../store";
import * as api from "../api";
import { estimateCostUsd, estimateTokens, formatCost } from "../lib/pricing";
import { toast } from "./Toast";

interface Props {
  onClose: () => void;
}

/**
 * Epic 4 — Manual run entry.
 *
 * Lets users paste output they got elsewhere (claude.ai web, a colleague's
 * screenshot, ChatGPT mobile) and record it as a first-class run against
 * the current revision. We write BOTH:
 *   - a RevisionOutput so the Results panel shows it inline.
 *   - a trace with source='manual' so Analytics rolls it into spend and
 *     latency views alongside live API calls.
 *
 * Token/cost fields are optional — we estimate them from content length
 * and the pricing table when the user leaves them blank. Estimated values
 * are marked as such so nobody mistakes them for measured ground truth.
 */
export function ManualRunModal({ onClose }: Props) {
  const activePrompt = useAppStore((s) => s.activePrompt);
  const revisions = useAppStore((s) => s.revisions);
  const viewingRevisionId = useAppStore((s) => s.viewingRevisionId);
  const refreshOutputs = useAppStore((s) => s.refreshOutputs);

  const [provider, setProvider] = useState("claude.ai");
  const [model, setModel] = useState("claude-opus-4.6");
  const [content, setContent] = useState("");
  const [note, setNote] = useState("");
  const [inputTokensStr, setInputTokensStr] = useState("");
  const [outputTokensStr, setOutputTokensStr] = useState("");
  const [costStr, setCostStr] = useState("");
  const [busy, setBusy] = useState(false);

  const targetRevision = useMemo(() => {
    if (!activePrompt) return null;
    if (viewingRevisionId) {
      return revisions.find((r) => r.id === viewingRevisionId) ?? null;
    }
    return activePrompt.latest_revision;
  }, [activePrompt, revisions, viewingRevisionId]);

  // Live preview of the estimated cost so users see what will be recorded
  // when they leave the numeric fields blank.
  const estimate = useMemo(() => {
    if (!activePrompt || !targetRevision) return null;
    const promptText =
      (targetRevision.system_prompt ?? "") + "\n" + targetRevision.content;
    const inTok = inputTokensStr
      ? Math.max(0, Math.floor(Number(inputTokensStr)))
      : estimateTokens(promptText);
    const outTok = outputTokensStr
      ? Math.max(0, Math.floor(Number(outputTokensStr)))
      : estimateTokens(content);
    const cost = costStr
      ? Math.max(0, Number(costStr))
      : estimateCostUsd(model, inTok, outTok);
    return {
      inputTokens: inTok,
      outputTokens: outTok,
      costUsd: Number.isFinite(cost) ? cost : 0,
      inputWasEstimated: !inputTokensStr,
      outputWasEstimated: !outputTokensStr,
      costWasEstimated: !costStr,
    };
  }, [
    activePrompt,
    targetRevision,
    inputTokensStr,
    outputTokensStr,
    costStr,
    model,
    content,
  ]);

  async function submit() {
    if (!activePrompt || !targetRevision) return;
    if (!content.trim()) {
      toast("Paste the output before saving", "error");
      return;
    }
    setBusy(true);
    try {
      const label = `✏️ ${provider}${model ? ` · ${model}` : ""}`;
      const noteText = note.trim() || "Manual entry";

      // Create the output first so Results shows it immediately.
      const output = await api.createOutput({
        revision_id: targetRevision.id,
        label,
        content,
        notes: noteText,
      });

      // Then save the trace so Analytics counts it. source='manual' lets the
      // reporting screens filter/segment these out of measured live runs.
      await api.saveTrace({
        prompt_id: activePrompt.prompt.id,
        revision_id: targetRevision.id,
        provider,
        model,
        input_messages: JSON.stringify([
          ...(targetRevision.system_prompt
            ? [{ role: "system", content: targetRevision.system_prompt }]
            : []),
          { role: "user", content: targetRevision.content },
        ]),
        output: content,
        input_tokens: estimate?.inputTokens ?? null,
        output_tokens: estimate?.outputTokens ?? null,
        latency_ms: null, // Latency is meaningless for manual entries.
        cost_usd: estimate?.costUsd ?? 0,
        status: "success",
        source: "manual",
        metadata: JSON.stringify({
          estimated: {
            input_tokens: estimate?.inputWasEstimated ?? true,
            output_tokens: estimate?.outputWasEstimated ?? true,
            cost: estimate?.costWasEstimated ?? true,
          },
          note: noteText,
        }),
      });

      await refreshOutputs();
      toast(`Manual run saved: ${output.label ?? "result"}`, "success");
      onClose();
    } catch (err) {
      toast("Save failed: " + String(err), "error");
    } finally {
      setBusy(false);
    }
  }

  if (!activePrompt || !targetRevision) return null;

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="glass-panel max-w-xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <ClipboardPaste size={16} className="text-[var(--color-accent)]" />
            <h2 className="text-base font-semibold">Paste a manual run</h2>
            <span className="text-xs text-[var(--color-text-muted)]">
              → revision #{targetRevision.revision_number}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <p className="text-xs text-[var(--color-text-muted)]">
            Recording output you produced somewhere else (e.g. claude.ai web,
            ChatGPT, a colleague&apos;s paste). We&apos;ll save it as a result
            on this revision and add a trace tagged{" "}
            <code className="font-mono text-[10px] bg-[var(--color-bg-subtle)] px-1 rounded">
              source=manual
            </code>{" "}
            so Analytics picks it up.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">
                Provider
              </label>
              <input
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="claude.ai"
                className="w-full mt-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1.5 text-xs focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">
                Model
              </label>
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="claude-opus-4.6"
                className="w-full mt-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1.5 text-xs focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">
              Pasted output
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste the model's response here…"
              className="w-full mt-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-2 text-xs font-mono h-48 focus:outline-none focus:border-[var(--color-accent)] resize-y"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">
              Note (optional)
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why you saved this — 'web chat', 'Gemini mobile', etc."
              className="w-full mt-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1.5 text-xs focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>

          <details className="text-xs">
            <summary className="cursor-pointer text-[var(--color-text-muted)] hover:text-[var(--color-text)] select-none">
              Usage & cost (optional — leave blank to estimate)
            </summary>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div>
                <label className="text-[9px] uppercase text-[var(--color-text-muted)]">
                  Input tokens
                </label>
                <input
                  value={inputTokensStr}
                  onChange={(e) => setInputTokensStr(e.target.value)}
                  placeholder={estimate ? String(estimate.inputTokens) : ""}
                  className="w-full mt-0.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[9px] uppercase text-[var(--color-text-muted)]">
                  Output tokens
                </label>
                <input
                  value={outputTokensStr}
                  onChange={(e) => setOutputTokensStr(e.target.value)}
                  placeholder={estimate ? String(estimate.outputTokens) : ""}
                  className="w-full mt-0.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[9px] uppercase text-[var(--color-text-muted)]">
                  Cost (USD)
                </label>
                <input
                  value={costStr}
                  onChange={(e) => setCostStr(e.target.value)}
                  placeholder={estimate ? estimate.costUsd.toFixed(4) : ""}
                  className="w-full mt-0.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 text-xs font-mono"
                />
              </div>
            </div>
            {estimate && (
              <div className="mt-2 text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
                <Info size={10} />
                <span>
                  Will record{" "}
                  <span className="font-mono">
                    {estimate.inputTokens} in / {estimate.outputTokens} out
                  </span>{" "}
                  at{" "}
                  <span className="font-mono">
                    {formatCost(estimate.costUsd)}
                  </span>
                  {(estimate.inputWasEstimated ||
                    estimate.outputWasEstimated ||
                    estimate.costWasEstimated) &&
                    " (estimated)"}
                </span>
              </div>
            )}
          </details>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-[var(--color-border)]">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy || !content.trim()}
            className="px-3 py-1.5 bg-[var(--color-accent)] text-white rounded text-xs font-medium hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? "Saving…" : "Save manual run"}
          </button>
        </div>
      </div>
    </div>
  );
}
