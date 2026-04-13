import { useEffect, useState } from "react";
import { X, FlaskConical, Plus, Check, XCircle } from "lucide-react";
import clsx from "clsx";
import { useAppStore } from "../store";
import * as api from "../api";
import { toast } from "./Toast";

interface Props {
  onClose: () => void;
}

interface ABTest {
  id: string;
  name: string;
  status: string;
  created_at: string;
  ended_at: string | null;
  variants: {
    id: string;
    revision_id: string;
    revision_number: number;
    weight: number;
    impressions: number;
    successes: number;
  }[];
}

export function ABTestModal({ onClose }: Props) {
  const activePrompt = useAppStore((s) => s.activePrompt);
  const revisions = useAppStore((s) => s.revisions);
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function refresh() {
    if (!activePrompt) return;
    try {
      const data = await api.getAbTests(activePrompt.prompt.id);
      setTests(data as ABTest[]);
    } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => { void refresh(); }, [activePrompt?.prompt.id]);

  if (!activePrompt) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="glass-panel max-w-xl w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <FlaskConical size={16} className="text-[var(--color-accent)]" />
            <h2 className="text-base font-semibold">A/B Tests</h2>
            <span className="text-xs text-[var(--color-text-muted)]">for {activePrompt.prompt.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCreating(true)} className="flex items-center gap-1 px-2 py-1 bg-[var(--color-accent)] text-white rounded text-[10px] font-medium hover:brightness-110">
              <Plus size={10} /> New test
            </button>
            <button onClick={onClose} className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"><X size={16} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {creating && (
            <CreateTest
              revisions={revisions}
              promptId={activePrompt.prompt.id}
              onDone={() => { setCreating(false); void refresh(); }}
              onCancel={() => setCreating(false)}
            />
          )}

          {loading ? (
            <div className="text-center py-8 text-sm text-[var(--color-text-muted)]">Loading...</div>
          ) : tests.length === 0 && !creating ? (
            <div className="text-center py-8">
              <FlaskConical size={20} className="mx-auto mb-2 opacity-40 text-[var(--color-text-muted)]" />
              <div className="text-xs text-[var(--color-text-muted)]">No A/B tests yet. Create one to compare revision variants.</div>
            </div>
          ) : (
            tests.map((test) => (
              <div key={test.id} className="border border-[var(--color-border)] rounded-md bg-[var(--color-bg)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-medium text-sm">{test.name}</div>
                  <span className={clsx(
                    "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded",
                    test.status === "active" ? "bg-emerald-500/20 text-emerald-600" : "bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]"
                  )}>{test.status}</span>
                </div>
                <div className="space-y-2">
                  {test.variants.map((v) => {
                    const rate = v.impressions > 0 ? (v.successes / v.impressions * 100).toFixed(1) : "0.0";
                    const maxImpressions = Math.max(...test.variants.map((x) => x.impressions), 1);
                    return (
                      <div key={v.id} className="flex items-center gap-3">
                        <span className="text-[10px] font-mono w-6 text-right">#{v.revision_number}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <div className="flex-1 h-2 bg-[var(--color-bg-subtle)] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[var(--color-accent)] rounded-full transition-all"
                                style={{ width: `${(v.impressions / maxImpressions) * 100}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-[9px] text-[var(--color-text-muted)]">
                            <span>{v.impressions} runs</span>
                            <span>·</span>
                            <span className={Number(rate) > 50 ? "text-emerald-500 font-semibold" : ""}>{rate}% success</span>
                            <span>·</span>
                            <span>weight: {(v.weight * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => { void api.recordAbImpression(v.id, true); void refresh(); }}
                            className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded" title="Record success"
                          ><Check size={10} /></button>
                          <button
                            onClick={() => { void api.recordAbImpression(v.id, false); void refresh(); }}
                            className="p-1 text-red-500 hover:bg-red-500/10 rounded" title="Record failure"
                          ><XCircle size={10} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function CreateTest({ revisions, promptId, onDone, onCancel }: {
  revisions: { id: string; revision_number: number }[];
  promptId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  async function save() {
    if (!name.trim() || selected.length < 2) return;
    await api.createAbTest(promptId, name.trim(), selected);
    toast("A/B test created", "success");
    onDone();
  }

  return (
    <div className="border border-[var(--color-accent)]/30 rounded-md bg-[var(--color-bg)] p-4 space-y-3">
      <div className="text-sm font-semibold">New A/B Test</div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Test name" autoFocus
        className="w-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[var(--color-accent)]" />
      <div>
        <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-muted)] mb-1">Select variants (min. 2 revisions)</div>
        <div className="flex flex-wrap gap-1.5">
          {revisions.map((r) => (
            <button key={r.id} type="button"
              onClick={() => setSelected((s) => s.includes(r.id) ? s.filter((x) => x !== r.id) : [...s, r.id])}
              className={clsx("px-2 py-1 rounded text-[10px] font-mono border transition-colors",
                selected.includes(r.id) ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]" : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]"
              )}>#{r.revision_number}</button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => void save()} disabled={!name.trim() || selected.length < 2}
          className={clsx("flex-1 py-1.5 rounded text-xs font-medium", name.trim() && selected.length >= 2 ? "bg-[var(--color-accent)] text-white" : "bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] cursor-not-allowed")}>
          Create test
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 border border-[var(--color-border)] rounded text-xs">Cancel</button>
      </div>
    </div>
  );
}
