import type { VideoQuestion } from "@/lib/types";

/**
 * When in-video questions appear (FR-VP-4), shared by the lesson video and the
 * recorded lectures. The same rules as ClassProject's interactive video (cp spec
 * section 26.3): questions appear as playback reaches them, several close
 * together queue up, and a forward seek stops at the first required question
 * not yet answered. Going back is always allowed.
 */

export const byTime = (qs: VideoQuestion[] = []) => [...qs].sort((a, b) => a.at - b.at);

/** The first unanswered question playback reached between two moments (from ≤ at < to). */
export function dueQuestion(sorted: VideoQuestion[], from: number, to: number, answered: Set<string>): VideoQuestion | null {
  if (to <= from) return null;
  return sorted.find((q) => q.at >= from - 1e-6 && q.at < to && !answered.has(q.itemId)) ?? null;
}

/** The required question a forward seek to `target` would skip, or null. */
export function seekBlocker(sorted: VideoQuestion[], target: number, answered: Set<string>): VideoQuestion | null {
  return sorted.find((q) => q.required && q.at < target - 0.25 && !answered.has(q.itemId)) ?? null;
}

export const fmtClock = (s: number) => {
  const t = Math.max(0, Math.floor(s));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const ss = String(t % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
};
