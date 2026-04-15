import { useEffect, useMemo, useState } from "react";
import { X, Swords, Clock, Hash, DollarSign, ArrowRight, TrendingDown, TrendingUp, Minus } from "lucide-react";
import clsx from "clsx";
import * as api from "../api";
import type { ComparisonTrace } from "../api";
import { formatCost } from "../lib/pricing";

interface Props {
  comparisonId: string;
  onClose: () => void;
}

/**
 * Epic 7 — Bake-off result modal.
 *
 * Fetches every trace sharing a `comparison_id` and pairs baseline vs
 * candidate rows by model. For each model we render a row with:
 *   - both outputs side-by-side
 *   - cost / latency / token deltas (candidate − baseline)
 *
 * The modal is read-only — it's a results view, not an editor. Users mark
 * a revision as "champion" from the RevisionTimeline trophy button.
 */
export function ComparisonModal({ comparisonId, onClose }: Props) {
  const [rows, setRows] = useState<ComparisonTrace[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.getComparison(comparisonId);
        if (!cancelled) setRows(data);
      } catch (e) {
        if (!cancelled) setErr(String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [comparisonId]);

  // Group paired rows by model so each model card shows baseline + candidate.
  const pairs = useMemo(() => {
    if (!rows) return [];
    const byModel = new Map<string, { baseline: ComparisonTrace[]; candidate: ComparisonTrace[] }>();
    for (const r of rows) {
      const key = `${r.provider}::${r.model}`;
      if (!byModel.has(key)) byModel.set(key, { baseline: [], candidate: [] });
      const bucket = byModel.get(key)!;
      if (r.comparison_side === "baseline") bucket.baseline.push(r);
      else if (r.comparison_side === "candidate") bucket.candidate.push(r);
    }
    // Sort by model name for stable display.
    return Array.from(byModel.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => ({
        key,
        provider: v.baseline[0]?.provider ?? v.candidate[0]?.provider ?? "",
        model: v.baseline[0]?.model ?? v.candidate[0]?.model ?? "",
        baseline: v.baseline[0] ?? null,
        candidate: v.candidate[0] ?? null,
      }));
  }, [rows]);

  // Roll-up stats across every model in this bake-off.
  const totals = useMemo(() => {
    if (!rows) return null;
    const acc = {
      baselineCost: 0,
      candidateCost: 0,
      baselineLatency: 0,
      candidateLatency: 0,
      baselineTokens: 0,
      candidateTokens: 0,
      baselineCount: 0,
      candidateCount: 0,
    };
    for (const r of rows) {
      const cost = r.cost_usd ?? 0;
      const lat = r.latency_ms ?? 0;
      const tok = (r.input_tokens ?? 0) + (r.output_tokens ?? 0);
      if (r.comparison_side === "baseline") {
        acc.baselineCost += cost;
        acc.baselineLatency += lat;
        acc.baselineTokens += tok;
        acc.baselineCount += 1;
      } else if (r.comparison_side === "candidate") {
        acc.candidateCost += cost;
        acc.candidateLatency += lat;
        acc.candidateTokens += tok;
        acc.candidateCount += 1;
      }
    }
    return acc;
  }, [rows]);

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="glass-panel max-w-6xl w-full max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <Swords size={16} className="text-amber-500" />
            <h2 className="text-base font-semibold">Bake-off results</h2>
            <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
              {comparisonId.slice(0, 8)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Totals strip */}
        {totals && (totals.baselineCount > 0 || totals.candidateCount > 0) && (
          <div className="grid grid-cols-3 gap-3 px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]/40">
            <DeltaCard
              icon={<DollarSign size={11} />}
              label="Total cost"
              baseline={formatCost(totals.baselineCost)}
              candidate={formatCost(totals.candidateCost)}
              delta={totals.candidateCost - totals.baselineCost}
              formatDelta={(d) => (d >= 0 ? `+${formatCost(Math.abs(d))}` : `-${formatCost(Math.abs(d))}`)}
              lowerIsBetter
            />
            <DeltaCard
              icon={<Clock size={11} />}
              label="Total latency"
              baseline={`${(totals.baselineLatency / 1000).toFixed(1)}s`}
              candidate={`${(totals.candidateLatency / 1000).toFixed(1)}s`}
              delta={totals.candidateLatency - totals.baselineLatency}
              formatDelta={(d) => (d >= 0 ? `+${(d / 1000).toFixed(1)}s` : `-${(Math.abs(d) / 1000).toFixed(1)}s`)}
              lowerIsBetter
            />
            <DeltaCard
              icon={<Hash size={11} />}
              label="Total tokens"
              baseline={totals.baselineTokens.toLocaleString()}
              candidate={totals.candidateTokens.toLocaleString()}
              delta={totals.candidateTokens - totals.baselineTokens}
              formatDelta={(d) => (d >= 0 ? `+${d.toLocaleString()}` : `-${Math.abs(d).toLocaleString()}`)}
              lowerIsBetter
            />
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {err && (
            <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded p-3">
              {err}
            </div>
          )}
          {!rows && !err && (
            <div className="text-sm text-[var(--color-text-muted)] text-center py-8">
              Loading comparison…
            </div>
          )}
          {rows && pairs.length === 0 && (
            <div className="text-sm text-[var(--color-text-muted)] text-center py-8">
              No trace rows were found for this bake-off.
            </div>
          )}
          {pairs.map((p) => (
            <PairCard key={p.key} pair={p} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** One model card — two columns (baseline / candidate) with deltas. */
function PairCard({
  pair,
}: {
  pair: {
    key: string;
    provider: string;
    model: string;
    baseline: ComparisonTrace | null;
    candidate: ComparisonTrace | null;
  };
}) {
  const { baseline, candidate } = pair;
  const costDelta =
    candidate && baseline
      ? (candidate.cost_usd ?? 0) - (baseline.cost_usd ?? 0)
      : null;
  const latDelta =
    candidate && baseline
      ? (candidate.latency_ms ?? 0) - (baseline.latency_ms ?? 0)
      : null;
  const outTokDelta =
    candidate && baseline
      ? (candidate.output_tokens ?? 0) - (baseline.output_tokens ?? 0)
      : null;

  return (
    <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)]">
        <span className="text-xs font-semibold">{pair.model}</span>
        <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
          {pair.provider}
        </span>
        <div className="flex-1" />
        {/* Compact delta chips */}
        <DeltaChip
          label="cost"
          value={costDelta}
          format={(d) => (d >= 0 ? `+${formatCost(Math.abs(d))}` : `-${formatCost(Math.abs(d))}`)}
        />
        <DeltaChip
          label="latency"
          value={latDelta}
          format={(d) => (d >= 0 ? `+${(d / 1000).toFixed(2)}s` : `-${(Math.abs(d) / 1000).toFixed(2)}s`)}
        />
        <DeltaChip
          label="out tok"
          value={outTokDelta}
          format={(d) => (d >= 0 ? `+${d}` : `${d}`)}
        />
      </div>

      <div className="grid grid-cols-2">
        <SideColumn
          title="Baseline"
          tone="baseline"
          trace={baseline}
        />
        <SideColumn
          title="Candidate"
          tone="candidate"
          trace={candidate}
        />
      </div>
    </div>
  );
}

function SideColumn({
  title,
  tone,
  trace,
}: {
  title: string;
  tone: "baseline" | "candidate";
  trace: ComparisonTrace | null;
}) {
  if (!trace) {
    return (
      <div
        className={clsx(
          "p-4 text-xs text-[var(--color-text-muted)]",
          tone === "candidate" && "border-l border-[var(--color-border)]",
        )}
      >
        <div className="font-semibold uppercase tracking-wider text-[10px] mb-2">
          {title}
        </div>
        <div className="italic opacity-60">(no run)</div>
      </div>
    );
  }
  const tok = (trace.input_tokens ?? 0) + (trace.output_tokens ?? 0);
  return (
    <div
      className={clsx(
        "p-4",
        tone === "candidate" && "border-l border-[var(--color-border)]",
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className={clsx(
            "text-[10px] font-semibold uppercase tracking-wider",
            tone === "baseline" ? "text-[var(--color-text-muted)]" : "text-[var(--color-accent)]",
          )}
        >
          {title}
        </span>
        <div className="flex items-center gap-2 text-[9px] font-mono text-[var(--color-text-muted)]">
          <span>{formatCost(trace.cost_usd ?? 0)}</span>
          <span>·</span>
          <span>{trace.latency_ms ? `${(trace.latency_ms / 1000).toFixed(1)}s` : "—"}</span>
          <span>·</span>
          <span>{tok.toLocaleString()} tok</span>
        </div>
      </div>
      {trace.status !== "success" && (
        <div className="mb-2 text-[10px] text-red-500">
          {trace.status}: {trace.error ?? "unknown"}
        </div>
      )}
      <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-[var(--color-text)] max-h-96 overflow-y-auto">
        {trace.output || "(empty output)"}
      </pre>
    </div>
  );
}

/** A three-line stat card for the totals strip. */
function DeltaCard({
  icon,
  label,
  baseline,
  candidate,
  delta,
  formatDelta,
  lowerIsBetter,
}: {
  icon: React.ReactNode;
  label: string;
  baseline: string;
  candidate: string;
  delta: number;
  formatDelta: (d: number) => string;
  lowerIsBetter: boolean;
}) {
  const better = lowerIsBetter ? delta < 0 : delta > 0;
  const worse = lowerIsBetter ? delta > 0 : delta < 0;
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-2.5">
      <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">
        {icon}
        {label}
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs font-mono">
        <span className="text-[var(--color-text-muted)]">{baseline}</span>
        <ArrowRight size={10} className="text-[var(--color-text-muted)]" />
        <span className="font-semibold">{candidate}</span>
      </div>
      <div
        className={clsx(
          "mt-1 flex items-center gap-1 text-[10px] font-mono",
          better && "text-emerald-500",
          worse && "text-red-500",
          !better && !worse && "text-[var(--color-text-muted)]",
        )}
      >
        {better ? <TrendingDown size={9} /> : worse ? <TrendingUp size={9} /> : <Minus size={9} />}
        {formatDelta(delta)}
      </div>
    </div>
  );
}

/** A tiny coloured delta chip for the model header strip. */
function DeltaChip({
  label,
  value,
  format,
}: {
  label: string;
  value: number | null;
  format: (d: number) => string;
}) {
  if (value === null) {
    return (
      <span className="text-[9px] font-mono text-[var(--color-text-muted)]">
        {label} —
      </span>
    );
  }
  const tone =
    value === 0
      ? "text-[var(--color-text-muted)]"
      : value < 0
        ? "text-emerald-500"
        : "text-red-500";
  return (
    <span className={clsx("text-[9px] font-mono", tone)}>
      {label} {format(value)}
    </span>
  );
}
