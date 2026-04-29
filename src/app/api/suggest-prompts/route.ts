import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const SuggestSchema = z.object({
  keywords: z.string().min(2).max(200),
  preferred_language: z.string().optional(),
  experience_level: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { keywords, preferred_language, experience_level } = SuggestSchema.parse(body)

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `A user wants to learn something. Based on their keywords, generate exactly 3 distinct learning profile options.

KEYWORDS: "${keywords}"
${preferred_language ? `LANGUAGE: ${preferred_language}` : ''}
${experience_level ? `LEVEL: ${experience_level}` : ''}

Return ONLY a JSON array of 3 objects. No prose, no markdown fences:
[
  {
    "label": "short title (4-6 words)",
    "background": "2 sentences describing who this person is and what they know",
    "goals": "2 sentences describing what they want to achieve and why"
  }
]

Make the 3 options distinctly different angles on the same topic (e.g. career-focused, project-focused, theory-focused).
Keep each background and goals to 1-2 sentences max. Be specific.`,
      }],
    })

    const text = msg.content[0].type === 'text'
      ? msg.content[0].text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      : '[]'

    const suggestions = JSON.parse(text)
    return NextResponse.json({ suggestions })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error('Suggest prompts error:', error)
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 })
  }
}
