import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { AIFeedback, TestResult } from '@/types/learning'

const client = new Anthropic()

const FeedbackSchema = z.object({
  score: z.number().int().min(0).max(100),
  correctness_summary: z.string().min(10),
  explanation: z.string().min(50),
  improvement_tips: z.array(z.string()).min(1).max(5),
  optimized_approach: z.string().min(20),
})

export async function generateFeedback(params: {
  exercisePrompt: string
  starterCode: string
  submittedCode: string
  testResults: TestResult[]
  language: string
  allPassed: boolean
}): Promise<AIFeedback> {
  const { exercisePrompt, submittedCode, testResults, language, allPassed } = params

  const passCount = testResults.filter((t) => t.passed).length
  const totalCount = testResults.length

  const prompt = `You are an expert programming tutor providing feedback on a student's code submission.

EXERCISE:
${exercisePrompt}

STUDENT'S CODE (${language}):
\`\`\`${language}
${submittedCode}
\`\`\`

TEST RESULTS: ${passCount}/${totalCount} passed
${testResults
  .map(
    (t, i) => `
Test ${i + 1}: ${t.passed ? '✅ PASSED' : '❌ FAILED'}${t.is_hidden ? ' (hidden)' : ''}
  Input: ${t.input || '(none)'}
  Expected: ${t.expected_output}
  Actual: ${t.actual_output || '(no output)'}${t.error ? `\n  Error: ${t.error}` : ''}`
  )
  .join('\n')}

ALL TESTS PASSED: ${allPassed}

Provide feedback as JSON only (no markdown fences, no prose):
{
  "score": number (0-100, reflecting correctness, code quality, efficiency),
  "correctness_summary": "1-2 sentences on what worked and what didn't",
  "explanation": "3-5 sentences explaining the student's approach and any logic errors",
  "improvement_tips": ["tip1", "tip2", "tip3"] (2-4 actionable, specific tips),
  "optimized_approach": "2-3 sentences describing a better or more idiomatic solution approach"
}`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  const text = content.text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  const parsed = JSON.parse(text)
  return FeedbackSchema.parse(parsed)
}
