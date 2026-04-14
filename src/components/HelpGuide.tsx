import { useState } from "react";
import {
  X, BookOpen, FolderOpen, FileText, GitBranch, Zap, Minimize2,
  Link2, Download, Upload, BarChart3, Tag, Copy, Check,
  Search, Rocket, FlaskConical, Activity, Variable,
  Settings, Lock, MessageSquare, Keyboard, Sparkles, Star, Eye,
  ChevronDown, Save, Undo2, Redo2, Plus, RefreshCw,
  Square, ArrowRight, Clock, AlertTriangle, Hash, DollarSign,
  PanelLeftClose, PanelRightClose, HardDrive, Database,
} from "lucide-react";
import clsx from "clsx";

interface Props {
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  Small reusable pieces for visual mockups                          */
/* ------------------------------------------------------------------ */

function MockBox({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("my-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] overflow-hidden text-xs", className)}>
      {children}
    </div>
  );
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] text-[10px] font-mono font-semibold shadow-sm">
      {children}
    </kbd>
  );
}

function MockCheckbox({ checked, label }: { checked: boolean; label: string }) {
  return (
    <label className="flex items-center gap-2 text-[11px]">
      <span className={clsx(
        "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0",
        checked ? "bg-[var(--color-accent)] border-[var(--color-accent)]" : "border-[var(--color-border-strong)] bg-[var(--color-bg)]"
      )}>
        {checked && <Check size={9} className="text-white" />}
      </span>
      <span className={checked ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]"}>{label}</span>
    </label>
  );
}

function MockBadge({ children, color }: { children: string; color: string }) {
  return <span className={clsx("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide", color)}>{children}</span>;
}

function MockBtn({ children, accent, small, disabled }: { children: React.ReactNode; accent?: boolean; small?: boolean; disabled?: boolean }) {
  return (
    <span className={clsx(
      "inline-flex items-center gap-1 rounded font-medium cursor-default select-none",
      small ? "px-2 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]",
      accent && !disabled ? "bg-[var(--color-accent)] text-white" : "",
      !accent && !disabled ? "border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text)]" : "",
      disabled ? "bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] opacity-60" : "",
    )}>
      {children}
    </span>
  );
}

function MockTag({ children }: { children: string }) {
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--color-accent)]/15 text-[var(--color-accent)]">{children}</span>;
}

/* ------------------------------------------------------------------ */
/*  Visual mockup components for each section                         */
/* ------------------------------------------------------------------ */

function VisualAppLayout() {
  return (
    <MockBox>
      <div className="flex h-32">
        <div className="w-24 border-r border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-2">
          <div className="text-[9px] font-semibold text-[var(--color-text-muted)] mb-1.5 flex items-center gap-1"><FolderOpen size={9} /> Folders</div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
              <span className="text-[8px]">📁</span><span className="text-[9px] font-medium truncate">Work</span>
            </div>
            <div className="flex items-center gap-1 px-1.5 py-0.5 text-[var(--color-text-muted)]">
              <span className="text-[8px]">📁</span><span className="text-[9px] truncate">Personal</span>
            </div>
            <div className="flex items-center gap-1 px-1.5 py-0.5 ml-2 text-[var(--color-text-muted)]">
              <span className="text-[8px]">📁</span><span className="text-[9px] truncate">Blog</span>
            </div>
          </div>
        </div>
        <div className="w-28 border-r border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-2">
          <div className="text-[9px] font-semibold text-[var(--color-text-muted)] mb-1.5 flex items-center gap-1"><FileText size={9} /> Prompts</div>
          <div className="space-y-1">
            <div className="px-1.5 py-1 rounded bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30">
              <div className="text-[9px] font-medium text-[var(--color-accent)] truncate">Email writer</div>
              <div className="text-[8px] text-[var(--color-text-muted)]">#3 · 2h ago</div>
            </div>
            <div className="px-1.5 py-1 rounded">
              <div className="text-[9px] font-medium text-[var(--color-text)] truncate">Code reviewer</div>
              <div className="text-[8px] text-[var(--color-text-muted)]">#7 · 1d ago</div>
            </div>
          </div>
        </div>
        <div className="flex-1 p-2 flex flex-col">
          <div className="text-[9px] font-semibold mb-1">Email writer</div>
          <div className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-2">
            <div className="text-[9px] text-[var(--color-text-muted)] font-mono leading-relaxed">Write a professional email to {"{{recipient}}"} about {"{{topic}}"}...</div>
          </div>
          <div className="mt-1.5 flex items-center gap-1">
            <span className="text-[8px] text-[var(--color-text-muted)]">142 chars · ~36 tokens</span>
          </div>
        </div>
        <div className="w-20 border-l border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-2">
          <div className="text-[9px] font-semibold text-[var(--color-text-muted)] mb-1.5 flex items-center gap-1"><GitBranch size={9} /> Rev.</div>
          <div className="space-y-1">
            <div className="text-[9px] flex items-center gap-1"><span className="font-mono text-[var(--color-accent)]">#3</span><span className="text-[8px] px-1 bg-[var(--color-bg-subtle)] rounded text-[var(--color-text-muted)]">latest</span></div>
            <div className="text-[9px] text-[var(--color-text-muted)] font-mono">#2</div>
            <div className="text-[9px] text-[var(--color-text-muted)] font-mono">#1</div>
          </div>
        </div>
      </div>
      <div className="px-2 py-1 border-t border-[var(--color-border)] bg-[var(--color-bg-subtle)] flex items-center gap-3 text-[8px] text-[var(--color-text-muted)]">
        <span className="flex items-center gap-0.5"><PanelLeftClose size={8} /> Folders</span>
        <span className="flex items-center gap-0.5"><PanelRightClose size={8} /> Prompts</span>
        <span className="flex-1 text-center font-medium text-[var(--color-text)]">Editor</span>
        <span>Timeline</span>
      </div>
    </MockBox>
  );
}

function VisualFolderTree() {
  return (
    <MockBox>
      <div className="p-2.5 space-y-0.5">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px]">
          <span>🕐</span><span className="text-[var(--color-text-muted)]">Recent</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px]">
          <span>⭐</span><span className="text-[var(--color-text-muted)]">Flagged</span>
        </div>
        <div className="h-px bg-[var(--color-border)] my-1" />
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--color-accent)]/10 text-[11px]">
          <span style={{ color: "#e74c3c" }}>&#9632;</span>
          <span className="font-medium text-[var(--color-accent)]">Work projects</span>
          <span className="ml-auto text-[9px] text-[var(--color-text-muted)]">⋯</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] ml-3">
          <span style={{ color: "#3498db" }}>&#9632;</span>
          <span className="text-[var(--color-text)]">Client onboarding</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px]">
          <span style={{ color: "#2ecc71" }}>&#9632;</span>
          <span className="text-[var(--color-text)]">Personal</span>
          <span className="ml-auto"><Lock size={9} className="text-amber-500" /></span>
        </div>
      </div>
    </MockBox>
  );
}

function VisualEditorToolbar() {
  return (
    <MockBox>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
        <span className="text-[11px] font-semibold">Email writer</span>
        <span className="text-[10px] text-amber-500">• unsaved</span>
        <div className="flex-1" />
        <span className="text-[var(--color-text-muted)]"><Undo2 size={11} /></span>
        <span className="text-[var(--color-text-muted)]"><Redo2 size={11} /></span>
        <span className="w-px h-3 bg-[var(--color-border)]" />
        <MockBtn small><Download size={9} /> Export</MockBtn>
        <MockBtn small><Copy size={9} /> Magic Copy</MockBtn>
        <input className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-1.5 py-0.5 text-[9px] w-24" placeholder="Commit note..." />
        <MockBtn accent small><Save size={9} /> Save</MockBtn>
      </div>
      <div className="px-3 py-2 text-[10px] font-mono text-[var(--color-text-muted)] leading-relaxed">
        Write a professional email to {"{{recipient}}"} about {"{{topic}}"}.<br />
        Keep it under 200 words. Use a {"{{tone}}"} tone.
      </div>
    </MockBox>
  );
}

