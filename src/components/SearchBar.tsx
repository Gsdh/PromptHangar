import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { searchPrompts } from "../api";
import { useAppStore } from "../store";
import { semanticSearch, isEmbeddingAvailable } from "../lib/semantic";
import type { SearchHit } from "../types";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [_semanticResults, setSemanticResults] = useState<{ promptId: string; similarity: number }[]>([]);
  const [hasEmbedding, setHasEmbedding] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectFolder = useAppStore((s) => s.selectFolder);
  const selectPrompt = useAppStore((s) => s.selectPrompt);

  // Check if Ollama embedding model is available
  useEffect(() => {
    isEmbeddingAvailable().then(setHasEmbedding).catch(() => {});
  }, []);

  // Cmd/Ctrl+K focus
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        // FTS search (always)
        const hits = await searchPrompts(query);
        if (!cancelled) setResults(hits);
        // Semantic search (if Ollama embedding available)
        if (hasEmbedding && query.length > 10) {
          const semHits = await semanticSearch(query, 5);
          if (!cancelled) setSemanticResults(semHits);
        } else {
          if (!cancelled) setSemanticResults([]);
        }
      } catch {
        // search failed silently
      }
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, hasEmbedding]);

  async function pickHit(hit: SearchHit) {
    if (hit.folder_id) {
      await selectFolder(hit.folder_id);
    }
    await selectPrompt(hit.prompt_id);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded text-xs w-72 focus-within:border-[var(--color-accent)]">
        <Search size={12} className="text-[var(--color-text-muted)] shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search prompts…  Cmd/Ctrl+K"
          className="flex-1 bg-transparent outline-none placeholder:text-[var(--color-text-muted)]"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {open && query && (
        <div className="absolute top-full mt-1 right-0 w-96 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded shadow-lg z-50 max-h-96 overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-4 text-xs text-[var(--color-text-muted)] text-center">
              {query.trim() ? "No results" : "Type to search…"}
            </div>
          ) : (
            results.map((hit) => (
              <button
                key={hit.prompt_id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void pickHit(hit)}
                className="w-full text-left px-3 py-2 border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-bg-subtle)]"
              >
                <div className="text-sm font-medium">{hit.title}</div>
                <div
                  className="text-[11px] text-[var(--color-text-muted)] mt-0.5"
                  dangerouslySetInnerHTML={{ __html: sanitizeSnippet(hit.snippet) }}
                />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Allow only <mark> tags from FTS snippet, escape everything else
function sanitizeSnippet(snippet: string): string {
  // Escape HTML
  const escaped = snippet
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // Un-escape <mark> tags that we intentionally inserted
  return escaped
    .replace(/&lt;mark&gt;/g, '<mark class="bg-yellow-200 dark:bg-yellow-900/50 text-inherit">')
    .replace(/&lt;\/mark&gt;/g, "</mark>");
}
