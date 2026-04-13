import { create } from "zustand";
import * as api from "./api";
import { scanForSecrets, hasHighConfidenceSecrets } from "./lib/secrets";
import { loadApiKeys } from "./lib/providers";
import { toast } from "./components/Toast";
import type {
  AppSettings,
  Folder,
  PromptWithLatest,
  Revision,
  RevisionOutput,
  CustomFeatures,
} from "./types";

interface AppStore {
  // bootstrap
  initialized: boolean;
  bootstrap: () => Promise<void>;

  // settings
  settings: AppSettings | null;
  updateSettings: (patch: Partial<{
    mode: AppSettings["mode"];
    custom_features: AppSettings["custom_features"];
    airgap_enabled: boolean;
    first_run_completed: boolean;
    theme: AppSettings["theme"];
  }>) => Promise<void>;

  // folders
  folders: Folder[];
  refreshFolders: () => Promise<void>;
  createFolder: (name: string, parentId: string | null) => Promise<Folder>;
  updateFolderMeta: (patch: {
    id: string;
    name?: string;
    color?: string;
    icon?: string;
    sensitive?: boolean;
  }) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;

  // selected folder / prompt
  selectedFolderId: string | null;
  selectFolder: (id: string | null) => Promise<void>;

  // prompts (for current folder or all)
  prompts: PromptWithLatest[];
  refreshPrompts: () => Promise<void>;
  createPrompt: (title: string) => Promise<PromptWithLatest>;
  updatePromptMeta: (patch: {
    id: string;
    title?: string;
    description?: string;
    folder_id?: string;
  }) => Promise<void>;
  setPromptTags: (promptId: string, tags: string[]) => Promise<void>;
  deletePrompt: (id: string) => Promise<void>;

  selectedPromptId: string | null;
  selectPrompt: (id: string | null) => Promise<void>;

  // smart folder view
  smartView: "folder" | "recent" | "flagged" | "all" | null;
  setSmartView: (view: "recent" | "flagged" | "all") => Promise<void>;
  clearSmartView: () => void;

  // tag filter + all tags registry
  tagFilter: string | null;
  setTagFilter: (tag: string) => void;
  clearTagFilter: () => void;
  allTags: string[];
  refreshAllTags: () => Promise<void>;

  // duplicate
  duplicatePrompt: (promptId: string) => Promise<void>;

  // active prompt details
  activePrompt: PromptWithLatest | null;
  revisions: Revision[];
  refreshRevisions: () => Promise<void>;

  // revision meta editing
  updateRevisionMeta: (patch: {
    id: string;
    note?: string;
    flagged?: boolean;
    rating?: number;
  }) => Promise<void>;

  // outputs — results per revision
  outputs: RevisionOutput[];
  refreshOutputs: () => Promise<void>;
  addOutput: (label?: string) => Promise<RevisionOutput | null>;
  updateOutput: (patch: {
    id: string;
    label?: string;
    content?: string;
    notes?: string;
    rating?: number;
  }) => Promise<void>;
  deleteOutput: (id: string) => Promise<void>;

  // selected revision (for viewing older)
  viewingRevisionId: string | null;
  viewRevision: (id: string | null) => Promise<void>;

  // editor draft state (unsaved content)
  draftContent: string;
  draftSystemPrompt: string;
  draftModel: string;
  draftParams: Record<string, unknown>;
  setDraft: (patch: Partial<{
    content: string;
    systemPrompt: string;
    model: string;
    params: Record<string, unknown>;
  }>) => void;
  hasUnsavedChanges: () => boolean;
  saveDraft: (note?: string) => Promise<Revision | null>;
  discardDraft: () => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  initialized: false,

  async bootstrap() {
    const [settings, folders, allTags] = await Promise.all([
      api.getSettings(),
      api.listFolders(),
      api.listAllTags(),
      loadApiKeys(), // Load API keys from OS keychain into memory
    ]);
    set({
      settings,
      folders,
      allTags,
      initialized: true,
    });
    document.documentElement.classList.toggle("dark", settings.theme === "dark");

    // If there are folders, select the first one and load its prompts
    if (folders.length > 0) {
      await get().selectFolder(folders[0].id);
    } else {
      await get().refreshPrompts();
    }
  },

  settings: null,
  async updateSettings(patch) {
    const next = await api.updateSettings(patch);
    set({ settings: next });
    document.documentElement.classList.toggle("dark", next.theme === "dark");
  },

