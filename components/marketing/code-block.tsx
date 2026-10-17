/*
 * A shell block, not a code editor: mono for the machine bits, a hairline and a
 * paper surface to set it apart from the prose, and horizontal scroll rather
 * than wrapping when a command runs long.
 *
 * It lives here rather than in one page because both the self-hosting page and
 * the agents page show commands, and the two must not drift into two different
 * renderings of the same idea.
 */
export function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-border bg-card p-4 font-mono text-xs leading-relaxed text-muted-foreground">
      <code>{code}</code>
    </pre>
  );
}
