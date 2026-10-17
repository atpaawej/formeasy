import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import { GITHUB_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata = { title: "About" };

/*
 * The story page. It exists for the stranger who found the repository and wants
 * to know what it believes before they deploy it, so it is the one place on the
 * marketing surface that talks about the design itself rather than the product
 * features. Same shell, same rhythm, same hairlines.
 */

const PRINCIPLES = [
  {
    title: "Minimalism, then fluidity.",
    body: "One accent colour, hairlines instead of shadows, and space as the default answer to almost every layout question. Motion is short, on one curve, and only ever explains what changed.",
  },
  {
    title: "A question is content.",
    body: "The serif is the voice — page titles, question labels, the form itself. The sans is the chrome around it. That split is why a formeasy form reads like a document rather than a settings screen.",
  },
  {
    title: "The public form is HTML first.",
    body: "A form renders, reads, and submits with JavaScript switched off, because a respondent should never need a script to answer a question. Animation there is CSS, and never a prerequisite.",
  },
  {
    title: "The server is the gate.",
    body: "A form's schema lives in the database and every answer is re-validated against it. The client is a convenience; editing the page in a browser changes nothing.",
  },
];

const NOT_YET = [
  "Branching and conditional logic",
  "Multi-page forms",
  "File uploads",
  "Quizzes and scoring",
  "Payments",
  "Teams, roles, and sharing",
  "Themes and custom styling",
];

export default function AboutPage() {
  return (
    <>
      <section className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
        <div className="max-w-2xl">
          <h1 className="font-serif text-3xl leading-tight tracking-tight text-balance sm:text-4xl">
            A form builder that gets out of the way.
          </h1>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground">
            formeasy is an open-source alternative to Google Forms, built around
            one belief: the interesting part of a form is the question, and
            everything else should be quiet enough to forget.
          </p>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
          <div className="max-w-2xl">
            <h2 className="font-serif text-2xl leading-snug text-balance sm:text-3xl">
              Why it exists.
            </h2>
            <div className="mt-6 flex flex-col gap-4 text-base leading-relaxed text-muted-foreground">
              <p>
                Asking people questions should be the easiest thing on the
                internet. Somewhere along the way it turned into a page-building
                exercise: pick a template, drag a grid, theme a wizard, and hope
                the questions survive the trip.
              </p>
              <p>
                formeasy was written to be the small version. Build a form, get a
                link, collect answers, export a spreadsheet — and then read the
                source when you want to know exactly what it does with your data.
                Two tables, a handful of routes, and no vendor between you and
                the answers.
              </p>
              <p>
                It is deliberately unambitious in scope and deliberately careful
                about the parts that matter: the public path stays public, the
                validation happens on the server, and failures reach the person
                as a sentence rather than a stack trace.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
          <h2 className="font-serif text-2xl leading-snug text-balance sm:text-3xl">
            The rules we hold to.
          </h2>

          <dl className="mt-12 grid gap-x-12 gap-y-8 sm:grid-cols-2">
            {PRINCIPLES.map((principle) => (
              <div key={principle.title} className="border-t border-border pt-5">
                <dt className="text-sm font-medium">{principle.title}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {principle.body}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
          <div className="grid gap-12 md:grid-cols-2 md:gap-16">
            <div>
              <h2 className="font-serif text-2xl leading-snug text-balance sm:text-3xl">
                What is not here yet.
              </h2>
              <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
                The first version does the core loop well and stops there. Each of
                these is its own project, and each is additive — none of them
                changes the shape of an answer already stored.
              </p>
            </div>

            <ul className="flex flex-col">
              {NOT_YET.map((item) => (
                <li
                  key={item}
                  className="border-t border-border py-4 text-sm first:border-t-0 first:pt-0"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-start gap-5 px-6 py-16 sm:py-24">
          <h2 className="font-serif text-2xl leading-snug text-balance sm:text-3xl">
            Contributing.
          </h2>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
            Issues and pull requests are welcome. The design notes and the
            roadmap live in the repository, and the contributing guide says how
            the tests run — the hermetic suite first, the browser suite when the
            secrets are there.
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
      </section>
    </>
  );
}
