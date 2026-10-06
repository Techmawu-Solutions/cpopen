"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Eye, Plus, RotateCcw, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { activitiesOf } from "@/lib/data/courses";
import { itemById } from "@/lib/data/items";
import { skillName } from "@/lib/data/graph";
import { courseQuestions, discardVideoDraft, effectiveQuestions, itemsFor, publishVideoQuestions, questionProblems, saveVideoDraft, videoDuration, videoKey, type VideoWhich } from "@/lib/studio-video";
import { useOpen } from "@/lib/store";
import { byTime, fmtClock } from "@/lib/video-questions";
import type { Activity, Course, VideoQuestion } from "@/lib/types";
import { cn } from "@/lib/utils";

/** "2:35", "1:02:05" or "155" → seconds; null when it isn't a time. */
function parseClock(text: string): number | null {
  const t = text.trim();
  if (/^\d+$/.test(t)) return Number(t);
  const m = /^(?:(\d+):)?(\d{1,2}):(\d{2})$/.exec(t);
  if (!m || Number(m[3]) > 59) return null;
  return Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

/**
 * In-video questions in the Studio (spec section 6.17, FR-VP-4): place
 * questions from the course's item bank at moments in a lesson video or its
 * recorded lecture, mark them required or optional, save a draft, preview it
 * in the lesson and publish. Learners only ever get the published version.
 */
export function VideoQuestionsEditor({ course }: { course: Course }) {
  const videos = activitiesOf(course).filter((a) => a.kind === "video");
  const [activityId, setActivityId] = useState(videos[0]?.id ?? "");
  const [which, setWhich] = useState<VideoWhich>("video");
  const activity = videos.find((a) => a.id === activityId) ?? videos[0];

  return (
    <section className="rounded-2xl border bg-card p-5 lg:col-span-2">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">In-video questions</h2>
          <p className="text-sm text-muted-foreground">Questions the video stops on. Answers count towards the skill, like practice. A required question can&apos;t be skipped by seeking past it.</p>
        </div>
        {activity && (
          <div className="flex flex-wrap gap-2">
            <select value={activity.id} onChange={(e) => (setActivityId(e.target.value), setWhich("video"))} className="h-9 max-w-72 rounded-lg border bg-card px-2 text-sm" aria-label="Video">
              {videos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title}
                </option>
              ))}
            </select>
            {activity.lecture && (
              <div className="flex rounded-lg border p-0.5 text-sm" role="radiogroup" aria-label="Which video">
                {(["video", "lecture"] as const).map((w) => (
                  <button key={w} type="button" role="radio" aria-checked={which === w} onClick={() => setWhich(w)} className={cn("rounded-md px-2.5 py-1", which === w ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                    {w === "video" ? "Lesson video" : "Recorded lecture"}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {activity ? <Editor key={videoKey(activity.id, which)} course={course} activity={activity} which={which} /> : <p className="mt-3 text-sm text-muted-foreground">This course has no videos yet.</p>}
    </section>
  );
}

function Editor({ course, activity, which }: { course: Course; activity: Activity; which: VideoWhich }) {
  const s = useOpen();
  const key = videoKey(activity.id, which);
  const edit = s.videoQuestions?.[key];
  const live = effectiveQuestions(s, activity, which);
  const saved = edit ? byTime(edit.draft) : live;
  const [list, setList] = useState<VideoQuestion[]>(saved);
  const [texts, setTexts] = useState<string[]>(() => saved.map((q) => fmtClock(q.at)));
  const [newAt, setNewAt] = useState("");
  const [newItem, setNewItem] = useState("");
  const duration = videoDuration(activity, which);
  const items = itemsFor(course, activity);
  const problems = questionProblems(list, duration);
  const bad = problems.some((p) => p.length > 0);
  const dirty = JSON.stringify(byTime(list)) !== JSON.stringify(saved);
  const unpublished = JSON.stringify(byTime(list)) !== JSON.stringify(live);
  const span = duration ?? Math.max(600, ...list.map((q) => q.at + 60));
  const used = new Set(list.map((q) => q.itemId));

  const change = (n: number, patch: Partial<VideoQuestion>) => setList((l) => l.map((q, k) => (k === n ? { ...q, ...patch } : q)));
  const remove = (n: number) => {
    setList((l) => l.filter((_, k) => k !== n));
    setTexts((t) => t.filter((_, k) => k !== n));
  };
  const add = () => {
    const at = parseClock(newAt);
    if (at == null) return void toast.error("Type a time such as 2:35");
    if (duration != null && at > duration) return void toast.error(`The video is only ${fmtClock(duration)} long`);
    if (!newItem) return void toast.error("Choose a question from the item bank");
    setList((l) => [...l, { at, itemId: newItem, required: true }]);
    setTexts((t) => [...t, fmtClock(at)]);
    setNewAt("");
    setNewItem("");
  };

  return (
    <div className="mt-4 space-y-4">
      <p className="text-xs text-muted-foreground">
        {edit?.publishedAt ? `Published ${new Date(edit.publishedAt).toLocaleDateString()} by ${edit.publishedBy}` : "Learners see the questions written in the course"}
        {" · "}
        {live.length === 1 ? "1 question live" : `${live.length} questions live`}
        {duration != null ? ` · video ${fmtClock(duration)}` : " · recorded lecture (length set by YouTube)"}
        {dirty ? " · unsaved changes" : unpublished ? " · draft not published" : ""}
      </p>

      {/* Where each question sits in the video. */}
      <div className="relative h-6" aria-hidden>
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-muted" />
        {list.map((q, n) => (
          <span key={n} title={`${fmtClock(q.at)} · ${itemById.get(q.itemId)?.stem.split("\n")[0] ?? ""}`} className={cn("absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card", problems[n]!.length ? "bg-amber-500" : q.required ? "bg-primary" : "bg-muted-foreground")} style={{ left: `${Math.min(100, (q.at / span) * 100)}%` }} />
        ))}
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">No questions in this video yet.</p>
      ) : (
        <ol className="divide-y rounded-xl border">
          {list.map((q, n) => (
            <li key={n} className="flex flex-wrap items-start gap-2 p-3">
              <Input
                value={texts[n] ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setTexts((t) => t.map((x, k) => (k === n ? v : x)));
                  const at = parseClock(v);
                  if (at != null) change(n, { at });
                }}
                onBlur={() => setTexts((t) => t.map((x, k) => (k === n ? fmtClock(q.at) : x)))}
                className="h-8 w-20 font-mono text-sm"
                aria-label={`Time of question ${n + 1}`}
              />
              <select value={q.itemId} onChange={(e) => change(n, { itemId: e.target.value })} className="h-8 min-w-0 flex-1 basis-60 rounded-lg border bg-card px-2 text-sm" aria-label={`Question ${n + 1}`}>
                {items.map((i) => (
                  <option key={i.id} value={i.id} disabled={i.id !== q.itemId && used.has(i.id)}>
                    {skillName(i.skill)} — {i.stem.split("\n")[0]!.slice(0, 90)}
                  </option>
                ))}
              </select>
              <label className="flex h-8 items-center gap-1.5 text-sm">
                <input type="checkbox" checked={!!q.required} onChange={(e) => change(n, { required: e.target.checked })} className="accent-primary" /> Required
              </label>
              <Button size="icon-sm" variant="ghost" onClick={() => remove(n)} aria-label={`Remove question ${n + 1}`}>
                <Trash2 />
              </Button>
              {problems[n]!.length > 0 && <p className="w-full text-xs text-amber-700 dark:text-amber-300">This question {problems[n]!.join(", ")}.</p>}
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed p-3">
        <Input value={newAt} onChange={(e) => setNewAt(e.target.value)} placeholder="m:ss" className="h-8 w-20 font-mono text-sm" aria-label="Time for the new question" />
        <select value={newItem} onChange={(e) => setNewItem(e.target.value)} className="h-8 min-w-0 flex-1 basis-60 rounded-lg border bg-card px-2 text-sm" aria-label="Question to add">
          <option value="">Choose a question from the item bank…</option>
          {items
            .filter((i) => !used.has(i.id))
            .map((i) => (
              <option key={i.id} value={i.id}>
                {skillName(i.skill)} — {i.stem.split("\n")[0]!.slice(0, 90)}
              </option>
            ))}
        </select>
        <Button size="sm" variant="outline" onClick={add}>
          <Plus /> Add question
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" disabled={!dirty} onClick={() => (saveVideoDraft(key, list), toast.success("Draft saved"))}>
          <Save /> Save draft
        </Button>
        <Button
          size="sm"
          disabled={bad || !unpublished}
          onClick={() => {
            publishVideoQuestions(key, list, s.profile?.name ?? "Instructor");
            toast.success("Published — learners get these questions next time they open the lesson");
          }}
        >
          <Upload /> Publish
        </Button>
        <Link href={`/learn/${course.slug}/${encodeURIComponent(activity.id)}?questions=draft`} target="_blank" onClick={() => dirty && saveVideoDraft(key, list)} className="inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[0.8rem] font-medium hover:bg-muted">
          <Eye className="size-3.5" /> Preview draft in the lesson
        </Link>
        {(dirty || unpublished) && edit && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              discardVideoDraft(key, live);
              setList(live);
              setTexts(live.map((q) => fmtClock(q.at)));
            }}
          >
            <RotateCcw /> Discard draft
          </Button>
        )}
        {edit?.published && JSON.stringify(byTime(edit.published)) !== JSON.stringify(courseQuestions(activity, which)) && !dirty && !unpublished && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Check className="size-3.5" /> Learners have your published version
          </span>
        )}
      </div>
    </div>
  );
}
