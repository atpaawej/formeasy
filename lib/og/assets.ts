import { readFile } from "node:fs/promises";
import { join } from "node:path";

/*
 * The two faces the OG cards draw with, read once when the module loads.
 *
 * next/og ships Geist Regular as its default font — but the moment a `fonts`
 * array is passed, that default is *replaced*, not added to. So both faces have
 * to be here: Geist for the wordmark and the metadata line, Source Serif for the
 * headline. That is the same split the app makes — sans is chrome, serif is the
 * voice (see docs/design-system.md) — and a card that is all one or all the
 * other would look like a different product.
 *
 * Files rather than a font CDN at request time: a card has to render with no
 * network and on a self-hosted box, and the standalone Docker image has to carry
 * them — see `outputFileTracingIncludes` in next.config.ts.
 */
const fontsDir = join(process.cwd(), "assets/fonts");

const [geist, sourceSerif] = await Promise.all([
  readFile(join(fontsDir, "Geist-Regular.ttf")),
  readFile(join(fontsDir, "SourceSerif4-Regular.ttf")),
]);

export const OG_FONTS = [
  { name: "Geist", data: geist, weight: 400 as const, style: "normal" as const },
  {
    name: "Source Serif 4",
    data: sourceSerif,
    weight: 400 as const,
    style: "normal" as const,
  },
];
