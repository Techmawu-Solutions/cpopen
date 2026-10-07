"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bot, Check, CircleAlert, ExternalLink, Pencil, Sparkles, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageTitle } from "@/components/open/bits";
import { RoleGate } from "@/components/open/role-gate";
import { LinkButton } from "@/components/open/shell";
import { AnalyticsPanel } from "@/components/open/studio/analytics-panel";
import { ReleasePanel } from "@/components/open/studio/release-panel";
import { VideoQuestionsEditor } from "@/components/open/studio/video-questions-editor";
import { courseBySlug } from "@/lib/data/courses";
import { ITEMS } from "@/lib/data/items";
import { coverage, instructorSlug, liveVersion, releasesOf, studioCourses } from "@/lib/studio";
import { setOpen, uid, useOpen, type Draft, type QualityFlag } from "@/lib/store";
import type { Course } from "@/lib/types";
import { cn } from "@/lib/utils";

const DRAFT_KIND: Record<Draft["kind"], string> = { practice_question: "Practice question", summary: "Video summary", rubric: "Rubric", alt_text: "Alt text", lesson_outline: "Lesson outline" };
const FLAG_KIND: Record<QualityFlag["kind"], string> = { ambiguous_item: "Ambiguous item", broken_link: "Broken link", learner_confusion: "Learner confusion", accessibility: "Accessibility", outdated: "Outdated content" };
const FLAG_SOURCE: Record<QualityFlag["source"], string> = { psychometrics: "item statistics", ai: "AI monitoring", learner_report: "a learner report", system: "a system check" };
const STATUS: Record<"fixed" | "dismissed", string> = { fixed: "Fixed", dismissed: "Dismissed" };

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/**
 * Instructor studio (spec section 5.3, section 6.17, section 6.22, section
 * 6.23): the instructor's courses; the publish-blocking checks and the version
 * review workflow; AI drafts that need human approval; in-video questions
 * (FR-VP-4); analytics; and quality flags raised by psychometrics, AI and
 * learners.
 */
export default function StudioPage() {
  return (
    <RoleGate roles={["instructor"]} title="The studio is for instructors" persona="mensah">
      <Studio />
    </RoleGate>
  );
}