function VisualRevisionTimeline() {
  return (
    <MockBox>
      <div className="p-2.5 space-y-1">
        <div className="text-[9px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Today</div>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20">
          <span className="text-[11px] font-mono font-semibold text-[var(--color-accent)]">#5</span>
          <span className="text-[8px] px-1 bg-[var(--color-bg-subtle)] rounded text-[var(--color-text-muted)]">latest</span>
          <span className="flex-1" />
          <Star size={9} className="text-amber-400 fill-amber-400" />
        </div>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded">
          <span className="text-[11px] font-mono text-[var(--color-text-muted)]">#4</span>
          <span className="text-[9px] text-[var(--color-text-muted)] italic truncate">shortened intro</span>
          <span className="flex-1" />
          <span className="text-[8px] text-[var(--color-text-muted)]">2h ago</span>
        </div>
        <div className="text-[9px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mt-2 mb-1">Yesterday</div>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded">
          <span className="text-[11px] font-mono text-[var(--color-text-muted)]">#3</span>
          <MockBadge color="bg-emerald-500/15 text-emerald-500">prod</MockBadge>
          <span className="flex-1" />
          <span className="text-[8px] text-[var(--color-text-muted)]">1d ago</span>
        </div>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded">
          <span className="text-[11px] font-mono text-[var(--color-text-muted)]">#2</span>
          <span className="flex-1" />
          <span className="text-[8px] text-emerald-500">score 4.2 ↑</span>
        </div>
      </div>
    </MockBox>
  );
}

function VisualTagEditor() {
  return (
    <MockBox>
      <div className="flex items-center gap-1.5 px-3 py-2 flex-wrap">
        <Tag size={10} className="text-[var(--color-text-muted)] shrink-0" />
        <MockTag>email</MockTag>
        <MockTag>copywriting</MockTag>
        <MockTag>client-work</MockTag>
        <span className="text-[10px] text-[var(--color-text-muted)] flex items-center">
          <input className="bg-transparent outline-none text-[10px] w-16" placeholder="+ tag" />
        </span>
      </div>
    </MockBox>
  );
}

function VisualEnvironments() {
  return (
    <MockBox>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <MockBadge color="bg-blue-500/15 text-blue-500">dev #10</MockBadge>
        <MockBadge color="bg-amber-500/15 text-amber-500">staging #8</MockBadge>
        <MockBadge color="bg-emerald-500/15 text-emerald-500">prod #5</MockBadge>
        <span className="flex-1" />
        <span className="text-[9px] text-[var(--color-text-muted)]">Revision #5 is live in production</span>
      </div>
    </MockBox>
  );
}

function VisualVariables() {
  return (
    <MockBox>
      <div className="px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)] flex items-center gap-2">
        <Variable size={10} className="text-[var(--color-accent)]" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Variables (3)</span>
        <span className="flex-1" />
        <MockBtn small><Eye size={8} /> Preview</MockBtn>
      </div>
      <div className="px-3 py-2 grid grid-cols-3 gap-2">
        <div>
          <div className="text-[9px] font-mono font-semibold text-[var(--color-accent)] mb-0.5">{"{{recipient}}"}</div>
          <div className="border border-[var(--color-border)] rounded px-1.5 py-0.5 text-[9px] bg-[var(--color-bg-elevated)]">Sarah Chen</div>
        </div>
        <div>
          <div className="text-[9px] font-mono font-semibold text-[var(--color-accent)] mb-0.5">{"{{topic}}"}</div>
          <div className="border border-[var(--color-border)] rounded px-1.5 py-0.5 text-[9px] bg-[var(--color-bg-elevated)]">Q4 results</div>
        </div>
        <div>
          <div className="text-[9px] font-mono font-semibold text-[var(--color-accent)] mb-0.5">{"{{tone}}"}</div>
          <div className="border border-[var(--color-border)] rounded px-1.5 py-0.5 text-[9px] bg-[var(--color-bg-elevated)]">formal</div>
        </div>
      </div>
      <div className="px-3 py-2 border-t border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
        <div className="text-[9px] text-[var(--color-text-muted)] mb-1 font-medium">Preview:</div>
        <div className="text-[9px] font-mono text-[var(--color-text)]">Write a professional email to <span className="bg-[var(--color-accent)]/20 text-[var(--color-accent)] px-0.5 rounded">Sarah Chen</span> about <span className="bg-[var(--color-accent)]/20 text-[var(--color-accent)] px-0.5 rounded">Q4 results</span>. Use a <span className="bg-[var(--color-accent)]/20 text-[var(--color-accent)] px-0.5 rounded">formal</span> tone.</div>
      </div>
    </MockBox>
  );
}

function VisualMagicCopy() {
  return (
    <MockBox>
      <div className="flex items-center gap-0 px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
        <span className="flex items-center gap-1 px-2 py-1 rounded-l border border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] text-[10px] font-medium">
          <Copy size={10} /> Magic Copy
        </span>
        <span className="px-1.5 py-1 rounded-r border border-l-0 border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] text-[10px]">
          <ChevronDown size={10} />
        </span>
        <span className="ml-2 text-[9px] text-[var(--color-text-muted)]">Click to copy, arrow to configure</span>
      </div>
      <div className="p-3">
        <div className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Include in clipboard</div>
        <div className="space-y-1.5 mb-3">
          <MockCheckbox checked={true} label="Prompt text" />
          <MockCheckbox checked={true} label="System instructions" />
          <MockCheckbox checked={true} label="Model name" />
          <MockCheckbox checked={false} label="Parameters" />
          <MockCheckbox checked={true} label="Version stamp" />
          <MockCheckbox checked={false} label="Note" />
        </div>
        <div className="border-t border-[var(--color-border)] pt-2.5 mb-2.5">
          <div className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">Format</div>
          <div className="flex gap-1">
            <span className="flex-1 text-center px-2 py-1 rounded text-[10px] bg-[var(--color-bg-subtle)]">Plain</span>
            <span className="flex-1 text-center px-2 py-1 rounded text-[10px] bg-[var(--color-accent)] text-white font-medium">Markdown</span>
            <span className="flex-1 text-center px-2 py-1 rounded text-[10px] bg-[var(--color-bg-subtle)]">JSON</span>
          </div>
        </div>
        <div className="flex gap-2">
          <MockBtn small>Clean Copy</MockBtn>
          <MockBtn small>All on</MockBtn>
        </div>
      </div>
      <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2">
        <div className="text-[9px] font-semibold text-[var(--color-text-muted)] mb-1">Clipboard output (Markdown):</div>
        <div className="text-[9px] font-mono text-[var(--color-text-muted)] bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-1.5 leading-relaxed whitespace-pre">{`> **Email writer** · revision #3 · model: \`gpt-4o\`\n\n**System:**\nYou are a professional copywriter.\n\nWrite a professional email to {{recipient}}...`}</div>
      </div>
    </MockBox>
  );
}

function VisualExport() {
  return (
    <MockBox>
      <div className="p-3 space-y-1.5">
        <div className="flex items-center gap-2 px-2.5 py-2 rounded border border-[var(--color-border)] bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-subtle)] cursor-default">
          <span className="text-[var(--color-accent)]">{"{ }"}</span>
          <div>
            <div className="text-[10px] font-medium">JSON</div>
            <div className="text-[9px] text-[var(--color-text-muted)]">All revisions + results + metadata</div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-2.5 py-2 rounded border border-[var(--color-border)] bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-subtle)] cursor-default">
          <FileText size={14} className="text-[var(--color-accent)]" />
          <div>
            <div className="text-[10px] font-medium">Markdown</div>
            <div className="text-[9px] text-[var(--color-text-muted)]">Readable document with all revisions</div>
          </div>
        </div>
      </div>
    </MockBox>
  );
}

function VisualImport() {
  return (
    <MockBox>
      <div className="p-3">
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <div className="text-[9px] font-semibold text-[var(--color-text-muted)] mb-0.5">Source</div>
            <div className="border border-[var(--color-border)] bg-[var(--color-bg-elevated)] rounded px-2 py-1 text-[10px] flex items-center justify-between">ChatGPT <ChevronDown size={9} /></div>
          </div>
          <div>
            <div className="text-[9px] font-semibold text-[var(--color-text-muted)] mb-0.5">Folder</div>
            <div className="border border-[var(--color-border)] bg-[var(--color-bg-elevated)] rounded px-2 py-1 text-[10px] flex items-center justify-between">Work <ChevronDown size={9} /></div>
          </div>
        </div>
        <div className="border border-[var(--color-border)] bg-[var(--color-bg-elevated)] rounded p-2 mb-1.5">
          <div className="text-[9px] font-mono text-[var(--color-text)]">You said:<br />How do I write a good email subject line?<br /><br />ChatGPT said:<br />A good subject line should be concise...</div>
        </div>
        <div className="flex items-center gap-1 text-[9px] text-emerald-500">
          <Check size={9} />
          Auto-split (block headers): 1 question, 1 answer
        </div>
      </div>
    </MockBox>
  );
}

