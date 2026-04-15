import { useRef, useState } from "react";
import {
  Plus,
  FileText,
  Pencil,
  Trash2,
  MoreHorizontal,
  FolderInput,
  ChevronRight,
  Trophy,
} from "lucide-react";
import clsx from "clsx";
import type { Folder, PromptWithLatest } from "../types";
import { useAppStore } from "../store";
import { FloatingMenu } from "./FloatingMenu";
import { DynamicIcon } from "./pickers";

interface Props {
  prompts: PromptWithLatest[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function PromptList({ prompts, selectedId, onSelect }: Props) {
  const createPrompt = useAppStore((s) => s.createPrompt);
  const selectedFolderId = useAppStore((s) => s.selectedFolderId);
  const tagFilter = useAppStore((s) => s.tagFilter);
  const clearTagFilter = useAppStore((s) => s.clearTagFilter);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");

  async function handleCreate() {
    const t = title.trim();
    if (!t) {
      setCreating(false);
      return;
    }
    await createPrompt(t);
    setTitle("");
    setCreating(false);
  }

  return (
    <div className="flex flex-col h-full border-l border-[var(--color-border)]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)]">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Prompts
        </span>
        <button
          type="button"
          onClick={() => setCreating(true)}
          disabled={!selectedFolderId}
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-1 rounded hover:bg-[var(--color-bg-subtle)] disabled:opacity-30 disabled:cursor-not-allowed"
          title="New prompt (Cmd/Ctrl+N)"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Active filter pill */}
      {tagFilter && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-accent)]/10 border-b border-[var(--color-border)] text-xs">
          <span className="text-[var(--color-text-muted)]">Filter:</span>
          <span className="font-medium text-[var(--color-accent)]">
            #{tagFilter}
          </span>
          <button
            type="button"
            onClick={clearTagFilter}
            className="ml-auto text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-[10px]"
          >
            clear
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {creating && (
          <div className="px-3 py-2 border-b border-[var(--color-border)]">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleCreate}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") {
                  setCreating(false);
                  setTitle("");
                }
              }}
              placeholder="Prompt title…"
              className="w-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded px-2 py-1 text-sm focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>
        )}

        {prompts.map((p) => (
          <PromptRow
            key={p.prompt.id}
            entry={p}
            isSelected={selectedId === p.prompt.id}
            onSelect={() => onSelect(p.prompt.id)}
          />
        ))}

        {prompts.length === 0 && !creating && (
          <div className="px-4 py-8 text-center text-[var(--color-text-muted)] text-xs">
            <FileText size={20} className="mx-auto mb-2 opacity-50" />
            {tagFilter
              ? `No prompts with tag #${tagFilter}.`
              : selectedFolderId
                ? "No prompts in this folder."
                : "Select a folder."}
          </div>
        )}
      </div>
    </div>
  );
}

