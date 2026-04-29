import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'

const DIFFICULTY_COLORS: Record<string, string> = {
  intro:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  easy:     'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400',
  medium:   'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  hard:     'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
  capstone: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400',
}

type LessonProgress = { status: string; best_score: number }
type Lesson = {
  id: string
  title: string
  difficulty: string
  order_index: number
  exercise_prompt: string
  user_lesson_progress: LessonProgress[] | null
}

export default async function CourseOverviewPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: courseRaw } = await supabase
    .from('courses')
    .select(`
      id, title, description, order_index,
      lessons (
        id, title, difficulty, order_index, exercise_prompt,
        user_lesson_progress (status, best_score)
      )
    `)
    .eq('id', courseId)
    .eq('user_id', user.id)
    .single()

  if (!courseRaw) notFound()

  const course = courseRaw as unknown as {
    id: string
    title: string
    description: string
    order_index: number
    lessons: Lesson[]
  }

  const lessons = [...course.lessons].sort((a, b) => a.order_index - b.order_index)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-md px-6 py-3 flex items-center gap-3">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Dashboard
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium truncate">{course.title}</span>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{course.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{course.description}</p>
        </div>

        <div className="flex flex-col gap-2">
          {lessons.map((lesson, i) => {
            const status = lesson.user_lesson_progress?.[0]?.status ?? 'not_started'
            const score = lesson.user_lesson_progress?.[0]?.best_score ?? 0

            return (
              <Link
                key={lesson.id}
                href={`/learn/${courseId}/${lesson.id}`}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent"
              >
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  status === 'completed'
                    ? 'bg-emerald-500 text-white'
                    : status === 'in_progress'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {status === 'completed' ? '✓' : i + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{lesson.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{lesson.exercise_prompt}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {status === 'completed' && (
                    <span className="text-xs text-muted-foreground">{score}/100</span>
                  )}
                  <Badge className={DIFFICULTY_COLORS[lesson.difficulty] ?? ''}>
                    {lesson.difficulty}
                  </Badge>
                </div>
              </Link>
            )
          })}
        </div>
      </main>
    </div>
  )
}
