import { useState } from "react";
import { X, PenLine, Terminal, WifiOff, Sun, Moon, BookOpen, Settings as SettingsIcon, Cloud, Check, Eye, EyeOff, Key } from "lucide-react";
import clsx from "clsx";
import { useAppStore } from "../store";
import type { AppMode, Theme } from "../types";
import { getAllProviderConfigs, getApiKey, setApiKey, type ProviderType } from "../lib/providers";
import { toast } from "./Toast";

interface Props {
  onClose: () => void;
}

export function SettingsModal({ onClose }: Props) {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  if (!settings) return null;

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/40 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="glass-panel max-w-xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded hover:bg-[var(--color-bg-subtle)]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Mode */}
          <Section title="Mode" description="Choose your working environment.">
            <div className="flex gap-2 text-xs">
              <ModeOption
                current={settings.mode}
                mode="basic"
                icon={<PenLine size={14} />}
                label="Basic"
                onSelect={(m: AppMode) => updateSettings({ mode: m })}
              />
              <ModeOption
                current={settings.mode}
                mode="advanced"
                icon={<BookOpen size={14} />}
                label="Advanced"
                onSelect={(m: AppMode) => updateSettings({ mode: m })}
              />
              <ModeOption
                current={settings.mode}
                mode="engineer"
                icon={<Terminal size={14} />}
                label="Engineer"
                onSelect={(m: AppMode) => updateSettings({ mode: m })}
              />
              <ModeOption
                current={settings.mode}
                mode="custom"
                icon={<SettingsIcon size={14} />}
                label="Custom"
                onSelect={(m: AppMode) => updateSettings({ mode: m })}
              />
            </div>

            {settings.mode === "custom" && (
              <div className="mt-4 space-y-3 p-4 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-md animate-in fade-in slide-in-from-top-1">
                <div className="text-xs font-semibold mb-2 text-[var(--color-text)]">Custom Features:</div>
                <FeatureToggle
                   label="Playground"
                   hint="Test prompts locally against LLMs"
                   checked={settings.custom_features.showPlayground}
                   onChange={c => updateSettings({ custom_features: { ...settings.custom_features, showPlayground: c }})}
                />
                <FeatureToggle
                   label="Variables"
                   hint="Support for fill-in variables in {{brackets}}"
                   checked={settings.custom_features.showVariables}
                   onChange={c => updateSettings({ custom_features: { ...settings.custom_features, showVariables: c }})}
                />
                <FeatureToggle
                   label="System Prompt"
                   hint="Customize the model's system instructions"
                   checked={settings.custom_features.showSystemPrompt}
                   onChange={c => updateSettings({ custom_features: { ...settings.custom_features, showSystemPrompt: c }})}
                />
                <FeatureToggle
                   label="Metadata"
                   hint="Fine-tune temperature, limits, and model selection"
                   checked={settings.custom_features.showMetadata}
                   onChange={c => updateSettings({ custom_features: { ...settings.custom_features, showMetadata: c }})}
                />
                <FeatureToggle
                   label="Output panel"
                   hint="Save prompt output and results per revision"
                   checked={settings.custom_features.showResults}
                   onChange={c => updateSettings({ custom_features: { ...settings.custom_features, showResults: c }})}
                />
                <FeatureToggle
                   label="Batch Evaluations"
                   hint="Advanced framework tool to test prompts against datasets"
                   checked={settings.custom_features.showBatchEvals}
                   onChange={c => updateSettings({ custom_features: { ...settings.custom_features, showBatchEvals: c }})}
                />
              </div>
            )}
          </Section>

          {/* Theme */}
          <Section title="Theme" description="Light or dark.">
            <div className="flex gap-2">
              <ModeOption
                current={settings.theme}
                mode="light"
                icon={<Sun size={14} />}
                label="Light"
                onSelect={(t: Theme) => updateSettings({ theme: t })}
              />
              <ModeOption
                current={settings.theme}
                mode="dark"
                icon={<Moon size={14} />}
                label="Dark"
                onSelect={(t: Theme) => updateSettings({ theme: t })}
              />
            </div>
          </Section>

          {/* Network & Airgap */}
          <Section
            title="Network"
            description="Manage the connection to local AI engines and airgap mode."
          >
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded border border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
                <WifiOff size={16} className="text-amber-500" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Airgap hard-lock</div>
                  <div className="text-xs text-[var(--color-text-muted)]">
                    {localStorage.getItem("pn:airgapHardLock") === "true"
                      ? "On — all network I/O blocked, including local models."
                      : "Off — local engines (Ollama/LM Studio) are reachable."}
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localStorage.getItem("pn:airgapHardLock") === "true"}
                    onChange={(e) => {
                      localStorage.setItem("pn:airgapHardLock", String(e.target.checked));
                      // Force re-render
                      updateSettings({ airgap_enabled: e.target.checked });
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-[var(--color-border)] rounded-full peer peer-checked:bg-[var(--color-accent)] after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-transform peer-checked:after:translate-x-5"></div>
                </label>
              </div>

              {/* Provider ports */}
              <div className="p-3 rounded border border-[var(--color-border)] bg-[var(--color-bg-subtle)] space-y-2">
                <div className="text-sm font-medium">Local engine ports</div>
                <div className="grid grid-cols-3 gap-3">
                  <PortInput label="Ollama" storageKey="pn:ollamaPort" defaultPort="11434" />
                  <PortInput label="LM Studio" storageKey="pn:lmstudioPort" defaultPort="1234" />
                  <PortInput label="Jan" storageKey="pn:janPort" defaultPort="1337" />
                  <PortInput label="LocalAI" storageKey="pn:localaiPort" defaultPort="8080" />
                  <PortInput label="llama.cpp" storageKey="pn:llamacppPort" defaultPort="8080" />
                </div>
                <div className="mt-2 text-[10px] font-medium">Custom endpoints</div>
                <div className="grid grid-cols-2 gap-3">
                  <UrlInput label="Custom local URL" storageKey="pn:customLocalUrl" placeholder="http://localhost:5000" />
                  <UrlInput label="Custom cloud URL" storageKey="pn:customCloudUrl" placeholder="https://api.example.com" />
                </div>
                <div className="text-[9px] text-[var(--color-text-muted)]">
                  Configure ports for local engines. Use custom endpoints for any OpenAI-compatible service. Re-detect models in Playground after changes.
                </div>
              </div>
            </div>
          </Section>

          {/* Cloud Providers */}
          <Section
            title="Cloud Providers"
            description="Add API keys to enable cloud models. Keys stored locally — never sent anywhere except the provider."
          >
            <div className="space-y-2">
              {getAllProviderConfigs()
                .filter((c) => c.requiresKey)
                .map((config) => (
                  <ProviderKeyRow
                    key={config.type}
                    provider={config.type}
                    name={config.name}
                  />
                ))}
            </div>
            <div className="mt-2 text-[9px] text-[var(--color-text-muted)] flex items-center gap-1">
              <Key size={9} /> Re-detect models in Playground after adding keys.
            </div>
          </Section>

          {/* About */}
          <Section title="About" description="">
            <div className="text-xs text-[var(--color-text-muted)] space-y-0.5">
              <div className="font-medium text-[var(--color-text)]">PromptHangar v0.1.3</div>
              <div>Created by Gores Hamad</div>
              <div>Fully local. Zero telemetry. Data stored via SQLite.</div>
              <a href="https://github.com/Gsdh/PromptHangar" target="_blank" rel="noopener" className="text-[var(--color-accent)] hover:underline">GitHub</a>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-sm font-semibold mb-0.5">{title}</div>
      {description && (
        <div className="text-xs text-[var(--color-text-muted)] mb-2">
          {description}
        </div>
      )}
      <div className="mt-2">{children}</div>
    </div>
  );
}

