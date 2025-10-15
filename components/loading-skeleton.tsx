import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PollSkeleton() {
  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader>
        <Skeleton className="h-8 w-3/4 mb-2" />
        <div className="flex items-center gap-6">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-5 w-8 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-2 w-full mt-3 rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function PollsListSkeleton() {
  return (
    <div className="space-y-6">
      {/* Tabs skeleton */}
      <div className="flex justify-center">
        <div className="grid w-full max-w-md grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      </div>
      
      {/* Polls skeleton */}
      <div className="space-y-6">
        {[1, 2].map((i) => (
          <PollSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      
      <div className="grid gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-64" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
