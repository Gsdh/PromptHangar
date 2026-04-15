import { useEffect, useState } from "react";
import { X, PenLine, Terminal, WifiOff, Sun, Moon, Smartphone, BookOpen, Settings as SettingsIcon, Cloud, Check, Eye, EyeOff, Key, GitBranch, Plus, Trash2, FolderOpen, Lock, Unlock, Shield } from "lucide-react";
import clsx from "clsx";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import * as api from "../api";
import { useAppStore } from "../store";
import type { AppMode, GitWorkspace, Theme } from "../types";
import { getAllProviderConfigs, getApiKey, setApiKey, type ProviderType } from "../lib/providers";
import { toast } from "./Toast";

interface Props {
  onClose: () => void;
  security?: api.SecurityStatus | null;
  onSecurityChange?: () => Promise<api.SecurityStatus>;
}

export function SettingsModal({ onClose, security, onSecurityChange }: Props) {
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
                <FeatureToggle
                   label="Compressor"
                   hint="Reduce token count with compression strategies"
                   checked={settings.custom_features.showCompressor}
                   onChange={c => updateSettings({ custom_features: { ...settings.custom_features, showCompressor: c }})}
                />
              </div>
            )}
          </Section>

          {/* Theme */}
          <Section title="Theme" description="Choose your visual style.">
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
              <ModeOption
                current={settings.theme}
                mode="oled"
                icon={<Smartphone size={14} />}
                label="OLED Black"
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

          {/* Git sync (Epic 2) */}
          <Section
            title="Git Sync"
            description="Mirror selected prompts to a local Git repository. Each save writes a markdown file and creates a commit. Pushing to a remote is still up to you."
          >
            <GitWorkspacesManager />
          </Section>

          {/* Security (Epic 10) */}
          <Section
            title="Security"
            description="Optional master password. Stored locally as an Argon2id hash — never leaves this machine. Keep in mind: setting this does not encrypt your database; it just keeps the UI behind a lock screen."
          >
            <SecuritySettings
              security={security ?? null}
              onChange={onSecurityChange}
            />
          </Section>

          {/* About */}
          <Section title="About" description="">
            <div className="text-xs text-[var(--color-text-muted)] space-y-0.5">
              <div className="font-medium text-[var(--color-text)]">PromptHangar v0.2.0</div>
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

