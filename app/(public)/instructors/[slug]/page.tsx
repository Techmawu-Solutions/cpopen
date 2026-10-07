"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { BadgeCheck, BookOpen, Target, Users } from "lucide-react";
import { CourseCard } from "@/components/open/bits";
import { coursesTaughtBy, instructorBySlug } from "@/lib/studio";

/**
 * Public instructor profile (spec section 5.1, `/instructors/:slug`): who
 * teaches, for which providers, and how their learners do. Mastery, not star
 * ratings (FR-TR-2).
 */
export default function InstructorPage() {
  const { slug } = useParams<{ slug: string }>();
  const name = instructorBySlug.get(slug);
  if (!name)
    return (
      <p>
        Instructor not found. <Link href="/explore" className="text-primary hover:underline">Explore courses</Link>
      </p>
    );

  const courses = coursesTaughtBy(name);
  const providers = [...new Set(courses.map((c) => c.provider))];
  const learners = courses.reduce((n, c) => n + c.learners, 0);
  const mastery = learners ? Math.round(courses.reduce((n, c) => n + c.masteryRate * c.learners, 0) / learners) : 0;
  const initials = name
    .replace(/^(Dr|Prof|Mr|Mrs|Ms|Mme)\.?\s+/, "")
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center gap-5">
        <span className="grid size-20 place-items-center rounded-full bg-accent font-heading text-2xl font-semibold text-accent-foreground" aria-hidden>
          {initials}
        </span>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Instructor</p>
          <h1 className="text-4xl font-semibold">{name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-muted-foreground">
            <BadgeCheck className="size-4 text-primary" /> {`Verified instructor · ${providers.join(", ")}`}
          </p>
        </div>
      </header>

      <dl className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: BookOpen, label: "Courses", value: courses.length.toLocaleString() },
          { icon: Users, label: "Learners", value: learners.toLocaleString() },
          { icon: Target, label: "Reach mastery", value: `${mastery}%` },
        ].map((x) => (
          <div key={x.label} className="rounded-2xl border bg-card p-4">
            <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <x.icon className="size-4" /> {x.label}
            </dt>
            <dd className="mt-1 text-3xl font-semibold tabular-nums">{x.value}</dd>
          </div>
        ))}
      </dl>
      <p className="-mt-5 text-xs text-muted-foreground">We show how many learners reach mastery, not star ratings. Identity and expertise are checked before an instructor can publish (FR-MK-2).</p>

      <section>
        <h2 className="mb-3 text-2xl font-semibold">Courses</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <CourseCard key={c.slug} course={c} />
          ))}
        </div>
      </section>
    </div>
  );
}
