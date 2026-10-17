import Link from "next/link";

import { CodeBlock } from "@/components/marketing/code-block";
import { buttonVariants } from "@/components/ui/button-variants";
import { GITHUB_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Agents",
  description:
    "An agent can sign up, sign in, and get work done over plain HTTP — no browser, no SDK, no dashboard, and no reduced API.",
};

/*
 * The agent page, and the one page that argues a position rather than listing a
 * feature.
 *
 * The claim is that the smallness is the point. formeasy is two tables and a
 * handful of routes, and that is precisely what lets a program that has never
 * seen it drive the whole product over plain HTTP — no SDK, no dashboard, no UI
 * state to infer. Minimalism is the reason the agent story is short, so the page
 * is short too: the flow, the reason it is short, and what it deliberately will
 * not do.
 *
 * Everything below is copied from `lib/agent/auth-md.ts`, which is what an agent
 * actually reads. If the two disagree, the page is wrong.
 */

const WHY = [
  {
    title: "One switch turns it on.",
    body: "AON_AUDIENCE set to the deployment's hostname, and agent access exists. Unset, it is off: /auth.md answers 404 rather than advertising a capability the deployment does not have, and every agent route fails closed.",
  },
  {
    title: "Discovery is a file, not a wiki.",
    body: "/auth.md is rendered from the same value the token check uses, so the audience an agent is told to mint for cannot disagree with the audience we verify. One request, and the agent knows every endpoint and what each rejection means.",
  },
  {
    title: "The same account, not a shadow one.",
    body: "An agent works on its human's own forms — reading, editing, publishing, exporting. A write lands under the user id the token resolved to, never a value from the body and never a path parameter.",
  },
  {
    title: "Errors are sentences with codes.",
    body: "One body shape throughout: { code, error }. 401 means re-mint the token once. 403 ACCOUNT_REQUIRED means sign up, then retry once. 500 means our side failed; the token is fine. Nothing to guess at.",
  },
];

const FLOW = [
  {
    title: "Sign in.",
    body: "Mint a short-lived token for the audience the deployment publishes, and send it on every request. No password, no session cookie, no browser. The token lives five minutes; the agent mints another rather than hoarding one.",
    code: `# the audience comes from the deployment's own /auth.md
aon token get forms.example.com

# then, on every request:
#   Authorization: Bearer <token>`,
  },
  {
    title: "Get told to sign up.",
    body: "An identity with no formeasy account is not an error to retry around — it is an instruction. The first call answers 403 ACCOUNT_REQUIRED, the agent posts the same token to /api/signup, and retries its original request once. The same address twice signs in instead of duplicating.",
    code: `curl -sX POST https://forms.example.com/api/signup \\
  -H "Authorization: Bearer $TOKEN"

# 201 {"user":"user_2x…","created":true}`,
  },
  {
    title: "Do the work.",
    body: "Create, edit, publish, read the answers, download the CSV. Every one of them is a JSON request against the same account the person sees in the dashboard, and every one of them returns the same objects the app renders.",
    code: `curl -sX POST https://forms.example.com/api/agent/forms \\
  -H "Authorization: Bearer $TOKEN" \\
  -d '{"title":"Team offsite"}'

# 201 {"id":"8fQ2mVn3k1","status":"draft","publicPath":"/f/8fQ2mVn3k1"}

curl -sX POST https://forms.example.com/api/agent/forms/8fQ2mVn3k1/publish \\
  -H "Authorization: Bearer $TOKEN"

# 200 published — or 400 INVALID_FORM, carrying the problems to fix`,
  },
];

const LIMITS = [
  {
    title: "Anyone who can receive mail can make an account.",
    body: "That is what \"agents can sign up\" means, and on a public deployment it is a deliberate choice rather than an oversight. Leave AON_AUDIENCE unset and the whole surface is gone.",
  },
  {
    title: "The audience is configuration, never the request's Host.",
    body: "A token minted for another service is refused, not obeyed. Deriving the audience from the request would turn a check into an instruction — the same reasoning that keeps a link preview's host out of the metadata.",
  },
  {
    title: "It cannot reach an account it was not verified for.",
    body: "There is no query parameter for \"whose forms\". The owner is the account the verified email resolved to, so one agent cannot read or write another person's answers.",
  },
  {
    title: "Publishing still validates.",
    body: "An agent gets no back door: publish runs the same rules the app's own publish button runs, and a form that is not ready comes back with a list of sentences to fix.",
  },
];

