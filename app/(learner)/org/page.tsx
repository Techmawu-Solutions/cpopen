"use client";

import { useState } from "react";
import { Check, FileUp, KeyRound, Mail, Palette } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PageTitle } from "@/components/open/bits";
import { RoleGate } from "@/components/open/role-gate";
import { skillName } from "@/lib/data/graph";
import { ORG_COLORS, ORG_COVERAGE, ORG_GROUPS, ORG_NAME, ORG_SEATS, ORG_SKILLS, ORG_STAFF, ORG_TARGETS } from "@/lib/data/portals";
import { setOpen, useOpen, type OrgState } from "@/lib/store";
import { cn } from "@/lib/utils";

const DOMAIN = "open.classproject.com";
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const setOrg = (patch: Partial<OrgState>) => setOpen((s) => ({ org: { ...s.org, ...patch } }));

/**
 * The organisation admin's portal (spec section 5.3, section 6.24, journey
 * section 4.5): a private academy for the company's staff, a skill coverage
 * heat-map by group, paths and courses assigned to groups, invitations,
 * competency frameworks, branding, and single sign-on.
 */
export default function OrgPage() {
  return (
    <RoleGate roles={["org_admin"]} title="The academy is for organisation admins" persona="selase">
      <Org />
    </RoleGate>
  );
}

