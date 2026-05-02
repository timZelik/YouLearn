import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LessonLayout from '@/components/lesson/LessonLayout'
import StreamingLessonView from '@/components/lesson/StreamingLessonView'
import PathSidebar from '@/components/lesson/PathSidebar'

type LessonRow = {
  id: string
  title: string
  theory_markdown: string
  exercise_prompt: string
  starter_code: string
  judge0_language_id: number
  difficulty: string
  order_index: number
  course_id: string
  content_status: string
}

type LessonNav = {
  id: string
  title: string
  difficulty: string
  order_index: number
  content_status: string
  user_lesson_progress: { status: string }[] | null
}

type CourseNav = {
  id: string
  title: string
  order_index: number
  status: string
  lessons: LessonNav[]
}

type LearningPathRow = {
  id: string
  title: string
  courses: CourseNav[]
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>
}) {
  const { courseId, lessonId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch lesson content
  const { data: lessonRaw } = await supabase
    .from('lessons')
    .select('id, title, theory_markdown, exercise_prompt, starter_code, judge0_language_id, difficulty, order_index, course_id, content_status')
    .eq('id', lessonId)
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .single()

  if (!lessonRaw) notFound()
  const lesson = lessonRaw as unknown as LessonRow

  // Find which path this course belongs to (user may have multiple paths)
  const { data: courseRow } = await supabase
    .from('courses')
    .select('learning_path_id')
    .eq('id', courseId)
    .eq('user_id', user.id)
    .single()

  // Fetch the parent learning path with its full course/lesson tree for the sidebar
  const { data: pathRaw } = courseRow?.learning_path_id
    ? await supabase
        .from('learning_paths')
        .select(`
          id, title,
          courses (
            id, title, order_index, status,
            lessons (
              id, title, difficulty, order_index, content_status,
              user_lesson_progress (status)
            )
          )
        `)
        .eq('id', courseRow.learning_path_id)
        .single()
    : { data: null }

  const path = pathRaw as unknown as LearningPathRow | null

  // Build sidebar data
  const sidebarCourses = (path?.courses ?? [])
    .sort((a, b) => a.order_index - b.order_index)
    .map((c) => ({
      id: c.id,
      title: c.title,
      order_index: c.order_index,
      status: c.status,
      lessons: [...c.lessons]
        .sort((a, b) => a.order_index - b.order_index)
        .map((l) => ({
          id: l.id,
          title: l.title,
          difficulty: l.difficulty,
          order_index: l.order_index,
          content_status: l.content_status,
          progress_status: l.user_lesson_progress?.[0]?.status ?? 'not_started',
        })),
    }))

  const currentCourse = sidebarCourses.find((c) => c.id === courseId)
  const currentLessons = currentCourse?.lessons ?? []
  const currentIdx = currentLessons.findIndex((l) => l.id === lessonId)
  const nextLessonNav = currentLessons[currentIdx + 1] ?? null
  const nextLesson = nextLessonNav ? { id: nextLessonNav.id, course_id: courseId } : null

  const sidebar = (
    <PathSidebar
      pathTitle={path?.title ?? 'Your Learning Path'}
      courses={sidebarCourses}
      activeLessonId={lessonId}
      activeCourseId={courseId}
    />
  )

  // Content not ready — stream it live
  if (lesson.content_status !== 'generated') {
    return (
      <div className="flex h-screen overflow-hidden">
        {sidebar}
        <div className="flex-1 overflow-hidden">
          <StreamingLessonView lessonId={lessonId} lessonTitle={lesson.title} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebar}
      <div className="flex-1 overflow-hidden">
        <LessonLayout
          lesson={lesson}
          courseTitle={currentCourse?.title ?? ''}
          nextLesson={nextLesson}
        />
      </div>
    </div>
  )
}
