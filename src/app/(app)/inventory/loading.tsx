import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="hidden h-9 w-72 sm:block" />
      </div>
      <Card className="overflow-hidden">
        <div className="flex gap-3 border-b p-4">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="hidden h-9 w-36 sm:block" />
          <Skeleton className="hidden h-9 w-44 sm:block" />
        </div>
        <div className="divide-y">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="hidden h-4 w-32 md:block" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
