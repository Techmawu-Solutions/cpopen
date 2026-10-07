"use client";

import { Suspense, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, FileText, FileUp, Film, Loader2, Package, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { PageTitle } from "@/components/open/bits";
import { RoleGate } from "@/components/open/role-gate";
import { courseBySlug } from "@/lib/data/courses";
import { studioCourses } from "@/lib/studio";
import { useOpen, type MediaUpload } from "@/lib/store";
import { approveCaptions, draftFrom, removeUpload, renditions, stageOf, startUpload, type Stage } from "@/lib/uploads";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

/** Videos picked in this tab can be previewed until the page reloads; the prototype stores no files. */
const previews = new Map<string, string>();

const MAX_VIDEO_MB = 4096;
const CAPTION_LANGUAGES = ["English", "French", "Portuguese", "Spanish"];
const SAMPLES = {
  video: { fileName: "worked-example.mp4", sizeMb: 84 },
  document: { fileName: "course-syllabus.pdf", sizeMb: 2 },
  package: { fileName: "question-bank-qti.zip", sizeMb: 6 },
};

/**
 * Adding content (spec section 13.1, FR-ST-1, FR-CA-6, FR-VP-2): upload a
 * lesson video and review its captions, give the AI Studio source documents
 * to draft from, or import a package of questions.
 */
export default function UploadPage() {
  return (
    <RoleGate roles={["instructor"]} title="Adding content is for instructors" persona="mensah">
      <Suspense>
        <Body />
      </Suspense>
    </RoleGate>
  );
}

function Body() {
  const s = useOpen();
  const { mine, shared } = studioCourses(s.profile?.name);
  const asked = useSearchParams().get("course");
  const [slug, setSlug] = useState(asked && courseBySlug.has(asked) ? asked : (mine.find((c) => c.authored) ?? mine[0] ?? shared[0]!).slug);
  const course = courseBySlug.get(slug)!;
  const uploads = s.uploads.filter((u) => u.courseSlug === slug);

  return (
    <>
      <PageTitle title="Add content" description="Upload lesson videos and source documents. Nothing reaches learners until you've checked it and the next version is approved.">
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
      </PageTitle>

      <div key={slug} className="grid gap-6 lg:grid-cols-3">
        <VideoUpload slug={slug} />
        <DocumentUpload slug={slug} kind="document" />
        <DocumentUpload slug={slug} kind="package" />
      </div>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-xl font-semibold">Uploads for this course</h2>
          <Link href="/studio" className="text-sm text-primary hover:underline">
            Back to the studio
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">Uploads are resumable: a dropped connection picks up where it stopped. Processing carries on if you leave this page.</p>
        {uploads.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">{`Nothing uploaded for ${course.title} yet.`}</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {uploads.map((u) => (
              <UploadRow key={u.id} upload={u} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

/** Picks a real file (name and size only), or uses a sample so the demo works without one. */
function FilePick({ accept, onPick, label }: { accept: string; onPick: (f: { fileName: string; sizeMb: number; file?: File }) => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="sr-only"
        aria-label={label}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick({ fileName: f.name, sizeMb: Math.max(1, Math.round(f.size / 1048576)), file: f });
          e.target.value = "";
        }}
      />
      <Button size="sm" variant="outline" onClick={() => ref.current?.click()}>
        <FileUp /> Choose a file
      </Button>
    </>
  );
}

function VideoUpload({ slug }: { slug: string }) {
  const profile = useOpen((s) => s.profile);
  const course = courseBySlug.get(slug)!;
  const lessons = course.modules.flatMap((m) => m.lessons);
  const [file, setFile] = useState<{ fileName: string; sizeMb: number; file?: File } | null>(null);
  const [title, setTitle] = useState("");
  const [lessonId, setLessonId] = useState(lessons[0]?.id ?? "");
  const [lang, setLang] = useState("English");

  const submit = () => {
    if (!file) return void toast.error("Choose a video file, or use the sample");
    if (file.sizeMb > MAX_VIDEO_MB) return void toast.error("Videos can be up to 4 GB");
    const u = startUpload({ courseSlug: slug, kind: "video", fileName: file.fileName, sizeMb: file.sizeMb, title: title.trim() || file.fileName.replace(/\.[^.]+$/, ""), lessonId, captionLanguage: lang }, profile);
    if (file.file) previews.set(u.id, URL.createObjectURL(file.file));
    setFile(null);
    setTitle("");
    toast.success("Uploading — you can keep working while it processes");
  };

  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Film className="size-5 text-primary" /> Lesson video
      </h2>
      <p className="text-sm text-muted-foreground">MP4, MOV or WebM, up to 4 GB. It&apos;s converted for every connection, from audio-only to 1080p, and captioned automatically for you to check.</p>
      <div className="flex flex-wrap items-center gap-2">
        <FilePick accept="video/*" label="Video file" onPick={setFile} />
        <Button size="sm" variant="ghost" onClick={() => setFile(SAMPLES.video)}>
          Use a sample video
        </Button>
      </div>
      {file && <p className="truncate text-sm">{`${file.fileName} · ${file.sizeMb} MB`}</p>}
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title learners see" aria-label="Video title" />
      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground">Lesson</span>
        <select value={lessonId} onChange={(e) => setLessonId(e.target.value)} className="h-9 rounded-lg border bg-card px-2">
          {lessons.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground">Spoken language (for captions)</span>
        <select value={lang} onChange={(e) => setLang(e.target.value)} className="h-9 rounded-lg border bg-card px-2">
          {CAPTION_LANGUAGES.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <Button className="mt-auto" onClick={submit}>
        <FileUp /> Upload video
      </Button>
    </section>
  );
}

function DocumentUpload({ slug, kind }: { slug: string; kind: "document" | "package" }) {
  const profile = useOpen((s) => s.profile);
  const [file, setFile] = useState<{ fileName: string; sizeMb: number } | null>(null);
  const doc = kind === "document";

  const submit = () => {
    if (!file) return void toast.error(doc ? "Choose a document, or use the sample" : "Choose a package, or use the sample");
    startUpload({ courseSlug: slug, kind, fileName: file.fileName, sizeMb: file.sizeMb, title: file.fileName }, profile);
    setFile(null);
    toast.success(doc ? "Uploading — the AI Studio reads it next" : "Uploading — the questions are read next");
  };

  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        {doc ? <FileText className="size-5 text-primary" /> : <Package className="size-5 text-primary" />} {doc ? "Source documents" : "Import questions"}
      </h2>
      <p className="text-sm text-muted-foreground">
        {doc
          ? "A syllabus, notes, slides or a licensed textbook chapter (PDF, Word, PowerPoint). The AI Studio drafts a lesson outline and practice from it. Every draft waits for your approval."
          : "A QTI 3 question bank or a Common Cartridge package. Its questions arrive as a draft for you to check and map to skills."}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <FilePick accept={doc ? ".pdf,.doc,.docx,.ppt,.pptx,.txt,.md" : ".zip,.imscc,.xml"} label={doc ? "Document file" : "Package file"} onPick={setFile} />
        <Button size="sm" variant="ghost" onClick={() => setFile(SAMPLES[kind])}>
          {doc ? "Use a sample syllabus" : "Use a sample package"}
        </Button>
      </div>
      {file && <p className="truncate text-sm">{`${file.fileName} · ${file.sizeMb} MB`}</p>}
      {!doc && <p className="text-xs text-muted-foreground">SCORM packages are planned for phase 2 (FR-CA-6).</p>}
      <Button className="mt-auto" variant="secondary" onClick={submit}>
        <FileUp /> {doc ? "Upload document" : "Import package"}
      </Button>
    </section>
  );
}

const STEPS: Record<MediaUpload["kind"], { stage: Stage; label: string }[]> = {
  video: [
    { stage: "uploading", label: "Upload" },
    { stage: "processing", label: "Convert" },
    { stage: "captioning", label: "Captions" },
    { stage: "caption_review", label: "Your check" },
    { stage: "ready", label: "Ready" },
  ],
  document: [
    { stage: "uploading", label: "Upload" },
    { stage: "processing", label: "Read" },
    { stage: "ready", label: "Ready" },
  ],
  package: [
    { stage: "uploading", label: "Upload" },
    { stage: "processing", label: "Read" },
    { stage: "ready", label: "Ready" },
  ],
};

function UploadRow({ upload: u }: { upload: MediaUpload }) {
  const now = useNow(500);
  const { stage, pct } = stageOf(u, now);
  const steps = STEPS[u.kind];
  const at = steps.findIndex((x) => x.stage === stage);
  const course = courseBySlug.get(u.courseSlug)!;
  const lesson = course.modules.flatMap((m) => m.lessons).find((l) => l.id === u.lessonId);
  const [captions, setCaptions] = useState(u.captions ?? "");
  const preview = previews.get(u.id);

  return (
    <li className="rounded-2xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{u.title}</p>
          <p className="text-xs text-muted-foreground">
            {u.fileName} · {`${u.sizeMb} MB`}
            {lesson && <> · {lesson.title}</>}
            {u.captionLanguage && <> · {u.captionLanguage}</>}
          </p>
        </div>
        <Button size="icon-sm" variant="ghost" onClick={() => removeUpload(u.id)} aria-label="Remove upload">
          <Trash2 />
        </Button>
      </div>

      <ol className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Progress">
        {steps.map((x, n) => (
          <li key={x.stage} className={cn("flex items-center gap-1", n < at || stage === "ready" ? "text-emerald-700 dark:text-emerald-300" : n === at ? "font-medium text-foreground" : "text-muted-foreground")}>
            {n < at || stage === "ready" ? <Check className="size-3.5" /> : n === at ? <Loader2 className="size-3.5 animate-spin" /> : <span className="size-3.5 rounded-full border" />}
            {x.label}
          </li>
        ))}
      </ol>

      {stage === "uploading" && (
        <div className="mt-3">
          <Progress value={Math.round(pct * 100)} />
          <p className="mt-1 text-xs text-muted-foreground">{`${Math.round(pct * u.sizeMb)} of ${u.sizeMb} MB`}</p>
        </div>
      )}
      {stage === "processing" && <p className="mt-3 text-sm text-muted-foreground">{u.kind === "video" ? "Converting to audio-only, 144p, 360p, 720p and 1080p…" : u.kind === "package" ? "Reading the questions and answer keys…" : "Reading the document…"}</p>}
      {stage === "captioning" && <p className="mt-3 text-sm text-muted-foreground">Writing captions from the speech…</p>}

      {u.kind === "video" && (stage === "caption_review" || stage === "ready") && (
        <div className="mt-3 grid gap-4 md:grid-cols-[1fr_16rem]">
          <div>
            {stage === "caption_review" ? (
              <>
                <p className="text-sm font-medium">Check the automatic captions</p>
                <p className="text-xs text-muted-foreground">Fix names and terms the machine got wrong. Learners only see captions a person has checked.</p>
                <Textarea className="mt-2 font-mono text-xs" rows={6} value={captions} onChange={(e) => setCaptions(e.target.value)} aria-label="Captions" />
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    approveCaptions(u.id, captions);
                    toast.success("Captions approved — the video goes out with the next version");
                  }}
                >
                  <Check /> Approve captions
                </Button>
              </>
            ) : (
              <p className="flex items-center gap-1.5 text-sm text-emerald-800 dark:text-emerald-200">
                <Check className="size-4" /> Ready. It goes out with the next version of the course.{" "}
                <Link href="/studio" className="text-primary hover:underline">
                  Publish it from the studio
                </Link>
              </p>
            )}
            {preview && <video src={preview} controls className="mt-3 aspect-video w-full rounded-xl bg-black" />}
          </div>
          <div className="rounded-xl border p-3 text-sm">
            <p className="font-medium">Versions for every connection</p>
            <ul className="mt-1 space-y-0.5 text-muted-foreground">
              {renditions(u.sizeMb).map((r) => (
                <li key={r.label} className="flex justify-between gap-2 tabular-nums">
                  <span>{r.label}</span>
                  <span>{`${r.mb} MB`}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {u.kind !== "video" && stage === "ready" && (
        <div className="mt-3">
          {u.draftsCreatedAt ? (
            <p className="flex items-center gap-1.5 text-sm text-emerald-800 dark:text-emerald-200">
              <Check className="size-4" /> Drafts are waiting in the studio.{" "}
              <Link href="/studio" className="text-primary hover:underline">
                Review them
              </Link>
            </p>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                const n = draftFrom(u);
                toast.success(n === 1 ? "1 draft added — it waits for your approval in the studio" : `${n} drafts added — they wait for your approval in the studio`);
              }}
            >
              <Sparkles /> {u.kind === "package" ? "Add the questions as a draft" : "Draft from this document"}
            </Button>
          )}
        </div>
      )}
    </li>
  );
}
