'use client'

import { AIFeedback } from '@/types/learning'
import { Skeleton } from '@/components/ui/skeleton'

interface FeedbackPanelProps {
  feedback: AIFeedback | null
  loading: boolean
}

export default function FeedbackPanel({ feedback, loading }: FeedbackPanelProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin flex-shrink-0" />
          <span className="text-xs text-muted-foreground">Claude is reviewing your code…</span>
        </div>
        <Skeleton className="h-16 w-full rounded-lg" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
    )
  }

  if (!feedback) return null

  const score = feedback.score
  const scoreConfig = score >= 90
    ? { bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900', text: 'text-emerald-600 dark:text-emerald-400', label: 'Excellent' }
    : score >= 70
    ? { bg: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900',   text: 'text-amber-600 dark:text-amber-400',   label: 'Good' }
    : { bg: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900',           text: 'text-red-600 dark:text-red-400',       label: 'Needs work' }

  return (
    <div className="flex flex-col gap-4 p-4 border-t border-border animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Score card */}
      <div className={`rounded-lg border p-4 flex items-center gap-4 ${scoreConfig.bg}`}>
        <div className="flex flex-col items-center w-14 flex-shrink-0">
          <span className={`text-3xl font-black tabular-nums ${scoreConfig.text}`}>{score}</span>
          <span className="text-[10px] text-muted-foreground font-medium">/ 100</span>
        </div>
        <div className="min-w-0">
          <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${scoreConfig.text}`}>{scoreConfig.label}</p>
          <p className="text-sm text-foreground leading-snug">{feedback.correctness_summary}</p>
        </div>
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-4 text-sm">
        <FeedbackSection title="Explanation" body={feedback.explanation} />
        <FeedbackSection title="Tips to improve" list={feedback.improvement_tips} />
        <FeedbackSection title="Optimized approach" body={feedback.optimized_approach} />
      </div>
    </div>
  )
}

function FeedbackSection({ title, body, list }: { title: string; body?: string; list?: string[] }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
      {body && <p className="text-muted-foreground leading-relaxed">{body}</p>}
      {list && (
        <ul className="flex flex-col gap-1 text-muted-foreground">
          {list.map((tip, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-primary flex-shrink-0 mt-0.5">›</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
