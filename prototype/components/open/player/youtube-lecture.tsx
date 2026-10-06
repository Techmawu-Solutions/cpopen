"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { ExternalLink, Pause, Play, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ItemQuestion } from "@/components/open/player/practice";
import { itemById } from "@/lib/data/items";
import { recordAnswer } from "@/lib/learning";
import { byTime, dueQuestion, fmtClock, seekBlocker } from "@/lib/video-questions";
import type { YouTubeLecture } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * A recorded YouTube lecture played inside Open (FR-VP-1). YouTube refuses to play
 * embeds that send no referrer (its error 153), so the frame keeps the page's origin.
 * The privacy-enhanced domain sets no cookies until the learner presses play.
 *
 * A lecture with checkpoint questions (FR-VP-4) runs through the YouTube player API
 * with YouTube's own controls hidden, so the video pauses at each question and a
 * forward seek can't skip a required one. Answers are evidence for the item's skill.
 */
export function YouTubeLecturePlayer({ lecture, record = false }: { lecture: YouTubeLecture; record?: boolean }) {
  return (
    <section className="space-y-2 rounded-2xl border bg-card p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <PlayCircle className="size-4 text-primary" /> Recorded lecture
        {lecture.questions?.length ? <span className="text-xs font-normal text-muted-foreground">· {lecture.questions.length === 1 ? "1 checkpoint question" : `${lecture.questions.length} checkpoint questions`}</span> : null}
      </p>
      {lecture.questions?.length ? <InteractiveLecture lecture={lecture} record={record} /> : <PlainLecture lecture={lecture} />}
      <p className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {lecture.title} · {lecture.channel}
        </span>
        <a href={`https://www.youtube.com/watch?v=${lecture.youtubeId}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
          <ExternalLink className="size-3" /> Watch on YouTube
        </a>
      </p>
    </section>
  );
}

function PlainLecture({ lecture }: { lecture: YouTubeLecture }) {
  const src = `https://www.youtube-nocookie.com/embed/${lecture.youtubeId}?rel=0${lecture.start ? `&start=${lecture.start}` : ""}`;
  return (
    <div className="overflow-hidden rounded-xl border bg-black">
      <iframe src={src} title={lecture.title} className="aspect-video w-full" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
    </div>
  );
}

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(s: number, ahead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getIframe(): HTMLIFrameElement;
  destroy(): void;
}
type YTNamespace = { Player: new (el: HTMLElement, o: Record<string, unknown>) => YTPlayer };
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}
let api: Promise<YTNamespace> | null = null;
function loadApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  api ??= new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => (prev?.(), resolve(window.YT!));
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.onerror = () => ((api = null), reject(new Error("YouTube couldn't be reached.")));
    document.head.appendChild(s);
  });
  return api;
}

