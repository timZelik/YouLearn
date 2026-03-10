import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { executeCode, normalizeOutput } from '@/lib/judge0/execute'
import { TestResult } from '@/types/learning'

const ExecuteSchema = z.object({
  lesson_id: z.string().uuid(),
  code: z.string().min(1),
  mode: z.enum(['run', 'submit']),
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
    const { lesson_id, code, mode } = ExecuteSchema.parse(body)

    // Verify lesson belongs to this user
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id, judge0_language_id, course_id')
      .eq('id', lesson_id)
      .eq('user_id', user.id)
      .single()

    if (lessonError || !lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    // Fetch test cases — use service_role to include hidden ones
    const serviceClient = await createServiceClient()
    const { data: testCases, error: tcError } = await serviceClient
      .from('test_cases')
      .select('id, input, expected_output, is_hidden, order_index')
      .eq('lesson_id', lesson_id)
      .order('order_index')

    if (tcError || !testCases) {
      return NextResponse.json({ error: 'Failed to fetch test cases' }, { status: 500 })
    }

    // For "run" mode, only use visible test cases
    const casesToRun = mode === 'run' ? testCases.filter((tc) => !tc.is_hidden) : testCases

    // Execute all test cases in parallel
    const results = await Promise.all(
      casesToRun.map(async (tc): Promise<TestResult> => {
        try {
          const result = await executeCode({
            source_code: code,
            language_id: lesson.judge0_language_id,
            stdin: tc.input,
          })

          const actual = normalizeOutput(result.stdout)
          const expected = normalizeOutput(tc.expected_output)
          const passed = actual === expected && result.status.id === 3

          return {
            input: tc.input,
            expected_output: expected,
            actual_output: actual || normalizeOutput(result.stderr) || normalizeOutput(result.compile_output),
            passed,
            is_hidden: tc.is_hidden,
            error: result.status.id !== 3 ? result.status.description : undefined,
          }
        } catch (err) {
          return {
            input: tc.input,
            expected_output: normalizeOutput(tc.expected_output),
            actual_output: '',
            passed: false,
            is_hidden: tc.is_hidden,
            error: err instanceof Error ? err.message : 'Execution failed',
          }
        }
      })
    )

    const allPassed = results.every((r) => r.passed)

    // Save submission
    const { data: submission, error: subError } = await supabase
      .from('submissions')
      .insert({
        user_id: user.id,
        lesson_id,
        code,
        test_results: results as unknown as import('@/types/database').Json,
        all_passed: allPassed,
        status: mode,
      })
      .select('id')
      .single()

    if (subError) {
      console.error('Submission insert error:', subError)
    }

    // Update lesson progress
    if (mode === 'submit') {
      await supabase
        .from('user_lesson_progress')
        .upsert(
          {
            user_id: user.id,
            lesson_id,
            course_id: lesson.course_id,
            status: allPassed ? 'completed' : 'in_progress',
            attempts: 1,
          },
          { onConflict: 'user_id,lesson_id', ignoreDuplicates: false }
        )
    }

    return NextResponse.json({
      test_results: results,
      all_passed: allPassed,
      submission_id: submission?.id ?? null,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error('Execute API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
