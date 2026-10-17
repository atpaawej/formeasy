import { Suspense } from "react";
import Link from "next/link";
import { Show } from "@clerk/nextjs";

import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const OPTIONS = ["Cleaner exports", "Branching logic", "File uploads"];

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-sm font-medium tracking-tight">
          formeasy
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {/* Auth state is runtime data, so it streams in. Most visitors are
              signed out, so that is what the static shell ships. */}
          <Suspense fallback={<SignedOutActions />}>
            <AuthActions />
          </Suspense>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6">
        <section className="grid items-center gap-12 py-16 md:grid-cols-2 md:gap-16 md:py-24">
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
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6 text-xs text-muted-foreground">
        <span>formeasy</span>
        <span>Open source. Contributions welcome.</span>
      </footer>
    </div>
  );
}

function AuthActions() {
  return (
    <>
      <Show when="signed-out">
        <Link
          href="/sign-in"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          Sign in
        </Link>
        <Link href="/sign-up" className={cn(buttonVariants({ size: "sm" }))}>
          Start building
        </Link>
      </Show>
      <Show when="signed-in">
        <Link href="/dashboard" className={cn(buttonVariants({ size: "sm" }))}>
          Your forms
        </Link>
      </Show>
    </>
  );
}

function SignedOutActions() {
  return (
    <>
      <Link
        href="/sign-in"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
      >
        Sign in
      </Link>
      <Link href="/sign-up" className={cn(buttonVariants({ size: "sm" }))}>
        Start building
      </Link>
    </>
  );
}

// The most characteristic thing in this product's world is a question, set well.
// So the hero is not a screenshot — it is a question.
function FormPreview() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <p className="font-serif text-xl leading-snug">
        What should we build next?
      </p>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Your answer shapes the roadmap.
      </p>

      <div className="mt-6 space-y-2">
        {OPTIONS.map((option, index) => (
          <div
            key={option}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm",
              index === 0 ? "border-primary/40 bg-primary/5" : "border-border",
            )}
          >
            <span
              className={cn(
                "grid size-4 shrink-0 place-items-center rounded-full border",
                index === 0 ? "border-primary" : "border-muted-foreground/40",
              )}
            >
              {index === 0 && <span className="size-2 rounded-full bg-primary" />}
            </span>
            <span>{option}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
        Send
      </div>
    </div>
  );
}
