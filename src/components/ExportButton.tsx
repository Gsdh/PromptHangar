import { useRef, useState } from "react";
import { Download, FileJson, FileText, Check } from "lucide-react";
import { toast } from "./Toast";
import { save } from "@tauri-apps/plugin-dialog";
import { useAppStore } from "../store";
import { exportPromptToFile } from "../api";
import { FloatingMenu } from "./FloatingMenu";

export function ExportButton() {
  const activePrompt = useAppStore((s) => s.activePrompt);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");
  const btnRef = useRef<HTMLButtonElement>(null);

  if (!activePrompt) return null;

  async function doExport(format: "json" | "markdown") {
    if (!activePrompt) return;
    const ext = format === "json" ? "json" : "md";
    const sanitized = activePrompt.prompt.title
      .replace(/[^a-zA-Z0-9_\-\s]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 48);
    const defaultName = `${sanitized}.${ext}`;

    try {
      const path = await save({
        defaultPath: defaultName,
        filters: [
          format === "json"
            ? { name: "JSON", extensions: ["json"] }
            : { name: "Markdown", extensions: ["md"] },
        ],
      });
      if (!path) return; // user cancelled

      setStatus("saving");
      setOpen(false);
      await exportPromptToFile({
        prompt_id: activePrompt.prompt.id,
        format,
        path,
      });
      setStatus("done");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      setStatus("idle");
      toast("Export failed: " + String(err), "error");
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 px-2 py-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded hover:bg-[var(--color-bg-subtle)]"
        title="Export prompt"
      >
        <Download size={12} />
        {status === "saving"
          ? "…"
          : status === "done"
            ? <Check size={10} />
            : "Export"}
      </button>

      <FloatingMenu
        open={open}
        anchorRef={btnRef}
        placement="bottom-end"
        onClose={() => setOpen(false)}
        className="py-1 min-w-[160px] text-sm"
      >
        <button
          type="button"
          onClick={() => void doExport("json")}
          className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-xs hover:bg-[var(--color-bg-subtle)]"
        >
          <FileJson size={12} className="text-[var(--color-text-muted)]" />
          <div>
            <div className="font-medium">JSON</div>
            <div className="text-[10px] text-[var(--color-text-muted)]">
              All revisions + results + metadata
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => void doExport("markdown")}
          className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-xs hover:bg-[var(--color-bg-subtle)]"
        >
          <FileText size={12} className="text-[var(--color-text-muted)]" />
          <div>
            <div className="font-medium">Markdown</div>
            <div className="text-[10px] text-[var(--color-text-muted)]">
              Readable document with all revisions
            </div>
          </div>
        </button>
      </FloatingMenu>
    </>
  );
}
