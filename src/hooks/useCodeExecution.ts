'use client'

import { useState } from 'react'
import { ExecutionResult, AIFeedback } from '@/types/learning'

export type ExecutionMode = 'run' | 'submit'

interface State {
  loading: boolean
  result: ExecutionResult | null
  feedback: AIFeedback | null
  feedbackLoading: boolean
  error: string | null
}

export function useCodeExecution(lessonId: string) {
  const [state, setState] = useState<State>({
    loading: false,
    result: null,
    feedback: null,
    feedbackLoading: false,
    error: null,
  })

  async function execute(code: string, mode: ExecutionMode) {
    setState((s) => ({ ...s, loading: true, error: null, result: null, feedback: null }))

    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lesson_id: lessonId, code, mode }),
      })

      const data = await res.json()

      if (!res.ok) {
        setState((s) => ({ ...s, loading: false, error: data.error ?? 'Execution failed' }))
        return
      }

      setState((s) => ({ ...s, loading: false, result: data }))

      // Feedback only on passing submit — cost rule: no wasted tokens on failed attempts
      if (mode === 'submit' && data.all_passed && data.submission_id) {
        setState((s) => ({ ...s, feedbackLoading: true }))
        try {
          const fbRes = await fetch('/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              submission_id: data.submission_id,
              lesson_id: lessonId,
            }),
          })
          const fbData = await fbRes.json()
          if (fbRes.ok) {
            setState((s) => ({ ...s, feedbackLoading: false, feedback: fbData.feedback }))

            // Update streak if all passed
            if (data.all_passed) {
              await fetch('/api/progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  lesson_id: lessonId,
                  score: fbData.feedback?.score ?? 100,
                }),
              })
            }
          } else {
            setState((s) => ({ ...s, feedbackLoading: false }))
          }
        } catch {
          setState((s) => ({ ...s, feedbackLoading: false }))
        }
      }
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : 'Network error',
      }))
    }
  }

  return { ...state, execute }
}
