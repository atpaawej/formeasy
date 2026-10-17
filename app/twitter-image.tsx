import { BRAND_ALT, brandImage } from "@/lib/og/brand";
import { OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og/card";

/*
 * The same card as opengraph-image. Twitter/X falls back to `og:image` on its
 * own, but emitting `twitter:image` explicitly is what makes the large-card
 * treatment reliable across scrapers, and the two are the same picture on
 * purpose — one brand, one rendering.
 */

export const alt = BRAND_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return brandImage();
}
