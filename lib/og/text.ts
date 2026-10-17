/*
 * Fitting text into a fixed-size image.
 *
 * A social card is one canvas that never reflows: the layout is drawn once at
 * 1200x630, so a headline that runs long does not move anything — it overlaps
 * whatever is below it. Satori's line clamping is not dependable across
 * versions, so the fit is decided here instead, in a pure function a test can
 * pin, and the card just renders what it is given.
 */

/** The most characters a card headline will carry before it is cut. */
export const OG_HEADLINE_MAX = 88;

/** The same, for the description line under it. */
export const OG_DESCRIPTION_MAX = 150;

/**
 * Collapse runs of whitespace — a form description can hold newlines and tabs —
 * then clamp to `max` characters, preferring to cut on a word boundary and
 * finishing with an ellipsis. A word boundary is only honoured when it keeps
 * most of the budget, so a long word does not halve the line.
 */
export function clampText(value: string, max: number): string {
  const collapsed = value.replace(/\s+/g, " ").trim();
  if (collapsed.length <= max) return collapsed;

  const cut = collapsed.slice(0, max);
  const boundary = cut.lastIndexOf(" ");
  const kept = boundary >= max * 0.6 ? cut.slice(0, boundary) : cut;

  return `${kept.trimEnd()}…`;
}
