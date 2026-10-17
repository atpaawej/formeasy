import { Skeleton } from "@/components/ui/skeleton";

/** Matches the loaded view's rhythm, so nothing shifts when the data lands. */
export function ResponsesSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-8 w-48 rounded-full" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
