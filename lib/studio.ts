import type { Course } from "@/lib/types";
import { COURSES, activitiesOf } from "@/lib/data/courses";
import { ITEMS } from "@/lib/data/items";
import { setOpen, type CourseRelease, type OpenState } from "@/lib/store";
import { pendingVideos, readyVideos } from "@/lib/uploads";

/**
 * The instructor side of a course in the Studio (spec section 6.17, section
 * 6.22, section 6.23): which courses an instructor teaches, the pre-publish
 * gates, the version review workflow and the course analytics. The prototype
 * has no backend, so analytics are generated from the course data, the same
 * way every time.
 */

export const instructorSlug = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const coursesTaughtBy = (name: string) => COURSES.filter((c) => c.instructor === name);

/** Instructor names by profile slug (`/instructors/:slug`). */
export const instructorBySlug = new Map(COURSES.map((c) => [instructorSlug(c.instructor), c.instructor]));

/**
 * The courses an instructor can open in the Studio: their own, then the other
 * fully written courses (so the in-video question demo works on SQL and Python).
 */
export function studioCourses(name: string | undefined) {
  const mine = name ? coursesTaughtBy(name) : [];
  const shared = COURSES.filter((c) => c.authored && !mine.includes(c));
  return { mine, shared };
}

// ---- Pre-publish gates (FR-CA-3, FR-QA-2) ----

export interface Gate {
  id: string;
  label: string;
  ok: boolean;
  /** Why it fails, one line per problem. */
  problems: string[];
}

export function coverage(course: Course) {
  const acts = activitiesOf(course);
  const noSkill = course.objectives.filter((o) => o.skills.length === 0);
  const noActivity = course.objectives.filter((o) => !acts.some((a) => a.objectives.includes(o.id)));
  const noItems = course.objectives.filter((o) => o.skills.length > 0 && !o.skills.some((sk) => ITEMS.some((i) => i.skill === sk)));
  const unmapped = acts.filter((a) => a.objectives.length === 0);
  return { acts, noSkill, noActivity, noItems, unmapped, ok: noSkill.length + noActivity.length + noItems.length + unmapped.length === 0 };
}

const BLOCKING_FLAGS = new Set(["broken_link", "accessibility"]);

export function gates(course: Course, s: Pick<OpenState, "flags" | "uploads">): Gate[] {
  const cov = coverage(course);
  const videos = cov.acts.filter((a) => a.kind === "video");
  const uncaptioned = videos.filter((v) => !v.transcript?.length);
  const unreviewed = pendingVideos(s, course.slug);
  const blocking = s.flags.filter((f) => f.courseSlug === course.slug && f.status === "open" && BLOCKING_FLAGS.has(f.kind));
  return [
    {
      id: "coverage",
      label: "Every activity serves an objective, and every objective has a skill and assessment items",
      ok: cov.ok,
      problems: cov.ok ? [] : [`${cov.noSkill.length + cov.noActivity.length + cov.noItems.length + cov.unmapped.length} gaps: see the coverage check`],
    },
    {
      id: "content",
      label: "Lessons are written, not placeholders",
      ok: course.authored,
      problems: course.authored ? [] : ["Only the outline is written. The lessons still hold placeholder text."],
    },
    {
      id: "captions",
      label: "Captions on every video",
      ok: uncaptioned.length + unreviewed.length === 0,
      problems: [...uncaptioned.map((v) => `“${v.title}” has no captions`), ...unreviewed.map((u) => `Uploaded video “${u.title}”: captions not reviewed yet`)],
    },
    {
      id: "flags",
      label: "No open broken-link or accessibility flags",
      ok: blocking.length === 0,
      problems: blocking.map((f) => `Open flag: ${f.target}`),
    },
  ];
}

// ---- Versions and review (FR-MK-3, FR-CA-4) ----

export const releasesOf = (s: Pick<OpenState, "courseReleases">, slug: string): CourseRelease[] => s.courseReleases?.[slug] ?? [];

/** The version learners get now, and when it went live. */
export function liveVersion(s: Pick<OpenState, "courseReleases">, course: Course) {
  const live = releasesOf(s, course.slug).find((r) => r.status === "live");
  return live ? { version: live.version, updated: live.decidedAt! } : { version: course.version, updated: course.lastUpdated };
}

/** Safe changes bump the minor version and move enrolled learners; others start a new major version. */
export function nextVersion(current: string, safeToMigrate: boolean) {
  const [major = 1, minor = 0] = current.split(".").map(Number);
  return safeToMigrate ? `${major}.${minor + 1}.0` : `${major + 1}.0.0`;
}

/**
 * What changed since the live version was sent for review: approved AI drafts
 * and fixed flags. A version sent back with "changes requested" didn't go
 * live, so its changes are still pending.
 */
