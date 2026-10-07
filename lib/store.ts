"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Goal, IssuedCredential, Mastery, PathStep, ProjectSubmission, TutorMessage, VideoQuestion } from "@/lib/types";

/**
 * The prototype's "backend": one learner's state, persisted in this browser
 * (localStorage). Screens read it with useOpen() and change it through
 * lib/learning.ts, which maps to the API calls of spec section 10.2.
 */

export type PersonaId = "kwesi" | "ama" | "new" | "mensah" | "akua" | "esi" | "selase" | "yaw";

/** Who the signed-in person is on the platform (spec section 5.3 portals, schema `roles`). */
export type Role = "learner" | "instructor" | "reviewer" | "mentor" | "org_admin" | "super_admin";

export interface Profile {
  name: string;
  handle: string;
  role: Role;
  /** Age band drives the under-18 rules (spec FR-ID-4, decision D12). */
  ageBand: "adult" | "teen";
  guardian: "not_needed" | "pending" | "granted";
  country: string;
  hoursPerWeek: number;
  preferredDays: string[];
  connectivity: "slow" | "moderate" | "fast";
  dataSaver: boolean;
  aiTutor: boolean;
  aiPractice: boolean;
  personalisation: boolean;
  portfolioPublic: boolean;
  notifications: "instant" | "daily" | "weekly" | "off";
  /** Arrived from a partner (ClassProject) with a subject and level (spec section 25). */
  fromPartner?: { partner: "classproject"; subject?: string; level?: string };
}

export interface ActivityProgress {
  done: boolean;
  at: string;
  watchedPct?: number;
  resumeAt?: number;
  score?: number;
}

export interface Note {
  id: string;
  activityId: string;
  at?: number;
  text: string;
  createdAt: string;
}

/**
 * A question for a person (FR-AI-6): asked from the tutor, or raised by the
 * tutor itself when a message looks worrying (safeguarding). Mentors answer
 * them; the learner sees the answer in the lesson's tutor panel.
 */
export interface HelpRequest {
  id: string;
  activityId: string;
  question: string;
  at: string;
  status: "open" | "answered";
  /** The learner's name and age band, as the mentor sees them. */
  from: string;
  teen: boolean;
  source: "learner" | "safeguarding";
  answer?: string;
  answeredBy?: string;
  answeredAt?: string;
}

export interface Draft {
  id: string;
  courseSlug: string;
  kind: "practice_question" | "summary" | "rubric" | "alt_text" | "lesson_outline";
  title: string;
  content: string;
  status: "draft" | "approved" | "rejected";
  createdAt: string;
  /** When the instructor approved or rejected it (FR-ST-3 provenance). */
  decidedAt?: string;
  decidedBy?: string;
}

export interface QualityFlag {
  id: string;
  courseSlug: string;
  kind: "ambiguous_item" | "broken_link" | "learner_confusion" | "accessibility" | "outdated";
  target: string;
  detail: string;
  source: "psychometrics" | "ai" | "learner_report" | "system";
  status: "open" | "fixed" | "dismissed";
  resolvedAt?: string;
}

/**
 * A course version sent through the review workflow (FR-MK-3, FR-CA-4):
 * submitted by the instructor, decided by a content reviewer. Newest first.
 */
export interface CourseRelease {
  version: string;
  status: "in_review" | "live" | "changes_requested";
  /** Enrolled learners move to this version; otherwise they stay on theirs. */
  safeToMigrate: boolean;
  notes: string[];
  submittedAt: string;
  submittedBy: string;
  decidedAt?: string;
  reviewer?: string;
  reviewerNote?: string;
  /** The reviewer's quality rubric, 1–5 per criterion (FR-QA-1). */
  scores?: Record<string, number>;
}

/**
 * Something an instructor uploaded in the Studio (spec section 13.1, FR-ST-1):
 * a lesson video that goes through upload → processing → captions → caption
 * review, or a source document the AI Studio drafts from. The pipeline's
 * progress is worked out from `startedAt`, so it keeps going across pages.
 */
export interface MediaUpload {
  id: string;
  courseSlug: string;
  kind: "video" | "document" | "package";
  fileName: string;
  sizeMb: number;
  title: string;
  /** The lesson a video is attached to. */
  lessonId?: string;
  captionLanguage?: string;
  /** Upload speed, MB per second, from the uploader's connection. */
  rate: number;
  startedAt: string;
  uploadedBy: string;
  captions?: string;
  captionsApprovedAt?: string;
  draftsCreatedAt?: string;
}

/** The organisation's private academy (spec section 6.24, journey section 4.5). */
export interface OrgState {
  academyName: string;
  brandColor: string;
  subdomain: string;
  sso: boolean;
  /** Group id → what it's assigned and by when. */
  assignments: Record<string, { target: string; due: string; at: string }>;
  invites: { email: string; group: string; at: string }[];
  frameworks: { name: string; at: string }[];
}

