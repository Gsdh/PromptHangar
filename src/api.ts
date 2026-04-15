import { invoke } from "@tauri-apps/api/core";
import type {
  AppSettings,
  AppMode,
  ChainWithSteps,
  Folder,
  GitWorkspace,
  GitWorkspaceStatus,
  PromptViewPrefs,
  PromptWithLatest,
  Revision,
  RevisionOutput,
  SearchHit,
  Theme,
  TraceSource,
} from "./types";

// ---------- Folders ----------

export function listFolders(): Promise<Folder[]> {
  return invoke("list_folders");
}

export function createFolder(input: {
  name: string;
  parent_id?: string | null;
  color?: string | null;
  icon?: string | null;
}): Promise<Folder> {
  return invoke("create_folder", { input });
}

export function updateFolder(input: {
  id: string;
  name?: string;
  color?: string;
  icon?: string;
  sensitive?: boolean;
}): Promise<void> {
  return invoke("update_folder", { input });
}

export function deleteFolder(id: string): Promise<void> {
  return invoke("delete_folder", { id });
}

// ---------- Prompts ----------

export function listPrompts(folderId?: string | null): Promise<PromptWithLatest[]> {
  return invoke("list_prompts", { folderId: folderId ?? null });
}

export function getPrompt(id: string): Promise<PromptWithLatest> {
  return invoke("get_prompt", { id });
}

export function createPrompt(input: {
  title: string;
  folder_id?: string | null;
  description?: string | null;
  initial_content?: string | null;
}): Promise<PromptWithLatest> {
  return invoke("create_prompt", { input });
}

export function updatePrompt(input: {
  id: string;
  title?: string;
  description?: string;
  folder_id?: string;
  /** Epic 3 — UI view preferences. Serialized server-side. */
  view_prefs?: PromptViewPrefs;
  /**
   * Epic 2 — link/unlink to a Git workspace.
   * `undefined` = leave unchanged, `null` = unlink, string = link to that id.
   */
  git_workspace_id?: string | null;
  /**
   * Epic 7 — pin/unpin a revision as the comparison baseline.
   * Tri-state: omit = leave, `null` = unpin, string = pin to that revision id.
   */
  baseline_revision_id?: string | null;
  /** Epic 7 — same semantics; marks the winner. */
  champion_revision_id?: string | null;
}): Promise<void> {
  return invoke("update_prompt", { input });
}

export function deletePrompt(id: string): Promise<void> {
  return invoke("delete_prompt", { id });
}

// ---------- Revisions ----------

export function saveRevision(input: {
  prompt_id: string;
  content: string;
  system_prompt?: string | null;
  model?: string | null;
  params?: Record<string, unknown> | null;
  note?: string | null;
}): Promise<Revision> {
  return invoke("save_revision", { input });
}

export function listRevisions(promptId: string): Promise<Revision[]> {
  return invoke("list_revisions", { promptId });
}

export function updateRevisionMeta(input: {
  id: string;
  note?: string;
  flagged?: boolean;
  rating?: number;
}): Promise<void> {
  return invoke("update_revision_meta", { input });
}

// ---------- Tags ----------

export function setPromptTags(input: {
  prompt_id: string;
  tags: string[];
}): Promise<string[]> {
  return invoke("set_prompt_tags", { input });
}

export function listAllTags(): Promise<string[]> {
  return invoke("list_all_tags");
}

// ---------- Outputs (results per revision) ----------

export function listOutputs(revisionId: string): Promise<RevisionOutput[]> {
  return invoke("list_outputs", { revisionId });
}

export function createOutput(input: {
  revision_id: string;
  label?: string | null;
  content: string;
  notes?: string | null;
  /** Epics 5 & 6 — tie this output to a multi-run / multi-provider batch. */
  run_group_id?: string | null;
}): Promise<RevisionOutput> {
  return invoke("create_output", { input });
}