export default function AgentsPage() {
  return (
    <>
      <section className="mx-auto w-full max-w-5xl px-6">
        <div className="grid items-center gap-12 py-16 md:grid-cols-2 md:gap-16 md:py-24">
          <div className="flex flex-col items-start gap-6">
            <h1 className="font-serif text-3xl leading-tight tracking-tight text-balance sm:text-4xl">
              An agent can do the whole thing.
            </h1>
            <p className="max-w-md text-base leading-relaxed text-muted-foreground">
              No SDK, no dashboard, and no screenshots of a UI to guess at.
              formeasy speaks AgentOnboard, so an assistant signs in with a
              short-lived token, works on its human&rsquo;s own forms, and never
              opens a browser — from signing up to reading the answers.
            </p>
            <div className="flex items-center gap-3">
              <Link
                href="/sign-up"
                className={cn(buttonVariants({ size: "lg" }), "px-4")}
              >
                Start building
              </Link>
              <a
                href="#flow"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "lg" }),
                  "px-4",
                )}
              >
                See the whole flow
              </a>
            </div>
          </div>

          <Trace />
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
          <div className="max-w-2xl">
            <h2 className="font-serif text-2xl leading-snug text-balance sm:text-3xl">
              There is almost nothing to learn.
            </h2>
            <div className="mt-6 flex flex-col gap-4 text-base leading-relaxed text-muted-foreground">
              <p>
                A form here is two tables and a handful of routes. That is a
                taste in interfaces, but it is also the property that makes the
                product usable by a program that has never seen it: nothing to
                install, no graph to walk, no widget to click, no UI state to
                infer from a page it cannot render.
              </p>
              <p>
                Every surface an agent needs is an HTTP request with a JSON body
                and a stable error code when it goes wrong. Minimalism is not
                only how this looks. It is why the integration is an afternoon,
                not a project.
              </p>
            </div>
          </div>

          <dl className="mt-12 grid gap-x-12 gap-y-8 sm:grid-cols-2">
            {WHY.map((item) => (
              <div key={item.title} className="border-t border-border pt-5">
                <dt className="text-sm font-medium">{item.title}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section id="flow" className="border-t border-border">
        <div className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
          <h2 className="font-serif text-2xl leading-snug text-balance sm:text-3xl">
            Sign in, sign up, get it done.
          </h2>

          <ol className="mt-12 flex flex-col gap-12">
            {FLOW.map((step, index) => (
              <li
                key={step.title}
                className="grid gap-6 border-t border-border pt-6 md:grid-cols-2 md:gap-16"
              >
                <div>
                  <span className="font-serif text-sm text-muted-foreground tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 font-serif text-xl leading-snug">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </div>
                <CodeBlock code={step.code} />
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
          <div className="max-w-2xl">
            <h2 className="font-serif text-2xl leading-snug text-balance sm:text-3xl">
              What it deliberately will not do.
            </h2>
            <p className="mt-6 text-base leading-relaxed text-muted-foreground">
              Handing a program the keys to an account is a decision worth
              stating out loud, so here are the boundaries. The whole endpoint
              list, with the rejection table, is in the deployment&rsquo;s own{" "}
              <code className="font-mono text-sm text-foreground">/auth.md</code>
              .
            </p>
          </div>

          <dl className="mt-12 grid gap-x-12 gap-y-8 sm:grid-cols-2">
            {LIMITS.map((item) => (
              <div key={item.title} className="border-t border-border pt-5">
                <dt className="text-sm font-medium">{item.title}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-5 px-6 py-20 text-center sm:py-28">
          <h2 className="font-serif text-3xl leading-tight tracking-tight text-balance sm:text-4xl">
            Point an agent at it.
          </h2>
          <p className="max-w-md text-base leading-relaxed text-muted-foreground">
            Turn on the audience, hand over a token, and the rest is HTTP.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/sign-up"
              className={cn(buttonVariants({ size: "lg" }), "px-4")}
            >
              Start building
            </Link>
            <a
              href={GITHUB_URL}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "px-4",
              )}
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

/*
 * The hero visual is a transcript rather than a screenshot, because the thing
 * being advertised has no screen. Left is what the agent sends, right is what
 * comes back, and the hairline between the rows is the same device the rest of
 * the page uses. The one cobalt dot marks the line where the work landed.
 */
const TRACE: { request: string; response: string; done?: boolean }[] = [
  {
    request: "POST /api/agent/forms",
    response: "403 ACCOUNT_REQUIRED",
  },
  { request: "POST /api/signup", response: "201 created" },
  { request: "POST /api/agent/forms", response: "201 Team offsite" },
  {
    request: "POST /api/agent/forms/{id}/publish",
    response: "200 /f/8fQ2mVn3k1",
  },
  {
    request: "GET /api/agent/forms/{id}/responses",
    response: "200 3 answers",
    done: true,
  },
];

function Trace() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <p className="font-mono text-xs text-muted-foreground">
        $ aon token get forms.example.com
      </p>

      <div className="mt-5 flex flex-col font-mono text-xs">
        {TRACE.map((line, index) => (
          <div
            key={line.request}
            className={cn(
              "flex flex-col gap-1 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6",
              index > 0 && "border-t border-border",
            )}
          >
            <span className="text-foreground">{line.request}</span>
            <span
              className={cn(
                "flex items-center gap-2",
                line.done ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {line.done ? (
                <span className="size-1.5 shrink-0 rounded-full bg-primary" />
              ) : null}
              {line.response}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
