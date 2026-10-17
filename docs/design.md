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
| Hosting | Vercel |
| UI | Tailwind + shadcn/ui |

## Repo layout

```
app/
  page.tsx                          # landing + sign-in
  dashboard/
    page.tsx                        # my forms
    forms/[id]/
      edit/page.tsx                 # the builder
      page.tsx                      # responses list + export
  f/[id]/
    page.tsx                        # public form (no auth)
    submitted/page.tsx              # thank-you
  api/forms/[id]/
    export/route.ts                 # GET CSV — auth
components/
  builder/                          # field editor, add/remove/reorder
  fields/                           # FieldRenderer — one renderer, two modes
lib/
  db/schema.ts                      # Drizzle tables
  db/index.ts                       # pooled Neon client
  fields.ts                         # the Field union + zod + defaults
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
| GET | `/dashboard` | yes | List my forms |
| POST | `/dashboard` | yes | Create form → redirect to builder |
| GET | `/dashboard/forms/[id]/edit` | yes | Builder |
| GET | `/dashboard/forms/[id]` | yes | Responses + CSV button |
| GET | `/f/[id]` | **no** | Public form |
| POST | `/f/[id]` | **no** | Server Action: validate + store, then redirect |
| GET | `/f/[id]/submitted` | **no** | Thank-you |
| GET | `/api/forms/[id]/export` | yes | CSV download |

Submission is a **Server Action**, which is a POST to its host route `/f/[id]` —
not a separate API route. That keeps the failure path free: the action returns
the errors, React re-renders the same route, and the uncontrolled inputs still
hold the respondent's answers. A route handler would have to hand-roll that.

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
