'use client'

import { AIFeedback } from '@/types/learning'

interface FeedbackPanelProps {
  feedback: AIFeedback | null
  loading: boolean
}

export default function FeedbackPanel({ feedback, loading }: FeedbackPanelProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 p-4 text-sm text-muted-foreground animate-pulse">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        Claude is reviewing your code...
      </div>
    )
  }

  if (!feedback) return null

  const scoreColor =
    feedback.score >= 90
      ? 'text-green-600'
      : feedback.score >= 70
      ? 'text-yellow-600'
      : 'text-red-600'

  const scoreBg =
    feedback.score >= 90
      ? 'bg-green-50 border-green-200'
      : feedback.score >= 70
      ? 'bg-yellow-50 border-yellow-200'
      : 'bg-red-50 border-red-200'

  return (
    <div className="flex flex-col gap-4 p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className={`rounded-lg border p-4 flex items-center gap-4 ${scoreBg}`}>
        <div className="flex flex-col items-center">
          <span className={`text-3xl font-extrabold ${scoreColor}`}>{feedback.score}</span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
        <div>
          <p className="font-medium text-sm">{feedback.correctness_summary}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 text-sm">
        <section>
          <h4 className="font-semibold mb-1">Explanation</h4>
          <p className="text-muted-foreground leading-relaxed">{feedback.explanation}</p>
        </section>

        <section>
          <h4 className="font-semibold mb-1">Tips to improve</h4>
          <ul className="list-disc list-inside flex flex-col gap-1 text-muted-foreground">
            {feedback.improvement_tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </section>

        <section>
          <h4 className="font-semibold mb-1">Optimized approach</h4>
          <p className="text-muted-foreground leading-relaxed">{feedback.optimized_approach}</p>
        </section>
      </div>
    </div>
  )
}
