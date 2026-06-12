import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-deep-200/70 dark:bg-deep-700/60",
        className
      )}
    />
  );
}

export function SightingCardSkeleton() {
  return (
    <div className="rounded-2xl border border-deep-200/80 dark:border-deep-700/60 bg-white dark:bg-deep-850 p-5 pl-6">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      <Skeleton className="mt-4 h-44 w-full rounded-xl" />
      <div className="mt-4 pt-3.5 border-t border-deep-100 dark:border-deep-800 flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}