function ModeOption<T extends string>({
  current,
  mode,
  icon,
  label,
  onSelect,
}: {
  current: T;
  mode: T;
  icon: React.ReactNode;
  label: string;
  onSelect: (m: T) => void;
}) {
  const active = current === mode;
  return (
    <button
      type="button"
      onClick={() => onSelect(mode)}
      className={clsx(
        "flex items-center gap-2 px-4 py-2 rounded border transition-colors text-sm",
        active
          ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
          : "border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)]"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function PortInput({ label, storageKey, defaultPort }: { label: string; storageKey: string; defaultPort: string }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-muted)]">
        {label}
      </label>
      <input
        type="number"
        defaultValue={localStorage.getItem(storageKey) || defaultPort}
        onChange={(e) => {
          const v = e.target.value.trim();
          if (v && Number(v) > 0) localStorage.setItem(storageKey, v);
        }}
        className="mt-0.5 w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-[var(--color-accent)]"
      />
    </div>
  );
}

function UrlInput({ label, storageKey, placeholder }: { label: string; storageKey: string; placeholder: string }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-muted)]">
        {label}
      </label>
      <input
        type="url"
        defaultValue={localStorage.getItem(storageKey) || ""}
        onChange={(e) => {
          const v = e.target.value.trim();
          if (v) localStorage.setItem(storageKey, v);
          else localStorage.removeItem(storageKey);
        }}
        placeholder={placeholder}
        className="mt-0.5 w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-[var(--color-accent)]"
      />
    </div>
  );
}

function ProviderKeyRow({
  provider,
  name,
}: {
  provider: ProviderType;
  name: string;
}) {
  const existing = getApiKey(provider);
  const [value, setValue] = useState(existing ?? "");
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(!!existing);

  function save() {
    setApiKey(provider, value);
    setSaved(true);
    toast(value.trim() ? `${name} key saved` : `${name} key removed`, "success");
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex items-center gap-2 p-2 rounded border border-[var(--color-border)] bg-[var(--color-bg)]">
      <Cloud size={12} className={clsx("shrink-0", existing ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]")} />
      <span className="text-xs font-medium w-20 shrink-0">{name}</span>
      <div className="relative flex-1">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => { setValue(e.target.value); setSaved(false); }}
          onKeyDown={(e) => { if (e.key === "Enter") save(); }}
          placeholder={`${name} API key`}
          className="w-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded px-2 py-1 text-[10px] font-mono focus:outline-none focus:border-[var(--color-accent)] pr-7"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          {show ? <EyeOff size={10} /> : <Eye size={10} />}
        </button>
      </div>
      <button
        type="button"
        onClick={save}
        className={clsx(
          "px-2 py-1 rounded text-[10px] font-medium shrink-0",
          saved
            ? "bg-emerald-500/20 text-emerald-500"
            : "bg-[var(--color-accent)] text-white hover:brightness-110"
        )}
      >
        {saved ? <Check size={10} /> : "Save"}
      </button>
    </div>
  );
}

function FeatureToggle({ label, hint, checked, onChange }: { label: string, hint: string, checked: boolean, onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-[var(--color-text-muted)]">{hint}</div>
      </div>
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
