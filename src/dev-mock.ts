// Dev-only mock for Tauri `invoke`. Activates in `pnpm dev` when running
// outside the Tauri shell (e.g. plain browser preview). Never loaded in
// a production bundle — guarded by `import.meta.env.DEV` in main.tsx.
//
// Intended for documentation screenshots only; do not rely on this
// producing realistic data for feature development.

type Cmd = string;
type Args = Record<string, unknown> | undefined;

const now = () => new Date().toISOString();
const iso = (daysAgo: number) =>
  new Date(Date.now() - daysAgo * 86_400_000).toISOString();

// --- Seed data ------------------------------------------------------------

const folders = [
  { id: "f_writing", parent_id: null, name: "Writing", color: "#3b82f6", icon: "folder", sort_order: 0, sensitive: false, created_at: iso(40) },
  { id: "f_code", parent_id: null, name: "Code review", color: "#10b981", icon: "folder", sort_order: 1, sensitive: false, created_at: iso(30) },
  { id: "f_research", parent_id: null, name: "Research", color: "#a855f7", icon: "folder", sort_order: 2, sensitive: false, created_at: iso(20) },
  { id: "f_support", parent_id: null, name: "Support replies", color: "#f59e0b", icon: "folder", sort_order: 3, sensitive: false, created_at: iso(14) },
  { id: "f_drafts", parent_id: null, name: "Drafts", color: "#ec4899", icon: "folder", sort_order: 4, sensitive: false, created_at: iso(7) },
];

const tagsByPrompt: Record<string, string[]> = {
  p_blog: ["marketing", "long-form"],
  p_release: ["marketing"],
  p_pr: ["engineering", "review"],
  p_bug: ["engineering", "triage"],
  p_paper: ["research", "summaries"],
  p_meta: ["research"],
  p_support: ["support", "empathy"],
  p_title: ["drafts"],
};

