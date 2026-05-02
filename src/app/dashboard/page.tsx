import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import CourseCard from '@/components/dashboard/CourseCard'
import StreakWidget from '@/components/dashboard/StreakWidget'
import { ThemeToggle } from '@/components/theme-toggle'

type LessonProgress = { status: string; best_score: number; attempts: number }
type Lesson = {
  id: string
  title: string
  difficulty: string
  order_index: number
  user_lesson_progress: LessonProgress[] | null
}
type Course = {
  id: string
  title: string
  description: string
  order_index: number
  status: string
  lessons: Lesson[]
}
type Path = {
  id: string
  title: string
  description: string
  created_at: string
  courses: Course[]
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ path?: string; cap?: string }>
}) {
  const { path: requestedPathId, cap } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, current_streak, longest_streak, last_activity_date, onboarding_completed, paths_created, max_free_paths')
    .eq('id', user.id)
    .single()

  if (!profile?.onboarding_completed) redirect('/onboarding')

  const { data: pathsRaw } = await supabase
    .from('learning_paths')
    .select(`
      id, title, description, created_at,
      courses (
        id, title, description, order_index, status,
        lessons (
          id, title, difficulty, order_index,
          user_lesson_progress (status, best_score, attempts)
        )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const paths = (pathsRaw ?? []) as unknown as Path[]

  // Brand-new user with no paths yet (edge case after onboarding flag set but path insert failed)
  if (paths.length === 0) {
    redirect('/onboarding')
  }

  const activePath =
    paths.find((p) => p.id === requestedPathId) ?? paths[0]

  const courses = [...activePath.courses].sort((a, b) => a.order_index - b.order_index)

  const displayName = profile?.full_name ?? user.email ?? 'You'
  const initials = getInitials(displayName)
  const capReached = profile.paths_created >= profile.max_free_paths
  const showCapBanner = cap === 'reached'

  return (
    <div className="min-h-screen bg-background text-foreground">
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

      <main className="mx-auto max-w-5xl px-6 py-10 flex flex-col gap-8">
        {showCapBanner && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            You&apos;ve used all {profile.max_free_paths} of your free paths. Finish a current path or contact us to add more.
          </div>
        )}

        {/* Path tabs (only when multiple) */}
        {paths.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            {paths.map((p) => {
              const isActive = p.id === activePath.id
              return (
                <Link
                  key={p.id}
                  href={`/dashboard?path=${p.id}`}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  <span className="truncate max-w-[180px] inline-block align-middle">{p.title}</span>
                </Link>
              )
            })}
          </div>
        )}

        {/* Path header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1.5 min-w-0">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {paths.length > 1 ? `Path ${paths.findIndex((p) => p.id === activePath.id) + 1} of ${paths.length}` : 'Your learning path'}
            </p>
            <h1 className="text-[1.6rem] font-semibold tracking-tight leading-snug">
              {activePath.title}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
              {activePath.description}
            </p>
          </div>
          <NewPathButton capReached={capReached} pathsUsed={profile.paths_created} pathsMax={profile.max_free_paths} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 flex flex-col gap-4">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>

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

function NewPathButton({
  capReached, pathsUsed, pathsMax,
}: {
  capReached: boolean
  pathsUsed: number
  pathsMax: number
}) {
  if (capReached) {
    return (
      <div
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted px-3.5 py-2 text-xs text-muted-foreground"
        title="Free path limit reached"
      >
        <span className="text-base leading-none">+</span>
        New topic
        <span className="ml-1 rounded-full bg-background/60 px-1.5 py-0.5 text-[10px] font-medium">
          {pathsUsed}/{pathsMax}
        </span>
      </div>
    )
  }

  return (
    <Link
      href="/paths/new"
      className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 self-start"
    >
      <span className="text-base leading-none">+</span>
      New topic
      <span className="ml-1 rounded-full bg-primary-foreground/15 px-1.5 py-0.5 text-[10px] font-medium">
        {pathsUsed}/{pathsMax}
      </span>
    </Link>
  )
}
