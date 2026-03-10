import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

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
          attempts: existing.attempts + 1,
          status: score === 100 ? 'completed' : 'in_progress',
        })
        .eq('user_id', user.id)
        .eq('lesson_id', lesson_id)
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
