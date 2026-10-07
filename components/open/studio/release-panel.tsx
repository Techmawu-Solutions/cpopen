"use client";

import { useState } from "react";
import { Check, CircleAlert, Clock, Send, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { decideRelease, gates, liveVersion, nextVersion, pendingChanges, releasesOf, submitRelease, withdrawRelease } from "@/lib/studio";
import { useOpen } from "@/lib/store";
import type { Course } from "@/lib/types";
import { cn } from "@/lib/utils";

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/**
 * Publishing a new course version (FR-MK-3 review workflow, FR-CA-4 versions,
 * FR-QA-2 pre-publish gates): the gates must pass and something must have
 * changed; then the version goes to a content reviewer before learners get it.
 */
export function ReleasePanel({ course }: { course: Course }) {
  const s = useOpen();
  const [safe, setSafe] = useState(true);
  const list = gates(course, s);
  const blocked = list.some((g) => !g.ok);
  const changes = pendingChanges(s, course.slug);
  const releases = releasesOf(s, course.slug);
  const inReview = releases[0]?.status === "in_review" ? releases[0] : undefined;
  const live = liveVersion(s, course);
  const next = nextVersion(live.version, safe);

  return (
    <section className="rounded-2xl border bg-card p-5 lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Publish a new version</h2>
          <p className="text-sm text-muted-foreground">Changes reach learners only after the checks pass and a content reviewer approves the version (FR-MK-3).</p>
        </div>
        <p className="rounded-lg bg-muted px-2.5 py-1 text-sm tabular-nums">{`Live: version ${live.version} · ${fmtDate(live.updated)}`}</p>
      </div>

      <div className="mt-4 grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-medium">Pre-publish checks</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {list.map((g) => (
              <li key={g.id} className="flex gap-2">
                {g.ok ? <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />}
                <div className="min-w-0">
                  <p className={cn(!g.ok && "font-medium")}>{g.label}</p>
                  {g.problems.length > 0 && (
                    <ul className="mt-0.5 list-disc pl-4 text-xs text-amber-800 dark:text-amber-200">
                      {g.problems.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div>
          {inReview ? (
            <div className="rounded-xl border border-primary/30 bg-accent/50 p-3 text-sm">
              <p className="flex items-center gap-1.5 font-medium">
                <Clock className="size-4" /> {`Version ${inReview.version} is with a reviewer`}
              </p>
              <p className="mt-1 text-muted-foreground">
                {inReview.safeToMigrate ? `Sent ${fmtDate(inReview.submittedAt)} · enrolled learners will move to it` : `Sent ${fmtDate(inReview.submittedAt)} · enrolled learners stay on their version`}
              </p>
              <ul className="mt-2 list-disc pl-5">
                {inReview.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">Sign in as Akua Danso (content reviewer) to review it, or simulate the decision here.</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Button size="xs" onClick={() => (decideRelease(course.slug, true), toast.success(`Version ${inReview.version} approved — learners get it now`))}>
                  <Check /> Simulate approval
                </Button>
                <Button size="xs" variant="outline" onClick={() => (decideRelease(course.slug, false), toast("The reviewer asked for changes"))}>
                  <X /> Simulate “changes requested”
                </Button>
                <Button size="xs" variant="ghost" onClick={() => withdrawRelease(course.slug)}>
                  <Undo2 /> Withdraw
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border p-3 text-sm">
              <h3 className="font-medium">{`Changes since version ${live.version}`}</h3>
              {changes.length === 0 ? (
                <p className="mt-1 text-muted-foreground">Nothing yet. Approve an AI draft or fix a quality flag, and it&apos;s listed here.</p>
              ) : (
                <ul className="mt-1 list-disc pl-5">
                  {changes.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              )}
              <label className="mt-3 flex items-start gap-2">
                <input type="checkbox" checked={safe} onChange={(e) => setSafe(e.target.checked)} className="mt-1 accent-primary" />
                <span>
                  Safe to migrate
                  <span className="block text-xs text-muted-foreground">{safe ? "Corrections and additions: enrolled learners move to the new version." : "A big change: enrolled learners finish on their version; new learners get the new one."}</span>
                </span>
              </label>
              <Button
                size="sm"
                className="mt-3"
                disabled={blocked || changes.length === 0}
                onClick={() => {
                  submitRelease(course.slug, { version: next, safeToMigrate: safe, notes: changes, submittedBy: s.profile?.name ?? "Instructor" });
                  toast.success(`Version ${next} sent for review`);
                }}
              >
                <Send /> {`Send version ${next} for review`}
              </Button>
              {blocked && <p className="mt-1.5 text-xs text-amber-800 dark:text-amber-200">Fix the checks on the left first.</p>}
            </div>
          )}

          {releases.filter((r) => r !== inReview).length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium">Version history</h3>
              <ul className="mt-1 divide-y text-sm">
                {releases
                  .filter((r) => r !== inReview)
                  .map((r) => (
                    <li key={r.submittedAt} className="py-2">
                      <p className="tabular-nums">{r.status === "live" ? `Version ${r.version} approved by ${r.reviewer} · ${fmtDate(r.decidedAt!)}` : `Version ${r.version}: changes requested by ${r.reviewer} · ${fmtDate(r.decidedAt!)}`}</p>
                      {r.reviewerNote && <p className="text-xs text-muted-foreground">“{r.reviewerNote}”</p>}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
