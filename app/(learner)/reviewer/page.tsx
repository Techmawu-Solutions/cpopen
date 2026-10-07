"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, CircleAlert, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageTitle } from "@/components/open/bits";
import { RoleGate } from "@/components/open/role-gate";
import { COURSES, courseBySlug } from "@/lib/data/courses";
import { REVIEW_RUBRIC } from "@/lib/data/portals";
import { decideRelease, gates, liveVersion, releasesOf } from "@/lib/studio";
import { useOpen, type CourseRelease } from "@/lib/store";
import type { Course } from "@/lib/types";
import { cn } from "@/lib/utils";

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/**
 * The content reviewer's portal (spec section 5.3: review queue, quality
 * flags, decisions). Course versions sent from the Studio wait here; the
 * reviewer scores them against the quality rubric (FR-QA-1) and approves them
 * or asks for changes (FR-MK-3).
 */
export default function ReviewerPage() {
  return (
    <RoleGate roles={["reviewer", "super_admin"]} title="The review queue is for content reviewers" persona="akua">
      <Reviewer />
    </RoleGate>
  );
}

function Reviewer() {
  const s = useOpen();
  const queue = COURSES.flatMap((c) => {
    const head = releasesOf(s, c.slug)[0];
    return head?.status === "in_review" ? [{ course: c, release: head }] : [];
  }).sort((a, b) => a.release.submittedAt.localeCompare(b.release.submittedAt));
  const decided = COURSES.flatMap((c) => releasesOf(s, c.slug).filter((r) => r.status !== "in_review").map((release) => ({ course: c, release }))).sort((a, b) => (b.release.decidedAt ?? "").localeCompare(a.release.decidedAt ?? ""));
  const openFlags = s.flags.filter((f) => f.status === "open");

  return (
    <>
      <PageTitle title="Review queue" description="New course versions wait here before learners get them. Score each against the quality rubric, then approve it or send it back with a note." />

      <dl className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: "Waiting for review", value: queue.length },
          { label: "Decided", value: decided.length },
          { label: "Open quality flags", value: openFlags.length },
        ].map((x) => (
          <div key={x.label} className="rounded-2xl border bg-card p-4">
            <dt className="text-sm text-muted-foreground">{x.label}</dt>
            <dd className="mt-1 text-3xl font-semibold tabular-nums">{x.value}</dd>
          </div>
        ))}
      </dl>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Waiting for review</h2>
        {queue.length === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Nothing waiting. When an instructor sends a version from the studio, it appears here.</p>
        ) : (
          queue.map(({ course, release }) => <ReviewCard key={`${course.slug}-${release.submittedAt}`} course={course} release={release} />)
        )}
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-semibold">Decisions</h2>
          {decided.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No decisions yet.</p>
          ) : (
            <ul className="mt-2 divide-y text-sm">
              {decided.map(({ course, release: r }) => {
                const scores = Object.values(r.scores ?? {});
                const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null;
                return (
                  <li key={`${course.slug}-${r.submittedAt}`} className="py-2">
                    <p className="font-medium">
                      {course.title} <span className="font-normal text-muted-foreground tabular-nums">{r.version}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.status === "live" ? `Approved by ${r.reviewer} · ${fmtDate(r.decidedAt!)}` : `Changes requested by ${r.reviewer} · ${fmtDate(r.decidedAt!)}`}
                      {avg && ` · ${avg} / 5`}
                    </p>
                    {r.reviewerNote && <p className="mt-0.5 text-xs italic">“{r.reviewerNote}”</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-semibold">Open quality flags</h2>
          <p className="text-sm text-muted-foreground">Raised by item statistics, AI monitoring and learners. Instructors fix them; open broken-link and accessibility flags block a version.</p>
          {openFlags.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No open flags.</p>
          ) : (
            <ul className="mt-2 divide-y text-sm">
              {openFlags.map((f) => (
                <li key={f.id} className="flex gap-2 py-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <div className="min-w-0">
                    <p className="font-medium">{f.target}</p>
                    <p className="text-xs text-muted-foreground">{courseBySlug.get(f.courseSlug)?.title}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function ReviewCard({ course, release }: { course: Course; release: CourseRelease }) {
  const s = useOpen();
  const [scores, setScores] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const checks = gates(course, s);
  const failing = checks.filter((g) => !g.ok);
  const scored = REVIEW_RUBRIC.every((c) => scores[c.id]);
  const reviewer = s.profile?.name ?? "Reviewer";

  return (
    <article className="rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">
            {course.title} <span className="font-normal text-muted-foreground tabular-nums">{`${liveVersion(s, course).version} → ${release.version}`}</span>
          </h3>
          <p className="text-sm text-muted-foreground">
            {`Sent by ${release.submittedBy} · ${fmtDate(release.submittedAt)}`} · {release.safeToMigrate ? "enrolled learners will move to it" : "enrolled learners stay on their version"}
          </p>
        </div>
        <Link href={`/courses/${course.slug}`} target="_blank" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          Open the course <ExternalLink className="size-3.5" />
        </Link>
      </div>

      <div className="mt-4 grid gap-5 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium">What changed</h4>
            <ul className="mt-1 list-disc pl-5 text-sm">
              {release.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium">Automatic checks</h4>
            <ul className="mt-1 space-y-1 text-sm">
              {checks.map((g) => (
                <li key={g.id} className="flex gap-2">
                  {g.ok ? <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />}
                  <span className={cn(!g.ok && "font-medium")}>{g.label}</span>
                </li>
              ))}
            </ul>
            {failing.length > 0 && <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">A check fails, so this version can only be sent back.</p>}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium">Quality rubric</h4>
          <p className="text-xs text-muted-foreground">1 = poor, 5 = excellent.</p>
          <div className="mt-2 space-y-2">
            {REVIEW_RUBRIC.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>{c.label}</span>
                <div className="flex gap-1" role="radiogroup" aria-label={c.label}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={scores[c.id] === n} onClick={() => setScores((x) => ({ ...x, [c.id]: n }))} className={cn("size-7 rounded-md border text-xs tabular-nums", scores[c.id] === n ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Textarea className="mt-3" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for the instructor (needed to send it back)" aria-label="Note for the instructor" />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={!scored || failing.length > 0}
              onClick={() => {
                decideRelease(course.slug, true, { reviewer, note, scores });
                toast.success(`Version ${release.version} approved — learners get it now`);
              }}
            >
              <Check /> Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!note.trim()}
              onClick={() => {
                decideRelease(course.slug, false, { reviewer, note, scores });
                toast("Sent back to the instructor with your note");
              }}
            >
              <X /> Ask for changes
            </Button>
          </div>
          {!scored && <p className="mt-1.5 text-xs text-muted-foreground">Score every criterion to approve.</p>}
        </div>
      </div>
    </article>
  );
}
