import { customAlphabet } from "nanoid";

// URL-safe, no lookalike-free requirement — but avoid characters that are easy
// to misread when someone copies a link by hand.
const ALPHABET =
  "0123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";

/** Public form slug. Doubles as the form's primary key. */
export const newFormId = customAlphabet(ALPHABET, 10);

/** Field and option ids are permanent. Never reuse one. See AGENTS.md. */
export const newFieldId = customAlphabet(ALPHABET, 8);
export const newOptionId = customAlphabet(ALPHABET, 8);
