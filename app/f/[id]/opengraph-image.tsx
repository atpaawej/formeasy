import { ImageResponse } from "next/og";

import { getFormById } from "@/lib/forms/queries";
import { OG_FONTS } from "@/lib/og/assets";
import { brandImage } from "@/lib/og/brand";
import { OG_CONTENT_TYPE, OG_SIZE, OgCard } from "@/lib/og/card";
import { clampText, OG_DESCRIPTION_MAX, OG_HEADLINE_MAX } from "@/lib/og/text";

/*
 * The card a shared form link unfurls with: its title, set the way the form
 * itself sets it.
 *
 * Two rules, and both are the same rule the page's own metadata follows.
 *
 * A failed read must not break the unfurl. Metadata is decoration — it runs
 * outside this segment's error boundary, and a throw here would turn "someone
 * pasted a link" into a broken preview with no card at all. So an unreadable
 * form falls back to the brand card, and only the words are lost.
 *
 * A draft is not a page. `/f/[id]` 404s for a draft, so its title must not be
 * rendered here either — otherwise a link the owner never published would
 * announce its title in a chat app. Anything that is not published gets the
 * brand card too.
 *
 * The image is generated per request (params + database), so it also carries a
 * cache header: an edge that keeps a copy for an hour saves the render, and a
 * stale-while-revalidate window means a title edit shows up without ever making
 * a scraper wait on the database.
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
      // `title` is not null in the database but it can be blank, and a card with
      // no headline is a card with a hole in it.
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

/**
 * What is worth knowing before you click: how long it is, and whether it is
 * still open. A closed form is still a page people can read, so the card says
 * so rather than falling back to the brand image.
 */
function footerLeft(questions: number, accepting: boolean): string {
  if (!accepting) return "No longer accepting responses";
  if (questions === 0) return "No questions yet";
  return questions === 1 ? "1 question" : `${questions} questions`;
}
