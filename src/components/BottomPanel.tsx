import { useEffect, useState, useRef } from "react";
import {
  ChevronDown,
  ChevronUp,
  Zap,
  Minimize2,
  MessageSquare,
  Variable,
  FlaskConical,
  GripHorizontal,
} from "lucide-react";
import clsx from "clsx";

export interface BottomTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
  content: React.ReactNode;
}

interface Props {
  tabs: BottomTab[];
  /** If set, this tab opens by default */
  defaultTab?: string;
}

const MIN_HEIGHT = 38; // collapsed = just the tab bar
const DEFAULT_HEIGHT = 280;
const MAX_HEIGHT_RATIO = 0.6; // max 60% of viewport

export function BottomPanel({ tabs, defaultTab }: Props) {
  const [activeTab, setActiveTab] = useState<string>(
    defaultTab ?? tabs[0]?.id ?? ""
  );
  const [collapsed, setCollapsed] = useState(false);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const dragRef = useRef<{
    startY: number;
    startHeight: number;
  } | null>(null);

  const visibleTabs = tabs.filter((t) => t.content !== null);
  if (visibleTabs.length === 0) return null;

  // Fallback to first visible tab if active tab no longer exists
  const activeTabExists = visibleTabs.some((t) => t.id === activeTab);
  useEffect(() => {
    if (!activeTabExists && visibleTabs.length > 0) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [activeTabExists, visibleTabs]);

  const activeContent = visibleTabs.find((t) => t.id === activeTab)?.content ?? visibleTabs[0]?.content;

  function handleDragStart(e: React.MouseEvent) {
    e.preventDefault();
    dragRef.current = { startY: e.clientY, startHeight: height };

    function onMove(ev: MouseEvent) {
      if (!dragRef.current) return;
      const delta = dragRef.current.startY - ev.clientY;
      const maxH = window.innerHeight * MAX_HEIGHT_RATIO;
      const newH = Math.max(80, Math.min(maxH, dragRef.current.startHeight + delta));
      setHeight(newH);
      if (collapsed) setCollapsed(false);
    }

    function onUp() {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <div
      className="shrink-0 flex flex-col border-t border-[var(--color-border)] bg-[var(--color-bg-elevated)]"
      style={{ height: collapsed ? MIN_HEIGHT : height }}
    >
      {/* Resize handle */}
      {!collapsed && (
        <div
          onMouseDown={handleDragStart}
          className="h-1 cursor-ns-resize hover:bg-[var(--color-accent)]/30 transition-colors flex items-center justify-center group"
          title="Drag to resize"
        >
          <GripHorizontal
            size={10}
            className="text-[var(--color-border-strong)] opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </div>
      )}

      {/* Tab bar */}
      <div className="flex items-center border-b border-[var(--color-border)] shrink-0">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              if (activeTab === tab.id && !collapsed) {
                setCollapsed(true);
              } else {
                setActiveTab(tab.id);
                setCollapsed(false);
              }
            }}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors border-b-2 -mb-px",
              activeTab === tab.id && !collapsed
                ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
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
          onClick={() => setCollapsed((c) => !c)}
          className="px-2 py-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] rounded mr-1"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* Content area */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto min-h-0 bg-[var(--color-bg-elevated)]">
          {activeContent}
        </div>
      )}
    </div>
  );
}

// ---------- Standard tab icons for reuse ----------

export const TAB_ICONS = {
  playground: <Zap size={11} />,
  compressor: <Minimize2 size={11} />,
  results: <MessageSquare size={11} />,
  variables: <Variable size={11} />,
  batchEvals: <FlaskConical size={11} />,
};
