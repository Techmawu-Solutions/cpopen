"use client";

import { useState } from "react";
import Link from "next/link";
import { BadgeCheck, Check, CircleAlert, CircleCheck, ExternalLink, Pause, Play, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageTitle } from "@/components/open/bits";
import { RoleGate } from "@/components/open/role-gate";
import { COURSES } from "@/lib/data/courses";
import { AI_USAGE, APPLICANTS, PAYOUTS, SERVICES, TENANTS, type InstructorApplicant, type Tenant } from "@/lib/data/portals";
import { releasesOf } from "@/lib/studio";
import { setOpen, useOpen, type AdminState } from "@/lib/store";
import { cn } from "@/lib/utils";

const setAdmin = (fn: (a: AdminState) => Partial<AdminState>) => setOpen((s) => ({ admin: { ...s.admin, ...fn(s.admin) } }));
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const KIND: Record<Tenant["kind"], string> = { platform: "Platform", university: "University", corporate: "Organisation", publisher: "Publisher", ngo: "Non-profit" };

/**
 * The platform super administrator's portal (spec section 5.3, section 6.26):
 * tenants, instructor verification (FR-MK-2), content and moderation, AI usage
 * and cost (section 12.6), the ClassProject partner link (section 25.6),
 * system health and payouts (FR-MK-4). Platform numbers are simulated.
 */
export default function AdminPage() {
  return (
    <RoleGate roles={["super_admin"]} title="Administration is for platform administrators" persona="yaw">
      <Admin />
    </RoleGate>
  );
}

function Admin() {
  const s = useOpen();
  const inReview = COURSES.filter((c) => releasesOf(s, c.slug)[0]?.status === "in_review").length;
  const spend = AI_USAGE.reduce((n, f) => n + f.costUsd, 0);

  return (
    <>
      <PageTitle title="Administration" description="The whole platform: organisations, instructors, content, AI spend, partners and system health." />

      <dl className="mb-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Learners", value: "412,380" },
          { label: "Active in 30 days", value: "96,210" },
          { label: "Courses", value: COURSES.length.toLocaleString() },
          { label: "Tenants", value: TENANTS.length.toLocaleString() },
          { label: "Reach mastery", value: "63%" },
          { label: "AI spend this month", value: `$${spend.toLocaleString()}` },
        ].map((x) => (
          <div key={x.label} className="rounded-2xl border bg-card p-4">
            <dt className="text-xs text-muted-foreground">{x.label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{x.value}</dd>
          </div>
        ))}
      </dl>

      <div className="space-y-6">
        <Tenants />
        <div className="grid gap-6 lg:grid-cols-2">
          <Verification />
          <Moderation inReview={inReview} />
        </div>
        <Ai spend={spend} />
        <div className="grid gap-6 lg:grid-cols-2">
          <Partner />
          <Health />
        </div>
        <Payouts />
      </div>
    </>
  );
}

