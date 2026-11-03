import { Skeleton } from "@/common/components/ui/skeleton";

const PLACEHOLDER_KEYS = ["first", "second", "third"];

export function ListSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-4">
      <span className="sr-only">Cargando candidaturas…</span>
      {PLACEHOLDER_KEYS.map((key) => (
        <div
          key={key}
          aria-hidden="true"
          className="flex flex-col gap-2 rounded-md border border-border bg-card p-4 lg:p-6"
        >
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
