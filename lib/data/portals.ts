/**
 * Mock data for the staff portals (spec section 5.3): the mentor's learners,
 * the organisation's academy, and the platform's tenants, instructor
 * applications, AI usage, services and payouts. Numbers are made up, but
 * consistent with the catalogue. Volta Logistics is a fictional company.
 */

export interface MentorLearner {
  name: string;
  path: string;
  progress: number;
  lastActiveDays: number;
  verifiedSkills: number;
  teen: boolean;
}

export const MENTOR_LEARNERS: MentorLearner[] = [
  { name: "Kwesi Mensah", path: "Data Analyst", progress: 46, lastActiveDays: 0, verifiedSkills: 4, teen: false },
  { name: "Ama Boateng", path: "Quadratic Functions, Made Visual", progress: 22, lastActiveDays: 1, verifiedSkills: 1, teen: true },
  { name: "Yaw Owusu", path: "Data Analyst", progress: 68, lastActiveDays: 2, verifiedSkills: 7, teen: false },
  { name: "Efua Darko", path: "Software Developer", progress: 31, lastActiveDays: 9, verifiedSkills: 2, teen: false },
  { name: "Adjoa Sarpong", path: "Data Analyst", progress: 12, lastActiveDays: 14, verifiedSkills: 0, teen: false },
  { name: "Kojo Badu", path: "Software Developer", progress: 54, lastActiveDays: 3, verifiedSkills: 5, teen: false },
];

/** A learner who hasn't been active for this many days is shown as at risk. */
export const AT_RISK_DAYS = 7;

// ---- Organisation (journey section 4.5) ----

export interface OrgGroup {
  id: string;
  name: string;
  members: number;
  /** The SSO group that fills it (`user_groups.external_id`). */
  ssoGroup: string;
}

export const ORG_NAME = "Volta Logistics";
export const ORG_SEATS = 200;

export const ORG_GROUPS: OrgGroup[] = [
  { id: "ops", name: "Operations", members: 64, ssoGroup: "grp-operations" },
  { id: "fin", name: "Finance", members: 18, ssoGroup: "grp-finance" },
  { id: "cs", name: "Customer service", members: 42, ssoGroup: "grp-customer-service" },
  { id: "sup", name: "Fleet supervisors", members: 23, ssoGroup: "grp-fleet-supervisors" },
];

/** Skills on the coverage heat-map, and the share of each group with the skill verified (%). */
export const ORG_SKILLS = ["sheet-formulas", "sheet-charts", "stats-averages", "stats-critical", "data-story", "sql-select"];

export const ORG_COVERAGE: Record<string, number[]> = {
  ops: [72, 48, 41, 22, 15, 8],
  fin: [94, 81, 77, 58, 46, 39],
  cs: [38, 21, 26, 12, 9, 2],
  sup: [61, 35, 52, 30, 24, 4],
};

/** What a group can be assigned: a career path, or a course. */
export const ORG_TARGETS = [
  { id: "path:data-analyst", label: "Data Analyst path" },
  { id: "course:spreadsheets-that-think", label: "Spreadsheets That Think" },
  { id: "course:statistics-in-everyday-life", label: "Statistics in Everyday Life" },
  { id: "course:data-storytelling", label: "Data Storytelling" },
  { id: "course:sql-for-data-analysis", label: "SQL for Data Analysis" },
];

export const ORG_STAFF = [
  { name: "Mawuli Tetteh", group: "ops", progress: 82, credentials: 1, lastActiveDays: 1 },
  { name: "Esinam Kpodo", group: "ops", progress: 35, credentials: 0, lastActiveDays: 6 },
  { name: "Delali Amegah", group: "fin", progress: 100, credentials: 2, lastActiveDays: 0 },
  { name: "Senyo Agbeko", group: "fin", progress: 64, credentials: 1, lastActiveDays: 2 },
  { name: "Afi Dzokoto", group: "cs", progress: 18, credentials: 0, lastActiveDays: 12 },
  { name: "Edem Kumah", group: "cs", progress: 47, credentials: 0, lastActiveDays: 3 },
  { name: "Worlali Ahadzie", group: "sup", progress: 58, credentials: 1, lastActiveDays: 4 },
  { name: "Kafui Nyamekye", group: "sup", progress: 9, credentials: 0, lastActiveDays: 21 },
];

export const ORG_COLORS = ["#0f766e", "#1d4ed8", "#b45309", "#7c3aed", "#be123c"];

// ---- Platform administration ----

