import { Suspense } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";

import { MotionProvider } from "@/components/motion-provider";
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/lib/site";
import { ThemeProvider } from "@/lib/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The questions are typeset. Sans is chrome; serif is content.
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

/*
 * `metadataBase` is what turns the card routes' relative URLs into the absolute
 * ones a crawler needs. It comes from configuration, not the request — see
 * lib/site.ts — and when there is nothing to read it stays unset so Next's own
 * default (localhost in development) applies rather than a wrong guess.
 *
 * The images themselves are not named here: the `opengraph-image` and
 * `twitter-image` file conventions add those tags, and the public form overrides
 * them one segment down.
 *
 * `openGraph` deliberately carries no `title` or `description`. Both fall back to
 * the page's own `title`/`description`, and setting them here would hand every
 * marketing page the site-wide line — four pages that unfurl identically is the
 * same as three of them having no preview at all.
 */
export const metadata: Metadata = {
  metadataBase: siteUrl() ?? undefined,
  title: {
    default: SITE_NAME,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} h-full antialiased`}
      >
        <body className="flex min-h-full flex-col">
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <MotionProvider>{children}</MotionProvider>
            {/*
             * Vercel Web Analytics, only where there is a Vercel to report to.
             * The script it renders is fetched from /_vercel/insights/script.js,
             * which Vercel's own edge serves — on a self-hosted box the tag would
             * be a 404 in every visitor's network log and nothing else, so it is
             * rendered only when the platform's variable is set.
             *
             * The boundary is not decoration: the component reads
             * `useSearchParams` to attribute a route, and under Cache Components
             * that read has to sit behind a Suspense boundary.
             */}
            {process.env.VERCEL ? (
              <Suspense fallback={null}>
                <Analytics />
              </Suspense>
            ) : null}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
