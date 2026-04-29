import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { OnboardingData } from '@/types/learning'

const client = new Anthropic()

export const JUDGE0_LANGUAGE_IDS: Record<string, number> = {
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

const LessonStubSchema = z.object({
  title: z.string().min(1),
  difficulty: z.enum(['intro', 'easy', 'medium', 'hard', 'capstone']),
  order_index: z.number().int().min(0),
})

const CourseStubSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(10),
  order_index: z.number().int().min(0),
  lessons: z.array(LessonStubSchema).min(3).max(6),
})

const PathStubSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(10),
  courses: z.array(CourseStubSchema).length(5),
})

export type PathStub = z.infer<typeof PathStubSchema>

function buildStubPrompt(data: OnboardingData): string {
  return `You are a programming curriculum designer. Create a personalized 5-course learning path structure for:

BACKGROUND: ${data.background}
GOALS: ${data.goals}
LANGUAGE: ${data.preferred_language}
LEVEL: ${data.experience_level}

Return ONLY valid JSON — no markdown fences, no prose:
{
  "title": "string",
  "description": "string (2 sentences max)",
  "courses": [
    {
      "title": "string",
      "description": "string (1 sentence)",
      "order_index": 0,
      "lessons": [
        {"title": "string", "difficulty": "intro", "order_index": 0},
        {"title": "string", "difficulty": "intro", "order_index": 1}
      ]
    }
  ]
}

RULES:
- Exactly 5 courses ordered by complexity
- 3–5 lessons per course (titles only, no content)
- Difficulty per course: course 0 = intro, course 1 = easy, course 2 = medium, course 3 = hard, course 4 = capstone
- All lesson difficulties within a course should match the course difficulty level
- Titles should be specific and descriptive, tailored to the student's goals`
}

export async function generatePathStub(data: OnboardingData): Promise<PathStub> {
  const prompt = buildStubPrompt(data)

  async function attempt(): Promise<PathStub> {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001', // Haiku is fast + cheap for structure-only generation
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type')

    const text = content.text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    return PathStubSchema.parse(JSON.parse(text))
  }

  try {
    return await attempt()
  } catch {
    return await attempt()
  }
}
