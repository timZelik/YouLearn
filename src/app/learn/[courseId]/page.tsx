import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'

const DIFFICULTY_COLORS: Record<string, string> = {
  intro: 'bg-green-100 text-green-800',
  easy: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  hard: 'bg-orange-100 text-orange-800',
  capstone: 'bg-purple-100 text-purple-800',
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Dashboard
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium">{course.title}</span>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{course.title}</h1>
          <p className="text-muted-foreground mt-1">{course.description}</p>
        </div>

        <div className="flex flex-col gap-2">
          {lessons.map((lesson, i) => {
            const status = lesson.user_lesson_progress?.[0]?.status ?? 'not_started'
            const score = lesson.user_lesson_progress?.[0]?.best_score ?? 0

            return (
              <Link
                key={lesson.id}
                href={`/learn/${courseId}/${lesson.id}`}
                className="flex items-center gap-4 rounded-xl border bg-white p-4 hover:shadow-sm transition-shadow"
              >
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  status === 'completed'
                    ? 'bg-green-500 text-white'
                    : status === 'in_progress'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {status === 'completed' ? '✓' : i + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{lesson.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{lesson.exercise_prompt}</p>
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