const prompts: Record<string, any> = {
  p_blog: {
    prompt: { id: "p_blog", folder_id: "f_writing", title: "Blog post outliner", description: "Builds a tight outline for a technical blog post from a rough brief.", created_at: iso(38), updated_at: iso(1) },
    latest: {
      id: "r_blog_3", prompt_id: "p_blog", revision_number: 3,
      content: "You are a senior technical editor. Given the brief below, produce a clean outline with:\n\n1. A single-sentence thesis\n2. Three main sections, each with 2–3 sub-points\n3. A closing call-to-action tied to the thesis\n\nKeep the tone confident but not salesy.\n\nBrief:\n{{brief}}",
      system_prompt: "You are a pragmatic editor who favours concrete examples over abstractions.",
      model: "anthropic/claude-3-5-sonnet", params: { temperature: 0.6, max_tokens: 1200 },
      note: "Added closing CTA rule after the last draft landed flat.",
      flagged: false, rating: 4, created_at: iso(1),
    },
    revision_count: 3,
  },
  p_release: {
    prompt: { id: "p_release", folder_id: "f_writing", title: "Release note writer", description: "Turns raw changelog bullets into a reader-friendly release post.", created_at: iso(35), updated_at: iso(4) },
    latest: {
      id: "r_release_2", prompt_id: "p_release", revision_number: 2,
      content: "Rewrite these changelog bullets as a single short release note (≤180 words).\nGroup related changes. Lead with the most user-visible item.\n\nBullets:\n{{bullets}}",
      system_prompt: null, model: "openai/gpt-4o-mini", params: { temperature: 0.4 },
      note: null, flagged: false, rating: 5, created_at: iso(4),
    },
    revision_count: 2,
  },
  p_pr: {
    prompt: { id: "p_pr", folder_id: "f_code", title: "PR reviewer", description: "Reviews a diff and surfaces the 3 most impactful things to change.", created_at: iso(28), updated_at: iso(0) },
    latest: {
      id: "r_pr_5", prompt_id: "p_pr", revision_number: 5,
      content: "You are reviewing a pull request. Output exactly three sections:\n\n- What's good\n- What must change before merge\n- Nits (optional)\n\nFor 'must change' items, quote the offending code and explain the fix in one sentence.\n\nDiff:\n{{diff}}",
      system_prompt: "Be direct. Don't hedge. Flag correctness bugs above style.",
      model: "anthropic/claude-3-5-sonnet", params: { temperature: 0.2, max_tokens: 1500 },
      note: "v5: dropped the 'overall rating' section — reviewers found it noisy.",
      flagged: true, rating: 5, created_at: iso(0),
    },
    revision_count: 5,
  },
  p_bug: {
    prompt: { id: "p_bug", folder_id: "f_code", title: "Bug triager", description: "Classifies an incoming bug report into severity + area.", created_at: iso(25), updated_at: iso(6) },
    latest: {
      id: "r_bug_2", prompt_id: "p_bug", revision_number: 2,
      content: "Given the bug report below, return JSON with fields:\n- severity: one of [sev1, sev2, sev3, sev4]\n- area: one of [frontend, backend, infra, unknown]\n- customer_facing: boolean\n- one_line: string\n\nReport:\n{{report}}",
      system_prompt: null, model: "local/llama3.1-8b-instruct", params: { temperature: 0 },
      note: null, flagged: false, rating: 3, created_at: iso(6),
    },
    revision_count: 2,
  },
  p_paper: {
    prompt: { id: "p_paper", folder_id: "f_research", title: "Paper summariser", description: "One-paragraph TL;DR plus three questions to ask the authors.", created_at: iso(18), updated_at: iso(2) },
    latest: {
      id: "r_paper_4", prompt_id: "p_paper", revision_number: 4,
      content: "Summarise this paper in one paragraph (≤120 words). Then list three sharp questions you'd ask the authors.\n\nPaper:\n{{paper_text}}",
      system_prompt: "You are a sceptical but charitable reader.",
      model: "anthropic/claude-3-5-sonnet", params: { temperature: 0.5 },
      note: null, flagged: false, rating: 4, created_at: iso(2),
    },
    revision_count: 4,
  },
  p_meta: {
    prompt: { id: "p_meta", folder_id: "f_research", title: "Meta-analysis notes", description: "Extracts method + limitations from a stack of papers.", created_at: iso(15), updated_at: iso(5) },
    latest: {
      id: "r_meta_1", prompt_id: "p_meta", revision_number: 1,
      content: "For each paper below, extract: method, dataset, claimed result, and stated limitations. Return as a markdown table.\n\n{{papers}}",
      system_prompt: null, model: null, params: {},
      note: null, flagged: false, rating: null, created_at: iso(15),
    },
    revision_count: 1,
  },
  p_support: {
    prompt: { id: "p_support", folder_id: "f_support", title: "Support reply — refund", description: "Drafts an empathetic refund-request reply in our house voice.", created_at: iso(11), updated_at: iso(3) },
    latest: {
      id: "r_support_3", prompt_id: "p_support", revision_number: 3,
      content: "Draft a reply to a customer who is requesting a refund. Acknowledge the frustration, explain the refund policy in plain English, and offer one concrete next step. Keep it under 140 words.\n\nCustomer message:\n{{message}}",
      system_prompt: "Our voice: warm, direct, never corporate. First name only. No 'we apologise for any inconvenience'.",
      model: "openai/gpt-4o", params: { temperature: 0.6 },
      note: "Tightened the 'offer a next step' sentence after Priya's feedback.",
      flagged: false, rating: 5, created_at: iso(3),
    },
    revision_count: 3,
  },
  p_title: {
    prompt: { id: "p_title", folder_id: "f_drafts", title: "Title brainstormer (v2)", description: "Generates five candidate titles with a one-line rationale each.", created_at: iso(6), updated_at: iso(6) },
    latest: {
      id: "r_title_1", prompt_id: "p_title", revision_number: 1,
      content: "Given the abstract, generate 5 candidate titles. For each, include a one-line rationale and a tone label (serious / punchy / quiet).\n\nAbstract:\n{{abstract}}",
      system_prompt: null, model: null, params: {},
      note: null, flagged: false, rating: null, created_at: iso(6),
    },
    revision_count: 1,
  },
};

