import { connection } from "next/server";

import { authMarkdown } from "@/lib/agent/auth-md";
import { agentAudience } from "@/lib/agent/config";

/*
 * GET /auth.md — the AgentOnboard discovery file. Public, no auth, plain markdown.
 *
 * `connection()` holds this until request time so the audience is read from the
 * running deployment's environment rather than baked in at build. With Cache
 * Components on, a handler that only reads `process.env` would otherwise be
 * prerendered, and a self-hoster's hostname would be frozen to whatever was set
 * during `next build`. See node_modules/next/dist/docs (Route Handlers, Cache
 * Components).
 *
 * 404 when no audience is configured: agent access is off, and the honest answer
 * is to advertise nothing rather than publish an audience we would reject.
 */
export async function GET() {
  await connection();

  const audience = agentAudience();
  if (!audience) return new Response("Not found", { status: 404 });

  return new Response(authMarkdown(audience), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
