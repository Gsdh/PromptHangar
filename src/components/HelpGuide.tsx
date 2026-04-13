import { useState } from "react";
import {
  X, BookOpen, FolderOpen, FileText, GitBranch, Zap, Minimize2,
  Link2, Download, Upload, BarChart3, Tag,
  Search, Rocket, FlaskConical, Activity,
  Settings, Lock,
} from "lucide-react";
import clsx from "clsx";

interface Props {
  onClose: () => void;
}

const SECTIONS = [
  {
    icon: <FolderOpen size={16} />,
    title: "Folders & Organization",
    content: [
      "Create nested folder structures to organize your prompts by project, client, or topic.",
      "Right-click (or click ⋯) on a folder for: Rename, New subfolder, Color, Icon, Sensitive toggle, Delete.",
      "Double-click any folder or prompt name to rename inline.",
      "Drag prompts via the ⋮⋮ handle to reorder within a folder.",
      "Move prompts between folders via the ⋯ menu → Move to...",
      "Mark folders as Sensitive (🛡️) to block cloud API calls from prompts in that folder (enforced when cloud providers are added).",
      "Collapse the folder/prompt sidebars with the panel buttons in the top-left to maximize editor space.",
    ],
  },
  {
    icon: <Tag size={16} />,
    title: "Tags & Smart Folders",
    content: [
      "Add tags to any prompt via the tag editor below the title. Type and press Enter or comma to add.",
      "Tags auto-complete from your existing tag library. Canonical normalization prevents duplicates (AI Stuff → ai-stuff).",
      "Click a tag chip in the prompt list to filter by that tag across all folders.",
      "Smart Folders at the top of the sidebar: Recent (last 30 edited), Flagged (any revision starred), All Prompts.",
      "Backspace on an empty tag input removes the last tag. Click × on a chip to remove.",
    ],
  },
  {
    icon: <FileText size={16} />,
    title: "Writing & Editing",
    content: [
      "The editor uses CodeMirror 6 with markdown syntax highlighting and line wrapping.",
      "Toggle markdown preview with the Eye/Code button above the editor to see rendered output.",
      "Cmd/Ctrl+S saves a new revision. Add an optional commit note to document why you changed something.",
      "Undo/Redo buttons in the toolbar, plus Cmd+Z / Cmd+Shift+Z keyboard shortcuts.",
      "Template variables: use {{variable_name}} in your prompt. The Variables panel auto-detects them and shows input fields.",
      "Fill in variable values, preview the expanded prompt, and copy it with one click.",
      "Secret detection: on save, the app scans for API keys, tokens, and PII patterns. High-confidence matches trigger a warning.",
      "Writer/Engineer mode (changeable in Settings): Writer mode hides metadata and technical panels for a clean writing experience.",
    ],
  },
  {
    icon: <GitBranch size={16} />,
    title: "Revisions & Branching",
    content: [
      "Every save creates a new revision with full date/time stamp and optional commit note.",
      "The revision timeline shows all revisions grouped by date with relative timestamps.",
      "Click any revision to see a line-by-line diff against the latest version.",
      "Flag revisions with ⭐ to mark important milestones. Filter to show only flagged revisions.",
      "Search through revision content, notes, model names, and dates.",
      "Fork a revision into a new branch via the 🔱 button (hover to reveal). Give it a name like 'experiment-shorter'.",
      "Switch between branches using the branch dropdown at the top of the timeline.",
      "Each revision shows its eval score (if available) with trend arrows: ↑ improved, ↓ regressed, = stable.",
    ],
  },
  {
    icon: <Rocket size={16} />,
    title: "Environments (Dev/Staging/Prod)",
    content: [
      "Promote any revision to an environment: Development, Staging, or Production.",
      "Hover over a revision → click the 🚀 button → select an environment.",
      "Environment badges appear at the top of the timeline showing which revision is in each env.",
      "Colored badges: green (PROD), amber (STAGING), blue (DEV).",
      "Re-promoting a revision replaces the previous one in that environment.",
      "Use this to track which version of your prompt is 'live' vs 'testing'.",
    ],
  },
  {
    icon: <Zap size={16} />,
    title: "Playground (Testing)",
    content: [
      "The Playground connects to 15+ LLM providers: 6 local (Ollama, LM Studio, Jan, LocalAI, llama.cpp, Custom) and 9 cloud (OpenAI, Anthropic, Gemini, xAI, Mistral, DeepSeek, Groq, OpenRouter, Custom).",
      "Local models are auto-discovered. Cloud models appear when you add API keys in Settings.",
      "Click Run to stream the model's response in real-time. Stop mid-stream with the Stop button.",
      "Results auto-save as outputs attached to the current revision, labeled with the model name.",
      "Every API call is traced: provider, model, tokens, latency, cost, full input/output.",
      "Cost estimation in the metadata footer shows per-request cost based on 30+ model pricing tables.",
      "🔒 badge = local (data stays on machine), ☁️ badge = cloud (data sent to provider).",
    ],
  },
  {
    icon: <FlaskConical size={16} />,
    title: "A/B Testing",
    content: [
      "Create A/B tests to compare multiple revision variants of the same prompt.",
      "Open via the top bar → Chains → A/B Tests (or the FlaskConical icon).",
      "Select 2+ revisions as variants. The test auto-weights them equally.",
      "Record impressions: ✓ for success, ✗ for failure on each variant.",
      "Progress bars show relative usage and success rates per variant.",
      "Use this to determine which version of your prompt performs best before promoting to production.",
    ],
  },
  {
    icon: <Activity size={16} />,
    title: "Tracing & Observability",
    content: [
      "Every Playground run auto-saves a trace with: provider, model, input/output messages, tokens, latency, cost, status.",
      "Open the Tracing Viewer from the top bar to see all API calls in a sortable table.",
      "Filter by current prompt or view all traces across your entire prompt library.",
      "Summary stats at the top: total tokens, average latency, total cost, error count.",
      "Click any row to expand and see the full request/response details.",
      "Use traces to debug why a prompt produced unexpected output, or to track costs over time.",
    ],
  },
  {
    icon: <Minimize2 size={16} />,
    title: "Prompt Compressor",
    content: [
      "4 compression strategies, accessible from the Compressor tab in the bottom panel:",
      "Auto: Rule-based compression removes filler words, verbose phrases, redundant qualifiers, AI bloat. Instant, no LLM needed.",
      "Tips: Analysis without changes — suggests where to shorten, restructure, or remove redundancy.",
      "Compare: Side-by-side diff showing original vs compressed with token/cost savings.",
      "LLM Rewrite: Send your prompt to a local model with compression instructions. Uses streaming output.",
      "Click 'Apply' on any compression result to update your draft. Then Cmd+S to save as a new revision.",
    ],
  },
  {
    icon: <Link2 size={16} />,
    title: "Prompt Chains",
    content: [
      "Create named chains that link multiple prompts as sequential pipeline steps.",
      "Output of step A automatically becomes input for step B (injected as '--- Input from previous step ---').",
      "Review mode (default): after each step, the output appears in an editable textarea. Modify before continuing.",
      "Disable review mode for automated end-to-end execution.",
      "Use for workflows like: Research → Outline → Draft → Review → Polish.",
      "Each step shows real-time streaming output with status indicators (pending, running, done, error).",
    ],
  },
  {
    icon: <Upload size={16} />,
    title: "Import",
    content: [
      "Import from any AI tool: Cmd+I or the Import button in the top bar.",
      "5 detection strategies for auto-splitting pasted conversations:",
      "1. Role markers: You: / ChatGPT: / Claude: / Human: / Assistant: etc.",
      "2. Block headers: 'You said' / 'ChatGPT said' (ChatGPT web copy format).",
      "3. Ollama CLI: >>> prompts with responses below.",
      "4. Question mark heuristic: first paragraph ends with ? = prompt.",
      "5. Short-first heuristic: short paragraph followed by long one.",
      "Auto-split triggers on paste (no button needed). Shows which strategy was used.",
      "The AI response goes into the Results panel, linked to the imported prompt's first revision.",
    ],
  },
  {
    icon: <Download size={16} />,
    title: "Export & Magic Copy",
    content: [
      "Export: JSON (full data with all revisions, results, metadata) or Markdown (readable document).",
      "Uses a native save dialog — choose where to save and what filename.",
      "Magic Copy: clipboard copy with checkboxes to select what metadata to include.",
      "Formats: Plain text, Markdown, JSON. Save your selection as default.",
      "Duplicate a prompt via the ⋯ menu — copies title, latest revision, and tags.",
    ],
  },
  {
    icon: <Search size={16} />,
    title: "Search",
    content: [
      "Full-text search: Cmd+K to focus. Searches across prompt titles, descriptions, and revision content.",
      "Results show highlighted snippets with the matching text marked.",
      "Semantic search (requires Ollama with nomic-embed-text model): finds prompts by meaning, not just keywords.",
      "Search within revisions: the revision timeline has its own search bar for filtering by content, notes, model, or date.",
    ],
  },
  {
    icon: <BarChart3 size={16} />,
    title: "Analytics",
    content: [
      "Dashboard showing: total prompts, revisions, results, folders, flagged revisions, average revisions per prompt.",
      "Top 5 tags by usage count.",
      "Most revised prompts with proportional bar chart.",
      "All stats computed locally from your SQLite database. Zero telemetry.",
    ],
  },
  {
    icon: <Settings size={16} />,
    title: "Settings & Privacy",
    content: [
      "Mode: Basic (clean), Advanced (playground + variables), Engineer (everything), Custom (choose panels).",
      "Theme: Light / Dark. CodeMirror editor switches theme too.",
      "Airgap hard-lock: blocks ALL network I/O including local models. For maximum isolation.",
      "Configurable ports for Ollama, LM Studio, Jan, LocalAI, llama.cpp.",
      "Custom endpoints: any OpenAI-compatible URL (local or cloud).",
      "Cloud provider API keys stored in OS keychain (macOS Keychain, Windows Credential Manager, Linux libsecret).",
      "Auto-migration: keys previously in localStorage are moved to keychain on boot.",
      "Auto-backup: SQLite database backed up on every app start. Last 7 kept.",
      "Crash-recovery: unsaved drafts saved to localStorage every 500ms. Restored on next load.",
    ],
  },
];

