import clsx from "clsx";
import * as LucideIcons from "lucide-react";
import { createElement } from "react";

export const COLOR_PALETTE = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#a855f7", // purple
  "#14b8a6", // teal
  "#ec4899", // pink
  "#eab308", // yellow
  "#64748b", // slate
  "#0ea5e9", // sky
  "#84cc16", // lime
  "#f97316", // orange
];

export const ICON_SET = [
  "folder",
  "laptop",
  "pen-tool",
  "bot",
  "palette",
  "target",
  "book-copy",
  "microscope",
  "lightbulb",
  "rocket",
  "bar-chart-3",
  "flask-conical",
  "hammer",
  "file-text",
  "ticket",
  "scale",
  "brain",
  "lock",
  "message-square",
  "globe",
  "package",
  "building",
  "clapperboard",
  "music",
];

export function DynamicIcon({ name, size = 16, className }: { name: string, size?: number, className?: string }) {
  if (!name) return null;
  const iconName = name.split("-").map(p => p.charAt(0).toUpperCase() + p.slice(1)).join("");
  const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Folder;
  return createElement(IconComponent, { size, className });
}

/**
 * Plain color swatch grid. Designed to be rendered inside a FloatingMenu —
 * no positioning or background of its own.
 */
export function ColorGrid({
  current,
  onPick,
}: {
  current: string | null;
  onPick: (color: string) => void;
}) {
  return (
    <div className="p-2 grid grid-cols-6 gap-1.5">
      {COLOR_PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onPick(c)}
          className={clsx(
            "w-5 h-5 rounded-[6px] transition-all hover:scale-110",
            current === c &&
              "ring-2 ring-offset-2 ring-[var(--color-accent)] ring-offset-[var(--color-bg-elevated)] scale-110 shadow-md"
          )}
          style={{ background: c }}
          title={c}
        />
      ))}
    </div>
  );
}

/**
 * Plain icon picker grid. Designed to be rendered inside a FloatingMenu.
 */
export function IconGrid({
  current,
  onPick,
}: {
  current: string | null;
  onPick: (icon: string) => void;
}) {
  return (
    <div className="p-2 grid grid-cols-6 gap-1 w-56">
      {ICON_SET.map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onPick(i)}
          className={clsx(
            "w-7 h-7 flex items-center justify-center rounded-[8px] transition-all duration-200",
            current === i
              ? "bg-[var(--color-accent)] text-white shadow-sm scale-110 ring-1 ring-[var(--color-accent)]"
              : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text)]"
          )}
          title={i}
        >
          <DynamicIcon name={i} size={14} />
        </button>
      ))}
    </div>
  );
}
