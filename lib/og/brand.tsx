import { ImageResponse } from "next/og";

import { OG_FONTS } from "@/lib/og/assets";
import { OG_SIZE, OgCard } from "@/lib/og/card";
import { clampText, OG_DESCRIPTION_MAX } from "@/lib/og/text";

/*
 * The site-wide card — the landing, About, Self-hosting, and anything else with
 * no card of its own. It is also the fallback the per-form route returns when it
 * has no form to draw: a draft, a deleted id, or a form it could not read.
 *
 * Keeping the fallback identical to the default is the point. A broken unfurl is
 * a page that looks broken, and the brand card is always a true statement about
 * the deployment, so `brandImage()` is what both routes fall back to.
 *
 * The description deliberately does not paraphrase the headline. Two lines that
 * say the same thing waste the half of the card nobody reads past.
 */

export const BRAND_ALT = "formeasy — an open-source form builder";

const BRAND_DESCRIPTION =
  "An open-source alternative to Google Forms that you can host yourself.";

export function brandImage() {
  return new ImageResponse(
    <OgCard
      headline="Make a form. Share a link. Read every answer."
      description={clampText(BRAND_DESCRIPTION, OG_DESCRIPTION_MAX)}
      footerLeft="Respondents need no account"
      footerRight="MIT licensed"
    />,
    { ...OG_SIZE, fonts: OG_FONTS },
  );
}