function Studio() {
  const s = useOpen();
  const name = s.profile?.name;
  const { mine, shared } = studioCourses(name);
  const [slug, setSlug] = useState(mine.find((c) => c.authored)?.slug ?? mine[0]?.slug ?? shared[0]!.slug);

  const course = courseBySlug.get(slug)!;

  return (
    <>
      <PageTitle title="Instructor studio" description="Build courses where every activity serves an objective — and AI drafts, but people decide.">
        <div className="flex flex-wrap items-center gap-2">
          {name && (
            <Link href={`/instructors/${instructorSlug(name)}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              Your public profile <ExternalLink className="size-3.5" />
            </Link>
          )}
          <LinkButton href={`/studio/upload?course=${slug}`} size="sm" variant="outline">
            <Upload /> Add content
          </LinkButton>
          <select value={slug} onChange={(e) => setSlug(e.target.value)} className="h-9 max-w-72 rounded-lg border bg-card px-2 text-sm" aria-label="Course">
            {mine.length > 0 && (
              <optgroup label="Your courses">
                {mine.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.title}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="Other courses (demo access)">
              {shared.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.title}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </PageTitle>

      {mine.length > 0 && <MyCourses courses={mine} selected={slug} onSelect={setSlug} />}

      {!mine.some((c) => c.slug === slug) && (
        <p className="mb-4 rounded-xl border border-dashed p-3 text-sm text-muted-foreground">{`You're viewing a course taught by ${course.instructor}. In the prototype every instructor can open the fully written courses, so the in-video question demo works on any of them.`}</p>
      )}

      <div key={slug} className="grid gap-6 lg:grid-cols-2">
        <CoverageCheck course={course} />
        <Drafts course={course} />
        <ReleasePanel course={course} />
        <VideoQuestionsEditor course={course} />
        <AnalyticsPanel course={course} />
        <Flags course={course} />
      </div>
    </>
  );
}

/** The instructor's own courses at a glance (spec section 5.3, Instructor → Courses). */
function MyCourses({ courses, selected, onSelect }: { courses: Course[]; selected: string; onSelect: (slug: string) => void }) {
  const s = useOpen();
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-medium text-muted-foreground">Your courses</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((c) => {
          const v = liveVersion(s, c);
          const inReview = releasesOf(s, c.slug)[0]?.status === "in_review";
          const open = s.flags.filter((f) => f.courseSlug === c.slug && f.status === "open").length;
          const drafts = s.drafts.filter((d) => d.courseSlug === c.slug && d.status === "draft").length;
          return (
            <button key={c.slug} type="button" onClick={() => onSelect(c.slug)} aria-pressed={selected === c.slug} className={cn("rounded-2xl border bg-card p-4 text-left transition-colors hover:border-primary/40", selected === c.slug && "border-primary ring-1 ring-primary")}>
              <p className="font-semibold">{c.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{inReview ? `Version ${v.version} · a new version is in review` : c.authored ? `Version ${v.version} · live` : `Version ${v.version} · live, lessons not written`}</p>
              <p className="mt-2 text-sm tabular-nums">
                {c.learners.toLocaleString()} learners · {c.masteryRate}% reach mastery
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{`AI drafts to review: ${drafts} · open flags: ${open}`}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function CoverageCheck({ course }: { course: Course }) {
  const cov = coverage(course);
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="text-lg font-semibold">Coverage check</h2>
      <p className="text-sm text-muted-foreground">Every activity → an objective → a skill → assessment items. Publishing is blocked until this passes (FR-CA-3).</p>
      <div className={cn("mt-4 rounded-xl p-3 text-sm", cov.ok ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100" : "bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-100")}>
        {cov.ok ? (
          <p className="flex items-center gap-1.5 font-medium">
            <Check className="size-4" /> {`Covered: ${course.objectives.length} objectives, ${cov.acts.length} activities`}
          </p>
        ) : (
          <>
            <p className="flex items-center gap-1.5 font-medium">
              <CircleAlert className="size-4" /> Gaps to fix before publishing
            </p>
            <ul className="mt-1 list-disc pl-5">
              {cov.noSkill.map((o) => (
                <li key={`s${o.id}`}>Objective “{o.text}” isn&apos;t mapped to a skill</li>
              ))}
              {cov.noActivity.map((o) => (
                <li key={`a${o.id}`}>Objective “{o.text}” has no activity</li>
              ))}
              {cov.noItems.map((o) => (
                <li key={`i${o.id}`}>Objective “{o.text}” has no assessment items</li>
              ))}
              {cov.unmapped.map((a) => (
                <li key={a.id}>Activity “{a.title}” serves no objective</li>
              ))}
            </ul>
          </>
        )}
      </div>
      {!course.authored && <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">The objectives below are placeholders from the outline: write the lessons before the next version can be published.</p>}
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-4 font-medium">Objective</th>
            <th className="w-24 px-3 py-2 text-right font-medium">Activities</th>
            <th className="w-20 py-2 pl-3 text-right font-medium">Items</th>
          </tr>
        </thead>
        <tbody>
          {course.objectives.map((o) => (
            <tr key={o.id} className="border-b align-top last:border-0">
              <td className="py-2 pr-4">{o.text}</td>
              <td className="px-3 py-2 text-right tabular-nums">{cov.acts.filter((a) => a.objectives.includes(o.id)).length}</td>
              <td className="py-2 pl-3 text-right tabular-nums">{ITEMS.filter((i) => o.skills.includes(i.skill)).length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Drafts({ course }: { course: Course }) {
  const s = useOpen();
  const [editing, setEditing] = useState<string | null>(null);
  const [text, setText] = useState("");
  const drafts = s.drafts.filter((d) => d.courseSlug === course.slug);
  const who = s.profile?.name ?? "Instructor";
  const decide = (id: string, status: "approved" | "rejected", content?: string) =>
    setOpen((st) => ({ drafts: st.drafts.map((x) => (x.id === id ? { ...x, status, content: content ?? x.content, decidedAt: new Date().toISOString(), decidedBy: who } : x)) }));

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">AI drafts awaiting review</h2>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const lesson = coverage(course).acts.find((a) => a.kind === "reading");
            setOpen((st) => ({ drafts: [{ id: uid("draft"), courseSlug: course.slug, kind: "practice_question", title: `Practice: from “${lesson?.title.replace(/^Read: /, "") ?? course.title}”`, content: `Which statement best matches the lesson?\nA. …  B. …  C. …  D. …\n(Drafted from “${lesson?.title ?? course.title}”. Check accuracy and wording before approving.)`, status: "draft", createdAt: new Date().toISOString() }, ...st.drafts] }));
            toast("Draft created — it won't reach learners until you approve it");
          }}
        >
          <Sparkles /> Draft practice question
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">AI-generated content is never published without human review (brief section 20). Approved items record who approved them, and go out with the next version.</p>
      {drafts.length === 0 && <p className="text-sm text-muted-foreground">No drafts for this course.</p>}
      {drafts.map((d) => (
        <article key={d.id} className={cn("rounded-xl border p-3", d.status !== "draft" && "opacity-70")}>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Bot className="size-3.5" /> AI draft · {DRAFT_KIND[d.kind]}
          </p>
          <p className="font-medium">{d.title}</p>
          {editing === d.id ? <Textarea className="mt-2" rows={5} value={text} onChange={(e) => setText(e.target.value)} /> : <p className="mt-1 text-sm whitespace-pre-line">{d.content}</p>}
          {d.status !== "draft" ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {d.status === "approved" ? `Approved by ${d.decidedBy ?? who} · ${fmtDate(d.decidedAt ?? d.createdAt)}` : `Rejected by ${d.decidedBy ?? who} · ${fmtDate(d.decidedAt ?? d.createdAt)}`}
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {editing === d.id ? (
                <Button size="xs" onClick={() => (decide(d.id, "approved", text), setEditing(null), toast.success("Edited and approved — it goes out with the next version"))}>
                  <Check /> Save & approve
                </Button>
              ) : (
                <>
                  <Button size="xs" onClick={() => (decide(d.id, "approved"), toast.success("Approved — it goes out with the next version"))}>
                    <Check /> Approve
                  </Button>
                  <Button size="xs" variant="outline" onClick={() => (setEditing(d.id), setText(d.content))}>
                    <Pencil /> Edit
                  </Button>
                </>
              )}
              <Button size="xs" variant="ghost" onClick={() => (decide(d.id, "rejected"), setEditing(null))}>
                <X /> Reject
              </Button>
            </div>
          )}
        </article>
      ))}
    </section>
  );
}

function Flags({ course }: { course: Course }) {
  const flags = useOpen((s) => s.flags).filter((f) => f.courseSlug === course.slug);
  const resolve = (id: string, status: "fixed" | "dismissed") => setOpen((st) => ({ flags: st.flags.map((x) => (x.id === id ? { ...x, status, resolvedAt: new Date().toISOString() } : x)) }));

  return (
    <section className="rounded-2xl border bg-card p-5 lg:col-span-2">
      <h2 className="text-lg font-semibold">Quality flags</h2>
      <p className="text-sm text-muted-foreground">Raised by item statistics, AI monitoring and learners. They go to you — the platform never silently changes your content (FR-QA-3). Open broken-link and accessibility flags block publishing.</p>
      {flags.length === 0 && <p className="mt-3 text-sm text-muted-foreground">No flags for this course.</p>}
      <ul className="mt-3 divide-y">
        {flags.map((f) => (
          <li key={f.id} className={cn("flex flex-wrap items-start gap-3 py-3", f.status !== "open" && "opacity-60")}>
            <AlertTriangle className="mt-0.5 size-4 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{f.target}</p>
              <p className="text-sm text-muted-foreground">{f.detail}</p>
              <p className="text-xs text-muted-foreground">
                {f.status === "open" ? `${FLAG_KIND[f.kind]} · from ${FLAG_SOURCE[f.source]}` : `${FLAG_KIND[f.kind]} · from ${FLAG_SOURCE[f.source]} · ${STATUS[f.status]}`}
              </p>
            </div>
            {f.status === "open" && (
              <div className="flex gap-1.5">
                <Button size="xs" variant="outline" onClick={() => (resolve(f.id, "fixed"), toast.success("Marked fixed — it goes out with the next version"))}>
                  Mark fixed
                </Button>
                <Button size="xs" variant="ghost" onClick={() => resolve(f.id, "dismissed")}>
                  Dismiss
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
