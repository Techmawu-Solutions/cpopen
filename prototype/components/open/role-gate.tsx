"use client";

import { Empty } from "@/components/open/bits";
import { LinkButton } from "@/components/open/shell";
import { PERSONAS } from "@/lib/personas";
import { useOpen, type PersonaId, type Role } from "@/lib/store";

/**
 * Keeps a staff portal to the roles that use it (spec section 17.3 RBAC).
 * Anyone else is told whose portal it is and which demo account opens it.
 */
export function RoleGate({ roles, title, persona, children }: { roles: Role[]; title: string; persona: PersonaId; children: React.ReactNode }) {
  const role = useOpen((s) => s.profile?.role);
  if (role && roles.includes(role)) return <>{children}</>;
  const who = PERSONAS.find((p) => p.id === persona)?.name ?? "";
  return (
    <Empty title={title}>
      <p>{`Sign in as ${who} to see it.`}</p>
      <LinkButton href="/sign-in" size="sm" className="mt-3">
        Switch account
      </LinkButton>
    </Empty>
  );
}