function GitWorkspacesManager() {
  const [workspaces, setWorkspaces] = useState<GitWorkspace[]>([]);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const list = await api.listGitWorkspaces();
      setWorkspaces(list);
    } catch (e) {
      toast(`Failed to load workspaces: ${String(e)}`, "error");
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function addWorkspace() {
    try {
      const picked = await openDialog({
        directory: true,
        multiple: false,
        title: "Choose a Git workspace folder",
      });
      if (!picked || typeof picked !== "string") return;
      const name = window.prompt(
        "Name this workspace:",
        picked.split("/").pop() || "Workspace"
      );
      if (!name) return;
      setBusy(true);
      await api.createGitWorkspace({ name: name.trim(), path: picked });
      await refresh();
      toast(`Workspace "${name}" added`, "success");
    } catch (e) {
      toast(`Create failed: ${String(e)}`, "error");
    } finally {
      setBusy(false);
    }
  }

  async function removeWorkspace(w: GitWorkspace) {
    if (!confirm(`Remove workspace "${w.name}"? Linked prompts will be unlinked but no files are deleted from disk.`)) return;
    try {
      await api.deleteGitWorkspace(w.id);
      await refresh();
      toast(`Removed "${w.name}"`, "success");
    } catch (e) {
      toast(`Delete failed: ${String(e)}`, "error");
    }
  }

  return (
    <div className="space-y-2">
      {workspaces.length === 0 ? (
        <div className="text-xs text-[var(--color-text-muted)] p-3 border border-dashed border-[var(--color-border)] rounded">
          No Git workspaces yet. Add one to start mirroring prompts to disk.
        </div>
      ) : (
        <div className="space-y-1.5">
          {workspaces.map((w) => (
            <div key={w.id} className="flex items-center gap-2 p-2 rounded border border-[var(--color-border)] bg-[var(--color-bg)]">
              <GitBranch size={12} className="text-emerald-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{w.name}</div>
                <div className="text-[10px] text-[var(--color-text-muted)] font-mono truncate" title={w.path}>{w.path}</div>
                {w.last_error && (
                  <div className="text-[9px] text-red-500 truncate" title={w.last_error}>⚠ {w.last_error}</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => void removeWorkspace(w)}
                className="p-1 text-[var(--color-text-muted)] hover:text-red-500 rounded hover:bg-[var(--color-bg-subtle)] shrink-0"
                title="Remove workspace"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => void addWorkspace()}
        disabled={busy}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)] text-xs font-medium disabled:opacity-60"
      >
        <Plus size={11} />
        <FolderOpen size={11} />
        Add workspace folder…
      </button>
      <div className="text-[9px] text-[var(--color-text-muted)]">
        If the folder isn't already a Git repository we'll run <code className="font-mono">git init</code> for you.
      </div>
    </div>
  );
}

// ==================== Epic 10 — Security section ====================

function SecuritySettings({
  security,
  onChange,
}: {
  security: api.SecurityStatus | null;
  onChange?: () => Promise<api.SecurityStatus>;
}) {
  if (!security) {
    return (
      <div className="text-xs text-[var(--color-text-muted)]">Loading…</div>
    );
  }
  return (
    <div className="space-y-3">
      {security.has_password ? (
        <PasswordSetPanel onChange={onChange} timeoutMin={security.lock_timeout_min} />
      ) : (
        <PasswordUnsetPanel onChange={onChange} />
      )}
    </div>
  );
}

function PasswordUnsetPanel({
  onChange,
}: {
  onChange?: () => Promise<api.SecurityStatus>;
}) {
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  const tooShort = newPw.length > 0 && newPw.length < 6;
  const mismatch = confirm.length > 0 && confirm !== newPw;
  const canSubmit = !busy && newPw.length >= 6 && !mismatch;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    try {
      await api.setMasterPassword({
        old_password: null,
        new_password: newPw,
      });
      toast("Master password set", "success");
      setNewPw("");
      setConfirm("");
      await onChange?.();
    } catch (e) {
      toast(`Could not set password: ${String(e)}`, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 p-3 rounded border border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="text-xs font-medium flex items-center gap-1.5">
        <Shield size={12} className="text-[var(--color-text-muted)]" />
        Set a master password
      </div>
      <PasswordField
        value={newPw}
        onChange={setNewPw}
        show={show}
        onToggleShow={() => setShow((s) => !s)}
        placeholder="New password (≥ 6 chars)"
        autoFocus
      />
      <PasswordField
        value={confirm}
        onChange={setConfirm}
        show={show}
        onToggleShow={() => setShow((s) => !s)}
        placeholder="Confirm password"
      />
      {tooShort && (
        <div className="text-[10px] text-red-500">Must be at least 6 characters.</div>
      )}
      {mismatch && (
        <div className="text-[10px] text-red-500">Passwords don't match.</div>
      )}
      <button
        type="button"
        onClick={() => void submit()}
        disabled={!canSubmit}
        className="px-3 py-1.5 rounded bg-[var(--color-accent)] text-white text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
      >
        {busy ? "Saving…" : "Set password"}
      </button>
    </div>
  );
}

function PasswordSetPanel({
  onChange,
  timeoutMin,
}: {
  onChange?: () => Promise<api.SecurityStatus>;
  timeoutMin: number;
}) {
  const [mode, setMode] = useState<"idle" | "change" | "remove">("idle");
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  function reset() {
    setMode("idle");
    setOldPw("");
    setNewPw("");
    setConfirm("");
  }

  async function lockNow() {
    try {
      await api.lockApp();
      await onChange?.();
    } catch (e) {
      toast(`Could not lock: ${String(e)}`, "error");
    }
  }

  async function changePw() {
    if (newPw.length < 6 || newPw !== confirm || !oldPw) return;
    setBusy(true);
    try {
      await api.setMasterPassword({
        old_password: oldPw,
        new_password: newPw,
      });
      toast("Password updated", "success");
      reset();
      await onChange?.();
    } catch (e) {
      toast(`Could not update: ${String(e)}`, "error");
    } finally {
      setBusy(false);
    }
  }

  async function removePw() {
    if (!oldPw) return;
    setBusy(true);
    try {
      await api.clearMasterPassword(oldPw);
      toast("Master password removed", "success");
      reset();
      await onChange?.();
    } catch (e) {
      toast(`Could not remove: ${String(e)}`, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 p-2.5 rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-xs">
        <Shield size={12} className="text-[var(--color-accent)]" />
        <span className="flex-1">Master password is active</span>
        <button
          type="button"
          onClick={() => void lockNow()}
          className="px-2 py-1 rounded border border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)] flex items-center gap-1 text-[10px]"
          title="Lock now"
        >
          <Lock size={10} /> Lock now
        </button>
      </div>

      {/* Idle-timeout */}
      <TimeoutPicker currentMin={timeoutMin} onChange={onChange} />

      {/* Change / remove buttons */}
      {mode === "idle" && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("change")}
            className="px-2.5 py-1 rounded border border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)] text-[11px] font-medium"
          >
            Change password…
          </button>
          <button
            type="button"
            onClick={() => setMode("remove")}
            className="px-2.5 py-1 rounded border border-[var(--color-border)] hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50 text-[11px] font-medium"
          >
            <Unlock size={10} className="inline mr-1" />
            Remove password…
          </button>
        </div>
      )}

      {mode === "change" && (
        <div className="space-y-2 p-3 rounded border border-[var(--color-border)] bg-[var(--color-bg)]">
          <div className="text-xs font-medium">Change master password</div>
          <PasswordField value={oldPw} onChange={setOldPw} show={show} onToggleShow={() => setShow((s) => !s)} placeholder="Current password" autoFocus />
          <PasswordField value={newPw} onChange={setNewPw} show={show} onToggleShow={() => setShow((s) => !s)} placeholder="New password (≥ 6 chars)" />
          <PasswordField value={confirm} onChange={setConfirm} show={show} onToggleShow={() => setShow((s) => !s)} placeholder="Confirm new password" />
          {confirm && confirm !== newPw && (
            <div className="text-[10px] text-red-500">Passwords don't match.</div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void changePw()}
              disabled={busy || newPw.length < 6 || newPw !== confirm || !oldPw}
              className="px-3 py-1.5 rounded bg-[var(--color-accent)] text-white text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
            >
              {busy ? "Updating…" : "Update"}
            </button>
            <button
              type="button"
              onClick={reset}
              className="px-3 py-1.5 rounded border border-[var(--color-border)] text-xs hover:bg-[var(--color-bg-subtle)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === "remove" && (
        <div className="space-y-2 p-3 rounded border border-red-500/40 bg-red-500/5">
          <div className="text-xs font-medium text-red-500">Remove master password</div>
          <div className="text-[10px] text-[var(--color-text-muted)]">
            Anyone with access to this machine will be able to open the app without entering a password.
          </div>
          <PasswordField value={oldPw} onChange={setOldPw} show={show} onToggleShow={() => setShow((s) => !s)} placeholder="Current password" autoFocus />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void removePw()}
              disabled={busy || !oldPw}
              className="px-3 py-1.5 rounded bg-red-500 text-white text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
            >
              {busy ? "Removing…" : "Remove password"}
            </button>
            <button
              type="button"
              onClick={reset}
              className="px-3 py-1.5 rounded border border-[var(--color-border)] text-xs hover:bg-[var(--color-bg-subtle)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TimeoutPicker({
  currentMin,
  onChange,
}: {
  currentMin: number;
  onChange?: () => Promise<api.SecurityStatus>;
}) {
  const OPTIONS: Array<{ label: string; minutes: number }> = [
    { label: "Off", minutes: 0 },
    { label: "5 min", minutes: 5 },
    { label: "15 min", minutes: 15 },
    { label: "30 min", minutes: 30 },
    { label: "1 hr", minutes: 60 },
    { label: "4 hr", minutes: 240 },
  ];

  async function pick(minutes: number) {
    try {
      await api.updateLockTimeout(minutes);
      await onChange?.();
      toast(
        minutes === 0
          ? "Auto-lock disabled"
          : `Will lock after ${minutes} min idle`,
        "success",
      );
    } catch (e) {
      toast(`Could not update timeout: ${String(e)}`, "error");
    }
  }

  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-muted)] mb-1.5">
        Auto-lock after idle
      </div>
      <div className="flex gap-1 flex-wrap">
        {OPTIONS.map((o) => {
          const active = o.minutes === currentMin;
          return (
            <button
              key={o.minutes}
              type="button"
              onClick={() => void pick(o.minutes)}
              className={clsx(
                "px-2.5 py-1 rounded text-[11px] font-medium border",
                active
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                  : "border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)]",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PasswordField({
  value,
  onChange,
  show,
  onToggleShow,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded px-2 py-1.5 text-xs focus:outline-none focus:border-[var(--color-accent)] pr-7"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={onToggleShow}
        className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        {show ? <EyeOff size={10} /> : <Eye size={10} />}
      </button>
    </div>
  );
}
