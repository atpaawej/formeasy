import { ClerkProvider } from "@clerk/nextjs";
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
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
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
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
