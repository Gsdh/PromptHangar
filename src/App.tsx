import { useEffect, useRef, useState, useCallback } from "react";
import clsx from "clsx";
import { Settings as SettingsIcon, BookOpen, Download, BarChart3, Lock, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Link2, FlaskConical, Activity, HelpCircle, History } from "lucide-react";
import { useAppStore } from "./store";
import { FolderTree } from "./components/FolderTree";
import { DndPromptList } from "./components/DndPromptList";
import { PromptEditor } from "./components/PromptEditor";
import { RevisionTimeline } from "./components/RevisionTimeline";
import { FirstRunModal } from "./components/FirstRunModal";
import { SettingsModal } from "./components/SettingsModal";
import { SearchBar } from "./components/SearchBar";
import { ImportModal } from "./components/ImportModal";
import { ShortcutsHelp } from "./components/ShortcutsHelp";
import { AnalyticsModal } from "./components/AnalyticsModal";
import { ChainsModal } from "./components/ChainsModal";
import { OnboardingTour } from "./components/OnboardingTour";
import { ABTestModal } from "./components/ABTestModal";
import { TracingViewer } from "./components/TracingViewer";
import { HelpGuide } from "./components/HelpGuide";
import { ToastContainer } from "./components/Toast";
import { ResizeHandle } from "./components/ResizeHandle";

