# ClassProject Open: global MOOC platform

**Start here.** This repository (`cpopen`) holds everything about **ClassProject Open** (working name), the next-generation global MOOC platform.

It is a **separate platform** from ClassProject, the school LMS in the [cp repository](https://github.com/Techmawu-Solutions/cp) (local folder `D:/xampp/htdocs/cp`): its own product, database and codebase. Until October 2026 it lived in cp's `mooc/` folder. The two are linked in one small way: ClassProject recommends Open courses to its students based on their subjects.

## Files

| Path | What it is |
|---|---|
| [`ClassProject Open — Product Specification.md`](ClassProject%20Open%20—%20Product%20Specification.md) | **The source of truth.** The product requirements and architecture: all 25 deliverables the brief asks for, a decision log, the MVP, the roadmap, the backlog, acceptance criteria and the ClassProject integration. **Read section 0 first.** |
| [`database/schema.sql`](database/schema.sql) | Open's own MySQL 8 schema (146 tables), verified by loading it |
| [`database/README.md`](database/README.md) | How the schema is organised, its conventions, the ClassProject link tables, and what lives outside MySQL |
| `app/`, `components/`, `lib/` | **The clickable prototype** (phase P0), a Next.js app at the root of the repo, like ClassProject's. How to run it, the demo accounts and the demo scripts are below |
| [`scripts/i18n-extract.mjs`](scripts/i18n-extract.mjs) | Lists interface text without a French, Portuguese or Spanish translation |
| [`Master Prompt — Next-Generation Global MOOC Platform.md`](Master%20Prompt%20—%20Next-Generation%20Global%20MOOC%20Platform.md) | The original brief this work answers (kept unchanged apart from a pointer at the top) |

## Where things stand (Oct 2026)

- ✅ The specification v1 is written. It **needs product-owner validation**: see spec section 26 for the open questions and section 21 for the MVP scope.
- ✅ The database schema v1 is written and loads cleanly.
- ✅ The ClassProject side of the link is built as a prototype: ClassProject spec section 49.2; code in the cp repo's `lib/mooc.ts` and `components/student/mooc-recommendations.tsx`. It uses a mock Open catalogue until Open's partner API exists.
- ✅ The **clickable prototype** (phase P0) is built at the root of this repo. It is a Next.js app on mock data with eight demo accounts: three learners, plus an instructor, a content reviewer, a mentor, an organisation admin and a platform super admin, each with their own portal. Its partner API really runs. In development, ClassProject's recommendation links open it.
- ✅ **In-video questions** (spec FR-VP-4): several per video, required or optional, on the lesson video and on recorded YouTube lectures, with no seeking past an unanswered required one. Instructors edit them in the **Studio** (FR-ST-5): draft, preview in the lesson, publish.
- ⏸ **No production code yet, on purpose.** The prototype is how the product owner validates the spec before Phase 1.

## The prototype

It exists to validate the product before real development starts (spec section 22, phase P0). It's built like the ClassProject prototype:
- **Stack:** Next.js 16, React 19, Tailwind v4, and shadcn components on Base UI.
- **Data:** mock data, with each browser's state saved in `localStorage`.
- **Backend:** none, apart from one real API route (the partner API).

## Run it

```bash
npm install
npm run dev        # http://localhost:3001
npm run build      # production build (what Vercel runs)
```

It runs on **port 3001**, so it can sit beside ClassProject (port 3000). In development, ClassProject's **Explore Beyond Class** links open this prototype, which makes the link between the two platforms clickable end to end.

**Deploy:** import the [cpopen repository](https://github.com/Techmawu-Solutions/cpopen) in Vercel and leave **Root Directory** empty (the repo root). No environment variables are needed; `PARTNER_CLASSPROJECT_SECRET` is optional (see the partner API below). Then set `NEXT_PUBLIC_MOOC_URL` in the ClassProject project to the new URL.

**Languages:** to list interface text that has no translation yet, run `node scripts/i18n-extract.mjs . --missing`.

## Demo accounts (`/sign-in`)

| Persona | Shows |
|---|---|
| **Kwesi Mensah, 24**: career switcher | Five weeks into a Data Analyst path, with spreadsheet skills verified, SQL in progress, a capstone project started, 5 reviews due and one certificate |
| **Ama Boateng, 16**: from ClassProject | Under-18 rules (guardian consent pending, private account, safety mode for the tutor), data saver on, and a course reached through a ClassProject referral |
| **New learner** | The full first run: goal prompt → about you (including the under-18 consent step) → diagnostic → personal path |
| **Dr. Kwame Mensah**: instructor | Instructor studio: his courses, adding videos and documents, the coverage gate, AI drafts awaiting approval, publishing a new version through review, in-video questions, analytics and quality flags; his public profile |
| **Akua Danso**: content reviewer | Review queue: new course versions with what changed and the automatic checks, scored on a rubric, then approved or sent back |
| **Esi Ofori**: mentor | Learners' questions and the tutor's safeguarding escalations, answered so the learner sees the reply in the lesson; learners at risk; sessions |
| **Selase Agbenyo**: organisation admin | Volta Logistics' private academy (a fictional company): skill heat-map by team, assigned paths, invitations, frameworks, branding and single sign-on |
| **Yaw Asare**: platform super admin | Tenants, instructor verification, moderation, AI usage and cost with a per-feature pause, the ClassProject partner, system health and payouts |

Course versions, uploads, drafts, flags, questions to mentors, the academy and admin decisions are shared by all accounts in the browser, so each role sees what the others did. **Reset the demo** on the sign-in page starts again.

## A 10-minute demo script

**Kwesi**
1. **Today:** the one next-best step and why it was chosen, reviews due, the plan with its projected finish, skills on the four-step ladder, and a dismissible recommendation.
2. **Start** the practice. Use **Hint** twice (nudge → strategy), answer wrongly, and read the explanation, which says the item will come back in review.
3. In the tutor panel, ask *"What is the interquartile range?"*. It answers **From your course** with a source link.
4. Now ask *"Who won the 2010 World Cup?"*. It says it's **Not in your course** instead of guessing. Try **Another example**.
5. Open the **Statistics in Everyday Life** mastery check, pass it, and get a certificate toast.
6. **Portfolio project** (Today → Open project):
   - tick the milestones, write a summary of more than 20 words, and submit;
   - see three calibrated peer reviews and the advisory AI feedback;
   - **Simulate the instructor's assessment**.

   The **Data Analysis Competency** credential is issued.
7. Open **Credentials** → the credential → **Verify** page → **Show machine-readable credential** (the Open Badges 3.0 format).
8. **Skills:** open "Why Verified?" on any skill to see the evidence behind it.
9. Click **Online** in the header to simulate going offline. Keep learning; the banner counts the changes waiting to sync. Go back online and they sync.
10. The feather icon turns on **data saver**: videos play as audio-only with slides.
11. Open **SQL for Data Analysis → SELECT: choosing columns**, or **Python for Beginners** lesson 1: under the lesson video, a **Recorded lecture** from YouTube plays inside Open, with **checkpoint questions**. Drag its seek bar past 5:00 and it stops at the required checkpoint; the next one can be skipped. Answers count towards the skill on the skill map. The lesson video's own seek bar shows its question as a marker, and can't be dragged past it either.
12. The translate button (**EN**) in the header switches the interface to French, Portuguese or Spanish straight away, including dates ("il y a 2 heures") and the course content itself: lessons, readings, transcripts and practice.

**Ama:** see the guardian banner, then open `/courses/calculus-first-steps?ref=classproject&subject=EMATH&level=SHS2` for the referral welcome. The portfolio can't be made public. In the tutor, a worrying message is escalated to a person.

**New learner:** type *"I want to become a data analyst in 6 months"*. The six months becomes the plan's deadline. Give a birth year that makes you 15 or 16, answer the quick check, and see what gets skipped.

**Dr. Mensah:** in the studio, **Your courses** shows Statistics (live) and Data Storytelling (outline only: its placeholder lessons block publishing). On Statistics, **Publish a new version** is blocked by the open broken-link flag. Approve an AI draft, **Mark fixed** on the broken link, and both appear as changes: **Send version 1.4.0 for review**, then **Simulate approval**. The course page now shows version 1.4.0. Under **Learners and analytics**, see the drop at lesson 2 and item st6 below 0.15 discrimination, already in the quality flags. **Your public profile** opens `/instructors/dr-kwame-mensah`; every course page links its instructor there. Under **In-video questions**, choose **SQL for Data Analysis**, add a question at 0:20 to the lesson video, then use **Preview draft in the lesson** and **Publish**. Sign in as Kwesi and open that lesson: the video stops at 0:20.

**Across the roles** (about 5 minutes):
1. As **Dr. Mensah**, open **Add content**, choose **Use a sample video**, give it a title and **Upload video**. Watch it upload and convert, then check and **Approve captions**. Upload the sample syllabus and **Draft from this document**.
2. In the **Studio**, approve the new lesson outline, **Mark fixed** on the broken link, and **Send version 1.4.0 for review**.
3. As **Akua Danso**, score Statistics on the rubric and **Approve**. Send Spreadsheets That Think back with a note.
4. As **Kwesi**, the Statistics course page shows version 1.4.0. In a lesson's tutor panel, use **Ask a person (mentor)**.
5. As **Esi Ofori**, answer Kwesi's question; as Kwesi, the answer is under the tutor.
6. As **Selase Agbenyo**, assign *Statistics in Everyday Life* to Customer service and invite someone.
7. As **Yaw Asare**, **Pause** the tutor under AI usage; as Kwesi, the tutor panel says it's paused. Verify an instructor and mark a payout paid.

**Signed out:** `/`, `/explore` (all 7 modes, including *"two weeks to learn Python for data analysis"* in Search), `/careers/data-analyst`, `/partners/classproject`, and `/verify/SAMP-LE26-OPEN`.

## The partner API: real, and signed

`GET /api/v1/partner/recommendations?subjects=EMATH,ICT&level=SHS2&country=GH` implements spec section 25.3:
- HMAC-SHA256 signature headers, and requests older than 5 minutes are rejected;
- any learner identifier is refused (400);
- `country` (ISO code, default `GH`) says which country's catalogue the subject codes come from; only Ghana is mapped, so another country returns an empty list;
- only secondary-friendly, free courses are returned, each with a reason.

**Demo credentials:**
- key `classproject-demo`;
- secret from `PARTNER_CLASSPROJECT_SECRET` (default `demo-secret-change-me`).
- In development, add `&demo=1` to view the response unsigned.

## What's simulated

| Area | Prototype | Production (spec) |
|---|---|---|
| Data | One browser, in `localStorage`. Signing in as a persona resets that person's data; platform data (versions, uploads, questions, academy, admin) is shared by all accounts | Laravel API + MySQL (`database/schema.sql`) |
| Video | Slides with a timed transcript (no media files). Uploads keep only the file's name and size; the pipeline is timed, and a picked file can be previewed until the page reloads | Resumable upload, HLS through a CDN (Section 13) |
| Staff portals | Mock platform figures, tenants, staff and applicants (`lib/data/portals.ts`); the decisions people make are real state | The same screens on live data |
| AI tutor | Retrieval over the course's own text, with the real rules: cite or say "not in your course", label every answer, escalate | A grounded LLM through the AI gateway (Section 12) |
| Mastery | The real model: Bayesian knowledge tracing with evidence weights (Section 14.4, section 15.3) | The same, run by workers |
| Peer and instructor review | Simulated reviewers and instructor | Real people |
| Credentials | Open Badges 3.0-shaped JSON, unsigned | Signed Verifiable Credentials (Section 16) |
| Offline | A simulated switch that counts changes waiting to sync | Service worker + IndexedDB event log (Section 7.6) |
| Content | 5 fully written flagship courses and 60 practice items; 26 more courses as outlines | The real catalogue |

## Structure

```
app/(public)     /, sign-in, start (onboarding), explore, courses/[slug], learn/[slug]/[activityId],
                 careers/[id], instructors/[slug], verify/[code], p/[handle], partners/classproject
app/(learner)    home (Today), path, skills, review, projects/[id], portfolio, credentials, settings, studio,
                 studio/upload, reviewer, mentor, org, admin (staff portals)
app/api/v1/partner/recommendations   the signed partner API
components/open  shell, bits (badges, cards, Markdown), player (sim video, practice, tutor), portfolio view,
                 studio (in-video questions, publish a version, analytics)
lib/data         graph (skills, careers, projects, credentials), courses + authored lessons, item bank,
                 portals (mock data for the staff portals)
lib              mastery (knowledge tracing), learning (actions), tutor, discover, partner, personas, store,
                 studio (gates, versions, analytics), studio-video, uploads (the simulated media pipeline)
lib/i18n         interface language: fr/pt/es dictionaries and the runtime translator (spec section 7.5)
```

## Screens → spec requirements

| Screen | Requirements shown |
|---|---|
| `/` landing | FR-DS-1/2 (goal prompt, six modes), principles P1, P4 and P6 |
| `/start` | FR-ID-4 (under-18 consent), FR-DG-1..3 (diagnostic, test-out), FR-LP-2 (personal path) |
| `/home` | FR-LP-3 (next best step with reason), FR-LP-4 (plan that re-plans itself), FR-DS-4 (dismissible recommendations) |
| `/learn/…` | FR-CA-1 (where this fits), FR-VP-1..4 (player, transcript, chapters, in-video question, audio-only), FR-AI-1..8 (tutor), FR-AD-3 (states) |
| `/skills` | section 15.4 (competency graph, evidence, dispute) |
| `/review` | FR-RT-1/2 (spaced, interleaved review) |
| `/projects/…` | FR-PJ-1, FR-PR-1..6 (anonymous, calibrated, weighted peer review; moderation; appeal) |
| `/verify/…`, `/credentials` | FR-CR-1..5, AC-CR-2 |
| `/portfolio`, `/p/…` | FR-PF-1..5 (visibility, never public for under-18s) |
| `/courses/…`, course cards | FR-TR-3 (generated covers; `/thumbnails/<slug>.svg`), FR-TR-1/2 (transparency block), FR-VP-7 (download size), section 25 (referral) |
| `/settings` | FR-LC-1..3 (control, export, delete) |
| `/studio` | section 5.3 (instructor's courses), FR-CA-3 (coverage gate), FR-ST-3 (AI drafts need approval, with provenance), FR-ST-6 / FR-MK-3 / FR-CA-4 / FR-QA-2 (pre-publish gates, version sent for review, safe to migrate), FR-VP-4 (in-video question editor: draft, preview, publish), FR-ST-7 / FR-QA-4 (analytics), FR-QA-3 (flags, never silent edits) |
| `/studio/upload` | section 13.1 (upload, renditions), FR-VP-2 (captions checked by a person), FR-ST-1/2 (documents → AI drafts), FR-CA-6 (QTI / Common Cartridge import) |
| `/reviewer` | FR-MK-3 (review workflow), FR-QA-1 (rubric), FR-QA-2 (automatic checks) |
| `/mentor` | FR-AI-6 (escalations and replies), D12 (under-18 rules), section 5.3 mentor portal |
| `/org` | FR-OR-1..4 (branding, subdomain, SSO, frameworks, assignments, heat-map), journey section 4.5 |
| `/admin` | FR-AM-1..4 (tenants, AI kill switch and budget, moderation, verification), FR-MK-4 (payouts), section 25.6 (partner operations) |
| `/instructors/…` | section 5.1 (instructor profile), FR-MK-2 (verified instructors), FR-TR-2 (mastery, not star ratings) |

## How to continue in a new chat

Paste something like:

> In the cpopen repo (`D:/xampp/htdocs/cpopen`), read `README.md`, then section 0 and the Change Log of `ClassProject Open — Product Specification.md`. Continue from section 0.1 "Next step". Keep the spec, `database/schema.sql` and `database/README.md` in step with every change, and reload the schema into an empty MySQL/MariaDB database to check it.

## Working rules

1. **Spec first:** every new requirement goes into the spec: the right section, section 0.1 status, and a Change Log row.
2. **Schema in step:** a change to stored data updates `database/schema.sql` and `database/README.md` together, and is then reload-tested.
3. **Separate platforms:** Open never reads ClassProject's database, and ClassProject never reads Open's. They talk only through the signed partner API (spec section 25).
4. **Changes on both sides:** a change to the ClassProject ↔ Open link updates **both** specs: this one (Section 25) and ClassProject's (Section 49.2).
5. **Stable numbering:** spec sections keep their numbers. Add sub-sections instead of renumbering.
6. **Prototype in step:** while in phase P0, a requirement that changes what learners, instructors or admins see is also added to the prototype, and listed in this README's table that maps screens to requirements.

## When code starts

The prototype (this repo's Next.js app) is for validation, not the production codebase. The planned production layout (spec section 8.3) is `open-api/` (a Laravel 12 modular monolith) and `open-web/` (a Next.js PWA), most likely in their own repository. When that happens, leave a pointer here and in ClassProject's spec.
