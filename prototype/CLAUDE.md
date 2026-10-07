@AGENTS.md

# ClassProject Open prototype: working rules

This is the phase-P0 clickable prototype of **ClassProject Open**, a separate platform from ClassProject. Start with `../README.md` and this folder's `README.md`.

- **The spec is the source of truth:** `../ClassProject Open — Product Specification.md`. Every change to what the prototype does is also written there:
  - in the section it belongs to;
  - in section 21.1 if it changes what the prototype shows;
  - in the section 0.1 status;
  - in a Change Log row.
- **Data the platform would store** changes `../database/schema.sql` and `../database/README.md` in the same change, and the schema is then reloaded into an empty MySQL/MariaDB database.
- **Screens:** update this folder's README table that maps screens to requirements, and its demo script, when you add or change a screen.
- **The link to ClassProject:** a change to it (partner API, referral, matching rules) updates Open spec section 25 **and** ClassProject spec section 49.2. The course slugs in `lib/data/courses.ts` must match `lib/mooc.ts` in the ClassProject (cp) repo.
- **State:** it lives in `lib/store.ts` (localStorage). Bump `STATE_VERSION` when its shape changes, and update `lib/personas.ts`.
  - Signing in replaces one person's data, but **platform data is shared by every account**: the keys in `SHARED_KEYS` (course versions, uploads, drafts, flags, help requests, the academy, admin decisions). Their demo data is seeded once, in `seedShared()` in `lib/personas.ts`.
  - Data that one role creates and another acts on goes in `SHARED_KEYS`, not in one persona's seed. Otherwise switching persona wipes it and the cross-role flows break.
- **Roles:** each staff portal is wrapped in `RoleGate` (`components/open/role-gate.tsx`). Its links are in `STAFF_NAV` (`components/open/shell.tsx`), and its landing page is in `HOME_FOR` (`lib/personas.ts`).
- **Interface language (spec section 7.5):** new or changed interface text needs French, Portuguese and Spanish entries in `lib/i18n/dict/{fr,pt,es}.json`, keyed by the English text. Template literals become `{0}` patterns. Catalogue and lesson text in `lib/data` (titles, descriptions, practice items, transcripts, slides, readings) is translated too, standing in for translated course versions. New or changed data text needs entries as well. Markdown readings are keyed by the whole document. From this folder, `node ../scripts/i18n-extract.mjs . --missing` lists what is untranslated.
- **Checks before you finish:** `npx tsc --noEmit`, `npx eslint .` and `npx next build`.
