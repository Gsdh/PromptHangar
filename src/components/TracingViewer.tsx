import { useEffect, useState } from "react";
import { X, Activity, Clock, Hash, DollarSign, AlertTriangle, Check, ChevronDown, ChevronRight, ClipboardPaste } from "lucide-react";
import clsx from "clsx";
import * as api from "../api";
import type { TraceRow } from "../api";
import { useAppStore } from "../store";

type Trace = TraceRow;

interface Props {
  onClose: () => void;
}

export function TracingViewer({ onClose }: Props) {
  const activePrompt = useAppStore((s) => s.activePrompt);
  const [traces, setTraces] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPrompt, setFilterPrompt] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function refresh() {
    try {
      const pid = filterPrompt ? activePrompt?.prompt.id : undefined;
      const data = await api.listTraces(pid, 200);
      setTraces(data as Trace[]);
    } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => { void refresh(); }, [activePrompt?.prompt.id, filterPrompt]);

  const totalCost = traces.reduce((sum, t) => sum + (t.cost_usd ?? 0), 0);
  const totalTokens = traces.reduce((sum, t) => sum + (t.input_tokens ?? 0) + (t.output_tokens ?? 0), 0);
  const avgLatency = traces.length > 0 ? traces.reduce((sum, t) => sum + (t.latency_ms ?? 0), 0) / traces.length : 0;
  const errorCount = traces.filter((t) => t.status !== "success").length;

  return (
    <div className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="glass-panel max-w-4xl w-full max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-[var(--color-accent)]" />
            <h2 className="text-base font-semibold">Traces</h2>
            <span className="text-xs text-[var(--color-text-muted)]">{traces.length} calls</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)] cursor-pointer">
              <input type="checkbox" checked={filterPrompt} onChange={(e) => setFilterPrompt(e.target.checked)} className="accent-[var(--color-accent)]" />
              Current prompt only
            </label>
            <button onClick={onClose} className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"><X size={16} /></button>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-3 p-4 border-b border-[var(--color-border)]">
          <StatPill icon={<Hash size={10} />} label="Total tokens" value={totalTokens.toLocaleString()} />
          <StatPill icon={<Clock size={10} />} label="Avg latency" value={`${(avgLatency / 1000).toFixed(1)}s`} />
          <StatPill icon={<DollarSign size={10} />} label="Total cost" value={totalCost > 0 ? `$${totalCost.toFixed(4)}` : "Free"} />
          <StatPill icon={<AlertTriangle size={10} />} label="Errors" value={String(errorCount)} alert={errorCount > 0} />
        </div>

        {/* Trace list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-sm text-[var(--color-text-muted)]">Loading...</div>
          ) : traces.length === 0 ? (
            <div className="text-center py-8">
              <Activity size={20} className="mx-auto mb-2 opacity-40 text-[var(--color-text-muted)]" />
              <div className="text-xs text-[var(--color-text-muted)]">No traces yet. Run a prompt in the Playground to see API calls here.</div>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[var(--color-bg-elevated)]">
                <tr className="border-b border-[var(--color-border)] text-left text-[9px] uppercase tracking-wider text-[var(--color-text-muted)]">
                  <th className="px-4 py-2 w-8"></th>
                  <th className="px-2 py-2">Time</th>
                  <th className="px-2 py-2">Provider</th>
                  <th className="px-2 py-2">Model</th>
                  <th className="px-2 py-2 text-right">Tokens</th>
                  <th className="px-2 py-2 text-right">Latency</th>
                  <th className="px-2 py-2 text-right">Cost</th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {traces.map((t) => (
                  <tr key={t.id}
                    className={clsx("border-b border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)] cursor-pointer transition-colors", expandedId === t.id && "bg-[var(--color-bg-subtle)]")}
                    onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                  >
                    <td className="px-4 py-2">
                      {expandedId === t.id ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                    </td>
                    <td className="px-2 py-2 font-mono text-[var(--color-text-muted)]">{formatTime(t.created_at)}</td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1.5">
                        <span>{t.provider}</span>
                        {t.source === "manual" && (
                          <span
                            title="Manual entry — user pasted this output"
                            className="flex items-center gap-0.5 px-1 py-px rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[8px] font-bold uppercase"
                          >
                            <ClipboardPaste size={7} />
                            manual
                          </span>
                        )}
                        {t.source === "imported" && (
                          <span
                            title="Imported from elsewhere"
                            className="px-1 py-px rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[8px] font-bold uppercase"
                          >
                            import
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2 font-mono truncate max-w-[120px]">{t.model}</td>
                    <td className="px-2 py-2 text-right font-mono">{((t.input_tokens ?? 0) + (t.output_tokens ?? 0)).toLocaleString()}</td>
                    <td className="px-2 py-2 text-right font-mono">{t.latency_ms ? `${(t.latency_ms / 1000).toFixed(1)}s` : "—"}</td>
                    <td className="px-2 py-2 text-right font-mono">{t.cost_usd ? `$${t.cost_usd.toFixed(4)}` : "—"}</td>
                    <td className="px-2 py-2">
                      {t.status === "success" ? (
                        <Check size={10} className="text-emerald-500" />
                      ) : (
                        <AlertTriangle size={10} className="text-red-500" />
                      )}
                    </td>
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

function StatPill({ icon, label, value, alert }: { icon: React.ReactNode; label: string; value: string; alert?: boolean }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[var(--color-bg)] rounded border border-[var(--color-border)]">
      <span className={clsx("text-[var(--color-text-muted)]", alert && "text-red-500")}>{icon}</span>
      <div>
        <div className={clsx("text-sm font-bold tabular-nums", alert && "text-red-500")}>{value}</div>
        <div className="text-[9px] text-[var(--color-text-muted)]">{label}</div>
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
}