  folders: [],
  async refreshFolders() {
    const folders = await api.listFolders();
    set({ folders });
  },
  async createFolder(name, parentId) {
    const folder = await api.createFolder({
      name,
      parent_id: parentId,
      color: defaultColorForIndex(get().folders.length),
      icon: "folder",
    });
    await get().refreshFolders();
    await get().selectFolder(folder.id);
    return folder;
  },
  async updateFolderMeta(patch) {
    await api.updateFolder(patch);
    await get().refreshFolders();
  },
  async deleteFolder(id) {
    await api.deleteFolder(id);
    const selected = get().selectedFolderId === id ? null : get().selectedFolderId;
    set({ selectedFolderId: selected });
    await get().refreshFolders();
    await get().refreshPrompts();
  },

  selectedFolderId: null,
  async selectFolder(id) {
    set({
      selectedFolderId: id,
      selectedPromptId: null,
      activePrompt: null,
      revisions: [],
      outputs: [],
      draftContent: "",
      draftSystemPrompt: "",
      draftModel: "",
      draftParams: {},
      viewingRevisionId: null,
    });
    await get().refreshPrompts();
    // Auto-select first prompt in folder
    const prompts = get().prompts;
    if (prompts.length > 0) {
      await get().selectPrompt(prompts[0].prompt.id);
    }
  },

  prompts: [],
  async refreshPrompts() {
    const prompts = await api.listPrompts(get().selectedFolderId);
    set({ prompts });
  },
  async createPrompt(title) {
    const created = await api.createPrompt({
      title,
      folder_id: get().selectedFolderId,
      initial_content: "",
    });
    await get().refreshPrompts();
    await get().selectPrompt(created.prompt.id);
    return created;
  },
  async updatePromptMeta(patch) {
    await api.updatePrompt(patch);
    await get().refreshPrompts();
    // If the updated prompt is the active one, refresh its details
    if (get().selectedPromptId === patch.id) {
      const active = await api.getPrompt(patch.id);
      set({ activePrompt: active });
    }
  },
  async setPromptTags(promptId, tags) {
    await api.setPromptTags({ prompt_id: promptId, tags });
    await get().refreshPrompts();
    await get().refreshAllTags();
    if (get().selectedPromptId === promptId) {
      const active = await api.getPrompt(promptId);
      set({ activePrompt: active });
    }
    // If the filtered tag is no longer used anywhere, clear the filter
    const currentFilter = get().tagFilter;
    if (currentFilter && !get().allTags.includes(currentFilter)) {
      set({ tagFilter: null });
    }
  },
  async duplicatePrompt(promptId) {
    const created = await api.duplicatePrompt(promptId);
    await get().refreshPrompts();
    await get().selectPrompt(created.prompt.id);
  },
  async deletePrompt(id) {
    await api.deletePrompt(id);
    if (get().selectedPromptId === id) {
      set({ selectedPromptId: null, activePrompt: null, revisions: [] });
    }
    await get().refreshPrompts();
  },

  smartView: null,
  async setSmartView(view) {
    set({
      smartView: view,
      selectedFolderId: null,
      selectedPromptId: null,
      activePrompt: null,
      revisions: [],
      outputs: [],
      tagFilter: null,
    });
    let prompts: PromptWithLatest[] = [];
    if (view === "recent") {
      prompts = await api.listRecentPrompts(30);
    } else if (view === "flagged") {
      prompts = await api.listFlaggedPrompts();
    } else if (view === "all") {
      prompts = await api.listPrompts(null);
    }
    set({ prompts });
    if (prompts.length > 0) {
      await get().selectPrompt(prompts[0].prompt.id);
    }
  },
  clearSmartView() {
    set({ smartView: null });
  },

  tagFilter: null,
  setTagFilter(tag) {
    set({ tagFilter: tag });
  },
  clearTagFilter() {
    set({ tagFilter: null });
  },
  allTags: [],
  async refreshAllTags() {
    try {
      const tags = await api.listAllTags();
      set({ allTags: tags });
    } catch (err) {
      console.error("refreshAllTags failed", err);
    }
  },

