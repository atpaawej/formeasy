import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import type {
  Answers,
  Field,
  FormSettings,
  ResponseMeta,
} from "../fields";

/*
 * Two tables. No users table — Clerk hands us the owner id in the session and
 * forms are keyed by owner_id, so listing your forms needs no join.
 * See docs/design.md.
 */

export const forms = pgTable(
  "forms",
  {
    /** nanoid. Also the public slug in /f/<id>. */
    id: text("id").primaryKey(),
    /** Clerk user id. */
    ownerId: text("owner_id").notNull(),
    title: text("title").notNull().default("Untitled form"),
    description: text("description"),
    /** 'draft' | 'published' */
    status: text("status").notNull().default("draft"),
    acceptResponses: boolean("accept_responses").notNull().default(true),
    fields: jsonb("fields").$type<Field[]>().notNull().default([]),
    settings: jsonb("settings").$type<FormSettings>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("forms_owner_updated_idx").on(table.ownerId, table.updatedAt)],
);

export const responses = pgTable(
  "responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formId: text("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    answers: jsonb("answers").$type<Answers>().notNull().default({}),
    meta: jsonb("meta").$type<ResponseMeta>().notNull().default({}),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("responses_form_submitted_idx").on(table.formId, table.submittedAt),
  ],
);

export type Form = typeof forms.$inferSelect;
export type NewForm = typeof forms.$inferInsert;
export type Response = typeof responses.$inferSelect;
export type NewResponse = typeof responses.$inferInsert;
