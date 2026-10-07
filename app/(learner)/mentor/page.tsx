"use client";

import { useState } from "react";
import Link from "next/link";
import { BellRing, CalendarPlus, Check, MessageCircle, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageTitle } from "@/components/open/bits";
import { RoleGate } from "@/components/open/role-gate";
import { courseOfActivity, findActivity } from "@/lib/data/courses";
import { AT_RISK_DAYS, MENTOR_LEARNERS } from "@/lib/data/portals";
import { setOpen, uid, useOpen, type HelpRequest } from "@/lib/store";
import { cn } from "@/lib/utils";

const fmtDateTime = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/**
 * The mentor's portal (spec section 5.3: assigned learners, feedback queue,
 * sessions, progress). Questions come from the tutor's "Ask a person" and from
 * its safeguarding escalations (FR-AI-6); safeguarding comes first. The
 * learner reads the answer in the lesson.
 */
export default function MentorPage() {
  return (
    <RoleGate roles={["mentor"]} title="Mentoring is for mentors" persona="esi">
      <Mentor />
    </RoleGate>
  );
}

function Mentor() {
  const s = useOpen();
  const open = s.helpRequests.filter((h) => h.status === "open").sort((a, b) => Number(b.source === "safeguarding") - Number(a.source === "safeguarding") || a.at.localeCompare(b.at));
  const answered = s.helpRequests.filter((h) => h.status === "answered");
  const atRisk = MENTOR_LEARNERS.filter((l) => l.lastActiveDays >= AT_RISK_DAYS);

  return (
    <>
      <PageTitle title="Mentoring" description="Learners' questions to a person, learners who've gone quiet, and your sessions." />

      <dl className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: "Questions waiting", value: open.length },
          { label: "Learners at risk", value: atRisk.length },
          { label: "Sessions booked", value: s.mentorSessions.length },
        ].map((x) => (
          <div key={x.label} className="rounded-2xl border bg-card p-4">
            <dt className="text-sm text-muted-foreground">{x.label}</dt>
            <dd className="mt-1 text-3xl font-semibold tabular-nums">{x.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Questions waiting</h2>
          {open.length === 0 && <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">All caught up. Questions from the tutor&apos;s “Ask a person” arrive here.</p>}
          {open.map((h) => (
            <Question key={h.id} h={h} />
          ))}
          {answered.length > 0 && (
            <details className="rounded-2xl border bg-card p-4">
              <summary className="cursor-pointer text-sm font-medium">{`Answered (${answered.length})`}</summary>
              <ul className="mt-2 divide-y text-sm">
                {answered.map((h) => (
                  <li key={h.id} className="py-2">
                    <p className="text-xs text-muted-foreground">{`${h.from} · answered by ${h.answeredBy}`}</p>
                    <p className="italic">“{h.question}”</p>
                    <p className="mt-1">{h.answer}</p>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        <div className="space-y-6">
          <Learners />
          <Sessions />
        </div>
      </div>
    </>
  );
}

function Question({ h }: { h: HelpRequest }) {
  const name = useOpen((s) => s.profile?.name ?? "Mentor");
  const [answer, setAnswer] = useState("");
  const course = courseOfActivity(h.activityId);
  const activity = course ? findActivity(course, h.activityId)?.activity : undefined;
  const urgent = h.source === "safeguarding";

  return (
    <article className={cn("rounded-2xl border bg-card p-4", urgent && "border-red-300 bg-red-50/60 dark:border-red-900 dark:bg-red-950/20")}>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {urgent ? (
          <Badge variant="destructive">
            <ShieldAlert /> Safeguarding
          </Badge>
        ) : (
          <Badge variant="outline">
            <MessageCircle /> Question
          </Badge>
        )}
        <span className="font-medium text-foreground">{h.from}</span>
        {h.teen && <Badge variant="secondary">Under 18</Badge>}
        <span>{fmtDateTime(h.at)}</span>
      </div>
      {urgent && <p className="mt-2 text-sm font-medium text-red-800 dark:text-red-200">The tutor stopped and passed this on. Reply within an hour; follow the safeguarding procedure if anyone may be at risk.</p>}
      <p className="mt-2">“{h.question}”</p>
      {course && activity && (
        <Link href={`/learn/${course.slug}/${encodeURIComponent(h.activityId)}`} target="_blank" className="mt-1 inline-block text-xs text-primary hover:underline">
          {course.title} · {activity.title}
        </Link>
      )}
      {h.teen && <p className="mt-1 text-xs text-muted-foreground">Under-18 learner: keep replies to the lesson, and never ask for contact details or move to another app.</p>}
      <Textarea className="mt-3" rows={3} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Your reply" aria-label="Your reply" />
      <Button
        size="sm"
        className="mt-2"
        disabled={!answer.trim()}
        onClick={() => {
          setOpen((st) => ({ helpRequests: st.helpRequests.map((x) => (x.id === h.id ? { ...x, status: "answered", answer: answer.trim(), answeredBy: name, answeredAt: new Date().toISOString() } : x)) }));
          toast.success("Sent — the learner sees it in the lesson");
        }}
      >
        <Check /> Send reply
      </Button>
    </article>
  );
}

function Learners() {
  const nudges = useOpen((s) => s.nudges);
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="text-lg font-semibold">Your learners</h2>
      <ul className="mt-2 divide-y">
        {MENTOR_LEARNERS.map((l) => {
          const risk = l.lastActiveDays >= AT_RISK_DAYS;
          return (
            <li key={l.name} className="py-2.5 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  {l.name} {l.teen && <Badge variant="secondary">Under 18</Badge>}
                </p>
                <span className={cn("text-xs", risk ? "font-medium text-amber-700 dark:text-amber-300" : "text-muted-foreground")}>{l.lastActiveDays === 0 ? "Active today" : l.lastActiveDays === 1 ? "Last active yesterday" : `Last active ${l.lastActiveDays} days ago`}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {l.path} · {`${l.progress}% through`} · {l.verifiedSkills === 1 ? "1 skill verified" : `${l.verifiedSkills} skills verified`}
              </p>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${l.progress}%` }} />
              </div>
              {risk &&
                (nudges[l.name] ? (
                  <p className="mt-1.5 text-xs text-muted-foreground">Nudge sent</p>
                ) : (
                  <Button
                    size="xs"
                    variant="outline"
                    className="mt-1.5"
                    onClick={() => {
                      setOpen((st) => ({ nudges: { ...st.nudges, [l.name]: new Date().toISOString() } }));
                      toast.success("Nudge sent — a friendly message with their next step");
                    }}
                  >
                    <BellRing /> Send a nudge
                  </Button>
                ))}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Sessions() {
  const sessions = useOpen((s) => s.mentorSessions);
  const [learner, setLearner] = useState(MENTOR_LEARNERS[0]!.name);
  const [when, setWhen] = useState("");
  const [topic, setTopic] = useState("");
  const sorted = [...sessions].sort((a, b) => a.at.localeCompare(b.at));

  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="text-lg font-semibold">Sessions</h2>
      {sorted.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No sessions booked.</p>
      ) : (
        <ul className="mt-2 divide-y text-sm">
          {sorted.map((m) => (
            <li key={m.id} className="py-2">
              <p className="font-medium">{m.learner}</p>
              <p className="text-xs text-muted-foreground">
                {fmtDateTime(m.at)} · {m.topic}
              </p>
            </li>
          ))}
        </ul>
      )}
      <form
        className="mt-3 grid gap-2 border-t pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!when) return void toast.error("Choose a date and time");
          setOpen((st) => ({ mentorSessions: [...st.mentorSessions, { id: uid("session"), learner, at: new Date(when).toISOString(), topic: topic.trim() || "Mentoring session" }] }));
          setWhen("");
          setTopic("");
          toast.success("Session booked — the learner gets an invitation");
        }}
      >
        <select value={learner} onChange={(e) => setLearner(e.target.value)} className="h-9 rounded-lg border bg-card px-2 text-sm" aria-label="Learner">
          {MENTOR_LEARNERS.map((l) => (
            <option key={l.name} value={l.name}>
              {l.name}
            </option>
          ))}
        </select>
        <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} aria-label="Date and time" />
        <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What it's about" aria-label="Topic" />
        <Button type="submit" size="sm" variant="secondary">
          <CalendarPlus /> Book a session
        </Button>
      </form>
    </section>
  );
}
