# Fonts

The two faces the social cards are drawn with, read at runtime by
[`lib/og/assets.ts`](../../lib/og/assets.ts) and passed to `next/og`.

| File | Face | Role on a card |
|---|---|---|
| `Geist-Regular.ttf` | Geist | The wordmark and the metadata lines — chrome |
| `SourceSerif4-Regular.ttf` | Source Serif 4 | The headline — the voice |

That is the same split the app makes (see
[`docs/design-system.md`](../../docs/design-system.md)): the sans is the chrome
around a question, the serif is the question itself. `next/og` ships Geist
Regular as a default font, but passing any `fonts` array replaces it — so both
files have to be here even though one of them is also inside the dependency.

Both are under the SIL Open Font License 1.1; the license text for each is beside
it (`OFL-Geist.txt`, `OFL-SourceSerif4.txt`).

- Geist — <https://github.com/vercel/geist-font>
- Source Serif 4 — <https://github.com/google/fonts/tree/main/ofl/sourceserif4>

Being files rather than a font CDN fetched at request time is deliberate: a card
has to render with no network and on a self-hosted box. The trade is that a
`readFile` is invisible to Next's output tracer, so `outputFileTracingIncludes`
in [`next.config.ts`](../../next.config.ts) has to carry this directory into the
standalone image.