export function pendingChanges(s: Pick<OpenState, "drafts" | "flags" | "courseReleases" | "uploads">, slug: string): string[] {
  const since = releasesOf(s, slug).find((r) => r.status === "live")?.submittedAt ?? "";
  const drafts = s.drafts.filter((d) => d.courseSlug === slug && d.status === "approved" && (d.decidedAt ?? "") > since);
  const flags = s.flags.filter((f) => f.courseSlug === slug && f.status === "fixed" && (f.resolvedAt ?? "") > since);
  const videos = readyVideos(s, slug).filter((u) => (u.captionsApprovedAt ?? "") > since);
  return [...videos.map((u) => `Added video: ${u.title}`), ...drafts.map((d) => `Added: ${d.title}`), ...flags.map((f) => `Fixed: ${f.target}`)];
}

const stamp = () => new Date().toISOString();
/** The content reviewer persona; the Studio's "simulate" buttons decide in her name. */
export const REVIEWER = "Akua Danso";
export const CHANGES_NOTE = "Add a worked example to the change notes so learners know what's new.";

export function submitRelease(slug: string, release: Omit<CourseRelease, "status" | "submittedAt">) {
  setOpen((s) => ({ courseReleases: { ...s.courseReleases, [slug]: [{ ...release, status: "in_review", submittedAt: stamp() }, ...releasesOf(s, slug)] } }));
}

/** A content reviewer's decision (FR-MK-3): approve, or ask for changes with a note; the rubric scores are kept (FR-QA-1). */
export function decideRelease(slug: string, approve: boolean, by: { reviewer?: string; note?: string; scores?: Record<string, number> } = {}) {
  setOpen((s) => {
    const [head, ...rest] = releasesOf(s, slug);
    if (head?.status !== "in_review") return {};
    const base = { ...head, decidedAt: stamp(), reviewer: by.reviewer ?? REVIEWER, scores: by.scores, reviewerNote: by.note || undefined };
    const decided: CourseRelease = approve ? { ...base, status: "live" } : { ...base, status: "changes_requested", reviewerNote: by.note || CHANGES_NOTE };
    return { courseReleases: { ...s.courseReleases, [slug]: [decided, ...rest] } };
  });
}

export function withdrawRelease(slug: string) {
  setOpen((s) => {
    const [head, ...rest] = releasesOf(s, slug);
    return head?.status === "in_review" ? { courseReleases: { ...s.courseReleases, [slug]: rest } } : {};
  });
}

// ---- Analytics (FR-QA-4, spec section 4.4) ----

/** A stable number in [0, 1) from a string. */
function noise(key: string) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

/** Below this point-biserial an item doesn't separate strong from weak learners (spec section 14.3). */
export const LOW_DISCRIMINATION = 0.15;

/** Fixed values that match the demo's quality flags. */
const KNOWN_DISCRIMINATION: Record<string, number> = { st6: 0.11 };
/** The lesson (0-based) where most learners stop; Statistics matches its "lesson 2" confusion flag. */
const KNOWN_DIP: Record<string, number> = { "statistics-in-everyday-life": 1 };

export function courseAnalytics(course: Course) {
  const lessons = course.modules.flatMap((m) => m.lessons);
  const dip = KNOWN_DIP[course.slug] ?? Math.floor(noise(`${course.slug}:dip`) * Math.max(1, lessons.length - 1)) + 1;
  let pct = 100;
  const funnel = lessons.map((l, n) => {
    if (n > 0) pct *= n === dip ? 0.62 + noise(l.id) * 0.08 : 0.88 + noise(l.id) * 0.09;
    return { id: l.id, title: l.title, n: n + 1, pct: Math.round(pct) };
  });
  const drops = funnel.slice(1).map((f, k) => ({ ...f, drop: funnel[k]!.pct - f.pct }));
  const worst = drops.length ? drops.reduce((a, b) => (b.drop > a.drop ? b : a)) : undefined;

  const skills = new Set(course.objectives.flatMap((o) => o.skills));
  const items = ITEMS.filter((i) => skills.has(i.skill)).map((i) => {
    const responses = Math.round(course.learners * (0.35 + noise(`${i.id}:r`) * 0.4));
    const pValue = Math.min(0.95, Math.max(0.3, 0.92 - i.difficulty * 0.13 + (noise(`${i.id}:p`) - 0.5) * 0.12));
    const discrimination = KNOWN_DISCRIMINATION[i.id] ?? 0.16 + noise(`${i.id}:d`) * 0.36;
    return { id: i.id, stem: i.stem.split("\n")[0]!, skill: i.skill, responses, pValue, discrimination, low: discrimination < LOW_DISCRIMINATION };
  });
  items.sort((a, b) => a.discrimination - b.discrimination);

  return { learners: course.learners, masteryRate: course.masteryRate, finished: funnel.at(-1)?.pct ?? 0, funnel, worst, items };
}
