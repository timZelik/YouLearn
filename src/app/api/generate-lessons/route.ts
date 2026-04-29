import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateLessonBatch } from '@/lib/claude/generateLessonContent'

const GenerateSchema = z.object({
  course_id: z.string().uuid(),
  // Start generating from this order_index, up to 3 lessons
  from_order_index: z.number().int().min(0).default(0),
})

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { course_id, from_order_index } = GenerateSchema.parse(body)

    // Fetch course info (verify ownership)
    const { data: course } = await supabase
      .from('courses')
      .select('id, title, description, status, learning_path_id')
      .eq('id', course_id)
      .eq('user_id', user.id)
      .single()

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Fetch pending lesson stubs in this batch (up to 3)
    const { data: stubs } = await supabase
      .from('lessons')
      .select('id, title, difficulty, order_index, content_status')
      .eq('course_id', course_id)
      .eq('user_id', user.id)
      .eq('content_status', 'pending')
      .gte('order_index', from_order_index)
      .order('order_index')
      .limit(3)

    if (!stubs || stubs.length === 0) {
      return NextResponse.json({ message: 'No pending lessons to generate' })
    }

    // Mark as 'generating' to prevent duplicate calls on refresh
    const serviceClient = await createServiceClient()
    await serviceClient
      .from('lessons')
      .update({ content_status: 'generating' })
      .in('id', stubs.map((s) => s.id))

    // Fetch user's onboarding data for context
    const { data: onboarding } = await supabase
      .from('onboarding_responses')
      .select('background, goals, preferred_language')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const language = onboarding?.preferred_language ?? 'python'
    const judge0LanguageId = stubs[0]
      ? await getLanguageId(supabase, stubs[0].id)
      : 71

    // Generate content for all stubs in one Claude call
    const generated = await generateLessonBatch({
      courseTitle: course.title,
      courseDescription: course.description,
      language,
      judge0LanguageId,
      userBackground: onboarding?.background ?? '',
      userGoals: onboarding?.goals ?? '',
      lessons: stubs.map((s) => ({
        id: s.id,
        title: s.title,
        difficulty: s.difficulty,
        order_index: s.order_index,
      })),
    })

    // Save generated content
    for (let i = 0; i < stubs.length; i++) {
      const stub = stubs[i]
      const content = generated[i]
      if (!stub || !content) continue

      // Insert test cases
      const { data: lessonRow } = await serviceClient
        .from('lessons')
        .update({
          theory_markdown: content.theory_markdown,
          exercise_prompt: content.exercise_prompt,
          starter_code: content.starter_code,
          solution_code: content.solution_code,
          content_status: 'generated',
        })
        .eq('id', stub.id)
        .select('id')
        .single()

      if (lessonRow) {
        await serviceClient.from('test_cases').insert(
          content.test_cases.map((tc) => ({
            lesson_id: stub.id,
            input: tc.input,
            expected_output: tc.expected_output,
            is_hidden: tc.is_hidden,
            order_index: tc.order_index,
          }))
        )
      }
    }

    // Mark course as generated if it was pending
    if (course.status === 'pending') {
      await serviceClient
        .from('courses')
        .update({ status: 'generated' })
        .eq('id', course_id)
    }

    return NextResponse.json({ success: true, generated: stubs.length })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error('Generate lessons error:', error)

    // Reset generating status on failure so user can retry
    try {
      const { course_id } = body
      if (course_id) {
        const serviceClient = await createServiceClient()
        await serviceClient
          .from('lessons')
          .update({ content_status: 'pending' })
          .eq('course_id', course_id)
          .eq('content_status', 'generating')
      }
    } catch { /* best effort */ }

    return NextResponse.json({ error: 'Failed to generate lessons' }, { status: 500 })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getLanguageId(supabase: any, lessonId: string): Promise<number> {
  const { data } = await supabase
    .from('lessons')
    .select('judge0_language_id')
    .eq('id', lessonId)
    .single()
  return data?.judge0_language_id ?? 71
}