export function HelpGuide({ onClose }: Props) {
  const [activeSection, setActiveSection] = useState(0);

  return (
    <div className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="glass-panel max-w-4xl w-full max-h-[85vh] flex overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Sidebar */}
        <div className="w-56 shrink-0 border-r border-[var(--color-border)] overflow-y-auto bg-[var(--color-bg)]">
          <div className="flex items-center gap-2 p-4 border-b border-[var(--color-border)]">
            <BookOpen size={16} className="text-[var(--color-accent)]" />
            <span className="font-semibold text-sm">User Guide</span>
          </div>
          {SECTIONS.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveSection(i)}
              className={clsx(
                "w-full text-left px-4 py-2 flex items-center gap-2 text-xs transition-colors",
                activeSection === i
                  ? "bg-[var(--color-bg-subtle)] text-[var(--color-accent)] font-medium"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]"
              )}
            >
              <span className="shrink-0">{s.icon}</span>
              <span className="truncate">{s.title}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              {SECTIONS[activeSection].icon}
              {SECTIONS[activeSection].title}
            </h2>
            <button onClick={onClose} className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"><X size={16} /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <ul className="space-y-2">
              {SECTIONS[activeSection].content.map((line, i) => (
                <li key={i} className="flex items-start gap-2 text-sm leading-relaxed">
                  <span className="text-[var(--color-accent)] mt-1.5 shrink-0">•</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="px-6 py-3 border-t border-[var(--color-border)] flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1"><Lock size={9} /> PromptHangar v0.1.0 — All data stored locally</span>
            <span>{activeSection + 1} / {SECTIONS.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
