import { ExternalLink, PlayCircle } from "lucide-react";
import type { YouTubeLecture } from "@/lib/types";

/**
 * A recorded YouTube lecture played inside Open (FR-VP-1). YouTube refuses to play
 * embeds that send no referrer (its error 153), so the frame keeps the page's origin.
 * The privacy-enhanced domain sets no cookies until the learner presses play.
 */
export function YouTubeLecturePlayer({ lecture }: { lecture: YouTubeLecture }) {
  const src = `https://www.youtube-nocookie.com/embed/${lecture.youtubeId}?rel=0${lecture.start ? `&start=${lecture.start}` : ""}`;
  return (
    <section className="space-y-2 rounded-2xl border bg-card p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <PlayCircle className="size-4 text-primary" /> Recorded lecture
      </p>
      <div className="overflow-hidden rounded-xl border bg-black">
        <iframe
          src={src}
          title={lecture.title}
          className="aspect-video w-full"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
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
