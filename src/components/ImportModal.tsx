import { useEffect, useMemo, useState } from "react";
import { X, Sparkles, Lightbulb, Lock } from "lucide-react";
import { toast } from "./Toast";
import clsx from "clsx";
import { useAppStore } from "../store";
import * as api from "../api";

interface Props {
  onClose: () => void;
}

type Source = "Gemini" | "ChatGPT" | "Claude" | "Other";

const SOURCES: Source[] = ["Gemini", "ChatGPT", "Claude", "Other"];

/**
 * Smart conversation splitter — handles multiple copy-paste formats:
 *
 * Strategy 1: Explicit markers ("You:", "ChatGPT:", "You said:", etc.)
 * Strategy 2: ChatGPT web UI format ("You said:\n...\nChatGPT said:\n...")
 * Strategy 3: Claude web UI format ("H\n...\nA\n..." or paragraph heuristic)
 * Strategy 4: Heuristic — first short block = question, rest = answer
 *
 * Returns null only if the text is too short or has no detectable structure.
 */
function splitConversation(
  text: string
): { prompt: string; response: string; method: string } | null {
  const raw = text.trim();
  if (!raw || raw.length < 20) return null;

  // --- Strategy 1: Explicit role markers (most formats) ---
  const markerPatterns = [
    // English
    { re: /^\s*(?:You said|You)\s*:\s*/gim, role: "user" as const },
    { re: /^\s*(?:User|Human|Me)\s*:\s*/gim, role: "user" as const },
    { re: /^\s*(?:Q)\s*:\s*/gim, role: "user" as const },
    // Dutch
    { re: /^\s*(?:Jij|Je|Gebruiker)\s*:\s*/gim, role: "user" as const },
    // Ollama CLI format (>>> prompt)
    { re: /^>>>\s+/gm, role: "user" as const },
    // AI markers — English
    { re: /^\s*(?:ChatGPT said|ChatGPT)\s*:\s*/gim, role: "assistant" as const },
    { re: /^\s*(?:Claude said|Claude)\s*:\s*/gim, role: "assistant" as const },
    { re: /^\s*(?:Gemini said|Gemini)\s*:\s*/gim, role: "assistant" as const },
    { re: /^\s*(?:Grok said|Grok)\s*:\s*/gim, role: "assistant" as const },
    { re: /^\s*(?:Assistant|AI|Bot|GPT|DeepSeek|Mistral)\s*:\s*/gim, role: "assistant" as const },
    { re: /^\s*(?:A)\s*:\s*/gim, role: "assistant" as const },
  ];

  interface Match {
    index: number;
    role: "user" | "assistant";
    length: number;
  }
  const matches: Match[] = [];
  for (const m of markerPatterns) {
    m.re.lastIndex = 0;
    let found;
    while ((found = m.re.exec(raw)) !== null) {
      matches.push({ index: found.index, role: m.role, length: found[0].length });
    }
  }
  matches.sort((a, b) => a.index - b.index);

  // De-duplicate overlapping matches (keep the longest at each position)
  const deduped: Match[] = [];
  for (const m of matches) {
    const last = deduped[deduped.length - 1];
    if (last && Math.abs(last.index - m.index) < 5) {
      if (m.length > last.length) deduped[deduped.length - 1] = m;
    } else {
      deduped.push(m);
    }
  }

  if (deduped.length >= 2) {
    const result = extractTurns(raw, deduped);
    if (result) return { ...result, method: "markers" };
  }

  // --- Strategy 1b: Ollama CLI format (>>> prompt\nresponse\n>>> prompt\nresponse) ---
  const ollamaPattern = /^>>>\s+/gm;
  const ollamaMatches: number[] = [];
  let ollamaMatch;
  ollamaPattern.lastIndex = 0;
  while ((ollamaMatch = ollamaPattern.exec(raw)) !== null) {
    ollamaMatches.push(ollamaMatch.index);
  }
  if (ollamaMatches.length >= 1) {
    const userTurns: string[] = [];
    const aiTurns: string[] = [];
    for (let i = 0; i < ollamaMatches.length; i++) {
      const start = ollamaMatches[i];
      const end = ollamaMatches[i + 1] ?? raw.length;
      const block = raw.slice(start, end);
      // First line (after >>>) is the user prompt, rest is AI response
      const lines = block.replace(/^>>>\s+/, "").split("\n");
      const userLine = lines[0]?.trim() ?? "";
      const aiBlock = lines.slice(1).join("\n").trim();
      if (userLine) userTurns.push(userLine);
      if (aiBlock) aiTurns.push(aiBlock);
    }
    if (userTurns.length > 0 && aiTurns.length > 0) {
      return {
        prompt: userTurns.join("\n\n---\n\n"),
        response: aiTurns.join("\n\n---\n\n"),
        method: "ollama-cli",
      };
    }
  }

  // --- Strategy 2: ChatGPT "You said" / "ChatGPT said" block format ---
  // Sometimes the markers aren't on their own line but are paragraph headers
  const chatgptBlocks = raw.split(/\n(?=(?:You said|ChatGPT said|Claude said|Gemini said)\s*\n)/i);
  if (chatgptBlocks.length >= 2) {
    const userBlocks: string[] = [];
    const aiBlocks: string[] = [];
    for (const block of chatgptBlocks) {
      const trimmed = block.trim();
      if (/^(?:You said)\s*\n/i.test(trimmed)) {
        userBlocks.push(trimmed.replace(/^(?:You said)\s*\n/i, "").trim());
      } else if (/^(?:ChatGPT said|Claude said|Gemini said|Grok said)\s*\n/i.test(trimmed)) {
        aiBlocks.push(trimmed.replace(/^(?:ChatGPT said|Claude said|Gemini said|Grok said)\s*\n/i, "").trim());
      } else if (userBlocks.length === 0 && aiBlocks.length === 0) {
        // First block without a header — assume it's the user
        userBlocks.push(trimmed);
      }
    }
    if (userBlocks.length > 0 && aiBlocks.length > 0) {
      return {
        prompt: userBlocks.join("\n\n---\n\n"),
        response: aiBlocks.join("\n\n---\n\n"),
        method: "block-headers",
      };
    }
  }

  // --- Strategy 3: Double-newline heuristic ---
  // If the text has clear paragraph breaks and the first paragraph is
  // short (likely a question) followed by a long paragraph (likely an answer),
  // split at the boundary.
  const paragraphs = raw.split(/\n\n+/).filter((p) => p.trim().length > 0);
  if (paragraphs.length >= 2) {
    const firstLen = paragraphs[0].length;
    const restLen = paragraphs.slice(1).join("\n\n").length;

    // Heuristic: if the first paragraph is < 30% of total, it's likely the prompt
    if (firstLen < restLen * 0.4 && firstLen < 500) {
      return {
        prompt: paragraphs[0].trim(),
        response: paragraphs.slice(1).join("\n\n").trim(),
        method: "heuristic-short-first",
      };
    }

    // Heuristic: if first paragraph ends with ? it's a question
    if (paragraphs[0].trim().endsWith("?")) {
      // Find where the answer starts — could be paragraph 2 or after a blank line
      let splitIdx = 1;
      // If paragraph 2 is also short and ends with ?, it's a multi-line question
      while (splitIdx < paragraphs.length - 1 && paragraphs[splitIdx].trim().endsWith("?")) {
        splitIdx++;
      }
      return {
        prompt: paragraphs.slice(0, splitIdx).join("\n\n").trim(),
        response: paragraphs.slice(splitIdx).join("\n\n").trim(),
        method: "heuristic-question-mark",
      };
    }
  }

  return null;
}