function VisualPlayground() {
  return (
    <MockBox>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
        <Zap size={10} className="text-[var(--color-accent)]" />
        <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Playground</span>
        <div className="border border-[var(--color-border)] rounded px-2 py-0.5 text-[10px] flex items-center gap-1 bg-[var(--color-bg)]">
          <Lock size={8} className="text-emerald-500" />
          llama3.2 (Ollama)
          <ChevronDown size={9} />
        </div>
        <span className="text-[var(--color-text-muted)]"><RefreshCw size={10} /></span>
        <span className="flex-1" />
        <span className="text-[9px] text-[var(--color-text-muted)]">1.2s · 145 tokens</span>
        <MockBtn accent small><Square size={8} /> Stop</MockBtn>
      </div>
      <div className="px-3 py-2 font-mono text-[10px] text-[var(--color-text)] leading-relaxed">
        Subject: Q4 Financial Results Summary<br /><br />
        Dear Sarah,<br /><br />
        I hope this email finds you well. I wanted to share our Q4 results with you...<span className="inline-block w-1.5 h-3 bg-[var(--color-accent)] animate-pulse ml-0.5" />
      </div>
    </MockBox>
  );
}

function VisualCompressor() {
  return (
    <MockBox>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
        <div className="flex gap-0.5">
          <span className="px-2 py-0.5 rounded text-[9px] bg-[var(--color-accent)] text-white font-medium">Auto</span>
          <span className="px-2 py-0.5 rounded text-[9px] text-[var(--color-text-muted)]">Tips</span>
          <span className="px-2 py-0.5 rounded text-[9px] text-[var(--color-text-muted)]">Compare</span>
          <span className="px-2 py-0.5 rounded text-[9px] text-[var(--color-text-muted)]">LLM</span>
        </div>
      </div>
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-600 text-[11px] font-bold">-22%</span>
          <span className="text-[10px] text-[var(--color-text-muted)]">156 → 122 tokens</span>
        </div>
        <div className="space-y-1 mb-2">
          <div className="flex items-start gap-1.5 text-[10px]">
            <Check size={9} className="text-emerald-500 mt-0.5 shrink-0" />
            <span className="text-[var(--color-text-muted)]">Remove filler: <span className="line-through text-red-400">"I would like you to please"</span> → <span className="text-emerald-500">"Please"</span></span>
          </div>
          <div className="flex items-start gap-1.5 text-[10px]">
            <Check size={9} className="text-emerald-500 mt-0.5 shrink-0" />
            <span className="text-[var(--color-text-muted)]">Remove redundant phrase (2x): <span className="line-through text-red-400">"professional and formal"</span></span>
          </div>
        </div>
        <div className="flex gap-2">
          <MockBtn accent small>Apply</MockBtn>
          <MockBtn small>Cancel</MockBtn>
        </div>
      </div>
    </MockBox>
  );
}

function VisualResults() {
  return (
    <MockBox>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
        <MessageSquare size={10} className="text-[var(--color-accent)]" />
        <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Results for revision #5</span>
        <span className="px-1 bg-[var(--color-bg-subtle)] rounded text-[8px]">2</span>
        <span className="flex-1" />
        <MockBtn small>Compare</MockBtn>
        <MockBtn small><Plus size={8} /> New result</MockBtn>
      </div>
      <div className="p-2 space-y-2">
        <div className="border border-[var(--color-border)] rounded bg-[var(--color-bg-elevated)]">
          <div className="flex items-center gap-2 px-2 py-1.5 border-b border-[var(--color-border)]">
            <input className="bg-transparent text-[10px] font-medium outline-none w-24" value="GPT-4o" readOnly />
            <span className="flex-1" />
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(n => <Star key={n} size={9} className={n <= 4 ? "text-amber-400 fill-amber-400" : "text-[var(--color-border)]"} />)}
            </div>
          </div>
          <div className="px-2 py-1.5 text-[9px] font-mono text-[var(--color-text-muted)] truncate">Subject: Q4 Results — Action Required. Dear Sarah, I am writing to...</div>
        </div>
        <div className="border border-[var(--color-border)] rounded bg-[var(--color-bg-elevated)]">
          <div className="flex items-center gap-2 px-2 py-1.5 border-b border-[var(--color-border)]">
            <input className="bg-transparent text-[10px] font-medium outline-none w-24" value="Claude Sonnet" readOnly />
            <span className="flex-1" />
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(n => <Star key={n} size={9} className={n <= 5 ? "text-amber-400 fill-amber-400" : "text-[var(--color-border)]"} />)}
            </div>
          </div>
          <div className="px-2 py-1.5 text-[9px] font-mono text-[var(--color-text-muted)] truncate">Hi Sarah, Hope you're doing well! Wanted to quickly share our Q4...</div>
        </div>
      </div>
    </MockBox>
  );
}

function VisualABTest() {
  return (
    <MockBox>
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2.5">
          <FlaskConical size={11} className="text-[var(--color-accent)]" />
          <span className="text-[11px] font-semibold">Short vs. detailed instructions</span>
          <MockBadge color="bg-emerald-500/15 text-emerald-500">active</MockBadge>
        </div>
        <div className="space-y-2">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-mono font-semibold text-[var(--color-accent)]">#3</span>
              <span className="text-[10px] text-[var(--color-text-muted)]">Short version</span>
              <span className="flex-1" />
              <span className="text-[9px] text-emerald-500 font-medium">78%</span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--color-bg-subtle)] overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: "78%" }} />
            </div>
            <div className="text-[8px] text-[var(--color-text-muted)] mt-0.5">18 runs · 14 success · weight: 50%</div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-mono font-semibold text-[var(--color-accent)]">#5</span>
              <span className="text-[10px] text-[var(--color-text-muted)]">Detailed version</span>
              <span className="flex-1" />
              <span className="text-[9px] text-amber-500 font-medium">61%</span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--color-bg-subtle)] overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: "61%" }} />
            </div>
            <div className="text-[8px] text-[var(--color-text-muted)] mt-0.5">18 runs · 11 success · weight: 50%</div>
          </div>
        </div>
      </div>
    </MockBox>
  );
}

function VisualChains() {
  return (
    <MockBox>
      <div className="p-3">
        <div className="text-[11px] font-semibold mb-2">Blog pipeline</div>
        <div className="flex items-center gap-1.5 mb-3">
          <span className="px-2 py-1 rounded bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-[9px] font-medium flex items-center gap-1"><Check size={8} /> Research</span>
          <ArrowRight size={10} className="text-[var(--color-text-muted)]" />
          <span className="px-2 py-1 rounded bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-[9px] font-medium flex items-center gap-1"><Check size={8} /> Outline</span>
          <ArrowRight size={10} className="text-[var(--color-text-muted)]" />
          <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-500 text-[9px] font-medium flex items-center gap-1"><RefreshCw size={8} className="animate-spin" /> Draft</span>
          <ArrowRight size={10} className="text-[var(--color-text-muted)]" />
          <span className="px-2 py-1 rounded bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] text-[9px] font-medium flex items-center gap-1"><Clock size={8} /> Polish</span>
        </div>
        <div className="border border-[var(--color-border)] rounded bg-[var(--color-bg-elevated)] p-2">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[9px] font-semibold text-[var(--color-text)]">Step 2: Outline</span>
            <Check size={9} className="text-emerald-500" />
            <span className="text-[8px] text-[var(--color-text-muted)]">3.1s</span>
          </div>
          <div className="text-[9px] font-mono text-[var(--color-text-muted)] bg-[var(--color-bg)] rounded p-1.5 border border-[var(--color-border)]">
            1. Introduction - Hook with statistic<br />
            2. Problem statement<br />
            3. Three key solutions...
          </div>
          <div className="mt-1.5">
            <MockBtn accent small>Continue to step 3 →</MockBtn>
          </div>
        </div>
      </div>
    </MockBox>
  );
}

