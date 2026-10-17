import { Suspense } from "react";
import { SignIn } from "@clerk/nextjs";

import { PageTransition } from "@/components/page-transition";
import { AFTER_AUTH_URL, clerkAppearance } from "@/lib/clerk";

export default function Page() {
  return (
    <PageTransition>
      <div className="grid min-h-svh place-items-center px-6 py-12">
        <Suspense>
          <SignIn
            appearance={clerkAppearance}
            fallbackRedirectUrl={AFTER_AUTH_URL}
            signUpFallbackRedirectUrl={AFTER_AUTH_URL}
          />
        </Suspense>
      </div>
    </PageTransition>
  );
}