  selectedPromptId: null,
  async selectPrompt(id) {
    if (!id) {
      set({
        selectedPromptId: null,
        activePrompt: null,
        revisions: [],
        outputs: [],
        draftContent: "",
        draftSystemPrompt: "",
        draftModel: "",
        draftParams: {},
        viewingRevisionId: null,
      });
      return;
    }
    const active = await api.getPrompt(id);
    const revisions = await api.listRevisions(id);
    const latest = active.latest_revision;
    const outputs = latest ? await api.listOutputs(latest.id) : [];

    // Check for crash-recovered draft in localStorage
    let draftContent = latest?.content ?? "";
    let draftSystemPrompt = latest?.system_prompt ?? "";
    let draftModel = latest?.model ?? "";
    let draftParams = latest?.params ?? {};
    let recoveredDraft = false;

    try {
      const saved = localStorage.getItem(`pn:draft:${id}`);
      if (saved) {
        const draft = JSON.parse(saved);
        const latestTime = latest ? new Date(latest.created_at).getTime() : 0;
        // Only restore if the draft is newer than the latest revision
        if (draft.savedAt > latestTime && draft.content !== (latest?.content ?? "")) {
          draftContent = draft.content;
          draftSystemPrompt = draft.systemPrompt ?? draftSystemPrompt;
          draftModel = draft.model ?? draftModel;
          draftParams = draft.params ?? draftParams;
          recoveredDraft = true;
        } else {
          // Draft is stale, clean it up
          localStorage.removeItem(`pn:draft:${id}`);
        }
      }
    } catch { /* ignore parse errors */ }

    set({
      selectedPromptId: id,
      activePrompt: active,
      revisions,
      outputs,
      draftContent,
      draftSystemPrompt,
      draftModel,
      draftParams,
      viewingRevisionId: null,
    });

    if (recoveredDraft) {
      toast("Unsaved draft recovered", "info");
    }
  },

  activePrompt: null,
  revisions: [],
  async refreshRevisions() {
    const id = get().selectedPromptId;
    if (!id) return;
    const revisions = await api.listRevisions(id);
    set({ revisions });
  },

  async updateRevisionMeta(patch) {
    await api.updateRevisionMeta(patch);
    await get().refreshRevisions();
    // If the latest revision's meta changed, refresh the active prompt too
    const active = get().activePrompt;
    if (active?.latest_revision?.id === patch.id && get().selectedPromptId) {
      const refreshed = await api.getPrompt(get().selectedPromptId!);
      set({ activePrompt: refreshed });
    }
  },

  outputs: [],
  async refreshOutputs() {
    const state = get();
    const targetRevisionId =
      state.viewingRevisionId ?? state.activePrompt?.latest_revision?.id ?? null;
    if (!targetRevisionId) {
      set({ outputs: [] });
      return;
    }
    const outputs = await api.listOutputs(targetRevisionId);
    set({ outputs });
  },
  async addOutput(label) {
    const state = get();
    const targetRevisionId =
      state.viewingRevisionId ?? state.activePrompt?.latest_revision?.id ?? null;
    if (!targetRevisionId) return null;
    const created = await api.createOutput({
      revision_id: targetRevisionId,
      label: label ?? null,
      content: "",
    });
    await get().refreshOutputs();
    return created;
  },
  async updateOutput(patch) {
    await api.updateOutput(patch);
    // Optimistic local update to avoid flicker
    set((s) => ({
      outputs: s.outputs.map((o) =>
        o.id === patch.id
          ? {
              ...o,
              label: patch.label !== undefined ? patch.label : o.label,
              content: patch.content !== undefined ? patch.content : o.content,
              notes: patch.notes !== undefined ? patch.notes : o.notes,
              rating: patch.rating !== undefined ? patch.rating : o.rating,
            }
          : o
      ),
    }));
  },
  async deleteOutput(id) {
    await api.deleteOutput(id);
    set((s) => ({ outputs: s.outputs.filter((o) => o.id !== id) }));
  },

  viewingRevisionId: null,
  async viewRevision(id) {
    set({ viewingRevisionId: id });
    await get().refreshOutputs();
  },

