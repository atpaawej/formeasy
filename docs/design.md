# formeasy — Design

An open-source Google Forms alternative. Build a form, publish it, share a link,
collect responses, export CSV.

This document is the record of decisions. It is the source of truth for the data
model, the field schema, and the route map. Working conventions live in
[`../AGENTS.md`](../AGENTS.md).

## Stack

| Piece | Choice |
|---|---|
| Framework | Next.js (App Router) |
| Database | Neon (Postgres) |
| ORM | Drizzle |
| Auth | Clerk |
| Agent access | AgentOnboard (RS256 bearer tokens) |
| Hosting | Vercel |
| UI | Tailwind + shadcn/ui |

## Repo layout

```
app/
  (marketing)/                      # public shell: one header + footer
    layout.tsx
    page.tsx                        # landing
    about/page.tsx
    agents/page.tsx
    self-hosting/page.tsx
  opengraph-image.tsx               # the site-wide social card
  twitter-image.tsx
  robots.ts                         # /robots.txt
  sitemap.ts                        # /sitemap.xml
  dashboard/
    page.tsx                        # my forms
    forms/[id]/
      edit/page.tsx                 # the builder
      page.tsx                      # responses list + export
  f/[id]/
    page.tsx                        # public form (no auth)
    submitted/page.tsx              # thank-you
    opengraph-image.tsx             # the form's own social card
    twitter-image.tsx
  api/forms/[id]/
    export/route.ts                 # GET CSV — auth
  api/agent/                        # the agent API — bearer token, not Clerk
    forms/route.ts                  # list, create
    forms/[id]/route.ts             # read, patch, delete
    forms/[id]/publish|unpublish/   # lifecycle, validated
    forms/[id]/responses|export/    # read what came in
  api/signup/route.ts               # the only route that creates an account
  auth.md/route.ts                  # the discovery file agents read first
components/
  builder/                          # field editor, add/remove/reorder
  fields/                           # FieldRenderer — one renderer, two modes
  marketing/                        # the shell and the hero question
  responses/                        # the list, the toolbar, the empty state
lib/
  agent/                            # the agent gate: config, verify, accounts
  db/schema.ts                      # Drizzle tables
  db/index.ts                       # pooled Neon client
  fields.ts                         # the Field union + zod + defaults
  forms/draft.ts                    # what a draft may be, shared by both writers
  og/                               # the social card: fonts, layout, text fitting
  site.ts                           # the site's address, from configuration
assets/fonts/                       # the two faces the OG cards draw with (OFL)
drizzle/                            # migrations
proxy.ts                            # Clerk, with public routes allowed
```

## Scope — v1

**In:**

- Build a form: title, description, fields.
- 7 field types (below).
- Publish → public URL; respondents need no account.
- Store submissions.
- View responses; export CSV.
- Draft / published / closed lifecycle.

**Out (each is its own project later):**

- Branching / conditional logic.
- Quizzes and scoring.
- File uploads.
- Payments.
- Teams, roles, sharing between users.
- Themes and custom styling.

## Data model

Two tables. No `users` table: Clerk hands us the user id and email in the
session, and forms are keyed by `owner_id`, so listing your forms is a single
`where owner_id = ?` with no join. Add a users table the day we need teams.

```sql
forms
  id                text        primary key      -- nanoid; doubles as the public slug
  owner_id          text        not null         -- Clerk user id
  title             text        not null default 'Untitled form'
  description       text
  status            text        not null default 'draft'   -- 'draft' | 'published'
  accept_responses  boolean     not null default true
  fields            jsonb       not null default '[]'
  settings          jsonb       not null default '{}'
  created_at        timestamptz not null default now()
  updated_at        timestamptz not null default now()

responses
  id                uuid        primary key default gen_random_uuid()
  form_id           text        not null references forms(id) on delete cascade
  answers           jsonb       not null default '{}'
  meta              jsonb       not null default '{}'      -- ip hash, user agent, referrer
  submitted_at      timestamptz not null default now()
```

Indexes:

- `responses (form_id, submitted_at desc)` — response list + count.
- `forms (owner_id, updated_at desc)` — dashboard.

### Why JSONB for `fields` and `answers`

The alternative is a `form_fields` table and an `answers` row per field per
response. That buys referential integrity and plain-SQL `GROUP BY field_id`, and
costs a join-heavy read path, a pivot for CSV export, and diffing logic for every
form edit.

