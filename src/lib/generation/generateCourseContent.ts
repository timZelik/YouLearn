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

function theoryPrompt(stub: LessonStubRow, ctx: CourseContext, langName: string) {
  return `You are an enthusiastic coding tutor writing a short lesson for a real student.

LESSON: "${stub.title}" (${stub.difficulty} level)
COURSE: ${ctx.courseTitle}
LANGUAGE: ${langName}
STUDENT BACKGROUND: ${ctx.userBackground}
STUDENT GOALS: ${ctx.userGoals}

Write 200–300 words of lesson content in markdown. Follow these rules strictly:
- Use a warm, conversational tone — like explaining to a smart friend, not a textbook
- Open with a one-sentence real-world analogy ("Think of X like...")
- Avoid jargon — if you must use a term, define it immediately in plain English
- Use short paragraphs (2-3 sentences max)
- Include exactly ONE \`\`\`${langName} code example that is simple and directly illustrates the concept
- End with one "💡 Quick tip:" line that gives a memorable rule of thumb

Return ONLY the markdown content, no preamble or title.`
}

function structuredPrompt(stub: LessonStubRow, langName: string, judge0Id: number, theory: string) {
  return `Based on this lesson theory for "${stub.title}" in ${langName}:

${theory}

Return ONLY valid JSON (no markdown fences):
{
  "exercise_prompt": "string — a friendly 2-3 sentence challenge. Start with 'Your turn!' and make it sound fun, not scary.",
  "starter_code": "string (skeleton with TODO comments, compiles but doesn't solve)",
  "solution_code": "string (complete working solution)",
  "test_cases": [
    {"input": "string", "expected_output": "string", "is_hidden": false, "order_index": 0},
    {"input": "string", "expected_output": "string", "is_hidden": false, "order_index": 1},
    {"input": "string", "expected_output": "string", "is_hidden": true,  "order_index": 2},
    {"input": "string", "expected_output": "string", "is_hidden": true,  "order_index": 3}
  ]
}

RULES: test_cases use stdin/stdout. solution_code must pass all 4 tests on Judge0 language_id ${judge0Id}.`
}

export async function generateCourseContentBatch(
  ctx: CourseContext,
  serviceClient: SupabaseClient
): Promise<string[]> {
  const fromIdx = ctx.fromOrderIndex ?? 0

  const { data: stubs } = await serviceClient
    .from('lessons')
    .select('id, title, difficulty, order_index, judge0_language_id')
    .eq('course_id', ctx.courseId)
    .eq('content_status', 'pending')
    .gte('order_index', fromIdx)
    .order('order_index')
    .limit(3)

  if (!stubs || stubs.length === 0) return []

  await serviceClient
    .from('lessons')
    .update({ content_status: 'generating' })
    .in('id', stubs.map((s: LessonStubRow) => s.id))

  const generated: string[] = []
  const batchStart = Date.now()
  console.log(`[gen] Starting batch of ${stubs.length} lessons for course ${ctx.courseId}`)

  try {
    await Promise.all(
      (stubs as LessonStubRow[]).map(async (stub) => {
        await generateSingleLesson(stub, ctx, serviceClient)
        generated.push(stub.id)
      })
    )

    console.log(`[gen] Batch complete in ${((Date.now() - batchStart) / 1000).toFixed(1)}s`)

    const { count } = await serviceClient
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', ctx.courseId)
      .eq('content_status', 'pending')

    if ((count ?? 0) === 0) {
      await serviceClient.from('courses').update({ status: 'generated' }).eq('id', ctx.courseId)
    }
  } catch (err) {
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
  const t0 = Date.now()

  const theoryMsg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1200,
    messages: [{ role: 'user', content: theoryPrompt(stub, ctx, langName) }],
  })
  const theory = theoryMsg.content[0].type === 'text' ? theoryMsg.content[0].text : ''
  console.log(`[gen] "${stub.title}" theory: ${((Date.now() - t0) / 1000).toFixed(1)}s (${theory.length} chars)`)

  const t1 = Date.now()
  const structuredMsg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [{ role: 'user', content: structuredPrompt(stub, langName, stub.judge0_language_id, theory) }],
  })
  const structuredRaw = structuredMsg.content[0].type === 'text'
    ? structuredMsg.content[0].text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    : '{}'

  console.log(`[gen] "${stub.title}" exercise: ${((Date.now() - t1) / 1000).toFixed(1)}s`)

  const structured = StructuredContentSchema.parse(JSON.parse(structuredRaw))

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

  console.log(`[gen] "${stub.title}" total: ${((Date.now() - t0) / 1000).toFixed(1)}s`)
}

/** Stream theory for a single lesson via SSE, then generate exercise+code. */
export async function streamLessonGeneration(
  stub: LessonStubRow,
  ctx: CourseContext,
  serviceClient: SupabaseClient,
  onChunk: (text: string) => void
): Promise<void> {
  const langName = getLanguageName(stub.judge0_language_id)

  await serviceClient
    .from('lessons')
    .update({ content_status: 'generating' })
    .eq('id', stub.id)

  let theory = ''
  const t0 = Date.now()

  try {
    const stream = client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{ role: 'user', content: theoryPrompt(stub, ctx, langName) }],
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        theory += event.delta.text
        onChunk(event.delta.text)
      }
    }
    console.log(`[stream] "${stub.title}" theory streamed: ${((Date.now() - t0) / 1000).toFixed(1)}s`)

    const t1 = Date.now()
    const structuredMsg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: structuredPrompt(stub, langName, stub.judge0_language_id, theory) }],
    })

    const raw = structuredMsg.content[0].type === 'text'
      ? structuredMsg.content[0].text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      : '{}'

    console.log(`[stream] "${stub.title}" exercise: ${((Date.now() - t1) / 1000).toFixed(1)}s`)

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

    console.log(`[stream] "${stub.title}" total: ${((Date.now() - t0) / 1000).toFixed(1)}s`)
    onChunk('\n\n__DONE__')
  } catch (err) {
    await serviceClient.from('lessons').update({ content_status: 'pending' }).eq('id', stub.id)
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
