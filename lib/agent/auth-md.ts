/*
 * The `auth.md` discovery file, rendered from the configured audience.
 *
 * A partner publishes this at its root so an agent learns the audience to mint a
 * token for and what each rejection means. AgentOnboard's guide suggests a static
 * file in `public/`, but formeasy is self-hostable: a baked-in hostname would be
 * wrong for every deployment but one, and an `## Audience` line that disagrees
 * with the `audience` in the code is exactly the drift the rejection table is
 * meant to prevent. Rendering it from `AON_AUDIENCE` makes the two agree by
 * construction, and makes the file 404 — rather than mislead — when agent access
 * is switched off.
 *
 * Pure, so the exact bytes are pinned by a test.
 */

export function authMarkdown(audience: string): string {
  return `# formeasy

An open-source alternative to Google Forms, and it accepts AgentOnboard. A token
that verifies here is authorized against the Clerk account its verified email maps
to. The agent works on exactly that account's forms — reading them, editing them,
publishing them, and reading what came in. Nothing is shared between accounts.

## Audience

\`${audience}\`

    aon token get ${audience}

Send the token on every request as \`Authorization: Bearer <token>\`. It lives five
minutes; mint a new one rather than reusing a stale one.

## Endpoints

Every endpoint below requires the \`Authorization\` header and acts only on the
calling account's own forms. Nothing here needs a browser.

A **form object** is:

\`\`\`json
{
  "id": "string",
  "title": "string",
  "description": "string | null",
  "status": "draft | published",
  "acceptResponses": true,
  "fields": [],
  "settings": {},
  "publicPath": "/f/<id>",
  "createdAt": "ISO 8601",
  "updatedAt": "ISO 8601"
}
\`\`\`

A **field** is \`{ "id": string, "type": string, "label": string, "required": boolean }\`
plus type-specific keys: \`short_text\` and \`long_text\` take \`placeholder\`; \`number\`
takes \`min\` and \`max\`; \`single_choice\`, \`multi_choice\`, and \`dropdown\` take
\`options: [{ "id", "label" }]\`. **Field ids and option ids are permanent.** Mint any
id you like, but never reuse one — stored answers are keyed by id.

### \`GET /api/agent/forms\`

List the calling account's forms, newest first.

- Success: \`200\` with \`{ "forms": [ { "id", "title", "status", "acceptResponses", "responseCount", "updatedAt", "publicPath" } ] }\`

### \`POST /api/agent/forms\`

Create a form. With no body it is empty and untitled.

- Request: \`{ "title"?: string, "description"?: string, "fields"?: Field[] }\`
- Success: \`201\` with the form object

### \`GET /api/agent/forms/{id}\`

The form, including its \`fields\`.

- Success: \`200\` with the form object

### \`PATCH /api/agent/forms/{id}\`

Change a form. Only the keys you send are changed.

- Request: any of \`{ "title", "description", "fields", "acceptResponses" }\`
- Success: \`200\` with the form object

\`status\` is not settable here: publishing validates, so it has its own endpoints.
To stop taking responses while keeping the form readable, send
\`{ "acceptResponses": false }\`.

### \`DELETE /api/agent/forms/{id}\`

Delete the form and every response it collected. This cannot be undone.

- Success: \`204\` with no body

### \`POST /api/agent/forms/{id}/publish\`

Publish the form. It is validated first, against the same rules the app's own
publish button uses.

- Success: \`200\` with the form object
- \`400\` \`INVALID_FORM\` carries \`problems\`: an array of sentences. Fix them and retry.

### \`POST /api/agent/forms/{id}/unpublish\`

Back to draft. A draft 404s for respondents, unlike a closed form.

- Success: \`200\` with the form object

### \`GET /api/agent/forms/{id}/responses\`

What came in, newest first. Optional query \`limit\` (an integer from 1 to 500).

- Success: \`200\` with \`{ "formId", "count", "responses": [ { "id", "submittedAt", "answers", "display" } ] }\`

\`answers\` is keyed by field id and holds the stored values — a choice answer is an
option id. \`display\` is the same data as a person reads it: labels in question
order, with a deleted question shown under its raw field id rather than dropped.

### \`GET /api/agent/forms/{id}/export\`

The responses as CSV (\`text/csv\`), the same file the dashboard's download button
produces.

### \`POST /api/signup\`

Create the calling account. An agent that got \`403 ACCOUNT_REQUIRED\` elsewhere calls
this with the same token, then retries its original request. Calling it for an email
that already has an account signs in instead — no duplicate.

- Request: no body
- Success: \`201\` with \`{ "user": string, "created": boolean }\`

## When a request is rejected

| Status | \`code\` | What to do |
|---|---|---|
| 401 | any | The token was rejected. Run \`aon token get ${audience}\` again and retry **once**. If it fails again, stop and tell the human — do not retry in a loop. |
| 403 | \`ACCOUNT_REQUIRED\` | The identity is genuine but has no formeasy account. Create one at \`POST /api/signup\` with the same token, then retry the original request **once**. **Retrying the original without that will never work.** |
| 404 | \`NOT_FOUND\` | No form with that id belongs to this account. |
| 400 | \`INVALID_FIELDS\`, \`INVALID_BODY\`, \`INVALID_LIMIT\` | The request was malformed. Fix it and retry. |
| 400 | \`INVALID_FORM\` | The form is not ready to publish. The body carries \`problems\`. |
| 500 | \`RESOLVER_ERROR\`, \`CONFIG_ERROR\`, \`INTERNAL\` | Our account lookup or our configuration failed. Retry after a short delay. Do not re-authenticate; the token is fine. |
`;
}