const revisionsByPrompt: Record<string, any[]> = {
  p_pr: [
    { id: "r_pr_1", prompt_id: "p_pr", revision_number: 1, content: "Review this PR. List the problems.\n\n{{diff}}", system_prompt: null, model: null, params: {}, note: "Initial", flagged: false, rating: 2, created_at: iso(28) },
    { id: "r_pr_2", prompt_id: "p_pr", revision_number: 2, content: "You are reviewing a pull request. List issues by severity.\n\n{{diff}}", system_prompt: null, model: null, params: {}, note: "Added severity", flagged: false, rating: 3, created_at: iso(22) },
    { id: "r_pr_3", prompt_id: "p_pr", revision_number: 3, content: "Reviewing a PR. Output three sections: good, must-fix, nits.\n\n{{diff}}", system_prompt: "Be direct.", model: "anthropic/claude-3-5-sonnet", params: { temperature: 0.3 }, note: "Three-section format", flagged: false, rating: 4, created_at: iso(14) },
    { id: "r_pr_4", prompt_id: "p_pr", revision_number: 4, content: "You are reviewing a pull request. Output exactly three sections: good, must-change (with quotes + fix), nits.\n\n{{diff}}", system_prompt: "Be direct. Flag correctness bugs above style.", model: "anthropic/claude-3-5-sonnet", params: { temperature: 0.2, max_tokens: 1500 }, note: "Require code quotes for must-fix items", flagged: true, rating: 4, created_at: iso(4) },
    prompts.p_pr.latest,
  ],
  p_blog: [
    { id: "r_blog_1", prompt_id: "p_blog", revision_number: 1, content: "Outline this post.\n\n{{brief}}", system_prompt: null, model: null, params: {}, note: null, flagged: false, rating: 2, created_at: iso(38) },
    { id: "r_blog_2", prompt_id: "p_blog", revision_number: 2, content: "Outline this technical post: thesis, 3 sections with sub-points.\n\n{{brief}}", system_prompt: null, model: "anthropic/claude-3-5-sonnet", params: { temperature: 0.7 }, note: "Added structure", flagged: false, rating: 3, created_at: iso(15) },
    prompts.p_blog.latest,
  ],
};

const outputsByRevision: Record<string, any[]> = {
  r_pr_5: [
    { id: "o_pr_1", revision_id: "r_pr_5", label: "Small refactor PR", content: "**What's good**\n- Clean extract of the pricing helper.\n- Tests updated alongside the change.\n\n**What must change before merge**\n- `applyDiscount` mutates the cart instead of returning a new one — break downstream memoisation. Quote: `cart.total -= cart.total * d`. Fix: return `{ ...cart, total: cart.total * (1 - d) }`.\n\n**Nits**\n- Prefer `const` over `let` in the loop body.", notes: "Gold — matches what I would've written.", rating: 5, sort_order: 0, created_at: iso(0) },
    { id: "o_pr_2", revision_id: "r_pr_5", label: "Database migration PR", content: "**What's good**\n- Migration is reversible.\n- The backfill runs in batches.\n\n**What must change before merge**\n- Missing index on `user_id`. Post-migration queries will do a full scan on a 50M-row table.\n- The backfill uses `UPDATE ... WHERE id IN (...)` without a lock window. Prefer `SELECT ... FOR UPDATE SKIP LOCKED`.\n\n**Nits**\n- Column name `is_deleted` over `deleted` for consistency.", notes: "Hit both real issues. Keep.", rating: 5, sort_order: 1, created_at: iso(0) },
    { id: "o_pr_3", revision_id: "r_pr_5", label: "Style-only PR", content: "**What's good**\n- Purely cosmetic, no behaviour change.\n\n**What must change before merge**\n- Nothing blocking.\n\n**Nits**\n- `className` ordering is inconsistent with the rest of the file.", notes: "Correctly quiet on a quiet PR.", rating: 4, sort_order: 2, created_at: iso(0) },
  ],
  r_blog_3: [
    { id: "o_blog_1", revision_id: "r_blog_3", label: "Kubernetes post brief", content: "**Thesis**: Most k8s pain comes from running stateful workloads the way you'd run stateless ones.\n\n**Section 1 — Why state is different**\n- PVs, StorageClasses, and the AZ trap\n- StatefulSets vs Deployments: the reconcile loop difference\n\n**Section 2 — The failure modes teams hit**\n- Volume binding across AZ boundaries\n- Rolling updates that outpace replication\n- Operators that mask the underlying state\n\n**Section 3 — What actually works**\n- Pin pods to AZs, accept the capacity cost\n- Backups, not snapshots\n- Runbooks owned by on-call, not the platform team\n\n**CTA**: If you operate stateful workloads on k8s, read the two-page runbook template we linked below before your next deploy.", notes: "Ships as-is.", rating: 5, sort_order: 0, created_at: iso(1) },
  ],
  r_support_3: [
    { id: "o_sup_1", revision_id: "r_support_3", label: "Sample: angry first-week user", content: "Hi Miguel — really sorry the first week didn't land for you. Your refund is on its way and should show up in your account within 3–5 business days. If anything about that doesn't happen the way I've described, reply here and I'll chase it down personally.", notes: "This is exactly the voice we want.", rating: 5, sort_order: 0, created_at: iso(3) },
  ],
};

