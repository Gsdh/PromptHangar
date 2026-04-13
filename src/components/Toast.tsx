import { useEffect, useState, useCallback } from "react";
import { X, CheckCircle, AlertTriangle, Info } from "lucide-react";
import clsx from "clsx";

type ToastType = "success" | "error" | "info";

interface ToastMessage {
  id: number;
  type: ToastType;
  text: string;
}

let nextId = 0;
const listeners: Set<(msg: ToastMessage) => void> = new Set();

/** Global toast function — call from anywhere, no React context needed */
export function toast(text: string, type: ToastType = "info") {
  const msg: ToastMessage = { id: nextId++, type, text };
  listeners.forEach((fn) => fn(msg));
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={14} />,
  error: <AlertTriangle size={14} />,
  info: <Info size={14} />,
};

const COLORS: Record<ToastType, string> = {
  success: "text-emerald-500",
  error: "text-red-500",
  info: "text-[var(--color-accent)]",
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const add = useCallback((msg: ToastMessage) => {
    setToasts((prev) => [...prev.slice(-4), msg]); // Max 5 on screen
    // Auto-remove after 4s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== msg.id));
    }, 4000);
  }, []);

  useEffect(() => {
    listeners.add(add);
    return () => {
      listeners.delete(add);
    };
  }, [add]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[300] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg shadow-lg px-4 py-3 flex items-start gap-2 min-w-[240px] max-w-sm animate-slide-up"
        >
          <span className={clsx("shrink-0 mt-0.5", COLORS[t.type])}>
            {ICONS[t.type]}
          </span>
          <span className="text-xs flex-1">{t.text}</span>
          <button
            type="button"
            onClick={() =>
              setToasts((prev) => prev.filter((x) => x.id !== t.id))
            }
            className="shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-0.5"
          >
            <X size={10} />
          </button>
        </div>
      ))}
    </div>
  );
}
