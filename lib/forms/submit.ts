import { createHash } from "node:crypto";

import type { Field } from "@/lib/fields";

/*
 * Pure pieces of the submit path. Keeping the decisions here (rather than in the
 * server action) is what makes them testable without a request or a database.
 */

/** The gate: a form takes responses only when it is published and still open. */
export function canAcceptResponses(form: {
  status: string;
  acceptResponses: boolean;
}): boolean {
  return form.status === "published" && form.acceptResponses;
}

/**
 * Pull the raw submitted values for a form's fields out of a FormData.
 *
 * Multi-choice collapses to an array of option ids; a field the respondent left
 * empty is omitted entirely. These values are both what gets validated and what
 * gets echoed back to re-populate the form after a failure.
 */
export function readAnswersFromFormData(
  fields: Field[],
  formData: FormData,
): Record<string, string | string[]> {
  const values: Record<string, string | string[]> = {};

  for (const field of fields) {
    // Empty, not trimmed: an echo should show exactly what was typed.
    const submitted = formData
      .getAll(field.id)
      .filter((entry): entry is string => typeof entry === "string" && entry !== "");
    if (submitted.length === 0) continue;
    values[field.id] = field.type === "multi_choice" ? submitted : submitted[0];
  }

  return values;
}

/** Salted: an unsalted hash of an IPv4 address is a 2^32 lookup from the address. */
export function hashIp(ip: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/*
 * Abuse handling.
 *
 * These are decisions, not plumbing: the action hands in the values, the recent
 * count, and the clock, so each rule is testable without a request, a database,
 * or a second of waiting. The honeypot lives in its own module (it is the one
 * piece the public form also imports).
 */

/**
 * Caps on the raw answers, measured before anything is parsed.
 *
 * The per-answer cap sits above `MAX_TEXT_LENGTH` in lib/fields.ts in every
 * encoding — 5000 characters is at most 20 KB of UTF-8 — so a long but honest
 * answer is always refused by its own field's message ("keep it under 5000
 * characters") and never by this one. What this stops is the shape of attack
 * validation never sees: megabytes of base64 in a single field, or a payload
 * that is individually reasonable per field and collectively absurd.
 */
export const MAX_ANSWER_BYTES = 32 * 1024;
export const MAX_PAYLOAD_BYTES = 256 * 1024;

function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).length;
}

/** True when some answer, or the set of them, is too big to store. */
export function exceedsSubmissionSize(
  values: Record<string, string | string[]>,
): boolean {
  let total = 0;

  for (const value of Object.values(values)) {
    for (const entry of Array.isArray(value) ? value : [value]) {
      const size = utf8Bytes(entry);
      if (size > MAX_ANSWER_BYTES) return true;
      total += size;
      if (total > MAX_PAYLOAD_BYTES) return true;
    }
  }

  return false;
}

/**
 * Rate limiting, per (IP, form).
 *
 * Counted off the responses table itself — `meta.ipHash` plus the
 * `(form_id, submitted_at)` index — so it needs no extra table, no cache, and no
 * migration, and it behaves the same on one serverless instance or twenty. The
 * window is rolling: what arrived in the last hour.
 *
 * The number is set for the honest crowd, not for the attacker. One address is
 * often one building: a class, a meeting, an office behind one NAT, all answering
 * the same form at once. Fifty an hour per form leaves room for that and still
 * caps a script at 1,200 rows a day per address, on top of a honeypot that
 * usually stops it from writing anything at all.
 *
 * It is not atomic. Two submissions landing at the same instant can both see the
 * last slot and both be stored, which is another reason the limit is not a tight
 * one — a throttle, not a quota.
 */
export const RATE_LIMIT_MAX = 50;
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

/** The earliest submission a window ending at `now` counts. */
export function rateLimitWindowStart(now: Date): Date {
  return new Date(now.getTime() - RATE_LIMIT_WINDOW_MS);
}

/** True when this (IP, form) has already spent its allowance. */
export function isRateLimited(recentCount: number): boolean {
  return recentCount >= RATE_LIMIT_MAX;
}
