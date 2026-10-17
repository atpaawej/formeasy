import { BRAND_ALT, brandImage } from "@/lib/og/brand";
import { OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og/card";

/*
 * The image every link to this site shares, unless a segment below provides its
 * own (the public form does — see app/f/[id]/opengraph-image.tsx).
 *
 * It has no dynamic input, so Next renders it once at build time and serves the
 * bytes with a content hash. Nothing here reads the database or the request.
 */

export const alt = BRAND_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return brandImage();
}
