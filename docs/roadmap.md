# formeasy — Roadmap

Six phases. Each ships something usable and ends on a checkable gate. Tests are
written inside the phase that creates the code, not saved up for a later pass.

**Status:** phases 1–4 complete. Phases 5 and 6 are implemented — the two open
items are the README screenshot and the demo instance, both of which need a
deployed instance to produce.

## Phase 1 — Foundation & build

**You can:** sign in, create a form, add every field type, and have it autosave.

- Scaffold: `create-next-app` (App Router, TS), Tailwind, shadcn/ui, Clerk,
  Drizzle, a Neon dev branch, pooled DB client, first migration.
- Auth: landing, sign in/up, dashboard shell, protected routes.
- Form CRUD: create (nanoid id), list, rename, delete.
- `lib/fields.ts`: the `Field` union, defaults, `fieldsToZod`.
- `FieldRenderer` in edit mode, all 7 types.
- Builder: add / edit / delete / reorder, debounced autosave, saving indicator.
- Tests: `fieldsToZod` unit tests; id minting.

**Done when:** build a form using all 7 types, reorder, reload → identical. Sign
out → `/dashboard` redirects to sign-in.

## Phase 2 — Publish & collect

**You can:** publish a link and receive responses from anyone.

- Publish action (validates via `fieldsToZod`); `status` draft → published.
- `FieldRenderer` in preview mode; public `/f/[id]`; 404 for draft or missing.
- Submit Server Action (a POST to `/f/[id]`), asserted published && accepting,
  then parse, validate, and insert `answers` + `meta`.
- Client checks for UX, server validation as the gate, values preserved with
  errors on failure.
- Thank-you page.
- Tests: submit path — valid, invalid (missing required, out of range, forged
  option id), draft, closed, unknown id, and the values-preserved-on-error path.

**Done when:** incognito → submit → row exists in the DB, and an invalid field
keeps the filled form with the error shown.

## Phase 3 — Responses

**You can:** read what came in, export it, and stop accepting.

- Responses list (newest first); response count on the dashboard.
- CSV export: headers from fields, orphan column for deleted fields, RFC-4180
  quoting.
- Close / reopen toggle (`accept_responses`) and the "no longer accepting" state.

**Done when:** 3 responses export to a CSV that opens in a spreadsheet, including
one submitted before a field was deleted.

## Phase 4 — Safe & polished ⭐ v1.0

**You can:** leave it on the open internet unattended.

- Rate limit per IP / form; honeypot; answer size caps; `meta` capture.
- Empty states everywhere; loading and error boundaries.
- Mobile pass on the builder and the public form; keyboard + focus in the builder.
- Error tracking.

**Done when:** a spam script gets throttled, oversized payloads are rejected, and
failures reach users as friendly messages instead of stack traces.

## Phase 5 — Open source

**You can:** hand it to a stranger.

- [x] LICENSE — MIT.
- [x] README: what it is, screenshot, quickstart, env vars.
- [ ] Screenshot. The slot is marked in the README; it needs a real instance and
  a browser, so it is saved for the first deploy rather than committed as a
  placeholder.
- [x] CONTRIBUTING + issue / PR templates.
- [x] Self-host guide: Vercel one-click and Docker
  ([`self-hosting.md`](self-hosting.md)).
- [x] CI: typecheck, lint, and the hermetic test suite on every pull request; the
  browser suite runs too when Clerk secrets are configured. Preview deploys come
  from Vercel's Git integration, which needs no workflow.
- [x] One e2e test: build → publish → fill → submit → export, against a
  production build and with the respondent signed out.
- [ ] Demo instance.

**Done when:** a stranger clones the repo, adds their own Neon + Clerk keys, and
deploys from the README alone.

## Phase 6 — Agent access (AgentOnboard)

**You can:** hand an AI agent the keys and let it build and read forms on your
behalf.

- `AON_AUDIENCE` config, and `/auth.md` rendered from it.
- `lib/agent/verify.ts`: the local RS256 check and the 401 / 403 / 500 mapping,
  pure and pinned to AgentOnboard's conformance vector.
- `lib/agent/accounts.ts`: verified email → Clerk user, with an exact-match guard
  against Clerk's partial email filter.
- The agent API: list, create, read, patch, delete, publish, unpublish,
  responses, CSV export.
- `POST /api/signup`: the one handler that may create an account.
- The agent routes added to the `proxy.ts` public matcher, each re-checking its
  own token; `lib/forms/draft.ts` extracted so the builder's autosave and the API
  clean a draft the same way.

**Done when:** `AON_AUDIENCE` is set, `curl https://<host>/auth.md` returns
markdown, and an agent token can go `403 ACCOUNT_REQUIRED` → `POST /api/signup` →
create a form → publish it → read the responses, with no browser.

## After v1 — backlog

Not phases. Pick by demand.

- Multi-page forms
- Branching / conditional logic
- File uploads (needs blob storage; makes self-hosting heavier)
- Duplicate form
- Custom slugs
- Richer validation (length, regex)
- Themes / custom styling
- Templates / starter forms
- Teams, roles, sharing
- Webhooks, email notifications, response analytics, embeddable widget

Two properties hold for everything here: **each item is additive** (no migration
that breaks existing responses), and **none of it blocks shipping v1**.
