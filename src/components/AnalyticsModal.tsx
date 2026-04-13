import { useEffect, useState } from "react";
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
} from "lucide-react";
import { getStats } from "../api";

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

export function AnalyticsModal({ onClose }: Props) {
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

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="glass-panel max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
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

        {loading ? (
          <div className="p-8 text-center text-sm text-[var(--color-text-muted)]">
            Loading…
          </div>
        ) : stats ? (
          <div className="p-5 space-y-5">
            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                icon={<FileText size={14} />}
                label="Prompts"
                value={stats.total_prompts}
              />
              <StatCard
                icon={<GitBranch size={14} />}
                label="Revisions"
                value={stats.total_revisions}
              />
              <StatCard
                icon={<MessageSquare size={14} />}
                label="Results"
                value={stats.total_outputs}
              />
              <StatCard
                icon={<Folder size={14} />}
                label="Folders"
                value={stats.total_folders}
              />
              <StatCard
                icon={<Star size={14} />}
                label="Flagged"
                value={stats.flagged_revisions}
              />
              <StatCard
                icon={<TrendingUp size={14} />}
                label="Avg. revisions"
                value={avgRevisions}
              />
            </div>

            {/* Top tags */}
            {stats.top_tags.length > 0 && (
              <div>
                <h3 className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-muted)] mb-2 flex items-center gap-1">
                  <Tag size={10} />
                  Top tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {stats.top_tags.map((t) => (
                    <span
                      key={t.tag}
                      className="inline-flex items-center gap-1 text-xs bg-[var(--color-accent)]/10 text-[var(--color-accent)] px-2 py-1 rounded"
                    >
                      #{t.tag}
                      <span className="text-[10px] opacity-60">
                        ({t.count})
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Most revised */}
            {stats.most_revised.length > 0 && (
              <div>
                <h3 className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-muted)] mb-2 flex items-center gap-1">
                  <TrendingUp size={10} />
                  Most revised prompts
                </h3>
                <div className="space-y-1.5">
                  {stats.most_revised.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs"
                    >
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
                              (p.revisions / (stats.most_revised[0]?.revisions ?? 1)) * 80
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
        ) : (
          <div className="p-8 text-center text-sm text-[var(--color-text-muted)]">
            No data available.
          </div>
        )}

        <div className="px-5 py-3 border-t border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
          <Lock size={12} /> All stats computed from your local database
        </div>
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
