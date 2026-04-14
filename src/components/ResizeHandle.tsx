import { GripVertical } from "lucide-react";
import clsx from "clsx";

interface Props {
  onMouseDown: (e: React.MouseEvent) => void;
  onDoubleClick?: () => void;
  title?: string;
  className?: string;
}

/**
 * Vertical 3px divider that acts as the visible edge between two horizontally
 * stacked panes, with a slightly wider invisible hit area for easier grabbing
 * and a centered grip icon that fades in on hover. Shared by the folders,
 * prompts, and timeline sidebars for consistent feel.
 */
export function ResizeHandle({ onMouseDown, onDoubleClick, title, className }: Props) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      className={clsx(
        "group relative w-[3px] shrink-0 cursor-col-resize bg-[var(--color-border)] transition-colors",
        "hover:bg-[var(--color-accent)]/50 active:bg-[var(--color-accent)]",
        className
      )}
      title={title ?? "Drag to resize · Double-click to collapse"}
    >
      {/* Wider invisible hit area for comfortable grabbing */}
      <span className="absolute inset-y-0 -left-1 -right-1" />
      {/* Grip icon — only visible on hover */}
      <span
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                   w-4 h-8 rounded-full bg-[var(--color-accent)]
                   flex items-center justify-center
                   opacity-0 group-hover:opacity-100 transition-opacity duration-150
                   pointer-events-none shadow-sm"
      >
        <GripVertical size={10} className="text-white" />
      </span>
    </div>
  );
}