function InteractiveLecture({ lecture, record }: { lecture: YouTubeLecture; record: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const last = useRef(lecture.start ?? 0);
  const [questions] = useState(() => byTime(lecture.questions));
  const [answered, setAnswered] = useState<Set<string>>(() => new Set());
  const [asking, setAsking] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(lecture.start ?? 0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const ask = (id: string, at: number) => {
    player.current?.pauseVideo();
    player.current?.seekTo(at, true);
    last.current = at;
    setAsking(id);
  };
  // Runs on every time sample: catch questions playback reached, and seeks made some other way.
  const onTick = useEffectEvent((t: number) => {
    const prev = last.current;
    if (asking) {
      const q = questions.find((x) => x.itemId === asking);
      if (q && Math.abs(t - q.at) > 0.6) ask(q.itemId, q.at);
      return;
    }
    if (t - prev > 1.5) {
      const blocker = seekBlocker(questions, t, answered);
      if (blocker) {
        toast.info("Answer this question to move on");
        return ask(blocker.itemId, blocker.at);
      }
      last.current = t;
      return;
    }
    last.current = t;
    setTime(t);
    const due = dueQuestion(questions, prev, t + 1e-6, answered);
    if (due) ask(due.itemId, due.at);
  });

  useEffect(() => {
    let poll = 0;
    let gone = false;
    const mount = document.createElement("div");
    host.current!.appendChild(mount);
    loadApi()
      .then((YT) => {
        if (gone) return;
        player.current = new YT.Player(mount, {
          videoId: lecture.youtubeId,
          host: "https://www.youtube-nocookie.com",
          width: "100%",
          height: "100%",
          playerVars: { controls: 0, disablekb: 1, rel: 0, playsinline: 1, modestbranding: 1, fs: 0, start: lecture.start ?? 0, origin: window.location.origin },
          events: {
            onReady: () => {
              player.current!.getIframe().referrerPolicy = "strict-origin-when-cross-origin";
              player.current!.getIframe().setAttribute("tabindex", "-1");
              setDuration(player.current!.getDuration());
            },
            onStateChange: (e: { data: number }) => {
              window.clearInterval(poll);
              setPlaying(e.data === 1);
              if (e.data === 1) poll = window.setInterval(() => player.current && onTick(player.current.getCurrentTime()), 200);
            },
            onError: () => setError("This lecture can't be played here. Open it on YouTube instead."),
          },
        });
      })
      .catch((e: Error) => setError(e.message));
    return () => {
      gone = true;
      window.clearInterval(poll);
      try {
        player.current?.destroy();
      } catch {
        /* already gone */
      }
      player.current = null;
      mount.remove();
    };
  }, [lecture.youtubeId, lecture.start]);

  const seek = (to: number) => {
    const blocker = to > last.current ? seekBlocker(questions, to, answered) : null;
    if (blocker) {
      toast.info("Answer this question to move on");
      return ask(blocker.itemId, blocker.at);
    }
    player.current?.seekTo(to, true);
    last.current = to;
    setTime(to);
  };
  const toggle = () => {
    if (asking || !player.current) return;
    if (playing) player.current.pauseVideo();
    else player.current.playVideo();
  };
  const item = asking ? itemById.get(asking) : undefined;
  const len = duration || Math.max(1, ...questions.map((q) => q.at + 60));

  return (
    <div className="overflow-hidden rounded-xl border bg-black text-white">
      <div className="relative aspect-video">
        <div ref={host} className="absolute inset-0 [&_iframe]:size-full" />
        {/* Clicks on the picture go to our controls, so YouTube's own can't skip a question. */}
        <button type="button" tabIndex={-1} aria-hidden className="absolute inset-0 z-10" onClick={toggle} />
        {error && <p className="absolute inset-0 z-30 grid place-items-center bg-black/85 p-6 text-center text-sm">{error}</p>}
        {item && (
          <div className="absolute inset-0 z-20 overflow-y-auto bg-background p-4 text-foreground">
            <p className="mb-2 text-xs font-medium text-primary uppercase">
              Checkpoint {questions.findIndex((q) => q.itemId === item.id) + 1} of {questions.length}
              {questions.find((q) => q.itemId === item.id)?.required ? " · required" : ""}
            </p>
            <ItemQuestion
              key={item.id}
              item={item}
              allowHints={false}
              onDone={(correct) => {
                if (record) recordAnswer(item, correct, "video_question");
                setAnswered((a) => new Set(a).add(item.id));
              }}
              doneLabel="Continue the lecture"
              onContinue={() => {
                setAsking(null);
                player.current?.playVideo();
              }}
            />
            {!questions.find((q) => q.itemId === item.id)?.required && !answered.has(item.id) && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setAnswered((a) => new Set(a).add(item.id));
                  setAsking(null);
                  player.current?.playVideo();
                }}
              >
                Skip this question
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 bg-neutral-950 px-3 py-2">
        <Button size="icon-sm" variant="ghost" className="text-white hover:bg-white/15 hover:text-white" onClick={toggle} disabled={!!asking} aria-label={playing ? "Pause" : "Play"}>
          {playing ? <Pause /> : <Play />}
        </Button>
        <span className="w-28 text-xs tabular-nums text-white/85">
          {fmtClock(time)} / {fmtClock(len)}
        </span>
        <div className="relative min-w-0 flex-1">
          <input type="range" min={0} max={len} step={1} value={time} onChange={(e) => seek(Number(e.target.value))} disabled={!!asking} className="w-full accent-white" aria-label="Seek" />
          {questions.map((q) => (
            <span key={q.itemId} title={answered.has(q.itemId) ? "Question answered" : "Question"} className={cn("pointer-events-none absolute -top-0.5 size-2.5 -translate-x-1/2 rounded-full ring-2 ring-neutral-950", answered.has(q.itemId) ? "bg-emerald-400" : "bg-white")} style={{ left: `${(q.at / len) * 100}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
