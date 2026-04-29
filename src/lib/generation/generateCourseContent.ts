import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { SupabaseClient } from '@supabase/supabase-js'

const client = new Anthropic()

const StructuredContentSchema = z.object({
  exercise_prompt: z.string().min(20),
  starter_code: z.string(),
  solution_code: z.string().min(1),
  test_cases: z.array(z.object({
    input: z.string(),
    expected_output: z.string(),
    is_hidden: z.boolean(),
    order_index: z.number().int(),
  })).length(4),
})

export interface LessonStubRow {
  id: string
  title: string
  difficulty: string
  order_index: number
  judge0_language_id: number
}

export interface CourseContext {
  courseId: string
  courseTitle: string
  courseDescription: string
  language: string
  userBackground: string
  userGoals: string
  fromOrderIndex?: number
}

/**
 * Generates content for up to 3 pending lessons in a course.
 * Splits generation into two Claude calls per lesson:
 *   1. theory_markdown — streaming-friendly plain text
 *   2. exercise + code + test cases — structured JSON
 *
 * Returns the generated lesson IDs.
 */
export async function generateCourseContentBatch(
  ctx: CourseContext,
  serviceClient: SupabaseClient
): Promise<string[]> {
  const fromIdx = ctx.fromOrderIndex ?? 0

  // Fetch pending stubs
  const { data: stubs } = await serviceClient
    .from('lessons')
    .select('id, title, difficulty, order_index, judge0_language_id')
    .eq('course_id', ctx.courseId)
    .eq('content_status', 'pending')
    .gte('order_index', fromIdx)
    .order('order_index')
    .limit(3)

  if (!stubs || stubs.length === 0) return []

  // Lock stubs
  await serviceClient
    .from('lessons')
    .update({ content_status: 'generating' })
    .in('id', stubs.map((s: LessonStubRow) => s.id))

  const generated: string[] = []

  try {
    for (const stub of stubs as LessonStubRow[]) {
      await generateSingleLesson(stub, ctx, serviceClient)
      generated.push(stub.id)
    }

    // Mark course as generated if all lessons done
    const { count } = await serviceClient
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', ctx.courseId)
      .eq('content_status', 'pending')

    if ((count ?? 0) === 0) {
      await serviceClient
        .from('courses')
        .update({ status: 'generated' })
        .eq('id', ctx.courseId)
    }
  } catch (err) {
    // Reset locks on failure
    await serviceClient
      .from('lessons')
      .update({ content_status: 'pending' })
      .in('id', stubs.map((s: LessonStubRow) => s.id).filter((id: string) => !generated.includes(id)))
    throw err
  }

  return generated
}

async function generateSingleLesson(
  stub: LessonStubRow,
  ctx: CourseContext,
  serviceClient: SupabaseClient
) {
  const langName = getLanguageName(stub.judge0_language_id)

  // Call 1: theory markdown (plain text, fast)
  const theoryMsg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Write a programming lesson in markdown for:

LESSON: "${stub.title}" (difficulty: ${stub.difficulty})
COURSE: ${ctx.courseTitle}
LANGUAGE: ${langName}
STUDENT BACKGROUND: ${ctx.userBackground}
STUDENT GOALS: ${ctx.userGoals}

Write 200–350 words of clear theory with at least one \`\`\`${langName} code example.
Return ONLY the markdown content, no preamble.`,
    }],
  })

  const theory = theoryMsg.content[0].type === 'text' ? theoryMsg.content[0].text : ''

  // Call 2: exercise + code + test cases (structured JSON)
  const structuredMsg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: `Based on this lesson theory for "${stub.title}" in ${langName}:

${theory}

Return ONLY valid JSON (no markdown fences):
{
  "exercise_prompt": "string (2-3 sentence coding challenge based on the theory)",
  "starter_code": "string (skeleton with TODO comments that compiles but doesn't solve)",
  "solution_code": "string (complete working solution)",
  "test_cases": [
    {"input": "string", "expected_output": "string", "is_hidden": false, "order_index": 0},
    {"input": "string", "expected_output": "string", "is_hidden": false, "order_index": 1},
    {"input": "string", "expected_output": "string", "is_hidden": true, "order_index": 2},
    {"input": "string", "expected_output": "string", "is_hidden": true, "order_index": 3}
  ]
}

RULES: test_cases use stdin/stdout. solution_code must pass all 4 tests on Judge0 language_id ${stub.judge0_language_id}.`,
    }],
  })

  const structuredRaw = structuredMsg.content[0].type === 'text'
    ? structuredMsg.content[0].text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    : '{}'

  const structured = StructuredContentSchema.parse(JSON.parse(structuredRaw))

  // Save to DB
  await serviceClient
    .from('lessons')
    .update({
      theory_markdown: theory,
      exercise_prompt: structured.exercise_prompt,
      starter_code: structured.starter_code,
      solution_code: structured.solution_code,
      content_status: 'generated',
    })
    .eq('id', stub.id)

  await serviceClient.from('test_cases').insert(
    structured.test_cases.map((tc) => ({
      lesson_id: stub.id,
      input: tc.input,
      expected_output: tc.expected_output,
      is_hidden: tc.is_hidden,
      order_index: tc.order_index,
    }))
  )
}

