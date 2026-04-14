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

export interface Prompt {
  id: string;
  folder_id: string | null;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
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
}

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
