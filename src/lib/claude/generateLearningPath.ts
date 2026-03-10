import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { OnboardingData, LearningPathResponse } from '@/types/learning'

const client = new Anthropic()

const TestCaseSchema = z.object({
  input: z.string(),
  expected_output: z.string(),
  is_hidden: z.boolean(),
  order_index: z.number().int().min(0),
})

const LessonSchema = z.object({
  title: z.string().min(1),
  theory_markdown: z.string().min(300),
  exercise_prompt: z.string().min(50),
  starter_code: z.string(),
  solution_code: z.string().min(1),
  judge0_language_id: z.number().int().positive(),
  difficulty: z.enum(['intro', 'easy', 'medium', 'hard', 'capstone']),
  order_index: z.number().int().min(0),
  test_cases: z.array(TestCaseSchema).length(4),
})

const CourseSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(20),
  order_index: z.number().int().min(0),
  lessons: z.array(LessonSchema).min(4).max(6),
})

const LearningPathSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(20),
  courses: z.array(CourseSchema).length(5),
})

const JUDGE0_LANGUAGE_IDS: Record<string, number> = {
  python: 71,
  javascript: 63,
  typescript: 74,
  java: 62,
  cpp: 54,
  c: 50,
  go: 60,
  rust: 73,
  ruby: 72,
  swift: 83,
}

function buildPrompt(data: OnboardingData): string {
  const langId = JUDGE0_LANGUAGE_IDS[data.preferred_language.toLowerCase()] ?? 71

  return `You are an expert programming curriculum designer. Create a personalized 5-course learning path for a student with the following profile:

BACKGROUND: ${data.background}
GOALS: ${data.goals}
PREFERRED LANGUAGE: ${data.preferred_language} (Judge0 language_id: ${langId})
EXPERIENCE LEVEL: ${data.experience_level}

OUTPUT REQUIREMENTS:
- Return ONLY valid JSON — no markdown fences, no prose, no explanations
- The JSON must exactly match this structure:
{
  "title": "string (descriptive path title)",
  "description": "string (2-3 sentence overview)",
  "courses": [
    {
      "title": "string",
      "description": "string (1-2 sentences)",
      "order_index": 0,
      "lessons": [
        {
          "title": "string",
          "theory_markdown": "string (markdown, ≥300 words, include code examples with \`\`\`${data.preferred_language} blocks)",
          "exercise_prompt": "string (clear coding challenge description)",
          "starter_code": "string (skeleton code with TODO comments)",
          "solution_code": "string (complete working solution)",
          "judge0_language_id": ${langId},
          "difficulty": "intro|easy|medium|hard|capstone",
          "order_index": 0,
          "test_cases": [
            {"input": "string", "expected_output": "string", "is_hidden": false, "order_index": 0},
            {"input": "string", "expected_output": "string", "is_hidden": false, "order_index": 1},
            {"input": "string", "expected_output": "string", "is_hidden": true, "order_index": 2},
            {"input": "string", "expected_output": "string", "is_hidden": true, "order_index": 3}
          ]
        }
      ]
    }
  ]
}

CURRICULUM DESIGN RULES:
1. Exactly 5 courses, ordered by complexity
2. Each course has 4-6 lessons
3. First course starts with "intro" difficulty; last course ends with "capstone"
4. Difficulty escalates: intro → easy → medium → hard → capstone across the 5 courses
5. theory_markdown must be at least 300 words with working code examples
6. Each lesson has exactly 4 test cases: 2 visible (is_hidden: false) + 2 hidden (is_hidden: true)
7. test_cases must use stdin/stdout — input is what gets piped to stdin, expected_output is stdout
8. All code examples must be in ${data.preferred_language}
9. solution_code must pass ALL 4 test cases when submitted to Judge0
10. starter_code must compile/run but not solve the problem
11. judge0_language_id must be ${langId} for ALL lessons

Generate a curriculum tailored specifically to this student's background and goals.`
}

export async function generateLearningPath(
  data: OnboardingData
): Promise<LearningPathResponse> {
  const prompt = buildPrompt(data)

  async function attempt(): Promise<LearningPathResponse> {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type')

    const text = content.text.trim()
    // Strip markdown fences if present
    const json = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    const parsed = JSON.parse(json)
    return LearningPathSchema.parse(parsed)
  }

  try {
    return await attempt()
  } catch (firstError) {
    console.error('First attempt failed, retrying...', firstError)
    try {
      return await attempt()
    } catch (secondError) {
      console.error('Second attempt failed', secondError)
      throw new Error('Failed to generate learning path after 2 attempts')
    }
  }
}