  draftContent: "",
  draftSystemPrompt: "",
  draftModel: "",
  draftParams: {},
  setDraft(patch) {
    set((state) => {
      const next = {
        draftContent: patch.content ?? state.draftContent,
        draftSystemPrompt: patch.systemPrompt ?? state.draftSystemPrompt,
        draftModel: patch.model ?? state.draftModel,
        draftParams: patch.params ?? state.draftParams,
      };
      // Auto-save draft to localStorage (crash recovery)
      const pid = state.selectedPromptId;
      if (pid) {
        clearTimeout((globalThis as any).__draftSaveTimer);
        (globalThis as any).__draftSaveTimer = setTimeout(() => {
          try {
            localStorage.setItem(
              `pn:draft:${pid}`,
              JSON.stringify({
                content: next.draftContent,
                systemPrompt: next.draftSystemPrompt,
                model: next.draftModel,
                params: next.draftParams,
                savedAt: Date.now(),
              })
            );
          } catch { /* localStorage full — ignore */ }
        }, 500);
      }
      return next;
    });
  },
  hasUnsavedChanges() {
    const state = get();
    const latest = state.activePrompt?.latest_revision;
    if (!latest) {
      return state.draftContent.length > 0 || state.draftSystemPrompt.length > 0;
    }
    return (
      latest.content !== state.draftContent ||
      (latest.system_prompt ?? "") !== state.draftSystemPrompt ||
      (latest.model ?? "") !== state.draftModel ||
      JSON.stringify(latest.params ?? {}) !== JSON.stringify(state.draftParams)
    );
  },
  async saveDraft(note?: string) {
    const state = get();
    if (!state.selectedPromptId) return null;
    if (!state.hasUnsavedChanges()) return null;

    // Secret leak detection — warn before saving
    const fullText = state.draftContent + "\n" + state.draftSystemPrompt;
    const warnings = scanForSecrets(fullText);
    if (hasHighConfidenceSecrets(warnings)) {
      const summary = warnings
        .slice(0, 5)
        .map((w) => `• ${w.type} (line ${w.line}): ${w.match}`)
        .join("\n");
      const proceed = confirm(
        `⚠️ Possible secrets detected:\n\n${summary}\n\nDo you still want to save?`
      );
      if (!proceed) return null;
    }

    const rev = await api.saveRevision({
      prompt_id: state.selectedPromptId,
      content: state.draftContent,
      system_prompt: state.draftSystemPrompt || null,
      model: state.draftModel || null,
      params: state.draftParams,
      note: note?.trim() || null,
    });
    // Refresh active prompt, revisions and outputs (new revision has none yet)
    const active = await api.getPrompt(state.selectedPromptId);
    const revisions = await api.listRevisions(state.selectedPromptId);
    const outputs = active.latest_revision
      ? await api.listOutputs(active.latest_revision.id)
      : [];
    set({ activePrompt: active, revisions, outputs, viewingRevisionId: null });
    await get().refreshPrompts();
    // Clear the crash-recovery draft since we saved successfully
    try { localStorage.removeItem(`pn:draft:${state.selectedPromptId}`); } catch {}
    toast(`Revision #${rev.revision_number} saved`, "success");
    return rev;
  },
  discardDraft() {
    const latest = get().activePrompt?.latest_revision;
    set({
      draftContent: latest?.content ?? "",
      draftSystemPrompt: latest?.system_prompt ?? "",
      draftModel: latest?.model ?? "",
      draftParams: latest?.params ?? {},
    });
  },
}));

const PALETTE = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#14b8a6",
  "#ec4899",
  "#eab308",
];

function defaultColorForIndex(index: number): string {
  return PALETTE[index % PALETTE.length];
}

export function useActiveFeatures(): CustomFeatures {
  const settings = useAppStore((s) => s.settings);
  if (!settings) {
    return {
      showVariables: false,
      showPlayground: false,
      showSystemPrompt: false,
      showMetadata: false,
      showResults: false,
      showBatchEvals: false,
      showCompressor: false,
    };
  }

  if (settings.mode === "basic") {
    return {
      showVariables: false,
      showPlayground: false,
      showSystemPrompt: false,
      showMetadata: false,
      showResults: false,
      showBatchEvals: false,
      showCompressor: false,
    };
  }

  if (settings.mode === "advanced") {
    return {
      showVariables: true,
      showPlayground: true,
      showSystemPrompt: true,
      showMetadata: false,
      showResults: true,
      showBatchEvals: false,
      showCompressor: true,
    };
  }

  if (settings.mode === "engineer") {
    return {
      showVariables: true,
      showPlayground: true,
      showSystemPrompt: true,
      showMetadata: true,
      showResults: true,
      showBatchEvals: true,
      showCompressor: true,
    };
  }

  return {
    ...settings.custom_features,
    showCompressor: settings.custom_features.showCompressor ?? true,
  };
}
