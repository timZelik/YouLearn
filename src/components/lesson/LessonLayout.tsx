'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import TestCasePanel from './TestCasePanel'
import FeedbackPanel from './FeedbackPanel'
import { useCodeExecution } from '@/hooks/useCodeExecution'

const CodeEditor = dynamic(() => import('./CodeEditor'), { ssr: false })

const DIFFICULTY_COLORS: Record<string, string> = {
  intro: 'bg-green-100 text-green-800',
  easy: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  hard: 'bg-orange-100 text-orange-800',
  capstone: 'bg-purple-100 text-purple-800',
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

interface NextLessonData {
  id: string
  course_id: string
}

interface LessonLayoutProps {
  lesson: LessonData
  courseTitle: string
  nextLesson: NextLessonData | null
}

export default function LessonLayout({ lesson, courseTitle, nextLesson }: LessonLayoutProps) {
  const [code, setCode] = useState(lesson.starter_code)
  const { loading, result, feedback, feedbackLoading, error, execute } = useCodeExecution(lesson.id)

  const handleRun = useCallback(() => execute(code, 'run'), [code, execute])
  const handleSubmit = useCallback(() => execute(code, 'submit'), [code, execute])

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <header className="flex items-center gap-3 border-b bg-white px-4 py-3 flex-shrink-0">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Dashboard
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm text-muted-foreground truncate max-w-32">{courseTitle}</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium truncate">{lesson.title}</span>
        <Badge className={`ml-auto ${DIFFICULTY_COLORS[lesson.difficulty] ?? ''}`}>
          {lesson.difficulty}
        </Badge>
      </header>

      {/* Desktop layout: left theory, right editor+results */}
      <div className="flex flex-1 overflow-hidden">

        {/* --- Mobile: Tabs --- */}
        <div className="flex flex-1 flex-col lg:hidden overflow-hidden">
          <Tabs defaultValue="theory" className="flex flex-col flex-1 overflow-hidden">
            <TabsList className="rounded-none border-b flex-shrink-0">
              <TabsTrigger value="theory">Theory</TabsTrigger>
              <TabsTrigger value="editor">Editor</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </TabsList>

            <TabsContent value="theory" className="flex-1 overflow-y-auto p-4 m-0">
              <TheoryContent theorySrc={lesson.theory_markdown} exercisePrompt={lesson.exercise_prompt} />
            </TabsContent>

            <TabsContent value="editor" className="flex-1 flex flex-col gap-3 p-3 m-0">
              <CodeEditor
                value={code}
                onChange={setCode}
                languageId={lesson.judge0_language_id}
                height="calc(100vh - 280px)"
              />
              <EditorActions onRun={handleRun} onSubmit={handleSubmit} loading={loading} />
            </TabsContent>

            <TabsContent value="results" className="flex-1 overflow-y-auto m-0">
              {error && <p className="p-4 text-sm text-red-600">{error}</p>}
              <TestCasePanel results={result?.test_results ?? []} loading={loading} />
              <FeedbackPanel feedback={feedback} loading={feedbackLoading} />
              {result?.all_passed && nextLesson && (
                <NextLessonBanner nextLesson={nextLesson} />
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* --- Desktop: Split --- */}
        <div className="hidden lg:flex flex-1 overflow-hidden">
          {/* Left: Theory */}
          <div className="w-1/2 overflow-y-auto border-r p-6">
            <TheoryContent theorySrc={lesson.theory_markdown} exercisePrompt={lesson.exercise_prompt} />
          </div>

          {/* Right: Editor + Results */}
          <div className="w-1/2 flex flex-col overflow-hidden">
            <div className="flex-1 p-4 flex flex-col gap-3 overflow-hidden">
              <CodeEditor
                value={code}
                onChange={setCode}
                languageId={lesson.judge0_language_id}
                height="calc(50vh - 60px)"
              />
              <EditorActions onRun={handleRun} onSubmit={handleSubmit} loading={loading} />
            </div>

            <div className="border-t flex-1 overflow-y-auto">
              {error && <p className="p-4 text-sm text-red-600">{error}</p>}
              <TestCasePanel results={result?.test_results ?? []} loading={loading} />
              <FeedbackPanel feedback={feedback} loading={feedbackLoading} />
              {result?.all_passed && nextLesson && (
                <NextLessonBanner nextLesson={nextLesson} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TheoryContent({ theorySrc, exercisePrompt }: { theorySrc: string; exercisePrompt: string }) {
  return (
    <div className="flex flex-col gap-6">
      <article className="prose prose-sm max-w-none">
        <ReactMarkdown>{theorySrc}</ReactMarkdown>
      </article>
      <div className="rounded-lg border bg-blue-50 p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Exercise</h3>
        <p className="text-sm text-blue-800 leading-relaxed">{exercisePrompt}</p>
      </div>
    </div>
  )
}

function EditorActions({
  onRun,
  onSubmit,
  loading,
}: {
  onRun: () => void
  onSubmit: () => void
  loading: boolean
}) {
  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={onRun} disabled={loading} size="sm">
        {loading ? 'Running...' : 'Run'}
      </Button>
      <Button onClick={onSubmit} disabled={loading} size="sm">
        {loading ? 'Running...' : 'Submit'}
      </Button>
    </div>
  )
}

function NextLessonBanner({ nextLesson }: { nextLesson: NextLessonData }) {
  return (
    <div className="m-4 rounded-lg border border-green-200 bg-green-50 p-4 flex items-center justify-between">
      <div>
        <p className="font-semibold text-green-900">All tests passed!</p>
        <p className="text-sm text-green-700">Ready for the next challenge?</p>
      </div>
      <Link
        href={`/learn/${nextLesson.course_id}/${nextLesson.id}`}
        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
      >
        Next lesson →
      </Link>
    </div>
  )
}
