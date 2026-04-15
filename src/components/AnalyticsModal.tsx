import { useEffect, useMemo, useState } from "react";
import {
  X,
  BarChart3,
  FileText,
  GitBranch,
  MessageSquare,
  Folder,
  Star,
  Tag,
  TrendingUp,
  Lock,
  DollarSign,
  Clock,
  Activity,
  Download,
  AlertCircle,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import clsx from "clsx";
import {
  getStats,
  getSpendTimeseries,
  getModelBreakdown,
  exportTracesCsv,
  type SpendBucket,
  type ModelBreakdown,
} from "../api";
import { formatCost } from "../lib/pricing";
import { toast } from "./Toast";

interface Stats {
  total_prompts: number;
  total_revisions: number;
  total_outputs: number;
  total_folders: number;
  flagged_revisions: number;
  top_tags: { tag: string; count: number }[];
  most_revised: { title: string; revisions: number }[];
}

interface Props {
  onClose: () => void;
}

type Tab = "overview" | "spend" | "models";
type Range = 7 | 30 | 90;

export function AnalyticsModal({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const [range, setRange] = useState<Range>(30);

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="glass-panel max-w-4xl w-full max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-[var(--color-accent)]" />
            <h2 className="text-base font-semibold">Analytics</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded hover:bg-[var(--color-bg-subtle)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs + range */}
        <div className="flex items-center gap-1 px-3 border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]/30">
          <TabButton
            active={tab === "overview"}
            onClick={() => setTab("overview")}
            icon={<BarChart3 size={11} />}
          >
            Overview
          </TabButton>
          <TabButton
            active={tab === "spend"}
            onClick={() => setTab("spend")}
            icon={<DollarSign size={11} />}
          >
            Spend
          </TabButton>
          <TabButton
            active={tab === "models"}
            onClick={() => setTab("models")}
            icon={<Activity size={11} />}
          >
            Models
          </TabButton>
          <div className="flex-1" />
          {(tab === "spend" || tab === "models") && (
            <div className="flex items-center gap-1 py-1.5">
              {([7, 30, 90] as Range[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={clsx(
                    "px-2 py-0.5 rounded text-[10px] font-medium",
                    range === r
                      ? "bg-[var(--color-accent)] text-white"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]",
                  )}
                >
                  {r}d
                </button>
              ))}
            </div>
          )}
          <ExportCsvButton />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {tab === "overview" && <OverviewTab />}
          {tab === "spend" && <SpendTab days={range} />}
          {tab === "models" && <ModelsTab days={range} />}
        </div>

        <div className="px-5 py-3 border-t border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
          <Lock size={12} /> All stats computed from your local database
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors",
        active
          ? "border-[var(--color-accent)] text-[var(--color-text)]"
          : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

// ---------- Overview tab (original stats) ----------

function OverviewTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats()
      .then((s) => setStats(s as Stats))
      .catch((err) => console.error("stats failed", err))
      .finally(() => setLoading(false));
  }, []);

  const avgRevisions =
    stats && stats.total_prompts > 0
      ? (stats.total_revisions / stats.total_prompts).toFixed(1)
      : "0";

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-[var(--color-text-muted)]">
        Loading…
      </div>
    );
  }
  if (!stats) {
    return (
      <div className="p-8 text-center text-sm text-[var(--color-text-muted)]">
        No data available.
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<FileText size={14} />} label="Prompts" value={stats.total_prompts} />
        <StatCard icon={<GitBranch size={14} />} label="Revisions" value={stats.total_revisions} />
        <StatCard icon={<MessageSquare size={14} />} label="Results" value={stats.total_outputs} />
        <StatCard icon={<Folder size={14} />} label="Folders" value={stats.total_folders} />
        <StatCard icon={<Star size={14} />} label="Flagged" value={stats.flagged_revisions} />
        <StatCard icon={<TrendingUp size={14} />} label="Avg. revisions" value={avgRevisions} />
      </div>

      {stats.top_tags.length > 0 && (
        <div>
          <h3 className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-muted)] mb-2 flex items-center gap-1">
            <Tag size={10} /> Top tags
          </h3>
          <div className="flex flex-wrap gap-2">
            {stats.top_tags.map((t) => (
              <span
                key={t.tag}
                className="inline-flex items-center gap-1 text-xs bg-[var(--color-accent)]/10 text-[var(--color-accent)] px-2 py-1 rounded"
              >
                #{t.tag}
                <span className="text-[10px] opacity-60">({t.count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {stats.most_revised.length > 0 && (
        <div>
          <h3 className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-muted)] mb-2 flex items-center gap-1">
            <TrendingUp size={10} /> Most revised prompts
          </h3>
          <div className="space-y-1.5">
            {stats.most_revised.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="text-[var(--color-text-muted)] w-4 text-right font-mono">
                  {i + 1}.
                </span>
                <span className="flex-1 truncate">{p.title}</span>
                <div className="flex items-center gap-1">
                  <div
                    className="h-1.5 rounded-full bg-[var(--color-accent)]"
                    style={{
                      width: `${Math.min(
                        80,
                        (p.revisions / (stats.most_revised[0]?.revisions ?? 1)) * 80,
                      )}px`,
                    }}
                  />
                  <span className="text-[10px] text-[var(--color-text-muted)] w-6 text-right">
                    {p.revisions}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Spend tab ----------

function SpendTab({ days }: { days: Range }) {
  const [buckets, setBuckets] = useState<SpendBucket[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setBuckets(null);
    setErr(null);
    getSpendTimeseries(days)
      .then(setBuckets)
      .catch((e) => setErr(String(e)));
  }, [days]);

  // Zero-fill missing days so the line chart has a continuous x-axis.
  const series = useMemo(() => {
    if (!buckets) return [];
    const byDay = new Map(buckets.map((b) => [b.day, b]));
    const today = new Date();
    const out: SpendBucket[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setUTCDate(today.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      out.push(
        byDay.get(key) ?? {
          day: key,
          cost_usd: 0,
          input_tokens: 0,
          output_tokens: 0,
          runs: 0,
          avg_latency_ms: 0,
        },
      );
    }
    return out;
  }, [buckets, days]);

  const totals = useMemo(() => {
    if (!buckets) return null;
    return buckets.reduce(
      (a, b) => ({
        cost: a.cost + b.cost_usd,
        runs: a.runs + b.runs,
        tokens: a.tokens + b.input_tokens + b.output_tokens,
      }),
      { cost: 0, runs: 0, tokens: 0 },
    );
  }, [buckets]);

  if (err) return <EmptyState message={err} />;
  if (!buckets) return <Loading />;
  if (buckets.length === 0)
    return (
      <EmptyState
        message={`No trace data in the last ${days} days. Run a prompt to see numbers here.`}
      />
    );

  return (
    <div className="p-5 space-y-5">
      {totals && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={<DollarSign size={14} />}
            label={`Spend · ${days}d`}
            value={formatCost(totals.cost)}
          />
          <StatCard
            icon={<Activity size={14} />}
            label="Total runs"
            value={totals.runs.toLocaleString()}
          />
          <StatCard
            icon={<FileText size={14} />}
            label="Total tokens"
            value={formatCompact(totals.tokens)}
          />
        </div>
      )}

      {/* Daily cost */}
      <ChartBlock title="Daily cost (USD)">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 9, fill: "var(--color-text-muted)" }}
              tickFormatter={(v: string) => v.slice(5)}
              stroke="var(--color-border)"
            />
            <YAxis
              tick={{ fontSize: 9, fill: "var(--color-text-muted)" }}
              tickFormatter={(v: number) => `$${v.toFixed(v < 1 ? 3 : 2)}`}
              stroke="var(--color-border)"
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: 4,
                fontSize: 11,
              }}
              formatter={(v) => formatCost(typeof v === "number" ? v : Number(v) || 0)}
              labelStyle={{ color: "var(--color-text-muted)" }}
            />
            <Line
              type="monotone"
              dataKey="cost_usd"
              stroke="var(--color-accent)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartBlock>

      {/* Daily runs */}
      <ChartBlock title="Daily runs">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 9, fill: "var(--color-text-muted)" }}
              tickFormatter={(v: string) => v.slice(5)}
              stroke="var(--color-border)"
            />
            <YAxis
              tick={{ fontSize: 9, fill: "var(--color-text-muted)" }}
              stroke="var(--color-border)"
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: 4,
                fontSize: 11,
              }}
              labelStyle={{ color: "var(--color-text-muted)" }}
            />
            <Bar dataKey="runs" fill="var(--color-accent)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartBlock>

      {/* Avg latency */}
      <ChartBlock title="Avg latency (ms)">
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 9, fill: "var(--color-text-muted)" }}
              tickFormatter={(v: string) => v.slice(5)}
              stroke="var(--color-border)"
            />
            <YAxis
              tick={{ fontSize: 9, fill: "var(--color-text-muted)" }}
              stroke="var(--color-border)"
              tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${v}ms`)}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: 4,
                fontSize: 11,
              }}
              formatter={(v) => `${typeof v === "number" ? v : Number(v) || 0}ms`}
              labelStyle={{ color: "var(--color-text-muted)" }}
            />
            <Line
              type="monotone"
              dataKey="avg_latency_ms"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartBlock>
    </div>
  );
}

// ---------- Models tab ----------

const MODEL_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#a855f7", "#14b8a6", "#ec4899", "#eab308"];

function ModelsTab({ days }: { days: Range }) {
  const [rows, setRows] = useState<ModelBreakdown[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setRows(null);
    setErr(null);
    getModelBreakdown(days)
      .then(setRows)
      .catch((e) => setErr(String(e)));
  }, [days]);

  const chartData = useMemo(
    () =>
      (rows ?? []).slice(0, 8).map((r, i) => ({
        name: r.model,
        cost_usd: r.cost_usd,
        runs: r.runs,
        avg_latency_ms: r.avg_latency_ms,
        errors: r.errors,
        color: MODEL_COLORS[i % MODEL_COLORS.length],
      })),
    [rows],
  );

  if (err) return <EmptyState message={err} />;
  if (!rows) return <Loading />;
  if (rows.length === 0)
    return (
      <EmptyState
        message={`No trace data in the last ${days} days. Run a prompt to see numbers here.`}
      />
    );

  return (
    <div className="p-5 space-y-5">
      <ChartBlock title="Cost by model (USD)">
        <ResponsiveContainer width="100%" height={Math.max(140, chartData.length * 28)}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
            <XAxis
              type="number"
              tick={{ fontSize: 9, fill: "var(--color-text-muted)" }}
              tickFormatter={(v: number) => `$${v.toFixed(v < 1 ? 3 : 2)}`}
              stroke="var(--color-border)"
            />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
              stroke="var(--color-border)"
              width={140}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: 4,
                fontSize: 11,
              }}
              formatter={(v) => formatCost(typeof v === "number" ? v : Number(v) || 0)}
              labelStyle={{ color: "var(--color-text-muted)" }}
              cursor={{ fill: "var(--color-bg-subtle)" }}
            />
            <Bar dataKey="cost_usd" radius={[0, 2, 2, 0]}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartBlock>

      <ChartBlock title="Runs vs errors per model">
        <ResponsiveContainer width="100%" height={Math.max(140, chartData.length * 28)}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
            <XAxis
              type="number"
              tick={{ fontSize: 9, fill: "var(--color-text-muted)" }}
              allowDecimals={false}
              stroke="var(--color-border)"
            />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
              stroke="var(--color-border)"
              width={140}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: 4,
                fontSize: 11,
              }}
              labelStyle={{ color: "var(--color-text-muted)" }}
              cursor={{ fill: "var(--color-bg-subtle)" }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="runs" name="Runs" fill="var(--color-accent)" radius={[0, 2, 2, 0]} />
            <Bar dataKey="errors" name="Errors" fill="#ef4444" radius={[0, 2, 2, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartBlock>

      {/* Detailed table */}
      <div>
        <h3 className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-muted)] mb-2">
          Per-model detail
        </h3>
        <div className="border border-[var(--color-border)] rounded-md overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-[var(--color-bg-subtle)]">
              <tr className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)]">
                <th className="text-left px-3 py-2 font-semibold">Model</th>
                <th className="text-right px-3 py-2 font-semibold">Runs</th>
                <th className="text-right px-3 py-2 font-semibold">Cost</th>
                <th className="text-right px-3 py-2 font-semibold">In tok</th>
                <th className="text-right px-3 py-2 font-semibold">Out tok</th>
                <th className="text-right px-3 py-2 font-semibold">Avg latency</th>
                <th className="text-right px-3 py-2 font-semibold">Errors</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={`${r.provider}::${r.model}`}
                  className="border-t border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)]/40"
                >
                  <td className="px-3 py-2">
                    <div className="flex flex-col">
                      <span className="font-mono truncate">{r.model}</span>
                      <span className="text-[9px] text-[var(--color-text-muted)]">{r.provider}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{r.runs}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {formatCost(r.cost_usd)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {formatCompact(r.input_tokens)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {formatCompact(r.output_tokens)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {r.avg_latency_ms >= 1000
                      ? `${(r.avg_latency_ms / 1000).toFixed(1)}s`
                      : `${r.avg_latency_ms}ms`}
                  </td>
                  <td
                    className={clsx(
                      "px-3 py-2 text-right font-mono tabular-nums",
                      r.errors > 0 && "text-red-500",
                    )}
                  >
                    {r.errors}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------- Shared atoms ----------

function ChartBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-muted)] mb-2">
        {title}
      </h3>
      <div className="border border-[var(--color-border)] rounded-md p-3 bg-[var(--color-bg)]">
        {children}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md p-3 text-center">
      <div className="flex items-center justify-center gap-1 text-[var(--color-text-muted)] mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function Loading() {
  return (
    <div className="p-10 text-center text-sm text-[var(--color-text-muted)]">
      <Clock size={14} className="mx-auto mb-2 opacity-60 animate-pulse" />
      Loading…
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="p-10 text-center text-sm text-[var(--color-text-muted)]">
      <AlertCircle size={14} className="mx-auto mb-2 opacity-60" />
      {message}
    </div>
  );
}

function ExportCsvButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          // @tauri-apps/plugin-dialog exports `save` via a separate re-export,
          // but `open` with a file-save pattern is brittle. Use the raw `save`.
          const { save } = await import("@tauri-apps/plugin-dialog");
          const path = await save({
            title: "Export traces CSV",
            defaultPath: `traces-${new Date().toISOString().slice(0, 10)}.csv`,
            filters: [{ name: "CSV", extensions: ["csv"] }],
          });
          if (!path) return;
          const count = await exportTracesCsv(path);
          toast(`Exported ${count} trace rows to CSV`, "success");
        } catch (e) {
          toast(`Export failed: ${String(e)}`, "error");
        } finally {
          setBusy(false);
        }
      }}
      title="Dump the traces table to a CSV file"
      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-40"
    >
      <Download size={10} />
      CSV
    </button>
  );
}

/** Compact integer formatter: 12345 → "12.3k", 1200000 → "1.2M". */
function formatCompact(n: number): string {
  if (n < 1000) return n.toString();
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  if (n < 1_000_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  return `${(n / 1_000_000_000).toFixed(1)}B`;
}