export interface Tenant {
  id: string;
  name: string;
  kind: "platform" | "university" | "corporate" | "publisher" | "ngo";
  learners: number;
  courses: number;
  region: string;
  visibility: "public" | "private";
}

export const TENANTS: Tenant[] = [
  { id: "open", name: "ClassProject Open", kind: "platform", learners: 412380, courses: 30, region: "af-west", visibility: "public" },
  { id: "ashesi", name: "Ashesi University", kind: "university", learners: 18240, courses: 4, region: "af-west", visibility: "public" },
  { id: "knust", name: "KNUST", kind: "university", learners: 31220, courses: 3, region: "af-west", visibility: "public" },
  { id: "ug", name: "University of Ghana", kind: "university", learners: 27410, courses: 5, region: "af-west", visibility: "public" },
  { id: "gtl", name: "Ghana Tech Lab", kind: "publisher", learners: 18420, courses: 1, region: "af-west", visibility: "public" },
  { id: "volta", name: "Volta Logistics Academy", kind: "corporate", learners: 147, courses: 5, region: "af-west", visibility: "private" },
  { id: "afa", name: "Alliance Française Accra", kind: "ngo", learners: 6120, courses: 1, region: "eu-west", visibility: "public" },
];

export interface InstructorApplicant {
  id: string;
  name: string;
  expertise: string;
  sample: string;
  checks: { identity: boolean; credentials: boolean; sampleLesson: boolean };
  appliedDaysAgo: number;
}

export const APPLICANTS: InstructorApplicant[] = [
  { id: "app-1", name: "Mrs. Akosua Frempong", expertise: "Biology teacher and WASSCE examiner, 12 years", sample: "Cells and microscopy (12-minute lesson)", checks: { identity: true, credentials: true, sampleLesson: true }, appliedDaysAgo: 2 },
  { id: "app-2", name: "Mr. Ebo Quansah", expertise: "Electrical installation, NVTI certified", sample: "Wiring a socket safely (9-minute lesson)", checks: { identity: true, credentials: false, sampleLesson: true }, appliedDaysAgo: 4 },
  { id: "app-3", name: "Ms. Dzifa Ahiable", expertise: "UX designer, 6 years in fintech", sample: "User interviews that work (15-minute lesson)", checks: { identity: true, credentials: true, sampleLesson: true }, appliedDaysAgo: 6 },
];

/** AI use this month by feature (`ai_interactions`), and the model tier behind each (`ai_model_configs`). */
export const AI_USAGE = [
  { feature: "tutor", label: "Tutor", tier: "standard", requests: 1284000, costUsd: 1920 },
  { feature: "hints", label: "Hints", tier: "fast", requests: 2410000, costUsd: 310 },
  { feature: "authoring", label: "Studio drafts", tier: "deep", requests: 8420, costUsd: 640 },
  { feature: "summary", label: "Video summaries", tier: "standard", requests: 21300, costUsd: 180 },
  { feature: "quality_scan", label: "Quality monitoring", tier: "standard", requests: 96000, costUsd: 410 },
  { feature: "moderation", label: "Moderation", tier: "fast", requests: 3100000, costUsd: 95 },
];

export const SERVICES = [
  { name: "API", status: "ok", detail: "p95 180 ms" },
  { name: "Video delivery (CDN)", status: "ok", detail: "99.98% of segments served" },
  { name: "AI gateway", status: "degraded", detail: "Tutor answers slower than usual (p95 2.4 s): the provider is slow" },
  { name: "Search", status: "ok", detail: "p95 90 ms" },
  { name: "Queue workers", status: "ok", detail: "120 jobs waiting" },
  { name: "Offline sync", status: "ok", detail: "2,310 devices synced in the last hour" },
] as const;

export const PAYOUTS = [
  { id: "pay-ashesi", payee: "Ashesi University", amountGhs: 4820, method: "Bank transfer" },
  { id: "pay-asante", payee: "Efua Asante", amountGhs: 1260, method: "Mobile money" },
  { id: "pay-gtl", payee: "Ghana Tech Lab", amountGhs: 2930, method: "Bank transfer" },
];

/** The content reviewer's rubric (FR-QA-1), scored 1–5. */
export const REVIEW_RUBRIC = [
  { id: "objectives", label: "Clear, measurable objectives" },
  { id: "accuracy", label: "Accurate and up to date" },
  { id: "design", label: "Instructional design" },
  { id: "assessment", label: "Assessment quality" },
  { id: "accessibility", label: "Accessibility" },
];
