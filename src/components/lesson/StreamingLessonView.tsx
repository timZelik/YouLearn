'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import { Skeleton } from '@/components/ui/skeleton'

interface Props {
  lessonId: string
  lessonTitle: string
}

export default function StreamingLessonView({ lessonId, lessonTitle }: Props) {
  const router = useRouter()
  const [theory, setTheory] = useState('')
  const [status, setStatus] = useState<'streaming' | 'saving' | 'done' | 'error'>('streaming')
  const doneRef = useRef(false)

  useEffect(() => {
    if (doneRef.current) return
    doneRef.current = true

    const eventSource = new EventSource(`/api/lesson-stream?lessonId=${lessonId}`)

    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.done) {
        eventSource.close()
        setStatus('saving')
        setTimeout(() => router.refresh(), 800)
        return
      }
      if (data.error) { eventSource.close(); setStatus('error'); return }
      if (data.chunk) setTheory((prev) => prev + data.chunk)
    }

    eventSource.onerror = () => { eventSource.close(); setStatus('error') }
    return () => eventSource.close()
  }, [lessonId, router])

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-2.5 flex-shrink-0">
        <span className="text-sm text-muted-foreground">← Dashboard</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium truncate">{lessonTitle}</span>

        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {status === 'streaming' && (
            <>
              <div className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              Generating with Claude…
            </>
          )}
          {status === 'saving' && (
            <>
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Saving…
            </>
          )}
          {status === 'error' && (
            <span className="text-destructive">Generation failed — refresh to retry</span>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Theory streaming */}
        <div className="w-[48%] border-r border-border flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30 flex-shrink-0">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Theory</span>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {theory ? (
              <article className="prose prose-sm prose-slate max-w-none dark:prose-invert
                prose-headings:font-semibold prose-h2:text-base prose-h3:text-sm
                prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[0.8em] prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
                prose-pre:bg-muted prose-pre:border prose-pre:border-border">
                <ReactMarkdown>{theory}</ReactMarkdown>
              </article>
            ) : (
              <div className="flex flex-col gap-3 pt-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  Claude is writing your lesson…
                </div>
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-11/12" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-24 w-full rounded-lg mt-2" />
              </div>
            )}
          </div>
        </div>

        {/* Right placeholder */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground bg-muted/10">
          <div className="h-10 w-10 rounded-full border-4 border-border border-t-primary animate-spin" />
          <p className="text-sm">Exercise & editor loading…</p>
        </div>
      </div>
    </div>
  )
}
