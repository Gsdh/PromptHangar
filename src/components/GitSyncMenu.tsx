import { useEffect, useRef, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { GitBranch, FolderOpen, Check, Unlink, Plus } from "lucide-react";
import clsx from "clsx";
import * as api from "../api";
import type { GitWorkspace } from "../types";
import { useAppStore } from "../store";
import { FloatingMenu } from "./FloatingMenu";
import { toast } from "./Toast";

/**
 * Header control for linking the active prompt to a Git workspace.
 * Shows a green dot when the prompt is linked so users can see sync state
 * at a glance; clicking opens a popover to change the link or add a new
 * workspace. Workspace CRUD also lives in Settings but we duplicate the
 * "add new" action here so the user doesn't have to context-switch while
 * authoring a prompt.
 */
export function GitSyncMenu() {
  const activePrompt = useAppStore((s) => s.activePrompt);
  const updatePromptMeta = useAppStore((s) => s.updatePromptMeta);

  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<GitWorkspace[]>([]);
  const [busy, setBusy] = useState(false);

  const linkedId = activePrompt?.prompt.git_workspace_id ?? null;
  const linked = workspaces.find((w) => w.id === linkedId) ?? null;

  // Refresh the workspace list when the menu opens — cheap and always fresh.
  useEffect(() => {
    if (!open) return;
    void api.listGitWorkspaces().then(setWorkspaces).catch(() => {});
  }, [open]);

  async function linkTo(id: string | null) {
    if (!activePrompt) return;
    setBusy(true);
    try {
      await updatePromptMeta({
        id: activePrompt.prompt.id,
        git_workspace_id: id,
      });
      if (id) {
        const ws = workspaces.find((w) => w.id === id);
        toast(`Linked to ${ws?.name ?? "workspace"} — next save will commit`, "success");
      } else {
        toast("Unlinked from Git workspace", "info");
      }
      setOpen(false);
    } catch (e) {
      toast(`Link failed: ${String(e)}`, "error");
    } finally {
      setBusy(false);
    }
  }

  async function addWorkspace() {
    try {
      const picked = await openDialog({
        directory: true,
        multiple: false,
        title: "Choose a Git workspace folder",
      });
      if (!picked || typeof picked !== "string") return;
      const name = window.prompt(
        "Name this workspace (e.g. 'Team prompts'):",
        picked.split("/").pop() || "Workspace"
      );
      if (!name) return;
      setBusy(true);
      const ws = await api.createGitWorkspace({ name: name.trim(), path: picked });
      setWorkspaces((prev) => [...prev, ws]);
      // Auto-link to the freshly created workspace — matches user intent.
      await linkTo(ws.id);
    } catch (e) {
      toast(`Create workspace failed: ${String(e)}`, "error");
    } finally {
      setBusy(false);
    }
  }

  if (!activePrompt) return null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "flex items-center gap-1 px-1.5 py-1 rounded text-[10px] font-medium border transition-colors",
          linked
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
            : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]"
        )}
        title={
          linked
            ? `Git: linked to ${linked.name} (${linked.path})`
            : "Git: not linked — click to choose a workspace"
        }
      >
        <GitBranch size={10} />
        {linked ? (
          <span className="max-w-[90px] truncate">{linked.name}</span>
        ) : (
          <span>Git</span>
        )}
      </button>

      <FloatingMenu
        open={open}
        anchorRef={btnRef}
        placement="bottom-end"
        onClose={() => setOpen(false)}
        className="w-72 py-1.5 text-xs"
      >
        <div className="px-3 py-1.5 text-[9px] uppercase tracking-wider font-semibold text-[var(--color-text-muted)]">
          Git sync
        </div>

        {workspaces.length === 0 && (
          <div className="px-3 py-2 text-[var(--color-text-muted)] text-xs">
            No workspaces yet. Add one below — we'll
            {" "}<code className="font-mono">git init</code> if the folder
            isn't already a repo.
          </div>
        )}

        {workspaces.map((w) => {
          const isLinked = w.id === linkedId;
          return (
            <button
              key={w.id}
              type="button"
              disabled={busy}
              onClick={() => void linkTo(isLinked ? null : w.id)}
              className="w-full flex items-start gap-2 px-3 py-1.5 hover:bg-[var(--color-bg-subtle)] text-left disabled:opacity-60"
            >
              <span className="mt-0.5 w-3 shrink-0">
                {isLinked ? (
                  <Check size={12} className="text-emerald-500" />
                ) : (
                  <FolderOpen size={12} className="text-[var(--color-text-muted)]" />
                )}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-medium truncate">{w.name}</span>
                <span className="block text-[10px] text-[var(--color-text-muted)] truncate font-mono">
                  {w.path}
                </span>
              </span>
            </button>
          );
        })}

        {linked && (
          <>
            <div className="border-t border-[var(--color-border)] my-1" />
            <button
              type="button"
              disabled={busy}
              onClick={() => void linkTo(null)}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--color-bg-subtle)] text-left text-[var(--color-text-muted)] disabled:opacity-60"
            >
              <Unlink size={12} />
              Unlink this prompt
            </button>
          </>
        )}

        <div className="border-t border-[var(--color-border)] my-1" />
        <button
          type="button"
          disabled={busy}
          onClick={() => void addWorkspace()}
          className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--color-bg-subtle)] text-left text-[var(--color-accent)] disabled:opacity-60"
        >
          <Plus size={12} />
          Add a new workspace…
        </button>
      </FloatingMenu>
    </>
  );
}
