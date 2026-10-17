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

## Build order

See [`roadmap.md`](roadmap.md).

## Designed for, not built

| Future feature | What it needs |
|---|---|
| Branching logic | conditions on each field referencing other field ids; runtime evaluator. No migration. |
| Multi-page | `pages` array or a `page` key on fields; paging state in the fill runtime. No migration. |
| File uploads | blob storage (Vercel Blob / S3); answer value becomes `{ url, name }`. |
| Custom slugs | add a nullable `slug` column, look up by slug then fall back to id. |