const traces = [
  { id: "t_1", prompt_id: "p_pr", revision_id: "r_pr_5", provider: "anthropic", model: "claude-3-5-sonnet", input_tokens: 1243, output_tokens: 612, latency_ms: 3100, cost_usd: 0.014, status: "ok", error: null, created_at: iso(0) },
  { id: "t_2", prompt_id: "p_blog", revision_id: "r_blog_3", provider: "anthropic", model: "claude-3-5-sonnet", input_tokens: 820, output_tokens: 540, latency_ms: 2650, cost_usd: 0.011, status: "ok", error: null, created_at: iso(1) },
  { id: "t_3", prompt_id: "p_support", revision_id: "r_support_3", provider: "openai", model: "gpt-4o", input_tokens: 380, output_tokens: 145, latency_ms: 1800, cost_usd: 0.004, status: "ok", error: null, created_at: iso(3) },
  { id: "t_4", prompt_id: "p_release", revision_id: "r_release_2", provider: "openai", model: "gpt-4o-mini", input_tokens: 210, output_tokens: 190, latency_ms: 1240, cost_usd: 0.0009, status: "ok", error: null, created_at: iso(4) },
  { id: "t_5", prompt_id: "p_bug", revision_id: "r_bug_2", provider: "local", model: "llama3.1-8b-instruct", input_tokens: 320, output_tokens: 80, latency_ms: 820, cost_usd: 0, status: "ok", error: null, created_at: iso(6) },
];

const abTests = [
  {
    id: "ab_1", name: "Three-section format vs free-form", status: "running",
    created_at: iso(5), ended_at: null,
    variants: [
      { id: "v1", revision_id: "r_pr_3", revision_number: 3, weight: 0.5, impressions: 18, successes: 13 },
      { id: "v2", revision_id: "r_pr_5", revision_number: 5, weight: 0.5, impressions: 22, successes: 20 },
    ],
  },
];

const evalScores = [
  { id: "e_1", revision_id: "r_pr_5", revision_number: 5, eval_name: "groundedness", score: 0.92, details: null, model: "claude-3-5-sonnet", created_at: iso(0) },
  { id: "e_2", revision_id: "r_pr_5", revision_number: 5, eval_name: "concise", score: 0.88, details: null, model: "claude-3-5-sonnet", created_at: iso(0) },
  { id: "e_3", revision_id: "r_blog_3", revision_number: 3, eval_name: "tone-match", score: 0.81, details: null, model: "claude-3-5-sonnet", created_at: iso(1) },
];

