"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { CheckIcon, LinkIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { tap } from "@/lib/motion";

/*
 * Copy the public link. The label never changes, so the button never changes
 * width mid-interaction; the icon spins in as the confirmation, and a polite
 * live region says "Link copied" for anyone not looking at the icon.
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
    <Button variant={variant} size={size} onClick={copy}>
      <motion.span
        key={copied ? "copied" : "copy"}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={tap}
        className="inline-flex"
      >
        {copied ? <CheckIcon /> : <LinkIcon />}
      </motion.span>
      {copied ? "Link copied" : "Copy link"}
      <span className="sr-only" aria-live="polite">
        {copied ? "Link copied" : ""}
      </span>
    </Button>
  );
}
