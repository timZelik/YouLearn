import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
    lessons: Lesson[]
  }
}

const DIFFICULTY_COLORS: Record<string, string> = {
  intro: 'bg-green-100 text-green-800',
  easy: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  hard: 'bg-orange-100 text-orange-800',
  capstone: 'bg-purple-100 text-purple-800',
}

export default function CourseCard({ course }: CourseCardProps) {
  const lessons = [...course.lessons].sort((a, b) => a.order_index - b.order_index)
  const completedCount = lessons.filter(
    (l) => l.user_lesson_progress?.[0]?.status === 'completed'
  ).length
  const progress = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0

  // Find first incomplete lesson
  const nextLesson = lessons.find(
    (l) => l.user_lesson_progress?.[0]?.status !== 'completed'
  ) ?? lessons[0]

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-start gap-4">
        <div className="flex flex-col gap-1 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Course {course.order_index + 1}</span>
            {progress === 100 && (
              <Badge className="bg-green-100 text-green-800 text-xs">Completed</Badge>
            )}
          </div>
          <CardTitle className="text-base leading-snug">{course.title}</CardTitle>
          <CardDescription className="text-sm line-clamp-2">{course.description}</CardDescription>
        </div>
        <ProgressRing value={progress} size={48} strokeWidth={5} />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="text-sm text-muted-foreground">
          {completedCount} / {lessons.length} lessons completed
        </div>

        {/* Lesson list */}
        <div className="flex flex-col gap-1">
          {lessons.slice(0, 3).map((lesson) => {
            const status = lesson.user_lesson_progress?.[0]?.status ?? 'not_started'
            return (
              <Link
                key={lesson.id}
                href={`/learn/${course.id}/${lesson.id}`}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-50 transition-colors"
              >
                <span className={`h-4 w-4 rounded-full flex-shrink-0 ${
                  status === 'completed'
                    ? 'bg-green-500'
                    : status === 'in_progress'
                    ? 'bg-blue-400'
                    : 'bg-gray-200'
                }`} />
                <span className="flex-1 truncate">{lesson.title}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${DIFFICULTY_COLORS[lesson.difficulty] ?? ''}`}>
                  {lesson.difficulty}
                </span>
              </Link>
            )
          })}
          {lessons.length > 3 && (
            <p className="text-xs text-muted-foreground px-2">+ {lessons.length - 3} more lessons</p>
          )}
        </div>

        {nextLesson && (
          <Link
            href={`/learn/${course.id}/${nextLesson.id}`}
            className="mt-1 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            {completedCount === 0 ? 'Start course' : progress === 100 ? 'Review' : 'Continue'}
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
