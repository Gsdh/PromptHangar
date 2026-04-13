<p align="center">
  <img src="src-tauri/icons/icon.svg" width="128" height="128" alt="PromptHangar" />
</p>

<h1 align="center">PromptHangar</h1>

<p align="center">
  <strong>The privacy-first prompt engineering workbench.</strong><br>
  Version control, test, compress, and manage your AI prompts — fully offline.<br>
  Free forever. No account. No telemetry. Your data never leaves your machine.
</p>

<p align="center">
  <a href="#download">Download</a> &middot;
  <a href="#features">Features</a> &middot;
  <a href="#why">Why</a> &middot;
  <a href="#getting-started">Getting Started</a> &middot;
  <a href="#providers">Providers</a> &middot;
  <a href="#building-from-source">Building</a>
</p>

---

## Download

| Platform | Download | Requirements |
|----------|----------|-------------|
| **macOS** (Apple Silicon) | [.dmg](../../releases/latest) | macOS 11+ |
| **macOS** (Intel) | [.dmg](../../releases/latest) | macOS 11+ |
| **Windows** | [.msi](../../releases/latest) | Windows 10+ |
| **Linux** | [.AppImage / .deb](../../releases/latest) | Ubuntu 22.04+ or equivalent |

> Built with [Tauri 2](https://tauri.app) — ~15MB binary, no Chromium, native performance.

---

## Why

Every prompt engineer has the same problem: prompts scattered across ChatGPT conversations, Notion pages, text files, and Slack threads. When a prompt works, you can't remember which version it was. When it breaks, you can't diff what changed.

**PromptLayer costs $49/month. LangSmith charges per seat. Both require sending every prompt to their cloud.**

PromptHangar is the alternative:

- **Free forever** — no subscription, no limits, no account
- **Fully offline** — works without internet, even on a plane
- **Privacy by architecture** — SQLite database on your disk, zero telemetry, API keys in your OS keychain
- **15 LLM providers** — test the same prompt on Ollama, GPT-5.4, Claude 4.6, Gemini 3.1, Grok, Mistral, DeepSeek, and more
- **Features that paid tools don't have** — prompt compression, import from any chat, crash-recovery drafts

---

## Features

### Core
- **Prompt versioning** — every save creates a revision with diff, date, and optional commit note
- **Git-style branching** — fork any revision into a named branch, switch between branches
- **Environment management** — promote revisions to Development / Staging / Production
- **Full-text + semantic search** — find prompts by keywords or by meaning (via local Ollama embeddings)
- **Smart folders** — Recent, Flagged, All Prompts across your entire library
- **Tags** — with autocomplete, canonical normalization, and click-to-filter

### Testing
- **Playground** — stream responses from 15 providers (6 local, 9 cloud) in real-time
- **A/B testing** — compare revision variants, record success/failure, track conversion rates
- **Prompt chains** — link prompts as pipeline steps, review/edit output between steps
- **Tracing** — every API call logged with provider, model, tokens, latency, cost, full I/O
- **Eval regression** — track scores per revision with trend indicators
- **Results panel** — save, rate, compare, and annotate model outputs per revision

### Optimization
- **Prompt compressor** — 4 strategies: rule-based auto-compress, tips, side-by-side diff, LLM rewrite
- **Cost estimation** — real-time per-request cost for 30+ models in the editor footer
- **Template variables** — `{{variable}}` detection, input fields, preview, copy expanded
- **Secret detection** — scans for API keys, tokens, PII on save

### Workflow
- **Import** — paste from ChatGPT, Claude, Gemini, Ollama CLI with auto-split (5 detection strategies)
- **Export** — JSON (full data) or Markdown (readable) with native save dialog
- **Magic Copy** — clipboard copy with metadata checkboxes, format selection, saved presets
- **Duplicate, move, drag-drop reorder** — full prompt lifecycle management

### UX
- **Dark mode** with CodeMirror theme sync
- **Collapsible sidebars** (folders and prompts independently)
- **VS Code-style bottom panel** (tabbed, resizable, collapsible)
- **Markdown live preview** in editor
- **Keyboard shortcuts** — Cmd+S/N/K/I/,/? and more
- **Interactive onboarding** — 10-step guided tour
- **Comprehensive help guide** — 14 sections covering every feature
- **Crash-recovery** — drafts auto-saved every 500ms

---

## Providers

### Local (data never leaves your machine)

| Provider | Default Port | Auto-discover |
|----------|-------------|---------------|
| Ollama | 11434 | Yes |
| LM Studio | 1234 | Yes |
| Jan | 1337 | Yes |
| LocalAI | 8080 | Yes |
| llama.cpp | 8080 | Yes |
| Custom endpoint | User-defined | Yes |

### Cloud (requires API key, stored in OS keychain)

| Provider | Models |
|----------|--------|
| OpenAI | GPT-5.4, 5.4-mini, 5.4-nano, 4.1, o4-mini |
| Anthropic | Claude Opus 4.6, Sonnet 4.6, Haiku 4.5 |
| Google Gemini | Gemini 3.1 Pro, 3.1 Flash, 2.5 Pro/Flash |
| xAI | Grok 4.20 Beta 2, 4.1 |
| Mistral | Large 3, Small 4, Medium 3, Codestral |
| DeepSeek | V3.2, V3.2 Reasoner |
| Groq | Llama 4 Scout, Maverick, GPT-OSS 120B, Qwen3 |
| OpenRouter | Any model via OR proxy |
| Custom | Any OpenAI-compatible endpoint |

All ports configurable in Settings. Airgap hard-lock available to block all network I/O.

---

## Getting Started

1. **Download** the installer for your platform from [Releases](../../releases)
2. **Install** and open — no account needed, no internet required
3. **Choose your mode** — Basic, Advanced, Engineer, or Custom
4. **Follow the tour** — 10 interactive steps introduce every feature
5. **Start writing prompts** — Cmd+N to create, Cmd+S to save revisions

### Optional: Local LLM testing

Install [Ollama](https://ollama.com) and pull a model:

```bash
ollama pull llama3.3
ollama serve
```

The Playground auto-detects it. Your prompts stay on your machine.

---

## Comparison

| | PromptHangar | PromptLayer | LangSmith | PromptHub |
|---|---|---|---|---|
| Price | **Free** | $49/mo | $39/seat/mo | $15/user/mo |
| Offline | **Yes** | No | No | No |
| Privacy | **Zero telemetry** | Cloud logs | Cloud logs | Cloud logs |
| Providers | **15** | ~6 | LangChain | ~5 |
| Branching | **Yes** | No | No | Yes |
| Compression | **4 strategies** | No | No | No |
| A/B testing | **Yes** | Yes | Yes | No |
| Tracing | **Yes** | Yes | Yes | No |
| Environments | **Yes** | Yes | Yes | No |
| Import from chat | **5 strategies** | No | No | No |
| Vendor lock-in | **None** | Yes | Yes | Yes |

---

## Building from source

```bash
# Prerequisites: Node.js 20+, Rust 1.75+, pnpm 9+

git clone https://github.com/YOUR_USERNAME/prompthangar.git
cd prompthangar
pnpm install
pnpm tauri dev      # Development with hot reload
pnpm tauri build    # Production build
```

### Tests

```bash
pnpm exec vitest run    # 33 unit tests
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Shell | Tauri 2 (Rust + native webview) |
| Frontend | React 19 + TypeScript + Tailwind v4 |
| Editor | CodeMirror 6 |
| State | Zustand |
| Database | SQLite (rusqlite, bundled) |
| Key storage | OS keychain (keyring crate) |
| DnD | @dnd-kit |
| Icons | Lucide React |

---

## Author

**Gores Hamad** — [GitHub](https://github.com/YOUR_USERNAME)

---

## License

MIT

---

<p align="center">
  Built by <strong>Gores Hamad</strong> for prompt engineers who value their privacy.<br>
  <strong>Your prompts. Your machine. Your data.</strong>
</p>