/** Platform administration (spec section 6.26). */
export interface AdminState {
  tenantStatus: Record<string, "active" | "suspended">;
  instructorDecisions: Record<string, { status: "verified" | "rejected"; note?: string; at: string; by: string }>;
  /** AI features switched off platform-wide (`ai_model_configs.active`). */
  aiPaused: string[];
  aiBudgetUsd: number;
  payoutsPaid: Record<string, string>;
}

/** A mentoring session booked by a mentor (`live_sessions` of kind `mentoring`). */
export interface MentorSession {
  id: string;
  learner: string;
  at: string;
  topic: string;
}

/**
 * An instructor's in-video questions for one video (FR-VP-4), edited in the
 * Studio: a draft, and the version learners see once published. Keyed by
 * activity id, plus "#lecture" for the activity's recorded lecture.
 */
export interface VideoQuestionEdit {
  draft: VideoQuestion[];
  published?: VideoQuestion[];
  publishedAt?: string;
  publishedBy?: string;
  updatedAt: string;
}

export interface OpenState {
  version: number;
  persona: PersonaId | null;
  profile: Profile | null;
  goals: Goal[];
  activeGoal: string | null;
  path: PathStep[];
  planDeadline: string | null;
  planStartedAt: string | null;
  enrollments: Record<string, { at: string; source: "self" | "path" | "partner_referral" }>;
  progress: Record<string, ActivityProgress>;
  checks: Record<string, { pct: number; at: string }>;
  mastery: Record<string, Mastery>;
  review: Record<string, { due: string; interval: number; reps: number }>;
  notes: Note[];
  tutor: Record<string, TutorMessage[]>;
  submissions: Record<string, ProjectSubmission>;
  credentials: IssuedCredential[];
  downloads: Record<string, "saved">;
  dismissed: string[];
  helpRequests: HelpRequest[];
  referrals: { subject?: string; level?: string; course?: string; at: string }[];
  /** Simulated connectivity for the offline-first demo (spec section 7.6). */
  offline: boolean;
  pendingSync: number;
  drafts: Draft[];
  flags: QualityFlag[];
  /** In-video questions edited in the Studio; course data supplies the rest. */
  videoQuestions: Record<string, VideoQuestionEdit>;
  /** Course versions sent for review from the Studio, by course slug. */
  courseReleases: Record<string, CourseRelease[]>;
  uploads: MediaUpload[];
  org: OrgState;
  admin: AdminState;
  mentorSessions: MentorSession[];
  /** Learners a mentor has nudged, with when. */
  nudges: Record<string, string>;
  /** The shared platform data below has been seeded once (lib/personas.ts). */
  seeded: boolean;
}

/**
 * Platform data that belongs to courses and organisations rather than to the
 * signed-in person. It survives switching persona, so a version sent by the
 * instructor can be approved by the reviewer, and a question asked by a
 * learner can be answered by the mentor.
 */
export const SHARED_KEYS = ["drafts", "flags", "videoQuestions", "courseReleases", "uploads", "helpRequests", "org", "admin", "mentorSessions", "nudges", "seeded"] as const satisfies readonly (keyof OpenState)[];

export const STATE_VERSION = 6;

export const EMPTY: OpenState = {
  version: STATE_VERSION,
  persona: null,
  profile: null,
  goals: [],
  activeGoal: null,
  path: [],
  planDeadline: null,
  planStartedAt: null,
  enrollments: {},
  progress: {},
  checks: {},
  mastery: {},
  review: {},
  notes: [],
  tutor: {},
  submissions: {},
  credentials: [],
  downloads: {},
  dismissed: [],
  helpRequests: [],
  referrals: [],
  offline: false,
  pendingSync: 0,
  drafts: [],
  flags: [],
  videoQuestions: {},
  courseReleases: {},
  uploads: [],
  org: { academyName: "", brandColor: "#0f766e", subdomain: "", sso: false, assignments: {}, invites: [], frameworks: [] },
  admin: { tenantStatus: {}, instructorDecisions: {}, aiPaused: [], aiBudgetUsd: 4000, payoutsPaid: {} },
  mentorSessions: [],
  nudges: {},
  seeded: false,
};

export const useOpen = create<OpenState>()(
  persist(() => EMPTY, {
    name: "classproject-open",
    version: STATE_VERSION,
    migrate: () => EMPTY,
  }),
);

/** Replaces part of the state; while "offline", counts the change as waiting to sync. */
export function setOpen(patch: Partial<OpenState> | ((s: OpenState) => Partial<OpenState>), countsAsChange = true) {
  useOpen.setState((s) => {
    const p = typeof patch === "function" ? patch(s) : patch;
    return s.offline && countsAsChange ? { ...p, pendingSync: s.pendingSync + 1 } : p;
  });
}

/** True once the persisted state has loaded (avoids a flash of the signed-out view). */
export function useHydrated() {
  return useSyncExternalStore(
    (cb) => useOpen.persist.onFinishHydration(cb),
    () => useOpen.persist.hasHydrated(),
    () => false,
  );
}

export const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
