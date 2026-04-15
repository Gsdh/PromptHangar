// Types mirroring Rust models in src-tauri/src/models.rs.
// Serde uses snake_case by default, so fields stay in snake_case.

export interface Folder {
  id: string;
  parent_id: string | null;
  name: string;
  color: string | null;
  icon: string | null;
  sort_order: number;
  sensitive: boolean;
  created_at: string;
}

export interface PromptViewPrefs {
  /** Epic 3 — how the revision list is coloured. */
  colorBy?: "rating" | "model" | "flagged" | "none";
  [key: string]: unknown;
}

export interface Prompt {
  id: string;
  folder_id: string | null;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  /** Epic 3 — UI view preferences as a JSON blob. */
  view_prefs?: PromptViewPrefs | null;
  /** Epic 2 — linked Git workspace, if any. */
  git_workspace_id?: string | null;
}

export interface Revision {
  id: string;
  prompt_id: string;
  revision_number: number;
  content: string;
  system_prompt: string | null;
  model: string | null;
  params: Record<string, unknown>;
  note: string | null;
  flagged: boolean;
  rating: number | null;
  created_at: string;
}

export interface RevisionOutput {
  id: string;
  revision_id: string;
  label: string | null;
  content: string;
  notes: string | null;
  rating: number | null;
  sort_order: number;
  created_at: string;
  /** Epics 5 & 6 — groups outputs produced by a single multi-run click. */
  run_group_id?: string | null;
}

/** Epic 2 — a local Git repository linked for prompt sync. */
export interface GitWorkspace {
  id: string;
  name: string;
  path: string;
  push_policy: "manual" | "on_commit" | "interval";
  push_interval_seconds: number | null;
  default_remote: string;
  default_branch: string;
  last_push_at: string | null;
  last_pull_at: string | null;
  last_error: string | null;
  created_at: string;
}

/** Working-tree summary for a Git workspace. */
export interface GitWorkspaceStatus {
  modified: number;
  untracked: number;
  head: string | null;
}

/** Source of a trace row — distinguishes real provider calls from manual entry. */
export type TraceSource = "live" | "manual" | "imported";

export interface PromptWithLatest {
  prompt: Prompt;
  latest_revision: Revision | null;
  revision_count: number;
  tags: string[];
}

export interface SearchHit {
  prompt_id: string;
  title: string;
  description: string | null;
  snippet: string;
  folder_id: string | null;
}

export type AppMode = "basic" | "advanced" | "engineer" | "custom";
export type Theme = "light" | "dark" | "oled";

export interface CustomFeatures {
  showVariables: boolean;
  showPlayground: boolean;
  showSystemPrompt: boolean;
  showMetadata: boolean;
  showResults: boolean;
  showBatchEvals: boolean;
  showCompressor: boolean;
}

export interface AppSettings {
  mode: AppMode;
  custom_features: CustomFeatures;
  airgap_enabled: boolean;
  first_run_completed: boolean;
  theme: Theme;
}

export interface Chain {
  id: string;
  name: string;
  description: string | null;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChainStep {
  id: string;
  chain_id: string;
  prompt_id: string;
  prompt_title: string | null;
  step_order: number;
  transform: string | null;
  created_at: string;
}

export interface ChainWithSteps {
  chain: Chain;
  steps: ChainStep[];
}

export interface RevisionParams {
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  [key: string]: unknown;
}
