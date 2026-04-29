import { Skeleton } from '@/components/ui/skeleton'

function CourseCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
        {/* Progress ring placeholder */}
        <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
      </div>
      <Skeleton className="h-3.5 w-28" />
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-7 w-full rounded-md" />
        <Skeleton className="h-7 w-full rounded-md" />
        <Skeleton className="h-7 w-full rounded-md" />
      </div>
      <Skeleton className="h-9 w-32 rounded-lg" />
    </div>
  )
}

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-3 flex items-center justify-between h-[53px]">
        <Skeleton className="h-6 w-24" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <CourseCardSkeleton />
            <CourseCardSkeleton />
            <CourseCardSkeleton />
          </div>

          {/* Streak widget skeleton */}
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
              <Skeleton className="h-5 w-28" />
              <div className="flex gap-2">
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-full rounded-md" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
