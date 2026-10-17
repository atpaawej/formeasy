"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { responses } from "@/lib/db/schema";
import { validateAnswers, type ResponseMeta } from "@/lib/fields";
import { honeypotTripped } from "@/lib/forms/honeypot";
import { countRecentResponses, getFormById } from "@/lib/forms/queries";
import {
  canAcceptResponses,
  exceedsSubmissionSize,
  hashIp,
  isRateLimited,
  rateLimitWindowStart,
  readAnswersFromFormData,
} from "@/lib/forms/submit";
import type { SubmitState } from "@/lib/forms/submit-state";
import { reportError } from "@/lib/observability";

/*
 * The submit path. The server is the gate: the field schema lives in the
 * database, so a respondent editing the DOM changes nothing. See docs/design.md.
 *
 * The checks run cheapest-and-most-certain first, and every one of them refuses
 * with a sentence a respondent can act on. On failure the answers come back, so
 * a re-render never wipes the form; on success this redirects to the thank-you
 * page.
 */

const NOT_ACCEPTING = "This form is not accepting responses.";
const CLOSED = "This form is no longer accepting responses.";
const TOO_MANY =
  "Too many responses have come from this device in the last hour. Try again later.";
const TOO_LARGE =
  "That submission is too large. Please shorten your answers and try again.";
const SAVE_FAILED =
  "Something went wrong saving your response. Please try again.";

export async function submitResponse(
  formId: string,
  _previous: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const form = await getFormById(formId);
  if (!form || form.status !== "published") {
    return { errors: {}, formError: NOT_ACCEPTING };
  }

  if (!canAcceptResponses(form)) {
    return { errors: {}, formError: CLOSED };
  }

  /*
   * The honeypot is answered before anything else is believed about this
   * request, and it is answered with the thank-you page: a spam script that is
   * told what tripped it is a spam script that gets through next time.
   */
  if (honeypotTripped(formData)) {
    redirect(`/f/${form.id}/submitted`);
  }

  const meta = await readResponseMeta();

  // Without an address there is nothing to count per IP, so the limit is
  // skipped rather than applied to everyone at once.
  if (meta.ipHash && (await isOverRateLimit(form.id, meta.ipHash))) {
    return { errors: {}, formError: TOO_MANY };
  }

  const values = readAnswersFromFormData(form.fields, formData);
  if (exceedsSubmissionSize(values)) {
    // Deliberately not echoed back: a rejected megabyte is not worth a round-trip.
    return { errors: {}, formError: TOO_LARGE };
  }

  const { answers, errors } = validateAnswers(form.fields, values);
  if (Object.keys(errors).length > 0) {
    return { errors, values };
  }

  try {
    await db.insert(responses).values({ formId: form.id, answers, meta });
  } catch (error) {
    // Ours, not theirs: the respondent gets a sentence and their answers back,
    // and the failure goes to the log with what we know about it.
    reportError(error, { where: "submitResponse", formId: form.id });
    return { errors: {}, formError: SAVE_FAILED, values };
  }

  redirect(`/f/${form.id}/submitted`);
}

async function isOverRateLimit(
  formId: string,
  ipHash: string,
): Promise<boolean> {
  const recent = await countRecentResponses(
    formId,
    ipHash,
    rateLimitWindowStart(new Date()),
  );
  return isRateLimited(recent);
}

async function readResponseMeta(): Promise<ResponseMeta> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim();
  const salt = process.env.RESPONSE_HASH_SALT ?? "formeasy-dev-salt";

  return {
    userAgent: headerList.get("user-agent") ?? undefined,
    referrer: headerList.get("referer") ?? undefined,
    ipHash: ip ? hashIp(ip, salt) : undefined,
  };
}
