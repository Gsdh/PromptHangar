import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import { search } from "@codemirror/search";
import { undo, redo } from "@codemirror/commands";
import { Save, Trash2, Undo2, Redo2, Eye, Code2 } from "lucide-react";
import clsx from "clsx";
import { useAppStore, useActiveFeatures } from "../store";
import { MagicCopy } from "./MagicCopy";
import { ExportButton } from "./ExportButton";
import { RevisionDiffViewer } from "./RevisionDiffViewer";
import { ResultsPanel } from "./ResultsPanel";
import { TagEditor } from "./TagEditor";
import { PlaygroundPanel } from "./PlaygroundPanel";
import { VariablesPanel } from "./VariablesPanel";
import { CompressorPanel } from "./CompressorPanel";
import { BottomPanel, TAB_ICONS, type BottomTab } from "./BottomPanel";
import { SidePanel } from "./SidePanel";
import { MarkdownPreview } from "./MarkdownPreview";
import { BatchEvalPanel } from "./BatchEvalPanel";
import { DynamicIcon } from "./pickers";
import { estimateCost, estimateTokens, formatCost, isLocalModel } from "../lib/pricing";
import type { PromptWithLatest } from "../types";
import type { Folder } from "../types";

export function PromptEditor({ sidePanelMode = false }: { sidePanelMode?: boolean } = {}) {
  const activePrompt = useAppStore((s) => s.activePrompt);
  const draftContent = useAppStore((s) => s.draftContent);
  const draftSystemPrompt = useAppStore((s) => s.draftSystemPrompt);
  const draftModel = useAppStore((s) => s.draftModel);
  const draftParams = useAppStore((s) => s.draftParams);
  const setDraft = useAppStore((s) => s.setDraft);
  const saveDraft = useAppStore((s) => s.saveDraft);
  const discardDraft = useAppStore((s) => s.discardDraft);
  const hasUnsavedChanges = useAppStore((s) => s.hasUnsavedChanges);
  const deletePrompt = useAppStore((s) => s.deletePrompt);
  const viewingRevisionId = useAppStore((s) => s.viewingRevisionId);
  const revisions = useAppStore((s) => s.revisions);
  const features = useActiveFeatures();
  const theme = useAppStore((s) => s.settings?.theme ?? "light");

  const viewingRevision = useMemo(
    () => revisions.find((r) => r.id === viewingRevisionId) ?? null,
    [revisions, viewingRevisionId]
  );
  const isViewingHistoric =
    !!viewingRevision &&
    viewingRevision.id !== activePrompt?.latest_revision?.id;

  const outputs = useAppStore((s) => s.outputs);
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const [commitMsg, setCommitMsg] = useState("");
  const [previewMode, setPreviewMode] = useState(false);

  const handleUndo = useCallback(() => {
    const view = editorRef.current?.view;
    if (view) undo(view);
  }, []);

  const handleRedo = useCallback(() => {
    const view = editorRef.current?.view;
    if (view) redo(view);
  }, []);

  const doSave = useCallback(async () => {
    const result = await saveDraft(commitMsg || undefined);
    if (result) setCommitMsg("");
  }, [saveDraft, commitMsg]);

  // Cmd/Ctrl+S to save
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        void doSave();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doSave]);

  if (!activePrompt) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--color-text-muted)] text-sm">
        Select a prompt to get started.
      </div>
    );
  }

  const dirty = hasUnsavedChanges();

  const mainContent =
    isViewingHistoric && viewingRevision && activePrompt.latest_revision ? (
      <RevisionDiffViewer
        historic={viewingRevision}
        latest={activePrompt.latest_revision}
      />
    ) : (
      <div className="h-full flex flex-col min-h-0">
        {/* Breadcrumb */}
        <Breadcrumb activePrompt={activePrompt} />
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-[var(--color-border)]">
          <EditableHeader activePrompt={activePrompt} />


          <div className="flex items-center gap-1.5 shrink-0">
            {dirty && (
              <span className="text-xs text-amber-600 dark:text-amber-400 mr-1">
                • unsaved
              </span>
            )}
            <button
              type="button"
              onClick={handleUndo}
              className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded hover:bg-[var(--color-bg-subtle)]"
              title="Undo (Cmd/Ctrl+Z)"
            >
              <Undo2 size={13} />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded hover:bg-[var(--color-bg-subtle)]"
              title="Redo (Cmd/Ctrl+Shift+Z)"
            >
              <Redo2 size={13} />
            </button>
            <div className="w-px h-4 bg-[var(--color-border)] mx-0.5" />
            <ExportButton />
            <MagicCopy />
            {dirty && (
              <input
                value={commitMsg}
                onChange={(e) => setCommitMsg(e.target.value)}
                placeholder="Commit note (optional)"
                className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 text-[10px] w-36 focus:outline-none focus:border-[var(--color-accent)] placeholder:text-[var(--color-text-muted)]/50"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void doSave();
                }}
              />
            )}
            <button
              type="button"
              onClick={() => void doSave()}
              disabled={!dirty}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors",
                dirty
                  ? "bg-[var(--color-accent)] text-white hover:brightness-110"
                  : "bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] cursor-not-allowed"
              )}
              title="Save (Cmd/Ctrl+S)"
            >
              <Save size={12} />
              Save
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!activePrompt) return;
                if (
                  confirm(`Delete prompt "${activePrompt.prompt.title}"?`)
                ) {
                  await deletePrompt(activePrompt.prompt.id);
                }
              }}
              className="text-[var(--color-text-muted)] hover:text-red-500 p-1.5"
              title="Delete prompt"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* System prompt (feature flag) */}
        {features.showSystemPrompt && (
          <div className="px-5 pt-3 pb-1">
            <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-muted)]">
              System prompt
            </label>
            <textarea
              value={draftSystemPrompt}
              onChange={(e) => setDraft({ systemPrompt: e.target.value })}
              placeholder="Optional — e.g. 'You are an experienced ...'"
              rows={2}
              className="mt-1 w-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)] resize-none font-mono"
            />
          </div>
        )}

        {/* Main editor */}
        <div className="flex-1 overflow-hidden px-5 pt-3 min-h-0">
          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-muted)]">
              Prompt
            </label>
            <button
              type="button"
              onClick={() => setPreviewMode((p) => !p)}
              className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] px-1.5 py-0.5 rounded hover:bg-[var(--color-bg-subtle)]"
              title={previewMode ? "Switch to editor" : "Preview markdown"}
            >
              {previewMode ? <Code2 size={10} /> : <Eye size={10} />}
              {previewMode ? "Editor" : "Preview"}
            </button>
          </div>
          <div className="mt-1 h-[calc(100%-1.5rem)] border border-[var(--color-border)] rounded overflow-hidden">
            {previewMode ? (
              <MarkdownPreview content={draftContent} />
            ) : (
            <CodeMirror
              ref={editorRef}
              value={draftContent}
              onChange={(v) => setDraft({ content: v })}
              extensions={[markdown(), EditorView.lineWrapping, search({ top: true })]}
              basicSetup={{
                lineNumbers: features.showSystemPrompt,
                foldGutter: false,
                highlightActiveLine: features.showSystemPrompt,
                bracketMatching: false,
                autocompletion: false,
              }}
              theme={theme === "light" ? "light" : "dark"}
              height="100%"
              className="h-full text-sm"
            />
            )}
          </div>
        </div>

        {/* Metadata footer */}
        {features.showMetadata ? (
          <div className="px-5 py-3 border-t border-[var(--color-border)] flex items-center gap-4 text-xs flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-[var(--color-text-muted)]">Model:</label>
              <input
                value={draftModel}
                onChange={(e) => setDraft({ model: e.target.value })}
                placeholder="e.g. claude-opus-4-6"
                className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded px-2 py-1 w-48 focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[var(--color-text-muted)]">Temp:</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={(draftParams.temperature as number | undefined) ?? ""}
                onChange={(e) =>
                  setDraft({
                    params: {
                      ...draftParams,
                      temperature:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                    },
                  })
                }
                className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded px-2 py-1 w-16 focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[var(--color-text-muted)]">
                Max tokens:
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={(draftParams.max_tokens as number | undefined) ?? ""}
                onChange={(e) =>
                  setDraft({
                    params: {
                      ...draftParams,
                      max_tokens:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                    },
                  })
                }
                className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded px-2 py-1 w-20 focus:outline-none focus:border-[var(--color-accent)]"
              />
            </div>
            <div className="ml-auto flex items-center gap-2 text-[var(--color-text-muted)]">
              {(() => {
                const tokens = estimateTokens(draftContent + (draftSystemPrompt || ""));
                const cost = draftModel ? estimateCost(draftModel, tokens) : null;
                const local = draftModel ? isLocalModel(draftModel) : false;
                return (
                  <>
                    <span>{draftContent.length} chars</span>
                    <span>·</span>
                    <span>~{tokens} tokens</span>
                    {cost && !local && (
                      <>
                        <span>·</span>
                        <span title="Estimated input cost based on model pricing">
                          ~{formatCost(cost.input)}
                        </span>
                      </>
                    )}
                    {local && (
                      <>
                        <span>·</span>
                        <span className="text-emerald-500 flex items-center gap-1"><DynamicIcon name="lock" size={10} /> free (local)</span>
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        ) : (
          <div className="px-5 py-2 border-t border-[var(--color-border)] flex items-center text-xs text-[var(--color-text-muted)]">
            <span>{draftContent.length} chars</span>
            {dirty && (
              <button
                type="button"
                onClick={discardDraft}
                className="ml-auto hover:text-[var(--color-text)]"
              >
                Revert changes
              </button>
            )}
          </div>
        )}
      </div>
    );

  // Build tabs for bottom panel
  const bottomTabs: BottomTab[] = [];
  if (features.showPlayground) {
    bottomTabs.push({
      id: "playground",
      label: "Playground",
      icon: TAB_ICONS.playground,
      content: <PlaygroundPanel />,
    });
  }
  if (features.showCompressor) {
    bottomTabs.push({
      id: "compressor",
      label: "Compressor",
      icon: TAB_ICONS.compressor,
      content: <CompressorPanel />,
    });
  }
  if (features.showVariables) {
    bottomTabs.push({
      id: "variables",
      label: "Variables",
      icon: TAB_ICONS.variables,
      content: <VariablesPanel content={draftContent} systemPrompt={draftSystemPrompt} />,
    });
  }
  if (features.showResults) {
    bottomTabs.push({
      id: "results",
      label: "Results",
      icon: TAB_ICONS.results,
      badge: outputs.length || undefined,
      content: <ResultsPanel />,
    });
  }
  if (features.showBatchEvals) {
    bottomTabs.push({
      id: "batchEvals",
      label: "Batch Evals",
      icon: TAB_ICONS.batchEvals,
      content: <BatchEvalPanel />,
    });
  }

  // When all left/right panes are collapsed, flip to a horizontal layout:
  // the editor lives on the left and the tabs become a side panel on the
  // right. This reclaims the vertical real estate freed by the collapse.
  if (sidePanelMode && bottomTabs.length > 0) {
    return (
      <div className="h-full flex overflow-hidden">
        <div className="flex-1 overflow-hidden min-w-0">{mainContent}</div>
        <SidePanel tabs={bottomTabs} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden min-h-0">{mainContent}</div>
      {bottomTabs.length > 0 && <BottomPanel tabs={bottomTabs} />}
    </div>
  );
}

function Breadcrumb({ activePrompt }: { activePrompt: PromptWithLatest }) {
  const folders = useAppStore((s) => s.folders);
  const smartView = useAppStore((s) => s.smartView);
  const folder = folders.find((f) => f.id === activePrompt.prompt.folder_id);

  const parts: React.ReactNode[] = [];
  if (smartView === "recent") parts.push("Recent");
  else if (smartView === "flagged") parts.push("Flagged");
  else if (smartView === "all") parts.push("All prompts");

  if (folder) {
    // Build path from folder to root
    const path: Folder[] = [];
    let cur: Folder | undefined = folder;
    while (cur) {
      path.unshift(cur);
      cur = folders.find((f) => f.id === cur!.parent_id);
    }
    for (const f of path) {
      parts.push(
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <DynamicIcon name={f.icon ?? "folder"} size={10} className="text-[var(--color-text-muted)]" />
          {f.name}
        </span>
      );
    }
  }

  if (parts.length === 0) return null;

  return (
    <div className="px-5 pt-2 flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
      {parts.map((p, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="opacity-40">/</span>}
          <span>{p}</span>
        </span>
      ))}
    </div>
  );
}

function EditableHeader({ activePrompt }: { activePrompt: PromptWithLatest }) {
  const updatePromptMeta = useAppStore((s) => s.updatePromptMeta);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [titleVal, setTitleVal] = useState(activePrompt.prompt.title);
  const [descVal, setDescVal] = useState(activePrompt.prompt.description ?? "");

  // Sync local state when active prompt changes
  useEffect(() => {
    setTitleVal(activePrompt.prompt.title);
    setDescVal(activePrompt.prompt.description ?? "");
    setEditingTitle(false);
    setEditingDesc(false);
  }, [activePrompt.prompt.id, activePrompt.prompt.title, activePrompt.prompt.description]);

  async function commitTitle() {
    const trimmed = titleVal.trim();
    if (!trimmed || trimmed === activePrompt.prompt.title) {
      setTitleVal(activePrompt.prompt.title);
      setEditingTitle(false);
      return;
    }
    await updatePromptMeta({ id: activePrompt.prompt.id, title: trimmed });
    setEditingTitle(false);
  }

  async function commitDesc() {
    const trimmed = descVal.trim();
    const current = activePrompt.prompt.description ?? "";
    if (trimmed === current) {
      setEditingDesc(false);
      return;
    }
    await updatePromptMeta({ id: activePrompt.prompt.id, description: trimmed });
    setEditingDesc(false);
  }

  return (
    <div className="flex-1 min-w-0">
      {editingTitle ? (
        <input
          autoFocus
          value={titleVal}
          onChange={(e) => setTitleVal(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitTitle();
            if (e.key === "Escape") {
              setTitleVal(activePrompt.prompt.title);
              setEditingTitle(false);
            }
          }}
          onFocus={(e) => e.target.select()}
          className="w-full font-semibold text-base bg-transparent border-b border-[var(--color-accent)] outline-none"
        />
      ) : (
        <button
          type="button"
          data-prompt-title-button="true"
          onClick={() => setEditingTitle(true)}
          className="font-semibold text-base truncate block max-w-full text-left hover:text-[var(--color-accent)] transition-colors"
          title="Click to edit"
        >
          {activePrompt.prompt.title}
        </button>
      )}

      {editingDesc ? (
        <input
          autoFocus
          value={descVal}
          onChange={(e) => setDescVal(e.target.value)}
          onBlur={commitDesc}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitDesc();
            if (e.key === "Escape") {
              setDescVal(activePrompt.prompt.description ?? "");
              setEditingDesc(false);
            }
          }}
          placeholder="Add a description…"
          className="mt-0.5 w-full text-xs bg-transparent border-b border-[var(--color-accent)] outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditingDesc(true)}
          className={clsx(
            "mt-0.5 text-xs truncate block max-w-full text-left hover:text-[var(--color-text)] transition-colors",
            activePrompt.prompt.description
              ? "text-[var(--color-text-muted)]"
              : "text-[var(--color-text-muted)]/50 italic"
          )}
          title="Click to edit"
        >
          {activePrompt.prompt.description || "+ add description"}
        </button>
      )}
      <div className="mt-1.5">
        <TagEditor promptId={activePrompt.prompt.id} tags={activePrompt.tags} />
      </div>
    </div>
  );
}
