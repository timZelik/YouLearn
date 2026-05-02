import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'

export const maxDuration = 60 // seconds — stub generation + background kick-off

import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generatePathStub, JUDGE0_LANGUAGE_IDS } from '@/lib/claude/generateLearningPath'
import { generateCourseContentBatch } from '@/lib/generation/generateCourseContent'
import { validatePrompt } from '@/lib/validation/validatePrompt'

const OnboardingSchema = z.object({
  background: z.string().min(10, 'Tell us more about your background'),
  goals: z.string().min(10, 'Tell us more about your goals'),
  preferred_language: z.string().min(1),
  experience_level: z.enum(['beginner', 'intermediate', 'advanced']),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check free tier cap
    const { data: profile } = await supabase
      .from('profiles')
      .select('paths_created, max_free_paths')
      .eq('id', user.id)
      .single()

    if (profile && profile.paths_created >= profile.max_free_paths) {
      return NextResponse.json({ error: 'Free path limit reached' }, { status: 403 })
    }

    const body = await request.json()
    const data = OnboardingSchema.parse(body)

    // Validate prompt before spending any tokens
    const validation = await validatePrompt(data.background, data.goals)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.reason }, { status: 422 })
    }

    await supabase.from('onboarding_responses').insert({ user_id: user.id, ...data })

    // Generate only stubs — fast and cheap (uses Haiku)
    const stub = await generatePathStub(data)

    const judge0LanguageId = JUDGE0_LANGUAGE_IDS[data.preferred_language.toLowerCase()] ?? 71

    const serviceClient = await createServiceClient()
    const { data: pathId, error: rpcError } = await serviceClient.rpc('create_path_stub', {
      payload: JSON.parse(JSON.stringify({
        user_id: user.id,
        title: stub.title,
        description: stub.description,
        judge0_language_id: judge0LanguageId,
        background: data.background,
        goals: data.goals,
        preferred_language: data.preferred_language,
        courses: stub.courses,
      })),
    })

    if (rpcError) {
      console.error('RPC error:', rpcError)
      return NextResponse.json({ error: 'Failed to create learning path' }, { status: 500 })
    }

    await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', user.id)

    // Eagerly generate the first course's lessons in the background.
    // User goes to dashboard immediately; by the time they click a lesson it's ready.
    const { data: firstCourse } = await serviceClient
      .from('courses')
      .select('id, title, description')
      .eq('learning_path_id', pathId)
      .eq('order_index', 0)
      .single()

    if (firstCourse) {
      // Use the just-submitted form data — it's authoritative for this path,
      // and `data` is in scope, so no extra DB roundtrip needed.
      waitUntil(
        generateCourseContentBatch(
          {
            courseId: firstCourse.id,
            courseTitle: firstCourse.title,
            courseDescription: firstCourse.description,
            language: data.preferred_language,
            userBackground: data.background,
            userGoals: data.goals,
            fromOrderIndex: 0,
          },
          serviceClient
        ).catch((err) => console.error('Background lesson generation failed:', err))
      )
    }

    return NextResponse.json({ success: true, path_id: pathId })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error('Onboarding API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
