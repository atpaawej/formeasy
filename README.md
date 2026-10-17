# formeasy

**Build a form, share a link, read every answer.**

An open-source alternative to Google Forms. You sign in and build a form; the
people you ask never need an account. Answers land in your dashboard, export to
CSV, and stop coming in the moment you close the form.

<!--
  The screenshot goes here, at the top, width ~1000px:

    ![The builder, with a published form and its responses](docs/screenshot.png)

  Produce it with `pnpm test:e2e` running against a real instance (or by hand at
  1440×900), then save it as `docs/screenshot.png`. The file is deliberately not
  committed yet rather than committed as a placeholder.
-->

## What it does

- **Seven field types** — short text, long text, multiple choice, checkboxes,
  dropdown, number, date.
- **A link, not a login.** Publishing gives you a public URL. Respondents see
  the form and nothing else.
- **Answers you can read.** A responses list, newest first, plus a CSV export
  that opens in a spreadsheet.
- **Draft → published → closed.** Closing keeps the link working and the
  questions readable; it just stops taking answers.
- **Safe to leave running.** A rate limit, a honeypot, and payload size caps,
  with every failure of ours going to one error sink rather than to a stack
  trace.

## Quickstart

You need a [Clerk](https://clerk.com) application (auth) and a
[Neon](https://neon.tech) project (Postgres). Both have free tiers. About five
minutes.

### 1. Clerk

Create an application, then copy the two keys from the **API keys** page. Accept
the defaults for sign-in methods — email is enough.

### 2. Neon

Create a project, then open **Connection string** and copy **both** strings it
offers:

| Neon calls it | Copy it into |
|---|---|
| the **pooled** connection (its host contains `-pooler`) | `DATABASE_URL_POOLED` |
| the **direct** connection | `DATABASE_URL` |

> **This is inverted from the naming the Vercel/Neon integration uses.** There,
> `DATABASE_URL` is the pooled string. Here, `DATABASE_URL_POOLED` is what the
> app queries through and `DATABASE_URL` is only for migrations — read the two
> values back before you save them.

### 3. Run it

```bash
git clone https://github.com/atpaawej/formeasy
cd formeasy
pnpm install

cp .env.example .env.local     # then fill it in
pnpm db:migrate                # creates the two tables
pnpm dev
```

Open <http://localhost:3000>, sign up, and build a form.

## Environment variables

`.env.example` is the full list, with the reasoning next to each one.

| Variable | Required | What it is |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | yes | Clerk key. Public by design. |
| `CLERK_SECRET_KEY` | yes | Clerk key. Server only. |
| `DATABASE_URL_POOLED` | yes | The app's connection, through Neon's pooler. |
| `DATABASE_URL` | yes | The direct connection, for `drizzle-kit`. |
| `RESPONSE_HASH_SALT` | yes in production | Salt for hashing respondent IP addresses. Any long random string. |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | no | Defaults to `/sign-in`. |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | no | Defaults to `/sign-up`. |
| `ERROR_REPORT_URL` | no | Where error reports are POSTed. Unset means "log only". |
| `NEXT_OUTPUT_STANDALONE` | no | Set by the `Dockerfile`; makes `next build` emit the standalone server. |

Respondent IPs are only ever stored hashed (`RESPONSE_HASH_SALT` +
`meta.ipHash`), which is what the rate limit counts. Rotating the salt makes
existing hashes unlinkable — that is the point.

## Deploy

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fatpaawej%2Fformeasy&project-name=formeasy&repository-name=formeasy&env=NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,CLERK_SECRET_KEY,DATABASE_URL,DATABASE_URL_POOLED,RESPONSE_HASH_SALT&envDescription=From%20Clerk%20(API%20keys)%20and%20Neon%20(connection%20string%20%E2%80%94%20pooled%20one%20goes%20in%20DATABASE_URL_POOLED))

Vercel fills in the five required variables as you go. Then run the migration
once against the same database — from your machine, with the same `.env.local`
you already have:

```bash
pnpm db:migrate
```

Vercel's Git integration gives you a preview URL per pull request for free, and
`main` deploys to production. There is nothing to configure for that; it is what
the integration does.

### Anywhere else

Vercel is not required. See [`docs/self-hosting.md`](docs/self-hosting.md) for
the Docker image (with a `docker compose up` that brings its own Postgres) and
for what to know when you run more than one instance.

## Scripts

| Command | Does |
|---|---|
| `pnpm dev` | Development server |
| `pnpm build` / `pnpm start` | Production build and server |
| `pnpm test` | Unit tests. Hermetic — no network, no database. |
| `pnpm test:db` | The Postgres round-trip tests. Needs `DATABASE_URL_POOLED`. |
| `pnpm test:e2e` | The browser suite: build → publish → fill → submit → export. Needs Clerk + Postgres. |
| `pnpm lint` / `pnpm typecheck` | ESLint / `tsc` |
| `pnpm db:generate` / `pnpm db:migrate` | Drizzle migrations |

## Built with

| Piece | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Cache Components) |
| Database | Postgres — Neon in production, any Postgres otherwise |
| ORM | Drizzle |
| Auth | Clerk |
| UI | Tailwind 4 + shadcn/ui, with motion as a token language |

## Docs

- [`docs/design.md`](docs/design.md) — the data model, the field schema, the
  route map, and the reasoning behind each. Read this before changing any of the
  three.
- [`docs/design-system.md`](docs/design-system.md) — palette, type, layout,
  motion, and the rules that keep them consistent.
- [`docs/self-hosting.md`](docs/self-hosting.md) — Docker, Neon, Clerk, and
  multi-instance notes.
- [`docs/roadmap.md`](docs/roadmap.md) — what is built, what is next.
- [`AGENTS.md`](AGENTS.md) — the conventions the code actually follows, written
  for whoever (or whatever) is contributing next.

## Contributing

Issues and pull requests are welcome. [`CONTRIBUTING.md`](CONTRIBUTING.md) has
the setup, the two test suites, and the conventions that are not negotiable.

## License

[MIT](LICENSE).
