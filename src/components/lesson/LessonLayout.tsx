'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import TestCasePanel from './TestCasePanel'
import FeedbackPanel from './FeedbackPanel'
import { useCodeExecution } from '@/hooks/useCodeExecution'

const CodeEditor = dynamic(() => import('./CodeEditor'), { ssr: false })

const DIFFICULTY_STYLES: Record<string, string> = {
  intro:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  easy:     'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400',
  medium:   'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  hard:     'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
  capstone: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400',
}

const LANGUAGE_NAMES: Record<number, string> = {
  71: 'Python',  63: 'JavaScript', 74: 'TypeScript', 62: 'Java',
  54: 'C++',     50: 'C',          60: 'Go',          73: 'Rust',
  72: 'Ruby',    83: 'Swift',
}

interface LessonData {
  id: string
  title: string
  theory_markdown: string
  exercise_prompt: string
  starter_code: string
  judge0_language_id: number
  difficulty: string
  order_index: number
  course_id: string
}

interface NextLessonData { id: string; course_id: string }

interface LessonLayoutProps {
  lesson: LessonData
  courseTitle: string
  nextLesson: NextLessonData | null
}

export default function LessonLayout({ lesson, courseTitle, nextLesson }: LessonLayoutProps) {
  const [code, setCode] = useState(lesson.starter_code)
  const { loading, result, feedback, feedbackLoading, error, execute } = useCodeExecution(lesson.id)

  const handleRun    = useCallback(() => execute(code, 'run'),    [code, execute])
  const handleSubmit = useCallback(() => execute(code, 'submit'), [code, execute])

  const langName = LANGUAGE_NAMES[lesson.judge0_language_id] ?? 'Code'

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      {/* Top bar — sidebar handles navigation, this just shows context */}
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-2.5 flex-shrink-0">
        <span className="text-sm font-medium truncate flex-1">{lesson.title}</span>
        <span className="text-xs text-muted-foreground hidden sm:block">{langName}</span>
        <span className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${DIFFICULTY_STYLES[lesson.difficulty] ?? ''}`}>
          {lesson.difficulty}
        </span>
        <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
          Dashboard
        </Link>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Mobile: Tabs ── */}
        <div className="flex flex-1 flex-col lg:hidden overflow-hidden">
          <Tabs defaultValue="theory" className="flex flex-col flex-1 overflow-hidden">
            <TabsList className="rounded-none border-b border-border flex-shrink-0 bg-card h-10">
              <TabsTrigger value="theory"  className="text-xs">Theory</TabsTrigger>
              <TabsTrigger value="editor"  className="text-xs">Editor</TabsTrigger>
              <TabsTrigger value="results" className="text-xs">Output</TabsTrigger>
            </TabsList>
            <TabsContent value="theory" className="flex-1 overflow-y-auto p-5 m-0">
              <TheoryPane lesson={lesson} />
            </TabsContent>
            <TabsContent value="editor" className="flex-1 flex flex-col overflow-hidden m-0">
              <CodeEditor value={code} onChange={setCode} languageId={lesson.judge0_language_id} height="calc(100vh - 200px)" />
              <EditorToolbar onRun={handleRun} onSubmit={handleSubmit} loading={loading} />
            </TabsContent>
            <TabsContent value="results" className="flex-1 overflow-y-auto m-0">
              <OutputPane error={error} result={result} feedback={feedback} feedbackLoading={feedbackLoading} loading={loading} nextLesson={nextLesson} />
            </TabsContent>
          </Tabs>
        </div>

        {/* ── Desktop: Split ── */}
        <div className="hidden lg:flex flex-1 overflow-hidden">
          {/* Left: Theory */}
          <div className="w-[48%] flex flex-col overflow-hidden border-r border-border">
            <SectionLabel label={`Lesson ${lesson.order_index + 1}`} />
            <div className="flex-1 overflow-y-auto p-6">
              <TheoryPane lesson={lesson} />
            </div>
          </div>

          {/* Right: Editor + Output */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Editor section */}
            <SectionLabel label="Editor" right={
              <span className="rounded px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">{langName}</span>
            } />
            <div className="flex flex-col overflow-hidden" style={{ height: 'calc(55%)' }}>
              <div className="flex-1 overflow-hidden">
                <CodeEditor value={code} onChange={setCode} languageId={lesson.judge0_language_id} height="100%" />
              </div>
              <EditorToolbar onRun={handleRun} onSubmit={handleSubmit} loading={loading} />
            </div>

            {/* Output section */}
            <div className="flex flex-col flex-1 overflow-hidden border-t border-border">
              <SectionLabel label="Output" />
              <div className="flex-1 overflow-y-auto">
                <OutputPane error={error} result={result} feedback={feedback} feedbackLoading={feedbackLoading} loading={loading} nextLesson={nextLesson} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Theory left pane ── */
function TheoryPane({ lesson }: { lesson: LessonData }) {
  return (
    <div className="flex flex-col gap-7">
      <h1 className="text-[1.35rem] font-semibold tracking-tight leading-snug">{lesson.title}</h1>

      <article className="prose prose-sm max-w-none dark:prose-invert
        prose-p:text-[0.9rem] prose-p:leading-[1.75] prose-p:text-foreground/90
        prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-foreground
        prose-h2:text-[1rem] prose-h2:mt-6 prose-h2:mb-2
        prose-h3:text-[0.9rem] prose-h3:mt-4 prose-h3:mb-1.5
        prose-strong:font-semibold prose-strong:text-foreground
        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
        prose-li:text-[0.9rem] prose-li:leading-[1.7]
        prose-code:rounded-md prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5
        prose-code:text-[0.82em] prose-code:font-medium prose-code:before:content-none prose-code:after:content-none
        prose-pre:rounded-lg prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:text-[0.82rem]">
        <ReactMarkdown>{lesson.theory_markdown}</ReactMarkdown>
      </article>

      <div className="rounded-xl border border-primary/25 bg-primary/5 p-5 dark:bg-primary/10">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-primary/80 mb-2.5">Exercise</p>
        <p className="text-[0.9rem] leading-[1.75] text-foreground">{lesson.exercise_prompt}</p>
      </div>
    </div>
  )
}

/* ── Output right-bottom pane ── */
interface OutputPaneProps {
  error: string | null
  result: { test_results: import('@/types/learning').TestResult[]; all_passed: boolean } | null
  feedback: import('@/types/learning').AIFeedback | null
  feedbackLoading: boolean
  loading: boolean
  nextLesson: NextLessonData | null
}

function OutputPane({ error, result, feedback, feedbackLoading, loading, nextLesson }: OutputPaneProps) {
  return (
    <>
      {error && (
        <p className="px-4 py-3 text-sm text-destructive bg-destructive/10 border-b border-border">{error}</p>
      )}
      <TestCasePanel results={result?.test_results ?? []} loading={loading} />
      <FeedbackPanel feedback={feedback} loading={feedbackLoading} />
      {result?.all_passed && nextLesson && <NextLessonBanner nextLesson={nextLesson} />}
    </>
  )
}

/* ── Section label bar ── */
function SectionLabel({ label, right }: { label: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-muted/30 flex-shrink-0">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
      {right && <div className="ml-auto">{right}</div>}
    </div>
  )
}

/* ── Editor toolbar ── */
function EditorToolbar({ onRun, onSubmit, loading }: { onRun: () => void; onSubmit: () => void; loading: boolean }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t border-border bg-card flex-shrink-0">
      <button
        onClick={onRun}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
      >
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        {loading ? 'Running…' : 'Run'}
      </button>
      <button
        onClick={onSubmit}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>
        {loading ? 'Running…' : 'Submit'}
      </button>
    </div>
  )
}

/* ── Next lesson banner ── */
function NextLessonBanner({ nextLesson }: { nextLesson: NextLessonData }) {
  return (
    <div className="mx-4 my-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 flex items-center justify-between dark:border-emerald-900 dark:bg-emerald-950/40">
      <div>
        <p className="font-semibold text-sm text-emerald-900 dark:text-emerald-300">All tests passed!</p>
        <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">Ready for the next challenge?</p>
      </div>
      <Link
        href={`/learn/${nextLesson.course_id}/${nextLesson.id}`}
        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
      >
        Next →
      </Link>
    </div>
  )
}
