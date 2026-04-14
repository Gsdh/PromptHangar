import { useEffect, useState, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import clsx from "clsx";
import type { BottomTab } from "./BottomPanel";
import { ResizeHandle } from "./ResizeHandle";

interface Props {
  tabs: BottomTab[];
  defaultTab?: string;
}

const MIN_WIDTH = 320;
const DEFAULT_WIDTH = 440;
const MAX_WIDTH_RATIO = 0.6; // max 60% of viewport

/**
 * Horizontal cousin of BottomPanel, used when the three outer sidebars are
 * collapsed and the tab surface moves to the right of the editor. Keeps the
 * same tab shape for swap-in compatibility.
 */
export function SidePanel({ tabs, defaultTab }: Props) {
  const [activeTab, setActiveTab] = useState<string>(
    defaultTab ?? tabs[0]?.id ?? ""
  );
  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth] = useState(() =>
    Number(localStorage.getItem("pn:sidePanelWidth")) || DEFAULT_WIDTH
  );
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const visibleTabs = tabs.filter((t) => t.content !== null);

  const activeTabExists = visibleTabs.some((t) => t.id === activeTab);
  useEffect(() => {
    if (!activeTabExists && visibleTabs.length > 0) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [activeTabExists, visibleTabs]);

  if (visibleTabs.length === 0) return null;

  const activeContent =
    visibleTabs.find((t) => t.id === activeTab)?.content ?? visibleTabs[0]?.content;

  function handleDragStart(e: React.MouseEvent) {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startWidth: width };

    function onMove(ev: MouseEvent) {
      if (!dragRef.current) return;
      // Dragging LEFT should grow the right-side panel, so invert delta.
      const delta = dragRef.current.startX - ev.clientX;
      const maxW = window.innerWidth * MAX_WIDTH_RATIO;
      const newW = Math.max(MIN_WIDTH, Math.min(maxW, dragRef.current.startWidth + delta));
      setWidth(newW);
      localStorage.setItem("pn:sidePanelWidth", String(newW));
      if (collapsed) setCollapsed(false);
    }

    function onUp() {
      dragRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const COLLAPSED_WIDTH = 40;

  return (
    <div
      className="shrink-0 flex border-l border-[var(--color-border)] bg-[var(--color-bg-elevated)] transition-[width] duration-150 ease-out"
      style={{ width: collapsed ? COLLAPSED_WIDTH : width }}
    >
      {/* Drag handle — full height, only visible when expanded */}
      {!collapsed && (
        <ResizeHandle
          onMouseDown={handleDragStart}
          title="Drag to resize"
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Vertical tab bar when collapsed, horizontal when expanded */}
        {collapsed ? (
          <div className="flex flex-col items-center py-2 gap-1">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] rounded"
              title="Expand side panel"
            >
              <ChevronLeft size={14} />
            </button>
            <div className="w-6 h-px bg-[var(--color-border)] my-1" />
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setCollapsed(false);
                }}
                className={clsx(
                  "p-1.5 rounded transition-colors relative",
                  activeTab === tab.id
                    ? "text-[var(--color-accent)] bg-[var(--color-accent)]/10"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]"
                )}
                title={tab.label}
              >
                {tab.icon}
                {tab.badge !== undefined && tab.badge !== 0 && (
                  <span className="absolute -top-0.5 -right-0.5 px-1 bg-[var(--color-accent)] text-white rounded-full text-[8px] leading-none py-px min-w-[12px] text-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <>
            {/* Tab bar */}
            <div className="flex items-center border-b border-[var(--color-border)] shrink-0 overflow-x-auto">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    "flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors border-b-2 -mb-px whitespace-nowrap",
                    activeTab === tab.id
                      ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                      : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  )}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge !== 0 && (
                    <span className="px-1 py-px bg-[var(--color-bg-subtle)] rounded text-[8px]">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}

              <div className="flex-1" />

              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="px-2 py-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] rounded mr-1 shrink-0"
                title="Collapse side panel"
              >
                <ChevronRight size={12} />
              </button>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto min-h-0 bg-[var(--color-bg-elevated)]">
              {activeContent}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
