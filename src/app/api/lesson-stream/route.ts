import { NextRequest } from 'next/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { streamLessonGeneration } from '@/lib/generation/generateCourseContent'

export const maxDuration = 120 // seconds — streaming generation can take 30-60s

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lessonId = searchParams.get('lessonId')

  if (!lessonId) {
    return new Response('Missing lessonId', { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const serviceClient = await createServiceClient()

  const { data: lesson } = await serviceClient
    .from('lessons')
    .select('id, title, difficulty, order_index, judge0_language_id, content_status, course_id, theory_markdown')
    .eq('id', lessonId)
    .eq('user_id', user.id)
    .single()

  if (!lesson) return new Response('Not found', { status: 404 })

  // If already generated, return immediately with a done signal
  if (lesson.content_status === 'generated') {
    return new Response(`data: ${JSON.stringify({ done: true })}\n\n`, {
      headers: sseHeaders(),
    })
  }

  // If another request is already generating, just poll until done
  if (lesson.content_status === 'generating') {
    return new Response(pollingStream(serviceClient, lessonId), { headers: sseHeaders() })
  }

  // Fetch course + per-path topic context. We use the path's own
  // background/goals/language rather than the user's latest onboarding
  // response — those diverge once a user has multiple paths.
  const { data: course } = await serviceClient
    .from('courses')
    .select('title, description, learning_path_id')
    .eq('id', lesson.course_id)
    .single()

  const { data: pathCtx } = course?.learning_path_id
    ? await serviceClient
        .from('learning_paths')
        .select('background, goals, preferred_language')
        .eq('id', course.learning_path_id)
        .single()
    : { data: null }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        await streamLessonGeneration(
          {
            id: lesson.id,
            title: lesson.title,
            difficulty: lesson.difficulty,
            order_index: lesson.order_index,
            judge0_language_id: lesson.judge0_language_id,
          },
          {
            courseId: lesson.course_id,
            courseTitle: course?.title ?? '',
            courseDescription: course?.description ?? '',
            language: pathCtx?.preferred_language ?? 'python',
            userBackground: pathCtx?.background ?? '',
            userGoals: pathCtx?.goals ?? '',
          },
          serviceClient,
          (chunk) => {
            if (chunk === '\n\n__DONE__') {
              send({ done: true })
            } else {
              send({ chunk })
            }
          }
        )
      } catch (err) {
        console.error('Stream generation error:', err)
        send({ error: 'Generation failed' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, { headers: sseHeaders() })
}

function sseHeaders() {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  }
}

// If already generating elsewhere, poll DB and stream status until done
function pollingStream(serviceClient: SupabaseClient, lessonId: string): ReadableStream {
  const encoder = new TextEncoder()
  return new ReadableStream({
    async start(controller) {
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 2000))
        const { data } = await serviceClient
          .from('lessons')
          .select('content_status')
          .eq('id', lessonId)
          .single()
        if (data?.content_status === 'generated') {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
          break
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'generating' })}\n\n`))
      }
      controller.close()
    },
  })
}