/** Stream theory_markdown for a single lesson via SSE. Saves full content when done. */
export async function streamLessonGeneration(
  stub: LessonStubRow,
  ctx: CourseContext,
  serviceClient: SupabaseClient,
  onChunk: (text: string) => void
): Promise<void> {
  const langName = getLanguageName(stub.judge0_language_id)

  // Mark generating
  await serviceClient
    .from('lessons')
    .update({ content_status: 'generating' })
    .eq('id', stub.id)

  let theory = ''

  try {
    // Stream theory
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Write a programming lesson in markdown for:

LESSON: "${stub.title}" (difficulty: ${stub.difficulty})
COURSE: ${ctx.courseTitle}
LANGUAGE: ${langName}
STUDENT BACKGROUND: ${ctx.userBackground}
STUDENT GOALS: ${ctx.userGoals}

Write 200–350 words of clear theory with at least one \`\`\`${langName} code example.
Return ONLY the markdown content, no preamble.`,
      }],
    })

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        theory += event.delta.text
        onChunk(event.delta.text)
      }
    }

    // Generate structured content
    const structuredMsg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: `Based on this lesson theory for "${stub.title}" in ${langName}:

${theory}

Return ONLY valid JSON (no markdown fences):
{
  "exercise_prompt": "string",
  "starter_code": "string",
  "solution_code": "string",
  "test_cases": [
    {"input": "string", "expected_output": "string", "is_hidden": false, "order_index": 0},
    {"input": "string", "expected_output": "string", "is_hidden": false, "order_index": 1},
    {"input": "string", "expected_output": "string", "is_hidden": true, "order_index": 2},
    {"input": "string", "expected_output": "string", "is_hidden": true, "order_index": 3}
  ]
}`,
      }],
    })

    const raw = structuredMsg.content[0].type === 'text'
      ? structuredMsg.content[0].text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      : '{}'

    const structured = StructuredContentSchema.parse(JSON.parse(raw))

    await serviceClient
      .from('lessons')
      .update({
        theory_markdown: theory,
        exercise_prompt: structured.exercise_prompt,
        starter_code: structured.starter_code,
        solution_code: structured.solution_code,
        content_status: 'generated',
      })
      .eq('id', stub.id)

    await serviceClient.from('test_cases').insert(
      structured.test_cases.map((tc) => ({
        lesson_id: stub.id,
        input: tc.input,
        expected_output: tc.expected_output,
        is_hidden: tc.is_hidden,
        order_index: tc.order_index,
      }))
    )

    onChunk('\n\n__DONE__')
  } catch (err) {
    await serviceClient
      .from('lessons')
      .update({ content_status: 'pending' })
      .eq('id', stub.id)
    throw err
  }
}

function getLanguageName(languageId: number): string {
  const map: Record<number, string> = {
    71: 'python', 63: 'javascript', 74: 'typescript',
    62: 'java', 54: 'cpp', 50: 'c', 60: 'go',
    73: 'rust', 72: 'ruby', 83: 'swift',
  }
  return map[languageId] ?? 'python'
}
