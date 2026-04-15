// Epic 10 — full-viewport overlay shown when the app is locked.
//
// The whole UI is mounted underneath, but rendered unreachable because this
// component takes up the full viewport with a solid backdrop.  Unlocking
// flips `onUnlock`, which tears the overlay down and reveals the app
// beneath.

import { useEffect, useRef, useState } from "react";
import { Lock, BookOpen, Eye, EyeOff } from "lucide-react";
import { verifyMasterPassword } from "../api";

interface Props {
  onUnlock: () => void;
}

export function LockScreen({ onUnlock }: Props) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<"idle" | "checking" | "wrong">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the field on mount so the user can start typing immediately.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || status === "checking") return;
    setStatus("checking");
    try {
      const ok = await verifyMasterPassword(password);
      if (ok) {
        setPassword("");
        onUnlock();
      } else {
        setStatus("wrong");
        // Leave the password in place so the user can correct a typo.
        inputRef.current?.select();
      }
    } catch (err) {
      console.error("unlock error", err);
      setStatus("wrong");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-8"
      style={{
        background:
          "radial-gradient(ellipse at center, var(--color-bg-elevated) 0%, var(--color-bg) 70%)",
      }}
    >
      <div className="max-w-sm w-full">
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] mb-4">
            <Lock size={28} className="text-[var(--color-accent)]" />
          </div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={18} className="text-[var(--color-accent)]" />
            <span className="font-semibold text-lg">PromptHangar</span>
          </div>
          <div className="text-xs text-[var(--color-text-muted)]">
            Enter your master password to continue
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <input
              ref={inputRef}
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (status === "wrong") setStatus("idle");
              }}
              placeholder="Master password"
              autoComplete="current-password"
              className="w-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--color-accent)] pr-10"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              tabIndex={-1}
            >
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          {status === "wrong" && (
            <div className="text-xs text-red-500 text-center">
              Incorrect password. Try again.
            </div>
          )}

          <button
            type="submit"
            disabled={!password || status === "checking"}
            className="w-full bg-[var(--color-accent)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm py-2.5 rounded-md transition-opacity"
          >
            {status === "checking" ? "Checking…" : "Unlock"}
          </button>
        </form>

        <div className="mt-8 text-center text-[10px] text-[var(--color-text-muted)] leading-relaxed">
          Forgot your password? The hash is stored locally only — you can
          reset by deleting the database file at
          <br />
          <span className="font-mono">
            ~/Library/Application Support/com.prompthangar.app/
          </span>
          <br />
          (this erases all prompts).
        </div>
      </div>
    </div>
  );
}
