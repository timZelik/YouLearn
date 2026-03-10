import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { generateFeedback } from '@/lib/claude/generateFeedback'
import { TestResult } from '@/types/learning'

const FeedbackSchema = z.object({
  submission_id: z.string().uuid(),
  lesson_id: z.string().uuid(),
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
    const { submission_id, lesson_id } = FeedbackSchema.parse(body)

    // Fetch submission (verify ownership)
    const { data: submission, error: subError } = await supabase
      .from('submissions')
      .select('id, code, test_results, all_passed')
      .eq('id', submission_id)
      .eq('user_id', user.id)
      .single()

    if (subError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Fetch lesson context
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('exercise_prompt, starter_code, judge0_language_id')
      .eq('id', lesson_id)
      .eq('user_id', user.id)
      .single()

    if (lessonError || !lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    const languageMap: Record<number, string> = {
      71: 'python', 63: 'javascript', 74: 'typescript',
      62: 'java', 54: 'cpp', 50: 'c', 60: 'go',
      73: 'rust', 72: 'ruby', 83: 'swift',
    }
    const language = languageMap[lesson.judge0_language_id] ?? 'code'

    const feedback = await generateFeedback({
      exercisePrompt: lesson.exercise_prompt,
      starterCode: lesson.starter_code,
      submittedCode: submission.code,
      testResults: submission.test_results as unknown as TestResult[],
      language,
      allPassed: submission.all_passed,
    })

    // Save feedback
    const { data: savedFeedback, error: fbError } = await supabase
      .from('ai_feedback')
      .insert({
        submission_id,
        user_id: user.id,
        ...feedback,
      })
      .select()
      .single()

    if (fbError) {
      console.error('Feedback insert error:', fbError)
    }

    return NextResponse.json({ feedback: savedFeedback ?? feedback })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error('Feedback API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