export function updateOutput(input: {
  id: string;
  label?: string;
  content?: string;
  notes?: string;
  rating?: number;
}): Promise<void> {
  return invoke("update_output", { input });
}

export function deleteOutput(id: string): Promise<void> {
  return invoke("delete_output", { id });
}

// ---------- Branching ----------

export function createBranch(revisionId: string, branchName: string): Promise<Revision> {
  return invoke("create_branch", { revisionId, branchName });
}

export function listBranches(promptId: string): Promise<string[]> {
  return invoke("list_branches", { promptId });
}

// ---------- Environments ----------

export function promoteToEnv(promptId: string, envName: string, revisionId: string): Promise<void> {
  return invoke("promote_to_env", { promptId, envName, revisionId });
}

export function getEnvironments(promptId: string): Promise<{
  env_name: string;
  revision_id: string;
  revision_number: number;
  promoted_at: string;
}[]> {
  return invoke("get_environments", { promptId });
}

// ---------- A/B Testing ----------

export function createAbTest(
  promptId: string,
  name: string,
  variantRevisionIds: string[],
): Promise<string> {
  return invoke("create_ab_test", { promptId, name, variantRevisionIds });
}

export function getAbTests(promptId: string): Promise<{
  id: string;
  name: string;
  status: string;
  created_at: string;
  ended_at: string | null;
  variants: {
    id: string;
    revision_id: string;
    revision_number: number;
    weight: number;
    impressions: number;
    successes: number;
  }[];
}[]> {
  return invoke("get_ab_tests", { promptId });
}

export function recordAbImpression(variantId: string, success: boolean): Promise<void> {
  return invoke("record_ab_impression", { variantId, success });
}

// ---------- Tracing ----------

export function saveTrace(input: {
  prompt_id?: string | null;
  revision_id?: string | null;
  provider: string;
  model: string;
  input_messages: string;
  output: string;
  input_tokens?: number | null;
  output_tokens?: number | null;
  latency_ms?: number | null;
  cost_usd?: number | null;
  status?: string;
  error?: string | null;
  metadata?: string | null;
  /** Epics 5 & 6 — groups traces from one fan-out click. */
  run_group_id?: string | null;
  /** Epic 4 — 'live' (default), 'manual', or 'imported'. */
  source?: TraceSource;
  /** Epic 7 — shared id pairing baseline + candidate trace(s). */
  comparison_id?: string | null;
  /** Epic 7 — 'baseline' | 'candidate'. */
  comparison_side?: "baseline" | "candidate" | null;
}): Promise<string> {
  return invoke("save_trace", { input });
}

export interface TraceRow {
  id: string;
  prompt_id: string | null;
  revision_id: string | null;
  provider: string;
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  latency_ms: number | null;
  cost_usd: number | null;
  status: string;
  error: string | null;
  created_at: string;
  run_group_id: string | null;
  source: TraceSource;
  /** Epic 7. Present on both sides of a comparison; NULL otherwise. */
  comparison_id?: string | null;
  comparison_side?: "baseline" | "candidate" | null;
}

export function listTraces(promptId?: string | null, limit?: number): Promise<TraceRow[]> {
  return invoke("list_traces", { promptId: promptId ?? null, limit: limit ?? 100 });
}

/** Full trace rows for a single comparison, including `output` + `input_messages`. */
export interface ComparisonTrace extends TraceRow {
  output: string;
  input_messages: string;
}

export function getComparison(comparisonId: string): Promise<ComparisonTrace[]> {
  return invoke("get_comparison", { comparisonId });
}

// ---------- Eval Scores ----------

export function saveEvalScore(input: {
  revision_id: string;
  eval_name: string;
  score: number;
  details?: string | null;
  model?: string | null;
}): Promise<void> {
  return invoke("save_eval_score", { input });
}

export function getEvalScores(promptId: string): Promise<{
  id: string;
  revision_id: string;
  revision_number: number;
  eval_name: string;
  score: number;
  details: string | null;
  model: string | null;
  created_at: string;
}[]> {
  return invoke("get_eval_scores", { promptId });
}

