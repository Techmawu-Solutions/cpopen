"use client";

import { Flag, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { skillName } from "@/lib/data/graph";
import { LOW_DISCRIMINATION, courseAnalytics } from "@/lib/studio";
import { setOpen, uid, useOpen } from "@/lib/store";
import type { Course } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Course analytics for the instructor (FR-QA-4, the spec section 4.4 journey):
 * where learners stop, and which assessment items don't work. Simulated from
 * the course data in the prototype; computed nightly from `item_statistics`
 * and the event pipeline in production.
 */
export function AnalyticsPanel({ course }: { course: Course }) {
  const flags = useOpen((s) => s.flags);
  const a = courseAnalytics(course);
  const flagged = (id: string) => flags.some((f) => f.courseSlug === course.slug && f.target.startsWith(`Item ${id} `));

  return (
    <section className="rounded-2xl border bg-card p-5 lg:col-span-2">
      <h2 className="text-lg font-semibold">Learners and analytics</h2>
      <p className="text-sm text-muted-foreground">Where learners stop, and which questions don&apos;t tell strong learners from weak ones. Simulated data in the prototype.</p>

      <dl className="mt-4 grid grid-cols-3 gap-3">
        {[
          { label: "Learners", value: a.learners.toLocaleString() },
          { label: "Reach mastery", value: `${a.masteryRate}%` },
          { label: "Finish the course", value: `${a.finished}%` },
        ].map((x) => (
          <div key={x.label} className="rounded-xl border p-3">
            <dt className="text-xs text-muted-foreground">{x.label}</dt>
            <dd className="mt-0.5 text-2xl font-semibold tabular-nums">{x.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-medium">Learners still going, by lesson</h3>
          <ol className="mt-2 space-y-1.5">
            {a.funnel.map((f) => (
              <li key={f.id} className="grid grid-cols-[minmax(0,1fr)_7rem_2.75rem] items-center gap-3 text-sm">
                <span className="truncate">
                  {f.n}. {f.title}
                </span>
                <span className="h-2 overflow-hidden rounded-full bg-muted">
                  <span className={cn("block h-full rounded-full", a.worst?.id === f.id ? "bg-amber-500" : "bg-primary")} style={{ width: `${f.pct}%` }} />
                </span>
                <span className="text-right tabular-nums">{f.pct}%</span>
              </li>
            ))}
          </ol>
          {a.worst && (
            <p className="mt-3 flex items-start gap-1.5 text-sm text-amber-800 dark:text-amber-200">
              <TrendingDown className="mt-0.5 size-4 shrink-0" />
              <span>{`Biggest drop: lesson ${a.worst.n}, down ${a.worst.drop} points. Look at its length and difficulty first.`}</span>
            </p>
          )}
        </div>

        <div>
          <h3 className="text-sm font-medium">Assessment items</h3>
          <p className="text-xs text-muted-foreground">{`Correct = share of learners who get it right. Discrimination below ${LOW_DISCRIMINATION} means the item may be ambiguous.`}</p>
          {a.items.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No assessment items for this course&apos;s skills yet.</p>
          ) : (
            <div className="mt-2 max-h-80 overflow-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b text-left">
                    <th className="px-3 py-2 font-medium">Item</th>
                    <th className="px-3 py-2 text-right font-medium">Correct</th>
                    <th className="px-3 py-2 text-right font-medium">Discrimination</th>
                  </tr>
                </thead>
                <tbody>
                  {a.items.map((i) => (
                    <tr key={i.id} className={cn("border-b align-top last:border-0", i.low && "bg-amber-50 dark:bg-amber-950/30")}>
                      <td className="px-3 py-2">
                        <p className="line-clamp-2">{i.stem}</p>
                        <p className="text-xs text-muted-foreground">
                          {i.id} · {skillName(i.skill)} · {`${i.responses.toLocaleString()} answers`}
                        </p>
                        {i.low &&
                          (flagged(i.id) ? (
                            <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">In your quality flags</p>
                          ) : (
                            <Button
                              size="xs"
                              variant="outline"
                              className="mt-1"
                              onClick={() => {
                                setOpen((st) => ({ flags: [{ id: uid("flag"), courseSlug: course.slug, kind: "ambiguous_item", target: `Item ${i.id} — “${i.stem.slice(0, 60)}”`, detail: `Discrimination ${i.discrimination.toFixed(2)} (below ${LOW_DISCRIMINATION}). Check the options and the answer key.`, source: "psychometrics", status: "open" }, ...st.flags] }));
                                toast("Added to your quality flags");
                              }}
                            >
                              <Flag /> Flag for review
                            </Button>
                          ))}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{Math.round(i.pValue * 100)}%</td>
                      <td className={cn("px-3 py-2 text-right tabular-nums", i.low && "font-medium text-amber-800 dark:text-amber-200")}>{i.discrimination.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
