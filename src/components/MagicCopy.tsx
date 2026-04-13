import { useEffect, useRef, useState } from "react";
import { Copy, Check, ChevronDown } from "lucide-react";
import clsx from "clsx";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { useAppStore } from "../store";

type CopyFormat = "plain" | "markdown" | "json";

interface CopySelection {
  prompt: boolean;
  system: boolean;
  model: boolean;
  params: boolean;
  stamp: boolean;
  note: boolean;
}

const STORAGE_KEY = "magic-copy-selection";

const DEFAULT_SELECTION: CopySelection = {
  prompt: true,
  system: false,
  model: false,
  params: false,
  stamp: false,
  note: false,
};

export function MagicCopy() {
  const activePrompt = useAppStore((s) => s.activePrompt);
  const draftContent = useAppStore((s) => s.draftContent);
  const draftSystemPrompt = useAppStore((s) => s.draftSystemPrompt);
  const draftModel = useAppStore((s) => s.draftModel);
  const draftParams = useAppStore((s) => s.draftParams);

  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<CopyFormat>("markdown");
  const [selection, setSelection] = useState<CopySelection>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_SELECTION, ...parsed.selection };
      }
    } catch {
      /* ignore */
    }
    return DEFAULT_SELECTION;
  });
  const [justCopied, setJustCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ selection, format })
      );
    } catch {
      /* ignore */
    }
  }, [selection, format]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  async function doCopy() {
    const payload = buildPayload({
      selection,
      format,
      prompt: draftContent,
      systemPrompt: draftSystemPrompt,
      model: draftModel,
      params: draftParams,
      title: activePrompt?.prompt.title ?? "",
      revisionNumber: activePrompt?.latest_revision?.revision_number ?? null,
      note: activePrompt?.latest_revision?.note ?? null,
    });
    try {
      await writeText(payload);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1500);
    } catch (err) {
      console.error("copy failed", err);
      alert("Could not copy to clipboard.");
    }
  }

  const anyEnabled = Object.values(selection).some(Boolean);

  return (
    <div className="relative">
      <div className="flex items-stretch">
        <button
          type="button"
          disabled={!anyEnabled || !activePrompt}
          onClick={doCopy}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-l text-xs font-medium border transition-colors",
            activePrompt && anyEnabled
              ? "bg-[var(--color-bg-elevated)] border-[var(--color-border-strong)] hover:bg-[var(--color-bg-subtle)]"
              : "bg-[var(--color-bg-subtle)] border-[var(--color-border)] text-[var(--color-text-muted)] cursor-not-allowed"
          )}
        >
          {justCopied ? <Check size={12} /> : <Copy size={12} />}
          Magic Copy
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="px-1.5 py-1.5 rounded-r text-xs font-medium border border-l-0 border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-subtle)]"
        >
          <ChevronDown size={12} />
        </button>
      </div>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-1 w-64 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-md shadow-lg z-50 p-3 text-xs"
        >
          <div className="mb-2 font-semibold text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
            Include in clipboard
          </div>
          <div className="space-y-1.5">
            <CheckboxRow
              label="Prompt text"
              checked={selection.prompt}
              onChange={(v) => setSelection({ ...selection, prompt: v })}
            />
            <CheckboxRow
              label="System instructions"
              checked={selection.system}
              onChange={(v) => setSelection({ ...selection, system: v })}
            />
            <CheckboxRow
              label="Model name"
              checked={selection.model}
              onChange={(v) => setSelection({ ...selection, model: v })}
            />
            <CheckboxRow
              label="Parameters"
              checked={selection.params}
              onChange={(v) => setSelection({ ...selection, params: v })}
            />
            <CheckboxRow
              label="Version stamp"
              checked={selection.stamp}
              onChange={(v) => setSelection({ ...selection, stamp: v })}
            />
            <CheckboxRow
              label="Note"
              checked={selection.note}
              onChange={(v) => setSelection({ ...selection, note: v })}
            />
          </div>

          <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
            <div className="font-semibold text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
              Format
            </div>
            <div className="flex gap-1">
              {(["plain", "markdown", "json"] as CopyFormat[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={clsx(
                    "flex-1 px-2 py-1 rounded text-[11px] capitalize",
                    format === f
                      ? "bg-[var(--color-accent)] text-white"
                      : "bg-[var(--color-bg-subtle)] hover:bg-[var(--color-border)]"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() =>
                setSelection({
                  prompt: true,
                  system: false,
                  model: false,
                  params: false,
                  stamp: false,
                  note: false,
                })
              }
              className="flex-1 px-2 py-1.5 border border-[var(--color-border)] rounded text-[11px] hover:bg-[var(--color-bg-subtle)]"
            >
              Clean Copy
            </button>
            <button
              type="button"
              onClick={() =>
                setSelection({
                  prompt: true,
                  system: true,
                  model: true,
                  params: true,
                  stamp: true,
                  note: true,
                })
              }
              className="flex-1 px-2 py-1.5 border border-[var(--color-border)] rounded text-[11px] hover:bg-[var(--color-bg-subtle)]"
            >
              All on
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-[var(--color-accent)]"
      />
      <span className="flex-1">{label}</span>
    </label>
  );
}

interface BuildArgs {
  selection: CopySelection;
  format: CopyFormat;
  prompt: string;
  systemPrompt: string;
  model: string;
  params: Record<string, unknown>;
  title: string;
  revisionNumber: number | null;
  note: string | null;
}

function buildPayload(args: BuildArgs): string {
  const {
    selection,
    format,
    prompt,
    systemPrompt,
    model,
    params,
    title,
    revisionNumber,
    note,
  } = args;

  if (format === "json") {
    const obj: Record<string, unknown> = {};
    if (selection.stamp) {
      obj.title = title;
      if (revisionNumber !== null) obj.revision = revisionNumber;
      obj.timestamp = new Date().toISOString();
    }
    if (selection.model && model) obj.model = model;
    if (selection.params && Object.keys(params).length > 0) obj.params = params;
    if (selection.system && systemPrompt) obj.system = systemPrompt;
    if (selection.prompt) obj.prompt = prompt;
    if (selection.note && note) obj.note = note;
    return JSON.stringify(obj, null, 2);
  }

  const parts: string[] = [];

  if (format === "markdown") {
    const meta: string[] = [];
    if (selection.stamp) {
      meta.push(`**${title}**`);
      if (revisionNumber !== null) meta.push(`revision #${revisionNumber}`);
      meta.push(new Date().toLocaleString());
    }
    if (selection.model && model) meta.push(`model: \`${model}\``);
    if (selection.params && Object.keys(params).length > 0) {
      meta.push(`params: \`${JSON.stringify(params)}\``);
    }
    if (meta.length > 0) {
      parts.push(`> ${meta.join(" · ")}`);
      parts.push("");
    }
    if (selection.system && systemPrompt) {
      parts.push("**System:**");
      parts.push(systemPrompt);
      parts.push("");
    }
    if (selection.prompt) {
      parts.push(prompt);
    }
    if (selection.note && note) {
      parts.push("");
      parts.push(`_Note: ${note}_`);
    }
    return parts.join("\n");
  }

  // plain
  if (selection.stamp) {
    parts.push(`--- ${title} ---`);
    if (revisionNumber !== null) parts.push(`Revision: #${revisionNumber}`);
    parts.push(`Date: ${new Date().toLocaleString()}`);
  }
  if (selection.model && model) parts.push(`Model: ${model}`);
  if (selection.params && Object.keys(params).length > 0) {
    parts.push(`Params: ${JSON.stringify(params)}`);
  }
  if (selection.stamp || selection.model || selection.params) parts.push("");
  if (selection.system && systemPrompt) {
    parts.push("SYSTEM:");
    parts.push(systemPrompt);
    parts.push("");
  }
  if (selection.prompt) {
    parts.push(prompt);
  }
  if (selection.note && note) {
    parts.push("");
    parts.push(`Note: ${note}`);
  }
  return parts.join("\n");
}
