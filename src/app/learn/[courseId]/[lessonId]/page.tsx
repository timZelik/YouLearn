import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LessonLayout from '@/components/lesson/LessonLayout'
import StreamingLessonView from '@/components/lesson/StreamingLessonView'

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

type CourseLessonRef = { id: string; order_index: number; course_id: string; content_status: string }
type CourseRow = { id: string; title: string; description: string; lessons: CourseLessonRef[] }

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>
}) {
  const { courseId, lessonId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: lessonRaw } = await supabase
    .from('lessons')
    .select('id, title, theory_markdown, exercise_prompt, starter_code, judge0_language_id, difficulty, order_index, course_id, content_status')
    .eq('id', lessonId)
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .single()

  if (!lessonRaw) notFound()

  const lesson = lessonRaw as unknown as LessonRow

  // Content not ready — stream it live to the client instead of blocking here
  if (lesson.content_status !== 'generated') {
    return <StreamingLessonView lessonId={lessonId} lessonTitle={lesson.title} />
  }

  const { data: courseRaw } = await supabase
    .from('courses')
    .select('id, title, description, lessons(id, order_index, course_id, content_status)')
    .eq('id', courseId)
    .eq('user_id', user.id)
    .single()

  if (!courseRaw) notFound()

  const course = courseRaw as unknown as CourseRow
  const sortedLessons = [...course.lessons].sort((a, b) => a.order_index - b.order_index)
  const currentIdx = sortedLessons.findIndex((l) => l.id === lessonId)
  const nextLesson = sortedLessons[currentIdx + 1] ?? null

  return (
    <LessonLayout
      lesson={lesson}
      courseTitle={course.title}
      nextLesson={nextLesson}
    />
  )
}
