# Contributing

Bug reports and pull requests are welcome. Small and focused beats large and
speculative — if you want to change the data model, the field schema, or the
submit path, open an issue first so we agree on the shape before you write it.

## Getting set up

The [README quickstart](README.md#quickstart) is the whole setup: a Clerk
application, a Neon project, then

```bash
pnpm install
cp .env.example .env.local     # fill in the two Clerk keys and both Neon URLs
pnpm db:migrate
pnpm dev
```

## Tests

There are three suites, and they are deliberately different in what they are
allowed to touch.

| Command | Touches | Runs on a pull request |
|---|---|---|
| `pnpm test` | nothing — no network, no database | yes |
| `pnpm test:db` | a real Postgres, via `DATABASE_URL_POOLED` | no |
| `pnpm test:e2e` | a real browser, Clerk, and Postgres | when the secrets are configured |

`pnpm test` is the one to run constantly. It is hermetic by construction: the
submit action is tested against a mocked `@/lib/db`, so it is fast and it is the
same on your machine as in CI.

Push as much logic as you can into a **pure module** so that this stays true —
`lib/forms/submit.ts` is the model: the rate-limit rule, the size caps, and the
IP hash are functions that take their inputs as arguments, and the Server Action
is thin plumbing around them.

### The database suite

```bash
pnpm test:db
```

Anything needing a real round trip lives in a `*.integration.test.ts` file and is
gated behind `RUN_DB_TESTS=1`. Point it at a database you do not mind writing
to.

### The browser suite

```bash
pnpm exec playwright install chromium   # once per machine
pnpm test:e2e
```

It needs the Clerk keys and the database from `.env.local`, and it runs against a
**production build** (`pnpm build && pnpm start`), so a passing run is evidence
that what you deploy works — not just what you develop on.

What it does, in one test: signs in at `+clerk_test` address, creates a form,
adds a question, publishes, opens the public link **in a separate, signed-out
browser context**, submits an answer, reads it back in the responses list, and
downloads the CSV.

Two consequences worth knowing before you run it:

- **It writes to your database.** It creates the test user if it does not exist,
  then deletes every form that user owns. Run it against a development database.
- **The `+clerk_test` address is reserved by Clerk.** No email is sent, and its
  verification code is fixed. That only works on a *development* instance — the
  suite will not run against a production Clerk instance without changes.

It does not run when the secrets are missing. Forks and outside contributors get
a green CI without needing credentials; that is intentional, not an oversight.

## Conventions

[`AGENTS.md`](AGENTS.md) is the long form, and it is worth reading in full before
your first change. The short version of what is not negotiable:

- **`lib/fields.ts` is the single source of truth for the field schema.** Adding
  a field type is one edit there — the union, its default, and its zod builder.
  The builder, the renderer, and the submit validator all derive from it. A type
  that exists in one and not the others is the bug.
- **Ids are permanent.** Field ids and option ids are answer keys. Renaming a
  label or an option is free; minting an id for something that already had one is
  not.
- **One renderer, two modes.** `FieldRenderer mode="preview" | "edit"` is shared
  by the builder and the public form, so they cannot drift. Do not fork it.
- **The server is the gate.** The submit action re-validates with
  `validateAnswers` no matter what the client sent.
- **Every failure of ours goes through `reportError`**, and the copy a person
  reads never carries the cause.
- **Motion is tokens, not durations.** Pick a transition from `lib/motion.ts`
  instead of writing a duration at the call site.
- **Colour, radius, and type come from tokens** in `app/globals.css`. No hexes in
  components.
- **Tests live next to the module** as `<module>.test.ts` and import through the
  `@/*` alias, so they resolve the same specifiers the app does.

## Commits and pull requests

Commits are `type(scope): imperative summary` — `feat(builder): ...`,
`fix(csv): ...`, `docs(self-hosting): ...` — matching the existing history. Keep
the body to *why* when the *what* is not obvious from the diff.

A pull request should be green on `pnpm lint`, `pnpm typecheck`, and `pnpm test`
before review; CI runs exactly those. The
[pull request template](.github/pull_request_template.md) asks for the rest.
