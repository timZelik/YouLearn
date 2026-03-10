import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import CourseCard from '@/components/dashboard/CourseCard'
import StreakWidget from '@/components/dashboard/StreakWidget'

type LessonProgress = { status: string; best_score: number; attempts: number }
type Lesson = { id: string; title: string; difficulty: string; order_index: number; user_lesson_progress: LessonProgress[] | null }
type Course = { id: string; title: string; description: string; order_index: number; lessons: Lesson[] }

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, current_streak, longest_streak, last_activity_date, onboarding_completed')
    .eq('id', user.id)
    .single()

  if (!profile?.onboarding_completed) redirect('/onboarding')

  const { data: learningPath } = await supabase
    .from('learning_paths')
    .select(`
      id, title, description,
      courses (
        id, title, description, order_index,
        lessons (
          id, title, difficulty, order_index,
          user_lesson_progress (status, best_score, attempts)
        )
      )
    `)
    .eq('user_id', user.id)
    .single()

  const rawCourses = (learningPath?.courses ?? []) as unknown as Course[]
  const courses = [...rawCourses].sort((a, b) => a.order_index - b.order_index)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-bold">YouLearn</Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {profile?.full_name ?? user.email}
          </span>
          <form action="/api/auth/signout" method="POST">
            <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-8">
        {/* Path title */}
        <div>
          <h1 className="text-2xl font-bold">{(learningPath as { title?: string } | null)?.title ?? 'Your Learning Path'}</h1>
          <p className="text-muted-foreground mt-1">{(learningPath as { description?: string } | null)?.description}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Courses */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-4">
            <StreakWidget
              currentStreak={profile?.current_streak ?? 0}
              longestStreak={profile?.longest_streak ?? 0}
              lastActivityDate={profile?.last_activity_date ?? null}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
