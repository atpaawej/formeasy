import { ImageResponse } from "next/og";

import { getFormById } from "@/lib/forms/queries";
import { OG_FONTS } from "@/lib/og/assets";
import { brandImage } from "@/lib/og/brand";
import { OG_CONTENT_TYPE, OG_SIZE, OgCard } from "@/lib/og/card";
import { clampText, OG_DESCRIPTION_MAX, OG_HEADLINE_MAX } from "@/lib/og/text";

/*
 * The Twitter/X card for a public form. It mirrors opengraph-image.tsx, including
 * the draft guard and the brand-card fallback — a scraper that reads only the
 * `twitter:*` tags must get the same answer the Open Graph tags give.
 */

export const alt = "A form on formeasy";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const CACHE_CONTROL =
  "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400";

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const form = await getFormById(id).catch(() => null);
  if (!form || form.status !== "published") return brandImage();

  const description = form.description?.trim();

  return new ImageResponse(
    <OgCard
      headline={clampText(form.title, OG_HEADLINE_MAX) || "Untitled form"}
      description={
        description ? clampText(description, OG_DESCRIPTION_MAX) : undefined
      }
      footerLeft={footerLeft(form.fields.length, form.acceptResponses)}
      footerRight="No account needed"
    />,
    {
      ...OG_SIZE,
      fonts: OG_FONTS,
      headers: { "cache-control": CACHE_CONTROL },
    },
  );
}

function footerLeft(questions: number, accepting: boolean): string {
  if (!accepting) return "No longer accepting responses";
  if (questions === 0) return "No questions yet";
  return questions === 1 ? "1 question" : `${questions} questions`;
}
