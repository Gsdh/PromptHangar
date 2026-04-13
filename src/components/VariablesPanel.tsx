import { useEffect, useMemo, useState } from "react";
import { Variable, Eye, EyeOff, Check, Lightbulb } from "lucide-react";
import clsx from "clsx";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

interface Props {
  content: string;
  systemPrompt: string;
}

const VAR_REGEX = /\{\{([^}]+)\}\}/g;

function extractVariables(text: string): string[] {
  const matches = new Set<string>();
  let match;
  const regex = new RegExp(VAR_REGEX.source, "g");
  while ((match = regex.exec(text)) !== null) {
    matches.add(match[1].trim());
  }
  return Array.from(matches);
}

function expandTemplate(
  text: string,
  values: Record<string, string>
): string {
  return text.replace(VAR_REGEX, (_, key: string) => {
    const trimmed = key.trim();
    return values[trimmed] ?? `{{${trimmed}}}`;
  });
}

export function VariablesPanel({ content, systemPrompt }: Props) {
  const variables = useMemo(
    () => extractVariables(content + "\n" + systemPrompt),
    [content, systemPrompt]
  );

  const [values, setValues] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  // Clean up values when variables change (remove stale keys, add new)
  useEffect(() => {
    setValues((prev) => {
      const next: Record<string, string> = {};
      for (const v of variables) {
        next[v] = prev[v] ?? "";
      }
      return next;
    });
  }, [variables.join(",")]);

  if (variables.length === 0) return null;

  const allFilled = variables.every((v) => values[v]?.trim());
  const expanded = expandTemplate(content, values);
  const expandedSystem = expandTemplate(systemPrompt, values);

  async function copyExpanded() {
    const parts: string[] = [];
    if (expandedSystem.trim()) {
      parts.push(`[System]\n${expandedSystem}`);
    }
    parts.push(expanded);
    await writeText(parts.join("\n\n---\n\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-2 border-b border-[var(--color-border)]">
        <Variable size={12} className="text-[var(--color-accent)]" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Variables
        </span>
        <span className="text-[10px] text-[var(--color-text-muted)]">
          ({variables.length})
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setShowPreview((p) => !p)}
          disabled={!allFilled}
          className={clsx(
            "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors",
            showPreview
              ? "bg-[var(--color-accent)] text-white"
              : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]",
            !allFilled && "opacity-40 cursor-not-allowed"
          )}
          title={allFilled ? "Show preview with filled values" : "Fill in all variables to see preview"}
        >
          {showPreview ? <EyeOff size={10} /> : <Eye size={10} />}
          Preview
        </button>
        <button
          type="button"
          onClick={() => void copyExpanded()}
          disabled={!allFilled}
          className={clsx(
            "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors",
            allFilled
              ? "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]"
              : "opacity-40 cursor-not-allowed"
          )}
          title="Copy prompt with filled variables"
        >
          {copied ? <Check size={10} /> : "Copy"}
        </button>
      </div>

      {/* Variable inputs */}
      <div className="px-5 py-3 grid grid-cols-2 gap-x-4 gap-y-2">
        {variables.map((v) => (
          <div key={v} className="flex flex-col gap-0.5">
            <label className="text-[10px] font-mono font-semibold text-[var(--color-accent)]">
              {"{{" + v + "}}"}
            </label>
            <input
              value={values[v] ?? ""}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [v]: e.target.value }))
              }
              placeholder={`Value for ${v}`}
              className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 text-xs focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>
        ))}
      </div>

      {/* Preview */}
      {showPreview && allFilled && (
        <div className="px-5 pb-3">
          <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-3 text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
            {expandedSystem.trim() && (
              <div className="mb-2 pb-2 border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                <span className="text-[9px] uppercase font-semibold">System:</span>
                <br />
                {expandedSystem}
              </div>
            )}
            {expanded}
          </div>
          <div className="mt-1 text-[9px] text-[var(--color-text-muted)] flex items-center gap-1">
            <Lightbulb size={10} /> This is the prompt as it would be sent to a model.
          </div>
        </div>
      )}
    </div>
  );
}
