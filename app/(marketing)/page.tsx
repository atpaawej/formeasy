import Link from "next/link";
import { PlusIcon } from "lucide-react";

import { FormPreview } from "@/components/marketing/form-preview";
import { buttonVariants } from "@/components/ui/button-variants";
import { GITHUB_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

/*
 * The landing page, as a document rather than a stack of cards.
 *
 * The rule it follows is the one in docs/design-system.md: space before borders,
 * borders before shadows, one accent. Sections are separated by a hairline and a
 * lot of room; the only colour is cobalt, and it is spent on the buttons and the
 * single question in the hero. Nothing here is a client component — the whole
 * page reads with JavaScript off.
 *
 * The one deliberate structural liberty is the numbered "how it works" list.
 * The content really is a sequence — write, publish, read — so the numbers are
 * information, not decoration.
 */

const CONTAINER = "mx-auto w-full max-w-5xl px-6";
const SECTION = "border-t border-border";
const SECTION_PAD = "py-16 sm:py-24";

const STEPS = [
  {
    title: "Write the questions.",
    body: "Seven field types — short text, long text, multiple choice, checkboxes, dropdown, number, date. Add, reorder, delete. It autosaves as you go, so there is no Save button to forget.",
  },
  {
    title: "Share one link.",
    body: "The people you ask need no account, no app, and nothing to install. The form opens in a browser and answers with JavaScript turned off.",
  },
  {
    title: "Read every answer.",
    body: "Responses arrive newest first, formatted the way the question was asked. Export the whole set as a spreadsheet whenever you want it.",
  },
];

const FEATURES = [
  {
    title: "Seven field types",
    body: "A question is a question, not a widget to configure. Pick a type, write the label, done.",
  },
  {
    title: "Autosave",
    body: "The builder writes as you type. Close the tab and the form is exactly where you left it.",
  },
  {
    title: "Validated on the server",
    body: "Every response is re-checked against the form's own schema. Editing the page in a browser changes nothing.",
  },
  {
    title: "One-click CSV",
    body: "Quoted the way spreadsheets expect, a column per question, and renamed labels following along.",
  },
  {
    title: "Closed, not taken down",
    body: "Stop accepting responses and the link keeps working. The questions stay readable; the form just stops taking answers.",
  },
  {
    title: "Quiet spam handling",
    body: "A hidden honeypot, a per-address rate limit, and size caps. No captcha, so nobody has to prove they are human.",
  },
  {
    title: "Agents can use it",
    body: "With an AgentOnboard token, an assistant can create a form and read its responses on your behalf.",
  },
  {
    title: "Your data, your Postgres",
    body: "Forms and answers live in a database you control. There is no vendor in the middle to lose them.",
  },
];

const QUESTIONS = [
  {
    q: "Do the people I ask need an account?",
    a: "No. A published form is a public link. Anyone who has it can answer without signing in, installing anything, or turning on JavaScript.",
  },
  {
    q: "Is it free?",
    a: "Yes. It is MIT licensed and you host it yourself, so there is no plan to outgrow and nobody to ask permission from.",
  },
  {
    q: "Where do the responses live?",
    a: "In your Postgres, in a single responses table. Export them as a CSV whenever you like. The data is yours to move, back up, or delete.",
  },
  {
    q: "Can I stop taking responses?",
    a: "Close the form. Its link keeps working so people can still read the questions, but submissions stop — and reopening is the same switch.",
  },
  {
    q: "What if a question changes after people answered?",
    a: "Renaming is free: answers are stored against the question's id, so they follow the new label. Delete a question and its answers stay in the export rather than disappearing.",
  },
  {
    q: "Do you support branching, uploads, or scoring?",
    a: "Not yet. Branching logic, file uploads, quizzes, and teams are on the roadmap, and the design notes say how each one lands without breaking stored answers.",
  },
];

export default function Home() {
  return (
    <>
      <section className={cn(CONTAINER)}>
        <div className="grid items-center gap-12 py-16 md:grid-cols-2 md:gap-16 md:py-24">
          <div className="flex flex-col items-start gap-6">
            <h1 className="font-serif text-4xl leading-[1.08] tracking-tight text-balance sm:text-5xl">
              Make a form. Share a link. Read every answer.
            </h1>
            <p className="max-w-md text-base leading-relaxed text-muted-foreground">
              An open-source alternative to Google Forms. Sign in to build a
              form, publish a link, and anyone can respond. The people you ask
              never need an account.
            </p>
            <div className="flex items-center gap-3">
              <Link
                href="/sign-up"
                className={cn(buttonVariants({ size: "lg" }), "px-4")}
              >
                Start building
              </Link>
              <Link
                href="/sign-in"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "lg" }),
                  "px-4",
                )}
              >
                Sign in
              </Link>
            </div>
          </div>

          <FormPreview />
        </div>
      </section>

      <section className={cn(SECTION)}>
        <div className={cn(CONTAINER, SECTION_PAD)}>
          <div className="max-w-2xl">
            <h2 className="font-serif text-2xl leading-snug text-balance sm:text-3xl">
              Forms got heavy. They used to be a page and a pencil.
            </h2>
            <div className="mt-6 flex flex-col gap-4 text-base leading-relaxed text-muted-foreground">
              <p>
                Most form builders are page builders. You drag a grid, theme a
                wizard, wire up a workflow — and the questions end up buried
                under the tool that was meant to hold them.
              </p>
              <p>
                formeasy goes the other way. You write the questions, share a
                single link, and read what came back. The interface stays out of
                the way of the only two things that matter: the question and the
                answer.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className={cn(SECTION)}>
        <div className={cn(CONTAINER, SECTION_PAD)}>
          <h2 className="font-serif text-2xl leading-snug text-balance sm:text-3xl">
            Three steps, and the middle one is a URL.
          </h2>

          <ol className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="flex flex-col gap-3 border-t border-border pt-6 sm:pt-5"
              >
                <span className="font-serif text-sm text-muted-foreground tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="font-serif text-xl leading-snug">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="features" className={cn(SECTION)}>
        <div className={cn(CONTAINER, SECTION_PAD)}>
          <h2 className="font-serif text-2xl leading-snug text-balance sm:text-3xl">
            Everything a form needs, and nothing it does not.
          </h2>

          <dl className="mt-12 grid gap-x-12 gap-y-8 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="border-t border-border pt-5"
              >
                <dt className="text-sm font-medium">{feature.title}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.body}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className={cn(CONTAINER, SECTION_PAD)}>
          <div className="grid gap-12 md:grid-cols-2 md:gap-16">
            <div className="flex flex-col items-start gap-6">
              <h2 className="font-serif text-2xl leading-snug text-balance sm:text-3xl">
                Open source, and yours to run.
              </h2>
              <p className="max-w-md text-base leading-relaxed text-muted-foreground">
                Every line is public. Deploy it to Vercel in a few minutes, or
                run the container against a Postgres you already have. Nothing
                about the product is behind a plan.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={GITHUB_URL}
                  className={cn(buttonVariants({ size: "lg" }), "px-4")}
                >
                  View on GitHub
                </a>
                <Link
                  href="/self-hosting"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "px-4",
                  )}
                >
                  Self-hosting
                </Link>
              </div>
            </div>

            <dl className="flex flex-col">
              {[
                {
                  title: "MIT licensed",
                  body: "The permissive one. Fork it, rename it, ship it inside something else.",
                },
                {
                  title: "Vercel or a container",
                  body: "Two external services — Postgres and Clerk. The rest is a standard Next.js server.",
                },
                {
                  title: "No lock-in",
                  body: "The whole data model is two tables. Export it, move it, or leave with it.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex flex-col gap-1.5 border-t border-border py-5 first:border-t-0 first:pt-0"
                >
                  <dt className="text-sm font-medium">{item.title}</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground">
                    {item.body}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section id="questions" className={cn(SECTION)}>
        <div className={cn(CONTAINER, SECTION_PAD)}>
          <h2 className="font-serif text-2xl leading-snug text-balance sm:text-3xl">
            Questions people ask first.
          </h2>

          <div className="mt-10 max-w-3xl">
            {QUESTIONS.map((item) => (
              <details key={item.q} className="group border-b border-border">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-sm font-medium [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <PlusIcon className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45" />
                </summary>
                <p className="max-w-2xl pb-5 text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className={cn(SECTION)}>
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-5 px-6 py-20 text-center sm:py-28">
          <h2 className="font-serif text-3xl leading-tight tracking-tight text-balance sm:text-4xl">
            Make a form.
          </h2>
          <p className="max-w-md text-base leading-relaxed text-muted-foreground">
            It takes a minute, and nobody you ask needs an account.
          </p>
          <Link
            href="/sign-up"
            className={cn(buttonVariants({ size: "lg" }), "px-4")}
          >
            Start building
          </Link>
        </div>
      </section>
    </>
  );
}
