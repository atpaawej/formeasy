import { Suspense } from "react";
import Link from "next/link";
import { Show } from "@clerk/nextjs";

import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button-variants";
import { GITHUB_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

/*
 * The marketing shell's header. One header for the landing, About, Agents, and
 * Self-hosting, so the pages cannot drift apart.
 *
 * GitHub is an icon on the right, beside the theme toggle, rather than a fifth
 * word in the nav. It is still an `<a>` wearing `buttonVariants`, never
 * `<Button render={<a />}>`: the element navigates, so it stays a link (see
 * docs/design-system.md). Being icon-only, it carries its accessible name in
 * `aria-label`.
 */

const NAV = [
  { href: "/agents", label: "Agents" },
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
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <a
            href={GITHUB_URL}
            aria-label="GitHub"
            className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
          >
            <GitHubMark />
          </a>
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

/*
 * The GitHub mark, inlined. lucide dropped its brand icons — there is no
 * `GithubIcon` to import — and a filled brand mark is not a stroked UI icon
 * anyway, so drawing it here is the honest version rather than the nearest
 * lookalike. `currentColor` lets the ghost button style it exactly like the
 * toggle next to it, and the mark is decorative: the link around it already
 * carries the name.
 */
function GitHubMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className="size-4"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}
