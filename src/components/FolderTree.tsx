import { useRef, useState } from "react";
import {
  Plus,
  Folder as FolderIcon,
  ShieldAlert,
  MoreHorizontal,
  Pencil,
  Palette,
  Smile,
  Trash2,
  FolderPlus,
  Shield,
  ShieldCheck,
  Tag as TagIcon,
  X,
  Clock,
  Star,
  Library,
} from "lucide-react";
import clsx from "clsx";
import type { Folder } from "../types";
import { useAppStore } from "../store";
import { ColorGrid, IconGrid, DynamicIcon } from "./pickers";
import { FloatingMenu } from "./FloatingMenu";

interface Props {
  folders: Folder[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function FolderTree({ folders, selectedId, onSelect }: Props) {
  const createFolder = useAppStore((s) => s.createFolder);
  const allTags = useAppStore((s) => s.allTags);
  const tagFilter = useAppStore((s) => s.tagFilter);
  const setTagFilter = useAppStore((s) => s.setTagFilter);
  const clearTagFilter = useAppStore((s) => s.clearTagFilter);
  const smartView = useAppStore((s) => s.smartView);
  const setSmartView = useAppStore((s) => s.setSmartView);
  const clearSmartView = useAppStore((s) => s.clearSmartView);
  const [creating, setCreating] = useState<null | { parent: string | null }>(null);
  const [newName, setNewName] = useState("");

  const topLevel = folders.filter((f) => !f.parent_id);

  async function handleCreate() {
    const name = newName.trim();
    if (!name || !creating) {
      setCreating(null);
      setNewName("");
      return;
    }
    await createFolder(name, creating.parent);
    setNewName("");
    setCreating(null);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)]">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Folders
        </span>
        <button
          type="button"
          onClick={() => setCreating({ parent: null })}
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-1 rounded hover:bg-[var(--color-bg-subtle)]"
          title="New folder"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {/* Smart folder views */}
        <div className="px-2 pb-1.5 mb-1 border-b border-[var(--color-border)] space-y-0.5">
          <SmartFolderBtn
            icon={<Clock size={12} />}
            label="Recent"
            active={smartView === "recent"}
            onClick={() => {
              if (smartView === "recent") { clearSmartView(); if (folders[0]) onSelect(folders[0].id); }
              else void setSmartView("recent");
            }}
          />
          <SmartFolderBtn
            icon={<Star size={12} />}
            label="Flagged"
            active={smartView === "flagged"}
            onClick={() => {
              if (smartView === "flagged") { clearSmartView(); if (folders[0]) onSelect(folders[0].id); }
              else void setSmartView("flagged");
            }}
          />
          <SmartFolderBtn
            icon={<Library size={12} />}
            label="All prompts"
            active={smartView === "all"}
            onClick={() => {
              if (smartView === "all") { clearSmartView(); if (folders[0]) onSelect(folders[0].id); }
              else void setSmartView("all");
            }}
          />
        </div>

        {topLevel.map((folder) => (
          <FolderRow
            key={folder.id}
            folder={folder}
            allFolders={folders}
            depth={0}
            selectedId={selectedId}
            onSelect={onSelect}
            creatingChildOf={creating?.parent ?? null}
            newName={newName}
            setNewName={setNewName}
            onCreateDone={handleCreate}
            onCancelCreate={() => {
              setCreating(null);
              setNewName("");
            }}
            onStartCreateChild={(parentId) => setCreating({ parent: parentId })}
          />
        ))}

        {creating && creating.parent === null && (
          <div className="px-3 py-1.5">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={handleCreate}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") {
                  setCreating(null);
                  setNewName("");
                }
              }}
              placeholder="New folder…"
              className="w-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded px-2 py-1 text-sm focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>
        )}

        {topLevel.length === 0 && !creating && (
          <div className="px-4 py-8 text-center text-[var(--color-text-muted)] text-xs">
            <FolderIcon size={20} className="mx-auto mb-2 opacity-50" />
            No folders yet.
            <br />
            Click + to get started.
          </div>
        )}
      </div>

      {/* Tags section */}
      {allTags.length > 0 && (
        <div className="shrink-0 border-t border-[var(--color-border)]">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Tags
            </span>
            {tagFilter && (
              <button
                type="button"
                onClick={clearTagFilter}
                className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] flex items-center gap-0.5"
                title="Clear filter"
              >
                <X size={10} />
                clear
              </button>
            )}
          </div>
          <div className="px-2 pb-2 flex flex-wrap gap-1 max-h-32 overflow-y-auto">
            {allTags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => (tagFilter === t ? clearTagFilter() : setTagFilter(t))}
                className={clsx(
                  "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors",
                  tagFilter === t
                    ? "bg-[var(--color-accent)] text-white"
                    : "bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20"
                )}
              >
                <TagIcon size={8} />
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type FolderRowProps = {
  folder: Folder;
  allFolders: Folder[];
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  creatingChildOf: string | null;
  newName: string;
  setNewName: (v: string) => void;
  onCreateDone: () => void;
  onCancelCreate: () => void;
  onStartCreateChild: (parentId: string) => void;
};

function FolderRow({
  folder,
  allFolders,
  depth,
  selectedId,
  onSelect,
  creatingChildOf,
  newName,
  setNewName,
  onCreateDone,
  onCancelCreate,
  onStartCreateChild,
}: FolderRowProps) {
  const children = allFolders.filter((f) => f.parent_id === folder.id);
  const isSelected = selectedId === folder.id;
  const updateFolderMeta = useAppStore((s) => s.updateFolderMeta);
  const deleteFolder = useAppStore((s) => s.deleteFolder);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(folder.name);
  const [menuOpen, setMenuOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [iconOpen, setIconOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const iconBtnRef = useRef<HTMLButtonElement>(null);

  async function handleDelete() {
    const label = folder.name;
    const hasChildren = children.length > 0;
    const msg = hasChildren
      ? `Delete folder "${label}"? All ${children.length} subfolders and their prompts will also be deleted.`
      : `Delete folder "${label}"? Prompts in this folder will be moved to "no folder".`;
    if (confirm(msg)) {
      await deleteFolder(folder.id);
    }
  }

  async function commitRename() {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === folder.name) {
      setRenaming(false);
      setRenameValue(folder.name);
      return;
    }
    await updateFolderMeta({ id: folder.id, name: trimmed });
    setRenaming(false);
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        className={clsx(
          "group relative flex items-center gap-2 py-1.5 text-left hover:bg-[var(--color-bg-subtle)] transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:ring-inset",
          isSelected && "bg-[var(--color-bg-subtle)]"
        )}
        style={{ paddingLeft: `${12 + depth * 14}px`, paddingRight: "8px" }}
        onClick={() => !renaming && onSelect(folder.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !renaming) onSelect(folder.id);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setRenameValue(folder.name);
          setRenaming(true);
        }}
      >
        <span
          className="w-1 h-5 rounded-sm shrink-0"
          style={{ background: folder.color ?? "var(--color-border-strong)" }}
        />
        <button
          ref={iconBtnRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIconOpen((o) => !o);
            setColorOpen(false);
          }}
          className="text-base leading-none shrink-0 hover:scale-110 transition-transform"
          title="Change icon"
        >
          <DynamicIcon name={folder.icon ?? "folder"} size={16} />
        </button>

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
                setRenameValue(folder.name);
              }
            }}
            onFocus={(e) => e.target.select()}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-[var(--color-bg-elevated)] border border-[var(--color-accent)] rounded px-1.5 py-0.5 text-sm focus:outline-none"
          />
        ) : (
          <span
            className={clsx(
              "flex-1 truncate text-sm",
              isSelected && "font-medium"
            )}
          >
            {folder.name}
          </span>
        )}

        {folder.sensitive && (
          <ShieldAlert
            size={11}
            className="text-amber-500 shrink-0"
            aria-label="sensitive"
          />
        )}

        {!renaming && (
          <button
            ref={menuBtnRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((m) => !m);
            }}
            className={clsx(
              "p-0.5 rounded hover:bg-[var(--color-border)] shrink-0 transition-opacity",
              menuOpen
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100 focus:opacity-100"
            )}
            title="More actions"
          >
            <MoreHorizontal size={12} />
          </button>
        )}
      </div>

      {/* Icon picker (portal) */}
      <FloatingMenu
        open={iconOpen}
        anchorRef={iconBtnRef}
        placement="bottom-end"
        onClose={() => setIconOpen(false)}
      >
        <IconGrid
          current={folder.icon}
          onPick={(icon) => {
            void updateFolderMeta({ id: folder.id, icon });
            setIconOpen(false);
          }}
        />
      </FloatingMenu>

      {/* Color picker (portal) */}
      <FloatingMenu
        open={colorOpen}
        anchorRef={menuBtnRef}
        placement="bottom-end"
        onClose={() => setColorOpen(false)}
      >
        <ColorGrid
          current={folder.color}
          onPick={(color) => {
            void updateFolderMeta({ id: folder.id, color });
            setColorOpen(false);
          }}
        />
      </FloatingMenu>

      {/* Context menu (portal) */}
      <FloatingMenu
        open={menuOpen}
        anchorRef={menuBtnRef}
        placement="bottom-end"
        onClose={() => setMenuOpen(false)}
        className="py-1 min-w-[180px] text-sm"
      >
        <MenuItem
          icon={<Pencil size={12} />}
          label="Rename"
          hint="⏎"
          onClick={() => {
            setMenuOpen(false);
            setRenameValue(folder.name);
            setRenaming(true);
          }}
        />
        <MenuItem
          icon={<FolderPlus size={12} />}
          label="New subfolder"
          onClick={() => {
            setMenuOpen(false);
            onStartCreateChild(folder.id);
          }}
        />
        <MenuItem
          icon={<Palette size={12} />}
          label="Color"
          onClick={() => {
            setMenuOpen(false);
            setColorOpen(true);
          }}
        />
        <MenuItem
          icon={<Smile size={12} />}
          label="Icon"
          onClick={() => {
            setMenuOpen(false);
            setIconOpen(true);
          }}
        />
        <MenuItem
          icon={folder.sensitive ? <ShieldCheck size={12} /> : <Shield size={12} />}
          label={folder.sensitive ? "Unmark sensitive" : "Mark as sensitive"}
          onClick={() => {
            setMenuOpen(false);
            void updateFolderMeta({ id: folder.id, sensitive: !folder.sensitive });
          }}
        />
        <div className="border-t border-[var(--color-border)] my-1" />
        <MenuItem
          icon={<Trash2 size={12} />}
          label="Delete"
          danger
          onClick={() => {
            setMenuOpen(false);
            void handleDelete();
          }}
        />
      </FloatingMenu>

      {/* Inline child creation input */}
      {creatingChildOf === folder.id && (
        <div
          style={{ paddingLeft: `${12 + (depth + 1) * 14 + 12}px` }}
          className="pr-2 py-1"
        >
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={onCreateDone}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCreateDone();
              if (e.key === "Escape") onCancelCreate();
            }}
            placeholder="New subfolder…"
            className="w-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded px-2 py-1 text-sm focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>
      )}

      {children.map((child) => (
        <FolderRow
          key={child.id}
          folder={child}
          allFolders={allFolders}
          depth={depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
          creatingChildOf={creatingChildOf}
          newName={newName}
          setNewName={setNewName}
          onCreateDone={onCreateDone}
          onCancelCreate={onCancelCreate}
          onStartCreateChild={onStartCreateChild}
        />
      ))}
    </>
  );
}

function SmartFolderBtn({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors",
        active
          ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-medium"
          : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text)]"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function MenuItem({
  icon,
  label,
  hint,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "w-full text-left px-3 py-1.5 flex items-center gap-2 text-xs hover:bg-[var(--color-bg-subtle)]",
        danger && "text-red-500 hover:bg-red-500/10"
      )}
    >
      <span className="shrink-0 text-[var(--color-text-muted)]">{icon}</span>
      <span className="flex-1">{label}</span>
      {hint && (
        <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
          {hint}
        </span>
      )}
    </button>
  );
}
