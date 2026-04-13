import { useState } from "react";
import { PenLine, Terminal, Lock, BookOpen, Settings as SettingsIcon } from "lucide-react";
import clsx from "clsx";
import { useAppStore } from "../store";
import type { AppMode } from "../types";

export function FirstRunModal({ onComplete }: { onComplete?: () => void } = {}) {
  const settings = useAppStore(s => s.settings);
  const updateSettings = useAppStore(s => s.updateSettings);
  const [choice, setChoice] = useState<AppMode>("basic");
  const [customFeatures, setCustomFeatures] = useState(settings?.custom_features ?? {
    showVariables: true,
    showPlayground: true,
    showSystemPrompt: false,
    showMetadata: false,
    showResults: false,
    showBatchEvals: false,
    showCompressor: true,
  });

  async function confirm() {
    await updateSettings({
      mode: choice,
      custom_features: customFeatures,
      first_run_completed: true,
    });
    onComplete?.();
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-6">
      <div className="glass-panel max-w-2xl w-full p-8">
        <h1 className="text-2xl font-semibold mb-1">
          Welcome to PromptHangar
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">
          Before you begin — which mode do you want to work in? You can always
          change this later in Settings.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ModeCard
            icon={<PenLine size={24} />}
            title="Basic"
            description="Clean editor. Perfect for content and storage."
            bullets={["Focus on prompt text", "No playground"]}
            selected={choice === "basic"}
            onSelect={() => setChoice("basic")}
          />
          <ModeCard
            icon={<BookOpen size={24} />}
            title="Advanced"
            description="Play with dynamic text and outputs."
            bullets={["Playground active", "Variables panel"]}
            selected={choice === "advanced"}
            onSelect={() => setChoice("advanced")}
          />
          <ModeCard
            icon={<Terminal size={24} />}
            title="Engineer"
            description="Advanced metadata and batch iterations."
            bullets={["Batch Evaluations", "Full parameters"]}
            selected={choice === "engineer"}
            onSelect={() => setChoice("engineer")}
          />
          <ModeCard
            icon={<SettingsIcon size={24} />}
            title="Custom"
            description="Mix panels however you want to work."
            bullets={["Your own preference", "Full control"]}
            selected={choice === "custom"}
            onSelect={() => setChoice("custom")}
          />
        </div>

        {choice === "custom" && (
          <div className="mt-4 space-y-3 p-4 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-md animate-in fade-in slide-in-from-top-1">
            <div className="text-xs font-semibold mb-2 text-[var(--color-text)]">Select your tools:</div>
            <div className="grid grid-cols-2 gap-4">
              <FeatureToggle label="Playground" checked={customFeatures.showPlayground} onChange={(v) => setCustomFeatures({...customFeatures, showPlayground: v})} />
              <FeatureToggle label="Variables" checked={customFeatures.showVariables} onChange={(v) => setCustomFeatures({...customFeatures, showVariables: v})} />
              <FeatureToggle label="System Prompt" checked={customFeatures.showSystemPrompt} onChange={(v) => setCustomFeatures({...customFeatures, showSystemPrompt: v})} />
              <FeatureToggle label="Metadata" checked={customFeatures.showMetadata} onChange={(v) => setCustomFeatures({...customFeatures, showMetadata: v})} />
              <FeatureToggle label="Output panel" checked={customFeatures.showResults} onChange={(v) => setCustomFeatures({...customFeatures, showResults: v})} />
              <FeatureToggle label="Batch Evals" checked={customFeatures.showBatchEvals} onChange={(v) => setCustomFeatures({...customFeatures, showBatchEvals: v})} />
              <FeatureToggle label="Compressor" checked={customFeatures.showCompressor} onChange={(v) => setCustomFeatures({...customFeatures, showCompressor: v})} />
            </div>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
            <Lock size={12} /> Everything stays local. No internet needed.
          </div>
          <button
            type="button"
            onClick={confirm}
            className="px-6 py-2 bg-[var(--color-accent)] text-white rounded text-sm font-medium hover:brightness-110"
          >
            Start
          </button>
        </div>
      </div>
    </div>
  );
}

function ModeCard({
  icon,
  title,
  description,
  bullets,
  selected,
  onSelect,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  bullets: string[];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        "text-left p-5 rounded-lg border-2 transition-all",
        selected
          ? "border-[var(--color-accent)] bg-[var(--color-bg-subtle)]"
          : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
      )}
    >
      <div
        className={clsx(
          "inline-flex p-2 rounded-md mb-3",
          selected
            ? "bg-[var(--color-accent)] text-white"
            : "bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]"
        )}
      >
        {icon}
      </div>
      <div className="font-semibold text-base mb-1">{title}</div>
      <div className="text-xs text-[var(--color-text-muted)] mb-3">
        {description}
      </div>
      <ul className="text-xs space-y-1">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-1.5">
            <span className="text-[var(--color-accent)] mt-0.5">•</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}

function FeatureToggle({ label, checked, onChange }: { label: string, checked: boolean, onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm font-medium">{label}</div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-8 h-4 bg-[var(--color-border)] rounded-full peer peer-checked:bg-[var(--color-accent)] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-transform peer-checked:after:translate-x-4"></div>
      </label>
    </div>
  );
}
