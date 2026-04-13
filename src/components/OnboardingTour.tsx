import { useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  FolderOpen,
  FileText,
  GitBranch,
  Zap,
  Minimize2,
  Link2,
  Download,
  Upload,
  BarChart3,
  Keyboard,
} from "lucide-react";
import clsx from "clsx";

interface Props {
  onClose: () => void;
}

const STEPS = [
  {
    icon: <FolderOpen size={24} />,
    title: "Organize with folders",
    description:
      "Create folders to organize your prompts. Right-click for options: rename, change color/icon, create subfolders, mark as sensitive. Drag prompts between folders.",
  },
  {
    icon: <FileText size={24} />,
    title: "Write & iterate",
    description:
      "Every time you save (Cmd+S), a new revision is created. Add a commit note to document why you changed something. Your drafts auto-save to localStorage in case of crashes.",
  },
  {
    icon: <GitBranch size={24} />,
    title: "Track your history",
    description:
      "The revision timeline shows every change with full date/time. Click any revision to see a diff. Flag important versions with ⭐. Search through revision content, notes, and dates.",
  },
  {
    icon: <Zap size={24} />,
    title: "Test locally",
    description:
      "The Playground connects to Ollama, LM Studio, Jan, LocalAI, or any OpenAI-compatible engine. Run your prompt and see streaming output. Results auto-save with model name and latency.",
  },
  {
    icon: <Minimize2 size={24} />,
    title: "Compress & optimize",
    description:
      "The Compressor analyzes your prompt and suggests optimizations: auto-compress removes filler words, Tips shows suggestions, Compare shows side-by-side diff, LLM Rewrite uses AI to shorten.",
  },
  {
    icon: <Link2 size={24} />,
    title: "Chain prompts",
    description:
      "Create chains to link prompts as pipeline steps. Output of step A becomes input for step B. Review and edit between steps. Perfect for complex workflows like research → draft → review.",
  },
  {
    icon: <Upload size={24} />,
    title: "Import from anywhere",
    description:
      "Paste a conversation from ChatGPT, Claude, Gemini, or Ollama. Auto-split detects role markers and separates your prompt from the AI's response. Works with web copy-paste and CLI output.",
  },
  {
    icon: <Download size={24} />,
    title: "Export & share",
    description:
      "Export as JSON (full data with all revisions) or Markdown (readable document). Magic Copy lets you choose exactly what metadata to include. Everything goes through a native save dialog.",
  },
  {
    icon: <BarChart3 size={24} />,
    title: "Track your growth",
    description:
      "Analytics shows your stats: total prompts, revisions, results, top tags, and most-revised prompts. All computed locally from your SQLite database. Zero telemetry.",
  },
  {
    icon: <Keyboard size={24} />,
    title: "Work fast",
    description:
      "Cmd+S save, Cmd+N new prompt, Cmd+K search, Cmd+I import, Cmd+? shortcuts. Double-click to rename. Collapse sidebars for full-screen editing. Everything is keyboard-accessible.",
  },
];

export function OnboardingTour({ onClose }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="glass-panel max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div className="h-1 bg-[var(--color-border)]">
          <div
            className="h-full bg-[var(--color-accent)] transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-6 text-center">
          {/* Icon */}
          <div className="inline-flex p-3 rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] mb-4">
            {current.icon}
          </div>

          {/* Content */}
          <h3 className="text-lg font-semibold mb-2">{current.title}</h3>
          <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
            {current.description}
          </p>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-1 mt-4">
            {STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                className={clsx(
                  "w-2 h-2 rounded-full transition-all",
                  i === step
                    ? "bg-[var(--color-accent)] w-4"
                    : "bg-[var(--color-border-strong)] hover:bg-[var(--color-text-muted)]"
                )}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1 px-3 py-1.5 border border-[var(--color-border)] rounded text-xs hover:bg-[var(--color-bg-subtle)]"
              >
                <ArrowLeft size={10} />
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (isLast) onClose();
                else setStep((s) => s + 1);
              }}
              className="flex items-center gap-1 px-4 py-1.5 bg-[var(--color-accent)] text-white rounded text-xs font-medium hover:brightness-110"
            >
              {isLast ? "Start using PromptHangar" : "Next"}
              {!isLast && <ArrowRight size={10} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
