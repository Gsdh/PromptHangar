import { useMemo } from "react";
import { ArrowLeftRight } from "lucide-react";
import { useAppStore } from "../store";
import type { Revision } from "../types";
import { computeLineDiff } from "../lib/diff";

interface Props {
  historic: Revision;
  latest: Revision;
}

export function RevisionDiffViewer({ historic, latest }: Props) {
  const viewRevision = useAppStore((s) => s.viewRevision);
  const mode = useAppStore((s) => s.settings?.mode ?? "writer");

  const diffLines = useMemo(
    () => computeLineDiff(historic.content, latest.content),
    [historic.content, latest.content]
  );

  const metaChanges = useMemo(() => {
    const changes: { label: string; from: string; to: string }[] = [];
    if ((historic.model ?? "") !== (latest.model ?? "")) {
      changes.push({
        label: "Model",
        from: historic.model ?? "—",
        to: latest.model ?? "—",
      });
    }
    if ((historic.system_prompt ?? "") !== (latest.system_prompt ?? "")) {
      changes.push({
        label: "System prompt",
        from: historic.system_prompt ?? "—",
        to: latest.system_prompt ?? "—",
      });
    }
    const hp = historic.params ?? {};
    const lp = latest.params ?? {};
    for (const key of new Set([...Object.keys(hp), ...Object.keys(lp)])) {
      if (JSON.stringify(hp[key]) !== JSON.stringify(lp[key])) {
        changes.push({
          label: key,
          from: JSON.stringify(hp[key] ?? "—"),
          to: JSON.stringify(lp[key] ?? "—"),
        });
      }
    }
    return changes;
  }, [historic, latest]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 py-3 border-b border-[var(--color-border)] flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-mono font-semibold">#{historic.revision_number}</span>
          <ArrowLeftRight size={14} className="text-[var(--color-text-muted)]" />
          <span className="font-mono font-semibold">#{latest.revision_number}</span>
          <span className="text-[var(--color-text-muted)]">
            — comparison
          </span>
        </div>
        <button
          type="button"
          onClick={() => viewRevision(null)}
          className="ml-auto text-xs px-3 py-1 bg-[var(--color-accent)] text-white rounded hover:brightness-110"
        >
          Back to latest
        </button>
      </div>

      {/* Metadata diff */}
      {mode === "engineer" && metaChanges.length > 0 && (
        <div className="px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-muted)] mb-2">
            Metadata changes
          </div>
          <div className="space-y-1">
            {metaChanges.map((c, i) => (
              <div key={i} className="text-xs flex items-center gap-2 font-mono">
                <span className="text-[var(--color-text-muted)] min-w-[100px]">
                  {c.label}:
                </span>
                <span className="bg-red-500/10 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded">
                  {truncate(c.from, 60)}
                </span>
                <span className="text-[var(--color-text-muted)]">→</span>
                <span className="bg-green-500/10 text-green-700 dark:text-green-500 px-1.5 py-0.5 rounded">
                  {truncate(c.to, 60)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Text diff */}
      <div className="flex-1 overflow-y-auto font-mono text-xs">
        {diffLines.map((line, i) => (
          <div
            key={i}
            className={
              line.kind === "add"
                ? "bg-green-500/10 text-green-800 dark:text-green-400"
                : line.kind === "del"
                  ? "bg-red-500/10 text-red-800 dark:text-red-400"
                  : ""
            }
          >
            <span className="inline-block w-8 text-right pr-2 text-[var(--color-text-muted)] select-none">
              {line.kind === "add" ? "+" : line.kind === "del" ? "−" : " "}
            </span>
            <span className="whitespace-pre-wrap">{line.text || " "}</span>
          </div>
        ))}
        {diffLines.length === 0 && (
          <div className="p-6 text-center text-[var(--color-text-muted)]">
            Identical content.
          </div>
        )}
      </div>
    </div>
  );
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}
