import { SELF_HOSTING_URL } from "@/lib/site";

export const metadata = { title: "Self-hosting" };

/*
 * The self-hosting page. It is the *short* version on purpose: the full
 * reference is docs/self-hosting.md in the repository, and duplicating it here
 * would be two documents to keep in step. This page answers "can I run it, and
 * what will bite me" and then points at the one that answers "how".
 */

const SECTIONS = [
  {
    title: "Vercel",
    body: "The repository carries a deploy button. Two things it cannot do for you: run the migrations after the first deploy, and stop you from swapping Neon's two connection strings. The app queries through DATABASE_URL_POOLED and migrates through DATABASE_URL — the reverse of the names the Vercel integration uses.",
    code: `# with .env.local holding the *direct* Neon URL as DATABASE_URL
pnpm db:migrate`,
  },
  {
    title: "Docker, on one machine",
    body: "Compose brings up Postgres, applies the migrations, and starts the app. The migration runs as its own step, so a bad one fails before the app serves a single request. Data lives in a named volume.",
    code: `cp .env.example .env     # the two Clerk keys and RESPONSE_HASH_SALT
docker compose up --build`,
  },
  {
    title: "Docker, with a hosted database",
    body: "Use the image directly and point it at a database you already run. The Clerk publishable key is needed at build time, because NEXT_PUBLIC_* is inlined into the client bundle. Changing it means rebuilding, not restarting.",
    code: `docker build -t formeasy .
docker run --rm -p 3000:3000 \\
  -e DATABASE_URL_POOLED='postgres://…?sslmode=require' \\
  -e RESPONSE_HASH_SALT='a-long-random-string' \\
  formeasy`,
  },
];

const NOTES = [
  {
    title: "Behind a reverse proxy",
    body: "The per-address rate limit reads x-forwarded-for. A proxy that strips it silently disables that check — the honeypot and the size caps still work. Set it at the first hop and do not trust one a client supplied.",
  },
  {
    title: "More than one instance",
    body: "Build one image and deploy it everywhere, or set the same NEXT_SERVER_ACTIONS_ENCRYPTION_KEY on every build. Two instances built separately cannot read each other's Server Actions, which shows up as \"Failed to find Server Action\" for whoever lands on the wrong one.",
  },
  {
    title: "Nothing else is shared",
    body: "There is no cache to coordinate — no ISR, no use cache. The responses table is the only state there is, which is what makes a rolling deploy boring.",
  },
];

const NOT_CONFIGURABLE = [
  "The rate limit is a throttle, not a quota — it counts rows per form, per hashed address, per hour, and is not atomic. Two simultaneous submissions can both fit in the last slot.",
  "With no x-forwarded-for there is nothing to count per address, so the per-IP check is skipped rather than applied to everyone at once.",
  "Respondent IPs are only ever stored hashed. RESPONSE_HASH_SALT is what keeps them unlinkable; set a real one.",
];

export default function SelfHostingPage() {
  return (
    <>
      <section className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
        <div className="max-w-2xl">
          <h1 className="font-serif text-3xl leading-tight tracking-tight text-balance sm:text-4xl">
            Run it yourself.
          </h1>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground">
            Vercel is the easy path, not a requirement. The app is a standard
            Next.js server with two external services — Postgres and Clerk — so
            it runs on a platform, in a container, or on a box with Node, and it
            does not know the difference.
          </p>
        </div>
      </section>

      {SECTIONS.map((section) => (
        <section key={section.title} className="border-t border-border">
          <div className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
            <div className="grid gap-8 md:grid-cols-2 md:gap-16">
              <div>
                <h2 className="font-serif text-2xl leading-snug text-balance">
                  {section.title}
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
                  {section.body}
                </p>
              </div>
              <CodeBlock code={section.code} />
            </div>
          </div>
        </section>
      ))}

      <section className="border-t border-border">
        <div className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
          <h2 className="font-serif text-2xl leading-snug text-balance sm:text-3xl">
            When it is not one machine.
          </h2>

          <dl className="mt-12 grid gap-x-12 gap-y-8 sm:grid-cols-2">
            {NOTES.map((note) => (
              <div key={note.title} className="border-t border-border pt-5">
                <dt className="text-sm font-medium">{note.title}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {note.body}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
          <div className="max-w-2xl">
            <h2 className="font-serif text-2xl leading-snug text-balance sm:text-3xl">
              What is deliberately not configurable.
            </h2>
            <ul className="mt-8 flex flex-col">
              {NOT_CONFIGURABLE.map((item) => (
                <li
                  key={item}
                  className="border-t border-border py-4 text-sm leading-relaxed text-muted-foreground first:border-t-0 first:pt-0"
                >
                  {item}
                </li>
              ))}
            </ul>

            <p className="mt-8 text-sm leading-relaxed text-muted-foreground">
              The full reference — every environment variable, the migration
              step, backups, and the edge cases above — is in the repository.{" "}
              <a
                href={SELF_HOSTING_URL}
                className="text-foreground underline underline-offset-2"
              >
                Read docs/self-hosting.md
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

/**
 * A shell block, not a code editor: mono for the machine bits, a hairline to set
 * it apart from the prose, and horizontal scroll rather than wrapping when a
 * command runs long.
 */
function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-border bg-card p-4 font-mono text-xs leading-relaxed text-muted-foreground">
      <code>{code}</code>
    </pre>
  );
}
