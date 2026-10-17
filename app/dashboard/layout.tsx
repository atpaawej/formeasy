import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

import { ThemeToggle } from "@/components/theme-toggle";

export default function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3">
          <Link href="/dashboard" className="text-sm font-medium tracking-tight">
            formeasy
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
