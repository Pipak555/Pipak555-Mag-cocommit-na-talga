import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton loader for message/conversation cards
 */
export const MessageCardSkeleton = () => (
  <Card className="shadow-soft">
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </CardContent>
  </Card>
);

/**
 * Skeleton loader for message list
 */
export const MessageListSkeleton = ({ count = 5 }: { count?: number }) => (
  <div className="space-y-2">
    {[...Array(count)].map((_, i) => (
      <MessageCardSkeleton key={i} />
    ))}
  </div>
);

