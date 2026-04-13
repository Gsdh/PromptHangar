import { memo, useEffect, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  Star,
  MessageSquare,
  Columns3,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import clsx from "clsx";
import { useAppStore } from "../store";
import type { RevisionOutput } from "../types";

function extractHtml(content: string): string | null {
  const codeBlockMatch = content.match(/```html\n([\s\S]*?)```/);
  if (codeBlockMatch) return codeBlockMatch[1];
  if (content.trim().startsWith("<") && content.includes("</")) return content;
  return null;
}

function tryParseJSON(content: string) {
  try {
    const codeBlockMatch = content.match(/```json\n([\s\S]*?)```/);
    return JSON.stringify(JSON.parse(codeBlockMatch ? codeBlockMatch[1] : content), null, 2);
  } catch {
    return null;
  }
}

export function ResultsPanel() {
  const activePrompt = useAppStore((s) => s.activePrompt);
  const outputs = useAppStore((s) => s.outputs);
  const addOutput = useAppStore((s) => s.addOutput);
  const viewingRevisionId = useAppStore((s) => s.viewingRevisionId);
  const revisions = useAppStore((s) => s.revisions);
  const hasUnsavedChanges = useAppStore((s) => s.hasUnsavedChanges);
  const [collapsed, setCollapsed] = useState(false);
  const [compareMode, setCompareMode] = useState(false);

  if (!activePrompt) return null;

  const targetRevision =
    (viewingRevisionId && revisions.find((r) => r.id === viewingRevisionId)) ||
    (activePrompt.latest_revision ?? null);

  if (!targetRevision) return null;

  const unsavedWarning = hasUnsavedChanges();

  async function handleAdd() {
    await addOutput();
  }

  return (
    <div className="flex flex-col border-t border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-2 border-b border-[var(--color-border)]">
        <MessageSquare size={12} className="text-[var(--color-text-muted)]" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Results
        </span>
        <span className="text-[10px] text-[var(--color-text-muted)]">
          for revision #{targetRevision.revision_number}
        </span>
        {outputs.length > 0 && (
          <span className="text-[10px] bg-[var(--color-bg-subtle)] px-1.5 py-0.5 rounded">
            {outputs.length}
          </span>
        )}

        {unsavedWarning && (
          <span
            className="ml-2 flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400"
            title="New results will be linked to the current (last saved) revision, not your unsaved changes."
          >
            <AlertTriangle size={10} /> unsaved
          </span>
        )}

        <div className="ml-auto flex items-center gap-1">
          {outputs.length >= 2 && !collapsed && (
            <button
              type="button"
              onClick={() => setCompareMode((m) => !m)}
              className={clsx(
                "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors",
                compareMode
                  ? "bg-[var(--color-accent)] text-white"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]"
              )}
              title="Side-by-side comparison"
            >
              <Columns3 size={10} />
              Compare
            </button>
          )}
          <button
            type="button"
            onClick={handleAdd}
            className="flex items-center gap-1 px-2 py-1 bg-[var(--color-accent)] text-white rounded text-[10px] font-medium hover:brightness-110"
          >
            <Plus size={10} />
            New result
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] rounded"
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="flex-1 overflow-hidden">
          {outputs.length === 0 ? (
            <EmptyState onAdd={handleAdd} />
          ) : compareMode ? (
            <CompareGrid outputs={outputs} />
          ) : (
            <StackedList outputs={outputs} />
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="px-5 py-6 text-center">
      <MessageSquare
        size={20}
        className="mx-auto mb-2 text-[var(--color-text-muted)] opacity-40"
      />
      <div className="text-xs text-[var(--color-text-muted)] mb-2">
        No results yet for this revision. Paste output from an AI model
        and label it with which model/tool produced it.
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="text-[11px] text-[var(--color-accent)] hover:underline"
      >
        + Add first result
      </button>
    </div>
  );
}

function StackedList({ outputs }: { outputs: RevisionOutput[] }) {
  return (
    <div className="h-full overflow-y-auto p-4 space-y-3">
      {outputs.map((o) => (
        <OutputCard key={o.id} output={o} compact={false} />
      ))}
    </div>
  );
}

function CompareGrid({ outputs }: { outputs: RevisionOutput[] }) {
  return (
    <div className="h-full overflow-x-auto">
      <div className="flex gap-3 p-4 min-w-max">
        {outputs.map((o) => (
          <div key={o.id} className="w-96 shrink-0">
            <OutputCard output={o} compact={true} />
          </div>
        ))}
      </div>
    </div>
  );
}

const OutputCard = memo(function OutputCard({
  output,
  compact,
}: {
  output: RevisionOutput;
  compact: boolean;
}) {
  const updateOutput = useAppStore((s) => s.updateOutput);
  const deleteOutput = useAppStore((s) => s.deleteOutput);
  const [label, setLabel] = useState(output.label ?? "");
  const [content, setContent] = useState(output.content);
  const [notes, setNotes] = useState(output.notes ?? "");
  const [showNotes, setShowNotes] = useState(!!output.notes);
  const [viewMode, setViewMode] = useState<"raw" | "preview">("raw");
  const saveTimer = useRef<number | undefined>(undefined);

  // Sync local state when output prop changes (e.g. after revision switch)
  useEffect(() => {
    setLabel(output.label ?? "");
    setContent(output.content);
    setNotes(output.notes ?? "");
  }, [output.id]);

  // Debounced auto-save
  useEffect(() => {
    if (
      label === (output.label ?? "") &&
      content === output.content &&
      notes === (output.notes ?? "")
    ) {
      return;
    }
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void updateOutput({
        id: output.id,
        label,
        content,
        notes,
      });
    }, 400);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [label, content, notes, output.id, output.label, output.content, output.notes, updateOutput]);

  return (
    <div className="border border-[var(--color-border)] rounded-md bg-[var(--color-bg)] overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (e.g. Claude Opus 4.6)"
          className="flex-1 bg-transparent text-xs font-semibold outline-none placeholder:font-normal placeholder:text-[var(--color-text-muted)]"
        />
        <div className="flex border border-[var(--color-border)] rounded overflow-hidden text-[9px] font-semibold">
          <button 
           onClick={() => setViewMode("raw")} 
           className={clsx("px-2 py-0.5", viewMode === "raw" ? "bg-[var(--color-bg-elevated)]" : "opacity-60")}
          >RAW</button>
          <button 
           onClick={() => setViewMode("preview")} 
           className={clsx("px-2 py-0.5 border-l border-[var(--color-border)]", viewMode === "preview" ? "bg-[var(--color-bg-elevated)] text-[var(--color-accent)]" : "opacity-60")}
          >RENDER</button>
        </div>
        <RatingStars
          value={output.rating ?? 0}
          onChange={(r) => void updateOutput({ id: output.id, rating: r })}
        />
        <button
          type="button"
          onClick={() => setShowNotes((s) => !s)}
          className={clsx(
            "text-[10px] px-1.5 py-0.5 rounded",
            showNotes
              ? "bg-[var(--color-accent)] text-white"
              : "text-[var(--color-text-muted)] hover:bg-[var(--color-border)]"
          )}
          title="Notes"
        >
          note
        </button>
        <button
          type="button"
          onClick={async () => {
            if (confirm("Delete this result?")) {
              await deleteOutput(output.id);
            }
          }}
          className="text-[var(--color-text-muted)] hover:text-red-500 p-0.5"
          title="Delete"
        >
          <Trash2 size={11} />
        </button>
      </div>
      {viewMode === "raw" ? (
        <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste model output here…"
            className={clsx(
            "w-full bg-transparent px-3 py-2 text-xs font-mono outline-none resize-none placeholder:text-[var(--color-text-muted)] block",
            compact ? "h-52" : "min-h-[140px]"
            )}
            rows={compact ? undefined : 6}
        />
      ) : (
          <PreviewRenderer content={content} compact={compact} />
      )}
      {showNotes && (
        <div className="border-t border-[var(--color-border)] px-3 py-2">
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Note (e.g. 'too formal', 'missing context')"
            className="w-full bg-transparent text-xs italic text-[var(--color-text-muted)] outline-none"
          />
        </div>
      )}
    </div>
  );
});

