import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LessonLayout from '@/components/lesson/LessonLayout'

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
}

type CourseLessonRef = { id: string; order_index: number; course_id: string }
type CourseRow = { id: string; title: string; lessons: CourseLessonRef[] }

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>
}) {
  const { courseId, lessonId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch lesson — exclude solution_code (never send to client)
  const { data: lessonRaw } = await supabase
    .from('lessons')
    .select('id, title, theory_markdown, exercise_prompt, starter_code, judge0_language_id, difficulty, order_index, course_id')
    .eq('id', lessonId)
    .eq('course_id', courseId)
    .eq('user_id', user.id)
    .single()

  if (!lessonRaw) notFound()

  const lesson = lessonRaw as unknown as LessonRow

  // Fetch course title and lesson list
  const { data: courseRaw } = await supabase
    .from('courses')
    .select('id, title, lessons(id, order_index, course_id)')
    .eq('id', courseId)
    .eq('user_id', user.id)
    .single()

  if (!courseRaw) notFound()

  const course = courseRaw as unknown as CourseRow

  // Determine next lesson
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
