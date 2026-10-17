<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# formeasy

Open-source Google Forms alternative: build a form, publish a link, collect
responses, export CSV.

Stack, data model, field schema, and routes live in
[`docs/design.md`](docs/design.md); the build sequence and current phase live in
[`docs/roadmap.md`](docs/roadmap.md). Read the design doc before changing the
data model, the field schema, or the submit path.

Visual direction — palette, type, layout, and the rules behind them — is in
[`docs/design-system.md`](docs/design-system.md).

## Conventions

- **`lib/fields.ts` is the single source of truth for the field schema.** Adding
  a field type is one edit there: the `Field` union, its default, and the zod
  builder. The builder, `FieldRenderer`, and the submit validator all derive from
  it. A field type that exists in one of those and not the others is the bug.
- **Field ids and option ids are permanent.** Answers are keyed by id, so
  renaming a label or option is free and minting an id twice is not.
- **One renderer, two modes.** `FieldRenderer mode="preview" | "edit"`. The
  builder and the public form share it so they cannot drift.
- **The submit path re-validates** with `validateAnswers(fields, ...)` — which
  builds on `fieldsToZod(fields)` — regardless of what the client sent. The
  server is the gate.
- **Autosave writes the whole `fields` array.** Validate on publish and on
  submit; half-edited fields save freely.
- **Public routes stay public.** `/f/*` is listed in the `proxy.ts` matcher as
  public. It covers the form, its thank-you page, and the submit Server Action
  (a POST to `/f/[id]`). A new public route gets added there in the same change
  that adds the route. The metadata routes need that entry more than they look
  like they do: an `opengraph-image` URL has no file extension and `.txt`/`.xml`
  are not in the matcher's static-file exclusion, so `/opengraph-image`,
  `/twitter-image`, `/robots.txt`, and `/sitemap.xml` are answered by Clerk unless
  they are listed — and a crawler handed the sign-in page gets no card at all. The
  marketing pages (`/about`, `/self-hosting`) are public for the obvious reason,
  and read with JavaScript off, like the public form.
- **A public route re-checks itself.** The proxy lets a route past Clerk; it does
  not authenticate it. `/api/agent/*`, `/api/signup`, and `/auth.md` are in the
  matcher as public because Clerk cannot read a bearer token, and each agent route
  answers with `requireAgentUser` (`lib/agent/session.ts`) before it touches the
  database. The owner a write lands under is the user id that token resolved to —
  never a value from the body, never a path parameter.
- **The agent audience is configuration, never the request.** `AON_AUDIENCE` is a
  literal (`lib/agent/config.ts`); deriving it from `Host` would turn a check into
  an instruction, which is how a token minted for another service is accepted
  here. Unset means agent access is off and routes fail closed. `/auth.md` is
  rendered from the same value (`lib/agent/auth-md.ts`) so the file an agent reads
  cannot disagree with the check — which is also why it is a route, not a static
  file in `public/`.
- **The status mapping lives in `lib/agent/verify.ts`, not in a route.** 403 for
  `ACCOUNT_REQUIRED`, 500 for `RESOLVER_ERROR`/`CONFIG_ERROR`, 401 for everything
  else. It is pure, so it is tested against AgentOnboard's conformance vector with
  a pinned key set and no network — the same move as `lib/forms/submit.ts`.
- **Account creation is exactly one handler.** `POST /api/signup` is the only
  route that may create an account; everywhere else a miss is `403`. Do not wrap
  the creating version around other routes — an account would appear as a side
  effect of a read, and the switch would not be greppable.
- **Clerk's email filter is a partial match.** `getUserList({ emailAddress })`
  matches case-insensitively on a substring, so `lib/agent/accounts.ts` checks the
  returned rows for an exact address before trusting one. Taking `data[0]` hands an
  agent someone else's account.
- **Neon needs two strings.** App queries use `DATABASE_URL_POOLED`; `drizzle-kit`
  migrations use `DATABASE_URL`. Note this is inverted from the Vercel/Neon
  integration's naming — read the env file.
- **Tests live next to the module** as `<module>.test.ts`, using the `@/*` alias
  so they import the same specifiers the app does. `pnpm test` is hermetic — no
  network, no database — because the submit action is tested against a mocked
  `@/lib/db`. Anything that needs a real Postgres round-trip goes in a
  `*.integration.test.ts` gated on `RUN_DB_TESTS=1` and run with `pnpm test:db`.
- **The browser suite is the one that leaves the machine.** `pnpm test:e2e` runs
  Playwright against a production build (`pnpm build && pnpm start`) and a real
  Clerk development instance, signs in as a `+clerk_test` user, and answers the
  form from a separate signed-out context — "respondents need no account" is a
  promise the proxy matcher can break without the signed-in owner noticing. It
  writes real rows, so the setup and teardown projects delete every form the
  test user owns; a killed run is swept by the next one. When the Clerk secrets
  are absent the CI job skips rather than fails. Everything else stays hermetic.
