import { Suspense } from "react";
import Link from "next/link";
import { Show } from "@clerk/nextjs";

import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button-variants";
import { GITHUB_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

/*
 * The marketing shell's header. One header for the landing, About, and
 * Self-hosting, so the three pages cannot drift apart.
 *
 * The section links point at the landing with a fragment — they read as a nav on
 * every page An in-page anchor stays a real anchor, so it is a `<Link>` and
 * never a `Button`, which would turn a link into a role="button" (see
 * docs/design-system.md).
 */

const NAV = [
  { href: "/#how", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/self-hosting", label: "Self-hosting" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-7">
          <Link href="/" className="text-sm font-medium tracking-tight">
            formeasy
          </Link>
          <nav
            aria-label="Site"
            className="hidden items-center gap-6 md:flex"
          >
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            <a
              href={GITHUB_URL}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              GitHub
            </a>
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          {/* Auth state is runtime data, so it streams in behind the static
              shell, which ships the signed-out buttons. */}
          <Suspense fallback={<SignedOutActions />}>
            <AuthActions />
          </Suspense>
        </div>
      </div>
    </header>
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
