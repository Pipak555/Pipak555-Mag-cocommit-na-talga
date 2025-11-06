import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton loader for dashboard cards
 */
export const DashboardCardSkeleton = () => (
  <Card className="shadow-soft">
    <CardHeader className="pb-3">
      <Skeleton className="h-4 w-32" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-24 mb-2" />
      <Skeleton className="h-3 w-20" />
    </CardContent>
  </Card>
);

/**
 * Skeleton loader for dashboard grid
 */
export const DashboardSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
    {[...Array(4)].map((_, i) => (
      <DashboardCardSkeleton key={i} />
    ))}
  </div>
);

