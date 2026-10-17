import Link from "next/link";

import { GITHUB_URL, LICENSE, SITE_NAME } from "@/lib/site";

/*
 * The marketing shell's footer. Small on purpose: three grouped links and one
 * line of truth about what this is. Nothing here is load-bearing for the page
 * above it.
 */

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/#how", label: "How it works" },
      { href: "/#features", label: "Features" },
      { href: "/#questions", label: "Questions" },
    ],
  },
  {
    title: "Project",
    links: [
      { href: "/about", label: "About" },
      { href: "/self-hosting", label: "Self-hosting" },
      { href: GITHUB_URL, label: "GitHub", external: true },
      {
        href: `${GITHUB_URL}/blob/main/LICENSE`,
        label: `${LICENSE} license`,
        external: true,
      },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-12 sm:flex-row sm:justify-between">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium tracking-tight">{SITE_NAME}</span>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            An open-source form builder. Contributions welcome.
          </p>
        </div>

        <div className="flex gap-12 sm:gap-16">
          {COLUMNS.map((column) => (
            <div key={column.title} className="flex flex-col gap-3">
              <h2 className="text-xs text-muted-foreground">{column.title}</h2>
              <ul className="flex flex-col gap-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    {link.external ? (
                      <a
                        href={link.href}
                        className="text-sm transition-colors hover:text-muted-foreground"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm transition-colors hover:text-muted-foreground"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
