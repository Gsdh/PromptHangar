/**
 * Semantic search via local embeddings.
 *
 * Uses Ollama's /api/embed endpoint to generate embeddings for prompts,
 * then performs cosine similarity search. All computation stays local.
 *
 * Flow:
 * 1. On first use, embed all existing prompts (latest revision content)
 * 2. On subsequent prompt saves, embed the new revision
 * 3. On search, embed the query and find nearest neighbors
 *
 * Embeddings are cached in localStorage to avoid re-computing.
 */

const EMBED_CACHE_KEY = "pn:embeddings";
const DEFAULT_EMBED_MODEL = "nomic-embed-text";

interface EmbeddingCache {
  model: string;
  vectors: Record<string, number[]>; // prompt_id → embedding vector
}

function getCache(): EmbeddingCache {
  try {
    const raw = localStorage.getItem(EMBED_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { model: DEFAULT_EMBED_MODEL, vectors: {} };
}

function saveCache(cache: EmbeddingCache) {
  try {
    localStorage.setItem(EMBED_CACHE_KEY, JSON.stringify(cache));
  } catch { /* localStorage full */ }
}

function getOllamaBase(): string {
  const port = localStorage.getItem("pn:ollamaPort") || "11434";
  return `http://localhost:${port}`;
}

/**
 * Generate an embedding vector for the given text via Ollama.
 * Returns null if Ollama is not running or the model isn't available.
 */
async function embed(text: string, model?: string): Promise<number[] | null> {
  try {
    const base = getOllamaBase();
    const res = await fetch(`${base}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model ?? DEFAULT_EMBED_MODEL,
        input: text.slice(0, 8000), // Truncate to avoid token limits
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    // Ollama returns { embeddings: [[...numbers]] }
    return data.embeddings?.[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Cosine similarity between two vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Index a prompt's latest content for semantic search.
 * Call after saving a revision.
 */
export async function indexPrompt(promptId: string, content: string): Promise<boolean> {
  const vec = await embed(content);
  if (!vec) return false;
  const cache = getCache();
  cache.vectors[promptId] = vec;
  saveCache(cache);
  return true;
}

/**
 * Remove a prompt from the semantic index.
 */
export function removeFromIndex(promptId: string) {
  const cache = getCache();
  delete cache.vectors[promptId];
  saveCache(cache);
}

/**
 * Semantic search: find prompts similar to the query.
 * Returns prompt IDs sorted by similarity (highest first).
 */
export async function semanticSearch(
  query: string,
  topK: number = 10,
): Promise<{ promptId: string; similarity: number }[]> {
  const queryVec = await embed(query);
  if (!queryVec) return [];

  const cache = getCache();
  const results: { promptId: string; similarity: number }[] = [];

  for (const [promptId, vec] of Object.entries(cache.vectors)) {
    const sim = cosineSimilarity(queryVec, vec);
    results.push({ promptId, similarity: sim });
  }

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, topK);
}

/**
 * Batch-index all prompts. Call once to initialize the index.
 * Returns the number of prompts indexed.
 */
export async function buildIndex(
  prompts: { id: string; content: string }[],
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  let count = 0;
  for (let i = 0; i < prompts.length; i++) {
    const ok = await indexPrompt(prompts[i].id, prompts[i].content);
    if (ok) count++;
    onProgress?.(i + 1, prompts.length);
  }
  return count;
}

/**
 * Check if Ollama has an embedding model available.
 */
export async function isEmbeddingAvailable(): Promise<boolean> {
  try {
    const base = getOllamaBase();
    const res = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return false;
    const data = await res.json();
    const models = data.models ?? [];
    return models.some((m: { name?: string }) =>
      (m.name ?? "").includes("embed") || (m.name ?? "").includes("nomic")
    );
  } catch {
    return false;
  }
}

/**
 * Get the number of indexed prompts.
 */
export function getIndexSize(): number {
  return Object.keys(getCache().vectors).length;
}
