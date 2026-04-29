import Link from 'next/link'
import ProgressRing from './ProgressRing'

interface Lesson {
  id: string
  title: string
  difficulty: string
  order_index: number
  user_lesson_progress: { status: string; best_score: number; attempts: number }[] | null
}

interface CourseCardProps {
  course: {
    id: string
    title: string
    description: string
    order_index: number
    status: string
    lessons: Lesson[]
  }
}

const DIFFICULTY_STYLES: Record<string, string> = {
  intro:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  easy:     'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400',
  medium:   'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  hard:     'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
  capstone: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400',
}

const STATUS_DOT: Record<string, string> = {
  completed:   'bg-emerald-500',
  in_progress: 'bg-primary',
  not_started: 'bg-border',
}

export default function CourseCard({ course }: CourseCardProps) {
  const isPreparing = course.status !== 'generated'
  const lessons = [...course.lessons].sort((a, b) => a.order_index - b.order_index)
  const completedCount = lessons.filter(
    (l) => l.user_lesson_progress?.[0]?.status === 'completed'
  ).length
  const progress = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0
  const isComplete = progress === 100

  const nextLesson = lessons.find(
    (l) => l.user_lesson_progress?.[0]?.status !== 'completed'
  ) ?? lessons[0]

  const accentColor = isComplete
    ? 'bg-emerald-500'
    : completedCount > 0
    ? 'bg-primary'
    : 'bg-border'

  return (
    <div className="group relative flex overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      {/* Left accent bar */}
      <div className={`w-1 flex-shrink-0 ${accentColor} transition-colors`} />

      <div className="flex flex-1 flex-col gap-4 p-5">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <span className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              Course {course.order_index + 1}
            </span>
            <h3 className="font-semibold tracking-tight leading-snug text-[0.95rem] flex items-center gap-2">
              {course.title}
              {isPreparing && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                  Preparing
                </span>
              )}
            </h3>
            <p className="text-[0.82rem] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
              {course.description}
            </p>
          </div>
          <div className="flex-shrink-0">
            <ProgressRing value={progress} size={44} strokeWidth={4} />
          </div>
        </div>

        {/* Progress label */}
        <p className="text-xs text-muted-foreground">
          {completedCount} / {lessons.length} lessons completed
        </p>

        {/* Lesson list */}
        <div className="flex flex-col gap-0.5">
          {lessons.slice(0, 3).map((lesson) => {
            const status = lesson.user_lesson_progress?.[0]?.status ?? 'not_started'
            return (
              <Link
                key={lesson.id}
                href={`/learn/${course.id}/${lesson.id}`}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent"
              >
                <span className={`h-2 w-2 rounded-full flex-shrink-0 ${STATUS_DOT[status] ?? STATUS_DOT.not_started}`} />
                <span className="flex-1 truncate text-foreground">{lesson.title}</span>
                <span className={`flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${DIFFICULTY_STYLES[lesson.difficulty] ?? ''}`}>
                  {lesson.difficulty}
                </span>
              </Link>
            )
          })}
          {lessons.length > 3 && (
            <p className="px-2 py-1 text-xs text-muted-foreground">
              + {lessons.length - 3} more lessons
            </p>
          )}
        </div>

        {/* CTA */}
        {nextLesson && (
          <Link
            href={`/learn/${course.id}/${nextLesson.id}`}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 self-start"
          >
            {completedCount === 0 ? 'Start course' : isComplete ? 'Review' : 'Continue'} →
          </Link>
        )}
      </div>
    </div>
  )
}
