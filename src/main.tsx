import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./ErrorBoundary";
import "./index.css";

// Dev-only: stub Tauri's invoke so the app can boot in a plain browser
// (for documentation screenshots). No-op in Tauri, stripped in prod builds.
if (import.meta.env.DEV && typeof window !== "undefined" && !(window as any).__TAURI_INTERNALS__) {
  await import("./dev-mock");
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
