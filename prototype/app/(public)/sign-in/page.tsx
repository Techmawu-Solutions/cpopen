"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { HOME_FOR, PERSONAS, STAFF_PERSONAS, resetDemo, signInAs } from "@/lib/personas";
import { useOpen, type PersonaId } from "@/lib/store";

/** Demo sign-in: one click per persona, like ClassProject's demo accounts. */
export default function SignIn() {
  return (
    <Suspense>
      <Body />
    </Suspense>
  );
}

function Body() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const choose = (id: PersonaId) => {
    signInAs(id);
    const role = useOpen.getState().profile?.role ?? "learner";
    router.push(id === "new" ? "/start" : role !== "learner" ? HOME_FOR[role] : next && next !== "/sign-in" ? next : "/home");
  };
  const groups = [
    { title: "Learners", ids: PERSONAS.filter((p) => !STAFF_PERSONAS.includes(p.id)) },
    { title: "Staff", ids: PERSONAS.filter((p) => STAFF_PERSONAS.includes(p.id)) },
  ];
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-semibold">Sign in</h1>
      <p className="mt-1 text-muted-foreground">
        This is a prototype — pick a demo account. In production: email, phone number (SMS/WhatsApp code), Google, Apple or your institution&apos;s single sign-on, with two-step verification for instructors.
      </p>
      {groups.map((g) => (
        <section key={g.title} className="mt-6">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">{g.title}</h2>
          <div className="grid gap-3">
            {g.ids.map((p) => (
              <button key={p.id} type="button" onClick={() => choose(p.id)} className="group flex items-center gap-4 rounded-2xl border bg-card p-4 text-left hover:border-primary/40">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/15 font-heading text-lg font-semibold text-primary">{p.name.replace(/^(Dr|Prof)\.\s+/, "")[0]}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">
                    {p.name} <span className="font-normal text-muted-foreground">· {p.blurb}</span>
                  </span>
                  <span className="block text-sm text-muted-foreground">{p.detail}</span>
                </span>
                <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary" />
              </button>
            ))}
          </div>
        </section>
      ))}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Signing in replaces that person&apos;s demo data in this browser. Course versions, uploads, questions to mentors and admin decisions are shared by every account, so each role sees what the others did.</p>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            resetDemo();
            toast.success("The demo is back to its starting point");
          }}
        >
          <RotateCcw /> Reset the demo
        </Button>
      </div>
    </div>
  );
}