const chains = [
  {
    chain: { id: "c_1", name: "Brief → Outline → Draft → Polish", description: "Full blog-post pipeline from a rough brief.", folder_id: "f_writing", created_at: iso(12), updated_at: iso(2) },
    steps: [
      { id: "s_1", chain_id: "c_1", prompt_id: "p_blog", prompt_title: "Blog post outliner", step_order: 0, transform: null, created_at: iso(12) },
    ],
  },
];

function withTags(id: string) {
  const p = prompts[id];
  return {
    prompt: p.prompt,
    latest_revision: p.latest,
    revision_count: p.revision_count,
    tags: tagsByPrompt[id] ?? [],
  };
}

// --- Invoke router -------------------------------------------------------

async function invokeMock(cmd: Cmd, args: Args): Promise<unknown> {
  // Bootstrap
  if (cmd === "get_settings") {
    return {
      mode: "engineer",
      custom_features: {
        showVariables: true, showPlayground: true, showSystemPrompt: true,
        showMetadata: true, showResults: true, showBatchEvals: true, showCompressor: true,
      },
      airgap_enabled: false,
      first_run_completed: true,
      theme: "dark",
    };
  }
  if (cmd === "update_settings") {
    return (args as any)?.input ?? {};
  }
  if (cmd === "list_folders") return folders;
  if (cmd === "list_all_tags") return ["marketing", "long-form", "engineering", "review", "triage", "research", "summaries", "support", "empathy", "drafts"];

  // Prompts
  if (cmd === "list_prompts") {
    const fid = (args as any)?.folderId ?? null;
    const ids = Object.keys(prompts).filter((id) => prompts[id].prompt.folder_id === fid || fid === null);
    return ids.map(withTags);
  }
  if (cmd === "get_prompt") {
    const id = (args as any)?.id as string;
    return withTags(id);
  }
  if (cmd === "list_recent_prompts") {
    return Object.keys(prompts).map(withTags);
  }
  if (cmd === "list_flagged_prompts") {
    return Object.keys(prompts).filter((id) => prompts[id].latest?.flagged).map(withTags);
  }

  // Revisions + outputs
  if (cmd === "list_revisions") {
    const pid = (args as any)?.promptId as string;
    return revisionsByPrompt[pid] ?? [prompts[pid]?.latest].filter(Boolean);
  }
  if (cmd === "list_outputs") {
    const rid = (args as any)?.revisionId as string;
    return outputsByRevision[rid] ?? [];
  }
  if (cmd === "save_revision" || cmd === "update_revision_meta" || cmd === "create_output" || cmd === "update_output" || cmd === "delete_output") {
    return {};
  }

  // Search
  if (cmd === "search_prompts") {
    const q = String((args as any)?.query ?? "").toLowerCase();
    return Object.keys(prompts)
      .filter((id) => prompts[id].prompt.title.toLowerCase().includes(q) || prompts[id].latest?.content?.toLowerCase?.().includes(q))
      .map((id) => ({
        prompt_id: id,
        title: prompts[id].prompt.title,
        description: prompts[id].prompt.description,
        snippet: (prompts[id].latest?.content ?? "").slice(0, 140),
        folder_id: prompts[id].prompt.folder_id,
      }));
  }

  // Tags
  if (cmd === "set_prompt_tags") {
    return ((args as any)?.input?.tags as string[]) ?? [];
  }

  // Stats / analytics
  if (cmd === "get_stats") {
    return {
      total_prompts: Object.keys(prompts).length,
      total_revisions: Object.values(revisionsByPrompt).reduce((n, list) => n + list.length, 2),
      total_outputs: Object.values(outputsByRevision).reduce((n, list) => n + list.length, 0),
      total_folders: folders.length,
      flagged_revisions: 1,
      top_tags: [
        { tag: "engineering", count: 2 },
        { tag: "marketing", count: 2 },
        { tag: "research", count: 2 },
        { tag: "support", count: 1 },
        { tag: "drafts", count: 1 },
      ],
      most_revised: [
        { title: "PR reviewer", revisions: 5 },
        { title: "Paper summariser", revisions: 4 },
        { title: "Blog post outliner", revisions: 3 },
        { title: "Support reply — refund", revisions: 3 },
      ],
    };
  }

  // Tracing
  if (cmd === "list_traces") return traces;
  if (cmd === "save_trace") return "trace_mock";

  // A/B tests + eval scores
  if (cmd === "get_ab_tests") return abTests;
  if (cmd === "record_ab_impression" || cmd === "create_ab_test") return "ab_mock";
  if (cmd === "get_eval_scores") return evalScores;
  if (cmd === "save_eval_score") return {};

  // Chains
  if (cmd === "list_chains") return chains;
  if (cmd === "get_chain_contents") {
    return chains[0].steps.map((s) => ({
      prompt_id: s.prompt_id,
      title: s.prompt_title,
      content: prompts[s.prompt_id]?.latest?.content ?? "",
      system_prompt: prompts[s.prompt_id]?.latest?.system_prompt ?? null,
    }));
  }
  if (cmd === "create_chain" || cmd === "delete_chain") return {};

  // Environments
  if (cmd === "get_environments") return [
    { env_name: "production", revision_id: "r_pr_4", revision_number: 4, promoted_at: iso(4) },
    { env_name: "staging", revision_id: "r_pr_5", revision_number: 5, promoted_at: iso(0) },
  ];
  if (cmd === "promote_to_env") return {};

  // Keychain (no-op in browser)
  if (cmd === "keychain_get") return null;
  if (cmd === "keychain_set" || cmd === "keychain_delete") return {};

  // Branches
  if (cmd === "list_branches") return ["main"];
  if (cmd === "create_branch") return prompts.p_pr.latest;

  // Reorder / move / duplicate / export
  if (cmd === "reorder_folders" || cmd === "reorder_prompts" || cmd === "move_prompt_to_folder") return {};
  if (cmd === "duplicate_prompt") return withTags("p_blog");
  if (cmd === "export_prompt_to_file" || cmd === "write_text_file") return {};

  // Folder mutations
  if (cmd === "create_folder") {
    const name = (args as any)?.input?.name as string;
    return { id: `f_${Date.now()}`, parent_id: null, name, color: "#6366f1", icon: "folder", sort_order: folders.length, sensitive: false, created_at: now() };
  }
  if (cmd === "update_folder" || cmd === "delete_folder") return {};

  // Prompt mutations
  if (cmd === "create_prompt") {
    const title = (args as any)?.input?.title ?? "New prompt";
    const fid = (args as any)?.input?.folder_id ?? null;
    const id = `p_${Date.now()}`;
    prompts[id] = {
      prompt: { id, folder_id: fid, title, description: null, created_at: now(), updated_at: now() },
      latest: null, revision_count: 0,
    };
    return withTags(id);
  }
  if (cmd === "update_prompt" || cmd === "delete_prompt") return {};

  console.warn("[dev-mock] Unhandled Tauri command:", cmd, args);
  return {};
}

// Install the mock on window.__TAURI_INTERNALS__ so @tauri-apps/api/core
// routes through it. Runs synchronously at import time.
(function install() {
  const w = window as any;
  if (w.__TAURI_INTERNALS__) return;
  w.__TAURI_INTERNALS__ = {
    invoke: (cmd: Cmd, args: Args) => invokeMock(cmd, args),
    transformCallback: (cb: any) => cb,
    // Prevent plugin-dialog / plugin-clipboard bootstrap code from crashing.
    metadata: { currentWindow: { label: "main" }, currentWebview: { label: "main" } },
  };
  // Some Tauri plugins look up __TAURI_IPC__ too.
  w.__TAURI_IPC__ = (msg: any) => invokeMock(msg?.cmd ?? msg, msg);
  // Mark as installed so imports know.
  w.__PROMPTHANGAR_DEV_MOCK__ = true;
})();

export {};
