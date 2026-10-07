import { courseBySlug } from "@/lib/data/courses";
import { setOpen, uid, type MediaUpload, type OpenState, type Profile } from "@/lib/store";

/**
 * Uploading content in the Studio (spec section 13.1, FR-ST-1, FR-CA-6). The
 * prototype has no storage: it keeps the file's name and size and simulates
 * the pipeline from the time the upload started. A video goes upload →
 * processing (HLS renditions 144p–1080p and audio-only) → automatic captions →
 * caption review by a person → ready. A document is read, then the AI Studio
 * drafts from it.
 */

export type Stage = "uploading" | "processing" | "captioning" | "caption_review" | "ready";

/** Simulated upload speed by connection, MB per second. */
const RATE: Record<Profile["connectivity"], number> = { slow: 1.5, moderate: 6, fast: 20 };
export const rateFor = (c: Profile["connectivity"] | undefined) => RATE[c ?? "moderate"];

const PROCESSING_S = 6;
const CAPTIONING_S = 4;

export const uploadSeconds = (u: Pick<MediaUpload, "sizeMb" | "rate">) => Math.min(20, Math.max(2, u.sizeMb / u.rate));

/** Where an upload is now, and how far through that stage (0–1). */
export function stageOf(u: MediaUpload, now: number): { stage: Stage; pct: number } {
  const t = (now - Date.parse(u.startedAt)) / 1000;
  const up = uploadSeconds(u);
  if (t < up) return { stage: "uploading", pct: Math.max(0, t / up) };
  if (t < up + PROCESSING_S) return { stage: "processing", pct: (t - up) / PROCESSING_S };
  if (u.kind !== "video") return { stage: "ready", pct: 1 };
  if (t < up + PROCESSING_S + CAPTIONING_S) return { stage: "captioning", pct: (t - up - PROCESSING_S) / CAPTIONING_S };
  return u.captionsApprovedAt ? { stage: "ready", pct: 1 } : { stage: "caption_review", pct: 1 };
}

/** The renditions a video is transcoded to (spec section 13.1), with an estimate of each one's size. */
export function renditions(sizeMb: number) {
  return [
    { label: "Audio only", share: 0.04 },
    { label: "144p", share: 0.06 },
    { label: "360p", share: 0.16 },
    { label: "720p", share: 0.38 },
    { label: "1080p", share: 0.7 },
  ].map((r) => ({ label: r.label, mb: Math.max(1, Math.round(sizeMb * r.share)) }));
}

/** The machine captions a person then checks (FR-VP-2). */
function autoCaptions(title: string) {
  return [`00:00  Welcome. In this video: ${title}.`, "00:06  Let's start with an example from everyday life.", "00:14  Watch what happens when we change one value.", "00:23  Pause here and try it yourself before we go on.", "00:35  To sum up: the idea, the example, and when to use it."].join("\n");
}

export function startUpload(input: Pick<MediaUpload, "courseSlug" | "kind" | "fileName" | "sizeMb" | "title" | "lessonId" | "captionLanguage">, profile: Profile | null) {
  const upload: MediaUpload = {
    ...input,
    id: uid("upload"),
    rate: rateFor(profile?.connectivity),
    startedAt: new Date().toISOString(),
    uploadedBy: profile?.name ?? "Instructor",
    captions: input.kind === "video" ? autoCaptions(input.title) : undefined,
  };
  setOpen((s) => ({ uploads: [upload, ...s.uploads] }));
  return upload;
}

export function approveCaptions(id: string, captions: string) {
  setOpen((s) => ({ uploads: s.uploads.map((u) => (u.id === id ? { ...u, captions, captionsApprovedAt: new Date().toISOString() } : u)) }));
}

export function removeUpload(id: string) {
  setOpen((s) => ({ uploads: s.uploads.filter((u) => u.id !== id) }));
}

/** The AI Studio reads a document or package and drafts from it; every draft waits for the instructor (FR-ST-2, FR-ST-3). */
export function draftFrom(u: MediaUpload) {
  const course = courseBySlug.get(u.courseSlug);
  const at = new Date().toISOString();
  const drafts: OpenState["drafts"] =
    u.kind === "package"
      ? [{ id: uid("draft"), courseSlug: u.courseSlug, kind: "practice_question", title: `Imported from ${u.fileName}: 12 questions`, content: "12 multiple-choice questions were read from the package.\nEach keeps its answer key and feedback; skills still need mapping.\n(Imported automatically. Check them before approving.)", status: "draft", createdAt: at }]
      : [
          { id: uid("draft"), courseSlug: u.courseSlug, kind: "lesson_outline", title: `Lesson outline from “${u.fileName}”`, content: `1. Why it matters: a real example\n2. The key idea, step by step\n3. Worked example\n4. Common mistakes\n5. Practice and a short check\n(Drafted from ${u.fileName} for ${course?.title ?? "this course"}. Check accuracy before approving.)`, status: "draft", createdAt: at },
          { id: uid("draft"), courseSlug: u.courseSlug, kind: "practice_question", title: `Practice: from “${u.fileName}”`, content: `Which statement best matches the document?\nA. …  B. …  C. …  D. …\n(Drafted from ${u.fileName}. Check accuracy and wording before approving.)`, status: "draft", createdAt: at },
        ];
  setOpen((s) => ({ drafts: [...drafts, ...s.drafts], uploads: s.uploads.map((x) => (x.id === u.id ? { ...x, draftsCreatedAt: at } : x)) }));
  return drafts.length;
}

/** Videos whose captions a person has checked: they go out with the next version. */
export const readyVideos = (s: Pick<OpenState, "uploads">, slug: string) => s.uploads.filter((u) => u.courseSlug === slug && u.kind === "video" && u.captionsApprovedAt);

/** Videos not yet ready, which block publishing (captions on every video, FR-QA-2). */
export const pendingVideos = (s: Pick<OpenState, "uploads">, slug: string) => s.uploads.filter((u) => u.courseSlug === slug && u.kind === "video" && !u.captionsApprovedAt);
