import { beforeAll, describe, expect, it } from "vitest";

const enabled =
  process.env.RUN_DB_TESTS === "1" && Boolean(process.env.DATABASE_URL_POOLED);

// A cold pooled connection to Neon can take seconds. Warm it up outside the
// assertions so a slow connect does not read as a broken test.
const WARM_UP_TIMEOUT = 30_000;
const TEST_TIMEOUT = 15_000;

/*
 * The things a mocked test cannot prove: the JSONB round-trip, the generated
 * uuid default, column defaults, and the cascade from forms to responses.
 *
 * Opt in with `pnpm test:db`. It stays out of `pnpm test` so the unit suite
 * needs no database and no network.
 */
describe.skipIf(!enabled)("responses storage", () => {
  beforeAll(async () => {
    const { db } = await import("@/lib/db");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`select 1`);
  }, WARM_UP_TIMEOUT);

  it(
    "round-trips answers as JSONB and cascades when the form is deleted",
    async () => {
      const { eq } = await import("drizzle-orm");
      const { db } = await import("@/lib/db");
      const { forms, responses } = await import("@/lib/db/schema");

      const formId = `test${Date.now().toString(36)}`;

      await db.insert(forms).values({ id: formId, ownerId: "test_owner" });

      const [form] = await db.select().from(forms).where(eq(forms.id, formId));
      expect(form.status).toBe("draft");
      expect(form.acceptResponses).toBe(true);
      expect(form.title).toBe("Untitled form");
      expect(form.fields).toEqual([]);
      expect(form.settings).toEqual({});

      // Mixed value shapes, because answers is a union in TypeScript but a plain
      // JSONB column in Postgres.
      const answers = { t1: "Ada", m1: ["a", "b"], n1: 3 };
      await db.insert(responses).values({ formId, answers });

      const [row] = await db
        .select()
        .from(responses)
        .where(eq(responses.formId, formId));
      expect(row.answers).toEqual(answers);
      expect(row.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/);

      await db.delete(forms).where(eq(forms.id, formId));

      const left = await db
        .select()
        .from(responses)
        .where(eq(responses.formId, formId));
      expect(left).toHaveLength(0);
    },
    TEST_TIMEOUT,
  );

  it(
    "keeps an empty answer set empty rather than filling in defaults",
    async () => {
      const { eq } = await import("drizzle-orm");
      const { db } = await import("@/lib/db");
      const { forms, responses } = await import("@/lib/db/schema");

      const formId = `test${Date.now().toString(36)}b`;

      await db.insert(forms).values({
        id: formId,
        ownerId: "test_owner",
        status: "published",
        fields: [
          { id: "t1", type: "short_text", label: "Notes", required: false },
        ],
      });
      await db.insert(responses).values({ formId, answers: {} });

      const [row] = await db
        .select()
        .from(responses)
        .where(eq(responses.formId, formId));
      expect(row.answers).toEqual({});

      await db.delete(forms).where(eq(forms.id, formId));
    },
    TEST_TIMEOUT,
  );

  /*
   * The phase 3 gate: responses come back newest first, and one submitted before
   * a question was deleted still lands in the export — in its own column rather
   * than dropped.
   */
  it(
    "lists responses newest first and exports them with a column for a deleted question",
    async () => {
      const { eq } = await import("drizzle-orm");
      const { db } = await import("@/lib/db");
      const { forms, responses } = await import("@/lib/db/schema");
      const { buildCsv } = await import("@/lib/forms/csv");
      const { listResponses } = await import("@/lib/forms/queries");

      const formId = `test${Date.now().toString(36)}c`;
      const fields = [
        {
          id: "name",
          type: "short_text" as const,
          label: "Name",
          required: true,
        },
      ];

      await db.insert(forms).values({
        id: formId,
        ownerId: "test_owner",
        status: "published",
        fields,
      });

      await db.insert(responses).values([
        {
          formId,
          answers: { name: "Ada" },
          submittedAt: new Date("2026-01-01T00:00:00Z"),
        },
        {
          // `deleted_q` was a question when this arrived, and is not one now.
          formId,
          answers: { name: "Grace", deleted_q: "kept" },
          submittedAt: new Date("2026-02-01T00:00:00Z"),
        },
      ]);

      const rows = await listResponses(formId);
      expect(rows.map((row) => row.answers.name)).toEqual(["Grace", "Ada"]);

      const lines = buildCsv(fields, rows).split("\r\n");
      expect(lines[0]).toBe("Submitted at,Name,deleted_q");
      expect(lines[1]).toBe("2026-01-01T00:00:00.000Z,Ada,");
      expect(lines[2]).toBe("2026-02-01T00:00:00.000Z,Grace,kept");

      await db.delete(forms).where(eq(forms.id, formId));
    },
    TEST_TIMEOUT,
  );
});
