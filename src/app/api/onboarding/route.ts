import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuthenticatedUser } from '@/lib/auth/requireAuthenticatedUser'
import { createServiceClient } from '@/lib/supabase/server'
import { generateLearningPath } from '@/lib/claude/generateLearningPath'

const OnboardingSchema = z.object({
  background: z.string().min(10, 'Tell us more about your background'),
  goals: z.string().min(10, 'Tell us more about your goals'),
  preferred_language: z.string().min(1),
  experience_level: z.enum(['beginner', 'intermediate', 'advanced']),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser()
    if (!auth.authenticated) return auth.response

    const { user, supabase } = auth.context

    const body = await request.json()
    const data = OnboardingSchema.parse(body)

    const { error: onboardingError } = await supabase
      .from('onboarding_responses')
      .insert({ user_id: user.id, ...data })

    if (onboardingError) {
      console.error('Onboarding insert error:', onboardingError)
      return NextResponse.json({ error: 'Failed to save onboarding' }, { status: 500 })
    }

    const learningPath = await generateLearningPath(data)

    const serviceClient = await createServiceClient()
    const { data: pathId, error: rpcError } = await serviceClient.rpc('create_learning_path', {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload: JSON.parse(JSON.stringify({
        user_id: user.id,
        title: learningPath.title,
        description: learningPath.description,
        courses: learningPath.courses,
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

    return NextResponse.json({ success: true, path_id: pathId })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error('Onboarding API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