function Tenants() {
  const status = useOpen((s) => s.admin.tenantStatus);
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="text-lg font-semibold">Tenants</h2>
      <p className="text-sm text-muted-foreground">Universities, organisations and publishers with their own space. Suspending one stops its members signing in; nothing is deleted.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-2 font-medium">Name</th>
              <th className="px-2 py-2 font-medium">Kind</th>
              <th className="px-2 py-2 text-right font-medium">Learners</th>
              <th className="px-2 py-2 text-right font-medium">Courses</th>
              <th className="px-2 py-2 font-medium">Data region</th>
              <th className="py-2 pl-2 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {TENANTS.map((t) => {
              const st = status[t.id] ?? "active";
              return (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="py-2 pr-2">
                    <span className="font-medium">{t.name}</span> {t.visibility === "private" && <Badge variant="outline">Private</Badge>}
                  </td>
                  <td className="px-2 py-2 text-muted-foreground">{KIND[t.kind]}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{t.learners.toLocaleString()}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{t.courses}</td>
                  <td className="px-2 py-2 font-mono text-xs">{t.region}</td>
                  <td className="py-2 pl-2 text-right">
                    {t.kind === "platform" ? (
                      <Badge variant="secondary">Active</Badge>
                    ) : (
                      <Button
                        size="xs"
                        variant={st === "active" ? "outline" : "default"}
                        onClick={() => {
                          if (st === "active" && !window.confirm(`Suspend ${t.name}? Its members can't sign in until it's restored.`)) return;
                          setAdmin((a) => ({ tenantStatus: { ...a.tenantStatus, [t.id]: st === "active" ? "suspended" : "active" } }));
                          toast(st === "active" ? `${t.name} suspended` : `${t.name} restored`);
                        }}
                      >
                        {st === "active" ? "Suspend" : "Restore"}
                      </Button>
                    )}
                    {st === "suspended" && <span className="mt-0.5 block text-xs text-red-700 dark:text-red-300">Suspended</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Verification() {
  const decisions = useOpen((s) => s.admin.instructorDecisions);
  const waiting = APPLICANTS.filter((a) => !decisions[a.id]);
  const done = APPLICANTS.filter((a) => decisions[a.id]);
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="text-lg font-semibold">Instructor verification</h2>
      <p className="text-sm text-muted-foreground">Identity, credentials and a sample lesson are checked before anyone can publish (FR-MK-2).</p>
      {waiting.length === 0 && <p className="mt-3 text-sm text-muted-foreground">No applications waiting.</p>}
      <ul className="mt-3 space-y-3">
        {waiting.map((a) => (
          <Applicant key={a.id} a={a} />
        ))}
      </ul>
      {done.length > 0 && (
        <ul className="mt-3 divide-y border-t text-sm">
          {done.map((a) => {
            const d = decisions[a.id]!;
            return (
              <li key={a.id} className="py-2">
                <span className="font-medium">{a.name}</span>{" "}
                <span className="text-xs text-muted-foreground">{d.status === "verified" ? `Verified by ${d.by} · ${fmtDate(d.at)}` : `Rejected by ${d.by} · ${fmtDate(d.at)}`}</span>
                {d.note && <p className="text-xs italic">“{d.note}”</p>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Applicant({ a }: { a: InstructorApplicant }) {
  const by = useOpen((s) => s.profile?.name ?? "Administrator");
  const [note, setNote] = useState("");
  const allChecked = a.checks.identity && a.checks.credentials && a.checks.sampleLesson;
  const decide = (status: "verified" | "rejected") => {
    setAdmin((x) => ({ instructorDecisions: { ...x.instructorDecisions, [a.id]: { status, note: note.trim() || undefined, at: new Date().toISOString(), by } } }));
    toast.success(status === "verified" ? `${a.name} can now publish` : `${a.name} has been told why`);
  };
  const checks: [string, boolean][] = [
    ["Identity", a.checks.identity],
    ["Credentials", a.checks.credentials],
    ["Sample lesson", a.checks.sampleLesson],
  ];
  return (
    <li className="rounded-xl border p-3 text-sm">
      <p className="font-medium">{a.name}</p>
      <p className="text-muted-foreground">{a.expertise}</p>
      <p className="text-xs text-muted-foreground">
        {a.sample} · {`applied ${a.appliedDaysAgo} days ago`}
      </p>
      <ul className="mt-2 flex flex-wrap gap-3 text-xs">
        {checks.map(([label, ok]) => (
          <li key={label} className={cn("flex items-center gap-1", ok ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300")}>
            {ok ? <CircleCheck className="size-3.5" /> : <CircleAlert className="size-3.5" />} {label}
          </li>
        ))}
      </ul>
      <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason (needed to reject)" className="mt-2 h-8" aria-label={`Reason for ${a.name}`} />
      <div className="mt-2 flex gap-1.5">
        <Button size="xs" disabled={!allChecked} onClick={() => decide("verified")}>
          <BadgeCheck /> Verify
        </Button>
        <Button size="xs" variant="outline" disabled={!note.trim()} onClick={() => decide("rejected")}>
          <X /> Reject
        </Button>
      </div>
      {!allChecked && <p className="mt-1 text-xs text-muted-foreground">A check is still open, so this can&apos;t be verified yet.</p>}
    </li>
  );
}

function Moderation({ inReview }: { inReview: number }) {
  const s = useOpen();
  const flags = s.flags.filter((f) => f.status === "open").length;
  const safeguarding = s.helpRequests.filter((h) => h.status === "open" && h.source === "safeguarding").length;
  const questions = s.helpRequests.filter((h) => h.status === "open" && h.source === "learner").length;
  const rows = [
    { label: "Course versions waiting for review", value: inReview, href: "/reviewer" },
    { label: "Open quality flags", value: flags, href: "/reviewer" },
    { label: "Open safeguarding escalations", value: safeguarding, urgent: safeguarding > 0 },
    { label: "Learner questions waiting for a mentor", value: questions },
    { label: "Reported posts", value: 0 },
  ];
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="text-lg font-semibold">Content and moderation</h2>
      <ul className="mt-3 divide-y text-sm">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-2 py-2">
            {r.href ? (
              <Link href={r.href} className="hover:underline">
                {r.label}
              </Link>
            ) : (
              <span>{r.label}</span>
            )}
            <span className={cn("rounded-full px-2 text-sm font-semibold tabular-nums", r.urgent ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" : "bg-muted")}>{r.value}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Ai({ spend }: { spend: number }) {
  const { aiPaused, aiBudgetUsd } = useOpen((s) => s.admin);
  const [budget, setBudget] = useState(String(aiBudgetUsd));
  const pct = Math.min(100, Math.round((spend / aiBudgetUsd) * 100));
  const max = Math.max(...AI_USAGE.map((f) => f.costUsd));

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">AI usage and cost</h2>
          <p className="text-sm text-muted-foreground">This month, by feature. Pausing a feature switches it off for everyone at once; learners are told and can still ask a person.</p>
        </div>
        <form
          className="flex items-center gap-2 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(budget);
            if (!Number.isFinite(n) || n <= 0) return void toast.error("Type a budget in dollars");
            setAdmin(() => ({ aiBudgetUsd: Math.round(n) }));
            toast.success("Monthly budget saved");
          }}
        >
          <label htmlFor="ai-budget" className="text-muted-foreground">
            Monthly budget ($)
          </label>
          <Input id="ai-budget" value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="numeric" className="h-8 w-24" />
          <Button size="sm" variant="secondary" type="submit">
            Save
          </Button>
        </form>
      </div>
      <div className="mt-3">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{`$${spend.toLocaleString()} of $${aiBudgetUsd.toLocaleString()} used`}</span>
          <span className="tabular-nums">{`${pct}%`}</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full", pct >= 90 ? "bg-red-500" : pct >= 75 ? "bg-amber-500" : "bg-primary")} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[36rem] text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-2 font-medium">Feature</th>
              <th className="px-2 py-2 font-medium">Model tier</th>
              <th className="px-2 py-2 text-right font-medium">Requests</th>
              <th className="px-2 py-2 font-medium">Cost</th>
              <th className="py-2 pl-2 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {AI_USAGE.map((f) => {
              const paused = aiPaused.includes(f.feature);
              return (
                <tr key={f.feature} className="border-b last:border-0">
                  <td className="py-2 pr-2 font-medium">{f.label}</td>
                  <td className="px-2 py-2 text-muted-foreground">{f.tier}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{f.requests.toLocaleString()}</td>
                  <td className="px-2 py-2">
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                        <span className="block h-full rounded-full bg-primary" style={{ width: `${(f.costUsd / max) * 100}%` }} />
                      </span>
                      <span className="tabular-nums">{`$${f.costUsd.toLocaleString()}`}</span>
                    </span>
                  </td>
                  <td className="py-2 pl-2 text-right">
                    <Button
                      size="xs"
                      variant={paused ? "default" : "outline"}
                      onClick={() => {
                        setAdmin((a) => ({ aiPaused: paused ? a.aiPaused.filter((x) => x !== f.feature) : [...a.aiPaused, f.feature] }));
                        toast(paused ? `${f.label} back on` : `${f.label} paused for everyone`);
                      }}
                    >
                      {paused ? <Play /> : <Pause />} {paused ? "Resume" : "Pause"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">In the prototype, pausing the tutor really switches off the tutor panel in every lesson; the other features are shown for completeness.</p>
    </section>
  );
}

function Partner() {
  const isDev = process.env.NODE_ENV !== "production";
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="text-lg font-semibold">Partner: ClassProject</h2>
      <p className="text-sm text-muted-foreground">Subject-based recommendations for secondary students (spec section 25). ClassProject sends subject codes and a level, never who the student is.</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Key</dt>
        <dd className="font-mono text-xs">classproject-demo</dd>
        <dt className="text-muted-foreground">Status</dt>
        <dd>
          <Badge variant="secondary">
            <Check /> Active
          </Badge>
        </dd>
        <dt className="text-muted-foreground">Requests, last 24 hours</dt>
        <dd className="tabular-nums">18,402</dd>
        <dt className="text-muted-foreground">Rejected signatures</dt>
        <dd className="tabular-nums">3</dd>
        <dt className="text-muted-foreground">Countries mapped</dt>
        <dd>Ghana</dd>
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">The secret is rotated from the server&apos;s settings (PARTNER_CLASSPROJECT_SECRET), never shown here.</p>
      {isDev && (
        <a href="/api/v1/partner/recommendations?subjects=EMATH,ICT&level=SHS2&country=GH&demo=1" target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
          Try the API (development only) <ExternalLink className="size-3.5" />
        </a>
      )}
    </section>
  );
}

function Health() {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="text-lg font-semibold">System health</h2>
      <ul className="mt-3 divide-y text-sm">
        {SERVICES.map((svc) => (
          <li key={svc.name} className="flex items-start gap-2 py-2">
            <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", svc.status === "ok" ? "bg-emerald-500" : "bg-amber-500")} aria-hidden />
            <div className="min-w-0">
              <p className="font-medium">
                {svc.name} <span className={cn("text-xs font-normal", svc.status === "ok" ? "text-muted-foreground" : "text-amber-700 dark:text-amber-300")}>{svc.status === "ok" ? "Working" : "Slow"}</span>
              </p>
              <p className="text-xs text-muted-foreground">{svc.detail}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">Simulated in the prototype.</p>
    </section>
  );
}

function Payouts() {
  const paid = useOpen((s) => s.admin.payoutsPaid);
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="text-lg font-semibold">Payouts for September</h2>
      <p className="text-sm text-muted-foreground">Instructors&apos; and publishers&apos; share of course sales. Paid by hand in phase 1 (FR-MK-4), then automatically.</p>
      <ul className="mt-3 divide-y text-sm">
        {PAYOUTS.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div>
              <p className="font-medium">{p.payee}</p>
              <p className="text-xs text-muted-foreground">{p.method}</p>
            </div>
            <span className="flex items-center gap-3">
              <span className="tabular-nums">{`GH₵${p.amountGhs.toLocaleString()}`}</span>
              {paid[p.id] ? (
                <span className="text-xs text-emerald-700 dark:text-emerald-300">{`Paid ${fmtDate(paid[p.id]!)}`}</span>
              ) : (
                <Button size="xs" variant="outline" onClick={() => (setAdmin((a) => ({ payoutsPaid: { ...a.payoutsPaid, [p.id]: new Date().toISOString() } })), toast.success(`Marked paid: ${p.payee}`))}>
                  Mark paid
                </Button>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
