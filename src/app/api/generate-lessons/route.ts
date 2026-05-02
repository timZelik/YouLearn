import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateCourseContentBatch } from '@/lib/generation/generateCourseContent'

const GenerateSchema = z.object({
  course_id: z.string().uuid(),
  from_order_index: z.number().int().min(0).default(0),
})

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { course_id, from_order_index } = GenerateSchema.parse(body)

    const { data: course } = await supabase
      .from('courses')
      .select('id, title, description, learning_path_id')
      .eq('id', course_id)
      .eq('user_id', user.id)
      .single()

    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

    // Per-path context (not latest onboarding) so the right topic is used
    // when a user has multiple paths.
    const { data: pathCtx } = await supabase
      .from('learning_paths')
      .select('background, goals, preferred_language')
      .eq('id', course.learning_path_id)
      .single()

    const serviceClient = await createServiceClient()
    const generated = await generateCourseContentBatch(
      {
        courseId: course_id,
        courseTitle: course.title,
        courseDescription: course.description,
        language: pathCtx?.preferred_language ?? 'python',
        userBackground: pathCtx?.background ?? '',
        userGoals: pathCtx?.goals ?? '',
        fromOrderIndex: from_order_index,
      },
      serviceClient
    )

    return NextResponse.json({ success: true, generated: generated.length })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error('Generate lessons error:', error)
    return NextResponse.json({ error: 'Failed to generate lessons' }, { status: 500 })
  }
}