function PromptRow({
  entry,
  isSelected,
  onSelect,
}: {
  entry: PromptWithLatest;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const updatePromptMeta = useAppStore((s) => s.updatePromptMeta);
  const deletePrompt = useAppStore((s) => s.deletePrompt);
  const folders = useAppStore((s) => s.folders);
  const setTagFilter = useAppStore((s) => s.setTagFilter);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(entry.prompt.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const moveBtnRef = useRef<HTMLButtonElement>(null);

  async function commitRename() {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === entry.prompt.title) {
      setRenaming(false);
      setRenameValue(entry.prompt.title);
      return;
    }
    await updatePromptMeta({ id: entry.prompt.id, title: trimmed });
    setRenaming(false);
  }

  async function moveToFolder(folderId: string) {
    await updatePromptMeta({
      id: entry.prompt.id,
      folder_id: folderId,
    });
    setMoveOpen(false);
    setMenuOpen(false);
  }

  return (
    <div
      className={clsx(
        "group relative w-full text-left px-3 py-2.5 border-b border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)] transition-colors cursor-pointer",
        isSelected && "bg-[var(--color-bg-subtle)]"
      )}
      onClick={() => !renaming && onSelect()}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setRenameValue(entry.prompt.title);
        setRenaming(true);
      }}
    >
      <div className="flex items-center gap-2">
        <FileText size={12} className="text-[var(--color-text-muted)] shrink-0" />
        {renaming ? (
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setRenaming(false);
                setRenameValue(entry.prompt.title);
              }
            }}
            onFocus={(e) => e.target.select()}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-[var(--color-bg-elevated)] border border-[var(--color-accent)] rounded px-1.5 py-0.5 text-sm focus:outline-none"
          />
        ) : (
          <span className="truncate text-sm font-medium flex-1">
            {entry.prompt.title}
          </span>
        )}
        {entry.prompt.champion_revision_id && !renaming && (
          <span
            className="text-amber-500 shrink-0"
            title="Has a champion revision"
          >
            <Trophy size={11} />
          </span>
        )}
        {entry.revision_count > 0 && !renaming && (
          <span className="text-[10px] text-[var(--color-text-muted)] shrink-0">
            #{entry.revision_count}
          </span>
        )}
        {!renaming && (
          <button
            ref={menuBtnRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((m) => !m);
              setMoveOpen(false);
            }}
            className={clsx(
              "p-0.5 rounded hover:bg-[var(--color-border)] shrink-0 transition-opacity",
              menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
          >
            <MoreHorizontal size={12} />
          </button>
        )}
      </div>
      {entry.prompt.description && !renaming && (
        <div className="ml-5 mt-0.5 text-xs text-[var(--color-text-muted)] truncate">
          {entry.prompt.description}
        </div>
      )}

      {/* Tag chips (clickable → filter) */}
      {entry.tags.length > 0 && !renaming && (
        <div className="ml-5 mt-1 flex flex-wrap gap-1">
          {entry.tags.slice(0, 3).map((t) => (
            <button
              key={t}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTagFilter(t);
              }}
              className="text-[9px] font-medium bg-[var(--color-accent)]/10 text-[var(--color-accent)] px-1 py-px rounded hover:bg-[var(--color-accent)]/20"
              title={`Filter op #${t}`}
            >
              {t}
            </button>
          ))}
          {entry.tags.length > 3 && (
            <span className="text-[9px] text-[var(--color-text-muted)]">
              +{entry.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Main menu — portaled, escapes PromptList overflow */}
      <FloatingMenu
        open={menuOpen}
        anchorRef={menuBtnRef}
        placement="bottom-end"
        onClose={() => {
          setMenuOpen(false);
          setMoveOpen(false);
        }}
        className="py-1 min-w-[180px] text-sm"
      >
        <button
          type="button"
          onClick={() => {
            setMenuOpen(false);
            setRenameValue(entry.prompt.title);
            setRenaming(true);
          }}
          className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-xs hover:bg-[var(--color-bg-subtle)]"
        >
          <Pencil size={12} className="text-[var(--color-text-muted)]" />
          <span>Rename</span>
        </button>
        <button
          ref={moveBtnRef}
          type="button"
          onClick={() => setMoveOpen((o) => !o)}
          onMouseEnter={() => setMoveOpen(true)}
          className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-xs hover:bg-[var(--color-bg-subtle)]"
        >
          <FolderInput size={12} className="text-[var(--color-text-muted)]" />
          <span className="flex-1">Move to…</span>
          <ChevronRight size={10} className="text-[var(--color-text-muted)]" />
        </button>
        <div className="border-t border-[var(--color-border)] my-1" />
        <button
          type="button"
          onClick={async () => {
            setMenuOpen(false);
            if (confirm(`Delete prompt "${entry.prompt.title}"?`)) {
              await deletePrompt(entry.prompt.id);
            }
          }}
          className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-xs text-red-500 hover:bg-red-500/10"
        >
          <Trash2 size={12} />
          <span>Delete</span>
        </button>
      </FloatingMenu>

      {/* Move submenu — also portaled */}
      <FloatingMenu
        open={menuOpen && moveOpen}
        anchorRef={moveBtnRef}
        placement="right-start"
        onClose={() => setMoveOpen(false)}
        className="py-1 min-w-[180px] max-h-64"
        gap={2}
      >
        {folders.length === 0 && (
          <div className="px-3 py-2 text-[10px] text-[var(--color-text-muted)]">
            No other folders
          </div>
        )}
        {folders.map((f: Folder) => (
          <button
            key={f.id}
            type="button"
            disabled={f.id === entry.prompt.folder_id}
            onClick={() => void moveToFolder(f.id)}
            className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-xs hover:bg-[var(--color-bg-subtle)] disabled:opacity-40 disabled:cursor-default"
          >
            <span
              className="w-0.5 h-3 rounded-sm shrink-0"
              style={{ background: f.color ?? "var(--color-border-strong)" }}
            />
            <span className="shrink-0 flex items-center justify-center text-[var(--color-text-muted)]">
              <DynamicIcon name={f.icon ?? "folder"} size={14} />
            </span>
            <span className="truncate">{f.name}</span>
            {f.id === entry.prompt.folder_id && (
              <span className="ml-auto text-[9px] text-[var(--color-text-muted)]">
                current
              </span>
            )}
          </button>
        ))}
      </FloatingMenu>
    </div>
  );
}