function extractTurns(
  raw: string,
  matches: { index: number; role: "user" | "assistant"; length: number }[]
): { prompt: string; response: string } | null {
  interface Turn { role: "user" | "assistant"; content: string; }
  const turns: Turn[] = [];
  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const next = matches[i + 1];
    const start = cur.index + cur.length;
    const end = next ? next.index : raw.length;
    const content = raw.slice(start, end).trim();
    if (content) turns.push({ role: cur.role, content });
  }
  const userTurns = turns.filter((t) => t.role === "user").map((t) => t.content);
  const aiTurns = turns.filter((t) => t.role === "assistant").map((t) => t.content);
  if (userTurns.length === 0 || aiTurns.length === 0) return null;
  return {
    prompt: userTurns.join("\n\n---\n\n"),
    response: aiTurns.join("\n\n---\n\n"),
  };
}

export function ImportModal({ onClose }: Props) {
  const folders = useAppStore((s) => s.folders);
  const selectedFolderId = useAppStore((s) => s.selectedFolderId);
  const refreshPrompts = useAppStore((s) => s.refreshPrompts);
  const selectPrompt = useAppStore((s) => s.selectPrompt);

  const [source, setSource] = useState<Source>("Gemini");
  const [folderId, setFolderId] = useState<string | null>(selectedFolderId);
  const [title, setTitle] = useState("");
  const [promptText, setPromptText] = useState("");
  const [responseText, setResponseText] = useState("");
  const [busy, setBusy] = useState(false);
  const [detectNote, setDetectNote] = useState<string | null>(null);
  const [multiTurnWarning, setMultiTurnWarning] = useState<number>(0);

  useEffect(() => {
    if (!folderId && folders.length > 0) setFolderId(folders[0].id);
  }, [folders, folderId]);

  const effectiveTitle = useMemo(() => {
    if (title.trim()) return title.trim();
    const firstLine = promptText.trim().split("\n")[0] ?? "";
    return firstLine.slice(0, 64) || "Import from " + source;
  }, [title, promptText, source]);

  const canImport = promptText.trim().length > 0 && folderId;

  // Auto-detect on paste: if user pastes a large block of text, try to split it
  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const pasted = e.clipboardData.getData("text");
    if (!pasted || pasted.length < 50) return; // too short to be a conversation
    // Don't auto-detect if the response field already has content
    if (responseText.trim()) return;

    // Small delay so the textarea value updates first
    setTimeout(() => {
      const split = splitConversation(pasted);
      if (split) {
        setPromptText(split.prompt);
        setResponseText(split.response);
        const userCount = split.prompt.split("\n\n---\n\n").length;
        const assistantCount = split.response.split("\n\n---\n\n").length;
        const methodLabels: Record<string, string> = {
          "markers": "role markers",
          "ollama-cli": "Ollama CLI format",
          "block-headers": "block headers",
          "heuristic-short-first": "short question + long answer",
          "heuristic-question-mark": "question mark detection",
        };
        setDetectNote(
          `Auto-split on paste (${methodLabels[split.method] ?? split.method}): ${userCount} question${userCount !== 1 ? "s" : ""}, ${assistantCount} answer${assistantCount !== 1 ? "s" : ""}. Verify below.`
        );
        setTimeout(() => setDetectNote(null), 8000);
      }
    }, 50);
  }

  function tryAutoDetect() {
    const split = splitConversation(promptText);
    if (split) {
      setPromptText(split.prompt);
      setResponseText(split.response);
      const userCount = split.prompt.split("\n\n---\n\n").length;
      const assistantCount = split.response.split("\n\n---\n\n").length;
      const turns = Math.max(userCount, assistantCount);
      setMultiTurnWarning(turns > 1 ? turns : 0);

      const methodLabels: Record<string, string> = {
        "markers": "role markers (You:, ChatGPT:, etc.)",
        "ollama-cli": "Ollama CLI format (>>> prompts)",
        "block-headers": "block headers (You said / ChatGPT said)",
        "heuristic-short-first": "heuristic (short question + long answer)",
        "heuristic-question-mark": "heuristic (question mark detection)",
      };
      const how = methodLabels[split.method] ?? split.method;

      setDetectNote(
        `Detected via ${how}: ${userCount} question${
          userCount !== 1 ? "s" : ""
        }, ${assistantCount} answer${assistantCount !== 1 ? "s" : ""}. Check the split below.`
      );
    } else {
      setDetectNote(
        "Could not auto-detect conversation structure. Paste your prompt and response in the separate fields."
      );
    }
    setTimeout(() => setDetectNote(null), 8000);
  }

  async function handleImport() {
    if (!canImport || !folderId || busy) return;
    setBusy(true);
    try {
      const created = await api.createPrompt({
        title: effectiveTitle,
        folder_id: folderId,
        description: `Imported from ${source}`,
        initial_content: promptText.trim(),
      });

      const revisionId = created.latest_revision?.id;
      if (revisionId && responseText.trim()) {
        await api.createOutput({
          revision_id: revisionId,
          label: source,
          content: responseText.trim(),
        });
      }

      await refreshPrompts();
      await selectPrompt(created.prompt.id);
      onClose();
    } catch (err) {
      toast("Import failed: " + String(err), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="glass-panel max-w-3xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-lg font-semibold">Import prompt</h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Paste a prompt (and optionally the response) from an AI tool.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded hover:bg-[var(--color-bg-subtle)]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Source + folder selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-muted)]">
                Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as Source)}
                className="mt-1 w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[var(--color-accent)]"
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-muted)]">
                Folder
              </label>
              <select
                value={folderId ?? ""}
                onChange={(e) => setFolderId(e.target.value || null)}
                className="mt-1 w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[var(--color-accent)]"
              >
                {folders.length === 0 && (
                  <option value="">No folders available</option>
                )}
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-muted)]">
              Title (optional)
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={effectiveTitle}
              className="mt-1 w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[var(--color-accent)]"
            />
            {!title.trim() && promptText.trim() && (
              <div className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                Empty → auto-filled as <em>{effectiveTitle}</em>
              </div>
            )}
          </div>

          {/* Prompt field */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-muted)]">
                Your prompt / question
              </label>
              <button
                type="button"
                onClick={tryAutoDetect}
                disabled={!promptText.trim()}
                className="flex items-center gap-1 text-[10px] text-[var(--color-accent)] hover:underline disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline"
                title="Split conversation (You: / Gemini:) based on role markers"
              >
                <Sparkles size={10} />
                Auto-split
              </button>
            </div>
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              onPaste={handlePaste}
              placeholder="Paste a conversation here — auto-splits on paste. Supports ChatGPT, Claude, Gemini, Ollama CLI formats."
              rows={6}
              className="mt-1 w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-2 text-sm font-mono focus:outline-none focus:border-[var(--color-accent)] resize-y"
            />
            {detectNote && (
              <div
                className={clsx(
                  "mt-1 text-[11px]",
                  detectNote.startsWith("Detected")
                    ? "text-[var(--color-accent)]"
                    : "text-amber-500"
                )}
              >
                {detectNote}
              </div>
            )}
            {multiTurnWarning > 1 && (
              <div className="mt-1 text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
                <Lightbulb size={10} /> {multiTurnWarning} turns merged with <code>---</code> separator.
              </div>
            )}
          </div>

          {/* Response field */}
          <div>
            <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-muted)]">
              Response from {source} (optional)
            </label>
            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder={`Paste the response that ${source} gave here (saved as a result for this prompt)`}
              rows={6}
              className="mt-1 w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-2 text-sm font-mono focus:outline-none focus:border-[var(--color-accent)] resize-y"
            />
            <div className="mt-1 text-[10px] text-[var(--color-text-muted)]">
              If filled, appears as a result in the Results panel
              (linked to revision #1).
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-5 border-t border-[var(--color-border)]">
          <div className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
            <Lock size={12} /> Fully local — nothing leaves your machine
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs border border-[var(--color-border)] rounded hover:bg-[var(--color-bg-subtle)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleImport()}
              disabled={!canImport || busy}
              className={clsx(
                "px-4 py-1.5 text-xs font-medium rounded transition-colors",
                canImport && !busy
                  ? "bg-[var(--color-accent)] text-white hover:brightness-110"
                  : "bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] cursor-not-allowed"
              )}
            >
              {busy ? "Working…" : "Import"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
