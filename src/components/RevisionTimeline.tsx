import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  Star,
  Clock,
  Pencil,
  Search,
  X,
  CalendarDays,
  Filter,
  GitBranch,
  GitFork,
  Rocket,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { useAppStore } from "../store";
import * as api from "../api";
import { FloatingMenu } from "./FloatingMenu";
import { toast } from "./Toast";
import type { Revision } from "../types";

export function RevisionTimeline() {
  const revisions = useAppStore((s) => s.revisions);
  const viewingRevisionId = useAppStore((s) => s.viewingRevisionId);
  const viewRevision = useAppStore((s) => s.viewRevision);
  const activePrompt = useAppStore((s) => s.activePrompt);
  const mode = useAppStore((s) => s.settings?.mode ?? "basic");
  const updateRevisionMeta = useAppStore((s) => s.updateRevisionMeta);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterFlagged, setFilterFlagged] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [activeBranch, setActiveBranch] = useState("main");
  const [environments, setEnvironments] = useState<{ env_name: string; revision_id: string; revision_number: number; promoted_at: string }[]>([]);
  const [evalScores, setEvalScores] = useState<Record<string, number>>({});

  // Load branches, environments, and eval scores
  useEffect(() => {
    if (!activePrompt) return;
    const pid = activePrompt.prompt.id;
    api.listBranches(pid).then(setBranches).catch(() => {});
    api.getEnvironments(pid).then(setEnvironments).catch(() => {});
    api.getEvalScores(pid).then((scores) => {
      const map: Record<string, number> = {};
      for (const s of scores) map[s.revision_id] = s.score;
      setEvalScores(map);
    }).catch(() => {});
  }, [activePrompt?.prompt.id, revisions.length]);

  const latestId = activePrompt?.latest_revision?.id ?? null;
  const currentViewing = viewingRevisionId ?? latestId;

  // Filter revisions
  const filtered = useMemo(() => {
    let list = revisions;
    if (filterFlagged) {
      list = list.filter((r) => r.flagged);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.content.toLowerCase().includes(q) ||
          (r.note ?? "").toLowerCase().includes(q) ||
          (r.model ?? "").toLowerCase().includes(q) ||
          (r.system_prompt ?? "").toLowerCase().includes(q) ||
          formatFullDate(r.created_at).toLowerCase().includes(q)
      );
    }
    return list;
  }, [revisions, filterFlagged, searchQuery]);

  // Group revisions by date for visual separation
  const grouped = useMemo(() => {
    const groups: { label: string; revisions: Revision[] }[] = [];
    let currentLabel = "";
    for (const rev of filtered) {
      const label = formatDateLabel(rev.created_at);
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, revisions: [rev] });
      } else {
        groups[groups.length - 1].revisions.push(rev);
      }
    }
    return groups;
  }, [filtered]);

  if (!activePrompt) return null;

  return (
    <div className="h-full flex flex-col">
      {/* Environment badges */}
      {environments.length > 0 && (
        <div className="px-3 py-1.5 border-b border-[var(--color-border)] flex flex-wrap gap-1">
          {environments.map((env) => (
            <span
              key={env.env_name}
              className={clsx(
                "text-[8px] font-bold uppercase px-1.5 py-0.5 rounded",
                env.env_name === "production" && "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
                env.env_name === "staging" && "bg-amber-500/20 text-amber-600 dark:text-amber-400",
                env.env_name === "development" && "bg-blue-500/20 text-blue-600 dark:text-blue-400",
                !["production", "staging", "development"].includes(env.env_name) && "bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]"
              )}
              title={`${env.env_name}: revision #${env.revision_number}`}
            >
              {env.env_name === "production" ? "PROD" : env.env_name === "development" ? "DEV" : env.env_name.toUpperCase()} #{env.revision_number}
            </span>
          ))}
        </div>
      )}

      {/* Branch switcher */}
      {branches.length > 1 && (
        <div className="px-3 py-1.5 border-b border-[var(--color-border)] flex items-center gap-1.5">
          <GitBranch size={10} className="text-[var(--color-text-muted)]" />
          <select
            value={activeBranch}
            onChange={(e) => setActiveBranch(e.target.value)}
            className="bg-transparent text-[10px] font-mono font-semibold focus:outline-none text-[var(--color-accent)]"
          >
            {branches.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      )}

      {/* Header */}
      <div className="px-3 py-2 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Revisions {revisions.length > 0 && `(${revisions.length})`}
          </span>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setFilterFlagged((f) => !f)}
              className={clsx(
                "p-1 rounded transition-colors",
                filterFlagged
                  ? "text-amber-400 bg-amber-400/10"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]"
              )}
              title={filterFlagged ? "Show all revisions" : "Show flagged only"}
            >
              <Star size={11} className={filterFlagged ? "fill-amber-400" : ""} />
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchOpen((o) => !o);
                if (searchOpen) setSearchQuery("");
              }}
              className={clsx(
                "p-1 rounded transition-colors",
                searchOpen
                  ? "text-[var(--color-accent)] bg-[var(--color-accent)]/10"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]"
              )}
              title="Search revisions"
            >
              <Search size={11} />
            </button>
          </div>
        </div>

        {/* Search input */}
        {searchOpen && (
          <div className="mt-1.5 flex items-center gap-1">
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setSearchQuery("");
                  setSearchOpen(false);
                }
              }}
              placeholder="Search content, notes, model, date…"
              className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 text-[10px] focus:outline-none focus:border-[var(--color-accent)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-0.5"
              >
                <X size={10} />
              </button>
            )}
          </div>
        )}

        {/* Active filters indicator */}
        {(filterFlagged || searchQuery) && (
          <div className="mt-1 text-[9px] text-[var(--color-text-muted)]">
            {filtered.length} of {revisions.length} revisions
            {filterFlagged && " · ⭐ flagged"}
            {searchQuery && ` · "${searchQuery}"`}
          </div>
        )}
      </div>

      {/* Revision list grouped by date */}
      <div className="flex-1 overflow-y-auto">
        {grouped.map((group) => (
          <div key={group.label}>
            {/* Date separator */}
            <div className="sticky top-0 z-10 flex items-center gap-1.5 px-3 py-1 bg-[var(--color-bg)]/95 backdrop-blur-sm border-b border-[var(--color-border)]">
              <CalendarDays size={9} className="text-[var(--color-text-muted)]" />
              <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                {group.label}
              </span>
            </div>
            {group.revisions.map((rev) => {
              const isCurrent = rev.id === currentViewing;
              const isLatest = rev.id === latestId;
              return (
                <RevisionItem
                  key={rev.id}
                  rev={rev}
                  isCurrent={isCurrent}
                  isLatest={isLatest}
                  mode={mode}
                  evalScore={evalScores[rev.id]}
                  prevEvalScore={(() => {
                    const idx = filtered.indexOf(rev);
                    const prev = filtered[idx + 1];
                    return prev ? evalScores[prev.id] : undefined;
                  })()}
                  envLabel={environments.find((e) => e.revision_id === rev.id)?.env_name}
                  onView={() => viewRevision(isLatest ? null : rev.id)}
                  onToggleFlag={() =>
                    updateRevisionMeta({ id: rev.id, flagged: !rev.flagged })
                  }
                  onSaveNote={(note) =>
                    updateRevisionMeta({ id: rev.id, note })
                  }
                  onFork={async () => {
                    const name = prompt("Branch name:", `branch-${rev.revision_number}`);
                    if (!name) return;
                    await api.createBranch(rev.id, name);
                    const b = await api.listBranches(activePrompt!.prompt.id);
                    setBranches(b);
                    toast(`Branch "${name}" created from #${rev.revision_number}`, "success");
                  }}
                  onPromote={async (env) => {
                    await api.promoteToEnv(activePrompt!.prompt.id, env, rev.id);
                    const envs = await api.getEnvironments(activePrompt!.prompt.id);
                    setEnvironments(envs);
                    toast(`Revision #${rev.revision_number} promoted to ${env}`, "success");
                  }}
                />
              );
            })}
          </div>
        ))}

        {filtered.length === 0 && revisions.length > 0 && (
          <div className="px-4 py-6 text-center text-[10px] text-[var(--color-text-muted)]">
            <Filter size={14} className="mx-auto mb-1 opacity-40" />
            No revisions match your filter.
          </div>
        )}

        {revisions.length === 0 && (
          <div className="px-4 py-6 text-center text-[10px] text-[var(--color-text-muted)]">
            No revisions yet.
          </div>
        )}
      </div>
    </div>
  );
}