function RatingStars({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n === value ? 0 : n)}
          className="p-0.5"
          title={`${n} stars`}
        >
          <Star
            size={11}
            className={
              n <= value
                ? "fill-amber-400 text-amber-400"
                : "text-[var(--color-text-muted)]"
            }
          />
        </button>
      ))}
    </div>
  );
}

function PreviewRenderer({ content, compact }: { content: string, compact: boolean }) {
    const htmlObj = extractHtml(content);
    if (htmlObj) {
        return (
            <iframe 
                srcDoc={htmlObj} 
                sandbox="allow-scripts allow-forms allow-same-origin"
                className={clsx("w-full bg-white", compact ? "h-52" : "h-[140px]")}
            />
        );
    }
    const jsonObj = tryParseJSON(content);
    if (jsonObj) {
        return (
            <pre className={clsx("w-full px-3 py-2 text-xs font-mono overflow-auto bg-[var(--color-bg-subtle)] text-[var(--color-text)]", compact ? "h-52" : "h-[140px]")}>
                {jsonObj}
            </pre>
        );
    }
    // Fallback simple line renderer if no HTML/JSON
    return <div className={clsx("w-full px-3 py-2 text-xs font-sans overflow-auto whitespace-pre-wrap", compact ? "h-52" : "h-[140px]")}>{content}</div>;
}
