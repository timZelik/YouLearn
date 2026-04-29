import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import CourseCard from '@/components/dashboard/CourseCard'
import StreakWidget from '@/components/dashboard/StreakWidget'
import { ThemeToggle } from '@/components/theme-toggle'

type LessonProgress = { status: string; best_score: number; attempts: number }
type Lesson = { id: string; title: string; difficulty: string; order_index: number; user_lesson_progress: LessonProgress[] | null }
type Course = { id: string; title: string; description: string; order_index: number; status: string; lessons: Lesson[] }

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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
        id, title, description, order_index, status,
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

  const displayName = profile?.full_name ?? user.email ?? 'You'
  const initials = getInitials(displayName)

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link href="/dashboard" className="text-base font-bold tracking-tight">
            YouLearn
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary dark:bg-primary/25">
                {initials}
              </div>
              <span className="hidden text-sm text-muted-foreground sm:block truncate max-w-32">
                {displayName}
              </span>
            </div>
            <form action="/api/auth/signout" method="POST">
              <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 flex flex-col gap-10">
        {/* Path header */}
        <div className="flex flex-col gap-1.5">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">Your learning path</p>
          <h1 className="text-[1.6rem] font-semibold tracking-tight leading-snug">
            {(learningPath as { title?: string } | null)?.title ?? 'Your Learning Path'}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            {(learningPath as { description?: string } | null)?.description}
          </p>
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
