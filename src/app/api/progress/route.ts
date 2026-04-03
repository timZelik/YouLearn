import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuthenticatedUser } from '@/lib/auth/requireAuthenticatedUser'

const ProgressSchema = z.object({
  lesson_id: z.string().uuid(),
  score: z.number().int().min(0).max(100),
})

function computeNewStreak(currentStreak: number, lastActivityDate: string | null): number {
  const today = new Date().toISOString().split('T')[0]

  if (lastActivityDate === today) return currentStreak

  if (!lastActivityDate) return 1

  const daysSinceLastActivity = Math.floor(
    (new Date(today).getTime() - new Date(lastActivityDate).getTime()) / (1000 * 60 * 60 * 24)
  )

  return daysSinceLastActivity === 1 ? currentStreak + 1 : 1
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser()
    if (!auth.authenticated) return auth.response

    const { user, supabase } = auth.context

    const body = await request.json()
    const { lesson_id, score } = ProgressSchema.parse(body)

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('current_streak, longest_streak, last_activity_date')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const today = new Date().toISOString().split('T')[0]
    const newStreak = computeNewStreak(profile.current_streak, profile.last_activity_date)
    const newLongest = Math.max(newStreak, profile.longest_streak)

    await supabase
      .from('profiles')
      .update({ current_streak: newStreak, longest_streak: newLongest, last_activity_date: today })
      .eq('id', user.id)

    const { data: existingProgress } = await supabase
      .from('user_lesson_progress')
      .select('best_score, attempts')
      .eq('user_id', user.id)
      .eq('lesson_id', lesson_id)
      .single()

    if (existingProgress) {
      await supabase
        .from('user_lesson_progress')
        .update({
          best_score: Math.max(existingProgress.best_score, score),
          attempts: existingProgress.attempts + 1,
          status: score === 100 ? 'completed' : 'in_progress',
        })
        .eq('user_id', user.id)
        .eq('lesson_id', lesson_id)
    }

    return NextResponse.json({ current_streak: newStreak, longest_streak: newLongest })
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
    const auth = await requireAuthenticatedUser()
    if (!auth.authenticated) return auth.response

    const { user, supabase } = auth.context

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