// ---------- Chains ----------

export function listChains(): Promise<ChainWithSteps[]> {
  return invoke("list_chains");
}

export function createChain(input: {
  name: string;
  description?: string | null;
  folder_id?: string | null;
  prompt_ids: string[];
}): Promise<ChainWithSteps> {
  return invoke("create_chain", { input });
}

export function deleteChain(id: string): Promise<void> {
  return invoke("delete_chain", { id });
}

export function getChainContents(chainId: string): Promise<{
  prompt_id: string;
  title: string | null;
  content: string | null;
  system_prompt: string | null;
}[]> {
  return invoke("get_chain_contents", { chainId });
}

// ---------- Smart folders ----------

export function listRecentPrompts(limit?: number): Promise<PromptWithLatest[]> {
  return invoke("list_recent_prompts", { limit: limit ?? 20 });
}

export function listFlaggedPrompts(): Promise<PromptWithLatest[]> {
  return invoke("list_flagged_prompts");
}

export function getStats(): Promise<{
  total_prompts: number;
  total_revisions: number;
  total_outputs: number;
  total_folders: number;
  flagged_revisions: number;
  top_tags: { tag: string; count: number }[];
  most_revised: { title: string; revisions: number }[];
}> {
  return invoke("get_stats");
}

export function duplicatePrompt(promptId: string): Promise<PromptWithLatest> {
  return invoke("duplicate_prompt", { promptId });
}

// ---------- Search ----------

export function searchPrompts(query: string): Promise<SearchHit[]> {
  return invoke("search_prompts", { query });
}

// ---------- Export ----------

export function exportPromptToFile(input: {
  prompt_id: string;
  format: string;
  path: string;
}): Promise<void> {
  return invoke("export_prompt_to_file", { input });
}

export function writeTextFile(path: string, content: string): Promise<void> {
  return invoke("write_text_file", { input: { path, content } });
}

// ---------- Reorder (DnD) ----------

export function reorderFolders(
  items: { id: string; sort_order: number }[]
): Promise<void> {
  return invoke("reorder_folders", { items });
}

export function reorderPrompts(
  items: { id: string; sort_order: number }[]
): Promise<void> {
  return invoke("reorder_prompts", { items });
}

export function movePromptToFolder(
  promptId: string,
  folderId: string
): Promise<void> {
  return invoke("move_prompt_to_folder", { promptId, folderId });
}

// ---------- Settings ----------

export function getSettings(): Promise<AppSettings> {
  return invoke("get_settings");
}

export function updateSettings(input: {
  mode?: AppMode;
  airgap_enabled?: boolean;
  first_run_completed?: boolean;
  theme?: Theme;
}): Promise<AppSettings> {
  return invoke("update_settings", { input });
}

// ---------- Git workspaces (Epic 2) ----------

export function listGitWorkspaces(): Promise<GitWorkspace[]> {
  return invoke("list_git_workspaces");
}

export function createGitWorkspace(input: {
  name: string;
  path: string;
  push_policy?: string;
  default_remote?: string;
  default_branch?: string;
}): Promise<GitWorkspace> {
  return invoke("create_git_workspace", { input });
}

export function deleteGitWorkspace(id: string): Promise<void> {
  return invoke("delete_git_workspace", { id });
}

export function gitWorkspaceStatus(id: string): Promise<GitWorkspaceStatus> {
  return invoke("git_workspace_status", { id });
}

/**
 * Commit the given revision of a prompt into its linked Git workspace.
 * Returns the commit OID, or `null` if the rendered file hadn't changed
 * since the last commit (idempotent no-op).
 */
export function commitPromptRevision(
  promptId: string,
  revisionNumber: number
): Promise<string | null> {
  return invoke("commit_prompt_revision", { promptId, revisionNumber });
}
