import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

const client = new Anthropic()

const TestCaseSchema = z.object({
  input: z.string(),
  expected_output: z.string(),
  is_hidden: z.boolean(),
  order_index: z.number().int().min(0),
})

const LessonContentSchema = z.object({
  theory_markdown: z.string().min(200),
  exercise_prompt: z.string().min(30),
  starter_code: z.string(),
  solution_code: z.string().min(1),
  test_cases: z.array(TestCaseSchema).length(4),
})

export type LessonContent = z.infer<typeof LessonContentSchema>

export interface LessonStub {
  id: string
  title: string
  difficulty: string
  order_index: number
}

export interface GenerateBatchParams {
  courseTitle: string
  courseDescription: string
  language: string
  judge0LanguageId: number
  userBackground: string
  userGoals: string
  lessons: LessonStub[] // up to 3
}

function buildBatchPrompt(params: GenerateBatchParams): string {
  const lessonList = params.lessons
    .map((l, i) => `${i + 1}. "${l.title}" (difficulty: ${l.difficulty}, order: ${l.order_index})`)
    .join('\n')

  return `You are an expert programming tutor. Generate lesson content for the following lessons in the course "${params.courseTitle}".

COURSE: ${params.courseTitle} — ${params.courseDescription}
STUDENT BACKGROUND: ${params.userBackground}
STUDENT GOALS: ${params.userGoals}
LANGUAGE: ${params.language} (Judge0 language_id: ${params.judge0LanguageId})

LESSONS TO GENERATE:
${lessonList}

Return ONLY a valid JSON array with exactly ${params.lessons.length} objects — one per lesson, in order. No markdown fences, no prose.

Each object must match:
{
  "theory_markdown": "string (markdown, ≥200 words, include \`\`\`${params.language} code examples)",
  "exercise_prompt": "string (clear coding challenge, 2–4 sentences)",
  "starter_code": "string (skeleton with TODO comments, compiles but doesn't solve)",
  "solution_code": "string (complete working solution that passes all 4 test cases)",
  "test_cases": [
    {"input": "string", "expected_output": "string", "is_hidden": false, "order_index": 0},
    {"input": "string", "expected_output": "string", "is_hidden": false, "order_index": 1},
    {"input": "string", "expected_output": "string", "is_hidden": true,  "order_index": 2},
    {"input": "string", "expected_output": "string", "is_hidden": true,  "order_index": 3}
  ]
}

RULES:
- test_cases use stdin/stdout — input is piped to stdin, expected_output is stdout
- solution_code must pass all 4 test cases when run via Judge0
- Difficulty should match the lesson's difficulty level
- All code must be in ${params.language}`
}

export async function generateLessonBatch(params: GenerateBatchParams): Promise<LessonContent[]> {
  const prompt = buildBatchPrompt(params)

  async function attempt(): Promise<LessonContent[]> {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type')

    const text = content.text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    const parsed = JSON.parse(text)
    const arr = Array.isArray(parsed) ? parsed : [parsed]

    return arr.map((item) => LessonContentSchema.parse(item))
  }

  try {
    return await attempt()
  } catch {
    return await attempt()
  }
}