- **`output: "standalone"` stays opt-in.** `next.config.ts` turns it on only for
  `NEXT_OUTPUT_STANDALONE=true`, which the `Dockerfile` sets. Vercel builds the
  app itself and does not need the folder; hard-coding it on changes what every
  build emits for one consumer. See [`docs/self-hosting.md`](docs/self-hosting.md).
- **Push decisions out of server actions into pure modules.** `lib/forms/submit.ts`
  holds `canAcceptResponses`, `readAnswersFromFormData`, and `hashIp`; the action
  is thin plumbing. That is what makes the gate testable without a request.
- **Abuse handling is the same kind of decision.** `lib/forms/submit.ts` holds the
  size caps (`exceedsSubmissionSize`) and the rate-limit rule (`isRateLimited`);
  `lib/forms/honeypot.ts` holds the honeypot's name, in its own module because the
  *form* imports it and must not drag `node:crypto` in with it. The action hands
  in the values, the recent count, and the clock. The rate limit counts the
  `responses` table off `(form_id, submitted_at)` + `meta.ipHash` — no extra
  table, no cache, no migration. See [`docs/design.md`](docs/design.md).
- **Every failure of ours goes through `reportError`** (`lib/observability.ts`),
  and every route has an `error.tsx` that is three lines because
  `components/route-error.tsx` owns the reporting and the fallback shape. The copy
  a person reads never carries the cause: they can act on "try again", and the
  cause belongs in the log.
- **One formatter for what a human reads.** `lib/forms/answers.ts` turns stored
  answers into display text — option id → label, multi-choice joined, an answer
  whose field is gone shown under its raw field id. The responses list and the
  CSV both call it, so the screen and the export cannot disagree.
- **The social cards are one layout and two fonts, both in the repo.**
  `lib/og/card.tsx` is the only definition — the site-wide card and a form's card
  render it with different words. The faces are `assets/fonts` (Geist + Source
  Serif 4, OFL), read at runtime, so `outputFileTracingIncludes` in
  `next.config.ts` is what carries them into the standalone Docker image: a
  `readFile` is invisible to the tracer in a way an import is not. `lib/og/text.ts`
  clamps the text because the card's canvas is fixed and cannot reflow — a long
  title runs over the layout, not past it.
- **Motion is tokens, not durations.** `lib/motion.ts` is the whole motion
  language; pick a transition there instead of writing a duration at the call
  site. `components/ui/button.tsx` is a client component (it's a motion
  component), so its styles live apart in `button-variants.ts` for server
  callers. The public form animates in CSS and must render with no JS. Details in
  [`docs/design-system.md`](docs/design-system.md).
- **Button states are the button's job.** `loading` and `success` are real
  states on `components/ui/button.tsx`, not a spinner and a check icon rebuilt at
  each call site. The stand-in takes the label's place *and* its width, so a
  button never resizes mid-action, and the resting label stays in the tree so the
  accessible name survives.
- **Page transitions, two layers.** The shell pages — landing, dashboard,
  sign-in/up — arrive through React's `<ViewTransition>` (`components/
  page-transition.tsx` plus the `::view-transition` CSS). Those pages use the
  browser's snapshot-and-crossfade, which remounts nothing, so a form's tab
  indicator can keep sliding underneath. The form's own two views stay on
  `app/dashboard/forms/[id]/template.tsx`; don't lift it higher or the section
  layout remounts on every tab switch.
- **A link stays a link.** Something that navigates is a `<Link>`/`<a>` wearing
  `buttonVariants`, never `<Button render={<a />}>` — the latter warns (the
  element stops being a real `<button>`) and adds `role="button"` to what is
  still a link.
- **Connection strings go through `withStrictSsl`.** Neon's `sslmode=require` is
  pinned to `verify-full` (what it already means) so `pg` stops warning and v9
  cannot quietly weaken it. Both `lib/db/index.ts` and `drizzle.config.ts` use it.

## Next.js 16 gotchas

- **The proxy file is `proxy.ts`** (named export `proxy`), not `middleware.ts`.
- **Server Functions are POSTs to their host route.** A proxy matcher that
  excludes a path skips them, so every Server Function re-checks auth itself.
- **Cache Components is on** (`cacheComponents: true`). Anything that reads
  `auth()`, `cookies()`, `headers()`, dynamic `params`, or the DB goes inside a
  `<Suspense>` boundary. The dev overlay names the fix if one is missing.
- **`export const dynamic` is gone** under Cache Components. To hold a route
  handler or page until request time — `/auth.md` needs it, so the audience comes
  from the running deployment and not from `next build` — `await connection()`
  from `next/server` instead. A `route.ts` that only reads `process.env` is a
  prerender candidate.
- **`params` and `searchParams` are Promises.** `await` them, or pass the promise
  down and await it deeper so more of the shell can prerender.
- **Tailwind 4** is CSS-first: tokens live in `@theme` in `app/globals.css`.
  There is no `tailwind.config.ts`.