Because the entire `fields` array is one JSONB column, **saving a form is a
single `UPDATE` of the whole array** — no partial updates, no dirty-field
tracking, which is what makes debounced autosave trivial. Postgres JSONB
operators (`answers -> 'fieldId'`) cover the aggregation we'd realistically want.

The price is that nothing at the schema level stops a response from holding an
answer to a field that was later deleted. We accept that and handle it explicitly
(see *Editing a form that has responses*).

## Field schema — the source of truth

`lib/fields.ts`. Builder, renderer, and validator all derive from this union.
Adding a field type is one edit here.

```ts
type FieldOption = { id: string; label: string }

type Field =
  | { id: string; type: 'short_text';    label: string; required: boolean; description?: string; placeholder?: string }
  | { id: string; type: 'long_text';     label: string; required: boolean; description?: string; placeholder?: string }
  | { id: string; type: 'number';        label: string; required: boolean; description?: string; min?: number; max?: number }
  | { id: string; type: 'date';          label: string; required: boolean; description?: string }
  | { id: string; type: 'single_choice'; label: string; required: boolean; description?: string; options: FieldOption[] }
  | { id: string; type: 'multi_choice';  label: string; required: boolean; description?: string; options: FieldOption[] }
  | { id: string; type: 'dropdown';      label: string; required: boolean; description?: string; options: FieldOption[] }
```

A discriminated union on `type`.

### Answers

Keyed by **field id**, and choice answers store the **option id**, never the
label:

| field type | answer value |
|---|---|
| `short_text`, `long_text`, `dropdown` | `string` |
| `number` | `number` |
| `date` | `string` (ISO `yyyy-mm-dd`) |
| `single_choice` | `string` (option id) |
| `multi_choice` | `string[]` (option ids) |

Storing option ids is what makes renaming an option free: the answer points at
the id, and the new label renders in its place.

### Validation

`fieldsToZod(fields)` builds a zod schema from a `Field[]`. That one schema
validates in three places — publishing, the public submission, and any future
CSV re-import — so the definition can't drift between them.

## Routes

| Method | Path | Auth | Does |
|---|---|---|---|
| GET | `/` | no | Landing, sign in |
| GET | `/about` | **no** | The story, the principles, what is out of scope |
| GET | `/agents` | **no** | AgentOnboard: the flow, and the boundaries |
| GET | `/self-hosting` | **no** | Running it: Vercel, Docker, proxies |
| GET | `/opengraph-image` · `/twitter-image` | **no** | The site-wide social card |
| GET | `/robots.txt` · `/sitemap.xml` | **no** | Crawler metadata |
| GET | `/dashboard` | yes | List my forms |
| POST | `/dashboard` | yes | Create form → redirect to builder |
| GET | `/dashboard/forms/[id]/edit` | yes | Builder |
| GET | `/dashboard/forms/[id]` | yes | Responses + CSV button |
| GET | `/f/[id]` | **no** | Public form |
| POST | `/f/[id]` | **no** | Server Action: validate + store, then redirect |
| GET | `/f/[id]/submitted` | **no** | Thank-you |
| GET | `/f/[id]/opengraph-image` · `/twitter-image` | **no** | The form's own social card |
| GET | `/api/forms/[id]/export` | yes | CSV download |
| GET | `/auth.md` | **no** | Discovery file for agents: audience, endpoints, rejections |
| GET | `/api/agent/forms` | agent | My forms |
| POST | `/api/agent/forms` | agent | Create a form |
| GET · PATCH · DELETE | `/api/agent/forms/[id]` | agent | Read · edit · delete |
| POST | `/api/agent/forms/[id]/publish` | agent | Publish (validated), or `/unpublish` back to draft |
| GET | `/api/agent/forms/[id]/responses` | agent | Responses as JSON |
| GET | `/api/agent/forms/[id]/export` | agent | The same CSV, for an agent |
| POST | `/api/signup` | agent | Create the calling account |

Submission is a **Server Action**, which is a POST to its host route `/f/[id]` —
not a separate API route. That keeps the failure path free: the action returns
the errors, React re-renders the same route, and the uncontrolled inputs still
hold the respondent's answers. A route handler would have to hand-roll that.

`agent` in the Auth column means an AgentOnboard bearer token, verified in the
route (see below), not a Clerk session.

## Agent access (AgentOnboard)

