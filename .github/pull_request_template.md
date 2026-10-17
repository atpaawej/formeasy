## What this changes

<!-- One or two sentences. The diff says what; this says what to look at. -->

## Why

<!-- The problem being solved. Link the issue if there is one: "Closes #123". -->

## How to check it

<!-- Steps a reviewer can follow, or the test that covers it. -->

## Checklist

- [ ] `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
- [ ] New behaviour has a test next to the module (`<module>.test.ts`).
- [ ] A new public route was added to the `proxy.ts` matcher in the same change.
- [ ] The field schema, data model, or submit path changed → `docs/design.md`
      was updated to match.
- [ ] UI changed → screenshot attached, light and dark if the change touches colour.
- [ ] This does not break existing responses (no migration that drops or rekeys one).
