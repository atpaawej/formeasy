/*
 * The social card.
 *
 * Both `og:image` routes render this: the site-wide one and the per-form one. It
 * is deliberately one layout with different words, so a form's link and the
 * landing page unfurl as the same product rather than two.
 *
 * Two constraints shape every number below.
 *
 * Satori is a subset of CSS — flexbox only, no grid, and an element holding more
 * than one child needs an explicit `display: flex`. Colours mirror the tokens in
 * app/globals.css by hand, because the output is a PNG and cannot read a CSS
 * variable.
 *
 * And the canvas never reflows. It is laid out once at a fixed size, so a long
 * headline does not push anything down — it runs over it. The type scale is
 * therefore chosen to fit the tallest headline and the longest description that
 * `clampText` (lib/og/text.ts) will let through, with room to spare at both
 * ends. Change a size here and the fit has to be checked again.
 */

const INK = "#16181d";
const GRAPHITE = "#5b6472";
const LINE = "#e4e7ec";
const CANVAS = "#f6f7f9";
const PAPER = "#ffffff";
const COBALT = "#2557e8";

export const OG_SIZE = { width: 1200, height: 630 } as const;

export const OG_CONTENT_TYPE = "image/png";

export type OgCardProps = {
  /** The serif line. Clamp it with `clampText` before passing it in. */
  headline: string;
  description?: string;
  footerLeft: string;
  footerRight: string;
  /** The small line beside the wordmark. */
  badge?: string;
};

export function OgCard({
  headline,
  description,
  footerLeft,
  footerRight,
  badge = "Open source",
}: OgCardProps) {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: CANVAS,
        padding: 48,
        fontFamily: "Geist",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          background: PAPER,
          border: `1px solid ${LINE}`,
          borderRadius: 28,
          padding: 56,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 28,
            color: INK,
            letterSpacing: -0.4,
          }}
        >
          <div style={{ display: "flex" }}>formeasy</div>
          <div style={{ display: "flex", fontSize: 19, color: GRAPHITE }}>
            {badge}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* The one accent, spent here: a short cobalt rule that starts the block. */}
          <div
            style={{
              display: "flex",
              width: 56,
              height: 4,
              borderRadius: 2,
              background: COBALT,
            }}
          />
          <div
            style={{
              display: "flex",
              marginTop: 22,
              fontFamily: "Source Serif 4",
              fontSize: 54,
              lineHeight: 1.12,
              letterSpacing: -0.8,
              color: INK,
            }}
          >
            {headline}
          </div>
          {description ? (
            <div
              style={{
                display: "flex",
                marginTop: 16,
                fontSize: 26,
                lineHeight: 1.45,
                color: GRAPHITE,
              }}
            >
              {description}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `1px solid ${LINE}`,
            paddingTop: 24,
            fontSize: 19,
            color: GRAPHITE,
          }}
        >
          <div style={{ display: "flex" }}>{footerLeft}</div>
          <div style={{ display: "flex" }}>{footerRight}</div>
        </div>
      </div>
    </div>
  );
}
