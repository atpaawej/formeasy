"use client";

import { useState } from "react";
import { LinkIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

/*
 * Copy the public link.
 *
 * The button's own `success` state does the work: on a successful copy the
 * check pops in and the label becomes "Link copied", then it returns after a
 * beat. The action keeps one name throughout — the button is always the thing
 * that copies the link — and a polite live region says "Link copied" for anyone
 * not watching the icon.
 */
export function CopyLinkButton({
  formId,
  variant = "outline",
  size = "sm",
}: {
  formId: string;
  variant?: "outline" | "ghost" | "secondary";
  size?: "sm" | "lg" | "default";
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/f/${formId}`);
    } catch {
      // Clipboard access can be denied; the link is still visible in the URL
      // bar, and the builder has an "Open" button next to this one.
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        success={copied}
        successLabel="Link copied"
        onClick={copy}
      >
        <LinkIcon />
        Copy link
      </Button>
      <span className="sr-only" aria-live="polite">
        {copied ? "Link copied" : ""}
      </span>
    </>
  );
}