function App() {
  const bootstrap = useAppStore((s) => s.bootstrap);
  const initialized = useAppStore((s) => s.initialized);
  const settings = useAppStore((s) => s.settings);
  const folders = useAppStore((s) => s.folders);
  const selectedFolderId = useAppStore((s) => s.selectedFolderId);
  const selectFolder = useAppStore((s) => s.selectFolder);
  const prompts = useAppStore((s) => s.prompts);
  const tagFilter = useAppStore((s) => s.tagFilter);
  const selectedPromptId = useAppStore((s) => s.selectedPromptId);
  const selectPrompt = useAppStore((s) => s.selectPrompt);
  const createPrompt = useAppStore((s) => s.createPrompt);

  const filteredPrompts = tagFilter
    ? prompts.filter((p) => p.tags.includes(tagFilter))
    : prompts;

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [chainsOpen, setChainsOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [abTestOpen, setAbTestOpen] = useState(false);
  const [tracingOpen, setTracingOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Collapsible + resizable sidebars — persisted in localStorage
  const FOLDER_DEFAULT_W = 224;
  const PROMPTS_DEFAULT_W = 256;
  const TIMELINE_DEFAULT_W = 224;
  const SIDEBAR_MIN_W = 140;
  const SIDEBAR_MAX_W = 400;
  const COLLAPSE_THRESHOLD = 60; // drag below this → collapse

  const [foldersCollapsed, setFoldersCollapsed] = useState(
    () => localStorage.getItem("pn:foldersCollapsed") === "true"
  );
  const [promptsCollapsed, setPromptsCollapsed] = useState(
    () => localStorage.getItem("pn:promptsCollapsed") === "true"
  );
  const [timelineCollapsed, setTimelineCollapsed] = useState(
    () => localStorage.getItem("pn:timelineCollapsed") === "true"
  );
  const [foldersWidth, setFoldersWidth] = useState(
    () => Number(localStorage.getItem("pn:foldersWidth")) || FOLDER_DEFAULT_W
  );
  const [promptsWidth, setPromptsWidth] = useState(
    () => Number(localStorage.getItem("pn:promptsWidth")) || PROMPTS_DEFAULT_W
  );
  const [timelineWidth, setTimelineWidth] = useState(
    () => Number(localStorage.getItem("pn:timelineWidth")) || TIMELINE_DEFAULT_W
  );
  const dragRef = useRef<{ side: "folders" | "prompts" | "timeline"; startX: number; startW: number } | null>(null);

  function toggleFolders() {
    setFoldersCollapsed((c) => {
      localStorage.setItem("pn:foldersCollapsed", String(!c));
      return !c;
    });
  }
  function togglePrompts() {
    setPromptsCollapsed((c) => {
      localStorage.setItem("pn:promptsCollapsed", String(!c));
      return !c;
    });
  }
  function toggleTimeline() {
    setTimelineCollapsed((c) => {
      localStorage.setItem("pn:timelineCollapsed", String(!c));
      return !c;
    });
  }

  // When all three panes are collapsed, flip to side-panel layout so the
  // bottom panel moves to the right of the editor instead of below it.
  const sidePanelMode = foldersCollapsed && promptsCollapsed && timelineCollapsed;

  const handleSidebarDrag = useCallback((side: "folders" | "prompts" | "timeline", e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = side === "folders" ? foldersWidth : side === "prompts" ? promptsWidth : timelineWidth;
    // Timeline grows LEFTWARD — drag left = wider, drag right = narrower.
    const invert = side === "timeline";
    dragRef.current = { side, startX, startW };

    function onMove(ev: MouseEvent) {
      if (!dragRef.current) return;
      const rawDelta = ev.clientX - dragRef.current.startX;
      const delta = invert ? -rawDelta : rawDelta;
      const newW = Math.max(0, dragRef.current.startW + delta);

      if (newW < COLLAPSE_THRESHOLD) {
        if (dragRef.current.side === "folders") {
          setFoldersCollapsed(true);
          localStorage.setItem("pn:foldersCollapsed", "true");
        } else if (dragRef.current.side === "prompts") {
          setPromptsCollapsed(true);
          localStorage.setItem("pn:promptsCollapsed", "true");
        } else {
          setTimelineCollapsed(true);
          localStorage.setItem("pn:timelineCollapsed", "true");
        }
      } else {
        const clamped = Math.min(SIDEBAR_MAX_W, Math.max(SIDEBAR_MIN_W, newW));
        if (dragRef.current.side === "folders") {
          setFoldersCollapsed(false);
          localStorage.setItem("pn:foldersCollapsed", "false");
          setFoldersWidth(clamped);
          localStorage.setItem("pn:foldersWidth", String(clamped));
        } else if (dragRef.current.side === "prompts") {
          setPromptsCollapsed(false);
          localStorage.setItem("pn:promptsCollapsed", "false");
          setPromptsWidth(clamped);
          localStorage.setItem("pn:promptsWidth", String(clamped));
        } else {
          setTimelineCollapsed(false);
          localStorage.setItem("pn:timelineCollapsed", "false");
          setTimelineWidth(clamped);
          localStorage.setItem("pn:timelineWidth", String(clamped));
        }
      }
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
  }, [foldersWidth, promptsWidth, timelineWidth]);

  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    bootstrap().catch((err) => {
      console.error("bootstrap failed", err);
      setBootError(String(err));
    });
  }, [bootstrap]);

  // Global shortcuts
  useEffect(() => {
    async function onKey(e: KeyboardEvent) {
      // Cmd/Ctrl+N — new prompt in current folder (when not typing)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        const target = e.target as HTMLElement | null;
        const isTyping =
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable ||
            target.closest(".cm-editor"));
        if (isTyping) return;
        if (!selectedFolderId) return;
        e.preventDefault();
        await createPrompt("New prompt");
        // The store auto-selects the new prompt. Auto-enter rename mode so the
        // user can immediately type the real title without clicking.
        setTimeout(() => {
          const btn = document.querySelector<HTMLButtonElement>(
            '[data-prompt-title-button="true"]'
          );
          btn?.click();
        }, 60);
      }
      // Cmd/Ctrl+, — open settings
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        setSettingsOpen(true);
      }
      // Cmd/Ctrl+? or Cmd/Ctrl+/ — shortcuts help
      if ((e.metaKey || e.ctrlKey) && (e.key === "?" || (e.shiftKey && e.key === "/"))) {
        e.preventDefault();
        setShortcutsOpen(true);
      }
      // Cmd/Ctrl+I — open import
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
        const target = e.target as HTMLElement | null;
        const isTyping =
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable ||
            target.closest(".cm-editor"));
        if (isTyping) return;
        e.preventDefault();
        setImportOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedFolderId, createPrompt]);

  if (!initialized || !settings) {
    return (
      <div className="h-full flex items-center justify-center text-sm" style={{ color: "#888", background: "#1a1a1a" }}>
        {bootError ? (
          <div style={{ maxWidth: 500, padding: 24 }}>
            <div style={{ color: "#ff6b6b", fontWeight: 700, marginBottom: 8 }}>Bootstrap failed</div>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "#ccc", background: "#222", padding: 12, borderRadius: 8 }}>{bootError}</pre>
            <div style={{ marginTop: 12, color: "#666", fontSize: 11 }}>
              Try resetting the database by deleting the file in ~/Library/Application Support/com.prompthangar.app/ and restarting the app.
            </div>
          </div>
        ) : (
          <div className="space-y-3 w-64">
            <div className="skeleton h-4 w-40" />
            <div className="skeleton h-3 w-56" />
            <div className="skeleton h-3 w-48" />
            <div className="skeleton h-3 w-32" />
          </div>
        )}
      </div>
    );
  }

  const showFirstRun = !settings.first_run_completed;

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--color-bg)", color: "var(--color-text)" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleFolders}
            className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded hover:bg-[var(--color-bg-subtle)]"
            title={foldersCollapsed ? "Show folders" : "Hide folders"}
          >
            {foldersCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
          </button>
          <button
            type="button"
            onClick={togglePrompts}
            className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded hover:bg-[var(--color-bg-subtle)]"
            title={promptsCollapsed ? "Show prompts" : "Hide prompts"}
          >
            {promptsCollapsed ? <PanelRightOpen size={14} /> : <PanelRightClose size={14} />}
          </button>
          <button
            type="button"
            onClick={toggleTimeline}
            className={clsx(
              "p-1.5 rounded hover:bg-[var(--color-bg-subtle)] transition-colors",
              timelineCollapsed
                ? "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                : "text-[var(--color-accent)]"
            )}
            title={timelineCollapsed ? "Show revision timeline" : "Hide revision timeline"}
          >
            <History size={14} />
          </button>
          <div className="w-px h-4 bg-[var(--color-border)]" />
          <BookOpen size={16} className="text-[var(--color-accent)]" />
          <span className="font-semibold text-sm">PromptHangar</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-[var(--color-bg-subtle)] rounded text-[var(--color-text-muted)] uppercase">
            {settings.mode}
          </span>
          {settings.airgap_enabled && (
            <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
              <Lock size={10} /> offline
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <SearchBar />
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded hover:bg-[var(--color-bg-subtle)]"
            title="Import prompt (Cmd/Ctrl+I)"
          >
            <Download size={12} />
            <span>Import</span>
          </button>
          <button type="button" onClick={() => setChainsOpen(true)} className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded hover:bg-[var(--color-bg-subtle)]" title="Prompt Chains">
            <Link2 size={14} />
          </button>
          <button type="button" onClick={() => setAbTestOpen(true)} className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded hover:bg-[var(--color-bg-subtle)]" title="A/B Tests">
            <FlaskConical size={14} />
          </button>
          <button type="button" onClick={() => setTracingOpen(true)} className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded hover:bg-[var(--color-bg-subtle)]" title="Traces">
            <Activity size={14} />
          </button>
          <button type="button" onClick={() => setAnalyticsOpen(true)} className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded hover:bg-[var(--color-bg-subtle)]" title="Analytics">
            <BarChart3 size={14} />
          </button>
          <button type="button" onClick={() => setHelpOpen(true)} className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded hover:bg-[var(--color-bg-subtle)]" title="Help & Guide">
            <HelpCircle size={14} />
          </button>
          <button type="button" onClick={() => setSettingsOpen(true)} className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded hover:bg-[var(--color-bg-subtle)]" title="Settings">
            <SettingsIcon size={14} />
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Folder tree — collapsible + resizable */}
        <div
          className={clsx("bg-[var(--color-bg-elevated)] overflow-hidden shrink-0 relative", foldersCollapsed && "sidebar-auto-hide")}
          style={{ width: foldersCollapsed ? 0 : foldersWidth }}
        >
          {!foldersCollapsed && (
            <FolderTree
              folders={folders}
              selectedId={selectedFolderId}
              onSelect={(id) => void selectFolder(id)}
            />
          )}
        </div>
        {/* Folders drag handle */}
        {!foldersCollapsed && (
          <ResizeHandle
            onMouseDown={(e) => handleSidebarDrag("folders", e)}
            onDoubleClick={toggleFolders}
          />
        )}

        {/* Prompt list — collapsible + resizable */}
        <div
          className="bg-[var(--color-bg-elevated)] overflow-hidden shrink-0 relative"
          style={{ width: promptsCollapsed ? 0 : promptsWidth }}
        >
          {!promptsCollapsed && (
            <DndPromptList
              prompts={filteredPrompts}
              selectedId={selectedPromptId}
              onSelect={(id) => void selectPrompt(id)}
            />
          )}
        </div>
        {/* Prompts drag handle */}
        {!promptsCollapsed && (
          <ResizeHandle
            onMouseDown={(e) => handleSidebarDrag("prompts", e)}
            onDoubleClick={togglePrompts}
          />
        )}

        {/* Editor + timeline */}
        <div className="flex-1 flex overflow-hidden bg-[var(--color-bg)] min-w-0">
          <div className="flex-1 overflow-hidden min-w-0">
            <PromptEditor sidePanelMode={sidePanelMode} />
          </div>

          {/* Timeline drag handle (only when timeline is visible) */}
          {!timelineCollapsed && (
            <ResizeHandle
              onMouseDown={(e) => handleSidebarDrag("timeline", e)}
              onDoubleClick={toggleTimeline}
            />
          )}

          {/* Revision timeline — collapsible + resizable */}
          <div
            className="bg-[var(--color-bg-elevated)] overflow-hidden shrink-0"
            style={{ width: timelineCollapsed ? 0 : timelineWidth }}
          >
            {!timelineCollapsed && <RevisionTimeline />}
          </div>
        </div>
      </div>

      {showFirstRun && <FirstRunModal onComplete={() => setTourOpen(true)} />}
      {tourOpen && <OnboardingTour onClose={() => setTourOpen(false)} />}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {importOpen && <ImportModal onClose={() => setImportOpen(false)} />}
      {shortcutsOpen && (
        <ShortcutsHelp onClose={() => setShortcutsOpen(false)} />
      )}
      {analyticsOpen && (
        <AnalyticsModal onClose={() => setAnalyticsOpen(false)} />
      )}
      {chainsOpen && <ChainsModal onClose={() => setChainsOpen(false)} />}
      {abTestOpen && <ABTestModal onClose={() => setAbTestOpen(false)} />}
      {tracingOpen && <TracingViewer onClose={() => setTracingOpen(false)} />}
      {helpOpen && <HelpGuide onClose={() => setHelpOpen(false)} />}
      <ToastContainer />
    </div>
  );
}

export default App;