function RevisionItem({
  rev,
  isCurrent,
  isLatest,
  mode,
  evalScore,
  prevEvalScore,
  envLabel,
  onView,
  onToggleFlag,
  onSaveNote,
  onFork,
  onPromote,
}: {
  rev: Revision;
  isCurrent: boolean;
  isLatest: boolean;
  mode: string;
  evalScore?: number;
  prevEvalScore?: number;
  envLabel?: string;
  onView: () => void;
  onToggleFlag: () => void;
  onSaveNote: (note: string) => void;
  onFork: () => void;
  onPromote: (env: string) => void;
}) {
  const [promoteOpen, setPromoteOpen] = useState(false);
  const promoteBtnRef = useRef<HTMLButtonElement>(null);
  const [editingNote, setEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState(rev.note ?? "");

  async function commitNote() {
    await onSaveNote(noteValue);
    setEditingNote(false);
  }

  return (
    <div
      className={clsx(
        "group border-b border-[var(--color-border)]",
        isCurrent && "bg-[var(--color-bg-subtle)]"
      )}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onView}
        onKeyDown={(e) => { if (e.key === "Enter") onView(); }}
        className="w-full text-left px-3 py-2 hover:bg-[var(--color-bg-subtle)] transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:ring-inset"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold">
            #{rev.revision_number}
          </span>
          {isLatest && (
            <span className="text-[9px] bg-[var(--color-accent)] text-white px-1 rounded uppercase">
              latest
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void onToggleFlag();
            }}
            className={clsx(
              "p-0.5 rounded hover:bg-[var(--color-border)] transition-opacity",
              rev.flagged
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100"
            )}
            title={rev.flagged ? "Remove flag" : "Flag this revision"}
          >
            <Star
              size={11}
              className={
                rev.flagged
                  ? "fill-amber-400 text-amber-400"
                  : "text-[var(--color-text-muted)]"
              }
            />
          </button>
        </div>

        {/* Full date/time — always visible */}
        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)]">
          <Clock size={9} className="shrink-0" />
          <span>{formatFullDate(rev.created_at)}</span>
          <span className="opacity-50">·</span>
          <span className="opacity-60">{formatRelative(rev.created_at)}</span>
        </div>

        {/* Env label + eval score + actions */}
        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
          {envLabel && (
            <span className={clsx(
              "text-[7px] font-bold uppercase px-1 py-px rounded",
              envLabel === "production" && "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
              envLabel === "staging" && "bg-amber-500/20 text-amber-600 dark:text-amber-400",
              envLabel === "development" && "bg-blue-500/20 text-blue-600 dark:text-blue-400",
            )}>
              {envLabel === "production" ? "PROD" : envLabel === "development" ? "DEV" : envLabel.toUpperCase()}
            </span>
          )}
          {evalScore !== undefined && (
            <span className="flex items-center gap-0.5 text-[9px] font-mono">
              {prevEvalScore !== undefined && evalScore > prevEvalScore && (
                <TrendingUp size={8} className="text-emerald-500" />
              )}
              {prevEvalScore !== undefined && evalScore < prevEvalScore && (
                <TrendingDown size={8} className="text-red-500" />
              )}
              {prevEvalScore !== undefined && evalScore === prevEvalScore && (
                <Minus size={8} className="text-[var(--color-text-muted)]" />
              )}
              <span className={clsx(
                "font-semibold",
                prevEvalScore !== undefined && evalScore > prevEvalScore && "text-emerald-500",
                prevEvalScore !== undefined && evalScore < prevEvalScore && "text-red-500",
              )}>
                {evalScore.toFixed(1)}
              </span>
            </span>
          )}
          {/* Action buttons — visible on hover */}
          <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onFork(); }}
              className="p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-accent)] rounded"
              title="Fork into new branch"
            >
              <GitFork size={9} />
            </button>
            <button
              ref={promoteBtnRef}
              type="button"
              onClick={(e) => { e.stopPropagation(); setPromoteOpen((o) => !o); }}
              className="p-0.5 text-[var(--color-text-muted)] hover:text-emerald-500 rounded"
              title="Promote to environment"
            >
              <Rocket size={9} />
            </button>
          </div>
        </div>

        {/* Promote dropdown */}
        <FloatingMenu
          open={promoteOpen}
          anchorRef={promoteBtnRef}
          placement="bottom-end"
          onClose={() => setPromoteOpen(false)}
          className="py-1 min-w-[140px]"
        >
          {["development", "staging", "production"].map((env) => (
            <button
              key={env}
              type="button"
              onClick={() => { onPromote(env); setPromoteOpen(false); }}
              className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-xs hover:bg-[var(--color-bg-subtle)]"
            >
              <span className={clsx(
                "w-2 h-2 rounded-full",
                env === "production" && "bg-emerald-500",
                env === "staging" && "bg-amber-500",
                env === "development" && "bg-blue-500",
              )} />
              {env === "production" ? "Production" : env === "development" ? "Development" : "Staging"}
            </button>
          ))}
        </FloatingMenu>

        {mode === "engineer" && rev.model && (
          <div className="mt-0.5 text-[10px] text-[var(--color-text-muted)] truncate font-mono">
            {rev.model}
          </div>
        )}
      </div>

      {/* Note row: editable on click */}
      <div className="px-3 pb-2" onClick={(e) => e.stopPropagation()}>
        {editingNote ? (
          <input
            autoFocus
            value={noteValue}
            onChange={(e) => setNoteValue(e.target.value)}
            onBlur={commitNote}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitNote();
              if (e.key === "Escape") {
                setNoteValue(rev.note ?? "");
                setEditingNote(false);
              }
            }}
            placeholder="Why this change?"
            className="w-full bg-[var(--color-bg)] border border-[var(--color-accent)] rounded px-1.5 py-0.5 text-[10px] italic outline-none"
          />
        ) : rev.note ? (
          <button
            type="button"
            onClick={() => {
              setNoteValue(rev.note ?? "");
              setEditingNote(true);
            }}
            className="text-[10px] italic text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-left w-full truncate"
            title={rev.note}
          >
            {rev.note}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setNoteValue("");
              setEditingNote(true);
            }}
            className="flex items-center gap-1 text-[9px] text-[var(--color-text-muted)]/60 hover:text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Pencil size={8} />
            add note
          </button>
        )}
      </div>
    </div>
  );
}

// ---------- Date formatting ----------

function formatFullDate(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate().toString().padStart(2, "0");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, "0");
  const mins = d.getMinutes().toString().padStart(2, "0");
  return `${day} ${month} ${year}, ${hours}:${mins}`;
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;
  return `${Math.floor(diffDay / 30)}mo ago`;
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor(
    (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    const days = [
      "Sunday", "Monday", "Tuesday", "Wednesday",
      "Thursday", "Friday", "Saturday",
    ];
    return days[d.getDay()];
  }
  const day = d.getDate().toString().padStart(2, "0");
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
