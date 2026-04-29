import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateCourseContentBatch } from '@/lib/generation/generateCourseContent'

const ProgressSchema = z.object({
  lesson_id: z.string().uuid(),
  score: z.number().int().min(0).max(100),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { lesson_id, score } = ProgressSchema.parse(body)

    // Get current profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('current_streak, longest_streak, last_activity_date')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Streak logic
    const today = new Date().toISOString().split('T')[0]
    const lastActivity = profile.last_activity_date
    let newStreak = profile.current_streak

    if (lastActivity === today) {
      // Already active today — no change
    } else if (lastActivity) {
      const lastDate = new Date(lastActivity)
      const todayDate = new Date(today)
      const diffDays = Math.floor(
        (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      if (diffDays === 1) {
        newStreak = profile.current_streak + 1
      } else {
        newStreak = 1 // Streak broken
      }
    } else {
      newStreak = 1 // First activity
    }

    const newLongest = Math.max(newStreak, profile.longest_streak)

    // Update profile
    await supabase
      .from('profiles')
      .update({
        current_streak: newStreak,
        longest_streak: newLongest,
        last_activity_date: today,
      })
      .eq('id', user.id)

    // Update lesson progress best score
    const { data: existing } = await supabase
      .from('user_lesson_progress')
      .select('best_score, attempts')
      .eq('user_id', user.id)
      .eq('lesson_id', lesson_id)
      .single()

    if (existing) {
      await supabase
        .from('user_lesson_progress')
        .update({
          best_score: Math.max(existing.best_score, score),
          status: score === 100 ? 'completed' : 'in_progress',
        })
        .eq('user_id', user.id)
        .eq('lesson_id', lesson_id)
    }

    // If lesson just completed, check if the whole course is done
    // and if so, kick off generation of the next course in the background
    if (score === 100) {
      waitUntil(triggerNextCourseIfReady(user.id, lesson_id).catch(console.error))
    }

    return NextResponse.json({
      current_streak: newStreak,
      longest_streak: newLongest,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error('Progress API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('current_streak, longest_streak, last_activity_date')
      .eq('id', user.id)
      .single()

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
      .order('order_index', { referencedTable: 'courses' })
      .single()

    return NextResponse.json({ profile, learning_path: learningPath })
  } catch (error) {
    console.error('Progress GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * After a lesson is completed, check if all lessons in its course are done.
 * If so, find the next pending course and kick off generation for it.
 * Runs fire-and-forget — never blocks the response.
 */
async function triggerNextCourseIfReady(userId: string, lessonId: string) {
  const serviceClient = await createServiceClient()

  // Get the course this lesson belongs to
  const { data: lesson } = await serviceClient
    .from('lessons')
    .select('course_id')
    .eq('id', lessonId)
    .single()
  if (!lesson) return

  // Count remaining incomplete lessons in this course
  const { count: incomplete } = await serviceClient
    .from('user_lesson_progress')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('course_id', lesson.course_id)
    .neq('status', 'completed')

  // Also count lessons that have no progress row yet (not started)
  const { count: totalLessons } = await serviceClient
    .from('lessons')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', lesson.course_id)

  const { count: progressRows } = await serviceClient
    .from('user_lesson_progress')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('course_id', lesson.course_id)

  const allDone = (incomplete ?? 0) === 0 && (progressRows ?? 0) === (totalLessons ?? 1)
  if (!allDone) return

  // Find the current course's order_index
  const { data: currentCourse } = await serviceClient
    .from('courses')
    .select('order_index, learning_path_id')
    .eq('id', lesson.course_id)
    .single()
  if (!currentCourse) return

  // Find the next course in the same path
  const { data: nextCourse } = await serviceClient
    .from('courses')
    .select('id, title, description, status')
    .eq('learning_path_id', currentCourse.learning_path_id)
    .eq('order_index', currentCourse.order_index + 1)
    .single()

  if (!nextCourse || nextCourse.status !== 'pending') return

  // Fetch user context for generation
  const { data: onboarding } = await serviceClient
    .from('onboarding_responses')
    .select('background, goals, preferred_language')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  await generateCourseContentBatch(
    {
      courseId: nextCourse.id,
      courseTitle: nextCourse.title,
      courseDescription: nextCourse.description,
      language: onboarding?.preferred_language ?? 'python',
      userBackground: onboarding?.background ?? '',
      userGoals: onboarding?.goals ?? '',
      fromOrderIndex: 0,
    },
    serviceClient
  )
}
