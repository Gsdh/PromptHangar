/**
 * Epic 3 — colour-coded revisions.
 *
 * Produces a CSS colour for a revision based on a user-chosen dimension
 * (rating, model, flagged). Kept here so `RevisionTimeline` (sidebar) and
 * any future consumer (diff viewer, analytics) agree on the palette.
 *
 * Design notes:
 * - Return a CSS colour string + a subtle background tint (so the whole row
 *   gets a left border accent + a 6% background wash without fighting the
 *   selection highlight).
 * - `rating` uses a green→amber→red gradient based on eval score (0..10) or
 *   explicit revision rating (1..5, scaled).
 * - `model` hashes the model id to a deterministic hue so the same model
 *   always gets the same colour across the app.
 * - `flagged` uses amber for flagged, neutral for not flagged.
 * - `none` returns `null` (no tint).
 */

import type { Revision } from "../types";

export type ColorBy = "rating" | "model" | "flagged" | "none";

export interface RevisionTint {
  /** Hex / CSS colour for the left border & key accent. */
  border: string;
  /** Translucent version of the same colour for the row background wash. */
  bg: string;
  /** One-line reason shown in the tooltip. */
  label: string;
}

/** Green→amber→red by rating score. Accepts rating (1..5) or eval (0..10). */
function ratingColor(score: number, scale10: boolean): RevisionTint {
  // Normalise to 0..1.
  const n = scale10 ? score / 10 : (score - 1) / 4;
  const clamped = Math.max(0, Math.min(1, n));
  // Lerp hue: 0 → red (0deg), 0.5 → amber (40deg), 1 → green (140deg).
  const hue = Math.round(clamped * 140);
  return {
    border: `hsl(${hue} 70% 50%)`,
    bg: `hsla(${hue} 70% 50% / 0.08)`,
    label: `score ${score.toFixed(1)}`,
  };
}

/** djb2 hash → 0..359. Stable across sessions. */
function hashHue(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  return Math.abs(h) % 360;
}

function modelColor(model: string): RevisionTint {
  const hue = hashHue(model || "unknown");
  return {
    border: `hsl(${hue} 60% 55%)`,
    bg: `hsla(${hue} 60% 55% / 0.08)`,
    label: model || "unknown model",
  };
}

const FLAGGED: RevisionTint = {
  border: "hsl(40 95% 55%)",
  bg: "hsla(40 95% 55% / 0.10)",
  label: "flagged",
};

export function revisionTint(
  rev: Revision,
  mode: ColorBy,
  evalScore?: number,
): RevisionTint | null {
  if (mode === "none") return null;

  if (mode === "flagged") {
    return rev.flagged ? FLAGGED : null;
  }

  if (mode === "rating") {
    // Eval score wins if present; otherwise fall back to explicit rating.
    if (typeof evalScore === "number") return ratingColor(evalScore, true);
    if (typeof rev.rating === "number") return ratingColor(rev.rating, false);
    return null;
  }

  if (mode === "model") {
    if (!rev.model) return null;
    return modelColor(rev.model);
  }

  return null;
}

/** Human-readable label for the picker. */
export const COLOR_BY_LABELS: Record<ColorBy, string> = {
  rating: "Rating",
  model: "Model",
  flagged: "Flagged",
  none: "No colour",
};