function VisualBatchEvals() {
  return (
    <MockBox>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px]">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
              <th className="px-2 py-1.5 text-left font-semibold text-[var(--color-text-muted)]">Input</th>
              <th className="px-2 py-1.5 text-left font-semibold text-[var(--color-text-muted)]">Output</th>
              <th className="px-2 py-1.5 text-center font-semibold text-[var(--color-text-muted)]">Score</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[var(--color-border)]">
              <td className="px-2 py-1.5 font-mono text-[var(--color-accent)]">{"topic: \"climate\""}</td>
              <td className="px-2 py-1.5 truncate max-w-[200px] text-[var(--color-text)]">Climate change refers to long-term shifts in...</td>
              <td className="px-2 py-1.5 text-center"><span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-bold">4</span></td>
            </tr>
            <tr className="border-b border-[var(--color-border)]">
              <td className="px-2 py-1.5 font-mono text-[var(--color-accent)]">{"topic: \"quantum\""}</td>
              <td className="px-2 py-1.5 truncate max-w-[200px] text-[var(--color-text)]">Quantum computing uses qubits to perform...</td>
              <td className="px-2 py-1.5 text-center"><span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-bold">5</span></td>
            </tr>
            <tr>
              <td className="px-2 py-1.5 font-mono text-[var(--color-accent)]">{"topic: \"\""}</td>
              <td className="px-2 py-1.5 truncate max-w-[200px] text-red-400">Error: empty topic provided</td>
              <td className="px-2 py-1.5 text-center"><span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-500 font-bold">1</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </MockBox>
  );
}

function VisualTracing() {
  return (
    <MockBox>
      <div className="flex items-center gap-3 px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--color-bg-subtle)] text-[9px]"><Hash size={8} /> 2,847 tokens</span>
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--color-bg-subtle)] text-[9px]"><Clock size={8} /> 1.8s avg</span>
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--color-bg-subtle)] text-[9px]"><DollarSign size={8} /> $0.0142</span>
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 text-[9px]"><AlertTriangle size={8} /> 1 error</span>
      </div>
      <table className="w-full text-[9px]">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            <th className="px-2 py-1 text-left text-[var(--color-text-muted)]">Time</th>
            <th className="px-2 py-1 text-left text-[var(--color-text-muted)]">Provider</th>
            <th className="px-2 py-1 text-left text-[var(--color-text-muted)]">Model</th>
            <th className="px-2 py-1 text-right text-[var(--color-text-muted)]">Tokens</th>
            <th className="px-2 py-1 text-right text-[var(--color-text-muted)]">Time</th>
            <th className="px-2 py-1 text-center text-[var(--color-text-muted)]">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-[var(--color-border)]">
            <td className="px-2 py-1">14:32</td>
            <td className="px-2 py-1">Ollama</td>
            <td className="px-2 py-1 font-mono">llama3.2</td>
            <td className="px-2 py-1 text-right">342</td>
            <td className="px-2 py-1 text-right">1.2s</td>
            <td className="px-2 py-1 text-center"><Check size={9} className="text-emerald-500 inline" /></td>
          </tr>
          <tr>
            <td className="px-2 py-1">14:28</td>
            <td className="px-2 py-1">OpenAI</td>
            <td className="px-2 py-1 font-mono">gpt-4o</td>
            <td className="px-2 py-1 text-right">518</td>
            <td className="px-2 py-1 text-right">2.4s</td>
            <td className="px-2 py-1 text-center"><Check size={9} className="text-emerald-500 inline" /></td>
          </tr>
        </tbody>
      </table>
    </MockBox>
  );
}

function VisualSearch() {
  return (
    <MockBox>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
        <Search size={11} className="text-[var(--color-text-muted)]" />
        <span className="text-[11px]">email subject</span>
        <span className="flex-1" />
        <span className="text-[9px] text-[var(--color-text-muted)]"><Kbd>Cmd</Kbd> + <Kbd>K</Kbd></span>
      </div>
      <div className="p-1.5 space-y-0.5">
        <div className="px-2.5 py-2 rounded bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/20 cursor-default">
          <div className="text-[11px] font-medium text-[var(--color-text)]">Email writer</div>
          <div className="text-[9px] text-[var(--color-text-muted)]">Write a professional <span className="bg-yellow-300/30 px-0.5 rounded font-medium text-[var(--color-text)]">email subject</span> line that grabs attention...</div>
        </div>
        <div className="px-2.5 py-2 rounded hover:bg-[var(--color-bg-subtle)] cursor-default">
          <div className="text-[11px] font-medium text-[var(--color-text)]">Newsletter generator</div>
          <div className="text-[9px] text-[var(--color-text-muted)]">...catchy <span className="bg-yellow-300/30 px-0.5 rounded font-medium text-[var(--color-text)]">email subject</span> lines for weekly digest...</div>
        </div>
      </div>
    </MockBox>
  );
}

function VisualKeyboard() {
  return (
    <MockBox>
      <div className="p-3 grid grid-cols-2 gap-x-6 gap-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[var(--color-text-muted)]">Save revision</span>
          <span className="flex items-center gap-0.5"><Kbd>Cmd</Kbd><span className="text-[9px] text-[var(--color-text-muted)]">+</span><Kbd>S</Kbd></span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[var(--color-text-muted)]">New prompt</span>
          <span className="flex items-center gap-0.5"><Kbd>Cmd</Kbd><span className="text-[9px] text-[var(--color-text-muted)]">+</span><Kbd>N</Kbd></span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[var(--color-text-muted)]">Search</span>
          <span className="flex items-center gap-0.5"><Kbd>Cmd</Kbd><span className="text-[9px] text-[var(--color-text-muted)]">+</span><Kbd>K</Kbd></span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[var(--color-text-muted)]">Import</span>
          <span className="flex items-center gap-0.5"><Kbd>Cmd</Kbd><span className="text-[9px] text-[var(--color-text-muted)]">+</span><Kbd>I</Kbd></span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[var(--color-text-muted)]">Settings</span>
          <span className="flex items-center gap-0.5"><Kbd>Cmd</Kbd><span className="text-[9px] text-[var(--color-text-muted)]">+</span><Kbd>,</Kbd></span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[var(--color-text-muted)]">Undo</span>
          <span className="flex items-center gap-0.5"><Kbd>Cmd</Kbd><span className="text-[9px] text-[var(--color-text-muted)]">+</span><Kbd>Z</Kbd></span>
        </div>
      </div>
    </MockBox>
  );
}

function VisualSettings() {
  return (
    <MockBox>
      <div className="p-3 space-y-3">
        <div>
          <div className="text-[9px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">Mode</div>
          <div className="flex gap-1.5">
            <span className="px-2.5 py-1 rounded border border-[var(--color-border)] text-[10px]">Basic</span>
            <span className="px-2.5 py-1 rounded border border-[var(--color-accent)] bg-[var(--color-accent)] text-white text-[10px] font-medium">Advanced</span>
            <span className="px-2.5 py-1 rounded border border-[var(--color-border)] text-[10px]">Engineer</span>
            <span className="px-2.5 py-1 rounded border border-[var(--color-border)] text-[10px]">Custom</span>
          </div>
        </div>
        <div>
          <div className="text-[9px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">Theme</div>
          <div className="flex gap-1.5">
            <span className="px-2.5 py-1 rounded border border-[var(--color-border)] text-[10px] flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-white border border-gray-300" /> Light</span>
            <span className="px-2.5 py-1 rounded border border-[var(--color-border)] text-[10px] flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-700" /> Dark</span>
            <span className="px-2.5 py-1 rounded border border-[var(--color-border)] text-[10px] flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-black border border-gray-600" /> OLED</span>
          </div>
        </div>
        <div>
          <div className="text-[9px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">Privacy</div>
          <div className="flex items-center gap-2 text-[10px]">
            <Lock size={10} className="text-emerald-500" />
            <span className="text-[var(--color-text)]">Zero telemetry · Local SQLite · OS Keychain · No account</span>
          </div>
        </div>
      </div>
    </MockBox>
  );
}

function VisualStorage() {
  return (
    <MockBox>
      <div className="p-3 space-y-3">
        <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-muted)] pb-2 border-b border-[var(--color-border)]">
          <HardDrive size={11} className="text-[var(--color-accent)]" />
          <span>Your Mac / PC — nothing leaves this machine</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-start gap-2 text-[10px]">
            <Database size={11} className="text-[var(--color-accent)] mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[9px] truncate bg-[var(--color-bg)] px-1.5 py-0.5 rounded border border-[var(--color-border)]">~/Library/Application Support/com.prompthangar.app/prompthangar.db</div>
              <div className="text-[var(--color-text-muted)] mt-0.5">Prompts · revisions · results · tags · traces · evals</div>
            </div>
          </div>
          <div className="flex items-start gap-2 text-[10px]">
            <Lock size={11} className="text-emerald-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="font-mono text-[9px] bg-[var(--color-bg)] px-1.5 py-0.5 rounded border border-[var(--color-border)] inline-block">OS Keychain</div>
              <div className="text-[var(--color-text-muted)] mt-0.5">API keys only — never in a plain file</div>
            </div>
          </div>
          <div className="flex items-start gap-2 text-[10px]">
            <Settings size={11} className="text-[var(--color-text-muted)] mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="font-mono text-[9px] bg-[var(--color-bg)] px-1.5 py-0.5 rounded border border-[var(--color-border)] inline-block">localStorage</div>
              <div className="text-[var(--color-text-muted)] mt-0.5">UI prefs: sidebar widths, theme, draft autosave</div>
            </div>
          </div>
        </div>
      </div>
    </MockBox>
  );
}

