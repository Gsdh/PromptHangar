import { X, Keyboard } from "lucide-react";

const IS_MAC =
  typeof navigator !== "undefined" && navigator.platform.includes("Mac");
const MOD = IS_MAC ? "⌘" : "Ctrl";

const SHORTCUTS = [
  { keys: `${MOD}+S`, label: "Save revision" },
  { keys: `${MOD}+N`, label: "New prompt" },
  { keys: `${MOD}+K`, label: "Search" },
  { keys: `${MOD}+I`, label: "Import" },
  { keys: `${MOD}+,`, label: "Settings" },
  { keys: `${MOD}+?`, label: "Shortcuts (this overlay)" },
  { keys: "Double-click", label: "Rename folder or prompt" },
  { keys: "Enter", label: "Commit rename / tag / note" },
  { keys: "Escape", label: "Cancel & restore" },
  { keys: ",", label: "Add tag (in tag editor)" },
  { keys: "Backspace", label: "Remove last tag (when field is empty)" },
];

interface Props {
  onClose: () => void;
}

export function ShortcutsHelp({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="glass-panel max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <Keyboard size={16} className="text-[var(--color-text-muted)]" />
            <h2 className="text-base font-semibold">Shortcuts</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded hover:bg-[var(--color-bg-subtle)]"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-4">
          <table className="w-full">
            <tbody>
              {SHORTCUTS.map((s) => (
                <tr
                  key={s.keys}
                  className="border-b border-[var(--color-border)] last:border-0"
                >
                  <td className="py-2 pr-3 w-28">
                    <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded text-[11px] font-mono font-medium">
                      {s.keys}
                    </kbd>
                  </td>
                  <td className="py-2 text-sm text-[var(--color-text-muted)]">
                    {s.label}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)]">
          {IS_MAC ? "⌘ = Command" : "Ctrl = Control"} · Drag the
          ⋮⋮ handle to reorder prompts
        </div>
      </div>
    </div>
  );
}
