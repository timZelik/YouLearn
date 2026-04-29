import { Skeleton } from '@/components/ui/skeleton'

export default function LessonLoading() {
  return (
    <div className="flex h-screen flex-col">
      {/* Header — matches LessonLayout header */}
      <header className="flex items-center gap-3 border-b bg-card px-4 py-3 flex-shrink-0 h-[53px]">
        <Skeleton className="h-4 w-20" />
        <span className="text-muted-foreground">/</span>
        <Skeleton className="h-4 w-28" />
        <span className="text-muted-foreground">/</span>
        <Skeleton className="h-4 w-36" />
        <Skeleton className="ml-auto h-5 w-16 rounded-full" />
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left pane — theory skeleton */}
        <div className="w-1/2 border-r p-6 flex flex-col gap-4 overflow-hidden">
          {/* Generating indicator */}
          <div className="flex items-center gap-2 mb-2">
            <div className="h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin flex-shrink-0" />
            <span className="text-sm text-muted-foreground">Generating your lesson with Claude…</span>
          </div>

          {/* Title */}
          <Skeleton className="h-5 w-2/3" />

          {/* Paragraph lines */}
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-11/12" />
            <Skeleton className="h-3.5 w-5/6" />
            <Skeleton className="h-3.5 w-4/5" />
          </div>

          {/* Code block */}
          <Skeleton className="h-28 w-full rounded-lg" />

          {/* More lines */}
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-10/12" />
            <Skeleton className="h-3.5 w-3/4" />
          </div>

          {/* Second code block */}
          <Skeleton className="h-20 w-full rounded-lg" />

          {/* Exercise box */}
          <div className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50 p-4 flex flex-col gap-2 dark:border-indigo-900 dark:bg-indigo-950/40">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-5/6" />
          </div>
        </div>

        {/* Right pane — editor skeleton */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          <div className="flex-1 p-4 flex flex-col gap-3 overflow-hidden">
            {/* Editor area */}
            <Skeleton className="flex-1 rounded-lg bg-gray-800 opacity-20" style={{ minHeight: 'calc(50vh - 60px)' }} />
            {/* Action buttons */}
            <div className="flex gap-2">
              <Skeleton className="h-8 w-14 rounded-md" />
              <Skeleton className="h-8 w-18 rounded-md" />
            </div>
          </div>

          {/* Results pane */}
          <div className="border-t flex-1 p-4 flex flex-col gap-3">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3.5 w-48" />
            <Skeleton className="h-3.5 w-40" />
          </div>
        </div>
      </div>
    </div>
  )
}
