# Self-hosting

Vercel is the easy path, not a requirement. The app is a standard Next.js server
with two external services: Postgres and Clerk. Run it on Vercel, in a container,
or on a box with Node — the app does not know the difference.

Whichever route you take, the rules about the two connection strings and the
environment variables are the same; they are documented once, in
[`.env.example`](../.env.example) and the [README](../README.md#environment-variables).

---

## Vercel

The [README](../README.md#deploy) has the deploy button. Two things it cannot do
for you:

**1. Run the migrations.** The first request will fail with "relation forms does
not exist" until you do. There is no migration runner in the build — schema
changes are a deliberate, separate step:

```bash
# with .env.local holding the *direct* Neon URL as DATABASE_URL
pnpm db:migrate
```

Do this after the first deploy, and again after any change under `drizzle/`.

**2. Check which Neon string went where.** Vercel's Neon integration names the
pooled string `DATABASE_URL`, which is the reverse of this app. The app queries
through `DATABASE_URL_POOLED` and migrates through `DATABASE_URL`; if they are
swapped, pages will either fail to connect or hammer Neon through the direct
endpoint. Read both values back after provisioning.

### Preview deploys

Vercel's Git integration builds every pull request and gives it a URL. Nothing
in this repository has to configure that. Point preview deployments at a Neon
*development* branch if you do not want them writing to production data.

---

## Docker, on one machine

`docker-compose.yml` brings up Postgres, applies the migrations, and starts the
app:

```bash
cp .env.example .env     # fill in the two Clerk keys and RESPONSE_HASH_SALT
docker compose up --build
```

Open <http://localhost:3000>. The `DATABASE_URL*` lines in `.env` are ignored
here: compose runs its own Postgres and points the app at it. Data lives in the
`formeasy-db` volume.

The migration step is a separate container (`docker compose` starts it once and
waits for it to finish) so that a bad migration fails before the app serves a
single request.

### Backups

The volume is a normal Postgres data directory. `docker compose exec db
pg_dump -U formeasy formeasy > backup.sql` is the whole story; there is no
application state anywhere else.

---

## Docker, with a hosted database

If you would rather keep Postgres with Neon — for the branching, or because you
are deploying somewhere without persistent disks — use the image directly.

The build needs the Clerk publishable key, because `NEXT_PUBLIC_*` is inlined
into the client bundle at build time:

```bash
docker build \
  --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx \
  -t formeasy .
```

Run it with the rest of the configuration. Every value here is read at *runtime*:

```bash
docker run --rm -p 3000:3000 \
  -e NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx \
  -e CLERK_SECRET_KEY=sk_test_xxx \
  -e DATABASE_URL_POOLED='postgres://…-pooler.…?sslmode=require' \
  -e RESPONSE_HASH_SALT='a-long-random-string' \
  formeasy
```

Migrations are not in the runtime image. Either run them from your machine
against the same database, or build the migration stage and run it:

```bash
docker build --target migrate -t formeasy-migrate .
docker run --rm -e DATABASE_URL='postgres://…?sslmode=require' formeasy-migrate
```

> **Changing the publishable key means rebuilding.** A container restart is not
> enough: the old key is already inside the JavaScript the browser downloaded.
> The secret key, by contrast, is only read at runtime.

---

## Behind a reverse proxy

**The rate limit reads `x-forwarded-for`.** Next reads it from the request
headers, so a proxy that does not set it (or strips it) silently disables the
per-IP limit — the honeypot and the size caps still work. Set it at the edge,
first hop only; do not trust a value the client supplied.

Next's own guidance applies: put nginx, Caddy, or a platform load balancer in
front of the container rather than exposing `node server.js` directly, and let it
handle malformed requests and slow clients.

---

## More than one instance

A single instance needs none of this. When you run several — a rolling deploy, or
two containers behind a load balancer — two things have to be shared.

**The Server Function encryption key.** Next encrypts the closure variables of
Server Actions with a per-build key. Two instances built separately cannot read
each other's actions, which shows up as "Failed to find Server Action" for
whoever lands on the wrong one. Build once and deploy that image everywhere, or
set the same key on every build:

```bash
openssl rand -base64 32     # NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
```

**A deployment identifier.** Setting `deploymentId` (in `next.config.ts`, from an
env var) lets a client that is mid-navigation notice the version changed and do a
full reload instead of failing on an asset that no longer exists. For a rolling
deploy this is the difference between a blip and a broken page.

Nothing else is shared state. There is no cache to coordinate: the app does no
ISR and no `use cache`, and the responses table is the only state there is.

---

## What is deliberately not configurable

- **The rate limit is not a quota.** It counts rows in `responses` per form, per
  hashed address, per hour, and is not atomic. Two simultaneous submissions can
  both fit in the last slot. That is on purpose — see
  [`design.md`](design.md#abuse-handling). There is no Redis, no cache, and no
  extra table to provision.
- **No address, no limit.** Without `x-forwarded-for` the per-IP check is
  skipped rather than applied to everyone at once.
- **Respondent IPs are only stored hashed.** `RESPONSE_HASH_SALT` is what keeps
  them unlinkable across a rotation. Set a real one; the development fallback is
  there so `pnpm dev` does not crash, not for production.
