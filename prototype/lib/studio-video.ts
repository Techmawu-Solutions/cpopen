import type { Activity, Course, VideoQuestion } from "@/lib/types";
import { itemById } from "@/lib/data/items";
import { setOpen, type OpenState } from "@/lib/store";
import { byTime } from "@/lib/video-questions";

/**
 * Instructor editing of in-video questions (spec section 6.17, FR-VP-4). The
 * course data holds each video's original questions; the Studio keeps a draft
 * and a published version per video. Learners always get the published one,
 * and an instructor can preview the draft in the lesson before publishing.
 */

export type VideoWhich = "video" | "lecture";

export const videoKey = (activityId: string, which: VideoWhich) => (which === "lecture" ? `${activityId}#lecture` : activityId);

/** Seconds the lesson video runs (its timed transcript plus the closing slide); null for a lecture we can't measure. */
export function videoDuration(activity: Activity, which: VideoWhich): number | null {
  if (which === "lecture") return null;
  const lines = activity.transcript ?? [];
  return lines.length ? (lines.at(-1)?.t ?? 0) + 14 : null;
}

/** The questions as written in the course. */
export const courseQuestions = (activity: Activity, which: VideoWhich): VideoQuestion[] => byTime(which === "lecture" ? activity.lecture?.questions : activity.videoQuestions);

/** What learners see: the published Studio version when there is one, else the course's own. With `draft`, the instructor's draft. */
export function effectiveQuestions(s: Pick<OpenState, "videoQuestions">, activity: Activity, which: VideoWhich, draft = false): VideoQuestion[] {
  const edit = s.videoQuestions?.[videoKey(activity.id, which)];
  if (draft && edit) return byTime(edit.draft);
  return edit?.published ? byTime(edit.published) : courseQuestions(activity, which);
}

/** Items an instructor can place in this video: the practice items for the course's skills, this activity's first. */
export function itemsFor(course: Course, activity: Activity) {
  const skills = new Set(course.objectives.flatMap((o) => o.skills));
  const mine = new Set(activity.skills);
  return [...itemById.values()].filter((i) => skills.has(i.skill)).sort((a, b) => Number(mine.has(b.skill)) - Number(mine.has(a.skill)));
}

/** Problems that stop a list being published; one entry per question, empty when it's fine. */
export function questionProblems(list: VideoQuestion[], duration: number | null): string[][] {
  return list.map((q, n) => {
    const errs: string[] = [];
    if (!Number.isFinite(q.at) || q.at < 0) errs.push("needs a time in the video");
    else if (duration != null && q.at > duration) errs.push("is after the end of the video");
    if (!itemById.has(q.itemId)) errs.push("needs a question from the item bank");
    else if (list.findIndex((x) => x.itemId === q.itemId) !== n) errs.push("uses the same question twice");
    return errs;
  });
}

const stamp = () => new Date().toISOString();

export function saveVideoDraft(key: string, draft: VideoQuestion[]) {
  setOpen((s) => ({ videoQuestions: { ...s.videoQuestions, [key]: { ...s.videoQuestions[key], draft: byTime(draft), updatedAt: stamp() } } }));
}

export function publishVideoQuestions(key: string, draft: VideoQuestion[], by: string) {
  const list = byTime(draft);
  setOpen((s) => ({ videoQuestions: { ...s.videoQuestions, [key]: { draft: list, published: list, publishedAt: stamp(), publishedBy: by, updatedAt: stamp() } } }));
}

/** Throws the draft away: back to what learners see now. */
export function discardVideoDraft(key: string, current: VideoQuestion[]) {
  setOpen((s) => {
    const edit = s.videoQuestions[key];
    if (!edit) return {};
    if (!edit.published) {
      const rest = { ...s.videoQuestions };
      delete rest[key];
      return { videoQuestions: rest };
    }
    return { videoQuestions: { ...s.videoQuestions, [key]: { ...edit, draft: current, updatedAt: stamp() } } };
  });
}