/* ------------------------------------------------------------------ */
/*  Section data                                                       */
/* ------------------------------------------------------------------ */

interface ContentSection {
  heading: string;
  lines: string[];
  visual?: React.ReactNode;
}

const SECTIONS: { icon: React.ReactNode; title: string; content: ContentSection[] }[] = [
  {
    icon: <Sparkles size={16} />,
    title: "Getting Started",
    content: [
      {
        heading: "Welcome to PromptHangar",
        lines: [
          "PromptHangar is your private workbench for writing, testing, and managing AI prompts. Everything runs on your machine — no account, no cloud, no telemetry.",
          "Think of it like a code editor, but built specifically for prompts. You get version control, testing tools, and organization — all in one app.",
        ],
        visual: <VisualAppLayout />,
      },
      {
        heading: "Choose your mode",
        lines: [
          "When you first open the app, pick a mode that matches your experience level. You can change this anytime in Settings.",
          "Basic — A clean writing space. Just folders, editor, and save. Perfect if you're starting out.",
          "Advanced — Adds the Playground (test prompts against AI models), template variables, the compressor, and the results panel.",
          "Engineer — Everything turned on: metadata controls, batch evaluations, A/B testing, tracing, and more.",
          "Custom — Pick exactly which features you want visible. Toggle each panel on or off in Settings.",
        ],
      },
      {
        heading: "Your first prompt",
        lines: [
          "1. Create a folder in the left sidebar (click the + button next to \"Folders\").",
          "2. Create a prompt inside that folder (Cmd/Ctrl+N, or the + button in the prompt list).",
          "3. Write your prompt in the editor.",
          "4. Press Cmd/Ctrl+S to save. This creates revision #1 — every future save creates a new revision so you never lose anything.",
        ],
      },
    ],
  },
  {
    icon: <FolderOpen size={16} />,
    title: "Folders & Organization",
    content: [
      {
        heading: "Creating folders",
        lines: [
          "Click the + button at the top of the left sidebar to create a new folder. You can nest folders inside each other for multi-level organization (e.g., Work → Client A → Campaign prompts).",
          "Right-click any folder (or click the ⋯ menu) to access: Rename, New subfolder, Change color, Change icon, Mark as Sensitive, and Delete.",
        ],
        visual: <VisualFolderTree />,
      },
      {
        heading: "Moving and reordering",
        lines: [
          "Drag prompts by the ⋮⋮ handle on the left side of each prompt card to reorder within a folder.",
          "Move a prompt to a different folder via the ⋯ menu → Move to... This opens a folder picker.",
          "Duplicate a prompt via the ⋯ menu → Duplicate. This copies the title, latest content, and all tags.",
        ],
      },
      {
        heading: "Sensitive folders",
        lines: [
          "Mark a folder as Sensitive (🛡️ icon) to prevent any cloud API calls from prompts in that folder. Local models still work.",
          "Use this for prompts that contain proprietary or confidential content that should never leave your machine.",
        ],
      },
      {
        heading: "Collapsing sidebars",
        lines: [
          "Use the panel buttons in the top-left corner to hide or show the folder and prompt sidebars.",
          "You can also drag the sidebar edges to resize them, or double-click the edge to collapse/expand instantly.",
          "On small windows (below 800px), sidebars auto-hide to maximize editor space.",
        ],
      },
    ],
  },
  {
    icon: <FileText size={16} />,
    title: "Writing & Editing",
    content: [
      {
        heading: "The editor",
        lines: [
          "The main editor uses CodeMirror 6 with markdown syntax highlighting. Your text is automatically wrapped to fit the window.",
          "Toggle between the code editor and a live markdown preview using the Eye/Code button above the editor.",
          "Undo and Redo are available in the toolbar, and via the standard Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z shortcuts.",
        ],
        visual: <VisualEditorToolbar />,
      },
      {
        heading: "System prompt",
        lines: [
          "The system prompt field (visible in Advanced/Engineer/Custom mode) lets you set the model's persona or instructions — e.g., \"You are an experienced copywriter.\"",
          "This is separate from the main prompt. When you test in the Playground, the system prompt is sent as the system message and the main prompt as the user message.",
        ],
      },
      {
        heading: "Saving",
        lines: [
          "Press Cmd/Ctrl+S to save a new revision. You'll see an orange \"unsaved\" indicator when you have changes.",
          "Optionally type a commit note before saving to document why you made changes (e.g., \"shortened intro paragraph\"). This note appears in the revision timeline.",
          "Crash-recovery: Your draft is automatically saved to local storage every 500ms. If the app closes unexpectedly, your unsaved work is restored on next launch.",
        ],
      },
      {
        heading: "Secret detection",
        lines: [
          "When you save, PromptHangar scans your prompt for API keys, tokens, passwords, and other sensitive patterns.",
          "If high-confidence matches are found, you'll see a warning before the revision is created. This prevents accidentally storing credentials in your prompt library.",
        ],
      },
      {
        heading: "Metadata (Engineer mode)",
        lines: [
          "The metadata footer below the editor lets you set the model name, temperature, and max tokens for this prompt.",
          "A real-time counter shows character count, estimated token count, and per-request cost estimate based on the selected model's pricing.",
          "Local models show \"free (local)\" instead of a cost estimate.",
        ],
      },
    ],
  },
  {
    icon: <GitBranch size={16} />,
    title: "Revisions & Branching",
    content: [
      {
        heading: "How revisions work",
        lines: [
          "Every time you press Save, a new revision is created. Revisions are numbered (#1, #2, #3...) and never deleted — you always have your full history.",
          "The revision timeline on the right sidebar shows all revisions grouped by date, with timestamps like \"2 hours ago\" or \"Yesterday\".",
          "Click any older revision to see a side-by-side diff comparing it to the latest version. Deleted text is highlighted red, added text green.",
        ],
        visual: <VisualRevisionTimeline />,
      },
      {
        heading: "Flagging revisions",
        lines: [
          "Click the ⭐ star on any revision to flag it as important. Use this to bookmark milestones like \"this version worked great\" or \"client-approved draft\".",
          "Filter the timeline to show only flagged revisions by clicking the star icon in the timeline header.",
        ],
      },
      {
        heading: "Branching",
        lines: [
          "Hover over any revision and click the 🔱 fork icon to create a new branch from that point.",
          "Give your branch a descriptive name like \"experiment-shorter\" or \"formal-tone\".",
          "Switch between branches using the dropdown at the top of the timeline. Each branch has its own independent revision history.",
          "Use branches to try different approaches without losing your original version.",
        ],
      },
      {
        heading: "Searching revisions",
        lines: [
          "Click the search icon in the timeline header to search through revision content, notes, model names, and dates.",
          "The counter shows how many revisions match your query (e.g., \"3 of 12 revisions\").",
        ],
      },
    ],
  },
  {
    icon: <Tag size={16} />,
    title: "Tags & Smart Folders",
    content: [
      {
        heading: "Adding tags",
        lines: [
          "Tags are shown below the prompt title in the editor. Click the tag area and start typing to add a new tag.",
          "Press Enter or comma to confirm a tag. Press Backspace on an empty input to delete the last tag. Click the × on any tag to remove it.",
          "Tags are auto-normalized: \"My Great Tag\" becomes \"my-great-tag\". This prevents duplicates from different casing or spacing.",
        ],
        visual: <VisualTagEditor />,
      },
      {
        heading: "Auto-complete",
        lines: [
          "As you type, a dropdown suggests existing tags from your entire library. Arrow keys to navigate, Enter to select.",
          "This helps you reuse consistent tags across prompts instead of accidentally creating similar but different ones.",
        ],
      },
      {
        heading: "Filtering by tag",
        lines: [
          "Click any tag chip in the prompt list to filter — only prompts with that tag are shown.",
          "Click again or use the clear button to remove the filter.",
        ],
      },
      {
        heading: "Smart folders",
        lines: [
          "At the top of the folder sidebar, three smart folders give you quick access across your entire library:",
          "Recent — The last 30 prompts you edited, sorted by last modified date.",
          "Flagged — Every prompt that has at least one flagged (starred) revision.",
          "All Prompts — Every prompt in your library, regardless of folder.",
        ],
      },
    ],
  },
  {
    icon: <Rocket size={16} />,
    title: "Environments",
    content: [
      {
        heading: "What are environments?",
        lines: [
          "Environments let you mark which revision of a prompt is currently \"in use\" at each stage of your workflow.",
          "Three environments are available: Development (blue), Staging (amber), and Production (green).",
          "For example: revision #5 might be in Production (the version your app uses), while revision #8 is in Staging (being tested), and revision #10 is in Development (work in progress).",
        ],
        visual: <VisualEnvironments />,
      },
      {
        heading: "Promoting a revision",
        lines: [
          "Hover over any revision in the timeline and click the 🚀 rocket icon.",
          "Choose an environment from the dropdown: Development, Staging, or Production.",
          "The environment badge appears next to that revision and at the top of the timeline panel.",
          "Promoting a new revision to an environment replaces the previous one — only one revision per environment.",
        ],
      },
    ],
  },
  {
    icon: <Variable size={16} />,
    title: "Template Variables",
    content: [
      {
        heading: "What are template variables?",
        lines: [
          "Template variables let you create reusable prompts with fill-in-the-blank fields. Write {{name}} or {{topic}} in your prompt, and PromptHangar automatically detects them.",
          "Example: \"Write a blog post about {{topic}} for {{audience}} in a {{tone}} tone.\"",
        ],
        visual: <VisualVariables />,
      },
      {
        heading: "Filling in variables",
        lines: [
          "Open the Variables tab in the bottom panel. Each detected variable has its own input field, arranged in a two-column grid.",
          "Type values for each variable. When all variables are filled, the Preview and Copy buttons become active.",
        ],
      },
      {
        heading: "Preview and copy",
        lines: [
          "Click Preview to see your prompt with all variables replaced by their values — this is exactly what would be sent to a model.",
          "Click Copy to put the fully expanded prompt on your clipboard, ready to paste anywhere.",
          "If your prompt has no {{variables}}, the panel shows a hint explaining the syntax.",
        ],
      },
    ],
  },
  {
    icon: <Copy size={16} />,
    title: "Magic Copy",
    content: [
      {
        heading: "What is Magic Copy?",
        lines: [
          "Magic Copy is a smart clipboard tool that lets you copy your prompt along with selected metadata in the format you choose. It's in the editor toolbar, next to the Export button.",
          "Instead of just copying plain text, you can include context like which model you're using, the system instructions, the revision number, and more.",
        ],
        visual: <VisualMagicCopy />,
      },
      {
        heading: "How to use it",
        lines: [
          "1. Click the \"Magic Copy\" button to instantly copy with your current settings.",
          "2. Click the small dropdown arrow (▾) next to it to open the configuration panel.",
          "3. Check or uncheck which fields to include in the clipboard.",
          "4. Choose a format (Plain, Markdown, or JSON).",
          "5. Click Magic Copy again — your customized content is on the clipboard.",
        ],
      },
      {
        heading: "What you can include",
        lines: [
          "Prompt text — The main prompt content. This is on by default.",
          "System instructions — The system prompt, if you have one.",
          "Model name — Which model you've set (e.g., \"gpt-4o\" or \"llama3.2\").",
          "Parameters — Temperature, max tokens, and other settings.",
          "Version stamp — The prompt title, revision number, and current date/time.",
          "Note — The commit note from the current revision.",
        ],
      },
      {
        heading: "Output formats",
        lines: [
          "Plain — Clean text with simple headers. Good for pasting into Slack, emails, or text files.",
          "Markdown — Formatted with bold, code blocks, and blockquotes. Good for documentation, Notion, or GitHub.",
          "JSON — Structured data format. Good for sharing with developers, APIs, or tools that parse JSON.",
        ],
      },
      {
        heading: "Presets and memory",
        lines: [
          "\"Clean Copy\" button: Resets to prompt-only (all metadata off). For when you just want the text.",
          "\"All on\" button: Turns on every field. For when you want the complete package.",
          "Your selections and format choice are automatically saved — next time you open the app, Magic Copy remembers your preferences.",
        ],
      },
    ],
  },
  {
    icon: <Download size={16} />,
    title: "Export",
    content: [
      {
        heading: "Exporting a prompt",
        lines: [
          "Click the Export button in the editor toolbar (next to Magic Copy) to save a prompt to a file on your computer.",
          "A dropdown lets you choose the format before saving.",
        ],
        visual: <VisualExport />,
      },
      {
        heading: "JSON format",
        lines: [
          "Exports everything: all revisions, results/outputs, tags, metadata, timestamps, and settings.",
          "Use this for backups, transferring between machines, or programmatic access to your prompt data.",
          "The file includes the complete history — every revision, every saved result, every note.",
        ],
      },
      {
        heading: "Markdown format",
        lines: [
          "Exports a human-readable document with all revisions listed in order.",
          "Each revision shows its content, date, note, and metadata.",
          "Use this for sharing prompts with colleagues, adding to documentation, or printing.",
        ],
      },
      {
        heading: "How it works",
        lines: [
          "After choosing a format, a native save dialog opens. The filename is auto-generated from your prompt title (special characters removed).",
          "Choose any location on your computer to save. The file is written directly — nothing is uploaded anywhere.",
        ],
      },
    ],
  },
  {
    icon: <Upload size={16} />,
    title: "Import",
    content: [
      {
        heading: "What Import does",
        lines: [
          "Import lets you bring in prompts from other tools — ChatGPT, Claude, Gemini, Ollama, or anywhere. Open it with Cmd/Ctrl+I or the Import button in the top bar.",
          "You can paste an entire conversation, and PromptHangar will try to automatically split it into the prompt (your question) and the response (the AI's answer).",
        ],
        visual: <VisualImport />,
      },
      {
        heading: "How to import",
        lines: [
          "1. Open Import (Cmd/Ctrl+I).",
          "2. Select the source (ChatGPT, Claude, Gemini, or Other) and the target folder.",
          "3. Paste your conversation into the \"Your prompt\" field.",
          "4. The auto-splitter tries to separate your question from the AI's response. Check that it got it right.",
          "5. Optionally edit the title (auto-fills from the first line of your prompt).",
          "6. Click Import. A new prompt is created with the AI response saved as a result.",
        ],
      },
      {
        heading: "Auto-split detection strategies",
        lines: [
          "PromptHangar uses 5 strategies to detect where your prompt ends and the AI's response begins:",
          "1. Role markers — Detects patterns like \"You:\", \"Human:\", \"ChatGPT:\", \"Assistant:\", \"Claude:\", etc.",
          "2. Block headers — Detects the \"You said:\" / \"ChatGPT said:\" format from copying ChatGPT web conversations.",
          "3. Ollama CLI — Detects the \">>> prompt\" format from Ollama terminal sessions.",
          "4. Question heuristic — If the first paragraph ends with a question mark, it's probably your prompt.",
          "5. Short-first heuristic — If the first paragraph is much shorter than the rest, it's likely your prompt and the longer part is the response.",
          "The detection result shows which strategy was used and how many turns it found.",
        ],
      },
    ],
  },
  {
    icon: <Zap size={16} />,
    title: "Playground",
    content: [
      {
        heading: "What is the Playground?",
        lines: [
          "The Playground lets you test your prompts directly against AI models — without leaving the app. It's in the bottom panel (click the ⚡ Playground tab).",
          "It supports 15+ providers: 6 local (Ollama, LM Studio, Jan, LocalAI, llama.cpp, Custom) and 9 cloud (OpenAI, Anthropic, Google Gemini, xAI, Mistral, DeepSeek, Groq, OpenRouter, Custom).",
        ],
        visual: <VisualPlayground />,
      },
      {
        heading: "Setting up models",
        lines: [
          "Local models: Install Ollama or LM Studio, download a model, and start the server. Click the 🔄 refresh button in the Playground — your models appear automatically.",
          "Cloud models: Add your API key in Settings → Cloud Providers. Then refresh in the Playground. Cloud models show a ☁️ icon; local models show a 🔒 icon.",
          "Important for LM Studio: You must enable CORS in LM Studio → Developer → Server Settings, or the connection will be silently blocked.",
        ],
      },
      {
        heading: "Running a prompt",
        lines: [
          "1. Select a model from the dropdown.",
          "2. Click Run. The response streams in real-time, token by token.",
          "3. Click Stop at any time to cancel mid-stream.",
          "4. When finished, the response is automatically saved as a result attached to your current revision.",
          "Stats appear in the toolbar: response time and token count.",
        ],
      },
      {
        heading: "What happens behind the scenes",
        lines: [
          "Every Playground run creates a trace record: which provider and model you used, the full input/output, token count, response time, and estimated cost.",
          "View all traces in the Tracing panel (📊 icon in the top bar).",
          "Local models: your data never leaves your machine. Cloud models: data is sent to the provider's API (indicated by the ☁️ badge).",
        ],
      },
    ],
  },
  {
    icon: <Minimize2 size={16} />,
    title: "Prompt Compressor",
    content: [
      {
        heading: "Why compress?",
        lines: [
          "Shorter prompts cost less (fewer tokens = lower API bill), run faster, and often perform just as well. The Compressor helps you trim without losing meaning.",
          "Open the Compressor tab in the bottom panel. It offers 4 different strategies:",
        ],
        visual: <VisualCompressor />,
      },
      {
        heading: "Auto (rule-based)",
        lines: [
          "Instantly removes filler words, redundant phrases, verbose qualifiers, and \"AI bloat\" patterns — no LLM needed.",
          "Shows a green badge with the percentage saved (e.g., \"−18%\") and a list of each rule that was applied.",
          "Click Apply to update your prompt with the compressed version, then Cmd+S to save as a new revision.",
        ],
      },
      {
        heading: "Tips",
        lines: [
          "Analyzes your prompt and gives specific suggestions without changing anything.",
          "Each tip shows what you wrote vs. what you could write instead, with line numbers.",
          "Examples: \"Avoid weak phrases like 'please'\", \"This instruction is repeated on lines 3 and 7\", \"Consider combining these two sentences\".",
          "If your prompt is already efficient, it shows \"Your prompt is already efficient.\"",
        ],
      },
      {
        heading: "Compare",
        lines: [
          "Shows a side-by-side diff of your original prompt vs. the auto-compressed version.",
          "Removed text is highlighted red on the left; the cleaned result is on the right.",
          "The header shows exact token counts and estimated cost savings per request.",
        ],
      },
      {
        heading: "LLM Rewrite",
        lines: [
          "Sends your prompt to a local AI model (Ollama or LM Studio) with instructions to rewrite it more concisely while preserving meaning.",
          "Select a model from the dropdown and click Rewrite. The result streams in real-time.",
          "After completion, it shows token savings and an Apply button. This is the most aggressive compression — always review the result before applying.",
          "Requires a running local model. If none are found, start Ollama or LM Studio first.",
        ],
      },
    ],
  },
  {
    icon: <MessageSquare size={16} />,
    title: "Results & Outputs",
    content: [
      {
        heading: "What are results?",
        lines: [
          "Results are saved model outputs attached to a specific revision. Every time you run a prompt in the Playground, the response is automatically saved as a result.",
          "You can also manually add results — for example, paste an output you got from ChatGPT's web interface.",
        ],
        visual: <VisualResults />,
      },
      {
        heading: "Managing results",
        lines: [
          "Open the Results tab in the bottom panel. It shows all results for the current revision.",
          "Each result has: a label field (e.g., \"Claude Opus 4.6\" or \"GPT-4o\"), a content area, a 1-5 star rating, and an optional note.",
          "Click + New result to add a blank result manually. Click the trash icon to delete one.",
        ],
      },
      {
        heading: "Viewing modes",
        lines: [
          "RAW — Shows the result as editable text in a textarea.",
          "RENDER — Automatically detects and renders the content: HTML is shown in a preview frame, JSON is pretty-printed, and plain text is displayed as-is.",
        ],
      },
      {
        heading: "Compare mode",
        lines: [
          "When you have 2 or more results, a Compare button appears. Click it to see all results side by side in a horizontal layout.",
          "This is perfect for comparing outputs from different models or different versions of your prompt.",
        ],
      },
      {
        heading: "Exporting results",
        lines: [
          "Click the Export button in the Results tab header (it appears once you have at least one result).",
          "Three formats are available:",
          "• Markdown — a clean, readable report with the prompt + every result, including labels, star ratings, and notes. Great for sharing or adding to documentation.",
          "• JSON — structured data with everything (labels, ratings, notes, timestamps). Great for reimporting or scripting.",
          "• CSV — one row per result (label, rating, notes, content). Opens directly in Excel or Google Sheets.",
          "The filename is auto-suggested as \"{prompt}_rev{N}_results\" so you can keep multiple revisions' exports distinct.",
        ],
      },
    ],
  },
  {
    icon: <FlaskConical size={16} />,
    title: "A/B Testing",
    content: [
      {
        heading: "What is A/B testing?",
        lines: [
          "A/B testing lets you systematically compare different versions (revisions) of a prompt to see which one performs better.",
          "Open it via the flask icon (🧪) in the top bar.",
        ],
        visual: <VisualABTest />,
      },
      {
        heading: "Creating a test",
        lines: [
          "1. Click + New test.",
          "2. Give your test a name (e.g., \"Short vs. detailed instructions\").",
          "3. Select 2 or more revisions as variants. Click the revision pills to toggle selection.",
          "4. Click Create test.",
        ],
      },
      {
        heading: "Recording results",
        lines: [
          "Each variant has two buttons: ✓ (success) and ✗ (failure).",
          "After testing a revision against real tasks, click the appropriate button to record the outcome.",
          "Progress bars show the relative usage and success rate of each variant.",
          "Use the results to determine which revision to promote to Production.",
        ],
      },
    ],
  },
  {
    icon: <Link2 size={16} />,
    title: "Prompt Chains",
    content: [
      {
        heading: "What are prompt chains?",
        lines: [
          "Chains link multiple prompts into a sequential pipeline. The output of step 1 becomes the input for step 2, and so on.",
          "Example workflow: Research prompt → Outline prompt → Draft prompt → Review prompt → Polish prompt.",
          "Open it via the chain icon (🔗) in the top bar.",
        ],
        visual: <VisualChains />,
      },
      {
        heading: "Creating a chain",
        lines: [
          "1. Click + New chain.",
          "2. Give it a name and optional description.",
          "3. Add at least 2 steps using the \"+ Add step\" dropdown (each step is an existing prompt from your library).",
          "4. Click Create chain.",
        ],
      },
      {
        heading: "Running a chain",
        lines: [
          "Select a model and click Run chain. Each step runs in order.",
          "Review mode (on by default): After each step finishes, the output appears in an editable textarea. You can modify the output before it gets passed to the next step. Click \"Continue to step N\" to proceed.",
          "Uncheck \"Review between steps\" for fully automated end-to-end execution.",
          "Each step shows its status: pending (clock), running (spinner), done (checkmark with time), or error (red).",
        ],
      },
    ],
  },
  {
    icon: <FlaskConical size={16} />,
    title: "Batch Evaluations",
    content: [
      {
        heading: "What are batch evaluations?",
        lines: [
          "Batch evaluations run a single prompt template multiple times with different input values — like a mail merge for prompts.",
          "This is useful for testing how your prompt handles different topics, edge cases, or user inputs.",
          "Open the Batch Evals tab in the bottom panel (available in Engineer or Custom mode).",
        ],
        visual: <VisualBatchEvals />,
      },
      {
        heading: "How to use it",
        lines: [
          "1. Write a prompt with template variables, e.g., \"Summarize this article about {{topic}} for a {{audience}} audience.\"",
          "2. In the Batch Evals panel, enter a JSON array of inputs — each object is one run:",
          "   [{\"topic\": \"climate change\", \"audience\": \"teenager\"}, {\"topic\": \"quantum computing\", \"audience\": \"CEO\"}]",
          "3. Optionally add an eval prompt — a question the AI will use to score each result on a 1-5 scale (e.g., \"Is the summary clear and age-appropriate?\").",
          "4. Select a model and click Run Batch.",
        ],
      },
      {
        heading: "Results",
        lines: [
          "A table shows each run with the input, the model's output, and the evaluation score (if you provided an eval prompt).",
          "Rows appear in real-time as each batch item completes.",
          "Use this to spot where your prompt breaks down — which inputs produce bad outputs?",
        ],
      },
    ],
  },
  {
    icon: <Activity size={16} />,
    title: "Tracing",
    content: [
      {
        heading: "What is tracing?",
        lines: [
          "Every time you run a prompt in the Playground, a trace is automatically saved. Traces record everything about the API call: which provider and model, the full input and output, token count, response time, cost, and whether it succeeded or failed.",
          "Open the Tracing Viewer via the activity icon (📈) in the top bar.",
        ],
        visual: <VisualTracing />,
      },
      {
        heading: "The trace table",
        lines: [
          "Each row shows: time, provider, model, tokens, latency, cost, and status (✓ or error).",
          "Click any row to expand it and see the full request and response details.",
          "Check \"Current prompt only\" to filter traces to just the prompt you're working on, or uncheck to see all traces across your library.",
        ],
      },
      {
        heading: "Summary statistics",
        lines: [
          "Four stats are shown at the top: total tokens used, average response time, total cost, and error count.",
          "Use this to track your API spending, identify slow models, or debug failed calls.",
        ],
      },
    ],
  },
  {
    icon: <Search size={16} />,
    title: "Search",
    content: [
      {
        heading: "Full-text search",
        lines: [
          "Press Cmd/Ctrl+K to focus the search bar in the top bar. Type any keyword to search across all prompt titles, descriptions, and revision content.",
          "Results appear in a dropdown with highlighted snippets showing where your keyword matched.",
          "Click a result to navigate directly to that prompt.",
        ],
        visual: <VisualSearch />,
      },
      {
        heading: "Semantic search",
        lines: [
          "If you have Ollama running with an embedding model (e.g., nomic-embed-text), PromptHangar can also search by meaning.",
          "Semantic search runs automatically alongside keyword search for queries longer than 10 characters.",
          "This lets you find prompts even when you don't remember the exact words — just describe what you're looking for.",
        ],
      },
      {
        heading: "Revision search",
        lines: [
          "The revision timeline on the right has its own search bar. Click the search icon to filter revisions by content, notes, model names, or dates.",
        ],
      },
    ],
  },
  {
    icon: <BarChart3 size={16} />,
    title: "Analytics",
    content: [
      {
        heading: "Your prompt library stats",
        lines: [
          "Open Analytics via the bar chart icon (📊) in the top bar.",
          "Dashboard shows: total prompts, total revisions, total results, number of folders, flagged revisions, and average revisions per prompt.",
          "Top 5 tags by usage count — see which categories dominate your library.",
          "Most revised prompts — a bar chart showing which prompts you iterate on most.",
          "All stats are computed locally from your SQLite database. Nothing is sent anywhere.",
        ],
      },
    ],
  },
  {
    icon: <Settings size={16} />,
    title: "Settings & Privacy",
    content: [
      {
        heading: "Modes and themes",
        lines: [
          "Basic — Clean editor with folders and save. No technical panels.",
          "Advanced — Adds Playground, Variables, Compressor, and Results panel.",
          "Engineer — Everything: metadata, batch evals, system prompt, all panels.",
          "Custom — Toggle each feature individually: Playground, Variables, System Prompt, Metadata, Output panel, Batch Evaluations, Compressor.",
        ],
        visual: <VisualSettings />,
      },
      {
        heading: "Network & Airgap",
        lines: [
          "Airgap hard-lock: When ON, blocks ALL network connections — including local models. For maximum isolation when you're handling sensitive content.",
          "Configurable ports: Change the ports for Ollama (default 11434), LM Studio (1234), Jan (1337), LocalAI (8080), and llama.cpp (8080).",
          "Custom endpoints: Add any OpenAI-compatible URL, either local (e.g., a model on another machine in your LAN) or cloud.",
        ],
      },
      {
        heading: "Cloud API keys",
        lines: [
          "Enter API keys for cloud providers (OpenAI, Anthropic, Gemini, xAI, Mistral, DeepSeek, Groq, OpenRouter).",
          "Keys are stored in your OS keychain: macOS Keychain, Windows Credential Manager, or Linux libsecret. They are never sent anywhere except directly to the provider's API when you run a prompt.",
          "After adding a key, refresh models in the Playground to see the cloud models appear.",
        ],
      },
      {
        heading: "Privacy guarantees",
        lines: [
          "Zero telemetry — no analytics, no tracking, no phone-home.",
          "All data stored in a local SQLite database on your disk.",
          "API keys in OS keychain — not in plain text files.",
          "No account required — no email, no sign-up, no login.",
          "Airgap mode for complete network isolation.",
          "Open the app on a plane with no internet — everything works (except cloud models, obviously).",
        ],
      },
    ],
  },
  {
    icon: <HardDrive size={16} />,
    title: "Data & Storage",
    content: [
      {
        heading: "Where your data lives",
        lines: [
          "Everything is stored locally on your computer — nothing in the cloud. The app uses a single SQLite database file for prompts, revisions, results, tags, folders, traces, and evals.",
          "On macOS: ~/Library/Application Support/com.prompthangar.app/",
          "On Windows: %APPDATA%\\com.prompthangar.app\\",
          "On Linux: ~/.local/share/com.prompthangar.app/",
          "The database file is named prompthangar.db. You can open it directly with any SQLite browser (DB Browser for SQLite, TablePlus, DBeaver, etc.).",
        ],
        visual: <VisualStorage />,
      },
      {
        heading: "What gets saved where",
        lines: [
          "SQLite database — prompts, revisions, system prompts, models, params, results, tags, folders, branches, environments, A/B tests, traces, eval scores, chains, and app settings.",
          "OS Keychain — your API keys for cloud providers (OpenAI, Anthropic, Google, etc.). These are NEVER stored in the database or a plain-text config file.",
          "localStorage (browser) — small UI preferences only: sidebar widths, collapsed/expanded states, theme preference. Never content.",
          "Unsaved drafts — kept in localStorage every 500ms so a crash doesn't lose your work. Cleared once you hit Save.",
        ],
      },
      {
        heading: "Backups",
        lines: [
          "The whole database is a single file. To back up: quit the app, copy prompthangar.db to somewhere safe (Time Machine, iCloud, external drive, git repo).",
          "To move to another machine: copy the file to the same location on the new machine.",
          "For selective backups: use Export on individual prompts (JSON format captures everything, including results). This gives you per-prompt files you can version-control.",
        ],
      },
      {
        heading: "Exporting your results cleanly",
        lines: [
          "Two levels of export exist:",
          "1. Whole prompt export (editor toolbar Export button) — saves ALL revisions and all results across the entire prompt history, as JSON or Markdown.",
          "2. Per-revision results export (Results tab Export button) — saves just the results for the current revision, as Markdown, JSON, or CSV.",
          "Markdown result exports are designed to read well in any Markdown viewer: the prompt is shown first as context, then each result appears as its own section with a header, star rating, note, and full content.",
          "CSV result exports have one row per result with columns for Label, Rating, Notes, Content, and timestamp — perfect for pivoting or filtering in a spreadsheet.",
        ],
      },
      {
        heading: "Deleting data",
        lines: [
          "Deleting a prompt removes it from the SQLite database permanently (no trash / soft-delete).",
          "To wipe all data: quit the app and delete the prompthangar.db file from the paths above. Next launch creates a fresh empty database.",
          "API keys: remove them via Settings → Cloud Providers, or directly from your OS Keychain / Credential Manager.",
        ],
      },
    ],
  },
  {
    icon: <Keyboard size={16} />,
    title: "Keyboard Shortcuts",
    content: [
      {
        heading: "All shortcuts",
        lines: [
          "Cmd/Ctrl + S — Save current prompt as new revision",
          "Cmd/Ctrl + Z — Undo",
          "Cmd/Ctrl + Shift + Z — Redo",
          "Cmd/Ctrl + N — Create new prompt in current folder",
          "Cmd/Ctrl + K — Focus search bar",
          "Cmd/Ctrl + I — Open Import dialog",
          "Cmd/Ctrl + , — Open Settings",
          "Cmd/Ctrl + ? — Open keyboard shortcuts help",
        ],
        visual: <VisualKeyboard />,
      },
      {
        heading: "Tips",
        lines: [
          "On Windows and Linux, use Ctrl instead of Cmd.",
          "Most shortcuts work from anywhere in the app, except Cmd+N and Cmd+I which are disabled when you're typing in a text field.",
        ],
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

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
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              {SECTIONS[activeSection].icon}
              {SECTIONS[activeSection].title}
            </h2>
            <button onClick={onClose} className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"><X size={16} /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {SECTIONS[activeSection].content.map((section, si) => (
              <div key={si} className={clsx(si > 0 && "mt-5")}>
                <h3 className="text-sm font-semibold mb-2 text-[var(--color-text)]">
                  {section.heading}
                </h3>
                <ul className="space-y-1.5">
                  {section.lines.map((line, li) => (
                    <li key={li} className="flex items-start gap-2 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
                      <span className="text-[var(--color-accent)] mt-1 shrink-0 text-xs">•</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                {section.visual && section.visual}
              </div>
            ))}
          </div>
          <div className="px-6 py-3 border-t border-[var(--color-border)] flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1"><Lock size={9} /> PromptHangar v0.1.5 by Gores Hamad — All data stored locally</span>
            <span>{activeSection + 1} / {SECTIONS.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
