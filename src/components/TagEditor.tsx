import { useEffect, useRef, useState } from "react";
import { X, Tag as TagIcon } from "lucide-react";
import clsx from "clsx";
import { useAppStore } from "../store";
import { listAllTags } from "../api";

interface Props {
  promptId: string;
  tags: string[];
}

function canonicalize(raw: string): string {
  return raw.trim().toLowerCase().split(/\s+/).filter(Boolean).join("-");
}

export function TagEditor({ promptId, tags }: Props) {
  const setPromptTags = useAppStore((s) => s.setPromptTags);
  const [input, setInput] = useState("");
  const [allTags, setAllTags] = useState<string[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listAllTags().then(setAllTags).catch(() => {});
  }, [promptId, tags.length]);

  const inputLower = input.toLowerCase();
  const suggestions = input.trim()
    ? allTags
        .filter(
          (t) =>
            !tags.includes(t) && t.includes(inputLower) && t !== inputLower
        )
        .slice(0, 5)
    : [];

  async function commit(tag: string) {
    const canon = canonicalize(tag);
    if (!canon || tags.includes(canon)) {
      setInput("");
      return;
    }
    const next = [...tags, canon];
    await setPromptTags(promptId, next);
    setInput("");
    setSuggestionsOpen(false);
    setActiveSuggestion(0);
  }

  async function remove(tag: string) {
    const next = tags.filter((t) => t !== tag);
    await setPromptTags(promptId, next);
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      // If a suggestion is highlighted, use that
      if (suggestionsOpen && suggestions[activeSuggestion]) {
        commit(suggestions[activeSuggestion]);
      } else {
        commit(input);
      }
    } else if (e.key === ",") {
      // Comma also commits — matches typical tag UX
      e.preventDefault();
      commit(input);
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      // Remove the last tag when backspacing on an empty input
      remove(tags[tags.length - 1]);
    } else if (e.key === "ArrowDown" && suggestions.length > 0) {
      e.preventDefault();
      setSuggestionsOpen(true);
      setActiveSuggestion((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp" && suggestions.length > 0) {
      e.preventDefault();
      setSuggestionsOpen(true);
      setActiveSuggestion((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Escape") {
      setSuggestionsOpen(false);
      setInput("");
    }
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap relative">
      <TagIcon size={10} className="text-[var(--color-text-muted)] shrink-0" />
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-[10px] font-medium px-1.5 py-0.5 rounded"
        >
          {t}
          <button
            type="button"
            onClick={() => remove(t)}
            className="hover:bg-[var(--color-accent)]/20 rounded-full"
            title={`Remove "${t}"`}
          >
            <X size={9} />
          </button>
        </span>
      ))}
      <div className="relative">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setSuggestionsOpen(true);
            setActiveSuggestion(0);
          }}
          onFocus={() => setSuggestionsOpen(true)}
          onBlur={() => setTimeout(() => setSuggestionsOpen(false), 150)}
          onKeyDown={handleKey}
          placeholder={tags.length === 0 ? "+ tags (enter to add)" : "+ tag"}
          className="bg-transparent text-[10px] outline-none w-28 placeholder:text-[var(--color-text-muted)]/60"
        />
        {suggestionsOpen && suggestions.length > 0 && (
          <div className="absolute top-full left-0 mt-1 z-50 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded shadow-lg min-w-[120px] py-1">
            {suggestions.map((s, i) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(s);
                }}
                onMouseEnter={() => setActiveSuggestion(i)}
                className={clsx(
                  "w-full text-left px-2 py-1 text-[11px]",
                  i === activeSuggestion && "bg-[var(--color-bg-subtle)]"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
