import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";

type Placement = "bottom-end" | "bottom-start" | "right-start";

interface Props {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  placement?: Placement;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
  /** Offset in pixels from the anchor. Default: 4 */
  gap?: number;
}

/**
 * Portal-based floating menu that escapes parent overflow clipping.
 * Positions itself relative to an anchor element using getBoundingClientRect.
 *
 * Placements:
 * - "bottom-end": menu sits below the anchor, right-aligned (for dropdown triggers)
 * - "right-start": menu sits to the right of the anchor, top-aligned (for submenus)
 */
export function FloatingMenu({
  open,
  anchorRef,
  placement = "bottom-end",
  onClose,
  className,
  children,
  gap = 4,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  // Compute position from anchor rect
  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    function update() {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;

      let top: number;
      let left: number | undefined;
      let right: number | undefined;

      if (placement === "bottom-end") {
        top = rect.bottom + gap;
        right = Math.max(8, viewportW - rect.right);
      } else if (placement === "bottom-start") {
        top = rect.bottom + gap;
        left = Math.max(8, rect.left);
      } else {
        // right-start
        top = rect.top;
        left = rect.right + gap;
      }

      // Keep on screen — clamp to viewport height later after measuring menu
      const baseStyle: React.CSSProperties = {
        position: "fixed",
        top,
        zIndex: 200,
        maxHeight: viewportH - top - 16,
      };
      if (right !== undefined) baseStyle.right = right;
      if (left !== undefined) baseStyle.left = left;
      setStyle(baseStyle);
    }
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, anchorRef, placement, gap]);

  // Outside click / escape dismiss
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current && menuRef.current.contains(target)) return;
      if (anchorRef.current && anchorRef.current.contains(target)) return;
      onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    // Delay binding one tick so the click that opened us doesn't immediately close us
    const t = window.setTimeout(() => {
      window.addEventListener("mousedown", onDown);
      window.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, anchorRef, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={menuRef}
      style={style}
      className={clsx(
        "glass-panel overflow-y-auto",
        className
      )}
    >
      {children}
    </div>,
    document.body
  );
}
