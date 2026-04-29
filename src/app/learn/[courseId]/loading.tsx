import { Skeleton } from '@/components/ui/skeleton'

function LessonRowSkeleton({ index }: { index: number }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-5 w-14 rounded-full flex-shrink-0" />
    </div>
  )
}

export default function CourseOverviewLoading() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-3 flex items-center gap-3 h-[53px]">
        <Skeleton className="h-4 w-24" />
        <span className="text-muted-foreground">/</span>
        <Skeleton className="h-4 w-40" />
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="mb-6 flex flex-col gap-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>

        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <LessonRowSkeleton key={i} index={i} />
          ))}
        </div>
      </main>
    </div>
  )
}