An agent — a person's assistant acting on their behalf — can create a formeasy
account and then use the whole product: build a form, publish it, read what came
in, export it. It does this with a short-lived RS256 token that
[AgentOnboard](https://agentonboard.xyz) mints for a verified email address. The
integration is modelled on Google's *Sign in with* flow, with the agent in the
browser's chair.

The pieces, and the one decision each makes:

- **`AON_AUDIENCE` is the gate's only input we configure.** It is the bare
  hostname this deployment serves on, and it comes from configuration, **never
  from the request**. An audience read off `Host` is not a check — it is an
  instruction, and obeying it is how a token minted for some other service gets
  accepted here. Unset means agent access is off: routes fail closed with
  `CONFIG_ERROR` (500) and `/auth.md` 404s rather than advertising a capability
  the deployment does not have.
- **`/auth.md` is rendered from that audience, not committed as a static file.**
  AgentOnboard's guide suggests `public/auth.md`, but formeasy is self-hostable:
  one baked-in hostname would be wrong for every deployment but one, and an
  `## Audience` line that disagrees with the `audience` in the code is exactly
  the drift the file exists to prevent. `app/auth.md/route.ts` builds it from
  `AON_AUDIENCE` at request time (`connection()`, because Cache Components would
  otherwise bake the build machine's value in), so the two agree by
  construction.
- **`lib/agent/verify.ts` owns the status mapping.** The SDK's
  `verifyAgentAccount` does the cryptography; we decide what a failure becomes.
  `ACCOUNT_REQUIRED` is **403**, not 401 — the token verified and the account is
  missing, and a 401 would tell the agent to re-authenticate, which can never
  create an account. `RESOLVER_ERROR` and `CONFIG_ERROR` are **500**: nobody's
  request is wrong. Everything else is 401, uniformly, so a prober learns
  nothing from the difference. It is a pure module on purpose, exercised against
  AgentOnboard's published conformance vector with a pinned key set and no
  network.
- **The verified email is the join key, and Clerk is the identity store.**
  `lib/agent/accounts.ts` looks the email up with `getUserList` — and checks
  every returned row for an *exact* match, because Clerk's `emailAddress` filter
  is a case-insensitive **partial** match, so `notada@example.com` comes back for
  a lookup of `ada@example.com`. Taking the first row would hand an agent
  somebody else's account.
- **Identity is not a new principal.** An agent does not get a shadow account: a
  verified email resolves to the human's Clerk user id, and the form an agent
  creates is one the person opens in the dashboard the next morning. That is
  what "use all features" means here — there is no second, lesser product for
  agents to be confined to.

### Creating an account

Account creation lives in exactly one handler, `POST /api/signup`, and it is off
the request path for every other route. An unknown identity gets
`403 ACCOUNT_REQUIRED`; `/auth.md` names signup in that row, and the agent calls
it with the same token and retries once. Wrapping every route in the creating
version would bring an account into being as a side effect of whatever request an
agent happened to make — including a read — and switching to it would not be
greppable. `created` distinguishes sign-up from sign-in, and a repeat call signs
in rather than duplicating: the resolver runs first, and its hit is what stops a
second `createUser`.

The account is created with `skipPasswordRequirement` — the agent cannot answer a
password prompt, and AgentOnboard has already proved the inbox. It is otherwise
an ordinary Clerk user; the person sets a password or signs in with a link later.

### What this deliberately does not do

**It does not stop a stranger from getting an account.** Anyone who can receive
mail at an address AgentOnboard will verify can call `POST /api/signup` and have
a formeasy account in one request, with no human clicking anything. That is the
intended reading of "agents can create accounts", and it is also the single
biggest decision in this document: if a thousand of them arrived tonight, that
would be the design working, not failing. A deployment that does not want it
leaves `AON_AUDIENCE` unset, or gates signup behind an allowlist before the
`createAccount` call — the seam is one function.

It also does not rate-limit signup. The submit path's rate limit
(`lib/forms/submit.ts`) counts rows in `responses`; there is no equivalent count
for account creation, because there is no users table to count. If signup needs a
brake, that is where it goes, and it needs a store of its own.

## Builder

**In-place editing, Google Forms style.** The builder page is the form. Labels
and options are editable in place; a floating "+" inserts a field.

The trick that makes this cheap and keeps the builder honest: one component,
two modes.

```tsx
<FieldRenderer field={f} mode="preview" />   // public form, read-only
<FieldRenderer field={f} mode="edit" />      // builder, wired to local state
```

Same layout, same spacing, same code. The builder wraps it in editing chrome.
Preview and production **cannot** drift, because they are the same component —
this eliminates the whole class of "why does it look different when I publish"
bugs. A separate preview pane would mean two views to keep in sync forever.

**Save model: local state + debounced autosave.**

- `fields` lives in React state — instant edits, no round-trip per keystroke.
- Debounce ~800 ms, then one server action writes the whole array.
- A small "Saving… / Saved" indicator.
- **No validation on save.** Only on publish and on submit. You must be able to
  save a choice field with an empty label and finish it tomorrow. Validating
  mid-edit fights the user.

Concurrency is last-write-wins. One owner per form makes that correct in
practice; not worth locking.

**Reorder** is up/down buttons per field. Drag-and-drop is a fiddly afternoon
(dnd-kit, touch, a11y) for a cosmetic gain — it goes in after everything else
works.

## Lifecycle

```
status: 'draft' | 'published'
accept_responses: boolean
```

| state | `/f/[id]` |
|---|---|
| `draft` | 404 |
| `published`, accept | renders, accepts submissions |
| `published`, not accept | renders, submit disabled — "no longer accepting responses" |

Two fields, not three states, on purpose: closing a form must leave it
**viewable**. As a boolean that's automatic. As a third status you'd have to
remember to keep rendering it, and some day you'd forget.

## Editing a form that has responses

Allowed, with one hard rule: **field ids and option ids are never reused.**

- Rename a label → free. Answers are keyed by id and re-render under the new label.
- Delete a field → its answers stay in the JSONB as **orphans**. The CSV surfaces
  them in an extra column rather than dropping data silently.
- Remove a choice option → same; stored answers naming it still show.

Locking published forms is the alternative, and it's the thing that actually
annoys people. Warn, don't block.

## Submit path

```
client: render fields passed from the server; instant checks for UX only
   ↓
server: load form → assert published && accept_responses
        → honeypot → rate limit → size caps
        → parse FormData → validate with fieldsToZod(fields)
        → insert response → redirect to thank-you
```

**The server is the gate.** The client is convenience; the field schema lives in
the DB, so a respondent editing the DOM changes nothing. On validation failure,
re-render the form with the user's **values preserved and the errors** — losing a
filled-in form to one bad field is unforgivable. Server actions +
`useActionState` handle this in ~20 lines.

`meta` records a hashed IP, user agent, and referrer from day one, so abuse
handling (honeypot, rate limit) can be added without a schema change.

## Abuse handling

A public endpoint that writes rows needs a way to say no that is not a captcha.
Three checks sit in front of validation, cheapest and most certain first. All
three are *decisions* in pure modules — `lib/forms/submit.ts` and
`lib/forms/honeypot.ts` — with the action supplying the values, the recent count,
and the clock. That is what makes them testable without a request, a database, or
a second of waiting.

| check | catches | decision | answer |
|---|---|---|---|
| honeypot | a script that fills every input it finds | `honeypotTripped` | the thank-you page |
| rate limit | one address hammering one form | `isRateLimited` | "too many responses… try later" |
| size caps | megabytes in one field | `exceedsSubmissionSize` | "that submission is too large" |

Decisions worth recording:

- **The honeypot is answered with success, not with an error.** A spam script
  that is told what tripped it is a script that gets through next time. It writes
  nothing and redirects to the thank-you page, which is indistinguishable — from
  outside — from a form that accepted the response. It lives in its own module
  because the *form* plants it and the *action* reads it, and the form is a
  client component that must not import `node:crypto` along the way.
- **The rate limit counts the `responses` table.** `meta.ipHash` plus the
  `(form_id, submitted_at)` index answers "how many times has this address
  answered this form in the last hour" in one indexed count. No new table, no
  cache, no migration, and the same answer on one serverless instance or twenty.
  It is deliberately *not* atomic — two simultaneous submissions can both see the
  last slot — so the limit is a throttle rather than a quota, and it is set for
  the honest crowd rather than the attacker: one address is often one building,
  and a meeting answering the same form at once must not be refused. Fifty an
  hour per form is room for that, and still 1,200 rows a day per address. A
  per-instance in-memory counter was the alternative; it is invisible to the next
  instance and forgets on every deploy, which is worse than useless as a throttle.
- **No address, no limit.** Without `x-forwarded-for` there is nothing to count
  *per IP*, and falling back to counting everyone together would let one
  respondent close the form for everybody. The check is skipped instead.
- **The size caps sit above the validation limit.** A text answer tops out at
  5000 characters (`MAX_TEXT_LENGTH`), which is at most 20 KB of UTF-8, so the
  per-answer cap is 32 KB: a long but honest answer is always refused by its own
  field's message and never by the size cap, and the two limits can't disagree.
  What's left for the caps is the shape validation never sees — a single
  megabyte, or a payload that is reasonable per field and absurd in total.
- **The size check runs on the raw values, before parsing.** The point is not to
  store it, not to validate it — not to touch it. A rejected megabyte is also not
  echoed back into the re-rendered form.

## Failure surfaces

Every failure that is ours, rather than the respondent's, has a designed end:

| where | what the person sees | what the log gets |
|---|---|---|
| a shell page (`error.tsx`) | a dashed panel, "Try again", the app chrome intact | `reportError` with `where: "app"` |
| the dashboard | the same, plus a way back to your forms | `where: "dashboard"` |
| the public form | "This form could not be loaded", retry only | `where: "public-form"` |
| the root layout | a bare page — the provider may be the casualty | `where: "global"` |
| a draft or missing form | a 404 written for the respondent | — |
| a save that never lands | the builder's "Couldn't save" | `where: "saveForm"` |
| a failed submit | "Something went wrong saving your response", answers preserved | `where: "submitResponse"` |
| a failed CSV export | plain text in the browser, since the response *is* the page | `where: "exportCsv"` |

Two rules hold across all of them:

- **The copy never carries the cause.** No error code, no driver message, no
  stack. A respondent can only act on "try again"; the cause belongs in the log,
  where someone can act on it. Server Components make this mandatory anyway —
  Next strips their error messages in production.
- **The chrome survives.** A dashboard page that fails keeps the dashboard's
  header and user button, because only the segment below the layout is replaced.
  An error that takes the whole shell with it is what makes a bug feel like a
  broken product.

`reportError` (`lib/observability.ts`) is the single sink: one JSON line on
stderr, plus a best-effort POST to `ERROR_REPORT_URL` when one is set. The log
line is the durable record; the forward is fire-and-forget on purpose, because a
reporter that can fail the request it is reporting on is worse than none. Call
sites pass ids, never answers — a report is not a second copy of someone's data.

### Loading

Every segment that reads the session or the database already streams behind its
own `<Suspense>` with a skeleton shaped like the content it replaces — the
dashboard list, the builder, the responses list, the form nav. There is
deliberately no `loading.tsx` anywhere: a route-level file would wrap a page that
already has a fallback for exactly the same wait, and the two would eventually
disagree about the shape of it.

The two public pages are the deliberate exception, and they block instead. A
draft must 404 for a shared link rather than return 200 with a not-found page
inside it, which means the status code cannot be settled after streaming starts —
and a respondent arriving cold has no shell worth streaming ahead of the form
itself. See `app/f/[id]/page.tsx`.

## Social cards

A link to a form should unfurl as the form, not as a generic website — and the
landing should unfurl as itself. Two file conventions do the work rather than
hand-written tags: `app/opengraph-image.tsx` draws the site-wide card,
`app/f/[id]/opengraph-image.tsx` draws a form's, and the `twitter-image.tsx`
beside each re-uses it so the Open Graph and Twitter tags cannot disagree.

Decisions worth recording:

- **One layout, two sets of words.** `lib/og/card.tsx` is the only definition and
  both routes render it. A form's card and the landing's card are meant to read as
  the same product; a second layout would drift, and there is nothing in it to
  justify that.
- **The fonts are files in the repo, not a fetch.** `assets/fonts` holds Geist and
  Source Serif 4 — the same split the app makes, sans for chrome and serif for the
  voice. next/og ships Geist as its default, but passing any `fonts` array
  *replaces* that default, so both have to be supplied. A card then renders with
  no network. `outputFileTracingIncludes` in `next.config.ts` is what makes the
  standalone Docker image carry them: a runtime `readFile` is invisible to the
  tracer in a way an import is not, and without it every preview is a 500 on a
  self-hosted box while the same code works on Vercel.
- **The canvas never reflows, so the text is fitted before it is drawn.** Satori
  lays the card out once at a fixed size: a headline that runs long does not push
  anything down, it runs over it. `lib/og/text.ts` clamps the title and the
  description, purely, so the fit is pinned by a test instead of discovered on a
  share. The type scale in the card assumes those caps.
- **A draft's card is the brand card.** `/f/[id]` 404s for a draft, so its title
  must not be drawn here either — an unpublished link should not announce its
  title in a chat app. An unreadable form falls back the same way, for the reason
  metadata is decoration: a failed read must not break the unfurl.
- **`NEXT_PUBLIC_SITE_URL` is configuration, never the request.** A crawler has no
  session and no `Host` worth trusting. `lib/site.ts` resolves the address from the
  environment, falls back to Vercel's own hostname, and stays silent when there is
  nothing to read — a guessed `localhost` in production is worse than no base.
  `/robots.txt` and `/sitemap.xml` are built from the same value, so the three
  cannot disagree.
- **Every metadata route is in the proxy's public list.** Their paths are not
  covered by the matcher's static-file exclusion — an `opengraph-image` URL has no
  extension, and `.txt`/`.xml` are not in that list — so without an entry Clerk
  would answer them and a crawler would be handed the sign-in page instead of an
  image.

## Marketing pages

The landing, About, and Self-hosting share one shell — `app/(marketing)` — so
there is one header, one footer, and one page transition across all three. They
are in the proxy's public list for the same reason `/f/*` is, and they follow the
public form's rule: **every word reads with JavaScript off.** Only the theme
toggle and the auth buttons are client components, and neither is needed to read
the page. Sections are separated by hairlines and space rather than by cards,
which is [`design-system.md`](design-system.md) applied to a long page.

## Analytics

Vercel Web Analytics, and only on Vercel. `app/layout.tsx` renders `<Analytics />`
when `process.env.VERCEL` is set, because the script it injects is fetched from
`/_vercel/insights/script.js` — an endpoint Vercel's own edge serves. On a
self-hosted image the tag would be a 404 in every visitor's network log and
nothing more, and a self-hosted copy is a first-class copy here. Unset means no
script, no request, no third party.

It is wrapped in `<Suspense>` because the component reads `useSearchParams` to
attribute a route, and under Cache Components that read needs a boundary. It is
cookieless by design: page views and routes, not people.

## Responses

`/dashboard/forms/[id]` is the form's second tab, beside the builder. The list
reads newest first — straight off the `(form_id, submitted_at desc)` index —
because you scan the top of a list, you don't read it in order. Rows collapse to
a timestamp; expanding one reveals every answer formatted for reading.

**Formatting lives in `lib/forms/answers.ts`, and both the list and the CSV call
it.** A choice answer stores an option id; the formatter turns it into today's
label, joins multi-choice values, and falls back to the raw id when an option has
since been removed. One formatter means the screen and the spreadsheet can't
disagree — the bug where the export says `a1b2` and the page says "Yes".

An answer whose field no longer exists is shown under its raw field id. Surfaced,
never dropped: the data is real, it just has no question above it any more.

Closing is the switch in the toolbar, writing `accept_responses`. Closing leaves
the form **viewable** — a respondent following an old link sees the questions and
a "no longer accepting responses" notice, not a 404.

### CSV export

`GET /api/forms/[id]/export`, a route handler rather than a Server Action: a
download wants a plain authenticated GET that can set `Content-Disposition` and
stream bytes without React in the way. It re-checks ownership — the proxy guards
the path, but a route handler is still the place the data leaves the system.

Columns:

1. `Submitted at` — ISO 8601, UTC.
2. One column per field, in form order, headed by the field's label.
3. One column per orphaned answer, headed by the raw field id.

Rows go **oldest first** — the spreadsheet is for reading history, the on-screen
list is for seeing what just came in. Values are formatted by the same module the
list uses, so exports follow a renamed label the same way the page does.

A field deleted and re-created is a new id, so it gets its own column: that's the
price of never reusing ids, and it's the right price — the alternative is two
different questions' answers sharing a heading.

Writing follows RFC 4180: a value containing a comma, quote, CR, or LF is quoted
and its inner quotes doubled; rows end CRLF. The route prepends a UTF-8 BOM so a
spreadsheet opens it as UTF-8 instead of mangling non-ASCII labels.

Filename: the title, slugged — `"Team offsite"` → `team-offsite.csv`.

## Build order

See [`roadmap.md`](roadmap.md).

## Designed for, not built

| Future feature | What it needs |
|---|---|
| Branching logic | conditions on each field referencing other field ids; runtime evaluator. No migration. |
| Multi-page | `pages` array or a `page` key on fields; paging state in the fill runtime. No migration. |
| File uploads | blob storage (Vercel Blob / S3); answer value becomes `{ url, name }`. |
| Custom slugs | add a nullable `slug` column, look up by slug then fall back to id. |
