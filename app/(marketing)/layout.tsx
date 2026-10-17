import type { ReactNode } from "react";

import { PageTransition } from "@/components/page-transition";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

/*
 * The marketing shell: the landing, About, and Self-hosting. A route group, so
 * the three pages share one header and one footer without the URL changing.
 *
 * `PageTransition` wraps the group rather than each page, so a move between them
 * gets the shell's view-transition crossfade — and not the form's own tab
 * transition, which lives inside the dashboard and must keep its sliding pill.
 * See components/page-transition.tsx.
 *
 * Every word here is server-rendered. The only client components below are the
 * theme toggle and the auth buttons, and neither is needed for the pages to
 * read — the same rule the public form follows.
 */
export default function MarketingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <PageTransition>
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </PageTransition>
  );
}
