"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { responses } from "@/lib/db/schema";
import { validateAnswers, type ResponseMeta } from "@/lib/fields";
import { getFormById } from "@/lib/forms/queries";
import {
  canAcceptResponses,
  hashIp,
  readAnswersFromFormData,
} from "@/lib/forms/submit";
import type { SubmitState } from "@/lib/forms/submit-state";

/*
 * The submit path. The server is the gate: the field schema lives in the
 * database, so a respondent editing the DOM changes nothing. See docs/design.md.
 *
 * On success this redirects to the thank-you page. On failure it returns the
 * errors and the submitted values, so a re-render never wipes the form.
 */
export async function submitResponse(
  formId: string,
  _previous: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const form = await getFormById(formId);
  if (!form || form.status !== "published") {
    return { errors: {}, formError: "This form is not accepting responses." };
  }

  if (!canAcceptResponses(form)) {
    return {
      errors: {},
      formError: "This form is no longer accepting responses.",
    };
  }

  const values = readAnswersFromFormData(form.fields, formData);
  const { answers, errors } = validateAnswers(form.fields, values);
  if (Object.keys(errors).length > 0) {
    return { errors, values };
  }

  await db.insert(responses).values({
    formId: form.id,
    answers,
    meta: await readResponseMeta(),
  });

  redirect(`/f/${form.id}/submitted`);
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