function Org() {
  const org = useOpen((s) => s.org);
  const members = ORG_GROUPS.reduce((n, g) => n + g.members, 0);
  const seatsUsed = members + org.invites.length;
  const avg = Math.round(Object.values(ORG_COVERAGE).flat().reduce((a, b) => a + b, 0) / Object.values(ORG_COVERAGE).flat().length);

  return (
    <>
      <PageTitle title={org.academyName || `${ORG_NAME} Academy`} description="Your company's private academy: who is learning what, which skills the teams have proved, and what they're assigned next.">
        <span className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-sm">
          <span className="size-3 rounded-full" style={{ background: org.brandColor }} aria-hidden />
          {`${org.subdomain || "academy"}.${DOMAIN}`} · <Badge variant="outline">Private</Badge>
        </span>
      </PageTitle>

      <dl className="mb-6 grid gap-3 sm:grid-cols-4">
        {[
          { label: "Seats used", value: `${seatsUsed} / ${ORG_SEATS}` },
          { label: "Active this month", value: "142" },
          { label: "Credentials earned", value: "37" },
          { label: "Average skill coverage", value: `${avg}%` },
        ].map((x) => (
          <div key={x.label} className="rounded-2xl border bg-card p-4">
            <dt className="text-sm text-muted-foreground">{x.label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{x.value}</dd>
          </div>
        ))}
      </dl>

      <div className="space-y-6">
        <HeatMap />
        <div className="grid gap-6 lg:grid-cols-2">
          <Assignments />
          <People />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Settings />
          <Frameworks />
        </div>
      </div>
    </>
  );
}

/** Share of each group with the skill verified (journey section 4.5 "skill coverage heat-map"). */
function HeatMap() {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="text-lg font-semibold">Skill coverage by team</h2>
      <p className="text-sm text-muted-foreground">The share of each team with the skill verified by evidence (practice, projects, mastery checks), not just courses finished.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr>
              <th className="py-2 pr-3 text-left font-medium">Team</th>
              {ORG_SKILLS.map((sk) => (
                <th key={sk} className="px-1 py-2 text-center text-xs font-medium">
                  {skillName(sk)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ORG_GROUPS.map((g) => (
              <tr key={g.id}>
                <td className="py-1 pr-3 font-medium whitespace-nowrap">{g.name}</td>
                {ORG_COVERAGE[g.id]!.map((v, n) => (
                  <td key={ORG_SKILLS[n]} className="p-1">
                    <span className={cn("block rounded-md py-2 text-center text-xs font-medium tabular-nums", v >= 70 ? "bg-emerald-600 text-white" : v >= 45 ? "bg-emerald-300 text-emerald-950" : v >= 20 ? "bg-amber-200 text-amber-950" : "bg-red-200 text-red-950")}>{`${v}%`}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="size-3 rounded bg-emerald-600" /> 70% or more
        </span>
        <span className="flex items-center gap-1">
          <span className="size-3 rounded bg-emerald-300" /> 45–69%
        </span>
        <span className="flex items-center gap-1">
          <span className="size-3 rounded bg-amber-200" /> 20–44%
        </span>
        <span className="flex items-center gap-1">
          <span className="size-3 rounded bg-red-200" /> under 20%
        </span>
      </p>
    </section>
  );
}

function Assignments() {
  const org = useOpen((s) => s.org);
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="text-lg font-semibold">Assigned learning</h2>
      <p className="text-sm text-muted-foreground">Assign a path or course to a team. Teams are filled from your single sign-on groups, so new staff get it automatically.</p>
      <ul className="mt-3 divide-y">
        {ORG_GROUPS.map((g) => (
          <AssignmentRow key={g.id} groupId={g.id} current={org.assignments[g.id]} />
        ))}
      </ul>
    </section>
  );
}

function AssignmentRow({ groupId, current }: { groupId: string; current?: OrgState["assignments"][string] }) {
  const g = ORG_GROUPS.find((x) => x.id === groupId)!;
  const [target, setTarget] = useState(current?.target ?? "");
  const [due, setDue] = useState(current?.due ?? "");
  const changed = target !== (current?.target ?? "") || due !== (current?.due ?? "");

  return (
    <li className="space-y-2 py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{g.name}</p>
        <span className="text-xs text-muted-foreground">
          {`${g.members} people`} · <span className="font-mono">{g.ssoGroup}</span>
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select value={target} onChange={(e) => setTarget(e.target.value)} className="h-8 min-w-0 flex-1 basis-48 rounded-lg border bg-card px-2" aria-label={`Assigned to ${g.name}`}>
          <option value="">Nothing assigned</option>
          {ORG_TARGETS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="h-8 w-40" aria-label={`Due date for ${g.name}`} />
        <Button
          size="sm"
          variant="secondary"
          disabled={!changed}
          onClick={() => {
            setOpen((s) => {
              const assignments = { ...s.org.assignments };
              if (target) assignments[g.id] = { target, due, at: new Date().toISOString() };
              else delete assignments[g.id];
              return { org: { ...s.org, assignments } };
            });
            toast.success(target ? `Assigned to ${g.name} — they're notified` : `Assignment removed from ${g.name}`);
          }}
        >
          <Check /> Save
        </Button>
      </div>
      {current && !changed && <p className="text-xs text-muted-foreground">{current.due ? `Assigned ${fmtDate(current.at)} · due ${fmtDate(current.due)}` : `Assigned ${fmtDate(current.at)}`}</p>}
    </li>
  );
}

function People() {
  const invites = useOpen((s) => s.org.invites);
  const [email, setEmail] = useState("");
  const [group, setGroup] = useState(ORG_GROUPS[0]!.id);
  const groupName = (id: string) => ORG_GROUPS.find((g) => g.id === id)?.name ?? id;

  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="text-lg font-semibold">People</h2>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-2 font-medium">Name</th>
              <th className="px-2 py-2 font-medium">Team</th>
              <th className="px-2 py-2 text-right font-medium">Progress</th>
              <th className="py-2 pl-2 text-right font-medium">Credentials</th>
            </tr>
          </thead>
          <tbody>
            {ORG_STAFF.map((p) => (
              <tr key={p.name} className="border-b last:border-0">
                <td className="py-2 pr-2">
                  {p.name}
                  {p.lastActiveDays >= 10 && <span className="block text-xs text-amber-700 dark:text-amber-300">{`Inactive for ${p.lastActiveDays} days`}</span>}
                </td>
                <td className="px-2 py-2 text-muted-foreground">{groupName(p.group)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{`${p.progress}%`}</td>
                <td className="py-2 pl-2 text-right tabular-nums">{p.credentials}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{`Showing ${ORG_STAFF.length} of ${ORG_GROUPS.reduce((n, g) => n + g.members, 0)} people.`}</p>

      <form
        className="mt-4 flex flex-wrap gap-2 border-t pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!/^\S+@\S+\.\S+$/.test(email)) return void toast.error("Type a work email address");
          setOpen((s) => ({ org: { ...s.org, invites: [{ email: email.trim(), group, at: new Date().toISOString() }, ...s.org.invites] } }));
          setEmail("");
          toast.success("Invitation sent");
        }}
      >
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" className="h-8 min-w-0 flex-1 basis-48" aria-label="Email to invite" />
        <select value={group} onChange={(e) => setGroup(e.target.value)} className="h-8 rounded-lg border bg-card px-2 text-sm" aria-label="Team">
          {ORG_GROUPS.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="secondary">
          <Mail /> Invite
        </Button>
      </form>
      {invites.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm">
          {invites.map((i) => (
            <li key={i.email + i.at} className="flex flex-wrap justify-between gap-2">
              <span>{i.email}</span>
              <span className="text-xs text-muted-foreground">
                {groupName(i.group)} · invited, not joined yet
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Settings() {
  const org = useOpen((s) => s.org);
  const [name, setName] = useState(org.academyName);
  const [sub, setSub] = useState(org.subdomain);
  const validSub = /^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$/.test(sub);

  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Palette className="size-5 text-primary" /> Branding and sign-in
      </h2>
      <div className="mt-3 grid gap-3 text-sm">
        <label className="grid gap-1">
          <span className="text-muted-foreground">Academy name</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="grid gap-1">
          <span className="text-muted-foreground">Web address</span>
          <span className="flex items-center gap-1">
            <Input value={sub} onChange={(e) => setSub(e.target.value.toLowerCase())} className="w-40" aria-invalid={!validSub} />
            <span className="text-muted-foreground">{`.${DOMAIN}`}</span>
          </span>
          {!validSub && <span className="text-xs text-red-700 dark:text-red-300">Letters, numbers and hyphens only.</span>}
        </label>
        <div className="grid gap-1">
          <span className="text-muted-foreground">Brand colour</span>
          <div className="flex gap-2" role="radiogroup" aria-label="Brand colour">
            {ORG_COLORS.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={org.brandColor === c} aria-label={c} onClick={() => setOrg({ brandColor: c })} className={cn("size-8 rounded-full ring-offset-2 ring-offset-card", org.brandColor === c && "ring-2 ring-foreground")} style={{ background: c }} />
            ))}
          </div>
        </div>
        <Button
          size="sm"
          className="justify-self-start"
          disabled={!validSub || !name.trim() || (name === org.academyName && sub === org.subdomain)}
          onClick={() => {
            setOrg({ academyName: name.trim(), subdomain: sub });
            toast.success("Saved — the new address gets its certificate in a few minutes");
          }}
        >
          <Check /> Save
        </Button>
        <div className="mt-2 flex items-start justify-between gap-3 border-t pt-3">
          <div>
            <p className="flex items-center gap-1.5 font-medium">
              <KeyRound className="size-4" /> Single sign-on
            </p>
            <p className="text-xs text-muted-foreground">{org.sso ? "Staff sign in with their work account (Microsoft Entra ID, SAML). Groups come from it too." : "Staff sign in with email and a code. Turn on single sign-on to use their work accounts."}</p>
          </div>
          <Switch checked={org.sso} onCheckedChange={(v) => (setOrg({ sso: v }), toast(v ? "Single sign-on on" : "Single sign-on off"))} aria-label="Single sign-on" />
        </div>
      </div>
    </section>
  );
}

function Frameworks() {
  const frameworks = useOpen((s) => s.org.frameworks);
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="text-lg font-semibold">Competency frameworks</h2>
      <p className="text-sm text-muted-foreground">Your own skills framework, imported in the CASE format, sits beside the platform&apos;s. Courses and credentials map to it.</p>
      <ul className="mt-3 divide-y text-sm">
        {frameworks.map((f) => (
          <li key={f.name} className="flex flex-wrap justify-between gap-2 py-2">
            <span className="font-medium">{f.name}</span>
            <span className="text-xs text-muted-foreground">{`Imported ${fmtDate(f.at)}`}</span>
          </li>
        ))}
      </ul>
      <Button
        size="sm"
        variant="outline"
        className="mt-3"
        onClick={() => {
          const name = `${ORG_NAME} Competencies v${frameworks.length + 1}`;
          setOpen((s) => ({ org: { ...s.org, frameworks: [...s.org.frameworks, { name, at: new Date().toISOString() }] } }));
          toast.success("Framework imported — 48 competencies, 112 skills");
        }}
      >
        <FileUp /> Import a CASE framework
      </Button>
    </section>
  );
}
